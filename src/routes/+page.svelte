<script lang="ts">
  import Map from '$lib/components/Map.svelte';
  import ContextPanel from '$lib/components/ContextPanel.svelte';
  import type { LandscapeContext } from '$lib/domain';

  let context = $state<LandscapeContext | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let requestCounter = 0;

  async function selectLocation(lon: number, lat: number) {
    const requestId = ++requestCounter;
    loading = true;
    error = null;

    try {
      const params = new URLSearchParams({
        lon: String(lon),
        lat: String(lat),
        radius: '250'
      });

      const response = await fetch(`/api/context?${params}`);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }

      const data = (await response.json()) as LandscapeContext;

      if (requestId === requestCounter) context = data;
    } catch (cause) {
      if (requestId === requestCounter) {
        error = cause instanceof Error ? cause.message : String(cause);
      }
    } finally {
      if (requestId === requestCounter) loading = false;
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
    <Map {context} onselect={selectLocation} />
  </section>

  <section class="panel-column">
    <ContextPanel {context} {loading} {error} />
  </section>
</main>

<style>
  main {
    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(0, 1.65fr) minmax(330px, 0.75fr);
    gap: 18px;
    padding: 18px;
  }
  .map-column, .panel-column { min-width: 0; }

  @media (max-width: 900px) {
    main { grid-template-columns: 1fr; }
    .map-column { min-height: 58vh; }
  }
</style>
