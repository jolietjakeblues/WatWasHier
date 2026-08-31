import type { Feature, FeatureCollection, Geometry, GeoJsonProperties, Position } from 'geojson';
import type { ArchaeologyDetails, ArchaeologyRelation } from '$lib/domain';
import { fetchSourceJson } from '$lib/server/source-fetch';

const ENDPOINT = 'https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/services/cho/sparql';
const CEO = 'https://linkeddata.cultureelerfgoed.nl/def/ceo#';
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<string, { expires: number; value: FeatureCollection<Geometry, GeoJsonProperties> }>();

type Binding = Record<string, { value?: string }>;

export function normalizeArchaeologyRelations(rows: Binding[]): ArchaeologyRelation[] {
  const unique = new Map<string, ArchaeologyRelation>();
  for (const row of rows) {
    const uri = row.object?.value;
    if (!uri) continue;
    const direction = row.direction?.value === 'part-of' ? 'part-of' : 'contains';
    const key = `${direction}|${uri}`;
    const existing = unique.get(key);
    const relation: ArchaeologyRelation = {
      uri,
      direction,
      type: kind(row.class?.value ?? ''),
      name: row.name?.value ?? null,
      choNumber: row.cho?.value ?? null,
      archisNumber: row.archis?.value ?? null,
      amount: row.amount?.value ? Number(row.amount.value) : null
    };
    if (!existing || (!existing.name && relation.name)) unique.set(key, relation);
  }
  return [...unique.values()].sort((a, b) => a.type.localeCompare(b.type) || a.uri.localeCompare(b.uri));
}

export async function getArchaeologyDetails(anchorUri: string): Promise<ArchaeologyDetails> {
  const query = `PREFIX ceo: <${CEO}>
SELECT DISTINCT ?direction ?object ?class ?name ?cho ?archis ?amount WHERE {
 VALUES ?anchor { <${anchorUri}> }
 { ?anchor ceo:bevatObject ?object . BIND("contains" AS ?direction) }
 UNION
 { ?anchor ceo:ligtInObject ?object . BIND("part-of" AS ?direction) }
 ?object a ?class .
 FILTER(?class IN (ceo:Rijksmonument, ceo:ArcheologischTerrein, ceo:ArcheologischOnderzoeksgebied, ceo:ArcheologischComplex, ceo:Vondstlocatie, ceo:Grondsporen, ceo:Vondsten))
 OPTIONAL { ?object ceo:heeftLocatieAanduiding/ceo:locatienaam ?name }
 OPTIONAL { ?object ceo:cultuurhistorischObjectnummer ?cho }
 OPTIONAL { ?object ceo:archis2Monumentnummer|ceo:archis2Complexnummer|ceo:archis2Vondstmeldingsnummer|ceo:archis2Waarnemingsnummer|ceo:archis2Vondstnummer ?archis }
 OPTIONAL { ?object ceo:aantalVondsten|ceo:aantalGrondsporen ?amount }
} LIMIT 500`;
  const url = new URL(ENDPOINT);
  url.searchParams.set('query', query);
  const json = await fetchSourceJson<{ results?: { bindings?: Binding[] } }>(url, { source: 'RCE CHO archeologiedetails', timeoutMs: 15_000, headers: { accept: 'application/sparql-results+json' } });
  const relations = normalizeArchaeologyRelations(json.results?.bindings ?? []);
  const counts = new Map<string, number>();
  for (const relation of relations) counts.set(relation.type, (counts.get(relation.type) ?? 0) + 1);
  return { anchorUri, relations, groups: [...counts].map(([type, count]) => ({ type, count })).sort((a, b) => a.type.localeCompare(b.type)) };
}

function rings(text: string): Position[][] {
  return text.split(/\)\s*,\s*\(/).map((ring) => ring.replace(/[()]/g, '').split(',').map((pair) => pair.trim().split(/\s+/).slice(0, 2).map(Number)));
}

function parseWkt(wkt: string): Geometry | null {
  const clean = wkt.replace(/^<[^>]+>\s*/, '').trim();
  const body = clean.slice(clean.indexOf('('));
  if (/^POINT/i.test(clean)) {
    const coordinates = body.replace(/[()]/g, '').trim().split(/\s+/).slice(0, 2).map(Number);
    return coordinates.every(Number.isFinite) ? { type: 'Point', coordinates } : null;
  }
  if (/^POLYGON/i.test(clean)) return { type: 'Polygon', coordinates: rings(body.slice(1, -1)) };
  return null;
}

function kind(classUri: string): string {
  return classUri.slice(classUri.lastIndexOf('#') + 1);
}

export async function getArchaeology(bbox: [number, number, number, number]): Promise<FeatureCollection<Geometry, GeoJsonProperties>> {
  const key = bbox.map((value) => value.toFixed(4)).join(',');
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const [west, south, east, north] = bbox;
  const polygon = `POLYGON((${west} ${south},${east} ${south},${east} ${north},${west} ${north},${west} ${south}))`;
  const query = `PREFIX ceo: <${CEO}> PREFIX geo: <http://www.opengis.net/ont/geosparql#> PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
SELECT ?object ?class ?wkt ?cho ?archis ?naam (COUNT(DISTINCT ?linkedObject) AS ?linkedObjectCount) WHERE {
 VALUES ?class { ceo:ArcheologischTerrein ceo:ArcheologischOnderzoeksgebied ceo:Vondstlocatie }
 ?object a ?class ; ceo:heeftGeometrie/geo:asWKT ?wkt .
 OPTIONAL { ?object ceo:cultuurhistorischObjectnummer ?cho }
 OPTIONAL { ?object ceo:archis2Monumentnummer|ceo:archis2Vondstmeldingsnummer|ceo:archis2Waarnemingsnummer ?archis }
 OPTIONAL { ?object ceo:heeftLocatieAanduiding/ceo:locatienaam ?naam }
 OPTIONAL {
   ?object ceo:bevatObject ?linkedObject .
   ?linkedObject a ?linkedClass .
   VALUES ?linkedClass { ceo:ArcheologischComplex ceo:Vondstlocatie ceo:Grondsporen ceo:Vondsten }
 }
 FILTER(geof:sfIntersects(?wkt, "${polygon}"^^geo:wktLiteral))
} GROUP BY ?object ?class ?wkt ?cho ?archis ?naam LIMIT 75`;
  const url = new URL(ENDPOINT);
  url.searchParams.set('query', query);
  const json = await fetchSourceJson<{ results?: { bindings?: Binding[] } }>(url, { source: 'RCE CHO archeologie', timeoutMs: 15_000, headers: { accept: 'application/sparql-results+json' } });
  const features: Feature<Geometry, GeoJsonProperties>[] = [];
  for (const row of json.results?.bindings ?? []) {
    const geometry = row.wkt?.value ? parseWkt(row.wkt.value) : null;
    if (!geometry) continue;
    features.push({ type: 'Feature', id: row.object?.value, geometry, properties: { archaeologyType: kind(row.class?.value ?? ''), resource: row.object?.value, choNumber: row.cho?.value, archisNumber: row.archis?.value, name: row.naam?.value, linkedObjectCount: Number(row.linkedObjectCount?.value ?? 0), spatialAnchor: true } });
  }
  const value = { type: 'FeatureCollection' as const, features };
  cache.set(key, { expires: Date.now() + CACHE_MS, value });
  return value;
}
