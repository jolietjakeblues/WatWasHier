import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import type { HeritageDetails } from '$lib/domain';
import { getRceImages } from './rce-images';
import { getErfGeoNames, getPlaceName } from './erfgeo';

const BASE = 'https://api.pdok.nl/rce/beschermde-gebieden-cultuurhistorie/ogc/v1';
const COLLECTIONS = ['rce_inspire_points', 'rce_inspire_polygons'];

async function getCollection(
  collection: string,
  bbox: [number, number, number, number]
): Promise<FeatureCollection<Geometry, GeoJsonProperties>> {
  const url = new URL(`${BASE}/collections/${collection}/items`);
  url.searchParams.set('f', 'json');
  url.searchParams.set('bbox', bbox.join(','));
  url.searchParams.set('limit', '1000');
  const response = await fetch(url, { headers: { accept: 'application/geo+json, application/json' } });
  if (!response.ok) throw new Error(`RCE antwoordde met ${response.status}`);
  return response.json();
}

export async function getRceHeritage(
  bbox: [number, number, number, number]
): Promise<FeatureCollection<Geometry, GeoJsonProperties>> {
  const collections = await Promise.all(COLLECTIONS.map((name) => getCollection(name, bbox)));
  return {
    type: 'FeatureCollection',
    features: collections.flatMap((item) => item.features).map((feature) => ({
      ...feature,
      properties: {
        ...(feature.properties ?? {}),
        heritageType: heritageType(String(feature.properties?.namespace ?? ''))
      }
    }))
  };
}

function heritageType(namespace: string): 'monument' | 'face' | 'world-heritage' | 'other' {
  if (namespace.includes('stadsendorpsgezichten')) return 'face';
  if (namespace.includes('werelderfgoed')) return 'world-heritage';
  if (namespace.includes('rijksmonumenten')) return 'monument';
  return 'other';
}

const CEO = 'https://linkeddata.cultureelerfgoed.nl/def/ceo#';

type JsonLdNode = Record<string, unknown> & { '@id'?: string; '@type'?: string[] };

function value(node: JsonLdNode | undefined, property: string): string | null {
  const item = (node?.[`${CEO}${property}`] as Array<{ '@value'?: unknown; '@id'?: string }> | undefined)?.[0];
  return item?.['@value'] !== undefined ? String(item['@value']) : item?.['@id'] ?? null;
}

export async function getRceMonumentDetails(monumentNumber: string, knownChoNumber?: string, location?: { lon: number; lat: number }): Promise<HeritageDetails> {
  const url = new URL('https://api.linkeddata.cultureelerfgoed.nl/queries/rce/rest-api-rijksmonumenten/run');
  url.searchParams.set('rijksmonumentnummer', monumentNumber);
  const response = await fetch(url, { headers: { accept: 'application/ld+json, application/json' } });
  const graph = response.ok ? (await response.json()) as JsonLdNode[] : [];
  const monument = graph.find((node) => node['@type']?.some((type) => type.endsWith('#Rijksmonument')));
  const bag = graph.find((node) => node['@type']?.some((type) => type.endsWith('#BAGRelatie')));
  const street = value(bag, 'openbareRuimte');
  const houseNumber = value(bag, 'huisnummer');
  const postcode = value(bag, 'postcode');
  const address = [street && houseNumber ? `${street} ${houseNumber}` : street || houseNumber, postcode]
    .filter(Boolean).join(', ') || null;
  const choNumber = value(monument, 'cultuurhistorischObjectnummer') ?? knownChoNumber ?? null;
  const placeName = value(bag, 'woonplaatsnaam') ?? (location ? await getPlaceName(location.lon, location.lat).catch(() => null) : null);
  const [semantic, images, historicalNames] = await Promise.all([
    choNumber ? getChoSemantics(choNumber) : Promise.resolve(null),
    getRceImages(monumentNumber).catch(() => []),
    getErfGeoNames(placeName).catch(() => [])
  ]);
  return {
    monumentNumber,
    choNumber,
    registeredAt: value(monument, 'datumInschrijvingInMonumentenregister') ?? semantic?.registeredAt ?? null,
    address,
    bagObjectUrl: value(bag, 'heeftVerblijfsobject'),
    resourceUrl: monument?.['@id'] ?? (choNumber ? `https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/rijksmonument/${choNumber}` : null),
    description: semantic?.description ?? null,
    originalFunction: semantic?.originalFunction ?? null,
    legalStatus: semantic?.legalStatus ?? null,
    images,
    historicalNames
  };
}

async function getChoSemantics(choNumber: string) {
  const monumentUri = `https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/rijksmonument/${choNumber}`;
  const query = `PREFIX ceo: <${CEO}> PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?omschrijving ?functie ?juridischeStatus ?inschrijfdatum WHERE {
  VALUES ?monument { <${monumentUri}> }
  OPTIONAL { ?monument ceo:datumInschrijvingInMonumentenregister ?inschrijfdatum }
  OPTIONAL { ?monument ceo:heeftOmschrijving ?o . ?o ceo:omschrijving ?omschrijving }
  OPTIONAL { ?monument ceo:heeftOorspronkelijkeFunctie ?f . ?f ceo:heeftFunctieNaam ?fc . ?fc skos:prefLabel ?functie . FILTER(LANG(?functie) = "nl") }
  OPTIONAL { ?monument ceo:heeftJuridischeStatus ?sc . ?sc skos:prefLabel ?juridischeStatus . FILTER(LANG(?juridischeStatus) = "nl") }
} LIMIT 10`;
  const endpoint = new URL('https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/services/cho/sparql');
  endpoint.searchParams.set('query', query);
  const response = await fetch(endpoint, { headers: { accept: 'application/sparql-results+json' } });
  if (!response.ok) return null;
  const result = await response.json() as { results?: { bindings?: Array<Record<string, { value?: string }>> } };
  const row = result.results?.bindings?.[0];
  return {
    description: row?.omschrijving?.value ?? null,
    originalFunction: row?.functie?.value ?? null,
    legalStatus: row?.juridischeStatus?.value ?? null,
    registeredAt: row?.inschrijfdatum?.value ?? null
  };
}
