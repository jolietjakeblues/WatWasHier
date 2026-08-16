<script lang="ts">
  import type { LandscapeContext, AssertionType } from '$lib/domain';

  let {
    context,
    loading,
    error
  }: {
    context: LandscapeContext | null;
    loading: boolean;
    error: string | null;
  } = $props();

  const labels: Record<AssertionType, string> = {
    source_fact: 'Bronfeit',
    observation: 'Observatie',
    hypothesis: 'Hypothese'
  };
</script>

<aside class="panel">
  <header>
    <p class="eyebrow">Landschapsgeheugen</p>
    <h1>Wat was hier?</h1>
    <p class="intro">
      Selecteer een plek. We combineren actuele geodata, historische kaarten en later
      erfgoedkennis, met provenance per uitspraak.
    </p>
  </header>

  {#if loading}
    <div class="status">Bronnen worden bevraagd…</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if context}
    <section>
      <h2>Locatie</h2>
      <dl class="coords">
        <div><dt>Lengtegraad</dt><dd>{context.location.lon.toFixed(6)}</dd></div>
        <div><dt>Breedtegraad</dt><dd>{context.location.lat.toFixed(6)}</dd></div>
        <div><dt>Zoekstraal</dt><dd>{context.location.radiusMeters} m</dd></div>
      </dl>
    </section>

    <section>
      <h2>Wat weten we nu?</h2>
      {#each context.assertions as assertion}
        <article class:type-hypothesis={assertion.type === 'hypothesis'}>
          <span class="badge">{labels[assertion.type]}</span>
          <p>{assertion.statement}</p>
        </article>
      {/each}
    </section>

    <section>
      <h2>Erfgoed</h2>
      <p class="muted">
        RCE-MCP is bewust nog niet rechtstreeks vanuit de browser gekoppeld. De volgende
        stap is een server-side adapter die dezelfde contextstructuur vult.
      </p>
    </section>

    <section>
      <h2>Bronnen</h2>
      <ol class="sources">
        {#each context.provenance as source}
          <li>
            <strong>{source.title}</strong>
            {#if source.url}
              <a href={source.url} target="_blank" rel="noreferrer">Open bron</a>
            {/if}
          </li>
        {/each}
      </ol>
    </section>

    {#if context.warnings.length}
      <section>
        <h2>Waarschuwingen</h2>
        {#each context.warnings as warning}
          <p class="warning">{warning}</p>
        {/each}
      </section>
    {/if}
  {:else}
    <div class="status">Klik op de kaart om te beginnen.</div>
  {/if}
</aside>

<style>
  .panel {
    height: 100%;
    overflow: auto;
    padding: 28px;
    background: #fffdf8;
    border: 1px solid #d7d9d2;
    border-radius: 16px;
  }
  .eyebrow {
    margin: 0 0 6px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: #117865;
  }
  h1 {
    margin: 0;
    font-size: clamp(2rem, 5vw, 3.2rem);
    line-height: 0.98;
    letter-spacing: -0.045em;
  }
  h2 { margin: 0 0 12px; font-size: 1rem; }
  .intro { margin: 16px 0 0; color: #53615c; line-height: 1.55; }
  section {
    padding-top: 22px;
    margin-top: 22px;
    border-top: 1px solid #e3e4de;
  }
  .status, .error {
    margin-top: 24px;
    padding: 14px;
    border-radius: 10px;
    background: #eef4f1;
  }
  .error, .warning { background: #fff0eb; color: #7a2f20; }
  .coords { display: grid; gap: 8px; margin: 0; }
  .coords div { display: flex; justify-content: space-between; gap: 18px; }
  dt { color: #66716d; }
  dd { margin: 0; font-variant-numeric: tabular-nums; }
  article {
    margin: 10px 0;
    padding: 13px 14px;
    border: 1px solid #dce3df;
    border-radius: 10px;
    background: #f4f8f6;
  }
  article p { margin: 7px 0 0; line-height: 1.45; }
  .badge {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 750;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #0b5f50;
  }
  .type-hypothesis { border-style: dashed; background: #fffaf0; }
  .sources { margin: 0; padding-left: 20px; }
  .sources li + li { margin-top: 12px; }
  .sources strong, .sources a { display: block; }
  .sources a { margin-top: 3px; color: #0b6f60; }
  .muted { color: #69736f; line-height: 1.5; }
  .warning { padding: 10px 12px; border-radius: 8px; }
</style>
