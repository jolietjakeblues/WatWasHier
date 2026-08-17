import { env } from '$env/dynamic/private';
import type { HistoricalMap } from '$lib/domain';
import { pointInPolygon } from '$lib/geo';

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
  const [collectionResponse, mapsResponse] = await Promise.all([
    fetch(collectionUrl, { headers: { accept: 'application/json' } }),
    fetch(annotationUrl, { headers: { accept: 'application/json' } })
  ]);

  if (!collectionResponse.ok) {
    throw new Error(`Watertijdreis IIIF collection antwoordde met ${collectionResponse.status}`);
  }
  if (!mapsResponse.ok) {
    throw new Error(`Watertijdreis kaartindex antwoordde met ${mapsResponse.status}`);
  }

  const collection = (await collectionResponse.json()) as IiifCollection;
  const maps = (await mapsResponse.json()) as GeoreferencedMap[];

  return {
    title: labelValue(collection.label),
    itemCount: Array.isArray(collection.items) ? collection.items.length : null,
    url: collectionUrl,
    maps: mapsCoveringPoint(maps, point, annotationUrl)
  };
}
