# Peta migrasi ruleset

Folder ini menyimpan peta migrasi `ruleset-<N>.json` untuk campaign yang
dilanjutkan dengan aturan baru (AGENT.md §5.13).

Contoh isi:

```json
{
  "fromRuleset": 3,
  "toRuleset": 4,
  "renamed": { "POL-SOCIAL-002": "POL-SOCIAL-005" },
  "removed": ["EVT-POLITIC-004"]
}
```

Belum ada migrasi pada Tahap 1.
