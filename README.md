# WatWasHier

**WatWasHier** is een prototype voor een bevraagbaar landschapsgeheugen van Nederland.

Publieke alfa: [https://watwashier.pages.dev](https://watwashier.pages.dev)

> **ALFA 0.4:** dit is een publieke testversie. Gegevens kunnen onvolledig zijn en onderdelen kunnen nog veranderen.

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

## Status: alfa 0.4

Deze eerste versie bewijst de basisarchitectuur.

De alfa draait publiek op Cloudflare Pages. Iedere wijziging op de productiebranch `main` wordt automatisch gebouwd en gepubliceerd.

Na een klik op de kaart:

1. wordt een BBOX rond de gekozen locatie berekend;
2. haalt de server BAG-panden op via de PDOK OGC API Features;
3. zoekt de server welke gegeorefereerde Watertijdreis-kaarten het klikpunt afdekken;
4. worden resultaten genormaliseerd naar één `LandscapeContext`;
5. worden BAG-panden als GeoJSON op de kaart getoond;
6. toont de kaart beschikbare jaren, een historische Allmaps-overlay en een transparantieregelaar;
7. haalt de server beschermde RCE-objecten en CHO-semantiek op;
8. onderscheidt de app Rijksmonumenten, Gezichten en Werelderfgoed;
9. toont de app archeologische terreinen, onderzoeksgebieden en vondstlocaties als ruimtelijke ankers;
10. haalt een detail-API gekoppelde complexen, vondsten en grondsporen op, ook zonder geometrie;
11. krijgt elke uitspraak provenance, inclusief manifest- en resource-URI's.

Externe bronvragen lopen uitsluitend via serveradapters. De browser voert geen MCP- of SPARQL-vragen rechtstreeks uit.

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
  +--> RCE-adapter
  |      +--> PDOK OGC API + RCE CHO
  |
  +--> Archeologie-adapter
  |      +--> CHO SPARQL + relationele detail-API
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

## Bronnen in alfa 0.4

De standaardachtergrond is de rustige **PDOK BRT Achtergrondkaart grijs** van Kadaster. De kaart toont de bronvermelding en CC BY 4.0-licentie in de MapLibre-attributie. Je kunt ook een PDOK-luchtfoto of geen achtergrond kiezen.

Valt een externe databron tijdelijk uit, dan blijven resultaten uit de andere bronnen zichtbaar. De status verschijnt onder **Bronnen**. Met **Bronnen opnieuw proberen** haal je dezelfde locatie nogmaals op.

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

Watertijdreis gebruikt IIIF Manifests en Georeference Annotations. De server leest de gepubliceerde georeferentie-index, toetst het klikpunt aan de kaartpolygonen en sorteert de treffers op jaar. De browser rendert alleen de gekozen kaart met `@allmaps/maplibre`.

Kaartindex:

```text
https://watertijdreis.nl/maps-sorted-by-edition.json
```

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
npm run test
npm run test:e2e
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

- [x] bepalen welke Watertijdreis-manifests de gekozen locatie afdekken
- [x] georeference annotations uitlezen
- [x] historische kaart via `@allmaps/maplibre` renderen
- [x] tijdselectie toevoegen
- [x] transparantie oud versus nieuw
- [ ] schuifvergelijking oud versus nieuw

### 0.3 Erfgoed en archeologie

- [x] server-side RCE-adapter
- [x] CHO-objecten binnen geselecteerd gebied
- [x] monumenten
- [x] beschermde gezichten
- [x] Werelderfgoed
- [x] archeologische ruimtelijke ankers
- [x] gekoppelde records per type
- [x] deduplicatie op relatierichting en CHO-URI
- [x] archeologische detail-API
- [ ] buitenplaatsen
- [ ] groenaanleg
- [ ] linies
- [x] provenance naar resource-URI's
- [x] zichtbare zoekstraalslider voor plekcontext, 25–1000 meter
- [x] afzonderlijke zoekstraalslider voor rijksmonumenten, 100–2000 meter
- [x] zoekcirkels zichtbaar op de kaart tekenen
- [x] straalwaarden in de deelbare URL bewaren
- [x] nieuwe datavraag pas na loslaten van de slider uitvoeren

### 0.4 Foto's en ErfGeo

- [x] RCE-afbeeldingen koppelen op rijksmonumentnummer
- [x] dubbele afbeeldingen uit `image` en `image-1` samenvoegen
- [x] miniatuur, beschrijving, bron en licentie tonen
- [x] klikcoördinaten server-side doorgeven
- [x] woonplaats bepalen via PDOK Reverse en Lookup API
- [x] ErfGeo-plaatsbeschrijvingen op woonplaatsnaam ophalen
- [x] perioden, bron-URI en koppelingsonzekerheid tonen
- [ ] filter op monumenten met foto
- [ ] volledige fotogalerij

### 0.5 Kaartbediening en betrouwbaarheid

- [x] gedeelde server-side fetchlaag met timeout en foutclassificatie
- [x] bronstatus per kerndatabron in het contextmodel en de interface
- [x] Playwright-tests voor kaartklik, gebouwgegevens, lagen, historische doorzichtigheid en deelbare URL
- [x] OpenStreetMap verwijderen omdat deze achtergrond te druk is en afleidt
- [x] OpenStreetMap vervangen door de rustige PDOK BRT Achtergrondkaart grijs
- [x] PDOK BRT-bronvermelding en CC BY 4.0-attributie in de kaart opnemen
- [x] herstelknop tonen wanneer een externe databron tijdelijk uitvalt
- [x] historische kaartselectie en bronherstel met Playwright testen
- [ ] Allmaps pas laden wanneer een historische kaart beschikbaar is zonder de historische laagvolgorde te breken

### 0.5 Semantiek

- [ ] CHT/ABR/SKOS-concepten koppelen
- [ ] zoekterm naar concept-URI
- [ ] `broader`, `narrower` en `related` gebruiken
- [ ] semantische expansie controleerbaar tonen

### 0.6 Veranderingdetectie

- [ ] historische en actuele geometrieën vergelijken
- [ ] verdwenen waterloop
- [ ] verplaatste waterloop
- [ ] nieuwe bebouwing
- [ ] historische structuur nog herkenbaar in huidige geometrie
- [ ] `ChangeEvent`-model

### 0.7 Vraag het landschap

- [ ] natuurlijke taal als ingang
- [ ] toolrouter over bronadapters
- [ ] antwoord uitsluitend uit verzamelde context
- [ ] bronverwijzing per bewering
- [ ] hypotheses zichtbaar labelen
- [ ] onzekerheid vastleggen

## Eerste pilot

De alfa opent tijdelijk bij het Engelse Werk in Zwolle. Een latere publieke versie vraagt na toestemming de locatie van de gebruiker. De architectuur is niet aan één gebied gebonden.

## Hosting

Deze app is niet volledig statisch. `/api/context`, `/api/heritage` en `/api/archaeology/details` voeren server-side bronvragen uit. Daarom gebruikt het project Cloudflare Pages met de officiële SvelteKit Cloudflare-adapter.

Cloudflare-build lokaal controleren:

```bash
npm run build:cloudflare
npm run preview:cloudflare
```

Handmatig publiceren naar het Pages-project `watwashier`:

```bash
npx wrangler login
npm run deploy:cloudflare
```

Voor productie gebruiken we bij voorkeur Cloudflare Pages Git-integratie met de GitHub-repository. Instellingen: buildcommando `npm run build:cloudflare` en uitvoermap `.svelte-kit/cloudflare`.

Publieke productie-URL:

```text
https://watwashier.pages.dev
```

## Deelbare kaartweergave

De app bewaart de gekozen kaarttoestand in de URL. De deelknop gebruikt daardoor een reproduceerbare link naar dezelfde weergave.

| Parameter | Betekenis | Voorbeeld |
| --- | --- | --- |
| `lon`, `lat` | middelpunt van de kaart | `lon=6.067779&lat=52.498626` |
| `zoom` | zoomniveau | `zoom=14.20` |
| `year`, `edition` | gekozen historische kaart | `year=1966&edition=4` |
| `background` | `brt`, `aerial` of `none` | `background=brt` |
| `opacity` | doorzichtigheid historische kaart | `opacity=0.72` |
| `radius`, `heritageRadius` | zoekstraal voor plekcontext en rijksmonumenten in meters | `radius=500&heritageRadius=1200` |
| `history`, `bag`, `monuments`, `faces`, `world`, `archaeology` | zichtbaarheid per kaartlaag, `1` of `0` | `archaeology=1` |

De browser gebruikt waar beschikbaar het systeemeigen deelvenster. Anders kopieert de app de URL naar het klembord.

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
