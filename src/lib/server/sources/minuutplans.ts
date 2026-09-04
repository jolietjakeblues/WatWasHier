import type { Geometry } from 'geojson';
import type { MinuutplanSheet } from '$lib/domain';
import { fetchSourceJson } from '$lib/server/source-fetch';

const ENDPOINT = 'https://services.rce.geovoorziening.nl/misc/wfs';

interface WfsFeature {
  geometry?: Geometry;
  properties?: {
    CODE?: string;
    PROVINCIE?: string;
    GEMEENTE?: string;
    SECTIE?: string;
    BLAD?: string;
    UUID?: string;
    URL?: string;
  };
}

export function parseMinuutplanSheets(features: WfsFeature[]): MinuutplanSheet[] {
  const sheets = new Map<string, MinuutplanSheet>();
  for (const feature of features) {
    const properties = feature.properties ?? {};
    const code = properties.CODE;
    if (!code || !feature.geometry || sheets.has(code)) continue;
    sheets.set(code, {
      id: code,
      code,
      province: properties.PROVINCIE || null,
      municipality: properties.GEMEENTE || null,
      section: properties.SECTIE || null,
      sheet: properties.BLAD || null,
      detailUrl: properties.URL || null,
      geometry: feature.geometry
    });
  }
  return [...sheets.values()];
}

export async function getMinuutplanSheets(
  bbox: [number, number, number, number]
): Promise<MinuutplanSheet[]> {
  const url = new URL(ENDPOINT);
  url.searchParams.set('service', 'WFS');
  url.searchParams.set('version', '2.0.0');
  url.searchParams.set('request', 'GetFeature');
  url.searchParams.set('typeNames', 'misc:Minuutplanbegrenzingen');
  url.searchParams.set('outputFormat', 'application/json');
  url.searchParams.set('srsName', 'EPSG:4326');
  url.searchParams.set('bbox', `${bbox.join(',')},EPSG:4326`);
  url.searchParams.set('count', '50');
  const result = await fetchSourceJson<{ features?: WfsFeature[] }>(url, {
    source: 'RCE kadastrale minuutplans',
    headers: { accept: 'application/json' }
  });
  return parseMinuutplanSheets(result.features ?? []);
}
