# ADR-001: Bun sebagai runtime utama, Node.js sebagai fallback

- **Status:** Accepted
- **Tanggal:** Mei 2026
- **Pemrakarsa:** Tim Engineering
- **Konteks PRD:** §3.2

## Konteks

SIMANTA berjalan di backend Hono.js yang kompatibel dengan Bun, Node.js, dan Deno. Tim harus memilih runtime utama untuk production. Pertimbangan:

- Bun memberikan performa I/O dan startup time yang signifikan lebih cepat dari Node.
- Bun memiliki built-in test runner, bundler, dan package manager.
- Ekosistem npm di Bun sebagian besar kompatibel, tetapi beberapa native module (mis. `bcrypt`, `sharp`) masih bermasalah pada beberapa versi.
- Node.js LTS adalah baseline industri yang paling matang dan paling mudah di-hire.

## Keputusan

1. **Default production runtime:** Bun ≥ 1.x via `Dockerfile.bun`.
2. **Fallback runtime:** Node.js ≥ 20 LTS via `Dockerfile.node`. Switch hanya dengan ganti image — tidak ada perubahan kode aplikasi.
3. **Pemilihan dependency** mengutamakan library yang dual-runtime (`postgres` (porsager), `pg`, `exceljs`, `pdfkit`, `bcryptjs`, `argon2` non-native, `shp-write`).
4. **Adapter runtime** di `backend/src/runtime/{bun,node}.ts` membungkus API yang berbeda (file system khusus, fetch internals).
5. **CI matrix:** semua test dijalankan di Bun dan Node minimum seminggu sekali.

## Konsekuensi

### Positif
- Performa puncak Bun saat tidak ada masalah dependency.
- Migrasi mulus ke Node bila ada masalah produksi tanpa rewrite.
- DX lebih baik (bun install cepat, test runner native).

### Negatif
- Dual maintenance dua Dockerfile dan dua jalur CI.
- Beberapa dependency native (mis. `sharp`) mungkin perlu workaround di Bun.
- Tim harus disiplin tidak menggunakan API spesifik Bun (`Bun.*`) di hot path tanpa adapter.

## Trigger Switch ke Node

- Dependency penting crash atau memory leak di Bun yang tidak terselesaikan dalam 7 hari.
- Benchmark spesifik workload menunjukkan regresi > 20% dibanding Node.
- Insiden produksi akut.

## Alternatif yang Dipertimbangkan

- **Node.js sebagai default**: lebih konservatif, tapi melepas potensi performa Bun.
- **Deno**: ekosistem npm masih lebih kecil, learning curve lebih tinggi.

## Referensi

- PRD §3.2 Runtime Backend
- PRD §14 Risiko: "Dependency kritis tidak kompatibel di Bun"
