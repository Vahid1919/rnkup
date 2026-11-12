<!-- Full-screen spinner shown while a search or a slow page change is in flight. -->
<script lang="ts">
  type Props = {
    active: boolean;
    /** Shown under the spinner and announced to screen readers. */
    label: string;
    /** A quieter second line, such as the Riot ID being looked up. */
    detail?: string;
    /** Loads that finish before this many milliseconds show nothing. */
    delay?: number;
  };

  let { active, label, detail, delay = 0 }: Props = $props();
  let visible = $state(false);

  $effect(() => {
    if (!active) {
      visible = false;
      return;
    }

    if (delay <= 0) {
      visible = true;
      return;
    }

    const timer = setTimeout(() => (visible = true), delay);
    return () => clearTimeout(timer);
  });
</script>

<!-- Always in the page, so screen readers announce the label when it appears. -->
<p class="sr-only" role="status">
  {visible ? (detail ? `${label}: ${detail}` : label) : ''}
</p>

{#if visible}
  <div class="loading-overlay" aria-hidden="true">
    <div class="content">
      <span class="mark"></span>
      <p class="label">{label}<span class="dots"></span></p>
      {#if detail}
        <p class="detail">{detail}</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .loading-overlay {
    position: fixed;
    z-index: 300;
    inset: 0;
    display: grid;
    place-items: center;
    padding: var(--space-5);
    background: rgb(0 0 0 / 86%);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    animation: fade 150ms ease-out;
  }

  .content {
    display: grid;
    justify-items: center;
    gap: var(--space-4);
    text-align: center;
    animation: rise 250ms ease-out;
  }

  /* Two rings turning against each other: red outside, cream inside. */
  .mark {
    position: relative;
    width: 3.5rem;
    height: 3.5rem;
  }

  .mark::before,
  .mark::after {
    position: absolute;
    border: 3px solid transparent;
    border-radius: 50%;
    content: '';
  }

  .mark::before {
    inset: 0;
    border-color: var(--val-line-strong);
    border-top-color: var(--val-red);
    animation: spin 800ms linear infinite;
  }

  .mark::after {
    inset: 0.625rem;
    border-width: 2px;
    border-bottom-color: var(--val-cream);
    animation: spin 1.3s linear infinite reverse;
  }

  p {
    margin: 0;
  }

  .label {
    color: var(--val-cream);
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 600;
    letter-spacing: 0.1em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  /* Takes no room, so the label stays centred while the dots count up. */
  .dots {
    position: absolute;
  }

  .dots::after {
    content: '';
    animation: dots 1.4s steps(1) infinite;
  }

  .detail {
    max-width: 100%;
    margin-top: calc(-1 * var(--space-2));
    overflow-wrap: anywhere;
    color: var(--val-muted);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  @keyframes rise {
    from {
      transform: translateY(6px);
    }
  }

  @keyframes dots {
    0% {
      content: '';
    }

    25% {
      content: '.';
    }

    50% {
      content: '..';
    }

    75% {
      content: '...';
    }
  }
</style>
