import { describe, expect, test, afterEach } from "bun:test";
import { createLogoSoup } from "../src/core/create-logo-soup";

const originalImage = globalThis.Image;

function installMockImage(opts: { shouldFail?: boolean } = {}) {
  globalThis.Image = class MockImage {
    crossOrigin = "";
    src = "";
    naturalWidth = 200;
    naturalHeight = 100;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    constructor() {
      queueMicrotask(() => {
        if (opts.shouldFail) this.onerror?.();
        else this.onload?.();
      });
    }
  } as unknown as typeof Image;
}

function restoreImage() {
  globalThis.Image = originalImage;
}

function waitFor(
  fn: () => void,
  { timeout = 2000, interval = 10 } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      try {
        fn();
        resolve();
      } catch (err) {
        if (Date.now() - start > timeout) {
          reject(err);
        } else {
          setTimeout(check, interval);
        }
      }
    };
    check();
  });
}

describe("createLogoSoup", () => {
  afterEach(() => restoreImage());

  test("starts in idle state", () => {
    const engine = createLogoSoup();
    const snapshot = engine.getSnapshot();

    expect(snapshot.status).toBe("idle");
    expect(snapshot.normalizedLogos).toEqual([]);
    expect(snapshot.error).toBe(null);

    engine.destroy();
  });

  test("sets the __LOGO_SOUP__ detection global", () => {
    const engine = createLogoSoup();

    expect(
      (globalThis as { __LOGO_SOUP__?: string }).__LOGO_SOUP__,
    ).toBeString();

    engine.destroy();
  });

  test("getSnapshot returns stable reference when state has not changed", () => {
    const engine = createLogoSoup();
    const a = engine.getSnapshot();
    const b = engine.getSnapshot();

    expect(a).toBe(b);

    engine.destroy();
  });

  test("transitions to ready with empty logos", async () => {
    const engine = createLogoSoup();

    engine.process({ logos: [] });

    const snapshot = engine.getSnapshot();
    expect(snapshot.status).toBe("ready");
    expect(snapshot.normalizedLogos).toEqual([]);
    expect(snapshot.error).toBe(null);

    engine.destroy();
  });

  test("transitions idle → loading → ready", async () => {
    installMockImage();
    const engine = createLogoSoup();
    const statuses: string[] = [];

    engine.subscribe(() => {
      statuses.push(engine.getSnapshot().status);
    });

    engine.process({ logos: ["logo.png"] });

    await waitFor(() => {
      expect(engine.getSnapshot().status).toBe("ready");
    });

    expect(statuses).toContain("loading");
    expect(statuses).toContain("ready");
    expect(engine.getSnapshot().normalizedLogos).toHaveLength(1);
    expect(engine.getSnapshot().normalizedLogos[0]?.src).toBe("logo.png");

    engine.destroy();
  });

  test("normalizes multiple logos", async () => {
    installMockImage();
    const engine = createLogoSoup();

    engine.process({ logos: ["a.png", "b.png", "c.png"] });

    await waitFor(() => {
      expect(engine.getSnapshot().status).toBe("ready");
    });

    expect(engine.getSnapshot().normalizedLogos).toHaveLength(3);

    engine.destroy();
  });

  test("reports errors for broken images", async () => {
    installMockImage({ shouldFail: true });
    const engine = createLogoSoup();

    engine.process({ logos: ["broken.png"] });

    await waitFor(() => {
      expect(engine.getSnapshot().status).toBe("error");
    });

    expect(engine.getSnapshot().error).toBeInstanceOf(Error);
    expect(engine.getSnapshot().normalizedLogos).toEqual([]);

    engine.destroy();
  });

  test("subscribe returns a working unsubscribe function", async () => {
    installMockImage();
    const engine = createLogoSoup();
    let callCount = 0;

    const unsubscribe = engine.subscribe(() => {
      callCount++;
    });

    engine.process({ logos: ["a.png"] });

    await waitFor(() => {
      expect(engine.getSnapshot().status).toBe("ready");
    });

    const countAfterReady = callCount;
    unsubscribe();

    engine.process({ logos: ["b.png"] });

    await waitFor(() => {
      expect(engine.getSnapshot().status).toBe("ready");
    });

    expect(callCount).toBe(countAfterReady);

    engine.destroy();
  });

  test("cancels in-flight work when process is called again", async () => {
    let loadCount = 0;
    globalThis.Image = class MockImage {
      crossOrigin = "";
      src = "";
      naturalWidth = 200;
      naturalHeight = 100;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor() {
        loadCount++;
        // Delay the first batch so we can cancel it
        const delay = loadCount <= 2 ? 50 : 0;
        setTimeout(() => {
          this.onload?.();
        }, delay);
      }
    } as unknown as typeof Image;

    const engine = createLogoSoup();

    // Start first process — this will be cancelled
    engine.process({ logos: ["slow1.png", "slow2.png"] });

    // Immediately start second process — should cancel first
    engine.process({ logos: ["fast.png"] });

    await waitFor(() => {
      expect(engine.getSnapshot().status).toBe("ready");
    });

    // Should have results from the second call only
    expect(engine.getSnapshot().normalizedLogos).toHaveLength(1);
    expect(engine.getSnapshot().normalizedLogos[0]?.src).toBe("fast.png");

    engine.destroy();
  });

  test("uses cache on subsequent process calls with same logos", async () => {
    installMockImage();
    const engine = createLogoSoup();

    engine.process({ logos: ["cached.png"], baseSize: 48 });

    await waitFor(() => {
      expect(engine.getSnapshot().status).toBe("ready");
    });

    const firstResult = engine.getSnapshot().normalizedLogos[0];

    // Process again with different baseSize but same logo — should use cached measurement
    engine.process({ logos: ["cached.png"], baseSize: 96 });

    // Should resolve synchronously from cache (no loading state)
    const snapshot = engine.getSnapshot();
    expect(snapshot.status).toBe("ready");
    expect(snapshot.normalizedLogos[0]?.src).toBe("cached.png");
    expect(snapshot.normalizedLogos[0]?.normalizedWidth).not.toBe(
      firstResult?.normalizedWidth,
    );

    engine.destroy();
  });

  test("destroy prevents further state updates", async () => {
    installMockImage();
    const engine = createLogoSoup();
    let callCount = 0;

    engine.subscribe(() => {
      callCount++;
    });

    engine.destroy();

    engine.process({ logos: ["a.png"] });

    // Wait a tick to make sure nothing fires
    await new Promise((r) => setTimeout(r, 50));

    expect(callCount).toBe(0);
    expect(engine.getSnapshot().status).toBe("idle");
  });

  test("cancel() stops in-flight work without destroying the engine", async () => {
    installMockImage();
    const engine = createLogoSoup();

    engine.process({ logos: ["a.png"] });
    expect(engine.getSnapshot().status).toBe("loading");

    engine.cancel();

    // In-flight work was cancelled — no transition to ready
    await new Promise((r) => setTimeout(r, 50));
    expect(engine.getSnapshot().status).toBe("loading");

    // Engine is still alive — a new process() call works
    engine.process({ logos: ["a.png"] });

    await new Promise((r) => setTimeout(r, 50));
    expect(engine.getSnapshot().status).toBe("ready");
    expect(engine.getSnapshot().normalizedLogos).toHaveLength(1);
  });

  test("snapshot reference changes on state transitions", async () => {
    installMockImage();
    const engine = createLogoSoup();

    const idle = engine.getSnapshot();
    engine.process({ logos: ["a.png"] });

    // Should transition to loading with a new reference
    const loading = engine.getSnapshot();
    expect(loading).not.toBe(idle);

    await waitFor(() => {
      expect(engine.getSnapshot().status).toBe("ready");
    });

    const ready = engine.getSnapshot();
    expect(ready).not.toBe(loading);

    // Reading again without changes should return the same reference
    expect(engine.getSnapshot()).toBe(ready);

    engine.destroy();
  });

  test("re-processing identical inputs keeps the snapshot referentially stable", async () => {
    installMockImage();
    const engine = createLogoSoup();

    const options = {
      logos: ["a.png", "b.png"],
      baseSize: 48,
      scaleFactor: 0.5,
      backgroundColor: [255, 255, 255] as [number, number, number],
    };

    engine.process(options);

    await waitFor(() => {
      expect(engine.getSnapshot().status).toBe("ready");
    });

    const ready = engine.getSnapshot();
    let emitted = 0;
    engine.subscribe(() => {
      emitted++;
    });

    // Same inputs, new object/array references — must not emit or change state
    engine.process({
      ...options,
      logos: ["a.png", "b.png"],
      backgroundColor: [255, 255, 255],
    });

    expect(engine.getSnapshot()).toBe(ready);
    expect(emitted).toBe(0);

    // Changing a normalization param must still produce a new snapshot
    engine.process({ ...options, baseSize: 96 });
    expect(engine.getSnapshot()).not.toBe(ready);
    expect(emitted).toBe(1);

    engine.destroy();
  });
});
