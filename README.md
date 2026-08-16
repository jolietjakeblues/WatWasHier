# WatWasHier

**WatWasHier** is een prototype voor een bevraagbaar landschapsgeheugen van Nederland.

Je klikt op een plek op de kaart en het systeem verzamelt context uit meerdere bronnen. Het doel is niet om alleen kaartlagen te stapelen, maar om brondata, tijd, geometrie en betekenis samen te brengen in controleerbare uitspraken.

## Idee

De kernvraag is eenvoudig:

> Wat was hier, wat is hier nu, en wat veranderde er?

De uiteindelijke toepassing combineert onder meer:

- [Watertijdreis](https://watertijdreis.nl/) voor historische waterstaatskaarten;
- [PDOK](https://www.pdok.nl/) voor actuele geodata;
- RCE/CHO voor erfgoedkennis en linked data;
- Kadaster-bronnen voor topografie, gebouwen en percelen;
- thesauri en SKOS voor semantische interpretatie;
- een taalmodel voor synthese, waarbij bronnen en afleidingen expliciet van elkaar gescheiden blijven.

## Status: prototype 0.1

Deze eerste versie bewijst de basisarchitectuur.

Na een klik op de kaart:

1. wordt een BBOX rond de gekozen locatie berekend;
2. haalt de server BAG-panden op via de PDOK OGC API Features;
3. controleert de server de Watertijdreis IIIF Collection;
4. worden resultaten genormaliseerd naar één `LandscapeContext`;
5. worden BAG-panden als GeoJSON op de kaart getoond;
6. krijgt elke uitspraak provenance.

RCE-MCP, NL-MCP en Kadaster-MCP staan bewust nog achter een adaptergrens. MCP-calls horen niet rechtstreeks vanuit browsercode uitgevoerd te worden.

## Belangrijk ontwerpprincipe

WatWasHier maakt drie soorten uitspraken expliciet.

### Bronfeit

Een gegeven dat rechtstreeks uit een bron komt.

> PDOK leverde 38 BAG-panden binnen het geselecteerde gebied.

### Observatie

Een berekende constatering op basis van één of meer bronnen.

> De huidige waterloop ligt 42 meter ten oosten van het historische tracé.

### Hypothese

Een interpretatie die aannemelijk is, maar niet rechtstreeks door een bron wordt bewezen.

> De historische waterloop is mogelijk gedempt bij de aanleg van de woonwijk.

Een hypothese mag nooit ongemerkt als bronfeit worden gepresenteerd.

## Architectuur

```text
Browser
  |
  | klik: lon/lat
  v
/api/context
  |
  +--> PDOK-adapter
  |      +--> BAG OGC API Features
  |
  +--> Watertijdreis-adapter
  |      +--> IIIF Collection
  |
  +--> RCE-adapter             [volgende stap]
  |      +--> RCE-MCP / CHO
  |
  +--> Kadaster-adapter        [volgende stap]
  |
  +--> NL-MCP-adapter          [volgende stap]
  |
  v
LandscapeContext
  |
  +--> geometrieën
  +--> assertions
  +--> provenance
  +--> warnings
  |
  v
kaart + analysepaneel
```

## Datamodel

De centrale structuur staat in `src/lib/domain.ts`.

```ts
interface LandscapeContext {
  location: LocationSelection;
  current: {
    buildings: FeatureCollection;
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
```

Dit model wordt later uitgebreid met tijdintervallen, historische geometrieën, thesaurusconcepten, relaties en change events.

## Bronnen in prototype 0.1

### PDOK BAG

Endpoint:

```text
https://api.pdok.nl/kadaster/bag/ogc/v2
```

Gebruikte collectie:

```text
/collections/pand/items
```

De applicatie vraagt GeoJSON op met een BBOX rond het geselecteerde punt.

### Watertijdreis

IIIF Collection:

```text
https://tu-delft-heritage.github.io/watertijdreis-data/collection.json
```

Watertijdreis gebruikt IIIF Manifests en Georeference Annotations. In 0.1 controleren we de collectie en nemen we de bron op in provenance. De volgende stap is het bepalen en renderen van de historische kaartbladen die de geselecteerde locatie afdekken.

De oorspronkelijke Watertijdreis-app gebruikt SvelteKit, MapLibre en de Allmaps MapLibre-plugin. Daarom gebruikt WatWasHier dezelfde technische familie.

## Installeren

Vereisten:

- Node.js 24 of recenter;
- npm, pnpm of een andere moderne Node package manager.

Met npm:

```bash
npm install
npm run dev
```

Daarna:

```text
http://localhost:5173
```

Controleren:

```bash
npm run check
npm run build
```

## Configuratie

Kopieer indien gewenst `.env.example` naar `.env`.

```bash
cp .env.example .env
```

De standaard publieke endpoints werken zonder API-sleutel.

## Projectstructuur

```text
src/
├── lib/
│   ├── components/
│   │   ├── ContextPanel.svelte
│   │   └── Map.svelte
│   ├── server/
│   │   ├── context.ts
│   │   └── sources/
│   │       ├── pdok.ts
│   │       └── watertijdreis.ts
│   ├── domain.ts
│   └── geo.ts
└── routes/
    ├── api/
    │   └── context/
    │       └── +server.ts
    └── +page.svelte
```

## Roadmap

### 0.1 Basis

- [x] SvelteKit
- [x] MapLibre
- [x] klikbare locatie
- [x] BBOX rond locatie
- [x] PDOK BAG-adapter
- [x] Watertijdreis IIIF-bron
- [x] `LandscapeContext`
- [x] provenance
- [x] onderscheid bronfeit / observatie / hypothese

### 0.2 Historische kaart

- [ ] bepalen welke Watertijdreis-manifests de gekozen locatie afdekken
- [ ] georeference annotations uitlezen
- [ ] historische kaart via `@allmaps/maplibre` renderen
- [ ] tijdselectie toevoegen
- [ ] transparantie/schuifvergelijking oud versus nieuw

### 0.3 Erfgoed

- [ ] server-side RCE-adapter
- [ ] CHO-objecten binnen geselecteerd gebied
- [ ] monumenten
- [ ] beschermde gezichten
- [ ] buitenplaatsen
- [ ] groenaanleg
- [ ] linies
- [ ] provenance naar resource-URI's

### 0.4 Semantiek

- [ ] CHT/ABR/SKOS-concepten koppelen
- [ ] zoekterm naar concept-URI
- [ ] `broader`, `narrower` en `related` gebruiken
- [ ] semantische expansie controleerbaar tonen

### 0.5 Veranderingdetectie

- [ ] historische en actuele geometrieën vergelijken
- [ ] verdwenen waterloop
- [ ] verplaatste waterloop
- [ ] nieuwe bebouwing
- [ ] historische structuur nog herkenbaar in huidige geometrie
- [ ] `ChangeEvent`-model

### 0.6 Vraag het landschap

- [ ] natuurlijke taal als ingang
- [ ] toolrouter over bronadapters
- [ ] antwoord uitsluitend uit verzamelde context
- [ ] bronverwijzing per bewering
- [ ] hypotheses zichtbaar labelen
- [ ] onzekerheid vastleggen

## Eerste pilot

De standaard kaart opent rond Zwolle. Dit is alleen een startpunt. De architectuur is niet aan één gebied gebonden.

Voor een inhoudelijke pilot is een gebied van ongeveer 5 × 5 km genoeg om de keten te bewijzen:

```text
Watertijdreis + PDOK + RCE -> tijdanalyse met provenance
```

## Niet doen

- geen MCP-calls vanuit de browser;
- geen LLM dat ongecontroleerde SPARQL genereert en als feit presenteert;
- geen conclusies zonder provenance;
- geen hypothese vermommen als bronfeit;
- geen bron-specifieke datastructuren door de hele frontend laten lekken.

Bronadapters normaliseren gegevens eerst naar het interne model.

## Licenties en bronvermelding

Controleer bij verdere uitbreiding altijd de licentie en vereiste bronvermelding per dataset.

De BAG OGC API meldt Public Domain Mark 1.0. Voor achtergrondkaarten, Watertijdreis, RCE-data en toekomstige bronnen kunnen andere voorwaarden gelden. Houd licentie-informatie daarom ook in `Provenance`.

## Achtergrond

WatWasHier bouwt voort op ideeën en technieken uit:

- Watertijdreis: https://watertijdreis.nl/
- broncode Watertijdreis: https://github.com/allmaps/watertijdreis
- Watertijdreis-data: https://github.com/tu-delft-heritage/watertijdreis-data
- Allmaps: https://allmaps.org/
- PDOK: https://www.pdok.nl/
- RCE Linked Data: https://linkeddata.cultureelerfgoed.nl/

## Naam

Werknaam: **WatWasHier**

Mogelijke ondertitel:

> Vraag het landschap.

of:

> Een bevraagbaar geheugen van het Nederlandse landschap.
