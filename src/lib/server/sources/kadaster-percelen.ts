import type { Geometry } from 'geojson';
import type { Perceel } from '$lib/domain';
import { fetchSourceJson } from '$lib/server/source-fetch';

const ENDPOINT = 'https://api.pdok.nl/kadaster/brk-kadastrale-kaart/ogc/v1/collections/perceel/items';
const MAX_PERCELEN = 300;

interface PercelenFeature {
  geometry?: Geometry | null;
  properties?: {
    identificatie_lokaal_id?: string;
    kadastrale_gemeente_waarde?: string;
    sectie?: string;
    perceelnummer?: number | string;
    kadastrale_grootte_waarde?: number | string;
  };
}

export function parsePercelenFeatures(features: PercelenFeature[]): Perceel[] {
  const items = new Map<string, Perceel>();
  for (const feature of features) {
    const properties = feature.properties ?? {};
    const id = properties.identificatie_lokaal_id;
    const gemeente = properties.kadastrale_gemeente_waarde;
    const sectie = properties.sectie;
    const perceelnummer = properties.perceelnummer;
    if (!id || !gemeente || !sectie || perceelnummer === undefined || perceelnummer === null || !feature.geometry) continue;
    const area = Number(properties.kadastrale_grootte_waarde);
    items.set(id, {
      id,
      gemeente,
      sectie,
      perceelnummer: String(perceelnummer),
      areaSquareMeters: Number.isFinite(area) ? area : null,
      geometry: feature.geometry
    });
  }
  return [...items.values()];
}

// De Kadaster Knowledge Graph (KKG) is hiervoor niet meer bruikbaar: het huidige KKG-endpoint kent
// geof:sfIntersects niet en heeft geen ruimtelijke index, waardoor een bbox-query tientallen
// seconden duurt en elke kaartklik zou blokkeren. De BRK Kadastrale Kaart van PDOK levert
// dezelfde Kadaster-percelen (zelfde BRK-bron, WGS84) met een echte bbox-index in ~0,2 s.
export async function getPercelen(bbox: [number, number, number, number]): Promise<Perceel[]> {
  const url = new URL(ENDPOINT);
  url.searchParams.set('f', 'json');
  url.searchParams.set('bbox', bbox.join(','));
  url.searchParams.set('limit', String(MAX_PERCELEN));
  const result = await fetchSourceJson<{ features?: PercelenFeature[] }>(url, {
    source: 'Kadaster BRK percelen',
    headers: { accept: 'application/geo+json, application/json' }
  });
  return parsePercelenFeatures(result.features ?? []);
}
