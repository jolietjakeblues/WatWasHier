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
  const imageHtml = image?.thumbnailUrl
    ? `<figure class="feature-card__image"><img src="${escapeHtml(image.thumbnailUrl)}" alt="${escapeHtml(image.description ?? image.title ?? title)}" loading="lazy" referrerpolicy="no-referrer" /><figcaption>${escapeHtml(image.description ?? image.title ?? 'RCE-foto')}${image.licenseUrl ? ` · <a href="${escapeHtml(image.licenseUrl)}" target="_blank" rel="noreferrer">licentie</a>` : ''}</figcaption></figure>`
    : details
      ? '<p class="feature-card__image-status">Geen RCE-foto beschikbaar voor dit monument.</p>'
      : '';
  const placeRecords = details?.historicalNames ?? [];
  const placeLabel = placeRecords.find((name) => !name.label.toLowerCase().startsWith('gemeente '))?.label ?? placeRecords[0]?.label;
  const sourceGroups = new Map<string, { url: string; count: number }>();
  for (const record of placeRecords) {
    if (!record.source) continue;
    const key = record.source.split('/').pop() ?? record.source;
    const group = sourceGroups.get(key);
    if (group) group.count++;
    else sourceGroups.set(key, { url: record.source, count: 1 });
  }
  const sourceLabels: Record<string, string> = {
    atlasverstedelijking: 'Atlas van de verstedelijking',
    gemeentegeschiedenis: 'Gemeentegeschiedenis',
    poorterboeken: 'Poorterboeken',
    plaatsen: 'Plaatsen'
  };
  const placeContext = placeLabel
    ? `<details class="feature-card__historical"><summary>Plaatscontext: ${escapeHtml(placeLabel)} <span>${placeRecords.length} ErfGeo-records</span></summary><p>Automatisch gekoppeld op woonplaatsnaam, ${Math.round(Math.max(...placeRecords.map((name) => name.confidence)) * 100)}% zekerheid. Dit zijn plaatsrecords, geen gegevens over het monument zelf.</p><ul>${[...sourceGroups].map(([source, group]) => `<li><a href="${escapeHtml(group.url)}" target="_blank" rel="noreferrer">${escapeHtml(sourceLabels[source] ?? source)}</a>: ${group.count}</li>`).join('')}</ul></details>`
    : '';  const imageSource = image?.sourceUrl
    ? `<a href="${escapeHtml(image.sourceUrl)}" target="_blank" rel="noreferrer">Open foto bij de RCE</a>`
    : '';
  return `<div class="feature-card feature-card--rce"><span class="feature-card__type">${escapeHtml(category)}</span><h3>${escapeHtml(details?.originalFunction ?? title)}</h3>${imageHtml}${details?.description ? `<p class="feature-card__description">${escapeHtml(details.description)}</p>` : ''}<dl>${row('RCE-identificatie', details?.monumentNumber ?? monumentNumber(url) ?? p.localid)}${row('Adres', details?.address)}${row('CHO-nummer', details?.choNumber)}${row('Functie', details?.originalFunction)}${row('Status', details?.legalStatus)}${row('Beschermd sinds', details?.registeredAt ?? p.legalfoundationdate)}${row('Foto’s', details?.images.length)}</dl>${placeContext}${loading ? '<p class="feature-card__loading">CHO-relaties worden geladen…</p>' : ''}${imageSource}${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Open monumentregister</a>` : ''}</div>`;
}

export function monumentNumber(url: string | null): string | null {
  return url?.match(/\/monumenten\/(\d+)/)?.[1] ?? null;
}
