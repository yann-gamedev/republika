# TAHAP 5 — Save slot, migrasi versi, optimasi, balancing, dan rilis

**Tujuan tahap:** sistem save lengkap (autosave + 5 slot), save bisa dibawa ke versi aplikasi baru, RAM dan ukuran installer memenuhi anggaran, angka sudah di-balance lewat Monte Carlo, dan installer Windows dirilis di GitHub Releases. Siap closed playtest.

**Wajib dibaca:** `AGENT.md` §5.12, §5.13, §5.17, §5.18.

---

## Bagian 5.1 — Save slot manual dan layar Simpan/Muat

**Tugas**
- Layar **Simpan & Muat** (dari Menu Utama dan dari menu dalam game): autosave + 5 slot. Tiap slot menampilkan label "Presiden {nama} — {kabinet} — Kuartal X", tanggal simpan, versi aplikasi, dan ringkasan 3 indikator.
- Aksi: simpan ke slot (konfirmasi jika menimpa), muat, ganti nama label, dan hapus (konfirmasi; file dipindahkan ke `saves/trash/`, bukan dihapus permanen).
- Tombol **"Buka folder save"** membuka `Documents/REPUBLIKA/saves` di Explorer (lewat plugin opener dengan scope dibatasi ke folder itu).
- Muat dengan perubahan yang belum tersimpan (lebih dari autosave terakhir) → konfirmasi.

**Acceptance criteria**
- Test: simpan → main 2 kuartal → muat slot → hash state sama dengan saat disimpan. Slot lain tidak berubah.

## Bagian 5.2 — Migrasi save dan alur "versi sebelumnya"

**Tugas**
- `packages/simulation/src/save/`: `migrateSave(raw) → SaveFile` berupa rantai migrator `saveFormatVersion` (murni), lalu `migrateRuleset(state, fromVersion, toVersion, maps)` memakai `packages/game-data/migrations/ruleset-<N>.json` (AGENT §5.13).
- Buat **contoh migrasi nyata** untuk latihan: `saveFormatVersion` 1 → 2 (misalnya menambah field `playTimeSeconds` dengan default 0). Simpan contoh save v1 di `test/fixtures/saves/`.
- `settings.json` mencatat `lastRunAppVersion` dan `askedAboutPreviousVersion`.
- Alur saat app dibuka dengan versi baru, atau lewat **Muat → Impor dari versi sebelumnya**:
  1. Pindai `saves/`. Jika ada save versi lama → tampilkan daftar → "Perbarui save ke versi ini?".
  2. Jika tidak ada dan belum pernah ditanya → **"Apakah Anda pernah bermain di versi sebelumnya?"**. Ya → dialog pilih file/folder. Tidak → menu utama. Catat agar tidak bertanya lagi.
  3. Cadangkan file asli ke `saves/backup-v{versiLama}/` sebelum migrasi.
  4. Tampilkan hasil: berapa save berhasil, gagal (dengan alasan), dan catatan "dilanjutkan dengan aturan v{N}" jika ruleset berubah.
- `docs/RELEASE.md`: checklist rilis yang **wajib** dijalankan setiap kali format save atau ID konten berubah (naikkan versi, tulis migrator/peta, tambah fixture save lama).

**Acceptance criteria**
- Test: fixture save v1 → migrasi → valid sebagai v2 dan bisa dilanjutkan sampai kuartal berikutnya.
- Test: kebijakan yang dihapus dari konten dihentikan dengan ledger `RULESET_MIGRATED`.
- Test: file asli selalu ada di folder backup setelah migrasi, termasuk saat migrasi gagal.

## Bagian 5.3 — Pengaturan dan kehalusan desktop

**Tugas**
- Layar **Pengaturan**: skala UI (90/100/110/125%), fullscreen/windowed (juga lewat `F11`), dan tombol "Kembalikan default". Disimpan di `settings.json`.
- Konfirmasi saat menutup jendela jika kuartal berjalan belum di-autosave (sebenarnya selalu tersimpan setelah end-quarter, tetapi command yang diantrekan belum). Pilihan: "Keluar (antrean kebijakan kuartal ini hilang)" / "Batal".
- Logging lokal ringan: error dan durasi resolve ke `Documents/REPUBLIKA/logs/` (maksimal 1 MB, rotasi 3 file), tanpa data jaringan. Pesan error fatal menampilkan lokasi file log supaya mudah dilaporkan di GitHub Issues.
- Error boundary React di tingkat layar dengan tombol "Kembali ke Menu Utama". Autosave tetap aman.

**Acceptance criteria**
- Mengubah skala UI dan fullscreen tersimpan setelah restart. Error yang dipaksa di 1 layar tidak membuat app crash.

## Bagian 5.4 — Optimasi RAM dan ukuran

**Tugas**
- `pnpm perf:report`: ukuran bundle JS/CSS per chunk (via `rollup-plugin-visualizer` saat build, dev-only), ukuran installer, dan daftar dependensi runtime beserta ukurannya.
- Audit dan perbaiki sampai memenuhi AGENT §5.17:
  - Buang komponen/dependensi yang tidak terpakai.
  - Pastikan route lazy dan chart hanya di-render saat terlihat.
  - Riwayat dan ledger dimuat sesuai kebutuhan, lalu dilepas saat keluar halaman.
  - Tidak ada listener atau interval yang bocor (cek di React DevTools Profiler).
  - Batasi ukuran ledger per kuartal di save: simpan semua entri, tetapi tanpa field turunan yang bisa dihitung ulang.
- `docs/PERFORMANCE.md`: cara mengukur RAM di Windows (Task Manager → Details, jumlahkan `republika.exe` + `msedgewebview2.exe` milik app), hasil sebelum/sesudah, dan catatan **jujur bahwa WebView2 sendiri memakan sekitar 70–100 MB**, sehingga itu batas bawah realistisnya.

**Acceptance criteria**
- Hasil pengukuran tercatat di `PERFORMANCE.md`. Jika ada target yang terlewati, tulis penyebab dan opsinya di `OPEN_QUESTIONS.md` (jangan dipaksa dengan hack).

## Bagian 5.5 — Balancing Monte Carlo

**Tugas**
- `pnpm balance --runs=5000 [--strategies=all] [--out=docs/balance/latest.md]`, dijalankan di Node (engine murni), deterministik per seed, boleh memakai worker threads.
- Laporan: persentil 5/25/50/75/95 tiap indikator akhir per strategi, frekuensi arketipe, tingkat lolos voting per kebijakan, frekuensi pemilihan oleh bot greedy, event yang tidak pernah muncul, indikator yang menempel di batas lebih dari 30% waktu, deteksi softlock, dan ukuran file save rata-rata/maksimum.
- Bendera otomatis untuk strategi dominan dan sejenisnya. **Agent tidak mengubah angka konten**: rekomendasi ditulis di laporan.

**Acceptance criteria**
- 0 softlock pada 5000 run. Ukuran save maksimum ≤ 1 MB.

## Bagian 5.6 — Packaging dan rilis GitHub

**Tugas**
- Bundle **NSIS** installer (per-user, tanpa admin), ikon app (orisinal, multi-ukuran), nama produk, versi dari satu sumber (`package.json` disinkronkan ke `tauri.conf.json` dan `Cargo.toml` lewat script `pnpm version:set`).
- GitHub Actions `release.yml`: dipicu oleh tag `v*` → build di windows-latest → draft GitHub Release dengan installer `.exe`, checksum SHA-256, dan isi `CHANGELOG.md` bagian versi tersebut.
- `README.md` untuk pemain: cara unduh dan instal, **penjelasan peringatan SmartScreen** ("Windows protected your PC" → More info → Run anyway) karena installer belum ditandatangani, lokasi save, cara memindahkan save ke versi baru, dan cara melaporkan bug (sertakan file log).
- `LICENSE` sesuai keputusan pemilik proyek, dan `CREDITS.md` (font OFL, ikon, dan dependensi utama).
- `CHANGELOG.md` format Keep a Changelog.

**Acceptance criteria**
- Tag `v0.1.0-rc.1` di fork/branch uji menghasilkan draft release berisi installer + checksum.
- Instal di Windows bersih (tanpa dev tools): app jalan offline (Wi-Fi dimatikan), save tercipta di `Documents/REPUBLIKA/saves`, dan uninstall tidak menghapus folder save.

---

## Gate akhir Tahap 5 (siap closed playtest)
- [ ] Installer dari draft release terinstal di laptop lain dan dimainkan offline 20 kuartal.
- [ ] Simulasi update: instal versi `rc.1`, main, lalu instal `rc.2` (format save naik) → save termigrasi dan bisa dilanjutkan.
- [ ] RAM dan ukuran installer tercatat dan sesuai target, atau penyimpangannya dijelaskan.
- [ ] Laporan balancing ditinjau, angka konten di-tuning, dan `rulesetVersion` dinaikkan.
- [ ] 3–5 teman mencoba, dan feedback dicatat di `docs/PLAYTEST-CLOSED.md`.
