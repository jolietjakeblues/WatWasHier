import { describe, expect, it } from 'vitest';
import { deduplicateHeritageFeatures } from './rce';

describe('RCE-erfgoedfeatures', () => {
  it('telt hetzelfde monumentregisterobject maar één keer', () => {
    const feature = (localid: string) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [5.84, 50.89] },
      properties: {
        localid,
        namespace: 'nlps-rijksmonumenten',
        ci_citation: 'https://monumentenregister.cultureelerfgoed.nl/monumenten/341016'
      }
    });

    expect(deduplicateHeritageFeatures([feature('27131.00'), feature('27131.01')])).toHaveLength(1);
  });

  it('bewaart verschillende monumentnummers', () => {
    const features = ['30863', '30864'].map((number) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [5.84, 50.89] },
      properties: { ci_citation: `https://monumentenregister.cultureelerfgoed.nl/monumenten/${number}` }
    }));

    expect(deduplicateHeritageFeatures(features)).toHaveLength(2);
  });

  it('gebruikt voor een beschermd gezicht de polygoon indien beschikbaar, anders het punt', () => {
    const properties = {
      heritageType: 'face',
      namespace: 'nlps-stadsendorpsgezichten',
      ci_citation: 'https://monumentenregister.cultureelerfgoed.nl/gezicht/zwolle'
    };
    const point = {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [6.09, 52.51] },
      properties
    };
    const polygon = {
      type: 'Feature' as const,
      geometry: { type: 'MultiPolygon' as const, coordinates: [[[[6.08, 52.50], [6.10, 52.50], [6.10, 52.52], [6.08, 52.50]]]] },
      properties
    };

    expect(deduplicateHeritageFeatures([point, polygon])).toEqual([polygon]);
    expect(deduplicateHeritageFeatures([point])).toEqual([point]);
  });
});
