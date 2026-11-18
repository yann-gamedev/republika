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
