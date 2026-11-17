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
