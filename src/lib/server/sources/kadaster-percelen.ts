import type { Perceel } from '$lib/domain';
import { fetchSourceJson } from '$lib/server/source-fetch';
import { parseWkt } from '$lib/server/wkt';
import { getGemeenteNaam } from './erfgeo';

const ENDPOINT = 'https://api.labs.kadaster.nl/datasets/kadaster/kkg/services/kkg/sparql';

interface Binding {
  per?: { value?: string };
  sectie?: { value?: string };
  nummer?: { value?: string };
  area?: { value?: string };
  wkt?: { value?: string };
}

export function parsePercelenBindings(bindings: Binding[], gemeente: string): Perceel[] {
  const items = new Map<string, Perceel>();
  for (const row of bindings) {
    const uri = row.per?.value;
    const sectie = row.sectie?.value;
    const perceelnummer = row.nummer?.value;
    const wkt = row.wkt?.value;
    if (!uri || !sectie || !perceelnummer || !wkt) continue;
    const geometry = parseWkt(wkt);
    if (!geometry) continue;
    const area = row.area?.value ? Number.parseFloat(row.area.value) : NaN;
    items.set(uri, {
      id: uri,
      gemeente,
      sectie,
      perceelnummer,
      areaSquareMeters: Number.isFinite(area) ? area : null,
      geometry
    });
  }
  return [...items.values()];
}

function sparqlString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', ' ');
}

// Een ruimtelijk filter (geof:sfIntersects) over alle ~8,4 miljoen imxgeo:Perceel-instanties zonder
// eerst niet-ruimtelijk te filteren geeft een timeout op dit endpoint. Daarom wordt eerst via PDOK
// de gemeentenaam voor het punt bepaald en als verplichte voorfilter gebruikt — pas daarna gaat het
// bbox-filter erover heen. Zonder gemeentenaam (adresloze locatie) kan er niet veilig gezocht
// worden, dus dan blijft de laag leeg in plaats van een dure ongefilterde scan te proberen.
export async function getPercelen(
  lon: number,
  lat: number,
  bbox: [number, number, number, number]
): Promise<Perceel[]> {
  const gemeente = await getGemeenteNaam(lon, lat);
  if (!gemeente) return [];
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const polygon = `${minLon} ${minLat},${maxLon} ${minLat},${maxLon} ${maxLat},${minLon} ${maxLat},${minLon} ${minLat}`;
  const query = `PREFIX imxgeo: <http://modellen.geostandaarden.nl/def/imx-geo#>
PREFIX ext: <https://modellen.kkg.kadaster.nl/def/imxgeo-ext#>
PREFIX geosparql: <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>
SELECT ?per ?sectie ?nummer ?area ?wkt WHERE {
  ?gem a imxgeo:Gemeentegebied ; imxgeo:naam ?gnaam .
  FILTER(CONTAINS(LCASE(?gnaam), LCASE("${sparqlString(gemeente)}")))
  ?per a imxgeo:Perceel ;
    imxgeo:ligtInRegistratieveRuimte ?gem ;
    ext:sectie ?sectie ;
    ext:perceelnummer ?nummer ;
    geosparql:hasMetricArea ?area ;
    geosparql:hasGeometry/geosparql:asWKT ?wkt .
  FILTER(geof:sfIntersects(?wkt, "POLYGON((${polygon}))"^^geosparql:wktLiteral))
} LIMIT 300`;
  const result = await fetchSourceJson<{ results?: { bindings?: Binding[] } }>(ENDPOINT, {
    source: 'Kadaster KKG percelen',
    method: 'POST',
    headers: { 'content-type': 'application/sparql-query', accept: 'application/sparql-results+json' },
    body: query
  });
  return parsePercelenBindings(result.results?.bindings ?? [], gemeente);
}
