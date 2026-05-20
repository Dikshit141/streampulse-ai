#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  StreamPulse AI — Dev scripts
#  Usage: ./scripts/dev.sh [command]
# ─────────────────────────────────────────────────────────────

set -euo pipefail

COMPOSE="docker compose"

cmd="${1:-help}"

case "$cmd" in
  up)
    echo "🚀 Starting StreamPulse AI..."
    cp -n .env.example .env 2>/dev/null || true
    $COMPOSE up --build -d
    echo ""
    echo "✅ All services running:"
    echo "   Dashboard  → http://localhost:5173"
    echo "   Gateway    → http://localhost:4000"
    echo "   Drop ML    → http://localhost:8001/docs"
    echo "   Sentiment  → http://localhost:8002/docs"
    echo "   Grafana    → http://localhost:3001  (admin/admin)"
    echo "   Prometheus → http://localhost:9090"
    ;;
  down)
    echo "🛑 Stopping all services..."
    $COMPOSE down
    ;;
  reset)
    echo "⚠️  Resetting all data (volumes will be deleted)..."
    $COMPOSE down -v
    echo "✅ Reset complete."
    ;;
  logs)
    service="${2:-}"
    $COMPOSE logs -f $service
    ;;
  ps)
    $COMPOSE ps
    ;;
  ml-test)
    echo "🧪 Testing Drop Prediction API..."
    curl -s -X POST http://localhost:8001/predict \
      -H "Content-Type: application/json" \
      -d '{"buffering_rate":0.15,"avg_bitrate_kbps":2400,"watch_percentage":0.6,"time_of_day_hour":20,"engagement_score":0.7}' \
      | python3 -m json.tool
    echo ""
    echo "🧪 Testing Sentiment API..."
    curl -s -X POST http://localhost:8002/analyze \
      -H "Content-Type: application/json" \
      -d '{"texts":["Amazing stream!","This is lagging so much","okay I guess"]}' \
      | python3 -m json.tool
    ;;
  help|*)
    echo "StreamPulse AI Dev Scripts"
    echo ""
    echo "  ./scripts/dev.sh up          Start all services"
    echo "  ./scripts/dev.sh down        Stop all services"
    echo "  ./scripts/dev.sh reset       Wipe all data + volumes"
    echo "  ./scripts/dev.sh logs [svc]  Tail logs (optional: gateway, ml-drop, etc)"
    echo "  ./scripts/dev.sh ps          Show running containers"
    echo "  ./scripts/dev.sh ml-test     Smoke test ML APIs"
    ;;
esac
