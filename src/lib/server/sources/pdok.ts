import { env } from '$env/dynamic/private';
import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

const DEFAULT_BASE = 'https://api.pdok.nl/kadaster/bag/ogc/v2';

export async function getBagBuildings(
  bbox: [number, number, number, number],
  limit = 100
): Promise<FeatureCollection<Geometry, GeoJsonProperties>> {
  const base = env.PDOK_BAG_BASE_URL || DEFAULT_BASE;
  const url = new URL(`${base}/collections/pand/items`);
  url.searchParams.set('f', 'json');
  url.searchParams.set('bbox', bbox.join(','));
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url, {
    headers: { accept: 'application/geo+json, application/json' }
  });

  if (!response.ok) {
    throw new Error(`PDOK BAG antwoordde met ${response.status}`);
  }

  return response.json();
}
