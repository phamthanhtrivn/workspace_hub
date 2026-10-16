import math
import re
from collections import defaultdict

from rank_bm25 import BM25Okapi
from sqlalchemy import select

from app.modules.ingestion.chunking import count_tokens
from app.modules.ingestion.models import Chunk

MAX_CONTEXT_CHUNKS = 12
MAX_CONTEXT_TOKENS = 12000


def words(text):
    return re.findall(r"\w+", text.casefold())


def retrieve(
    session, index_ids: list[str], question: str, query_vector: list[float]
) -> list[Chunk]:
    chunks = session.scalars(
        select(Chunk).where(Chunk.index_id.in_(index_ids)).order_by(Chunk.index_id, Chunk.position)
    ).all()
    by_source = defaultdict(list)
    for chunk in chunks:
        by_source[chunk.index_id].append(chunk)
    ranked = {}
    for index_id, candidates in by_source.items():
        corpus = [words(chunk.content) for chunk in candidates]
        lexical = BM25Okapi([tokens or [""] for tokens in corpus]).get_scores(words(question))
        scores = {}
        semantic_order = sorted(
            range(len(candidates)),
            key=lambda i: sum(
                a * b for a, b in zip(candidates[i].embedding, query_vector, strict=True)
            ),
            reverse=True,
        )
        lexical_order = sorted(
            range(len(candidates)), key=lambda i: float(lexical[i]), reverse=True
        )
        for ordering in (semantic_order, lexical_order):
            for rank, position in enumerate(ordering[:20], 1):
                scores[position] = scores.get(position, 0) + 1 / (60 + rank)
        ranked[index_id] = [candidates[i] for i in sorted(scores, key=scores.get, reverse=True)]
    # Round-robin gives each selected source context before any source can dominate.
    selected, tokens = [], 0
    for rank in range(20):
        for index_id in index_ids:
            candidates = ranked.get(index_id, [])
            if rank >= len(candidates):
                continue
            chunk = candidates[rank]
            size = count_tokens(chunk.content)
            if tokens + size > MAX_CONTEXT_TOKENS:
                continue
            if len(selected) >= MAX_CONTEXT_CHUNKS:
                return selected
            if chunk.embedding and all(math.isfinite(v) for v in chunk.embedding):
                selected.append(chunk)
                tokens += size
    return selected
