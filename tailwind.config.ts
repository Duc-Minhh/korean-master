import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#1e3a5f',
          900: '#0f2744',
          950: '#0a192f',
        },
        korean: {
          blue: '#1a56db',
          lightBlue: '#e1effe',
          accent: '#0284c7',
          gold: '#f59e0b',
        }
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Noto Sans KR',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        korean: ['Noto Sans KR', 'Pretendard', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 4px 20px -2px rgba(15, 39, 68, 0.06)',
        'elevated': '0 20px 25px -5px rgba(15, 39, 68, 0.1), 0 10px 10px -5px rgba(15, 39, 68, 0.04)',
      }
    },
  },
  plugins: [],
};
export default config;
