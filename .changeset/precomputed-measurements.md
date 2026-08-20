---
"@sanity-labs/logo-soup": minor
---

Add a `measurements` option for pre-computed measurement data (e.g. from the Node adapter). The engine seeds its cache from it, skipping image loading and pixel scanning for covered logos. In React, full coverage renders the final layout on the very first pass — pure math, SSR-safe, zero layout shift. Partial coverage falls back to client-side measurement per logo.
