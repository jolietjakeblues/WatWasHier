<script lang="ts">
  import { onMount } from 'svelte';

  const storageKey = 'watwashier:context-help:0.3';
  const steps = [
    ['Onderzoek een plek', 'Klik op de kaart. WatWasHier centreert op die plek en verzamelt actuele gebouwen, erfgoed, archeologie en historische kaarten.'],
    ['Bekijk objectdetails', 'Zet een kaartlaag aan en klik op een gekleurd object. Een groen vlak is een BAG-pand. Andere kleuren tonen erfgoed of archeologische informatie.'],
    ['Reis door de tijd', 'Kies een jaar op de tijdlijn. Met Doorzichtigheid vergelijk je de historische Waterstaatskaart met de huidige achtergrondkaart.'],
    ['Controleer de herkomst', 'Bronfeiten komen rechtstreeks uit een bron. Observaties zijn berekend. Hypotheses zijn interpretaties. Onder Bronnen vind je de herkomst van de gegevens.']
  ] as const;

  let open = $state(false);
  let step = $state(0);

  onMount(() => {
    try { open = localStorage.getItem(storageKey) !== 'seen'; }
    catch { open = false; }
  });

  function showHelp() { step = 0; open = true; }
  function closeHelp() {
    open = false;
    try { localStorage.setItem(storageKey, 'seen'); }
    catch { /* De rondleiding blijft handmatig beschikbaar. */ }
  }
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && open && closeHelp()} />

<button class="help-button" type="button" aria-label="Open uitleg over WatWasHier" onclick={showHelp}>?</button>

{#if open}
  <div class="backdrop">
    <div class="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <div class="help-heading">
        <span>Uitleg {step + 1} van {steps.length}</span>
        <button type="button" aria-label="Sluit uitleg" onclick={closeHelp}>×</button>
      </div>
      <div class="progress" aria-hidden="true">
        {#each steps as _, index}<i class:active={index <= step}></i>{/each}
      </div>
      <h2 id="help-title">{steps[step][0]}</h2>
      <p>{steps[step][1]}</p>

      {#if step === 1}
        <ul class="legend-help">
          <li><i class="bag"></i>BAG-pand</li><li><i class="heritage"></i>Rijksmonument</li>
          <li><i class="face"></i>Beschermd gezicht</li><li><i class="world"></i>Werelderfgoed</li>
          <li><i class="archaeology"></i>Archeologie</li>
        </ul>
      {/if}
      {#if step === 3}
        <p class="note">Niet ieder archeologisch record heeft een eigen geometrie. Gekoppelde vondsten en complexen verschijnen bij hun ruimtelijke anker.</p>
      {/if}

      <div class="actions">
        {#if step > 0}<button class="secondary" type="button" onclick={() => step--}>Vorige</button>
        {:else}<button class="secondary" type="button" onclick={closeHelp}>Overslaan</button>{/if}
        {#if step < steps.length - 1}<button class="primary" type="button" onclick={() => step++}>Volgende</button>
        {:else}<button class="primary" type="button" onclick={closeHelp}>Aan de slag</button>{/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .help-button { position: fixed; z-index: 20; right: 26px; bottom: 26px; width: 46px; height: 46px; border: 0; border-radius: 50%; background: #18332b; color: #fff; box-shadow: 0 6px 22px rgba(15,38,30,.28); font: 800 1.25rem/1 system-ui,sans-serif; cursor: pointer; }
  .help-button:hover, .help-button:focus-visible { background: #117865; }
  .help-button:focus-visible, button:focus-visible { outline: 3px solid #d7b969; outline-offset: 3px; }
  .backdrop { position: fixed; z-index: 30; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(12,27,22,.58); }
  .help-dialog { width: min(440px,100%); padding: 24px; border-radius: 16px; background: #fffdf8; box-shadow: 0 20px 70px rgba(4,20,15,.34); color: #18332b; }
  .help-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .help-heading span { color: #117865; font-size: .75rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
  .help-heading button { width: 34px; height: 34px; border: 0; background: transparent; color: #53615c; font-size: 1.7rem; line-height: 1; cursor: pointer; }
  .progress { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; margin: 14px 0 24px; }
  .progress i { height: 4px; border-radius: 4px; background: #dce3df; }
  .progress i.active { background: #117865; }
  h2 { margin: 0 0 12px; font-size: 1.55rem; letter-spacing: -.025em; }
  p { margin: 0; color: #53615c; line-height: 1.55; }
  .note { margin-top: 14px; padding: 11px 12px; border-left: 4px solid #d7b969; background: #fff7dd; color: #4f462c; font-size: .86rem; }
  .legend-help { display: grid; grid-template-columns: 1fr 1fr; gap: 9px 14px; margin: 18px 0 0; padding: 0; list-style: none; color: #53615c; font-size: .84rem; }
  .legend-help li { display: flex; align-items: center; gap: 8px; }
  .legend-help i { width: 11px; height: 11px; border-radius: 3px; background: #117865; }
  .legend-help .heritage { border-radius: 50%; background: #7c3aed; }
  .legend-help .face { background: #e67700; } .legend-help .world { background: #1565c0; } .legend-help .archaeology { background: #ca8a04; }
  .actions { display: flex; justify-content: space-between; gap: 12px; margin-top: 26px; }
  .actions button { min-height: 42px; padding: 9px 16px; border-radius: 9px; font: inherit; font-weight: 750; cursor: pointer; }
  .secondary { border: 1px solid #bdc9c4; background: transparent; color: #364b44; }
  .primary { margin-left: auto; border: 1px solid #117865; background: #117865; color: #fff; }
  @media (max-width: 520px) { .help-button { right: 16px; bottom: 16px; width: 44px; height: 44px; } .backdrop { align-items: end; padding: 10px; } .help-dialog { padding: 20px 18px; border-radius: 15px; } .legend-help { grid-template-columns: 1fr; } }
</style>
