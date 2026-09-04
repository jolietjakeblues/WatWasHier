import type { DisappearedVillage, HistoricalName, MunicipalityBoundaryPeriod, Toponym } from '$lib/domain';
import { fetchSourceJson } from '$lib/server/source-fetch';
import { parseWkt } from '$lib/server/wkt';

const ENDPOINT = 'https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/erfgeo/sparql';
const GEMEENTEGESCHIEDENIS_GRAPH = 'https://linkeddata.cultureelerfgoed.nl/graph/gemeentegeschiedenis';
const KLOEKECODES_GRAPH = 'https://linkeddata.cultureelerfgoed.nl/graph/kloekecodes';
const VERDWENENDORPEN_GRAPH = 'https://linkeddata.cultureelerfgoed.nl/graph/verdwenendorpen';
type Binding = Record<string, { value?: string }>;

async function lookupNearestAddress(lon: number, lat: number): Promise<{ woonplaatsnaam?: string; gemeentenaam?: string } | null> {
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
  const lookupResult = await fetchSourceJson<{ response?: { docs?: Array<{ woonplaatsnaam?: string; gemeentenaam?: string }> } }>(lookup, { source: 'PDOK Locatieserver lookup', headers: { accept: 'application/json' } });
  return lookupResult.response?.docs?.[0] ?? null;
}

export async function getPlaceName(lon: number, lat: number): Promise<string | null> {
  const doc = await lookupNearestAddress(lon, lat);
  return doc?.woonplaatsnaam ?? null;
}

// De KKG-percelenquery moet altijd eerst tot één imxgeo:Gemeentegebied worden beperkt voordat er
// een ruimtelijk filter overheen gaat — zonder die restrictie time-out de query op de volle ~8,4
// miljoen percelen (zie getPercelen in kadaster-percelen.ts). Gemeentenaam kan afwijken van de
// woonplaatsnaam (bv. een dorp dat een woonplaats is binnen een grotere gemeente), dus dit is
// bewust een los veld en geen hergebruik van getPlaceName.
export async function getGemeenteNaam(lon: number, lat: number): Promise<string | null> {
  const doc = await lookupNearestAddress(lon, lat);
  return doc?.gemeentenaam ?? null;
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
      confidence: 0.65
    });
  }
  return [...names.values()].slice(0, 20);
}

export async function getErfGeoNames(placeName: string | null): Promise<HistoricalName[]> {
  if (!placeName?.trim()) return [];
  const name = sparqlString(placeName.trim());
  const query = `SELECT DISTINCT ?graph ?place ?label ?begin ?end WHERE {
  GRAPH ?graph {
    ?place ?matchedProperty ?matchedLabel .
    FILTER(isLiteral(?matchedLabel) && LCASE(STR(?matchedLabel)) = LCASE("${name}"))
    FILTER(REGEX(STR(?matchedProperty), "label|name|naam|title", "i"))
    ?place ?labelProperty ?label .
    FILTER(isLiteral(?label))
    FILTER(REGEX(STR(?labelProperty), "label|name|naam|title", "i"))
    OPTIONAL { ?place <http://schema.org/beginDate>|<http://schema.org/startDate> ?begin }
    OPTIONAL { ?place <http://schema.org/endDate> ?end }
  }
} LIMIT 50`;
  const endpoint = new URL(ENDPOINT);
  endpoint.searchParams.set('query', query);
  const result = await fetchSourceJson<{ results?: { bindings?: Binding[] } }>(endpoint, { source: 'RCE ErfGeo', headers: { accept: 'application/sparql-results+json' } });
  return parseErfGeoNames(result.results?.bindings ?? [], placeName);
}

function formatPeriodLabel(placeName: string, startYear: number | null, endYear: number | null): string {
  if (startYear === null && endYear === null) return placeName;
  return `${placeName} (${startYear ?? '?'}–${endYear ?? 'heden'})`;
}

export function parseMunicipalityHistory(bindings: Binding[], placeName: string): MunicipalityBoundaryPeriod[] {
  const periods = new Map<string, MunicipalityBoundaryPeriod>();
  for (const row of bindings) {
    const uri = row.place?.value;
    const wkt = row.wkt?.value;
    if (!uri || !wkt || periods.has(uri)) continue;
    const geometry = parseWkt(wkt);
    if (!geometry) continue;
    const startYear = row.begin?.value ? Number.parseInt(row.begin.value, 10) : null;
    const endYear = row.end?.value ? Number.parseInt(row.end.value, 10) : null;
    periods.set(uri, {
      id: uri,
      label: formatPeriodLabel(placeName, Number.isFinite(startYear) ? startYear : null, Number.isFinite(endYear) ? endYear : null),
      startYear: Number.isFinite(startYear) ? startYear : null,
      endYear: Number.isFinite(endYear) ? endYear : null,
      geometry
    });
  }
  return [...periods.values()].sort((a, b) => (a.startYear ?? -Infinity) - (b.startYear ?? -Infinity));
}

export async function getMunicipalityHistory(placeName: string | null): Promise<MunicipalityBoundaryPeriod[]> {
  if (!placeName?.trim()) return [];
  const name = sparqlString(placeName.trim());
  const query = `SELECT ?place ?begin ?end ?wkt WHERE {
  GRAPH <${GEMEENTEGESCHIEDENIS_GRAPH}> {
    ?place <http://purl.org/dc/elements/1.1/title> ?title .
    FILTER(LCASE(STR(?title)) = LCASE("${name}"))
    ?place <http://www.opengis.net/ont/geosparql#asWKT> ?wkt .
    OPTIONAL { ?place <http://schema.org/startDate> ?begin }
    OPTIONAL { ?place <http://schema.org/endDate> ?end }
  }
} ORDER BY ?begin LIMIT 30`;
  const endpoint = new URL(ENDPOINT);
  endpoint.searchParams.set('query', query);
  const result = await fetchSourceJson<{ results?: { bindings?: Binding[] } }>(endpoint, { source: 'RCE ErfGeo gemeentegeschiedenis', headers: { accept: 'application/sparql-results+json' } });
  return parseMunicipalityHistory(result.results?.bindings ?? [], placeName);
}

export function parseToponymBindings(bindings: Binding[]): Toponym[] {
  const items = new Map<string, Toponym>();
  for (const row of bindings) {
    const uri = row.s?.value;
    const label = row.title?.value?.trim();
    const kloekeCode = row.id?.value?.trim();
    const lon = row.lon?.value ? Number.parseFloat(row.lon.value) : NaN;
    const lat = row.lat?.value ? Number.parseFloat(row.lat.value) : NaN;
    if (!uri || !label || !kloekeCode || !Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    items.set(uri, { id: uri, label, kloekeCode, lon, lat });
  }
  return [...items.values()];
}

// De kloekecodes-graaf is een historische plaatsnamen-gazetteer (buurtschappen, gehuchten),
// niet een dialectuitspraak-thesaurus — elke plek heeft één titel en één Kloeke-identificatiecode.
// De WKT-punten worden in SPARQL zelf uitgesplitst naar lon/lat zodat de bbox-filter serverside
// gebeurt: de graaf heeft geen bbox-parameter, en alle ~4500 punten landelijk ophalen per klik
// zou onnodig zwaar zijn.
export async function getToponyms(bbox: [number, number, number, number]): Promise<Toponym[]> {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const query = `PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?s ?title ?id ?lon ?lat WHERE {
  GRAPH <${KLOEKECODES_GRAPH}> {
    ?s a <http://rdf.histograph.io/PlaceInTime> ;
       <http://purl.org/dc/elements/1.1/title> ?title ;
       <http://purl.org/dc/elements/1.1/identifier> ?id ;
       <http://www.opengis.net/ont/geosparql#asWKT> ?wkt .
    BIND(STRAFTER(STR(?wkt), "(") AS ?coords)
    BIND(xsd:double(STRBEFORE(?coords, " ")) AS ?lon)
    BIND(xsd:double(STRBEFORE(STRAFTER(?coords, " "), ")")) AS ?lat)
    FILTER(?lon >= ${minLon} && ?lon <= ${maxLon} && ?lat >= ${minLat} && ?lat <= ${maxLat})
  }
} LIMIT 100`;
  const endpoint = new URL(ENDPOINT);
  endpoint.searchParams.set('query', query);
  const result = await fetchSourceJson<{ results?: { bindings?: Binding[] } }>(endpoint, { source: 'RCE ErfGeo kloekecodes', headers: { accept: 'application/sparql-results+json' } });
  return parseToponymBindings(result.results?.bindings ?? []);
}

export function parseDisappearedVillageBindings(bindings: Binding[]): DisappearedVillage[] {
  const items = new Map<string, DisappearedVillage>();
  for (const row of bindings) {
    const uri = row.s?.value;
    const label = row.title?.value?.trim();
    const lon = row.lon?.value ? Number.parseFloat(row.lon.value) : NaN;
    const lat = row.lat?.value ? Number.parseFloat(row.lat.value) : NaN;
    if (!uri || !label || !Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    items.set(uri, {
      id: uri,
      label,
      date: row.date?.value?.trim() || null,
      source: row.source?.value?.trim() || null,
      lon,
      lat
    });
  }
  return [...items.values()];
}

// Bron: Bert Stulp, "Verdwenen Dorpen" (boekenreeks) — via RCE ErfGeo als puntenlaag met naam,
// (geschat) jaartal van verdwijnen en boekverwijzing. Zelfde bbox-in-SPARQL-truc als getToponyms.
export async function getDisappearedVillages(bbox: [number, number, number, number]): Promise<DisappearedVillage[]> {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const query = `PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?s ?title ?date ?source ?lon ?lat WHERE {
  GRAPH <${VERDWENENDORPEN_GRAPH}> {
    ?s a ?type ;
       <http://purl.org/dc/elements/1.1/title> ?title ;
       <http://www.opengis.net/ont/geosparql#asWKT> ?wkt .
    OPTIONAL { ?s <http://purl.org/dc/elements/1.1/date> ?date }
    OPTIONAL { ?s <http://purl.org/dc/elements/1.1/source> ?source }
    BIND(STRAFTER(STR(?wkt), "(") AS ?coords)
    BIND(xsd:double(STRBEFORE(?coords, " ")) AS ?lon)
    BIND(xsd:double(STRBEFORE(STRAFTER(?coords, " "), ")")) AS ?lat)
    FILTER(?lon >= ${minLon} && ?lon <= ${maxLon} && ?lat >= ${minLat} && ?lat <= ${maxLat})
  }
} LIMIT 100`;
  const endpoint = new URL(ENDPOINT);
  endpoint.searchParams.set('query', query);
  const result = await fetchSourceJson<{ results?: { bindings?: Binding[] } }>(endpoint, { source: 'RCE ErfGeo verdwenen dorpen', headers: { accept: 'application/sparql-results+json' } });
  return parseDisappearedVillageBindings(result.results?.bindings ?? []);
}

export async function getMunicipalityHistoryForLocation(
  lon: number,
  lat: number
): Promise<{ placeName: string | null; periods: MunicipalityBoundaryPeriod[] }> {
  const placeName = await getPlaceName(lon, lat);
  const periods = await getMunicipalityHistory(placeName);
  return { placeName, periods };
}
