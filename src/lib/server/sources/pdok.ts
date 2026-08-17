import { env } from '$env/dynamic/private';
import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

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
    const response = await fetch(nextUrl, {
      headers: { accept: 'application/geo+json, application/json' }
    });

    if (!response.ok) {
      throw new Error(`PDOK BAG antwoordde met ${response.status}`);
    }

    const page = (await response.json()) as PdokFeatureCollection;
    features.push(...page.features.slice(0, MAX_FEATURES - features.length));
    nextUrl = page.links?.find((link) => link.rel === 'next')?.href ?? null;
  }

  return { type: 'FeatureCollection', features };
}
