import re
import unicodedata
from collections import Counter

from app.common.errors import ErrorCode, ProcessingError
from app.modules.documents.constants import MIN_TEXT_COVERAGE


def validate_text_coverage(expected: str, converted: str) -> None:
    def characters(value):
        normalized = unicodedata.normalize("NFKC", value).casefold()
        return Counter(re.sub(r"[\W_]", "", normalized))

    source, result = characters(expected), characters(converted)
    if source and sum((source & result).values()) / source.total() < MIN_TEXT_COVERAGE:
        raise ProcessingError(
            ErrorCode.INVALID_FILE_CONTENT,
            "Conversion did not preserve sufficient source text",
        )
