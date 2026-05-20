"""
Optional: run this manually to pre-warm the model cache.
  docker exec sp_ml_sentiment python download_model.py

The main service auto-downloads on first start if cache is empty.
Cache is persisted in the Docker volume: ml-sentiment/model_cache/
"""
import os
from transformers import pipeline

MODEL_NAME = "distilbert-base-uncased-finetuned-sst-2-english"
CACHE_DIR  = os.environ.get("TRANSFORMERS_CACHE", "/app/model_cache")

print(f"Downloading {MODEL_NAME} to {CACHE_DIR} ...")
os.makedirs(CACHE_DIR, exist_ok=True)

pipe   = pipeline("sentiment-analysis", model=MODEL_NAME, cache_dir=CACHE_DIR, device=-1)
result = pipe("StreamPulse AI is an amazing platform!")
print(f"Smoke test: {result}")
print("✅ Model downloaded and cached.")
