import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { createLogoSoup } from "../core/create-logo-soup";
import { backgroundColorsEqual, logosEqual } from "../core/normalize";
import type { LogoSoupState } from "../core/types";
import type { UseLogoSoupOptions, UseLogoSoupResult } from "./types";

const SERVER_SNAPSHOT: LogoSoupState = {
  status: "idle",
  normalizedLogos: [],
  error: null,
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

  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const stableLogos = useStableValue(options.logos, logosEqual);
  const backgroundColor = useStableValue(
    options.backgroundColor,
    backgroundColorsEqual,
  );

  const {
    baseSize,
    scaleFactor,
    contrastThreshold,
    densityAware,
    densityFactor,
    cropToContent,
  } = options;

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
  };
}
