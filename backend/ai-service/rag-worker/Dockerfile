FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 HF_HOME=/models/huggingface
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 tesseract-ocr tesseract-ocr-vie tesseract-ocr-eng fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
# Keep both native packages on matching CPU wheels; PyPI torchvision may require CUDA.
RUN pip install --no-cache-dir torch==2.14.1+cpu torchvision==0.29.1+cpu --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt \
    && pip check
# Fail the image build on native-operator/import incompatibility, before accepting uploads.
RUN python -c "import torch; from torchvision.ops import nms; from sentence_transformers import SentenceTransformer; from docling.document_converter import DocumentConverter; assert nms(torch.tensor([[0.,0.,1.,1.]]), torch.tensor([1.]), 0.5).tolist() == [0]"
RUN useradd -m worker && mkdir -p /models && chown worker:worker /models
COPY app ./app
USER worker
EXPOSE 8088
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8088", "--workers", "1", "--no-access-log"]
