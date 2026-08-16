import { json } from '@sveltejs/kit';
import { bboxAroundPoint } from '$lib/geo';
import { buildLandscapeContext } from '$lib/server/context';

export async function GET({ url }) {
  const lon = Number(url.searchParams.get('lon'));
  const lat = Number(url.searchParams.get('lat'));
  const radiusMeters = Math.min(
    Math.max(Number(url.searchParams.get('radius') ?? 250), 25),
    1000
  );

  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return json({ error: 'lon en lat zijn verplicht' }, { status: 400 });
  }

  if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
    return json({ error: 'Ongeldige coördinaten' }, { status: 400 });
  }

  const location = {
    lon,
    lat,
    radiusMeters,
    bbox: bboxAroundPoint(lon, lat, radiusMeters)
  };

  return json(await buildLandscapeContext(location));
}
