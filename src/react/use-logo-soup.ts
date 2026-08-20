import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { createLogoSoup } from "../core/create-logo-soup";
import {
  backgroundColorsEqual,
  createNormalizedLogo,
  logosEqual,
  measurementsEqual,
  normalizeSource,
  resolveDensityFactor,
} from "../core/normalize";
import type { LogoSoupState, NormalizedLogo } from "../core/types";
import type { UseLogoSoupOptions, UseLogoSoupResult } from "./types";

const SERVER_SNAPSHOT: LogoSoupState = {
  status: "idle",
  normalizedLogos: [],
  error: null,
  failures: [],
};

function getServerSnapshot(): LogoSoupState {
  return SERVER_SNAPSHOT;
}

/**
 * Returns a referentially stable value across renders as long as `isEqual`
 * holds, so inline literals (arrays, tuples) don't re-fire effects forever.
 */
function useStableValue<T>(value: T, isEqual: (a: T, b: T) => boolean): T {
  const ref = useRef(value);
  if (!isEqual(ref.current, value)) {
    ref.current = value;
  }
  return ref.current;
}

export function useLogoSoup(options: UseLogoSoupOptions): UseLogoSoupResult {
  const engineRef = useRef<ReturnType<typeof createLogoSoup> | null>(null);
  if (!engineRef.current) {
    engineRef.current = createLogoSoup();
  }
  const engine = engineRef.current;

  // Must be referentially stable to avoid resubscription every render
  const subscribe = useCallback(
    (onStoreChange: () => void) => engine.subscribe(onStoreChange),
    [engine],
  );
  const getSnapshot = useCallback(() => engine.getSnapshot(), [engine]);

  const storeState = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const stableLogos = useStableValue(options.logos, logosEqual);
  const backgroundColor = useStableValue(
    options.backgroundColor,
    backgroundColorsEqual,
  );
  const measurements = useStableValue(options.measurements, measurementsEqual);

  const {
    baseSize,
    scaleFactor,
    contrastThreshold,
    densityAware,
    densityFactor,
    cropToContent,
  } = options;

  // When measurements cover every logo, the ready state is pure math — no
  // canvas, no network. Computed in render so SSR emits final HTML (zero CLS)
  const precomputedState = useMemo((): LogoSoupState | null => {
    if (!measurements || cropToContent) return null;
    const effectiveDensityFactor = resolveDensityFactor(
      densityAware,
      densityFactor,
    );
    const results: NormalizedLogo[] = [];
    for (const logo of stableLogos) {
      const source = normalizeSource(logo);
      const measurement = measurements[source.src];
      if (!measurement) return null;
      results.push(
        createNormalizedLogo(
          source,
          measurement,
          baseSize,
          scaleFactor,
          effectiveDensityFactor,
        ),
      );
    }
    return {
      status: "ready",
      normalizedLogos: results,
      error: null,
      failures: [],
    };
  }, [
    stableLogos,
    measurements,
    baseSize,
    scaleFactor,
    densityAware,
    densityFactor,
    cropToContent,
  ]);

  const state = precomputedState ?? storeState;

  // Holds a deferred destroy timer so that StrictMode remounts can cancel it
  // before it fires. On a real unmount no remount follows and the timer
  // completes, cleaning up blob URLs and other resources.
  const destroyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Single effect: process on mount / when options change, cancel + deferred
  // destroy on cleanup. This satisfies React's setup → cleanup → setup contract:
  //   setup:   cancel pending destroy (StrictMode remount), start processing
  //   cleanup: cancel in-flight work, schedule destroy (real unmount lets it fire)
  useEffect(() => {
    clearTimeout(destroyTimerRef.current);

    engine.process({
      logos: stableLogos,
      measurements,
      baseSize,
      scaleFactor,
      contrastThreshold,
      densityAware,
      densityFactor,
      cropToContent,
      backgroundColor,
    });

    return () => {
      engine.cancel();
      destroyTimerRef.current = setTimeout(() => engine.destroy(), 0);
    };
  }, [
    engine,
    stableLogos,
    measurements,
    baseSize,
    scaleFactor,
    contrastThreshold,
    densityAware,
    densityFactor,
    cropToContent,
    backgroundColor,
  ]);

  return {
    isLoading: state.status === "loading",
    isReady: state.status === "ready",
    normalizedLogos: state.normalizedLogos,
    error: state.error,
    failures: state.failures,
  };
}
