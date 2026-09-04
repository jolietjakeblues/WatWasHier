import type { Geometry, Position } from 'geojson';

function parseCoordinatePair(text: string): Position {
  return text.trim().split(/\s+/).slice(0, 2).map(Number) as Position;
}

/**
 * Parses a WKT coordinate group ("(1 2, 3 4)", "((1 2, 3 4), (5 6, 7 8))", ...) into nested
 * arrays whose nesting depth matches the paren depth, with leaf nodes as [lon, lat] pairs.
 * Used for POLYGON rings and MULTIPOLYGON polygons/rings alike, holes included.
 */
function parseGroup(text: string, cursor: { i: number }): unknown {
  if (text[cursor.i] !== '(') {
    const start = cursor.i;
    while (cursor.i < text.length && text[cursor.i] !== ',' && text[cursor.i] !== ')') cursor.i++;
    return parseCoordinatePair(text.slice(start, cursor.i));
  }
  cursor.i++;
  const items: unknown[] = [];
  while (true) {
    while (text[cursor.i] === ' ') cursor.i++;
    items.push(parseGroup(text, cursor));
    while (text[cursor.i] === ' ') cursor.i++;
    if (text[cursor.i] === ',') {
      cursor.i++;
      continue;
    }
    break;
  }
  while (text[cursor.i] === ' ') cursor.i++;
  cursor.i++;
  return items;
}

export function parseWkt(wkt: string): Geometry | null {
  const clean = wkt.replace(/^<[^>]+>\s*/, '').trim();
  const start = clean.indexOf('(');
  if (start === -1) return null;
  const body = clean.slice(start);
  if (/^POINT/i.test(clean)) {
    const coordinates = parseCoordinatePair(body.replace(/[()]/g, ''));
    return coordinates.every(Number.isFinite) ? { type: 'Point', coordinates } : null;
  }
  if (/^MULTIPOLYGON/i.test(clean)) {
    return { type: 'MultiPolygon', coordinates: parseGroup(body, { i: 0 }) as Position[][][] };
  }
  if (/^POLYGON/i.test(clean)) {
    return { type: 'Polygon', coordinates: parseGroup(body, { i: 0 }) as Position[][] };
  }
  if (/^MULTILINESTRING/i.test(clean)) {
    return { type: 'MultiLineString', coordinates: parseGroup(body, { i: 0 }) as Position[][] };
  }
  if (/^LINESTRING/i.test(clean)) {
    return { type: 'LineString', coordinates: parseGroup(body, { i: 0 }) as Position[] };
  }
  return null;
}
