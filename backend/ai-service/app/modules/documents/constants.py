from enum import StrEnum

API_PREFIX = "/api/ai"
MAX_FILES = 5
MAX_FILE_BYTES = 20 * 1024 * 1024
MAX_TOTAL_BYTES = 50 * 1024 * 1024
MAX_PDF_PAGES = 200
MAX_FILE_TOKENS = 100000
MAX_TOTAL_TOKENS = 200000
MAX_FILE_CHUNKS = 256
MAX_TOTAL_CHUNKS = 512
MAX_ZIP_BYTES = 100 * 1024 * 1024
MAX_ZIP_ENTRIES = 5000
EMBEDDING_DIMENSIONS = 768
CHUNK_TOKENS = 600
CHUNK_OVERLAP = 80
MIN_TEXT_COVERAGE = 0.9
PIPELINE_VERSION = "markitdown-v1"
MIME_TYPES = {
    ".pdf": {"application/pdf"},
    ".docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
    ".txt": {"text/plain"},
    ".md": {"text/markdown", "text/x-markdown", "text/plain"},
}


class JobKind(StrEnum):
    BATCH = "INGEST_BATCH"
    INGEST = "INGEST_DOCUMENT"
    ANSWER = "ANSWER"


class State(StrEnum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    READY = "READY"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


ACTIVE_STATES = (State.QUEUED, State.RUNNING)
