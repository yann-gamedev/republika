# Performa REPUBLIKA

Anggaran resmi ada di `AGENT.md` §5.17. Dokumen ini berisi cara mengukur dan hasil pengukuran terakhir.

## Cara mengukur

### RAM (wajib manual di Windows)

1. Buka REPUBLIKA dari installer (bukan `pnpm dev`), mainkan sampai kondisi yang diukur (menu utama, atau dashboard setelah 20 kuartal).
2. Biarkan **jendela REPUBLIKA tetap di depan** selama ±10 detik. Windows memangkas memori jendela yang di belakang/diminimalkan, sehingga angkanya turun palsu.
3. Task Manager → tab **Details** → klik kanan judul kolom → _Select columns_ → centang **Memory (active private working set)**.
4. Jumlahkan baris `republika.exe` + semua `msedgewebview2.exe` **milik REPUBLIKA**. Untuk memastikan miliknya, tambahkan kolom _Command line_ dan cari `id.republika.game` (folder data WebView2 app ini).
5. Catat angkanya di tabel hasil di bawah.

> **Catatan jujur:** WebView2 (Microsoft Edge) sendiri memakan sekitar **70–100 MB** untuk jendela kosong: proses browser, GPU, renderer, network, dan storage. Itu batas bawah realistis untuk app Tauri di Windows dan tidak bisa diturunkan dari kode game. Target 150 MB berarti game hanya punya ruang ±50–80 MB di atas WebView2.

### Lainnya

| Metrik                  | Cara                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Ukuran installer        | `pnpm build`, lalu `pnpm perf:report` (bagian _Installer_).                                                                       |
| Bundle JS/CSS per chunk | `pnpm perf:report`; treemap interaktif di `apps/desktop/dist-stats/stats.html`.                                                   |
| JS heap                 | Otomatis di `pnpm test:e2e` (`test-results/final-metrics.json`, setelah 20 kuartal). Manual: DevTools → Memory.                   |
| Cold start              | Log lokal mencatat `menu siap (navigasi +X ms)` dengan waktu ISO; bandingkan dengan waktu mulai proses (`Get-Process republika`). |
| Resolve 1 kuartal       | Log lokal `resolve kuartal N: X ms`; test anggaran di `packages/simulation/test/determinism.test.ts`.                             |
| Ukuran save             | `pnpm balance` (rata-rata/maksimum), atau lihat file di `Documents/REPUBLIKA/saves/`.                                             |

## Hasil (18 November 2026, Windows 11 x64, mesin pengembangan)

| Metrik                     | Target    | Batas  | Hasil                                              | Status               |
| -------------------------- | --------- | ------ | -------------------------------------------------- | -------------------- |
| Total RAM (app + WebView2) | ≤ 150 MB  | 200 MB | **Belum terukur andal** — lihat catatan            | Perlu diukur pemilik |
| JS heap setelah 20 kuartal | ≤ 30 MB   | 50 MB  | 12,7–18,2 MB (Chromium Playwright, 4 run)          | ✓                    |
| Ukuran installer           | ≤ 10 MB   | 15 MB  | 3,15 MiB (3.307.718 byte)                          | ✓                    |
| Cold start sampai menu     | ≤ 1,5 dtk | 3 dtk  | ±1,49 dtk (1 pengukuran, build rilis tanpa instal) | ✓ (tipis)            |
| Resolve 1 kuartal          | ≤ 20 ms   | 50 ms  | 0,25–1,05 ms rata-rata (5 strategi bot, Node)      | ✓                    |
| Ukuran save 20 kuartal     | ≤ 300 KB  | 1 MB   | 111–215 KiB (5 strategi bot, format v2)            | ✓                    |

**Catatan RAM.** Pengukuran otomatis lewat PowerShell tidak konsisten, karena jendela yang dibuka skrip tidak selalu di depan sehingga Windows memangkas working set-nya:

- Run pertama (jendela baru): jumlah _private bytes_ 264 MB dan _working set_ 456 MB. Kedua angka melebih-lebihkan: private bytes proses GPU (±118 MB) sebagian besar adalah memori driver yang dipesan, dan working set menghitung halaman bersama berkali-kali.
- Run berikutnya: _private working set_ 28,6 MB dan 5,9 MB. Ini terlalu rendah karena jendela dipangkas.
- `--disable-gpu` justru menaikkan angka (84,8 MB private working set), jadi tidak dipakai.

Angka yang sah adalah kolom _Memory (active private working set)_ di Task Manager dengan jendela di depan (langkah di atas). Jika melewati 200 MB, opsi dicatat di `OPEN_QUESTIONS.md`.

## Optimasi yang sudah dilakukan

- Semua rute di-_lazy load_; chart memakai SVG sendiri; History/ledger hanya dimuat saat halaman Riwayat, Laporan, atau Kabinet dibuka dan dilepas saat halaman ditutup (state lokal komponen).
- Tidak ada polling atau interval saat idle. Satu-satunya timer adalah penutup toast sekali jalan (6 detik).
- `@tauri-apps/api` dimuat lazy di storage (sebelumnya ikut di bundle awal).
- Ledger di save disimpan ringkas: `id` dan `after` dihitung ulang saat dimuat (−9% ukuran save).
- Komponen dan dependensi tak terpakai dihapus (`separator`, `@radix-ui/react-separator`).
- Rust release profile: `opt-level = "s"`, `lto`, `codegen-units = 1`, `strip`, `panic = "abort"`.
- Plugin Tauri minimal: opener dan dialog hanya dipanggil dari command Rust dengan path tetap; tidak ada izin plugin untuk JavaScript.

## Isi bundle (ringkas dari `pnpm perf:report`)

Entry JS 477,8 kB (gzip 147,2 kB). Penyumbang terbesar sebelum minify: `react-dom` (638 KiB), kode UI (273 KiB), `zod` (136 KiB), `@tauri-apps/api` (113 KiB, dimuat lazy), `tailwind-merge` (100 KiB). Engine (`@republika/simulation`), konten (`game-data`), dan `shared` bersama-sama ±128 KiB.
