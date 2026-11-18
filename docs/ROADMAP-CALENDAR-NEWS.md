# REPUBLIKA · Kalender, Berita, dan Komunikasi Presiden

Status dokumen: rancangan pengembangan. Kampanye saat ini memakai sistem kuartalan. Sepuluh adaptasi sejarah tersedia sebagai data event di `packages/game-data/content/events/EVT-HIST-*.json`.

## 1. Pengalaman pemain

Dashboard tetap menjadi tempat untuk melihat kas, indikator, agenda pemerintah, dan dukungan partai. Header menampilkan **hari, tanggal, bulan, dan tahun** kampanye, misalnya **Rabu, 1 Januari 2031**. Di bawah tanggal, tampilkan kuartal aktif dan tanggal agenda wajib terdekat jika ada. Tombol **Lanjut** memproses waktu kampanye. Kalender menampilkan jadwal dan membuka detail agenda. Menu **Berita** mencatat perkembangan dunia beserta keputusan pemerintah yang dapat ditelusuri kembali.

Putaran bermain dimulai dengan membaca laporan, berita, dan agenda. Pemain memilih kebijakan, lobi, atau respons komunikasi, lalu menekan **Lanjut**. Setelah waktu bergerak, pemain melihat perkembangan baru dan langsung memahami keputusan mana yang memerlukan perhatian. Kalender tetap mengikuti tanggal dunia game saat pemain membuka kembali penyimpanan.

## 2. Kalender dan tombol Lanjut

Gunakan kalender Gregorian dan bilangan bulat untuk jumlah hari dari tanggal awal kampanye. Satu hari kampanye adalah unit simulasi yang bebas dari zona waktu perangkat. Tanggal awal dapat diturunkan dari `startYear` pada skenario lama. Untuk skenario baru, usulkan `startDate` dan batas masa jabatan eksplisit. Preset lima tahun dimulai pada 1 Januari 2031 dan ditutup pada awal 1 Januari 2036, setelah kuartal ke-20 ditutup. Hari kabisat mengikuti aturan Gregorian. Lapisan UI memformat tanggal dengan lokal `id-ID`, memakai zona tetap seperti UTC ketika membuat representasi untuk formatter.

Setiap langkah baru mengundi **5 sampai 14 hari, inklusif**, dengan peluang sama untuk setiap angka. Pisahkan aliran PRNG kalender dari PRNG event supaya perubahan bobot atau tampilan berita tidak mengubah hasil undian tanggal. Simpan seed, penghitung langkah, dan target langkah dalam save. Gunakan command seperti `ADVANCE_TIME { commandId }` lewat `GameController.dispatch`. Engine menentukan hasil undian dan UI menampilkan tanggal hasilnya.

Jika langkah melewati keputusan wajib atau akhir kampanye, berhenti tepat di tanggal batas. Simpan sisa interval pada keputusan wajib. Setelah pemain menjawab dan memilih **Lanjut** lagi, teruskan sisa interval yang sudah diundi. Misalnya, dari **Rabu, 26 Maret 2031**, undian 12 hari menargetkan **Senin, 7 April 2031**. Jika ada agenda wajib pada 2 April, tanggal berhenti pada tanggal tersebut sampai pemain merespons, lalu langkah dilanjutkan ke 7 April. Pemain tetap dapat membuka kalender, berita, dan dashboard saat ada agenda tertunda. Konferensi pers opsional bisa dilewati atau kedaluwarsa sesuai tanggal yang diumumkan.

### Urutan pemrosesan waktu

1. Validasi status kampanye, ID command, dan keputusan wajib. Tulisan pada tombol atau petunjuk menyebut agenda yang memblokir langkah.
2. Ambil target langkah yang tersimpan atau undi target baru. Traversal memeriksa tenggat, efek tertunda, dan batas kuartal dalam urutan tanggal.
3. Pada awal kuartal baru, tutup kuartal sebelumnya satu kali. Proses perhitungan ekonomi, biaya berkala, durasi kebijakan, laporan, dan pemulihan AP sesuai aturan kuartalan.
4. Pada tanggal yang sama, proses agenda terjadwal setelah penutupan kuartal. Urutkan agenda sejenis berdasarkan ID stabil. Jika keputusan wajib muncul, simpan tanggal dan target langkah lalu kembalikan kendali ke pemain.
5. Pada akhir langkah yang lengkap, evaluasi kesempatan event acak bagi kandidat yang memenuhi syarat, terbitkan berita yang relevan, lalu simpan hasil langkah secara atomik. Jika batas akhir kampanye tercapai, tutup laporan akhir dan hentikan pembuatan event baru.

### Migrasi simulasi kuartalan

| Komponen | Perilaku yang direncanakan |
| --- | --- |
| Kas, inflasi, pertumbuhan, AP | Pertahankan pembukuan per kuartal pada fase kalender pertama. Langkah virtual mungkin terjadi beberapa kali dalam satu kuartal. |
| Voting dan lobi | Pada fase pertama, antrekan tetap diselesaikan pada batas kuartal. Kalender menunjukkan tanggal sidang dan sisa AP. |
| `TURN_AT_LEAST`, durasi, cooldown, `delayTurns` | Pertahankan arti kuartalan untuk data lama. Skema berikutnya dapat menambah pilihan pemicu tanggal dan `delayDays` secara eksplisit. |
| Event acak | Mulai dengan batas maksimal satu event keputusan per kuartal seperti sekarang. Undian per langkah menggunakan peluang yang dikalibrasi terhadap jumlah hari berlalu dan hanya dilakukan jika belum ada event sejenis yang menunggu. Agenda terjadwal dan berita informasional punya jalur sendiri. |
| Riwayat | Simpan tanggal eksplisit untuk entri baru. Tampilkan label kuartal asli untuk laporan lama dan turunkan tanggal awal save dari kuartal aktif. Pertahankan pending event dan efek tertunda yang masih sah. |

Contoh migrasi save lama: kuartal aktif 6 dan `startYear: 2031` dipetakan ke 1 April 2032. Riwayat K1–K5 tetap dapat dibuka. Tambah versi format save, uji migrator dengan save aktif dan selesai, dan gunakan alur cadangan save yang sudah ada. Kampanye yang selesai tetap masuk laporan akhir ketika dibuka kembali.

## 3. Menu Berita

Berita berasal dari event, hasil voting, perubahan kebijakan, laporan kuartalan, atau komunikasi Presiden yang telah tercatat dalam simulasi. Redaksi dan medianya fiktif, dengan judul dan isi yang dibentuk dari templat lokal. Berita muncul setelah peristiwa terjadi di waktu game. Pengumuman undangan dapat muncul sebelum agenda, dengan label dan tanggal yang membedakan undangan dari liputan hasil.

- **Daftar** menampilkan berita terbaru, kategori, tanggal, dan penanda belum dibaca. Filter awal meliputi Politik, Ekonomi, Daerah, dan Pemerintahan. Dashboard menampilkan beberapa judul terbaru dan tautan ke daftar lengkap.
- **Detail** menampilkan judul, ringkasan, badan berita, dan tautan kontekstual ke event, kebijakan, atau laporan yang mendasarinya. Item yang membutuhkan tindakan menampilkan tombol menuju keputusan terkait. Membaca atau membuka ulang berita hanya mengubah status baca.
- **Data** menyimpan ID berita, tanggal simulasi, ID templat, kategori, referensi sumber, dan hasil dari keputusan terkait. Gunakan kunci per kejadian agar pemuatan ulang save dan penutupan kuartal yang sama tidak membuat artikel ganda. Simpan parameter penting yang diperlukan untuk menampilkan ulang berita lama.
- **Pacing** memakai berita informasional untuk mengisi sela antaragenda. Pilihan yang masih menunggu jawaban jangan tertimpa liputan penutup. Bila beberapa artikel berasal dari satu krisis, hubungkan sebagai perkembangan dengan urutan tanggal yang jelas.

Contoh alur: *Nilai Mata Uang Turun, Bank Perketat Penarikan* membuka memo krisis. Seusai pemain menjamin simpanan, artikel susulan mengutip keputusan pemerintah dan menunjuk perubahan kas pada ledger. Jika pemain memilih restrukturisasi, artikel susulan berfokus pada perlindungan simpanan kecil dan pengetatan kredit.

## 4. Konferensi pers dan pidato terbuka

| Interaksi | Alur pemain | Dampak yang dicatat |
| --- | --- | --- |
| **Konferensi pers** | Undangan muncul setelah keputusan atau krisis. Presiden bisa hadir, menugaskan juru bicara, atau melewati agenda. Saat hadir, pemain memilih jawaban terhadap dua pertanyaan dari templat. | Perubahan kepercayaan dan dukungan bisa bergantung pada kesesuaian jawaban dengan tindakan kabinet. Pendanaan dan hasil kebijakan tetap berasal dari tindakan yang benar-benar tercatat. |
| **Pidato terbuka** | Undangan dapat muncul setelah krisis nasional, kesepakatan damai, atau reformasi besar. Pemain memilih pesan utama dan, bila tersedia, satu komitmen yang bisa dipantau. | Pidato dapat menenangkan publik atau menimbulkan tuntutan tindak lanjut. Janji dicatat bersama tanggal tenggat dan status pemenuhan. |
| **Melewati agenda** | Pemain melihat tenggat dan akibat yang ditawarkan sebelum memilih. Dalam kondisi biasa, juru bicara dapat menutup agenda tanpa keputusan besar. | Satu hasil tercatat untuk setiap undangan. Kehadiran, penggantian, atau kedaluwarsa dapat melahirkan judul berita berbeda. |

Undangan komunikasi menjadi kandidat terpisah setelah event yang cocok. Periksa sumber pemicu, tingkat urgensi, jeda sejak undangan terakhir, dan apakah ada undangan aktif. Simpan satu instance per pemicu. Command engine memvalidasi ID undangan dan opsi, menyelesaikan pilihan sekali saja, dan menulis dampak ke ledger. Teks memakai templat yang dibundel lokal dan respons yang sudah ditulis. Sebagai contoh, setelah **Kesepakatan Damai Provinsi Serambi**, Presiden dapat menjelaskan pengawasan bersama. Jika belum ada hasil perundingan, pilihan untuk menyatakan kesepakatan sudah disahkan harus absen dari daftar opsi.

## 5. Peta konten historis dan pengembangan berikutnya

Nama negara, partai, kota, lembaga, dan tokoh di game mengikuti dunia fiktif REPUBLIKA. Tahun di bawah berfungsi sebagai rujukan pengembangan. ID event tetap stabil ketika adegan dipindahkan ke kalender atau diberi liputan berita.

| ID | Inspirasi | Pengembangan setelah kalender |
| --- | --- | --- |
| `EVT-HIST-001` | Konferensi Asia–Afrika 1955 | Jadwalkan konferensi, deklarasi, lalu liputan kesepakatan dagang. |
| `EVT-HIST-002` | Dekrit Presiden 1959 | Tambah tenggat perundingan serta berita respons setiap partai. |
| `EVT-HIST-003` | Supersemar 1966 | Jadwalkan peninjauan mandat dan catat kapan kewenangan berakhir. |
| `EVT-HIST-004` | Krisis moneter 1997–1998 | Buat konferensi pers untuk menjelaskan skema simpanan dan beri liputan hasil restrukturisasi. |
| `EVT-HIST-005` | Reformasi Mei 1998 | Kembangkan kabinet transisi menjadi skenario pembuka dengan tenggat agenda reformasi. |
| `EVT-HIST-006` | Pilpres langsung 2004 | Tempelkan negosiasi dukungan ke dua tanggal voting saat sistem pemilu tersedia. Lacak janji antarputaran hingga masa pemerintahan berikutnya. |
| `EVT-HIST-007` | Tsunami Aceh 2004 | Pecah tanggap darurat dan rekonstruksi menjadi dua agenda. Hubungkan ke wilayah terdampak ketika peta 2D tersedia. |
| `EVT-HIST-008` | Perjanjian Helsinki 2005 | Jadwalkan perundingan, pengumuman bersama, dan peninjauan pelaksanaan. |
| `EVT-HIST-009` | Pandemi COVID-19 2020 | Tambah perubahan kapasitas layanan dan konferensi pers berkala selama status darurat. |
| `EVT-HIST-010` | Pengalihan subsidi BBM 2022 | Jadwalkan tanggal harga baru dan pencairan bantuan. Tambah interaksi BLT aktif dengan reformasi ketika kebijakan final dimuat. |

## 6. Urutan pengembangan dan verifikasi

| Tahap | Hasil yang dapat diuji |
| --- | --- |
| **1. Kalender** | Header dan agenda menampilkan hari, tanggal, bulan, dan tahun dari state yang sama. Uji pergantian hari, bulan, kuartal, tahun, dan 29 Februari. Uji migrasi save kuartalan. |
| **2. Lanjut 5–14 hari** | Seed dan rangkaian command yang sama menghasilkan tanggal dan agenda yang sama setelah save/load. Uji interupsi di tengah langkah, penyelesaian sisa interval, command duplikat, dan pembukuan kas/AP satu kali pada batas kuartal. |
| **3. Berita** | Kedatangan event, respons pemain, dan laporan mengikuti urutan tanggal. Save/load mempertahankan isi serta status baca. Uji deduplikasi dan akses kembali ke sumber berita. |
| **4. Komunikasi Presiden** | Mulai dengan konferensi pers krisis bank dan pidato kesepakatan damai. Uji jalur hadir, delegasi, kedaluwarsa, respons ulang, dan konsistensi berita dengan hasil ledger. |
| **5. Kalibrasi** | Bandingkan tempo satu kampanye penuh dengan versi kuartalan. Ukur undangan per kuartal, slot tanpa keputusan, peristiwa tertunda, ukuran save, dan waktu resolusi. Sesuaikan bobot sebelum memperluas daftar pemicu. |

Jalur C++ dapat berjalan paralel sebagai prototipe headless. Gunakan format JSON dan fixture yang sama untuk membandingkan kalender, PRNG, lookup eligibility, serta konversi indikator fixed-point. Ukur kesamaan keluaran seed dan command terlebih dahulu, lalu bandingkan waktu resolusi dan penggunaan memori untuk beberapa kampanye penuh. Keputusan migrasi engine dapat dibuat setelah hasil benchmark dan kompatibilitas save tersedia. Dashboard desktop tetap membaca hasil domain melalui controller.
