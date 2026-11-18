import { cn } from '@/ui/lib/utils';

interface StampProps {
  readonly label: string;
  /** Saat `false` cap disembunyikan; perubahan ke `true` memicu transisi masuk. */
  readonly visible: boolean;
  readonly className?: string;
}

/**
 * Cap miring merah. Masuk dengan transisi `opacity` + `transform` 240 ms;
 * `prefers-reduced-motion` mematikan transform dan durasi (globals.css).
 */
export function Stamp({ label, visible, className }: StampProps) {
  return (
    <span
      aria-hidden={!visible}
      data-testid="stamp"
      data-visible={visible}
      className={cn(
        'motion-transform pointer-events-none inline-block select-none rounded-sm border-[3px] border-stamp px-4 py-1.5 font-serif text-2xl font-semibold text-stamp',
        'transition-[opacity,transform] duration-[240ms] ease-standard',
        visible ? '-rotate-[8deg] scale-100 opacity-90' : 'rotate-0 scale-125 opacity-0',
        className,
      )}
    >
      {label}
    </span>
  );
}
