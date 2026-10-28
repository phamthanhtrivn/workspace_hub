import asyncio
import io
import threading
import unittest
import wave
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient
from app import create_app

KEY = "fixture-local-speech-key-at-least-32-chars"


def wav(seconds=1, rate=16000):
    result = io.BytesIO()
    with wave.open(result, "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(rate)
        output.writeframes(b"\0\0" * (seconds * rate))
    return result.getvalue()


class FakeModel:
    def transcribe(self, audio, **options):
        self.audio = audio
        self.options = options
        return iter([SimpleNamespace(text=" Xin chào "), SimpleNamespace(text="cuộc họp.")]), None


class SpeechWorkerTests(unittest.TestCase):
    def setUp(self):
        self.model = FakeModel()
        self.context = TestClient(create_app(lambda: self.model, KEY))
        self.client = self.context.__enter__()
        self.headers = {"x-internal-service-key": KEY, "content-type": "audio/wav"}

    def tearDown(self):
        self.context.__exit__(None, None, None)

    def test_authentication_and_readiness(self):
        self.assertEqual(self.client.get("/ready").status_code, 401)
        self.assertEqual(self.client.post("/transcribe", content=wav()).status_code, 401)
        self.assertEqual(self.client.get("/ready", headers=self.headers).status_code, 200)
        self.assertEqual(self.client.get("/health").status_code, 200)

    def test_audio_stays_in_memory_and_model_transcribes_vietnamese(self):
        payload = wav()
        result = self.client.post("/transcribe", content=payload, headers=self.headers)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json(), {"text": "Xin chào cuộc họp."})
        self.assertEqual(self.model.audio.shape, (16000,))
        self.assertTrue((self.model.audio == 0).all())
        self.assertEqual(self.model.options["language"], "vi")
        self.assertEqual(self.model.options["task"], "transcribe")
        self.assertTrue(self.model.options["vad_filter"])

    def test_invalid_and_oversize_audio_rejected_before_model(self):
        for payload in [b"bad wav", wav(rate=8000), wav(seconds=47), wav()[:-10], wav(seconds=0)]:
            self.assertEqual(self.client.post("/transcribe", content=payload, headers=self.headers).status_code, 422)
        self.assertEqual(self.client.post("/transcribe", content=b"x" * (2 * 1024 * 1024 + 1), headers=self.headers).status_code, 413)
        self.assertEqual(self.client.post("/transcribe", content=wav(), headers={**self.headers, "content-type": "application/json"}).status_code, 415)
        self.assertFalse(hasattr(self.model, "audio"))

    def test_empty_speech_and_failed_recognition(self):
        self.model.transcribe = lambda *a, **kw: (iter([]), None)
        self.assertEqual(self.client.post("/transcribe", content=wav(), headers=self.headers).json(), {"text": ""})
        self.model.transcribe = lambda *a, **kw: (_ for _ in ()).throw(RuntimeError("private contents"))
        result = self.client.post("/transcribe", content=wav(), headers=self.headers)
        self.assertEqual(result.status_code, 503)
        self.assertNotIn("private", result.text)

    def test_busy_worker_rejects_extra_requests_without_queue(self):
        started, release = threading.Event(), threading.Event()
        def slow(*args, **kwargs):
            started.set()
            release.wait(5)
            return iter([]), None
        self.model.transcribe = slow
        results = []
        thread = threading.Thread(target=lambda: results.append(self.client.post("/transcribe", content=wav(), headers=self.headers).status_code))
        thread.start()
        self.assertTrue(started.wait(3))
        try:
            self.assertEqual(self.client.post("/transcribe", content=wav(), headers=self.headers).status_code, 429)
        finally:
            release.set()
            thread.join(5)
        self.assertEqual(results, [200])

    def test_missing_key_fails_startup(self):
        with self.assertRaises(RuntimeError), TestClient(create_app(lambda: self.model, "")):
            pass


if __name__ == "__main__":
    unittest.main()
