import type { Config } from "tailwindcss";

// Tailwind is used only for layout utilities (flex, grid, spacing).
// Color, type and component styling stays in globals.css as CSS custom
// properties so the light/dark token system ports 1:1 from the original
// HTML prototype instead of being re-invented in Tailwind's theme.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
