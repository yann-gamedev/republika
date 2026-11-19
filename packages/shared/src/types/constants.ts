export const APP_NAME = 'REPUBLIKA';
export const APP_VERSION = '0.1.0-rc.1';
/** v2: `playTimeSeconds` + ledger ringkas di disk (lihat simulation/src/save). */
/** v3: profil presiden, janji, kabinet/pimpinan, reshuffle, dan provinsi (Tahap 6B). */
export const SAVE_FORMAT_VERSION = 3;
export const GAME_STATE_VERSION = 1;

export const POLICY_CATEGORIES = ['FISCAL', 'SOCIAL', 'ENERGY', 'GOVERNANCE'] as const;
export type PolicyCategory = (typeof POLICY_CATEGORIES)[number];

/** Jabatan pengurus partai yang ditampilkan di layar Parlemen (tanpa efek simulasi). */
export const FACTION_ROLES = ['CHAIR', 'SECRETARY_GENERAL', 'TREASURER', 'CAUCUS_LEADER'] as const;
export type FactionRole = (typeof FACTION_ROLES)[number];

/** Bentuk kepala potret flat (UI v2). Kosmetik; tidak memengaruhi simulasi. */
export const PORTRAIT_HEADS = [
  'peci',
  'rambut',
  'panjang',
  'uban',
  'baret',
  'botak',
  'hijab',
] as const;
export type PortraitHead = (typeof PORTRAIT_HEADS)[number];
export const HONORIFICS = ['Bapak', 'Ibu'] as const;
export type Honorific = (typeof HONORIFICS)[number];

/** Aksi presiden di peta daerah (Tahap 6B.4). */
export const PROVINCE_ACTIONS = ['VISIT', 'AID', 'HEAR', 'ENVOY'] as const;
export type ProvinceAction = (typeof PROVINCE_ACTIONS)[number];

/** Latar belakang untuk save lama yang belum memilih latar belakang. */
export const BACKGROUND_NONE = 'BG-NONE';
/** Jumlah janji kampanye yang dipilih saat pelantikan. */
export const PROMISE_COUNT = 3;

export const UI_SCALES = [90, 100, 110, 125] as const;
export type UiScale = (typeof UI_SCALES)[number];

export const EFFECT_TIMINGS = ['IMMEDIATE', 'PER_TURN', 'DELAYED'] as const;
export type EffectTiming = (typeof EFFECT_TIMINGS)[number];
