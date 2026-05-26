import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Activity } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-700 border border-surface-500 rounded-lg p-3 text-xs font-mono shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {(p.value * 100).toFixed(1)}%
        </p>
      ))}
    </div>
  );
};

export default function EngagementChart({ history }) {
  const data = (history || []).slice(-60).map((h, i) => {
  const t = new Date(h.captured_at);

  return {
    time: `${t.getMinutes()}:${String(t.getSeconds()).padStart(2, "0")}`,

    engagement: parseFloat(
      Number(h.engagement_score ?? 0).toFixed(4)
    ),

    buffering: parseFloat(
      Number(h.buffering_rate ?? 0).toFixed(4)
    ),

    viewers: Number(h.concurrent_viewers ?? 0),
  };
  });

  return (
    <div className="card animate-fade-in" style={{ animationDelay: "100ms" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <span className="label">Engagement & Buffering</span>
          <p className="text-xs text-slate-500 mt-0.5">Last 60 data points</p>
        </div>
        <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <Activity size={14} className="text-green-400" />
        </div>
      </div>

      {data.length > 1 ? (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d47" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono" }}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(data.length / 6)}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fill: "#475569", fontSize: 10, fontFamily: "JetBrains Mono" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${(v * 100).toFixed(0)}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0.5} stroke="#1e2d47" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="engagement"
              name="Engagement"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#22c55e" }}
            />
            <Line
              type="monotone"
              dataKey="buffering"
              name="Buffering"
              stroke="#f87171"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
              activeDot={{ r: 3, fill: "#f87171" }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-44 flex items-center justify-center text-slate-600 text-sm font-mono">
          Collecting data...
        </div>
      )}

      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <div className="w-4 h-0.5 bg-green-400 rounded" />
          Engagement
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <div className="w-4 h-0.5 bg-red-400 rounded" style={{ background: "repeating-linear-gradient(to right, #f87171 0, #f87171 4px, transparent 4px, transparent 6px)" }} />
          Buffering
        </div>
      </div>
    </div>
  );
}
