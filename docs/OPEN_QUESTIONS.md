# Pertanyaan Terbuka dan Gate — Status Terkini

Status per audit: fitur Tahap 6B selesai di kode dan terverifikasi lokal, tetapi rilis final belum siap. `APP_VERSION 0.1.0-rc.1`, save format v3, `rulesetVersion` 3. PR #9 sudah digabung ke `main` (`847eca9`) saat verifikasi akhir 23 November 2026. Rincian gate: [Kesiapan Rilis](RELEASE-READINESS.md).

## Pending aktual — belum ditutup

- **GitHub Actions:** catat URL serta hasil `checks`/`desktop` pada commit kandidat rilis terbaru, bukan hanya keberadaan workflow. PR #9 sudah digabung; gate manual tidak otomatis tertutup.
- **Instalasi pemilik:** pasang installer Windows, buka semua layar termasuk fitur 6B, lalu laporkan hasil dan ukuran installer.
- **Kampanye desktop 20 kuartal:** E2E browser lulus, tetapi bukti gate kampanye manual di build desktop belum lengkap, termasuk kampanye ke-2.
- **Skala 125%:** tercakup uji layout otomatis; verifikasi visual manual di build desktop masih pending.
- **RAM:** ukur total proses REPUBLIKA + WebView2 di Task Manager setelah 20 kuartal (lihat bagian 5.4 di bawah).
- **Runtime offline:** setelah WebView2 tersedia, buka ulang aplikasi tanpa jaringan dan pastikan aset lokal tampil. `embedBootstrapper` dapat mengunduh WebView2 saat instalasi; itu bukan bukti runtime offline.
- **Fullscreen native:** adapter sudah ada; hasil uji toggle manual belum tercatat.
- **`content:check --strict`:** wajib lulus (tanpa token `placeholder`) sebelum tag stabil. Warning kualitas lain tetap perlu ditinjau; exit 0 biasa belum cukup.
- **Konten final:** konten 6B masih `PLACEHOLDER-*`; penggantian oleh pemilik belum terjadi.
- **Review visual:** nuansa “ruang rapat negara” dan keterbacaan di 1280×720/125% menunggu pemilik.

## Sudah diputuskan (historis, closed)

- Konversi PDF v0.1 selesai: seluruh 9 halaman tercakup. `GDD.md` memuat halaman 1–4 (§1–§5); `TDD.md` memuat halaman 1 dan 5–9 (§6–§11). Sampul/daftar isi bersama diduplikasi; isi historis web/API/DB diarsipkan dengan catatan addendum v0.3 menimpa. Bukan blocker.
- Identifier `id.republika.game` dikonfirmasi pemilik; jangan diubah setelah rilis.
- Mock 20 kuartal tidak mengubah skenario placeholder 4 kuartal.
- K1–K7 Tahap 6A/6B: Indonesia nyata dengan tokoh fiktif, reshuffle 1× per kuartal, konten 6B berupa fixture placeholder, font tambahan disetujui, kabinet opsional.
- Engine/resolusi, `GameController`, save atomik, backup, migrasi save, dan persistensi settings sudah diimplementasikan pada tahap lanjut — bukan lagi pending seperti catatan Tahap 1.
- Android tetap rencana lanjutan, bukan pekerjaan saat ini.

## Tahap 4.1 — Usulan dari slice (menunggu keputusan pemilik)

`docs/PLAYTEST-SLICE.md` belum diisi, jadi belum ada perbaikan yang disetujui. Aturan tidak diubah di 4.1. Usulan berikut berasal dari pengamatan agent saat membangun dan menguji slice; pilih yang disetujui dengan mencatatnya di `DECISIONS.md`.

1. **Lobi terasa murah dibanding efeknya.** Dengan konten placeholder, satu lobi (1 AP + Rp2 T) sering cukup membalik voting. Usulan: biaya lobi naik bertahap bila fraksi yang sama dilobi kuartal berturut-turut, atau bonus lobi turun menjadi +10.
2. **Baseline menarik approval ke 50 cukup kuat (10%/kuartal).** Efek kebijakan approval cepat "hilang". Usulan: reversi 5% atau pakai jangkar yang bergeser mengikuti welfare.
3. **Event bisa terasa berulang di kampanye 20 kuartal** bila konten hanya punya sedikit event non-unik. Usulan: penalti bobot untuk event yang baru saja muncul (selain cooldown).
4. **Sisa AP hangus tanpa umpan balik.** Usulan: tampilkan peringatan ringan di dialog Akhiri Kuartal bila masih ada AP (sudah ada teks), atau beri opsi "tabung 1 AP" (perubahan aturan, perlu keputusan).
5. **Kalimat laporan untuk reasonCode konten** masih fallback "Dampak {sumber}". Bukan aturan, tetapi sangat memengaruhi pertanyaan playtest "apakah laporan menjelaskan kenapa".

## Tahap 5.4 — RAM belum terukur andal

Pengukuran otomatis RAM di mesin pengembangan tidak konsisten (Windows memangkas working set jendela yang tidak di depan). Detail ada di `docs/PERFORMANCE.md`. **Pemilik perlu mengukur dengan Task Manager** (kolom _Memory (active private working set)_, jendela di depan) di menu dan setelah 20 kuartal.

Jika total melewati 200 MB, opsi (perlu keputusan, bukan hack):

1. Terima batas bawah WebView2 (±70–100 MB) dan revisi target §5.17 menjadi berbasis "di atas WebView2 kosong".
2. Kurangi kerja renderer: matikan `backdrop-blur` (header/dialog) dan bayangan besar yang memicu komposit GPU; ukur ulang.
3. Batasi jumlah layar yang tetap ter-mount (sudah lazy; cek di React DevTools Profiler).
4. `--disable-gpu` **tidak** disarankan: di mesin uji justru menaikkan memori.

## Tahap 6B — catatan untuk pemilik (masih relevan)

1. **Event daerah masih fixture.** Tiga event `EVT-REG-PLACEHOLDER-*` sudah membaca `UNREST_PRV_PAPPEG`, `UNREST_PRV_PAPUA`, dan `ASPIRATION_PRV_NTT`; event gejolak mendapat bobot 3x. Bot `pnpm balance` tidak menurunkan persetujuan cukup rendah, jadi dua event gejolak belum pernah muncul di 5000 run; event aspirasi NTT muncul dan menaikkan hasil bot `visit`. Yang tersisa: playtest skenario persetujuan rendah (apakah ambang 25 dan bobot 3x tepat), lalu konten/ilustrasi final dari pemilik.
2. **Nama kementerian masih placeholder.** K1 mengizinkan nama lembaga nyata ("Kementerian Keuangan"); `ministries.json` belum diganti karena itu konten final pemilik.
3. **Statistik "Loyalitas" di wireframe profil** belum ada di model; profil menampilkan efektivitas dan integritas.
4. **Warta belum memberitakan reshuffle dan aksi daerah** sebagai berita utama; keduanya hanya muncul di ledger, Meja kerja, dan rekam jejak.
5. **Gate playtest 6A belum lengkap** (kampanye ke-2, skala 125%, RAM Task Manager). 6B dikerjakan atas permintaan pemilik; gate yang sama sebaiknya diulang untuk 6B.
