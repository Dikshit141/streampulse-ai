# Full implementation delivered in Step 5.
# Stub exists so docker-compose build doesn't fail.
from fastapi import FastAPI
app = FastAPI(title="StreamPulse Drop Prediction")

@app.get("/health")
def health():
    return {"status": "stub — full service in Step 5"}
