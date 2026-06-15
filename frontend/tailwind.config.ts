import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18211f",
        mist: "#f5f7f5",
        sage: "#6d8a7a",
        coral: "#d96f58",
        gold: "#c69a48"
      },
      boxShadow: {
        soft: "0 14px 40px rgba(24, 33, 31, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
