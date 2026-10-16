from enum import StrEnum

from fastapi import HTTPException
from pydantic import JsonValue


class ErrorCode(StrEnum):
    UNSUPPORTED_FILE_TYPE = "UNSUPPORTED_FILE_TYPE"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    TOTAL_SIZE_EXCEEDED = "TOTAL_SIZE_EXCEEDED"
    INVALID_FILE_CONTENT = "INVALID_FILE_CONTENT"
    PASSWORD_PROTECTED = "PASSWORD_PROTECTED"
    OCR_REQUIRED = "OCR_REQUIRED"
    EMPTY_DOCUMENT = "EMPTY_DOCUMENT"
    DOCUMENT_LIMIT_EXCEEDED = "DOCUMENT_LIMIT_EXCEEDED"
    VALIDATION_FAILED = "VALIDATION_FAILED"
    SOURCE_UNAVAILABLE = "SOURCE_UNAVAILABLE"
    SOURCE_CHANGED = "SOURCE_CHANGED"
    SOURCE_NOT_READY = "SOURCE_NOT_READY"
    UNAUTHORIZED = "UNAUTHORIZED"
    NOT_FOUND = "NOT_FOUND"
    IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT"
    CONVERSATION_BUSY = "CONVERSATION_BUSY"
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"
    PROVIDER_QUOTA_EXCEEDED = "PROVIDER_QUOTA_EXCEEDED"
    INVALID_MODEL_OUTPUT = "INVALID_MODEL_OUTPUT"
    PARSE_TIMEOUT = "PARSE_TIMEOUT"
    JOB_INTERRUPTED = "JOB_INTERRUPTED"


class ApiError(HTTPException):
    def __init__(
        self, code: ErrorCode, message: str, status: int = 400, errors: JsonValue = None
    ) -> None:
        super().__init__(status, detail={"message": message, "code": str(code), "errors": errors})


class ProcessingError(Exception):
    def __init__(self, code: ErrorCode, message: str, *, retryable: bool = False) -> None:
        self.code, self.message, self.retryable = code, message, retryable
        super().__init__(message)

    def payload(self) -> dict:
        return {"code": str(self.code), "message": self.message, "retryable": self.retryable}
