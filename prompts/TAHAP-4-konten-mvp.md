# TAHAP 4 — Sistem lengkap dan konten MVP

**Tujuan tahap:** semua sistem MVP tersambung: 6 fraksi, 4 kementerian, 12 kebijakan, 15 event, 20 kuartal, laporan akhir dengan arketipe, UI responsif yang dipoles, dan CLI simulasi untuk penulis konten. Autosave file dari Tahap 3 tetap berjalan; slot manual menyusul di Tahap 5.

**Wajib dibaca:** `AGENT.md` §5.6, §5.11, §5.15; `docs/PLAYTEST-SLICE.md` (hasil gate Tahap 3); `docs/PANDUAN-KONTEN.md`.

**Catatan konten:** pemilik proyek menulis konten final secara bertahap. Agent membangun **sistem dan tooling**. Jika konten belum lengkap, sistem harus tetap berjalan dengan konten yang ada, dan `content:check` memberi peringatan tentang jumlah yang kurang dari target (bukan error).

---

## Bagian 4.1 — Perbaikan dari playtest slice
**Tugas.** Baca `docs/PLAYTEST-SLICE.md`. Implementasikan perbaikan yang **sudah disetujui pemilik proyek** (tercatat di file itu atau di `DECISIONS.md`). Kalau belum ada keputusan, tulis usulan ke `OPEN_QUESTIONS.md` lalu lanjut ke 4.2.
**Acceptance criteria:** fixture diperbarui dengan alasan yang jelas di commit; `rulesetVersion` naik jika aturan berubah.

## Bagian 4.2 — Parlemen penuh (6 fraksi)
**Tugas**
- Dukung 6 fraksi (dari konten) dengan `ideologyTags`, `policyPreferences` per kategori, dan `support` awal.
- Drift support fraksi per kuartal (parameter di `baseline.json`): support bergerak pelan menuju nilai dasar fraksi, dan dipengaruhi approval.
- UI Parlemen: `Hemicycle` SVG 100 kursi dengan warna per fraksi (palet fiktif, tanpa warna partai nyata yang identik), kartu fraksi berisi ideologi, preferensi (ikon suka/tidak suka per kategori), dan tren support.
**Acceptance criteria:** property test bahwa kursi selalu 100 dan support selalu dalam 0..100.

## Bagian 4.3 — Kabinet (4 kementerian)
**Tugas**
- Halaman **Kabinet**: 4 kementerian dengan effectiveness (bar 40–90), domain kategori yang dibawahi, pengali efek saat ini (mis. "×1,08"), dan riwayat perubahan.
- Tampilkan pengaruh kementerian di kartu kebijakan ("Dipengaruhi Kementerian Energi ×0,96").
**Acceptance criteria:** nilai pengali di UI sama dengan yang dipakai engine (fungsinya diambil dari `packages/simulation`, bukan disalin).

## Bagian 4.4 — Skala konten: kebijakan dan event
**Tugas**
- Pastikan engine menangani 12 kebijakan dan 15 event tanpa asumsi jumlah, termasuk `conflicts`, rantai event lewat flag (event A men-set flag → event B eligible), dan event yang memicu respons pada kuartal berikutnya.
- Halaman Kebijakan: filter per kategori, urutkan (biaya/kategori/status), dan pencarian.
- `content:check` menambah pemeriksaan kualitas: kebijakan tanpa efek negatif sama sekali (peringatan "terlalu dominan?"), event yang mustahil eligible (requirement saling bertentangan), flag yang di-set tapi tidak pernah dibaca, dan sebaliknya.
**Acceptance criteria:** test untuk rantai event via flag dan untuk setiap peringatan kualitas baru.

## Bagian 4.5 — Kampanye 20 kuartal, laporan akhir, dan arketipe
**Tugas**
- `maxTurns` dari `scenario.json` (20). Status `completed` mengunci semua command (error `CAMPAIGN_COMPLETED`), lalu game diarahkan ke Laporan Akhir. Autosave tetap menyimpan kampanye yang sudah selesai agar laporannya bisa dibuka lagi.
- `campaignStats` diakumulasi selama kampanye: jumlah kebijakan per kategori, voting lolos/gagal, rata-rata dan min/max tiap indikator, total defisit, dan jumlah lobi.
- `report/archetype.ts`: evaluasi `archetypes.json` (aturan berprioritas, yang pertama cocok dipakai, fallback "Pemerintahan Seimbang").
- Halaman **Laporan Akhir Masa Jabatan**: "Presiden {nama}, {kabinet} — 20XX–20XX (tahun fiktif)", arketipe + deskripsi, `LineChart` SVG 8 indikator sepanjang 20 kuartal, 5 keputusan paling berdampak (dari ledger, berdasarkan total |delta| ternormalisasi), dan kronologi. **Tanpa skor tunggal dan tanpa label baik/buruk.**
**Acceptance criteria:** test arketipe (tiap aturan punya minimal 1 state yang memicunya) dan E2E sampai laporan akhir (di `dev:web`, pakai skenario test dengan `maxTurns` kecil).

## Bagian 4.6 — Polish UX dan aksesibilitas
**Tugas**
- Desktop: layout rapi dari 1280×720 sampai 2560×1440, panel detail kebijakan di sisi kanan (master-detail), tooltip hover, dan shortcut keyboard lengkap (tampilkan daftar shortcut lewat `?`).
- Empty state, error state, dan skeleton loading di semua halaman.
- Aksesibilitas: kontras WCAG AA, fokus keyboard terlihat, label ARIA pada chart SVG (dengan ringkasan teks), dan indikator naik/turun tidak hanya mengandalkan warna (pakai ikon ↑↓ + teks).
- Tooltip/glosarium untuk istilah (inflasi, fiscal health, effectiveness), teksnya di `copy/id.ts`.
**Acceptance criteria:** pemeriksaan axe (via `@axe-core/playwright` di `dev:web`) tanpa pelanggaran serius di semua halaman, dan JS heap setelah 20 kuartal dicatat di `PROGRESS.md`.

## Bagian 4.7 — CLI simulasi untuk penulis konten
**Tugas**
- `pnpm sim --seed=<s> --strategy=<random|greedy-approval|austerity|welfare|no-op> --turns=20 [--out=report.md]`.
- Strategi berupa bot sederhana di `packages/simulation/test-utils/bots/` (murni dan deterministik). Bot selalu memilih opsi event (netral untuk `no-op`).
- Output markdown: tabel indikator per kuartal, kebijakan yang diambil, hasil voting, event, dan arketipe akhir.
**Acceptance criteria:** CLI berjalan < 2 detik untuk 1 kampanye; output identik untuk seed + strategi yang sama.

---

## Gate akhir Tahap 4
- [ ] Mainkan 1 kampanye penuh 20 kuartal. Apakah ada momen bosan atau berulang? Catat di `docs/PLAYTEST-MVP.md`.
- [ ] Jalankan `pnpm sim` dengan 5 strategi. Apakah arketipe yang keluar berbeda-beda?
- [ ] `content:check` tanpa error, dan peringatannya sudah Anda tinjau.
