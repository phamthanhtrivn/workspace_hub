FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 HF_HOME=/models/huggingface
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && pip install --no-cache-dir -r requirements.txt
RUN useradd -m worker && mkdir -p /models && chown worker:worker /models
COPY app ./app
USER worker
EXPOSE 8088
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8088", "--workers", "1", "--no-access-log"]
