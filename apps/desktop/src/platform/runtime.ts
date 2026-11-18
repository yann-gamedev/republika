export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && Reflect.has(window, '__TAURI_INTERNALS__');
}

export async function setApplicationFullscreen(fullscreen: boolean): Promise<void> {
  if (isTauriRuntime()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().setFullscreen(fullscreen);
    return;
  }

  if (fullscreen) {
    await document.documentElement.requestFullscreen();
    return;
  }
  if (document.fullscreenElement !== null) {
    await document.exitFullscreen();
  }
}

export async function quitApplication(): Promise<void> {
  if (isTauriRuntime()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
    return;
  }
  window.close();
}

/** Membuka Documents/REPUBLIKA/saves di Explorer. `false` bila tidak di desktop. */
export async function openSavesFolder(): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('open_saves_folder');
  return true;
}

/**
 * Pemain memilih file save lama; salinannya ditaruh di `saves/imported/`.
 * Mengembalikan path relatif salinan, atau `null` bila batal/bukan desktop.
 */
export async function importSaveFile(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string | null>('import_save_file');
}

/**
 * Mendaftarkan penjaga penutupan jendela. `allowClose()` mengembalikan `false`
 * untuk menahan penutupan (UI lalu menampilkan konfirmasi). Mengembalikan
 * fungsi untuk melepas listener.
 */
export function onWindowCloseRequested(allowClose: () => boolean): () => void {
  if (isTauriRuntime()) {
    let unlisten: (() => void) | null = null;
    let disposed = false;
    void import('@tauri-apps/api/window').then(({ getCurrentWindow }) =>
      getCurrentWindow()
        .onCloseRequested((event) => {
          if (!allowClose()) event.preventDefault();
        })
        .then((fn) => {
          if (disposed) fn();
          else unlisten = fn;
        }),
    );
    return () => {
      disposed = true;
      unlisten?.();
    };
  }
  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!allowClose()) {
      event.preventDefault();
      event.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', onBeforeUnload);
  return () => window.removeEventListener('beforeunload', onBeforeUnload);
}

/** Menutup jendela tanpa melewati penjaga lagi (setelah pemain mengonfirmasi). */
export async function forceCloseWindow(): Promise<void> {
  if (isTauriRuntime()) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().destroy();
    return;
  }
  window.close();
}
