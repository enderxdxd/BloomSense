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
          primary: "#6D2E46", // deep berry — primary CTA
          rose: "#A26769",    // dusty rose — accents
          sage: "#7A9E7E",    // sage green — secondary
          gold: "#C8A882",    // warm gold — highlights
          cream: "#F9F5F0",   // off-white — backgrounds
        },
      },
    },
  },
  plugins: [],
};

export default config;
