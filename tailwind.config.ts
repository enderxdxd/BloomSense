import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bloom: {
          primary: "#6D2E46", // deep berry — headers, buttons, accents
          rose: "#8F4F54",    // dusty rose - accessible secondary text
          sage: "#496F50",    // sage green - accessible leaf/status text
          gold: "#7F6334",    // warm gold - accessible highlight text
          cream: "#F9F5F0",   // off-white — backgrounds
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "ui-serif", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
