import base64
import io
import os
import shutil
import unittest
from unittest.mock import patch

from PIL import Image, ImageDraw
from fixture_font import fixture_font
from pypdf import PdfWriter

from app.errors import InvalidSource
from app.visual import VisualExtractor, image_url, open_image, ocr_image

requires_ocr = unittest.skipUnless(shutil.which("tesseract"), "Tesseract OCR unavailable; run this test in the RAG Docker image")


def text_image(text="Doanh thu nam 2026: 120 trieu dong"):
    image = Image.new("RGB", (1500, 500), "white")
    draw = ImageDraw.Draw(image)
    font = fixture_font(42)
    draw.text((40, 70), text, fill="black", font=font)
    draw.text((40, 150), "Chi phi: 80 trieu dong. Loi nhuan: 40 trieu dong.", fill="black", font=font)
    return image


class VisualTests(unittest.TestCase):
    @requires_ocr
    def test_real_local_ocr_reads_generated_vietnamese_image(self):
        with text_image("Doanh thu năm 2026: 120 triệu đồng") as image:
            text, needs_vision = ocr_image(image)
        self.assertIn("2026", text)
        self.assertIn("120", text)
        self.assertIn("80", text)
        self.assertIn("triệu", text)

    @requires_ocr
    def test_standalone_image_is_normalized_and_keeps_ocr_context(self):
        with text_image() as image, io.BytesIO() as output:
            image.save(output, "PNG")
            result = VisualExtractor(lambda *_: []).extract("fixture.png", output.getvalue())
        self.assertEqual(len(result["images"]), 1)
        self.assertIn("120", result["pages"][0]["text"])
        self.assertEqual(result["pages"][0]["imageId"], result["images"][0]["id"])
        self.assertTrue(result["images"][0]["dataUrl"].startswith("data:image/jpeg;base64,"))
        self.assertEqual(len(result["images"][0]["hash"]), 64)

    def test_mismatched_binary_animation_and_dimensions_are_rejected(self):
        with self.assertRaises(InvalidSource):
            open_image(b"not an image", ".png")
        with Image.new("RGB", (64, 64), "white") as image, io.BytesIO() as output:
            image.save(output, "PNG")
            with self.assertRaises(InvalidSource):
                open_image(output.getvalue(), ".jpg")
        with Image.new("RGB", (10, 10), "white") as image, io.BytesIO() as output:
            image.save(output, "PNG")
            with self.assertRaises(InvalidSource):
                open_image(output.getvalue(), ".png")

    @requires_ocr
    def test_real_scanned_pdf_uses_ocr_and_preserves_page_number(self):
        with text_image() as image, io.BytesIO() as output:
            image.save(output, "PDF", resolution=144)
            result = VisualExtractor(lambda *_: []).extract("scan.pdf", output.getvalue())
        self.assertEqual(result["pages"][0]["page"], 1)
        self.assertIn("2026", result["pages"][0]["text"])

    def test_blank_pdf_pages_are_not_sent_for_remote_analysis(self):
        writer = PdfWriter()
        writer.add_blank_page(width=500, height=500)
        with io.BytesIO() as output:
            writer.write(output)
            with patch("app.visual.ocr_image") as ocr:
                result = VisualExtractor(lambda *_: []).extract("blank.pdf", output.getvalue())
                ocr.assert_not_called()
        self.assertEqual(result["images"], [])

    @requires_ocr
    def test_real_vector_diagram_without_embedded_raster_is_retained(self):
        from pypdf.generic import DecodedStreamObject, NameObject
        writer = PdfWriter()
        page = writer.add_blank_page(width=500, height=300)
        stream = DecodedStreamObject()
        stream.set_data(b"1 0 0 rg 20 20 100 100 re f 0 0 1 rg 250 20 100 100 re f 0 0 0 RG 120 70 m 250 70 l S")
        page[NameObject("/Contents")] = writer._add_object(stream)
        with io.BytesIO() as output:
            writer.write(output)
            result = VisualExtractor(lambda *_: []).extract("diagram.pdf", output.getvalue())
        self.assertEqual(len(result["images"]), 1)
        self.assertEqual(result["images"][0]["page"], 1)

    def test_limits_are_explicit_and_not_silent_truncation(self):
        extractor = VisualExtractor(lambda *_: [])
        with Image.new("RGB", (100, 100), "red") as image:
            for index in range(24):
                extractor.add_image(image, index + 1, "")
            with self.assertRaises(InvalidSource) as error:
                extractor.add_image(image, 25, "")
        self.assertEqual(error.exception.code, "VISUAL_PAGE_LIMIT")

    @requires_ocr
    def test_docx_extracts_raster_images_with_archive_names_never_used_as_paths(self):
        import zipfile
        with text_image() as image, io.BytesIO() as raster, io.BytesIO() as archive:
            image.save(raster, "PNG")
            with zipfile.ZipFile(archive, "w") as output:
                output.writestr("word/media/image1.png", raster.getvalue())
            result = VisualExtractor(lambda *_: [("Nội dung Word", None)]).extract("fixture.docx", archive.getvalue())
        self.assertEqual(result["pages"][0]["text"], "Nội dung Word")
        self.assertEqual(len(result["images"]), 1)


class VisualIndexTests(unittest.TestCase):
    def setUp(self):
        from test_engine import EngineTests
        EngineTests.setUp(self)

    def tearDown(self):
        from test_engine import EngineTests
        EngineTests.tearDown(self)

    def test_image_preflight_does_not_run_ocr_embed_or_remote_vision(self):
        with text_image() as image, io.BytesIO() as output:
            image.save(output, "PNG")
            content = base64.b64encode(output.getvalue()).decode()
        with patch.dict(os.environ, {"VISUAL_ENABLED": "true"}), patch("app.visual.ocr_image") as ocr, patch.object(self.engine, "embed") as embed:
            result = self.engine.validate("fixture.png", content, self.scope)
            self.assertTrue(result["deferred"])
            ocr.assert_not_called()
            embed.assert_not_called()

    def test_enriched_index_preserves_visual_reference_and_source_scope(self):
        image_id = "b" * 64
        self.engine.index(self.scope, self.source, "a" * 64, "image.png", "fixture",
                          [{"text": "Doanh thu năm 2026", "page": 2, "imageId": image_id}],
                          [{"text": "Biểu đồ doanh thu đạt 120 triệu đồng", "page": 2, "imageId": image_id}])
        evidence = self.engine.chunks(self.scope, [self.source])["evidence"]
        self.assertEqual(len(evidence), 2)
        self.assertTrue(all(item["imageId"] == image_id and item["page"] == 2 for item in evidence))
        self.assertEqual(self.engine.retrieve("another-scope", [self.source], "doanh thu")["evidence"], [])


if __name__ == "__main__":
    unittest.main()
