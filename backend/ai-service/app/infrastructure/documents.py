import tempfile
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse

import httpx
import jwt

from app.common.errors import ApiError, ErrorCode, ProcessingError
from app.common.middleware.request_context import request_id_context
from app.core.auth import Actor
from app.modules.documents.constants import MAX_FILE_BYTES

RESOLVE_PATH = "/internal/ai/documents/resolve"
ACCESS_PATH = "/internal/ai/documents/access-check"


class DocumentClient:
    def __init__(self, settings) -> None:
        self.settings = settings

    def _post(self, path: str, actor: Actor, references: list[dict]) -> list[dict]:
        delegation = jwt.encode(
            {
                "sub": actor.id,
                "email": actor.email,
                "iss": "ai-service",
                "aud": "document-ai",
                "exp": datetime.now(UTC) + timedelta(seconds=60),
                "sources": references,
            },
            self.settings.internal_service_key.get_secret_value(),
            algorithm="HS256",
        )
        try:
            with httpx.Client(
                timeout=self.settings.internal_timeout_seconds, follow_redirects=False
            ) as client:
                response = client.post(
                    self.settings.document_service_url.rstrip("/") + path,
                    json={"documents": references},
                    headers={
                        "X-Internal-Service-Key": (
                            self.settings.internal_service_key.get_secret_value()
                        ),
                        "X-AI-Delegation": delegation,
                        "X-Request-ID": request_id_context.get(),
                    },
                )
                if response.status_code in (400, 403, 404, 409):
                    payload = response.json()
                    raise ApiError(
                        ErrorCode.SOURCE_CHANGED
                        if response.status_code == 409
                        else ErrorCode.SOURCE_UNAVAILABLE,
                        "One or more document sources are unavailable",
                        response.status_code,
                        errors=payload.get("errors"),
                    )
                response.raise_for_status()
                return response.json()["data"]
        except ApiError:
            raise
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            raise ApiError(
                ErrorCode.SOURCE_UNAVAILABLE, "Document authorization service is unavailable", 503
            ) from None

    def resolve(self, actor: Actor, references: list[dict]) -> list[dict]:
        return self._post(RESOLVE_PATH, actor, references)

    def access(self, actor: Actor, sources: list) -> list[dict]:
        references = [
            {
                "documentId": source.document_id,
                "versionId": source.version_id,
                "expectedRevision": source.revision,
            }
            for source in sources
        ]
        return self._post(ACCESS_PATH, actor, references)

    @contextmanager
    def download(self, manifest: dict):
        descriptor = urlparse(manifest["downloadUrl"])
        if (
            descriptor.scheme != "https"
            or not descriptor.hostname
            or not descriptor.hostname.endswith((".amazonaws.com", ".amazonaws.com.cn"))
            or descriptor.username
            or descriptor.password
            or descriptor.port not in (None, 443)
        ):
            raise ProcessingError(ErrorCode.SOURCE_UNAVAILABLE, "Invalid source storage descriptor")
        with tempfile.TemporaryDirectory(prefix="workspacehub-ai-") as directory:
            target = Path(directory) / ("source" + Path(manifest["name"]).suffix.lower())
            try:
                with httpx.Client(timeout=30, follow_redirects=False) as client:
                    with client.stream(
                        "GET", manifest["downloadUrl"], headers={"If-Match": manifest["etag"]}
                    ) as response:
                        response.raise_for_status()
                        size = 0
                        with target.open("wb") as output:
                            for block in response.iter_bytes(65536):
                                size += len(block)
                                if size > MAX_FILE_BYTES or size > manifest["sizeBytes"]:
                                    raise ProcessingError(
                                        ErrorCode.FILE_TOO_LARGE,
                                        "Downloaded file exceeds its declared size",
                                    )
                                output.write(block)
                if size != manifest["sizeBytes"]:
                    raise ProcessingError(
                        ErrorCode.INVALID_FILE_CONTENT,
                        "Downloaded size does not match the manifest",
                    )
                yield target
            except httpx.HTTPError:
                raise ProcessingError(
                    ErrorCode.SOURCE_CHANGED,
                    "Source download failed or its revision changed",
                    retryable=True,
                ) from None
