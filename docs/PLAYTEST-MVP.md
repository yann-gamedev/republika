# Playtest MVP — Tahap 4

**Diisi oleh pemilik proyek.** Mainkan minimal 1 kampanye penuh 20 kuartal di versi desktop.

> Konten saat ini masih placeholder dan `content/scenario.json` berisi `maxTurns: 4`. Untuk bermain 20 kuartal, ubah `maxTurns` menjadi `20` di file itu (konten adalah wilayah Anda), lalu jalankan `pnpm content:check` dan `pnpm dev`. Untuk playtest sementara, 4 kuartal juga sudah cukup untuk mencoba Laporan Akhir dan arketipe.

## Kampanye

| #   | Tanggal | Kuartal | Strategi | Durasi total | Arketipe akhir |
| --- | ------- | ------- | -------- | ------------ | -------------- |
| 1   |         |         |          |              |                |
| 2   |         |         |          |              |                |

## Pertanyaan

- [ ] **Apakah ada momen bosan atau berulang?** Di kuartal berapa, dan kenapa?
      Jawaban:
- [ ] **Apakah Laporan Akhir terasa seperti cerita masa jabatan Anda?** (arketipe, 5 keputusan, kronologi)
      Jawaban:
- [ ] **Apakah halaman Kebijakan (master-detail, filter, pencarian) mudah dipakai dengan 4 → 12 kebijakan?**
      Jawaban:
- [ ] **Apakah tooltip glosarium dan pintasan (`?`, `1–6`, `/`) membantu?**
      Jawaban:
- [ ] **Apakah drift dukungan fraksi (ikut persetujuan publik) terasa masuk akal di Parlemen?**
      Jawaban:
- [ ] **RAM total (REPUBLIKA + WebView2) setelah 20 kuartal di Task Manager:**
      Nilai: MB

## Hasil `pnpm sim` (5 strategi)

Jalankan `pnpm sim --seed=<seed> --strategy=<s> --turns=20` untuk kelima strategi. Apakah arketipe yang keluar berbeda-beda?

| Strategi        | Arketipe |
| --------------- | -------- |
| random          |          |
| greedy-approval |          |
| austerity       |          |
| welfare         |          |
| no-op           |          |

## Peringatan `content:check` yang sudah ditinjau

-

## Ide perbaikan

-
