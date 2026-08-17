import { json } from '@sveltejs/kit';
import { getRceMonumentDetails } from '$lib/server/sources/rce';

export async function GET({ params, url }) {
  if (!/^\d+$/.test(params.monumentNumber)) return json({ error: 'Ongeldig monumentnummer' }, { status: 400 });
  try {
    const choNumber = url.searchParams.get('cho') ?? undefined;
    if (choNumber && !/^\d+$/.test(choNumber)) return json({ error: 'Ongeldig CHO-nummer' }, { status: 400 });
    return json(await getRceMonumentDetails(params.monumentNumber, choNumber));
  } catch (cause) {
    return json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 502 });
  }
}
