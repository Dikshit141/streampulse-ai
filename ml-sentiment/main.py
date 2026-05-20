"""
StreamPulse AI — Live Sentiment Analysis Service
Uses distilbert-base-uncased-finetuned-sst-2-english (HuggingFace)
Model is baked into the Docker image at build time — zero cold downloads.
Runs on HuggingFace Spaces CPU free tier (~260MB model).
"""

import os
import time
import logging
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("sentiment")

# ── Model state ───────────────────────────────────────────────
MODEL_NAME = "distilbert-base-uncased-finetuned-sst-2-english"
CACHE_DIR  = os.environ.get("TRANSFORMERS_CACHE", "/app/model_cache")

sentiment_state = {
    "pipeline": None,
    "ready":    False,
    "loaded_at": None,
    "model_name": MODEL_NAME,
}

# ── Running totals for aggregate endpoint ─────────────────────
rolling = {
    "positive": 0,
    "negative": 0,
    "total":    0,
}


def load_model():
    from transformers import pipeline as hf_pipeline
    log.info(f"Loading sentiment model from cache: {CACHE_DIR}")
    t0 = time.time()

    pipe = hf_pipeline(
        "sentiment-analysis",
        model=MODEL_NAME,
        cache_dir=CACHE_DIR,
        device=-1,          # CPU only
        truncation=True,
        max_length=512,
    )

    # Warm-up inference (first call is always slower due to JIT)
    _ = pipe("warming up the model")

    elapsed = time.time() - t0
    sentiment_state["pipeline"]  = pipe
    sentiment_state["ready"]     = True
    sentiment_state["loaded_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    log.info(f"✅ Sentiment model ready in {elapsed:.1f}s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield
    log.info("Shutting down sentiment service")


# ── FastAPI ───────────────────────────────────────────────────
app = FastAPI(
    title="StreamPulse Sentiment Analysis",
    description="Real-time viewer comment sentiment using DistilBERT (CPU inference)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    texts: List[str] = Field(..., min_items=1, max_items=100)

    class Config:
        json_schema_extra = {
            "example": {
                "texts": [
                    "Amazing match, what a goal!",
                    "This stream keeps buffering ugh",
                    "okay I guess",
                ]
            }
        }


class SentimentResult(BaseModel):
    text:       str
    label:      str    # "positive" | "negative" | "neutral"
    score:      float  # confidence 0-1
    normalized: str    # "positive" | "neutral" | "negative"


class AggregateResult(BaseModel):
    positive: float
    neutral:  float
    negative: float
    total:    int


class AnalyzeResponse(BaseModel):
    results:   List[SentimentResult]
    aggregate: AggregateResult
    inference_ms: float


class HealthResponse(BaseModel):
    status:     str
    model_ready: bool
    model_name: str
    loaded_at:  Optional[str]
    service:    str


# ── Helpers ───────────────────────────────────────────────────
def normalize_label(label: str, score: float) -> str:
    """
    DistilBERT SST-2 only outputs POSITIVE/NEGATIVE.
    Map low-confidence predictions to neutral so the UI
    shows a 3-way split rather than just binary.
    """
    if score < 0.65:
        return "neutral"
    return label.lower()


def compute_aggregate(results: List[SentimentResult]) -> AggregateResult:
    total = len(results)
    if total == 0:
        return AggregateResult(positive=0, neutral=0, negative=0, total=0)

    counts = {"positive": 0, "neutral": 0, "negative": 0}
    for r in results:
        counts[r.normalized] += 1

    return AggregateResult(
        positive=round(counts["positive"] / total, 4),
        neutral= round(counts["neutral"]  / total, 4),
        negative=round(counts["negative"] / total, 4),
        total=total,
    )


# ── Endpoints ─────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse)
def health():
    return {
        "status":      "ok" if sentiment_state["ready"] else "warming_up",
        "model_ready": sentiment_state["ready"],
        "model_name":  sentiment_state["model_name"],
        "loaded_at":   sentiment_state["loaded_at"],
        "service":     "streampulse-sentiment",
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    if not sentiment_state["ready"]:
        raise HTTPException(status_code=503, detail="Model is loading, retry in a few seconds")

    pipe = sentiment_state["pipeline"]
    t0   = time.perf_counter()

    # Run inference — DistilBERT handles batches natively
    raw = pipe(req.texts, batch_size=16, truncation=True)

    results = []
    for text, pred in zip(req.texts, raw):
        label      = pred["label"]   # "POSITIVE" or "NEGATIVE"
        score      = pred["score"]
        normalized = normalize_label(label, score)

        results.append(SentimentResult(
            text=text[:200],  # truncate for response size
            label=label.lower(),
            score=round(score, 4),
            normalized=normalized,
        ))

    # Update rolling totals
    agg = compute_aggregate(results)
    rolling["positive"] += sum(1 for r in results if r.normalized == "positive")
    rolling["negative"] += sum(1 for r in results if r.normalized == "negative")
    rolling["total"]    += len(results)

    elapsed_ms = (time.perf_counter() - t0) * 1000

    return AnalyzeResponse(
        results=results,
        aggregate=agg,
        inference_ms=round(elapsed_ms, 2),
    )


@app.get("/aggregate")
def aggregate():
    """Returns rolling sentiment totals since service start."""
    total = rolling["total"]
    if total == 0:
        return {"positive": 0, "neutral": 0, "negative": 0, "total": 0}

    other = total - rolling["positive"] - rolling["negative"]
    return {
        "positive": round(rolling["positive"] / total, 4),
        "neutral":  round(other / total, 4),
        "negative": round(rolling["negative"] / total, 4),
        "total":    total,
    }


@app.post("/analyze/stream-comments")
def analyze_stream_comments(req: AnalyzeRequest):
    """
    Convenience endpoint: accepts raw chat comments,
    filters empty strings, returns sentiment + aggregate.
    Identical to /analyze but strips blanks first.
    """
    cleaned = [t.strip() for t in req.texts if t.strip()]
    if not cleaned:
        raise HTTPException(status_code=400, detail="No non-empty texts provided")
    return analyze(AnalyzeRequest(texts=cleaned))


@app.get("/metrics")
def metrics():
    """Prometheus-compatible plaintext metrics."""
    ready = 1 if sentiment_state["ready"] else 0
    total = rolling["total"]
    pos   = rolling["positive"]
    neg   = rolling["negative"]
    pos_rate = round(pos / total, 4) if total else 0
    neg_rate = round(neg / total, 4) if total else 0

    return PlainTextResponse(
        f'# HELP streampulse_sentiment_model_ready Model readiness\n'
        f'# TYPE streampulse_sentiment_model_ready gauge\n'
        f'streampulse_sentiment_model_ready {ready}\n'
        f'# HELP streampulse_sentiment_total Total texts analysed\n'
        f'# TYPE streampulse_sentiment_total counter\n'
        f'streampulse_sentiment_total {total}\n'
        f'# HELP streampulse_sentiment_positive_rate Rolling positive rate\n'
        f'# TYPE streampulse_sentiment_positive_rate gauge\n'
        f'streampulse_sentiment_positive_rate {pos_rate}\n'
        f'# HELP streampulse_sentiment_negative_rate Rolling negative rate\n'
        f'# TYPE streampulse_sentiment_negative_rate gauge\n'
        f'streampulse_sentiment_negative_rate {neg_rate}\n'
    )
