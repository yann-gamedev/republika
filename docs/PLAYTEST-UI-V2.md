# Playtest UI v2 — Gate Tahap 6A

**Diisi oleh pemilik proyek.** Mainkan minimal **2 kampanye** di build desktop (installer, bukan `pnpm dev`), lalu jawab pertanyaan di bawah. Gate ini menentukan apakah 6B boleh dimulai.

Versi yang diuji: 0.1.0-rc.1, branch `feat/stage-6a-ui-v2`. Konten masih placeholder, jadi nilai kampanye belum bermakna; yang dinilai adalah tampilan dan alurnya.

## Kampanye

| #   | Tanggal     | Strategi | Kuartal dimainkan | Durasi sesi | Catatan                                                          |
| --- | ----------- | -------- | ----------------- | ----------- | ---------------------------------------------------------------- |
| 1   | 19 Nov 2026 | —        | s.d. kuartal 3–4  | —           | Umpan balik lisan di chat; tangkapan layar Nota dinas disertakan |
| 2   |             |          |                   |             | Belum dilaporkan                                                 |

## Pertanyaan gate

- [ ] **Apakah Meja kerja langsung memberi tahu apa yang harus dikerjakan kuartal ini?**
      (map masuk, kebijakan antre, tombol "Akhiri kuartal" yang terkunci)
      Jawaban: **Sudah bagus untuk saat ini.**
- [ ] **Apakah stempel, voting paripurna, dan Warta terasa memuaskan, bukan memperlambat?**
      Jawaban: **Sudah cukup memuaskan.**
- [ ] **Apakah ada teks yang terpotong di 1280×720 atau skala UI 125%?**
      (sebutkan layar dan bagian yang terpotong)
      Jawaban: **Belum dicoba** — pemilik bermain di skala 100%.
- [ ] **RAM setelah 20 kuartal** — Task Manager, jumlah `republika.exe` + semua `msedgewebview2.exe` milik REPUBLIKA, jendela di depan ±10 detik. Cara lengkap di `docs/PERFORMANCE.md`.
      Nilai: **belum dihitung**

## Catatan visual

- [ ] Ilustrasi tampil utuh dan tidak terpotong di kartu/header. → Ditemukan terpotong di Nota dinas; sudah diperbaiki (lihat tabel masalah).
- [ ] Angka penting terbaca (tabular, kontras cukup) di semua layar.
- [ ] Animasi tidak mengganggu; dengan `prefers-reduced-motion` hasil voting langsung tampil.

## Masalah yang ditemukan

| Layar      | Langkah reproduksi                           | Yang terjadi                                                                             | Yang diharapkan                                     |
| ---------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Nota dinas | Buka Meja kerja → Nota dinas pada kuartal 2+ | Ilustrasi 760×640 dipotong `object-cover` setinggi 240 px; kepala dan objek utama hilang | Seluruh ilustrasi terlihat, ukuran nota tetap wajar |

Perbaikan: ilustrasi nota ditampilkan sebagai gambar utuh dengan rasio aslinya (maks. 420 px, di tengah kertas), bukan banner 240 px yang memotong. Warta tetap memakai potongan foto karena gaya koran.

## Ide perbaikan

- Ukur RAM dan uji skala 125% pada putaran berikutnya.
- Pertimbangkan bingkai tipis atau keterangan gambar di bawah ilustrasi nota.
