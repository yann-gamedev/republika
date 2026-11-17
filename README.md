# REPUBLIKA

Game desktop Windows 10/11 x64, single-player, offline, berbahasa Indonesia. Stack: Tauri 2, Vite, React, TypeScript, pnpm workspaces. Aturan utama: [AGENT.md](AGENT.md); addendum v0.3 mengesampingkan rancangan web lama.

## Status Tahap 1

Fondasi tersedia: schema domain, validasi dan loader konten, shell Tauri, serta UI mock. Menu, pelantikan, dashboard, kebijakan, parlemen, kabinet, peristiwa, dan riwayat memakai data demonstrasi; **belum ada simulasi**.

- Mock UI menggambarkan 20 kuartal; `packages/game-data/content/scenario.json` masih placeholder `maxTurns: 4`. Bukan kampanye 20 kuartal yang sudah bisa dimainkan.
- Browser memakai `MemoryStorage` tanpa disk. `TauriFileStorage` masih stub; save/load file, autosave, dan migrasi belum aktif.
- Preferensi UI hanya bertahan selama sesi; belum ada persistensi pengaturan desktop. Fullscreen memakai adapter platform (Tauri native atau Fullscreen API browser); pemeriksaan manual toggle native masih diperlukan.
- Font dibundel lokal dengan lisensi OFL; tidak memakai CDN. Runtime rilis tidak membutuhkan jaringan, akun, DB, server, atau telemetri. Instalasi dependency dan pengunduhan WebView2 dapat membutuhkan internet; Vite dev memakai server lokal khusus pengembangan.
- Identifier `id.republika.game` sudah dikonfirmasi pemilik. Jangan diubah setelah rilis.
- Run GitHub Actions aktual, instalasi artifact oleh pemilik, dan pengukuran RAM masih pending. Lihat [RELEASE.md](docs/RELEASE.md) dan [PROGRESS.md](docs/PROGRESS.md) untuk bukti verifikasi tahap.

## Prasyarat Windows

1. Pasang Node.js LTS **versi >=22**, melalui installer x64 dari <https://nodejs.org/>. Buka ulang PowerShell, cek `node --version` dan `npm --version`.
2. Pasang pnpm versi terkunci:
   ```powershell
   npm install --global pnpm@9.15.4
   pnpm --version
   ```
3. Pasang **Visual Studio Build Tools 2022** dari <https://visualstudio.microsoft.com/visual-cpp-build-tools/>. Pilih workload **Desktop development with C++**, termasuk MSVC x64/x86 dan Windows SDK.
4. Pasang **Rust stable** melalui `rustup-init.exe` dari <https://rustup.rs/>. Gunakan toolchain MSVC Windows x64, lalu buka ulang terminal:
   ```powershell
   rustup default stable
   rustc --version
   cargo --version
   ```
5. Pastikan **Microsoft Edge WebView2 Runtime** tersedia; bila belum, pasang Evergreen Runtime dari <https://developer.microsoft.com/microsoft-edge/webview2/>. WebView2 dipakai jendela Tauri. Installer saat ini memakai `embedBootstrapper`; pemasangan WebView2 yang belum tersedia dapat memerlukan unduhan.

## Menjalankan

Jalankan dari root repo, satu perintah per langkah:

```powershell
pnpm install
pnpm dev
```

`pnpm dev` membuka shell Tauri; file storage belum aktif pada Tahap 1. Untuk iterasi UI tanpa Rust/Tauri:

```powershell
pnpm dev:web
```

Browser dev bukan produk rilis. Ukuran jendela desktop default 1440×900, minimum 1280×720.

## Pemeriksaan

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm content:check
pnpm build:web
pnpm exec playwright install chromium
pnpm test:e2e
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```

`content:check` membaca JSON dari disk, menolak schema/referensi tidak valid, dan memperingatkan konten `PLACEHOLDER`. Hasil pemeriksaan harus dicatat dari output aktual, bukan diasumsikan dari daftar perintah ini. CLI `sim`, `balance`, dan `perf:report` belum tersedia pada Tahap 1.

## Build Windows

```powershell
pnpm build
```

Target installer NSIS: `apps/desktop/src-tauri/target/release/bundle/nsis/`. Workflow desktop mengunggah installer sebagai artifact, **bukan GitHub Release**. Build sukses belum membuktikan installer terpasang, jendela terbuka, atau target RAM tercapai.

## Peta repo

| Lokasi                                        | Isi                                                            |
| --------------------------------------------- | -------------------------------------------------------------- |
| `apps/desktop`                                | Shell React/Tauri, copy Indonesia, chart SVG, adapter platform |
| `packages/shared`                             | Tipe dan schema Zod domain/konten/save                         |
| `packages/game-data`                          | JSON placeholder, import statis, loader, validator, hash       |
| `packages/simulation`                         | Batas package engine murni; resolusi simulasi belum dibuat     |
| `tools`                                       | Ruang CLI tahap lanjutan                                       |
| `docs/PANDUAN-KONTEN.md`                      | Format konten sesuai schema Tahap 1                            |
| `docs/SIMULATION_RULES.md`                    | Kontrak aturan dan batas implementasi                          |
| `docs/DECISIONS.md`, `docs/OPEN_QUESTIONS.md` | Keputusan dan gate yang belum ditutup                          |

`docs/GDD.md` dan `docs/TDD.md` memuat konversi teks seluruh 9 halaman PDF v0.1: GDD halaman 1–4, TDD halaman 1 dan 5–9 (sampul/daftar isi bersama diduplikasi). Penomoran, tabel, pseudocode, dan rancangan historis web/API/DB dipertahankan. Addendum v0.3 di `AGENT.md` menimpa rancangan lama; arsip ini bukan klaim fitur sudah berjalan.
