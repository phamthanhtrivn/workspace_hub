"""One shared HTTP pool; document calls run concurrently, queries retain a slot."""
import math
import threading
from urllib.parse import urlsplit

import httpx


class ApiEmbeddings:
    def __init__(self, endpoint: str, api_key: str, model: str, concurrency: int = 5,
                 client: httpx.Client | None = None):
        url = urlsplit(endpoint)
        trusted_local = url.scheme == "http" and url.hostname == "host.docker.internal" and url.port
        if not url.hostname or url.username or url.password or url.query or url.fragment:
            raise ValueError("Invalid embedding endpoint")
        if url.scheme != "https" and not trusted_local:
            raise ValueError("Use an HTTPS embedding endpoint or trusted local model server")
        if not model.strip() or (not api_key.strip() and not trusted_local):
            raise ValueError("Configure a dedicated embedding model and API key")
        if not 1 <= concurrency <= 5:
            raise ValueError("Embedding concurrency must be between one and five")
        self.endpoint = endpoint.rstrip("/")
        self.model = model
        self._key = api_key
        self._documents = threading.BoundedSemaphore(concurrency)
        self._queries = threading.BoundedSemaphore(1)
        self._dimensions = None
        self._dimensions_lock = threading.Lock()
        self.client = client or httpx.Client(
            timeout=httpx.Timeout(30, connect=10), follow_redirects=False,
            limits=httpx.Limits(max_connections=concurrency + 1, max_keepalive_connections=concurrency + 1),
        )

    def embed(self, texts: list[str], query: bool = False) -> list[list[float]]:
        if not texts or len(texts) > 16 or any(not isinstance(text, str) or not text.strip() for text in texts):
            raise ValueError("Embed one to sixteen nonempty text chunks per request")
        # No paid request is automatically replayed after an unknown outcome.
        with self._queries if query else self._documents:
            response = self.client.post(
                self.endpoint + "/embeddings", headers={"Authorization": "Bearer " + self._key},
                json={"model": self.model, "input": texts, "encoding_format": "float"},
            )
            response.raise_for_status()
            body = response.json()
        if not isinstance(body, dict) or body.get("model", self.model) != self.model:
            raise ValueError("Embedding response model mismatch")
        rows = body.get("data")
        if not isinstance(rows, list) or len(rows) != len(texts):
            raise ValueError("Incomplete embeddings")
        indices = [row.get("index") if isinstance(row, dict) else None for row in rows]
        if any(type(index) is not int for index in indices) or sorted(indices) != list(range(len(texts))):
            raise ValueError("Invalid embedding indices")
        vectors = []
        for row in sorted(rows, key=lambda item: item["index"]):
            vector = row.get("embedding")
            if not isinstance(vector, list) or not 1 <= len(vector) <= 16384:
                raise ValueError("Invalid embedding dimensions")
            if any(type(value) not in (int, float) or not math.isfinite(value) for value in vector):
                raise ValueError("Invalid embedding values")
            if not any(vector):
                raise ValueError("Zero embedding vector")
            with self._dimensions_lock:
                if self._dimensions is None:
                    self._dimensions = len(vector)
                if len(vector) != self._dimensions:
                    raise ValueError("Embedding dimensions changed")
            vectors.append(vector)
        return vectors

    def close(self):
        self.client.close()
