# Build dan Verifikasi — Tahap 1

Belum rilis game siap dimainkan. Tahap 1 menghasilkan shell mock dan fondasi schema/konten. Identifier final `id.republika.game` sudah dikonfirmasi pemilik; jangan diubah setelah rilis.

## Gate lokal

Jalankan dari root repo dan catat output aktual di `PROGRESS.md`:

```powershell
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm content:check
pnpm build:web
pnpm exec playwright install chromium
pnpm test:e2e
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
pnpm build
```

Installer NSIS di `apps/desktop/src-tauri/target/release/bundle/nsis/`. `pnpm build` memerlukan toolchain Windows pada README. Perintah tercantum bukan klaim sudah lulus. CLI `sim`, `balance`, dan `perf:report` belum tersedia.

Pemeriksaan presisi: lewat fixture/salinan pengujian, gunakan nilai indikator `0.12` dan pastikan validasi gagal dengan exit bukan nol. Jangan mengubah konten final atau meninggalkan JSON invalid dalam repo.

## Gate CI dan pemilik — masih pending

- [ ] Run GitHub Actions aktual: `checks` lulus lint, typecheck, test, content check, build web; `desktop` membangun Windows dan mengunggah artifact.
- [ ] Catat URL/run CI dan ukuran installer dari artifact/summary.
- [ ] Pemilik memasang installer artifact pada Windows 10/11 x64 dan membuka aplikasi.
- [ ] Periksa Menu Utama, Pelantikan, Dashboard, Kebijakan, Parlemen, Kabinet, Peristiwa, Riwayat, dan Pengaturan; lihat label/mock, bukan menuntut engine yang belum dibuat.
- [ ] Periksa ukuran minimum 1280×720, skala UI, keterbacaan, dan tema “ruang rapat negara”. Preferensi hanya sesi; fullscreen native belum dijamin.
- [ ] Setelah dependency dan WebView2 tersedia, buka ulang aplikasi tanpa jaringan; font dan aset tetap tampil lokal. Installer `embedBootstrapper` dapat mengunduh WebView2 bila runtime belum terpasang; jangan menyamakan instalasi dengan runtime offline.
- [ ] Catat RAM awal total semua proses REPUBLIKA + WebView2 lewat Task Manager, berikut OS dan kondisi pengukuran.

Workflow upload artifact bukan publikasi GitHub Release. Instalasi pemilik dan RAM belum terverifikasi; tidak boleh menandai tahap sepenuhnya lolos hanya karena build lokal berhasil.

## Batas performa

Acuan `AGENT.md` §5.17: RAM target ≤150 MB / maksimum 200 MB; heap ≤30/50 MB; installer ≤10/15 MB; cold start ≤1,5/3 detik; resolve kuartal ≤20/50 ms; save 20 kuartal ≤300 KB/1 MB. Target runtime kampanye diukur pada dashboard Windows 11 setelah 20 kuartal nyata. Mock Tahap 1 hanya baseline shell, bukan bukti target engine/save tercapai.

## Sebelum rilis tahap lanjutan

Validasi konten final dan versi; lengkapi save/backup/migrasi serta test kompatibilitas sebelum menerima save pemain. Update manual melalui GitHub Releases, tanpa updater atau pengecekan versi online. Peta migrasi ruleset dan formatnya belum diimplementasikan pada Tahap 1. Jangan membuat tag atau menerbitkan rilis dalam pekerjaan fondasi ini.

## Checklist WAJIB saat format save atau ID konten berubah

Jalankan setiap kali salah satu hal berikut terjadi sebelum rilis. Tujuannya: save pemain dari versi lama selalu bisa dibuka di versi baru (AGENT §5.13).

### A. Format save berubah (bentuk `SaveFile`/`GameState`)

1. Naikkan `SAVE_FORMAT_VERSION` di `packages/shared/src/types/constants.ts` (mis. 2 → 3).
2. Tulis migrator murni `packages/simulation/src/save/migrations/v2ToV3.ts` (JSON mentah → JSON mentah, tanpa I/O) dan daftarkan di `SAVE_MIGRATORS` (`migrateSave.ts`).
3. **Sebelum** mengubah kode penulis save, buat contoh save versi lama dari build sebelumnya dan simpan di `packages/simulation/test/fixtures/saves/` (mis. `save-v2-<nama>.json`). Jangan ubah fixture lama.
4. Tambah test: fixture lama → `migrateSave` → valid di versi baru **dan** bisa dilanjutkan satu kuartal (`resolveTurn`).
5. Bila `GameState` berubah, perbarui juga `migrateRuleset` bila field baru berisi ID konten.

### B. ID konten diganti atau dihapus (kebijakan, event, fraksi, kementerian)

1. Naikkan `rulesetVersion` di `packages/game-data/content/scenario.json`.
2. Tulis `packages/game-data/migrations/ruleset-<N>.json` (`fromRuleset`, `toRuleset`, `renamed`, `removed`) dan daftarkan di `packages/game-data/src/rulesetMigrations.ts`.
3. Kebijakan aktif yang dihapus akan dihentikan otomatis dengan ledger `RULESET_MIGRATED`; tidak perlu kode tambahan.
4. Jalankan `pnpm content:check` dan `pnpm test`.

### C. Aturan simulasi berubah tanpa mengganti ID

1. Naikkan `rulesetVersion` (konten) dan perbarui snapshot fixture engine dengan alasan di commit.
2. Catat perubahan di `docs/SIMULATION_RULES.md` dan `CHANGELOG.md`.

### D. Uji update manual sebelum rilis

1. Instal versi rilis sebelumnya, mainkan 2–3 kuartal, simpan ke slot.
2. Instal versi baru di atasnya. Saat app dibuka, dialog "Perbarui save ke versi ini?" harus muncul.
3. Pastikan file asli ada di `Documents/REPUBLIKA/saves/backup-v{versiLama}/` dan kampanye bisa dilanjutkan.
