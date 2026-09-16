/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        school: {
          blue: '#3b82f6',
          sky: '#0284c7',
          sun: '#f59e0b',
          apple: '#ef4444',
          grass: '#10b981',
          chalkboard: '#1e293b',
          paper: '#f8fafc',
          card: '#ffffff',
          softGreen: '#ecfdf5',
          softBlue: '#f0f9ff',
          softYellow: '#fefce8',
          softPurple: '#faf5ff',
          softRose: '#fff1f2',
        }
      },
      fontFamily: {
        sans: ['Fredoka', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
