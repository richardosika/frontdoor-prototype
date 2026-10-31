import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#1F3A2E",
          mid: "#2A4A3B",
          lift: "#2E5242",
        },
        cream: "#F4EFE4",
        paper: "#FFFDF8",
        brass: {
          DEFAULT: "#A8843F",
          soft: "#F6EEDB",
          pale: "#E9D9B0",
          line: "#CDBF9F",
        },
        parchment: "#F1E8D2",
        sand: "#C9BFA6",
        line: "#E0D6C2",
        mut: "#7A7363",
        ink: "#3B3A30",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "EB Garamond", "serif"],
        sans: ["var(--font-sans)", "Libre Franklin", "sans-serif"],
      },
      boxShadow: {
        card: "0 8px 24px rgba(31,58,46,.08)",
      },
    },
  },
  plugins: [],
};

export default config;
