import { cn } from '@/ui/lib/utils';

interface ApTokensProps {
  readonly remaining: number;
  readonly total: number;
  /** Teks untuk pembaca layar, mis. "Sisa 1 dari 2 AP". */
  readonly label: string;
  readonly className?: string;
}

/** Bulatan Action Points: terisi = tersisa, kosong = terpakai. */
export function ApTokens({ remaining, total, label, className }: ApTokensProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn('inline-flex items-center gap-1.5', className)}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          data-filled={index < remaining}
          className={cn(
            'h-3 w-3 rounded-full border-2 transition-colors duration-150',
            index < remaining
              ? 'border-primary bg-primary'
              : 'border-muted-foreground/60 bg-transparent',
          )}
        />
      ))}
    </span>
  );
}
