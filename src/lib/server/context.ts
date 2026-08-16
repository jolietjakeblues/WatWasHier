import type { LandscapeContext, LocationSelection, Provenance } from '$lib/domain';
import { getBagBuildings } from './sources/pdok';
import { getWatertijdreisCollectionSummary } from './sources/watertijdreis';

const now = () => new Date().toISOString();

export async function buildLandscapeContext(
  location: LocationSelection
): Promise<LandscapeContext> {
  const warnings: string[] = [];

  const [buildingsResult, historyResult] = await Promise.allSettled([
    getBagBuildings(location.bbox),
    getWatertijdreisCollectionSummary()
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
          url: 'https://tu-delft-heritage.github.io/watertijdreis-data/collection.json'
        };

  if (historyResult.status === 'rejected') {
    warnings.push(`Watertijdreis: ${String(historyResult.reason)}`);
  }

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
      id: 'source-watertijdreis',
      source: 'watertijdreis',
      title: historical.title ?? 'Watertijdreis IIIF Collection',
      url: historical.url,
      retrievedAt: now()
    }
  ];

  const buildingCount = buildings.features.length;

  return {
    location,
    current: { buildings },
    historical: {
      collectionTitle: historical.title,
      collectionUrl: historical.url,
      itemCount: historical.itemCount
    },
    heritage: {
      status: 'not-connected',
      objects: []
    },
    assertions: [
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
      }
    ],
    provenance,
    warnings
  };
}
