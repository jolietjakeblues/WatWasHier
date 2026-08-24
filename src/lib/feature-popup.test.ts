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

  it('plaatst foto vóór ErfGeo en monumentvelden', () => {
    const html = rcePopup({}, {
      monumentNumber: '41894', choNumber: null, registeredAt: null, address: null,
      bagObjectUrl: null, resourceUrl: null, description: null, originalFunction: null,
      legalStatus: null,
      images: [{ uri: 'foto', title: null, description: null, thumbnailUrl: 'https://example.test/foto.jpg', sourceUrl: null, licenseUrl: null, graph: 'graph' }],
      historicalNames: [{ uri: 'https://example.test/zwolle', label: 'Zwolle', source: null, startYear: 1812, endYear: 1967, matchMethod: 'place-label', confidence: 0.65 }]
    });

    expect(html.indexOf('feature-card__image')).toBeLessThan(html.indexOf('ErfGeo-plaatsbeschrijvingen'));
    expect(html.indexOf('ErfGeo-plaatsbeschrijvingen')).toBeLessThan(html.indexOf('RCE-identificatie'));
  });
  it('meldt duidelijk wanneer de RCE geen foto levert', () => {
    const html = rcePopup({}, {
      monumentNumber: '1', choNumber: null, registeredAt: null, address: null,
      bagObjectUrl: null, resourceUrl: null, description: null, originalFunction: null,
      legalStatus: null, images: [], historicalNames: []
    });

    expect(html).toContain('Geen RCE-foto beschikbaar');
  });

  it('klapt een lange lijst ErfGeo-perioden in', () => {
    const periods = Array.from({ length: 6 }, (_, index) => ({
      uri: 'https://example.test/' + index, label: 'Veere', source: null,
      startYear: 1800 + index, endYear: 1801 + index,
      matchMethod: 'place-label' as const, confidence: 0.65
    }));
    const html = rcePopup({}, {
      monumentNumber: '1', choNumber: null, registeredAt: null, address: null,
      bagObjectUrl: null, resourceUrl: null, description: null, originalFunction: null,
      legalStatus: null, images: [], historicalNames: periods
    });

    expect(html).toContain('Toon nog 2 perioden');
  });
  it('groepeert archeologische details per type', () => {
    const html = archaeologyPopup({ archaeologyType: 'Vondstlocatie' }, { anchorUri: 'x', groups: [{ type: 'Vondsten', count: 2 }], relations: [] });
    expect(html).toContain('Vondsten: <strong>2</strong>');
  });
});
