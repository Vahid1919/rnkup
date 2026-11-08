<script lang="ts">
  import Hero from '$lib/components/Hero.svelte';
  import Nav from '$lib/components/Nav.svelte';
</script>

<svelte:head>
  <title>Radiant Stats</title>
  <meta
    name="description"
    content="Your Valorant ranked stats and what to fix first."
  />
</svelte:head>

<Nav />
<main id="main-content" tabindex="-1">
  <Hero />
</main>
