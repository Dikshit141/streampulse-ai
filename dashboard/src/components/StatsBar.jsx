import { Gauge, Heart, Clock } from "lucide-react";
import { fmtPct } from "../lib/utils";

function StatPill({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-700 border border-surface-500 flex-1">
      <div className="p-1.5 rounded-md" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        <Icon size={13} style={{ color }} />
      </div>
      <div>
        <div className="text-xs text-slate-500 font-mono">{label}</div>
        <div className="text-sm font-display font-semibold" style={{ color }}>{value}</div>
      </div>
    </div>
  );
}

export default function StatsBar({ stats }) {
  const bitrate    = stats?.avg_bitrate_kbps;
  const engagement = stats?.engagement_score;
  const hour       = stats?.time_of_day_hour ?? new Date().getHours();

  const bitrateLabel = !bitrate ? "—"
    : bitrate > 3000 ? `${(bitrate / 1000).toFixed(1)} Mbps ✓`
    : bitrate > 1500 ? `${(bitrate / 1000).toFixed(1)} Mbps`
    : `${(bitrate / 1000).toFixed(1)} Mbps ↓`;

  const bitrateColor = !bitrate ? "#475569"
    : bitrate > 3000 ? "#22c55e"
    : bitrate > 1500 ? "#fbbf24"
    : "#f87171";

  const timeLabel = `${String(hour).padStart(2, "0")}:00 IST`;

  return (
    <div className="flex gap-2 animate-fade-in" style={{ animationDelay: "50ms" }}>
      <StatPill
        icon={Gauge}
        label="Avg Bitrate"
        value={bitrateLabel}
        color={bitrateColor}
      />
      <StatPill
        icon={Heart}
        label="Engagement"
        value={engagement !== undefined ? fmtPct(engagement) : "—"}
        color="#a78bfa"
      />
      <StatPill
        icon={Clock}
        label="Stream Time"
        value={timeLabel}
        color="#22d3ee"
      />
    </div>
  );
}
