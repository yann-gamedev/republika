import { INDICATOR_DOMAINS, fromTenths, roundTenths, type IndicatorKey } from '@republika/shared';

/**
 * Satu-satunya fungsi pembulatan proyek (AGENT §5.1): satuan tampilan →
 * persepuluhan integer, round half away from zero. Diekspor ulang dari shared
 * agar loader konten dan engine memakai implementasi yang sama.
 */
export { roundTenths };

/**
 * Mengalikan delta persepuluhan dengan pengali, lalu membulatkan sekali.
 * Contoh: delta 40 (4,0) × 1,13 = 4,52 → 45 (4,5).
 */
export function applyMultiplier(deltaTenths: number, multiplier: number): number {
  return roundTenths(fromTenths(deltaTenths) * multiplier);
}

/** Batas domain indikator dalam persepuluhan. */
export function indicatorBounds(key: IndicatorKey): { readonly min: number; readonly max: number } {
  const domain = INDICATOR_DOMAINS[key];
  return { min: domain.min * 10, max: domain.max * 10 };
}

/** Clamp nilai persepuluhan ke domain indikator. */
export function clampToDomain(key: IndicatorKey, valueTenths: number): number {
  const { min, max } = indicatorBounds(key);
  return clamp(valueTenths, min, max);
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
