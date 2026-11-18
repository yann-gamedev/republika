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
        sidebar: 'hsl(var(--sidebar))',
        raised: {
          DEFAULT: 'hsl(var(--raised))',
          hover: 'hsl(var(--raised-hover))',
        },
        'text-secondary': 'hsl(var(--text-secondary))',
        positive: 'hsl(var(--positive))',
        negative: 'hsl(var(--negative))',
        paper: {
          DEFAULT: 'hsl(var(--paper))',
          dark: 'hsl(var(--paper-dark))',
        },
        ink: {
          DEFAULT: 'hsl(var(--ink))',
          muted: 'hsl(var(--ink-muted))',
        },
        gold: 'hsl(var(--gold))',
        stamp: 'hsl(var(--stamp))',
        urgent: 'hsl(var(--urgent))',
        maroon: 'hsl(var(--maroon))',
        sat: {
          1: 'hsl(var(--sat-1))',
          2: 'hsl(var(--sat-2))',
          3: 'hsl(var(--sat-3))',
          4: 'hsl(var(--sat-4))',
          5: 'hsl(var(--sat-5))',
        },
      },
      fontFamily: {
        sans: ['Inter Variable', 'Segoe UI', 'sans-serif'],
        serif: ['Source Serif 4 Variable', 'Georgia', 'serif'],
        mono: ['IBM Plex Mono', 'Consolas', 'monospace'],
        signature: ['Mrs Saint Delafield', 'cursive'],
      },
      // Kartu 14 px, kontrol 8 px, kertas 6 px (Lampiran A).
      borderRadius: {
        lg: 'var(--radius)',
        md: '8px',
        sm: '6px',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      boxShadow: {
        document: '0 18px 60px -30px rgba(0, 0, 0, 0.85)',
        seal: '0 0 0 1px hsl(var(--gold) / 0.28), 0 24px 80px -40px rgba(0, 0, 0, 0.9)',
      },
    },
  },
  plugins: [],
} satisfies Config;
