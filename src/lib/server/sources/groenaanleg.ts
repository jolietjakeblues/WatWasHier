import type { HistoricGarden } from '$lib/domain';
import { fetchSourceJson } from '$lib/server/source-fetch';
import { parseWkt } from '$lib/server/wkt';

const ENDPOINT = 'https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/services/cho/sparql';
const GRAPH = 'https://linkeddata.cultureelerfgoed.nl/graph/groenaanleg';

type Binding = Record<string, { value?: string }>;

export function parseGroenaanlegBindings(bindings: Binding[]): HistoricGarden[] {
  const items = new Map<string, HistoricGarden>();
  for (const row of bindings) {
    const uri = row.s?.value;
    const label = row.naam?.value?.trim();
    const wkt = row.wkt?.value;
    if (!uri || !label || !wkt) continue;
    const geometry = parseWkt(wkt);
    if (!geometry) continue;
    const area = row.area?.value ? Number.parseFloat(row.area.value) : NaN;
    const existing = items.get(uri);
    items.set(uri, {
      id: uri,
      label,
      category: existing?.category ?? row.categorieLabel?.value?.trim() ?? null,
      areaSquareMeters: Number.isFinite(area) ? area : (existing?.areaSquareMeters ?? null),
      geometry
    });
  }
  return [...items.values()];
}

// oppervlakteInVierkanteMeters en asWKT staan op de losse geometrie-resource
// (?s ceo:heeftAanlegGeometrie ?geom), niet op ?s zelf — de eerste versie van deze query ging
// daaraan voorbij en leverde stil 0 resultaten op zodra oppervlakte verplicht werd meegevraagd.
export async function getHistoricGardens(bbox: [number, number, number, number]): Promise<HistoricGarden[]> {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const polygon = `${minLon} ${minLat},${maxLon} ${minLat},${maxLon} ${maxLat},${minLon} ${maxLat},${minLon} ${minLat}`;
  const query = `PREFIX ceo: <https://linkeddata.cultureelerfgoed.nl/def/ceo#>
PREFIX geosparql: <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?s ?naam ?wkt ?area ?categorieLabel WHERE {
  GRAPH <${GRAPH}> {
    ?s ceo:naam ?naam ; ceo:heeftAanlegGeometrie ?geom .
    ?geom geosparql:asWKT ?wkt .
    OPTIONAL { ?geom ceo:oppervlakteInVierkanteMeters ?area }
    OPTIONAL { ?s ceo:heeftCategorieGroenaanleg ?cat }
    FILTER(geof:sfIntersects(?wkt, "POLYGON((${polygon}))"^^geosparql:wktLiteral))
  }
  OPTIONAL { ?cat skos:prefLabel ?categorieLabel . FILTER(LANG(?categorieLabel) = "nl") }
} LIMIT 100`;
  const url = new URL(ENDPOINT);
  url.searchParams.set('query', query);
  const result = await fetchSourceJson<{ results?: { bindings?: Binding[] } }>(url, {
    source: 'RCE CHO groenaanleg',
    headers: { accept: 'application/sparql-results+json' }
  });
  return parseGroenaanlegBindings(result.results?.bindings ?? []);
}
