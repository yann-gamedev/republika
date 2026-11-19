# Changelog

Semua perubahan penting dicatat di sini. Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/), dan versi mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Ditambahkan

- Pelantikan: pilih latar belakang presiden (mengubah modal awal) dan tiga janji kampanye yang dinilai di laporan akhir.
- Kabinet: Wakil Presiden, Mensesneg, KSP, dan Jaksa Agung; reshuffle menteri dan pimpinan (1 AP, sekali per kuartal) dengan pratinjau dampak dan rekam jejak.
- Peta daerah: 38 provinsi dengan kepuasan warga, empat aksi (kunjungan, bantuan, dengar aspirasi, utusan), dan tanda gejolak.
- Format save v3 dan aturan permainan v3. Save lama dilanjutkan otomatis: kabinet dan provinsi diisi dari konten, janji tidak dinilai.

### Diubah

- Enam partai mendapat nama fiktif final (Cakrawala Maju, Suara Jelata, Tunas Lestari, Musyawarah Madani, Panji Merdeka, Simpul Daerah) yang tidak menyerupai partai nyata.
- Layar Parlemen menampilkan ketua umum serta daftar pengurus dan anggota tiap partai.
- Teks peristiwa sejarah menyebut partai yang terdampak.
- Aturan permainan v2. Save lama otomatis dilanjutkan dengan aturan baru, dan dukungan partai tetap terbawa.

## [0.1.0-rc.1] - 2026-11-18

Rilis kandidat pertama untuk closed playtest. Konten masih placeholder.

### Ditambahkan

- Kampanye presiden negara fiktif hingga 20 kuartal: pelantikan, kebijakan, voting parlemen, lobi fraksi, kementerian, dan peristiwa.
- Laporan kuartal yang menjelaskan _kenapa_ angka berubah (ledger), Riwayat dengan grafik, dan Laporan Akhir Masa Jabatan dengan arketipe.
- Autosave setiap akhir kuartal plus 5 slot manual (layar Simpan & Muat); hapus slot memindahkan file ke `saves/trash/`.
- Pembaruan save dari versi sebelumnya dengan cadangan otomatis ke `saves/backup-v{versi}/`.
- Pengaturan skala UI (90–125%), layar penuh (F11), daftar pintasan (`?`), glosarium istilah.
- Log lokal di `Documents/REPUBLIKA/logs/` untuk laporan bug.
- Alat penulis konten: `pnpm content:check`, `pnpm sim`, `pnpm balance`, `pnpm perf:report`.

### Catatan

- Sepenuhnya offline, tanpa akun dan tanpa telemetri.
- Installer belum ditandatangani; Windows SmartScreen dapat memperingatkan saat instalasi.

[Unreleased]: https://github.com/yann-gamedev/republika/compare/v0.1.0-rc.1...HEAD
[0.1.0-rc.1]: https://github.com/yann-gamedev/republika/releases/tag/v0.1.0-rc.1
