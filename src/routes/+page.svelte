<script lang="ts">
  import Map from '$lib/components/Map.svelte';
  import ContextPanel from '$lib/components/ContextPanel.svelte';
  import type { LandscapeContext } from '$lib/domain';
  import { chooseHistoricalMap } from '$lib/historical';
  import { ALPHA_START_LOCATION } from '$lib/locations';
  import { onMount } from 'svelte';

  let context = $state<LandscapeContext | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let selectedHistoricalMapId = $state<string | null>(null);
  let historicalOpacity = $state(0.72);
  let selectedBuildingId = $state<string | null>(null);
  let requestCounter = 0;
  let activeRequest: AbortController | null = null;

  onMount(() => {
    void selectLocation(ALPHA_START_LOCATION.lon, ALPHA_START_LOCATION.lat);
  });

  async function selectLocation(lon: number, lat: number) {
    selectedBuildingId = null;
    const requestId = ++requestCounter;
    activeRequest?.abort();
    activeRequest = new AbortController();
    loading = true;
    error = null;

    try {
      const params = new URLSearchParams({
        lon: String(lon),
        lat: String(lat),
        radius: '250'
      });

      const response = await fetch(`/api/context?${params}`, {
        signal: activeRequest.signal
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }

      const data = (await response.json()) as LandscapeContext;

      if (requestId === requestCounter) {
        const previousMap = context?.historical.maps.find(
          (historicalMap) => historicalMap.id === selectedHistoricalMapId
        );
        const nextMap = chooseHistoricalMap(data.historical.maps, previousMap);

        context = data;
        selectedHistoricalMapId = nextMap?.id ?? null;
      }
    } catch (cause) {
      if (requestId === requestCounter) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        error = cause instanceof Error ? cause.message : String(cause);
      }
    } finally {
      if (requestId === requestCounter) {
        loading = false;
        activeRequest = null;
      }
    }
  }
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
      {historicalOpacity}
      {selectedBuildingId}
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
      bind:historicalOpacity
    />
  </section>
</main>

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
    main { height: auto; min-height: 100dvh; grid-template-columns: 1fr; overflow: visible; }
    .map-column { min-height: 58vh; }
  }
</style>
