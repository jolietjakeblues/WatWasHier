import type { Geometry, Position } from 'geojson';

// Approximatieformule Rijksdriehoeksstelsel (EPSG:28992) -> WGS84, precisie ~0.25m voor het
// vasteland van Nederland. Coëfficiënten van de gepubliceerde Kadaster-transformatieformule
// (Bruggeman e.a.), origineel bij Amersfoort (155000, 463000).
const LAT_COEFFICIENTS: [number, number, number][] = [
  [0, 1, 3235.65389], [2, 0, -32.58297], [0, 2, -0.24750], [2, 1, -0.84978],
  [0, 3, -0.06550], [2, 2, -0.01709], [1, 0, -0.00738], [4, 0, 0.00530],
  [2, 3, -0.00039], [4, 1, 0.00033], [1, 1, -0.00012]
];
const LON_COEFFICIENTS: [number, number, number][] = [
  [1, 0, 5260.52916], [1, 1, 105.94684], [1, 2, 2.45656], [3, 0, -0.81885],
  [1, 3, 0.05594], [3, 1, -0.05607], [0, 1, 0.01199], [3, 2, -0.00256],
  [1, 4, 0.00128], [0, 2, 0.00022], [2, 0, -0.00022], [5, 0, 0.00026]
];
const LAT_0 = 52.15517440;
const LON_0 = 5.38720621;

export function rdToWgs84(x: number, y: number): Position {
  const dx = (x - 155000) / 100000;
  const dy = (y - 463000) / 100000;
  let lat = LAT_0;
  for (const [p, q, c] of LAT_COEFFICIENTS) lat += (c * dx ** p * dy ** q) / 3600;
  let lon = LON_0;
  for (const [p, q, c] of LON_COEFFICIENTS) lon += (c * dx ** p * dy ** q) / 3600;
  return [lon, lat];
}

function convertPositions(value: unknown): unknown {
  if (Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number') {
    return rdToWgs84(value[0], value[1]);
  }
  if (Array.isArray(value)) return value.map(convertPositions);
  return value;
}

export function convertGeometryRdToWgs84(geometry: Geometry): Geometry {
  if (geometry.type === 'GeometryCollection') {
    return { ...geometry, geometries: geometry.geometries.map(convertGeometryRdToWgs84) };
  }
  return { ...geometry, coordinates: convertPositions(geometry.coordinates) } as Geometry;
}
