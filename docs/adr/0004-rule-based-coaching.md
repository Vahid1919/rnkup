# Coaching is a fixed set of rules ranked by what decides the player's wins

Insights in `src/lib/dashboard/insights.ts` are hand-written rules (opening
duels, trading, damage, maps, agent pool, …). Each rule fires only above a
sample-size threshold, and rules are ranked by how strongly the related stat
separates this player's wins from losses (`drivers.ts`). We chose rules over
an LLM or a trained model because the output must be deterministic, testable
with plain objects, explainable ("why this matters" cites the player's own
numbers) and free to run.

## Consequences

- Adding advice means adding a rule function and a test, not tuning a prompt.
- Coaching is hidden below 8 matches, and at most three focus items are shown.
