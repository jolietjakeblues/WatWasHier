import type { LandscapeContext, LocationSelection, Provenance } from '$lib/domain';
import { getBagBuildings } from './sources/pdok';
import { getWatertijdreisContext } from './sources/watertijdreis';
import { getRceHeritage } from './sources/rce';
import { getArchaeology } from './sources/archaeology';

const now = () => new Date().toISOString();

export async function buildLandscapeContext(
  location: LocationSelection
): Promise<LandscapeContext> {
  const warnings: string[] = [];

  const [buildingsResult, historyResult, heritageResult, archaeologyResult] = await Promise.allSettled([
    getBagBuildings(location.bbox),
    getWatertijdreisContext([location.lon, location.lat]),
    getRceHeritage(location.bbox),
    getArchaeology(location.bbox)
  ]);

  const buildings =
    buildingsResult.status === 'fulfilled'
      ? buildingsResult.value
      : { type: 'FeatureCollection' as const, features: [] };

  if (buildingsResult.status === 'rejected') {
    warnings.push(`PDOK BAG: ${String(buildingsResult.reason)}`);
  }

  const historical =
    historyResult.status === 'fulfilled'
      ? historyResult.value
      : {
          title: null,
          itemCount: null,
          url: 'https://tu-delft-heritage.github.io/watertijdreis-data/collection.json',
          maps: []
        };

  if (historyResult.status === 'rejected') {
    warnings.push(`Watertijdreis: ${String(historyResult.reason)}`);
  }

  const heritage = heritageResult.status === 'fulfilled'
    ? heritageResult.value
    : { type: 'FeatureCollection' as const, features: [] };
  if (heritageResult.status === 'rejected') warnings.push(`RCE: ${String(heritageResult.reason)}`);
  const archaeology = archaeologyResult.status === 'fulfilled' ? archaeologyResult.value : { type: 'FeatureCollection' as const, features: [] };
  if (archaeologyResult.status === 'rejected') warnings.push(`RCE archeologie: ${String(archaeologyResult.reason)}`);

  const provenance: Provenance[] = [
    {
      id: 'source-pdok-bag',
      source: 'pdok-bag',
      title: 'Basisregistratie Adressen en Gebouwen (BAG), collectie Pand',
      url: 'https://api.pdok.nl/kadaster/bag/ogc/v2/collections/pand',
      retrievedAt: now(),
      license: 'Public Domain Mark 1.0'
    },
    {
      id: 'source-rce',
      source: 'rce',
      title: 'RCE Beschermde Gebieden - Cultuurhistorie',
      url: 'https://api.pdok.nl/rce/beschermde-gebieden-cultuurhistorie/ogc/v1',
      retrievedAt: now(),
      license: 'CC BY 4.0'
    },
    {
      id: 'source-watertijdreis',
      source: 'watertijdreis',
      title: historical.title ?? 'Watertijdreis IIIF Collection',
      url: historical.url,
      retrievedAt: now()
    }
  ];

  for (const historicalMap of historical.maps) {
    provenance.push({
      id: `source-watertijdreis-${historicalMap.id}`,
      source: 'watertijdreis',
      title: `${historicalMap.label}, ${historicalMap.yearEnd}`,
      url: historicalMap.manifestUrl ?? historicalMap.annotationUrl,
      retrievedAt: now()
    });
  }

  const buildingCount = buildings.features.length;

  return {
    location,
    current: { buildings },
    historical: {
      collectionTitle: historical.title,
      collectionUrl: historical.url,
      itemCount: historical.itemCount,
      maps: historical.maps
    },
    heritage: {
      status: heritageResult.status === 'fulfilled' ? 'connected' : 'not-connected',
      objects: heritage
    },
    archaeology: {
      status: archaeologyResult.status === 'fulfilled' ? 'connected' : 'not-connected',
      objects: archaeology
    },
    assertions: [
      {
        id: 'rce-object-count',
        type: 'source_fact',
        statement: `RCE leverde ${heritage.features.length} beschermde erfgoedobjecten binnen het geselecteerde gebied.`,
        sourceIds: ['source-rce']
      },
      {
        id: 'bag-building-count',
        type: 'source_fact',
        statement:
          buildingCount === 1
            ? 'PDOK leverde 1 BAG-pand binnen het geselecteerde gebied.'
            : `PDOK leverde ${buildingCount} BAG-panden binnen het geselecteerde gebied.`,
        sourceIds: ['source-pdok-bag']
      },
      {
        id: 'history-source-available',
        type: 'source_fact',
        statement:
          historical.itemCount === null
            ? 'De Watertijdreis IIIF-bron is gekoppeld.'
            : `De Watertijdreis IIIF-collectie is gekoppeld en bevat ${historical.itemCount} items.`,
        sourceIds: ['source-watertijdreis']
      },
      {
        id: 'history-location-coverage',
        type: 'observation',
        statement:
          historical.maps.length === 1
            ? 'Eén historische Waterstaatskaart dekt de gekozen locatie af.'
            : `${historical.maps.length} historische Waterstaatskaarten dekken de gekozen locatie af.`,
        sourceIds: historical.maps.map((map) => `source-watertijdreis-${map.id}`),
        confidence: 1
      }
    ],
    provenance,
    warnings
  };
}
