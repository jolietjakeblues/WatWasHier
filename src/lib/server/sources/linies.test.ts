import { describe, expect, it } from 'vitest';
import { parseLiniesBindings } from './linies';

describe('linies', () => {
  it('parseert naam en periode, en converteert RD-coördinaten naar WGS84', () => {
    const result = parseLiniesBindings([
      { s: { value: 'https://example.test/linies/1' }, naam: { value: 'Kazematlinie Oldeneel-Haerst' }, wkt: { value: 'MULTILINESTRING((201152.505 501027.306, 201200 501100))' }, periodeLabel: { value: 'WO2' } }
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Kazematlinie Oldeneel-Haerst');
    expect(result[0].period).toBe('WO2');
    expect(result[0].geometry.type).toBe('MultiLineString');
    const coords = (result[0].geometry as { coordinates: number[][][] }).coordinates;
    expect(coords[0][0][0]).toBeCloseTo(6.0668, 3);
    expect(coords[0][0][1]).toBeCloseTo(52.495, 3);
  });

  it('slaat records zonder naam of geldige WKT over, en dedupliceert op URI', () => {
    const result = parseLiniesBindings([
      { s: { value: 'https://example.test/linies/2' }, wkt: { value: 'MULTILINESTRING((201152.505 501027.306, 201200 501100))' } },
      { s: { value: 'https://example.test/linies/3' }, naam: { value: 'Zonder geometrie' } },
      { s: { value: 'https://example.test/linies/4' }, naam: { value: 'Dubbel' }, wkt: { value: 'MULTILINESTRING((201152.505 501027.306, 201200 501100))' } },
      { s: { value: 'https://example.test/linies/4' }, naam: { value: 'Dubbel' }, wkt: { value: 'MULTILINESTRING((201152.505 501027.306, 201200 501100))' } }
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('Dubbel');
    expect(result[0].period).toBeNull();
  });
});
