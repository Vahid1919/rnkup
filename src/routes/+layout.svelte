<script lang="ts">
  import { navigating } from '$app/state';
  import LoadingBar from '$lib/components/LoadingBar.svelte';
  import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
  import '../app.css';

  let { children } = $props();

  const targetRoute = $derived(navigating.to?.route.id ?? '');

  // The player page shows its own placeholder while stats load, so getting
  // there only needs the thin bar. Pages without one get the full overlay.
  const toPlayerPage = $derived(targetRoute === '/players/[name]/[tag]');

  // The landing search runs its own bar until the player page opens.
  const fromSearch = $derived(
    navigating.from?.route.id === '/' && toPlayerPage,
  );

  const showBar = $derived(
    navigating.to !== null && toPlayerPage && !fromSearch,
  );
  const showOverlay = $derived(navigating.to !== null && !toPlayerPage);

  const overlayLabel = $derived.by(() => {
    if (targetRoute.includes('/matches/')) return 'Loading match';
    if (targetRoute === '/leaderboard') return 'Loading leaderboard';
    return 'Loading';
  });
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

<!-- Quick page changes finish inside the delay and show neither. -->
<LoadingBar active={showBar} label="Loading player…" />
<LoadingOverlay active={showOverlay} label={overlayLabel} delay={300} />

{@render children()}
