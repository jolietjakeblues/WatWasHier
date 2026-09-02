import type { HistoricalName } from '$lib/domain';
import { fetchSourceJson } from '$lib/server/source-fetch';

const ENDPOINT = 'https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/erfgeo/sparql';
type Binding = Record<string, { value?: string }>;
const MUNICIPAL_HISTORY_GRAPH = 'https://linkeddata.cultureelerfgoed.nl/graph/gemeentegeschiedenis';

export function parseWktArea(wkt: string | undefined): HistoricalName['geometry'] {
  if (!wkt) return null;
  const type = wkt.match(/^\s*(MULTIPOLYGON|POLYGON)\s*/i)?.[1]?.toUpperCase();
  if (!type) return null;
  const tokens = wkt.slice(wkt.indexOf('(')).match(/\(|\)|,|[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!tokens) return null;
  let position = 0;
  const parseGroup = (): unknown[] => {
    if (tokens[position++] !== '(') throw new Error('Ongeldige WKT-groep');
    const values: unknown[] = [];
    while (position < tokens.length) {
      if (tokens[position] === '(') values.push(parseGroup());
      else {
        const x = Number(tokens[position++]);
        const y = Number(tokens[position++]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Ongeldige WKT-coördinaat');
        values.push([x, y]);
      }
      if (tokens[position] === ',') position++;
      else if (tokens[position] === ')') { position++; break; }
    }
    return values;
  };
  try {
    const coordinates = parseGroup();
    return type === 'POLYGON'
      ? { type: 'Polygon', coordinates: coordinates as number[][][] }
      : { type: 'MultiPolygon', coordinates: coordinates as number[][][][] };
  } catch {
    return null;
  }
}

export async function getPlaceName(lon: number, lat: number): Promise<string | null> {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  const reverse = new URL('https://api.pdok.nl/bzk/locatieserver/search/v3_1/reverse');
  reverse.searchParams.set('lon', String(lon));
  reverse.searchParams.set('lat', String(lat));
  reverse.searchParams.set('rows', '1');
  const reverseResult = await fetchSourceJson<{ response?: { docs?: Array<{ id?: string }> } }>(reverse, { source: 'PDOK Locatieserver reverse', headers: { accept: 'application/json' } });
  const id = reverseResult.response?.docs?.[0]?.id;
  if (!id) return null;
  const lookup = new URL('https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup');
  lookup.searchParams.set('id', id);
  const lookupResult = await fetchSourceJson<{ response?: { docs?: Array<{ woonplaatsnaam?: string }> } }>(lookup, { source: 'PDOK Locatieserver lookup', headers: { accept: 'application/json' } });
  return lookupResult.response?.docs?.[0]?.woonplaatsnaam ?? null;
}

function sparqlString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', ' ');
}

export function parseErfGeoNames(bindings: Binding[], currentName: string): HistoricalName[] {
  const names = new Map<string, HistoricalName>();
  for (const row of bindings) {
    const uri = row.place?.value;
    const label = row.label?.value?.trim();
    const startYear = row.begin?.value ? Number.parseInt(row.begin.value, 10) : null;
    const endYear = row.end?.value ? Number.parseInt(row.end.value, 10) : null;
    if (!uri || !label) continue;
    if (label.toLocaleLowerCase('nl') === currentName.toLocaleLowerCase('nl') && startYear === null && endYear === null) continue;
    const key = `${uri}|${label.toLocaleLowerCase('nl')}|${startYear ?? ''}|${endYear ?? ''}`;
    names.set(key, {
      uri,
      label,
      source: row.graph?.value ?? null,
      startYear: Number.isFinite(startYear) ? startYear : null,
      endYear: Number.isFinite(endYear) ? endYear : null,
      matchMethod: 'place-label',
      confidence: 0.65,
      geometry: parseWktArea(row.geometry?.value)
    });
  }
  return [...names.values()].slice(0, 20);
}

export async function getErfGeoNames(placeName: string | null): Promise<HistoricalName[]> {
  if (!placeName?.trim()) return [];
  const name = sparqlString(placeName.trim());
  const query = `SELECT DISTINCT ?place ?label ?begin ?end ?geometry WHERE {
  GRAPH <${MUNICIPAL_HISTORY_GRAPH}> {
    ?place <http://purl.org/dc/elements/1.1/title> ?label .
    FILTER(LCASE(STR(?label)) = LCASE("${name}"))
    OPTIONAL { ?place <http://schema.org/startDate> ?begin }
    OPTIONAL { ?place <http://schema.org/endDate> ?end }
    OPTIONAL { ?place <http://www.opengis.net/ont/geosparql#asWKT> ?geometry }
  }
} LIMIT 50`;
  const endpoint = new URL(ENDPOINT);
  endpoint.searchParams.set('query', query);
  const result = await fetchSourceJson<{ results?: { bindings?: Binding[] } }>(endpoint, { source: 'RCE ErfGeo', headers: { accept: 'application/sparql-results+json' } });
  return parseErfGeoNames(result.results?.bindings ?? [], placeName);
}
