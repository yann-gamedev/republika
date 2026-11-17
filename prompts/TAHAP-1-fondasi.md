# TAHAP 1 — Fondasi

**Tujuan tahap:** repo siap kerja. Tipe dan schema domain terkunci, loader konten tervalidasi, jendela desktop Tauri berisi UI shell dengan data mock bisa dibuka, dan CI Windows hijau. Belum ada logika simulasi.

**Wajib dibaca dulu:** `AGENT.md` (terutama §2–§5 dan §5.17), `CLAUDE.md`.

**Prasyarat di mesin pemilik proyek:** Node LTS, pnpm, Rust stable (`rustup`), Visual Studio Build Tools (C++), dan WebView2 (sudah ada di Windows 10/11). Agent menuliskan langkah instalasinya di `README.md`.

---

## Bagian 1.1 — Monorepo dan tooling

**Tugas**
- pnpm workspaces: `apps/desktop`, `packages/simulation`, `packages/game-data`, `packages/shared`, `tools/*`.
- `tsconfig.base.json` dengan `strict`, `noUncheckedIndexedAccess`, dan `exactOptionalPropertyTypes`.
- ESLint (flat config) + Prettier. Rule khusus `packages/simulation`: larang import `react`, `@tauri-apps/*`, `node:*`, serta global `Date`, `Math.random`, dan `crypto`. Rule khusus `apps/desktop/src` (kecuali `platform/`): larang import `@tauri-apps/*`.
- Vitest workspace + fast-check.
- Script root: `dev`, `dev:web`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `content:check`, `format`.
- `.gitignore`, `.nvmrc`, `rust-toolchain.toml`, dan `README.md` (cara instal prasyarat di Windows + cara menjalankan).

**Acceptance criteria**
- `pnpm install && pnpm lint && pnpm typecheck && pnpm test` hijau.
- Test lint membuktikan: `Math.random()` di `packages/simulation` → error; import `@tauri-apps/api` di komponen UI → error.

## Bagian 1.2 — Tipe dan schema domain (`packages/shared`)

**Tugas.** Tipe TypeScript + schema Zod (pakai `z.infer` bila memungkinkan) untuk:
- `Indicators` (fixed-point ×10) dan tabel `INDICATOR_DOMAINS` (min, max, unit, label Indonesia).
- `GameState` v1 sesuai TDD §7, **ditambah**: `presidentName`, `cabinetName?`, `rulesetVersion`, `maxTurns`, `treasuryBillion`, `pendingEvents`, `lobbyThisTurn`, `policyCooldowns`, `campaignStats`, `archetypeId?`, `rulesetMigratedFrom?`.
- `FactionState`, `MinistryState`, `ActivePolicy`, `PendingEvent`.
- `GameCommand` (discriminated union, AGENT §5.3).
- `Requirement`: `INDICATOR_AT_LEAST`, `INDICATOR_AT_MOST`, `TREASURY_AT_LEAST`, `POLICY_ACTIVE`, `POLICY_NOT_ACTIVE`, `FLAG_SET`, `FLAG_NOT_SET`, `TURN_AT_LEAST`.
- `EffectRule`: `MODIFY_INDICATOR` (timing `IMMEDIATE | PER_TURN | DELAYED`, `delayTurns?`), `MODIFY_TREASURY`, `CHANGE_FACTION_SUPPORT` (by `factionId` atau `ideologyTag`), `MODIFY_MINISTRY_EFFECTIVENESS`, `SET_FLAG`, `CLEAR_FLAG`. Semua punya `reasonCode`.
- `ConditionalModifier` (`when: Requirement[]`, `appliesTo`, `multiplier`).
- `PolicyDefinition`, `FactionDefinition`, `MinistryDefinition`, `EventDefinition` (+ `EventChoice` dengan `neutral?`), `ArchetypeDefinition`, `ScenarioDefinition`, `BaselineParams`.
- `LedgerEntry`, `TurnReport`.
- `SaveFile` (AGENT §5.12) dan `Settings` (`uiScale`, `fullscreen`, `lastRunAppVersion`, `askedAboutPreviousVersion`).
- Bentuk JSON konten mengikuti contoh di `docs/PANDUAN-KONTEN.md`. Kalau ada yang perlu diubah, perbarui panduan itu juga.

**Acceptance criteria**
- Contoh valid lolos parse, dan contoh tidak valid ditolak dengan pesan jelas. Tidak ada `any`.

## Bagian 1.3 — Loader dan validator konten (`packages/game-data`)

**Tugas**
- Struktur `content/`: `scenario.json`, `baseline.json`, `factions/*.json`, `ministries.json`, `policies/*.json`, `events/*.json`, `archetypes.json`. Isi hanya template ber-ID `PLACEHOLDER-*`. Buat juga folder `migrations/` (kosong + README) untuk peta migrasi ruleset.
- `loadGameDefinitions()` memparse dengan Zod lalu mengonversi ke fixed-point; presisi berlebih ditolak.
- **Konten dibundel saat build** (import JSON statis via Vite, bukan dibaca dari disk saat runtime), sehingga pemain tidak bisa merusak konten dan startup lebih cepat.
- Validasi lintas-file: ID unik, referensi valid, total kursi = 100, opsi `neutral` di setiap event, kategori → kementerian, dan konflik melingkar.
- `contentHash` stabil (key tersortir).
- CLI `pnpm content:check` dengan pesan Indonesia: exit ≠ 0 jika ada error, dan peringatan untuk `PLACEHOLDER-*`.

**Acceptance criteria**
- Test per aturan validasi. `contentHash` identik walaupun urutan key berbeda.

## Bagian 1.4 — Shell desktop Tauri + UI mock (`apps/desktop`)

**Tugas**
- Tauri 2 + Vite + React + Tailwind + shadcn/ui (tambahkan komponen satu per satu sesuai kebutuhan).
- `tauri.conf.json`: `identifier` final (mis. `id.republika.game`; konfirmasi ke pemilik proyek, karena ini **tidak boleh diubah** setelah rilis), jendela default 1440×900, minimum 1280×720, judul "REPUBLIKA", CSP ketat tanpa remote, dan `webviewInstallMode: embedBootstrapper`.
- Capabilities minimal sesuai AGENT §5.17. Release profile Rust juga sesuai §5.17.
- `platform/`: interface `SaveStorage` + `MemoryStorage`. `TauriFileStorage` masih stub, diisi di Tahap 3.
- Tema "ruang rapat negara" sebagai design token CSS. Font dibundel lokal (OFL, misalnya satu serif dan satu sans), tanpa CDN.
- Layar: **Menu Utama** (Mulai Baru, Lanjutkan, Muat, Pengaturan, Keluar), **Pelantikan**, lalu layout game dengan sidebar: **Dashboard, Kebijakan, Parlemen, Kabinet, Peristiwa, Riwayat**. Semua memakai data mock dari `features/mock/mockState.ts`.
- `ui/charts/`: komponen SVG ringan `LineChart` dan `Hemicycle`, versi awal untuk mock.
- Formatter `formatIndicator()` dan `formatRupiahTriliun()` dengan locale `id-ID`. Semua teks lewat `copy/id.ts`.
- Route di-lazy load.

**Acceptance criteria**
- `pnpm dev:web` dan `pnpm dev` (jendela Tauri) sama-sama menampilkan semua layar.
- Unit test formatter (`523` → `"52,3"`, `8000` → `"Rp8 T"`).
- `cargo check` di `src-tauri` lulus.

## Bagian 1.5 — CI dan dokumentasi

**Tugas**
- GitHub Actions:
  - Job `checks` (ubuntu): lint → typecheck → test → content:check → build web.
  - Job `desktop` (windows-latest): `tauri build`, lalu upload installer sebagai artifact (bukan release) dan cetak ukuran installer di summary.
- Konversi `docs/source/REPUBLIKA_GDD_TDD_v0.1.pdf` menjadi `docs/GDD.md` dan `docs/TDD.md`, dengan catatan di atas: *"Addendum v0.3 di AGENT.md §5 menimpa dokumen ini. Bagian web/API/DB tidak berlaku."*
- Kerangka `docs/SIMULATION_RULES.md`, `DECISIONS.md`, `OPEN_QUESTIONS.md`, `PROGRESS.md`, `RELEASE.md`.

**Acceptance criteria**
- CI hijau, dan installer dari artifact bisa diinstal serta dibuka di Windows (diverifikasi pemilik proyek).

---

## Gate akhir Tahap 1
- [ ] Installer dari CI terinstal dan jendela terbuka. Catat ukuran installer dan RAM awal (Task Manager → total proses REPUBLIKA + WebView2) di `PROGRESS.md`.
- [ ] Mengubah angka placeholder menjadi 2 desimal membuat `content:check` gagal.
- [ ] Tampilan sudah terasa "ruang rapat negara".
