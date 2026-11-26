# REPUBLIKA

Game simulasi politik untuk **Windows 10/11 (64-bit)**. Anda dilantik sebagai presiden sebuah negara fiktif dan memerintah selama 20 kuartal: mengajukan kebijakan, melobi parlemen, mengelola kementerian, dan menghadapi peristiwa tak terduga. Setiap kuartal ada laporan yang menjelaskan _kenapa_ angka berubah.

- Sepenuhnya **offline**: tanpa akun, tanpa internet, tanpa telemetri.
- Berbahasa Indonesia.
- Semua negara, fraksi, tokoh, dan lembaga dalam game adalah **fiktif**.

> Versi saat ini adalah rilis kandidat untuk playtest terbatas. Konten (kebijakan, peristiwa) masih contoh dan angkanya belum seimbang.

## Unduh dan instal

1. Buka halaman [Releases](https://github.com/yann-gamedev/republika/releases) lalu unduh file `REPUBLIKA_<versi>_x64-setup.exe` dari rilis terbaru.
2. (Opsional) Cocokkan checksum: buka PowerShell di folder unduhan, jalankan `Get-FileHash .\REPUBLIKA_<versi>_x64-setup.exe -Algorithm SHA256`, lalu bandingkan dengan isi file `.sha256` di halaman rilis.
3. Jalankan installer. Instalasi hanya untuk akun Windows Anda dan **tidak butuh hak administrator**.

### Peringatan "Windows protected your PC"

Installer REPUBLIKA belum ditandatangani secara digital (sertifikat berbayar), jadi Windows SmartScreen bisa menampilkan layar biru **"Windows protected your PC"**. Ini wajar untuk proyek open source kecil.

1. Klik **More info** (Info selengkapnya).
2. Pastikan nama file sama dengan yang Anda unduh dari halaman Releases resmi.
3. Klik **Run anyway** (Tetap jalankan).

Jika ragu, cocokkan checksum SHA-256 seperti langkah 2 di atas.

Game memakai **Microsoft Edge WebView2**, yang sudah ada di hampir semua Windows 10/11. Bila belum ada, installer akan memasangnya; hanya langkah ini yang mungkin membutuhkan internet.

## Lokasi save

Semua data ada di folder **Documents** Anda:

```
Documents\REPUBLIKA\
  saves\      autosave.json, autosave.bak.json, slot-1.json … slot-5.json
    trash\    save yang Anda "hapus" dari layar Simpan & Muat
    backup-v<versi>\   cadangan otomatis sebelum save diperbarui ke versi baru
  logs\       republika.log (untuk laporan bug)
  settings.json
```

- Autosave terjadi setiap akhir kuartal. Keputusan yang belum diakhiri kuartalnya belum tersimpan.
- Dari game, buka **Simpan & Muat → Buka folder save** untuk langsung ke folder ini.
- **Uninstall tidak menghapus folder ini.** Save Anda tetap aman; hapus manual bila memang tidak diperlukan lagi.

## Pindah ke versi baru

1. Unduh dan jalankan installer versi baru (tidak perlu uninstall versi lama).
2. Saat game dibuka, bila ada save dari versi sebelumnya, muncul dialog **"Perbarui save ke versi ini?"**. Pilih **Perbarui save**.
3. File asli selalu dicadangkan lebih dulu ke `saves\backup-v<versiLama>\`.

Save dari komputer lain atau folder lain: buka **Simpan & Muat → Impor dari versi sebelumnya**, lalu pilih file `.json`-nya. Salinannya diperbarui dan ditaruh di slot kosong.

## Melaporkan bug

1. Buka [Issues](https://github.com/yann-gamedev/republika/issues) → **New issue**.
2. Ceritakan apa yang Anda lakukan, apa yang terjadi, dan apa yang Anda harapkan.
3. **Lampirkan** `Documents\REPUBLIKA\logs\republika.log`. Log hanya berisi pesan error dan durasi perhitungan; tidak ada data pribadi selain nama presiden yang Anda ketik.
4. Bila masalahnya terkait save, lampirkan juga file save-nya.

## Pintasan

`1–6` pindah halaman · `?` daftar pintasan · `F11` layar penuh · `Enter`/`Esc` di dialog · `/` cari kebijakan.

## Untuk pengembang

Lihat [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) (prasyarat, perintah, alat konten, cara rilis), [kesiapan rilis](docs/RELEASE-READINESS.md) (pekerjaan tersisa dan gate), dan [AGENT.md](AGENT.md) (aturan proyek). Lisensi: [MIT](LICENSE). Kredit font dan dependensi: [CREDITS.md](CREDITS.md). Riwayat perubahan: [CHANGELOG.md](CHANGELOG.md).
