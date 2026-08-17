<script lang="ts">
  import type { LandscapeContext } from '$lib/domain';

  let { context }: { context: LandscapeContext | null } = $props();
  let open = $state(false);

  function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('nl-NL', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && open && (open = false)} />

<button class="info-button" type="button" aria-label="Open informatie en bronnen" aria-expanded={open} onclick={() => open = true}>i</button>

{#if open}
  <div class="backdrop">
    <div class="info-dialog" role="dialog" aria-modal="true" aria-labelledby="info-title">
      <header>
        <div><span>Over deze alfa</span><h2 id="info-title">WatWasHier</h2></div>
        <button type="button" aria-label="Sluit informatie" onclick={() => open = false}>×</button>
      </header>

      <div class="content">
        <section>
          <h3>Vraag het landschap</h3>
          <p>WatWasHier verbindt actuele geodata, historische kaarten, erfgoed en archeologische linked data rond één gekozen plek.</p>
        </section>

        <section>
          <h3>Hoe lees je de resultaten?</h3>
          <dl class="assertion-types">
            <div><dt>Bronfeit</dt><dd>Komt rechtstreeks uit een bron.</dd></div>
            <div><dt>Observatie</dt><dd>Wordt uit één of meer bronnen berekend.</dd></div>
            <div><dt>Hypothese</dt><dd>Is een herkenbaar gelabelde interpretatie.</dd></div>
          </dl>
        </section>

        <section>
          <h3>Bronnen voor deze plek</h3>
          {#if context?.provenance.length}
            <ol class="sources">
              {#each context.provenance as source}
                <li>
                  <strong>{source.title}</strong>
                  <small>Opgehaald: {formatDate(source.retrievedAt)}</small>
                  {#if source.license}<small>Licentie: {source.license}</small>{/if}
                  {#if source.url}<a href={source.url} target="_blank" rel="noreferrer">Open bron</a>{/if}
                </li>
              {/each}
            </ol>
          {:else}
            <p class="muted">Kies een plek om de gebruikte bronnen en ophaalmomenten te bekijken.</p>
          {/if}
        </section>

        <section>
          <h3>Techniek en verantwoording</h3>
          <p>De app gebruikt SvelteKit, MapLibre, Allmaps, PDOK en linked data van de Rijksdienst voor het Cultureel Erfgoed. Niet ieder archeologisch record heeft een eigen geometrie.</p>
          <a href="https://github.com/jolietjakeblues/WatWasHier" target="_blank" rel="noreferrer">Bekijk broncode en documentatie</a>
        </section>

        <p class="alpha-note"><strong>ALFA 0.3</strong> Gegevens kunnen onvolledig zijn en onderdelen kunnen nog veranderen.</p>
      </div>
    </div>
  </div>
{/if}

<style>
  .info-button { position: fixed; z-index: 20; right: 82px; bottom: 26px; width: 46px; height: 46px; border: 1px solid #bdc9c4; border-radius: 50%; background: #fffdf8; color: #18332b; box-shadow: 0 6px 22px rgba(15,38,30,.2); font: 800 1.2rem/1 Georgia,serif; cursor: pointer; }
  .info-button:hover, .info-button:focus-visible { border-color: #117865; background: #eef7f3; }
  .info-button:focus-visible, button:focus-visible, a:focus-visible { outline: 3px solid #d7b969; outline-offset: 3px; }
  .backdrop { position: fixed; z-index: 30; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(12,27,22,.58); }
  .info-dialog { display: grid; grid-template-rows: auto minmax(0,1fr); width: min(620px,100%); max-height: min(780px,calc(100dvh - 40px)); border-radius: 16px; overflow: hidden; background: #fffdf8; box-shadow: 0 20px 70px rgba(4,20,15,.34); color: #18332b; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 22px 24px 18px; border-bottom: 1px solid #e3e4de; }
  header span { color: #117865; font-size: .72rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
  h2 { margin: 3px 0 0; font-size: 1.7rem; }
  header button { width: 36px; height: 36px; border: 0; background: transparent; color: #53615c; font-size: 1.8rem; cursor: pointer; }
  .content { padding: 0 24px 24px; overflow-y: auto; }
  section { padding-top: 20px; margin-top: 20px; border-top: 1px solid #e3e4de; }
  section:first-child { border-top: 0; }
  h3 { margin: 0 0 9px; font-size: 1rem; }
  p { margin: 0; color: #53615c; line-height: 1.55; }
  a { color: #0b6f60; font-weight: 700; }
  .assertion-types { display: grid; gap: 9px; margin: 0; }
  .assertion-types div { display: grid; grid-template-columns: 95px 1fr; gap: 10px; }
  .assertion-types dt { color: #0b5f50; font-weight: 800; }
  .assertion-types dd { margin: 0; color: #53615c; }
  .sources { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
  .sources li { padding: 12px; border: 1px solid #dce3df; border-radius: 9px; background: #f4f8f6; }
  .sources strong, .sources small, .sources a { display: block; overflow-wrap: anywhere; }
  .sources small { margin-top: 3px; color: #69736f; }
  .sources a { margin-top: 7px; }
  .muted { color: #69736f; }
  .alpha-note { margin-top: 22px; padding: 12px 13px; border-left: 4px solid #d7b969; background: #fff7dd; color: #4f462c; }
  @media (max-width: 520px) { .info-button { right: 70px; bottom: 16px; width: 44px; height: 44px; } .backdrop { align-items: end; padding: 10px; } .info-dialog { max-height: calc(100dvh - 20px); border-radius: 15px; } header { padding: 18px; } .content { padding: 0 18px 20px; } .assertion-types div { grid-template-columns: 82px 1fr; } }
</style>
