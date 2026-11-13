<!-- Stand-in for the stats overview and rank chart while match history streams in.
     It copies their layout, so the page doesn't jump when the numbers arrive. -->
<script lang="ts">
  // What the server does, in order. The lines follow the work rather than
  // measure it: each one holds for a moment, and the last stays until the
  // dashboard arrives.
  const steps = [
    'Pulling up to 100 recent ranked games',
    'Comparing you with the other nine in each lobby',
    "Working out what's costing you rounds",
  ];
  const STEP_MS = 3000;

  let step = $state(0);

  $effect(() => {
    if (step >= steps.length - 1) return;

    const timer = setTimeout(() => (step += 1), STEP_MS);
    return () => clearTimeout(timer);
  });
</script>

<section class="loading" role="status" aria-labelledby="loading-title">
  <!-- Screen readers get one steady label; the changing line is for the eye. -->
  <h2 id="loading-title" class="sr-only">Loading match history</h2>
  <p class="step" aria-hidden="true">
    {#key step}
      <span>{steps[step]}</span>
    {/key}
  </p>

  <div class="overview panel" aria-hidden="true">
    <div class="top-row">
      <div class="level">
        <span class="bone" style:--w="2.75rem" style:--h="1rem"></span>
        <span class="bone" style:--w="4.5rem" style:--h="2.5rem"></span>
      </div>

      <!-- The win-rate ring's place doubles as the spinner. -->
      <svg class="record-ring" viewBox="0 0 100 100">
        <circle class="record-ring-track" cx="50" cy="50" r="42" />
        <circle
          class="record-ring-arc"
          cx="50"
          cy="50"
          r="42"
          pathLength="100"
        />
      </svg>

      <div class="rating">
        {#each ['current', 'peak'] as block (block)}
          <div class="rating-block">
            <span class="bone" style:--w="3.25rem" style:--h="0.7rem"></span>
            <div class="rating-row">
              <span class="bone rank-icon"></span>
              <div class="rating-text">
                <span class="bone" style:--w="5.5rem" style:--h="1rem"></span>
                <span class="bone" style:--w="3rem" style:--h="0.65rem"></span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="headline-grid">
      {#each [0, 1, 2, 3] as card (card)}
        <div class="card">
          <span class="bone" style:--w="45%" style:--h="0.8rem"></span>
          <span class="bone" style:--w="60%" style:--h="1.75rem"></span>
          <span class="bone" style:--w="75%" style:--h="0.65rem"></span>
        </div>
      {/each}
    </div>

    <div class="small-grid">
      {#each [0, 1, 2, 3] as stat (stat)}
        <div class="small-stat">
          <span class="bone" style:--w="55%" style:--h="0.7rem"></span>
          <span class="bone" style:--w="40%" style:--h="1.35rem"></span>
          <span class="bone" style:--w="70%" style:--h="0.6rem"></span>
        </div>
      {/each}
    </div>
  </div>

  <!-- The note under the overview, so the chart below starts where it will. -->
  <div class="hint" aria-hidden="true">
    <span class="bone" style:--w="100%" style:--h="0.6rem"></span>
    <span class="bone" style:--w="94%" style:--h="0.6rem"></span>
    <span class="bone" style:--w="38%" style:--h="0.6rem"></span>
  </div>

  <div class="trends panel" aria-hidden="true">
    <div class="chart-heading">
      <span class="bone" style:--w="7rem" style:--h="1.1rem"></span>
      <span class="bone ranges" style:--w="11rem" style:--h="2rem"></span>
    </div>
    <!-- A ghost of the rank chart that keeps redrawing itself. -->
    <svg class="plot" viewBox="0 0 600 220" preserveAspectRatio="none">
      <g class="gridlines">
        <line x1="0" y1="30" x2="600" y2="30" />
        <line x1="0" y1="83" x2="600" y2="83" />
        <line x1="0" y1="136" x2="600" y2="136" />
        <line x1="0" y1="190" x2="600" y2="190" />
      </g>
      <path
        class="trend"
        pathLength="1"
        d="M0 150 L50 138 L95 158 L140 120 L190 131 L235 98 L285 112 L330 76 L380 95 L425 62 L470 84 L520 50 L560 66 L600 38"
      />
    </svg>
  </div>
</section>

<style>
  .loading {
    --bone: var(--val-panel-raised);
    margin-top: var(--space-7);
  }

  /* The same height as the "Competitive overview" heading it stands in for. */
  .step {
    margin: 0 0 var(--space-3);
    color: var(--val-muted);
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-weight: 500;
    letter-spacing: 0.01em;
    line-height: 1.25;
  }

  .step span {
    display: inline-block;
    animation: step-in 300ms ease-out;
  }

  .step span::after {
    content: '';
    animation: dots 1.4s steps(1) infinite;
  }

  .panel {
    position: relative;
    overflow: hidden;
    animation: enter 350ms ease-out backwards;
  }

  /* A band of light crossing the whole panel. Both panels are the same width,
     so it reads as one sweep down the page. Moved with a transform, which the
     browser can animate without repainting the blocks underneath. */
  .panel::after {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      100deg,
      transparent 38%,
      rgb(236 232 225 / 6%) 50%,
      transparent 62%
    );
    content: '';
    pointer-events: none;
    transform: translateX(-100%);
    animation: sheen 1.8s ease-in-out infinite;
  }

  .overview {
    display: grid;
    gap: var(--space-5);
    padding: var(--space-5);
  }

  .bone {
    display: block;
    width: var(--w, 100%);
    max-width: 100%;
    height: var(--h, 1rem);
    border-radius: var(--radius-sm);
    background: var(--bone);
  }

  .top-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-4) var(--space-6);
  }

  .level {
    display: grid;
    gap: var(--space-3);
  }

  .record-ring {
    width: 6rem;
    height: 6rem;
    flex-shrink: 0;
  }

  .record-ring circle {
    fill: none;
    stroke-width: 7;
  }

  .record-ring-track {
    stroke: var(--val-line-strong);
  }

  /* Grey like the rest of the placeholder; colour waits for the real ring. */
  .record-ring-arc {
    stroke: var(--val-faint);
    stroke-dasharray: 28 72;
    stroke-linecap: round;
    transform-origin: center;
    animation: spin 1s linear infinite;
  }

  .rating {
    display: flex;
    margin-left: auto;
  }

  .rating-block {
    display: grid;
    gap: var(--space-3);
  }

  .rating-block + .rating-block {
    margin-left: var(--space-5);
    border-left: 1px solid var(--val-line);
    padding-left: var(--space-5);
  }

  .rating-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .rank-icon {
    width: 2.75rem;
    height: 2.75rem;
    flex-shrink: 0;
    border-radius: 50%;
  }

  .rating-text {
    display: grid;
    gap: var(--space-2);
  }

  .headline-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-3);
  }

  /* The real cards are raised, so their blocks go one step lighter. */
  .card {
    --bone: var(--val-line);
    display: grid;
    align-content: start;
    gap: var(--space-3);
    min-height: 7.3125rem;
    border-radius: var(--radius);
    padding: var(--space-4) var(--space-3) var(--space-4) var(--space-5);
    background: var(--val-panel-raised);
  }

  .small-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--space-5) var(--space-3);
    padding: 0 var(--space-1);
  }

  .small-stat {
    display: grid;
    align-content: start;
    gap: var(--space-3);
    min-height: 4.6875rem;
    padding-left: var(--space-4);
  }

  /* Three lines of small text: each block sits in a line-high row. */
  .hint {
    display: grid;
    grid-auto-rows: 1.3125rem;
    align-items: center;
    max-width: 48rem;
    margin-top: var(--space-3);
  }

  .trends {
    margin-top: var(--space-5);
    padding: var(--space-5);
    animation-delay: 90ms;
  }

  .chart-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
  }

  .ranges {
    margin-left: auto;
    border-radius: var(--radius);
  }

  .plot {
    display: block;
    width: 100%;
    height: 224px;
    margin-top: var(--space-4);
  }

  .gridlines line {
    stroke: var(--val-line);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }

  .trend {
    fill: none;
    stroke: var(--val-line-strong);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 1;
    vector-effect: non-scaling-stroke;
    animation: draw 2.4s ease-in-out infinite;
  }

  @keyframes sheen {
    to {
      transform: translateX(100%);
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes enter {
    from {
      opacity: 0;
    }
  }

  @keyframes step-in {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
  }

  /* Draws left to right, holds, then fades before starting again. */
  @keyframes draw {
    0% {
      stroke-dashoffset: 1;
      opacity: 1;
    }

    65%,
    80% {
      stroke-dashoffset: 0;
      opacity: 1;
    }

    100% {
      stroke-dashoffset: 0;
      opacity: 0;
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

  @media (max-width: 760px) {
    .rating {
      flex-basis: 100%;
      margin-left: 0;
    }

    .headline-grid,
    .small-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 560px) {
    .overview,
    .trends {
      padding: var(--space-4);
    }

    .ranges {
      flex-basis: 100%;
      margin-left: 0;
    }
  }
</style>
