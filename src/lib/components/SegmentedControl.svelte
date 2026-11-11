<script lang="ts" generics="T extends string">
  type Option = { value: T; label: string; title?: string };

  type Props = {
    legend: string;
    name: string;
    options: Option[];
    value: T;
  };

  let { legend, name, options, value = $bindable() }: Props = $props();
</script>

<!-- Radio buttons, so arrow keys move between options as in any radio group. -->
<fieldset class="segmented">
  <legend class="sr-only">{legend}</legend>
  {#each options as option (option.value)}
    <label title={option.title}>
      <input
        type="radio"
        {name}
        value={option.value}
        checked={option.value === value}
        onchange={() => (value = option.value)}
      />
      <span>{option.label}</span>
    </label>
  {/each}
</fieldset>

<style>
  .segmented {
    display: inline-flex;
    gap: 2px;
    margin: 0;
    border: 0;
    border-radius: var(--radius);
    padding: 2px;
    background: var(--val-bg);
  }

  label {
    position: relative;
    display: grid;
    min-width: 2.5rem;
    min-height: 2rem;
    place-items: center;
    border-radius: calc(var(--radius) - 2px);
    padding: 0 var(--space-3);
    color: var(--val-faint);
    font-size: var(--text-sm);
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    transition:
      color 150ms ease,
      background-color 150ms ease;
  }

  label:hover {
    color: var(--val-cream);
  }

  label:has(input:checked) {
    color: var(--val-cream);
    background: var(--val-panel-raised);
  }

  label:has(input:focus-visible) {
    outline: 2px solid var(--val-cream);
    outline-offset: 1px;
  }

  input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }
</style>
