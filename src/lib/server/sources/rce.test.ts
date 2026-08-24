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
});