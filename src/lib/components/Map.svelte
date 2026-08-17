<script lang="ts">
  import { onMount } from 'svelte';
  import type { BuildingFeature, LandscapeContext } from '$lib/domain';
  import { actionForMapClick, buildingIdFromFeature } from '$lib/map-interaction';
  import { archaeologyPopup, bagPopup, monumentNumber, rcePopup } from '$lib/feature-popup';
  import type { ArchaeologyDetails, HeritageDetails } from '$lib/domain';
  import { ALPHA_START_LOCATION } from '$lib/locations';

  let { context, selectedBuildingId, selectedHistoricalMapId, historicalOpacity, onlocationselect, onbuildingselect }: {
    context: LandscapeContext | null;
    selectedBuildingId: string | null;
    selectedHistoricalMapId: string | null;
    historicalOpacity: number;
    onlocationselect: (lon: number, lat: number) => void;
    onbuildingselect: (buildingId: string) => void;
  } = $props();

  const emptyCollection = () => ({ type: 'FeatureCollection' as const, features: [] });
  let container: HTMLDivElement;
  let map: import('maplibre-gl').Map | null = null;
  let marker: import('maplibre-gl').Marker | null = null;
  let popup: import('maplibre-gl').Popup | null = null;
  let historicalLayer: import('@allmaps/maplibre').WarpedMapLayer | null = null;
  let rendererMapId: string | null = null;
  let renderedHistoricalMapId: string | null = null;
  let showBuildings = $state(true);
  let showHeritage = $state(true);
  let showFaces = $state(true);
  let showWorldHeritage = $state(true);
  let showArchaeology = $state(true);
  let showHistorical = $state(true);
  let popupRequest = 0;

  function syncLayerVisibility() {
    if (!map || !map.isStyleLoaded()) return;
    for (const id of ['bag-buildings-fill', 'bag-buildings-line']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showBuildings ? 'visible' : 'none');
    for (const id of ['rce-monuments-fill', 'rce-monuments-points']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showHeritage ? 'visible' : 'none');
    for (const id of ['rce-faces-fill', 'rce-faces-points']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showFaces ? 'visible' : 'none');
    for (const id of ['rce-world-fill', 'rce-world-points']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showWorldHeritage ? 'visible' : 'none');
    for (const id of ['archaeology-areas', 'archaeology-lines', 'archaeology-points']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showArchaeology ? 'visible' : 'none');
    if (historicalLayer && rendererMapId) historicalLayer.setMapOptions(rendererMapId, { visible: showHistorical }, { duration: 0 });
  }

  function findSelectedBuilding(): BuildingFeature | null {
    if (!context || !selectedBuildingId) return null;
    return context.current.buildings.features.find((feature) => {
      const properties = feature.properties ?? {};
      const value = properties.identificatie ?? feature.id;
      return value !== undefined && value !== null && String(value) === selectedBuildingId;
    }) ?? null;
  }

  function syncData() {
    if (!map || !map.isStyleLoaded()) return;
    const buildings = map.getSource('bag-buildings') as import('maplibre-gl').GeoJSONSource | undefined;
    const selection = map.getSource('selected-building') as import('maplibre-gl').GeoJSONSource | undefined;
    const heritage = map.getSource('rce-heritage') as import('maplibre-gl').GeoJSONSource | undefined;
    const archaeology = map.getSource('rce-archaeology') as import('maplibre-gl').GeoJSONSource | undefined;
    buildings?.setData(context?.current.buildings ?? emptyCollection());
    heritage?.setData(context?.heritage.objects ?? emptyCollection());
    archaeology?.setData(context?.archaeology.objects ?? emptyCollection());
    const building = findSelectedBuilding();
    selection?.setData(building ? { type: 'FeatureCollection', features: [building] } : emptyCollection());
    if (context) marker?.setLngLat([context.location.lon, context.location.lat]);
  }

  function syncHistoricalMap() {
    if (!historicalLayer || !context) return;
    const selected = context.historical.maps.find((item) => item.id === selectedHistoricalMapId);
    const nextId = selected?.id ?? null;
    if (nextId === renderedHistoricalMapId) return;
    historicalLayer.clear();
    rendererMapId = null;
    renderedHistoricalMapId = nextId;
    if (!selected) return;
    rendererMapId = historicalLayer.addGeoreferencedMap(selected.georeferencedMap, {
      visible: true,
      opacity: historicalOpacity,
      applyMask: true,
      transformationType: 'thinPlateSpline'
    });
  }

  $effect(() => { context; selectedBuildingId; syncData(); });
  $effect(() => { context; selectedHistoricalMapId; syncHistoricalMap(); });
  $effect(() => {
    historicalOpacity;
    if (historicalLayer && rendererMapId) {
      historicalLayer.setMapOptions(rendererMapId, { opacity: historicalOpacity }, { duration: 0 });
    }
  });
  $effect(() => { showBuildings; showHeritage; showFaces; showWorldHeritage; showArchaeology; showHistorical; syncLayerVisibility(); });

  onMount(() => {
    let disposed = false;
    void (async () => {
      const [maplibregl, allmaps] = await Promise.all([import('maplibre-gl'), import('@allmaps/maplibre')]);
      if (disposed) return;
      map = new maplibregl.Map({
        container,
        center: [ALPHA_START_LOCATION.lon, ALPHA_START_LOCATION.lat],
        zoom: ALPHA_START_LOCATION.zoom,
        style: {
          version: 8,
          sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
        }
      });
      marker = new maplibregl.Marker({ color: '#111827' }).setLngLat([ALPHA_START_LOCATION.lon, ALPHA_START_LOCATION.lat]).addTo(map);
      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      map.on('load', () => {
        if (!map) return;
        historicalLayer = new allmaps.WarpedMapLayer();
        map.addLayer(historicalLayer as unknown as import('maplibre-gl').AddLayerObject);
        map.addSource('bag-buildings', { type: 'geojson', data: emptyCollection() });
        map.addLayer({ id: 'bag-buildings-fill', type: 'fill', source: 'bag-buildings', paint: { 'fill-color': '#117865', 'fill-opacity': 0.3 } });
        map.addLayer({ id: 'bag-buildings-line', type: 'line', source: 'bag-buildings', paint: { 'line-color': '#075a4b', 'line-width': 1.5 } });
        map.addSource('selected-building', { type: 'geojson', data: emptyCollection() });
        map.addLayer({ id: 'selected-building-fill', type: 'fill', source: 'selected-building', paint: { 'fill-color': '#f4b942', 'fill-opacity': 0.65 } });
        map.addLayer({ id: 'selected-building-line', type: 'line', source: 'selected-building', paint: { 'line-color': '#754600', 'line-width': 3 } });
        map.addSource('rce-heritage', { type: 'geojson', data: emptyCollection() });
        const typeFilter = (geometry: 'Point' | 'Polygon', heritageType: string) => ['all', ['==', '$type', geometry], ['==', 'heritageType', heritageType]] as import('maplibre-gl').FilterSpecification;
        map.addLayer({ id: 'rce-monuments-fill', type: 'fill', source: 'rce-heritage', filter: typeFilter('Polygon', 'monument'), paint: { 'fill-color': '#7c3aed', 'fill-opacity': 0.24, 'fill-outline-color': '#5b21b6' } });
        map.addLayer({ id: 'rce-monuments-points', type: 'circle', source: 'rce-heritage', filter: typeFilter('Point', 'monument'), paint: { 'circle-radius': 6, 'circle-color': '#7c3aed', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
        map.addLayer({ id: 'rce-faces-fill', type: 'fill', source: 'rce-heritage', filter: typeFilter('Polygon', 'face'), paint: { 'fill-color': '#e67700', 'fill-opacity': 0.18, 'fill-outline-color': '#b45309' } });
        map.addLayer({ id: 'rce-faces-points', type: 'circle', source: 'rce-heritage', filter: typeFilter('Point', 'face'), paint: { 'circle-radius': 7, 'circle-color': '#e67700', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
        map.addLayer({ id: 'rce-world-fill', type: 'fill', source: 'rce-heritage', filter: typeFilter('Polygon', 'world-heritage'), paint: { 'fill-color': '#1565c0', 'fill-opacity': 0.18, 'fill-outline-color': '#0d47a1' } });
        map.addLayer({ id: 'rce-world-points', type: 'circle', source: 'rce-heritage', filter: typeFilter('Point', 'world-heritage'), paint: { 'circle-radius': 8, 'circle-color': '#1565c0', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
        map.addSource('rce-archaeology', { type: 'geojson', data: emptyCollection() });
        map.addLayer({ id: 'archaeology-areas', type: 'fill', source: 'rce-archaeology', filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': ['match', ['get', 'archaeologyType'], 'ArcheologischTerrein', '#b45309', 'Vondstlocatie', '#dc2626', '#ca8a04'], 'fill-opacity': 0.16 } });
        map.addLayer({ id: 'archaeology-lines', type: 'line', source: 'rce-archaeology', filter: ['==', '$type', 'Polygon'], paint: { 'line-color': ['match', ['get', 'archaeologyType'], 'ArcheologischTerrein', '#92400e', 'Vondstlocatie', '#991b1b', '#854d0e'], 'line-width': 2, 'line-dasharray': [3, 2] } });
        map.addLayer({ id: 'archaeology-points', type: 'circle', source: 'rce-archaeology', filter: ['==', '$type', 'Point'], paint: { 'circle-radius': 7, 'circle-color': '#dc2626', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
        syncData();
        syncHistoricalMap();
        syncLayerVisibility();
      });

      map.on('click', (event) => {
        if (!map || !map.getLayer('bag-buildings-fill')) return;
        const heritageLayers = ['rce-monuments-points', 'rce-monuments-fill', 'rce-faces-points', 'rce-faces-fill', 'rce-world-points', 'rce-world-fill'];
        const heritageHits = map.queryRenderedFeatures(event.point, { layers: heritageLayers });
        const archaeologyHits = map.queryRenderedFeatures(event.point, { layers: ['archaeology-points', 'archaeology-lines', 'archaeology-areas'] });
        const buildingHits = map.queryRenderedFeatures(event.point, { layers: ['bag-buildings-fill'] });

        if (archaeologyHits[0]) {
          const requestId = ++popupRequest;
          const properties = archaeologyHits[0].properties;
          const resource = properties?.resource ? String(properties.resource) : null;
          popup?.remove();
          popup = new maplibregl.Popup({ closeButton: true, maxWidth: '380px', offset: 10 }).setLngLat(event.lngLat).setHTML(archaeologyPopup(properties, null, Boolean(resource))).addTo(map);
          if (resource) void fetch(`/api/archaeology/details?uri=${encodeURIComponent(resource)}`).then(async (response) => {
            if (!response.ok) throw new Error('Archeologische details niet beschikbaar');
            return response.json() as Promise<ArchaeologyDetails>;
          }).then((details) => {
            if (requestId === popupRequest) popup?.setHTML(archaeologyPopup(properties, details));
          }).catch(() => {
            if (requestId === popupRequest) popup?.setHTML(archaeologyPopup(properties));
          });
          return;
        }

        if (heritageHits[0]) {
          const requestId = ++popupRequest;
          const properties = heritageHits[0].properties;
          const registerUrl = properties?.ci_citation ? String(properties.ci_citation) : null;
          const number = monumentNumber(registerUrl);
          const choNumber = properties?.localid ? String(properties.localid).replace(/\.0+$/, '') : null;
          popup?.remove();
          popup = new maplibregl.Popup({ closeButton: true, maxWidth: '340px', offset: 10 })
            .setLngLat(event.lngLat)
            .setHTML(rcePopup(properties, null, Boolean(number)))
            .addTo(map);
          if (number) void fetch(`/api/heritage/${number}${choNumber ? `?cho=${encodeURIComponent(choNumber)}` : ''}`).then(async (response) => {
            if (!response.ok) throw new Error('RCE-details niet beschikbaar');
            return response.json() as Promise<HeritageDetails>;
          }).then((details) => {
            if (requestId === popupRequest) popup?.setHTML(rcePopup(properties, details));
          }).catch(() => {
            if (requestId === popupRequest) popup?.setHTML(rcePopup(properties));
          });
          return;
        }

        const action = actionForMapClick(buildingHits, event.lngLat.lng, event.lngLat.lat);
        if (action.type === 'select-building') {
          onbuildingselect(action.buildingId);
          popup?.remove();
          popup = new maplibregl.Popup({ closeButton: true, maxWidth: '340px', offset: 10 })
            .setLngLat(event.lngLat)
            .setHTML(bagPopup(buildingHits[0]?.properties ?? null))
            .addTo(map);
          return;
        }
        popup?.remove();
        popupRequest++;
        map.setCenter([action.lon, action.lat]);
        marker?.setLngLat([action.lon, action.lat]);
        onlocationselect(action.lon, action.lat);
      });

      map.on('mousemove', (event) => {
        if (!map || !map.getLayer('bag-buildings-fill')) return;
        const hits = map.queryRenderedFeatures(event.point, { layers: ['bag-buildings-fill', 'rce-monuments-points', 'rce-monuments-fill', 'rce-faces-points', 'rce-faces-fill', 'rce-world-points', 'rce-world-fill', 'archaeology-points', 'archaeology-lines', 'archaeology-areas'] });
        map.getCanvas().style.cursor = hits.length ? 'pointer' : 'crosshair';
      });
    })();

    return () => {
      disposed = true;
      marker?.remove();
      popup?.remove();
      map?.remove();
      map = null;
      marker = null;
      popup = null;
      historicalLayer = null;
      rendererMapId = null;
      renderedHistoricalMapId = null;
    };
  });
</script>

<div class="map-shell">
  <div class="map" bind:this={container}></div>
  <div class="hint">Klik op de kaart voor een gebied. Klik daarna op een groen pand voor details.</div>
  <div class="layer-control" aria-label="Kaartlagen">
    <strong>Kaartlagen</strong>
    <label><input type="checkbox" bind:checked={showHistorical} /><span class="swatch swatch--history"></span>Historische kaart</label>
    <label><input type="checkbox" bind:checked={showBuildings} /><span class="swatch swatch--bag"></span>BAG-panden</label>
    <label><input type="checkbox" bind:checked={showHeritage} /><span class="swatch swatch--rce"></span>Rijksmonumenten</label>
    <label><input type="checkbox" bind:checked={showFaces} /><span class="swatch swatch--faces"></span>Gezichten</label>
    <label><input type="checkbox" bind:checked={showWorldHeritage} /><span class="swatch swatch--world"></span>Werelderfgoed</label>
    <label><input type="checkbox" bind:checked={showArchaeology} /><span class="swatch swatch--archaeology"></span>Archeologie</label>
  </div>
</div>

<style>
  .map-shell { position: relative; min-height: 580px; height: 100%; overflow: hidden; border-radius: 16px; background: #dde3df; }
  .map { position: absolute; inset: 0; }
  .hint { position: absolute; z-index: 2; left: 16px; top: 16px; max-width: min(430px, calc(100% - 32px)); padding: 9px 12px; border-radius: 9px; background: rgba(255, 255, 255, 0.94); box-shadow: 0 2px 14px rgba(20, 33, 29, 0.12); font-size: 0.88rem; pointer-events: none; }
  .layer-control { position: absolute; z-index: 3; left: 16px; bottom: 16px; display: grid; gap: 7px; padding: 12px 14px; border-radius: 10px; background: rgba(255,255,255,.95); box-shadow: 0 4px 18px rgba(20,33,29,.16); font-size: 13px; }
  .layer-control label { display: grid; grid-template-columns: 16px 12px 1fr; align-items: center; gap: 7px; cursor: pointer; }
  .swatch { width: 11px; height: 11px; border-radius: 3px; background: #aaa; }
  .swatch--history { background: #d7b969; }
  .swatch--bag { background: #117865; }
  .swatch--rce { border-radius: 50%; background: #7c3aed; }
  .swatch--faces { background: #e67700; }
  .swatch--world { background: #1565c0; }
  .swatch--archaeology { background: #ca8a04; }
  .map :global(.maplibregl-popup-content) { padding: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 32px rgba(10, 31, 24, 0.24); }
  .map :global(.maplibregl-popup-close-button) { z-index: 2; padding: 7px 10px; font-size: 20px; color: #344b43; }
  .map :global(.feature-card) { min-width: 245px; padding: 18px; border-top: 5px solid #117865; color: #18332b; }
  .map :global(.feature-card--rce) { border-top-color: #7c3aed; }
  .map :global(.feature-card--archaeology) { border-top-color: #ca8a04; }
  .map :global(.feature-card__type) { color: #117865; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
  .map :global(.feature-card--rce .feature-card__type) { color: #6d28d9; }
  .map :global(.feature-card h3) { margin: 5px 28px 12px 0; font-size: 17px; line-height: 1.25; }
  .map :global(.feature-card dl) { display: grid; gap: 6px; margin: 0 0 13px; }
  .map :global(.feature-card dl div) { display: grid; grid-template-columns: 105px 1fr; gap: 10px; }
  .map :global(.feature-card dt) { color: #69766f; }
  .map :global(.feature-card dd) { margin: 0; overflow-wrap: anywhere; }
  .map :global(.feature-card a) { color: #0b6f60; font-weight: 700; }
  .map :global(.feature-card__loading) { margin: 0 0 12px; color: #6d28d9; font-size: 12px; }
  .map :global(.feature-card__description) { max-height: 130px; margin: 0 0 13px; overflow: auto; color: #40534c; line-height: 1.45; }
  .map :global(.feature-card h4) { margin: 12px 0 5px; }
  .map :global(.feature-card__groups), .map :global(.feature-card__relations) { margin: 6px 0 12px; padding-left: 20px; }
  .map :global(.feature-card__relations) { max-height: 170px; overflow: auto; }
  .map :global(.feature-card__relations small) { display: block; color: #69766f; }
</style>
