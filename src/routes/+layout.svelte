<script lang="ts">
  import { navigating } from '$app/state';
  import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
  import '../app.css';

  let { children } = $props();

  const targetRoute = $derived(navigating.to?.route.id ?? '');

  const loadingLabel = $derived.by(() => {
    if (targetRoute.includes('/matches/')) return 'Loading match';
    if (targetRoute.startsWith('/players/')) return 'Loading player';
    if (targetRoute === '/leaderboard') return 'Loading leaderboard';
    return 'Loading';
  });

  // The landing search keeps its own overlay up until the player page opens.
  const showLoading = $derived(
    navigating.to !== null &&
      !(
        navigating.from?.route.id === '/' && targetRoute.startsWith('/players/')
      ),
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

<!-- Quick page changes finish inside the delay and never show the overlay. -->
<LoadingOverlay active={showLoading} label={loadingLabel} delay={300} />

{@render children()}
