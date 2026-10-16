from sqlalchemy import select

from app.common.errors import ApiError, ErrorCode
from app.modules.documents.models import DocumentIndex, DocumentSource


def owned_source(session, source_id: str, actor_id: str) -> DocumentSource:
    source = session.get(DocumentSource, source_id)
    if not source or source.owner_id != actor_id:
        raise ApiError(ErrorCode.NOT_FOUND, "Document source not found", 404)
    return source


def current_index(session, source_id: str) -> DocumentIndex:
    index = session.scalar(
        select(DocumentIndex)
        .where(DocumentIndex.source_id == source_id)
        .order_by(DocumentIndex.created_at.desc(), DocumentIndex.id.desc())
    )
    if not index:
        raise ApiError(ErrorCode.NOT_FOUND, "Document index not found", 404)
    return index


def source_response(source: DocumentSource, index: DocumentIndex) -> dict:
    return {
        "id": source.id,
        "documentId": source.document_id,
        "versionId": source.version_id,
        "name": source.manifest["name"],
        "sizeBytes": source.manifest["sizeBytes"],
        "indexId": index.id,
        "status": index.status,
        "warnings": index.warnings,
        "error": index.error,
    }
