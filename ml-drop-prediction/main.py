"""
StreamPulse AI — Drop Prediction Service
Trains a RandomForestClassifier on synthetic data at startup.
Runs on HuggingFace Spaces CPU free tier (no GPU needed).
"""

import os
import time
import logging
import numpy as np
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

# ── Logging ───────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("drop-prediction")

# ── Global model state ────────────────────────────────────────
model_state = {
    "classifier": None,
    "scaler":     None,
    "trained_at": None,
    "accuracy":   None,
    "ready":      False,
}

MODEL_PATH   = "/tmp/drop_model.joblib"
SCALER_PATH  = "/tmp/drop_scaler.joblib"

# ── Feature engineering ───────────────────────────────────────
FEATURE_NAMES = [
    "buffering_rate",
    "avg_bitrate_kbps",
    "watch_percentage",
    "time_of_day_hour",
    "engagement_score",
    "bitrate_normalized",   # derived
    "off_peak",             # derived: 0–6 or 2–4am
    "buffering_x_engagement",  # interaction term
]

def engineer_features(
    buffering_rate: float,
    avg_bitrate_kbps: float,
    watch_percentage: float,
    time_of_day_hour: int,
    engagement_score: float,
) -> np.ndarray:
    bitrate_normalized       = avg_bitrate_kbps / 5000.0
    off_peak                 = 1.0 if time_of_day_hour in range(2, 7) else 0.0
    buffering_x_engagement   = buffering_rate * (1 - engagement_score)

    return np.array([[
        buffering_rate,
        avg_bitrate_kbps,
        watch_percentage,
        float(time_of_day_hour),
        engagement_score,
        bitrate_normalized,
        off_peak,
        buffering_x_engagement,
    ]])


# ── Synthetic training data ───────────────────────────────────
def generate_training_data(n_samples: int = 8000) -> tuple:
    """
    Generate realistic synthetic viewer-drop data.
    No external dataset download needed — works offline.
    """
    rng = np.random.default_rng(42)

    buffering_rate    = rng.beta(1.5, 8, n_samples)           # mostly low, sometimes high
    avg_bitrate_kbps  = rng.normal(2500, 800, n_samples).clip(200, 6000)
    watch_percentage  = rng.beta(3, 2, n_samples)             # skewed high (most watch >50%)
    time_of_day_hour  = rng.integers(0, 24, n_samples).astype(float)
    engagement_score  = rng.beta(4, 2, n_samples)             # generally high

    # Derived features
    bitrate_normalized      = avg_bitrate_kbps / 5000.0
    off_peak                = ((time_of_day_hour >= 2) & (time_of_day_hour <= 6)).astype(float)
    buffering_x_engagement  = buffering_rate * (1 - engagement_score)

    X = np.column_stack([
        buffering_rate,
        avg_bitrate_kbps,
        watch_percentage,
        time_of_day_hour,
        engagement_score,
        bitrate_normalized,
        off_peak,
        buffering_x_engagement,
    ])

    # Label: drop = 1 if viewer likely to abandon stream
    # Based on domain logic: high buffering + low bitrate + low engagement = drop
    drop_score = (
        0.40 * buffering_rate +
        0.20 * (1 - bitrate_normalized) +
        0.20 * (1 - watch_percentage) +
        0.15 * (1 - engagement_score) +
        0.05 * off_peak +
        rng.normal(0, 0.05, n_samples)   # noise
    )
    y = (drop_score > 0.35).astype(int)

    log.info(f"Generated {n_samples} samples — drop rate: {y.mean():.1%}")
    return X, y


def train_model():
    log.info("🏋️  Training drop prediction model...")
    t0 = time.time()

    X, y = generate_training_data(8000)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Scale features
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test)

    # RandomForest — fast, interpretable, no GPU needed
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        min_samples_leaf=10,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train_s, y_train)

    accuracy = clf.score(X_test_s, y_test)
    report   = classification_report(y_test, clf.predict(X_test_s))

    elapsed = time.time() - t0
    log.info(f"✅ Model trained in {elapsed:.1f}s — accuracy: {accuracy:.3f}")
    log.info(f"\n{report}")

    # Persist (fast reload on container restart)
    joblib.dump(clf,    MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)

    model_state["classifier"] = clf
    model_state["scaler"]     = scaler
    model_state["trained_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    model_state["accuracy"]   = round(accuracy, 4)
    model_state["ready"]      = True


def load_or_train():
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        log.info("📦 Loading cached model from disk...")
        model_state["classifier"] = joblib.load(MODEL_PATH)
        model_state["scaler"]     = joblib.load(SCALER_PATH)
        model_state["trained_at"] = "cached"
        model_state["accuracy"]   = "cached"
        model_state["ready"]      = True
        log.info("✅ Cached model loaded")
    else:
        train_model()


# ── Lifespan (replaces deprecated @app.on_event) ─────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    load_or_train()
    yield
    log.info("Shutting down drop prediction service")


# ── FastAPI app ───────────────────────────────────────────────
app = FastAPI(
    title="StreamPulse Drop Prediction",
    description="Predicts viewer drop probability using RandomForest on stream health metrics",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response schemas ────────────────────────────────
class PredictRequest(BaseModel):
    buffering_rate:    float = Field(..., ge=0.0, le=1.0,    description="Fraction of time spent buffering")
    avg_bitrate_kbps:  float = Field(..., ge=100, le=10000,  description="Average video bitrate in kbps")
    watch_percentage:  float = Field(..., ge=0.0, le=1.0,    description="Fraction of stream watched so far")
    time_of_day_hour:  int   = Field(..., ge=0,   le=23,     description="Current hour (0-23 UTC)")
    engagement_score:  float = Field(..., ge=0.0, le=1.0,    description="Composite engagement score (0-1)")

    class Config:
        json_schema_extra = {
            "example": {
                "buffering_rate":   0.12,
                "avg_bitrate_kbps": 2400,
                "watch_percentage": 0.65,
                "time_of_day_hour": 20,
                "engagement_score": 0.72,
            }
        }


class PredictResponse(BaseModel):
    drop_probability: float
    risk_level:       str    # "low" | "medium" | "high" | "critical"
    confidence:       float
    features_used:    List[str]
    model_accuracy:   str
    inference_ms:     float


class BatchPredictRequest(BaseModel):
    requests: List[PredictRequest] = Field(..., max_items=50)


class HealthResponse(BaseModel):
    status:      str
    model_ready: bool
    trained_at:  Optional[str]
    accuracy:    Optional[str]
    service:     str


# ── Helpers ───────────────────────────────────────────────────
def risk_level(prob: float) -> str:
    if prob < 0.30: return "low"
    if prob < 0.55: return "medium"
    if prob < 0.75: return "high"
    return "critical"


# ── Endpoints ─────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse)
def health():
    return {
        "status":      "ok" if model_state["ready"] else "warming_up",
        "model_ready": model_state["ready"],
        "trained_at":  model_state["trained_at"],
        "accuracy":    str(model_state["accuracy"]),
        "service":     "streampulse-drop-prediction",
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if not model_state["ready"]:
        raise HTTPException(status_code=503, detail="Model is still training, retry in a few seconds")

    t0 = time.perf_counter()

    X = engineer_features(
        req.buffering_rate,
        req.avg_bitrate_kbps,
        req.watch_percentage,
        req.time_of_day_hour,
        req.engagement_score,
    )

    clf    = model_state["classifier"]
    scaler = model_state["scaler"]
    X_s    = scaler.transform(X)

    proba        = clf.predict_proba(X_s)[0]
    drop_prob    = float(proba[1])
    confidence   = float(max(proba))
    elapsed_ms   = (time.perf_counter() - t0) * 1000

    return {
        "drop_probability": round(drop_prob, 4),
        "risk_level":       risk_level(drop_prob),
        "confidence":       round(confidence, 4),
        "features_used":    FEATURE_NAMES,
        "model_accuracy":   str(model_state["accuracy"]),
        "inference_ms":     round(elapsed_ms, 2),
    }


@app.post("/predict/batch")
def predict_batch(req: BatchPredictRequest):
    if not model_state["ready"]:
        raise HTTPException(status_code=503, detail="Model not ready")

    clf    = model_state["classifier"]
    scaler = model_state["scaler"]
    t0     = time.perf_counter()

    results = []
    for r in req.requests:
        X   = engineer_features(r.buffering_rate, r.avg_bitrate_kbps,
                                 r.watch_percentage, r.time_of_day_hour, r.engagement_score)
        X_s = scaler.transform(X)
        proba     = clf.predict_proba(X_s)[0]
        drop_prob = float(proba[1])
        results.append({
            "drop_probability": round(drop_prob, 4),
            "risk_level":       risk_level(drop_prob),
            "confidence":       round(float(max(proba)), 4),
        })

    elapsed_ms = (time.perf_counter() - t0) * 1000
    return {
        "results":     results,
        "count":       len(results),
        "total_ms":    round(elapsed_ms, 2),
    }


@app.get("/model/info")
def model_info():
    if not model_state["ready"]:
        raise HTTPException(status_code=503, detail="Model not ready")

    clf = model_state["classifier"]
    importances = dict(zip(FEATURE_NAMES, clf.feature_importances_.tolist()))
    sorted_imp  = dict(sorted(importances.items(), key=lambda x: x[1], reverse=True))

    return {
        "model_type":         "RandomForestClassifier",
        "n_estimators":       clf.n_estimators,
        "feature_importances": sorted_imp,
        "trained_at":         model_state["trained_at"],
        "accuracy":           model_state["accuracy"],
        "features":           FEATURE_NAMES,
    }


@app.get("/metrics")
def metrics():
    """Prometheus-compatible plaintext metrics."""
    ready = 1 if model_state["ready"] else 0
    acc   = model_state["accuracy"] if isinstance(model_state["accuracy"], float) else 0
    return __import__("fastapi").responses.PlainTextResponse(
        f'# HELP streampulse_drop_model_ready Model readiness\n'
        f'# TYPE streampulse_drop_model_ready gauge\n'
        f'streampulse_drop_model_ready {ready}\n'
        f'# HELP streampulse_drop_model_accuracy Model accuracy on test set\n'
        f'# TYPE streampulse_drop_model_accuracy gauge\n'
        f'streampulse_drop_model_accuracy {acc}\n'
    )
