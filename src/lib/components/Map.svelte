<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { BuildingFeature, LandscapeContext } from '$lib/domain';
  import { actionForMapClick, buildingIdFromFeature } from '$lib/map-interaction';
  import { archaeologyPopup, bagPopup, minuutplanPopup, monumentNumber, municipalityHistoryPopup, rcePopup } from '$lib/feature-popup';
  import type { ArchaeologyDetails, HeritageDetails } from '$lib/domain';
  import { ALPHA_START_LOCATION } from '$lib/locations';
  import { optionalNumber } from '$lib/url-params';

  let { context, selectedBuildingId, selectedHistoricalMapId, historicalOpacity = $bindable(), radiusMeters, heritageRadiusMeters, searchLon, searchLat, onlocationselect, onbuildingselect }: {
    context: LandscapeContext | null;
    selectedBuildingId: string | null;
    selectedHistoricalMapId: string | null;
    historicalOpacity: number;
    radiusMeters: number;
    heritageRadiusMeters: number;
    searchLon: number;
    searchLat: number;
    onlocationselect: (lon: number, lat: number) => void;
    onbuildingselect: (buildingId: string) => void;
  } = $props();

  const emptyCollection = () => ({ type: 'FeatureCollection' as const, features: [] });
  function radiusCircle(lon: number, lat: number, radius: number) {
    const coordinates: [number, number][] = [];
    const latRadians = lat * Math.PI / 180;
    for (let index = 0; index <= 64; index++) {
      const angle = index / 64 * Math.PI * 2;
      coordinates.push([
        lon + Math.cos(angle) * radius / (111_320 * Math.cos(latRadians)),
        lat + Math.sin(angle) * radius / 111_320
      ]);
    }
    return { type: 'FeatureCollection' as const, features: [{ type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [coordinates] } }] };
  }
  const MUNICIPALITY_HISTORY_COLORS = ['#b91c1c', '#1d4ed8', '#0f766e', '#a16207', '#7c3aed', '#be185d', '#0e7490'];
  function municipalityHistoryCollection(landscape: LandscapeContext | null) {
    const periods = landscape?.municipalityHistory.periods ?? [];
    return {
      type: 'FeatureCollection' as const,
      features: periods.map((period, index) => ({
        type: 'Feature' as const,
        geometry: period.geometry,
        properties: {
          label: period.label,
          startYear: period.startYear,
          endYear: period.endYear,
          color: MUNICIPALITY_HISTORY_COLORS[index % MUNICIPALITY_HISTORY_COLORS.length]
        }
      }))
    };
  }
  function minuutplansCollection(landscape: LandscapeContext | null) {
    const sheets = landscape?.minuutplans.sheets ?? [];
    return {
      type: 'FeatureCollection' as const,
      features: sheets.map((sheet) => ({
        type: 'Feature' as const,
        geometry: sheet.geometry,
        properties: {
          code: sheet.code,
          province: sheet.province,
          municipality: sheet.municipality,
          section: sheet.section,
          sheet: sheet.sheet,
          detailUrl: sheet.detailUrl
        }
      }))
    };
  }
  let container: HTMLDivElement;
  let compareContainer = $state<HTMLDivElement>();
  let map: import('maplibre-gl').Map | null = null;
  let marker: import('maplibre-gl').Marker | null = null;
  let popup: import('maplibre-gl').Popup | null = null;
  let historicalLayer: import('@allmaps/maplibre').WarpedMapLayer | null = null;
  let HistoricalLayerConstructor: typeof import('@allmaps/maplibre').WarpedMapLayer | null = null;
  let rendererMapId: string | null = null;
  let renderedHistoricalMapId: string | null = null;
  let historicalRepaintToken = 0;
  let compareMap: import('maplibre-gl').Map | null = null;
  let compareHistoricalLayer: import('@allmaps/maplibre').WarpedMapLayer | null = null;
  let compareRendererMapId: string | null = null;
  let compareRepaintToken = 0;
  let dividerDragging = false;
  let compareMode = $state(false);
  let comparePosition = $state(50);
  let showBuildings = $state(true);
  let showHeritage = $state(true);
  let showFaces = $state(true);
  let showWorldHeritage = $state(true);
  let showArchaeology = $state(true);
  let showMunicipalityHistory = $state(true);
  let showMinuutplans = $state(true);
  let showHistorical = $state(true);
  let layerPanelOpen = $state(false);
  let background = $state<'brt' | 'aerial' | 'none'>('brt');
  let urlReady = false;
  let popupRequest = 0;
  let heritagePanelHtml = $state<string | null>(null);
  let heritagePanel = $state<HTMLElement>();
  let mapReady = $state(false);

  async function showHeritagePanel(html: string) {
    heritagePanelHtml = html;
    await tick();
    heritagePanel?.scrollTo({ top: 0 });
  }
  function syncLayerVisibility() {
    // See the comment in syncHistoricalMap: map.isStyleLoaded() can briefly report false right
    // after the initial batch of addSource/addLayer calls in the 'load' handler, which is exactly
    // where this function is first called from — bailing out on that flicker silently skips
    // applying showBuildings/showHeritage/etc. (e.g. from a shared URL) to the actual map layers.
    if (!map || !map.getLayer('bag-buildings-fill')) return;
    for (const id of ['bag-buildings-fill', 'bag-buildings-line']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showBuildings ? 'visible' : 'none');
    for (const id of ['rce-monuments-fill', 'rce-monuments-points']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showHeritage ? 'visible' : 'none');
    for (const id of ['rce-faces-fill', 'rce-faces-points']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showFaces ? 'visible' : 'none');
    for (const id of ['rce-world-fill', 'rce-world-points']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showWorldHeritage ? 'visible' : 'none');
    for (const id of ['archaeology-areas', 'archaeology-lines', 'archaeology-points']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showArchaeology ? 'visible' : 'none');
    for (const id of ['municipality-history-fill', 'municipality-history-line']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showMunicipalityHistory ? 'visible' : 'none');
    for (const id of ['minuutplans-fill', 'minuutplans-line']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showMinuutplans ? 'visible' : 'none');
    if (showHistorical) syncHistoricalMap();
    else removeHistoricalLayer();
    if (map.getLayer('brt-gray')) map.setLayoutProperty('brt-gray', 'visibility', background === 'brt' ? 'visible' : 'none');
    if (map.getLayer('aerial')) map.setLayoutProperty('aerial', 'visibility', background === 'aerial' ? 'visible' : 'none');
  }

  function paramEnabled(params: URLSearchParams, name: string, fallback = true): boolean {
    const value = params.get(name);
    return value === null ? fallback : value !== '0';
  }

  function updateMapUrl() {
    if (!urlReady) return;
    const url = new URL(window.location.href);
    url.searchParams.set('background', background);
    url.searchParams.set('history', showHistorical ? '1' : '0');
    url.searchParams.set('bag', showBuildings ? '1' : '0');
    url.searchParams.set('monuments', showHeritage ? '1' : '0');
    url.searchParams.set('faces', showFaces ? '1' : '0');
    url.searchParams.set('world', showWorldHeritage ? '1' : '0');
    url.searchParams.set('archaeology', showArchaeology ? '1' : '0');
    url.searchParams.set('gemeenten', showMunicipalityHistory ? '1' : '0');
    url.searchParams.set('minuutplans', showMinuutplans ? '1' : '0');
    url.searchParams.set('opacity', historicalOpacity.toFixed(2));
    history.replaceState(history.state, '', url);
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
    // Not gated on map.isStyleLoaded() (see syncHistoricalMap) — every source lookup below is
    // optional-chained, so calling this before sources exist is already a harmless no-op.
    if (!map) return;
    const buildings = map.getSource('bag-buildings') as import('maplibre-gl').GeoJSONSource | undefined;
    const selection = map.getSource('selected-building') as import('maplibre-gl').GeoJSONSource | undefined;
    const heritage = map.getSource('rce-heritage') as import('maplibre-gl').GeoJSONSource | undefined;
    const archaeology = map.getSource('rce-archaeology') as import('maplibre-gl').GeoJSONSource | undefined;
    const municipalityHistory = map.getSource('municipality-history') as import('maplibre-gl').GeoJSONSource | undefined;
    const minuutplans = map.getSource('minuutplans') as import('maplibre-gl').GeoJSONSource | undefined;
    buildings?.setData(context?.current.buildings ?? emptyCollection());
    heritage?.setData(context?.heritage.objects ?? emptyCollection());
    archaeology?.setData(context?.archaeology.objects ?? emptyCollection());
    municipalityHistory?.setData(municipalityHistoryCollection(context));
    minuutplans?.setData(minuutplansCollection(context));
    const building = findSelectedBuilding();
    selection?.setData(building ? { type: 'FeatureCollection', features: [building] } : emptyCollection());
    if (context) marker?.setLngLat([context.location.lon, context.location.lat]);
  }

  function syncSearchCircles() {
    if (!map) return;
    (map.getSource('search-radius') as import('maplibre-gl').GeoJSONSource | undefined)?.setData(radiusCircle(searchLon, searchLat, radiusMeters));
    (map.getSource('heritage-radius') as import('maplibre-gl').GeoJSONSource | undefined)?.setData(radiusCircle(searchLon, searchLat, heritageRadiusMeters));
  }

  function removeHistoricalLayer() {
    if (map && historicalLayer && map.getLayer(historicalLayer.id)) map.removeLayer(historicalLayer.id);
    historicalLayer = null;
    rendererMapId = null;
    renderedHistoricalMapId = null;
    historicalRepaintToken++;
  }

  // WarpedMapLayer fetches the IIIF image info and its tiles asynchronously, and doesn't reliably
  // schedule a MapLibre repaint itself once that data arrives. Without a nudge, a freshly added
  // historical map can sit fully loaded-but-invisible until an unrelated map interaction (pan/zoom)
  // happens to trigger a repaint. Keep asking for repaints for a few seconds so every async step
  // (image info, then tiles) actually reaches the screen once it resolves.
  function pumpHistoricalRepaint(durationMs = 4000) {
    const token = ++historicalRepaintToken;
    const deadline = performance.now() + durationMs;
    const step = () => {
      if (!map || token !== historicalRepaintToken) return;
      map.triggerRepaint();
      if (performance.now() < deadline) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function syncHistoricalMap() {
    // Note: map.isStyleLoaded() is deliberately not part of this guard. It can briefly report
    // false right after a batch of addSource/addLayer calls (like the ones in the 'load' handler
    // just above this function's call site) even though the style is otherwise ready — bailing out
    // on that flicker silently drops the sync attempt. map.getLayer('bag-buildings-fill') already
    // proves the style is far enough along, since that layer is only added once 'load' has fired.
    if (!map || !context || !showHistorical || !HistoricalLayerConstructor || !map.getLayer('bag-buildings-fill')) return;
    const selected = context.historical.maps.find((item) => item.id === selectedHistoricalMapId);
    const nextId = selected?.id ?? null;
    if (nextId === renderedHistoricalMapId && historicalLayer) return;
    removeHistoricalLayer();
    if (!selected) {
      return;
    }
    historicalLayer = new HistoricalLayerConstructor({ layerId: 'waterstaatskaart' });
    map.addLayer(historicalLayer as unknown as import('maplibre-gl').AddLayerObject, 'bag-buildings-fill');
    rendererMapId = historicalLayer.addGeoreferencedMap(selected.georeferencedMap, {
      visible: true,
      opacity: historicalOpacity,
      applyMask: true,
      transformationType: 'thinPlateSpline'
    });
    renderedHistoricalMapId = nextId;
    pumpHistoricalRepaint();
  }

  function removeCompareHistoricalLayer() {
    if (compareMap && compareHistoricalLayer && compareMap.getLayer(compareHistoricalLayer.id)) compareMap.removeLayer(compareHistoricalLayer.id);
    compareHistoricalLayer = null;
    compareRendererMapId = null;
  }

  function pumpCompareRepaint(durationMs = 4000) {
    const token = ++compareRepaintToken;
    const deadline = performance.now() + durationMs;
    const step = () => {
      if (!compareMap || token !== compareRepaintToken) return;
      compareMap.triggerRepaint();
      if (performance.now() < deadline) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function syncCompareHistoricalLayer() {
    if (!compareMap || !context || !HistoricalLayerConstructor) return;
    const selected = context.historical.maps.find((item) => item.id === selectedHistoricalMapId);
    removeCompareHistoricalLayer();
    if (!selected) return;
    compareHistoricalLayer = new HistoricalLayerConstructor({ layerId: 'waterstaatskaart-compare' });
    compareMap.addLayer(compareHistoricalLayer as unknown as import('maplibre-gl').AddLayerObject);
    compareRendererMapId = compareHistoricalLayer.addGeoreferencedMap(selected.georeferencedMap, {
      visible: true,
      opacity: 1,
      applyMask: true,
      transformationType: 'thinPlateSpline'
    });
    pumpCompareRepaint();
  }

  function destroyCompareMap() {
    compareMap?.remove();
    compareMap = null;
    compareHistoricalLayer = null;
    compareRendererMapId = null;
    compareRepaintToken++;
  }

  async function createCompareMap() {
    if (!map || compareMap) return;
    const maplibregl = await import('maplibre-gl');
    if (!compareMode || !compareContainer || !map) return;
    compareMap = new maplibregl.Map({
      container: compareContainer,
      center: map.getCenter(),
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      style: { version: 8, sources: {}, layers: [] },
      attributionControl: false,
      interactive: false
    });
    compareMap.on('load', () => syncCompareHistoricalLayer());
  }

  function onDividerPointerDown(event: PointerEvent) {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dividerDragging = true;
  }
  function onDividerPointerMove(event: PointerEvent) {
    if (!dividerDragging || !container) return;
    const rect = container.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    comparePosition = Math.min(95, Math.max(5, ratio * 100));
  }
  function onDividerPointerUp(event: PointerEvent) {
    dividerDragging = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  }

  $effect(() => { context; selectedBuildingId; syncData(); });
  $effect(() => { radiusMeters; heritageRadiusMeters; searchLon; searchLat; syncSearchCircles(); });
  $effect(() => { context; selectedHistoricalMapId; syncHistoricalMap(); });
  $effect(() => {
    historicalOpacity;
    compareMode;
    if (historicalLayer && rendererMapId) {
      historicalLayer.setMapOptions(rendererMapId, { opacity: historicalOpacity, visible: !compareMode }, { duration: 0 });
      pumpHistoricalRepaint(500);
    }
    updateMapUrl();
  });
  $effect(() => { showBuildings; showHeritage; showFaces; showWorldHeritage; showArchaeology; showMunicipalityHistory; showMinuutplans; showHistorical; background; syncLayerVisibility(); updateMapUrl(); });
  $effect(() => {
    if (compareMode) void createCompareMap();
    else destroyCompareMap();
  });
  $effect(() => { context; selectedHistoricalMapId; if (compareMode && compareMap?.isStyleLoaded()) syncCompareHistoricalLayer(); });

  onMount(() => {
    let disposed = false;
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const requestedBackground = params.get('background');
      if (requestedBackground === 'osm') background = 'brt';
      if (requestedBackground === 'brt' || requestedBackground === 'aerial' || requestedBackground === 'none') background = requestedBackground;
      showHistorical = paramEnabled(params, 'history');
      showBuildings = paramEnabled(params, 'bag');
      showHeritage = paramEnabled(params, 'monuments');
      showFaces = paramEnabled(params, 'faces');
      showWorldHeritage = paramEnabled(params, 'world');
      showArchaeology = paramEnabled(params, 'archaeology');
      showMunicipalityHistory = paramEnabled(params, 'gemeenten');
      showMinuutplans = paramEnabled(params, 'minuutplans');
      const requestedOpacity = optionalNumber(params, 'opacity');
      if (requestedOpacity !== null && requestedOpacity >= 0 && requestedOpacity <= 1) historicalOpacity = requestedOpacity;
      const requestedLon = optionalNumber(params, 'lon');
      const requestedLat = optionalNumber(params, 'lat');
      const requestedZoom = optionalNumber(params, 'zoom');
      const [maplibregl, allmaps] = await Promise.all([import('maplibre-gl'), import('@allmaps/maplibre')]);
      if (disposed) return;
      HistoricalLayerConstructor = allmaps.WarpedMapLayer;
      map = new maplibregl.Map({
        container,
        center: [requestedLon ?? ALPHA_START_LOCATION.lon, requestedLat ?? ALPHA_START_LOCATION.lat],
        zoom: requestedZoom ?? ALPHA_START_LOCATION.zoom,
        style: {
          version: 8,
          sources: {
            'brt-gray': { type: 'raster', tiles: ['https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/grijs/EPSG:3857/{z}/{x}/{y}.png'], tileSize: 256, attribution: 'Kaart: Kadaster / PDOK, CC BY 4.0' },
            aerial: { type: 'raster', tiles: ['https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_ortho25/EPSG:3857/{z}/{x}/{y}.jpeg'], tileSize: 256, attribution: 'Luchtfoto: PDOK' }
          },
          layers: [
            { id: 'brt-gray', type: 'raster', source: 'brt-gray' },
            { id: 'aerial', type: 'raster', source: 'aerial', layout: { visibility: 'none' } }
          ]
        }
      });
      marker = new maplibregl.Marker({ color: '#111827' }).setLngLat([ALPHA_START_LOCATION.lon, ALPHA_START_LOCATION.lat]).addTo(map);
      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.on('moveend', () => {
        if (!map) return;
        const url = new URL(window.location.href);
        const center = map.getCenter();
        url.searchParams.set('lon', center.lng.toFixed(6));
        url.searchParams.set('lat', center.lat.toFixed(6));
        url.searchParams.set('zoom', map.getZoom().toFixed(2));
        history.replaceState(history.state, '', url);
      });
      map.on('move', () => {
        if (!map || !compareMap) return;
        compareMap.jumpTo({ center: map.getCenter(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() });
      });

      map.on('load', () => {
        if (!map) return;
        map.addSource('heritage-radius', { type: 'geojson', data: radiusCircle(searchLon, searchLat, heritageRadiusMeters) });
        map.addLayer({ id: 'heritage-radius-fill', type: 'fill', source: 'heritage-radius', paint: { 'fill-color': '#7c3aed', 'fill-opacity': 0.035 } });
        map.addLayer({ id: 'heritage-radius-line', type: 'line', source: 'heritage-radius', paint: { 'line-color': '#7c3aed', 'line-width': 1.5, 'line-dasharray': [3, 2] } });
        map.addSource('search-radius', { type: 'geojson', data: radiusCircle(searchLon, searchLat, radiusMeters) });
        map.addLayer({ id: 'search-radius-fill', type: 'fill', source: 'search-radius', paint: { 'fill-color': '#117865', 'fill-opacity': 0.06 } });
        map.addLayer({ id: 'search-radius-line', type: 'line', source: 'search-radius', paint: { 'line-color': '#117865', 'line-width': 2 } });
        map.addSource('municipality-history', { type: 'geojson', data: municipalityHistoryCollection(context) });
        map.addLayer({ id: 'municipality-history-fill', type: 'fill', source: 'municipality-history', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.05 } });
        map.addLayer({ id: 'municipality-history-line', type: 'line', source: 'municipality-history', paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-dasharray': [4, 2], 'line-opacity': 0.85 } });
        map.addSource('minuutplans', { type: 'geojson', data: minuutplansCollection(context) });
        map.addLayer({ id: 'minuutplans-fill', type: 'fill', source: 'minuutplans', paint: { 'fill-color': '#78350f', 'fill-opacity': 0.04 } });
        map.addLayer({ id: 'minuutplans-line', type: 'line', source: 'minuutplans', paint: { 'line-color': '#78350f', 'line-width': 1.5, 'line-dasharray': [1, 2], 'line-opacity': 0.8 } });
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
        urlReady = true;
        mapReady = true;
        updateMapUrl();
      });

      map.on('click', (event) => {
        if (!map || !map.getLayer('bag-buildings-fill')) return;
        const heritageLayers = ['rce-monuments-points', 'rce-monuments-fill', 'rce-faces-points', 'rce-faces-fill', 'rce-world-points', 'rce-world-fill'];
        const heritageHits = map.queryRenderedFeatures(event.point, { layers: heritageLayers });
        const archaeologyHits = map.queryRenderedFeatures(event.point, { layers: ['archaeology-points', 'archaeology-lines', 'archaeology-areas'] });
        const buildingHits = map.queryRenderedFeatures(event.point, { layers: ['bag-buildings-fill'] });
        const municipalityHits = map.queryRenderedFeatures(event.point, { layers: ['municipality-history-line'] });
        const minuutplanHits = map.queryRenderedFeatures(event.point, { layers: ['minuutplans-line'] });

        if (showArchaeology && archaeologyHits[0] && !heritageHits[0]) {
          heritagePanelHtml = null;
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

        if ((showHeritage || showFaces || showWorldHeritage) && heritageHits[0]) {
          const requestId = ++popupRequest;
          const properties = heritageHits[0].properties;
          const registerUrl = properties?.ci_citation ? String(properties.ci_citation) : null;
          const number = monumentNumber(registerUrl);
          const choNumber = properties?.localid ? String(properties.localid).replace(/\.0+$/, '') : null;
          popup?.remove();
          popup = null;
          void showHeritagePanel(rcePopup(properties, null, Boolean(number)));
          if (number) {
            const detailParams = new URLSearchParams({
              lon: String(event.lngLat.lng),
              lat: String(event.lngLat.lat)
            });
            if (choNumber) detailParams.set('cho', choNumber);
            void fetch(`/api/heritage/${number}?${detailParams}`).then(async (response) => {
              if (!response.ok) throw new Error('RCE-details niet beschikbaar');
              return response.json() as Promise<HeritageDetails>;
            }).then((details) => {
              if (requestId === popupRequest) void showHeritagePanel(rcePopup(properties, details));
            }).catch(() => {
              if (requestId === popupRequest) void showHeritagePanel(rcePopup(properties));
            });
          }
          return;
        }
        const action = actionForMapClick(buildingHits, event.lngLat.lng, event.lngLat.lat);
        if (action.type === 'select-building') {
          heritagePanelHtml = null;
          onbuildingselect(action.buildingId);
          popup?.remove();
          popup = new maplibregl.Popup({ closeButton: true, maxWidth: '340px', offset: 10 })
            .setLngLat(event.lngLat)
            .setHTML(bagPopup(buildingHits[0]?.properties ?? null))
            .addTo(map);
          return;
        }
        if (showMunicipalityHistory && municipalityHits[0]) {
          heritagePanelHtml = null;
          popup?.remove();
          popup = new maplibregl.Popup({ closeButton: true, maxWidth: '300px', offset: 10 })
            .setLngLat(event.lngLat)
            .setHTML(municipalityHistoryPopup(municipalityHits[0].properties))
            .addTo(map);
          return;
        }
        if (showMinuutplans && minuutplanHits[0]) {
          heritagePanelHtml = null;
          popup?.remove();
          popup = new maplibregl.Popup({ closeButton: true, maxWidth: '300px', offset: 10 })
            .setLngLat(event.lngLat)
            .setHTML(minuutplanPopup(minuutplanHits[0].properties))
            .addTo(map);
          return;
        }
        popup?.remove();
        heritagePanelHtml = null;
        popupRequest++;
        map.setCenter([action.lon, action.lat]);
        marker?.setLngLat([action.lon, action.lat]);
        onlocationselect(action.lon, action.lat);
      });

      map.on('mousemove', (event) => {
        if (!map || !map.getLayer('bag-buildings-fill')) return;
        const hits = map.queryRenderedFeatures(event.point, { layers: ['bag-buildings-fill', 'rce-monuments-points', 'rce-monuments-fill', 'rce-faces-points', 'rce-faces-fill', 'rce-world-points', 'rce-world-fill', 'archaeology-points', 'archaeology-lines', 'archaeology-areas', 'municipality-history-line', 'minuutplans-line'] });
        map.getCanvas().style.cursor = hits.length ? 'pointer' : 'crosshair';
      });
    })();

    return () => {
      disposed = true;
      marker?.remove();
      popup?.remove();
      map?.remove();
      compareMap?.remove();
      map = null;
      marker = null;
      popup = null;
      historicalLayer = null;
      HistoricalLayerConstructor = null;
      rendererMapId = null;
      renderedHistoricalMapId = null;
      compareMap = null;
      compareHistoricalLayer = null;
      compareRendererMapId = null;
      compareMode = false;
      mapReady = false;
    };
  });
</script>

<div class="map-shell">
  <div class="map" bind:this={container} data-map-ready={mapReady}></div>
  {#if compareMode}
    <div class="compare-clip" style:clip-path="inset(0 {100 - comparePosition}% 0 0)">
      <div class="compare-map" bind:this={compareContainer}></div>
    </div>
    <div
      class="compare-divider"
      style:left="{comparePosition}%"
      role="slider"
      aria-label="Vergelijk oud en nieuw"
      aria-valuemin="5"
      aria-valuemax="95"
      aria-valuenow={Math.round(comparePosition)}
      tabindex="0"
      onpointerdown={onDividerPointerDown}
      onpointermove={onDividerPointerMove}
      onpointerup={onDividerPointerUp}
      onkeydown={(event) => {
        if (event.key === 'ArrowLeft') comparePosition = Math.max(5, comparePosition - 2);
        if (event.key === 'ArrowRight') comparePosition = Math.min(95, comparePosition + 2);
      }}
    >
      <span class="compare-divider__handle" aria-hidden="true">⇔</span>
    </div>
    <div class="compare-label compare-label--old">Toen</div>
    <div class="compare-label compare-label--new">Nu</div>
  {/if}
  <div class="hint">{compareMode ? 'Sleep de lijn om de Waterstaatskaart met nu te vergelijken.' : 'Klik op de kaart voor een gebied. Klik daarna op een pand voor details.'}</div>
  <button class="layer-button" class:active={layerPanelOpen} type="button" aria-label="Open kaartlagen" aria-expanded={layerPanelOpen} onclick={() => layerPanelOpen = !layerPanelOpen}>
    <span aria-hidden="true">◇</span> Lagen
  </button>
  {#if heritagePanelHtml}
    <aside class="heritage-panel" bind:this={heritagePanel} aria-label="Details van het geselecteerde monument" aria-live="polite">
      <button class="heritage-panel__close" type="button" aria-label="Sluit monumentdetails" onclick={() => { heritagePanelHtml = null; popupRequest++; }}>×</button>
      {@html heritagePanelHtml}
    </aside>
  {/if}
  {#if layerPanelOpen}    <div class="layer-control" aria-label="Kaartlagen">
      <header><strong>Kaartlagen</strong><button type="button" aria-label="Sluit kaartlagen" onclick={() => layerPanelOpen = false}>×</button></header>
      <fieldset>
        <legend>Achtergrond</legend>
        <label><input type="radio" name="background" value="brt" bind:group={background} />PDOK BRT grijs</label>
        <label><input type="radio" name="background" value="aerial" bind:group={background} />Satellietbeeld</label>
        <label><input type="radio" name="background" value="none" bind:group={background} />Geen achtergrond</label>
      </fieldset>
      <fieldset>
        <legend>Historische kaart</legend>
        <label><input type="checkbox" bind:checked={showHistorical} /><span class="swatch swatch--history"></span>Waterstaatskaart</label>
        <label class="opacity-control">
          <span>Doorzichtigheid: {Math.round(historicalOpacity * 100)}%</span>
          <input type="range" min="0" max="1" step="0.05" bind:value={historicalOpacity} disabled={!showHistorical || compareMode} />
        </label>
        <label><input type="checkbox" bind:checked={compareMode} disabled={!showHistorical || !selectedHistoricalMapId} /><span class="swatch swatch--compare"></span>Schuifvergelijking oud/nieuw</label>
      </fieldset>
      <fieldset>
        <legend>Objecten</legend>
        <label><input type="checkbox" bind:checked={showBuildings} /><span class="swatch swatch--bag"></span>BAG-panden</label>
        <label><input type="checkbox" bind:checked={showHeritage} /><span class="swatch swatch--rce"></span>Rijksmonumenten</label>
        <label><input type="checkbox" bind:checked={showFaces} /><span class="swatch swatch--faces"></span>Gezichten</label>
        <label><input type="checkbox" bind:checked={showWorldHeritage} /><span class="swatch swatch--world"></span>Werelderfgoed</label>
        <label><input type="checkbox" bind:checked={showArchaeology} /><span class="swatch swatch--archaeology"></span>Archeologie</label>
        <label><input type="checkbox" bind:checked={showMunicipalityHistory} /><span class="swatch swatch--municipality"></span>Gemeentegeschiedenis</label>
        <label><input type="checkbox" bind:checked={showMinuutplans} /><span class="swatch swatch--minuutplans"></span>Kadastrale minuutplans</label>
      </fieldset>
    </div>
  {/if}
</div>

<style>
  .map-shell { position: relative; min-height: 580px; height: 100%; overflow: hidden; border-radius: 16px; background: #dde3df; }
  .map { position: absolute; inset: 0; }
  .compare-clip { position: absolute; z-index: 1; inset: 0; overflow: hidden; pointer-events: none; }
  .compare-map { position: absolute; inset: 0; }
  .compare-divider { position: absolute; z-index: 3; top: 0; bottom: 0; width: 44px; margin-left: -22px; display: flex; align-items: center; justify-content: center; cursor: ew-resize; touch-action: none; }
  .compare-divider::before { content: ''; position: absolute; top: 0; bottom: 0; left: 50%; width: 3px; margin-left: -1.5px; background: rgba(255,255,255,.92); box-shadow: 0 0 0 1px rgba(20,33,29,.18); }
  .compare-divider__handle { position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: #fff; color: #18332b; font-size: 15px; box-shadow: 0 3px 12px rgba(20,33,29,.3); }
  .compare-label { position: absolute; z-index: 2; padding: 5px 11px; border-radius: 20px; background: rgba(24,51,43,.82); color: #fff; font-size: 12px; font-weight: 700; letter-spacing: .03em; pointer-events: none; }
  .compare-label--old { left: 140px; bottom: 16px; }
  .compare-label--new { top: 16px; right: 60px; }
  .heritage-panel { position: absolute; z-index: 5; top: 16px; right: 58px; width: min(390px, calc(100% - 90px)); max-height: calc(100% - 32px); overflow-y: auto; overscroll-behavior: contain; border-radius: 12px; background: #fff; box-shadow: 0 12px 38px rgba(10, 31, 24, 0.28); scrollbar-gutter: stable; }
  .heritage-panel__close { position: sticky; z-index: 2; top: 8px; float: right; width: 32px; height: 32px; margin: 8px 8px -40px 0; border: 0; border-radius: 50%; background: rgba(255,255,255,.94); color: #344b43; font: 700 22px/1 sans-serif; cursor: pointer; box-shadow: 0 1px 5px rgba(10,31,24,.16); }
  .heritage-panel :global(.feature-card) { max-height: none; overflow: visible; }
  .hint { position: absolute; z-index: 2; left: 16px; top: 16px; max-width: min(430px, calc(100% - 32px)); padding: 9px 12px; border-radius: 9px; background: rgba(255, 255, 255, 0.94); box-shadow: 0 2px 14px rgba(20, 33, 29, 0.12); font-size: 0.88rem; pointer-events: none; }
  .layer-button { position: absolute; z-index: 3; left: 16px; bottom: 16px; display: flex; align-items: center; gap: 7px; min-height: 42px; padding: 9px 13px; border: 1px solid #ccd5d1; border-radius: 10px; background: rgba(255,255,255,.96); color: #18332b; box-shadow: 0 4px 18px rgba(20,33,29,.16); font: inherit; font-weight: 750; cursor: pointer; }
  .layer-button.active { background: #18332b; color: #fff; }
  .layer-button span { font-size: 1.25rem; transform: rotate(45deg); }
  .layer-control { position: absolute; z-index: 4; left: 16px; bottom: 68px; display: grid; gap: 14px; width: min(310px, calc(100% - 32px)); max-height: calc(100% - 110px); padding: 16px; overflow: auto; border-radius: 12px; background: rgba(255,255,255,.98); box-shadow: 0 8px 32px rgba(20,33,29,.22); font-size: 13px; }
  .layer-control header { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 15px; }
  .layer-control header button { width: 30px; height: 30px; border: 0; background: transparent; color: #53615c; font-size: 1.5rem; cursor: pointer; }
  .layer-control fieldset { display: grid; gap: 8px; margin: 0; padding: 0 0 13px; border: 0; border-bottom: 1px solid #e3e7e4; }
  .layer-control fieldset:last-child { padding-bottom: 0; border-bottom: 0; }
  .layer-control legend { margin-bottom: 8px; color: #53615c; font-size: 11px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; }
  .layer-control label { display: grid; grid-template-columns: 16px 12px 1fr; align-items: center; gap: 7px; cursor: pointer; }
  .layer-control fieldset:first-of-type label { grid-template-columns: 16px 1fr; }
  .layer-control .opacity-control { display: grid; grid-template-columns: 1fr; gap: 7px; margin: 5px 0 0 23px; color: #53615c; }
  .opacity-control input { width: 100%; accent-color: #117865; }
  .swatch { width: 11px; height: 11px; border-radius: 3px; background: #aaa; }
  .swatch--history { background: #d7b969; }
  .swatch--bag { background: #117865; }
  .swatch--rce { border-radius: 50%; background: #7c3aed; }
  .swatch--faces { background: #e67700; }
  .swatch--world { background: #1565c0; }
  .swatch--archaeology { background: #ca8a04; }
  .swatch--municipality { background: #1d4ed8; }
  .swatch--minuutplans { background: #78350f; }
  .swatch--compare { border-radius: 50%; background: #18332b; }
  .map :global(.maplibregl-popup-content) { max-height: min(620px, calc(100dvh - 96px)); padding: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 32px rgba(10, 31, 24, 0.24); }
  .map :global(.maplibregl-popup-close-button) { z-index: 2; padding: 7px 10px; font-size: 20px; color: #344b43; }
  .map-shell :global(.feature-card) { min-width: 245px; max-height: min(615px, calc(100dvh - 101px)); padding: 18px; overflow-y: auto; overscroll-behavior: contain; border-top: 5px solid #117865; color: #18332b; scrollbar-gutter: stable; }
  .map-shell :global(.feature-card--rce) { border-top-color: #7c3aed; }
  .map-shell :global(.feature-card--archaeology) { border-top-color: #ca8a04; }
  .map-shell :global(.feature-card--municipality) { border-top-color: #1d4ed8; }
  .map-shell :global(.feature-card--minuutplan) { border-top-color: #78350f; }
  .map-shell :global(.feature-card__type) { color: #117865; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
  .map-shell :global(.feature-card--rce .feature-card__type) { color: #6d28d9; }
  .map-shell :global(.feature-card--municipality .feature-card__type) { color: #1d4ed8; }
  .map-shell :global(.feature-card--minuutplan .feature-card__type) { color: #78350f; }
  .map-shell :global(.feature-card h3) { margin: 5px 28px 12px 0; font-size: 17px; line-height: 1.25; }
  .map-shell :global(.feature-card dl) { display: grid; gap: 6px; margin: 0 0 13px; }
  .map-shell :global(.feature-card dl div) { display: grid; grid-template-columns: 105px 1fr; gap: 10px; }
  .map-shell :global(.feature-card dt) { color: #69766f; }
  .map-shell :global(.feature-card dd) { margin: 0; overflow-wrap: anywhere; }
  .map-shell :global(.feature-card a) { color: #0b6f60; font-weight: 700; }
  .map-shell :global(.feature-card__loading) { margin: 0 0 12px; color: #6d28d9; font-size: 12px; }
  .map-shell :global(.feature-card__description) { margin: 0 0 13px; padding-top: 11px; border-top: 1px solid #e4e8e5; color: #40534c; line-height: 1.45; }
  .map-shell :global(.feature-card__description h4) { margin: 0 0 6px; color: #18332b; font-size: 13px; }
  .map-shell :global(.feature-card__description p) { margin: 0 0 8px; }
  .map-shell :global(.feature-card__description details) { margin-top: 6px; }
  .map-shell :global(.feature-card__description summary) { color: #0b6f60; font-weight: 700; cursor: pointer; }
  .map-shell :global(.feature-card__description details p) { margin-top: 9px; white-space: pre-line; }
  .map-shell :global(.feature-card__image-status) { margin: 0 0 13px; padding: 9px 10px; border-radius: 8px; background: #f2f4f3; color: #5c6964; font-size: 12px; }
  .map-shell :global(.feature-card__image) { margin: 0 0 13px; }
  .map-shell :global(.feature-card__image img) { display: block; width: 100%; max-height: 190px; border-radius: 8px; object-fit: cover; background: #edf1ef; }
  .map-shell :global(.feature-card__image figcaption) { margin-top: 6px; color: #69766f; font-size: 11px; line-height: 1.35; }
  .map-shell :global(.feature-card__historical) { margin: 0 0 13px; padding: 10px; border-radius: 8px; background: #f4f0ff; }
  .map-shell :global(.feature-card__historical ul) { margin: 5px 0 0; padding-left: 18px; }
  .map-shell :global(.feature-card__historical small) { display: block; color: #69766f; }
  .map-shell :global(.feature-card__historical summary) { color: #6d28d9; font-weight: 700; cursor: pointer; }
  .map-shell :global(.feature-card__historical summary span) { display: block; margin-top: 2px; color: #69766f; font-size: 11px; font-weight: 500; }
  .map-shell :global(.feature-card__historical p) { margin: 9px 0 0; color: #52615b; font-size: 12px; line-height: 1.4; }
  .map-shell :global(.feature-card h4) { margin: 12px 0 5px; }
  .map-shell :global(.feature-card__groups), .map :global(.feature-card__relations) { margin: 6px 0 12px; padding-left: 20px; }
  .map-shell :global(.feature-card__relations) { max-height: 170px; overflow: auto; }
  .map-shell :global(.feature-card__relations small) { display: block; color: #69766f; }

  @media (max-width: 900px) {
    .map-shell { min-height: 420px; border-radius: 14px; }
  }

  @media (max-width: 520px) {
    .map-shell { min-height: 360px; border-radius: 12px; }
    .heritage-panel { top: auto; right: 10px; bottom: 10px; left: 10px; width: auto; max-height: min(68%, 520px); border-radius: 14px; }
    .hint { left: 10px; top: 10px; max-width: calc(100% - 70px); font-size: 0.78rem; }
    .layer-button { left: 10px; bottom: 10px; }
    .layer-control { left: 10px; bottom: 62px; width: calc(100% - 20px); max-height: calc(100% - 112px); padding: 14px; font-size: 12px; }
    .map :global(.maplibregl-popup-content) { max-width: calc(100vw - 28px); max-height: calc(54dvh - 40px); }
    .map-shell :global(.feature-card) { min-width: 0; width: min(270px, calc(100vw - 52px)); max-height: calc(54dvh - 45px); padding: 15px; }
  }
</style>
