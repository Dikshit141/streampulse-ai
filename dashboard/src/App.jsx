import { useState } from "react";
import { Radio, Zap, Github, ToggleLeft, ToggleRight } from "lucide-react";
import { useStreamData } from "./hooks/useStreamData";
import ViewerCard      from "./components/ViewerCard";
import EngagementChart from "./components/EngagementChart";
import DropRiskMeter   from "./components/DropRiskMeter";
import BufferingGauge  from "./components/BufferingGauge";
import SentimentMeter  from "./components/SentimentMeter";
import TrendingMoments from "./components/TrendingMoments";
import AlertFeed       from "./components/AlertFeed";
import StatsBar        from "./components/StatsBar";

const STREAM_TITLE = "IPL 2025 Final — MI vs CSK";

export default function App() {
  const [mockMode, setMockMode] = useState(false);

  const {
    connected, stats, history, moments,
    alerts, sentiment, dropPred, mlStatus,
  } = useStreamData(mockMode);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* ── Noise texture overlay ── */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
          backgroundSize: "128px",
        }}
      />

      {/* ── Top accent line ── */}
      <div className="h-px w-full" style={{ background: "linear-gradient(to right, transparent, #22c55e60, #22d3ee60, transparent)" }} />

      <div className="relative max-w-screen-2xl mx-auto px-4 py-5">

        {/* ── Header ── */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/30" style={{ boxShadow: "0 0 16px #22c55e30" }}>
              <Radio size={16} className="text-green-400" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-slate-100 leading-none">
                StreamPulse <span className="text-green-400">AI</span>
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{STREAM_TITLE}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-700 border border-surface-500">
              <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400 animate-pulse-slow" : "bg-red-400"}`}
                style={connected ? { boxShadow: "0 0 6px #22c55e" } : {}} />
              <span className="text-xs font-mono text-slate-400">
                {mockMode ? "Mock Mode" : connected ? "Live" : "Disconnected"}
              </span>
            </div>

            {/* Mock mode toggle */}
            <button
              onClick={() => setMockMode(m => !m)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono transition-all duration-200"
              style={mockMode
                ? { background: "#fbbf2415", borderColor: "#fbbf2430", color: "#fbbf24" }
                : { background: "#0f1729", borderColor: "#1e2d47", color: "#64748b" }}
            >
              {mockMode ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              {mockMode ? "Mock ON" : "Mock OFF"}
            </button>

            <a
              href="https://github.com/your-username/streampulse-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-700 border border-surface-500 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Github size={13} />
              GitHub
            </a>
          </div>
        </header>

        {/* ── Stats bar ── */}
        <StatsBar stats={stats} />

        {/* ── Main grid ── */}
        <div className="mt-4 grid grid-cols-12 gap-4">

          {/* Row 1: Viewer card + Engagement chart + Drop risk */}
          <div className="col-span-12 md:col-span-3">
            <ViewerCard stats={stats} history={history} />
          </div>

          <div className="col-span-12 md:col-span-6">
            <EngagementChart history={history} />
          </div>

          <div className="col-span-12 md:col-span-3">
            <DropRiskMeter dropPred={dropPred} mlStatus={mlStatus} />
          </div>

          {/* Row 2: Buffering + Sentiment + Trending moments */}
          <div className="col-span-12 md:col-span-3">
            <BufferingGauge stats={stats} />
          </div>

          <div className="col-span-12 md:col-span-3">
            <SentimentMeter sentiment={sentiment} mlStatus={mlStatus} />
          </div>

          <div className="col-span-12 md:col-span-6">
            <TrendingMoments moments={moments} />
          </div>

          {/* Row 3: Alert feed full width */}
          <div className="col-span-12">
            <AlertFeed alerts={alerts} />
          </div>

        </div>

        {/* ── Footer ── */}
        <footer className="mt-8 flex items-center justify-between text-xs text-slate-600 font-mono">
          <span>StreamPulse AI — Portfolio Demo · Built for JioHotstar-scale streaming</span>
          <div className="flex items-center gap-1.5">
            <Zap size={11} className="text-green-500" />
            <span>Node.js · Redis Streams · DistilBERT · RandomForest · React</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
