import { describe, expect, it } from 'vitest';
import { actionForMapClick, buildingIdFromFeature } from './map-interaction';

describe('map interaction', () => {
  it('selecteert een BAG-pand en start geen locatieselectie', () => {
    expect(actionForMapClick([{ id: 9, properties: { identificatie: 'BAG-123' } }], 6.1, 52.5))
      .toEqual({ type: 'select-building', buildingId: 'BAG-123' });
  });

  it('selecteert alleen een locatie als geen pand geraakt is', () => {
    expect(actionForMapClick([], 6.1, 52.5)).toEqual({ type: 'select-location', lon: 6.1, lat: 52.5 });
  });

  it('gebruikt het feature-id als identificatie ontbreekt', () => {
    expect(buildingIdFromFeature({ id: 42, properties: {} })).toBe('42');
  });
});
