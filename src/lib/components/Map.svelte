<script lang="ts">
  import { onMount } from 'svelte';
  import type { LandscapeContext } from '$lib/domain';

  let {
    context,
    onselect
  }: {
    context: LandscapeContext | null;
    onselect: (lon: number, lat: number) => void;
  } = $props();

  let container: HTMLDivElement;
  let map: import('maplibre-gl').Map | null = null;
  let marker: import('maplibre-gl').Marker | null = null;

  function syncContext(value: LandscapeContext | null) {
    if (!map || !value) return;

    const source = map.getSource('bag-buildings') as
      | import('maplibre-gl').GeoJSONSource
      | undefined;

    source?.setData(value.current.buildings);
    marker?.setLngLat([value.location.lon, value.location.lat]);
  }

  $effect(() => {
    syncContext(context);
  });

  onMount(async () => {
    const maplibregl = await import('maplibre-gl');

    map = new maplibregl.Map({
      container,
      center: [6.094, 52.512],
      zoom: 13,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
      }
    });

    marker = new maplibregl.Marker({ color: '#111827' })
      .setLngLat([6.094, 52.512])
      .addTo(map);

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      if (!map) return;

      map.addSource('bag-buildings', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'bag-buildings-fill',
        type: 'fill',
        source: 'bag-buildings',
        paint: {
          'fill-color': '#117865',
          'fill-opacity': 0.24
        }
      });

      map.addLayer({
        id: 'bag-buildings-line',
        type: 'line',
        source: 'bag-buildings',
        paint: {
          'line-color': '#0b5f50',
          'line-width': 1.4
        }
      });

      syncContext(context);
    });

    map.on('click', (event) => {
      marker?.setLngLat(event.lngLat);
      onselect(event.lngLat.lng, event.lngLat.lat);
    });

    return () => {
      marker?.remove();
      map?.remove();
      map = null;
    };
  });
</script>

<div class="map-shell">
  <div class="map" bind:this={container}></div>
  <div class="hint">Klik ergens op de kaart om de plek te onderzoeken.</div>
</div>

<style>
  .map-shell {
    position: relative;
    min-height: 580px;
    height: 100%;
    overflow: hidden;
    border-radius: 16px;
    background: #dde3df;
  }
  .map { position: absolute; inset: 0; }
  .hint {
    position: absolute;
    z-index: 2;
    left: 16px;
    top: 16px;
    max-width: min(360px, calc(100% - 32px));
    padding: 9px 12px;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 2px 14px rgba(20, 33, 29, 0.12);
    font-size: 0.88rem;
  }
</style>
