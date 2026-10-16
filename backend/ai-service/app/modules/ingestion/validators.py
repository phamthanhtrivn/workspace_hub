import zipfile
from pathlib import Path
from xml.etree import ElementTree

from pypdf import PdfReader

from app.common.errors import ErrorCode, ProcessingError
from app.modules.documents.constants import (
    MAX_FILE_BYTES,
    MAX_PDF_PAGES,
    MAX_ZIP_BYTES,
    MAX_ZIP_ENTRIES,
)


def fail(message: str, code: ErrorCode = ErrorCode.INVALID_FILE_CONTENT):
    raise ProcessingError(code, message)


def validate_text(path: Path) -> str:
    content = path.read_bytes()
    if content.startswith((b"%PDF", b"PK\x03\x04", b"MZ", b"\x7fELF")):
        fail("Text file contains a different file format")
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        fail("Text documents must use UTF-8 encoding")
    if any(ord(char) < 32 and char not in "\t\r\n\f" for char in text):
        fail("Text file contains binary control characters")
    if not text.strip():
        fail("Document contains no usable text", ErrorCode.EMPTY_DOCUMENT)
    return text


def validate_docx(path: Path) -> list[str]:
    try:
        with zipfile.ZipFile(path) as archive:
            entries = archive.infolist()
            if (
                len(entries) > MAX_ZIP_ENTRIES
                or sum(entry.file_size for entry in entries) > MAX_ZIP_BYTES
            ):
                fail("DOCX expansion limit exceeded", ErrorCode.DOCUMENT_LIMIT_EXCEEDED)
            if any(entry.flag_bits & 1 for entry in entries):
                fail("Encrypted documents are not supported", ErrorCode.PASSWORD_PROTECTED)
            names = set(archive.namelist())
            if any(
                name.startswith(("/", "\\")) or ".." in name.replace("\\", "/").split("/")
                for name in names
            ):
                fail("Unsafe DOCX archive paths")
            if not {"[Content_Types].xml", "word/document.xml", "_rels/.rels"} <= names:
                fail("File is not a DOCX document")
            if any(name.lower().endswith("vbaproject.bin") for name in names):
                fail("Macro-enabled documents are not supported")
            root = ElementTree.fromstring(archive.read("word/document.xml"))
            if root.tag != "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}document":
                fail("Invalid DOCX document structure")
            if not "".join(root.itertext()).strip():
                if any(name.startswith("word/media/") for name in names):
                    fail("Document images require OCR", ErrorCode.OCR_REQUIRED)
                fail("Document contains no usable text", ErrorCode.EMPTY_DOCUMENT)
            return (
                ["VISUAL_CONTENT_NOT_ANALYZED"]
                if any(name.startswith("word/media/") for name in names)
                else []
            )
    except ProcessingError:
        raise
    except (zipfile.BadZipFile, ElementTree.ParseError, KeyError, RuntimeError, OSError):
        fail("DOCX file is corrupt or has an invalid structure")


def _contains_image(resources, depth=0):
    if not resources or depth > 8:
        return False
    if hasattr(resources, "get_object"):
        resources = resources.get_object()
    objects = resources.get("/XObject", {})
    if hasattr(objects, "get_object"):
        objects = objects.get_object()
    for reference in objects.values():
        obj = reference.get_object()
        if obj.get("/Subtype") == "/Image" or _contains_image(obj.get("/Resources"), depth + 1):
            return True
    return False


def validate_pdf(path: Path):
    if not path.read_bytes()[:1024].lstrip().startswith(b"%PDF-"):
        fail("File signature does not match PDF")
    try:
        reader = PdfReader(path, strict=True)
        if reader.is_encrypted:
            fail("Password-protected PDFs are not supported", ErrorCode.PASSWORD_PROTECTED)
        if len(reader.pages) > MAX_PDF_PAGES:
            fail("PDF exceeds 200 pages", ErrorCode.DOCUMENT_LIMIT_EXCEEDED)
        warnings, usable = [], False
        for number, page in enumerate(reader.pages, 1):
            text = page.extract_text() or ""
            images = _contains_image(page.get("/Resources"))
            if images and not text.strip():
                fail(f"PDF page {number} requires OCR", ErrorCode.OCR_REQUIRED)
            usable |= bool(text.strip())
            if images:
                warnings.append(f"VISUAL_CONTENT_NOT_ANALYZED:page:{number}")
        if not usable:
            fail("PDF contains no usable text", ErrorCode.EMPTY_DOCUMENT)
        return reader, warnings
    except ProcessingError:
        raise
    except Exception:
        fail("PDF file is corrupt or cannot be read")


def validate_file_size(path: Path):
    if path.stat().st_size == 0:
        fail("File is empty", ErrorCode.EMPTY_DOCUMENT)
    if path.stat().st_size > MAX_FILE_BYTES:
        fail("File exceeds 20 MiB", ErrorCode.FILE_TOO_LARGE)
