import { expect, test, type Page } from '@playwright/test';
import type { LandscapeContext } from '../../src/lib/domain';
import type { Feature } from 'geojson';

const point = { lon: 6.0668, lat: 52.495 };

function georeferencedMap(id: string) {
  return {
    type: 'GeoreferencedMap', id,
    resource: {
      id: `https://example.test/iiif/${id}`, type: 'ImageService2', width: 1000, height: 1000,
      tiles: [{ width: 256, height: 256, scaleFactors: [1, 2, 4] }]
    },
    gcps: [
      { resource: [0, 0], geo: [6.04, 52.52] },
      { resource: [1000, 0], geo: [6.10, 52.52] },
      { resource: [1000, 1000], geo: [6.10, 52.47] },
      { resource: [0, 1000], geo: [6.04, 52.47] }
    ],
    resourceMask: [[0, 0], [1000, 0], [1000, 1000], [0, 1000]]
  };
}

// The IIIF `info.json` is fetched on the main thread, so page.route() can mock it directly.
// The actual tile image is fetched from inside a dedicated Worker (via comlink), and Playwright's
// request interception does not reliably observe (and can even hang) worker-issued fetches — so
// instead of mocking that response, we patch Worker.postMessage before the app loads to detect the
// comlink RPC call that kicks off a tile fetch. That's a direct, network-independent signal that
// the render pipeline actually asked for tile pixels, which is exactly the behaviour that used to
// only happen after an unrelated pan/zoom interaction.
async function mockIiifInfoAndWatchTileRequests(page: Page) {
  const infoRequested: string[] = [];
  await page.route('https://example.test/iiif/**/info.json', (route) => {
    const url = route.request().url();
    infoRequested.push(url);
    return route.fulfill({
      json: {
        '@context': 'http://iiif.io/api/image/2/context.json',
        '@id': url.slice(0, -'/info.json'.length),
        protocol: 'http://iiif.io/api/image',
        width: 1000,
        height: 1000,
        sizes: [{ width: 250, height: 250 }, { width: 500, height: 500 }],
        tiles: [{ width: 256, height: 256, scaleFactors: [1, 2, 4] }],
        profile: ['http://iiif.io/api/image/2/level2.json']
      }
    });
  });
  await page.addInitScript(() => {
    (window as unknown as { __tileFetchRequests: unknown[] }).__tileFetchRequests = [];
    const originalPostMessage = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown, ...rest: unknown[]) {
      const data = message as { path?: unknown[]; argumentList?: unknown[] } | undefined;
      if (Array.isArray(data?.path) && data.path[0] === 'getImageData') {
        (window as unknown as { __tileFetchRequests: unknown[] }).__tileFetchRequests.push(data.argumentList);
      }
      // @ts-expect-error - forwarding the original call signature
      return originalPostMessage.call(this, message, ...rest);
    };
  });
  return { infoRequested };
}

function context(buildings: Feature[] = []): LandscapeContext {
  return {
    location: { ...point, radiusMeters: 250, heritageRadiusMeters: 600, bbox: [6.063, 52.493, 6.071, 52.497] },
    current: { buildings: { type: 'FeatureCollection', features: buildings } },
    historical: { collectionTitle: 'Watertijdreis', collectionUrl: 'https://example.test/collection', itemCount: 1, maps: [] },
    heritage: { status: 'connected', objects: { type: 'FeatureCollection', features: [] } },
    archaeology: { status: 'connected', objects: { type: 'FeatureCollection', features: [] } },
    municipalityHistory: { placeName: null, periods: [] },
    assertions: [{ id: 'bag', type: 'source_fact', statement: `PDOK leverde ${buildings.length} BAG-panden.`, sourceIds: ['source-pdok-bag'] }],
    provenance: [{ id: 'source-pdok-bag', source: 'pdok-bag', title: 'BAG', url: 'https://example.test/bag', retrievedAt: '2026-08-31T12:00:00Z' }],
    sourceStatus: [
      { source: 'pdok-bag', label: 'PDOK BAG', status: 'available', checkedAt: '2026-08-31T12:00:00Z' },
      { source: 'watertijdreis', label: 'Watertijdreis', status: 'available', checkedAt: '2026-08-31T12:00:00Z' },
      { source: 'rce', label: 'RCE-erfgoed', status: 'available', checkedAt: '2026-08-31T12:00:00Z' },
      { source: 'rce-archaeology', label: 'RCE-archeologie', status: 'available', checkedAt: '2026-08-31T12:00:00Z' }
    ],
    warnings: []
  };
}

async function prepare(page: Page, data = context()) {
  await page.addInitScript(() => localStorage.setItem('watwashier:context-help:0.4', 'seen'));
  await page.route('**/api/context?**', (route) => route.fulfill({ json: data }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Wat was hier?' })).toBeVisible();
  await expect(page.getByText('PDOK BAG', { exact: true })).toBeVisible();
  await expect(page.locator('[data-map-ready="true"]')).toBeVisible();
}

test('kaartklik onderzoekt een nieuwe plek', async ({ page }) => {
  let requests = 0;
  await page.addInitScript(() => localStorage.setItem('watwashier:context-help:0.4', 'seen'));
  await page.route('**/api/context?**', (route) => {
    requests++;
    return route.fulfill({ json: context() });
  });
  await page.goto('/');
  const canvas = page.locator('.maplibregl-canvas');
  await expect(page.locator('[data-map-ready="true"]')).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Kaartcanvas heeft geen afmetingen');
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.7);
  await expect.poll(() => requests).toBeGreaterThan(1);
});

test('klik op een BAG-pand toont de gebouwgegevens', async ({ page }) => {
  const building: Feature = {
    type: 'Feature', id: 'pand-1',
    properties: { identificatie: '0193100000001590', bouwjaar: 1930, status: 'Pand in gebruik' },
    geometry: { type: 'Polygon', coordinates: [[[6.04,52.47],[6.10,52.47],[6.10,52.52],[6.04,52.52],[6.04,52.47]]] }
  };
  await prepare(page, context([building]));
  await page.getByText('Pand 0193100000001590', { exact: true }).click();
  const buildingDetails = page.locator('details').filter({ hasText: 'Pand 0193100000001590' });
  await expect(buildingDetails).toContainText('Bouwjaar');
  await expect(buildingDetails).toContainText('1930');
});

test('lagen en historische doorzichtigheid worden in de URL bewaard', async ({ page }) => {
  await prepare(page);
  await page.getByRole('button', { name: 'Open kaartlagen' }).click();
  await page.getByLabel('Geen achtergrond').check();
  await page.getByLabel('BAG-panden').uncheck();
  await page.locator('.opacity-control input').fill('0.35');
  await expect.poll(() => new URL(page.url()).searchParams.get('background')).toBe('none');
  await expect.poll(() => new URL(page.url()).searchParams.get('bag')).toBe('0');
  await expect.poll(() => new URL(page.url()).searchParams.get('opacity')).toBe('0.35');
  await expect(page.getByText('Doorzichtigheid: 35%')).toBeVisible();
});

test('deelbare URL herstelt kaartlagen en doorzichtigheid', async ({ page }) => {
  await prepare(page);
  await page.goto('/?lon=6.066800&lat=52.495000&zoom=14&background=none&bag=0&gemeenten=0&history=1&opacity=0.40&radius=500&heritageRadius=1200');
  await expect(page.locator('[data-map-ready="true"]')).toBeVisible();
  await page.getByRole('button', { name: 'Open kaartlagen' }).click();
  await expect(page.getByLabel('Geen achtergrond')).toBeChecked();
  await expect(page.getByLabel('BAG-panden')).not.toBeChecked();
  await expect(page.getByLabel('Gemeentegeschiedenis')).not.toBeChecked();
  await expect(page.getByText('Doorzichtigheid: 40%')).toBeVisible();
  await expect(page.getByLabel('Zoekstraal plekcontext')).toHaveValue('500');
  await expect(page.getByLabel('Zoekstraal rijksmonumenten')).toHaveValue('1200');
});

test('gemeentegeschiedenis toont een klikbare historische gemeentegrens', async ({ page }) => {
  const data = context();
  data.municipalityHistory = {
    placeName: 'Zwolle',
    periods: [
      {
        id: 'https://example.test/gemeentegeschiedenis/zwolle-1812',
        label: 'Zwolle (1812–1967)',
        startYear: 1812,
        endYear: 1967,
        // Rand op exact de lengtegraad van het kaartcentrum (point.lon = 6.0668), zodat een klik
        // op het midden van het kaartcanvas — ongeacht precieze zoom/projectie — op deze lijn valt.
        geometry: {
          type: 'Polygon',
          coordinates: [[[6.0, 52.3], [point.lon, 52.3], [point.lon, 52.7], [6.0, 52.7], [6.0, 52.3]]]
        }
      }
    ]
  };
  await prepare(page, data);
  const canvas = page.locator('.maplibregl-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Kaartcanvas heeft geen afmetingen');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('.feature-card--municipality')).toContainText('Zwolle (1812–1967)');
});

test('historische kaartselectie bewaart jaar en editie in de URL', async ({ page }) => {
  const data = context();
  data.historical.maps = [
    { id: 'kaart-1925', label: 'Waterstaatskaart 1925', yearStart: 1924, yearEnd: 1925, edition: 2, manifestUrl: null, annotationUrl: 'https://example.test/1925', georeferencedMap: georeferencedMap('kaart-1925') },
    { id: 'kaart-1976', label: 'Waterstaatskaart 1976', yearStart: 1975, yearEnd: 1976, edition: 4, manifestUrl: null, annotationUrl: 'https://example.test/1976', georeferencedMap: georeferencedMap('kaart-1976') }
  ];
  await mockIiifInfoAndWatchTileRequests(page);
  await prepare(page, data);
  await page.getByTitle('Waterstaatskaart 1925, editie 2').click();
  await expect.poll(() => new URL(page.url()).searchParams.get('year')).toBe('1925');
  await expect.poll(() => new URL(page.url()).searchParams.get('edition')).toBe('2');
});

test('historische kaart vraagt tegelbeelden op zonder dat je hoeft te pannen of te zoomen', async ({ page }) => {
  const data = context();
  data.historical.maps = [
    { id: 'kaart-1976', label: 'Waterstaatskaart 1976', yearStart: 1975, yearEnd: 1976, edition: 4, manifestUrl: null, annotationUrl: 'https://example.test/1976', georeferencedMap: georeferencedMap('kaart-1976') }
  ];
  const { infoRequested } = await mockIiifInfoAndWatchTileRequests(page);
  await prepare(page, data);

  // De historische kaart wordt automatisch geselecteerd (chooseHistoricalMap), dus dit mag
  // zonder enige klik, pan of zoom gebeuren — dat is precies waar het eerder op vastliep:
  // de laag haalde info.json op maar vroeg de tegelafbeelding pas op na een kaartinteractie.
  await expect.poll(() => infoRequested.length > 0, { timeout: 6000 }).toBe(true);
  await expect.poll(
    async () => page.evaluate(() => (window as unknown as { __tileFetchRequests: unknown[] }).__tileFetchRequests.length),
    { timeout: 6000 }
  ).toBeGreaterThan(0);
});

test('zoekstralen wijzigen de URL en halen pas na loslaten nieuwe data op', async ({ page }) => {
  let requests = 0;
  await page.addInitScript(() => localStorage.setItem('watwashier:context-help:0.4', 'seen'));
  await page.route('**/api/context?**', (route) => {
    requests++;
    return route.fulfill({ json: context() });
  });
  await page.goto('/');
  await expect(page.locator('[data-map-ready="true"]')).toBeVisible();
  await expect.poll(() => requests).toBe(1);
  const radius = page.getByLabel('Zoekstraal plekcontext');
  await radius.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '500';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect.poll(() => new URL(page.url()).searchParams.get('radius')).toBe('500');
  expect(requests).toBe(1);
  await radius.evaluate((element) => element.dispatchEvent(new Event('change', { bubbles: true })));
  await expect.poll(() => requests).toBe(2);
  await expect.poll(() => new URL(page.url()).searchParams.get('heritageRadius')).toBe('600');
});

test('toont een bronstoring zonder de overige resultaten te verbergen', async ({ page }) => {
  const data = context();
  data.sourceStatus[2] = {
    source: 'rce', label: 'RCE-erfgoed', status: 'unavailable',
    checkedAt: '2026-08-31T12:00:00Z', message: 'RCE-erfgoed antwoordde niet op tijd.'
  };
  data.warnings = ['RCE-erfgoed antwoordde niet op tijd. Andere bronnen blijven beschikbaar.'];
  let requests = 0;
  await page.addInitScript(() => localStorage.setItem('watwashier:context-help:0.4', 'seen'));
  await page.route('**/api/context?**', (route) => {
    requests++;
    return route.fulfill({ json: requests === 1 ? data : context() });
  });
  await page.goto('/');
  await expect(page.locator('[data-map-ready="true"]')).toBeVisible();
  await expect(page.getByText('RCE-erfgoed antwoordde niet op tijd. Andere bronnen blijven beschikbaar.')).toBeVisible();
  await expect(page.getByText('PDOK BAG', { exact: true })).toBeVisible();
  await expect(page.getByText('Tijdelijk niet beschikbaar', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bronnen opnieuw proberen' }).click();
  await expect.poll(() => requests).toBe(2);
  await expect(page.getByText('Tijdelijk niet beschikbaar', { exact: true })).not.toBeVisible();
});
