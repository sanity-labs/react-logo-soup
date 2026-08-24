/**
 * Regenerates docs/images/* from Storybook stories via headless Chrome CDP.
 * Prereq: `bun run storybook:build`. Chrome binary resolved from $CHROME_BIN
 * or the local puppeteer cache.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

const STATIC_DIR = "storybook-static";
const OUT_DIR = "docs/images";
const HTTP_PORT = 6099;
const CDP_PORT = 9333;

type Shot = {
  file: string;
  storyArgs: string;
  width?: number;
};

const shots: Shot[] = [
  { file: "gap-tight.png", storyArgs: "count:12;gap:16" },
  // densityFactor 0.334 cancels the gap-96 boost (0.5 / 1.496), rendering
  // the pre-compensation look for the docs comparison
  { file: "gap-wide.png", storyArgs: "count:12;gap:96;densityFactor:0.334" },
  { file: "gap-wide-compensated.png", storyArgs: "count:12;gap:96" },
];

function resolveChromeBin(): string {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const cacheRoot = join(
    process.env.HOME ?? "",
    ".cache/puppeteer/chrome-headless-shell",
  );
  const versions = readdirSync(cacheRoot).sort().reverse();
  for (const version of versions) {
    const dir = join(cacheRoot, version);
    for (const sub of readdirSync(dir)) {
      if (sub.startsWith("chrome-headless-shell-")) {
        return join(dir, sub, "chrome-headless-shell");
      }
    }
  }
  throw new Error("No Chrome found; set CHROME_BIN");
}

function serveStatic() {
  return Bun.serve({
    port: HTTP_PORT,
    async fetch(req) {
      const path = new URL(req.url).pathname;
      const file = Bun.file(
        join(STATIC_DIR, path === "/" ? "index.html" : path),
      );
      return (await file.exists())
        ? new Response(file)
        : new Response("not found", { status: 404 });
    },
  });
}

type CdpClient = {
  send: (method: string, params?: object) => Promise<any>;
  close: () => void;
};

async function connectCdp(): Promise<CdpClient> {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const res = await fetch(`http://localhost:${CDP_PORT}/json/list`);
      const targets = (await res.json()) as {
        type: string;
        webSocketDebuggerUrl: string;
      }[];
      const page = targets.find((t) => t.type === "page");
      if (page) return openSocket(page.webSocketDebuggerUrl);
    } catch {
      // Chrome not up yet
    }
    await Bun.sleep(250);
  }
  throw new Error("Could not connect to Chrome DevTools");
}

function openSocket(url: string): Promise<CdpClient> {
  return new Promise((resolve, reject) => {
    const pending = new Map<
      number,
      { resolve: (v: any) => void; reject: (e: Error) => void }
    >();
    let nextId = 1;
    const ws = new WebSocket(url);
    ws.onerror = () => reject(new Error("CDP socket error"));
    ws.onmessage = (event) => {
      const msg = JSON.parse(String(event.data));
      const waiter = pending.get(msg.id);
      if (!waiter) return;
      pending.delete(msg.id);
      if (msg.error) waiter.reject(new Error(msg.error.message));
      else waiter.resolve(msg.result);
    };
    ws.onopen = () =>
      resolve({
        send: (method, params = {}) =>
          new Promise((res, rej) => {
            const id = nextId++;
            pending.set(id, { resolve: res, reject: rej });
            ws.send(JSON.stringify({ id, method, params }));
          }),
        close: () => ws.close(),
      });
  });
}

async function evalInPage(cdp: CdpClient, expression: string) {
  const { result } = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
  });
  return result.value;
}

async function waitForLogos(cdp: CdpClient) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const ready = await evalInPage(
      cdp,
      `(() => {
        const root = document.querySelector('[data-logo-soup-loading]');
        if (!root || root.getAttribute('data-logo-soup-loading') !== 'false') return false;
        const imgs = [...root.querySelectorAll('img')];
        return imgs.length > 0 && imgs.every((i) => i.complete);
      })()`,
    );
    if (ready) return;
    await Bun.sleep(250);
  }
  throw new Error("Logos never finished loading");
}

async function capture(cdp: CdpClient, shot: Shot) {
  const url = `http://localhost:${HTTP_PORT}/iframe.html?id=logosoup--default&args=${shot.storyArgs}`;
  await cdp.send("Page.navigate", { url });
  await waitForLogos(cdp);
  // Settle the fade-in transition
  await Bun.sleep(400);

  const rect = await evalInPage(
    cdp,
    `(() => {
      const el = document.querySelector('[data-logo-soup-loading]');
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })()`,
  );

  const pad = 24;
  const { data } = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: {
      x: Math.max(0, rect.x - pad),
      y: Math.max(0, rect.y - pad),
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
      scale: 2,
    },
  });

  const out = join(OUT_DIR, shot.file);
  await Bun.write(out, Buffer.from(data, "base64"));
  console.log(`captured ${out}`);
}

const server = serveStatic();
const chrome = Bun.spawn(
  [
    resolveChromeBin(),
    `--remote-debugging-port=${CDP_PORT}`,
    "--user-data-dir=/tmp/logo-soup-docs-shots",
    "--window-size=880,600",
    "--hide-scrollbars",
    "about:blank",
  ],
  { stdout: "ignore", stderr: "ignore" },
);

try {
  const cdp = await connectCdp();
  await cdp.send("Page.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 880,
    height: 600,
    deviceScaleFactor: 1,
    mobile: false,
  });
  for (const shot of shots) {
    await capture(cdp, shot);
  }
  cdp.close();
} finally {
  chrome.kill();
  server.stop();
}
