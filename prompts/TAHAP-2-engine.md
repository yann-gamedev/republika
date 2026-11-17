# TAHAP 2 — Engine simulasi inti

**Tujuan tahap:** `packages/simulation` bisa me-resolve satu kuartal secara deterministik untuk 3 kebijakan vertical slice, lengkap dengan voting, lobi, effect ledger, baseline dynamics, dan laporan. Semua dalam bentuk fungsi murni dan teruji. Belum ada UI atau API.

**Wajib dibaca:** `AGENT.md` §4 dan §5 (terutama 5.1, 5.3–5.6, 5.8–5.10), `docs/TDD.md` §7–§8.

**Prasyarat konten:** pemilik proyek sudah mengisi `content/policies/` (3 kebijakan slice), `baseline.json`, dan `scenario.json`. Lihat `docs/PANDUAN-KONTEN.md` → Tahap 2. Kalau belum ada, gunakan fixture di `packages/game-data/fixtures/` dan **jangan** mengisi `content/`.

---

## Bagian 2.1 — Primitif deterministik (`core/`)

**Tugas**
- `core/rng.ts`: PRNG seeded (mis. sfc32 atau xoshiro128**, dengan seed string di-hash lewat cyrb128). API: `createRng(seed)`, `rng.nextInt(min, max)`, `rng.weightedPick(items)`. Pakai stream terpisah per turn: `seed + ":" + turn`.
- `core/math.ts`: `roundTenths()` (half away from zero), `applyMultiplier()`, `clampToDomain()`.
- `core/order.ts`: helper sort stabil berdasarkan ID.
- `core/hash.ts`: hash state stabil (JSON canonical dengan key tersortir, lalu hash) untuk uji determinisme.

**Acceptance criteria**
- Test: seed sama menghasilkan urutan sama (snapshot 1000 angka pertama); seed berbeda menghasilkan urutan berbeda.
- Property test: `roundTenths` simetris untuk nilai negatif, dan `clampToDomain` selalu menghasilkan nilai dalam domain.

## Bagian 2.2 — Command dan Action Points (`core/commands.ts`)

**Tugas**
- `applyCommand(state, command, defs) → { state, error? }` untuk `ENACT_POLICY`, `LOBBY_FACTION`, `RESPOND_EVENT`, `CANCEL_PENDING`. Fungsinya murni dan mengembalikan state baru.
- Validasi: AP cukup, requirement terpenuhi, tidak dalam cooldown, belum aktif, tidak konflik dengan kebijakan aktif/pending, lobi maksimal 1 per fraksi, `eventId`/`optionId` valid, `commandId` tidak duplikat.
- Error memakai kode stabil (`INSUFFICIENT_AP`, `REQUIREMENT_NOT_MET`, `ON_COOLDOWN`, `ALREADY_ACTIVE`, `CONFLICT`, `LOBBY_LIMIT`, `UNKNOWN_EVENT`, `DUPLICATE_COMMAND`, …) beserta pesan Indonesia dari tabel terpisah.

**Acceptance criteria**
- Test per kode error.
- Property test: AP tidak pernah negatif dan tidak pernah melebihi batas setelah urutan command acak.

## Bagian 2.3 — Sistem efek dan ledger (`policies/effects.ts`)

**Tugas**
- Interpreter `EffectRule` (exhaustive `switch` dengan `never` check). Setiap perubahan menghasilkan `LedgerEntry` (`before`, `delta`, `after`, `unit`, `sourceType`, `sourceId`, `reasonCode`, `order`).
- Conditional modifier dievaluasi terhadap **state awal giliran** (snapshot read-only), bukan state yang sedang dimutasi.
- Pengali kementerian (AGENT §5.6) hanya diterapkan pada `MODIFY_INDICATOR` dari kebijakan sedomain. Pembulatan dilakukan setelah pengali.
- `CHANGE_FACTION_SUPPORT` per `ideologyTag` diterapkan ke fraksi terurut ID.

**Acceptance criteria**
- Test tiap tipe efek, test modifier membaca state awal, dan test pengali kementerian pada eff 40/65/90.

## Bagian 2.4 — Voting dan lobi (`politics/`)

**Tugas**
- `predictVote(state, policyId, defs, lobbyBonuses) → { yesSeats, byFaction[] }`, sesuai rumus AGENT §5.5.
- `resolveVotes()`: proses kebijakan `needsVote` urut `policyId`. Kebijakan yang lolos diaktifkan; yang gagal diproses dengan aturan voting gagal (AP terpakai, trust −2,0, cooldown 1, tanpa biaya kas) dan dicatat di ledger.
- Bonus lobi hanya berlaku di turn tersebut, lalu dihapus saat resolusi selesai.

**Acceptance criteria**
- Test: tepat 51 kursi lolos, 50 gagal; lobi membalikkan hasil fraksi di ambang batas; total kursi selalu 100 (property test).

## Bagian 2.5 — Siklus kebijakan, baseline, dan orkestrator

**Tugas**
- `policies/lifecycle.ts`: aktivasi, tick (`PER_TURN`, `DELAYED` jatuh tempo), pengurangan durasi, pemindahan ke cooldown, dan pencegahan efek ganda (flag per `activePolicyId` + turn).
- `economy/baseline.ts`: AGENT §5.9, dengan parameter dari `BaselineParams`.
- `politics/ministries.ts`: update effectiveness (AGENT §5.6).
- `core/resolveTurn.ts`: orkestrator dengan **urutan persis AGENT §5.10**. Pemilihan event dibuat sebagai stub yang mengembalikan kosong (diisi Tahap 3).
- `report/buildReport.ts`: `TurnReport` berisi delta per indikator, top 3 penyebab per indikator (dari ledger), kebijakan lolos/gagal, dan perubahan kas.
- `createInitialState(scenario, defs, { presidentName, cabinetName, seed })`.

**Acceptance criteria**
- Test integrasi engine: 4 kuartal dengan skrip command tetap menghasilkan state hash yang sama dengan fixture.
- Setiap nilai indikator di state akhir bisa direkonstruksi dari state awal + jumlah delta di ledger (test rekonsiliasi).

## Bagian 2.6 — Proyeksi, uji determinisme, dan dokumentasi aturan

**Tugas**
- `policies/projection.ts`: `projectPolicy()` sesuai AGENT §5.8.
- Uji determinisme: state + commands + seed + ruleset yang sama menghasilkan hash yang sama (jalankan 2× dalam proses berbeda via test terpisah, atau minimal 2 instance).
- Property test (fast-check): urutan command valid acak selama 4 turn → semua indikator dalam domain, turn monoton naik, kursi konstan, ledger tidak kosong saat ada perubahan.
- Simpan fixture snapshot di `packages/simulation/test/__fixtures__/`.
- Isi `docs/SIMULATION_RULES.md`: rumus, urutan resolusi, pembulatan, voting, lobi, kementerian, baseline, dan proyeksi, ditulis untuk pembaca non-programmer (pemilik proyek yang akan menulis konten).

**Acceptance criteria**
- Coverage `packages/simulation` ≥ 90% lines.
- `docs/SIMULATION_RULES.md` cukup jelas sehingga penulis konten bisa memperkirakan efek tanpa membaca kode.

---

## Gate akhir Tahap 2
- [ ] Semua test hijau dan coverage ≥ 90%.
- [ ] Baca `SIMULATION_RULES.md`. Apakah aturannya masuk akal dan sesuai keinginan Anda? Koreksi sekarang, sebelum ada UI.
- [ ] Coba ubah satu angka efek kebijakan di konten. Fixture harus gagal (ini membuktikan fixture berfungsi), lalu kembalikan angkanya.
