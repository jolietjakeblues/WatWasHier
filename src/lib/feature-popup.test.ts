import { describe, expect, it } from 'vitest';
import { archaeologyPopup, bagPopup, escapeHtml, rcePopup } from './feature-popup';

describe('feature popups', () => {
  it('escapet bronwaarden voordat ze als HTML worden getoond', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('toont BAG-details compact', () => {
    expect(bagPopup({ identificatie: '123', bouwjaar: 1930 })).toContain('Bouwjaar');
  });

  it('toont een monumentregister-link voor RCE', () => {
    expect(rcePopup({ ci_citation: 'https://example.test/monument' })).toContain('Open monumentregister');
  });

  it('plaatst ErfGeo vóór foto en monumentvelden', () => {
    const html = rcePopup({}, {
      monumentNumber: '41894', choNumber: null, registeredAt: null, address: null,
      bagObjectUrl: null, resourceUrl: null, description: null, originalFunction: null,
      legalStatus: null,
      images: [{ uri: 'foto', title: null, description: null, thumbnailUrl: 'https://example.test/foto.jpg', sourceUrl: null, licenseUrl: null, graph: 'graph' }],
      historicalNames: [{ uri: 'https://example.test/zwolle', label: 'Zwolle', source: null, startYear: 1812, endYear: 1967, matchMethod: 'place-label', confidence: 0.65 }]
    });

    expect(html.indexOf('ErfGeo-plaatsbeschrijvingen')).toBeLessThan(html.indexOf('feature-card__image'));
    expect(html.indexOf('ErfGeo-plaatsbeschrijvingen')).toBeLessThan(html.indexOf('RCE-identificatie'));
  });
  it('groepeert archeologische details per type', () => {
    const html = archaeologyPopup({ archaeologyType: 'Vondstlocatie' }, { anchorUri: 'x', groups: [{ type: 'Vondsten', count: 2 }], relations: [] });
    expect(html).toContain('Vondsten: <strong>2</strong>');
  });
});
