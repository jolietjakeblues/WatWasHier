import { env } from '$env/dynamic/private';
import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { fetchSourceJson } from '$lib/server/source-fetch';

const DEFAULT_BASE = 'https://api.pdok.nl/kadaster/bag/ogc/v2';
const MAX_FEATURES = 5000;

interface PdokFeatureCollection extends FeatureCollection<Geometry, GeoJsonProperties> {
  links?: Array<{ rel?: string; href?: string }>;
}

export async function getBagBuildings(
  bbox: [number, number, number, number],
  limit = 1000
): Promise<FeatureCollection<Geometry, GeoJsonProperties>> {
  const base = env.PDOK_BAG_BASE_URL || DEFAULT_BASE;
  const url = new URL(`${base}/collections/pand/items`);
  url.searchParams.set('f', 'json');
  url.searchParams.set('bbox', bbox.join(','));
  url.searchParams.set('limit', String(limit));

  const features: FeatureCollection<Geometry, GeoJsonProperties>['features'] = [];
  let nextUrl: string | null = url.toString();

  while (nextUrl && features.length < MAX_FEATURES) {
    const page: PdokFeatureCollection = await fetchSourceJson<PdokFeatureCollection>(nextUrl, {
      source: 'PDOK BAG',
      headers: { accept: 'application/geo+json, application/json' }
    });
    features.push(...page.features.slice(0, MAX_FEATURES - features.length));
    nextUrl = page.links?.find((link) => link.rel === 'next')?.href ?? null;
  }

  return { type: 'FeatureCollection', features };
}
