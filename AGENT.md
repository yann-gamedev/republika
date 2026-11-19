# AGENT.md — REPUBLIKA

Panduan kerja utama untuk agent coding mana pun yang mengerjakan repo ini. Kalau isi file ini bertentangan dengan `docs/GDD.md` atau `docs/TDD.md` (v0.1), **file ini yang menang**. Bagian "Keputusan terkunci" adalah addendum v0.3 dari pemilik proyek.

> **Perubahan besar v0.3:** REPUBLIKA adalah **game desktop Windows offline**, bukan aplikasi web. Semua bagian TDD tentang Next.js, API, PostgreSQL, Prisma, auth, Docker, idempotency HTTP, CSRF, dan rate limiting **tidak berlaku**.

---

## 1. Ringkasan proyek

REPUBLIKA adalah game desktop simulasi politik progresif, single-player, sepenuhnya offline, dan open source. Pemain menjadi Presiden Indonesia selama 20 kuartal. Tiap kuartal pemain mengelola kebijakan, kabinet, parlemen, dan event. Tidak ada multiplayer, akun, server, atau generative AI.

Core loop: **Assess → Plan → Negotiate → Resolve → Review**.

Target rilis: **Windows 10/11 (x64)** melalui **GitHub Releases**. Build Android direncanakan sebagai _advanced development_ (lihat §9). Jangan dikerjakan sekarang, tetapi jangan menutup jalannya.

## 2. Stack (tidak boleh diganti tanpa izin)

| Lapisan       | Pilihan                                                       |
| ------------- | ------------------------------------------------------------- |
| Desktop shell | **Tauri 2** (WebView2 di Windows)                             |
| UI            | **Vite + React + TypeScript strict**                          |
| Styling       | Tailwind CSS + shadcn/ui (hanya komponen yang dipakai)        |
| Chart         | **Komponen SVG buatan sendiri** (tanpa library chart)         |
| State UI      | Zustand (satu store tipis)                                    |
| Domain        | Package TypeScript murni (`packages/simulation`)              |
| Validation    | Zod                                                           |
| Storage       | File JSON di `Documents/REPUBLIKA/` lewat command Rust kecil  |
| Testing       | Vitest + fast-check + Playwright (pada build Vite di browser) |
| Monorepo      | pnpm workspaces                                               |

Dilarang: Next.js, Electron, database (termasuk SQLite), server HTTP lokal, Redux, library animasi berat, library chart (Recharts/Chart.js/ECharts), font atau aset dari CDN, dan network request dalam bentuk apa pun saat runtime.

## 3. Struktur repo

```
apps/desktop/
  src/                       # React UI
    app/ features/ ui/charts/ copy/ store/ platform/
  src-tauri/                 # Rust minimal: konfigurasi + command file I/O
packages/simulation/src/{core,policies,economy,politics,events,report,save}
packages/game-data/{content,migrations,fixtures,src}
packages/shared/src/{types,validation}
tools/{sim,balance}          # CLI Node untuk penulis konten & balancing
docs/{GDD.md,TDD.md,SIMULATION_RULES.md,DECISIONS.md,OPEN_QUESTIONS.md,PROGRESS.md,PANDUAN-KONTEN.md,RELEASE.md}
prompts/                     # prompt tahap (jangan diubah agent)
```

## 4. Aturan batas (boundary rules) — wajib

1. `packages/simulation` **tidak boleh** mengimpor React, Tauri, `node:*`, I/O apa pun, `Date`, `Math.random()`, atau `crypto`. Aturan ini ditegakkan dengan lint rule.
2. Waktu, RNG seed, dan definisi konten masuk sebagai **argumen eksplisit**. Timestamp save diambil di lapisan `platform/`, bukan di engine.
3. **UI tidak pernah memodifikasi `GameState` secara langsung.** Semua perubahan lewat `GameController.dispatch(command)`, yang memanggil engine lalu menyimpan hasilnya. Komponen React hanya membaca state.
4. **Akses file hanya lewat interface `SaveStorage`** di `apps/desktop/src/platform/`. Implementasinya: `TauriFileStorage` (rilis) dan `MemoryStorage` (dev di browser dan test). UI tidak boleh memanggil API Tauri langsung.
5. Konten statis memakai ID stabil (`POL-ENERGY-001`, `FAC-...`, `EVT-...`) dan field `version`.
6. Konten JSON tidak boleh berisi kode. Dilarang memakai `eval` atau `new Function`.
7. Iterasi yang memengaruhi hasil harus berurutan deterministik (sort berdasarkan ID).
8. Rust di `src-tauri` dijaga **seminimal mungkin**: hanya command file I/O dan konfigurasi. Logika game tidak boleh ditulis di Rust.

## 5. Keputusan terkunci (addendum v0.3)

### 5.1 Angka dan satuan

- **Indikator disimpan sebagai integer persepuluhan (fixed-point ×10).** `approval: 523` berarti 52,3.
- **Kas disimpan sebagai integer miliar rupiah fiktif** di field `treasuryBillion`. 8 T = `8000`.
- Penulis konten menulis angka dalam satuan tampilan (indikator maksimal 1 desimal, kas dalam triliun maksimal 3 desimal). Loader mengonversi dan **menolak** presisi berlebih.
- Pembulatan: _round half away from zero_ lewat satu fungsi `roundTenths()`, dilakukan setelah tiap efek berpengali.
- Clamp di langkah `normalize`, dicatat di ledger dengan `reasonCode: "CLAMPED"`.

### 5.2 Pelantikan

- Sebelum kuartal 1 ada layar pelantikan: `presidentName` (wajib, 2–40 karakter, di-trim, tanpa karakter kontrol) dan `cabinetName` (opsional, maksimal 40 karakter).
- Dipakai di header, laporan kuartal ("Laporan untuk Presiden {nama}"), laporan akhir, dan label save. **Tidak memengaruhi simulasi.**

### 5.3 Command dan Action Points

- 2 AP per kuartal (dari `scenario.json`).
- Command: `ENACT_POLICY`, `LOBBY_FACTION`, `RESPOND_EVENT`, `CANCEL_PENDING`, `END_QUARTER`, masing-masing dengan `commandId`.
- `ENACT_POLICY` dan `LOBBY_FACTION` masuk `pendingCommands` dan langsung memesan AP. `CANCEL_PENDING` mengembalikannya. `RESPOND_EVENT` biayanya 0 AP.

### 5.4 Lobi Fraksi

`LOBBY_FACTION {factionId}`: 1 AP + kas (default 2 T), +15 support sementara **hanya untuk voting kuartal ini**, maksimal 1 lobi per fraksi per kuartal.

### 5.5 Voting

- Skor fraksi = `support + preference[category] × 10 + lobbyBonus`. Fraksi setuju sebagai blok jika skor ≥ 50. Kebijakan lolos jika kursi setuju ≥ 51/100.
- **Voting gagal:** AP tetap terpakai, `trust −2,0`, cooldown 1 kuartal, biaya kas tidak dipotong, dicatat di ledger (`VOTE_FAILED`).

### 5.6 Kementerian

- 4 kementerian (Keuangan, Sosial, Energi, Dalam Negeri). Effectiveness 40..90. Naik +1 per kebijakan sedomain yang aktif, dan bisa berubah lewat event.
- Pengali efek indikator sedomain: `0.8 + 0.4 × (eff − 40) / 50`. Tidak berlaku untuk biaya kas.

### 5.7 Event

- Dipilih di akhir kuartal N (PRNG seeded), lalu menjadi `pendingEvents` di kuartal N+1. Jumlah maksimal per kuartal dari `scenario.json` (default 1).
- **`END_QUARTER` ditolak (`EVENT_RESPONSE_REQUIRED`) selama ada event pending.**
- Setiap event wajib punya minimal satu opsi `"neutral": true`.

### 5.8 Proyeksi kebijakan

Arah + rentang `[expected × 0,75, expected × 1,25]`. Biaya kas ditampilkan pasti. `projectPolicy()` murni dan tanpa RNG.

### 5.9 Baseline dynamics

Parameter di `content/baseline.json`: inflasi kembali 25% menuju 3,0%; pengangguran `Δ = −0,15 × (growth − 2,5)`; approval kembali 10% ke 50; growth kembali 20% ke 4,0; kas `+ pendapatan − belanja − biaya kebijakan aktif`; kas < 0 → `fiscalHealth −3,0`/kuartal. Semua angka placeholder.

### 5.10 Urutan resolusi end-quarter

1. Validasi command dan AP
2. Respons event
3. Lobi
4. Voting (urut `policyId`)
5. Biaya awal
6. Efek IMMEDIATE
7. Tick kebijakan aktif dan cooldown
8. Baseline
9. Effectiveness kementerian
10. Normalize + clamp
11. Pilih event berikutnya
12. Laporan, `turn += 1`, status `completed`, arketipe

### 5.11 Akhir kampanye

Tidak ada kondisi kalah. Laporan akhir berisi grafik 8 indikator, kronologi, keputusan paling berdampak, dan **arketipe** dari `content/archetypes.json` (prioritas, yang pertama cocok dipakai, fallback "Pemerintahan Seimbang"). Arketipe tanpa label baik/buruk.

### 5.12 Save system

- Lokasi: **`Documents/REPUBLIKA/saves/`** (path diambil dari Tauri `documentDir`). Pengaturan di `Documents/REPUBLIKA/settings.json`, log di `Documents/REPUBLIKA/logs/`.
- File: `autosave.json` (+ `autosave.bak.json`, versi sebelumnya) dan `slot-1.json` … `slot-5.json`.
- Isi save: `{ saveFormatVersion, appVersion, rulesetVersion, contentHash, savedAt, label, state, history }`. `history` berisi laporan dan ledger per kuartal untuk Riwayat dan Laporan Akhir.
- **Autosave** setelah setiap end-quarter dan setelah pelantikan.
- **Penulisan atomik:** tulis ke `*.tmp`, flush, lalu rename. Dikerjakan di command Rust `save_atomic`. File korup tidak boleh membuat game crash: tampilkan "Save rusak", lalu tawarkan `.bak` bila ada.
- Memuat slot manual melanjutkan campaign dari titik itu. Slot lain tidak terpengaruh.
- Save **boleh diedit pemain** (tanpa anti-cheat). Loader tetap memvalidasi dengan Zod. File tidak valid ditolak dengan pesan jelas, bukan crash.

### 5.13 Versi aplikasi dan migrasi save

- Update dilakukan **manual**: pemain mengunduh installer baru dari GitHub Releases. Tidak ada auto-update atau pengecekan versi online.
- `saveFormatVersion` dimigrasi lewat rantai migrator murni `vN → vN+1` di `packages/simulation/src/save/migrations/`. Setiap migrator wajib punya test dengan contoh file save versi lama di `fixtures/saves/`.
- `rulesetVersion` berbeda: campaign **dilanjutkan dengan aturan baru**. ID konten yang dihapus atau diganti dipetakan lewat `packages/game-data/migrations/ruleset-<N>.json`. Kebijakan aktif yang tidak lagi ada dihentikan dengan entri ledger `RULESET_MIGRATED`. Save ditandai "dilanjutkan dengan aturan v{N}".
- **Alur "versi sebelumnya":** `settings.json` menyimpan `lastRunAppVersion`. Saat versi app berubah, atau dari menu **Muat Permainan → Impor dari versi sebelumnya**:
  1. Jika folder `saves/` berisi save versi lama, tampilkan daftar dan tawarkan migrasi.
  2. Jika tidak ada (instalasi baru), tanyakan **"Apakah Anda pernah bermain di versi sebelumnya?"**. Ya → pemilih file/folder untuk mencari save lama. Tidak → lanjut ke menu utama. Pertanyaan ini hanya muncul sekali, dicatat di `settings.json`.
  3. Sebelum migrasi, file asli **dicadangkan** ke `saves/backup-v{versiLama}/`. Migrasi tidak pernah menimpa file asli tanpa cadangan.

### 5.14 Bahasa

Seluruh teks UI dalam Bahasa Indonesia di `apps/desktop/src/copy/id.ts`. Identifier kode, nama file, dan commit message dalam bahasa Inggris. Format angka memakai `Intl.NumberFormat('id-ID')`.

### 5.15 Gaya visual dan layar

- Gabungan dashboard korporat dan nuansa "ruang rapat negara": navy/arang, aksen emas kusam dan merah marun secukupnya, judul serif, data sans-serif, kartu bergaris tipis seperti map dokumen.
- **Font dibundel lokal** (lisensi OFL). Tidak boleh ada aset eksternal.
- Desktop-only: ukuran jendela minimum **1280×720**, layout sidebar, dukungan fullscreen/windowed, dan pengaturan skala UI (90/100/110/125%).
- Tidak memakai lambang negara asli, foto tokoh nyata, atau logo partai.

### 5.16 Konten: latar nyata, tokoh fiktif

Negara, lembaga (MPR, kementerian, dan lembaga negara lain), serta 38 provinsi memakai nama nyata Indonesia. Nama orang fiktif, termasuk tokoh yang muncul di event dan random event. Partai dan fraksi tetap fiktif agar tidak ada klaim atau konflik dengan partai nyata; nama tokohnya juga fiktif. Tidak ada foto tokoh nyata, lambang negara asli, atau logo partai nyata (§5.15). Kebijakan dan angka simulation tetap fiktif.

### 5.17 Anggaran performa (wajib dipantau)

Target ini diukur di Windows 11 di layar dashboard setelah 20 kuartal:

| Metrik                                         | Target    | Batas maksimal |
| ---------------------------------------------- | --------- | -------------- |
| Total RAM semua proses app (termasuk WebView2) | ≤ 150 MB  | 200 MB         |
| JS heap                                        | ≤ 30 MB   | 50 MB          |
| Ukuran installer                               | ≤ 10 MB   | 15 MB          |
| Cold start sampai menu utama                   | ≤ 1,5 dtk | 3 dtk          |
| Resolve 1 kuartal                              | ≤ 20 ms   | 50 ms          |
| Ukuran file save (20 kuartal)                  | ≤ 300 KB  | 1 MB           |

Cara mencapainya:

- Route di-_lazy load_, chart memakai SVG sendiri, dan hanya komponen shadcn yang dipakai yang ikut dibundel.
- Tidak ada polling atau interval yang berjalan saat idle. Animasi hanya transisi CSS ringan, dan `prefers-reduced-motion` dihormati.
- State UI tidak menduplikasi `GameState`. History hanya dimuat saat halaman Riwayat atau Laporan dibuka.
- Rust release profile: `opt-level = "s"`, `lto = true`, `codegen-units = 1`, `strip = true`, `panic = "abort"`.
- Hanya plugin Tauri yang dibutuhkan, dengan capabilities minimal: fs dibatasi ke `Documents/REPUBLIKA/**`, dialog hanya untuk pemilih file impor, dan tanpa shell, http, atau updater.
- WebView2: `webviewInstallMode = embedBootstrapper` (Windows 10/11 umumnya sudah punya WebView2).
- Setiap PR yang menambah dependensi runtime wajib menyebut ukurannya di commit message.

### 5.18 Offline dan privasi

App tidak melakukan koneksi jaringan apa pun. CSP Tauri melarang `connect-src` ke remote. Tidak ada telemetri. Log hanya lokal, berukuran maksimal 1 MB dengan rotasi 3 file, dan tanpa data pribadi selain nama presiden yang sudah ada di save.

## 6. Cara kerja agent

- Kerjakan **satu bagian per satu waktu**, sesuai urutan di file prompt tahap.
- Baca bagian terkait di `AGENT.md`, `docs/TDD.md`, dan `docs/SIMULATION_RULES.md` sebelum menulis kode.
- Setelah tiap bagian: `pnpm lint && pnpm typecheck && pnpm test` harus hijau, lalu commit `feat(stage-X.Y): ringkasan`.
- Akhir tahap: tulis `docs/PROGRESS.md`, lalu **berhenti** dan tunggu review.
- **Jangan menambah fitur di luar prompt.** Ide tambahan ditulis di `docs/OPEN_QUESTIONS.md`.
- Ambiguitas aturan simulasi: pilih opsi paling sederhana, tandai `// DECISION:`, dan catat di `docs/DECISIONS.md`.
- **Jangan menulis atau mengubah konten final** di `packages/game-data/content/`. Pakai `fixtures/` atau ID `PLACEHOLDER-*`.
- Fixture snapshot simulasi hanya diubah jika ruleset sengaja berubah. Naikkan `rulesetVersion` dan jelaskan di commit.

## 7. Perintah standar

```
pnpm install
pnpm dev            # Tauri dev (jendela desktop, storage file asli)
pnpm dev:web        # Vite di browser, MemoryStorage — untuk iterasi UI cepat & E2E (bukan produk rilis)
pnpm lint | typecheck | test | test:e2e
pnpm content:check
pnpm sim --seed=abc --strategy=random --turns=20
pnpm balance --runs=5000
pnpm build          # tauri build → installer NSIS di src-tauri/target/release/bundle
pnpm perf:report    # ringkasan ukuran bundle & installer (Tahap 5)
```

## 8. Definition of Done umum

- Lint, typecheck, dan test hijau. Tidak ada `any` baru tanpa alasan.
- Fungsi domain baru punya unit test. Perubahan aturan tercermin di `SIMULATION_RULES.md`.
- Teks UI baru ada di `copy/id.ts`.
- Tidak menambah dependensi runtime tanpa alasan dan tanpa menyebut ukurannya.

## 9. Rencana lanjutan (JANGAN dikerjakan sekarang)

- **Android** (Tauri 2 mobile). Persiapan yang sudah tercakup: engine murni, `SaveStorage` sebagai interface, dan semua teks di `copy/`. Hindari API khusus Windows di luar `platform/`.
- Fitur pasca-MVP dari GDD (multi-periode, ekonomi sektoral, dan lain-lain).
