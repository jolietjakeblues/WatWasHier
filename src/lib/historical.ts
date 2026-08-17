import type { HistoricalMap } from './domain';

export function chooseHistoricalMap(
  availableMaps: HistoricalMap[],
  previousMap?: HistoricalMap,
  referenceYear = 1976
): HistoricalMap | null {
  if (previousMap) {
    const sameEdition = availableMaps.find(
      (map) => map.yearEnd === previousMap.yearEnd && map.edition === previousMap.edition
    );
    if (sameEdition) return sameEdition;
  }

  return [...availableMaps].sort((a, b) =>
    Math.abs(a.yearEnd - referenceYear) - Math.abs(b.yearEnd - referenceYear) ||
    b.edition - a.edition
  )[0] ?? null;
}
