---
"@sanity-labs/logo-soup": patch
---

Rendered `<img>` elements now set `crossOrigin="anonymous"` to match the measurement request. Browsers key the HTTP cache by request mode, so the mismatch caused every logo to be downloaded twice. Also adds `decoding="async"` and `role="list"`/`role="listitem"` semantics to the React component.
