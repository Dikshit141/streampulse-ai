import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import {
  generateMockStats, generateMockHistory, generateMockMoments,
  generateMockAlerts, generateMockSentiment, generateMockDropPrediction,
  STREAM_ID,
} from "../lib/mockData";

const GATEWAY_URL     = import.meta.env.VITE_GATEWAY_URL     || "http://localhost:4000";
const ML_DROP_URL     = import.meta.env.VITE_ML_DROP_URL     || "http://localhost:8001";
const ML_SENTIMENT_URL= import.meta.env.VITE_ML_SENTIMENT_URL|| "http://localhost:8002";
const HISTORY_MAX     = 60;   // keep last 60 data points (~5 min at 5s ticks)

export function useStreamData(mockMode = false) {
  const [connected,   setConnected]   = useState(false);
  const [stats,       setStats]       = useState(null);
  const [history,     setHistory]     = useState([]);
  const [moments,     setMoments]     = useState([]);
  const [alerts,      setAlerts]      = useState([]);
  const [sentiment,   setSentiment]   = useState(null);
  const [dropPred,    setDropPred]    = useState(null);
  const [mlStatus,    setMlStatus]    = useState({ drop: false, sentiment: false });

  const socketRef     = useRef(null);
  const mockTimerRef  = useRef(null);

  // ── Fetch drop prediction from ML service ────────────────────
  const fetchDropPrediction = useCallback(async (currentStats) => {
    if (!currentStats) return;
    try {
      const res = await fetch(`${ML_DROP_URL}/predict`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buffering_rate:    currentStats.buffering_rate,
          avg_bitrate_kbps:  currentStats.avg_bitrate_kbps || 2500,
          watch_percentage:  currentStats.watch_percentage  || 0.6,
          time_of_day_hour:  currentStats.time_of_day_hour  || new Date().getHours(),
          engagement_score:  currentStats.engagement_score,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDropPred(data);
        setMlStatus(s => ({ ...s, drop: true }));
      }
    } catch { setMlStatus(s => ({ ...s, drop: false })); }
  }, []);

  // ── Fetch sentiment ──────────────────────────────────────────
  const fetchSentiment = useCallback(async () => {
    // Simulate live chat comments for demo
    const SAMPLE_COMMENTS = [
      "Amazing match! What a performance 🔥",
      "This stream keeps buffering ugh",
      "Best game of the season no doubt",
      "Why is the quality so bad today",
      "Incredible shot! Replay please",
      "okay I guess",
      "Loving the commentary team",
      "Can't believe that decision!",
      "Stream is perfect on my end",
      "So exciting!! Can't look away",
    ];
    const texts = SAMPLE_COMMENTS
      .sort(() => Math.random() - 0.5)
      .slice(0, 6);

    try {
      const res = await fetch(`${ML_SENTIMENT_URL}/analyze`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts }),
      });
      if (res.ok) {
        const data = await res.json();
        setSentiment(data.aggregate);
        setMlStatus(s => ({ ...s, sentiment: true }));
      }
    } catch { setMlStatus(s => ({ ...s, sentiment: false })); }
  }, []);

  // ── Fetch initial history + moments from REST ────────────────
  const fetchInitialData = useCallback(async () => {
    try {
      const [histRes, momRes, alertRes, sentRes] = await Promise.allSettled([
        fetch(`${GATEWAY_URL}/api/stats/history/${STREAM_ID}?limit=60`),
        fetch(`${GATEWAY_URL}/api/streams/${STREAM_ID}/moments`),
        fetch(`${GATEWAY_URL}/api/stats/alerts/${STREAM_ID}`),
        fetch(`${GATEWAY_URL}/api/streams/${STREAM_ID}/sentiment`),
      ]);

      if (histRes.status === "fulfilled" && histRes.value.ok) {
        const d = await histRes.value.json();
        setHistory(d.history || []);
      }
      if (momRes.status === "fulfilled" && momRes.value.ok) {
        const d = await momRes.value.json();
        setMoments(d.moments || []);
      }
      if (alertRes.status === "fulfilled" && alertRes.value.ok) {
        const d = await alertRes.value.json();
        setAlerts(d.alerts || []);
      }
      if (sentRes.status === "fulfilled" && sentRes.value.ok) {
        const d = await sentRes.value.json();
        if (d.total > 0) setSentiment(d);
      }
    } catch { /* silently ignore — Socket.IO will fill in */ }
  }, []);

  // ── MOCK MODE ────────────────────────────────────────────────
  useEffect(() => {
    if (!mockMode) return;

    setConnected(true);
    setHistory(generateMockHistory(60));
    setMoments(generateMockMoments(6));
    setAlerts(generateMockAlerts(4));
    setSentiment(generateMockSentiment());

    const initialStats = generateMockStats();
    setStats(initialStats);
    setDropPred(generateMockDropPrediction(initialStats.buffering_rate, initialStats.engagement_score));

    mockTimerRef.current = setInterval(() => {
      const s = generateMockStats();
      setStats(s);
      setDropPred(generateMockDropPrediction(s.buffering_rate, s.engagement_score));
      setHistory(prev => {
        const next = [...prev, s];
        return next.length > HISTORY_MAX ? next.slice(-HISTORY_MAX) : next;
      });

      // Occasionally inject a new moment
      if (Math.random() < 0.04) {
        const labels = ["Goal! ⚽", "Wicket! 🏏", "Six Hit! 🏏", "Penalty! ⚡"];
        setMoments(prev => [{
          id: Date.now(),
          detected_at: new Date().toISOString(),
          viewer_count: s.concurrent_viewers,
          spike_pct: parseFloat((20 + Math.random() * 40).toFixed(1)),
          label: labels[Math.floor(Math.random() * labels.length)],
        }, ...prev].slice(0, 10));
      }

      // Occasionally inject an alert
      if (Math.random() < 0.025) {
        setSentiment(generateMockSentiment());
        setAlerts(prev => [{
          id: Date.now(),
          alert_type: s.buffering_rate > 0.3 ? "buffer_spike" : "high_drop_risk",
          severity:   s.buffering_rate > 0.45 ? "critical" : "warning",
          message:    s.buffering_rate > 0.3
            ? `Buffering at ${(s.buffering_rate * 100).toFixed(0)}%`
            : `Drop risk elevated`,
          created_at: new Date().toISOString(),
        }, ...prev].slice(0, 10));
      }
    }, 2000);

    return () => clearInterval(mockTimerRef.current);
  }, [mockMode]);

  // ── LIVE MODE (Socket.IO) ────────────────────────────────────
  useEffect(() => {
    if (mockMode) return;

    fetchInitialData();

    const socket = io(GATEWAY_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join:stream", STREAM_ID);
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("stats:update", (data) => {
      setStats(data);
      setHistory(prev => {
        const next = [...prev, data];
        return next.length > HISTORY_MAX ? next.slice(-HISTORY_MAX) : next;
      });
      // Fetch ML predictions on every stats update
      fetchDropPrediction(data);
    });

    socket.on("moment:detected", (moment) => {
      setMoments(prev => [moment, ...prev].slice(0, 10));
    });

    socket.on("alert:new", (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 10));
    });

    // Poll sentiment every 15 seconds
    fetchSentiment();
    const sentInterval = setInterval(fetchSentiment, 15000);

    return () => {
      socket.disconnect();
      clearInterval(sentInterval);
    };
  }, [mockMode, fetchInitialData, fetchDropPrediction, fetchSentiment]);

  return { connected, stats, history, moments, alerts, sentiment, dropPred, mlStatus };
}
