# ADR-003: Drizzle ORM untuk kolom non-spasial, raw SQL untuk PostGIS (hybrid)

- **Status:** Accepted
- **Tanggal:** Mei 2026
- **Pemrakarsa:** Tim Engineering
- **Konteks PRD:** §3.3, §6.7

## Konteks

SIMANTA menggunakan PostgreSQL + PostGIS sebagai database utama, dengan kebutuhan query spasial yang berat (`ST_Intersects`, `ST_SimplifyPreserveTopology`, `ST_DWithin`, `ST_Area`, `ST_Length`, `ST_AsMVT`, dll.). Pilihan ORM:

- **Drizzle ORM** menyediakan type safety yang sangat baik untuk kolom standar PostgreSQL, dengan API mendekati raw SQL dan ergonomi TypeScript modern.
- **Drizzle saat ini belum punya tipe `geometry` first-class.** Ekstensi PostGIS tidak terintegrasi langsung.
- Alternatif: Prisma (tidak mendukung PostGIS sama sekali untuk write), TypeORM (lebih berat, type-safety lebih lemah), Knex/raw (kehilangan type-safety untuk semua kolom).

## Keputusan

Strategi **hybrid**:

1. **Drizzle schema** (`backend/src/db/schema.ts`) hanya mendeklarasikan **kolom non-spasial**. Drizzle Kit men-generate migrasi normal untuk kolom-kolom ini.
2. **Kolom geometry, GIST index, CHECK constraint, dan trigger** dikelola via SQL migration manual di `backend/src/db/migrations-postgis/*.sql`. File SQL ini di-run berurutan setelah migrasi Drizzle (idempotent dengan `IF NOT EXISTS`).
3. **Akses geometry dari kode** menggunakan `sql` template literal Drizzle:
   ```ts
   await db.execute(sql`
     SELECT id, ST_AsGeoJSON(geom)::json AS geom
     FROM assets
     WHERE deleted_at IS NULL
       AND ST_Intersects(geom, ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))
   `);
   ```
4. **Helper terpusat** di `backend/src/db/postgis.ts` membungkus operasi umum (`insertGeometry`, `updateGeometry`, `selectGeoJSON`, `bboxFilter`, `validateGeometry`). Ini mengurangi raw SQL terserak di route handler.
5. **Tipe TypeScript** untuk geometry didefinisikan manual di `shared/geojson.ts` (mengikuti spesifikasi GeoJSON RFC 7946).
6. **Test migrasi PostGIS** wajib: setiap PR yang menambah kolom spasial harus disertai migration test yang menjalankan `ST_IsValid` pada sample data.

## Konsekuensi

### Positif
- Type safety Drizzle untuk ~95% kolom (semua atribut bisnis).
- Kontrol penuh atas PostGIS tanpa "menipu" ORM.
- Migrasi PostGIS eksplisit (extension, trigger, constraint, MV) reviewable per file.
- Helper terpusat menjaga konsistensi parameter binding (anti SQL injection).

### Negatif
- Dual migration system (Drizzle Kit + SQL manual) — order matter, butuh runner script.
- Kolom geometry tidak muncul di tipe Drizzle; developer harus tahu membaca via raw SQL.
- Refactor kolom geometry tidak otomatis ter-detect Drizzle Kit.

## Pola yang Dilarang

- ❌ String concatenation untuk parameter geometry (`sql.raw` dengan input user). **Selalu** pakai parameter binding `${value}`.
- ❌ Mendefinisikan kolom `geom` di Drizzle schema (Drizzle Kit akan mencoba men-generate ulang dan corrupt PostGIS state).
- ❌ Memanggil `ST_*` function dari middleware/handler langsung; gunakan helper di `db/postgis.ts`.

## Pola yang Direkomendasikan

- ✅ Drizzle Kit migration → SQL PostGIS migration (urut, idempotent).
- ✅ Helper `selectGeoJSON(query)` mengembalikan `FeatureCollection` siap kirim ke FE.
- ✅ `sql` template selalu untuk binding; `sql.raw` hanya untuk konstanta literal aman.
- ✅ Constraint validitas (`ST_IsValid`) sebagai CHECK + `ST_MakeValid` saat tulis.

## Alternatif yang Dipertimbangkan

- **Prisma:** dukungan PostGIS sangat terbatas (read-only via raw query), schema generation tidak tahu geometry. Migrasi PostGIS harus full manual.
- **TypeORM:** punya plugin PostGIS, tetapi type-safety lebih lemah dan komunitas mengarah ke Drizzle/Prisma.
- **Knex / raw SQL only:** kehilangan type-safety di seluruh codebase.
- **Drizzle dengan custom column type (pgGeometry plugin):** masih eksperimental saat keputusan ini diambil; bila stabil, dapat diadopsi sebagai migrasi inkremental tanpa breaking pola hybrid.

## Migrasi Masa Depan

Bila Drizzle merilis dukungan `geometry` first-class yang stabil:
1. Tambahkan tipe `geometry` ke schema (paralel dengan kolom existing).
2. Refactor helper `db/postgis.ts` untuk pakai tipe baru.
3. Hapus SQL manual yang sekadar membuat kolom (pertahankan trigger, CHECK constraint, GIST index karena tetap ranah PostGIS).
4. Tidak perlu rename ADR ini — beri Status: Superseded by ADR-NNN.

## Referensi

- PRD §3.3 Drizzle ORM + PostGIS — Strategi Hybrid
- PRD §6.7 Kolom Spasial — DDL & Strategi Geometry
- PRD §14 Risiko: "Drizzle tidak mendukung tipe geometry"
