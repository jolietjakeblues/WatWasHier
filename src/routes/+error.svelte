<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>{page.status} — WatWasHier</title>
</svelte:head>

<main>
  <p class="eyebrow">Landschapsgeheugen</p>
  <h1>{page.status}</h1>
  <p class="message">
    {page.status === 404
      ? 'Deze pagina bestaat niet. WatWasHier draait op één kaartscherm.'
      : (page.error?.message ?? 'Er ging iets mis.')}
  </p>
  <a href="/">Terug naar de kaart</a>
</main>

<style>
  main {
    display: grid;
    place-items: center;
    gap: 14px;
    min-height: 100dvh;
    padding: 24px;
    text-align: center;
    background: #f4f3ed;
    color: #14211d;
  }
  .eyebrow {
    margin: 0;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: #117865;
  }
  h1 {
    margin: 0;
    font-size: clamp(3rem, 12vw, 5rem);
    line-height: 1;
    letter-spacing: -0.03em;
    color: #18332b;
  }
  .message {
    margin: 0;
    max-width: 32ch;
    color: #53615c;
    line-height: 1.5;
  }
  a {
    margin-top: 10px;
    padding: 11px 20px;
    border-radius: 10px;
    background: #117865;
    color: #fff;
    font-weight: 700;
    text-decoration: none;
  }
  a:hover, a:focus-visible {
    background: #0b5f50;
  }
  a:focus-visible {
    outline: 3px solid #d7b969;
    outline-offset: 3px;
  }
</style>
