import { Flame, Clock } from "lucide-react";
import { timeAgo, fmtViewers } from "../lib/utils";

export default function TrendingMoments({ moments }) {
  return (
    <div className="card flex flex-col gap-3 animate-fade-in" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center justify-between">
        <div>
          <span className="label">Trending Moments</span>
          <p className="text-xs text-slate-500 mt-0.5">Auto-detected viewer spikes</p>
        </div>
        <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <Flame size={14} className="text-orange-400" />
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        {moments && moments.length > 0 ? (
          moments.map((m, i) => (
            <div
              key={m.id || i}
              className="flex items-start gap-3 p-3 rounded-lg bg-surface-700 border border-surface-500 animate-slide-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Spike badge */}
              <div className="shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <span className="text-xs font-display font-bold text-orange-400">
                  +{parseFloat(m.spike_pct).toFixed(0)}%
                </span>
                <span className="text-xs text-slate-500">spike</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-body text-slate-200 truncate">
                    {m.label || "Viewer Spike"}
                  </span>
                  {m.is_replay_worthy !== false && (
                    <span className="shrink-0 badge-amber text-xs">replay</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-mono text-cyan-400">
                    {fmtViewers(m.viewer_count)} viewers
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={10} />
                    {timeAgo(m.detected_at)}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-slate-600 text-sm font-mono">
            No trending moments yet.<br />
            <span className="text-xs">Watching for 20%+ viewer spikes...</span>
          </div>
        )}
      </div>
    </div>
  );
}
