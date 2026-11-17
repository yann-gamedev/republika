import { useEffect, useId, useRef, type ReactNode } from 'react';

import { Button } from '@/ui/components/button';

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly children?: ReactNode;
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  /** Label tombol sekunder opsional (mis. "Pakai cadangan"). */
  readonly secondaryLabel?: string;
  readonly onSecondary?: () => void;
  readonly busy?: boolean;
}

/**
 * Dialog konfirmasi ringan tanpa library. `Enter` mengonfirmasi, `Esc`
 * menutup, fokus awal di tombol konfirmasi.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  secondaryLabel,
  onSecondary,
  busy = false,
}: ConfirmDialogProps) {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      } else if (event.key === 'Enter' && !busy) {
        event.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-background/70 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md border border-primary/35 bg-card p-6 shadow-document"
      >
        <h2 id={titleId} className="font-serif text-xl">
          {title}
        </h2>
        {children !== undefined && (
          <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {cancelLabel !== undefined && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}
          {secondaryLabel !== undefined && onSecondary !== undefined && (
            <Button variant="outline" size="sm" onClick={onSecondary} disabled={busy}>
              {secondaryLabel}
            </Button>
          )}
          <Button ref={confirmRef} size="sm" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
