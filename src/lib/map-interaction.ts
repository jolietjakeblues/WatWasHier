import type { MapGeoJSONFeature } from 'maplibre-gl';

export type LocationOrBuildingAction =
  | { type: 'select-building'; buildingId: string }
  | { type: 'select-location'; lon: number; lat: number };

export type MapAction = { type: 'select-archaeology'; resource: string } | LocationOrBuildingAction;

export function buildingIdFromFeature(feature: Pick<MapGeoJSONFeature, 'id' | 'properties'>): string | null {
  const value = feature.properties?.identificatie ?? feature.id;
  return value === undefined || value === null || value === '' ? null : String(value);
}

export function actionForMapClick(
  buildings: Array<Pick<MapGeoJSONFeature, 'id' | 'properties'>>,
  lon: number,
  lat: number
): LocationOrBuildingAction {
  const buildingId = buildings[0] ? buildingIdFromFeature(buildings[0]) : null;
  return buildingId
    ? { type: 'select-building', buildingId }
    : { type: 'select-location', lon, lat };
}

export function actionForInteractiveClick(
  archaeology: Array<Pick<MapGeoJSONFeature, 'properties'>>,
  buildings: Array<Pick<MapGeoJSONFeature, 'id' | 'properties'>>,
  lon: number,
  lat: number
): MapAction {
  const resource = archaeology[0]?.properties?.resource;
  if (resource) return { type: 'select-archaeology', resource: String(resource) };
  return actionForMapClick(buildings, lon, lat);
}
