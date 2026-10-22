import base64
from collections import OrderedDict
import hashlib
import math
import os
import tempfile
import threading
import time
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

import httpx
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.utils import get_tokenizer
from qdrant_client import QdrantClient, models

from .policy import bounded_text, query_terms, reciprocal_rank
from .rerank import bm25_order, rerank_candidates
from .errors import InvalidSource, ValidationBusy
from .prepared import PreparedCache
from .profiling import profile, Profile
from .visual import IMAGE_TYPES, VisualExtractor, enabled as visual_enabled, open_image


class Engine:
    def __init__(self):
        self.client = QdrantClient(url=os.environ.get("QDRANT_URL", "http://localhost:6333"),
                                   api_key=os.environ.get("QDRANT_API_KEY") or None, timeout=20)
        self.provider = os.environ.get("EMBEDDING_PROVIDER", "local")
        self.model_name = os.environ.get("EMBEDDING_MODEL", "intfloat/multilingual-e5-small")
        self.model = None
        self.converter = None
        self.model_lock = threading.Lock()
        self.index_lock = threading.Lock()
        self.prepared_cache = PreparedCache()
        self.readiness_lock = threading.Lock()
        self.embedding_verified = False
        self.query_lock = threading.Lock()
        self.query_vectors = OrderedDict()
        self.tokenizer = get_tokenizer()
        self.splitter = SentenceSplitter(chunk_size=384, chunk_overlap=48, tokenizer=self.tokenizer)
        signature = f"text-pdf-v2:{self.provider}:{self.model_name}:384:48:{os.environ.get('INDEX_PIPELINE_VERSION', 'notebook-v1')}"
        self.collection = "wh_notebook_" + hashlib.sha256(signature.encode()).hexdigest()[:16]

    def embed(self, texts: list[str], query=False) -> list[list[float]]:
        if self.provider == "api":
            endpoint = os.environ.get("EMBEDDING_BASE_URL", "").rstrip("/")
            if not endpoint.startswith("https://") and not endpoint.startswith("http://host.docker.internal:"):
                raise ValueError("Configure an HTTPS embedding endpoint or trusted local model server")
            with httpx.Client(timeout=30, follow_redirects=False) as client:
                response = client.post(endpoint + "/embeddings", headers={"Authorization": "Bearer " + os.environ.get("EMBEDDING_API_KEY", "")},
                                       json={"model": self.model_name, "input": texts})
                response.raise_for_status()
                data = sorted(response.json()["data"], key=lambda row: row["index"])
                if len(data) != len(texts):
                    raise ValueError("Incomplete embeddings")
                return [row["embedding"] for row in data]
        if self.provider != "local":
            raise ValueError("Unsupported embedding provider")
        with self.model_lock:
            if self.model is None:
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer(self.model_name, device=os.environ.get("EMBEDDING_DEVICE", "cpu"), trust_remote_code=False)
            prefix = ("query: " if query else "passage: ") if "e5" in self.model_name else ""
            return self.model.encode([prefix + text for text in texts], batch_size=16,
                                     normalize_embeddings=True, show_progress_bar=False).tolist()

    def parse(self, name: str, content: str | bytes) -> list[tuple[str, int | None]]:
        from pypdf.errors import PdfReadError
        from zipfile import BadZipFile
        try:
            return self._parse(name, content)
        except InvalidSource:
            raise
        except (ValueError, UnicodeError, PdfReadError, BadZipFile) as error:
            raise InvalidSource("Invalid, scanned, encrypted or oversized source") from error

    def ready(self):
        self.client.get_collections()
        if visual_enabled() and not getattr(self, "ocr_verified", False):
            import subprocess
            languages = subprocess.run(["tesseract", "--list-langs"], capture_output=True, timeout=5, check=True).stdout.decode()
            if not {"vie", "eng"}.issubset(set(languages.split())):
                raise RuntimeError("Vietnamese/English OCR language packs unavailable")
            self.ocr_verified = True
        if self.embedding_verified:
            return
        if not self.readiness_lock.acquire(blocking=False):
            raise RuntimeError("Embedding warm-up in progress")
        try:
            if not self.embedding_verified:
                with profile("embedding_warmup") as timing, timing.measure("embedding_ms"):
                    vectors = self.embed(["Service readiness probe."])
                    if len(vectors) != 1 or not vectors[0] or not all(math.isfinite(v) for v in vectors[0]):
                        raise RuntimeError("Invalid embedding probe")
                self.embedding_verified = True
        finally:
            self.readiness_lock.release()

    def _parse(self, name: str, content: str | bytes) -> list[tuple[str, int | None]]:
        data = content if isinstance(content, bytes) else base64.b64decode(content, validate=True)
        if not data or len(data) > 20 * 1024 * 1024:
            raise ValueError("File exceeds 20 MiB or is empty")
        suffix = Path(name).suffix.lower()
        if suffix in (".txt", ".md"):
            pages = [(bounded_text(data.decode("utf-8-sig")), None)]
        elif suffix == ".pdf":
            import io
            from pypdf import PdfReader
            pdf = PdfReader(io.BytesIO(data))
            if pdf.is_encrypted:
                raise InvalidSource("Encrypted PDF", "PDF_ENCRYPTED")
            if len(pdf.pages) > 100:
                raise InvalidSource("PDF exceeds 100 pages", "PDF_PAGE_LIMIT")
            # Text PDFs do not need the heavyweight neural layout/table models.
            # Keep page numbers for citations; never silently run OCR on scanned pages.
            pages = []
            token_count = 0
            for number, page in enumerate(pdf.pages, 1):
                text = page.extract_text() or ""
                if not text.strip() and len(page.images):
                    raise InvalidSource("Scanned PDF page requires OCR", "PDF_OCR_REQUIRED")
                token_count += len(self.tokenizer(text))
                if token_count > 40_000:
                    raise InvalidSource("Document exceeds 40000 tokens", "SOURCE_TOKEN_LIMIT")
                pages.append((text, number))
        elif suffix == ".docx":
            import io
            import zipfile
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                if sum(item.file_size for item in archive.infolist()) > 100 * 1024 * 1024:
                    raise InvalidSource("Expanded DOCX exceeds 100 MiB", "DOCX_EXPANDED_LIMIT")
                if not {"[Content_Types].xml", "word/document.xml"}.issubset(archive.namelist()):
                    raise InvalidSource("Invalid DOCX archive")
            if self.converter is None:
                from docling.document_converter import DocumentConverter
                from docling.datamodel.base_models import InputFormat
                self.converter = DocumentConverter(allowed_formats=[InputFormat.DOCX])
            with tempfile.TemporaryDirectory(prefix="wh-notebook-") as directory:
                path = Path(directory) / ("source" + suffix)
                path.write_bytes(data)
                result = self.converter.convert(path, max_num_pages=100)
                doc = result.document
                pages = [(doc.export_to_markdown(), None)]
        else:
            raise ValueError("Unsupported extension")
        bounded_text("\n".join(text for text, _ in pages))
        if sum(len(self.tokenizer(text)) for text, _ in pages) > 40_000:
            raise InvalidSource("Document exceeds 40000 tokens", "SOURCE_TOKEN_LIMIT")
        return pages

    def prepare(self, scope_id: str, name: str, content: str, timing: Profile):
        with timing.measure("decode_hash_ms"):
            try:
                data = base64.b64decode(content, validate=True)
            except ValueError as error:
                raise InvalidSource("Invalid file encoding") from error
            if not data or len(data) > 20 * 1024 * 1024:
                raise InvalidSource("File exceeds 20 MiB or is empty")
            key = (scope_id, self.collection, Path(name).suffix.lower(), hashlib.sha256(data).digest())
        cached = self.prepared_cache.get(key)
        timing.metrics["prepare_cache_hit"] = int(cached is not None)
        timing.metrics["input_bytes"] = len(data)
        if cached is not None:
            return cached
        with timing.measure("parse_ms"):
            pages = self.parse(name, data)
        with timing.measure("chunk_ms"):
            chunks = [(part, page) for text, page in pages for part in self.splitter.split_text(text) if part.strip()]
        if not chunks or len(chunks) > 2000:
            raise InvalidSource("Empty or oversized index")
        self.prepared_cache.put(key, chunks)
        return tuple(chunks)

    def validate(self, name: str, content: str, scope_id: str):
        if not self.index_lock.acquire(blocking=False):
            raise ValidationBusy()
        try:
            if visual_enabled() and Path(name).suffix.lower() in (*IMAGE_TYPES, ".pdf"):
                return self.validate_visual(name, content)
            # Identical parser/chunk limits to indexing, but never embed or write vectors.
            with profile("validate") as timing:
                chunks = self.prepare(scope_id, name, content, timing)
                timing.metrics["chunk_count"] = len(chunks)
                return {"chunkCount": len(chunks)}
        finally:
            self.index_lock.release()

    def validate_visual(self, name, content):
        import io
        from pypdf import PdfReader
        from pypdf.errors import PdfReadError
        try:
            data = base64.b64decode(content, validate=True)
            if not data or len(data) > 20 * 1024 * 1024:
                raise InvalidSource("Empty or oversized source")
            suffix = Path(name).suffix.lower()
            if suffix in IMAGE_TYPES:
                with open_image(data, suffix):
                    pass
                return {"chunkCount": 0, "deferred": True}
            pdf = PdfReader(io.BytesIO(data))
            if pdf.is_encrypted:
                raise InvalidSource("Encrypted PDF", "PDF_ENCRYPTED")
            if not pdf.pages or len(pdf.pages) > 100:
                raise InvalidSource("Invalid page count", "PDF_PAGE_LIMIT")
            tokens = 0
            for page in pdf.pages:
                text = page.extract_text() or ""
                if text.strip():
                    bounded_text(text)
                tokens += len(self.tokenizer(text))
                if tokens > 40_000:
                    raise InvalidSource("Source token limit", "SOURCE_TOKEN_LIMIT")
            return {"chunkCount": 0, "deferred": True}
        except InvalidSource:
            raise
        except (ValueError, PdfReadError, OSError) as error:
            raise InvalidSource("Invalid visual source") from error

    def extract(self, name, content):
        if not visual_enabled():
            raise InvalidSource("Visual ingestion is disabled", "VISUAL_DISABLED")
        if not self.index_lock.acquire(blocking=False):
            raise ValidationBusy()
        try:
            data = base64.b64decode(content, validate=True)
            if not data or len(data) > 20 * 1024 * 1024:
                raise InvalidSource("Empty or oversized source")
            result = VisualExtractor(self.parse).extract(name, data)
            texts = "\n".join(page["text"] for page in result["pages"])
            if texts.strip():
                bounded_text(texts)
            if sum(len(self.tokenizer(page["text"])) for page in result["pages"]) > 40_000:
                raise InvalidSource("Source token limit", "SOURCE_TOKEN_LIMIT")
            if not texts.strip() and not result["images"]:
                raise InvalidSource("Source has no readable content")
            return result
        finally:
            self.index_lock.release()

    def scope_filter(self, scope_id: str, source_ids: list[str] | None = None):
        conditions = [models.FieldCondition(key="scopeId", match=models.MatchValue(value=scope_id))]
        if source_ids:
            conditions.append(models.FieldCondition(key="sourceId", match=models.MatchAny(any=source_ids)))
        return models.Filter(must=conditions)

    def index(self, scope_id: str, source_id: str, revision: str, name: str, content: str, pages=None, visuals=None):
        # Serialize CPU parsing/embedding, leaving retrieval to independent HTTP threads.
        with profile("index") as timing:
            started = time.perf_counter()
            with self.index_lock:
                timing.metrics["index_lock_ms"] = (time.perf_counter() - started) * 1000
                return self._index(scope_id, source_id, revision, name, content, timing, pages, visuals)

    def _index(self, scope_id, source_id, revision, name, content, timing, pages=None, visuals=None):
        if pages is None:
            chunks = [(text, page, None) for text, page in self.prepare(scope_id, name, content, timing)]
        else:
            records = sorted([*pages, *(visuals or [])], key=lambda item: item.get("page") or 0)
            text = bounded_text("\n".join(item["text"] for item in records))
            if len(self.tokenizer(text)) > 40_000:
                raise InvalidSource("Enriched source token limit", "SOURCE_TOKEN_LIMIT")
            chunks = [(part, item.get("page"), item.get("imageId")) for item in records
                      for part in self.splitter.split_text(item["text"]) if part.strip()]
            if not chunks or len(chunks) > 2000:
                raise InvalidSource("Empty or oversized index")
        timing.metrics["chunk_count"] = len(chunks)
        with timing.measure("embedding_ms"):
            first = self.embed([text for text, _, _ in chunks[:16]])
        with timing.measure("qdrant_ms"):
            self._ensure_collection(len(first[0]))
            # Replacing partial vectors must not evict the freshly validated parse cache.
            self.delete(scope_id, source_id, clear_prepared=False)
        for start in range(0, len(chunks), 16):
            batch = chunks[start:start + 16]
            with timing.measure("embedding_ms"):
                vectors = first if start == 0 else self.embed([text for text, _, _ in batch])
            points = [models.PointStruct(id=str(uuid5(NAMESPACE_URL, f"{scope_id}:{source_id}:{revision}:{start+i}")), vector=vector,
                payload={"scopeId": scope_id, "sourceId": source_id, "revision": revision, "text": text, "page": page, "position": start + i,
                         **({"imageId": image_id} if image_id else {})})
                for i, ((text, page, image_id), vector) in enumerate(zip(batch, vectors, strict=True))]
            with timing.measure("qdrant_ms"):
                self.client.upsert(self.collection, points, wait=True)
        embedding_seconds = timing.metrics["embedding_ms"] / 1000
        timing.metrics["embedding_chunks_per_sec"] = len(chunks) / embedding_seconds if embedding_seconds else 0
        return {"chunkCount": len(chunks)}

    def _ensure_collection(self, dimensions):
        if not self.client.collection_exists(self.collection):
            self.client.create_collection(self.collection, vectors_config=models.VectorParams(size=dimensions, distance=models.Distance.COSINE))
            self.client.create_payload_index(self.collection, "scopeId", models.PayloadSchemaType.KEYWORD)
            self.client.create_payload_index(self.collection, "sourceId", models.PayloadSchemaType.KEYWORD)
            self.client.create_payload_index(self.collection, "text", models.TextIndexParams(type="text", tokenizer=models.TokenizerType.MULTILINGUAL, lowercase=True))

    @staticmethod
    def evidence(point):
        payload = point.payload
        return {"id": str(point.id), "sourceId": payload["sourceId"], "text": payload["text"],
                "page": payload.get("page"), "position": payload["position"],
                **({"imageId": payload["imageId"]} if payload.get("imageId") else {})}

    def query_vector(self, question: str):
        # Cache model output only, never document hits or authorization decisions.
        key = hashlib.sha256(question.encode()).digest()
        with self.query_lock:
            now = time.monotonic()
            cached = self.query_vectors.pop(key, None)
            if cached and now - cached[0] < 120:
                self.query_vectors[key] = cached
                return list(cached[1])
            vector = self.embed([question], query=True)[0]
            self.query_vectors[key] = (time.monotonic(), tuple(vector))
            while len(self.query_vectors) > 128:
                self.query_vectors.popitem(last=False)
            return list(vector)

    def retrieve(self, scope_id: str, source_ids: list[str], question: str):
        if not self.client.collection_exists(self.collection):
            raise ValueError("Index pipeline changed; re-index sources")
        filter_ = self.scope_filter(scope_id, source_ids)
        dense = self.client.query_points(self.collection, query=self.query_vector(question),
            query_filter=filter_, limit=12, with_payload=True).points
        terms = query_terms(question)
        lexical = []
        if terms:
            lexical_filter = models.Filter(must=filter_.must, should=[models.FieldCondition(key="text", match=models.MatchText(text=term)) for term in terms])
            lexical, _ = self.client.scroll(self.collection, scroll_filter=lexical_filter, limit=64, with_vectors=False)
        by_id = {str(p.id): p for p in [*dense, *lexical]}
        dense_ids = [str(p.id) for p in dense]
        lexical_ids = bm25_order(question, [(str(p.id), self.evidence(p)["text"]) for p in lexical])
        candidates = reciprocal_rank(dense_ids, lexical_ids, limit=24)
        ranked = rerank_candidates(question, [(key, self.evidence(by_id[key])["text"]) for key in candidates])
        result = []; budget = 0
        for key in ranked:
            item = self.evidence(by_id[key]); size = len(item["text"].encode())
            if budget + size > 16000:
                continue
            result.append(item); budget += size
        return {"evidence": result}

    def chunks(self, scope_id: str, source_ids: list[str]):
        if not self.client.collection_exists(self.collection):
            raise ValueError("Index unavailable; re-index sources")
        result = []; offset = None
        while True:
            points, offset = self.client.scroll(self.collection, scroll_filter=self.scope_filter(scope_id, source_ids),
                limit=128, offset=offset, with_vectors=False)
            result.extend(self.evidence(point) for point in points)
            if len(result) > 10000:
                raise ValueError("Index exceeds source limit")
            if offset is None:
                break
        return {"evidence": sorted(result, key=lambda item: (item["sourceId"], item["position"]))}

    def delete(self, scope_id: str, source_id: str | None = None, clear_prepared=True):
        if clear_prepared:
            self.prepared_cache.clear_scope(scope_id)
        if self.client.collection_exists(self.collection):
            self.client.delete(self.collection, points_selector=models.FilterSelector(filter=self.scope_filter(scope_id, [source_id] if source_id else None)), wait=True)
        return {"ok": True}
