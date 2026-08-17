export function bboxAroundPoint(
  lon: number,
  lat: number,
  radiusMeters: number
): [number, number, number, number] {
  const latDegrees = radiusMeters / 111_320;
  const lonDegrees = radiusMeters / (111_320 * Math.cos((lat * Math.PI) / 180));

  return [
    lon - lonDegrees,
    lat - latDegrees,
    lon + lonDegrees,
    lat + latDegrees
  ];
}

export function pointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [x, y] = polygon[index];
    const [previousX, previousY] = polygon[previous];
    const crosses = y > point[1] !== previousY > point[1];
    const edgeX = ((previousX - x) * (point[1] - y)) / (previousY - y) + x;

    if (crosses && point[0] < edgeX) inside = !inside;
  }

  return inside;
}
