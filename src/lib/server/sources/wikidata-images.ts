import type { HeritageImage } from '$lib/domain';
import { fetchSourceJson } from '$lib/server/source-fetch';

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'WatWasHier/0.4 (https://github.com/jolietjakeblues/WatWasHier)';

interface WikidataBinding {
  image?: { value?: string };
  itemLabel?: { value?: string };
}

export function parseWikidataImageFilename(bindings: WikidataBinding[]): { filename: string; label: string | null } | null {
  const imageUrl = bindings[0]?.image?.value;
  if (!imageUrl) return null;
  const match = imageUrl.match(/Special:FilePath\/(.+)$/);
  if (!match) return null;
  return { filename: decodeURIComponent(match[1]), label: bindings[0]?.itemLabel?.value ?? null };
}

interface CommonsImageInfo {
  url?: string;
  thumburl?: string;
  extmetadata?: Record<string, { value?: string }>;
}

export function parseCommonsImageInfo(info: CommonsImageInfo | undefined, filename: string, label: string | null): HeritageImage | null {
  if (!info?.url) return null;
  const meta = info.extmetadata ?? {};
  const artist = meta.Artist?.value?.replace(/<[^>]+>/g, '').trim() || null;
  const license = meta.LicenseShortName?.value || null;
  return {
    uri: info.url,
    title: label,
    description: [artist ? `Foto: ${artist}` : null, license].filter(Boolean).join(' · ') || 'Wikimedia Commons',
    thumbnailUrl: info.thumburl ?? info.url,
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${filename.replaceAll(' ', '_')}`,
    licenseUrl: meta.LicenseUrl?.value ?? null,
    graph: 'Wikimedia Commons'
  };
}

// Fallback voor wanneer de RCE zelf geen Beeldbank-foto heeft voor een rijksmonument. Wikidata
// koppelt rijksmonumentnummers (P359) aan een item dat vaak een vrij-licentie-afbeelding (P18)
// heeft; de licentie/maker-metadata daarvan komt niet uit Wikidata zelf maar uit de Commons
// imageinfo-API, die nette machineleesbare attributie levert (Artist, LicenseShortName, LicenseUrl).
export async function getWikidataMonumentImage(monumentNumber: string): Promise<HeritageImage | null> {
  if (!/^\d+$/.test(monumentNumber)) return null;
  const query = `SELECT ?image ?itemLabel WHERE {
  ?item wdt:P359 "${monumentNumber}" .
  ?item wdt:P18 ?image .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "nl". }
} LIMIT 1`;
  const url = new URL(WIKIDATA_ENDPOINT);
  url.searchParams.set('query', query);
  const result = await fetchSourceJson<{ results?: { bindings?: WikidataBinding[] } }>(url, {
    source: 'Wikidata',
    headers: { accept: 'application/sparql-results+json', 'user-agent': USER_AGENT }
  });
  const found = parseWikidataImageFilename(result.results?.bindings ?? []);
  if (!found) return null;

  const commonsUrl = new URL(COMMONS_API);
  commonsUrl.searchParams.set('action', 'query');
  commonsUrl.searchParams.set('titles', `File:${found.filename}`);
  commonsUrl.searchParams.set('prop', 'imageinfo');
  commonsUrl.searchParams.set('iiprop', 'url|extmetadata');
  commonsUrl.searchParams.set('iiurlwidth', '500');
  commonsUrl.searchParams.set('format', 'json');
  const commonsResult = await fetchSourceJson<{ query?: { pages?: Record<string, { imageinfo?: CommonsImageInfo[] }> } }>(commonsUrl, {
    source: 'Wikimedia Commons',
    headers: { accept: 'application/json', 'user-agent': USER_AGENT }
  });
  const page = Object.values(commonsResult.query?.pages ?? {})[0];
  return parseCommonsImageInfo(page?.imageinfo?.[0], found.filename, found.label);
}
