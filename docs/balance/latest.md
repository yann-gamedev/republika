# Laporan balancing Monte Carlo

- Kampanye: 5000 (random, greedy-approval, austerity, welfare, no-op), 20 kuartal, seed dasar `balance`
- Softlock: **0**
- Ukuran save: rata-rata 177.7 KiB, maksimum 253.9 KiB

## Bendera otomatis

- VOTE_ALWAYS_PASSES: POL-ENERGY-PLACEHOLDER-001 (5601/5601).
- VOTE_ALWAYS_PASSES: POL-SOCIAL-PLACEHOLDER-001 (14178/14178).
- GREEDY_FAVOURITE: bot greedy memilih POL-SOCIAL-PLACEHOLDER-001 di 100% kampanye. Terlalu kuat?
- ARCHETYPE_DOMINANT: "Pemerintahan Seimbang" muncul di 92% kampanye random.
- ARCHETYPE_DOMINANT: "Pemerintahan Seimbang" muncul di 100% kampanye greedy-approval.
- ARCHETYPE_DOMINANT: "Teknokrat Fiskal Placeholder" muncul di 100% kampanye austerity.
- ARCHETYPE_DOMINANT: "Pemerintahan Seimbang" muncul di 100% kampanye welfare.
- ARCHETYPE_DOMINANT: "Pemerintahan Seimbang" muncul di 100% kampanye no-op.

## Indikator akhir per strategi (persentil 5 / 25 / 50 / 75 / 95)

### random

| Indikator | P5 | P25 | P50 | P75 | P95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Persetujuan | 45.6 | 48.7 | 50.6 | 52.7 | 55.8 |
| Stabilitas | 68.0 | 73.0 | 74.0 | 76.2 | 79.2 |
| Fiskal | 83.4 | 88.7 | 92.0 | 95.0 | 98.2 |
| Pertumbuhan | 3.8% | 3.8% | 4.1% | 4.2% | 4.2% |
| Inflasi | 3.1% | 3.1% | 3.1% | 3.2% | 3.4% |
| Pengangguran | 0.0% | 0.0% | 0.5% | 1.0% | 1.3% |
| Kesejahteraan | 77.6 | 79.7 | 84.7 | 87.8 | 90.0 |
| Kepercayaan | 34.0 | 41.0 | 46.0 | 49.0 | 55.0 |

### greedy-approval

| Indikator | P5 | P25 | P50 | P75 | P95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Persetujuan | 63.0 | 63.3 | 63.7 | 64.4 | 66.5 |
| Stabilitas | 72.0 | 72.0 | 72.0 | 72.0 | 75.0 |
| Fiskal | 51.0 | 51.0 | 51.0 | 51.0 | 51.0 |
| Pertumbuhan | 3.8% | 3.8% | 3.8% | 3.8% | 3.8% |
| Inflasi | 3.1% | 3.1% | 3.1% | 3.1% | 3.1% |
| Pengangguran | 0.7% | 1.0% | 1.1% | 1.2% | 1.3% |
| Kesejahteraan | 84.2 | 84.2 | 84.2 | 84.2 | 84.2 |
| Kepercayaan | 44.0 | 50.0 | 50.0 | 50.0 | 50.0 |

### austerity

| Indikator | P5 | P25 | P50 | P75 | P95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Persetujuan | 45.4 | 45.6 | 45.8 | 45.8 | 46.1 |
| Stabilitas | 67.0 | 67.0 | 70.0 | 70.0 | 70.0 |
| Fiskal | 88.4 | 88.4 | 88.4 | 88.4 | 88.4 |
| Pertumbuhan | 3.8% | 3.8% | 3.9% | 3.9% | 3.9% |
| Inflasi | 3.1% | 3.1% | 3.1% | 3.1% | 3.1% |
| Pengangguran | 0.7% | 0.9% | 0.9% | 1.1% | 1.2% |
| Kesejahteraan | 54.0 | 54.0 | 54.0 | 54.0 | 54.0 |
| Kepercayaan | 42.0 | 45.0 | 45.0 | 51.0 | 51.0 |

### welfare

| Indikator | P5 | P25 | P50 | P75 | P95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Persetujuan | 59.2 | 59.5 | 60.0 | 60.8 | 62.8 |
| Stabilitas | 72.0 | 72.0 | 72.0 | 72.0 | 75.0 |
| Fiskal | 51.0 | 51.0 | 51.0 | 51.0 | 51.0 |
| Pertumbuhan | 3.8% | 3.8% | 3.8% | 3.8% | 3.8% |
| Inflasi | 3.1% | 3.1% | 3.1% | 3.1% | 3.1% |
| Pengangguran | 0.8% | 1.0% | 1.1% | 1.2% | 1.3% |
| Kesejahteraan | 93.1 | 93.1 | 93.1 | 93.1 | 93.1 |
| Kepercayaan | 44.0 | 50.0 | 50.0 | 50.0 | 50.0 |

### no-op

| Indikator | P5 | P25 | P50 | P75 | P95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Persetujuan | 49.6 | 50.4 | 50.4 | 50.4 | 50.4 |
| Stabilitas | 58.0 | 61.0 | 61.0 | 61.0 | 61.0 |
| Fiskal | 59.0 | 59.0 | 59.0 | 59.0 | 59.0 |
| Pertumbuhan | 3.8% | 3.9% | 4.2% | 4.2% | 4.2% |
| Inflasi | 3.1% | 3.1% | 3.1% | 3.1% | 3.1% |
| Pengangguran | 0.0% | 0.0% | 0.4% | 1.0% | 1.2% |
| Kesejahteraan | 54.0 | 54.0 | 54.0 | 54.0 | 54.0 |
| Kepercayaan | 45.0 | 49.0 | 49.0 | 49.0 | 52.0 |

## Frekuensi arketipe

| Strategi | Arketipe | Kampanye |
| --- | --- | ---: |
| random | Pemerintahan Seimbang | 924 |
| random | Teknokrat Fiskal Placeholder | 76 |
| greedy-approval | Pemerintahan Seimbang | 1000 |
| austerity | Teknokrat Fiskal Placeholder | 1000 |
| welfare | Pemerintahan Seimbang | 1000 |
| no-op | Pemerintahan Seimbang | 1000 |

## Tingkat lolos voting per kebijakan

| Kebijakan | Voting | Lolos | % |
| --- | ---: | ---: | ---: |
| POL-ENERGY-PLACEHOLDER-001 | 5601 | 5601 | 100% |
| POL-FISCAL-PLACEHOLDER-001 | 7277 | 6976 | 96% |
| POL-SOCIAL-PLACEHOLDER-001 | 14178 | 14178 | 100% |

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
| Pengangguran | 1.2% |
| Kesejahteraan | 0.0% |
| Kepercayaan | 0.0% |

## Latar belakang presiden

100 seed × 5 strategi = 500 pertandingan. Pemenang tiap pertandingan = skor akhir tertinggi (persetujuan + stabilitas + fiskal + kesejahteraan + kepercayaan); skor dalam 1,0 poin dari yang terbaik dihitung seri dan kemenangannya dibagi rata. Ambang bendera 40%.

| Latar belakang | Menang | % |
| --- | ---: | ---: |
| BG-PLACEHOLDER-AKTIVIS | 136.6 | 27% |
| BG-PLACEHOLDER-EKONOM | 92.0 | 18% |
| BG-PLACEHOLDER-PENGUSAHA | 101.7 | 20% |
| BG-PLACEHOLDER-PURNAWIRAWAN | 135.7 | 27% |
| BG-PLACEHOLDER-WALIKOTA | 34.0 | 7% |

## Event yang tidak pernah muncul

- Semua event muncul setidaknya sekali.

## Rekomendasi

Agent tidak mengubah angka konten. Tinjau bendera di atas, lalu sesuaikan `packages/game-data/content/` dan naikkan `rulesetVersion` bila aturan/angka berubah.
