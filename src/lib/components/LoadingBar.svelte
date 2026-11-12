<script lang="ts">
  type Props = {
    active: boolean;
    /** Announced to screen readers once the bar appears. */
    label: string;
    /** Fast loads finish before this many milliseconds and show nothing. */
    delay?: number;
  };

  let { active, label, delay = 300 }: Props = $props();
  let visible = $state(false);

  $effect(() => {
    if (!active) {
      visible = false;
      return;
    }

    const timer = setTimeout(() => (visible = true), delay);
    return () => clearTimeout(timer);
  });
</script>

<p class="sr-only" role="status">{visible ? label : ''}</p>

{#if visible}
  <div class="loading-bar" aria-hidden="true"><span></span></div>
{/if}

<style>
  .loading-bar {
    position: fixed;
    z-index: 300;
    top: 0;
    right: 0;
    left: 0;
    height: 2px;
    overflow: hidden;
    background: var(--val-line);
  }

  span {
    position: absolute;
    inset: 0;
    width: 35%;
    background: var(--val-cream);
    animation: sweep 1.1s ease-in-out infinite;
  }

  @keyframes sweep {
    from {
      transform: translateX(-100%);
    }

    to {
      transform: translateX(300%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    span {
      width: 100%;
      animation: none;
      opacity: 0.6;
    }
  }
</style>
