---
title: StreamPulse Drop Prediction
emoji: 📉
colorFrom: blue
colorTo: red
sdk: docker
pinned: false
app_port: 8001
---

# StreamPulse AI — Drop Prediction Service

Real-time viewer drop probability prediction using RandomForest.

## API Endpoints

- `GET /health` — service health + model status
- `POST /predict` — predict drop probability for a single stream session
- `POST /predict/batch` — batch predictions (up to 50)
- `GET /model/info` — feature importances + model metadata

## Example Request

```bash
curl -X POST https://your-space.hf.space/predict \
  -H "Content-Type: application/json" \
  -d '{
    "buffering_rate": 0.12,
    "avg_bitrate_kbps": 2400,
    "watch_percentage": 0.65,
    "time_of_day_hour": 20,
    "engagement_score": 0.72
  }'
```

## Example Response

```json
{
  "drop_probability": 0.2341,
  "risk_level": "low",
  "confidence": 0.8901,
  "features_used": ["buffering_rate", "avg_bitrate_kbps", ...],
  "model_accuracy": "0.8712",
  "inference_ms": 4.21
}
```

## Tech Stack
- FastAPI + Uvicorn
- Scikit-learn RandomForestClassifier
- Trained on 8,000 synthetic samples at startup
- No GPU required — runs on CPU free tier
