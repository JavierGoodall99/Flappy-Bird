import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './game/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
    './index.tsx',
  ],
  theme: {
    extend: {
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
