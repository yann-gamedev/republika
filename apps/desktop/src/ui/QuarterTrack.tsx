import { cn } from '@/ui/lib/utils';

interface QuarterTrackProps {
  /** Kuartal berjalan, 1-based. */
  readonly current: number;
  readonly total: number;
  readonly label: string;
  readonly className?: string;
}

/** Segmen kuartal: lewat (emas redup), sekarang (emas), akan datang (abu). */
export function QuarterTrack({ current, total, label, className }: QuarterTrackProps) {
  return (
    <span role="img" aria-label={label} className={cn('flex items-center gap-[3px]', className)}>
      {Array.from({ length: total }, (_, index) => {
        const quarter = index + 1;
        const state = quarter < current ? 'past' : quarter === current ? 'current' : 'future';
        return (
          <span
            key={quarter}
            aria-hidden="true"
            data-state={state}
            className={cn(
              'h-2 w-2.5 rounded-[2px]',
              state === 'past' && 'bg-primary/45',
              state === 'current' && 'bg-primary',
              state === 'future' && 'bg-raised-hover',
            )}
          />
        );
      })}
    </span>
  );
}
