import { describe, expect, it } from 'vitest';
import { geometryToLatLng, latLngToPoint, parseCoordInput, geometryToFocusTarget } from './coordinate-helpers';
import type { Geometry } from '$shared/geojson';

describe('coordinate-helpers: project create geometry ↔ lat/lng', () => {
  describe('geometryToLatLng', () => {
    it('returns null for null geometry (PRD §6.8 belum dipetakan)', () => {
      expect(geometryToLatLng(null)).toBeNull();
      expect(geometryToLatLng(undefined)).toBeNull();
    });

    it('returns {lat, lng} for Point geometry', () => {
      const g: Geometry = { type: 'Point', coordinates: [112.6789, -7.45123] };
      const result = geometryToLatLng(g);
      expect(result).toEqual({ lat: -7.45123, lng: 112.6789 });
    });

    it('returns midpoint of LineString for Line geometry', () => {
      const g: Geometry = {
        type: 'LineString',
        coordinates: [
          [112.0, -7.0],
          [114.0, -8.0]
        ]
      };
      const result = geometryToLatLng(g);
      // Midpoint: lat = (-7 + -8)/2 = -7.5, lng = (112 + 114)/2 = 113
      expect(result).toEqual({ lat: -7.5, lng: 113 });
    });

    it('returns centroid of Polygon ring (excluding closing duplicate vertex)', () => {
      // Polygon ring with 4 unique vertices + closing duplicate = 5 coords
      const g: Geometry = {
        type: 'Polygon',
        coordinates: [
          [
            [112, -7],
            [114, -7],
            [114, -9],
            [112, -9],
            [112, -7]
          ]
        ]
      };
      const result = geometryToLatLng(g);
      // Centroid of 4 vertices: lat = (-7+-7+-9+-9)/4 = -8, lng = (112+114+114+112)/4 = 113
      expect(result).toEqual({ lat: -8, lng: 113 });
    });
  });

  describe('latLngToPoint', () => {
    it('builds a Point geometry with [lng, lat] order (GeoJSON spec)', () => {
      const p = latLngToPoint(-7.45123, 112.6789);
      expect(p).toEqual({ type: 'Point', coordinates: [112.6789, -7.45123] });
    });

    it('handles zero/negative values', () => {
      expect(latLngToPoint(0, 0)).toEqual({ type: 'Point', coordinates: [0, 0] });
      expect(latLngToPoint(-1.5, 100.25)).toEqual({ type: 'Point', coordinates: [100.25, -1.5] });
    });
  });

  describe('parseCoordInput', () => {
    it('returns null for empty / null / undefined input', () => {
      expect(parseCoordInput('')).toBeNull();
      expect(parseCoordInput(null)).toBeNull();
      expect(parseCoordInput(undefined)).toBeNull();
      expect(parseCoordInput('   ')).toBeNull();
    });

    it('parses valid numeric string to number', () => {
      expect(parseCoordInput('-7.45123')).toBe(-7.45123);
      expect(parseCoordInput('112.6789')).toBe(112.6789);
    });

    it('parses number input directly', () => {
      expect(parseCoordInput(-7.45123)).toBe(-7.45123);
      expect(parseCoordInput(0)).toBe(0);
    });

    it('returns null for non-numeric string', () => {
      expect(parseCoordInput('abc')).toBeNull();
      expect(parseCoordInput('-7.4abc')).toBeNull();
    });
  });

  describe('geometryToFocusTarget', () => {
    it('returns null for null or undefined geometry', () => {
      expect(geometryToFocusTarget(null)).toBeNull();
      expect(geometryToFocusTarget(undefined)).toBeNull();
    });

    it('returns point target with center and zoom 16 for Point geometry', () => {
      const g: Geometry = { type: 'Point', coordinates: [112.71, -7.45] };
      expect(geometryToFocusTarget(g)).toEqual({
        type: 'point',
        center: [112.71, -7.45],
        zoom: 16
      });
    });

    it('returns bounding box target for LineString geometry', () => {
      const g: Geometry = {
        type: 'LineString',
        coordinates: [
          [112.70, -7.46],
          [112.75, -7.42]
        ]
      };
      expect(geometryToFocusTarget(g)).toEqual({
        type: 'bounds',
        bounds: [
          [112.70, -7.46],
          [112.75, -7.42]
        ]
      });
    });

    it('returns bounding box target for Polygon geometry', () => {
      const g: Geometry = {
        type: 'Polygon',
        coordinates: [
          [
            [112.70, -7.46],
            [112.75, -7.46],
            [112.75, -7.42],
            [112.70, -7.42],
            [112.70, -7.46]
          ]
        ]
      };
      expect(geometryToFocusTarget(g)).toEqual({
        type: 'bounds',
        bounds: [
          [112.70, -7.46],
          [112.75, -7.42]
        ]
      });
    });
  });
});
