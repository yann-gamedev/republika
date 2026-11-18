import type { IndicatorKey, TurnReport } from '@republika/shared';

/**
 * Logika tampilan Meja kerja yang murni (mudah diuji tanpa DOM).
 */

export type Stance = 'yes' | 'unsure' | 'no';

/**
 * Sikap partai di legenda parlemen. Hanya tampilan, tidak dipakai engine.
 * DECISION: ≥ 55 setuju, 45–54,9 ragu, < 45 menolak (ambang voting 50 berada di
 * tengah pita "ragu", sehingga lobi masih bisa membalik sikapnya).
 */
export function factionStance(supportTenths: number): Stance {
  if (supportTenths >= 550) return 'yes';
  if (supportTenths >= 450) return 'unsure';
  return 'no';
}

export interface TrendPoint {
  readonly turn: number;
  readonly year: number;
  readonly quarter: number;
  readonly indicators: Readonly<Record<IndicatorKey, number>>;
}

/**
 * Ringkas history menjadi maksimal `limit` titik terakhir (K5). Hanya nilai
 * indikator setelah tiap kuartal yang disimpan; history lengkap tidak ditahan
 * di memori komponen.
 */
export function trendFromReports(reports: readonly TurnReport[], limit = 5): TrendPoint[] {
  return reports.slice(-limit).map((report) => ({
    turn: report.turn,
    year: report.year,
    quarter: report.quarter,
    indicators: { ...report.indicatorsAfter },
  }));
}

/** Event terakhir yang dijawab pada laporan, untuk kartu Warta. */
export function latestEventId(report: TurnReport | null): string | null {
  if (report === null) return null;
  const last = report.resolvedEvents[report.resolvedEvents.length - 1];
  return last?.eventId ?? null;
}
