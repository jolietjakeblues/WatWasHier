import type { MapGeoJSONFeature } from 'maplibre-gl';

export type LocationOrBuildingAction =
  | { type: 'select-building'; buildingId: string }
  | { type: 'select-location'; lon: number; lat: number };

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
