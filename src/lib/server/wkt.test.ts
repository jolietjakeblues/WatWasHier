import { describe, expect, it } from 'vitest';
import { parseWkt } from './wkt';

describe('parseWkt', () => {
  it('parseert een POINT', () => {
    expect(parseWkt('POINT (6.1 52.5)')).toEqual({ type: 'Point', coordinates: [6.1, 52.5] });
  });

  it('parseert een POLYGON zonder gat', () => {
    const wkt = 'POLYGON((6.1 52.5, 6.2 52.5, 6.2 52.6, 6.1 52.5))';
    expect(parseWkt(wkt)).toEqual({
      type: 'Polygon',
      coordinates: [[[6.1, 52.5], [6.2, 52.5], [6.2, 52.6], [6.1, 52.5]]]
    });
  });

  it('parseert een POLYGON met een gat', () => {
    const wkt = 'POLYGON((0 0, 10 0, 10 10, 0 0), (2 2, 4 2, 4 4, 2 2))';
    const geometry = parseWkt(wkt);
    expect(geometry?.type).toBe('Polygon');
    expect((geometry as { coordinates: number[][][] }).coordinates).toHaveLength(2);
  });

  it('parseert een MULTIPOLYGON met één polygoon', () => {
    const wkt = 'MultiPolygon (((6.09 52.54, 6.10 52.54, 6.10 52.53, 6.09 52.54)))';
    expect(parseWkt(wkt)).toEqual({
      type: 'MultiPolygon',
      coordinates: [[[[6.09, 52.54], [6.10, 52.54], [6.10, 52.53], [6.09, 52.54]]]]
    });
  });

  it('parseert een MULTIPOLYGON met meerdere polygonen', () => {
    const wkt = 'MULTIPOLYGON(((0 0, 1 0, 1 1, 0 0)), ((5 5, 6 5, 6 6, 5 5)))';
    const geometry = parseWkt(wkt);
    expect(geometry?.type).toBe('MultiPolygon');
    expect((geometry as { coordinates: number[][][][] }).coordinates).toHaveLength(2);
  });

  it('parseert een LINESTRING', () => {
    expect(parseWkt('LINESTRING(6.1 52.5, 6.2 52.6)')).toEqual({
      type: 'LineString',
      coordinates: [[6.1, 52.5], [6.2, 52.6]]
    });
  });

  it('parseert een MULTILINESTRING met meerdere lijnen', () => {
    const wkt = 'MULTILINESTRING((0 0, 1 1), (5 5, 6 6, 7 7))';
    expect(parseWkt(wkt)).toEqual({
      type: 'MultiLineString',
      coordinates: [[[0, 0], [1, 1]], [[5, 5], [6, 6], [7, 7]]]
    });
  });

  it('geeft null terug voor onbekende geometrietypes', () => {
    expect(parseWkt('TRIANGLE(0 0, 1 1, 2 2)')).toBeNull();
  });
});
