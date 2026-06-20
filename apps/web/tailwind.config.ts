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
        zinc: {
          50: "rgb(var(--zinc-50) / <alpha-value>)",
          100: "rgb(var(--zinc-100) / <alpha-value>)",
          200: "rgb(var(--zinc-200) / <alpha-value>)",
          300: "rgb(var(--zinc-300) / <alpha-value>)",
          400: "rgb(var(--zinc-400) / <alpha-value>)",
          500: "rgb(var(--zinc-500) / <alpha-value>)",
          600: "rgb(var(--zinc-600) / <alpha-value>)",
          700: "rgb(var(--zinc-700) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(74,222,128,0.12), 0 18px 50px -20px rgba(21,163,74,0.35)",
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 24px 60px -32px rgba(0,0,0,0.8)",
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
        "grow-x": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.9s ease both",
        "grow-x": "grow-x 0.9s cubic-bezier(0.16,1,0.3,1) both",
        float: "float 7s ease-in-out infinite",
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
