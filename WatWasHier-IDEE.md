# WatWasHier

## Idee- en overdrachtsdocument voor Codex

**Werknaam:** WatWasHier\
**Ondertitel:** Vraag het landschap.\
**Concept:** een bevraagbaar geheugen van het Nederlandse landschap.\
**Repository:** `jolietjakeblues/WatWasHier`

## 1. Kernidee

WatWasHier bouwt voort op Watertijdreis, maar gaat verder dan een
historische kaartviewer.

De centrale vraag is:

> **Wat was hier, wat is hier nu, wat veranderde er en waarom is dat
> interessant?**

Een gebruiker klikt op een plek op de kaart, tekent een gebied of stelt
later een vraag in gewone taal. De applicatie combineert historische
kaarten, actuele geo-data, erfgoedkennis, linked data en thesauri.

Het resultaat is geen stapel kaartlagen en geen vrije AI-chat. Het
resultaat is een controleerbare analyse van een plek door de tijd heen,
met bronvermelding per uitspraak.

Voorbeelden:

-   Wat was hier?
-   Wat lag hier vóór deze woonwijk?
-   Waarom is dit gebied nat?
-   Welke historische waterstructuren zijn verdwenen?
-   Welke oude waterlopen zijn nog herkenbaar?
-   Welke monumenten liggen op of nabij voormalige dijken?
-   Waar zou waterberging historisch logisch kunnen zijn?
-   Welke oude waterwerken lagen hier?
-   Wat veranderde hier tussen 1900 en nu?
-   Vind vergelijkbare landschapsontwikkelingen elders in Nederland.

## 2. Watertijdreis als uitgangspunt

Website: `https://watertijdreis.nl/`

Broncode: `https://github.com/allmaps/watertijdreis`

Data: `https://github.com/tu-delft-heritage/watertijdreis-data`

Watertijdreis ontsluit gegeorefereerde Waterstaatskaarten uit ongeveer
1865-1992. De historische kaartbladen worden met IIIF en Allmaps op een
moderne kaart weergegeven.

Techniek die WatWasHier waar zinvol volgt:

-   SvelteKit
-   MapLibre
-   `@allmaps/maplibre`
-   IIIF
-   Georeference Annotations

WatWasHier kopieert Watertijdreis niet. Watertijdreis wordt één
historische bron binnen een bredere architectuur.

## 3. Van kaartviewer naar landschapsgeheugen

``` text
                 VRAAG
                   |
             "Wat was hier?"
                   |
             +-----v-----+
             | GEO AGENT |
             +-----+-----+
                   |
       +-----------+-----------+
       |           |           |
   HISTORIE      HEDEN      BETEKENIS
       |           |           |
 Watertijdreis   PDOK        RCE / CHO
 IIIF            BAG         thesauri
 Kadaster        BRT/BGT     SKOS
       |           |           |
       +-----------+-----------+
                   |
             tijd + ruimte
                   |
          analyse + kaart
                   |
              provenance
```

De gebruiker hoeft niet te weten welke dataset, API, SPARQL-query,
thesaurus of historische kaart nodig is.

## 4. Beoogde bronnen

### Watertijdreis

Functie:

-   historische Waterstaatskaarten;
-   historische watersystemen;
-   waterlopen;
-   dijken;
-   waterwerken;
-   kaartbeeld door de tijd.

IIIF Collection:

`https://tu-delft-heritage.github.io/watertijdreis-data/collection.json`

Volgende taak:

1.  bepalen welke manifests/georeference annotations een locatie
    afdekken;
2.  beschikbare jaren bepalen;
3.  passende historische kaart renderen;
4.  kaart via `@allmaps/maplibre` bovenop MapLibre leggen.

### PDOK

Functie:

-   actuele geo-data;
-   BAG;
-   BRT/TOP10NL;
-   BGT en andere relevante datasets;
-   kadastrale en watergerelateerde datasets waar beschikbaar.

Prototype 0.1 gebruikt:

`https://api.pdok.nl/kadaster/bag/ogc/v2`

Collectie:

`/collections/pand/items`

De applicatie vraagt GeoJSON op met een BBOX rond het geselecteerde
punt.

### RCE / RCE-MCP

Beoogde functie:

-   CHO;
-   rijksmonumenten;
-   beschermde stads- en dorpsgezichten;
-   buitenplaatsen;
-   groenaanleg;
-   linies;
-   erfgoedobjecten;
-   geometrieën;
-   linked-data-URI's;
-   erfgoedrelaties;
-   thesauri.

RCE-data moet niet alleen een kaartlaag zijn. Relaties en concepten
moeten helpen historische structuren inhoudelijk te begrijpen.

### Thesauri / SKOS

Een vraag als:

> Welke oude waterwerken lagen hier?

moet via gecontroleerde terminologie naar relevante concepten worden
vertaald.

Conceptueel:

``` text
waterwerk
├── gemaal
├── sluis
├── stuw
├── duiker
├── dijk
├── watermolen
└── ...
```

De echte hiërarchie moet uit de gebruikte thesaurus komen, niet uit het
taalmodel.

Gewenste keten:

``` text
gebruikersvraag
      |
      v
conceptherkenning
      |
      v
CHT / ABR / SKOS-thesaurus
      |
      v
concept-URI
      |
      +--> skos:broader
      +--> skos:narrower
      +--> skos:related
      |
      v
zoekopdrachten naar databronnen
```

### Kadaster MCP

Beoogd voor percelen, topografische context, geometrieën en kadastrale
relaties. Inventariseer eerst de werkelijk beschikbare tools en bouw
daarna een adapter.

### NL-MCP

Beoogd voor aanvullende Nederlandse overheidsinformatie, bestuurlijke
context en relevante publieke datasets. Ook hier eerst de beschikbare
tools inventariseren.

## 5. Killer feature: "Wat was hier?"

De eerste gebruikerservaring moet simpel zijn:

1.  Open de kaart.
2.  Klik ergens.
3.  WatWasHier onderzoekt de plek.
4.  Toon een tijd- en brongebonden analyse.

Voorbeeld:

``` text
WAT WAS HIER?

Locatie
Zwolle

NU
- BAG/BRT/PDOK
- huidige bebouwing
- huidige waterstructuur

1990
- historische context

1950
- historische context

1900
- historische context

1870
- Waterstaatskaart

ERFGOED
- CHO-objecten
- monumenten
- historische structuren

WAT VERANDERDE?
- verdwenen waterloop
- nieuwe bebouwing
- gewijzigde perceelsstructuur

MOGELIJKE VERKLARING
- expliciet als hypothese

BRONNEN
- provenance per uitspraak
```

## 6. Feit, observatie en hypothese

Dit onderscheid is een harde functionele eis.

### Bronfeit

Komt rechtstreeks uit een bron.

> Op de Waterstaatskaart van 1933 staat op deze locatie een watergang.

### Berekende observatie

Wordt uit één of meer bronnen berekend.

> De actuele waterloop ligt 42 meter ten oosten van het historische
> tracé.

### Hypothese

Een interpretatie die niet rechtstreeks bewezen is.

> De historische watergang is mogelijk gedempt tijdens de aanleg van de
> woonwijk.

Een taalmodel mag een hypothese nooit ongemerkt als bronfeit
presenteren.

## 7. Provenance

Iedere betekenisvolle uitspraak moet herleidbaar zijn.

``` text
assertion
  +-- statement
  +-- type
  |     +-- source_fact
  |     +-- observation
  |     +-- hypothesis
  +-- sourceIds
  +-- geometry
  +-- time
  +-- confidence
```

Bronrecord:

``` text
provenance
  +-- id
  +-- source
  +-- title
  +-- url / URI
  +-- retrievedAt
  +-- license
```

Later ook query, datasetversie, graph, feature-ID en gebruikte geometrie
vastleggen.

## 8. Architectuur

Laat een LLM niet willekeurig rechtstreeks alle bronnen en MCP's
bevragen.

``` text
frontend
   |
   v
WatWasHier server/API
   |
   +-- water_history()
   +-- current_topography()
   +-- cadastral_context()
   +-- heritage_context()
   +-- terminology()
   |
   v
genormaliseerde LandscapeContext
   |
   +-- facts
   +-- geometries
   +-- concepts
   +-- provenance
   +-- warnings
   |
   v
analyse / change detection / LLM
   |
   v
kaart + tijdlijn + uitleg
```

Voordelen:

-   bronlogica blijft uit de frontend;
-   MCP-details lekken niet door het project;
-   bronnen zijn vervangbaar;
-   resultaten zijn testbaar;
-   provenance blijft behouden;
-   AI krijgt gestructureerde context.

## 9. Intern datamodel

Basis voor prototype 0.1:

``` ts
type AssertionType = 'source_fact' | 'observation' | 'hypothesis';

interface LocationSelection {
  lon: number;
  lat: number;
  radiusMeters: number;
  bbox: [number, number, number, number];
}

interface Provenance {
  id: string;
  source: 'pdok-bag' | 'watertijdreis' | 'rce' | 'kadaster' | 'nl-mcp';
  title: string;
  url?: string;
  retrievedAt: string;
  license?: string;
}

interface Assertion {
  id: string;
  type: AssertionType;
  statement: string;
  sourceIds: string[];
  confidence?: number;
}

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

Later toevoegen:

-   `TemporalExtent`
-   `HistoricalFeature`
-   `Concept`
-   `ConceptRelation`
-   `ChangeEvent`
-   `Evidence`
-   `DatasetQuery`
-   confidence/matchscore.

## 10. Prototype 0.1

Er is al een eerste SvelteKit-startproject gemaakt.

Techniek:

-   SvelteKit
-   Svelte 5
-   TypeScript
-   MapLibre GL
-   `@allmaps/maplibre` als dependency/voorbereiding
-   server-side bronadapters

Functies:

-   kaart opent rond Zwolle;
-   klik selecteert een locatie;
-   BBOX rond punt;
-   standaard zoekstraal 250 meter;
-   PDOK BAG-panden worden server-side opgehaald;
-   GeoJSON BAG-panden worden op de kaart getoond;
-   Watertijdreis IIIF Collection wordt gecontroleerd;
-   resultaten gaan naar `LandscapeContext`;
-   analysepaneel toont assertions;
-   provenance wordt bijgehouden;
-   falende bronnen leveren warnings zodat gedeeltelijke resultaten
    mogelijk blijven.

Controleer endpoints, licenties en API-details opnieuw tijdens
implementatie.

## 11. Voorgestelde projectstructuur

``` text
src/
├── lib/
│   ├── components/
│   │   ├── ContextPanel.svelte
│   │   └── Map.svelte
│   ├── server/
│   │   ├── context.ts
│   │   └── sources/
│   │       ├── pdok.ts
│   │       ├── watertijdreis.ts
│   │       ├── rce.ts
│   │       ├── kadaster.ts
│   │       └── nl.ts
│   ├── domain.ts
│   └── geo.ts
└── routes/
    ├── api/context/+server.ts
    └── +page.svelte
```

## 12. Eerste opdracht voor Codex

### A. Inspecteer de repository

Repository:

`https://github.com/jolietjakeblues/WatWasHier`

Controleer huidige bestanden, package versions, branch, build,
TypeScript/Svelte-fouten en README.

Maak geen grote refactor voordat het prototype draait.

### B. Maak prototype 0.1 schoon werkend

``` bash
npm install
npm run check
npm run build
npm run dev
```

Los fouten op voordat nieuwe functionaliteit wordt toegevoegd.

### C. Valideer PDOK

Controleer het actuele BAG OGC API endpoint en `pand`.

Test:

-   BBOX;
-   CRS;
-   GeoJSON;
-   limieten/paginering;
-   foutafhandeling;
-   bronvermelding;
-   licentie.

### D. Maak Watertijdreis ruimtelijk

Dit is de belangrijkste volgende feature.

Doel:

> klik op locatie -\> vind historische Watertijdreis-kaarten die de
> locatie afdekken.

Analyseer:

`https://github.com/allmaps/watertijdreis`

en:

`https://github.com/tu-delft-heritage/watertijdreis-data`

Bepaal:

-   hoe manifests worden gevonden;
-   waar georeference annotations staan;
-   hoe kaartbladen aan jaren zijn gekoppeld;
-   hoe bounds/dekking worden bepaald;
-   hoe `@allmaps/maplibre` de kaarten rendert.

### E. Render de historische kaart

Na selectie:

-   actuele basemap;
-   historische kaart als overlay;
-   opacity-control;
-   tijdselectie;
-   beschikbare jaren;
-   manifest/annotation-URI in provenance.

Gewenste UX:

``` text
[ 1877 | 1933 | 1965 | 1990 ]

Historische kaart: 1933

[--------------------]
       opacity
```

Later kan een swipe/compare-control worden toegevoegd.

## 13. RCE-adapter

Na Watertijdreis 0.2 volgt RCE.

Doel:

> klik op locatie -\> geef erfgoedcontext rond de plek.

Server-side interface, bijvoorbeeld:

``` ts
interface HeritageSource {
  getContext(selection: LocationSelection): Promise<HeritageContext>;
}
```

Zoek minimaal naar:

-   rijksmonumenten;
-   beschermde gezichten;
-   buitenplaatsen;
-   groenaanleg;
-   linies;
-   relevante CHO-objecten.

Bewaar:

-   object-URI;
-   geometrie;
-   type/concept;
-   naam;
-   tijdinformatie;
-   bron;
-   graph/dataset;
-   relaties.

Stuur geen platte MCP-tekst rechtstreeks naar de UI. Normaliseer eerst.

## 14. Semantische laag

Doel:

> gewone taal vertalen naar controleerbare concept-URI's.

Voorbeeld:

``` text
"oude waterwerken"
        |
        v
concept matching
        |
        v
thesaurusconcept
        |
        +--> narrower
        +--> broader
        +--> related
        |
        v
zoek relevante objecten
```

De UI moet kunnen laten zien waarom iets gevonden werd.

Bijvoorbeeld:

``` text
Gevonden als:
watererfgoed
  > waterwerk
    > gemaal
```

## 15. Change detection

``` text
historische geometrie
        |
        v
spatial matching
        |
        +---- actuele geometrie
        |
        v
afstand / overlap / vorm / relatie
        |
        v
ChangeEvent
```

Voorbeelden:

-   verdwenen waterloop;
-   verplaatste waterloop;
-   nieuwe waterloop;
-   nieuwe bebouwing;
-   verdwenen bebouwing;
-   veranderde perceelsstructuur;
-   oude dijk die als weg herkenbaar is;
-   historische structuur in huidige kadastrale grenzen.

Model:

``` ts
interface ChangeEvent {
  id: string;
  type: string;
  before?: HistoricalFeature;
  after?: CurrentFeature;
  temporalExtent?: TemporalExtent;
  evidence: Evidence[];
  confidence: number;
}
```

De software genereert eerst de observatie. Een LLM helpt daarna
eventueel bij formulering en duiding.

## 16. Vraag het landschap

Voeg natuurlijke taal pas toe nadat de bronlaag betrouwbaar werkt.

Voorbeelden:

-   Waarom is dit gebied nat?
-   Welke waterstructuren zijn hier sinds 1900 verdwenen?
-   Welke monumenten hebben hier een relatie met waterbeheer?
-   Wat veranderde hier tussen 1930 en 1970?
-   Zoek plekken met een vergelijkbare ontwikkeling.

Gewenste keten:

``` text
vraag
  |
  v
intent + concepten + gebied + tijd
  |
  v
bronplanner
  |
  v
bronadapters
  |
  v
LandscapeContext
  |
  v
berekende observaties
  |
  v
LLM synthese
  |
  v
antwoord met provenance
```

## 17. Landschapsdetective

Een toekomstige onderzoeksfunctie kan automatisch veranderingen zoeken.

Voorbeeldselectie:

``` text
Zwolle
water
1870-2026
```

Zoek naar:

-   verdwenen waterlopen;
-   nieuwe waterlopen;
-   verdwenen gemalen/molens;
-   veranderde dijken;
-   verstedelijking van voormalig nat gebied;
-   verdwenen groenstructuren;
-   erfgoedobjecten bij historische waterstructuren;
-   oude structuren herkenbaar in BGT/BAG/BRK.

Hypotheses altijd expliciet als hypothese labelen.

## 18. Vergelijkbare plekken

Toekomstige vraag:

> Vind andere plekken in Nederland met dezelfde ontwikkeling als deze
> plek.

Bijvoorbeeld:

``` text
polder
  -> ontwatering
  -> schaalvergroting
  -> bebouwing
  -> veranderde waterstructuur
```

Combineer daarvoor `ChangeEvent`, thesaurusconcepten, geometrische
kenmerken en temporele patronen.

## 19. Eerste pilot

Start met Zwolle en omgeving.

Een gebied van ongeveer 5 x 5 km is voldoende om de keten te bewijzen:

``` text
Watertijdreis + PDOK + RCE
             |
             v
geïntegreerde tijdanalyse
met kaart + provenance
```

De architectuur mag niet Zwolle-specifiek worden.

## 20. Roadmap

### 0.1 Basis

-   [x] SvelteKit
-   [x] Svelte 5 / TypeScript
-   [x] MapLibre
-   [x] klikbare locatie
-   [x] BBOX
-   [x] PDOK BAG-adapter
-   [x] Watertijdreis IIIF Collection
-   [x] `LandscapeContext`
-   [x] provenance
-   [x] bronfeit / observatie / hypothese

### 0.2 Historische kaart

-   [ ] Watertijdreis-repositories analyseren
-   [ ] manifests voor locatie vinden
-   [ ] georeference annotations uitlezen
-   [ ] kaartdekking bepalen
-   [ ] jaren bepalen
-   [ ] `@allmaps/maplibre` integreren
-   [ ] historische overlay
-   [ ] opacity-control
-   [ ] tijdselectie
-   [ ] provenance per historische kaart

### 0.3 Erfgoed

-   [ ] RCE-MCP inventariseren
-   [ ] server-side RCE-adapter
-   [ ] CHO-objecten
-   [ ] monumenten
-   [ ] beschermde gezichten
-   [ ] buitenplaatsen
-   [ ] groenaanleg
-   [ ] linies
-   [ ] geometrieën
-   [ ] resource-URI's in provenance

### 0.4 Kadaster en NL-MCP

-   [ ] tools inventariseren
-   [ ] Kadaster-adapter
-   [ ] NL-MCP-adapter
-   [ ] relevante datasets kiezen
-   [ ] duplicaten tussen bronnen herkennen

### 0.5 Semantiek

-   [ ] CHT/ABR/SKOS
-   [ ] zoekterm naar concept-URI
-   [ ] `broader`
-   [ ] `narrower`
-   [ ] `related`
-   [ ] conceptpad zichtbaar
-   [ ] controleerbare query-expansie

### 0.6 Veranderingdetectie

-   [ ] historische geometrieën
-   [ ] actuele geometrieën
-   [ ] spatial matching
-   [ ] verdwenen/verplaatste waterloop
-   [ ] nieuwe bebouwing
-   [ ] historische structuur in huidige geometrie
-   [ ] `ChangeEvent`
-   [ ] confidence/evidence

### 0.7 Vraag het landschap

-   [ ] natuurlijke taal
-   [ ] intentdetectie
-   [ ] tijdsperiode
-   [ ] gebied
-   [ ] thesaurusconcepten
-   [ ] bronplanner
-   [ ] synthese uit verzamelde context
-   [ ] bronverwijzing per bewering
-   [ ] hypotheses zichtbaar

## 21. Niet doen

-   Geen MCP-calls vanuit de browser.
-   Geen ongecontroleerde LLM-SPARQL als waarheid.
-   Geen conclusie zonder provenance.
-   Geen hypothese als feit.
-   Geen bron-specifieke datastructuren door de hele frontend.
-   Geen AI-laag bouwen voordat
    `locatie -> bronnen -> context -> observaties` betrouwbaar werkt.

## 22. UX-principes

-   kaart als primaire ingang;
-   één klik moet iets opleveren;
-   geen verplichte datasetkennis;
-   tijd zichtbaar;
-   bronfeit, observatie en hypothese visueel onderscheiden;
-   bronnen aanklikbaar;
-   technische details beschikbaar, maar niet dominant;
-   kaart en uitleg vullen elkaar aan.

Later eventueel expertmodus voor concept-URI's, querydetails, SPARQL,
matchscore en ruwe provenance.

## 23. Technische uitgangspunten

Frontend:

-   SvelteKit
-   Svelte 5
-   TypeScript
-   MapLibre GL

Historische kaarten:

-   IIIF
-   Allmaps
-   `@allmaps/maplibre`

Geo:

-   GeoJSON waar mogelijk;
-   WGS84 aan frontendzijde;
-   expliciete CRS-transformaties;
-   BBOX voor eerste selectie;
-   later polygon/geometry intersection.

Backend:

-   SvelteKit server routes voor prototype;
-   bronadapters;
-   geen secrets in client bundle;
-   timeouts per bron;
-   `Promise.allSettled` voor onafhankelijke bronnen;
-   gedeeltelijke resultaten als een bron faalt.

Later eventueel:

-   caching;
-   PostGIS;
-   background indexing;
-   eigen knowledge graph;
-   embeddings alleen waar linked-data-query niet voldoende is.

## 24. Licenties en bronvermelding

Licentie-informatie hoort in provenance.

Per bron vastleggen:

-   dataset;
-   uitgever;
-   licentie;
-   vereiste attributie;
-   URL/URI;
-   ophaalmoment;
-   eventueel datasetversie.

Controleer alle voorwaarden opnieuw tijdens implementatie.

## 25. Succescriterium eerste echte demo

De demo is geslaagd wanneer iemand zonder uitleg:

1.  WatWasHier opent;
2.  ergens in Zwolle klikt;
3.  actuele kaart ziet;
4.  historische Waterstaatskaart voor die plek kan kiezen;
5.  BAG-objecten ziet;
6.  relevante RCE-objecten ziet;
7.  minimaal één bronfeit en één berekende observatie krijgt;
8.  bij iedere uitspraak de herkomst kan bekijken.

AI-chat is voor deze mijlpaal niet nodig.

## 26. Concrete prompt voor Codex

> Inspecteer de repository `jolietjakeblues/WatWasHier`. Zorg dat
> prototype 0.1 schoon installeert en dat `npm run check` en
> `npm run build` slagen. Analyseer daarna `allmaps/watertijdreis` en
> `tu-delft-heritage/watertijdreis-data`. Implementeer versie 0.2:
> wanneer de gebruiker op de MapLibre-kaart klikt, bepaal welke
> Watertijdreis-kaarten de locatie afdekken, toon beschikbare jaren en
> render de geselecteerde gegeorefereerde historische kaart via Allmaps.
> Behoud het `LandscapeContext`- en provenance-principe. Voeg tests en
> README-documentatie toe. Maak nog geen LLM-functionaliteit voordat
> deze bronketen betrouwbaar werkt.

Daarna:

> Bouw een server-side RCE-adapter die erfgoedobjecten voor dezelfde
> locatie ophaalt en normaliseert naar de bestaande contextstructuur.
> Bewaar URI's, geometrieën, concepten en provenance. Inventariseer
> daarna Kadaster-MCP en NL-MCP en voeg deze via dezelfde
> adapterarchitectuur toe.

## 27. Kern in één zin

**WatWasHier maakt het Nederlandse landschap bevraagbaar door
historische kaarten, actuele geo-data, erfgoedkennis en linked data door
tijd en ruimte met elkaar te verbinden, terwijl iedere conclusie
herleidbaar blijft tot haar bronnen.**
