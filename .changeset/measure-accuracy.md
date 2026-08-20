---
"@sanity-labs/logo-soup": patch
---

Measurement accuracy improvements: content classification and visual-center weighting now use the perceptually-weighted "redmean" color distance instead of plain RGB Euclidean (thresholds rescaled so `contrastThreshold` semantics are unchanged for neutral contrast), and the measurement downscale uses `imageSmoothingQuality: "high"` so hairline strokes survive the downsample. Measured values (contentBox, visualCenter, pixelDensity) may shift slightly.
