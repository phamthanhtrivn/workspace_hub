import unittest
from types import SimpleNamespace
from unittest.mock import Mock

import numpy as np

from app.engine import ConfiguredASR


class EngineTest(unittest.TestCase):
    def test_previous_counting_is_not_used_as_recognition_prompt(self):
        recognizer = object.__new__(ConfiguredASR)
        recognizer.original_language = "vi"
        recognizer.transcribe_kargs = {}
        segment = SimpleNamespace(
            text="đi ngủ", avg_logprob=-0.2,
            compression_ratio=1.0, no_speech_prob=0.1,
        )
        recognizer.model = Mock()
        recognizer.model.transcribe.return_value = (iter([segment]), None)

        result = recognizer.transcribe(np.zeros(16000), init_prompt="1, 2, 3, 4, 5")

        options = recognizer.model.transcribe.call_args.kwargs
        self.assertIsNone(options["initial_prompt"])
        self.assertFalse(options["condition_on_previous_text"])
        self.assertEqual(result, [segment])
