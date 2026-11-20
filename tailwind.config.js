/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2937",
        muted: "#667085",
        brand: "#4f46e5",
        canvas: "#f7f8fc",
        line: "#e8eaf1",
      },
      boxShadow: {
        card: "0 8px 30px rgba(31, 41, 55, 0.06)",
      },
    },
  },
  plugins: [],
};
