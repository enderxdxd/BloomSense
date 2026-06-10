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
          rose: "#A26769",    // dusty rose — secondary text, borders
          sage: "#7A9E7E",    // sage green — success, leaf elements
          gold: "#C8A882",    // warm gold — highlights, badges
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
