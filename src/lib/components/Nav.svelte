<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import NavButtonGroup from './NavButtonGroup.svelte';

  const siteLinks = [
    { route: '/', label: 'Home' },
    { route: '/leaderboard', label: 'Leaderboard' },
  ] as const;
</script>

<!-- The bar holds the site links; pages with sections add a second row. -->
<header>
  <div class="bar">
    <a class="brand" href={resolve('/')} aria-label="Radiant Stats home">
      <svg class="mark" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 2h22l-6 28H2z" />
        <rect x="9" y="17" width="3.5" height="7" />
        <rect x="14.25" y="12" width="3.5" height="12" />
        <rect x="19.5" y="8" width="3.5" height="16" />
      </svg>
      <span class="word">Radiant Stats</span>
    </a>
    <nav aria-label="Site">
      <ul>
        {#each siteLinks as link (link.route)}
          <li>
            <a
              class="site-link"
              href={resolve(link.route)}
              aria-current={page.route.id === link.route && !page.error
                ? 'page'
                : undefined}
            >
              {link.label}
            </a>
          </li>
        {/each}
      </ul>
    </nav>
  </div>
  <NavButtonGroup />
</header>

<style>
  header {
    position: sticky;
    z-index: 50;
    top: 0;
    border-bottom: 1px solid var(--val-line);
    background: var(--val-bg-glass);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .bar {
    display: flex;
    width: min(100%, 72rem);
    height: var(--bar-height);
    align-items: stretch;
    gap: var(--space-6);
    margin: 0 auto;
    padding: 0 clamp(1.25rem, 4vw, 2.5rem);
  }

  .brand {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    align-self: center;
    gap: var(--space-2);
    margin-left: calc(var(--space-1) * -1);
    padding: var(--space-1);
    color: var(--val-cream);
    font-family: var(--font-display);
    font-size: var(--text-md);
    font-weight: 500;
    letter-spacing: 0.06em;
    line-height: 1;
    text-decoration: none;
    text-transform: uppercase;
  }

  ul {
    display: flex;
    height: 100%;
    gap: var(--space-5);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* Each link is as tall as the bar, so its underline sits on the bar's edge. */
  .site-link {
    position: relative;
    display: flex;
    height: 100%;
    align-items: center;
    color: var(--val-muted);
    font-size: var(--text-md);
    font-weight: 600;
    line-height: 1;
    text-decoration: none;
    transition: color 150ms ease;
  }

  .site-link::after {
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

  .site-link:hover,
  .site-link[aria-current] {
    color: var(--val-cream);
  }

  .site-link[aria-current]::after {
    opacity: 1;
  }

  .mark {
    width: 1.5rem;
    height: 1.5rem;
  }

  .mark path {
    fill: var(--val-red);
  }

  .mark rect {
    fill: var(--val-cream);
  }

  /* The mark alone carries the brand on small screens; the links keep their labels. */
  @media (max-width: 560px) {
    .bar {
      gap: var(--space-5);
    }

    .word {
      display: none;
    }
  }
</style>
