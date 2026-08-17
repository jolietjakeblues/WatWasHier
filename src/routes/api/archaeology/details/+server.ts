import { json } from '@sveltejs/kit';
import { getArchaeologyDetails } from '$lib/server/sources/archaeology';

const RESOURCE_PREFIX = 'https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/';

export async function GET({ url }) {
  const uri = url.searchParams.get('uri') ?? '';
  if (!uri.startsWith(RESOURCE_PREFIX)) return json({ error: 'Ongeldige CHO-resource' }, { status: 400 });
  try {
    return json(await getArchaeologyDetails(uri));
  } catch (cause) {
    return json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 502 });
  }
}
