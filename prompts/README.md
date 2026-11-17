# Cara memakai prompt REPUBLIKA

## Persiapan (sekali saja)
0. Instal di Windows: Node LTS, pnpm, Rust (`rustup`), dan Visual Studio Build Tools (workload "Desktop development with C++").
1. Buat folder repo kosong, lalu `git init`.
2. Taruh `AGENT.md` dan `CLAUDE.md` di root repo.
3. Taruh folder `prompts/` ini di root repo.
4. Taruh `PANDUAN-KONTEN.md` di `docs/`.
5. Taruh PDF GDD/TDD di `docs/source/REPUBLIKA_GDD_TDD_v0.1.pdf` (dikonversi di Bagian 1.5).

## Urutan tahap

| Tahap | File | Bagian | Hasil | Konten yang Anda tulis |
|---|---|---|---|---|
| 1 | `TAHAP-1-fondasi.md` | 5 | Repo, tipe, schema, jendela Tauri + UI mock, CI Windows | — |
| 2 | `TAHAP-2-engine.md` | 6 | Engine deterministik + 3 kebijakan | 3 kebijakan slice + baseline + skenario |
| 3 | `TAHAP-3-vertical-slice.md` | 5 | 4 kuartal yang bisa dimainkan + autosave file | 2 event + 3 fraksi sementara |
| 4 | `TAHAP-4-konten-mvp.md` | 7 | 20 kuartal, semua sistem tersambung | 6 fraksi, 12 kebijakan, 15 event, arketipe |
| 5 | `TAHAP-5-save-rilis.md` | 6 | Save slot, migrasi versi, optimasi RAM, balancing, installer + GitHub Release | Tuning angka hasil Monte Carlo |

## Cara memberikan prompt ke agent

**Opsi A (disarankan): per bagian.** Kirim pesan seperti ini:

> Baca `prompts/TAHAP-2-engine.md`. Kerjakan **Bagian 2.3** saja, lalu berhenti.

Konteksnya lebih kecil, hasilnya lebih rapi, dan mudah direview.

**Opsi B: satu tahap penuh.**

> Baca `prompts/TAHAP-1-fondasi.md` dan kerjakan semua bagian berurutan. Commit tiap bagian. Berhenti di akhir tahap.

Cocok untuk Tahap 1 yang ringan.

## Gate review (jangan dilewati)
Setiap akhir tahap ada **checklist gate**. Cek sendiri sebelum lanjut. Gate terpenting ada di akhir **Tahap 3**: mainkan 4 kuartal dan jawab dengan jujur, *apakah ini menyenangkan?* Kalau tidak, perbaiki desainnya dulu sebelum menambah konten di Tahap 4.

## Kalau sesi agent terputus
> Baca `docs/PROGRESS.md` dan `git log -10`, lalu lanjutkan dari bagian terakhir yang belum selesai di `prompts/TAHAP-X-*.md`.
