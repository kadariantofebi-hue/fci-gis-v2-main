/**
 * Nama bulan Indonesia, index 0 = bulan "01" (Januari) … index 11 = "12"
 * (Desember). Dipakai bersama oleh:
 * - DashboardFilterPanel: opsi select filter "Bulan" (bulan mulai proyek).
 * - MapContainer (mode project): popup proyek menampilkan Bulan mulai yang
 *   diturunkan dari `startDate` (ISO "YYYY-MM-DD").
 */
export const BULAN = [
	"Januari",
	"Februari",
	"Maret",
	"April",
	"Mei",
	"Juni",
	"Juli",
	"Agustus",
	"September",
	"Oktober",
	"November",
	"Desember",
] as const;

/**
 * Nama bulan mulai proyek dari tanggal ISO. Konvensi pengambilan bulan sama
 * dengan project-search.ts: `slice(5, 7)` untuk menghindari Date parsing/TZ.
 * Mengembalikan "—" bila tanggal kosong/tidak valid.
 */
export function bulanLabel(startDate?: string): string {
	const mm = startDate?.slice(5, 7) ?? "";
	const idx = Number(mm) - 1;
	return mm.length === 2 && idx >= 0 && idx < BULAN.length ? BULAN[idx] : "—";
}
