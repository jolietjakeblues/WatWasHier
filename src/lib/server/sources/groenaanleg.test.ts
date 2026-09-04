import { describe, expect, it } from 'vitest';
import { parseGroenaanlegBindings } from './groenaanleg';

describe('groenaanleg', () => {
  it('parseert naam, categorie, oppervlakte en geometrie', () => {
    const result = parseGroenaanlegBindings([
      {
        s: { value: 'https://example.test/groenaanleg/1' },
        naam: { value: 'Het Engelse Werk' },
        wkt: { value: 'POLYGON((6.06 52.49,6.07 52.49,6.07 52.50,6.06 52.49))' },
        area: { value: '209400.59' },
        categorieLabel: { value: 'stadsparken en plantsoenen' }
      }
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ label: 'Het Engelse Werk', category: 'stadsparken en plantsoenen', areaSquareMeters: 209400.59 });
    expect(result[0].geometry.type).toBe('Polygon');
  });

  it('slaat records zonder naam of geldige geometrie over, en dedupliceert op URI', () => {
    const result = parseGroenaanlegBindings([
      { s: { value: 'https://example.test/groenaanleg/2' }, wkt: { value: 'POLYGON((6.06 52.49,6.07 52.49,6.07 52.50,6.06 52.49))' } },
      { s: { value: 'https://example.test/groenaanleg/3' }, naam: { value: 'Zonder geometrie' } },
      { s: { value: 'https://example.test/groenaanleg/4' }, naam: { value: 'Dubbel' }, wkt: { value: 'POLYGON((6.06 52.49,6.07 52.49,6.07 52.50,6.06 52.49))' } },
      { s: { value: 'https://example.test/groenaanleg/4' }, naam: { value: 'Dubbel' }, wkt: { value: 'POLYGON((6.06 52.49,6.07 52.49,6.07 52.50,6.06 52.49))' } }
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ label: 'Dubbel', category: null, areaSquareMeters: null });
  });
});
