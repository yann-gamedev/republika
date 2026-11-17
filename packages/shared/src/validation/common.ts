import { z } from 'zod';

// eslint-disable-next-line no-control-regex -- Nama presiden harus menolak karakter kontrol.
export const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/u;

export function hasAtMostDecimals(value: number, places: number): boolean {
  if (!Number.isFinite(value)) return false;
  const factor = 10 ** places;
  return Math.abs(value * factor - Math.round(value * factor)) < 1e-7;
}

export function decimalNumberSchema(min: number, max: number, places: number, label: string) {
  return z
    .number()
    .finite(`${label} harus berupa angka terbatas.`)
    .min(min, `${label} minimal ${min}.`)
    .max(max, `${label} maksimal ${max}.`)
    .refine(
      (value) => hasAtMostDecimals(value, places),
      `${label} maksimal ${places} angka desimal.`,
    );
}

export const idSchema = z
  .string()
  .regex(
    /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/,
    'ID harus huruf kapital/angka dengan pemisah tanda hubung, mis. POL-ENERGY-001.',
  )
  .max(64, 'ID maksimal 64 karakter.');

export const commandIdSchema = z
  .string()
  .min(1, 'commandId wajib diisi.')
  .max(100, 'commandId maksimal 100 karakter.');

export const versionSchema = z.number().int().min(1).max(9999);

export const reasonCodeSchema = z
  .string()
  .regex(/^[A-Z][A-Z0-9_]{2,63}$/, 'reasonCode harus huruf kapital, angka, atau garis bawah.');

export const flagSchema = z
  .string()
  .regex(/^[A-Z][A-Z0-9_]{2,63}$/, 'Flag harus huruf kapital, angka, atau garis bawah.');

export const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Warna harus format heksadesimal #RRGGBB.');

export const ideologyTagSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Tag ideologi harus huruf kecil dengan tanda hubung, mis. pro-pasar.',
  )
  .max(40);

export const isoDateTimeSchema = z
  .string()
  .datetime({ offset: true, message: 'Waktu harus format ISO 8601.' });

export const appVersionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/, 'Versi aplikasi harus format semver.');

export const presidentNameSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(2, 'Nama presiden minimal 2 karakter.')
      .max(40, 'Nama presiden maksimal 40 karakter.')
      .refine(
        (value) => !CONTROL_CHAR_PATTERN.test(value),
        'Nama presiden mengandung karakter kontrol.',
      ),
  );

export const cabinetNameSchema = z
  .string()
  .trim()
  .max(40, 'Nama kabinet maksimal 40 karakter.')
  .refine(
    (value) => !CONTROL_CHAR_PATTERN.test(value),
    'Nama kabinet mengandung karakter kontrol.',
  );

export function uniqueStrings(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

export const uniqueStringArraySchema = z
  .array(z.string())
  .refine(uniqueStrings, 'Daftar tidak boleh berisi duplikat.');
