import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gibi: {
          navy: "#0B2545",
          blue: "#134074",
          gold: "#F4B400",
          light: "#F4F7FB",
        },
      },
      fontFamily: {
        ethiopic: ['"Noto Sans Ethiopic"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
