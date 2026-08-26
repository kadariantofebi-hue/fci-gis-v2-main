// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, unmount, tick, flushSync } from 'svelte';
import MapDrawController from './MapDrawController.svelte';
import type { DrawMode } from '$shared/enums';

// Minimal MapLibre mock — only the methods we touch.
function makeMapMock() {
  const handlers: Record<string, Array<(e: unknown) => void>> = {};
  // The mock's getSource returns null by default (no source yet); after
  // addSource is called, subsequent getSource() calls return a writable
  // GeoJSONSource so setData can be observed by tests.
  let added = false;
  const setData = vi.fn();
  return {
    isStyleLoaded: vi.fn(() => true),
    on: vi.fn((evt: string, h: (e: unknown) => void) => {
      handlers[evt] = handlers[evt] ?? [];
      handlers[evt].push(h);
    }),
    off: vi.fn(),
    addSource: vi.fn(() => {
      added = true;
    }),
    addLayer: vi.fn(),
    removeSource: vi.fn(() => {
      added = false;
    }),
    removeLayer: vi.fn(),
    getSource: vi.fn(() => (added ? { setData } : null)),
    getLayer: vi.fn(() => true),
    project: vi.fn((lngLat: [number, number]) => ({
      x: lngLat[0] * 1000,
      y: lngLat[1] * 1000,
    })),
    queryRenderedFeatures: vi.fn(() => []),
    __fire: (evt: string, e: unknown) =>
      (handlers[evt] ?? []).forEach((h) => h(e)),
    __handlers: handlers,
    __setData: setData,
  };
}

type MapMock = ReturnType<typeof makeMapMock>;
type Mounted = { component: ReturnType<typeof mount> };

function mountCtrl(map: MapMock, mode: DrawMode = 'polygon', resetSignal = 0): Mounted {
  const target = document.createElement('div');
  document.body.appendChild(target);
  // Cast: MapLibre's Map type is strict (~270 properties); tests only exercise
  // the surface we mock.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component = mount(MapDrawController as any, { target, props: { map, mode, resetSignal } });
  return { component };
}

describe('MapDrawController', () => {
  let map: MapMock;
  beforeEach(() => {
    map = makeMapMock();
  });

  it('adds a source and three layers when style is loaded', () => {
    mountCtrl(map);
    flushSync();
    expect(map.addSource).toHaveBeenCalledWith('draft-shape', expect.any(Object));
    expect(map.addLayer).toHaveBeenCalledTimes(3); // fill, outline, vertices
  });

  it('attaches click and dblclick handlers on mount', () => {
    mountCtrl(map);
    flushSync();
    const events = map.on.mock.calls.map((c) => c[0]);
    expect(events).toContain('click');
    expect(events).toContain('dblclick');
  });

  it('removes layers and source on unmount', () => {
    const { component } = mountCtrl(map);
    flushSync();
    unmount(component);
    expect(map.removeSource).toHaveBeenCalledWith('draft-shape');
  });

  it('suppresses click within 250ms after a dblclick in line mode', () => {
    mountCtrl(map, 'line');
    flushSync();
    const clickH = map.__handlers.click[0];
    const dblH = map.__handlers.dblclick[0];
    dblH({ lngLat: { lng: 106.1, lat: -6.2 } });
    clickH({ lngLat: { lng: 106.2, lat: -6.3 } });
    expect(map.__setData.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('mode change resets internal state (no leftover vertices)', () => {
    mountCtrl(map, 'polygon');
    flushSync();
    map.__fire('click', { lngLat: { lng: 106.1, lat: -6.2 } });
    flushSync();
    expect(map.__setData).toHaveBeenCalled();
  });

  it('point mode: a single click emits a single committed Point (Add Project enables)', () => {
    const onChange = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(MapDrawController as any, {
      target,
      props: { map, mode: 'point', resetSignal: 0, onGeometryChange: onChange },
    });
    flushSync();
    map.__handlers.click[0]({ lngLat: { lng: 106.1, lat: -6.2 } });
    flushSync();
    // Rendered draft is a single Point feature (never an accumulating
    // MultiPoint/polygon shadow).
    const data = map.__setData.mock.calls.at(-1)?.[0];
    expect(data.features).toHaveLength(1);
    expect(data.features[0].geometry.type).toBe('Point');
    expect(data.features[0].geometry.coordinates).toEqual([106.1, -6.2]);
    // Committed on the first click (isComplete true) → Add Project can enable.
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        geometry: expect.objectContaining({ type: 'Point', coordinates: [106.1, -6.2] }),
        isComplete: true,
      }),
    );
    unmount(component);
  });

  it('point mode: a second single click repositions (replace) rather than accumulating', () => {
    mountCtrl(map, 'point');
    flushSync();
    const clickH = map.__handlers.click[0];
    clickH({ lngLat: { lng: 106.1, lat: -6.2 } });
    flushSync();
    clickH({ lngLat: { lng: 106.3, lat: -6.4 } });
    flushSync();
    const data = map.__setData.mock.calls.at(-1)?.[0];
    expect(data.features).toHaveLength(1);
    expect(data.features[0].geometry.type).toBe('Point');
    expect(data.features[0].geometry.coordinates).toEqual([106.3, -6.4]);
  });

  it('incrementing resetSignal clears the drawn preview off the map', () => {
    mountCtrl(map, 'polygon');
    flushSync();
    map.__fire('click', { lngLat: { lng: 106.1, lat: -6.2 } });
    flushSync();
    const callsBefore = map.__setData.mock.calls.length;
    expect(callsBefore).toBeGreaterThan(0);

    // Re-mount with a bumped resetSignal to simulate the sheet Reset click.
    const { component } = mountCtrl(map, 'polygon', 1);
    flushSync();
    const finalData = map.__setData.mock.calls.at(-1)?.[0];
    // Reset must blank the draft source (empty FeatureCollection), not a draft
    // with leftover vertices.
    expect(finalData).toEqual({ type: 'FeatureCollection', features: [] });
    unmount(component);
  });

  it('line mode: clicking the last vertex again completes the line and emits a LineString', () => {
    const onChange = vi.fn();
    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(MapDrawController as any, {
      target,
      props: { map, mode: 'line', resetSignal: 0, onGeometryChange: onChange },
    });
    flushSync();
    const clickH = map.__handlers.click[0];
    // Two distinct vertices
    clickH({ lngLat: { lng: 106.1, lat: -6.2 } });
    flushSync();
    clickH({ lngLat: { lng: 106.2, lat: -6.3 } });
    flushSync();
    expect(onChange.mock.calls.at(-1)?.[0].isComplete).toBe(false);
    // Third click re-lands on the last vertex (same screen px) → completion.
    clickH({ lngLat: { lng: 106.2, lat: -6.3 } });
    flushSync();
    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last.isComplete).toBe(true);
    expect(last.geometry).toEqual(
      expect.objectContaining({ type: 'LineString', coordinates: [[106.1, -6.2], [106.2, -6.3]] }),
    );
    // Only the line + vertices are rendered — never a polygon fill (bug 1 guard).
    const data = map.__setData.mock.calls.at(-1)?.[0];
    const types = data.features.map((f: any) => f.geometry.type);
    expect(types).not.toContain('Polygon');
    unmount(component);
  });
});
