import unittest

from app.captions import snapshot_caption


class CaptionsTest(unittest.TestCase):
    def test_stable_and_pending_vietnamese_speech(self):
        text, final = snapshot_caption(
            {
                "lines": [{"speaker": 1, "text": "Xin chào mọi người."}],
                "buffer_transcription": "Hôm nay",
            }
        )
        self.assertEqual(text, "Xin chào mọi người. Hôm nay")
        self.assertFalse(final)

    def test_silence_never_becomes_a_caption(self):
        self.assertEqual(
            snapshot_caption({"lines": [{"speaker": -2, "text": ""}]}), ("", True)
        )

    def test_old_utterances_are_not_rebroadcast(self):
        text, final = snapshot_caption(
            {
                "lines": [
                    {"speaker": 1, "text": "Câu cũ"},
                    {"speaker": 1, "text": "Câu mới"},
                ]
            }
        )
        self.assertEqual(text, "Câu mới")
        self.assertTrue(final)

    def test_long_captions_are_bounded(self):
        self.assertEqual(
            len(snapshot_caption({"buffer_transcription": "a" * 5000})[0]), 800
        )


if __name__ == "__main__":
    unittest.main()
