"""Use a real Unicode font for generated fixtures on the host or Docker image."""
import os
from pathlib import Path
from PIL import ImageFont


def fixture_font(size=42):
    candidates = [
        os.environ.get("RAG_TEST_FONT", ""),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        str(Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts/arial.ttf"),
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return ImageFont.truetype(candidate, size)
    raise RuntimeError("Set RAG_TEST_FONT to an installed Unicode TrueType font")
