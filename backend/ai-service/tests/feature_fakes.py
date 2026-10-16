import hashlib
import json
from contextlib import contextmanager
from pathlib import Path

from app.common.errors import ApiError, ErrorCode
from app.modules.conversations.schemas import RewrittenQuestion


class DocumentsFake:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.files = {}
        self.denied = set()
        self.access_calls = 0

    def add(self, document_id, name, content, mime="text/plain"):
        self.files[document_id] = {
            "documentId": document_id,
            "versionId": "original",
            "revision": hashlib.sha256(content).hexdigest(),
            "name": name,
            "mimeType": mime,
            "sizeBytes": len(content),
            "etag": '"test-etag"',
            "bytes": content,
        }

    def resolve(self, actor, references):
        results = []
        for reference in references:
            document_id = reference["documentId"]
            if document_id in self.denied or document_id not in self.files:
                raise ApiError(ErrorCode.SOURCE_UNAVAILABLE, "Document source unavailable", 403)
            manifest = self.files[document_id]
            if reference.get("expectedRevision", manifest["revision"]) != manifest["revision"]:
                raise ApiError(ErrorCode.SOURCE_CHANGED, "Document revision changed", 409)
            results.append({key: value for key, value in manifest.items() if key != "bytes"})
        return results

    def access(self, actor, sources):
        self.access_calls += 1
        return self.resolve(
            actor,
            [
                {
                    "documentId": source.document_id,
                    "versionId": source.version_id,
                    "expectedRevision": source.revision,
                }
                for source in sources
            ],
        )

    @contextmanager
    def download(self, manifest):
        path = self.directory / manifest["name"]
        path.write_bytes(self.files[manifest["documentId"]]["bytes"])
        try:
            yield path
        finally:
            path.unlink(missing_ok=True)


class ProviderFake:
    embeddings = 0
    generations = 0

    def __init__(self, database, settings, job_id, check_active):
        self.check_active = check_active

    def embed(self, content, **kwargs):
        self.check_active()
        type(self).embeddings += 1
        return [1.0] + [0.0] * 767

    def generate(self, prompt, schema, system):
        self.check_active()
        type(self).generations += 1
        request = json.loads(prompt)
        if schema == RewrittenQuestion:
            return RewrittenQuestion(question=request["question"])
        evidence = request["evidence"]
        return schema.model_validate(
            {
                "answer_status": "ANSWERED",
                "claims": [
                    {
                        "text": f"According to {chunk['source']}: {chunk['text']}",
                        "citation_ids": [chunk["id"]],
                    }
                    for chunk in evidence
                ],
            }
        )

    def close(self):
        pass
