"""One shared HTTP pool; document calls run concurrently, queries retain a slot."""
import math
import threading
import time
from urllib.parse import urlsplit

import httpx

from .errors import quota_info


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
        self.validate_input(texts)
        # No paid request is automatically replayed after an unknown outcome.
        with self._queries if query else self._documents:
            response = self.client.post(
                self.endpoint + "/embeddings", headers={"Authorization": "Bearer " + self._key},
                json={"model": self.model, "input": texts, "encoding_format": "float"},
                timeout=httpx.Timeout(10, connect=5) if query else httpx.Timeout(30, connect=10),
            )
            response.raise_for_status()
            body = response.json()
        return self.validate_response(body, texts)

    @staticmethod
    def validate_input(texts):
        if not texts or len(texts) > 16 or any(not isinstance(text, str) or not text.strip() for text in texts):
            raise ValueError("Embed one to sixteen nonempty text chunks per request")

    def validate_response(self, body, texts):
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


class GeminiEmbeddings(ApiEmbeddings):
    def __init__(self, api_key: str, model: str = "gemini-embedding-001", concurrency: int = 5,
                 dimensions: int = 768, client: httpx.Client | None = None):
        if model not in ("gemini-embedding-001", "gemini-embedding-2") or dimensions not in (768, 1536, 3072):
            raise ValueError("Configure Gemini Embedding 1 or 2 with 768, 1536 or 3072 dimensions")
        super().__init__("https://generativelanguage.googleapis.com/v1beta", api_key, model, concurrency, client)
        self.dimensions = dimensions
        self._dimensions = dimensions

    def embed(self, texts: list[str], query: bool = False) -> list[list[float]]:
        self.validate_input(texts)
        requests = []
        for text in texts:
            if self.model == "gemini-embedding-2":
                text = f"task: search result | query: {text}" if query else f"title: none | text: {text}"
            request = {"model": "models/" + self.model, "content": {"parts": [{"text": text}]},
                       "outputDimensionality": self.dimensions}
            if self.model == "gemini-embedding-001":
                request["taskType"] = "RETRIEVAL_QUERY" if query else "RETRIEVAL_DOCUMENT"
            requests.append(request)
        # Each chunk is a separate request, avoiding Embedding 2's aggregation of multiple inputs.
        payload = {"requests": requests}
        with self._queries if query else self._documents:
            for attempt in range(1 if query else 3):
                response = self.client.post(
                    self.endpoint + "/models/" + self.model + ":batchEmbedContents",
                    headers={"x-goog-api-key": self._key}, json=payload,
                    timeout=httpx.Timeout(10, connect=5) if query else httpx.Timeout(30, connect=10),
                )
                # A received quota rejection means no embedding was generated.
                # Connection/stream failures and every other HTTP error are not replayed here.
                if response.status_code == 429:
                    daily_quota, delay = quota_info(response)
                    if not daily_quota and not query and attempt < 2:
                        time.sleep(max(1, min(delay, 60)))
                        continue
                response.raise_for_status()
                body = response.json()
                break
        embeddings = body.get("embeddings") if isinstance(body, dict) else None
        if not isinstance(embeddings, list):
            raise ValueError("Incomplete Gemini embeddings")
        rows = [{"index": i, "embedding": item.get("values") if isinstance(item, dict) else None}
                for i, item in enumerate(embeddings)]
        vectors = self.validate_response({"data": rows}, texts)
        normalized = []
        for vector in vectors:
            norm = math.hypot(*vector)
            if not math.isfinite(norm) or norm == 0:
                raise ValueError("Invalid embedding norm")
            normalized.append([value / norm for value in vector])
        return normalized
