# Kesiapan Rilis REPUBLIKA

Audit: 23 November 2026, basis kode `49bb1fb`, branch `feat/stage-6b-gameplay`. Dokumen ini bahan keputusan pemilik dan orchestrator, bukan persetujuan publikasi.

**Status: belum siap rilis stabil tanpa placeholder.** Kode Tahap 1–5, 6A, dan 6B tersedia; pekerjaan tersisa terutama konten final, balancing, migrasi saat ID diganti, serta bukti uji desktop oleh manusia. PR [#9](https://github.com/yann-gamedev/republika/pull/9) sudah digabung ke `main` (`847eca9`) saat verifikasi akhir. Keberhasilan CI tidak menutup gate manual.

## 1. Peta proyek dan sumber kebenaran

| Area                 | Lokasi                                                                   | Fungsi / status                                                                                                           |
| -------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Produk               | `README.md`, `AGENT.md`                                                  | Windows 10/11 x64, single-player, runtime offline; Indonesia nyata, orang dan partai fiktif                               |
| UI dan shell         | `apps/desktop/src`, `apps/desktop/src-tauri`                             | React/Vite + Tauri 2/WebView2; pelantikan, Meja kerja, kebijakan/voting, kabinet, 38 daerah, laporan, riwayat, pengaturan |
| Engine               | `packages/simulation/src`                                                | Resolusi deterministik, proyeksi, lobi, event, janji, reshuffle, aksi daerah, statistik, migrasi; tanpa I/O               |
| Data                 | `packages/game-data/content`, `packages/shared/src/validation`           | JSON dan schema; konten final dilindungi K7, bukan tugas agent tanpa izin baru                                            |
| Penyimpanan          | `apps/desktop/src/platform`, `packages/simulation/src/save`              | Autosave + 5 slot, backup, impor, migrasi; file di `Documents/REPUBLIKA/`                                                 |
| Aturan dan keputusan | `docs/SIMULATION_RULES.md`, `docs/DECISIONS.md`                          | Perilaku aktif dan keputusan pemilik; `docs/GDD.md`/`docs/TDD.md` menyimpan rancangan historis yang ditimpa `AGENT.md`    |
| Tooling              | `tools/sim`, `tools/balance`, `tools/perf`, `packages/game-data/src/cli` | Simulasi, Monte Carlo, laporan ukuran, pemeriksaan konten                                                                 |
| Bukti                | `docs/PROGRESS.md`, `docs/PERFORMANCE.md`, `docs/balance/latest.md`      | Hasil aktual per tahap; hasil lama bukan sertifikasi build rilis berikutnya                                               |
| Distribusi           | `.github/workflows/release.yml`, `docs/RELEASE.md`                       | Tag versi membangun installer NSIS dan draft GitHub Release; publikasi manual                                             |

Versi audit: `APP_VERSION = 0.1.0-rc.1`, `SAVE_FORMAT_VERSION = 3`, `rulesetVersion = 3`, skenario 20 kuartal. Tag lama `v0.1.0-rc.1` memiliki save format 2 dan konten berbeda; jangan menimpa tag atau memakai nomor yang sama untuk build publik baru.

## 2. Status terukur konten

`pnpm content:check` pada basis audit: valid secara schema, **18 peringatan**, `contentHash = 30cd533095581bc5f8c9800033bbe4b4e40ed12e89387527e6a822340807d1d6`.

| Koleksi        |           Tersedia | Target / kekurangan                                                                                              |
| -------------- | -----------------: | ---------------------------------------------------------------------------------------------------------------- |
| Fraksi         | 6, total 100 kursi | Target 6 terpenuhi; nama final fiktif sudah ditulis                                                              |
| Kementerian    |                  4 | Jumlah terpenuhi, semua masih placeholder                                                                        |
| Kebijakan      |                  4 | Target 12: **tambah minimal 8**, finalisasi 4 lama                                                               |
| Event          |                 15 | Target 15 terpenuhi secara jumlah: 10 sejarah + 2 placeholder umum + 3 fixture daerah                            |
| Arketipe       |                  2 | Target 6 termasuk fallback: **tambah minimal 4**, finalisasi 2 lama                                              |
| Latar belakang |                  5 | Semua nama dan ID masih placeholder                                                                              |
| Janji          |                  8 | Teks tersedia, ID dan angka perlu finalisasi/review                                                              |
| Calon pejabat  |                 22 | Semua ID dan 22 biografi masih placeholder                                                                       |
| Provinsi       |                 38 | Nama/isu tersedia; tidak ditemukan token placeholder di `provinces.json`, tetap perlu review editorial dan angka |
| Pimpinan       |                  4 | Wapres, Mensesneg, KSP, Jaksa Agung tersedia                                                                     |

18 peringatan = 15 `PLACEHOLDER_CONTENT` + 2 `CONTENT_BELOW_TARGET` + 1 `POLICY_NO_DOWNSIDE` (`POL-SOCIAL-PLACEHOLDER-001`). **Bukan berarti hanya ada 15 placeholder.** Pemeriksaan ID lama hanya mencakup kebijakan, fraksi, kementerian, event, arketipe; tidak mencakup latar belakang, janji, dan calon.

Inventaris seluruh konten: **50 ID mengandung `PLACEHOLDER`** = 4 kebijakan + 4 kementerian + 5 event + 2 arketipe + 5 latar belakang + 8 janji + 22 calon. Hitungan 38 yang sempat disebut di percakapan salah. Selain ID, masih ada nama, biografi, deskripsi, referensi dan `reasonCode` bertoken placeholder. Pemetaan `copy.contentReasons` untuk kode tersebut belum lengkap.

## 3. Daftar finalisasi untuk pemilik konten

Semua path di tabel relatif terhadap `packages/game-data/content/`. Tugas ini **belum dikerjakan** dalam bagian dokumentasi/gate. Pemilik menulis konten final; agent boleh membantu setelah izin eksplisit K7. Menghapus kata “Placeholder” saja tidak menggantikan review isi dan balancing.

| File                                                                 | ID yang harus difinalkan                                                                                                                                                                                            | Pekerjaan / kriteria lulus                                                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `policies/POL-ENERGY-PLACEHOLDER-001.json`                           | `POL-ENERGY-PLACEHOLDER-001`                                                                                                                                                                                        | Reformasi subsidi energi: nama, deskripsi, efek, modifier, reasonCode, trade-off final                                                           |
| `policies/POL-FISCAL-PLACEHOLDER-001.json`                           | `POL-FISCAL-PLACEHOLDER-001`                                                                                                                                                                                        | Reformasi pajak: isi dan biaya/efek final                                                                                                        |
| `policies/POL-GOVERNANCE-PLACEHOLDER-001.json`                       | `POL-GOVERNANCE-PLACEHOLDER-001`                                                                                                                                                                                    | Reformasi birokrasi: isi dan biaya/efek final                                                                                                    |
| `policies/POL-SOCIAL-PLACEHOLDER-001.json`                           | `POL-SOCIAL-PLACEHOLDER-001`                                                                                                                                                                                        | Bantuan sosial: isi final; selesaikan peringatan tanpa efek negatif dan dominasi strategi                                                        |
| `ministries.json`                                                    | `MIN-PLACEHOLDER-FISCAL`, `MIN-PLACEHOLDER-SOCIAL`, `MIN-PLACEHOLDER-ENERGY`, `MIN-PLACEHOLDER-GOVERNANCE`                                                                                                          | Nama lembaga Indonesia nyata sesuai K1; konsisten dengan kategori dan calon pejabat                                                              |
| `events/EVT-PLACEHOLDER-001.json`, `events/EVT-PLACEHOLDER-002.json` | `EVT-PLACEHOLDER-001`, `EVT-PLACEHOLDER-002`                                                                                                                                                                        | Banjir / demonstrasi: narasi, opsi, dampak, reasonCode final; opsi neutral tetap ada                                                             |
| `events/EVT-REG-PLACEHOLDER-001.json` … `-003.json`                  | `EVT-REG-PLACEHOLDER-001`, `EVT-REG-PLACEHOLDER-002`, `EVT-REG-PLACEHOLDER-003`                                                                                                                                     | Jalan Papua Pegunungan, pelabuhan Papua, air bersih NTT: review final meski judul sudah tanpa kata placeholder; uji syarat gejolak/aspirasi      |
| `archetypes.json`                                                    | `ARC-PLACEHOLDER-FISCAL`, `ARC-PLACEHOLDER-FALLBACK`                                                                                                                                                                | Nama/deskripsi dan syarat final; tambah 4 arketipe, fallback kondisi kosong tetap ada; hindari label baik/buruk                                  |
| `backgrounds.json`                                                   | `BG-PLACEHOLDER-EKONOM`, `BG-PLACEHOLDER-AKTIVIS`, `BG-PLACEHOLDER-PURNAWIRAWAN`, `BG-PLACEHOLDER-WALIKOTA`, `BG-PLACEHOLDER-PENGUSAHA`                                                                             | Lima profil, deskripsi dan modal awal final; tidak ada latar selalu unggul                                                                       |
| `promises.json`                                                      | `PRM-PLACEHOLDER-INFLASI`, `PRM-PLACEHOLDER-KERJA`, `PRM-PLACEHOLDER-FISKAL`, `PRM-PLACEHOLDER-SEJAHTERA`, `PRM-PLACEHOLDER-BERSIH`, `PRM-PLACEHOLDER-DIDUKUNG`, `PRM-PLACEHOLDER-STABIL`, `PRM-PLACEHOLDER-TUMBUH` | Delapan janji: nama/teks, ambang dan statistik selaras dengan laporan akhir; pilihan tepat 3 tetap berfungsi                                     |
| `cabinet-candidates.json`                                            | `CND-PLACEHOLDER-01` sampai `CND-PLACEHOLDER-22` (inklusif)                                                                                                                                                         | 22 biografi final, nama orang fiktif, ID/roleId final, statistik dan afiliasi ditinjau; tepat satu `initial: true` per jabatan                   |
| `baseline.json`, `scenario.json`, `provinces.json`                   | Tidak harus mengandung token untuk belum final                                                                                                                                                                      | Tinjau semua angka awal, drift, ekonomi, lobi dan kepuasan/isu daerah; keputusan perubahan dicatat, bukan otomatis disetujui karena valid schema |

Distribusi calon saat audit: 3 per kementerian (12), Wapres 1, Mensesneg 3, KSP 3, Jaksa Agung 3. K1 tidak mengizinkan memakai nama tokoh nyata atau logo/lambang nyata; sumber/satire event sejarah perlu review pemilik, bukan klaim akurasi sejarah otomatis.

### Referensi di luar konten yang ikut berubah

- Daftarkan file/rename pada `packages/game-data/src/contentBundle.ts`; CLI membaca disk, aplikasi memakai import statis. Lolos CLI saja tidak membuktikan konten ikut bundle.
- Perbarui referensi antar-JSON, `reasonCode` dan key `contentReasons` bersamaan. Baca `docs/PANDUAN-KONTEN.md` serta schema aktif, bukan hanya contoh historis.
- Rename ilustrasi `apps/desktop/src/assets/images/events/evt-placeholder-001.svg` dan `evt-placeholder-002.svg` mengikuti ID final. Tiga event daerah memakai fallback `dashboard-desk` yang disengaja dalam `apps/desktop/test/art.test.ts`; buat ilustrasi final atau minta persetujuan eksplisit fallback tetap dipakai.
- Test yang mengunci konten sekarang: `packages/game-data/test/loader.test.ts` (mengharapkan warning placeholder dan ID energi), `packages/simulation/test/campaign6b.test.ts` (ID event daerah), `apps/desktop/test/art.test.ts` (fallback). Sesuaikan test semantik saat konten final, jangan menghapus bukti migrasi.
- **Jangan menghapus seluruh hasil grep repo.** `packages/game-data/migrations/ruleset-2.json`, fixture save lama, fixture pengujian, dan arsip progres perlu menyimpan ID historis. `placeholder` HTML input di `apps/desktop/src/copy/id.ts` adalah petunjuk formulir, bukan konten belum jadi. `prompts/**` tetap dilindungi.

## 4. Risiko migrasi saat semua ID diganti — blocker teknis bersyarat

Finalisasi ID wajib aman untuk save lama; gunakan `docs/RELEASE.md` dan `AGENT.md` §5.13. Belum ada perubahan migrator pada bagian ini.

1. Naikkan ruleset dari 3 ke versi berikutnya untuk perubahan finalisasi; tambah peta `packages/game-data/migrations/ruleset-<N>.json` dan daftarkan di `src/rulesetMigrations.ts`.
2. Sebelum mengganti penulis save/konten, siapkan contoh save format 3/ruleset 3 dengan kabinet hasil reshuffle, 3 janji, latar belakang, kebijakan aktif, event pending, dan kampanye selesai. Jangan menimpa fixture historis dilindungi; penambahan fixture ke area dilindungi perlu izin.
3. **Peta rename saja belum cukup untuk field 6B.** `packages/simulation/src/save/migrateRuleset.ts:renameAll` saat audit belum memetakan `president.backgroundId`, `promiseIds`, key `cabinet`/`leaders`, `holderId`, key `provinces`, atau `archetypeId`. Untuk ID yang akan diganti, lengkapi migrasi di sesi utama dan test sebelum finalisasi konten. `syncCampaignContent` saat ini bisa mengosongkan janji atau mengembalikan pejabat ke calon awal bila ID lama hilang. Ini risiko kehilangan pilihan pemain, bukan kegagalan schema yang pasti terdeteksi.
4. Kriteria lulus: save lama valid, pilihan/pejabat dan nilai tersimpan tetap setara, backup asli ada, bisa lanjut satu kuartal, simpan ulang lalu muat; laporan kampanye selesai tetap bermakna. Laporan/ledger historis tidak boleh rusak karena nama sumber hilang.
5. Perubahan aturan tanpa pergantian ID tetap membutuhkan ruleset baru dan catatan `docs/SIMULATION_RULES.md` / `CHANGELOG.md`. Format save hanya naik jika bentuknya berubah; jangan menaikkan format sekadar mengganti ID.

## 5. Backlog rilis berdasarkan prioritas

Status seluruh baris di bawah **terbuka**, kecuali dinyatakan keputusan opsional. Pemilik dapat mendelegasikan tugas agent, bukan menyamakan dokumen dengan penyelesaian.

| Prioritas / ID | Sisa pekerjaan                                                                | Penanggung jawab                          | Bukti penutupan                                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0 R1          | Finalisasi 50 ID, teks/biografi/reasonCode; tambah 8 kebijakan dan 4 arketipe | Pemilik konten; agent setelah izin K7     | Review isi + `content:check --strict` exit 0; target jumlah terpenuhi, warning ditutup/diputuskan satu per satu                                                  |
| P0 R2          | Migrasi seluruh ID final dengan pilihan 6B terjaga (§4)                       | Agent sesi utama + pemilik untuk fixture  | Test regresi save + update desktop nyata, backup terverifikasi                                                                                                   |
| P0 R3          | Balancing konten final, ekonomi dan daerah                                    | Pemilik/orchestrator putuskan, agent ukur | Monte Carlo 5000 run, 0 softlock, review semua flag + playtest strategi berbeda; ruleset dan keputusan tercatat                                                  |
| P0 R4          | Gate 6A belum lengkap dan 6B belum playtest pemilik                           | Pemilik                                   | Kampanye kedua dan pengujian fitur 6B; 1280×720 dan skala 125%; hasil di `PLAYTEST-UI-V2.md`                                                                     |
| P0 R5          | RAM total dan cold start build terkini belum terbukti                         | Pemilik                                   | Task Manager app + semua WebView2, jendela di depan, menu dan setelah 20 kuartal; OS/hardware/metode dicatat di `PERFORMANCE.md`                                 |
| P0 R6          | Installer baru, update dari rilis lama, offline dan closed playtest           | Pemilik + CI                              | Windows 10/11 x64 bersih tanpa dev tools; 20 kuartal offline, backup/update/uninstall tidak menghapus data; feedback 3–5 teman di `PLAYTEST-CLOSED.md`           |
| P0 R7          | Kandidat/tag baru dan bukti CI pada commit final                              | Agent + pemilik                           | Versi sinkron via `version:set`, changelog versi baru, CI checks/desktop hijau, installer/checksum ditinjau; konfirmasi pemilik sebelum tag dan publikasi        |
| P1 R8          | Kalimat alasan konten dan review teks seluruh layar                           | Pemilik konten + agent untuk pemetaan     | Bukan teks dummy; laporan menjelaskan sebab, tidak mengandalkan ID mentah / fallback “Dampak {sumber}” untuk kejadian utama                                      |
| P1 R9          | Aset akhir kampanye/fraksi dan tiga ilustrasi daerah belum final              | Pemilik art                               | Review `ASET-GAMBAR.md`; aset lokal atau keputusan tertulis fallback/descope sebelum stabil; utilitas opsional bukan blocker otomatis                            |
| P1 R10         | Putuskan lima usulan 4.1 yang masih terbuka                                   | Pemilik/orchestrator                      | Terima/tolak/tunda per butir di `OPEN_QUESTIONS.md`, catat `DECISIONS.md`; jangan mengubah aturan diam-diam                                                      |
| P1 R11         | Sinkronisasi dokumentasi penulis konten yang masih historis                   | Agent                                     | `PANDUAN-KONTEN.md` masih punya klaim engine/migrator/CLI belum tersedia dan contoh statistik lama; cocokkan schema/evaluator aktif sebelum menulis konten final |

### Flag balancing yang belum selesai

`docs/balance/latest.md` pada 5000 run: 0 softlock, save maksimum 259,6 KiB. Ini bukti konten audit, bukan jaminan konten final.

- `EVENT_NEVER_SEEN`: `EVT-REG-PLACEHOLDER-001` dan `-002` tidak muncul; bot tidak menekan persetujuan cukup rendah. Uji kondisi gejolak, ambang 25 dan pengali bobot 3 secara terarah. Jangan menurunkan ambang hanya untuk menghilangkan warning.
- `VOTE_ALWAYS_PASSES`: kebijakan energi 4670/4670 dan sosial 11810/11810 pengajuan lolos.
- `GREEDY_FAVOURITE`: sosial dipilih di 100% kampanye greedy.
- `ARCHETYPE_DOMINANT`: fallback mendominasi 92% kampanye random dan 100% beberapa strategi; arketipe fiskal 100% austerity. Tambah konten lalu ukur lagi.
- `POLICY_NO_DOWNSIDE`: kebijakan sosial belum punya efek negatif yang dikenali checker. Biaya kas saja bukan bukti semua trade-off sudah terwakili checker; pemilik tetap review desain.

Flag bukan vonis bug otomatis. Penutupan membutuhkan tuning atau alasan penerimaan spesifik, bukan menghapus laporan.

### Bukan pekerjaan wajib rilis ini tanpa keputusan baru

- Statistik “Loyalitas” di wireframe profil belum ada di model; UI memakai efektivitas dan integritas.
- Warta belum menjadikan reshuffle/aksi daerah berita utama; dampak tersedia di ledger, Meja kerja, rekam jejak. Putuskan descope atau minta pekerjaan tersendiri.
- Android, multiplayer, akun/server, updater online, fitur bank ide bukan scope rilis Windows ini.
- Installer belum ditandatangani; dokumentasikan peringatan SmartScreen. Jangan menyatakan installer bertanda tangan atau bebas peringatan.
- SVG 260,2 KiB mentah / 67,4 KiB gzip melebihi sasaran 100 KB mentah aset yang sudah diterima pemilik; pengecualian terdokumentasi, bukan alasan menulis ulang aset dalam bagian ini.

## 6. Gate otomatis yang ditambahkan

```powershell
pnpm content:check
pnpm content:check --strict
# Folder alternatif: pakai path absolut (script berjalan dengan cwd packages/game-data).
pnpm content:check "$PWD/packages/game-data/content" --strict
```

- Mode biasa tetap kompatibel: schema/referensi invalid gagal, warning tidak menggagalkan proses.
- `--strict` juga gagal bila nilai string atau key dalam raw bundle aktif mengandung `placeholder` tanpa membedakan kapitalisasi. Mencakup ID, referensi, nama, biografi, reasonCode/key, latar belakang, janji, calon dan semua koleksi yang dibaca CLI.
- `.github/workflows/release.yml` menjalankan strict **hanya untuk tag stabil tanpa `-`**. Tag `-rc`, `-beta`, dan prerelease lain tetap boleh untuk playtest berkonten contoh; workflow selalu menjalankan pemeriksaan biasa. Berlaku juga untuk `workflow_dispatch` berdasarkan tag input.
- Strict saat audit **diharapkan exit 1**. Menambah gate tidak berarti placeholder sudah diperbaiki.
- Batas gate: hanya token `placeholder` dalam bundle konten aktif, bukan penilaian mutu tulisan, `TODO`/`TBD`, aset, nama file, target jumlah, atau tuning. Warning selain placeholder tetap perlu ditinjau manusia. Rilis stabil tetap dilarang oleh checklist ini bila jumlah konten belum cukup; strict exit 0 saja bukan persetujuan rilis.
- Tidak memindai fixture save, peta migrasi atau arsip dokumentasi. Tidak menambah dependency dan tidak mengubah runtime/anggaran §5.17.

## 7. Gate akhir dan bukti yang harus diserahkan

Sebelum tag stabil, jalankan pada commit kandidat yang sama dan simpan hasil di `docs/PROGRESS.md`:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm content:check --strict
pnpm balance --runs=5000
pnpm build:web
pnpm test:e2e
cargo test --locked --manifest-path apps/desktop/src-tauri/Cargo.toml
pnpm build
pnpm perf:report
```

Batas `AGENT.md` §5.17: RAM target 150 MB/maksimum 200 MB; heap 30/50 MB; installer 10/15 MB; cold start 1,5/3 detik; resolve kuartal 20/50 ms; save 300 KB/1 MB. Ukur ulang konten/aset final; angka browser heap bukan RAM proses desktop. Runtime harus offline setelah WebView2 tersedia; pemasangan bootstrapper WebView2 bisa membutuhkan internet.

Checklist persetujuan pemilik:

- [ ] R1–R7 ditutup dengan link bukti, bukan hanya tanda centang; R8–R11 ditutup atau keputusan scope tertulis.
- [ ] Tidak ada placeholder pada data/narasi aktif; cek manual semua layar hingga laporan akhir dan test konten benar-benar masuk bundle.
- [ ] Seluruh warning konten/balance punya hasil perbaikan atau keputusan penerimaan yang jelas.
- [ ] `docs/PLAYTEST-UI-V2.md`, `docs/PLAYTEST-CLOSED.md`, `docs/PERFORMANCE.md` berisi hasil aktual kandidat terbaru; catatan slice/MVP lama tetap arsip, bukan bukti pengujian build baru.
- [ ] Lisensi kode/font/aset dan aturan orang/partai fiktif ditinjau. Font OFL lokal tersedia; tidak ada CDN/network runtime.
- [ ] Versi/changelog sesuai build baru; `main` dan CI kandidat hijau. Unduh installer draft, periksa SHA-256 dan uji sebelum publikasi.
- [ ] Pemilik menyetujui pembuatan tag rilis dan publikasi. Jangan force-push tag lama, mengubah identifier `id.republika.game`, atau menghapus data pemain.

## 8. Urutan kerja untuk orchestrator

1. Sepakati scope stabil dan keputusan terbuka R8–R11; beri izin K7 jika agent akan menulis konten.
2. Amankan save format 3/ruleset 3 dan perbaiki cakupan rename sebelum ID final diganti (R2).
3. Finalisasi konten per kelompok, tambah kekurangan jumlah, sinkronkan import/aset/test/migrasi (R1).
4. Balancing dan uji terarah daerah, lalu playtest manusia/desktop/performa (R3–R6). Ulangi pengukuran sesudah tuning/aset akhir.
5. Sinkronkan versi/dokumen, verifikasi commit final, minta persetujuan tag, buat draft dan uji installer, baru pemilik publikasikan (R7).

Setiap bagian satu commit; aturan simulasi ditulis di sesi utama. Bagian dokumentasi/gate ini berhenti setelah bukti verifikasi dan commit, tidak menjalankan tahap konten atau menerbitkan rilis.
