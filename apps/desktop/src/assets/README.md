# Aset

Folder ini menampung semua aset statis yang dibundel ke aplikasi desktop. Tidak ada aset dari CDN atau jaringan saat runtime (`AGENT.md` §larangan), dan CSP Tauri hanya mengizinkan `img-src 'self' data:`.

## Struktur

```text
src/assets/
  fonts/    font variabel (sudah ada, lisensi OFL)
  images/   foto, ilustrasi, potret fraksi, latar, tekstur
```

Tambahkan subfolder lain saat benar-benar dibutuhkan, mis. `audio/` untuk musik/SFX. Folder kosong tanpa berkas tidak ikut Git, jadi sisipkan `.gitkeep`.

## Cara memakai

Impor lewat alias `@`, bukan path relatif berantai. Vite akan menyalin berkas, memberi hash, dan mengembalikan URL:

```tsx
import hero from '@/assets/images/hero-istana.webp';

<img src={hero} alt="Istana presiden fiktif" />;
```

Di CSS (`globals.css`), gunakan path relatif seperti font yang sudah ada:

```css
background-image: url('./assets/images/tekstur-kertas.webp');
```

`vite/client` sudah aktif di `tsconfig.json`, jadi impor `.png`, `.jpg`, `.webp`, `.svg`, dan `.avif` bertipe `string` tanpa deklarasi tambahan.

## Aturan berkas

- Format: `.webp` atau `.svg` untuk ilustrasi; `.png` hanya bila butuh transparansi yang tidak bisa disediakan WebP.
- Nama berkas: huruf kecil, tanda hubung, tanpa spasi (`potret-fraksi-nasionalis.webp`).
- Ukuran: kompres sebelum masuk. Anggaran installer 15 MiB (`.github/workflows/ci.yml`), jadi jangan simpan berkas > 1 MiB tanpa alasan kuat.
- Ikon UI kecil sebaiknya tetap komponen SVG inline seperti `src/ui/Seal.tsx`; folder ini untuk aset yang memang perlu berupa berkas.
- Setiap aset pihak ketiga wajib dicatat sumber dan lisensinya. Aset tanpa lisensi jelas tidak boleh dipakai, dan nama/logo nyata dilarang karena negara, fraksi, dan tokoh dalam game fiktif.

## Ilustrasi terdaftar

- `images/events/<id-event>.svg` dan `images/scenes/<kunci>.svg` dipetakan oleh `src/content/art.ts` (`eventArt`, `sceneArt`, `policyArt`) dan ditampilkan dengan komponen `src/ui/ArtImage.tsx` (`<img>` dengan `loading="lazy"`, `decoding="async"`, kotak berukuran tetap).
- Teks alternatif ada di `copy.art` (`src/copy/id.ts`).
- SVG ilustrasi dibuat bersama pemilik proyek (original, lisensi mengikuti repo). Generator acuan: `docs/wireframe-v2/gen-ilustrasi.py`.
- `images/arrested.jpg` adalah acuan gaya dan tidak diimpor, sehingga tidak ikut bundle.
