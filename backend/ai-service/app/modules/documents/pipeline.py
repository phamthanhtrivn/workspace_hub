from importlib.metadata import version

from app.infrastructure.idempotency import fingerprint
from app.modules.documents.constants import (
    CHUNK_OVERLAP,
    CHUNK_TOKENS,
    EMBEDDING_DIMENSIONS,
    PIPELINE_VERSION,
)


def pipeline_fingerprint(settings):
    return fingerprint(
        {
            "version": PIPELINE_VERSION,
            "parser": version("markitdown"),
            "embedding": settings.gemini_embedding_model,
            "dimensions": EMBEDDING_DIMENSIONS,
            "chunkTokens": CHUNK_TOKENS,
            "chunkOverlap": CHUNK_OVERLAP,
        }
    )
