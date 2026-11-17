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
