# Laporan balancing Monte Carlo

- Kampanye: 5000 (random, greedy-approval, austerity, welfare, no-op), 20 kuartal, seed dasar `balance`
- Softlock: **0**
- Ukuran save: rata-rata 161.8 KiB, maksimum 230.0 KiB

## Bendera otomatis

- VOTE_ALWAYS_PASSES: POL-ENERGY-PLACEHOLDER-001 (5598/5598).
- VOTE_ALWAYS_PASSES: POL-FISCAL-PLACEHOLDER-001 (7087/7087).
- VOTE_ALWAYS_PASSES: POL-SOCIAL-PLACEHOLDER-001 (14203/14203).
- GREEDY_FAVOURITE: bot greedy memilih POL-SOCIAL-PLACEHOLDER-001 di 100% kampanye. Terlalu kuat?
- ARCHETYPE_DOMINANT: "Pemerintahan Seimbang" muncul di 94% kampanye random.
- ARCHETYPE_DOMINANT: "Pemerintahan Seimbang" muncul di 100% kampanye greedy-approval.
- ARCHETYPE_DOMINANT: "Teknokrat Fiskal Placeholder" muncul di 100% kampanye austerity.
- ARCHETYPE_DOMINANT: "Pemerintahan Seimbang" muncul di 100% kampanye welfare.
- ARCHETYPE_DOMINANT: "Pemerintahan Seimbang" muncul di 100% kampanye no-op.

## Indikator akhir per strategi (persentil 5 / 25 / 50 / 75 / 95)

### random

| Indikator | P5 | P25 | P50 | P75 | P95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Persetujuan | 46.2 | 49.4 | 51.7 | 53.7 | 56.5 |
| Stabilitas | 67.9 | 69.0 | 71.0 | 71.0 | 74.2 |
| Fiskal | 83.4 | 89.0 | 92.0 | 92.0 | 96.4 |
| Pertumbuhan | 4.2% | 4.2% | 4.2% | 4.2% | 4.2% |
| Inflasi | 3.1% | 3.1% | 3.1% | 3.2% | 3.4% |
| Pengangguran | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| Kesejahteraan | 70.5 | 75.7 | 78.8 | 81.0 | 84.1 |
| Kepercayaan | 40.0 | 43.0 | 46.0 | 49.0 | 52.0 |

### greedy-approval

| Indikator | P5 | P25 | P50 | P75 | P95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Persetujuan | 65.1 | 65.1 | 65.1 | 65.1 | 65.1 |
| Stabilitas | 62.0 | 62.0 | 62.0 | 62.0 | 62.0 |
| Fiskal | 55.0 | 55.0 | 55.0 | 55.0 | 55.0 |
| Pertumbuhan | 4.2% | 4.2% | 4.2% | 4.2% | 4.2% |
| Inflasi | 3.1% | 3.1% | 3.1% | 3.1% | 3.1% |
| Pengangguran | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| Kesejahteraan | 75.2 | 75.2 | 75.2 | 75.2 | 75.2 |
| Kepercayaan | 52.0 | 52.0 | 52.0 | 52.0 | 52.0 |

### austerity

| Indikator | P5 | P25 | P50 | P75 | P95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Persetujuan | 45.8 | 45.8 | 45.8 | 45.8 | 45.8 |
| Stabilitas | 62.0 | 62.0 | 62.0 | 62.0 | 62.0 |
| Fiskal | 84.4 | 84.4 | 84.4 | 84.4 | 84.4 |
| Pertumbuhan | 4.2% | 4.2% | 4.2% | 4.2% | 4.2% |
| Inflasi | 3.1% | 3.1% | 3.1% | 3.1% | 3.1% |
| Pengangguran | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| Kesejahteraan | 50.0 | 50.0 | 50.0 | 50.0 | 50.0 |
| Kepercayaan | 40.0 | 40.0 | 40.0 | 40.0 | 40.0 |

### welfare

| Indikator | P5 | P25 | P50 | P75 | P95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Persetujuan | 61.2 | 61.2 | 61.2 | 61.2 | 61.2 |
| Stabilitas | 62.0 | 62.0 | 62.0 | 62.0 | 62.0 |
| Fiskal | 55.0 | 55.0 | 55.0 | 55.0 | 55.0 |
| Pertumbuhan | 4.2% | 4.2% | 4.2% | 4.2% | 4.2% |
| Inflasi | 3.1% | 3.1% | 3.1% | 3.1% | 3.1% |
| Pengangguran | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| Kesejahteraan | 84.1 | 84.1 | 84.1 | 84.1 | 84.1 |
| Kepercayaan | 52.0 | 52.0 | 52.0 | 52.0 | 52.0 |

### no-op

| Indikator | P5 | P25 | P50 | P75 | P95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Persetujuan | 51.0 | 51.0 | 51.0 | 51.0 | 51.0 |
| Stabilitas | 62.0 | 62.0 | 62.0 | 62.0 | 62.0 |
| Fiskal | 55.0 | 55.0 | 55.0 | 55.0 | 55.0 |
| Pertumbuhan | 4.2% | 4.2% | 4.2% | 4.2% | 4.2% |
| Inflasi | 3.1% | 3.1% | 3.1% | 3.1% | 3.1% |
| Pengangguran | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| Kesejahteraan | 50.0 | 50.0 | 50.0 | 50.0 | 50.0 |
| Kepercayaan | 40.0 | 40.0 | 40.0 | 40.0 | 40.0 |

## Frekuensi arketipe

| Strategi | Arketipe | Kampanye |
| --- | --- | ---: |
| random | Pemerintahan Seimbang | 941 |
| random | Teknokrat Fiskal Placeholder | 59 |
| greedy-approval | Pemerintahan Seimbang | 1000 |
| austerity | Teknokrat Fiskal Placeholder | 1000 |
| welfare | Pemerintahan Seimbang | 1000 |
| no-op | Pemerintahan Seimbang | 1000 |

## Tingkat lolos voting per kebijakan

| Kebijakan | Voting | Lolos | % |
| --- | ---: | ---: | ---: |
| POL-ENERGY-PLACEHOLDER-001 | 5598 | 5598 | 100% |
| POL-FISCAL-PLACEHOLDER-001 | 7087 | 7087 | 100% |
| POL-SOCIAL-PLACEHOLDER-001 | 14203 | 14203 | 100% |

## Pilihan bot greedy-approval

| Kebijakan | % kampanye |
| --- | ---: |
| POL-SOCIAL-PLACEHOLDER-001 | 100% |
| POL-ENERGY-PLACEHOLDER-001 | 0% |
| POL-FISCAL-PLACEHOLDER-001 | 0% |
| POL-GOVERNANCE-PLACEHOLDER-001 | 0% |

## Indikator di batas domain

| Indikator | % kuartal |
| --- | ---: |
| Persetujuan | 0.0% |
| Stabilitas | 0.0% |
| Fiskal | 0.0% |
| Pertumbuhan | 0.0% |
| Inflasi | 0.0% |
| Pengangguran | 10.0% |
| Kesejahteraan | 0.0% |
| Kepercayaan | 0.0% |

## Event yang tidak pernah muncul

- Semua event muncul setidaknya sekali.

## Rekomendasi

Agent tidak mengubah angka konten. Tinjau bendera di atas, lalu sesuaikan `packages/game-data/content/` dan naikkan `rulesetVersion` bila aturan/angka berubah.
