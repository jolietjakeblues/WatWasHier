import { describe, expect, it } from 'vitest';
import type { HistoricalMap } from './domain';
import { chooseHistoricalMap } from './historical';

function map(id: string, yearEnd: number, edition: number): HistoricalMap {
  return {
    id,
    label: id,
    yearStart: yearEnd,
    yearEnd,
    edition,
    manifestUrl: null,
    annotationUrl: 'test',
    georeferencedMap: {}
  };
}

describe('chooseHistoricalMap', () => {
  it('behoudt jaar en editie bij een nieuwe locatie', () => {
    const previous = map('oude-kaart', 1883, 1);
    const available = [map('nieuw-blad-1883', 1883, 1), map('kaart-1990', 1990, 5)];
    expect(chooseHistoricalMap(available, previous)?.id).toBe('nieuw-blad-1883');
  });

  it('kiest de kaart die het dichtst bij het referentiejaar ligt', () => {
    const available = [map('kaart-1937', 1937, 3), map('kaart-1990', 1990, 5)];
    expect(chooseHistoricalMap(available, map('kaart-1883', 1883, 1), 1976)?.id).toBe('kaart-1990');
  });
});
