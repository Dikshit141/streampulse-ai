import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { Brain, Zap } from "lucide-react";
import { riskColor, riskBg, fmtPct } from "../lib/utils";

export default function DropRiskMeter({ dropPred, mlStatus }) {
  const prob  = dropPred?.drop_probability ?? null;
  const risk  = dropPred?.risk_level ?? "unknown";
  const pct   = prob !== null ? Math.round(prob * 100) : null;

  const arcColor = {
    low:      "#22c55e",
    medium:   "#fbbf24",
    high:     "#f97316",
    critical: "#f87171",
    unknown:  "#334155",
  }[risk] || "#334155";

  const data = [{ value: pct ?? 0, fill: arcColor }];

  return (
    <div className="card flex flex-col gap-3 animate-fade-in" style={{ animationDelay: "150ms" }}>
      <div className="flex items-center justify-between">
        <span className="label">AI Drop Risk</span>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono border ${
          mlStatus?.drop ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-slate-800 text-slate-500 border-slate-700"
        }`}>
          <Brain size={10} />
          {mlStatus?.drop ? "ML Live" : "ML Offline"}
        </div>
      </div>

      <div className="relative flex items-center justify-center" style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height={140}>
          <RadialBarChart
            cx="50%" cy="75%"
            innerRadius="65%" outerRadius="95%"
            startAngle={180} endAngle={0}
            data={data}
          >
            <RadialBar
              background={{ fill: "#0f1729" }}
              dataKey="value"
              cornerRadius={6}
              max={100}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: 8 }}>
          <span className="text-3xl font-display font-bold" style={{ color: arcColor }}>
            {pct !== null ? `${pct}%` : "—"}
          </span>
          <span className={`text-xs font-mono uppercase tracking-widest mt-0.5 ${riskColor(risk)}`}>
            {risk}
          </span>
        </div>
      </div>

      {dropPred && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono ${riskBg(risk)}`}>
          <Zap size={11} className={riskColor(risk)} />
          <span className={riskColor(risk)}>
            Confidence: {fmtPct(dropPred.confidence)}
          </span>
          {dropPred.inference_ms && (
            <span className="ml-auto text-slate-500">{dropPred.inference_ms.toFixed(0)}ms</span>
          )}
        </div>
      )}
    </div>
  );
}
