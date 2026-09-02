import { expect, test } from '@playwright/test';
import type { LandscapeContext } from '../../src/lib/domain';

const data: LandscapeContext = {
  location: { lon: 6.0668, lat: 52.495, radiusMeters: 250, heritageRadiusMeters: 600, bbox: [6.063, 52.493, 6.071, 52.497] },
  current: { buildings: { type: 'FeatureCollection', features: [] } },
  historical: { collectionTitle: 'Watertijdreis', collectionUrl: 'https://example.test/collection', itemCount: 0, maps: [] },
  heritage: { status: 'connected', objects: { type: 'FeatureCollection', features: [] } },
  archaeology: { status: 'connected', objects: { type: 'FeatureCollection', features: [] } },
  municipalityHistory: { placeName: null, periods: [] },
  assertions: [], provenance: [], warnings: [],
  sourceStatus: [
    { source: 'pdok-bag', label: 'PDOK BAG', status: 'available', checkedAt: '2026-09-01T08:00:00Z' },
    { source: 'watertijdreis', label: 'Watertijdreis', status: 'available', checkedAt: '2026-09-01T08:00:00Z' },
    { source: 'rce', label: 'RCE-erfgoed', status: 'available', checkedAt: '2026-09-01T08:00:00Z' },
    { source: 'rce-archaeology', label: 'RCE-archeologie', status: 'available', checkedAt: '2026-09-01T08:00:00Z' }
  ]
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('watwashier:context-help:0.4', 'seen'));
  await page.route('**/api/context?**', (route) => route.fulfill({ json: data }));
  await page.goto('/');
  await expect(page.locator('[data-map-ready="true"]')).toBeVisible();
});

test('kaart, paneel en zoekstralen blijven bruikbaar op mobiel', async ({ page }) => {
  await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Wat was hier?' })).toBeVisible();
  await expect(page.getByLabel('Zoekstraal plekcontext')).toBeVisible();
  await expect(page.getByLabel('Zoekstraal rijksmonumenten')).toBeVisible();
  await page.getByRole('button', { name: 'Open kaartlagen' }).click();
  await expect(page.getByText('Kaartlagen', { exact: true })).toBeVisible();
  await expect(page.getByLabel('PDOK BRT grijs')).toBeChecked();
});

test('helpvenster past op mobiel en sluit met Escape', async ({ page }) => {
  await page.getByRole('button', { name: 'Open uitleg over WatWasHier' }).click();
  const dialog = page.getByRole('dialog', { name: 'Onderzoek een plek' });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(412);
  expect(box!.height).toBeLessThanOrEqual(915);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
