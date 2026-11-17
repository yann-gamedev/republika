> Addendum v0.3 di AGENT.md §5 menimpa dokumen ini. Bagian web/API/DB tidak berlaku.

> Konversi teks historis dari `source/REPUBLIKA_GDD_TDD_v0.1.pdf`: halaman 1 (sampul dan daftar isi bersama), halaman 2–4 (Bagian A, §1–§5). Penomoran dan isi v0.1 dipertahankan, termasuk rancangan web/API/DB yang tidak berlaku untuk implementasi sekarang. Header/nomor halaman berulang diganti penanda halaman; tabel dan blok kode ditata sebagai Markdown. Sampul/daftar isi halaman 1 disertakan pada kedua dokumen. Ini arsip rancangan, bukan klaim fitur sudah diimplementasikan.

<!-- Halaman PDF: 1 -->

# REPUBLIKA

Game Design Document + Technical Design Document

Progressive Political Simulation | Web Application | Versi 0.1 | 17 November 2026

Status: rancangan awal untuk review teknis dan product discovery. Nama proyek, angka simulasi, karakter, dan institusi fiktif adalah placeholder desain, bukan data pemerintah aktual.

Tujuan dokumen: memberikan satu spesifikasi kerja yang bisa dipakai untuk membuat vertical slice, membagi tugas pengembangan, menguji simulation engine, dan memutuskan ruang lingkup MVP.

## Daftar isi

- BAGIAN A - GAME DESIGN DOCUMENT

- 1. Visi dan prinsip desain

- 2. Core loop dan aturan kampanye

- 3. Batasan MVP dan fitur

- 4. Sistem ekonomi, politik, kabinet, dan event

- 5. UX, balancing, dan acceptance criteria

- BAGIAN B - TECHNICAL DESIGN DOCUMENT

- 6. Keputusan teknologi dan arsitektur

- 7. Domain model dan kontrak state

- 8. Algoritma turn resolution

- 9. Database, API, dan keamanan

- 10. Testing, observability, deployment

- 11. Roadmap, risiko, dan keputusan terbuka

<!-- Halaman PDF: 2 -->

# BAGIAN A - GAME DESIGN DOCUMENT

## 1. Visi dan prinsip desain

Premis: pemain memimpin pemerintahan fiktif terinspirasi struktur Indonesia selama lima tahun (20 kuartal), mengelola kebijakan, kabinet, parlemen, dan tekanan sosial-ekonomi. Kemenangan bukan satu skor tunggal: laporan akhir menunjukkan trade-off, stabilitas, kesejahteraan, dan konsistensi keputusan. Pilar: meaningful decisions, interconnected systems, accessible complexity, replayability, dan transparent simulation. Game adalah karya orisinal; jangan menyalin aset, source code, merek, atau narasi pihak lain.

### Target pengguna dan pengalaman

Pengguna utama adalah pemain strategi kasual-menengah yang ingin bermain melalui browser desktop atau ponsel. Sesi ideal 10-25 menit, dengan autosave dan laporan per kuartal. MVP single-player, tanpa multiplayer atau generative AI.

## 2. Core loop dan aturan kampanye

- Assess: lihat delapan indikator, kondisi parlemen, dan anggaran.

- Plan: alokasikan dua Policy Action Points per kuartal.

- Negotiate: validasi kebutuhan voting untuk kebijakan legislatif.

- Resolve: server menjalankan perubahan state secara atomik.

- Review: tampilkan laporan dampak, alasan perubahan, dan event baru.

Aturan awal: 20 kuartal; dua Action Points per kuartal; kebijakan memiliki biaya, prasyarat, cooldown, durasi, dan kategori; kondisi game tidak dapat diubah dari client. Pemain boleh menyimpan dan memuat state, tetapi mode ironman dapat ditunda.

## 3. Batasan MVP dan fitur

| Sistem    | MVP v0.1                             | Ditunda                              |
| --------- | ------------------------------------ | ------------------------------------ |
| Dashboard | 8 indikator dan riwayat perubahan    | Grafik sektoral/regional             |
| Policies  | 12 definisi kebijakan, efek tertunda | Puluhan kebijakan saling bergantung  |
| Politics  | 6 fraksi fiktif, 100 kursi           | Lobi kompleks dan pemilu             |
| Cabinet   | 4 kementerian, effectiveness         | Menteri individual/reshuffle         |
| Events    | 15 event berbasis kondisi/seed       | Narasi AI dan event prosedural besar |
| Campaign  | 20 kuartal, save/load, laporan       | Multi-periode dan multiplayer        |
| Economy   | Model agregat rule-based             | Ekonomi sektoral, pasar saham        |

<!-- Halaman PDF: 3 -->

### Vertical slice sebelum MVP penuh

Empat kuartal, tiga kebijakan (subsidi energi, pajak, bantuan sosial), satu mekanisme voting, dua event, dan laporan sebab-akibat. Tujuan: membuktikan gameplay menyenangkan dan transisi state konsisten sebelum memperluas konten.

## 4. Sistem inti permainan

### 4.1 Indikator nasional

| Indikator       | Domain awal | Makna                   |
| --------------- | ----------- | ----------------------- |
| approval        | 0..100      | Dukungan masyarakat     |
| stability       | 0..100      | Stabilitas pemerintahan |
| fiscalHealth    | 0..100      | Skor kesehatan fiskal   |
| growthPct       | -10..15     | Pertumbuhan ekonomi (%) |
| inflationPct    | -5..30      | Inflasi (%)             |
| unemploymentPct | 0..40       | Pengangguran (%)        |
| welfare         | 0..100      | Kesejahteraan agregat   |
| trust           | 0..100      | Kepercayaan institusi   |

Saldo kas negara, biaya program, dan penghematan kebijakan disimpan terpisah dalam satuan triliun rupiah fiktif. Jangan menganggap fiscalHealth sebagai jumlah uang. Setiap perubahan indikator dicatat dalam effect ledger beserta sumber dan satuannya.

### 4.2 Policy system

Definisi policy bersifat data-driven: id, kategori, actionPointCost, fiscalCost, requirements, needsVote, effects, durationTurns, cooldownTurns, conflicts, dan schemaVersion. Efek dapat bersifat langsung, bertahap, atau tertunda; conditional modifiers membaca state awal giliran. Contoh: reformasi subsidi energi: AP 1, membutuhkan voting, biaya implementasi awal 8 triliun, durasi 4 kuartal. Efek ekonomi dan politik adalah parameter balancing fiktif dan harus diuji, bukan dianggap prediksi Indonesia.

### 4.3 Parlemen dan kabinet

Enam fraksi fiktif memiliki total 100 kursi; voting MVP lolos dengan >=51 suara setuju dari seluruh kursi. Setiap fraksi memiliki support, ideologyTags, dan policyPreferences. Model ini menyederhanakan proses legislasi dan tidak merepresentasikan seluruh prosedur DPR Indonesia. Empat kementerian: Keuangan, Sosial, Energi, dan Dalam Negeri. Effectiveness 0..100 menjadi modifier terkontrol atas kebijakan sesuai domain. Semua modifier dibatasi agar tidak membuat hasil ekstrem tanpa alasan.

<!-- Halaman PDF: 4 -->

### 4.4 Event dan kondisi kampanye

Event terstruktur memiliki eligibility, triggerWeight, choices, effects, cooldown, dan uniquePerCampaign. Pemilihan event memakai PRNG seeded dan draw yang terurut. Event dapat memicu respons pemain pada giliran berikutnya. Akhir kampanye menyajikan ringkasan indikator, kronologi, dan konsekuensi utama, bukan penilaian moral tunggal.

## 5. UX, balancing, dan acceptance criteria

Navigasi: Dashboard, Policies, Parliament, Cabinet, Events, History. Desktop memakai sidebar, mobile memakai navigasi ringkas. Setiap kebijakan memperlihatkan biaya, prasyarat, risiko, dan proyeksi bersyarat. Setelah giliran diproses, pemain melihat delta dan penjelasan sumbernya.

- State + command + seed yang sama menghasilkan output yang sama.

- Setiap indikator memenuhi rentang validasinya dan setiap nilai memiliki satuan.

- Tidak ada pengeluaran AP melebihi batas atau voting melebihi total kursi.

- Save/load mengembalikan state dan versi yang konsisten.

- 20 kuartal dapat diselesaikan tanpa softlock.

- Pengujian balancing memakai ribuan simulasi seeded dan strategi beragam.
