import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          900: "#0d1114",
          800: "#151a1e",
          700: "#1e252a",
          600: "#272f35",
        },
        emerald: {
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          900: "#064e3b",
        },
        gold: {
          500: "#d4af37",
        },
        edge: {
          bg: "rgb(var(--edge-bg) / <alpha-value>)",
          panel: "rgb(var(--edge-panel) / <alpha-value>)",
          elevated: "rgb(var(--edge-elevated) / <alpha-value>)",
          line: "rgb(var(--edge-line) / <alpha-value>)",
          grass: "rgb(var(--edge-grass) / <alpha-value>)",
          accent: "rgb(var(--edge-accent) / <alpha-value>)",
          lime: "rgb(var(--edge-lime) / <alpha-value>)",
          gold: "rgb(var(--edge-gold) / <alpha-value>)",
          danger: "rgb(var(--edge-danger) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 15px rgba(16, 185, 129, 0.4)",
        card: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.5s ease both",
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
