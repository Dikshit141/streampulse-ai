import { MessageSquare, Brain } from "lucide-react";
import { fmtPct } from "../lib/utils";

function SentimentBar({ label, value, color, emoji }) {
  const pct = value !== null ? Math.round(value * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-24 shrink-0">
        <span className="text-sm">{emoji}</span>
        <span className="text-xs font-mono text-slate-400">{label}</span>
      </div>
      <div className="flex-1 h-2 bg-surface-600 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono w-10 text-right" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

export default function SentimentMeter({ sentiment, mlStatus }) {
  const s = sentiment;

  const dominant = !s ? null
    : s.positive > s.negative && s.positive > s.neutral ? "positive"
    : s.negative > s.positive && s.negative > s.neutral ? "negative"
    : "neutral";

  const dominantLabel = {
    positive: { text: "Positive Crowd 🎉", color: "#22c55e" },
    negative: { text: "Unhappy Viewers 😤", color: "#f87171" },
    neutral:  { text: "Mixed Reactions 😐", color: "#94a3b8" },
  }[dominant] || { text: "Analysing...", color: "#475569" };

  return (
    <div className="card flex flex-col gap-4 animate-fade-in" style={{ animationDelay: "250ms" }}>
      <div className="flex items-center justify-between">
        <div>
          <span className="label">Live Sentiment</span>
          <p className="text-xs text-slate-500 mt-0.5">Viewer comment analysis</p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono border ${
          mlStatus?.sentiment
            ? "bg-green-500/10 text-green-400 border-green-500/20"
            : "bg-slate-800 text-slate-500 border-slate-700"
        }`}>
          <Brain size={10} />
          {mlStatus?.sentiment ? "DistilBERT" : "Offline"}
        </div>
      </div>

      {s ? (
        <>
          <div className="flex flex-col gap-3">
            <SentimentBar label="Positive" value={s.positive} color="#22c55e" emoji="😊" />
            <SentimentBar label="Neutral"  value={s.neutral}  color="#94a3b8" emoji="😐" />
            <SentimentBar label="Negative" value={s.negative} color="#f87171" emoji="😤" />
          </div>

          {dominant && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-700 border border-surface-500">
              <MessageSquare size={12} style={{ color: dominantLabel.color }} />
              <span className="text-xs font-mono" style={{ color: dominantLabel.color }}>
                {dominantLabel.text}
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-3">
          {["Positive", "Neutral", "Negative"].map(l => (
            <div key={l} className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-600 w-24">{l}</span>
              <div className="flex-1 h-2 bg-surface-700 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
