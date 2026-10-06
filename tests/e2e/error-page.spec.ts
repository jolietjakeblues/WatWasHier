import { expect, test } from '@playwright/test';

test('onbekende route toont een gebrande 404-pagina met weg terug', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('watwashier:context-help:0.4', 'seen'));
  await page.route('**/api/context?**', (route) => route.fulfill({ json: {
    location: { lon: 6.0668, lat: 52.495, radiusMeters: 250, heritageRadiusMeters: 600, bbox: [6.063, 52.493, 6.071, 52.497] },
    current: { buildings: { type: 'FeatureCollection', features: [] } },
    historical: { collectionTitle: null, collectionUrl: 'https://example.test', itemCount: 0, maps: [] },
    heritage: { status: 'connected', objects: { type: 'FeatureCollection', features: [] } },
    archaeology: { status: 'connected', objects: { type: 'FeatureCollection', features: [] } },
    municipalityHistory: { placeName: null, periods: [] },
    minuutplans: { status: 'connected', sheets: [] },
    toponyms: { status: 'connected', items: [] },
    percelen: { status: 'connected', items: [] },
    disappearedVillages: { status: 'connected', items: [] },
    defenceLines: { status: 'connected', items: [] },
    historicGardens: { status: 'connected', items: [] },
    assertions: [], provenance: [], warnings: [], sourceStatus: []
  } }));
  const response = await page.goto('/dit-bestaat-niet');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  await expect(page.getByText('Deze pagina bestaat niet.', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Terug naar de kaart' }).click();
  await expect(page.locator('[data-map-ready="true"]')).toBeVisible();
});
