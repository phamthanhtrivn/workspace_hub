from enum import StrEnum

SERVICE_NAME = "ai-service"
SERVICE_VERSION = "0.1.0"
REQUEST_ID_HEADER = "X-Request-ID"
MAX_REQUEST_ID_LENGTH = 128
HEALTH_PATH = "/health"
READINESS_PATH = "/ready"


class ResponseMessage(StrEnum):
    SUCCESS = "Success"
    VALIDATION_FAILED = "Validation failed"
    INTERNAL_SERVER_ERROR = "Internal server error"
    INVALID_JSON = "Invalid JSON body"
    HEALTHY = "AI service is healthy"
    READY = "AI service is ready"
    NOT_READY = "AI service is not ready"
