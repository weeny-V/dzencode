import 'leaflet/dist/leaflet.css';

import { control, divIcon, map as createMap, marker, tileLayer } from 'leaflet';

import type { Warehouse } from '@/shared/api/types';
import { env } from '@/shared/config/env';

/** No default external provider. Only an explicitly configured HTTPS source is used after Show map. */
export const mountWarehouseMap = (
  element: HTMLElement,
  warehouse: Warehouse,
  onReady: () => void,
  onError: () => void,
  controls: { zoomIn: string; zoomOut: string },
) => {
  if (
    !env.mapTileUrl.startsWith('https://') ||
    !['{z}', '{x}', '{y}'].every((part) => env.mapTileUrl.includes(part))
  ) {
    throw new Error('An HTTPS map tile template must be configured');
  }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const map = createMap(element, {
    fadeAnimation: !reducedMotion,
    zoomAnimation: !reducedMotion,
    markerZoomAnimation: !reducedMotion,
    scrollWheelZoom: false,
    zoomControl: false,
  }).setView([warehouse.latitude, warehouse.longitude], 14);
  let observer: ResizeObserver | undefined;
  try {
    control.zoom({ zoomInTitle: controls.zoomIn, zoomOutTitle: controls.zoomOut }).addTo(map);
    const providerCredit = document.createElement('span');
    providerCredit.textContent = env.mapTileAttribution;
    const tiles = tileLayer(env.mapTileUrl, {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' +
        (env.mapTileAttribution ? ` | ${providerCredit.innerHTML}` : ''),
      updateWhenIdle: true,
      keepBuffer: 0,
    });
    tiles.once('load', onReady);
    tiles.on('tileerror', onError);
    tiles.addTo(map);
    const label = document.createElement('span');
    label.textContent = warehouse.name;
    marker([warehouse.latitude, warehouse.longitude], {
      title: warehouse.name,
      alt: warehouse.name,
      icon: divIcon({
        className: 'warehouse-location__marker',
        html: '<span></span>',
        iconSize: [24, 24],
      }),
    })
      .addTo(map)
      .bindTooltip(label);
    observer = new ResizeObserver(() => map.invalidateSize({ animate: false, pan: true }));
    observer.observe(element);
  } catch (error) {
    observer?.disconnect();
    map.remove();
    throw error;
  }
  return () => {
    observer?.disconnect();
    map.remove();
  };
};
