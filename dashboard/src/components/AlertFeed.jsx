import { Bell, AlertTriangle, Info, XCircle, Clock } from "lucide-react";
import { timeAgo, severityColor } from "../lib/utils";

const SeverityIcon = ({ severity }) => {
  if (severity === "critical") return <XCircle     size={12} className="text-red-400   shrink-0" />;
  if (severity === "warning")  return <AlertTriangle size={12} className="text-amber-400 shrink-0" />;
  return                              <Info          size={12} className="text-cyan-400  shrink-0" />;
};

const alertTypeLabel = {
  high_drop_risk: "Drop Risk",
  buffer_spike:   "Buffer Spike",
  trending:       "Trending",
};

export default function AlertFeed({ alerts }) {
  return (
    <div className="card flex flex-col gap-3 animate-fade-in" style={{ animationDelay: "350ms" }}>
      <div className="flex items-center justify-between">
        <div>
          <span className="label">Alert Feed</span>
          <p className="text-xs text-slate-500 mt-0.5">Threshold breach notifications</p>
        </div>
        <div className="relative p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <Bell size={14} className="text-red-400" />
          {alerts && alerts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-mono">
              {Math.min(alerts.length, 9)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        {alerts && alerts.length > 0 ? (
          alerts.map((a, i) => (
            <div
              key={a.id || i}
              className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs animate-slide-up ${severityColor(a.severity)}`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <SeverityIcon severity={a.severity} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-mono font-medium uppercase tracking-wide text-xs">
                    {alertTypeLabel[a.alert_type] || a.alert_type}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500 shrink-0">
                    <Clock size={9} />
                    {timeAgo(a.created_at)}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">{a.message}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-slate-600 text-sm font-mono">
            No alerts.<br />
            <span className="text-xs">All thresholds within normal range.</span>
          </div>
        )}
      </div>
    </div>
  );
}
