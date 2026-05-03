import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gucha: {
          black:         "#000000",
          card:          "#111111",
          "card-2":      "#141414",
          dark:          "#1a1a1a",
          border:        "#2a2a2a",
          "border-2":    "#1e1e1e",
          muted:         "#555555",
          subtle:        "#888888",
          red:           "#cc2222",
          "red-dark":    "#7a1a1a",
          "red-light":   "#f09595",
          "red-glow":    "rgba(204,34,34,0.15)",
          green:         "#0F6E56",
          "green-light": "#9FE1CB",
          "green-dark":  "#0a3d2e",
          "green-glow":  "rgba(15,110,86,0.2)",
        },
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        pulse_soft: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.6" },
        },
      },
      animation: {
        "fade-up":    "fadeUp 0.35s ease both",
        "shimmer":    "shimmer 1.4s infinite linear",
        "pulse-soft": "pulse_soft 2s infinite",
      },
      backgroundImage: {
        "red-gradient":   "linear-gradient(135deg, #cc2222, #8b1111)",
        "green-gradient": "linear-gradient(135deg, #0F6E56, #0a4a3a)",
        "card-gradient":  "linear-gradient(145deg, #141414, #0d0d0d)",
        "hero-gradient":  "radial-gradient(ellipse at 50% 0%, rgba(204,34,34,0.12) 0%, transparent 60%)",
      },
      boxShadow: {
        "red-glow":   "0 0 20px rgba(204,34,34,0.25), 0 0 40px rgba(204,34,34,0.1)",
        "green-glow": "0 0 20px rgba(15,110,86,0.3)",
        "card":       "0 4px 24px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};

export default config;
