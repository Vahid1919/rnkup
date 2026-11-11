<script lang="ts">
  import type { Snippet } from 'svelte';
  import { minimapUrl, toMinimap, type Project } from '$lib/maps';

  type Props = {
    mapId: string | null;
    mapName: string;
    /** Spoken summary of what the overlay shows. */
    description: string;
    /**
     * Receives a projection into the overlay's 0–1000 coordinate space and
     * the ID of a circular clip path for portraits.
     */
    children: Snippet<[Project, string]>;
  };

  let { mapId, mapName, description, children }: Props = $props();

  const uid = $props.id();
  const clipId = `${uid}-portrait`;
  const url = $derived(minimapUrl(mapId));
  let failed = $state(false);

  const project: Project = (point) => {
    const position = toMinimap(mapId, point);
    return position ? { x: position.x * 1000, y: position.y * 1000 } : null;
  };
</script>

<div class="minimap">
  {#if url && !failed}
    <img src={url} alt="" loading="lazy" onerror={() => (failed = true)} />
  {:else}
    <p class="missing">{mapName} map image unavailable</p>
  {/if}
  <svg viewBox="0 0 1000 1000" role="img" aria-label={description}>
    <defs>
      <clipPath id={clipId} clipPathUnits="objectBoundingBox">
        <circle cx="0.5" cy="0.5" r="0.5" />
      </clipPath>
    </defs>
    {@render children(project, clipId)}
  </svg>
</div>

<style>
  .minimap {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    border: 1px solid var(--val-line);
    border-radius: var(--radius);
    background: var(--val-panel);
  }

  img,
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  /* Dimmed so the coloured markers read clearly on top of it. */
  img {
    opacity: 0.42;
    object-fit: contain;
  }

  .missing {
    position: absolute;
    inset: auto 0 var(--space-3);
    margin: 0;
    color: var(--val-faint);
    font-size: var(--text-sm);
    text-align: center;
  }
</style>
