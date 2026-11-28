FROM python:3.12.10-slim@sha256:fd95fa221297a88e1cf49c55ec1828edd7c5a428187e67b5d1805692d11588db AS production
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
ENV STT_MODEL_PATH=/models/small STT_CPU_THREADS=4 HF_HUB_DISABLE_TELEMETRY=1
COPY app.py prepare.py ./
# Bake the public weights into the image; recognition needs no external network.
RUN python prepare.py && useradd --create-home speech && chown -R speech:speech /models
USER speech
EXPOSE 8090
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8090", "--no-access-log"]
