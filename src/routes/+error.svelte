<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import Nav from '$lib/components/Nav.svelte';

  const heading = $derived(
    page.status === 404
      ? 'Not found'
      : page.status === 429
        ? 'Slow down a moment'
        : page.status === 400
          ? 'That does not look right'
          : 'Something went wrong',
  );
  // SvelteKit's default 404 message only repeats the heading.
  const message = $derived.by(() => {
    const text = page.error?.message;
    if (!text || text.toLowerCase() === heading.toLowerCase()) {
      return page.status === 404
        ? 'There is no page at this address.'
        : 'The page could not be loaded.';
    }
    return text;
  });
</script>

<svelte:head>
  <title>{heading} | RNKUP</title>
</svelte:head>

<Nav />
<main id="main-content" class="page" tabindex="-1">
  <section class="error" aria-labelledby="error-title">
    <p class="eyebrow">Error {page.status}</p>
    <h1 id="error-title" class="section-title">{heading}</h1>
    <p class="section-intro">
      {message}
    </p>
    {#if page.status === 429}
      <p class="section-intro">
        The stats provider allows a limited number of lookups each minute. Wait
        about a minute, then reload this page.
      </p>
    {/if}
    <a class="action" href={resolve('/')}>Back to search</a>
  </section>
</main>

<style>
  .error {
    max-width: 40rem;
    margin-top: var(--space-8);
  }

  .section-title {
    margin-top: var(--space-2);
    font-size: var(--text-2xl);
  }

  .section-intro {
    margin-top: var(--space-3);
    color: var(--val-muted);
    font-size: var(--text-md);
  }

  .action {
    display: inline-block;
    margin-top: var(--space-6);
    border-radius: var(--radius);
    padding: 0.625rem 1.25rem;
    color: var(--val-bg);
    background: var(--val-red);
    font-weight: 600;
    text-decoration: none;
    transition: background-color 150ms ease;
  }

  .action:hover {
    background: var(--val-cream);
  }
</style>
