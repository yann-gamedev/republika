# Progres REPUBLIKA

## Tahap 5 — Save slot, migrasi, optimasi, balancing, dan rilis

Tanggal: 18 November 2026, Windows 11 x64. Branch `feat/stage-5-release`.

### Status

**Implementasi 5.1–5.6 selesai dan terverifikasi lokal.** Tag rilis `v0.1.0-rc.1` **belum dibuat**, karena membuat tag rilis wajib dikonfirmasi pemilik (lihat tindakan di bawah). Gate closed playtest menunggu pemilik. Tahap 5 adalah tahap terakhir di `prompts/`.

| Bagian          | Hasil                                                                                                                                                                                                                                                   | Commit    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 5.1 Slot manual | Layar Simpan & Muat (autosave + 5 slot: label, tanggal, versi, 3 indikator), simpan/timpa, muat, ganti nama, hapus ke `saves/trash/`, "Buka folder save" (path tetap di Rust).                                                                          | `42f52e5` |
| 5.2 Migrasi     | Format save v2 (`playTimeSeconds`, ledger ringkas), rantai migrator murni + fixture v1 beku, `migrateRuleset` + `RULESET_MIGRATED`, cadangan ke `saves/backup-v{versi}/` sebelum migrasi, alur "versi sebelumnya" + impor file, checklist `RELEASE.md`. | `f5414d6` |
| 5.3 Desktop     | F11, preferensi layar penuh saat dibuka, "Kembalikan default", konfirmasi tutup bila ada keputusan belum tersimpan, log lokal 1 MB × 3 rotasi, error boundary per layar.                                                                                | `72893ca` |
| 5.4 Optimasi    | `pnpm perf:report`, Tauri API lazy, dependensi tak terpakai dibuang, `docs/PERFORMANCE.md`.                                                                                                                                                             | `24bca3e` |
| 5.5 Balancing   | `pnpm balance` (worker threads, deterministik), laporan `docs/balance/latest.md`.                                                                                                                                                                       | `4cd7aa5` |
| 5.6 Rilis       | NSIS per-user, `pnpm version:set`, `release.yml` (draft + SHA-256 + CHANGELOG), README pemain, `CHANGELOG.md`, `CREDITS.md`, `docs/DEVELOPMENT.md`.                                                                                                     | `95e7fb0` |

### Bukti verifikasi lokal

| Perintah                        | Hasil                                                                                                                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`, `pnpm typecheck`   | Lulus.                                                                                                                                                                                                                      |
| `pnpm test`                     | 265 test lulus (termasuk migrasi v1→v2, `RULESET_MIGRATED`, cadangan saat gagal, slot, log, versi sinkron, agregasi balance).                                                                                               |
| `pnpm test:e2e`                 | 9 test lulus (terakhir dijalankan setelah 5.4): slot Simpan & Muat, error boundary paksa, reset pengaturan, kampanye 20 kuartal, audit axe.                                                                                 |
| `cargo test` / `clippy` / `fmt` | Lulus.                                                                                                                                                                                                                      |
| `pnpm content:check`            | Lulus tanpa error.                                                                                                                                                                                                          |
| `pnpm balance --runs=5000`      | 5000 kampanye dalam 4,8–6,6 dtk (12 worker), **0 softlock**, save maksimum **230 KiB** (≤ 1 MB). Hasil 12 worker identik dengan 1 worker.                                                                                   |
| `pnpm build`                    | Installer NSIS per-user **3,15 MiB** (3.307.633 byte).                                                                                                                                                                      |
| Performa                        | Lihat `docs/PERFORMANCE.md`: cold start ±1,49 dtk, JS heap 20 kuartal 12,7–18,2 MB, resolve 0,25–1,05 ms, save 111–230 KiB. **RAM belum terukur andal** (pemangkasan working set Windows); perlu Task Manager oleh pemilik. |

### Temuan balancing (konten placeholder, bukan diubah agent)

- Semua voting kebijakan selalu lolos (fraksi placeholder terlalu mendukung).
- Bot greedy memilih bantuan sosial placeholder di 100% kampanye (tidak punya sisi negatif).
- Satu arketipe per strategi (konten baru punya 1 aturan + fallback).
- Pengangguran turun sampai 0% di ±10% kuartal (rumus Okun dengan baseline placeholder).

### Tindakan pemilik

1. **Konfirmasi rilis kandidat.** Bila disetujui, agent menjalankan `pnpm version:set 0.1.0-rc.1`, commit, push, lalu membuat dan push tag `v0.1.0-rc.1`. `release.yml` membuat draft release berisi installer + checksum.
2. Uji instalasi bersih di laptop lain (checklist di `docs/RELEASE.md` → _Uji instalasi bersih_): offline, save tercipta, uninstall tidak menghapus `Documents\REPUBLIKA`.
3. Ukur RAM dengan Task Manager dan isi tabel di `docs/PERFORMANCE.md`.
4. Simulasi update `rc.1` → `rc.2` (lihat `docs/RELEASE.md` → bagian D).
5. Tinjau `docs/balance/latest.md`, tulis konten final, naikkan `rulesetVersion`.
6. Closed playtest 3–5 teman → `docs/PLAYTEST-CLOSED.md` (template tersedia).
7. Masih terbuka dari tahap sebelumnya: `rulesetVersion` konten (masih 1), kalimat `contentReasons`, `PLAYTEST-SLICE.md`, `PLAYTEST-MVP.md`, usulan di `OPEN_QUESTIONS.md`.

### Catatan untuk save Anda yang sudah ada

Di mesin ini ada `Documents\REPUBLIKA\saves\autosave.json` dari build sebelumnya. Saat versi baru dibuka, dialog **"Perbarui save ke versi ini?"** akan muncul. File aslinya dicadangkan dulu ke `saves\backup-v0.1.0\`. Agent tidak mengubah file tersebut.

---

## Tahap 4 — Sistem lengkap dan konten MVP

Tanggal: 18 November 2026, Windows 11 x64. Branch `feat/stage-4-mvp` (bertumpuk di atas `feat/stage-3-vertical-slice`, PR #2).

### Status

**Sistem dan tooling 4.1–4.7 selesai dan terverifikasi lokal. Playtest dan pemeriksaan manual dialihkan ke pemilik sesuai permintaan.** Konten final belum ditulis (masih placeholder: 6 fraksi, 4 kebijakan, 2 event, 2 arketipe, 4 kuartal). Sistem berjalan dengan konten yang ada dan `content:check` memberi peringatan untuk kekurangannya. Tidak melanjutkan ke Tahap 5.

| Bagian                       | Hasil                                                                                                                                                                                                                                                                      | Commit    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 4.1 Perbaikan playtest       | `PLAYTEST-SLICE.md` belum diisi → 5 usulan dicatat di `OPEN_QUESTIONS.md`, aturan tidak diubah.                                                                                                                                                                            | `f43085d` |
| 4.2 Parlemen penuh           | Drift dukungan fraksi = reversi ke dasar + `factionApprovalInfluence` × (persetujuan − 50), default 0,05 (parameter opsional di `baseline.json`). Ruleset fixture → 3. UI: tag ideologi, ikon suka/tidak suka, tren dukungan. Property test kursi 100 dan dukungan 0..100. | `e543674` |
| 4.3 Kabinet                  | Riwayat effectiveness per kementerian dari ledger; label "Dipengaruhi {Kementerian} ×N" di kartu kebijakan memakai fungsi engine (diuji sama persis).                                                                                                                      | `026931b` |
| 4.4 Skala konten             | `content:check`: jumlah di bawah target MVP, kebijakan tanpa sisi negatif, event/kebijakan mustahil, flag tak berpasangan. Test rantai event via flag dan 12 kebijakan/15 event/20 kuartal. Filter, urutan, dan pencarian kebijakan.                                       | `3c18ea1` |
| 4.5 Kampanye & laporan akhir | `CAMPAIGN_COMPLETED`; statistik avg/min/max; arketipe berprioritas + fallback; 5 keputusan paling berdampak (ternormalisasi); halaman Laporan Akhir (tanpa skor, warna netral); E2E 20 kuartal.                                                                            | `1d15e82` |
| 4.6 Polish & aksesibilitas   | Master-detail kebijakan, daftar pintasan `?`, `/` cari, glosarium tooltip, ikon ↑↓ + teks, skeleton, kontras, audit axe.                                                                                                                                                   | `3f9bd64` |
| 4.7 CLI simulasi             | `pnpm sim` dengan 5 bot murni/deterministik, laporan markdown.                                                                                                                                                                                                             | `5d0808c` |

### Bukti verifikasi lokal

| Perintah                      | Hasil                                                                                                                                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`, `pnpm typecheck` | Lulus (termasuk paket baru `tools/sim`).                                                                                                                                                                                                        |
| `pnpm test`                   | 241 test dalam 26 file lulus.                                                                                                                                                                                                                   |
| `pnpm test:coverage`          | `packages/simulation/src` lines 97,64%.                                                                                                                                                                                                         |
| `pnpm content:check`          | Lulus tanpa error; 23 peringatan (placeholder, jumlah di bawah target, `POL-SOCIAL-PLACEHOLDER-001` tanpa sisi negatif).                                                                                                                        |
| `pnpm test:e2e`               | 6 test lulus: shell, slice 4 kuartal, **kampanye 20 kuartal sampai Laporan Akhir**, dan **audit axe tanpa pelanggaran serius/kritis** di semua halaman. Build E2E memakai `vite build --mode e2e` (maxTurns 20); build rilis tidak terpengaruh. |
| JS heap setelah 20 kuartal    | 12,7–18,2 MB di tiga run (`performance.memory` Chromium Playwright, angka terkuantisasi dan dipengaruhi GC). Target ≤ 30 MB.                                                                                                                    |
| `pnpm build`                  | Installer NSIS **3,07 MiB** (3.218.916 byte). Entry JS 459,8 kB (gzip 142,1 kB).                                                                                                                                                                |
| `pnpm sim`                    | Satu kampanye 20 kuartal ±17 ms; `pnpm sim` end-to-end ±1,9 dtk; output identik untuk seed + strategi sama.                                                                                                                                     |

Hasil `pnpm sim --seed=abc --turns=20` dengan konten placeholder: `random`, `greedy-approval`, `welfare`, `no-op` → **Pemerintahan Seimbang**; `austerity` → **Teknokrat Fiskal Placeholder**. Arketipe kurang bervariasi karena konten baru punya 1 aturan + fallback.

### Catatan untuk penulis konten (dari simulasi)

- Dengan baseline placeholder, pertumbuhan stabil di atas 2,5% sehingga **pengangguran turun terus sampai 0%** pada kampanye 20 kuartal (rumus Okun tanpa batas bawah alami). Pertimbangkan `okunNeutralGrowthPct`/`growthTargetPct` atau efek kebijakan yang menaikkan pengangguran.
- `POL-SOCIAL-PLACEHOLDER-001` tidak punya sisi negatif selain biaya kas → diperingatkan "terlalu dominan?".
- `contentHash` konten placeholder berubah walau JSON tidak diubah, karena parameter baseline baru (`factionApprovalInfluence`) ikut di-hash dengan nilai default.

### Tindakan pemilik (playtest dialihkan ke Anda)

1. **Main sementara:** `pnpm dev` (atau installer dari `pnpm build`). Untuk 20 kuartal, ubah `maxTurns` di `content/scenario.json` menjadi 20; kampanye 4 kuartal juga sudah cukup untuk mencoba Laporan Akhir.
2. Isi `docs/PLAYTEST-MVP.md` (template tersedia), termasuk RAM dari Task Manager setelah 20 kuartal.
3. Jalankan `pnpm sim` untuk 5 strategi dan catat arketipenya.
4. Tinjau peringatan `pnpm content:check`.
5. Masih terbuka dari Tahap 3: naikkan `rulesetVersion` di `content/scenario.json` (sekarang 1; aturan engine sudah ruleset 3), tulis kalimat `contentReasons`, dan isi `PLAYTEST-SLICE.md`.
6. Putuskan usulan di `OPEN_QUESTIONS.md` → Tahap 4.1 (catat yang disetujui di `DECISIONS.md`).

### Gate akhir Tahap 4

- [ ] Main 1 kampanye penuh 20 kuartal; catat momen bosan/berulang di `docs/PLAYTEST-MVP.md`.
- [ ] `pnpm sim` dengan 5 strategi: apakah arketipenya berbeda-beda?
- [x] `content:check` tanpa error (peringatan perlu ditinjau pemilik).

---

## Tahap 3 — Vertical slice (4 kuartal bisa dimainkan)

Tanggal: 17 November 2026, Windows 11 x64. Branch `feat/stage-3-vertical-slice`.

### Status

**Implementasi 3.1–3.5 selesai dan terverifikasi lokal; menunggu playtest pemilik (gate di bawah).** Tidak melanjutkan ke Tahap 4.

| Bagian                          | Hasil                                                                                                                                                                                                                                                                         | Commit     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 3.1 Event engine                | `events/select.ts`: syarat, cooldown, `uniquePerCampaign` (field baru `eventsFired`), urut ID, `weightedPick` stream turn, maks `maxEventsPerQuarter`; tersambung ke langkah 11. Ruleset fixture 1 → 2, snapshot diperbarui.                                                  | `f01d99e`  |
| 3.2 Controller & store          | `GameController` (startCampaign, dispatch, endQuarter, loadFromSave, continueCampaign/continueFromBackup, loadHistory); store tipis `state`/`lastReport`/`uiStatus`/toast; seed, ID command, dan waktu dari `platform/entropy.ts`.                                            | `6bc433e`  |
| 3.3 File & autosave             | Rust `save_atomic`/`read_text`/`list_saves`, tolak traversal (test Rust); `TauriFileStorage` nyata; autosave + `autosave.bak.json`; kontrak storage untuk memori dan Node fs.                                                                                                 | `42a450f`  |
| 3.4 UI utama                    | Pelantikan + momen sumpah, Menu → Lanjutkan + dialog "Save rusak", Dashboard, Kebijakan (✓/✗, proyeksi ↑/↓, biaya pasti, alasan tombol nonaktif), Parlemen (perkiraan voting, lobi), pintasan `1–6`/`Enter`/`Esc`.                                                            | `7796c9a`  |
| 3.5 Peristiwa, laporan, riwayat | Nota dinas dengan konsekuensi kualitatif, "Akhiri Kuartal" terkunci + penjelasan; Laporan Kuartal (delta + 3 penyebab dari ledger, voting, event baru); Riwayat (linimasa + `LineChart` per indikator, dimuat dari save); ringkasan akhir slice; mock dihapus; E2E 4 kuartal. | commit 3.5 |

### Bukti verifikasi lokal

| Perintah                          | Hasil                                                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm lint`, `pnpm typecheck`     | Lulus, 0 warning.                                                                                                                                                                    |
| `pnpm test`                       | 204 test dalam 20 file lulus (engine 118, desktop termasuk controller + kontrak storage).                                                                                            |
| `pnpm test:coverage`              | `packages/simulation` lines 97,64%.                                                                                                                                                  |
| `cargo test --locked` (src-tauri) | 2 test lulus (path biasa diterima; `..`, absolut, drive, `\` ditolak). `cargo fmt`/`clippy` bersih.                                                                                  |
| `pnpm test:e2e`                   | 4 test Playwright lulus, termasuk alur penuh: pelantikan → ajukan kebijakan → lobi → akhiri kuartal → laporan → jawab 2 peristiwa → ringkasan akhir → Riwayat 4 laporan.             |
| `pnpm content:check`              | Lulus, hash konten tidak berubah (`3ed0ca96…`).                                                                                                                                      |
| `pnpm build`                      | Lulus. Installer NSIS **3,06 MiB** (3.210.567 byte). Entry JS 448,6 kB (gzip 138,5 kB), total 21 chunk JS 544.070 byte.                                                              |
| JS heap setelah 4 kuartal         | **±16,1 MB** (`performance.memory.usedJSHeapSize` di Chromium Playwright pada build Vite, MemoryStorage). Ini pendekatan otomatis, bukan pengukuran DevTools manual; target ≤ 30 MB. |

### Tindakan pemilik

1. **Naikkan `rulesetVersion` di `packages/game-data/content/scenario.json` dari 1 ke 2.** Agent tidak mengubahnya karena area konten dilindungi. Engine tetap berjalan, tetapi label ruleset di Pengaturan dan save masih menunjukkan 1.
2. **Tulis kalimat laporan untuk `reasonCode` konten** di `apps/desktop/src/copy/id.ts` → `contentReasons`. Sampai diisi, laporan menampilkan "Dampak {nama kebijakan/peristiwa}". Kode yang ada di konten sekarang:
   `PLACEHOLDER_AID_REACH`, `PLACEHOLDER_AID_SUPPORT`, `PLACEHOLDER_BUREAUCRACY_ORDER`, `PLACEHOLDER_BUREAUCRACY_SAVINGS`, `PLACEHOLDER_DIALOGUE_COST`, `PLACEHOLDER_DIALOGUE_SUPPORT`, `PLACEHOLDER_EMERGENCY_FUND`, `PLACEHOLDER_ENERGY_PASS_THROUGH`, `PLACEHOLDER_ENERGY_REFORM`, `PLACEHOLDER_FLOOD_RESPONSE`, `PLACEHOLDER_FUEL_DISCONTENT`, `PLACEHOLDER_POPULIST_BACKLASH`, `PLACEHOLDER_RED_TAPE_DISCONTENT`, `PLACEHOLDER_REVENUE`, `PLACEHOLDER_SEEN_AS_ABSENT`, `PLACEHOLDER_SWIFT_RESPONSE`, `PLACEHOLDER_TARGETED_AID`, `PLACEHOLDER_TAX_BACKLASH`, `PLACEHOLDER_TENSION_BUILDUP`.
3. **Konten Tahap 3** (2 event + 3 fraksi sementara) belum ditulis; slice saat ini memakai placeholder (6 fraksi, 2 event).
4. **Verifikasi manual save di Windows** (tidak bisa diotomasi agent):
   1. Jalankan installer `apps/desktop/src-tauri/target/release/bundle/nsis/REPUBLIKA_0.1.0_x64-setup.exe` (atau `pnpm dev`).
   2. Mulai Baru → isi nama → Ucapkan Sumpah Jabatan.
   3. Mainkan 2 kuartal (ajukan kebijakan, akhiri kuartal, jawab peristiwa bila ada).
   4. Pastikan `Documents/REPUBLIKA/saves/autosave.json` dan `autosave.bak.json` ada, serta folder `logs/`.
   5. Tutup app → buka lagi → **Lanjutkan**. Kuartal, kas, dan indikator harus sama dengan sebelum ditutup; Riwayat berisi 2 laporan.
   6. Uji save rusak: tutup app, ubah isi `autosave.json` menjadi teks acak, buka → Lanjutkan → harus muncul dialog "Save rusak" dengan tombol **Pakai cadangan** yang memuat kuartal sebelumnya.
5. **Playtest** minimal 3 kali dan isi `docs/PLAYTEST-SLICE.md` (template sudah disiapkan), termasuk RAM dari Task Manager setelah 4 kuartal.

### Gate akhir Tahap 3

- [x] E2E hijau dan JS heap tercatat.
- [ ] Verifikasi manual tutup-buka-Lanjutkan di Windows (langkah 4 di atas).
- [ ] Playtest 3 kali + `docs/PLAYTEST-SLICE.md` terisi.
- [ ] RAM total setelah 4 kuartal dicatat.

---

## Tahap 2 — Engine simulasi inti

Tanggal: 17 November 2026, Windows x64.

### Status

**Implementasi 2.1–2.6 selesai dan terverifikasi lokal; menunggu review pemilik (gate di bawah).** Tidak melanjutkan ke Tahap 3. Gate akhir Tahap 1 (CI GitHub, instalasi artifact, RAM) masih terbuka dan tidak disentuh tahap ini.

| Bagian                 | Hasil                                                                                                                                                                                           | Commit               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 2.1 Primitif           | PRNG sfc32 + cyrb128 (stream `seed:turn`), `roundTenths`/`applyMultiplier`/`clampToDomain`, sort ID stabil, hash JSON kanonis. Snapshot 1000 angka.                                             | `d3689ff`, `955f85d` |
| 2.2 Command & AP       | `applyCommand` 4 command, 15 kode error stabil + tabel pesan Indonesia, requirement, `createInitialState`, `validateEndQuarter`. Property test AP. Fixture konten slice.                        | `e5f9f2e`            |
| 2.3 Efek & ledger      | Interpreter `EffectRule` exhaustive; ledger `before/delta/after/unit/sourceType/sourceId/reasonCode/order`; modifier membaca snapshot; pengali kementerian eff 40/65/90 teruji.                 | `7a2eac9`            |
| 2.4 Voting & lobi      | `predictVote`, `applyLobbies`, `resolveVotes`; 51 lolos/50 gagal, lobi membalik fraksi di ambang, property total kursi 100.                                                                     | `f7f95ed`            |
| 2.5 Orkestrator        | `resolveTurn` urutan §5.10, siklus kebijakan, baseline §5.9, kementerian, normalize/`CLAMPED`, laporan (delta, top 3 penyebab, lolos/gagal, kas). Fixture hash 4 kuartal + rekonsiliasi ledger. | `86b8b80`            |
| 2.6 Proyeksi & dokumen | `projectPolicy` (rentang 75–125%, biaya pasti, prediksi voting), uji determinisme lintas file, property 4 kuartal acak, coverage di CI, `SIMULATION_RULES.md`, `DECISIONS.md`.                  | commit 2.6           |

Catatan riwayat: commit 2.1 sempat berisi snapshot yang diformat Prettier sehingga test gagal; diperbaiki di `955f85d` (folder fixture dikecualikan dari Prettier, `.gitattributes` mengunci LF).

### Bukti verifikasi lokal (keadaan akhir)

| Perintah             | Hasil                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm lint`          | Lulus, 0 warning.                                                                                                                                |
| `pnpm typecheck`     | Lulus semua package.                                                                                                                             |
| `pnpm test`          | 172 test dalam 18 file lulus (simulasi 106 test, 7 file).                                                                                        |
| `pnpm test:coverage` | `packages/simulation/src` lines 97,42%, branches 95,52%, functions 98,36% (ambang 90% lines).                                                    |
| `pnpm content:check` | Lulus, 16 JSON, 18 peringatan placeholder (tidak berubah).                                                                                       |
| `pnpm test:e2e`      | Build Vite lulus, 2 test Playwright lulus.                                                                                                       |
| Performa             | Test anggaran: rata-rata resolve 1 kuartal (20 kuartal fixture) < 50 ms lulus. Pengukuran Windows 11 di app nyata belum relevan sebelum Tahap 3. |
| Gate fixture         | Mengubah efek `FX_VAT_BACKLASH` −3 → −3,5 di fixture membuat 3 test gagal (hash 4 kuartal ×2, proyeksi); setelah dikembalikan semua lulus.       |

### Perubahan di luar `packages/simulation`

- `packages/shared`: skema state/ledger/laporan diperluas (lihat `DECISIONS.md` → Tahap 2); `roundTenths` dibuat tahan galat float.
- `packages/game-data/fixtures/slice/`: konten fixture uji (bukan konten rilis), diekspor sebagai `@republika/game-data/fixtures`.
- `apps/desktop`: data mock dan `HistoryPage` disesuaikan dengan bentuk ledger baru; tampilan tidak berubah fungsinya.
- Dev-dependency `@vitest/coverage-v8` 3.2.7 (tidak ikut runtime). Tidak ada dependensi runtime eksternal baru; engine hanya bergantung pada `@republika/shared` (workspace).
- CI: langkah `pnpm test:coverage` ditambahkan.
- `content/`, `prompts/`, dan `packages/simulation/test/fixtures/saves/` tidak disentuh. `__fixtures__/` dibuat sesuai perintah prompt 2.6.

### Belum dikerjakan (sesuai lingkup)

Pemilihan event berbobot (stub kosong, Tahap 3), arketipe (Tahap 4), `GameController`, UI yang memakai engine, save file. `content/` masih placeholder sehingga belum ada angka balancing.

### Gate akhir Tahap 2 — tindakan pemilik

- [x] Semua test hijau dan coverage ≥ 90% (bukti di atas).
- [ ] Baca `docs/SIMULATION_RULES.md`. Apakah aturannya sesuai keinginan Anda? Perhatikan khususnya keputusan di `DECISIONS.md` → Tahap 2 (PER_TURN mulai kuartal lolos, cara hitung DELAYED/cooldown, snapshot awal kuartal, reversi dukungan fraksi). Koreksi sekarang, sebelum ada UI.
- [ ] Ubah satu angka efek kebijakan, lalu jalankan `pnpm test`. Karena `content/` masih placeholder, fixture engine memakai `packages/game-data/fixtures/slice/policies/*.json`; ubah angka di sana, pastikan test `slice-4q` gagal, lalu kembalikan (`git checkout -- packages/game-data/fixtures`). Agent sudah mencobanya sekali (lihat tabel bukti).
- [ ] Isi konten Tahap 2 di `content/` (lihat `PANDUAN-KONTEN.md`) bila ingin engine diuji dengan angka Anda sendiri.

---

## Tahap 1 — Fondasi (arsip)

Tanggal bukti lokal: 17 November 2026, Windows x64.

### Status

**Implementasi fondasi tersedia; gate akhir Tahap 1 belum ditutup.** Menunggu CI GitHub aktual, instalasi artifact oleh pemilik, RAM awal, dan review visual/native. Tidak melanjutkan Tahap 2.

| Bagian             | Hasil                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 Tooling        | pnpm workspace, TypeScript strict, ESLint boundary rules, Prettier, Vitest, fast-check, Playwright tersedia.                                |
| 1.2 Domain         | Tipe/schema Zod state, command, requirement, effect, content, ledger, report, save, settings; indikator integer ×10 dan kas integer miliar. |
| 1.3 Konten         | Import JSON statis, konversi presisi, validasi lintas-file, hash kanonis SHA-256, CLI Indonesia dan test penolakan presisi tersedia.        |
| 1.4 Desktop        | Tauri 2, layar mock lengkap, route lazy, chart SVG, font lokal OFL, adapter platform dan MemoryStorage; TauriFileStorage tetap stub.        |
| 1.5 CI/dokumentasi | Workflow Ubuntu checks dan Windows NSIS/artifact tersedia; dokumentasi dan konversi PDF lengkap. Run GitHub belum tersedia.                 |

Identifier permanen `id.republika.game` sudah dikonfirmasi pemilik. UI mock menggambarkan kampanye 20 kuartal; skenario konten placeholder tetap 4 kuartal. Aksi mock mencatat pilihan/feedback tanpa mengubah `GameState`. Belum ada engine, save filesystem, autosave, migrasi, atau persistensi settings.

### Bukti verifikasi lokal

| Perintah/pemeriksaan                                                     | Hasil                                                                                                                                                                   |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                         | Lulus; lockfile sesuai manifest.                                                                                                                                        |
| `pnpm lint`                                                              | Lulus, tanpa warning lint.                                                                                                                                              |
| `pnpm typecheck`                                                         | Lulus seluruh package yang memiliki script.                                                                                                                             |
| `pnpm test`                                                              | Lulus 65 test dalam 10 file, termasuk regresi import dinamis terlarang.                                                                                                 |
| `pnpm test:e2e`                                                          | Lulus 2 test browser Chromium pada hasil build Vite melalui preview port 1421, bukan dev server.                                                                        |
| `pnpm content:check`                                                     | Lulus, 16 JSON, 18 peringatan placeholder yang diharapkan.                                                                                                              |
| `cargo check --locked --manifest-path apps/desktop/src-tauri/Cargo.toml` | Lulus.                                                                                                                                                                  |
| `pnpm build`                                                             | Lulus build Vite + Rust release + NSIS final.                                                                                                                           |
| Native smoke                                                             | Executable release pernah dibuka dengan judul `REPUBLIKA`; jendela debug dari Tauri dev juga teramati. Bukan bukti instalasi artifact atau navigasi semua layar native. |
| Visual browser                                                           | Screenshot dashboard 1280×720 diperiksa: navy/emas, judul serif, kartu dokumen; persetujuan pemilik masih pending.                                                      |

E2E mencakup validasi pelantikan, nama presiden, navigasi, aksi mock, event pending/tombol akhir kuartal, tidak ada request eksternal pada alur interaksi, ukuran minimum 1280×720, serta skala 90/100/110/125% pada pemeriksaan layout. Browser E2E bukan pengganti verifikasi WebView2/native.

Test `tests/content-cli.test.ts` menyalin konten ke direktori sementara, membuktikan konten valid exit 0, mengganti approval `58` menjadi `58.12`, lalu membuktikan CLI exit 1 dengan pesan kesalahan presisi. Konten sumber dilindungi tidak diubah untuk gate ini.

Hash konten:

```text
3ed0ca9655c713e270679edefd96e843aee0b1e021f0530ffec91b6ad3fe200c
```

Warning nonfatal: konfigurasi Vitest workspace deprecated; belum dimigrasikan karena bukan blocker Tahap 1. Pemeriksaan Prettier terarah untuk kode/config/dokumentasi yang dikerjakan lulus. `prettier --check .` masih menandai format `AGENT.md` dan `prompts/**` bawaan; file aturan/prompt tersebut sengaja tidak diformat ulang.

### Ukuran dan performa

Installer lokal final:

```text
apps/desktop/src-tauri/target/release/bundle/nsis/REPUBLIKA_0.1.0_x64-setup.exe
3.192.027 byte = 3,04 MiB
SHA-256: 58684debf584cd99b6811f951267bde5067bb9427114a633ce3e4fb45cb583ce
```

Ukuran di bawah target installer 10 MB dan batas 15 MB. Ini build lokal, bukan artifact CI. Bootstrapper WebView2 dibundel; pengunduhan runtime saat instalasi mungkin diperlukan bila WebView2 belum tersedia.

Build Vite: entry JS sekitar 415,98 kB (gzip 128,14 kB); total 17 chunk JS 512.940 byte. Dua font WOFF2 lokal sekitar 99,20 kB. History terpisah dari dashboard dan dimuat lewat route lazy. Aset ikon lintas-platform hasil generator tetap disimpan sebagai aset sumber; tidak ada implementasi mobile dan target bundle hanya NSIS.

| Metrik                                         | Status                                                    |
| ---------------------------------------------- | --------------------------------------------------------- |
| RAM awal REPUBLIKA + seluruh WebView2          | Belum diukur; wajib dicatat pemilik melalui Task Manager. |
| RAM/JS heap dashboard setelah 20 kuartal nyata | Belum dapat diuji tanpa engine.                           |
| Cold start sampai menu                         | Belum diukur.                                             |
| Resolusi kuartal dan ukuran save 20 kuartal    | Belum berlaku pada fondasi mock.                          |

### Dokumentasi

PDF sumber tersedia di `docs/source/REPUBLIKA_GDD_TDD_v0.1.pdf`, bukan hilang. Konversi mencakup 9/9 halaman: GDD halaman 1–4 (§1–§5), TDD halaman 1 dan 5–9 (§6–§11). Sampul/daftar isi bersama diduplikasi; teks dibandingkan dengan ekstraksi sumber. Pemeriksaan visual PDF belum dilakukan. Rancangan web/API/DB historis dipertahankan dengan catatan wajib bahwa addendum v0.3 menimpa.

### Gate akhir dan tindakan pemilik

- [ ] Tambahkan remote GitHub yang dipilih pemilik, push commit, lalu catat URL run `checks` dan `desktop` yang hijau. Saat laporan ini dibuat belum ada remote/push/run GitHub.
- [ ] Unduh artifact `republika-windows-x64` dari run tersebut, instal, lalu buka aplikasi di Windows. Catat ukuran artifact aktual; jangan mengganti bukti ini dengan executable lokal.
- [ ] Buka semua layar native, uji fullscreen/windowed dan skala UI, lalu setujui keterbacaan dan nuansa “ruang rapat negara”.
- [ ] Ukur RAM awal total REPUBLIKA beserta semua proses WebView2 di Task Manager, lalu isi tabel di bawah.
- [x] CLI menolak placeholder dua desimal melalui salinan terisolasi.

| Bukti pemilik                    | Nilai   |
| -------------------------------- | ------- |
| URL run CI                       | Pending |
| Versi Windows                    | Pending |
| Ukuran installer artifact        | Pending |
| Instalasi dan semua layar native | Pending |
| Fullscreen/windowed              | Pending |
| RAM awal total + WebView2        | Pending |
| Persetujuan visual               | Pending |

### Catatan riwayat kerja

Repo awal belum memiliki commit. Pekerjaan terlanjur terkumpul sebelum commit per bagian; pengelompokan commit penutupan mengikuti 1.1–1.5, bukan klaim bahwa setiap snapshot antara sudah diuji terpisah. Bukti perintah di atas berlaku untuk keadaan akhir fondasi. Tidak membuat release/tag atau menginstal aplikasi atas nama pemilik.
