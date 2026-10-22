"""Bounded local OCR and page rendering. Remote Vision stays in AI service."""
import base64
import csv
import hashlib
import io
import os
from pathlib import Path
import subprocess
import tempfile
import time
import warnings
import zipfile
from contextlib import closing

from PIL import Image, ImageDraw, ImageOps

from .errors import InvalidSource

IMAGE_TYPES = {".png": "PNG", ".jpg": "JPEG", ".jpeg": "JPEG", ".webp": "WEBP"}
PIPELINE_VERSION = "visual-v1"
MAX_IMAGE_PIXELS = 20_000_000
MAX_VISUALS = 24
MAX_DERIVED_BYTES = 16 * 1024 * 1024


def enabled():
    return os.environ.get("VISUAL_ENABLED", "false") == "true"


def open_image(data, suffix=None):
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as original:
                if original.width * original.height > MAX_IMAGE_PIXELS or min(original.size) < 16:
                    raise InvalidSource("Image dimensions exceed limits", "IMAGE_DIMENSION_LIMIT")
                if original.format not in IMAGE_TYPES.values() or (suffix and original.format != IMAGE_TYPES[suffix]):
                    raise InvalidSource("Image format mismatch", "IMAGE_FORMAT_INVALID")
                if getattr(original, "n_frames", 1) != 1:
                    raise InvalidSource("Animated images are unsupported", "IMAGE_ANIMATED")
                original.load()
                oriented = ImageOps.exif_transpose(original)
                rgba = oriented.convert("RGBA")
                image = Image.new("RGB", rgba.size, "white")
                image.paste(rgba, mask=rgba.getchannel("A"))
                image.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
                return image
    except InvalidSource:
        raise
    except (OSError, ValueError, Image.DecompressionBombWarning, Image.DecompressionBombError) as error:
        raise InvalidSource("Invalid image", "IMAGE_FORMAT_INVALID") from error


def image_url(image):
    with io.BytesIO() as output:
        image.save(output, format="JPEG", quality=90)
        data = output.getvalue()
    if len(data) > 1024 * 1024:
        raise InvalidSource("Derived image exceeds 1 MiB", "IMAGE_DIMENSION_LIMIT")
    return "data:image/jpeg;base64," + base64.b64encode(data).decode(), hashlib.sha256(data).hexdigest()


def ocr_image(image, timeout=20):
    with tempfile.TemporaryDirectory(prefix="wh-ocr-") as directory:
        path = Path(directory) / "page.png"
        image.save(path)
        try:
            result = subprocess.run(
                ["tesseract", str(path), "stdout", "-l", "vie+eng", "--psm", "3", "tsv"],
                capture_output=True, timeout=timeout, check=True,
                env={**os.environ, "OMP_THREAD_LIMIT": "1"},
            )
        except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
            raise RuntimeError("OCR_UNAVAILABLE: local OCR failed or timed out") from error
    words = [row for row in csv.DictReader(io.StringIO(result.stdout.decode("utf-8")), delimiter="\t")
             if row.get("text", "").strip() and float(row.get("conf", "-1")) >= 0]
    lines = {}
    for word in words:
        key = tuple(word.get(part) for part in ("block_num", "par_num", "line_num"))
        lines.setdefault(key, []).append(word["text"])
    text = "\n".join(" ".join(line) for line in lines.values())
    confidence = sum(float(word["conf"]) for word in words) / len(words) if words else 0
    # Detect substantial graphics outside recognized text boxes, including scans of diagrams.
    thumbnail = image.convert("L").resize((256, 256))
    mask = Image.new("L", (256, 256), 0)
    draw = ImageDraw.Draw(mask)
    for word in words:
        x, y, w, h = (int(word[key]) for key in ("left", "top", "width", "height"))
        draw.rectangle((max(0, x * 256 / image.width - 2), max(0, y * 256 / image.height - 2),
                        min(255, (x + w) * 256 / image.width + 2), min(255, (y + h) * 256 / image.height + 2)), fill=255)
    outside = sum(pixel < 180 and not covered for pixel, covered in zip(thumbnail.get_flattened_data(), mask.get_flattened_data()))
    needs_vision = len(text.strip()) < 120 or confidence < 70 or outside > 65536 * 0.025
    return text, needs_vision


class VisualExtractor:
    def __init__(self, parse_text):
        self.parse_text = parse_text
        self.started = time.monotonic()
        self.images = []
        self.derived_bytes = 0

    def add_image(self, image, page, context, needs_vision=True):
        if not needs_vision:
            return None
        if len(self.images) >= MAX_VISUALS:
            raise InvalidSource("Too many visual pages", "VISUAL_PAGE_LIMIT")
        data_url, digest = image_url(image)
        self.derived_bytes += len(data_url)
        if self.derived_bytes > MAX_DERIVED_BYTES:
            raise InvalidSource("Visual payload exceeds limits", "VISUAL_PAGE_LIMIT")
        image_id = hashlib.sha256(f"{page}:{len(self.images)}:{digest}".encode()).hexdigest()
        self.images.append({"id": image_id, "hash": digest, "page": page, "context": context[:6000], "dataUrl": data_url})
        return image_id

    def read_image(self, image):
        remaining = 180 - (time.monotonic() - self.started)
        if remaining <= 0:
            raise InvalidSource("OCR processing budget exceeded", "OCR_PROCESSING_LIMIT")
        return ocr_image(image, timeout=min(20, max(1, remaining)))

    def extract(self, name, data):
        suffix = Path(name).suffix.lower()
        if suffix in IMAGE_TYPES:
            with open_image(data, suffix) as image:
                text, needs_vision = self.read_image(image)
                image_id = self.add_image(image, None, text, True)
                pages = [{"text": text, "page": None, "imageId": image_id}]
        elif suffix == ".pdf":
            pages = self.pdf(data)
        else:
            pages = [{"text": text, "page": page} for text, page in self.parse_text(name, data)]
            if suffix == ".docx":
                with zipfile.ZipFile(io.BytesIO(data)) as archive:
                    for entry in archive.infolist():
                        if entry.filename.startswith("word/media/") and Path(entry.filename).suffix.lower() in IMAGE_TYPES:
                            with open_image(archive.read(entry)) as image:
                                if min(image.size) < 96:
                                    continue
                                text, _ = self.read_image(image)
                                self.add_image(image, None, text)
        return {"pages": pages, "images": self.images, "pipeline": PIPELINE_VERSION}

    def pdf(self, data):
        from pypdf import PdfReader
        import pypdfium2 as pdfium
        from pypdfium2 import raw
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise InvalidSource("Encrypted PDF", "PDF_ENCRYPTED")
        if len(reader.pages) > 100:
            raise InvalidSource("PDF exceeds 100 pages", "PDF_PAGE_LIMIT")
        pages = []
        with pdfium.PdfDocument(data) as pdf:
            for index, source_page in enumerate(reader.pages):
                text = source_page.extract_text() or ""
                with closing(pdf[index]) as page:
                    area = page.get_width() * page.get_height()
                    significant_images = 0
                    paths = 0
                    graphic_area = 0
                    for item in page.get_objects(filter=[raw.FPDF_PAGEOBJ_IMAGE, raw.FPDF_PAGEOBJ_PATH], max_depth=3):
                        left, bottom, right, top = item.get_bounds()
                        if item.type == raw.FPDF_PAGEOBJ_IMAGE and (right - left) * (top - bottom) > area * 0.015:
                            significant_images += 1
                        if item.type == raw.FPDF_PAGEOBJ_PATH:
                            paths += 1
                            graphic_area += max(0, right - left) * max(0, top - bottom)
                    image_id = None
                    if not text.strip() or significant_images or (paths >= 2 and graphic_area > area * 0.02):
                        scale = min(2.5, 2000 / max(page.get_size()))
                        with closing(page.render(scale=scale)) as bitmap:
                            image = bitmap.to_pil().convert("RGB")
                        with image:
                            if not text.strip() and not ImageOps.invert(image.convert("L")).getbbox():
                                pages.append({"text": "", "page": index + 1, "imageId": None})
                                continue
                            needs_vision = True
                            if len(text.strip()) < 80:
                                recognized, needs_vision = self.read_image(image)
                                if len(recognized.strip()) > len(text.strip()):
                                    text = recognized
                            image_id = self.add_image(image, index + 1, text, needs_vision)
                    pages.append({"text": text, "page": index + 1, "imageId": image_id})
        return pages
