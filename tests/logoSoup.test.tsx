import { describe, expect, test } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import { LogoSoup } from "../src/react/logo-soup";

const originalImage = globalThis.Image;

function installMockImage() {
  globalThis.Image = class MockImage {
    crossOrigin = "";
    src = "";
    naturalWidth = 200;
    naturalHeight = 100;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    constructor() {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  } as unknown as typeof Image;
}

describe("LogoSoup", () => {
  test("rendered imgs reuse the measurement CORS mode and expose list semantics", async () => {
    installMockImage();

    const { container } = render(
      <LogoSoup logos={[{ src: "https://example.com/a.png", alt: "A" }]} />,
    );

    await waitFor(() => {
      expect(container.querySelector("img")).not.toBeNull();
    });

    const img = container.querySelector("img")!;
    // Must match loadImage's crossOrigin, or browsers re-download every logo
    expect(img.getAttribute("crossorigin")).toBe("anonymous");
    expect(img.getAttribute("alt")).toBe("A");

    expect(container.querySelector("[role='list']")).not.toBeNull();
    expect(container.querySelector("[role='listitem']")).not.toBeNull();

    globalThis.Image = originalImage;
  });
});
