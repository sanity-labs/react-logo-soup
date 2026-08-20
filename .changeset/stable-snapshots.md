---
"@sanity-labs/logo-soup": patch
---

Fix a React render loop when `backgroundColor` is passed as an inline tuple (e.g. `backgroundColor={[255, 255, 255]}`). The engine now also keeps its snapshot referentially stable when `process()` is called with identical inputs on a warm cache, avoiding redundant emits across all framework adapters.
