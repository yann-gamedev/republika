# Aset Gambar — Daftar Kebutuhan

Daftar ilustrasi yang masih dibutuhkan, disusun mengikuti gaya `apps/desktop/src/assets/images/arrested.jpg`.

## 0. Status (Tahap 6A.2, 18 November 2026)

Ilustrasi flat SVG sudah ada di repo dan terdaftar di `apps/desktop/src/content/art.ts`. SVG menggantikan rencana `.webp` di bawah karena jauh lebih kecil dan tajam di semua skala UI.

| Kelompok        | Berkas                                                                                                               | Status                           | Dipakai lewat                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------- |
| Adegan layar    | `scenes/menu-hero.svg`, `inauguration-oath.svg`, `cabinet-briefing.svg`, `parliament-vote.svg`, `dashboard-desk.svg` | ✅ SVG                           | `sceneArt(key)`                           |
| Adegan berita   | `scenes/protest.svg`, `flood.svg`, `market.svg`, `port.svg`, `map-visit.svg`                                         | ✅ SVG                           | `sceneArt(key)`                           |
| Kartu kebijakan | `scenes/policy-fiscal.svg`, `policy-social.svg`, `policy-energy.svg`, `policy-governance.svg`                        | ✅ SVG                           | `policyArt(kategori)`                     |
| Event           | `events/evt-hist-001.svg` … `evt-hist-010.svg`, `evt-placeholder-001.svg`, `evt-placeholder-002.svg`                 | ✅ SVG (12/12 event konten)      | `eventArt(id)`, fallback `dashboard-desk` |
| Acuan gaya      | `arrested.jpg`                                                                                                       | ✅ ada, belum dipetakan ke event | — (tidak ikut bundle)                     |
| Akhir kampanye  | `final-term`, `ending-*`                                                                                             | ⬜ belum                         | —                                         |
| Fraksi          | `faction-*`                                                                                                          | ⬜ belum                         | —                                         |
| Utilitas        | `texture-stripes`, `empty-archive`, `offline-notice`                                                                 | ⬜ belum (opsional)              | —                                         |

Ukuran: 26 SVG ±266 KB mentah, ±53 KB gzip. Setiap berkas < 20 KB (dijaga `apps/desktop/test/art.test.ts`). Event baru: tambahkan `events/<id event huruf kecil>.svg`. Tanpa berkas, event otomatis memakai `dashboard-desk`, kecuali didaftarkan sengaja di `FALLBACK_EVENTS` pada test.

Bagian 1–4 di bawah adalah rencana awal dan tetap berlaku untuk gaya, palet, dan aset yang belum ada.

## 1. Gaya acuan (dari `arrested.jpg`)

Hasil pengukuran berkas: **1520 × 1280 px, 48 KB**. Gaya datar membuat berkas sangat kecil, jadi tidak perlu takut resolusi.

Ciri yang harus dipertahankan:

- **Vektor datar**: warna solid, tanpa garis luar, tanpa gradien, tanpa bayangan, tanpa noise atau tekstur foto.
- **Figur sederhana**: badan geometris, tanpa detail wajah (mata/hidung/mulut tidak digambar), sebagian besar tampak dari belakang atau tiga perempat.
- **Komposisi simetris dan frontal**, subjek utama di tengah, ruang kosong di kiri-kanan untuk teks UI.
- **Latar berpola**: garis horizontal rapat (dinding/rolling door), satu elemen vertikal di tepi (pintu/kayu) sebagai penyeimbang.
- **Nada serius-editorial**, bukan kartun lucu, bukan foto.

### Palet

| Peran      | Hex       | Catatan                       |
| ---------- | --------- | ----------------------------- |
| Hitam-navy | `#181A1F` | seragam, siluet aparat        |
| Navy gelap | `#181830` | bayangan lampu, seragam malam |
| Abu netral | `#909090` | dinding, latar                |
| Abu garis  | `#787878` | garis horizontal latar        |
| Oranye     | `#D86018` | tahanan, aksen peringatan     |
| Merah      | `#C03018` | lambang fiktif, bendera       |
| Emas       | `#C9A227` | bintang/lencana, aksen negara |
| Krem       | `#D8D8C0` | dokumen, kain                 |
| Kulit      | `#C09078` | tangan, leher                 |
| Cokelat    | `#784848` | kayu, pintu, bingkai          |

Batasi satu gambar ke 5–7 warna. Jangan pakai biru terang, ungu, atau gradien neon; itu akan langsung terlihat dari set lain.

### Spesifikasi teknis

- Rasio **6:5** (1520 × 1280) untuk ilustrasi layar dan event; **1:1** (1000 × 1000) untuk kartu fraksi.
- Ekspor `.webp` (atau `.jpg` kualitas 85). Target di bawah 80 KB per gambar.
- **Safe area 10%** di semua tepi: UI akan memotong gambar di kartu dan header.
- **Hindari teks di dalam gambar.** `arrested.jpg` memuat kata "TAHANAN" yang menempel permanen; teks seperti itu tidak bisa diterjemahkan atau diubah dan menyulitkan saat UI dirombak. Kecuali label sangat ikonik, biarkan teks di lapisan UI.
- Lambang, bendera, dan seragam harus fiktif: merah-putih dengan bintang emas masih aman karena tidak meniru lambang nyata secara detail. Jangan meniru logo, partai, atau tokoh nyata.

### Prompt acuan (bila memakai generator gambar)

> Flat vector editorial illustration, solid colors only, no outlines, no gradients, no shading, faceless simplified figures seen from behind, symmetrical frontal composition, muted palette of charcoal navy, slate grey, burnt orange, brick red, cream and gold, horizontal striped background, 6:5 landscape, generous empty space at the edges, serious political tone, fictional Southeast Asian republic, no text, no real logos or flags.

## 2. Daftar aset

Prioritas 1 wajib ada sebelum UI interaktif; prioritas 2–4 memperkaya layar; prioritas 5 opsional.

### Prioritas 1 — layar utama (6 gambar)

| #   | Berkas                   | Ukuran    | Dipakai di                                  | Isi                                                                                |
| --- | ------------------------ | --------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | `menu-hero.webp`         | 1520×1280 | MenuPage (ganti Seal 224 px di panel kanan) | Fasad istana fiktif malam hari, dua pengawal membelakangi, lampu emas, langit navy |
| 2   | `inauguration-oath.webp` | 1520×1280 | InaugurationPage                            | Dua tangan di atas kitab, satu figur membelakangi, bendera fiktif di belakang      |
| 3   | `cabinet-briefing.webp`  | 1520×1280 | CabinetPage                                 | Meja rapat panjang, empat kursi menteri, map dan grafik di meja                    |
| 4   | `parliament-vote.webp`   | 1520×1280 | ParliamentPage                              | Ruang sidang melingkar, kartu suara terangkat, kursi kosong di belakang            |
| 5   | `dashboard-desk.webp`    | 1520×1280 | DashboardPage                               | Meja presiden: berkas, grafik kertas, telepon, jendela malam                       |
| 6   | `final-term.webp`        | 1520×1280 | FinalReportPage                             | Podium kosong, dokumen bertumpuk, bendera terlipat di kursi                        |

### Prioritas 2 — ilustrasi event (14 gambar baru + `arrested.jpg`)

Satu gambar per event pada rencana 15 event (`docs/RENCANA-KONTEN.md` §4). Nama berkas memakai ID event agar mudah dipetakan.

| #   | Berkas                        | Kelompok | Isi                                                        |
| --- | ----------------------------- | -------- | ---------------------------------------------------------- |
| 7   | `event-crisis-flood.webp`     | Krisis   | Jalan tergenang, perahu karet, petugas berlengan tinggi    |
| 8   | `event-crisis-epidemic.webp`  | Krisis   | Tenda darurat, petugas masker, antrean warga               |
| 9   | `event-crisis-recession.webp` | Krisis   | Ruko tutup, pasar sepi, spanduk kosong                     |
| 10  | `event-crisis-currency.webp`  | Krisis   | Papan nilai tukar jatuh, antrean di depan loket            |
| 11  | `event-crisis-infra.webp`     | Krisis   | Jembatan retak / menara listrik roboh, garis polisi        |
| 12  | `event-pol-protest.webp`      | Politik  | Massa membelakangi kamera, spanduk kosong, aparat berbaris |
| 13  | `event-pol-motion.webp`       | Politik  | Podium pimpinan sidang, tangan terangkat, kursi kosong     |
| 14  | `event-pol-regional.webp`     | Politik  | Pos pemeriksaan daerah, peta fiktif, dua petugas           |
| —   | `arrested.jpg` ✅             | Politik  | Sudah ada: penangkapan, tiga figur, oranye tahanan         |
| 15  | `event-eco-inflation.webp`    | Ekonomi  | Papan harga pasar, pembeli membelakangi, timbangan         |
| 16  | `event-eco-boom.webp`         | Ekonomi  | Pelabuhan, kontainer, crane, kapal peti kemas              |
| 17  | `event-eco-capital.webp`      | Ekonomi  | Papan keberangkatan bandara, koper, antrean                |
| 18  | `event-eco-strike.webp`       | Ekonomi  | Gerbang pabrik, pekerja dengan papan kosong                |
| 19  | `event-opp-investment.webp`   | Peluang  | Jabat tangan dua delegasi, bendera fiktif, meja dokumen    |
| 20  | `event-opp-breakthrough.webp` | Peluang  | Laboratorium/riset pangan, rak sampel, dua peneliti        |

### Prioritas 3 — kartu kebijakan (4 gambar)

Dipakai sebagai gambar kartu di halaman kebijakan, satu per kategori.

| #   | Berkas                   | Kategori   | Isi                                                   |
| --- | ------------------------ | ---------- | ----------------------------------------------------- |
| 21  | `policy-fiscal.webp`     | FISCAL     | Meja kas negara, tumpukan dokumen, koin, mesin hitung |
| 22  | `policy-social.webp`     | SOCIAL     | Antrean pembagian bantuan, meja layanan, kardus       |
| 23  | `policy-energy.webp`     | ENERGY     | Kilang, jaringan listrik, turbin angin di latar       |
| 24  | `policy-governance.webp` | GOVERNANCE | Meja birokrasi, cap stempel, rak arsip, antrean loket |

### Prioritas 4 — fraksi dan akhir kampanye

| #   | Berkas                                | Ukuran    | Dipakai di      | Isi                                                |
| --- | ------------------------------------- | --------- | --------------- | -------------------------------------------------- |
| 25  | `faction-01.webp` … `faction-06.webp` | 1000×1000 | ParliamentPage  | Enam siluet kelompok/emblem sesuai ideologi fraksi |
| 31  | `ending-teknokrat.webp`               | 1520×1280 | FinalReportPage | Figur di meja kerja, grafik menanjak, ruang sepi   |
| 32  | `ending-populis.webp`                 | 1520×1280 | FinalReportPage | Figur melambai di podium, massa rakyat             |
| 33  | `ending-reformis.webp`                | 1520×1280 | FinalReportPage | Sekolah/klinik baru, warga bekerja                 |
| 34  | `ending-penjaga-status.webp`          | 1520×1280 | FinalReportPage | Aparat berbaris, gedung utuh, langit tenang        |
| 35  | `ending-penyelamat.webp`              | 1520×1280 | FinalReportPage | Figur berdiri di antara puing yang mulai dibangun  |
| 36  | `ending-seimbang.webp`                | 1520×1280 | FinalReportPage | Meja negosiasi, dua pihak duduk berhadapan         |

### Prioritas 5 — utilitas (opsional)

| #   | Berkas                 | Isi                                                     |
| --- | ---------------------- | ------------------------------------------------------- |
| 37  | `texture-stripes.webp` | Pola garis horizontal, bisa diulang (tileable 256×256)  |
| 38  | `empty-archive.webp`   | Rak arsip kosong untuk daftar save/history kosong       |
| 39  | `offline-notice.webp`  | Figur menutup tirai/jendela untuk status tanpa jaringan |

Ikon kecil (indikator, tombol) **jangan** dibuat raster. Lanjutkan pola yang ada: komponen SVG inline seperti `apps/desktop/src/ui/Seal.tsx` dan `src/ui/icons.tsx`.

## 3. Versi hemat (bila waktu terbatas)

Cukup 12 gambar: `menu-hero`, `inauguration-oath`, `parliament-vote`, `final-term`, satu gambar per kelompok event (`crisis`, `pol`, `eco`, `opp`) yang dipakai ulang dengan variasi warna overlay, plus empat kartu kebijakan. `arrested.jpg` menjadi pengecualian khusus untuk event penangkapan.

## 4. Penamaan dan penempatan

- Semua berkas di `apps/desktop/src/assets/images/`.
- Huruf kecil, tanda hubung, prefiks domain: `menu-`, `event-<kelompok>-`, `policy-`, `faction-`, `ending-`.
- Tidak ada spasi, huruf besar, atau nama tokoh nyata.
- Catat sumber/lisensi setiap aset di `apps/desktop/src/assets/README.md` bila bukan buatan sendiri.
