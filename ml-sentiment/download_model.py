"""
Run once at Docker build time to bake the model into the image.
"""
import os
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification

MODEL_NAME = "distilbert-base-uncased-finetuned-sst-2-english"
CACHE_DIR = os.environ.get("TRANSFORMERS_CACHE", "/app/model_cache")

print(f"[download_model] Downloading {MODEL_NAME} to {CACHE_DIR} ...")
os.makedirs(CACHE_DIR, exist_ok=True)

# Download tokenizer and model weights separately (avoids cache_dir bug in pipeline())
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, cache_dir=CACHE_DIR)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, cache_dir=CACHE_DIR)

# Smoke test using the downloaded components directly
pipe = pipeline(
    "sentiment-analysis",
    model=model,
    tokenizer=tokenizer,
    device=-1,
)

result = pipe("StreamPulse AI is an amazing platform!")
print(f"[download_model] Smoke test result: {result}")
print("[download_model] ✅ Model downloaded and verified.")