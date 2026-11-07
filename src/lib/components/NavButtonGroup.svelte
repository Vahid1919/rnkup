<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  const DASHBOARD_ROUTE = '/players/[name]/[tag]';
  const MATCH_ROUTE = '/players/[name]/[tag]/matches/[matchId]';

  const dashboardSections = [
    { route: '/players/[name]/[tag]#stats', hash: '#stats', label: 'Stats' },
    {
      route: '/players/[name]/[tag]#focus',
      hash: '#focus',
      label: 'Coaching',
    },
    {
      route: '/players/[name]/[tag]#matches',
      hash: '#matches',
      label: 'Matches',
    },
  ] as const;

  const matchSections = [
    {
      route: '/players/[name]/[tag]/matches/[matchId]#summary',
      hash: '#summary',
      label: 'Your game',
    },
    {
      route: '/players/[name]/[tag]/matches/[matchId]#scoreboard',
      hash: '#scoreboard',
      label: 'Scoreboard',
    },
    {
      route: '/players/[name]/[tag]/matches/[matchId]#deep-dive',
      hash: '#deep-dive',
      label: 'Deep dive',
    },
  ] as const;

  // The deep dive only renders when the provider sent round data.
  function hasRoundData(data: unknown): boolean {
    if (typeof data !== 'object' || data === null || !('match' in data)) {
      return false;
    }
    const match: unknown = data.match;
    return (
      typeof match === 'object' &&
      match !== null &&
      'hasRoundData' in match &&
      match.hasRoundData === true &&
      'rounds' in match &&
      Array.isArray(match.rounds) &&
      match.rounds.length > 0
    );
  }

  const isDashboard = $derived(page.route.id === DASHBOARD_ROUTE);
  const isMatch = $derived(page.route.id === MATCH_ROUTE);
  const visibleMatchSections = $derived(
    hasRoundData(page.data)
      ? matchSections
      : matchSections.filter((section) => section.hash !== '#deep-dive'),
  );
  const playerParams = $derived({
    name: page.params.name ?? '',
    tag: page.params.tag ?? '',
  });
  let currentHash = $state('');
  let navElement = $state<HTMLElement | null>(null);
  let moreBefore = $state(false);
  let moreAfter = $state(false);

  // On narrow screens the links scroll sideways; fade whichever edge hides
  // more of them so the cut-off label reads as "scroll for more".
  function updateEdges(): void {
    if (!navElement) return;
    const { scrollLeft, scrollWidth, clientWidth } = navElement;
    moreBefore = scrollLeft > 2;
    moreAfter = scrollLeft + clientWidth < scrollWidth - 2;
  }

  $effect(() => {
    if (!navElement) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(navElement);
    return () => observer.disconnect();
  });

  // Keep the current section's link in view as the reader scrolls the page.
  $effect(() => {
    if (!navElement || !currentHash) return;
    const link = navElement.querySelector<HTMLElement>('[aria-current]');
    if (!link) return;
    const start = link.offsetLeft - navElement.offsetLeft;
    const end = start + link.offsetWidth;
    const { scrollLeft, clientWidth } = navElement;
    if (start < scrollLeft) navElement.scrollLeft = start;
    else if (end > scrollLeft + clientWidth) {
      navElement.scrollLeft = end - clientWidth;
    }
  });

  // Track which section sits under the header so the matching link can be
  // exposed with aria-current while scrolling.
  $effect(() => {
    const hashes = isDashboard
      ? dashboardSections.map((section) => section.hash)
      : isMatch
        ? visibleMatchSections.map((section) => section.hash)
        : [];
    // Re-run when moving between players or matches on the same route.
    void page.url.pathname;
    currentHash = '';

    const sections = hashes
      .map((hash) => document.getElementById(hash.slice(1)))
      .filter((element): element is HTMLElement => element !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            currentHash = `#${entry.target.id}`;
          }
        }
      },
      { rootMargin: '-25% 0px -70% 0px' },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  });
</script>

{#if (isDashboard || isMatch) && !page.error}
  <div class="section-nav">
    <nav
      aria-label={isDashboard ? 'Player dashboard sections' : 'Match sections'}
      class:fade-start={moreBefore}
      class:fade-end={moreAfter}
      bind:this={navElement}
      onscroll={updateEdges}
    >
      <ul>
        {#if isDashboard}
          {#each dashboardSections as section (section.route)}
            <li>
              <a
                href={resolve(section.route, playerParams)}
                aria-current={currentHash === section.hash
                  ? 'location'
                  : undefined}
              >
                {section.label}
              </a>
            </li>
          {/each}
        {:else if isMatch}
          {#each visibleMatchSections as section (section.route)}
            <li>
              <a
                href={resolve(section.route, {
                  ...playerParams,
                  matchId: page.params.matchId ?? '',
                })}
                aria-current={currentHash === section.hash
                  ? 'location'
                  : undefined}
              >
                {section.label}
              </a>
            </li>
          {/each}
        {/if}
      </ul>
    </nav>
  </div>
{/if}

<style>
  /* A second header row, lined up with the page content. The links stay on
     one line; a very narrow screen scrolls them sideways. */
  .section-nav {
    border-top: 1px solid var(--val-line);
  }

  nav {
    width: min(100%, 72rem);
    margin: 0 auto;
    padding: 0 clamp(1.25rem, 4vw, 2.5rem);
    overflow-x: auto;
    scrollbar-width: none;
  }

  nav.fade-end {
    mask-image: linear-gradient(to right, #000 calc(100% - 2rem), transparent);
  }

  nav.fade-start {
    mask-image: linear-gradient(to left, #000 calc(100% - 2rem), transparent);
  }

  nav.fade-start.fade-end {
    mask-image: linear-gradient(
      to right,
      transparent,
      #000 2rem,
      #000 calc(100% - 2rem),
      transparent
    );
  }

  ul {
    display: flex;
    align-items: center;
    gap: var(--space-5);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  a {
    position: relative;
    display: flex;
    height: var(--subnav-height);
    align-items: center;
    color: var(--val-faint);
    font-size: var(--text-sm);
    font-weight: 500;
    line-height: 1;
    text-decoration: none;
    white-space: nowrap;
    transition: color 150ms ease;
  }

  a::after {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 2px;
    content: '';
    background: var(--val-red);
    opacity: 0;
    transition: opacity 150ms ease;
  }

  a:hover,
  a[aria-current] {
    color: var(--val-cream);
  }

  a[aria-current]::after {
    opacity: 1;
  }
</style>
