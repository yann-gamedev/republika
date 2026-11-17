# Aturan Simulasi — REPUBLIKA (ruleset 3)

Dokumen ini menjelaskan cara engine menghitung satu kuartal, ditulis untuk penulis konten. Anda tidak perlu membaca kode untuk memperkirakan efek sebuah kebijakan. Acuan normatif tetap `AGENT.md` §5; bila ada beda, `AGENT.md` yang menang dan dokumen ini wajib diperbaiki.

Semua angka contoh di bawah memakai **fixture uji** (`packages/game-data/fixtures/slice/`), bukan konten rilis. Konten di `content/` masih placeholder dan belum diseimbangkan.

---

## 1. Angka dan pembulatan

- **Indikator** disimpan dengan satu desimal. Anda menulis `-4` atau `0.4`; engine menyimpannya sebagai persepuluhan (`-40`, `4`). Ditampilkan kembali sebagai −4,0 dan 0,4.
- **Kas** ditulis dalam triliun (maksimal 3 desimal) dan disimpan sebagai miliar. `6` = Rp6 T = 6.000 miliar.
- **Pembulatan** selalu ke 1 desimal dengan aturan _setengah menjauhi nol_: 2,25 → 2,3; −2,25 → −2,3; 4,52 → 4,5.
- Pembulatan dilakukan **sekali, setelah semua pengali** pada efek itu dikalikan. Contoh: −4,0 × 0,92 × 1,5 = −5,52 → −5,5.
- Biaya dan efek kas **tidak pernah** dikalikan pengali apa pun; angkanya pasti.

## 2. Batas nilai (domain)

| Indikator               | Min | Maks |
| ----------------------- | --- | ---- |
| Persetujuan Publik      | 0   | 100  |
| Stabilitas Politik      | 0   | 100  |
| Kesehatan Fiskal        | 0   | 100  |
| Pertumbuhan (%)         | −10 | 15   |
| Inflasi (%)             | −5  | 50   |
| Pengangguran (%)        | 0   | 30   |
| Kesejahteraan           | 0   | 100  |
| Kepercayaan Publik      | 0   | 100  |
| Dukungan fraksi         | 0   | 100  |
| Efektivitas kementerian | 40  | 90   |

Selama kuartal berjalan nilai boleh sementara keluar batas. Pada langkah _normalize_ (langkah 10) nilai dipotong ke batas, dan pemotongan dicatat di ledger sebagai `CLAMPED`. Kas tidak punya batas dan boleh negatif.

## 3. Aksi pemain dan Poin Aksi (AP)

Setiap kuartal pemain mendapat **2 AP** (dari `scenario.json`).

| Aksi               | Biaya                          | Kapan ditolak                                                                                            |
| ------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Ajukan kebijakan   | `apCost` kebijakan             | AP kurang, syarat (`requirements`) belum terpenuhi, masih cooldown, sudah aktif, sudah diajukan, konflik |
| Lobi fraksi        | 1 AP + kas `lobbyCostTrillion` | AP kurang, fraksi sudah dilobi kuartal ini                                                               |
| Tanggapi event     | 0 AP                           | Event tidak sedang menunggu, opsi tidak ada                                                              |
| Batalkan pengajuan | AP dikembalikan                | Pengajuan tidak ditemukan                                                                                |
| Akhiri kuartal     | —                              | Masih ada event yang belum ditanggapi                                                                    |

- AP **dipesan saat aksi diajukan**, bukan di akhir kuartal. Membatalkan mengembalikan AP.
- **Syarat kebijakan** dicek saat diajukan, terhadap keadaan saat itu.
- **Konflik** cukup ditulis di salah satu kebijakan; engine memberlakukannya dua arah. Kebijakan A yang menulis konflik dengan B tidak bisa diajukan saat B aktif atau diajukan, dan sebaliknya.
- Tanggapan event boleh diganti sebelum kuartal diakhiri; pilihan terakhir yang dipakai.
- Setiap aksi punya ID unik per kuartal; aksi dengan ID sama ditolak (`DUPLICATE_COMMAND`).

## 4. Urutan akhir kuartal

Saat pemain menekan **Akhiri Kuartal**, engine menjalankan 12 langkah ini dengan urutan tetap. Di setiap langkah, bila ada beberapa hal sejenis, diproses urut ID (abjad).

1. **Validasi** — tolak bila ada event belum ditanggapi.
2. **Tanggapan event** — efek opsi yang dipilih diterapkan.
3. **Lobi** — kas dipotong biaya lobi; fraksi yang dilobi mendapat bonus voting.
4. **Voting** — kebijakan yang diajukan diproses urut ID (lihat §5).
5. **Biaya awal** — `fiscalCostTrillion` kebijakan yang lolos dipotong dari kas.
6. **Efek langsung** — efek `IMMEDIATE` kebijakan yang lolos diterapkan; efek `DELAYED` dijadwalkan.
7. **Tick** — cooldown berkurang, kebijakan aktif menjalankan efek `PER_TURN` dan durasinya berkurang, efek tertunda yang jatuh tempo diterapkan.
8. **Dinamika dasar (baseline)** — lihat §8.
9. **Efektivitas kementerian** — lihat §7.
10. **Normalize** — semua nilai dipotong ke batas.
11. **Pilih event berikutnya** — event untuk kuartal depan diundi (lihat §9). Tidak ada undian setelah kuartal terakhir.
12. **Laporan** — laporan kuartal dibuat, kuartal maju. Di kuartal terakhir kampanye ditandai selesai.

Akibat urutan ini: efek kebijakan dari langkah 6–7 terjadi **sebelum** baseline, sehingga baseline langsung "menarik" sebagian efek itu kembali pada kuartal yang sama (lihat contoh di §10).

## 5. Voting parlemen dan lobi

Setiap fraksi memberi suara sebagai satu blok.

**Skor fraksi = dukungan + preferensi kategori × 10 + bonus lobi**

- Dukungan: 0–100 (nilai saat voting, sudah termasuk efek event di langkah 2).
- Preferensi kategori: −2 … +2 dari file fraksi (`policyPreferences`).
- Bonus lobi: +15 bila fraksi dilobi kuartal ini (dari `lobbySupportBonus`), selain itu 0.

Fraksi **setuju** bila skor ≥ 50. Kebijakan **lolos** bila kursi setuju ≥ 51 dari 100.

Contoh fixture, kebijakan fiskal (Reformasi PPN):

| Fraksi     | Kursi | Dukungan | Pref. FISCAL | Skor | Suara  |
| ---------- | ----- | -------- | ------------ | ---- | ------ |
| Teknokrat  | 30    | 55       | +2           | 75   | Setuju |
| Kerakyatan | 38    | 48       | −1           | 38   | Tolak  |
| Daerah     | 32    | 45       | 0            | 45   | Tolak  |

Hanya 30 kursi → gagal. Dengan lobi ke Fraksi Daerah: 45 + 15 = 60 → setuju, total 62 kursi → lolos.

- **Bonus lobi hanya berlaku untuk voting kuartal itu**, tidak mengubah dukungan permanen.
- **Kebijakan tanpa voting** (`needsVote: false`) langsung aktif.
- **Voting gagal:** AP tetap terpakai, Kepercayaan Publik −2,0, kebijakan masuk cooldown 1 kuartal (tidak bisa diajukan kuartal berikutnya, bisa lagi sesudahnya), dan biaya kas **tidak** dipotong.

## 6. Efek kebijakan

| Tipe efek                        | Kapan terjadi                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| `MODIFY_INDICATOR` + `IMMEDIATE` | Sekali, di kuartal kebijakan lolos                                                             |
| `MODIFY_INDICATOR` + `PER_TURN`  | Setiap kuartal selama kebijakan aktif, **termasuk kuartal lolos**. Durasi 3 = 3 kali           |
| `MODIFY_INDICATOR` + `DELAYED`   | Sekali, `delayTurns` kuartal setelah lolos. Lolos di K1 dengan `delayTurns: 2` → terjadi di K3 |
| `MODIFY_TREASURY`                | Sekali, langsung                                                                               |
| `CHANGE_FACTION_SUPPORT`         | Sekali, langsung. Bila memakai `ideologyTag`, berlaku ke semua fraksi yang punya tag itu       |
| `MODIFY_MINISTRY_EFFECTIVENESS`  | Sekali, langsung                                                                               |
| `SET_FLAG` / `CLEAR_FLAG`        | Sekali, langsung                                                                               |

**Masa berlaku:** kebijakan aktif selama `durationTurns` kuartal (kuartal lolos dihitung). Setelah habis, kebijakan masuk **cooldown** `cooldownTurns` kuartal. Biaya per kuartal (`perTurnCostTrillion`) dipotong setiap kuartal kebijakan berjalan, di langkah baseline.

**Pengali untuk efek indikator dari kebijakan** (tidak berlaku untuk event, kas, fraksi, atau flag):

1. **Pengali kementerian** sedomain: `0,8 + 0,4 × (efektivitas − 40) / 50`.

   | Efektivitas | 40   | 50   | 55   | 60   | 65   | 75   | 90   |
   | ----------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
   | Pengali     | 0,80 | 0,88 | 0,92 | 0,96 | 1,00 | 1,08 | 1,20 |

2. **Modifier bersyarat** (`modifiers`): bila semua syarat `when` terpenuhi, efek ke indikator `appliesTo` dikalikan `multiplier`. Beberapa modifier yang cocok saling dikalikan.

Kedua pengali membaca keadaan **di awal kuartal** (sebelum langkah apa pun), bukan keadaan yang sedang berubah. Jadi efek kebijakan A di kuartal yang sama tidak memicu modifier kebijakan B.

## 7. Kementerian

- Ada satu kementerian per kategori (Keuangan = FISCAL, Sosial = SOCIAL, Energi = ENERGY, Dalam Negeri = GOVERNANCE). Efektivitas 40–90.
- Di langkah 9, efektivitas naik **+1 untuk setiap kebijakan sedomain yang berjalan kuartal itu** (termasuk yang baru habis durasinya).
- Efek `MODIFY_MINISTRY_EFFECTIVENESS` dari kebijakan/event juga mengubahnya.
- Perubahan efektivitas baru memengaruhi pengali **mulai kuartal berikutnya**.

## 8. Dinamika dasar (baseline)

Parameter di `baseline.json`. Semua rumus memakai nilai setelah efek kebijakan (awal langkah 8), dihitung bersamaan, lalu dibulatkan ke 1 desimal.

| Yang berubah     | Rumus                                                           | Arti                                                                                       |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Inflasi          | `(target − inflasi) × 0,25`                                     | Kembali 25% menuju 3,0%                                                                    |
| Pengangguran     | `−0,15 × (pertumbuhan − 2,5)`                                   | Pertumbuhan di atas 2,5% menurunkan pengangguran                                           |
| Persetujuan      | `(50 − persetujuan) × 0,1`                                      | Kembali 10% menuju 50                                                                      |
| Pertumbuhan      | `(4,0 − pertumbuhan) × 0,2`                                     | Kembali 20% menuju 4,0%                                                                    |
| Kas              | `+ pendapatan − belanja − biaya per kuartal kebijakan aktif`    |                                                                                            |
| Kesehatan Fiskal | `−3,0` bila kas < 0 setelah langkah di atas                     | Penalti per kuartal                                                                        |
| Dukungan fraksi  | `(dukungan dasar − dukungan) × 0,1 + 0,05 × (persetujuan − 50)` | Kembali 10% menuju `baseSupport`, lalu semua fraksi ikut bergeser mengikuti suasana publik |

**Drift dukungan fraksi (ruleset 3).** Pengaruh persetujuan diatur `factionApprovalInfluence` di `baseline.json` (opsional, default 0,05). Persetujuan yang dipakai adalah nilai di awal langkah baseline. Contoh: dukungan 65, dasar 55, persetujuan 58 → (55 − 65) × 0,1 + 0,05 × 8 = −1,0 + 0,4 = **−0,6**. Persetujuan publik 70 menambah +1,0 dukungan per kuartal ke **semua** fraksi; persetujuan 40 mengurangi −0,5.

Contoh pada keadaan awal fixture (persetujuan 58, inflasi 3,4, pertumbuhan 4,8, pengangguran 5,6): inflasi −0,1; pengangguran −0,345 → −0,3; persetujuan −0,8; pertumbuhan −0,16 → −0,2.

## 9. Event

**Kapan muncul.** Di akhir kuartal N (langkah 11) engine mengundi event untuk kuartal N+1. Event itu tampil sebagai "nota dinas" di kuartal N+1 dan **wajib ditanggapi** sebelum kuartal N+1 bisa diakhiri.

**Siapa yang boleh ikut undian** (semua harus terpenuhi):

1. Semua syarat `eligibility` terpenuhi. Syarat dicek terhadap keadaan akhir kuartal N, **tetapi `TURN_AT_LEAST` memakai nomor kuartal kedatangan**. `TURN_AT_LEAST: 3` berarti paling cepat muncul di kuartal 3.
2. Tidak sedang cooldown.
3. Bila `uniquePerCampaign: true`, belum pernah muncul di kampanye ini.
4. Tidak sedang menunggu tanggapan.

**Cara undian.** Kandidat diurutkan menurut ID, lalu dipilih acak sesuai bobot `triggerWeight`. Peluang sebuah event = bobotnya ÷ jumlah bobot semua kandidat. Contoh fixture kuartal 2: Banjir (10) dan Demo (30) → 25% dan 75%. Jumlah event per kuartal maksimal `maxEventsPerQuarter` (default 1); bila lebih dari 1, event yang sudah terpilih tidak diundi lagi.

**Keacakan tetap bisa diulang.** Undian memakai seed kampanye + nomor kuartal. Kampanye dengan seed sama dan keputusan sama selalu mendapat event yang sama.

**Cooldown event.** Event yang terpilih langsung mendapat cooldown `cooldownTurns`. Hitung mundur mulai kuartal kedatangan. Contoh: Banjir (cooldown 4) diundi di akhir K1, tiba di K2, cooldown habis di akhir K5, sehingga paling cepat tiba lagi di K6.

**Tanggapan.**

- Efek opsi event tidak memakai pengali kementerian maupun modifier.
- Efek `PER_TURN` pada opsi event diterapkan **sekali** (event tidak punya durasi). Efek `DELAYED` dijadwalkan seperti kebijakan.
- Tanggapan diterapkan di langkah 2, sebelum lobi dan voting. Jadi efek event ke dukungan fraksi ikut memengaruhi voting kuartal yang sama.

## 10. Contoh lengkap: Reformasi Subsidi Energi (fixture)

Keadaan awal: Kementerian Energi efektivitas 55 → pengali 0,92. Inflasi 3,4 (< 5, modifier tidak aktif). Kebijakan tanpa voting.

| Kuartal | Yang terjadi                                                                                                                                                                                                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K1      | Kas −2 T (biaya awal) +8 T (penghematan). Inflasi +0,6 × 0,92 = +0,55 → **+0,6**. Persetujuan −4 × 0,92 = −3,68 → **−3,7**. Pertumbuhan +0,3 × 0,92 = 0,276 → **+0,3** (PER_TURN). Fraksi bertag `populis` −5. Efektivitas Energi +2 (efek) +1 (pengalaman) = 58. Lalu baseline berjalan |
| K2      | Pertumbuhan **+0,3** lagi (pengali dari efektivitas 58 = 0,944 → 0,28 → 0,3). Efektivitas +1                                                                                                                                                                                             |
| K3      | Pertumbuhan **+0,3** terakhir. Kesejahteraan +3 × 0,952 (efektivitas 59) = 2,86 → **+2,9** (DELAYED 2; efek tertunda dari kebijakan tetap memakai pengali kementerian). Kebijakan habis → cooldown 2 kuartal                                                                             |
| K4–K5   | Cooldown; tidak bisa diajukan                                                                                                                                                                                                                                                            |

## 11. Proyeksi kebijakan (yang dilihat pemain sebelum mengajukan)

- Untuk setiap indikator yang disentuh kebijakan: **perkiraan total** = efek setelah pengali (PER_TURN × durasi, DELAYED sekali), lalu ditampilkan sebagai **arah** (naik/turun) dan **rentang 75%–125%** dari perkiraan itu.
- Contoh: Bantuan Langsung Tunai fixture, efektivitas Sosial 60 (pengali 0,96). Persetujuan +4 × 0,96 = 3,8 → rentang **+2,9 … +4,8**. Kesejahteraan +2 × 0,96 = 1,9 per kuartal × 3 = **5,7**.
- **Biaya kas ditampilkan pasti**: biaya awal, biaya per kuartal, dan total (awal + per kuartal × durasi).
- Proyeksi juga menampilkan perkiraan hasil voting dengan dukungan saat ini (tanpa lobi).
- Proyeksi **tidak** memperhitungkan baseline atau event, dan tidak memakai unsur acak.

## 12. Laporan dan ledger

- Setiap perubahan angka dicatat di **ledger**: sumber (kebijakan/event/lobi/voting/baseline/kementerian/sistem), ID sumber, `reasonCode`, nilai sebelum, perubahan, nilai sesudah, dan urutan.
- Laporan kuartal berisi perubahan tiap indikator, **3 penyebab terbesar** per indikator (perubahan dengan `reasonCode` sama dari sumber yang sama dijumlahkan), kebijakan lolos/gagal, hasil voting, dan perubahan kas.
- Nilai akhir selalu bisa direkonstruksi: nilai awal + jumlah semua perubahan di ledger (termasuk `CLAMPED`). Ini diuji otomatis.

## 13. Determinisme

Keadaan + aksi + seed + konten yang sama selalu menghasilkan hasil yang sama persis. Test menyimpan sidik jari (hash) hasil 4 kuartal skrip tetap di `packages/simulation/test/__fixtures__/slice-4q.json`. Mengubah satu angka di fixture konten membuat test itu gagal; itu tanda fixture bekerja. Fixture hanya diperbarui bila aturan sengaja diubah, dan `rulesetVersion` dinaikkan.
