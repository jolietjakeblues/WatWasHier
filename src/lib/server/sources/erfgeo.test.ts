import { describe, expect, it } from 'vitest';
import { parseErfGeoNames, parseWktArea } from './erfgeo';

describe('ErfGeo-namen', () => {
  it('laat de huidige naam weg en markeert alternatieven als mogelijke koppeling', () => {
    const result = parseErfGeoNames([
      { place: { value: 'https://example.test/zwolle' }, label: { value: 'Zwolle' } },
      { place: { value: 'https://example.test/zwolle' }, label: { value: 'Swole' }, graph: { value: 'plaatsen' } }
    ], 'Zwolle');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ label: 'Swole', confidence: 0.65, matchMethod: 'place-label', geometry: null });
  });

  it('leest Polygon en MultiPolygon uit Gemeentegeschiedenis', () => {
    expect(parseWktArea('POLYGON ((6 52, 7 52, 6 52))')).toEqual({ type: 'Polygon', coordinates: [[[6, 52], [7, 52], [6, 52]]] });
    expect(parseWktArea('MultiPolygon (((6 52, 7 52, 6 52))))')).toEqual({ type: 'MultiPolygon', coordinates: [[[[6, 52], [7, 52], [6, 52]]]] });
  });
});
