---
"@sanity-labs/logo-soup": minor
---

Report per-logo failures. Previously a logo that failed to load silently disappeared from the results with no way to detect which one broke. The engine state now includes `failures: { src, error }[]`, exposed through every adapter (`useLogoSoup().failures`, Vue/Solid/Svelte getters), and the React `<LogoSoup>` component accepts an `onError(failures)` callback. `status` and `error` semantics are unchanged.
