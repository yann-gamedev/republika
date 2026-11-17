import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        paper: 'hsl(var(--paper))',
        ink: 'hsl(var(--ink))',
        gold: 'hsl(var(--gold))',
        maroon: 'hsl(var(--maroon))',
      },
      fontFamily: {
        sans: ['Inter Variable', 'Segoe UI', 'sans-serif'],
        serif: ['Source Serif 4 Variable', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 1px)',
        sm: 'calc(var(--radius) - 2px)',
      },
      boxShadow: {
        document: '0 18px 60px -30px rgba(0, 0, 0, 0.85)',
        seal: '0 0 0 1px hsl(var(--gold) / 0.28), 0 24px 80px -40px rgba(0, 0, 0, 0.9)',
      },
      letterSpacing: {
        institutional: '0.18em',
      },
    },
  },
  plugins: [],
} satisfies Config;
