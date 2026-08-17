import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0b1020',
        panel: '#111827',
        accent: '#6366f1',
      },
    },
  },
  plugins: [],
};

export default config;
