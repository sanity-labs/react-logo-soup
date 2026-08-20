---
"@sanity-labs/logo-soup": patch
---

Add golden measurement tests: measurement results for the full test logo set are snapshotted with bounded tolerance, so accuracy regressions in the pixel scan are caught in CI (the bench suite only catches speed regressions).
