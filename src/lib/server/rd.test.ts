import { describe, expect, it } from 'vitest';
import { convertGeometryRdToWgs84, rdToWgs84 } from './rd';

describe('rdToWgs84', () => {
  it('geeft het RD-nulpunt (Amersfoort) terug als de bekende lon/lat', () => {
    const [lon, lat] = rdToWgs84(155000, 463000);
    expect(lon).toBeCloseTo(5.38720621, 5);
    expect(lat).toBeCloseTo(52.15517440, 5);
  });

  it('converteert een bekend punt (Zwolle) binnen submeter-precisie', () => {
    const [lon, lat] = rdToWgs84(201152.505, 501027.306);
    expect(lon).toBeCloseTo(6.0668, 4);
    expect(lat).toBeCloseTo(52.495, 4);
  });
});

describe('convertGeometryRdToWgs84', () => {
  it('converteert alle coördinaten van een LineString', () => {
    const result = convertGeometryRdToWgs84({ type: 'LineString', coordinates: [[155000, 463000], [201152.505, 501027.306]] });
    expect(result.type).toBe('LineString');
    const coords = (result as { coordinates: number[][] }).coordinates;
    expect(coords[0][0]).toBeCloseTo(5.38720621, 5);
    expect(coords[1][0]).toBeCloseTo(6.0668, 4);
  });

  it('converteert alle coördinaten van een MultiLineString', () => {
    const result = convertGeometryRdToWgs84({
      type: 'MultiLineString',
      coordinates: [[[155000, 463000]], [[201152.505, 501027.306]]]
    });
    const coords = (result as { coordinates: number[][][] }).coordinates;
    expect(coords).toHaveLength(2);
    expect(coords[0][0][0]).toBeCloseTo(5.38720621, 5);
  });
});
