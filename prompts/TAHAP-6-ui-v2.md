# TAHAP 6 — UI v2 dan aset ilustrasi

**Tujuan tahap:** mengganti tampilan "dashboard korporat" menjadi meja kerja presiden yang lebih hidup dan interaktif, memakai ilustrasi flat yang sudah tersedia, tanpa merusak determinisme engine, save lama, atau anggaran performa.

Tahap ini dibagi dua:

- **6A — UI v2 (tanpa mengubah aturan simulasi).** Reskin seluruh layar, aset ilustrasi, alur pelantikan baru, animasi stempel dan voting. `rulesetVersion` dan `saveFormatVersion` **tidak berubah**.
- **6B — Fitur gameplay baru.** Latar belakang presiden, janji kampanye, reshuffle, dan peta daerah. Mengubah engine, konten, dan format save. **Baru boleh dimulai setelah gate 6A lolos dan Bagian 0 dijawab pemilik.**

**Wajib dibaca:** `AGENT.md` §2, §4, §5.2, §5.3, §5.6, §5.7, §5.12–§5.17; `CLAUDE.md`; `docs/wireframe-v2/README.md`; `docs/ASET-GAMBAR.md`; `apps/desktop/src/assets/README.md`.

**Referensi visual:** file `docs/wireframe-v2/*.dc.html` adalah sumber wireframe interaktif (HTML + logika kecil). Baca markup dan blok `<script>` di dalamnya untuk ukuran, warna, teks, dan perilaku. Jangan menyalin runtime-nya (`support.js`, `<x-dc>`, `DCLogic`). Bangun ulang dengan React + Tailwind sesuai stack.

---

## Bagian 0 — Keputusan pemilik (agent wajib berhenti bila belum terisi)

Isi kolom **Jawaban** sebelum agent mulai. Kalau kosong, agent memakai **Default** hanya untuk 6A, lalu berhenti sebelum 6B.

| # | Pertanyaan | Default | Jawaban |
|---|---|---|---|
| K1 | Wireframe memakai **Indonesia nyata** (38 provinsi, naskah sumpah Pasal 9 UUD 1945, MPR). `AGENT.md` §5.16 mewajibkan negara, lembaga, dan tokoh fiktif. Tetap fiktif atau ubah §5.16? | **Tetap fiktif.** Provinsi diberi nama fiktif oleh pemilik dengan tata letak kepulauan yang terinspirasi Indonesia; naskah sumpah ditulis ulang untuk republik fiktif dengan struktur yang sama. | **Indonesia nyata.** Provinsi, lembaga (MPR, kementerian), dan naskah sumpah mengikuti Indonesia. Nama tokoh—termasuk tokoh di event/random event—fiktif. Partai/fraksi tetap fiktif. §5.16 sudah direvisi. |
| K2 | Naskah sumpah/janji: teks final dari siapa? | Pemilik menulis di `copy/id.ts`. Agent memakai teks placeholder bertanda `PLACEHOLDER`. | **Agent menulis.** Teks resmi Pasal 9 UUD 1945 versi sumpah dan janji, tanpa nama wakil presiden; label sumber diganti "Pasal 9 UUD 1945 · teks resmi". |
| K3 | Font tambahan: IBM Plex Mono 400 (angka/meta, ±20 KB subset Latin) dan Mrs Saint Delafield (tanda tangan, ±15 KB). Keduanya OFL. Boleh dibundel? | Boleh. Sebutkan ukuran di commit message. | **Boleh.** Keduanya tetap dibundel; ukuran build 14,4 KiB (IBM Plex Mono) + 18,4 KiB (Mrs Saint Delafield), tercatat di `CREDITS.md` dan `docs/PERFORMANCE.md`. |
| K4 | Nama kabinet wajib? (`AGENT.md` §5.2: opsional, maks. 40 karakter) | **Tetap opsional**, mengikuti §5.2. Wireframe yang mewajibkan diabaikan. | |
| K5 | Grafik "Arah negara" di Meja kerja butuh history 5 kuartal. §5.17 hanya memuat history di Riwayat/Laporan. | Muat history secara lazy saat Meja kerja dibuka, ukur JS heap setelah 20 kuartal, catat di `docs/PERFORMANCE.md`. Bila heap > 30 MB, ganti grafik dengan delta kuartal lalu saja. | |
| K6 | Aturan angka 6B (reshuffle, latar belakang, janji, provinsi). | Pakai usulan di Lampiran C, tandai `// DECISION:`, catat di `docs/DECISIONS.md`, lalu uji dengan `pnpm balance`. | |
| K7 | Konten 6B (nama provinsi, calon menteri, latar belakang, janji, tokoh pimpinan) ditulis siapa? | Pemilik, di `packages/game-data/content/`. Agent hanya membuat fixture `PLACEHOLDER-*` (`AGENT.md` §6). | |

---

## TAHAP 6A — UI v2

### Bagian 6A.1 — Token desain dan komponen dasar

**Tugas**
- Perbarui variabel CSS di `apps/desktop/src/globals.css` dan `tailwind.config.ts` sesuai **Lampiran A**: latar `#0E1117`, permukaan `#151A22`/`#1C222C`, garis rambut teks utama 8%, tiga peran teks, satu aksen emas `#C9A227`, kertas `#E8E1D0`, tinta `#1E1B16`, merah stempel `#A8301C`, dan 5 warna tingkat kepuasan.
- Hapus gaya label huruf kapital berspasi lebar (`tracking-institutional` + `uppercase`) di seluruh UI. Semua label jadi *sentence case* di `copy/id.ts`.
- Bundel font sesuai K3 di `src/assets/fonts/` (lisensi OFL ikut disalin, dicatat di `CREDITS.md`).
- Komponen baru di `src/ui/`:
  - `PaperSheet` (kertas nota/koran, bayangan `document`).
  - `Stamp` (cap miring, muncul dengan transisi `opacity` + `transform` 220–260 ms).
  - `ApTokens` (bulatan AP terisi atau kosong).
  - `QuarterTrack` (20 segmen: lewat, sekarang, akan datang).
  - `Portrait` (potret flat SVG, port dari `docs/wireframe-v2/Potret.dc.html`; props `head`, `skin`, `suit`, `accent`, `bg`, `glasses`, `size`).
- Toast dipindah ke pojok kanan bawah dengan jarak 24 px, `aria-live="polite"`, dan tidak lagi menutupi konten utama.
- Semua animasi hanya transisi CSS. `@media (prefers-reduced-motion: reduce)` mematikan transform dan durasi (`AGENT.md` §5.17).

**Acceptance criteria**
- `pnpm lint && pnpm typecheck && pnpm test` hijau. Test `a11y.spec.ts` lolos (kontras teks ≥ 4.5:1, termasuk teks redup 12 px).
- Tidak ada dependensi runtime baru.

### Bagian 6A.2 — Registrasi aset ilustrasi

Aset **sudah ada** di repo (dibuat bersama pemilik, original, lisensi mengikuti repo):

```text
apps/desktop/src/assets/images/events/evt-hist-001.svg … evt-hist-010.svg
apps/desktop/src/assets/images/events/evt-placeholder-001.svg, evt-placeholder-002.svg
apps/desktop/src/assets/images/scenes/menu-hero.svg, inauguration-oath.svg, cabinet-briefing.svg,
  parliament-vote.svg, dashboard-desk.svg, protest.svg, flood.svg, market.svg, port.svg,
  map-visit.svg, policy-fiscal.svg, policy-social.svg, policy-energy.svg, policy-governance.svg
apps/desktop/src/assets/images/arrested.jpg
```

**Tugas**
- `src/content/art.ts`:
  - `eventArt(eventId)` memetakan ID event ke URL gambar lewat `import.meta.glob('@/assets/images/events/*.svg', { eager: false, query: '?url' })`. Nama file = ID event dalam huruf kecil.
  - Event tanpa gambar memakai fallback `scenes/dashboard-desk.svg`.
  - `sceneArt(key)` untuk adegan layar dan kategori kebijakan (`FISCAL → policy-fiscal`, dan seterusnya).
- Gambar ditampilkan dengan `<img>` (bukan SVG inline) agar tidak menambah JS heap, dengan `alt` dari `copy/id.ts`, `loading="lazy"`, `decoding="async"`, dan ukuran tetap supaya layout tidak meloncat.
- Test: setiap event di `content/events/` punya file gambar atau sengaja memakai fallback (daftar pengecualian eksplisit di test).
- Perbarui tabel status di `docs/ASET-GAMBAR.md` (mana yang sudah ada sebagai SVG) dan `apps/desktop/src/assets/README.md`.
- **Event baru di masa depan:** tambahkan `evt-<id>.svg` dengan gaya yang sama. Generator acuan ada di `docs/wireframe-v2/gen-ilustrasi.py` (opsional, Python standar, tidak dipakai saat build).

**Acceptance criteria**
- `pnpm build:web` lolos. `pnpm perf:report` menunjukkan aset SVG terpisah dari chunk JS. Total aset baru ≤ 100 KB.

### Bagian 6A.3 — Shell, Menu utama, Meja kerja

Acuan: `Main.dc.html`, `MejaKerja.dc.html`.

**Tugas**
- **Header permainan** (`GameLayout`): nama presiden, `QuarterTrack` "2032 · Kuartal 1 · 5/20", `ApTokens`, kas negara, dan tombol emas "Akhiri kuartal". Bila ada nota yang belum dijawab, tombol dinonaktifkan dengan alasan tertulis.
- **Sidebar:**
  - Isinya Meja kerja, Kebijakan, Parlemen (badge jumlah RUU antre), Kabinet, Nota dinas (badge jumlah event pending), Warta, Riwayat, lalu Simpan & muat, Pengaturan, Menu utama.
  - Hapus teks pengembang ("Tahap 3 — vertical slice", contenthash di footer). Contenthash pindah ke Pengaturan → Tentang.
  - "Peta daerah" baru ditambahkan di 6B.4.
- **Menu utama:**
  - Ilustrasi `menu-hero.svg` mengisi kiri.
  - Panel kanan: judul serif, tombol utama "Lanjutkan pemerintahan" dengan info save (nama · kuartal · jam simpan), lalu Pemerintahan baru, Muat simpanan (jumlah slot), Pengaturan, Keluar.
- **Meja kerja** (ganti `DashboardPage`):
  - **Map masuk:** event pending sebagai kertas nota (klik → Nota dinas) dan kebijakan antre sebagai kartu RUU dengan bar perkiraan suara + garis ambang 51.
  - **Indikator nasional:** 8 baris (nilai + delta vs kuartal lalu, hijau/merah sesuai arah baik), dapat dipilih.
  - **Arah negara:** `LineChart` satu seri beraksen emas untuk indikator terpilih (K5).
  - **Warta:** kartu kertas berisi ilustrasi event terakhir + judulnya.
  - **Peta dukungan parlemen:** bar bertumpuk 6 fraksi + legenda kursi dan sikap.

**Acceptance criteria**
- Shortcut `1–6` tetap jalan (urutan halaman menyesuaikan). Jendela 1280×720 tidak memunculkan scroll horizontal.

### Bagian 6A.4 — Nota dinas, voting paripurna, Warta pagi

Acuan: `Peristiwa.dc.html`, `Sidang.dc.html`, `Laporan.dc.html`.

**Tugas**
- **Nota dinas:**
  - Mode fokus tanpa sidebar, dengan breadcrumb kembali.
  - Kertas berisi gambar event (240 px), nomor nota, judul serif, isi, dan pilihan sebagai radio-card yang menampilkan konsekuensi kualitatif (fungsi `consequence()` yang sudah ada).
  - Tombol "Tandatangani keputusan" men-dispatch `RESPOND_EVENT`, lalu `Stamp` "DIPUTUSKAN" muncul.
  - "Ubah keputusan" tetap boleh sampai kuartal diakhiri (perilaku sekarang).
  - Panel samping berisi perkiraan dampak dari pilihan terpilih dan pihak yang berkepentingan (fraksi yang disebut di efek event).
- **Pemungutan suara paripurna:**
  - Setelah `END_QUARTER`, bila laporan berisi hasil voting, tampilkan layar sidang sebelum laporan.
  - Hemicycle 100 kursi terisi per fraksi (urut `factionId`) dengan jeda 650 ms memakai `setTimeout` berantai yang dibersihkan saat unmount. Tidak ada interval saat idle.
  - Penghitung setuju/menolak, bar dengan ambang 51, lalu banner "Disahkan 82–18" / "Ditolak".
  - Tombol "Lewati" langsung menampilkan hasil. Dengan `prefers-reduced-motion`, hasil langsung muncul.
  - Data dari laporan (deterministik), bukan dihitung ulang di UI.
- **Warta pagi** (ganti tampilan `ReportView`):
  - Kertas koran dengan masthead "Warta Republika · Edisi kuartal".
  - Berita utama: judul dibuat dari template di `copy/id.ts` berdasarkan perubahan ledger terbesar, ilustrasi adegan terkait.
  - Berita samping: event kuartal itu + gambarnya.
  - Tabel "Angka kuartal ini" dengan baris yang bisa dibuka untuk melihat penyebab dari ledger.
  - Rincian kas, nota yang menunggu kuartal depan, dan tombol "Kembali ke meja kerja".

**Acceptance criteria**
- Test komponen: urutan reveal voting sama dengan urutan fraksi, dan total kursi = 100.
- E2E: respons event → stempel tampil → akhiri kuartal → layar sidang → laporan.

### Bagian 6A.5 — Kebijakan, Kabinet, Pelantikan

Acuan: `Kebijakan.dc.html`, `Kabinet.dc.html`, `Setup.dc.html`, `Sumpah.dc.html`.

**Tugas**
- **Kebijakan:**
  - Tab kategori, kartu bergambar (`sceneArt` kategori, tinggi 140 px) berisi nama, biaya AP/kas, durasi, dan label voting.
  - Panel detail: proyeksi rentang (`projectPolicy`), pengali menteri, dan perkiraan kursi.
  - "Ajukan · 1 AP" = `ENACT_POLICY`; "Tarik pengajuan" = `CANCEL_PENDING`. Saat AP habis, tombol menampilkan alasannya.
- **Kabinet (6A, tanpa aturan baru):**
  - Kartu 4 kementerian berisi `Portrait`, jabatan, nama menteri, partai, dan bar efektivitas.
  - Nama dan penampilan menteri sementara ada di `src/content/cabinetLooks.ts` dengan nama `PLACEHOLDER` sampai pemilik mengisi konten (K7).
  - Tombol **Profil** membuka laci samping (`role="dialog"`, fokus terkunci, `Esc` menutup) berisi bio placeholder, efektivitas, dan riwayat perubahan efektivitas dari ledger.
  - Tombol **Reshuffle** tampil tetapi nonaktif dengan alasan "Tersedia di pembaruan berikutnya" sampai 6B.3.
- **Pelantikan:**
  - Layar 1 "Berkas pencalonan": nama presiden (validasi §5.2), sapaan Bapak/Ibu, penampilan potret (kosmetik), dan nama kabinet (opsional, K4) + saran nama.
  - Latar belakang dan janji kampanye **belum** ditampilkan di 6A.
  - Sapaan dan penampilan disimpan di `settings.json` sebagai preferensi kosmetik, **bukan** di `GameState` (agar save tidak berubah). Pindahkan ke state di 6B.1.
  - Layar 2 "Naskah sumpah/janji": ilustrasi `inauguration-oath.svg` di kiri, kertas di kanan, pilihan Sumpah/Janji, dan teks dari `copy/id.ts` (K1/K2).
  - Tombol tanda tangan → tanda tangan muncul (transisi `clip-path`), stempel "DILANTIK", `startCampaign`, autosave, lalu masuk ke Meja kerja.

**Acceptance criteria**
- E2E pelantikan berjalan dengan nama kabinet kosong maupun terisi. Validasi nama menampilkan pesan Indonesia.

### Bagian 6A.6 — E2E, performa, dokumentasi

**Tugas**
- Perbarui `tests/e2e/shell.spec.ts`, `slice.spec.ts`, `final.spec.ts`, `saves.spec.ts`, `a11y.spec.ts` untuk selector baru. Pakai `getByRole` dan teks dari `copy`, bukan kelas CSS.
- Jalankan `pnpm test:e2e`, `pnpm build:web`, dan `pnpm perf:report`. Catat JS heap setelah 20 kuartal, ukuran bundle, dan ukuran installer di `docs/PERFORMANCE.md`.
- Tulis `docs/PROGRESS.md`, lalu **berhenti**.

### Gate akhir 6A — PLAYTEST

Pemilik memainkan 2 kampanye di build desktop dan menjawab di `docs/PLAYTEST-UI-V2.md`:
- [ ] Apakah Meja kerja langsung memberi tahu apa yang harus dikerjakan kuartal ini?
- [ ] Apakah stempel, voting, dan Warta terasa memuaskan, bukan memperlambat?
- [ ] Apakah ada teks yang terpotong di 1280×720 atau skala UI 125%?
- [ ] RAM dari Task Manager setelah 20 kuartal (cara di `PERFORMANCE.md`).

---

## TAHAP 6B — Fitur gameplay baru

**Prasyarat:** gate 6A lolos, K1/K6/K7 terjawab, dan konten pemilik tersedia (atau agent memakai fixture `PLACEHOLDER-*`). Penulisan aturan simulasi dikerjakan di sesi utama (`CLAUDE.md`).

### Bagian 6B.1 — Skema, konten, migrasi save

**Tugas**
- Zod schema baru di `packages/shared/src/validation/` untuk konten (lihat Lampiran C):
  - `backgrounds.json`, `promises.json`, `provinces.json`, `cabinet-candidates.json`, `leaders.json`.
  - Tambahan field `minister` (nama + penampilan) pada `ministries.json`, versi skema dinaikkan.
- `GameState` baru:
  - `president { honorific, appearance, backgroundId }` dan `promiseIds[3]`.
  - `cabinet { [ministryId]: { holderId } }`, `leaders { [roleId]: { holderId } }`, `reshuffleUsedYear`.
  - `provinces { [provinceId]: { satisfactionTenths, actionsThisTurn[] } }`.
- Naikkan `rulesetVersion` dan `saveFormatVersion`. Migrator murni `vN → vN+1` di `packages/simulation/src/save/migrations/`:
  - Save lama mendapat `backgroundId: "BG-NONE"`, `promiseIds: []` (janji tidak dinilai), dan menteri awal dari konten.
  - Provinsi diinisialisasi dari `baseSatisfaction`, diurutkan menurut ID.
- Tambahkan fixture save versi lama + test migrasi (`AGENT.md` §5.13).

**Acceptance criteria**
- Save v1 rilis → bisa dimuat, dimainkan, dan disimpan lagi. Snapshot determinisme diperbarui dengan alasan di commit.

### Bagian 6B.2 — Latar belakang presiden dan janji kampanye

**Tugas**
- Layar Berkas pencalonan ditambah langkah 02 Latar belakang (5 kartu bergambar: plus/minus modal awal) dan 04 Janji kampanye (pilih tepat 3 dari daftar konten), dengan kartu ringkasan di kanan.
- `startCampaign` menerapkan modifier latar belakang sekali di awal (entri ledger `BACKGROUND_APPLIED`).
- Janji dinilai di laporan akhir (`report/final.ts`): "Janji ditepati 2/3" + rincian per janji. Arketipe tidak berubah.

**Acceptance criteria**
- Unit test: modifier diterapkan tepat sekali; evaluasi janji memakai state akhir. `pnpm balance` tidak menunjukkan satu latar belakang yang menang di > 40% run.

### Bagian 6B.3 — Reshuffle dan jajaran pimpinan

**Tugas**
- Command baru `RESHUFFLE {roleId, candidateId}`:
  - Biaya 1 AP, maksimal 1 kali per tahun (4 kuartal), masuk `pendingCommands`, bisa dibatalkan.
  - Diproses di langkah resolusi baru **2b** (setelah respons event, sebelum lobi) agar perubahan dukungan berlaku pada voting kuartal yang sama.
  - Perbarui `SIMULATION_RULES.md` §urutan resolusi.
- Efek untuk menteri: efektivitas kementerian = `candidate.baseEffectiveness` (clamp 40..90). Dukungan partai calon `+candidate.supportGain`, partai menteri lama `−6,0`.
- Efek untuk pimpinan non-kementerian (Mensesneg, KSP, Jaksa Agung): `trust += (new.integrity − old.integrity) / 10`. Wakil presiden tidak bisa diganti.
- UI: tombol Reshuffle aktif → dialog 3 calon (potret, partai, efektivitas, dampak dukungan) → "Lantik pengganti". Profil menampilkan rekam jejak dari ledger.

**Acceptance criteria**
- Test: kuota per tahun, AP, pembatalan, urutan langkah 2b, dan ledger `RESHUFFLE`. Command ganda dengan `commandId` sama tidak berefek dua kali.

### Bagian 6B.4 — Peta daerah

Acuan: `Peta.dc.html`.

**Tugas**
- `politics/provinces.ts` (murni, urut ID). Tiap kuartal di langkah baseline:
  - Kepuasan provinsi bergerak 25% menuju `approval nasional + offset provinsi`.
  - Efek aksi diterapkan di langkah 2c.
- Command `PROVINCE_ACTION {provinceId, action}`. Satu aksi per jenis per provinsi per kuartal:
  - `VISIT`: 1 AP, +6,0 lokal, +0,3 approval nasional.
  - `AID`: kas −3 T, +4,0 lokal.
  - `HEAR`: gratis, 1× per kuartal, menyetel flag `ASPIRATION_<id>` untuk event daerah (butuh konten event dari pemilik).
  - `ENVOY`: efektivitas Dalam Negeri −2, +3,0 lokal.
- Provinsi < 25 menyetel flag `UNREST_<id>` yang menaikkan bobot event daerah (bila ada).
- UI: tile map 17×7 dari `col`/`row` konten, 5 warna tingkat (Lampiran A), titik merah untuk flag unrest, legenda yang bisa memfilter, dan panel samping berisi ilustrasi, isu utama, serta 4 aksi.
  - Tiap tile adalah `<button>` dengan `aria-label` (nama + persen + status). Warna tidak pernah jadi satu-satunya pembawa info; angka selalu tampil.
- Tambah "Peta daerah" ke sidebar dengan badge jumlah provinsi bergejolak.

**Acceptance criteria**
- Test determinisme 38 provinsi; tidak ada provinsi di luar 0..100. `pnpm balance --runs=5000` dengan strategi "kunjungan terus" dicatat; bila jadi strategi dominan, turunkan angka dan catat di `DECISIONS.md`. Resolve 1 kuartal tetap ≤ 20 ms; save 20 kuartal ≤ 300 KB.

### Bagian 6B.5 — E2E, balancing, dokumentasi

- E2E alur penuh: pelantikan dengan latar belakang + janji → reshuffle → kunjungan provinsi → 20 kuartal → laporan akhir dengan janji.
- `docs/PROGRESS.md`, `docs/PERFORMANCE.md`, `docs/SIMULATION_RULES.md`, `docs/PANDUAN-KONTEN.md` (cara menulis provinsi, calon, latar belakang, janji). Lalu **berhenti**.

---

## Lampiran A — Token visual

| Peran | Nilai |
|---|---|
| Latar halaman | `#0E1117` |
| Sidebar / bilah atas | `#0B0E13` |
| Kartu | `#151A22` |
| Permukaan naik (baris aktif, input) | `#1C222C`, hover `#252C38` |
| Garis rambut | `rgba(237,233,222,0.08)` |
| Teks utama / sekunder / redup | `#EDE9DE` / `#A9A59A` / `#8A877E` |
| Aksen (aksi utama, pilihan, angka penting) | `#C9A227`, teks di atasnya `#14110A` |
| Positif / negatif | `#4CC38A` / `#E5484D` |
| Kertas / kertas gelap / tinta | `#E8E1D0` / `#DDD5C1` / `#1E1B16` |
| Stempel / label "segera" | `#A8301C` / `#9A2A18` |
| Kepuasan ≥70 / 55–69 / 40–54 / 25–39 / <25 | `#1F7A4D` (teks putih) / `#6FA35A` / `#D6B04A` / `#D9822B` (teks gelap) / `#B23A2A` (teks putih) |

- **Tipografi:** Source Serif 4 untuk judul (400–500), Inter untuk antarmuka (400/500, maks. 600), IBM Plex Mono untuk angka meta (K3). Semua angka `tabular-nums`. Tanpa huruf kapital berspasi, tanpa italic untuk penekanan.
- **Spasi:** grid 4 px. Kartu padding 20–24, radius kartu 14–16, kontrol 8–10, kertas 6–8.
- **Gerak:** satu kurva `cubic-bezier(0.22,1,0.36,1)`; hover 150 ms, stempel 220–260 ms, tanda tangan 900 ms, reveal voting 650 ms/fraksi. Hanya `opacity`, `transform`, `background-color`, `clip-path`.
- **Ilustrasi:** flat vektor, warna solid, tanpa garis luar dan gradien, figur tanpa wajah, palet `docs/ASET-GAMBAR.md`. Bendera fiktif merah-putih **selalu** diberi lambang emas agar tidak identik dengan bendera nyata.

## Lampiran B — Peta layar

Route di bawah adalah perkiraan. Cocokkan dengan `apps/desktop/src/app/App.tsx` sebelum mengubah.

| Wireframe | Route / file sekarang | Bagian |
|---|---|---|
| `Main.dc.html` | `/` · `features/menu/MenuPage.tsx` | 6A.3 |
| `Setup.dc.html` | pelantikan langkah 1 · `features/inauguration/` | 6A.5, 6B.2 |
| `Sumpah.dc.html` | pelantikan langkah 2 · `features/inauguration/` | 6A.5 |
| `MejaKerja.dc.html` | `/game` · `features/dashboard/` | 6A.3 |
| `Peristiwa.dc.html` | `/game/events` · `features/events/` | 6A.4 |
| `Sidang.dc.html` | transisi end-quarter + `/game/parliament` | 6A.4 |
| `Laporan.dc.html` | `/game/report` · `features/report/` | 6A.4 |
| `Kebijakan.dc.html` | `/game/policies` · `features/policies/` | 6A.5 |
| `Kabinet.dc.html` | `/game/cabinet` · `features/cabinet/` | 6A.5, 6B.3 |
| `Peta.dc.html` | `/game/map` · `features/map/` (baru) | 6B.4 |
| `Aset.dc.html`, `AsetEvent.dc.html` | lembar acuan aset | 6A.2 |

## Lampiran C — Usulan bentuk konten 6B (semua angka placeholder, K6)

```jsonc
// backgrounds.json
{ "id": "BG-PLACEHOLDER-ECONOMIST", "version": 1, "name": "…", "description": "…",
  "scene": "policy-fiscal", "startModifiers": [{ "target": "fiscalHealth", "delta": 5.0 }, { "target": "approval", "delta": -3.0 }] }

// promises.json — dinilai pada state akhir kampanye
{ "id": "PRM-PLACEHOLDER-INFLATION", "version": 1, "name": "…", "check": { "stat": "final.inflationPct", "op": "<=", "value": 4.0 } }

// provinces.json — 38 entri, col 1..17, row 1..7
{ "id": "PRV-PLACEHOLDER-01", "version": 1, "name": "…", "region": "…", "col": 1, "row": 1, "baseSatisfaction": 58.0, "offset": 2.0 }

// cabinet-candidates.json — per kementerian atau jabatan pimpinan
{ "id": "CND-PLACEHOLDER-01", "version": 1, "roleId": "MIN-PLACEHOLDER-FISCAL", "name": "…", "factionId": "FAC-…",
  "baseEffectiveness": 72, "integrity": 70, "supportGain": 6.0,
  "appearance": { "head": "rambut", "skin": "#C09078", "suit": "#181830", "accent": "#C9A227", "glasses": true } }
```

- Penampilan potret: `head` ∈ `peci | rambut | panjang | uban | baret | botak | hijab`; warna dari palet Lampiran A dan `ASET-GAMBAR.md`.
- Semua nama tokoh, partai, dan provinsi fiktif (`AGENT.md` §5.16, kecuali K1 diubah pemilik).

## Aturan kerja (ringkas dari `CLAUDE.md`)

- Satu bagian = satu commit `feat(stage-6A.N): …` / `feat(stage-6B.N): …`.
- Sebelum klaim selesai: `pnpm lint && pnpm typecheck && pnpm test`. Untuk bagian UI, jalankan juga `pnpm test:e2e` atau minimal `pnpm build:web`. Laporkan output perintahnya.
- Area dilindungi tidak disentuh: `packages/game-data/content/**`, `prompts/**`, fixture simulasi dan fixture save yang sudah ada.
- Ide di luar dokumen ini → `docs/OPEN_QUESTIONS.md`.
