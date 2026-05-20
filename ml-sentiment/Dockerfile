FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Pre-download model at BUILD time ─────────────────────────
# So HuggingFace Spaces / Render never cold-downloads at request time.
# Model is ~260MB — acceptable for a portfolio container.
COPY download_model.py .
RUN python download_model.py

COPY . .

EXPOSE 8002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "1"]
