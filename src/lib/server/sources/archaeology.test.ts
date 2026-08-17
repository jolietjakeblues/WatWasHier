import { describe, expect, it } from 'vitest';
import { normalizeArchaeologyRelations } from './archaeology';

describe('archeologische relaties', () => {
  it('verwijdert dubbele records op richting en CHO-URI', () => {
    const row = { direction: { value: 'contains' }, object: { value: 'https://example.test/cho/1' }, class: { value: 'https://linkeddata.cultureelerfgoed.nl/def/ceo#Vondsten' } };
    expect(normalizeArchaeologyRelations([row, row])).toHaveLength(1);
  });

  it('bewaart dezelfde URI wanneer de relatierichting verschilt', () => {
    const base = { object: { value: 'https://example.test/cho/1' }, class: { value: 'https://linkeddata.cultureelerfgoed.nl/def/ceo#Vondstlocatie' } };
    expect(normalizeArchaeologyRelations([{ ...base, direction: { value: 'contains' } }, { ...base, direction: { value: 'part-of' } }])).toHaveLength(2);
  });
});
