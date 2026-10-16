import io
import multiprocessing
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree

from pypdf import PdfWriter

from app.common.errors import ErrorCode, ProcessingError
from app.modules.ingestion.quality import validate_text_coverage
from app.modules.ingestion.validators import (
    validate_docx,
    validate_file_size,
    validate_pdf,
    validate_text,
)


def _convert(path: Path) -> dict:
    from markitdown import MarkItDown

    validate_file_size(path)
    converter = MarkItDown(enable_plugins=False)
    extension = path.suffix.lower()
    blocks, warnings = [], []

    def markdown(stream, suffix):
        result = converter.convert_stream(stream, file_extension=suffix)
        return getattr(result, "text_content", None) or getattr(result, "markdown", "")

    if extension == ".pdf":
        reader, warnings = validate_pdf(path)
        for page_number, page in enumerate(reader.pages, 1):
            writer = PdfWriter()
            writer.add_page(page)
            stream = io.BytesIO()
            writer.write(stream)
            stream.seek(0)
            text = markdown(stream, ".pdf")
            validate_text_coverage(page.extract_text() or "", text)
            if text.strip():
                blocks.append({"content": text, "locator": {"kind": "PDF", "page": page_number}})
    else:
        if extension == ".docx":
            warnings = validate_docx(path)
            with path.open("rb") as stream:
                text = markdown(stream, extension)
            with zipfile.ZipFile(path) as archive:
                root = ElementTree.fromstring(archive.read("word/document.xml"))
                expected = " ".join(
                    node.text or ""
                    for node in root.iter(
                        "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t"
                    )
                )
            validate_text_coverage(expected, text)
        elif extension in (".txt", ".md"):
            text = validate_text(path)
        else:
            raise ProcessingError(ErrorCode.UNSUPPORTED_FILE_TYPE, "Unsupported document format")
        # Images never become opaque base64 chunks presented as textual evidence.
        text = re.sub(r"!\[[^\]]*\]\([^)]*\)", "[Image not analyzed]", text)
        section, paragraph, offset = [], 0, 1
        for segment in re.split(r"(\n\s*\n)", text):
            if not segment:
                continue
            line_count = segment.count("\n")
            if segment.strip():
                paragraph += 1
                heading = re.match(r"^(#{1,6})\s+(.+)", segment)
                if heading:
                    level = len(heading[1])
                    section = section[: level - 1] + [heading[2]]
                locator = {
                    "kind": "DOCX" if extension == ".docx" else "TEXT",
                    "section": section.copy(),
                    "paragraph": paragraph,
                    "startLine": offset,
                    "endLine": offset + line_count,
                }
                blocks.append({"content": segment, "locator": locator})
            offset += line_count
    if not blocks:
        raise ProcessingError(ErrorCode.EMPTY_DOCUMENT, "Conversion produced no usable text")
    return {"blocks": blocks, "warnings": warnings}


def _child(path: str, connection):
    try:
        # Parsing untrusted documents is isolated from the API/worker process.
        try:
            import resource

            resource.setrlimit(resource.RLIMIT_AS, (1024 * 1024 * 1024,) * 2)
            resource.setrlimit(resource.RLIMIT_CPU, (120, 120))
        except ImportError:
            pass
        connection.send({"result": _convert(Path(path))})
    except ProcessingError as error:
        connection.send({"error": error.payload()})
    except Exception:
        connection.send(
            {
                "error": {
                    "code": str(ErrorCode.INVALID_FILE_CONTENT),
                    "message": "Document conversion failed",
                    "retryable": False,
                }
            }
        )
    finally:
        connection.close()


def convert_isolated(path: Path, timeout: int) -> dict:
    context = multiprocessing.get_context("spawn")
    parent, child = context.Pipe(duplex=False)
    process = context.Process(target=_child, args=(str(path), child))
    process.start()
    child.close()
    try:
        if not parent.poll(timeout):
            raise ProcessingError(
                ErrorCode.PARSE_TIMEOUT, "Document parsing exceeded its time limit"
            )
        try:
            response = parent.recv()
        except EOFError:
            raise ProcessingError(
                ErrorCode.INVALID_FILE_CONTENT, "Document parser exceeded resource limits"
            ) from None
        if "error" in response:
            error = response["error"]
            raise ProcessingError(ErrorCode(error["code"]), error["message"])
        return response["result"]
    finally:
        parent.close()
        if process.is_alive():
            process.terminate()
        process.join(timeout=5)
        if process.is_alive():
            process.kill()
            process.join()
