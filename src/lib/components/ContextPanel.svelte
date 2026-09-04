<script lang="ts">
  import type { BuildingFeature, LandscapeContext } from '$lib/domain';

  let {
    context,
    loading,
    error,
    selectedBuilding,
    selectedHistoricalMapId = $bindable(),
    radiusMeters = $bindable(),
    heritageRadiusMeters = $bindable(),
    onradiuspreview,
    onradiuscommit,
    onretry
  }: {
    context: LandscapeContext | null;
    loading: boolean;
    error: string | null;
    selectedBuilding: BuildingFeature | null;
    selectedHistoricalMapId: string | null;
    radiusMeters: number;
    heritageRadiusMeters: number;
    onradiuspreview: () => void;
    onradiuscommit: () => void;
    onretry: () => void;
  } = $props();

  const ignoredBuildingProperties = new Set([
    'identificatie',
    'rdf_seealso',
    'verblijfsobject.href'
  ]);

  let timelineMaps = $derived(
    context ? [...context.historical.maps].sort((a, b) => a.yearEnd - b.yearEnd || a.edition - b.edition) : []
  );
  let selectedTimelineIndex = $derived(
    Math.max(0, timelineMaps.findIndex((map) => map.id === selectedHistoricalMapId))
  );
  // null means "no reliable key" (no selection, or the selected building has neither
  // identificatie nor id) — buildingKey() treats that as never matching, so a building
  // without an id is never mistaken for a different building that also lacks one.
  let selectedBuildingKey = $derived(buildingKey(selectedBuilding));
  let unavailableSourceCount = $derived(
    context?.sourceStatus.filter((source) => source.status === 'unavailable').length ?? 0
  );

  function buildingKey(building: BuildingFeature | null): string | null {
    const key = building?.properties?.identificatie ?? building?.id;
    return key === undefined || key === null ? null : String(key);
  }

  function propertyLabel(name: string): string {
    return name.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
  }

  function propertyValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return 'Onbekend';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
</script>

<aside class="panel">
  <header>
    <div class="title-row">
      <p class="eyebrow">Landschapsgeheugen</p>
      <span class="alpha-label">ALFA 0.4</span>
    </div>
    <h1>Wat was hier?</h1>
    <p class="intro">
      Selecteer een plek en ontdek hoe het landschap zich ontwikkelde. We verbinden actuele
      geodata, historische kaarten, erfgoed en archeologische informatie. Bij ieder resultaat
      zie je waar de informatie vandaan komt.
    </p>
    <div class="test-notice" role="note">
      <strong>Publieke testversie</strong>
      <span>Gegevens kunnen onvolledig zijn en onderdelen kunnen nog veranderen.</span>
    </div>
  </header>

  {#if loading}
    <div class="status">Nieuwe locatie wordt onderzocht. De resultaten worden bijgewerkt…</div>
  {/if}

  {#if error}
    <div class="error"><span>{error}</span><button type="button" onclick={onretry}>Opnieuw proberen</button></div>
  {:else if context}
    {#if context.warnings.length}
      <div class="warning-banner" role="alert">
        {#each context.warnings as warning}
          <p class="warning">{warning}</p>
        {/each}
        {#if unavailableSourceCount > 0}
          <button class="retry-button" type="button" onclick={onretry}>Bronnen opnieuw proberen</button>
        {/if}
      </div>
    {/if}

    {#if selectedBuilding}
      <section class="selected-building" aria-live="polite">
        <p class="eyebrow">Geselecteerd gebouw</p>
        <h2>Pand {String(selectedBuilding.properties?.identificatie ?? selectedBuilding.id ?? 'zonder ID')}</h2>
        <dl class="building-data">
          {#each Object.entries(selectedBuilding.properties ?? {}).filter(([name]) => !ignoredBuildingProperties.has(name)) as [name, value]}
            <div><dt>{propertyLabel(name)}</dt><dd>{propertyValue(value)}</dd></div>
          {/each}
        </dl>
        {#if selectedBuilding.properties?.rdf_seealso}
          <a class="data-link" href={String(selectedBuilding.properties.rdf_seealso)} target="_blank" rel="noreferrer">Open BAG-resource</a>
        {/if}
      </section>
    {/if}

    <section>
      <h2>Locatie</h2>
      <p class="coords-caption">{context.location.lon.toFixed(6)}, {context.location.lat.toFixed(6)}</p>
      <div class="radius-controls">
        <label>
          <span><strong>Plekcontext</strong><output>{radiusMeters} m</output></span>
          <input aria-label="Zoekstraal plekcontext" type="range" min="25" max="1000" step="25" value={radiusMeters} oninput={(event) => { radiusMeters = Number(event.currentTarget.value); onradiuspreview(); }} onchange={onradiuscommit} />
        </label>
        <label>
          <span><strong>Rijksmonumenten</strong><output>{heritageRadiusMeters} m</output></span>
          <input aria-label="Zoekstraal rijksmonumenten" type="range" min="100" max="2000" step="100" value={heritageRadiusMeters} oninput={(event) => { heritageRadiusMeters = Number(event.currentTarget.value); onradiuspreview(); }} onchange={onradiuscommit} />
        </label>
        <small>De kaart wordt opnieuw onderzocht wanneer je de schuif loslaat.</small>
      </div>
    </section>

    <section>
      <h2>Overzicht</h2>
      <div class="overview-grid">
        <div class="overview-tile"><span>{context.current.buildings.features.length}</span><small>Panden</small></div>
        <div class="overview-tile"><span>{context.heritage.status === 'connected' ? context.heritage.objects.features.length : '–'}</span><small>Erfgoed</small></div>
        <div class="overview-tile"><span>{context.archaeology.status === 'connected' ? context.archaeology.objects.features.length : '–'}</span><small>Archeologie</small></div>
        <div class="overview-tile"><span>{context.municipalityHistory.periods.length}</span><small>Gemeente&shy;geschiedenis</small></div>
        <div class="overview-tile"><span>{context.minuutplans.status === 'connected' ? context.minuutplans.sheets.length : '–'}</span><small>Minuut&shy;plans</small></div>
        <div class="overview-tile"><span>{context.toponyms.status === 'connected' ? context.toponyms.items.length : '–'}</span><small>Plaats&shy;namen</small></div>
        <div class="overview-tile"><span>{context.percelen.status === 'connected' ? context.percelen.items.length : '–'}</span><small>Percelen</small></div>
        <div class="overview-tile"><span>{context.disappearedVillages.status === 'connected' ? context.disappearedVillages.items.length : '–'}</span><small>Verdwenen&shy;dorpen</small></div>
        <div class="overview-tile"><span>{context.defenceLines.status === 'connected' ? context.defenceLines.items.length : '–'}</span><small>Linies</small></div>
        <div class="overview-tile"><span>{context.historicGardens.status === 'connected' ? context.historicGardens.items.length : '–'}</span><small>Groenaanleg</small></div>
        <div class="overview-tile"><span>{context.historical.maps.length}</span><small>Historische kaarten</small></div>
      </div>
    </section>

    <section>
      <h2>Historische kaart</h2>
      {#if context.historical.maps.length}
        <div class="timeline" aria-label="Tijdlijn met beschikbare historische kaarten">
          <div class="timeline-years">
          {#each timelineMaps as historicalMap}
            <button
              class:active={historicalMap.id === selectedHistoricalMapId}
              onclick={() => (selectedHistoricalMapId = historicalMap.id)}
              title={`${historicalMap.label}, editie ${historicalMap.edition}`}
            ><span>{historicalMap.yearEnd}</span><i></i></button>
          {/each}
          </div>
          <input
            aria-label="Historisch jaar"
            type="range"
            min="0"
            max={Math.max(0, timelineMaps.length - 1)}
            step="1"
            value={selectedTimelineIndex}
            oninput={(event) => {
              selectedHistoricalMapId = timelineMaps[Number(event.currentTarget.value)]?.id ?? null;
            }}
          />
        </div>
        {#each context.historical.maps.filter((map) => map.id === selectedHistoricalMapId) as selectedMap}
          <p class="selected-map">
            Je bekijkt <strong>{selectedMap.label}</strong> uit {selectedMap.yearEnd}, editie
            {selectedMap.edition}.
          </p>
        {/each}
      {:else}
        <p class="muted">Voor deze locatie is geen Waterstaatskaart gevonden.</p>
      {/if}
    </section>

    <div class="detail-list">
      <details class="data-details">
        <summary><h2><span>Actuele PDOK-data</span><small>{context.current.buildings.features.length} panden</small></h2></summary>
        {#if context.current.buildings.features.length}
          <p class="muted">Hieronder staan de eerste 10 panden uit het geselecteerde gebied. De groene contouren staan op de kaart.</p>
          <div class="buildings">
            {#each context.current.buildings.features.filter((building) => selectedBuildingKey === null || buildingKey(building) !== selectedBuildingKey).slice(0, 10) as building}
              <details>
                <summary>
                  Pand {String(building.properties?.identificatie ?? building.id ?? 'zonder ID')}
                </summary>
                <dl class="building-data">
                  <div>
                    <dt>Bouwjaar</dt>
                    <dd>{String(building.properties?.bouwjaar ?? 'Onbekend')}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{String(building.properties?.status ?? 'Onbekend')}</dd>
                  </div>
                  <div>
                    <dt>Gebruiksdoel</dt>
                    <dd>{String(building.properties?.gebruiksdoel ?? 'Onbekend')}</dd>
                  </div>
                  <div>
                    <dt>Verblijfsobjecten</dt>
                    <dd>{String(building.properties?.aantal_verblijfsobjecten ?? 'Onbekend')}</dd>
                  </div>
                </dl>
                {#if building.properties?.rdf_seealso}
                  <a
                    class="data-link"
                    href={String(building.properties.rdf_seealso)}
                    target="_blank"
                    rel="noreferrer">Open BAG-resource</a
                  >
                {/if}
              </details>
            {/each}
          </div>
        {/if}
      </details>

      <details class="data-details">
        <summary><h2><span>Erfgoed</span><small>{context.heritage.status === 'connected' ? `${context.heritage.objects.features.length} objecten` : 'niet bereikbaar'}</small></h2></summary>
        {#if context.heritage.status === 'connected'}
          <ul class="heritage-counts">
            <li>Rijksmonumenten: {context.heritage.objects.features.filter((item) => item.properties?.heritageType === 'monument').length}</li>
            <li>Gezichten: {context.heritage.objects.features.filter((item) => item.properties?.heritageType === 'face').length}</li>
            <li>Werelderfgoed: {context.heritage.objects.features.filter((item) => item.properties?.heritageType === 'world-heritage').length}</li>
          </ul>
          {#each context.heritage.objects.features.slice(0, 10) as object}
            <article>
              <span class="badge">RCE</span>
              <p>{String(object.properties?.text || object.properties?.namespace || 'Beschermd erfgoedobject')}</p>
              {#if object.properties?.ci_citation}
                <a class="data-link" href={String(object.properties.ci_citation)} target="_blank" rel="noreferrer">Open monumentregister</a>
              {/if}
            </article>
          {/each}
        {:else}
          <p class="muted">RCE kon voor deze locatie niet worden bereikt.</p>
        {/if}
      </details>

      <details class="data-details">
        <summary><h2><span>Archeologie</span><small>{context.archaeology.status === 'connected' ? `${context.archaeology.objects.features.length} ankers` : 'niet bereikbaar'}</small></h2></summary>
        {#if context.archaeology.status === 'connected'}
          <ul class="heritage-counts">
            <li>Terreinen: {context.archaeology.objects.features.filter((item) => item.properties?.archaeologyType === 'ArcheologischTerrein').length}</li>
            <li>Onderzoeksgebieden: {context.archaeology.objects.features.filter((item) => item.properties?.archaeologyType === 'ArcheologischOnderzoeksgebied').length}</li>
            <li>Vondstlocaties: {context.archaeology.objects.features.filter((item) => item.properties?.archaeologyType === 'Vondstlocatie').length}</li>
          </ul>
          <p>Direct gekoppelde records zonder eigen kaartgeometrie: <strong>{context.archaeology.objects.features.reduce((total, item) => total + Number(item.properties?.linkedObjectCount ?? 0), 0)}</strong>.</p>
          <p class="muted">Niet alle archeologie heeft geometrie. De kaart toont alleen ruimtelijke ankers. Complexen, vondsten en grondsporen blijven via RCE-relaties aan die ankers gekoppeld.</p>
        {:else}
          <p class="muted">De archeologiebron reageerde niet binnen de tijdslimiet.</p>
        {/if}
      </details>

      <details class="data-details">
        <summary><h2><span>Gemeentegeschiedenis</span><small>{context.municipalityHistory.periods.length} periodes</small></h2></summary>
        {#if context.municipalityHistory.periods.length}
          <p class="muted">Historische gemeentegrenzen van {context.municipalityHistory.placeName} staan als gekleurde contouren op de kaart.</p>
          <ul class="heritage-counts">
            {#each context.municipalityHistory.periods as period}
              <li>{period.label}</li>
            {/each}
          </ul>
        {:else}
          <p class="muted">Voor deze locatie is geen gemeentegeschiedenis gevonden.</p>
        {/if}
      </details>

      <details class="data-details">
        <summary><h2><span>Kadastrale minuutplans</span><small>{context.minuutplans.status === 'connected' ? `${context.minuutplans.sheets.length} bladen` : 'niet bereikbaar'}</small></h2></summary>
        {#if context.minuutplans.status === 'connected'}
          {#if context.minuutplans.sheets.length}
            <p class="muted">Bladgrenzen uit de kadastrale minuutplans (1811–1832) staan als contouren op de kaart.</p>
            <ul class="heritage-counts">
              {#each context.minuutplans.sheets as sheet}
                <li>Sectie {sheet.section}, blad {sheet.sheet}{sheet.municipality ? ` — ${sheet.municipality}` : ''}{#if sheet.detailUrl}{' '}<a class="data-link" href={sheet.detailUrl} target="_blank" rel="noreferrer">bekijk</a>{/if}</li>
              {/each}
            </ul>
          {:else}
            <p class="muted">Voor deze locatie is geen kadastraal minuutplan gevonden.</p>
          {/if}
        {:else}
          <p class="muted">De minuutplan-bron kon niet worden bereikt.</p>
        {/if}
      </details>

      <details class="data-details">
        <summary><h2><span>Historische plaatsnamen</span><small>{context.toponyms.status === 'connected' ? `${context.toponyms.items.length} namen` : 'niet bereikbaar'}</small></h2></summary>
        {#if context.toponyms.status === 'connected'}
          {#if context.toponyms.items.length}
            <p class="muted">Kloekecodes: historische namen van plaatsen en buurtschappen, sommige inmiddels verdwenen of vergeten. Als paarse punten op de kaart.</p>
            <ul class="heritage-counts">
              {#each context.toponyms.items as toponym}
                <li>{toponym.label} <small class="muted">({toponym.kloekeCode})</small></li>
              {/each}
            </ul>
          {:else}
            <p class="muted">Voor deze locatie zijn geen historische plaatsnamen gevonden.</p>
          {/if}
        {:else}
          <p class="muted">De kloekecodes-bron kon niet worden bereikt.</p>
        {/if}
      </details>

      <details class="data-details">
        <summary><h2><span>Kadastrale percelen</span><small>{context.percelen.status === 'connected' ? `${context.percelen.items.length} percelen` : 'niet bereikbaar'}</small></h2></summary>
        {#if context.percelen.status === 'connected'}
          {#if context.percelen.items.length}
            <p class="muted">Actuele perceelgrenzen uit de Kadaster Knowledge Graph staan als contouren op de kaart. Hieronder de eerste 15.</p>
            <ul class="heritage-counts">
              {#each context.percelen.items.slice(0, 15) as perceel}
                <li>{perceel.gemeente} {perceel.sectie} {perceel.perceelnummer}</li>
              {/each}
            </ul>
          {:else}
            <p class="muted">Voor deze locatie zijn geen kadastrale percelen gevonden.</p>
          {/if}
        {:else}
          <p class="muted">De KKG-percelenbron kon niet worden bereikt.</p>
        {/if}
      </details>

      <details class="data-details">
        <summary><h2><span>Verdwenen dorpen</span><small>{context.disappearedVillages.status === 'connected' ? `${context.disappearedVillages.items.length} dorpen` : 'niet bereikbaar'}</small></h2></summary>
        {#if context.disappearedVillages.status === 'connected'}
          {#if context.disappearedVillages.items.length}
            <p class="muted">Verdwenen dorpen en gehuchten, naar Bert Stulp's boekenreeks "Verdwenen Dorpen", staan als grijze punten op de kaart.</p>
            <ul class="heritage-counts">
              {#each context.disappearedVillages.items as village}
                <li>{village.label}{village.date ? ` — laatst genoemd ${village.date}` : ''}</li>
              {/each}
            </ul>
          {:else}
            <p class="muted">Voor deze locatie zijn geen verdwenen dorpen gevonden.</p>
          {/if}
        {:else}
          <p class="muted">De bron voor verdwenen dorpen kon niet worden bereikt.</p>
        {/if}
      </details>

      <details class="data-details">
        <summary><h2><span>Historische linies</span><small>{context.defenceLines.status === 'connected' ? `${context.defenceLines.items.length} linies` : 'niet bereikbaar'}</small></h2></summary>
        {#if context.defenceLines.status === 'connected'}
          {#if context.defenceLines.items.length}
            <p class="muted">Historische verdedigingslinies staan als groene stippellijnen op de kaart.</p>
            <ul class="heritage-counts">
              {#each context.defenceLines.items as line}
                <li>{line.label}{line.period ? ` — ${line.period}` : ''}</li>
              {/each}
            </ul>
          {:else}
            <p class="muted">Voor deze locatie zijn geen historische linies gevonden.</p>
          {/if}
        {:else}
          <p class="muted">De bron voor historische linies kon niet worden bereikt.</p>
        {/if}
      </details>

      <details class="data-details">
        <summary><h2><span>Historische groenaanleg</span><small>{context.historicGardens.status === 'connected' ? `${context.historicGardens.items.length} aanleggen` : 'niet bereikbaar'}</small></h2></summary>
        {#if context.historicGardens.status === 'connected'}
          {#if context.historicGardens.items.length}
            <p class="muted">Historische tuin- en landschapsarchitectuur staat als groene vlakken op de kaart.</p>
            <ul class="heritage-counts">
              {#each context.historicGardens.items as garden}
                <li>{garden.label}{garden.category ? ` — ${garden.category}` : ''}</li>
              {/each}
            </ul>
          {:else}
            <p class="muted">Voor deze locatie is geen historische groenaanleg gevonden.</p>
          {/if}
        {:else}
          <p class="muted">De bron voor historische groenaanleg kon niet worden bereikt.</p>
        {/if}
      </details>

      <details class="data-details">
        <summary><h2><span>Bronnen</span><small>{unavailableSourceCount > 0 ? `${unavailableSourceCount} niet bereikbaar` : 'alle beschikbaar'}</small></h2></summary>
        <ul class="source-status" aria-label="Status van databronnen">
          {#each context.sourceStatus as source}
            <li class:unavailable={source.status === 'unavailable'}>
              <span aria-hidden="true"></span>
              <strong>{source.label}</strong>
              <small>{source.status === 'available' ? 'Beschikbaar' : 'Tijdelijk niet beschikbaar'}</small>
            </li>
          {/each}
        </ul>
        <p class="muted">Volledige bronvermelding met licenties staat achter de infoknop rechtsonder.</p>
      </details>
    </div>
  {:else}
    <div class="status">Klik op de kaart om te beginnen.</div>
  {/if}
</aside>

<style>
  .panel {
    height: 100%;
    overflow: auto;
    padding: 28px;
    background: #fffdf8;
    border: 1px solid #d7d9d2;
    border-radius: 16px;
  }
  .eyebrow {
    margin: 0;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: #117865;
  }
  .title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
  .alpha-label {
    flex: none;
    padding: 5px 8px;
    border-radius: 999px;
    background: #18332b;
    color: #fff;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.07em;
  }
  h1 {
    margin: 0;
    font-size: clamp(2rem, 5vw, 3.2rem);
    line-height: 0.98;
    letter-spacing: -0.045em;
  }
  h2 { margin: 0 0 12px; font-size: 1rem; }
  .intro { margin: 16px 0 0; color: #53615c; line-height: 1.55; }
  .test-notice {
    display: grid;
    gap: 3px;
    margin-top: 16px;
    padding: 11px 13px;
    border-left: 4px solid #d7b969;
    border-radius: 8px;
    background: #fff7dd;
    color: #4f462c;
    font-size: 0.84rem;
    line-height: 1.4;
  }
  section {
    padding-top: 22px;
    margin-top: 22px;
    border-top: 1px solid #e3e4de;
  }
  .status, .error {
    margin-top: 24px;
    padding: 14px;
    border-radius: 10px;
    background: #eef4f1;
  }
  .error, .warning { background: #fff0eb; color: #7a2f20; }
  .error { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .error button, .retry-button { min-height: 38px; padding: 7px 11px; border: 1px solid #8b3524; border-radius: 8px; background: #fff; color: #7a2f20; font: inherit; font-weight: 700; cursor: pointer; }
  .warning-banner { display: grid; gap: 8px; margin-top: 24px; }
  .warning-banner .warning { margin: 0; }
  .warning-banner .retry-button { justify-self: start; }
  .coords-caption { margin: 0 0 14px; color: #66716d; font-variant-numeric: tabular-nums; font-size: 0.86rem; }
  .radius-controls { display: grid; gap: 13px; padding: 13px; border: 1px solid #dce3df; border-radius: 10px; background: #f8faf8; }
  .radius-controls label { display: grid; gap: 7px; }
  .radius-controls label span { display: flex; justify-content: space-between; gap: 12px; }
  .radius-controls output { color: #0b6f60; font-weight: 750; }
  .radius-controls input { width: 100%; accent-color: #117865; }
  .radius-controls small { color: #66716d; line-height: 1.4; }
  dt { color: #66716d; }
  dd { margin: 0; font-variant-numeric: tabular-nums; }
  .overview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(88px, 1fr)); gap: 8px; }
  .overview-tile { display: grid; gap: 2px; min-width: 0; padding: 10px 11px; border-radius: 9px; background: #f0f8f5; }
  .overview-tile span { font-size: 1.3rem; font-weight: 750; color: #0b5f50; font-variant-numeric: tabular-nums; }
  .overview-tile small { color: #53615c; overflow-wrap: anywhere; }
  article {
    margin: 10px 0;
    padding: 13px 14px;
    border: 1px solid #dce3df;
    border-radius: 10px;
    background: #f4f8f6;
  }
  article p { margin: 7px 0 0; line-height: 1.45; }
  .badge {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 750;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #0b5f50;
  }
  .detail-list { display: grid; gap: 8px; margin-top: 22px; padding-top: 22px; border-top: 1px solid #e3e4de; }
  .data-details { border: 1px solid #dce3df; border-radius: 10px; background: #f8faf8; }
  .data-details summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 11px 13px;
    cursor: pointer;
    font-weight: 650;
    list-style: none;
  }
  .data-details summary::-webkit-details-marker { display: none; }
  .data-details summary::after { content: '›'; flex: none; transform: rotate(90deg); color: #8da099; font-size: 1.1rem; }
  .data-details[open] summary::after { transform: rotate(-90deg); }
  .data-details summary h2 {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex: 1;
    margin: 0;
    font-size: inherit;
    font-weight: inherit;
  }
  .data-details summary small { color: #66716d; font-weight: 500; }
  .data-details > :not(summary) { margin: 0 13px 13px; }
  .data-details > p:first-of-type, .data-details > ul:first-of-type { margin-top: 2px; }
  .source-status { display: grid; gap: 7px; margin: 0 0 10px; padding: 0; list-style: none; }
  .source-status li { display: grid; grid-template-columns: 9px 1fr auto; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 8px; background: #eef7f3; }
  .source-status li > span { width: 9px; height: 9px; border-radius: 50%; background: #117865; }
  .source-status li small { color: #53615c; }
  .source-status li.unavailable { background: #fff0eb; }
  .source-status li.unavailable > span { background: #a83c25; }
  .muted { color: #69736f; line-height: 1.5; }
  .buildings { display: grid; gap: 8px; margin-top: 12px; }
  .buildings details {
    padding: 10px 12px;
    border: 1px solid #dce3df;
    border-radius: 9px;
    background: #fff;
  }
  .buildings summary { cursor: pointer; font-weight: 650; overflow-wrap: anywhere; }
  .building-data { display: grid; gap: 6px; margin: 12px 0; }
  .building-data div { display: grid; grid-template-columns: 120px 1fr; gap: 10px; }
  .building-data dd { overflow-wrap: anywhere; }
  .data-link { color: #0b6f60; }
  .timeline { position: relative; padding: 8px 4px 2px; }
  .timeline-years { position: relative; display: flex; justify-content: space-between; align-items: end; }
  .timeline-years::after { content: ''; position: absolute; left: 6px; right: 6px; bottom: 5px; height: 2px; background: #c9d2ce; }
  .timeline-years button { position: relative; z-index: 1; display: grid; justify-items: center; gap: 7px; min-width: 34px; padding: 0; border: 0; background: transparent; color: #61706a; font: inherit; cursor: pointer; }
  .timeline-years button span { font-size: 11px; }
  .timeline-years button i { width: 11px; height: 11px; border: 2px solid #8da099; border-radius: 50%; background: #fff; }
  .timeline-years button.active { color: #0b6f60; font-weight: 800; }
  .timeline-years button.active i { width: 15px; height: 15px; border-color: #117865; background: #117865; }
  .timeline > input { width: 100%; margin-top: 10px; accent-color: #117865; }
  .selected-map { margin: 14px 0 0; line-height: 1.45; color: #364b44; }
  .heritage-counts { padding-left: 20px; color: #53615c; }
  .selected-building {
    padding: 16px;
    border: 2px solid #117865;
    border-radius: 10px;
    background: #f0f8f5;
    margin-top: 24px;
  }
  .selected-building h2 { overflow-wrap: anywhere; }

  @media (max-width: 900px) {
    .panel { height: auto; overflow: visible; padding: 24px; }
  }

  @media (max-width: 520px) {
    .panel { padding: 20px 16px; border-radius: 12px; }
    h1 { font-size: 2.35rem; }
    section { padding-top: 18px; margin-top: 18px; }
    .building-data div { grid-template-columns: 105px minmax(0, 1fr); }
    .timeline { margin-inline: -4px; overflow-x: auto; }
    .timeline-years { min-width: 390px; }
  }
</style>
