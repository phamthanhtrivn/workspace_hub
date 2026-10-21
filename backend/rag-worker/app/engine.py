import base64
import hashlib
import os
import tempfile
import threading
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

import httpx
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.utils import get_tokenizer
from qdrant_client import QdrantClient, models

from .policy import bounded_text, query_terms, reciprocal_rank


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
        self.tokenizer = get_tokenizer()
        self.splitter = SentenceSplitter(chunk_size=384, chunk_overlap=48, tokenizer=self.tokenizer)
        signature = f"{self.provider}:{self.model_name}:384:48:{os.environ.get('INDEX_PIPELINE_VERSION', 'notebook-v1')}"
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

    def parse(self, name: str, content: str) -> list[tuple[str, int | None]]:
        data = base64.b64decode(content, validate=True)
        if not data or len(data) > 20 * 1024 * 1024:
            raise ValueError("File exceeds 20 MiB or is empty")
        suffix = Path(name).suffix.lower()
        if suffix in (".txt", ".md"):
            pages = [(bounded_text(data.decode("utf-8-sig")), None)]
        elif suffix in (".pdf", ".docx"):
            if suffix == ".docx":
                import io
                import zipfile
                with zipfile.ZipFile(io.BytesIO(data)) as archive:
                    if sum(item.file_size for item in archive.infolist()) > 100 * 1024 * 1024:
                        raise ValueError("Expanded DOCX exceeds 100 MiB")
            else:
                import io
                from pypdf import PdfReader
                pdf = PdfReader(io.BytesIO(data))
                if pdf.is_encrypted or len(pdf.pages) > 100:
                    raise ValueError("PDF must be unencrypted and at most 100 pages")
            if self.converter is None:
                from docling.document_converter import DocumentConverter, PdfFormatOption
                from docling.datamodel.base_models import InputFormat
                from docling.datamodel.pipeline_options import PdfPipelineOptions
                options = PdfPipelineOptions(do_ocr=False)
                self.converter = DocumentConverter(allowed_formats=[InputFormat.PDF, InputFormat.DOCX],
                    format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=options)})
            with tempfile.TemporaryDirectory(prefix="wh-notebook-") as directory:
                path = Path(directory) / ("source" + suffix)
                path.write_bytes(data)
                result = self.converter.convert(path, max_num_pages=100)
                doc = result.document
                pages = [(doc.export_to_markdown(page_no=page), page) for page in sorted(doc.pages)] if suffix == ".pdf" else [(doc.export_to_markdown(), None)]
        else:
            raise ValueError("Unsupported extension")
        bounded_text("\n".join(text for text, _ in pages))
        if sum(len(self.tokenizer(text)) for text, _ in pages) > 40_000:
            raise ValueError("Document exceeds 40000 tokens; split into smaller sources")
        return pages

    def scope_filter(self, scope_id: str, source_ids: list[str] | None = None):
        conditions = [models.FieldCondition(key="scopeId", match=models.MatchValue(value=scope_id))]
        if source_ids:
            conditions.append(models.FieldCondition(key="sourceId", match=models.MatchAny(any=source_ids)))
        return models.Filter(must=conditions)

    def index(self, scope_id: str, source_id: str, revision: str, name: str, content: str):
        # Serialize CPU parsing/embedding, leaving retrieval to independent HTTP threads.
        with self.index_lock:
            pages = self.parse(name, content)
            chunks = [(part, page) for text, page in pages for part in self.splitter.split_text(text) if part.strip()]
            if not chunks or len(chunks) > 2000:
                raise ValueError("Empty or oversized index")
            first = self.embed([chunks[0][0]])
            if not self.client.collection_exists(self.collection):
                self.client.create_collection(self.collection, vectors_config=models.VectorParams(size=len(first[0]), distance=models.Distance.COSINE))
                self.client.create_payload_index(self.collection, "scopeId", models.PayloadSchemaType.KEYWORD)
                self.client.create_payload_index(self.collection, "sourceId", models.PayloadSchemaType.KEYWORD)
                self.client.create_payload_index(self.collection, "text", models.TextIndexParams(type="text", tokenizer=models.TokenizerType.MULTILINGUAL, lowercase=True))
            # Old partial writes are safe to replace; API only retrieves READY SQL sources.
            self.delete(scope_id, source_id)
            for start in range(0, len(chunks), 16):
                batch = chunks[start:start + 16]
                vectors = first if len(chunks) == 1 else self.embed([text for text, _ in batch])
                points = [models.PointStruct(id=str(uuid5(NAMESPACE_URL, f"{scope_id}:{source_id}:{revision}:{start+i}")), vector=vector,
                    payload={"scopeId": scope_id, "sourceId": source_id, "revision": revision, "text": text, "page": page, "position": start + i})
                    for i, ((text, page), vector) in enumerate(zip(batch, vectors, strict=True))]
                self.client.upsert(self.collection, points, wait=True)
            return {"chunkCount": len(chunks)}

    @staticmethod
    def evidence(point):
        payload = point.payload
        return {"id": str(point.id), "sourceId": payload["sourceId"], "text": payload["text"],
                "page": payload.get("page"), "position": payload["position"]}

    def retrieve(self, scope_id: str, source_ids: list[str], question: str):
        if not self.client.collection_exists(self.collection):
            raise ValueError("Index pipeline changed; re-index sources")
        filter_ = self.scope_filter(scope_id, source_ids)
        dense = self.client.query_points(self.collection, query=self.embed([question], query=True)[0],
            query_filter=filter_, limit=12, with_payload=True).points
        terms = query_terms(question)
        lexical = []
        if terms:
            lexical_filter = models.Filter(must=filter_.must, should=[models.FieldCondition(key="text", match=models.MatchText(text=term)) for term in terms])
            lexical, _ = self.client.scroll(self.collection, scroll_filter=lexical_filter, limit=12, with_vectors=False)
        by_id = {str(p.id): p for p in [*dense, *lexical]}
        ranked = reciprocal_rank([str(p.id) for p in dense], [str(p.id) for p in lexical])
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

    def delete(self, scope_id: str, source_id: str | None = None):
        if self.client.collection_exists(self.collection):
            self.client.delete(self.collection, points_selector=models.FilterSelector(filter=self.scope_filter(scope_id, [source_id] if source_id else None)), wait=True)
        return {"ok": True}
