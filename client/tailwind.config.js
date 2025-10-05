/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Soft colors for modes to reduce eye strain
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          800: '#166534',
          900: '#14532d',
        },
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        orange: {
          50: '#fff7ed',
          100: '#fed7aa',
          200: '#fdba74',
          800: '#92400e',
          900: '#7c2d12',
        },
      },
    },
  },
  plugins: [],
}