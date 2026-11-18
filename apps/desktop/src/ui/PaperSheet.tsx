import type { HTMLAttributes } from 'react';

import { cn } from '@/ui/lib/utils';

interface PaperSheetProps extends HTMLAttributes<HTMLDivElement> {
  /** `note` = nota dinas (kertas terang), `news` = koran (kertas sedikit gelap). */
  readonly tone?: 'note' | 'news';
}

/** Lembar kertas nota/koran. Tinta di atas kertas, bayangan `document`. */
export function PaperSheet({ tone = 'note', className, ...props }: PaperSheetProps) {
  return (
    <div
      className={cn('paper-sheet relative', tone === 'news' && 'bg-paper-dark', className)}
      {...props}
    />
  );
}
