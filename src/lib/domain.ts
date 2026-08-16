import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

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

export interface LandscapeContext {
  location: LocationSelection;
  current: {
    buildings: FeatureCollection<Geometry, GeoJsonProperties>;
  };
  historical: {
    collectionTitle: string | null;
    collectionUrl: string;
    itemCount: number | null;
  };
  heritage: {
    status: 'not-connected' | 'connected';
    objects: unknown[];
  };
  assertions: Assertion[];
  provenance: Provenance[];
  warnings: string[];
}
