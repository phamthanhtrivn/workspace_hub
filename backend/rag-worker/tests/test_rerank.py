import unittest
from app.rerank import bm25_order, tokens


class RerankTests(unittest.TestCase):
    def test_vietnamese_accents_numbers_and_repeated_terms(self):
        candidates = [("noise", "meeting meeting meeting meeting"), ("answer", "Ngân sách dự án là 500 USD"), ("other", "Thời hạn tháng 12")]
        self.assertEqual(bm25_order("ngan sach du an bao nhieu", candidates)[0], "answer")
        self.assertIn("500", tokens("500 USD"))

    def test_empty_ties_and_all_ids_preserved(self):
        self.assertEqual(bm25_order("question", []), [])
        candidates = [("b", "same"), ("a", "same")]
        self.assertEqual(bm25_order("missing", candidates), ["b", "a"])
        self.assertEqual(set(bm25_order("same", candidates)), {"a", "b"})
