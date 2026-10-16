from uuid import UUID

from pydantic import Field, field_validator

from app.common.schemas import RequestSchema
from app.modules.documents.constants import MAX_FILES


class FileMetadata(RequestSchema):
    name: str = Field(min_length=1, max_length=255)
    mime_type: str = Field(min_length=1, max_length=200)
    size_bytes: int = Field(strict=True, ge=0)


class ValidateDocuments(RequestSchema):
    documents: list[FileMetadata] = Field(min_length=1, max_length=MAX_FILES)


class DocumentReference(RequestSchema):
    document_id: UUID
    version_id: str | None = Field(default=None, max_length=100)

    @field_validator("version_id")
    @classmethod
    def version_is_opaque_identifier(cls, value: str | None) -> str | None:
        if value is not None and value != "original":
            UUID(value)
        return value


class RegisterDocuments(RequestSchema):
    documents: list[DocumentReference] = Field(min_length=1, max_length=MAX_FILES)
