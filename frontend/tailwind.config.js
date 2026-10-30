/** Colors are taken from the Figma screens: soft green brand, warm "scheduled" chip, pale grey fields. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      colors: {
        brand: { 50: "#e8f5e9", 100: "#d4ecd7", 500: "#4aa44f", 600: "#3d9142", 700: "#2f7a35" },
        field: "#f4f6f3",
        chip: { bg: "#fdebd3", text: "#c2410c" },
      },
    },
  },
  plugins: [],
};
