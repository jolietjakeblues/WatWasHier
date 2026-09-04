import { describe, expect, it } from 'vitest';
import { archaeologyPopup, bagPopup, defenceLinePopup, disappearedVillagePopup, escapeHtml, minuutplanPopup, municipalityHistoryPopup, perceelPopup, rcePopup, toponymPopup } from './feature-popup';

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
      historicalNames: [{ uri: 'https://example.test/geleen', label: 'Geleen', source: 'https://example.test/graph/gemeentegeschiedenis', startYear: 1850, endYear: 1965, matchMethod: 'place-label', confidence: 0.65 }]
    });

    expect(html.indexOf('RCE-identificatie')).toBeLessThan(html.indexOf('<h4>Beschrijving</h4>'));
    expect(html).toContain('Lees volledige beschrijving');
    expect(html.indexOf('<h4>Beschrijving</h4>')).toBeLessThan(html.indexOf('Plaatscontext: Geleen'));
  });
  it('meldt duidelijk wanneer de RCE geen foto levert', () => {
    expect(rcePopup({}, emptyDetails)).toContain('Geen RCE-foto beschikbaar');
  });

  it('labelt een Wikimedia Commons-foto anders dan een RCE-foto', () => {
    const html = rcePopup({}, {
      ...emptyDetails,
      images: [{ uri: 'foto', title: null, description: 'Foto: Michiel1972 · CC BY-SA 3.0', thumbnailUrl: 'https://example.test/foto.jpg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:foto.jpg', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', graph: 'Wikimedia Commons' }]
    });
    expect(html).toContain('Bekijk op Wikimedia Commons');
    expect(html).not.toContain('Open foto bij de RCE');
  });

  it('toont de waarde (naam en periode) van elk ErfGeo-record, niet de brongraaf', () => {
    const records = [
      { uri: 'https://example.test/a', label: 'Veere', source: 'https://example.test/graph/gemeentegeschiedenis', startYear: 1812, endYear: 1966, matchMethod: 'place-label' as const, confidence: 0.65 },
      { uri: 'https://example.test/b', label: 'Veere', source: 'https://example.test/graph/atlasverstedelijking', startYear: 1812, endYear: 1966, matchMethod: 'place-label' as const, confidence: 0.65 },
      { uri: 'https://example.test/c', label: 'Veere', source: 'https://example.test/graph/gemeentegeschiedenis', startYear: 1967, endYear: null, matchMethod: 'place-label' as const, confidence: 0.65 }
    ];
    const html = rcePopup({}, { ...emptyDetails, historicalNames: records });

    expect(html).toContain('Plaatscontext: Veere');
    expect(html).toContain('1812–1966');
    expect(html).toContain('1967–heden');
    expect(html).not.toContain('Gemeentegeschiedenis</a>');
    expect(html).not.toContain('ErfGeo-records');
    // dezelfde waarde uit twee grafen (gemeentegeschiedenis + atlasverstedelijking) telt maar één keer
    expect(html.split('1812–1966')).toHaveLength(2);
  });

  it('laat de plaatscontext weg wanneer er geen onderscheidende waarde is', () => {
    const records = [
      { uri: 'https://example.test/a', label: 'Veere', source: 'https://example.test/graph/plaatsen', startYear: null, endYear: null, matchMethod: 'place-label' as const, confidence: 0.65 }
    ];
    const html = rcePopup({}, { ...emptyDetails, historicalNames: records });
    expect(html).not.toContain('Plaatscontext');
  });

  it('groepeert archeologische details per type', () => {
    const html = archaeologyPopup({ archaeologyType: 'Vondstlocatie' }, { anchorUri: 'x', groups: [{ type: 'Vondsten', count: 2 }], relations: [] });
    expect(html).toContain('Vondsten: <strong>2</strong>');
  });

  it('toont het label van een gemeentegeschiedenisperiode', () => {
    const html = municipalityHistoryPopup({ label: 'Zwolle (1812–1967)', startYear: 1812, endYear: 1967 });
    expect(html).toContain('Zwolle (1812–1967)');
    expect(html).toContain('Gemeentegeschiedenis');
  });

  it('toont sectie, blad en een link naar de minuutplan-scan', () => {
    const html = minuutplanPopup({
      code: 'MIN04062M01', province: 'Overijssel', municipality: 'Zwollekerspel',
      section: 'M', sheet: '01', detailUrl: 'https://beeldbank.cultureelerfgoed.nl/rce-mediabank/detail/a7557ad0'
    });
    expect(html).toContain('Sectie M, blad 01');
    expect(html).toContain('Zwollekerspel');
    expect(html).toContain('Bekijk de kaart bij RCE');
  });

  it('toont naam en Kloeke-code van een historische plaatsnaam', () => {
    const html = toponymPopup({ label: 'Mastenbroek', kloekeCode: 'F094p' });
    expect(html).toContain('Mastenbroek');
    expect(html).toContain('F094p');
  });

  it('toont gemeente, sectie, perceelnummer en oppervlakte van een kadastraal perceel', () => {
    const html = perceelPopup({ gemeente: 'Zwolle', sectie: 'M', perceelnummer: '4370', areaSquareMeters: 293 });
    expect(html).toContain('Zwolle M 4370');
    expect(html).toContain('293 m²');
  });

  it('toont de oppervlakte van een groot perceel in hectare', () => {
    const html = perceelPopup({ gemeente: 'Zwolle', sectie: 'M', perceelnummer: '1', areaSquareMeters: 218230 });
    expect(html).toContain('21,82 ha');
  });

  it('toont naam, jaartal en bron van een verdwenen dorp', () => {
    const html = disappearedVillagePopup({ label: 'Westkerke', date: '1375', source: 'Bert Stulp, Verdwenen Dorpen, boek 5, blz. 152' });
    expect(html).toContain('Westkerke');
    expect(html).toContain('1375');
    expect(html).toContain('Bert Stulp, Verdwenen Dorpen, boek 5, blz. 152');
  });

  it('toont naam en periode van een historische linie', () => {
    const html = defenceLinePopup({ label: 'Kazematlinie Oldeneel-Haerst', period: 'WO2' });
    expect(html).toContain('Kazematlinie Oldeneel-Haerst');
    expect(html).toContain('WO2');
  });
});
