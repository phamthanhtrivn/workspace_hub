"""Speech contract tests; no model downloads or external services."""
import io
from types import SimpleNamespace
import unittest
import wave

from fastapi.testclient import TestClient

from app import create_app


def audio(rate=16000, seconds=1):
    output = io.BytesIO()
    with wave.open(output, "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(rate)
        stream.writeframes(b"\x00\x00" * (rate * seconds))
    return output.getvalue()


class SpeechContractTest(unittest.TestCase):
    def setUp(self):
        self.calls = []

        def transcribe(samples, **options):
            self.calls.append(options)
            return iter([SimpleNamespace(text=" Xin chào. Hello. ")]), None

        self.key = "test-only-speech-key" * 3
        self.app = create_app(lambda: SimpleNamespace(transcribe=transcribe), self.key)
        self.client = TestClient(self.app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)

    def request(self, **headers):
        return self.client.post("/transcribe", content=audio(), headers={
            "content-type": "audio/wav", "x-internal-service-key": self.key, **headers,
        })

    def test_default_meeting_language_and_auto_voice_keep_original_text(self):
        for headers, language in [({}, "vi"), ({"x-speech-language": "auto"}, None), ({"x-speech-language": "en"}, "en")]:
            self.assertEqual(self.request(**headers).json(), {"text": "Xin chào. Hello."})
            self.assertEqual(self.calls[-1]["language"], language)
            self.assertEqual(self.calls[-1]["task"], "transcribe")

    def test_auth_and_language_validation_precede_inference(self):
        self.assertEqual(self.request(**{"x-internal-service-key": "wrong"}).status_code, 401)
        self.assertEqual(self.request(**{"x-speech-language": "unsupported"}).status_code, 422)
        self.assertEqual(self.calls, [])

    def test_invalid_audio_and_busy_worker_do_not_run_inference(self):
        headers = {"content-type": "audio/wav", "x-internal-service-key": self.key}
        for content in [b"not a wave", audio(rate=8000), audio(seconds=47)]:
            self.assertEqual(self.client.post("/transcribe", content=content, headers=headers).status_code, 422)
        self.client.portal.call(self.app.state.inference_lock.acquire)
        try:
            self.assertEqual(self.request().status_code, 429)
        finally:
            self.app.state.inference_lock.release()
        self.assertEqual(self.calls, [])


if __name__ == "__main__":
    unittest.main()
