import colors from "tailwindcss/colors";

const parityScale = (scale) => ({
  ...scale,
  55: scale[50],
  105: scale[100],
  150: scale[200],
  155: scale[200],
  205: scale[200],
  250: scale[300],
  305: scale[300],
  350: scale[400],
  355: scale[400],
  405: scale[400],
  450: scale[500],
  455: scale[500],
  505: scale[500],
  550: scale[600],
  555: scale[600],
  605: scale[600],
  650: scale[700],
  655: scale[700],
  705: scale[700],
  750: scale[800],
  755: scale[800],
  805: scale[800],
  808: scale[800],
  850: scale[900],
  855: scale[900],
  905: scale[900],
  955: scale[950],
});

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slate: parityScale(colors.slate),
        gray: parityScale(colors.gray),
        amber: parityScale(colors.amber),
        blue: parityScale(colors.blue),
        emerald: parityScale(colors.emerald),
        indigo: parityScale(colors.indigo),
        purple: parityScale(colors.purple),
        rose: parityScale(colors.rose),
        teal: parityScale(colors.teal),
        violet: parityScale(colors.violet),
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
