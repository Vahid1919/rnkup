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
    <a class="brand" href={resolve('/')} aria-label="RNKUP home">
      <span aria-hidden="true">RNK<span class="up">UP</span></span>
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
  /* No hairline at the top of the page, so the header sits on the hero as
     one surface. Once the page scrolls, the line fades in to separate the
     sticky header from the content passing beneath it. */
  header {
    position: sticky;
    z-index: 50;
    top: 0;
    border-bottom: 1px solid transparent;
    background: var(--val-bg-glass);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  @supports (animation-timeline: scroll()) {
    header {
      animation: show-line linear both;
      animation-range: 0 4rem;
      animation-timeline: scroll();
    }
  }

  @keyframes show-line {
    to {
      border-bottom-color: var(--val-line);
    }
  }

  .bar {
    display: flex;
    width: min(100%, 72rem);
    height: var(--bar-height);
    align-items: center;
    gap: var(--space-7);
    margin: 0 auto;
    padding: 0 clamp(1.25rem, 4vw, 2.5rem);
  }

  .brand {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    margin-left: calc(var(--space-1) * -1);
    padding: var(--space-1);
    color: var(--val-cream);
    font-family: var(--font-display);
    font-size: 1.875rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1;
    text-decoration: none;
    text-transform: uppercase;
  }

  ul {
    display: flex;
    gap: var(--space-6);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* Set in the display face to match the wordmark and headlines. */
  .site-link {
    position: relative;
    display: block;
    padding-block: var(--space-2);
    color: var(--val-muted);
    font-family: var(--font-display);
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    line-height: 1;
    text-decoration: none;
    text-transform: uppercase;
    transition: color 150ms ease;
  }

  /* The current page gets a short red bar under its label. */
  .site-link::after {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 2px;
    content: '';
    background: var(--val-red);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 200ms ease;
  }

  .site-link:hover,
  .site-link[aria-current] {
    color: var(--val-cream);
  }

  .site-link[aria-current]::after {
    transform: scaleX(1);
  }

  .up {
    color: var(--val-red);
  }

  @media (max-width: 560px) {
    .bar {
      gap: var(--space-5);
    }

    .brand {
      font-size: 1.5rem;
    }

    ul {
      gap: var(--space-5);
    }

    .site-link {
      font-size: 1rem;
    }
  }
</style>
