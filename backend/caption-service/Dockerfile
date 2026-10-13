FROM python:3.12-slim
ARG ENABLE_CUDA=0
ENV PYTHONUNBUFFERED=1 HF_HOME=/models OMP_NUM_THREADS=4
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libgomp1 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN if [ "$ENABLE_CUDA" = "1" ]; then pip install --no-cache-dir nvidia-cublas-cu12==12.3.4.1 nvidia-cudnn-cu12==9.1.1.17; fi
ENV NUMBA_CACHE_DIR=/models/numba
ENV LD_LIBRARY_PATH=/usr/local/lib/python3.12/site-packages/nvidia/cublas/lib:/usr/local/lib/python3.12/site-packages/nvidia/cudnn/lib
COPY app ./app
EXPOSE 8095
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8095"]
