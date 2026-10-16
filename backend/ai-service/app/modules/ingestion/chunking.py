import re

import tiktoken

from app.common.errors import ErrorCode, ProcessingError
from app.modules.documents.constants import (
    CHUNK_OVERLAP,
    CHUNK_TOKENS,
    MAX_FILE_CHUNKS,
    MAX_FILE_TOKENS,
)


def tokenizer():
    return tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    return len(tokenizer().encode(text, disallowed_special=()))


def create_chunks(blocks: list[dict]) -> tuple[list[dict], int]:
    encoder = tokenizer()
    total = sum(count_tokens(block["content"]) for block in blocks)
    if total > MAX_FILE_TOKENS:
        raise ProcessingError(
            ErrorCode.DOCUMENT_LIMIT_EXCEEDED, "Document exceeds 100000 text tokens"
        )
    chunks = []
    for block in blocks:
        content = block["content"]
        # Keep small paragraphs/sections together, rather than embedding a heading on its own.
        if (
            chunks
            and chunks[-1]["locator"].get("kind") == block["locator"].get("kind")
            and chunks[-1]["locator"].get("page") == block["locator"].get("page")
            and chunks[-1]["locator"].get("section") == block["locator"].get("section")
            and count_tokens(chunks[-1]["content"] + content) <= CHUNK_TOKENS
        ):
            chunks[-1]["content"] += "\n\n" + content
            chunks[-1]["locator"] = {
                **chunks[-1]["locator"],
                **(
                    {
                        "endLine": block["locator"]["endLine"],
                        "endParagraph": block["locator"]["paragraph"],
                    }
                    if "endLine" in block["locator"]
                    else {}
                ),
            }
            continue
        tokens = encoder.encode(content, disallowed_special=())
        table_header = ""
        lines = content.splitlines()
        for index, line in enumerate(lines[1:], 1):
            if re.match(r"^\s*\|?[\s:|-]+\|[\s:|-]*$", line):
                table_header = "\n".join(lines[index - 1 : index + 1]) + "\n"
                break
        position = 0
        while position < len(tokens):
            end = min(position + CHUNK_TOKENS, len(tokens))
            # UTF-8 roundtrips must not introduce replacement characters in citations.
            while end < len(tokens) and "\ufffd" in encoder.decode(tokens[position:end]):
                end += 1
            text = encoder.decode(tokens[position:end])
            if table_header and position:
                text = table_header + text
            chunks.append({"content": text, "locator": block["locator"]})
            if end == len(tokens):
                break
            position = end - CHUNK_OVERLAP
            while position < end and "\ufffd" in encoder.decode(tokens[position:end]):
                position += 1
    if len(chunks) > MAX_FILE_CHUNKS:
        raise ProcessingError(ErrorCode.DOCUMENT_LIMIT_EXCEEDED, "Document exceeds 256 chunks")
    return chunks, total
