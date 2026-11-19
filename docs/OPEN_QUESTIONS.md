# Pertanyaan Terbuka / Gate — Tahap 1

## Belum ditutup

- **GitHub Actions:** tunggu run aktual `checks` dan `desktop`; catat URL/run dan hasil, bukan hanya keberadaan workflow.
- **Instalasi pemilik:** unduh artifact Windows dari run tersebut, instal, buka semua layar, lalu laporkan hasil dan ukuran installer.
- **RAM:** ukur total proses REPUBLIKA + WebView2 di Task Manager. RAM awal shell boleh dicatat sebagai baseline; target dashboard setelah 20 kuartal nyata belum bisa diukur dengan engine Tahap 1 yang belum ada.
- **Review visual:** pemilik perlu memastikan nuansa “ruang rapat negara” dan keterbacaan minimum 1280×720 sesuai harapan.

## Sudah diputuskan

Konversi PDF v0.1 selesai: seluruh 9 halaman tercakup. `GDD.md` memuat halaman 1–4 (§1–§5); `TDD.md` memuat halaman 1 dan 5–9 (§6–§11). Sampul/daftar isi bersama diduplikasi; isi historis web/API/DB tetap diarsipkan dengan catatan addendum v0.3 menimpa. Sumber tidak hilang dan konversi bukan lagi blocker.

Identifier `id.republika.game` dikonfirmasi pemilik; tidak lagi menunggu persetujuan. Mock 20 kuartal tidak mengubah skenario placeholder 4 kuartal.

## Ditunda sesuai lingkup, bukan blocker fondasi kode

Engine/resolusi, `GameController`, save file atomik, backup dan migrasi, persistensi settings, serta konten final/balancing. Fullscreen native sudah memiliki adapter; uji toggle manual masih pending. Jangan menambahkannya saat menutup dokumentasi Tahap 1. Android tetap rencana lanjutan, bukan pekerjaan saat ini.

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

## Tahap 6B — catatan untuk pemilik

1. **Event daerah belum ada.** Flag `ASPIRATION_<id>` dan `UNREST_<id>` sudah dipasang engine, tetapi belum ada event yang membacanya, dan bobot event daerah belum dinaikkan saat gejolak. Usulan: tulis event daerah dengan syarat `FLAG_SET`, lalu putuskan apakah gejolak menaikkan bobot otomatis.
2. **Nama kementerian masih placeholder.** K1 mengizinkan nama lembaga nyata ("Kementerian Keuangan"); `ministries.json` belum diganti karena itu konten final pemilik.
3. **Statistik "Loyalitas" di wireframe profil** belum ada di model; profil menampilkan efektivitas dan integritas.
4. **Warta belum memberitakan reshuffle dan aksi daerah** sebagai berita utama; keduanya hanya muncul di ledger, Meja kerja, dan rekam jejak.
5. **Gate playtest 6A belum lengkap** (kampanye ke-2, skala 125%, RAM Task Manager). 6B dikerjakan atas permintaan pemilik; gate yang sama sebaiknya diulang untuk 6B.
