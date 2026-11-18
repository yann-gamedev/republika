# Wireframe UI v2 — acuan

Salinan sumber kanvas desain "REPUBLIKA — Draft Wireframe UI v2" (18 November 2026). Kanvas aslinya ada di akun Claude pemilik: https://claude.ai/artifact/9Z4aYvX9wFhJrAbwsPudMn

File `*.dc.html` di folder ini **hanya acuan**. File-file ini tidak dibundel, tidak diimpor, dan tidak dijalankan oleh build. Tiap file berisi markup layar dan blok `<script type="text/x-dc">` kecil berisi data contoh serta perilaku interaktif (state, klik, animasi). Runtime kanvas (`support.js`, `<x-dc>`, `<sc-for>`, `<sc-if>`, `<dc-import>`, `DCLogic`) tidak ada di repo. Baca saja sebagai spesifikasi, lalu bangun ulang dengan React + Tailwind.

- `{{nama}}` adalah nilai dari `renderVals()` di blok script.
- `<sc-for list>` = perulangan, `<sc-if value>` = kondisi.
- `<dc-import name="Ilustrasi" scene="…">` = gambar adegan. Di game pakai `assets/images/scenes/*.svg`.
- `<dc-import name="Potret" …>` = komponen `Portrait` (port dari `Potret.dc.html`).
- `/_blob/…` = aset yang diunggah ke kanvas. Padanannya di repo: `arrested.jpg` dan `assets/images/events/*.svg`.

| File | Layar |
|---|---|
| `Main.dc.html` | Menu utama |
| `Setup.dc.html` | Berkas pencalonan (identitas, latar belakang, nama kabinet, janji) |
| `Sumpah.dc.html` | Naskah sumpah/janji dan tanda tangan |
| `MejaKerja.dc.html` | Meja kerja (pengganti Dashboard) |
| `Peristiwa.dc.html` | Nota dinas |
| `Sidang.dc.html` | Pemungutan suara paripurna |
| `Laporan.dc.html` | Warta pagi (laporan kuartal) |
| `Kebijakan.dc.html` | Katalog kebijakan |
| `Kabinet.dc.html` | Kabinet: profil dan reshuffle |
| `Peta.dc.html` | Peta daerah |
| `Aset.dc.html`, `AsetEvent.dc.html` | Lembar aset ilustrasi |
| `Ilustrasi.dc.html`, `Potret.dc.html` | Komponen gambar |

**Catatan konten:** nama tokoh, angka, provinsi asli, dan naskah sumpah UUD 1945 di wireframe adalah contoh. Untuk implementasi, ikuti `prompts/TAHAP-6-ui-v2.md` Bagian 0 (K1, K2, K7).

`gen-ilustrasi.py` menghasilkan ulang SVG di `apps/desktop/src/assets/images/{scenes,events}/` (Python 3 standar, tanpa dependensi):

```bash
python3 docs/wireframe-v2/gen-ilustrasi.py apps/desktop/src/assets/images
```
