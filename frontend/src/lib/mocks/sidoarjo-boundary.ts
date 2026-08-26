import type { FeatureCollection, Polygon, Position } from 'geojson';

type BoundaryProps = { kind: 'kabupaten'; name: string };

/**
 * Approksimasi kasar batas administratif Kabupaten Sidoarjo, ~12 vertex.
 * Koordinat [lng, lat] (GeoJSON / MapLibre convention).
 *
 * Referensi batas administratif nyata:
 *   Utara  : Kota Surabaya, Kabupaten Gresik
 *   Barat  : Kabupaten Mojokerto
 *   Selatan: Kabupaten Pasuruan
 *   Timur  : Selat Madura
 *
 * Area hasil poligon ~700 km² (real Sidoarjo ~719 km²). Bukan data
 * BPS / BIG resmi — disclosure ada di spec §10 Risks.
 */
const SIDOARJO_RING: Position[] = [
  [112.55, -7.32],  // NW Mojokerto border
  [112.66, -7.30],  // N
  [112.78, -7.30],  // NE Surabaya
  [112.86, -7.38],  // E Madura Strait coast
  [112.84, -7.46],  // E
  [112.78, -7.55],  // SE Waru
  [112.70, -7.58],  // S Porong
  [112.62, -7.54],  // SW
  [112.56, -7.46],  // W
  [112.55, -7.38],  // W
  [112.55, -7.32],  // close ring
];

export const SIDOARJO_BOUNDARY: FeatureCollection<Polygon, BoundaryProps> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [SIDOARJO_RING],
      },
      properties: { kind: 'kabupaten', name: 'Kabupaten Sidoarjo' },
    },
  ],
};
