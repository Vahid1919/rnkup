<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import type { PlayerProfile } from '$lib/player-profile';
  import AgentImage from './AgentImage.svelte';
  import LoadingBar from './LoadingBar.svelte';

  const defaultRiotId = 'Janhoi#VAL';

  let riotId = $state('');
  let errorMessage = $state<string | null>(null);
  let isLoading = $state(false);

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  function isPlayerProfileResponse(
    value: unknown,
  ): value is { data: PlayerProfile } {
    return isRecord(value) && isRecord(value.data);
  }

  function getErrorMessage(value: unknown): string {
    return isRecord(value) && typeof value.error === 'string'
      ? value.error
      : 'The player profile could not be retrieved.';
  }

  function parseRiotId(value: string): { name: string; tag: string } | null {
    const normalized = value.trim();
    const tagSeparator = normalized.lastIndexOf('#');
    if (tagSeparator <= 0 || tagSeparator === normalized.length - 1) {
      return null;
    }

    const name = normalized.slice(0, tagSeparator).trim();
    const tag = normalized.slice(tagSeparator + 1).trim();
    return name && tag ? { name, tag } : null;
  }

  async function searchPlayer(event: SubmitEvent) {
    event.preventDefault();

    const parsedRiotId = parseRiotId(riotId || defaultRiotId);
    if (!parsedRiotId) {
      errorMessage = 'Enter a Riot ID in the format NAME#TAG.';
      return;
    }

    isLoading = true;
    errorMessage = null;

    try {
      const response = await fetch(
        `/api/players/${encodeURIComponent(parsedRiotId.name)}/${encodeURIComponent(parsedRiotId.tag)}`,
      );
      const body: unknown = await response.json();

      if (!response.ok || !isPlayerProfileResponse(body)) {
        errorMessage = getErrorMessage(body);
        return;
      }

      await goto(
        resolve(
          `/players/${encodeURIComponent(body.data.riotId.name)}/${encodeURIComponent(body.data.riotId.tag)}`,
        ),
      );
    } catch {
      errorMessage = 'The player profile could not be retrieved. Try again.';
    } finally {
      isLoading = false;
    }
  }
</script>

<section id="player-search" aria-labelledby="hero-title">
  <!-- Artwork fills the right of the hero, behind the text. -->
  <div class="art" aria-hidden="true">
    <div class="art-backdrop"></div>
    <div class="art-figure">
      <AgentImage agentName="Hush" decorative />
    </div>
  </div>

  <div class="layout">
    <div class="content">
      <p class="eyebrow">Valorant ranked stats</p>
      <h1 id="hero-title">Fix your biggest <span>problems.</span></h1>
      <p class="lede">
        Type in a Riot ID. We go through your recent ranked games, compare you
        with the other nine players in each lobby, and show what's costing you
        rounds.
      </p>

      <form onsubmit={searchPlayer} novalidate>
        <div class="search">
          <label for="riot-id">Riot ID</label>
          <div class="field-row">
            <input
              id="riot-id"
              bind:value={riotId}
              name="riotId"
              placeholder={defaultRiotId}
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              maxlength="32"
              aria-invalid={errorMessage ? 'true' : undefined}
              aria-describedby={errorMessage
                ? 'riot-id-error riot-id-hint'
                : 'riot-id-hint'}
            />
            <button type="submit" disabled={isLoading} aria-busy={isLoading}>
              Look up
            </button>
          </div>
          {#if errorMessage}
            <p id="riot-id-error" class="message error" role="alert">
              {errorMessage}
            </p>
          {/if}
          <p id="riot-id-hint" class="message">
            NAME#TAG. Leave it blank to see an example.
          </p>
        </div>
      </form>
    </div>
  </div>
</section>

<LoadingBar active={isLoading} label="Loading player…" />

<style>
  section {
    position: relative;
    display: flex;
    align-items: center;
    min-height: calc(100dvh - var(--header-height));
    overflow: hidden;
  }

  .layout {
    position: relative;
    z-index: 1;
    width: min(100%, 72rem);
    margin: 0 auto;
    padding: var(--space-7) clamp(1.25rem, 4vw, 2.5rem);
  }

  .content {
    max-width: 34rem;
  }

  .eyebrow {
    margin: 0 0 var(--space-4);
    color: var(--val-faint);
    font-size: var(--text-sm);
    font-weight: 500;
  }

  h1 {
    margin: 0;
    color: var(--val-cream);
    font-family: var(--font-display);
    font-size: var(--text-display-lg);
    font-weight: 600;
    letter-spacing: -0.005em;
    line-height: 0.98;
    text-transform: uppercase;
    text-wrap: balance;
  }

  /* The red word always gets a line to itself. */
  h1 span {
    display: block;
    color: var(--val-red);
  }

  /* Beside the artwork there is room for the first line to run a little
     wider than the text column, which keeps the headline to two lines. */
  @media (min-width: 901px) {
    h1 {
      margin-right: calc(-1 * var(--space-8));
    }
  }

  .lede {
    max-width: 30rem;
    margin: var(--space-5) 0 0;
    color: var(--val-muted);
    font-size: var(--text-lg);
    line-height: 1.6;
    text-wrap: pretty;
  }

  form {
    margin-top: var(--space-7);
  }

  label {
    display: block;
    margin-bottom: var(--space-2);
    color: var(--val-cream);
    font-size: var(--text-sm);
    font-weight: 600;
  }

  .field-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2);
  }

  input {
    width: 100%;
    min-height: 3rem;
    border: 1px solid var(--val-line-strong);
    border-radius: var(--radius);
    padding: 0.625rem 0.875rem;
    color: var(--val-cream);
    background: var(--val-panel);
    font: inherit;
    font-size: var(--text-md);
    transition: border-color 150ms ease;
  }

  input::placeholder {
    color: var(--val-faint);
    opacity: 1;
  }

  input:hover {
    border-color: var(--val-faint);
  }

  input[aria-invalid='true'] {
    border-color: var(--val-loss);
  }

  /* Black text on red: 6.3:1, where white on red would fail AA. */
  button {
    min-height: 3rem;
    border: 0;
    border-radius: var(--radius);
    padding: 0.625rem 1.5rem;
    color: var(--val-bg);
    background: var(--val-red);
    font: inherit;
    font-size: var(--text-md);
    font-weight: 600;
    white-space: nowrap;
    transition: background-color 150ms ease;
  }

  button:hover:not(:disabled) {
    background: var(--val-cream);
  }

  button:disabled {
    cursor: wait;
    color: var(--val-cream);
    background: var(--val-line-strong);
  }

  .message {
    margin: var(--space-3) 0 0;
    color: var(--val-faint);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  .error {
    color: var(--val-loss);
    font-weight: 600;
  }

  /* The artwork is a backdrop: as tall as the hero, anchored to the right
     edge of the page width, and faded out towards the text. */
  .art {
    position: absolute;
    right: max(0px, (100% - 72rem) / 2 - 6rem);
    bottom: 0;
    width: min(60%, 50rem);
    height: 100%;
    mask-image: linear-gradient(to right, transparent, #000 38%);
  }

  /* A slanted red band running the full height of the hero. */
  .art-backdrop {
    position: absolute;
    inset: 0 6% 0 22%;
    background: linear-gradient(
      to bottom,
      var(--val-red),
      color-mix(in srgb, var(--val-red) 55%, var(--val-bg))
    );
    clip-path: polygon(26% 0, 100% 0, 74% 100%, 0 100%);
  }

  /* Sized from the hero's height, so the figure stands taller than the hero:
     head near the top, legs running off the bottom. The artwork file is
     2048 by 1860 with the figure in the middle of wide empty margins. */
  .art-figure {
    position: absolute;
    top: -5%;
    left: 50%;
    height: 129%;
    aspect-ratio: 2048 / 1860;
    transform: translateX(-50%);
    --agent-scale: 1;
  }

  @media (max-width: 900px) {
    .layout {
      padding-block: var(--space-7) var(--space-8);
    }

    .content {
      max-width: 30rem;
    }

    /* On tablets the artwork stays behind the text, pushed to the right edge
       and dimmed so the headline and form remain readable over it. */
    .art {
      right: -8%;
      width: 75%;
      opacity: 0.7;
      mask-image: linear-gradient(to right, transparent, #000 45%);
    }
  }

  /* The form is the job on phones; the artwork steps aside. */
  @media (max-width: 600px) {
    .content {
      max-width: none;
    }

    .art {
      display: none;
    }
  }

  @media (max-width: 520px) {
    .field-row {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
