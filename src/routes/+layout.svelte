<script lang="ts">
  import { navigating } from '$app/state';
  import LoadingBar from '$lib/components/LoadingBar.svelte';
  import '../app.css';

  let { children } = $props();

  const loadingLabel = $derived.by(() => {
    const route = navigating.to?.route.id ?? '';
    if (route.includes('/matches/')) return 'Loading match…';
    if (route.startsWith('/players/')) return 'Loading player…';
    if (route === '/leaderboard') return 'Loading leaderboard…';
    return 'Loading…';
  });

  // The landing search shows its own bar while it validates the Riot ID.
  const showLoading = $derived(
    navigating.to !== null && navigating.from?.route.id !== '/',
  );
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Oswald:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<a class="skip-link" href="#main-content">Skip to main content</a>

<LoadingBar active={showLoading} label={loadingLabel} />

{@render children()}
