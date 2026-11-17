import { cn } from '@/ui/lib/utils';

interface SealProps {
  label: string;
  className?: string;
}

/** Segel geometris fiktif. Tidak memakai lambang negara atau organisasi nyata. */
export function Seal({ label, className }: SealProps) {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={label} className={cn('text-gold', className)}>
      <defs>
        <linearGradient id="seal-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="94" fill="none" stroke="currentColor" strokeOpacity="0.22" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="currentColor" strokeOpacity="0.5" />
      <circle cx="100" cy="100" r="72" fill="none" stroke="currentColor" strokeOpacity="0.22" />
      <circle
        cx="100"
        cy="100"
        r="58"
        fill="currentColor"
        fillOpacity="0.03"
        stroke="url(#seal-gold)"
        strokeWidth="1.5"
      />
      {Array.from({ length: 32 }, (_, index) => {
        const angle = (index / 32) * Math.PI * 2;
        const inner = index % 4 === 0 ? 84 : 88;
        const outer = 94;
        return (
          <line
            key={index}
            x1={100 + Math.cos(angle) * inner}
            y1={100 + Math.sin(angle) * inner}
            x2={100 + Math.cos(angle) * outer}
            y2={100 + Math.sin(angle) * outer}
            stroke="currentColor"
            strokeOpacity={index % 4 === 0 ? 0.55 : 0.18}
          />
        );
      })}
      <path
        d="M100 52 110 84 144 84 117 103 127 136 100 116 73 136 83 103 56 84 90 84Z"
        fill="none"
        stroke="url(#seal-gold)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M100 66 106 87 128 87 111 100 117 121 100 108 83 121 89 100 72 87 94 87Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="none"
      />
      <path d="M70 148h60" stroke="currentColor" strokeOpacity="0.5" />
      <path d="M80 154h40" stroke="currentColor" strokeOpacity="0.28" />
      <circle cx="100" cy="100" r="4" fill="currentColor" fillOpacity="0.75" />
    </svg>
  );
}
