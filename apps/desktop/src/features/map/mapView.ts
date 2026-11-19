/** Logika tampilan Peta daerah yang murni (warna tingkat kepuasan, Lampiran A). */

export const SATISFACTION_LEVELS = [1, 2, 3, 4, 5] as const;
export type SatisfactionLevel = (typeof SATISFACTION_LEVELS)[number];

/** ≥70 · 55–69 · 40–54 · 25–39 · <25 (persepuluhan masuk). */
export function satisfactionLevel(tenths: number): SatisfactionLevel {
  if (tenths >= 700) return 1;
  if (tenths >= 550) return 2;
  if (tenths >= 400) return 3;
  if (tenths >= 250) return 4;
  return 5;
}

/** Kelas warna tile; teks putih untuk tingkat 1 dan 5, gelap untuk lainnya (kontras ≥ 4,5:1). */
export const LEVEL_CLASS: Readonly<Record<SatisfactionLevel, string>> = {
  1: 'bg-sat-1 text-white',
  2: 'bg-sat-2 text-[#14110A]',
  3: 'bg-sat-3 text-[#14110A]',
  4: 'bg-sat-4 text-[#14110A]',
  5: 'bg-sat-5 text-white',
};

/** Kode singkat tile dari ID provinsi (`PRV-JATENG` → `JATENG`). */
export function tileCode(provinceId: string): string {
  return provinceId.replace(/^PRV-/u, '').slice(0, 6);
}
