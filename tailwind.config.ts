import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#EC4899",
          dark: "#DB2777",
          soft: "#FDF2F8",
          mid: "#F9A8D4",
          border: "#FBCFE8",
        },
        ink: {
          DEFAULT: "#831843",
          body: "#4A1942",
          muted: "#9D6B8A",
        },
        accent: "#8B5CF6",
        ok: "#059669",
        danger: "#DC2626",
      },
      fontFamily: {
        script: ["var(--font-script)", "cursive"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 20px rgba(236, 72, 153, 0.08)",
        card: "0 2px 12px rgba(131, 24, 67, 0.06)",
        btn: "0 8px 20px rgba(236, 72, 153, 0.28)",
      },
      maxWidth: {
        phone: "420px",
      },
    },
  },
  plugins: [],
};
export default config;
