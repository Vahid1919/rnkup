<script lang="ts">
  import { agentPortraitUrl } from '$lib/agents';

  type Props = {
    agentId: string | null;
    agentName: string;
    size?: 'sm' | 'md';
    /** Set when the agent name is not shown as text next to the icon. */
    labelled?: boolean;
  };

  let { agentId, agentName, size = 'md', labelled = false }: Props = $props();
  let failed = $state(false);
  const url = $derived(failed ? null : agentPortraitUrl(agentId));
</script>

<!-- Until the lazy portrait loads (or if it never does) the icon is a quiet
     empty tile; the agent's name is always shown or announced alongside. -->
<span class="agent-icon {size}">
  {#if url}
    <img
      src={url}
      alt={labelled ? agentName : ''}
      loading="lazy"
      onerror={() => (failed = true)}
    />
  {:else if labelled}
    <span class="sr-only">{agentName}</span>
  {/if}
</span>

<style>
  .agent-icon {
    position: relative;
    display: inline-grid;
    width: 2.5rem;
    height: 2.5rem;
    flex-shrink: 0;
    overflow: hidden;
    place-items: center;
    border: 1px solid var(--val-line);
    border-radius: var(--radius);
    background: var(--val-panel);
  }

  .sm {
    width: 2rem;
    height: 2rem;
    border-radius: var(--radius-sm);
  }

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
