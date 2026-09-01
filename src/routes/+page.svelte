<script lang="ts">
  import Map from '$lib/components/Map.svelte';
  import ContextPanel from '$lib/components/ContextPanel.svelte';
  import ContextHelp from '$lib/components/ContextHelp.svelte';
  import AppInfo from '$lib/components/AppInfo.svelte';
  import ShareButton from '$lib/components/ShareButton.svelte';
  import type { LandscapeContext } from '$lib/domain';
  import { chooseHistoricalMap } from '$lib/historical';
  import { ALPHA_START_LOCATION } from '$lib/locations';
  import { optionalNumber } from '$lib/url-params';
  import { onMount } from 'svelte';

  let context = $state<LandscapeContext | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let selectedHistoricalMapId = $state<string | null>(null);
  let historicalOpacity = $state(0.72);
  let selectedBuildingId = $state<string | null>(null);
  let requestCounter = 0;
  let activeRequest: AbortController | null = null;
  let requestedYear: number | null = null;
  let requestedEdition: number | null = null;
  let lastLocation = $state<{ lon: number; lat: number }>({ lon: ALPHA_START_LOCATION.lon, lat: ALPHA_START_LOCATION.lat });
  let radiusMeters = $state(250);
  let heritageRadiusMeters = $state(600);

  function updateUrl(values: Record<string, string | null>) {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(values)) {
      if (value === null) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    history.replaceState(history.state, '', url);
  }

  function contextErrorMessage(status?: number): string {
    if (status === 400) return 'Deze locatie kon niet worden onderzocht. Kies een andere plek op de kaart.';
    if (status && status >= 500) return 'De gegevensservice is tijdelijk niet beschikbaar. Probeer het zo opnieuw.';
    return 'De gegevens konden niet worden opgehaald. Controleer je verbinding en probeer het opnieuw.';
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const lon = optionalNumber(params, 'lon');
    const lat = optionalNumber(params, 'lat');
    const year = optionalNumber(params, 'year');
    const edition = optionalNumber(params, 'edition');
    requestedYear = year !== null && year > 0 ? year : null;
    requestedEdition = edition !== null && edition > 0 ? edition : null;
    const radius = optionalNumber(params, 'radius');
    const heritageRadius = optionalNumber(params, 'heritageRadius');
    radiusMeters = radius === null ? 250 : Math.min(1000, Math.max(25, radius));
    heritageRadiusMeters = heritageRadius === null ? 600 : Math.min(2000, Math.max(100, heritageRadius));
    void selectLocation(
      lon ?? ALPHA_START_LOCATION.lon,
      lat ?? ALPHA_START_LOCATION.lat
    );
  });

  async function selectLocation(lon: number, lat: number) {
    lastLocation = { lon, lat };
    selectedBuildingId = null;
    const requestId = ++requestCounter;
    activeRequest?.abort();
    activeRequest = new AbortController();
    loading = true;
    error = null;
    updateUrl({ lon: lon.toFixed(6), lat: lat.toFixed(6) });

    try {
      const params = new URLSearchParams({
        lon: String(lon),
        lat: String(lat),
        radius: String(radiusMeters),
        heritageRadius: String(heritageRadiusMeters)
      });

      const response = await fetch(`/api/context?${params}`, {
        signal: activeRequest.signal
      });

      if (!response.ok) {
        throw new Error(contextErrorMessage(response.status));
      }

      const data = (await response.json()) as LandscapeContext;

      if (requestId === requestCounter) {
        const previousMap = context?.historical.maps.find(
          (historicalMap) => historicalMap.id === selectedHistoricalMapId
        );
        const requestedMap = data.historical.maps.find((map) =>
          map.yearEnd === requestedYear && (requestedEdition === null || map.edition === requestedEdition)
        );
        const nextMap = requestedMap ?? chooseHistoricalMap(data.historical.maps, previousMap);

        context = data;
        selectedHistoricalMapId = nextMap?.id ?? null;
      }
    } catch (cause) {
      if (requestId === requestCounter) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        error = cause instanceof Error && cause.message
          ? cause.message
          : contextErrorMessage();
      }
    } finally {
      if (requestId === requestCounter) {
        loading = false;
        activeRequest = null;
      }
    }
  }

  function previewRadii() {
    updateUrl({ radius: String(radiusMeters), heritageRadius: String(heritageRadiusMeters) });
  }

  function commitRadii() {
    previewRadii();
    void selectLocation(lastLocation.lon, lastLocation.lat);
  }

  $effect(() => {
    if (!context || !selectedHistoricalMapId) return;
    const map = context.historical.maps.find((item) => item.id === selectedHistoricalMapId);
    if (!map) return;
    updateUrl({ year: String(map.yearEnd), edition: String(map.edition) });
  });
</script>

<svelte:head>
  <title>WatWasHier</title>
  <meta
    name="description"
    content="Een prototype voor een bevraagbaar landschapsgeheugen van Nederland."
  />
</svelte:head>

<main>
  <section class="map-column">
    <Map
      {context}
      {selectedHistoricalMapId}
      bind:historicalOpacity
      {selectedBuildingId}
      {radiusMeters}
      {heritageRadiusMeters}
      searchLon={lastLocation.lon}
      searchLat={lastLocation.lat}
      onlocationselect={selectLocation}
      onbuildingselect={(buildingId) => (selectedBuildingId = buildingId)}
    />
  </section>

  <section class="panel-column">
    <ContextPanel
      {context}
      {loading}
      {error}
      selectedBuilding={context?.current.buildings.features.find((building) => {
        const value = building.properties?.identificatie ?? building.id;
        return value !== undefined && value !== null && String(value) === selectedBuildingId;
      }) ?? null}
      bind:selectedHistoricalMapId
      bind:radiusMeters
      bind:heritageRadiusMeters
      onradiuspreview={previewRadii}
      onradiuscommit={commitRadii}
      onretry={() => selectLocation(lastLocation.lon, lastLocation.lat)}
    />
  </section>
</main>

<ContextHelp />
<AppInfo {context} />
<ShareButton />

<style>
  main {
    height: 100dvh;
    display: grid;
    grid-template-columns: minmax(0, 1.65fr) minmax(330px, 0.75fr);
    gap: 18px;
    padding: 18px;
    overflow: hidden;
  }
  .map-column, .panel-column { min-width: 0; min-height: 0; }
  .panel-column { overflow: hidden; }

  @media (max-width: 900px) {
    main {
      height: auto;
      min-height: 100dvh;
      grid-template-columns: 1fr;
      gap: 12px;
      padding: 12px;
      overflow: visible;
    }
    .map-column { height: min(62dvh, 620px); min-height: 420px; }
    .panel-column { overflow: visible; }
  }

  @media (max-width: 520px) {
    main { gap: 8px; padding: 8px; }
    .map-column { height: 54dvh; min-height: 360px; }
  }
</style>
