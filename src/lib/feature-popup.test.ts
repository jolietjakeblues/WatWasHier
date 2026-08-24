import { describe, expect, it } from 'vitest';
import { archaeologyPopup, bagPopup, escapeHtml, rcePopup } from './feature-popup';

const emptyDetails = {
  monumentNumber: '1', choNumber: null, registeredAt: null, address: null,
  bagObjectUrl: null, resourceUrl: null, description: null, originalFunction: null,
  legalStatus: null, images: [], historicalNames: []
};

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

  it('plaatst foto en monumentvelden vóór de ErfGeo-plaatscontext', () => {
    const html = rcePopup({}, {
      ...emptyDetails,
      images: [{ uri: 'foto', title: null, description: null, thumbnailUrl: 'https://example.test/foto.jpg', sourceUrl: null, licenseUrl: null, graph: 'graph' }],
      historicalNames: [{ uri: 'https://example.test/zwolle', label: 'Zwolle', source: 'https://example.test/graph/gemeentegeschiedenis', startYear: 1812, endYear: 1967, matchMethod: 'place-label', confidence: 0.65 }]
    });

    expect(html.indexOf('feature-card__image')).toBeLessThan(html.indexOf('RCE-identificatie'));
    expect(html.indexOf('RCE-identificatie')).toBeLessThan(html.indexOf('Plaatscontext: Zwolle'));
  });

  it('zet kerngegevens vóór een ingeklapte lange beschrijving en plaatscontext', () => {
    const description = 'Lange registerbeschrijving. '.repeat(30);
    const html = rcePopup({}, {
      ...emptyDetails,
      description,
      historicalNames: [{ uri: 'https://example.test/geleen', label: 'Geleen', source: 'https://example.test/graph/plaatsen', startYear: null, endYear: null, matchMethod: 'place-label', confidence: 0.65 }]
    });

    expect(html.indexOf('RCE-identificatie')).toBeLessThan(html.indexOf('<h4>Beschrijving</h4>'));
    expect(html).toContain('Lees volledige beschrijving');
    expect(html.indexOf('<h4>Beschrijving</h4>')).toBeLessThan(html.indexOf('Plaatscontext: Geleen'));
  });
  it('meldt duidelijk wanneer de RCE geen foto levert', () => {
    expect(rcePopup({}, emptyDetails)).toContain('Geen RCE-foto beschikbaar');
  });

  it('vat ErfGeo-records compact samen per bron', () => {
    const records = Array.from({ length: 6 }, (_, index) => ({
      uri: 'https://example.test/' + index, label: 'Veere',
      source: index < 4 ? 'https://example.test/graph/gemeentegeschiedenis' : 'https://example.test/graph/plaatsen',
      startYear: 1800 + index, endYear: 1801 + index,
      matchMethod: 'place-label' as const, confidence: 0.65
    }));
    const html = rcePopup({}, { ...emptyDetails, historicalNames: records });

    expect(html).toContain('Plaatscontext: Veere');
    expect(html).toContain('6 ErfGeo-records');
    expect(html).toContain('Gemeentegeschiedenis</a>: 4');
    expect(html).toContain('Plaatsen</a>: 2');
    expect(html).not.toContain('1800');
  });

  it('groepeert archeologische details per type', () => {
    const html = archaeologyPopup({ archaeologyType: 'Vondstlocatie' }, { anchorUri: 'x', groups: [{ type: 'Vondsten', count: 2 }], relations: [] });
    expect(html).toContain('Vondsten: <strong>2</strong>');
  });
});