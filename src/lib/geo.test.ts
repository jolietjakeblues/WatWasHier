import { describe, expect, it } from 'vitest';
import { bboxAroundPoint, pointInPolygon } from './geo';

describe('geo', () => {
  it('maakt een bbox rond het punt', () => {
    const bbox = bboxAroundPoint(6.094, 52.512, 250);
    expect(bbox[0]).toBeLessThan(6.094);
    expect(bbox[1]).toBeLessThan(52.512);
    expect(bbox[2]).toBeGreaterThan(6.094);
    expect(bbox[3]).toBeGreaterThan(52.512);
  });

  it('herkent of een punt binnen een kaartpolygoon ligt', () => {
    const polygon: [number, number][] = [[5, 52], [7, 52], [7, 53], [5, 53]];
    expect(pointInPolygon([6.094, 52.512], polygon)).toBe(true);
    expect(pointInPolygon([4, 52.512], polygon)).toBe(false);
  });
});
