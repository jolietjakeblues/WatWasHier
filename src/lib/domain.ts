import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

export type BuildingFeature = Feature<Geometry, GeoJsonProperties>;

export interface HeritageDetails {
  monumentNumber: string;
  choNumber: string | null;
  registeredAt: string | null;
  address: string | null;
  bagObjectUrl: string | null;
  resourceUrl: string | null;
  description: string | null;
  originalFunction: string | null;
  legalStatus: string | null;
}

export interface ArchaeologyRelation {
  uri: string;
  direction: 'contains' | 'part-of';
  type: string;
  name: string | null;
  choNumber: string | null;
  archisNumber: string | null;
  amount: number | null;
}

export interface ArchaeologyDetails {
  anchorUri: string;
  relations: ArchaeologyRelation[];
  groups: Array<{ type: string; count: number }>;
}

export type AssertionType = 'source_fact' | 'observation' | 'hypothesis';

export interface LocationSelection {
  lon: number;
  lat: number;
  radiusMeters: number;
  bbox: [number, number, number, number];
}

export interface Provenance {
  id: string;
  source: 'pdok-bag' | 'watertijdreis' | 'rce' | 'kadaster' | 'nl-mcp';
  title: string;
  url?: string;
  retrievedAt: string;
  license?: string;
}

export interface Assertion {
  id: string;
  type: AssertionType;
  statement: string;
  sourceIds: string[];
  confidence?: number;
}

export interface HistoricalMap {
  id: string;
  label: string;
  yearStart: number;
  yearEnd: number;
  edition: number;
  manifestUrl: string | null;
  annotationUrl: string;
  georeferencedMap: Record<string, unknown>;
}

export interface LandscapeContext {
  location: LocationSelection;
  current: {
    buildings: FeatureCollection<Geometry, GeoJsonProperties>;
  };
  historical: {
    collectionTitle: string | null;
    collectionUrl: string;
    itemCount: number | null;
    maps: HistoricalMap[];
  };
  heritage: {
    status: 'not-connected' | 'connected';
    objects: FeatureCollection<Geometry, GeoJsonProperties>;
  };
  archaeology: {
    status: 'not-connected' | 'connected';
    objects: FeatureCollection<Geometry, GeoJsonProperties>;
  };
  assertions: Assertion[];
  provenance: Provenance[];
  warnings: string[];
}
