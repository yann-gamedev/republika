import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { rawContentBundle } from '@republika/game-data';
import { describe, expect, it } from 'vitest';

import {
  FALLBACK_SCENE,
  SCENE_KEYS,
  eventArt,
  eventIdsWithArt,
  hasEventArt,
  policyArt,
  sceneArt,
} from '@/content/art';
import { copy } from '@/copy/id';

const IMAGES = join(import.meta.dirname, '../src/assets/images');

/** Event yang SENGAJA memakai fallback `dashboard-desk`. */
const FALLBACK_EVENTS: readonly string[] = [
  // Fixture event daerah 6B.4; ilustrasi final menyusul dari pemilik.
  'EVT-REG-PLACEHOLDER-001',
  'EVT-REG-PLACEHOLDER-002',
  'EVT-REG-PLACEHOLDER-003',
];

const contentEventIds = (rawContentBundle.events as Array<{ id: string }>)
  .map((event) => event.id)
  .sort();

describe('aset ilustrasi', () => {
  it('setiap event konten punya gambar sendiri atau terdaftar sebagai fallback', () => {
    for (const id of contentEventIds) {
      const file = join(IMAGES, 'events', `${id.toLowerCase()}.svg`);
      if (FALLBACK_EVENTS.includes(id)) {
        expect(existsSync(file), `${id} terdaftar fallback tapi punya gambar`).toBe(false);
      } else {
        expect(existsSync(file), `gambar ${id} tidak ada`).toBe(true);
        expect(hasEventArt(id)).toBe(true);
      }
    }
  });

  it('glob menemukan semua berkas event dan adegan', () => {
    const files = readdirSync(join(IMAGES, 'events')).filter((name) => name.endsWith('.svg'));
    expect(eventIdsWithArt()).toEqual(
      files.map((name) => name.replace(/\.svg$/u, '').toUpperCase()).sort(),
    );
    for (const key of SCENE_KEYS) {
      expect(existsSync(join(IMAGES, 'scenes', `${key}.svg`)), key).toBe(true);
      expect(copy.art.scenes[key].length).toBeGreaterThan(0);
    }
  });

  it('event tak dikenal memakai adegan fallback; kategori kebijakan punya gambar', () => {
    expect(eventArt('EVT-TIDAK-ADA')).toBe(sceneArt(FALLBACK_SCENE));
    expect(policyArt('FISCAL')).toBe(sceneArt('policy-fiscal'));
  });

  it('setiap berkas SVG ilustrasi < 20 KB', () => {
    for (const folder of ['events', 'scenes']) {
      for (const name of readdirSync(join(IMAGES, folder))) {
        if (!name.endsWith('.svg')) continue;
        expect(statSync(join(IMAGES, folder, name)).size, name).toBeLessThan(20 * 1024);
      }
    }
  });
});
