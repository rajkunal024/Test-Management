/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "var(--primary-50, #eff6ff)",
          100: "var(--primary-100, #dbeafe)",
          500: "var(--primary-500, #3b82f6)",
          600: "var(--primary-600, #2563eb)",
          700: "var(--primary-700, #1d4ed8)"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 14px 40px rgba(15, 23, 42, 0.08)"
      }
    },
  },
  plugins: [],
};
