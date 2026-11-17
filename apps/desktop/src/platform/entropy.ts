/**
 * Sumber waktu dan keacakan untuk app. Engine tidak boleh memakai ini secara
 * langsung (AGENT §4.2); nilainya diteruskan sebagai argumen.
 */

/** Waktu sekarang dalam ISO 8601 (untuk `savedAt`). */
export function nowIso(): string {
  return new Date().toISOString();
}

function randomHex(bytes: number): string {
  const buffer = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buffer);
  return [...buffer].map((value) => value.toString(16).padStart(2, '0')).join('');
}

/** Seed kampanye: waktu + 64 bit acak. Disimpan di state, tidak ditampilkan di UI. */
export function createCampaignSeed(): string {
  return `${Date.now().toString(36)}-${randomHex(8)}`;
}

/** ID unik untuk setiap command pemain. */
export function createCommandId(): string {
  return `cmd-${Date.now().toString(36)}-${randomHex(6)}`;
}
