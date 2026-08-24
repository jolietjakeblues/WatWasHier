import type { HeritageImage } from '$lib/domain';

const ENDPOINT = 'https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/services/cho/sparql';
const IMAGE_GRAPHS = [
  'https://linkeddata.cultureelerfgoed.nl/graph/image',
  'https://linkeddata.cultureelerfgoed.nl/graph/image-1'
] as const;

type Binding = Record<string, { value?: string }>;

export function parseRceImages(bindings: Binding[]): HeritageImage[] {
  const images = new Map<string, HeritageImage>();
  for (const row of bindings) {
    const uri = row.image?.value;
    if (!uri) continue;
    const current = images.get(uri);
    const graph = row.graph?.value ?? 'RCE afbeeldingen';
    images.set(uri, {
      uri,
      title: current?.title ?? row.title?.value ?? null,
      description: current?.description ?? row.description?.value ?? null,
      thumbnailUrl: current?.thumbnailUrl ?? row.thumbnail?.value ?? row.preview?.value ?? null,
      sourceUrl: current?.sourceUrl ?? row.source?.value ?? null,
      licenseUrl: current?.licenseUrl ?? row.license?.value ?? null,
      graph: current ? `${current.graph}, ${graph}` : graph
    });
  }
  return [...images.values()];
}

export async function getRceImages(monumentNumber: string): Promise<HeritageImage[]> {
  if (!/^\d+$/.test(monumentNumber)) return [];
  const query = `PREFIX ceo: <https://linkeddata.cultureelerfgoed.nl/def/ceo#>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX edm: <http://www.europeana.eu/schemas/edm/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
SELECT ?graph ?image ?title ?description ?thumbnail ?preview ?source ?license WHERE {
  VALUES ?graph { ${IMAGE_GRAPHS.map((graph) => `<${graph}>`).join(' ')} }
  GRAPH ?graph {
    ?image ceo:rijksmonumentnummer ?number .
    FILTER(STR(?number) = "${monumentNumber}")
    OPTIONAL { ?image dc:title ?title }
    OPTIONAL { ?image dc:description ?description }
    OPTIONAL { ?image foaf:depiction ?thumbnail }
    OPTIONAL { ?image edm:isShownBy ?preview }
    OPTIONAL { ?image edm:isShownAt ?source }
    OPTIONAL { ?image dc:rights ?license }
  }
} LIMIT 48`;
  const endpoint = new URL(ENDPOINT);
  endpoint.searchParams.set('query', query);
  const response = await fetch(endpoint, { headers: { accept: 'application/sparql-results+json' } });
  if (!response.ok) return [];
  const result = await response.json() as { results?: { bindings?: Binding[] } };
  return parseRceImages(result.results?.bindings ?? []).slice(0, 12);
}
