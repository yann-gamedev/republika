# Build dan Verifikasi Rilis

Kode fitur Tahap 6B selesai dan terverifikasi lokal, tetapi **belum siap rilis final**. Acuan status, bukti, dan blocker: [Kesiapan Rilis](RELEASE-READINESS.md). Saat audit: `APP_VERSION = 0.1.0-rc.1`, `SAVE_FORMAT_VERSION = 3`, `rulesetVersion = 3`; PR #9 sudah digabung ke `main` (`847eca9`) saat verifikasi akhir 23 November 2026. Identifier final `id.republika.game` sudah dikonfirmasi pemilik; jangan diubah setelah rilis.

Gate manual installer, runtime offline, kampanye desktop 20 kuartal, skala 125%, dan RAM belum lengkap. Build/test hijau atau `content:check` exit 0 **bukan tanda konten final maupun rilis final sudah siap**.

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

Installer NSIS di `apps/desktop/src-tauri/target/release/bundle/nsis/`. `pnpm build` memerlukan toolchain Windows pada README. Perintah tercantum bukan klaim sudah lulus.

CLI `pnpm sim`, `pnpm balance`, dan `pnpm perf:report` sudah tersedia, begitu juga `pnpm content:check --strict`. `--strict` menggagalkan proses bila masih ada token `placeholder`; **tag stabil wajib lulus `--strict`**, dan warning lain tetap harus ditinjau sebelum rilis (lihat bagian konten di `RELEASE-READINESS.md`).

Pemeriksaan presisi: lewat fixture/salinan pengujian, gunakan nilai indikator `0.12` dan pastikan validasi gagal dengan exit bukan nol. Jangan mengubah konten final atau meninggalkan JSON invalid dalam repo.

## Gate CI dan pemilik — masih pending

- [ ] Run GitHub Actions aktual: `checks` lulus lint, typecheck, test, content check, build web; `desktop` membangun Windows dan mengunggah artifact.
- [ ] Catat URL/run CI dan ukuran installer dari artifact/summary.
- [ ] Pemilik memasang installer artifact pada Windows 10/11 x64 dan membuka aplikasi.
- [ ] Periksa Menu Utama, Pelantikan, Dashboard, Kebijakan, Parlemen, Kabinet, Peristiwa, Riwayat, dan Pengaturan.
- [ ] Periksa ukuran minimum 1280×720, skala UI termasuk 125%, keterbacaan, dan tema “ruang rapat negara”.
- [ ] Kampanye penuh 20 kuartal di build desktop, bukan hanya E2E browser.
- [ ] Setelah dependency dan WebView2 tersedia, buka ulang aplikasi tanpa jaringan; font dan aset tetap tampil lokal. Installer `embedBootstrapper` dapat mengunduh WebView2 bila runtime belum terpasang; jangan menyamakan instalasi dengan runtime offline.
- [ ] Catat RAM total semua proses REPUBLIKA + WebView2 lewat Task Manager setelah 20 kuartal, berikut OS dan kondisi pengukuran (acuan `docs/PERFORMANCE.md`).

Workflow upload artifact bukan publikasi GitHub Release. Tidak ada satu pun butir manual di atas yang boleh diklaim lulus sebelum dijalankan.

## Batas performa

Acuan `AGENT.md` §5.17: RAM target ≤150 MB / maksimum 200 MB; heap ≤30/50 MB; installer ≤10/15 MB; cold start ≤1,5/3 detik; resolve kuartal ≤20/50 ms; save 20 kuartal ≤300 KB/1 MB. Heap, cold start, resolve, dan ukuran save sudah terukur lokal (`docs/PERFORMANCE.md`, `docs/PROGRESS.md`). **RAM total app termasuk WebView2 setelah 20 kuartal di Windows belum terukur andal**; angka lokal hanya indikatif. Ukuran installer sebelum rilis stabil harus dicatat dari artifact.

## Sebelum rilis stabil

- [ ] `pnpm content:check --strict` lulus tanpa token `placeholder`; warning kualitas lain ditinjau dan ditutup/diputuskan satu per satu.
- [ ] Seluruh gate manual di atas lulus dan buktinya dicatat.
- [ ] Blocker di [Kesiapan Rilis](RELEASE-READINESS.md) ditutup atau disetujui pemilik.
- [ ] Versi stabil ditetapkan (bukan `-rc`), `CHANGELOG.md` diperbarui.

Validasi konten final dan versi; lengkapi save/backup/migrasi serta test kompatibilitas sebelum menerima save pemain. Update manual melalui GitHub Releases, tanpa updater atau pengecekan versi online. Peta migrasi ruleset sudah ada (ruleset 3). Jangan membuat tag atau menerbitkan rilis tanpa konfirmasi pemilik.

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

## Prosedur rilis GitHub

1. Pastikan `main` hijau di CI dan checklist di atas sudah dijalankan bila format save atau ID konten berubah.
2. Untuk rilis stabil, jalankan `pnpm content:check --strict` dan pastikan tidak ada token `placeholder` tersisa. Exit 0 dengan warning lain tetap harus ditinjau satu per satu; bukan tanda konten siap rilis stabil. Contoh langkah berikut memakai versi stabil; untuk pra-rilis, gunakan versi seperti `0.1.0-rc.1` secara konsisten.
3. Setel versi dari satu sumber: `pnpm version:set 0.1.0`. Ini memperbarui `package.json`, `apps/desktop/package.json`, `tauri.conf.json`, `Cargo.toml`, `Cargo.lock`, dan `APP_VERSION`. Test `tests/version.test.ts` gagal bila ada yang tertinggal.
4. Tulis bagian `## [0.1.0] - <tanggal>` di `CHANGELOG.md`. Isinya dipakai sebagai catatan rilis.
5. Commit, lalu buat tag beranotasi dan push: `git tag -a v0.1.0 -m "REPUBLIKA 0.1.0"` → `git push origin v0.1.0`. **Membuat tag rilis wajib dikonfirmasi pemilik proyek.**
6. Workflow `release.yml` (windows-latest) memeriksa tag = versi `package.json`, menjalankan lint/typecheck/test/content:check/cargo test, membangun installer NSIS per-user, lalu membuat **draft** GitHub Release berisi `.exe`, `.exe.sha256`, dan catatan dari `CHANGELOG.md`.
7. Unduh installer dari draft, uji di Windows bersih (lihat di bawah), lalu publikasikan draft secara manual.

### Tag stabil vs pra-rilis

- Tag stabil **tidak boleh mengandung `-`**. Semua versi dengan `-` (`-rc.1`, `-beta.1`, dan prerelease lain) adalah pra-rilis dan **tidak wajib** strict, tetapi tetap disarankan.
- `content:check --strict` **wajib lulus sebelum tag stabil** (tidak boleh ada token `placeholder`). CI menegakkannya untuk tag tanpa `-`; kegagalan memblokir rilis stabil. Warning kualitas lain tetap ditinjau manusia.
- Exit 0 biasa (tanpa `--strict`) tidak membuktikan kelengkapan konten. Jangan menandai rilis final dari hasil itu saja.

### Uji instalasi bersih (manual)

- Laptop/VM Windows 10/11 tanpa Node, Rust, atau alat pengembangan.
- Instal dari installer draft; SmartScreen → _More info → Run anyway_.
- Matikan Wi-Fi, buka game, mainkan beberapa kuartal: harus berjalan normal.
- `Documents\REPUBLIKA\saves\autosave.json` tercipta.
- Uninstall lewat _Settings → Apps_: folder `Documents\REPUBLIKA` tetap ada.
