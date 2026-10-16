from pathlib import PurePath

from app.common.errors import ApiError, ErrorCode
from app.modules.documents.constants import MAX_FILE_BYTES, MAX_FILES, MAX_TOTAL_BYTES, MIME_TYPES
from app.modules.documents.schemas import FileMetadata


def validate_metadata(documents: list[FileMetadata]) -> dict:
    errors = {}
    if not 1 <= len(documents) <= MAX_FILES:
        raise ApiError(ErrorCode.DOCUMENT_LIMIT_EXCEEDED, f"Select 1 to {MAX_FILES} documents")
    for position, document in enumerate(documents):
        extension = PurePath(document.name).suffix.lower()
        error = None
        if (
            "/" in document.name
            or "\\" in document.name
            or "\x00" in document.name
            or any(ord(char) < 32 for char in document.name)
        ):
            error = (
                ErrorCode.INVALID_FILE_CONTENT,
                "File name must not contain paths or control characters",
            )
        elif (
            extension not in MIME_TYPES
            or document.mime_type.split(";", 1)[0].strip().lower() not in MIME_TYPES[extension]
        ):
            error = (
                ErrorCode.UNSUPPORTED_FILE_TYPE,
                "Supported files: PDF with text, DOCX, UTF-8 TXT and Markdown",
            )
        elif document.size_bytes == 0:
            error = (ErrorCode.EMPTY_DOCUMENT, "File is empty")
        elif document.size_bytes > MAX_FILE_BYTES:
            error = (ErrorCode.FILE_TOO_LARGE, "Maximum file size is 20 MiB")
        if error:
            errors[str(position)] = {
                "name": document.name,
                "code": str(error[0]),
                "message": error[1],
            }
    if sum(document.size_bytes for document in documents) > MAX_TOTAL_BYTES:
        errors["totalSize"] = {
            "code": str(ErrorCode.TOTAL_SIZE_EXCEEDED),
            "message": "Maximum combined size is 50 MiB",
        }
    if errors:
        raise ApiError(
            ErrorCode.VALIDATION_FAILED, "Document validation failed", errors={"documents": errors}
        )
    return {
        "valid": True,
        "documents": [document.model_dump(by_alias=True) for document in documents],
        "limits": {
            "maxFiles": MAX_FILES,
            "maxFileBytes": MAX_FILE_BYTES,
            "maxTotalBytes": MAX_TOTAL_BYTES,
        },
        "supportedMimeTypes": MIME_TYPES,
    }
