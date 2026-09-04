import type { GeoJsonProperties } from 'geojson';
import type { ArchaeologyDetails, HeritageDetails } from '$lib/domain';

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character] ?? character);
}

function row(label: string, value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

export function bagPopup(properties: GeoJsonProperties): string {
  const p = properties ?? {};
  const url = p.rdf_seealso ? String(p.rdf_seealso) : null;
  return `<div class="feature-card"><span class="feature-card__type">BAG-pand</span><h3>Pand ${escapeHtml(p.identificatie ?? 'onbekend')}</h3><dl>${row('Bouwjaar', p.bouwjaar)}${row('Status', p.status)}${row('Gebruik', p.gebruiksdoel)}${row('Verblijfsobjecten', p.aantal_verblijfsobjecten)}</dl>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Open BAG-bron</a>` : ''}</div>`;
}

export function municipalityHistoryPopup(properties: GeoJsonProperties): string {
  const p = properties ?? {};
  const label = p.label ? String(p.label) : 'Gemeentegeschiedenis';
  return `<div class="feature-card feature-card--municipality"><span class="feature-card__type">Gemeentegeschiedenis</span><h3>${escapeHtml(label)}</h3><p class="feature-card__description">Historische gemeentegrens volgens RCE ErfGeo.</p></div>`;
}

export function minuutplanPopup(properties: GeoJsonProperties): string {
  const p = properties ?? {};
  const url = p.detailUrl ? String(p.detailUrl) : null;
  return `<div class="feature-card feature-card--minuutplan"><span class="feature-card__type">Kadastrale minuutplan</span><h3>Sectie ${escapeHtml(p.section ?? '?')}, blad ${escapeHtml(p.sheet ?? '?')}</h3><dl>${row('Gemeente (1832)', p.municipality)}${row('Provincie', p.province)}${row('Kaartcode', p.code)}</dl><p class="feature-card__description">Kadastrale minuutplans, 1811&ndash;1832.</p>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Bekijk de kaart bij RCE</a>` : ''}</div>`;
}

export function toponymPopup(properties: GeoJsonProperties): string {
  const p = properties ?? {};
  return `<div class="feature-card feature-card--toponym"><span class="feature-card__type">Historische plaatsnaam</span><h3>${escapeHtml(p.label ?? '?')}</h3><dl>${row('Kloeke-code', p.kloekeCode)}</dl><p class="feature-card__description">Kloekecodes zijn een historische naamgeving voor plaatsen en buurtschappen, via RCE ErfGeo.</p></div>`;
}

export function disappearedVillagePopup(properties: GeoJsonProperties): string {
  const p = properties ?? {};
  return `<div class="feature-card feature-card--village"><span class="feature-card__type">Verdwenen dorp</span><h3>${escapeHtml(p.label ?? '?')}</h3><dl>${row('Laatst genoemd', p.date)}</dl><p class="feature-card__description">${p.source ? escapeHtml(p.source) : 'Bron: Bert Stulp, Verdwenen Dorpen'}</p></div>`;
}

export function defenceLinePopup(properties: GeoJsonProperties): string {
  const p = properties ?? {};
  return `<div class="feature-card feature-card--linie"><span class="feature-card__type">Historische linie</span><h3>${escapeHtml(p.label ?? '?')}</h3><dl>${row('Periode', p.period)}</dl><p class="feature-card__description">Historische verdedigingslinie, via de RCE CHO-linked-data.</p></div>`;
}

function formatArea(squareMeters: unknown): string | null {
  const value = typeof squareMeters === 'number' ? squareMeters : Number(squareMeters);
  if (!Number.isFinite(value)) return null;
  return value >= 10_000 ? `${(value / 10_000).toLocaleString('nl-NL', { maximumFractionDigits: 2 })} ha` : `${Math.round(value).toLocaleString('nl-NL')} m²`;
}

export function perceelPopup(properties: GeoJsonProperties): string {
  const p = properties ?? {};
  const area = formatArea(p.areaSquareMeters);
  return `<div class="feature-card feature-card--perceel"><span class="feature-card__type">Kadastraal perceel</span><h3>${escapeHtml(p.gemeente ?? '?')} ${escapeHtml(p.sectie ?? '?')} ${escapeHtml(p.perceelnummer ?? '?')}</h3><dl>${row('Gemeente', p.gemeente)}${row('Sectie', p.sectie)}${row('Perceelnummer', p.perceelnummer)}${area ? row('Oppervlakte', area) : ''}</dl><p class="feature-card__description">Actueel kadastraal perceel, via de Kadaster Knowledge Graph.</p></div>`;
}

export function archaeologyPopup(properties: GeoJsonProperties, details?: ArchaeologyDetails | null, loading = false): string {
  const p = properties ?? {};
  const labels: Record<string, string> = { ArcheologischTerrein: 'Archeologisch terrein', ArcheologischOnderzoeksgebied: 'Archeologisch onderzoeksgebied', Vondstlocatie: 'Vondstlocatie' };
  const type = labels[String(p.archaeologyType)] ?? 'Archeologisch object';
  const url = p.resource ? String(p.resource) : null;
  const groups = details?.groups.map((group) => `<li>${escapeHtml(group.type)}: <strong>${group.count}</strong></li>`).join('') ?? '';
  const relationList = details?.relations.slice(0, 20).map((relation) => `<li><span>${relation.direction === 'contains' ? 'Bevat' : 'Ligt in'}: ${escapeHtml(relation.type)}</span>${relation.name ? `<small>${escapeHtml(relation.name)}</small>` : ''}${relation.archisNumber ? `<small>Archis ${escapeHtml(relation.archisNumber)}</small>` : ''}</li>`).join('') ?? '';
  return `<div class="feature-card feature-card--archaeology"><span class="feature-card__type">${escapeHtml(type)}</span><h3>${escapeHtml(p.name || type)}</h3><dl>${row('CHO-nummer', p.choNumber)}${row('Archisnummer', p.archisNumber)}${row('Gekoppelde records', details?.relations.length ?? p.linkedObjectCount)}</dl>${loading ? '<p class="feature-card__loading">CHO-relaties worden geladen…</p>' : ''}${groups ? `<h4>Per type</h4><ul class="feature-card__groups">${groups}</ul>` : ''}${relationList ? `<details><summary>Bekijk gekoppelde records</summary><ul class="feature-card__relations">${relationList}</ul></details>` : '<p class="feature-card__description">Dit kaartobject is een ruimtelijk anker. Vondsten, grondsporen en complexen kunnen zonder eigen geometrie eraan gekoppeld zijn.</p>'}${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Open CHO-resource</a>` : ''}</div>`;
}

export function rcePopup(properties: GeoJsonProperties, details?: HeritageDetails | null, loading = false): string {
  const p = properties ?? {};
  const category = p.heritageType === 'face' ? 'Beschermd stads- of dorpsgezicht' : p.heritageType === 'world-heritage' ? 'Werelderfgoed' : 'Rijksmonument';
  const title = p.text || category;
  const url = p.ci_citation ? String(p.ci_citation) : null;
  const image = details?.images[0];
  const imageFromCommons = image?.graph === 'Wikimedia Commons';
  const imageHtml = image?.thumbnailUrl
    ? `<figure class="feature-card__image"><img src="${escapeHtml(image.thumbnailUrl)}" alt="${escapeHtml(image.description ?? image.title ?? title)}" loading="lazy" referrerpolicy="no-referrer" /><figcaption>${escapeHtml(image.description ?? image.title ?? (imageFromCommons ? 'Wikimedia Commons' : 'RCE-foto'))}${image.licenseUrl ? ` · <a href="${escapeHtml(image.licenseUrl)}" target="_blank" rel="noreferrer">licentie</a>` : ''}</figcaption></figure>`
    : details
      ? '<p class="feature-card__image-status">Geen RCE-foto beschikbaar voor dit monument.</p>'
      : '';
  const placeRecords = details?.historicalNames ?? [];
  const placeLabel = placeRecords.find((name) => !name.label.toLowerCase().startsWith('gemeente '))?.label ?? placeRecords[0]?.label;
  const placeValues = [...new Map(
    placeRecords
      // A record that's just the place name with no period adds nothing beyond the "Plaatscontext: X" heading.
      .filter((record) => record.startYear !== null || record.endYear !== null || record.label.toLocaleLowerCase('nl') !== placeLabel?.toLocaleLowerCase('nl'))
      .map((record) => [`${record.label.toLocaleLowerCase('nl')}|${record.startYear ?? ''}|${record.endYear ?? ''}`, record])
  ).values()];
  const placeContext = placeLabel && placeValues.length > 0
    ? `<details class="feature-card__historical"><summary>Plaatscontext: ${escapeHtml(placeLabel)}</summary><p>Automatisch gekoppeld op woonplaatsnaam, ${Math.round(Math.max(...placeRecords.map((name) => name.confidence)) * 100)}% zekerheid. Dit zijn plaatsrecords, geen gegevens over het monument zelf.</p><ul>${placeValues.map((record) => `<li><a href="${escapeHtml(record.uri)}" target="_blank" rel="noreferrer">${escapeHtml(record.label)}</a>${record.startYear || record.endYear ? ` (${record.startYear ?? '?'}–${record.endYear ?? 'heden'})` : ''}</li>`).join('')}</ul></details>`
    : '';
  const description = details?.description?.trim() ?? '';
  const descriptionExcerpt = description.length > 360 ? `${description.slice(0, 357).trimEnd()}…` : description;
  const descriptionHtml = description
    ? `<section class="feature-card__description"><h4>Beschrijving</h4><p>${escapeHtml(descriptionExcerpt)}</p>${description.length > 360 ? `<details><summary>Lees volledige beschrijving</summary><p>${escapeHtml(description)}</p></details>` : ''}</section>`
    : '';  const imageSource = image?.sourceUrl
    ? `<a href="${escapeHtml(image.sourceUrl)}" target="_blank" rel="noreferrer">${imageFromCommons ? 'Bekijk op Wikimedia Commons' : 'Open foto bij de RCE'}</a>`
    : '';
  return `<div class="feature-card feature-card--rce"><span class="feature-card__type">${escapeHtml(category)}</span><h3>${escapeHtml(details?.originalFunction ?? title)}</h3>${imageHtml}<dl>${row('RCE-identificatie', details?.monumentNumber ?? monumentNumber(url) ?? p.localid)}${row('Adres', details?.address)}${row('CHO-nummer', details?.choNumber)}${row('Functie', details?.originalFunction)}${row('Status', details?.legalStatus)}${row('Beschermd sinds', details?.registeredAt ?? p.legalfoundationdate)}${row('Foto’s', details?.images.length)}</dl>${descriptionHtml}${placeContext}${loading ? '<p class="feature-card__loading">CHO-relaties worden geladen…</p>' : ''}${imageSource}${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Open monumentregister</a>` : ''}</div>`;
}

export function monumentNumber(url: string | null): string | null {
  return url?.match(/\/monumenten\/(\d+)/)?.[1] ?? null;
}
