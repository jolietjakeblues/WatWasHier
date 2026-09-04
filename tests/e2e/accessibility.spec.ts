import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
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
  await page.goto('/');
  await expect(page.locator('[data-map-ready="true"]')).toBeVisible();
});

test('kaartbediening heeft bruikbare namen en toetsenbordfocus', async ({ page }) => {
  for (const name of ['Zoom in', 'Zoom out', 'Open kaartlagen', 'Open uitleg over WatWasHier', 'Open informatie en bronnen', 'Deel deze kaartweergave']) {
    await expect(page.getByRole('button', { name })).toBeVisible();
  }
  const layers = page.getByRole('button', { name: 'Open kaartlagen' });
  await layers.focus();
  await expect(layers).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Kaartlagen', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sluit kaartlagen' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Kaartlagen', { exact: true })).not.toBeVisible();
});

test('help- en informatievenster hebben een dialoognaam en sluiten met Escape', async ({ page }) => {
  await page.getByRole('button', { name: 'Open uitleg over WatWasHier' }).click();
  const help = page.getByRole('dialog', { name: 'Onderzoek een plek' });
  await expect(help).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(help).not.toBeVisible();

  await page.getByRole('button', { name: 'Open informatie en bronnen' }).click();
  const info = page.getByRole('dialog', { name: 'WatWasHier' });
  await expect(info).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(info).not.toBeVisible();
});
