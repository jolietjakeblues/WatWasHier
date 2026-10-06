import { describe, expect, it } from 'vitest';
import { parsePercelenFeatures } from './kadaster-percelen';

const polygon = { type: 'Polygon' as const, coordinates: [[[6.06, 52.49], [6.07, 52.49], [6.07, 52.50], [6.06, 52.49]]] };

describe('kadaster-percelen', () => {
  it('parseert kadastrale gemeente, sectie, perceelnummer, oppervlakte en geometrie', () => {
    const result = parsePercelenFeatures([
      {
        geometry: polygon,
        properties: { identificatie_lokaal_id: '69590348470000', kadastrale_gemeente_waarde: 'Zwolle', sectie: 'K', perceelnummer: 3484, kadastrale_grootte_waarde: 17 }
      }
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: '69590348470000', gemeente: 'Zwolle', sectie: 'K', perceelnummer: '3484', areaSquareMeters: 17 });
    expect(result[0].geometry.type).toBe('Polygon');
  });

  it('slaat records zonder identificatie, sectie, nummer of geometrie over, en dedupliceert op id', () => {
    const complete = { identificatie_lokaal_id: '4', kadastrale_gemeente_waarde: 'Zwolle', sectie: 'A', perceelnummer: 3 };
    const result = parsePercelenFeatures([
      { geometry: polygon, properties: { kadastrale_gemeente_waarde: 'Zwolle', sectie: 'A', perceelnummer: 1 } },
      { geometry: polygon, properties: { identificatie_lokaal_id: '2', kadastrale_gemeente_waarde: 'Zwolle', perceelnummer: 1 } },
      { properties: complete },
      { geometry: null, properties: complete },
      { geometry: polygon, properties: complete },
      { geometry: polygon, properties: complete }
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: '4', sectie: 'A', perceelnummer: '3' });
  });

  it('valt terug op null oppervlakte wanneer die ontbreekt', () => {
    const result = parsePercelenFeatures([
      { geometry: polygon, properties: { identificatie_lokaal_id: '1', kadastrale_gemeente_waarde: 'Zwolle', sectie: 'A', perceelnummer: 1 } }
    ]);
    expect(result[0].areaSquareMeters).toBeNull();
  });
});
