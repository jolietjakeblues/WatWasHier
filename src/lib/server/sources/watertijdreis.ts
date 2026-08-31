import { env } from '$env/dynamic/private';
import type { HistoricalMap } from '$lib/domain';
import { pointInPolygon } from '$lib/geo';
import { fetchSourceJson } from '$lib/server/source-fetch';

const DEFAULT_COLLECTION =
  'https://tu-delft-heritage.github.io/watertijdreis-data/collection.json';
const DEFAULT_MAP_INDEX = 'https://watertijdreis.nl/maps-sorted-by-edition.json';

interface IiifCollection {
  label?: Record<string, string[]>;
  items?: unknown[];
}

interface GeoreferencedMap {
  id: string;
  resource: {
    partOf?: Array<{ id?: string; partOf?: Array<{ id?: string }> }>;
  };
  gcps: Array<{ geo: [number, number] }>;
  _meta: {
    label?: string;
    yearStart: number;
    yearEnd: number;
    edition: number;
  };
  [key: string]: unknown;
}

function labelValue(label?: Record<string, string[]>): string | null {
  if (!label) return null;
  return label.nl?.[0] ?? label.en?.[0] ?? Object.values(label)[0]?.[0] ?? null;
}

function manifestUrl(map: GeoreferencedMap): string | null {
  const canvas = map.resource.partOf?.[0];
  return canvas?.partOf?.[0]?.id ?? canvas?.id ?? null;
}

export function mapsCoveringPoint(
  maps: GeoreferencedMap[],
  point: [number, number],
  annotationUrl: string
): HistoricalMap[] {
  return maps
    .filter((map) => map.gcps?.length >= 3 && pointInPolygon(point, map.gcps.map((gcp) => gcp.geo)))
    .map((map) => ({
      id: map.id,
      label: map._meta.label ?? `Waterstaatskaart ${map._meta.yearEnd}`,
      yearStart: map._meta.yearStart,
      yearEnd: map._meta.yearEnd,
      edition: map._meta.edition,
      manifestUrl: manifestUrl(map),
      annotationUrl,
      georeferencedMap: map
    }))
    .sort((first, second) => first.yearEnd - second.yearEnd || first.edition - second.edition);
}

export async function getWatertijdreisContext(point: [number, number]) {
  const collectionUrl = env.WATERTIJDREIS_COLLECTION_URL || DEFAULT_COLLECTION;
  const annotationUrl = env.WATERTIJDREIS_MAP_INDEX_URL || DEFAULT_MAP_INDEX;
  const [collection, maps] = await Promise.all([
    fetchSourceJson<IiifCollection>(collectionUrl, { source: 'Watertijdreis IIIF-collectie', headers: { accept: 'application/json' } }),
    fetchSourceJson<GeoreferencedMap[]>(annotationUrl, { source: 'Watertijdreis kaartindex', headers: { accept: 'application/json' } })
  ]);

  return {
    title: labelValue(collection.label),
    itemCount: Array.isArray(collection.items) ? collection.items.length : null,
    url: collectionUrl,
    maps: mapsCoveringPoint(maps, point, annotationUrl)
  };
}
