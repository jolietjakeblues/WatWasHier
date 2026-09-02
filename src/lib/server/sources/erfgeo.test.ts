import { describe, expect, it } from 'vitest';
import { parseErfGeoNames, parseMunicipalityHistory } from './erfgeo';

describe('ErfGeo-namen', () => {
  it('laat de huidige naam weg en markeert alternatieven als mogelijke koppeling', () => {
    const result = parseErfGeoNames([
      { place: { value: 'https://example.test/zwolle' }, label: { value: 'Zwolle' } },
      { place: { value: 'https://example.test/zwolle' }, label: { value: 'Swole' }, graph: { value: 'plaatsen' } }
    ], 'Zwolle');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ label: 'Swole', confidence: 0.65, matchMethod: 'place-label' });
  });
});

describe('gemeentegeschiedenis', () => {
  it('parseert grensperiodes met geometrie en sorteert op beginjaar', () => {
    const result = parseMunicipalityHistory([
      {
        place: { value: 'https://example.test/zwolle-1968' },
        begin: { value: '1968' },
        wkt: { value: 'MultiPolygon(((6.03 52.50, 6.04 52.50, 6.04 52.51, 6.03 52.50)))' }
      },
      {
        place: { value: 'https://example.test/zwolle-1812' },
        begin: { value: '1812' }, end: { value: '1967' },
        wkt: { value: 'MultiPolygon(((6.09 52.54, 6.10 52.54, 6.10 52.53, 6.09 52.54)))' }
      }
    ], 'Zwolle');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ label: 'Zwolle (1812–1967)', startYear: 1812, endYear: 1967 });
    expect(result[0].geometry.type).toBe('MultiPolygon');
    expect(result[1]).toMatchObject({ label: 'Zwolle (1968–heden)', startYear: 1968, endYear: null });
  });

  it('slaat records zonder (geldige) geometrie over', () => {
    const result = parseMunicipalityHistory([
      { place: { value: 'https://example.test/zonder-geometrie' }, begin: { value: '1900' } },
      { place: { value: 'https://example.test/kapotte-wkt' }, begin: { value: '1900' }, wkt: { value: 'LINESTRING(0 0, 1 1)' } }
    ], 'Nergenshuizen');
    expect(result).toHaveLength(0);
  });
});
