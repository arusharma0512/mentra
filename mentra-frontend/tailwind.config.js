/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "mentra-mint": "#C9E8DB",
        "mentra-mintSoft": "#EFF7F3",
        "mentra-mintActive": "#DFF2EA",
        "mentra-mintDark": "#5FAF98",
        "mentra-border": "#E2EEE8",
        "mentra-bg": "#FAFCFB",
        "mentra-text": "#1F2933",
        "mentra-muted": "#6B7280",
      },
    },
  },
  plugins: [],
};
