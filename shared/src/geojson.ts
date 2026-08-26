import type { JenisAset, JenisInfrastruktur, ProjectStatus } from './enums';
export type Position = [number, number];

export type Point = { type: 'Point'; coordinates: Position };
export type MultiPoint = { type: 'MultiPoint'; coordinates: Position[] };
export type LineString = { type: 'LineString'; coordinates: Position[] };
export type MultiLineString = { type: 'MultiLineString'; coordinates: Position[][] };
export type Polygon = { type: 'Polygon'; coordinates: Position[][] };
export type MultiPolygon = { type: 'MultiPolygon'; coordinates: Position[][][] };

/**
 * GeoJSON Geometry. Includes single-part (Point, LineString, Polygon) and
 * multi-part variants per RFC 7946. The MVP frontend digitizer emits
 * single-part (Point / LineString / Polygon); backend (PostGIS via ST_*) is
 * expected to handle conversion to Multi* when needed.
 */
export type Geometry =
  | Point
  | MultiPoint
  | LineString
  | MultiLineString
  | Polygon
  | MultiPolygon;

export type AssetFeatureProperties = { id: string; idPemda: string; name: string; jenis: JenisAset; ownerOpdId: string; hasGeom: boolean };
export type Feature<T = AssetFeatureProperties> = { type: 'Feature'; geometry: Geometry | null; properties: T };
export type FeatureCollection<T = AssetFeatureProperties> = { type: 'FeatureCollection'; features: Feature<T>[] };

/**
 * PRD v1.4 §8.1: properties GeoJSON fitur proyek untuk Dashboard Proyek.
 * Dipakai untuk render di MapContainer mode='project' (line/polygon/point
 * by infrastruktur, color by status group).
 */
export type ProjectFeatureProperties = {
  id: string;
  projectCode: string;
  projectName: string;
  status: ProjectStatus;
  fiscalYear: number;
  jenisInfrastruktur: JenisInfrastruktur;
  opdName: string;
  /**
   * Metadata pencarian Dashboard (panel Filter & Layer): nomor SK Proyek/Juklak
   * dan tanggal mulai dipakai untuk filter teks + bulan mulai proyek.
   */
  skProyek?: string;
  startDate?: string;
};

