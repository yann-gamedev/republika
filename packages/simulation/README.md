# @republika/simulation

Engine domain deterministik (Tahap 2). Fungsi murni, tanpa I/O.

- `core/` — PRNG sfc32 ber-seed, pembulatan/clamp, urutan ID, hash state, command + AP, `createInitialState`, `resolveTurn` (urutan AGENT §5.10), ledger, normalize.
- `policies/` — interpreter efek, siklus kebijakan, proyeksi (`projectPolicy`).
- `politics/` — voting, lobi, effectiveness kementerian.
- `economy/` — baseline AGENT §5.9.
- `events/` — respons event; pemilihan event masih stub (Tahap 3).
- `report/` — laporan kuartal.

Aturan untuk penulis konten: `docs/SIMULATION_RULES.md`. Test memakai fixture
`packages/game-data/fixtures/slice/`; snapshot di `test/__fixtures__/`.

Aturan batas (AGENT §4) ditegakkan ESLint: dilarang mengimpor React/Tauri/`node:*`
dan dilarang memakai `Date`, `Math.random()`, atau `crypto`. Waktu, seed, dan
konten selalu masuk sebagai argumen eksplisit.
