# @republika/simulation

Engine domain deterministik. Belum berisi logika pada Tahap 1.

Aturan batas (AGENT §4) ditegakkan ESLint: dilarang mengimpor React/Tauri/`node:*`
dan dilarang memakai `Date`, `Math.random()`, atau `crypto`. Waktu, seed, dan
konten selalu masuk sebagai argumen eksplisit.
