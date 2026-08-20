---
"@sanity-labs/logo-soup": minor
---

Keep previous results visible while a new logo set loads instead of flashing to an empty state, and fix the React fade-in (the old per-item opacity transition never ran because items mounted already visible; the fade now lives on the always-mounted container). During `loading`, `normalizedLogos` now holds the previous run's results — use the `isLoading` flag or `data-logo-soup-loading` attribute to detect staleness.
