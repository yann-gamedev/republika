> Addendum v0.3 di AGENT.md §5 menimpa dokumen ini. Bagian web/API/DB tidak berlaku.

> Konversi teks historis dari `source/REPUBLIKA_GDD_TDD_v0.1.pdf`: halaman 1 (sampul dan daftar isi bersama), halaman 5–9 (Bagian B, §6–§11). Penomoran dan isi v0.1 dipertahankan, termasuk rancangan web/API/DB yang tidak berlaku untuk implementasi sekarang. Header/nomor halaman berulang diganti penanda halaman; tabel dan blok kode ditata sebagai Markdown. Sampul/daftar isi halaman 1 disertakan pada kedua dokumen. Ini arsip rancangan, bukan klaim fitur sudah diimplementasikan.

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

<!-- Halaman PDF: 5 -->

# BAGIAN B - TECHNICAL DESIGN DOCUMENT

## 6. Keputusan teknologi dan arsitektur

| Lapisan    | Pilihan                         | Pertimbangan                       |
| ---------- | ------------------------------- | ---------------------------------- |
| Web        | Next.js + TypeScript            | Full-stack MVP, SSR, responsive UI |
| UI         | Tailwind + shadcn/ui + Recharts | Komponen dashboard dan statistik   |
| Domain     | Pure TypeScript package         | Deterministik, portable, testable  |
| Database   | PostgreSQL + Prisma             | Transaksi dan state persistence    |
| Validation | Zod                             | Schema runtime pada batas API      |
| Testing    | Vitest + Playwright             | Unit/property/E2E                  |
| Monorepo   | pnpm workspaces                 | Memisahkan domain dan app          |

Gunakan modular monolith: Next.js server memanggil application services; services memvalidasi command dan memanggil pure simulation package; repository menyimpan state secara atomik. Redis, NestJS, WebSocket, dan microservices tidak diperlukan untuk MVP.

```text
apps/web/src/{app,features,server}
packages/simulation/src/{core,policies,economy,politics,events}
packages/game-data/{policies,events,factions}
packages/shared/{types,validation}
prisma/{schema.prisma,migrations}
docs/{GDD.md,TDD.md,SIMULATION_RULES.md}
```

### Boundary rules

- Domain package tidak boleh mengimpor React, Prisma, HTTP, Date.now(), atau Math.random().

- Semua waktu game, RNG, dan data definisi dipasok sebagai input eksplisit.

- Server adalah satu-satunya pihak yang mengubah canonical game state.

- Client hanya mengirim command; tidak mengirim angka hasil simulasi.

- Konten statis memakai ID stabil dan versioning untuk kompatibilitas save.

<!-- Halaman PDF: 6 -->

## 7. Domain model dan kontrak state

```typescript
type Indicators = {
  approval: number;
  stability: number;
  fiscalHealth: number;
  growthPct: number;
  inflationPct: number;
  unemploymentPct: number;
  welfare: number;
  trust: number;
};
type GameState = {
  schemaVersion: 1;
  sessionId: string;
  turn: number;
  status: 'active' | 'completed';
  rngSeed: string;
  indicators: Indicators;
  treasuryTrillion: number;
  actionPointsRemaining: number;
  factions: FactionState[];
  ministries: MinistryState[];
  activePolicies: ActivePolicy[];
  pendingCommands: GameCommand[];
  eventFlags: string[];
};
```

Nilai numerik memakai integer atau decimal sesuai domain; pembulatan harus ditentukan secara eksplisit. Hindari floating point untuk transaksi fiskal presisi: gunakan satuan integer terkecil yang disepakati atau Decimal. Gunakan state schemaVersion dan rulesetVersion agar replay dan migrasi dapat ditelusuri.

### Kontrak policy dan command

```typescript
type PolicyDefinition = {
  id: string;
  version: number;
  category: string;
  apCost: number;
  fiscalCostTrillion: number;
  needsVote: boolean;
  durationTurns: number;
  cooldownTurns: number;
  requirements: Requirement[];
  effects: EffectRule[];
};
type GameCommand =
  | { type: 'ENACT_POLICY'; policyId: string; commandId: string }
  | { type: 'RESPOND_EVENT'; eventId: string; optionId: string; commandId: string }
  | { type: 'END_QUARTER'; commandId: string };
```

EffectRule sebaiknya berbentuk discriminated union, misalnya MODIFY_INDICATOR, MODIFY_TREASURY, ADD_ACTIVE_POLICY, dan CHANGE_FACTION_SUPPORT. Hindari mengeksekusi JavaScript arbitrer dari JSON konten.

## 8. Turn resolution dan mekanisme simulasi

### Urutan resolusi yang stabil

Urutan yang diusulkan: validasi command dan AP; evaluasi prasyarat; voting kebijakan; biaya awal; penerapan efek langsung; tick kebijakan aktif; perubahan baseline ekonomi; pemilihan event; clamp/normalisasi; effect ledger; laporan; persist. Keputusan yang gagal voting tidak mengaktifkan policy; aturan biaya politik untuk kegagalan harus dinyatakan eksplisit.

```typescript
function resolveTurn(state, commands, definitions, seed) {
  const next = structuredClone(state);
  const ledger = [];
  validateCommands(next, commands, definitions);
  resolveVotesAndPolicies(next, commands, definitions, ledger);
  tickActivePolicies(next, definitions, ledger);
  applyBaselineDynamics(next, ledger);
  resolveEligibleEvents(next, definitions, seed, ledger);
  normalizeAndValidate(next);
  next.turn += 1;
  if (next.turn > 20) next.status = 'completed';
  return { nextState: next, ledger, report: buildReport(ledger) };
}
```

<!-- Halaman PDF: 7 -->

Pseudocode menggambarkan batas modul, bukan implementasi siap pakai. Resolusi harus menjamin deterministic ordering (sort ID), RNG seeded, kebijakan rounding, dan pengendalian efek ganda. State transition secara konseptual: next = clamp(current + policyEffects + eventEffects + baselineDynamics).

### Effect ledger dan explainability

```json
{
  "turn": 3,
  "sourceType": "POLICY",
  "sourceId": "POL-ENERGY-001",
  "target": "inflationPct",
  "before": 3.2,
  "delta": 0.4,
  "after": 3.6,
  "unit": "percentage_point",
  "reasonCode": "ENERGY_PRICE_PASS_THROUGH"
}
```

Effect ledger adalah catatan alasan perubahan, bukan pengganti state snapshot. Simpan nilai before/after, urutan efek, rulesetVersion, dan sumber; jangan menampilkan hasil tanpa provenance.

## 9. Database, API, dan keamanan

### Skema relasional inti

| Entitas               | Kolom/relasi kunci                                                 |
| --------------------- | ------------------------------------------------------------------ |
| User                  | id, email, createdAt                                               |
| GameSession           | id, userId FK, status, turn, stateVersion, rulesetVersion          |
| GameStateSnapshot     | sessionId FK, turn, schemaVersion, state JSONB, hash               |
| TurnHistory           | sessionId FK, turn, commandBatch JSONB, ledger JSONB, report JSONB |
| IdempotencyRecord     | sessionId FK, commandId unique, responseHash                       |
| GameDefinitionVersion | rulesetVersion, contentHash, publishedAt                           |

Constraint penting: unique(sessionId, turn) pada TurnHistory; ownership melalui session.userId; foreign key cascade sesuai kebijakan retensi; snapshot dan history ditulis dalam satu transaksi. Untuk MVP, definisi policy/event disimpan dalam berkas JSON versioned dan dibundel saat deploy.

### API contract

| Method / route                     | Perilaku                                            |
| ---------------------------------- | --------------------------------------------------- |
| POST /api/sessions                 | Buat campaign baru dengan ruleset tertentu          |
| GET /api/sessions/:id              | Ambil state yang boleh dilihat pengguna             |
| POST /api/sessions/:id/commands    | Queue policy/event command; validasi AP dan version |
| POST /api/sessions/:id/end-quarter | Resolve satu kuartal dengan idempotency key         |
| GET /api/sessions/:id/history      | Riwayat dan effect ledger                           |
| GET /api/game-definitions          | Metadata policy, fraksi, dan event yang public      |

<!-- Halaman PDF: 8 -->

Request mutasi membawa expectedStateVersion dan commandId. Jika versi tidak cocok, balas 409 Conflict. Jika commandId telah diproses, kembalikan hasil terdahulu. Gunakan HTTP 401 untuk belum autentikasi, 403/404 untuk akses tanpa izin sesuai strategi non-disclosure, 422 untuk command tidak valid.

### Transaksi end-quarter

Dalam transaksi database: verifikasi ownership, lock atau conditional update berdasarkan stateVersion, periksa idempotency, jalankan engine di server, insert TurnHistory dan snapshot, increment version, commit. Jangan memproses event dua kali ketika request diulang. Jika engine terlalu berat, pertimbangkan optimisasi sebelum memindahkannya ke job queue.

### Security baseline

- Autentikasi via library teruji; session cookie HttpOnly, Secure, SameSite.

- Authorization per-session pada semua query dan mutasi.

- Validasi Zod, rate limiting, CSRF protection bila memakai cookie, batas payload.

- Tidak ada eval atau skrip yang dieksekusi dari definisi game.

- Rahasia database hanya di server; backup dan migrasi diuji.

- Audit log teknis tidak menyimpan token, cookie, atau data pribadi berlebihan.

## 10. Testing, observability, deployment

### Test strategy

| Level       | Contoh pengujian                                           |
| ----------- | ---------------------------------------------------------- |
| Unit        | AP, voting, policy tick, clamp, event eligibility          |
| Determinism | Same state + commands + seed + ruleset => same hash        |
| Property    | Indikator valid, jumlah kursi konstan, turn monotonic      |
| Integration | Prisma transaction, save/load, idempotency, concurrency    |
| E2E         | Create session > enact > end quarter > report > reload     |
| Balancing   | Monte Carlo seeded, distribusi outcome, softlock detection |

Target awal: unit test pada semua resolver dan E2E untuk happy path plus penolakan akses. Simpan fixture snapshot hasil simulasi; ubah fixture hanya bila perubahan ruleset memang disengaja.

### Observability

Gunakan structured logs dengan requestId, sessionId tersamarkan, turn, rulesetVersion, durasi resolve, status transaksi, dan errorCode. Pantau latensi p95 end-quarter, jumlah 409 conflict, exception engine, serta kegagalan save/load. Hindari memasukkan email atau payload sensitif ke log.

<!-- Halaman PDF: 9 -->

### Deployment

Tahap awal: Next.js pada hosting Node-compatible, PostgreSQL terkelola, migrasi CI/CD, environment terpisah dev/staging/prod. Jalankan lint, typecheck, unit, integration, build, dan migrasi terkontrol sebelum release. Backup otomatis dan restore drill wajib sebelum public beta.

## 11. Roadmap, risiko, dan keputusan terbuka

| Sprint | Fokus                                  | Output                 |
| ------ | -------------------------------------- | ---------------------- |
| 1      | Repository, UI shell, domain types     | Dashboard mock + CI    |
| 2      | Core engine, seeded RNG, effect ledger | Resolver unit-tested   |
| 3      | 3 policies, voting, report             | 4-turn vertical slice  |
| 4      | Cabinet, 6 factions, events            | Sistem terhubung       |
| 5      | Persistence, auth, 20 turns            | Single-player complete |
| 6      | Balancing, E2E, responsive, deploy     | Closed playtest MVP    |

### Risiko dan mitigasi

- Scope creep: lock MVP, pisahkan backlog pasca-rilis.

- Balancing buruk: logging efek, seeded simulations, playtest.

- Save incompatibility: schemaVersion, rulesetVersion, migrator.

- Konkurensi double turn: transaksi + idempotency + version check.

- Kesalahan persepsi politik: label fiktif, dokumentasikan simplifikasi.

- Aset pihak ketiga: cek lisensi dan hindari menyalin desain spesifik.

### Keputusan terbuka untuk review

- Apakah kondisi kalah sebelum kuartal 20 perlu diterapkan? MVP awal: tidak.

- Apakah seluruh policy memerlukan voting? MVP: hanya yang bertanda needsVote.

- Apakah akun wajib untuk vertical slice? Tidak; untuk beta dengan cloud save: ya.

- Bagaimana menentukan parameter ekonomi? Mulai heuristik transparan, lalu balancing berbasis pengujian.

- Apakah multiplayer masuk milestone? Tidak sebelum engine dan persistence stabil.

Next action: buat repo, tetapkan GameState v1 dan definisi tiga kebijakan, implementasikan resolver murni serta fixture seeded, lalu hubungkan ke vertical slice empat kuartal.

Catatan: seluruh angka permainan, komposisi fraksi, dan parameter kebijakan dalam dokumen ini adalah rancangan fiktif untuk tujuan desain dan pengujian.
