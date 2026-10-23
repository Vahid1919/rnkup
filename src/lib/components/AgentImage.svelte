<script lang="ts">
  import { agentImageUrl, type AgentName } from '$lib/agents';

  type Props = {
    agentName?: AgentName;
    /** Decorative artwork is hidden from assistive technology. */
    decorative?: boolean;
  };

  let { agentName = 'Neon', decorative = false }: Props = $props();
  const url = $derived(agentImageUrl(agentName));
</script>

<div class="agent-image">
  <img
    src={url}
    alt={decorative ? '' : `${agentName} agent artwork`}
    draggable="false"
  />
</div>

<style>
  .agent-image {
    width: 100%;
    height: 100%;
    pointer-events: none;
    user-select: none;
  }

  /*
   * The artwork files have wide transparent margins around a centred figure,
   * so the image is scaled up from the bottom to fill its frame.
   */
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center bottom;
    transform: scale(var(--agent-scale, 1.45));
    transform-origin: center bottom;
    filter: drop-shadow(0 1.5rem 2.5rem var(--val-shadow));
    -webkit-user-drag: none;
  }
</style>
