import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#14213D",
        navy2: "#1E3158",
        terra: "#D9683F",
        terraSoft: "#FDF1EC",
        mist: "#F4F6FA",
        line: "#D3DAE8",
        mut: "#5B6B8C",
        ink: "#2B3A5C",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Helvetica Neue", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 8px 24px rgba(20,33,61,.08)",
      },
    },
  },
  plugins: [],
};

export default config;
