"""Public synthetic fixture for the opt-in live OCR/Vision smoke test."""
import base64
import io
import json

from PIL import Image, ImageDraw, ImageFont

image = Image.new("RGB", (1500, 700), "white")
draw = ImageDraw.Draw(image)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 42)
draw.text((40, 50), "Doanh thu năm 2026: 120 triệu đồng", fill="black", font=font)
draw.text((40, 130), "Chi phí: 80 triệu đồng. Lợi nhuận: 40 triệu đồng.", fill="black", font=font)
draw.rectangle((130, 280, 350, 500), fill="red")
draw.ellipse((950, 280, 1170, 500), fill="blue")
with io.BytesIO() as output:
    image.save(output, "PNG")
    print(json.dumps({"name": "generated-visual-fixture.png", "content": base64.b64encode(output.getvalue()).decode()}))
