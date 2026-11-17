/**
 * Pembulatan tunggal proyek: round half away from zero.
 * Dipakai setelah setiap efek berpengali sebelum nilai masuk ke state.
 */
export function roundTenths(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Nilai fixed-point harus berupa angka terbatas.');
  }
  const sign = value < 0 ? -1 : 1;
  // toPrecision(12) membuang galat biner (mis. 1.15 * 10 = 11.4999...) agar
  // nilai tepat setengah benar-benar dibulatkan menjauhi nol.
  const scaled = Number((Math.abs(value) * 10).toPrecision(12));
  const rounded = Math.round(scaled);
  return rounded === 0 ? 0 : sign * rounded;
}

/** Satuan tampilan (maksimal 1 desimal) -> persepuluhan integer. */
export function toTenths(value: number): number {
  return roundTenths(value);
}

/** Persepuluhan integer -> satuan tampilan. */
export function fromTenths(value: number): number {
  return value / 10;
}

/** Triliun (maksimal 3 desimal) -> miliar integer. */
export function trillionToBillion(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Nilai kas harus berupa angka terbatas.');
  }
  const sign = value < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(value) * 1000);
}

/** Miliar integer -> triliun. */
export function billionToTrillion(value: number): number {
  return value / 1000;
}
