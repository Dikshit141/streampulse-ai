/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
        body:    ["'DM Sans'", "sans-serif"],
      },
      colors: {
        brand: {
          50:  "#f0fdf4",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
        },
        surface: {
          900: "#050810",
          800: "#0a0f1e",
          700: "#0f1729",
          600: "#162035",
          500: "#1e2d47",
          400: "#2a3d5c",
        },
        accent: {
          cyan:   "#22d3ee",
          amber:  "#fbbf24",
          red:    "#f87171",
          purple: "#a78bfa",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":    "fadeIn 0.4s ease-out forwards",
        "slide-up":   "slideUp 0.3s ease-out forwards",
        "glow":       "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        glow:    { from: { boxShadow: "0 0 5px #22c55e40" }, to: { boxShadow: "0 0 20px #22c55e80, 0 0 40px #22c55e30" } },
      },
    },
  },
  plugins: [],
};
