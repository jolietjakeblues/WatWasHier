import { describe, expect, it } from 'vitest';
import { parseCommonsImageInfo, parseWikidataImageFilename } from './wikidata-images';

describe('parseWikidataImageFilename', () => {
  it('haalt de bestandsnaam en label uit een Special:FilePath-URL', () => {
    const result = parseWikidataImageFilename([
      { image: { value: 'http://commons.wikimedia.org/wiki/Special:FilePath/RM9101%20Bergen%20op%20Zoom.jpg' }, itemLabel: { value: 'Huis met lijstgevel' } }
    ]);
    expect(result).toEqual({ filename: 'RM9101 Bergen op Zoom.jpg', label: 'Huis met lijstgevel' });
  });

  it('geeft null zonder resultaten of een onherkenbare URL', () => {
    expect(parseWikidataImageFilename([])).toBeNull();
    expect(parseWikidataImageFilename([{ image: { value: 'https://example.test/niet-commons.jpg' } }])).toBeNull();
  });
});

describe('parseCommonsImageInfo', () => {
  it('bouwt een HeritageImage met attributie uit de extmetadata', () => {
    const result = parseCommonsImageInfo({
      url: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/foto.jpg',
      thumburl: 'https://thumb.wikimedia.org/.../500px-foto.jpg',
      extmetadata: {
        Artist: { value: '<a href="...">Michiel1972</a>' },
        LicenseShortName: { value: 'CC BY-SA 3.0' },
        LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/3.0' }
      }
    }, 'foto.jpg', 'Huis met lijstgevel');
    expect(result).toMatchObject({
      uri: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/foto.jpg',
      thumbnailUrl: 'https://thumb.wikimedia.org/.../500px-foto.jpg',
      title: 'Huis met lijstgevel',
      description: 'Foto: Michiel1972 · CC BY-SA 3.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:foto.jpg',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
      graph: 'Wikimedia Commons'
    });
  });

  it('valt terug op "Wikimedia Commons" als beschrijving zonder maker of licentie', () => {
    const result = parseCommonsImageInfo({ url: 'https://example.test/foto.jpg' }, 'foto.jpg', null);
    expect(result?.description).toBe('Wikimedia Commons');
  });

  it('geeft null zonder url', () => {
    expect(parseCommonsImageInfo(undefined, 'foto.jpg', null)).toBeNull();
    expect(parseCommonsImageInfo({}, 'foto.jpg', null)).toBeNull();
  });
});
