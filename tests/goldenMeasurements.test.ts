import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { MeasurementResult } from "../src/core/types";
import { measureImage } from "../src/node/index";

/**
 * Catches measurement accuracy drift (the bench suite only catches speed).
 * After intentional algorithm changes, regenerate with:
 *   UPDATE_GOLDENS=1 bun test tests/goldenMeasurements.test.ts
 */

const LOGOS_DIR = join(import.meta.dir, "../static/logos");
const GOLDEN_PATH = join(import.meta.dir, "golden-measurements.json");

// Absorbs rasterizer noise across platforms while catching systematic drift
const BOX_TOLERANCE_RATIO = 0.03;
const DENSITY_TOLERANCE = 0.03;
const LUMINANCE_TOLERANCE = 0.02;

const svgFiles = readdirSync(LOGOS_DIR)
  .filter((f) => f.endsWith(".svg"))
  .sort();

async function measureAll(): Promise<Record<string, MeasurementResult>> {
  const entries = await Promise.all(
    svgFiles.map(async (file) => {
      const result = await measureImage(join(LOGOS_DIR, file));
      return [file, result] as const;
    }),
  );
  return Object.fromEntries(entries);
}

function expectClose(
  label: string,
  actual: number | undefined,
  expected: number | undefined,
  tolerance: number,
) {
  const diff = Math.abs((actual ?? -1) - (expected ?? -1));
  if (diff > tolerance) {
    throw new Error(
      `${label} drifted by ${diff.toFixed(2)} (tolerance ${tolerance.toFixed(2)})`,
    );
  }
}

if (process.env.UPDATE_GOLDENS) {
  test("regenerate golden measurements", async () => {
    const results = await measureAll();
    await writeFile(GOLDEN_PATH, `${JSON.stringify(results, null, 2)}\n`);
    console.log(`Wrote ${svgFiles.length} golden measurements`);
  });
} else {
  describe("golden measurements", () => {
    test("measurements match goldens within tolerance", async () => {
      const golden: Record<string, MeasurementResult> = JSON.parse(
        await readFile(GOLDEN_PATH, "utf8"),
      );
      const current = await measureAll();

      for (const file of svgFiles) {
        const expected = golden[file];
        const actual = current[file];
        if (!expected) {
          throw new Error(
            `${file} missing from goldens — run UPDATE_GOLDENS=1 bun test tests/goldenMeasurements.test.ts`,
          );
        }
        if (!actual) throw new Error(`${file} failed to measure`);

        expect(actual.width).toBe(expected.width);
        expect(actual.height).toBe(expected.height);

        const tolX = Math.max(2, expected.width * BOX_TOLERANCE_RATIO);
        const tolY = Math.max(2, expected.height * BOX_TOLERANCE_RATIO);
        const checks: [
          string,
          number | undefined,
          number | undefined,
          number,
        ][] = [
          ["contentBox.x", actual.contentBox?.x, expected.contentBox?.x, tolX],
          ["contentBox.y", actual.contentBox?.y, expected.contentBox?.y, tolY],
          [
            "contentBox.width",
            actual.contentBox?.width,
            expected.contentBox?.width,
            tolX,
          ],
          [
            "contentBox.height",
            actual.contentBox?.height,
            expected.contentBox?.height,
            tolY,
          ],
          [
            "visualCenter.x",
            actual.visualCenter?.x,
            expected.visualCenter?.x,
            tolX,
          ],
          [
            "visualCenter.y",
            actual.visualCenter?.y,
            expected.visualCenter?.y,
            tolY,
          ],
          [
            "pixelDensity",
            actual.pixelDensity,
            expected.pixelDensity,
            DENSITY_TOLERANCE,
          ],
          [
            "backgroundLuminance",
            actual.backgroundLuminance,
            expected.backgroundLuminance,
            LUMINANCE_TOLERANCE,
          ],
        ];

        for (const [label, actualValue, expectedValue, tolerance] of checks) {
          expectClose(
            `${file}: ${label}`,
            actualValue,
            expectedValue,
            tolerance,
          );
        }
      }
    });
  });
}
