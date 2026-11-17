# Progres REPUBLIKA — Tahap 1

Tanggal bukti lokal: 17 November 2026, Windows x64.

## Status

**Implementasi fondasi tersedia; gate akhir Tahap 1 belum ditutup.** Menunggu CI GitHub aktual, instalasi artifact oleh pemilik, RAM awal, dan review visual/native. Tidak melanjutkan Tahap 2.

| Bagian             | Hasil                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 Tooling        | pnpm workspace, TypeScript strict, ESLint boundary rules, Prettier, Vitest, fast-check, Playwright tersedia.                                |
| 1.2 Domain         | Tipe/schema Zod state, command, requirement, effect, content, ledger, report, save, settings; indikator integer ×10 dan kas integer miliar. |
| 1.3 Konten         | Import JSON statis, konversi presisi, validasi lintas-file, hash kanonis SHA-256, CLI Indonesia dan test penolakan presisi tersedia.        |
| 1.4 Desktop        | Tauri 2, layar mock lengkap, route lazy, chart SVG, font lokal OFL, adapter platform dan MemoryStorage; TauriFileStorage tetap stub.        |
| 1.5 CI/dokumentasi | Workflow Ubuntu checks dan Windows NSIS/artifact tersedia; dokumentasi dan konversi PDF lengkap. Run GitHub belum tersedia.                 |

Identifier permanen `id.republika.game` sudah dikonfirmasi pemilik. UI mock menggambarkan kampanye 20 kuartal; skenario konten placeholder tetap 4 kuartal. Aksi mock mencatat pilihan/feedback tanpa mengubah `GameState`. Belum ada engine, save filesystem, autosave, migrasi, atau persistensi settings.

## Bukti verifikasi lokal

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

## Ukuran dan performa

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

## Dokumentasi

PDF sumber tersedia di `docs/source/REPUBLIKA_GDD_TDD_v0.1.pdf`, bukan hilang. Konversi mencakup 9/9 halaman: GDD halaman 1–4 (§1–§5), TDD halaman 1 dan 5–9 (§6–§11). Sampul/daftar isi bersama diduplikasi; teks dibandingkan dengan ekstraksi sumber. Pemeriksaan visual PDF belum dilakukan. Rancangan web/API/DB historis dipertahankan dengan catatan wajib bahwa addendum v0.3 menimpa.

## Gate akhir dan tindakan pemilik

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

## Catatan riwayat kerja

Repo awal belum memiliki commit. Pekerjaan terlanjur terkumpul sebelum commit per bagian; pengelompokan commit penutupan mengikuti 1.1–1.5, bukan klaim bahwa setiap snapshot antara sudah diuji terpisah. Bukti perintah di atas berlaku untuk keadaan akhir fondasi. Tidak membuat release/tag atau menginstal aplikasi atas nama pemilik.
