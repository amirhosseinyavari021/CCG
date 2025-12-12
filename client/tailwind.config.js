/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'ccg-blue': '#3BA7FF',
        'ccg-bg': '#0f172a', // slate-900
        'ccg-card': '#1e293b', // slate-800
        'ccg-border': '#334155', // slate-700
      },
    },
  },
  plugins: [],
};
