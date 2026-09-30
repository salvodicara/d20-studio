// P1 app shell: real network (SV-34) and the installable app (IN-11).
import test from "node:test";
import assert from "node:assert/strict";
import { wireNetwork, wireInstall, installState, promptInstall } from "../offline.mjs";

function fakeWindow({ onLine = true, userAgent = "Mozilla/5.0 (Macintosh)" } = {}) {
  const handlers = {};
  return {
    handlers,
    navigator: { onLine, userAgent, platform: "MacIntel", maxTouchPoints: 0 },
    addEventListener(type, fn) {
      (handlers[type] ??= []).push(fn);
    },
    fire(type, event = {}) {
      for (const fn of handlers[type] ?? []) fn(event);
    },
  };
}

test("SV-34: the browser's offline/online events drive the same offline state", async () => {
  const calls = [];
  const ctx = { setNetworkOffline: (value) => calls.push(value) };
  const win = fakeWindow({ onLine: false });
  assert.equal(
    wireNetwork(win, () => ctx),
    true,
  );
  // navigator.onLine is read at start.
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.deepEqual(calls, [true]);
  win.fire("online");
  win.fire("offline");
  assert.deepEqual(calls, [true, false, true]);
  // Installed once per page.
  assert.equal(
    wireNetwork(fakeWindow(), () => ctx),
    false,
  );
});

test("IN-11: the install prompt is kept and offered once; iOS falls back to the steps", async () => {
  const win = fakeWindow();
  let renders = 0;
  wireInstall(win, () => ({ render: () => renders++ }));
  assert.equal(installState(win).canPrompt, false);
  let prevented = false,
    prompted = false;
  win.fire("beforeinstallprompt", {
    preventDefault: () => (prevented = true),
    prompt: async () => (prompted = true),
    userChoice: Promise.resolve({ outcome: "accepted" }),
  });
  assert.equal(prevented, true);
  assert.equal(renders, 1);
  assert.equal(installState(win).canPrompt, true);
  assert.equal(await promptInstall(), "accepted");
  assert.equal(prompted, true);
  assert.equal(installState(win).installed, true);
  assert.equal(await promptInstall(), "unavailable");
  const ios = { navigator: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" } };
  assert.equal(installState(ios).ios, true);
});

test("IN-11: the manifest names the app, its icons and a standalone start page", async () => {
  const { readFile } = await import("node:fs/promises");
  const manifest = JSON.parse(await readFile(new URL("../manifest.webmanifest", import.meta.url)));
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.start_url);
  const sizes = manifest.icons.map((icon) => icon.sizes);
  assert.ok(sizes.includes("192x192") && sizes.includes("512x512"));
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /rel="manifest" href="manifest.webmanifest"/);
  const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");
  assert.match(sw, /addEventListener\("fetch"/);
  assert.doesNotMatch(sw, /caches\./);
});
