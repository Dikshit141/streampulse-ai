import { Users, TrendingUp, TrendingDown } from "lucide-react";
import { fmtViewers } from "../lib/utils";

export default function ViewerCard({ stats, history }) {
  const current = stats?.concurrent_viewers ?? null;

  // Calculate trend vs 10 ticks ago
  const trend = (() => {
    if (!history || history.length < 10) return null;
    const prev = history[history.length - 10]?.concurrent_viewers;
    if (!prev || !current) return null;
    return ((current - prev) / prev) * 100;
  })();

  return (
    <div className="card flex flex-col gap-3 animate-fade-in" style={{ animationDelay: "0ms" }}>
      <div className="flex items-center justify-between">
        <span className="label">Live Viewers</span>
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Users size={14} className="text-cyan-400" />
        </div>
      </div>

      <div className="flex items-end gap-3">
        <span className="value-lg" style={{ color: "#22d3ee" }}>
          {fmtViewers(current)}
        </span>
        {trend !== null && (
          <div className={`flex items-center gap-1 mb-1 text-sm font-mono ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
            {trend >= 0
              ? <TrendingUp size={14} />
              : <TrendingDown size={14} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500 font-mono">
        {current ? `${current.toLocaleString()} concurrent` : "Awaiting data..."}
      </div>

      {/* Mini sparkline */}
      {history && history.length > 2 && (
        <div className="flex items-end gap-0.5 h-8 mt-1">
          {history.slice(-20).map((h, i) => {
            const max = Math.max(...history.slice(-20).map(x => x.concurrent_viewers));
            const min = Math.min(...history.slice(-20).map(x => x.concurrent_viewers));
            const pct = max === min ? 0.5 : (h.concurrent_viewers - min) / (max - min);
            return (
              <div
                key={i}
                className="flex-1 rounded-sm transition-all duration-300"
                style={{
                  height: `${Math.max(10, pct * 100)}%`,
                  background: `rgba(34, 211, 238, ${0.2 + pct * 0.6})`,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
