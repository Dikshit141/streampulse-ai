export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function fmtViewers(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export function fmtPct(v) {
  if (v === null || v === undefined) return "—";
  return (v * 100).toFixed(1) + "%";
}

export function fmtMs(ms) {
  if (!ms) return "—";
  return ms.toFixed(0) + "ms";
}

export function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)   return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function riskColor(level) {
  switch (level) {
    case "low":      return "text-green-400";
    case "medium":   return "text-amber-400";
    case "high":     return "text-orange-400";
    case "critical": return "text-red-400";
    default:         return "text-slate-400";
  }
}

export function riskBg(level) {
  switch (level) {
    case "low":      return "bg-green-500/10 border-green-500/30";
    case "medium":   return "bg-amber-500/10 border-amber-500/30";
    case "high":     return "bg-orange-500/10 border-orange-500/30";
    case "critical": return "bg-red-500/10 border-red-500/30";
    default:         return "bg-slate-500/10 border-slate-500/30";
  }
}

export function severityColor(severity) {
  switch (severity) {
    case "critical": return "text-red-400 border-red-500/30 bg-red-500/10";
    case "warning":  return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    default:         return "text-cyan-400 border-cyan-500/30 bg-cyan-500/10";
  }
}
