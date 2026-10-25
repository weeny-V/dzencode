import { Map as LeafletMap } from 'leaflet';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountWarehouseMap } from './mapRuntime';

const settings = vi.hoisted(() => ({
  mapTileUrl: 'https://controlled-tiles.invalid/{z}/{x}/{y}.png',
}));
vi.mock('@/shared/config/env', () => ({ env: settings }));
afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Leaflet runtime with controlled tile events (no network)', () => {
  it('creates the marker and attribution, responds to resize, and removes its observers/layers', () => {
    const disconnect = vi.fn();
    let resized = () => {};
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resized = callback;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
    const invalidate = vi.spyOn(LeafletMap.prototype, 'invalidateSize');
    const element = document.createElement('div');
    document.body.append(element);
    let width = 400;
    Object.defineProperties(element, {
      clientWidth: { get: () => width },
      clientHeight: { value: 300 },
    });
    const ready = vi.fn();
    const error = vi.fn();
    const dispose = mountWarehouseMap(
      element,
      {
        id: 1,
        code: 'DEMO',
        name: '<Demo warehouse>',
        address: 'Demo',
        latitude: 50,
        longitude: 30,
      },
      ready,
      error,
      { zoomIn: 'Zoom in', zoomOut: 'Zoom out' },
    );
    expect(element.querySelectorAll('.leaflet-marker-icon')).toHaveLength(1);
    expect(element.querySelector('.leaflet-marker-icon')).toHaveAttribute(
      'title',
      '<Demo warehouse>',
    );
    expect(element.querySelector('.leaflet-control-attribution')).toHaveTextContent(
      'OpenStreetMap',
    );
    const tile = element.querySelector<HTMLImageElement>('.leaflet-tile')!;
    expect(tile.src).toMatch(/^https:\/\/controlled-tiles.invalid\//);
    tile.dispatchEvent(new Event('load'));
    expect(ready).not.toHaveBeenCalled();
    for (const image of element.querySelectorAll('.leaflet-tile')) {
      if (image !== tile) image.dispatchEvent(new Event('load'));
    }
    expect(ready).toHaveBeenCalledOnce();
    tile.dispatchEvent(new Event('error'));
    expect(error).toHaveBeenCalled();
    width = 200;
    resized();
    expect(invalidate).toHaveBeenCalledWith({ animate: false, pan: true });
    expect(element.querySelector('.leaflet-map-pane')?.getAttribute('style')).toContain('-100px');
    dispose();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(element.querySelector('.leaflet-map-pane')).toBeNull();
  });
  it('requires a configured HTTPS template', () => {
    const previous = settings.mapTileUrl;
    settings.mapTileUrl = '';
    try {
      expect(() =>
        mountWarehouseMap(
          document.createElement('div'),
          { id: 1, code: 'D', name: 'D', address: 'D', latitude: 0, longitude: 0 },
          vi.fn(),
          vi.fn(),
          { zoomIn: 'Zoom in', zoomOut: 'Zoom out' },
        ),
      ).toThrow('must be configured');
    } finally {
      settings.mapTileUrl = previous;
    }
  });
});
