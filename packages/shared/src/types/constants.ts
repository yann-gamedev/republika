export const APP_NAME = 'REPUBLIKA';
export const APP_VERSION = '0.1.0-rc.1';
/** v2: `playTimeSeconds` + ledger ringkas di disk (lihat simulation/src/save). */
export const SAVE_FORMAT_VERSION = 2;
export const GAME_STATE_VERSION = 1;

export const POLICY_CATEGORIES = ['FISCAL', 'SOCIAL', 'ENERGY', 'GOVERNANCE'] as const;
export type PolicyCategory = (typeof POLICY_CATEGORIES)[number];

export const UI_SCALES = [90, 100, 110, 125] as const;
export type UiScale = (typeof UI_SCALES)[number];

export const EFFECT_TIMINGS = ['IMMEDIATE', 'PER_TURN', 'DELAYED'] as const;
export type EffectTiming = (typeof EFFECT_TIMINGS)[number];
