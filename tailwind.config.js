/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: '#f8f8f8',
        'sidebar-hover': '#efefef',
        'sidebar-active': '#e5e5e5',
      },
    },
  },
  plugins: [],
}
