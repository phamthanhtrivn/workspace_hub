"""Private local speech recognition. Audio stays in memory and is never logged."""
import asyncio
from contextlib import asynccontextmanager
import hmac
import io
import os
from pathlib import Path
import wave

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from starlette.concurrency import run_in_threadpool

MAX_BYTES = 2 * 1024 * 1024
MAX_SECONDS = 46
MAX_TEXT = 12000


def validate_audio(audio: bytes) -> None:
    try:
        with wave.open(io.BytesIO(audio), "rb") as source:
            frames = source.getnframes()
            if (
                source.getnchannels() != 1
                or source.getsampwidth() != 2
                or source.getframerate() != 16000
                or not 0 < frames <= MAX_SECONDS * 16000
                or len(source.readframes(frames)) != frames * 2
            ):
                raise ValueError("Invalid PCM")
    except (wave.Error, EOFError, ValueError):
        raise HTTPException(422, "Expected mono 16 kHz PCM16 WAV, at most 46 seconds") from None


def load_model():
    from faster_whisper import WhisperModel

    model_path = Path(os.environ.get("STT_MODEL_PATH", "models/small"))
    if not (model_path / "model.bin").is_file():
        raise RuntimeError("Download the local model with prepare.py before starting speech-worker")
    return WhisperModel(
        str(model_path),
        device="cpu",
        compute_type="int8",
        cpu_threads=int(os.environ.get("STT_CPU_THREADS", "4")),
        num_workers=1,
        local_files_only=True,
    )


def recognize(model, audio: bytes) -> str:
    import numpy as np

    # Input is already validated PCM16, so no media decoder or second conversion is needed.
    with wave.open(io.BytesIO(audio), "rb") as source:
        samples = np.frombuffer(source.readframes(source.getnframes()), dtype="<i2").astype(np.float32) / 32768.0
    segments, _ = model.transcribe(
        samples,
        language="vi",
        task="transcribe",
        beam_size=5,
        vad_filter=True,
        condition_on_previous_text=False,
    )
    parts = []
    count = 0
    for segment in segments:
        count += len(segment.text) + 1
        if count > MAX_TEXT:
            raise ValueError("Transcript exceeds limit")
        parts.append(segment.text.strip())
    return " ".join(parts).strip()


def create_app(model_loader=load_model, service_key: str | None = None):
    @asynccontextmanager
    async def lifespan(app):
        if len(app.state.service_key) < 32:
            raise RuntimeError("Configure a dedicated SPEECH_SERVICE_KEY of at least 32 characters")
        app.state.model = await run_in_threadpool(model_loader)
        app.state.inference_lock = asyncio.Lock()
        yield
        app.state.model = None

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    app.state.service_key = service_key if service_key is not None else os.environ.get("SPEECH_SERVICE_KEY", "")
    app.state.model = None

    def authorize(x_internal_service_key: str = Header(default="")):
        if not hmac.compare_digest(x_internal_service_key.encode(), app.state.service_key.encode()):
            raise HTTPException(401, "Unauthorized")

    @app.get("/health")
    async def health():
        return {"status": "ok", "service": "local-speech"}

    @app.get("/ready", dependencies=[Depends(authorize)])
    async def ready():
        if app.state.model is None:
            raise HTTPException(503, "Model not loaded")
        return {"status": "ready", "provider": "faster-whisper-local"}

    @app.post("/transcribe", dependencies=[Depends(authorize)])
    async def transcribe(request: Request):
        if request.headers.get("content-type", "").split(";")[0] != "audio/wav":
            raise HTTPException(415, "Expected audio/wav")
        length = request.headers.get("content-length")
        if length is not None:
            try:
                declared_size = int(length)
            except ValueError:
                raise HTTPException(400, "Invalid content length") from None
            if not 0 < declared_size <= MAX_BYTES:
                raise HTTPException(413, "Audio size exceeds limit")
        audio = bytearray()
        async for chunk in request.stream():
            audio.extend(chunk)
            if len(audio) > MAX_BYTES:
                raise HTTPException(413, "Audio size exceeds limit")
        validate_audio(audio)
        if app.state.model is None:
            raise HTTPException(503, "Model not loaded")
        # Do not build an unbounded queue or run several models on a laptop CPU.
        if app.state.inference_lock.locked():
            raise HTTPException(429, "Local speech worker is busy")
        async with app.state.inference_lock:
            try:
                text = await run_in_threadpool(recognize, app.state.model, bytes(audio))
            except Exception:
                raise HTTPException(503, "Local transcription failed") from None
        return {"text": text}

    return app


app = create_app()
