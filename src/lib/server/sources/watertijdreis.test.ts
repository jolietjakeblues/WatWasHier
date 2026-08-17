import { describe, expect, it } from 'vitest';
import { mapsCoveringPoint } from './watertijdreis';

describe('mapsCoveringPoint', () => {
  it('filtert op dekking en sorteert op jaar', () => {
    const makeMap = (id: string, yearEnd: number, west: number) => ({
      id,
      resource: { partOf: [{ id: `canvas-${id}`, partOf: [{ id: `manifest-${id}` }] }] },
      gcps: [
        { geo: [west, 52] as [number, number] },
        { geo: [west + 1, 52] as [number, number] },
        { geo: [west + 1, 53] as [number, number] },
        { geo: [west, 53] as [number, number] }
      ],
      _meta: { label: id, yearStart: yearEnd, yearEnd, edition: 1 }
    });

    const result = mapsCoveringPoint(
      [makeMap('later', 1965, 6), makeMap('eerder', 1877, 6), makeMap('elders', 1900, 3)],
      [6.1, 52.5],
      'annotation-index'
    );

    expect(result.map((map) => map.id)).toEqual(['eerder', 'later']);
    expect(result[0].manifestUrl).toBe('manifest-eerder');
  });
});
