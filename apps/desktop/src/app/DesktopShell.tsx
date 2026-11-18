import { useCallback, useEffect, useRef, useState } from 'react';

import { copy } from '@/copy/id';
import { forceCloseWindow, onWindowCloseRequested, setApplicationFullscreen } from '@/platform';
import { gameController } from '@/store/controller';
import { useAppStore } from '@/store/useAppStore';
import { ConfirmDialog } from '@/ui/components/dialog';

/**
 * Perilaku tingkat jendela: preferensi layar penuh saat dibuka, F11, dan
 * konfirmasi menutup jendela bila keputusan kuartal ini belum tersimpan.
 */
export function DesktopShell() {
  const initialized = useAppStore((store) => store.initialized);
  const fullscreen = useAppStore((store) => store.settings.fullscreen);
  const setFullscreenPreference = useAppStore((store) => store.setFullscreenPreference);
  const [confirmClose, setConfirmClose] = useState(false);
  const applied = useRef(false);

  // Terapkan preferensi layar penuh yang tersimpan, sekali setelah pengaturan dimuat.
  useEffect(() => {
    if (!initialized || applied.current) return;
    applied.current = true;
    if (fullscreen) void setApplicationFullscreen(true).catch(() => undefined);
  }, [initialized, fullscreen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'F11') return;
      event.preventDefault();
      const next = !useAppStore.getState().settings.fullscreen;
      void setApplicationFullscreen(next)
        .then(() => setFullscreenPreference(next))
        .catch(() => undefined);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setFullscreenPreference]);

  useEffect(
    () =>
      onWindowCloseRequested(() => {
        if (!gameController.hasUnsavedChanges()) return true;
        setConfirmClose(true);
        return false;
      }),
    [],
  );

  const stay = useCallback(() => setConfirmClose(false), []);
  const leave = useCallback(() => {
    setConfirmClose(false);
    void forceCloseWindow();
  }, []);

  return (
    <ConfirmDialog
      open={confirmClose}
      title={copy.closeGuard.title}
      confirmLabel={copy.closeGuard.leave}
      cancelLabel={copy.common.cancel}
      onConfirm={leave}
      onCancel={stay}
    >
      {copy.closeGuard.body}
    </ConfirmDialog>
  );
}
