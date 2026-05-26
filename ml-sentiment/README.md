---
title: StreamPulse Sentiment Analysis
emoji: 💬
colorFrom: green
colorTo: purple
sdk: docker
pinned: false
app_port: 8002
---

# StreamPulse AI — Live Sentiment Analysis

Real-time viewer comment sentiment using DistilBERT (CPU inference, ~260MB).

## API Endpoints

- `GET /health` — service status + model load time
- `POST /analyze` — analyze up to 100 texts, returns per-text + aggregate
- `POST /analyze/stream-comments` — same but auto-strips empty strings
- `GET /aggregate` — rolling sentiment totals since service start

## Example Request

```bash
curl -X POST https://your-space.hf.space/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      "Amazing match, what a goal!",
      "This stream keeps buffering ugh",
      "okay I guess"
    ]
  }'
```

## Example Response

```json
{
  "results": [
    { "text": "Amazing match, what a goal!", "label": "positive", "score": 0.9987, "normalized": "positive" },
    { "text": "This stream keeps buffering ugh", "label": "negative", "score": 0.9921, "normalized": "negative" },
    { "text": "okay I guess", "label": "positive", "score": 0.6012, "normalized": "neutral" }
  ],
  "aggregate": { "positive": 0.3333, "neutral": 0.3333, "negative": 0.3333, "total": 3 },
  "inference_ms": 87.4
}
```

## Neutral Label Logic

DistilBERT SST-2 is binary (positive/negative only).
Predictions with confidence < 0.65 are mapped to **neutral**
giving the dashboard a realistic 3-way sentiment split.

## Tech Stack
- FastAPI + Uvicorn
- HuggingFace Transformers — `distilbert-base-uncased-finetuned-sst-2-english`
- PyTorch CPU-only
- Model pre-downloaded at Docker build time
