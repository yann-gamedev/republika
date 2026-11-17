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
