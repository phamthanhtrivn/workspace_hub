"""Small, local BM25 reranker. No network or additional model weights."""
import math
import re
import unicodedata
from collections import Counter
from .policy import reciprocal_rank


def tokens(text):
    text = unicodedata.normalize("NFD", text.lower()).replace("đ", "d")
    text = "".join(c for c in text if not unicodedata.combining(c))
    stop = {"the", "is", "a", "an", "of", "to", "in", "what", "how", "la", "cua", "va", "cho", "toi", "gi", "nao", "bao", "nhieu"}
    return [word for word in re.findall(r"\w+", text) if word not in stop]


def bm25_order(question, candidates):
    """Return IDs ordered by BM25; ties preserve the incoming semantic ranking."""
    if not candidates:
        return []
    query = set(tokens(question))
    documents = [tokens(text) for _, text in candidates]
    average = max(1, sum(map(len, documents)) / len(documents))
    frequencies = Counter(term for document in documents for term in set(document))
    scores = []
    for index, (key, _) in enumerate(candidates):
        counts = Counter(documents[index])
        score = 0.0
        for term in query:
            count = counts[term]
            if not count:
                continue
            idf = math.log(1 + (len(documents) - frequencies[term] + .5) / (frequencies[term] + .5))
            score += idf * count * 2.2 / (count + 1.2 * (.25 + .75 * len(documents[index]) / average))
        scores.append((-score, index, key))
    return [key for _, _, key in sorted(scores)]


def rerank_candidates(question, candidates, limit=8):
    return reciprocal_rank([key for key, _ in candidates], bm25_order(question, candidates), limit=limit)
