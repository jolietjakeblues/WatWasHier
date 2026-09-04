import type { Geometry } from 'geojson';
import type { DefenceLine } from '$lib/domain';
import { fetchSourceJson } from '$lib/server/source-fetch';
import { parseWkt } from '$lib/server/wkt';
import { convertGeometryRdToWgs84 } from '$lib/server/rd';

const ENDPOINT = 'https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/services/cho/sparql';
const GRAPH = 'https://linkeddata.cultureelerfgoed.nl/graph/linies';

type Binding = Record<string, { value?: string }>;

// Alleen ~81 linies landelijk, en de RD-multilijngeometrie leent zich niet voor de
// bbox-in-SPARQL-truc die bij puntlagen (kloekecodes/verdwenendorpen) werkt — dus wordt hier de
// hele, kleine dataset in één keer opgehaald en pas na RD->WGS84-conversie in JS gefilterd.
// "Intersects" is hier een benadering: een lijn telt mee zodra minstens één van zijn (dicht op
// elkaar liggende) knikpunten binnen de bbox valt.
function geometryIntersectsBbox(geometry: Geometry, bbox: [number, number, number, number]): boolean {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  let hit = false;
  const visit = (value: unknown) => {
    if (hit) return;
    if (Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number') {
      const [lon, lat] = value as [number, number];
      if (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat) hit = true;
      return;
    }
    if (Array.isArray(value)) value.forEach(visit);
  };
  visit((geometry as { coordinates: unknown }).coordinates);
  return hit;
}

export function parseLiniesBindings(bindings: Binding[]): DefenceLine[] {
  const items = new Map<string, DefenceLine>();
  for (const row of bindings) {
    const uri = row.s?.value;
    const label = row.naam?.value?.trim();
    const wkt = row.wkt?.value;
    if (!uri || !label || !wkt) continue;
    const rdGeometry = parseWkt(wkt);
    if (!rdGeometry) continue;
    const existing = items.get(uri);
    items.set(uri, {
      id: uri,
      label,
      period: existing?.period ?? row.periodeLabel?.value?.trim() ?? null,
      geometry: convertGeometryRdToWgs84(rdGeometry)
    });
  }
  return [...items.values()];
}

export async function getDefenceLines(bbox: [number, number, number, number]): Promise<DefenceLine[]> {
  const query = `PREFIX schema: <https://schema.org/>
PREFIX ceo: <https://linkeddata.cultureelerfgoed.nl/def/ceo#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?s ?naam ?wkt ?periodeLabel WHERE {
  GRAPH <${GRAPH}> {
    ?s schema:name ?naam ; ceo:asWKT-RD ?wkt .
    OPTIONAL { ?s schema:temporalCoverage ?periode }
  }
  OPTIONAL { ?periode skos:prefLabel ?periodeLabel }
}`;
  const url = new URL(ENDPOINT);
  url.searchParams.set('query', query);
  const result = await fetchSourceJson<{ results?: { bindings?: Binding[] } }>(url, {
    source: 'RCE CHO linies',
    headers: { accept: 'application/sparql-results+json' }
  });
  const all = parseLiniesBindings(result.results?.bindings ?? []);
  return all.filter((line) => geometryIntersectsBbox(line.geometry, bbox));
}
