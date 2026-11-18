import type { PolicyCategory } from '@republika/shared';

/**
 * Peta ilustrasi (TAHAP-6 §6A.2). Gambar dimuat sebagai URL berkas terpisah
 * (`?url`), bukan SVG inline, supaya tidak menambah JS heap. Glob `eager: false`
 * hanya membundel pemanggil kecil per berkas; URL baru diminta saat gambar
 * benar-benar ditampilkan.
 *
 * Konvensi: `assets/images/events/<id event huruf kecil>.svg`. Event tanpa
 * berkas memakai `scenes/dashboard-desk.svg`.
 */
type UrlLoader = () => Promise<string>;

const eventLoaders = import.meta.glob<string>('../assets/images/events/*.svg', {
  query: '?url',
  import: 'default',
  eager: false,
});
const sceneLoaders = import.meta.glob<string>('../assets/images/scenes/*.svg', {
  query: '?url',
  import: 'default',
  eager: false,
});

export const SCENE_KEYS = [
  'menu-hero',
  'inauguration-oath',
  'cabinet-briefing',
  'parliament-vote',
  'dashboard-desk',
  'protest',
  'flood',
  'market',
  'port',
  'map-visit',
  'policy-fiscal',
  'policy-social',
  'policy-energy',
  'policy-governance',
] as const;
export type SceneKey = (typeof SCENE_KEYS)[number];

export const FALLBACK_SCENE: SceneKey = 'dashboard-desk';

export const POLICY_CATEGORY_SCENE: Readonly<Record<PolicyCategory, SceneKey>> = {
  FISCAL: 'policy-fiscal',
  SOCIAL: 'policy-social',
  ENERGY: 'policy-energy',
  GOVERNANCE: 'policy-governance',
};

function fileStem(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1).replace(/\.svg$/u, '');
}

const eventByStem = new Map(
  Object.entries(eventLoaders).map(([path, load]) => [fileStem(path), load]),
);
const sceneByStem = new Map(
  Object.entries(sceneLoaders).map(([path, load]) => [fileStem(path), load]),
);

/** ID event yang punya berkas ilustrasi sendiri (huruf besar, sesuai konten). */
export function eventIdsWithArt(): string[] {
  return [...eventByStem.keys()].map((stem) => stem.toUpperCase()).sort();
}

export function hasEventArt(eventId: string): boolean {
  return eventByStem.has(eventId.toLowerCase());
}

export function sceneArt(key: SceneKey): UrlLoader {
  const loader = sceneByStem.get(key) ?? sceneByStem.get(FALLBACK_SCENE);
  if (loader === undefined) throw new Error(`Ilustrasi adegan "${key}" tidak ditemukan.`);
  return loader;
}

/** Pemuat URL ilustrasi event; event tanpa gambar memakai adegan meja kerja. */
export function eventArt(eventId: string): UrlLoader {
  return eventByStem.get(eventId.toLowerCase()) ?? sceneArt(FALLBACK_SCENE);
}

export function policyArt(category: PolicyCategory): UrlLoader {
  return sceneArt(POLICY_CATEGORY_SCENE[category]);
}
