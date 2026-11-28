"""Parse bounded document text without embedding or vector-store access."""
import base64
import tempfile
from pathlib import Path

from .errors import InvalidSource
from .policy import MAX_SOURCE_TOKENS, bounded_text


class SourceParser:
    def __init__(self, tokenizer):
        self.tokenizer = tokenizer
        self.converter = None

    def parse(self, name: str, content: str | bytes) -> list[tuple[str, int | None]]:
        from pypdf.errors import PdfReadError
        from zipfile import BadZipFile
        try:
            return self._parse(name, content)
        except InvalidSource:
            raise
        except (ValueError, UnicodeError, PdfReadError, BadZipFile) as error:
            raise InvalidSource("Invalid, scanned, encrypted or oversized source") from error

    def _parse(self, name: str, content: str | bytes) -> list[tuple[str, int | None]]:
        data = content if isinstance(content, bytes) else base64.b64decode(content, validate=True)
        if not data or len(data) > 20 * 1024 * 1024:
            raise ValueError("File exceeds 20 MiB or is empty")
        suffix = Path(name).suffix.lower()
        if suffix in (".txt", ".md"):
            pages = [(bounded_text(data.decode("utf-8-sig")), None)]
        elif suffix == ".pdf":
            import io
            from pypdf import PdfReader
            pdf = PdfReader(io.BytesIO(data))
            if pdf.is_encrypted:
                raise InvalidSource("Encrypted PDF", "PDF_ENCRYPTED")
            if len(pdf.pages) > 100:
                raise InvalidSource("PDF exceeds 100 pages", "PDF_PAGE_LIMIT")
            # Text PDFs do not need the heavyweight neural layout/table models.
            # Keep page numbers for citations; never silently run OCR on scanned pages.
            pages = []
            token_count = 0
            for number, page in enumerate(pdf.pages, 1):
                text = page.extract_text() or ""
                if not text.strip() and len(page.images):
                    raise InvalidSource("Scanned PDF page requires OCR", "PDF_OCR_REQUIRED")
                token_count += len(self.tokenizer(text))
                if token_count > MAX_SOURCE_TOKENS:
                    raise InvalidSource("Document exceeds 100000 tokens", "SOURCE_TOKEN_LIMIT")
                pages.append((text, number))
        elif suffix == ".docx":
            import io
            import zipfile
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                if sum(item.file_size for item in archive.infolist()) > 100 * 1024 * 1024:
                    raise InvalidSource("Expanded DOCX exceeds 100 MiB", "DOCX_EXPANDED_LIMIT")
                if not {"[Content_Types].xml", "word/document.xml"}.issubset(archive.namelist()):
                    raise InvalidSource("Invalid DOCX archive")
            if self.converter is None:
                from docling.document_converter import DocumentConverter
                from docling.datamodel.base_models import InputFormat
                self.converter = DocumentConverter(allowed_formats=[InputFormat.DOCX])
            with tempfile.TemporaryDirectory(prefix="wh-notebook-") as directory:
                path = Path(directory) / ("source" + suffix)
                path.write_bytes(data)
                result = self.converter.convert(path, max_num_pages=100)
                doc = result.document
                pages = [(doc.export_to_markdown(), None)]
        else:
            raise ValueError("Unsupported extension")
        bounded_text("\n".join(text for text, _ in pages))
        if suffix != ".pdf" and sum(len(self.tokenizer(text)) for text, _ in pages) > MAX_SOURCE_TOKENS:
            raise InvalidSource("Document exceeds 100000 tokens", "SOURCE_TOKEN_LIMIT")
        return pages

