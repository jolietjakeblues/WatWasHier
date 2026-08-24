import { describe, expect, it } from 'vitest';
import { parseErfGeoNames } from './erfgeo';

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
