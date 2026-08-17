<script lang="ts">
  let copied = $state(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: 'WatWasHier', text: 'Bekijk deze plek in WatWasHier', url }); return; }
      catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => copied = false, 2200);
    } catch {
      window.prompt('Kopieer deze link:', url);
    }
  }
</script>

<button class="share-button" type="button" aria-label="Deel deze kaartweergave" onclick={share}>↗</button>
{#if copied}<div class="copy-status" role="status">Link gekopieerd</div>{/if}

<style>
  .share-button { position: fixed; z-index: 20; right: 138px; bottom: 26px; width: 46px; height: 46px; border: 1px solid #bdc9c4; border-radius: 50%; background: #fffdf8; color: #18332b; box-shadow: 0 6px 22px rgba(15,38,30,.2); font: 800 1.25rem/1 system-ui,sans-serif; cursor: pointer; }
  .share-button:hover, .share-button:focus-visible { border-color: #117865; background: #eef7f3; }
  .share-button:focus-visible { outline: 3px solid #d7b969; outline-offset: 3px; }
  .copy-status { position: fixed; z-index: 21; right: 132px; bottom: 82px; padding: 8px 11px; border-radius: 8px; background: #18332b; color: #fff; box-shadow: 0 5px 18px rgba(15,38,30,.25); font-size: .78rem; font-weight: 700; }
  @media (max-width: 520px) { .share-button { right: 124px; bottom: 16px; width: 44px; height: 44px; } .copy-status { right: 118px; bottom: 70px; } }
</style>
