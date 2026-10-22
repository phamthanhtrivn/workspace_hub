"""Aggregate timings only. Never log document identifiers or provider bodies."""
import json
import logging
import time
from collections.abc import Iterator
from contextlib import contextmanager

logger = logging.getLogger("workspace.rag.metrics")
logger.setLevel(logging.INFO)
logger.propagate = False
if not logger.handlers:
    logger.addHandler(logging.StreamHandler())


class Profile:
    def __init__(self, operation: str):
        self.operation = operation
        self.started = time.perf_counter()
        self.metrics: dict[str, float] = {"parse_ms": 0, "chunk_ms": 0, "embedding_ms": 0, "qdrant_ms": 0}

    @contextmanager
    def measure(self, stage: str) -> Iterator[None]:
        started = time.perf_counter()
        try:
            yield
        finally:
            self.metrics[stage] = self.metrics.get(stage, 0) + (time.perf_counter() - started) * 1000

    def finish(self, status: str) -> None:
        report = {"event": "rag_pipeline", "operation": self.operation, "status": status,
                  **{key: round(value, 2) for key, value in self.metrics.items()},
                  "total_ms": round((time.perf_counter() - self.started) * 1000, 2)}
        logger.info(json.dumps(report))


@contextmanager
def profile(operation: str) -> Iterator[Profile]:
    timing = Profile(operation)
    try:
        yield timing
    except Exception:
        timing.finish("failed")
        raise
    else:
        timing.finish("ok")
