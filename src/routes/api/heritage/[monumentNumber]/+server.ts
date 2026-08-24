import { json } from '@sveltejs/kit';
import { getRceMonumentDetails } from '$lib/server/sources/rce';

export async function GET({ params, url }) {
  if (!/^\d+$/.test(params.monumentNumber)) return json({ error: 'Ongeldig monumentnummer' }, { status: 400 });
  try {
    const choNumber = url.searchParams.get('cho') ?? undefined;
    if (choNumber && !/^\d+$/.test(choNumber)) return json({ error: 'Ongeldig CHO-nummer' }, { status: 400 });
    const lon = Number(url.searchParams.get('lon'));
    const lat = Number(url.searchParams.get('lat'));
    const location = Number.isFinite(lon) && Number.isFinite(lat) ? { lon, lat } : undefined;
    return json(await getRceMonumentDetails(params.monumentNumber, choNumber, location));
  } catch (cause) {
    return json({ error: cause instanceof Error ? cause.message : String(cause) }, { status: 502 });
  }
}
