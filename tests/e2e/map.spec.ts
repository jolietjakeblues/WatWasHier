import { expect, test, type Page } from '@playwright/test';
import type { LandscapeContext } from '../../src/lib/domain';
import type { Feature } from 'geojson';

const point = { lon: 6.0668, lat: 52.495 };

function context(buildings: Feature[] = []): LandscapeContext {
  return {
    location: { ...point, radiusMeters: 250, heritageRadiusMeters: 600, bbox: [6.063, 52.493, 6.071, 52.497] },
    current: { buildings: { type: 'FeatureCollection', features: buildings } },
    historical: { collectionTitle: 'Watertijdreis', collectionUrl: 'https://example.test/collection', itemCount: 1, maps: [] },
    heritage: { status: 'connected', objects: { type: 'FeatureCollection', features: [] } },
    archaeology: { status: 'connected', objects: { type: 'FeatureCollection', features: [] } },
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
  await page.getByRole('slider').fill('0.35');
  await expect.poll(() => new URL(page.url()).searchParams.get('background')).toBe('none');
  await expect.poll(() => new URL(page.url()).searchParams.get('bag')).toBe('0');
  await expect.poll(() => new URL(page.url()).searchParams.get('opacity')).toBe('0.35');
  await expect(page.getByText('Doorzichtigheid: 35%')).toBeVisible();
});

test('deelbare URL herstelt kaartlagen en doorzichtigheid', async ({ page }) => {
  await prepare(page);
  await page.goto('/?lon=6.066800&lat=52.495000&zoom=14&background=none&bag=0&history=1&opacity=0.40');
  await expect(page.locator('[data-map-ready="true"]')).toBeVisible();
  await page.getByRole('button', { name: 'Open kaartlagen' }).click();
  await expect(page.getByLabel('Geen achtergrond')).toBeChecked();
  await expect(page.getByLabel('BAG-panden')).not.toBeChecked();
  await expect(page.getByText('Doorzichtigheid: 40%')).toBeVisible();
});

test('toont een bronstoring zonder de overige resultaten te verbergen', async ({ page }) => {
  const data = context();
  data.sourceStatus[2] = {
    source: 'rce', label: 'RCE-erfgoed', status: 'unavailable',
    checkedAt: '2026-08-31T12:00:00Z', message: 'RCE-erfgoed antwoordde niet op tijd.'
  };
  data.warnings = ['RCE-erfgoed antwoordde niet op tijd. Andere bronnen blijven beschikbaar.'];
  await prepare(page, data);
  await expect(page.getByText('RCE-erfgoed antwoordde niet op tijd. Andere bronnen blijven beschikbaar.')).toBeVisible();
  await expect(page.getByText('PDOK BAG', { exact: true })).toBeVisible();
  await expect(page.getByText('Tijdelijk niet beschikbaar', { exact: true })).toBeVisible();
});
