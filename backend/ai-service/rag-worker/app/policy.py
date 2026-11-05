"""Deterministic policy helpers; no models, database or network required."""
import re


def reciprocal_rank(dense: list[str], lexical: list[str], limit: int = 8) -> list[str]:
    scores: dict[str, float] = {}
    for ranking in (dense, lexical):
        for rank, item in enumerate(dict.fromkeys(ranking), start=1):
            scores[item] = scores.get(item, 0) + 1 / (60 + rank)
    return sorted(scores, key=lambda item: (-scores[item], item))[:limit]


def query_terms(question: str) -> list[str]:
    return list(dict.fromkeys(term for term in re.findall(r"[^\W_]+", question.lower()) if len(term) > 2))[:8]


def bounded_text(text: str) -> str:
    if "\x00" in text:
        raise ValueError("Binary text is not supported")
    text = text.strip()
    if not text or len(text) > 500_000:
        raise ValueError("Empty, scanned or oversized text; use a smaller text document")
    return text
