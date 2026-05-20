const { Router } = require("express");
const { query } = require("../config/postgres");

const router = Router();

// GET /api/streams — list all streams
router.get("/", async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, title, status, started_at FROM streams ORDER BY started_at DESC`
    );
    res.json({ streams: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/streams/:id — single stream detail
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM streams WHERE id = $1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Stream not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/streams/:id/moments — replay-worthy trending moments
router.get("/:id/moments", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { rows } = await query(
      `SELECT id, detected_at, viewer_count, spike_pct, label, is_replay_worthy
       FROM trending_moments
       WHERE stream_id = $1
       ORDER BY detected_at DESC
       LIMIT $2`,
      [req.params.id, limit]
    );
    res.json({ moments: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/streams/:id/sentiment — latest sentiment snapshot
router.get("/:id/sentiment", async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT positive, neutral, negative, sample_count, captured_at
       FROM sentiment_snapshots
       WHERE stream_id = $1
       ORDER BY captured_at DESC
       LIMIT 1`,
      [req.params.id]
    );
    res.json(rows[0] || { positive: 0, neutral: 0, negative: 0, sample_count: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
