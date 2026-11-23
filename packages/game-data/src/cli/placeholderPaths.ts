/** Periksa seluruh nilai dan key konten, bukan hanya ID koleksi utama. */
export function placeholderPaths(value: unknown, path = '$'): string[] {
  if (typeof value === 'string') return /placeholder/iu.test(value) ? [path] : [];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => placeholderPaths(entry, `${path}[${index}]`));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entry]) => {
      const next = `${path}.${key}`;
      return [...(/placeholder/iu.test(key) ? [next] : []), ...placeholderPaths(entry, next)];
    });
  }
  return [];
}
