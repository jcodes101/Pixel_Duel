# Test coverage

Run the automated combat regression suite with `npm test`. It uses Node's built-in test runner and tests the server-independent combat rules.

Socket-level privacy and submission validation are not automated yet. A two-browser smoke test verified that a pending move is shown only as an opponent lock indicator, both moves appear after both players submit, combat resolves, and a rematch returns both clients to round 1. Automated coverage for event payload privacy, invalid or duplicate submissions, and phase-gated moves remains deferred.

The smoke test also exposed an existing client error during the first rematch vote: the server publishes a `GAME_OVER` state with `result: null`, while the client reads `result.winner`. The second vote still resets the match. This pre-existing UI issue was left unchanged under the Phase 1 restrictions.
