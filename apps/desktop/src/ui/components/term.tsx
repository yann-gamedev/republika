import { useId, type ReactNode } from 'react';

/**
 * Istilah dengan penjelasan glosarium: muncul saat hover atau fokus keyboard,
 * dan selalu terbaca pembaca layar lewat `aria-describedby`.
 */
export function Term({ children, explanation }: { children: ReactNode; explanation: string }) {
  const id = useId();
  return (
    <span className="group relative inline-flex">
      <span
        tabIndex={0}
        aria-describedby={id}
        className="cursor-help border-b border-dotted border-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
      </span>
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-64 border border-border bg-card px-3 py-2 text-left text-xs normal-case leading-relaxed tracking-normal text-foreground shadow-document group-focus-within:block group-hover:block"
      >
        {explanation}
      </span>
    </span>
  );
}

/** Ikon arah + angka, agar perubahan tidak hanya dibedakan dengan warna. */
export function deltaArrow(delta: number): string {
  if (delta > 0) return '↑';
  if (delta < 0) return '↓';
  return '→';
}
