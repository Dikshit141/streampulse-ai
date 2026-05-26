import { Wifi, WifiOff } from "lucide-react";
import { fmtPct } from "../lib/utils";

export default function BufferingGauge({ stats }) {
  const rate = stats?.buffering_rate ?? null;
  const pct  = rate !== null ? rate * 100 : null;

  const color = pct === null ? "#334155"
    : pct < 10  ? "#22c55e"
    : pct < 25  ? "#fbbf24"
    : pct < 45  ? "#f97316"
    : "#f87171";

  const label = pct === null ? "—"
    : pct < 10  ? "Healthy"
    : pct < 25  ? "Elevated"
    : pct < 45  ? "High"
    : "Critical";

  // Build segmented bar
  const segments = 20;
  const filled   = pct !== null ? Math.round((pct / 100) * segments) : 0;

  return (
    <div className="card flex flex-col gap-3 animate-fade-in" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between">
        <span className="label">Buffering Rate</span>
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          {pct !== null && pct > 25
            ? <WifiOff size={14} className="text-amber-400" />
            : <Wifi    size={14} className="text-amber-400" />}
        </div>
      </div>

      <div className="flex items-end gap-3">
        <span className="text-4xl font-display font-bold" style={{ color }}>
          {pct !== null ? `${pct.toFixed(1)}%` : "—"}
        </span>
        <span className="mb-1 text-sm font-mono" style={{ color }}>{label}</span>
      </div>

      {/* Segmented bar */}
      <div className="flex gap-0.5 mt-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-2 rounded-sm transition-all duration-500"
            style={{
              background: i < filled ? color : "#1e2d47",
              opacity: i < filled ? (0.4 + (i / segments) * 0.6) : 1,
            }}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-1">
        {[
          { label: "Good",     range: "< 10%",  color: "#22c55e" },
          { label: "Warning",  range: "10–25%", color: "#fbbf24" },
          { label: "Critical", range: "> 25%",  color: "#f87171" },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-xs font-mono" style={{ color: s.color }}>{s.label}</div>
            <div className="text-xs text-slate-600">{s.range}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
