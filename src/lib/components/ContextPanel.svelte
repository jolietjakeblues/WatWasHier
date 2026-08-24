<script lang="ts">
  import type { BuildingFeature, LandscapeContext, AssertionType } from '$lib/domain';

  let {
    context,
    loading,
    error,
    selectedBuilding,
    selectedHistoricalMapId = $bindable()
  }: {
    context: LandscapeContext | null;
    loading: boolean;
    error: string | null;
    selectedBuilding: BuildingFeature | null;
    selectedHistoricalMapId: string | null;
  } = $props();

  const labels: Record<AssertionType, string> = {
    source_fact: 'Bronfeit',
    observation: 'Observatie',
    hypothesis: 'Hypothese'
  };

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
    <div class="error">{error}</div>
  {:else if context}
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
      <dl class="coords">
        <div><dt>Lengtegraad</dt><dd>{context.location.lon.toFixed(6)}</dd></div>
        <div><dt>Breedtegraad</dt><dd>{context.location.lat.toFixed(6)}</dd></div>
        <div><dt>Zoekstraal</dt><dd>{context.location.radiusMeters} m</dd></div>
      </dl>
    </section>

    <section>
      <h2>Actuele PDOK-data</h2>
      <p class="data-summary">
        <strong>{context.current.buildings.features.length}</strong> BAG-panden opgehaald.
        De groene contouren staan op de kaart.
      </p>
      {#if context.current.buildings.features.length}
        <p class="muted">Hieronder staan de eerste 10 panden uit het geselecteerde gebied.</p>
        <div class="buildings">
          {#each context.current.buildings.features.slice(0, 10) as building}
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

    <section>
      <h2>Wat weten we nu?</h2>
      {#each context.assertions as assertion}
        <article class:type-hypothesis={assertion.type === 'hypothesis'}>
          <span class="badge">{labels[assertion.type]}</span>
          <p>{assertion.statement}</p>
        </article>
      {/each}
    </section>

    <section>
      <h2>Erfgoed</h2>
      {#if context.heritage.status === 'connected'}
        <p><strong>{context.heritage.objects.features.length}</strong> beschermde RCE-objecten gevonden.</p>
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
    </section>

    <section>
      <h2>Archeologie</h2>
      {#if context.archaeology.status === 'connected'}
        <p><strong>{context.archaeology.objects.features.length}</strong> ruimtelijke ankers voor archeologische informatie gevonden.</p>
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
    </section>

    <section>
      <h2>Bronnen</h2>
      <ol class="sources">
        {#each context.provenance as source}
          <li>
            <strong>{source.title}</strong>
            {#if source.url}
              <a href={source.url} target="_blank" rel="noreferrer">Open bron</a>
            {/if}
          </li>
        {/each}
      </ol>
    </section>

    {#if context.warnings.length}
      <section>
        <h2>Waarschuwingen</h2>
        {#each context.warnings as warning}
          <p class="warning">{warning}</p>
        {/each}
      </section>
    {/if}
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
  .coords { display: grid; gap: 8px; margin: 0; }
  .coords div { display: flex; justify-content: space-between; gap: 18px; }
  dt { color: #66716d; }
  dd { margin: 0; font-variant-numeric: tabular-nums; }
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
  .type-hypothesis { border-style: dashed; background: #fffaf0; }
  .sources { margin: 0; padding-left: 20px; }
  .sources li + li { margin-top: 12px; }
  .sources strong, .sources a { display: block; }
  .sources a { margin-top: 3px; color: #0b6f60; }
  .muted { color: #69736f; line-height: 1.5; }
  .data-summary { margin: 0; line-height: 1.5; }
  .buildings { display: grid; gap: 8px; margin-top: 12px; }
  .buildings details {
    padding: 10px 12px;
    border: 1px solid #dce3df;
    border-radius: 9px;
    background: #f8faf8;
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
  .warning { padding: 10px 12px; border-radius: 8px; }
  .heritage-counts { padding-left: 20px; color: #53615c; }
  .selected-building {
    padding: 16px;
    border: 2px solid #117865;
    border-radius: 10px;
    background: #f0f8f5;
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
