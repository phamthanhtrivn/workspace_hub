import unittest
from app.policy import bounded_text, query_terms, reciprocal_rank


class PolicyTests(unittest.TestCase):
    def test_fusion_deduplicates_and_prioritizes_agreement(self):
        self.assertEqual(reciprocal_rank(["a", "b", "a"], ["c", "b"])[0], "b")

    def test_multilingual_terms(self):
        self.assertIn("nghiên", query_terms("Nghiên cứu tài liệu nghiên cứu"))
        self.assertEqual(len(query_terms("Nghiên nghiên")), 1)

    def test_reject_binary_empty_and_oversize(self):
        for text in ("", "  ", "bad\x00text", "x" * 500001):
            with self.assertRaises(ValueError):
                bounded_text(text)

    def test_keep_vietnamese_content(self):
        self.assertEqual(bounded_text("  Tài liệu tiếng Việt  "), "Tài liệu tiếng Việt")


if __name__ == "__main__":
    unittest.main()
