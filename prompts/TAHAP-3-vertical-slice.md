# TAHAP 3 — Vertical slice (4 kuartal bisa dimainkan)

**Tujuan tahap:** pemain bisa dilantik, memainkan 4 kuartal dengan 3 kebijakan, voting, lobi, dan 2 event, melihat laporan sebab-akibat, dengan autosave ke file sehingga game bisa ditutup lalu dilanjutkan. **Tujuan utamanya membuktikan gameplay menyenangkan sebelum konten diperbanyak.**

**Wajib dibaca:** `AGENT.md` §4, §5.2, §5.4, §5.7, §5.8, §5.12, §5.17; `docs/SIMULATION_RULES.md`.

**Prasyarat konten:** 2 event + 3 fraksi sementara (lihat `PANDUAN-KONTEN.md` → Tahap 3). `scenario.json`: `maxTurns: 4`.

---

## Bagian 3.1 — Event engine

**Tugas**
- `events/select.ts`: eligibility (requirement + cooldown + `uniquePerCampaign`), urut ID, lalu `weightedPick` dengan RNG stream turn, maksimal `maxEventsPerQuarter`.
- Hubungkan ke langkah 11 `resolveTurn`. `RESPOND_EVENT` diterapkan di langkah 2. `END_QUARTER` ditolak dengan `EVENT_RESPONSE_REQUIRED` jika masih ada event pending.
- Naikkan `rulesetVersion`, perbarui fixture, dan dokumentasikan di `SIMULATION_RULES.md`.

**Acceptance criteria**
- Test eligibility, cooldown, unique, distribusi bobot (10.000 draw seeded mendekati bobot ±3%), dan penolakan end-quarter.

## Bagian 3.2 — GameController dan store

**Tugas**
- `apps/desktop/src/store/gameController.ts`: `startCampaign({presidentName, cabinetName})` (seed dibuat di `platform/` dari waktu + random, lalu disimpan di state), `dispatch(command)`, `endQuarter()`, dan `loadFromSave(file)`. Controller memanggil engine murni, memperbarui store, lalu memicu autosave.
- Store Zustand tipis: hanya `state`, `lastReport`, `uiStatus`. **History tidak disimpan di store**, melainkan dimuat dari save saat halaman Riwayat/Laporan dibuka (AGENT §5.17).
- Error engine (kode stabil) dipetakan ke pesan Indonesia untuk toast. Tidak ada exception yang lolos ke UI tanpa ditangani.
- Seed RNG tidak ditampilkan di UI.

**Acceptance criteria**
- Test controller dengan `MemoryStorage`: alur pelantikan → command → end-quarter → state dan history sesuai. Command ganda dengan `commandId` sama tidak berefek dua kali.

## Bagian 3.3 — Penyimpanan file dan autosave

**Tugas**
- Rust: command `save_atomic(path, contents)` (tulis `.tmp` → flush/sync → rename), `read_text(path)`, dan `list_saves()`. Path dibatasi di bawah `Documents/REPUBLIKA/` dan **ditolak** jika ada traversal (`..`). Rust-nya cukup sekitar 50–80 baris, dengan komentar penjelasan untuk pemilik proyek.
- `TauriFileStorage` mengimplementasikan `SaveStorage`. Saat pertama kali jalan, buat folder `saves/` dan `logs/`.
- Autosave setelah pelantikan dan setiap end-quarter. Sebelum menimpa, `autosave.json` lama disalin menjadi `autosave.bak.json`.
- Format `SaveFile` sesuai AGENT §5.12, dengan `saveFormatVersion: 1`.
- Menu Utama → **Lanjutkan** memuat autosave. Save korup/tidak valid → dialog "Save rusak" + opsi pakai `.bak`.

**Acceptance criteria**
- Test `SaveStorage` (kontrak yang sama dijalankan untuk `MemoryStorage` + implementasi Node-fs sebagai pengganti Tauri di test): tulis-baca bolak-balik identik (hash), file setengah tertulis tidak merusak save sebelumnya, dan JSON rusak ditangani.
- Verifikasi manual di Windows: main 2 kuartal → tutup app → buka → Lanjutkan → state sama.

## Bagian 3.4 — UI: Pelantikan, Dashboard, Kebijakan, Parlemen

**Tugas.** Ganti data mock dengan data dari store.
- **Pelantikan:** nama presiden + kabinet, lalu "Ucapkan Sumpah Jabatan". Tampilkan momen singkat bernuansa pelantikan dengan nama pemain.
- **Dashboard:** 8 indikator + delta, kas, AP, "Kuartal X dari N", kebijakan aktif, antrean command + tombol batal.
- **Kebijakan:** kategori, biaya AP, biaya kas (pasti), prasyarat (✓/✗ + alasan), proyeksi rentang (↑/↓), label "Butuh voting", status cooldown/aktif. Tombol nonaktif disertai alasan.
- **Parlemen:** `Hemicycle` SVG, support per fraksi, perkiraan suara untuk kebijakan yang diantrekan, dan tombol "Lobi Fraksi" beserta biayanya.
- Shortcut keyboard dasar: `Enter` di dialog konfirmasi, `Esc` untuk menutup, angka `1–6` untuk berpindah halaman.

**Acceptance criteria**
- Setiap aksi memberi feedback, dan error ditampilkan dengan pesan Indonesia.

## Bagian 3.5 — UI: Peristiwa, Laporan Kuartal, Riwayat, Akhir Slice + E2E

**Tugas**
- **Peristiwa:** event pending tampil sebagai "nota dinas" dengan pilihan dan konsekuensi kualitatif. "Akhiri Kuartal" dikunci sampai semua event direspons, disertai penjelasan.
- **Laporan kuartal:** "Laporan untuk Presiden {nama} — Kuartal X". Isinya delta indikator dan penjelasan dari ledger (map `reasonCode` → kalimat di `copy/id.ts`), hasil voting, dan event baru.
- **Riwayat:** timeline + `LineChart` SVG per indikator.
- **Akhir slice:** ringkasan sederhana (arketipe di Tahap 4).
- Playwright E2E pada `dev:web` (MemoryStorage): pelantikan → ajukan kebijakan → lobi → akhiri kuartal → laporan → respons event → selesai 4 kuartal.

**Acceptance criteria**
- E2E hijau. Ukur JS heap setelah 4 kuartal (Chrome DevTools pada `dev:web`) dan catat di `PROGRESS.md`.

---

## Gate akhir Tahap 3 — PLAYTEST (paling penting)
Mainkan minimal 3 kali di versi desktop dengan strategi berbeda. Tulis jawaban jujur di `docs/PLAYTEST-SLICE.md`:
- [ ] Apakah tiap kuartal ada keputusan yang terasa sulit?
- [ ] Apakah laporan menjelaskan *kenapa* angka berubah?
- [ ] Apakah lobi dan voting terasa berpengaruh?
- [ ] Apakah ada strategi dominan?
- [ ] Apakah durasi per kuartal pas (target 20 kuartal = 10–25 menit)?
- [ ] Apakah tutup-buka app lalu Lanjutkan berjalan mulus?
- [ ] Catat RAM dari Task Manager setelah 4 kuartal.

Kalau banyak jawaban "tidak", **perbaiki aturan atau angka dulu sebelum Tahap 4**.
