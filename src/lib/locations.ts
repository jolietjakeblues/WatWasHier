// Tijdelijke alfa-fallback en vaste regressietest. In productie krijgt de
// locatie van de gebruiker, na expliciete toestemming, voorrang.
export const ALPHA_START_LOCATION = {
  name: 'Het Engelse Werk, Zwolle',
  lon: 6.0668,
  lat: 52.495,
  zoom: 14,
  referenceYear: 1976
} as const;
