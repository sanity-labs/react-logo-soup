# @sanity-labs/logo-soup

## 1.3.0

### Minor Changes

- [#51](https://github.com/sanity-labs/logo-soup/pull/51) [`fc5ea47`](https://github.com/sanity-labs/logo-soup/commit/fc5ea47d00b5b967ceeba4c8222b91d10059660c) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Keep previous results visible while a new logo set loads instead of flashing to an empty state, and fix the React fade-in (the old per-item opacity transition never ran because items mounted already visible; the fade now lives on the always-mounted container). During `loading`, `normalizedLogos` now holds the previous run's results — use the `isLoading` flag or `data-logo-soup-loading` attribute to detect staleness.

- [#44](https://github.com/sanity-labs/logo-soup/pull/44) [`222e1e5`](https://github.com/sanity-labs/logo-soup/commit/222e1e57c11e453f4174bed77a80ed1dc4a3937e) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Expose a `globalThis.__LOGO_SOUP__` detection global (set to the package version) when an engine is created, so tools like Wappalyzer and HTTP Archive can identify sites using logo-soup

- [#50](https://github.com/sanity-labs/logo-soup/pull/50) [`fd375b3`](https://github.com/sanity-labs/logo-soup/commit/fd375b3c60e96f8a61d7a471966ea447df6772e5) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Report per-logo failures. Previously a logo that failed to load silently disappeared from the results with no way to detect which one broke. The engine state now includes `failures: { src, error }[]`, exposed through every adapter (`useLogoSoup().failures`, Vue/Solid/Svelte getters), and the React `<LogoSoup>` component accepts an `onError(failures)` callback. `status` and `error` semantics are unchanged.

- [#52](https://github.com/sanity-labs/logo-soup/pull/52) [`7690df6`](https://github.com/sanity-labs/logo-soup/commit/7690df6cd85ade11358ca77ce1bf3ab901fecb70) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Add a `measurements` option for pre-computed measurement data (e.g. from the Node adapter). The engine seeds its cache from it, skipping image loading and pixel scanning for covered logos. In React, full coverage renders the final layout on the very first pass — pure math, SSR-safe, zero layout shift. Partial coverage falls back to client-side measurement per logo.

### Patch Changes

- [#55](https://github.com/sanity-labs/logo-soup/pull/55) [`32beaa2`](https://github.com/sanity-labs/logo-soup/commit/32beaa2659177d2c5160822df3403013a933ca69) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Widen peer ranges: `@napi-rs/canvas` now accepts `^1` (stable 1.0, no breaking changes per upstream) and `@angular/core` accepts `^22`.

- [#49](https://github.com/sanity-labs/logo-soup/pull/49) [`84ecf84`](https://github.com/sanity-labs/logo-soup/commit/84ecf84016df54c8d2e2bd0e0b3ee06773c30287) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Add golden measurement tests: measurement results for the full test logo set are snapshotted with bounded tolerance, so accuracy regressions in the pixel scan are caught in CI (the bench suite only catches speed regressions).

- [#48](https://github.com/sanity-labs/logo-soup/pull/48) [`2f11ead`](https://github.com/sanity-labs/logo-soup/commit/2f11eadf408f8ce43d3060065177d48343f56e8e) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Measurement accuracy improvements: content classification and visual-center weighting now use the perceptually-weighted "redmean" color distance instead of plain RGB Euclidean (thresholds rescaled so `contrastThreshold` semantics are unchanged for neutral contrast), and the measurement downscale uses `imageSmoothingQuality: "high"` so hairline strokes survive the downsample. Measured values (contentBox, visualCenter, pixelDensity) may shift slightly.

- [#47](https://github.com/sanity-labs/logo-soup/pull/47) [`b2d3c38`](https://github.com/sanity-labs/logo-soup/commit/b2d3c386f617220c3c54e4a8c3b5fa7d64bd67db) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Rendered `<img>` elements now set `crossOrigin="anonymous"` to match the measurement request. Browsers key the HTTP cache by request mode, so the mismatch caused every logo to be downloaded twice. Also adds `decoding="async"` and `role="list"`/`role="listitem"` semantics to the React component.

- [#46](https://github.com/sanity-labs/logo-soup/pull/46) [`00459ee`](https://github.com/sanity-labs/logo-soup/commit/00459ee3d0d8b8aeadfbf4b329b0db95ae5e2624) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Fix a React render loop when `backgroundColor` is passed as an inline tuple (e.g. `backgroundColor={[255, 255, 255]}`). The engine now also keeps its snapshot referentially stable when `process()` is called with identical inputs on a warm cache, avoiding redundant emits across all framework adapters.

## 1.2.2

### Patch Changes

- [#42](https://github.com/sanity-labs/logo-soup/pull/42) [`8fadbbe`](https://github.com/sanity-labs/logo-soup/commit/8fadbbef66c30153f771d3f392030907820b05d6) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Fixed React `useLogoSoup` hook and `LogoSoup` component getting stuck in loading state when React is running in StrictMode.

  Added `cancel()` method to the engine to separate reversible cancellation from permanent destruction, and reworked the React hook's effect cleanup to follow React's setup → cleanup → setup contract.

## 1.2.0

### Minor Changes

- [#37](https://github.com/sanity-labs/logo-soup/pull/37) [`2474d14`](https://github.com/sanity-labs/logo-soup/commit/2474d14190558c735b2dbdc59aea533eba4bfa61) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Add Node.js adapter (`@sanity-labs/logo-soup/node`) for server-side logo measurement using `@napi-rs/canvas`. Extract shared pixel math into `measureContent` pipeline used by both browser and Node paths. Includes `measureImage`, `measureImages`, and re-exports of `createNormalizedLogo`, `calculateNormalizedDimensions`, and `getVisualCenterTransform` with all supporting types.

## 1.1.0

### Minor Changes

- [#30](https://github.com/sanity-labs/logo-soup/pull/30) [`39a6e18`](https://github.com/sanity-labs/logo-soup/commit/39a6e1899b6c5911563bc4f3943b1bdec11ad846) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Add jQuery 4.x adapter via `@sanity-labs/logo-soup/jquery`. Provides a `$.fn.logoSoup` plugin with `process`, `ready`, `destroy`, and `instance` methods. Auto-installs onto `window.jQuery` if available, or call `install($)` manually with a bundler.

## 2.0.0

### Major Changes

- [#28](https://github.com/sanity-labs/logo-soup/pull/28) [`6f61604`](https://github.com/sanity-labs/logo-soup/commit/6f6160400f1795de3a67014701d5b4c0cf9818d1) Thanks [@RostiMelk](https://github.com/RostiMelk)! - Multi-framework support. The package is now framework-agnostic with subpath exports for React, Vue, Svelte, Solid, and Angular.
  - `@sanity-labs/logo-soup` — Core engine, types, and utilities
  - `@sanity-labs/logo-soup/react` — `useLogoSoup` hook + `LogoSoup` component
  - `@sanity-labs/logo-soup/vue` — `useLogoSoup` composable
  - `@sanity-labs/logo-soup/svelte` — `createLogoSoup` (Svelte 5 runes)
  - `@sanity-labs/logo-soup/solid` — `useLogoSoup` primitive
  - `@sanity-labs/logo-soup/angular` — `LogoSoupService` injectable
