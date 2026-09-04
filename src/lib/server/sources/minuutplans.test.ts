import { describe, expect, it } from 'vitest';
import { parseMinuutplanSheets } from './minuutplans';

const geometry = { type: 'MultiPolygon' as const, coordinates: [[[[6.05, 52.49], [6.06, 52.49], [6.06, 52.50], [6.05, 52.49]]]] };

describe('kadastrale minuutplans', () => {
  it('parseert bladen en behoudt de kenmerken', () => {
    const sheets = parseMinuutplanSheets([
      {
        geometry,
        properties: {
          CODE: 'MIN04062M01', PROVINCIE: 'Overijssel', GEMEENTE: 'Zwollekerspel',
          SECTIE: 'M', BLAD: '01', UUID: 'a7557ad0-94d7-11e5-9dc9-4b806a94e0c1',
          URL: 'http://beeldbank.cultureelerfgoed.nl/rce-mediabank/detail/a7557ad0-94d7-11e5-9dc9-4b806a94e0c1'
        }
      }
    ]);
    expect(sheets).toEqual([{
      id: 'MIN04062M01', code: 'MIN04062M01', province: 'Overijssel', municipality: 'Zwollekerspel',
      section: 'M', sheet: '01', detailUrl: 'http://beeldbank.cultureelerfgoed.nl/rce-mediabank/detail/a7557ad0-94d7-11e5-9dc9-4b806a94e0c1',
      geometry
    }]);
  });

  it('slaat records zonder code of geometrie over en dedupliceert op code', () => {
    const sheets = parseMinuutplanSheets([
      { geometry, properties: { CODE: 'MIN01' } },
      { geometry, properties: { CODE: 'MIN01' } },
      { geometry, properties: {} },
      { properties: { CODE: 'MIN02' } }
    ]);
    expect(sheets.map((sheet) => sheet.code)).toEqual(['MIN01']);
  });
});
