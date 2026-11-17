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
