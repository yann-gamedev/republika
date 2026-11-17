# Progres REPUBLIKA

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
