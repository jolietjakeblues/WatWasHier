import { describe, expect, it } from 'vitest';
import { parsePercelenBindings } from './kadaster-percelen';

describe('kadaster-percelen', () => {
  it('parseert sectie, perceelnummer, oppervlakte en geometrie', () => {
    const result = parsePercelenBindings([
      {
        per: { value: 'https://data.kkg.kadaster.nl/id/perceel/1/1' },
        sectie: { value: 'M' },
        nummer: { value: '4370' },
        area: { value: '293' },
        wkt: { value: 'POLYGON((6.06 52.49,6.07 52.49,6.07 52.50,6.06 52.49))' }
      }
    ], 'Zwolle');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ gemeente: 'Zwolle', sectie: 'M', perceelnummer: '4370', areaSquareMeters: 293 });
    expect(result[0].geometry.type).toBe('Polygon');
  });

  it('slaat records zonder sectie, nummer of geldige geometrie over, en dedupliceert op URI', () => {
    const result = parsePercelenBindings([
      { per: { value: 'https://example.test/1' }, nummer: { value: '1' }, wkt: { value: 'POLYGON((6.06 52.49,6.07 52.49,6.07 52.50,6.06 52.49))' } },
      { per: { value: 'https://example.test/2' }, sectie: { value: 'A' }, wkt: { value: 'POLYGON((6.06 52.49,6.07 52.49,6.07 52.50,6.06 52.49))' } },
      { per: { value: 'https://example.test/3' }, sectie: { value: 'A' }, nummer: { value: '2' } },
      {
        per: { value: 'https://example.test/4' }, sectie: { value: 'A' }, nummer: { value: '3' },
        wkt: { value: 'POLYGON((6.06 52.49,6.07 52.49,6.07 52.50,6.06 52.49))' }
      },
      {
        per: { value: 'https://example.test/4' }, sectie: { value: 'A' }, nummer: { value: '3' },
        wkt: { value: 'POLYGON((6.06 52.49,6.07 52.49,6.07 52.50,6.06 52.49))' }
      }
    ], 'Zwolle');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ sectie: 'A', perceelnummer: '3' });
  });

  it('valt terug op null oppervlakte wanneer die veld ontbreekt', () => {
    const result = parsePercelenBindings([
      {
        per: { value: 'https://example.test/1' }, sectie: { value: 'A' }, nummer: { value: '1' },
        wkt: { value: 'POLYGON((6.06 52.49,6.07 52.49,6.07 52.50,6.06 52.49))' }
      }
    ], 'Zwolle');
    expect(result[0].areaSquareMeters).toBeNull();
  });
});
