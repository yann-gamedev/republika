# CLAUDE.md — REPUBLIKA

Aturan utama proyek ada di AGENT.md dan wajib diikuti sepenuhnya:

@AGENT.md

## Tambahan khusus Claude Code

- **Mulai tiap bagian dengan plan mode.** Tulis rencana singkat (file yang disentuh, test, risiko, dan dampak ke anggaran performa §5.17), lalu eksekusi.
- **Pakai daftar todo** untuk bagian yang sedang dikerjakan. Satu bagian = satu commit.
- **Verifikasi sebelum mengklaim selesai.** Jalankan `pnpm lint && pnpm typecheck && pnpm test`. Untuk bagian UI, jalankan juga `pnpm test:e2e` atau minimal `pnpm build` web. Laporkan hasil perintahnya, bukan asumsi.
- Lingkungan agent mungkin bukan Windows. Jika `tauri build` tidak bisa dijalankan di sana, pastikan bagian Tauri lolos `cargo check` dan CI Windows, lalu tulis langkah verifikasi manual untuk pemilik proyek di `docs/PROGRESS.md`.
- **Subagent** boleh dipakai untuk eksplorasi atau review. Penulisan aturan simulasi (`packages/simulation`) tetap di sesi utama.
- **Akhir tahap:** perbarui `docs/PROGRESS.md`, lalu berhenti. Jangan lanjut ke tahap berikutnya sendiri.
- **Area yang dilindungi** (jangan diubah tanpa diminta): `packages/game-data/content/**`, `prompts/**`, `packages/simulation/test/__fixtures__/**`, `packages/simulation/test/fixtures/saves/**`.
- **Perintah berisiko** wajib konfirmasi: menghapus apa pun di `Documents/REPUBLIKA/`, `git push --force`, membuat tag rilis, dan mengubah `tauri.conf.json` bagian `identifier`. Mengubah `identifier` akan memutus lokasi data pemain.
- Kalau context mulai panjang, ringkas progres ke `docs/PROGRESS.md` sebelum melanjutkan.
- Jawab pemilik proyek dalam Bahasa Indonesia yang ringkas.
