# Panduan pengembang REPUBLIKA

Aturan utama ada di [AGENT.md](../AGENT.md) (addendum v0.3 mengesampingkan rancangan web lama di GDD/TDD).

## Prasyarat Windows

1. **Node.js LTS ≥ 22** (installer x64 dari <https://nodejs.org/>). Buka ulang PowerShell, cek `node --version`.
2. **pnpm** versi terkunci:
   ```powershell
   npm install --global pnpm@9.15.4
   ```
3. **Visual Studio Build Tools 2022** dengan workload _Desktop development with C++_ (MSVC x64/x86 + Windows SDK).
4. **Rust stable** lewat `rustup-init.exe` dari <https://rustup.rs/> (toolchain MSVC x64):
   ```powershell
   rustup default stable
   ```
5. **Microsoft Edge WebView2 Runtime** (umumnya sudah ada di Windows 10/11).

## Menjalankan

```powershell
pnpm install
pnpm dev        # jendela Tauri, save asli di Documents/REPUBLIKA
pnpm dev:web    # browser, MemoryStorage (iterasi UI cepat, bukan produk rilis)
```

## Pemeriksaan

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm content:check
pnpm exec playwright install chromium
pnpm test:e2e          # build mode e2e (kampanye 20 kuartal) + Playwright + axe
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

## Alat konten dan performa

| Perintah                                                    | Kegunaan                                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| `pnpm content:check`                                        | Validasi konten + peringatan kualitas (lihat `docs/PANDUAN-KONTEN.md`) |
| `pnpm sim --seed=abc --strategy=greedy-approval --turns=20` | Satu kampanye bot → laporan markdown (`tools/sim/README.md`)           |
| `pnpm balance --runs=5000 --out=docs/balance/latest.md`     | Monte Carlo balancing (`tools/balance/README.md`)                      |
| `pnpm perf:report`                                          | Ukuran bundle per chunk/paket dan installer (`docs/PERFORMANCE.md`)    |

## Build dan rilis

```powershell
pnpm build      # installer NSIS di apps/desktop/src-tauri/target/release/bundle/nsis/
```

Rilis memakai tag Git. Langkah lengkap ada di [RELEASE.md](RELEASE.md):

1. `pnpm version:set 0.1.0-rc.1` (menyinkronkan versi di package.json, tauri.conf.json, Cargo.toml/Cargo.lock, dan `APP_VERSION`).
2. Perbarui `CHANGELOG.md`, lalu commit.
3. Buat dan push tag `v0.1.0-rc.1`. Workflow `release.yml` membuat **draft** GitHub Release berisi installer + checksum SHA-256.
4. Periksa draft, lalu publikasikan manual.

## Peta repo

| Lokasi                                     | Isi                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `apps/desktop`                             | UI React + shell Tauri; `src/platform/` satu-satunya akses file/Tauri   |
| `apps/desktop/src-tauri`                   | Rust minimal: command file I/O, buka folder save, impor save            |
| `packages/shared`                          | Tipe dan schema Zod domain/konten/save                                  |
| `packages/game-data`                       | Konten JSON, loader, validator, hash, peta migrasi ruleset              |
| `packages/simulation`                      | Engine murni (resolusi kuartal, migrasi save); `test-utils/` berisi bot |
| `tools/sim`, `tools/balance`, `tools/perf` | CLI penulis konten dan performa                                         |
| `docs/`                                    | Aturan simulasi, panduan konten, keputusan, progres, performa, rilis    |

`docs/GDD.md` dan `docs/TDD.md` adalah arsip konversi PDF v0.1. Rancangan web/API/DB di sana tidak berlaku lagi.
