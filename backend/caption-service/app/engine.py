"""Hardware configuration adapter for the pinned WhisperLiveKit 0.2.26 backend."""

import asyncio
import logging
import os

import numpy as np
from faster_whisper import WhisperModel
from whisperlivekit import AudioProcessor, TranscriptionEngine
from whisperlivekit.local_agreement import whisper_online
from whisperlivekit.local_agreement.backends import FasterWhisperASR
from whisperlivekit.warmup import load_file


class ConfiguredASR(FasterWhisperASR):
    def load_model(self, model_size=None, cache_dir=None, model_dir=None):
        device = os.getenv("CAPTION_DEVICE", "cpu")
        compute = os.getenv(
            "CAPTION_COMPUTE_TYPE", "int8" if device == "cpu" else "int8_float16"
        )
        return WhisperModel(
            model_dir or model_size,
            device=device,
            compute_type=compute,
            cpu_threads=int(os.getenv("CAPTION_CPU_THREADS", "4")),
            num_workers=2,
            download_root=cache_dir,
        )

    def transcribe(self, audio, init_prompt=""):
        segments, _ = self.model.transcribe(
            audio,
            language=self.original_language,
            initial_prompt=init_prompt,
            beam_size=1,
            temperature=0.0,
            max_new_tokens=128,
            no_repeat_ngram_size=3,
            word_timestamps=True,
            condition_on_previous_text=True,
            **self.transcribe_kargs,
        )
        return [
            segment
            for segment in segments
            if segment.avg_logprob >= -1.0
            and segment.compression_ratio <= 2.4
            and segment.no_speech_prob < 0.6
        ]


def create_engine(language: str) -> TranscriptionEngine:
    # WLK 0.2.26 fixes CPU precision/thread defaults internally. Use its existing
    # streaming/VAD pipeline with this small backend adapter instead of forking it.
    whisper_online.FasterWhisperASR = ConfiguredASR
    engine = TranscriptionEngine(
        model_size=os.getenv("CAPTION_MODEL", "small"),
        lan=language,
        backend="faster-whisper",
        backend_policy="localagreement",
        pcm_input=True,
        diarization=False,
        min_chunk_size=1.0,
        asr_coalesce_min_s=2.0,
        retention_seconds=30.0,
        log_level="WARNING",
    )
    for name in ["whisperlivekit", "faster_whisper", "httpx2", "httpx", "livekit"]:
        logging.getLogger(name).setLevel(logging.WARNING)
    return engine


async def warm_streaming_engine(engine: TranscriptionEngine) -> None:
    """Initialize the live PCM/VAD/alignment path before admitting viewers."""
    audio = await asyncio.to_thread(load_file)
    if audio is None:
        raise RuntimeError("The public WLK warmup sample is unavailable")
    audio = np.concatenate([audio[:64000], np.zeros(32000, dtype=np.float32)])
    pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16).tobytes()

    async def warm_one():
        processor = AudioProcessor(
            transcription_engine=engine, pcm_input=True, language="en", mode="diff"
        )
        logging.getLogger("whisperlivekit.audio_processor").setLevel(logging.WARNING)
        results = await processor.create_tasks()

        async def consume():
            async for result in results:
                if result.error:
                    raise RuntimeError("Streaming warmup failed")

        output = asyncio.create_task(consume())
        try:
            for offset in range(0, len(pcm), 1280):
                await processor.process_audio(pcm[offset : offset + 1280])
                await asyncio.sleep(0)
            await processor.process_audio(b"")
            await asyncio.wait_for(output, 120)
        finally:
            output.cancel()
            await asyncio.gather(output, return_exceptions=True)
            await processor.cleanup()

    await asyncio.gather(warm_one(), warm_one())
