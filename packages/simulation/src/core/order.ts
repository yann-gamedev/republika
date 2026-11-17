/** Pembanding string stabil yang tidak bergantung locale (urutan code unit). */
export function compareIds(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Mengembalikan salinan array yang diurutkan stabil berdasarkan ID. */
export function sortById<T>(items: readonly T[], getId: (item: T) => string): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort(
      (left, right) => compareIds(getId(left.item), getId(right.item)) || left.index - right.index,
    )
    .map(({ item }) => item);
}

/** Kunci objek terurut deterministik. */
export function sortedKeys(record: Readonly<Record<string, unknown>>): string[] {
  return Object.keys(record).sort(compareIds);
}
