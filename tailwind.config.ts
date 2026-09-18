import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        espresso: '#241811',
        'espresso-light': '#3A2A1E',
        brass: '#B8863B',
        'brass-light': '#D2A257',
        cream: '#F7F1E6',
        'cream-dark': '#EFE4CF',
        ink: '#2A1B12',
        'ink-soft': '#6E5B48',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config