import { env } from '$env/dynamic/private';

const DEFAULT_COLLECTION =
  'https://tu-delft-heritage.github.io/watertijdreis-data/collection.json';

interface IiifCollection {
  label?: Record<string, string[]>;
  items?: unknown[];
}

function labelValue(label?: Record<string, string[]>): string | null {
  if (!label) return null;
  return label.nl?.[0] ?? label.en?.[0] ?? Object.values(label)[0]?.[0] ?? null;
}

export async function getWatertijdreisCollectionSummary() {
  const url = env.WATERTIJDREIS_COLLECTION_URL || DEFAULT_COLLECTION;
  const response = await fetch(url, { headers: { accept: 'application/json' } });

  if (!response.ok) {
    throw new Error(`Watertijdreis IIIF collection antwoordde met ${response.status}`);
  }

  const collection = (await response.json()) as IiifCollection;

  return {
    title: labelValue(collection.label),
    itemCount: Array.isArray(collection.items) ? collection.items.length : null,
    url
  };
}
