import zipfile

import pytest
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject, NumberObject

from app.common.errors import ApiError, ProcessingError
from app.modules.documents.schemas import FileMetadata
from app.modules.documents.validation import validate_metadata
from app.modules.ingestion.converter import _convert, convert_isolated
from app.modules.ingestion.quality import validate_text_coverage
from app.modules.ingestion.validators import validate_docx, validate_pdf, validate_text


def text_pdf(path, image_only=False, blank_first=False):
    writer = PdfWriter()
    if blank_first:
        writer.add_blank_page(width=300, height=300)
    page = writer.add_blank_page(width=300, height=300)
    if image_only:
        image = DecodedStreamObject()
        image.set_data(bytes([255, 255, 255]))
        image.update(
            {
                NameObject("/Type"): NameObject("/XObject"),
                NameObject("/Subtype"): NameObject("/Image"),
                NameObject("/Width"): NumberObject(1),
                NameObject("/Height"): NumberObject(1),
                NameObject("/ColorSpace"): NameObject("/DeviceRGB"),
                NameObject("/BitsPerComponent"): NumberObject(8),
            }
        )
        page[NameObject("/Resources")] = DictionaryObject(
            {
                NameObject("/XObject"): DictionaryObject(
                    {NameObject("/Image"): writer._add_object(image)}
                )
            }
        )
    else:
        font = DictionaryObject(
            {
                NameObject("/Type"): NameObject("/Font"),
                NameObject("/Subtype"): NameObject("/Type1"),
                NameObject("/BaseFont"): NameObject("/Helvetica"),
            }
        )
        page[NameObject("/Resources")] = DictionaryObject(
            {NameObject("/Font"): DictionaryObject({NameObject("/F1"): writer._add_object(font)})}
        )
        stream = DecodedStreamObject()
        stream.set_data(b"BT /F1 12 Tf 20 200 Td (Delivery date: 20 October 2026) Tj ET")
        page[NameObject("/Contents")] = writer._add_object(stream)
    page[NameObject("/Resources")] = writer._add_object(page[NameObject("/Resources")])
    writer.write(path)


@pytest.mark.parametrize(
    "name,mime,size,code",
    [
        ("file.exe", "application/octet-stream", 10, "UNSUPPORTED_FILE_TYPE"),
        ("file.pdf", "text/plain", 10, "UNSUPPORTED_FILE_TYPE"),
        ("../file.txt", "text/plain", 10, "INVALID_FILE_CONTENT"),
        ("file.txt", "text/plain", 21 * 1024 * 1024, "FILE_TOO_LARGE"),
    ],
)
def test_metadata_rejects_unsupported_inputs(name, mime, size, code):
    with pytest.raises(ApiError) as failure:
        validate_metadata([FileMetadata(name=name, mimeType=mime, sizeBytes=size)])
    assert failure.value.detail["errors"]["documents"]["0"]["code"] == code


def test_metadata_rejects_total_size():
    with pytest.raises(ApiError) as failure:
        validate_metadata(
            [
                FileMetadata(name=f"file{n}.txt", mimeType="text/plain", sizeBytes=20 * 1024 * 1024)
                for n in range(3)
            ]
        )
    assert failure.value.detail["errors"]["documents"]["totalSize"]["code"] == "TOTAL_SIZE_EXCEEDED"


@pytest.mark.parametrize(
    "content", [b"%PDF-1.7 fake", b"\x00binary", b"\xffinvalid-utf8", b"PK\x03\x04zip"]
)
def test_text_validator_detects_binary_or_disguised_files(tmp_path, content):
    path = tmp_path / "disguised.txt"
    path.write_bytes(content)
    with pytest.raises(ProcessingError):
        validate_text(path)


def test_utf8_bom_and_vietnamese_are_preserved(tmp_path):
    path = tmp_path / "notes.txt"
    path.write_bytes(b"\xef\xbb\xbf" + "Thời hạn bàn giao: ngày mai".encode())
    assert validate_text(path) == "Thời hạn bàn giao: ngày mai"


def test_pdf_conversion_preserves_real_page_and_accepts_blank_pages(tmp_path):
    path = tmp_path / "source.pdf"
    text_pdf(path, blank_first=True)
    result = convert_isolated(path, 30)
    assert len(result["blocks"]) == 1
    assert result["blocks"][0]["locator"]["page"] == 2
    assert "20 October" in result["blocks"][0]["content"]


def test_scan_pdf_requires_ocr(tmp_path):
    path = tmp_path / "scan.pdf"
    text_pdf(path, image_only=True, blank_first=True)
    with pytest.raises(ProcessingError) as failure:
        validate_pdf(path)
    assert failure.value.code == "OCR_REQUIRED"


def test_encrypted_pdf_is_rejected(tmp_path):
    path = tmp_path / "encrypted.pdf"
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    writer.encrypt("password")
    writer.write(path)
    with pytest.raises(ProcessingError) as failure:
        validate_pdf(path)
    assert failure.value.code == "PASSWORD_PROTECTED"


def test_docx_structure_and_expansion_are_validated(tmp_path):
    path = tmp_path / "fake.docx"
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("arbitrary.txt", "not a DOCX")
    with pytest.raises(ProcessingError):
        validate_docx(path)


def test_real_docx_conversion_preserves_vietnamese_and_section_locators(tmp_path):
    path = tmp_path / "notes.docx"
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr(
            "[Content_Types].xml",
            """<?xml version="1.0"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>""",
        )
        archive.writestr(
            "_rels/.rels",
            """<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>""",
        )
        archive.writestr(
            "word/document.xml",
            """<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
<w:p><w:r><w:t>Thời hạn bàn giao: 20/10/2026</w:t></w:r></w:p>
</w:body></w:document>""",
        )
    result = convert_isolated(path, 30)
    assert "Thời hạn bàn giao" in result["blocks"][0]["content"]
    assert result["blocks"][0]["locator"]["kind"] == "DOCX"


def test_conversion_timeout_terminates_parser(tmp_path):
    path = tmp_path / "notes.txt"
    path.write_text("Valid text")
    with pytest.raises(ProcessingError) as failure:
        convert_isolated(path, 0)
    assert failure.value.code == "PARSE_TIMEOUT"


def test_conversion_must_not_silently_drop_a_text_page(tmp_path, monkeypatch):
    from types import SimpleNamespace

    from markitdown import MarkItDown

    path = tmp_path / "source.pdf"
    text_pdf(path, blank_first=True)
    monkeypatch.setattr(
        MarkItDown, "convert_stream", lambda *args, **kwargs: SimpleNamespace(text_content="")
    )
    with pytest.raises(ProcessingError) as failure:
        _convert(path)
    assert failure.value.code == "INVALID_FILE_CONTENT"


def test_coverage_allows_markdown_formatting_but_rejects_content_loss():
    validate_text_coverage("Delivery date: 20 October 2026", "**Delivery date:** 20 October 2026")
    with pytest.raises(ProcessingError):
        validate_text_coverage("Delivery date: 20 October 2026", "Delivery")
