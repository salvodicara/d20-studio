// Regression after visual pass 2 (30/09/2026): seams the browser journeys found red.
// Synthetic geometry only.
import test from "node:test";
import assert from "node:assert/strict";
import { mapViewport, viewAround } from "../token-menu.mjs";

// The phone Table (styles.css, visual pass 2) pads the bottom of #battle-map by 120 px so the
// scene is fitted above the party portraits and the zoom row: the border box is 390 × 560,
// the SVG viewport (its content box) 390 × 440.
const phoneMap = {
  getBoundingClientRect: () => ({ left: 0, top: 209, width: 390, height: 560 }),
};
const phoneStyle = {
  paddingTop: "0px",
  paddingRight: "0px",
  paddingBottom: "120px",
  paddingLeft: "0px",
  borderTopWidth: "0px",
  borderRightWidth: "0px",
  borderBottomWidth: "0px",
  borderLeftWidth: "0px",
};

test("visual2 regression: the pinch viewport is the map's content box, not its border box", () => {
  assert.deepEqual(mapViewport(phoneMap, phoneStyle), {
    left: 0,
    top: 209,
    width: 390,
    height: 440,
  });
  // No padding or border: the box itself (the desktop map uses margins).
  const plain = Object.fromEntries(Object.keys(phoneStyle).map((k) => [k, "0px"]));
  assert.deepEqual(mapViewport(phoneMap, plain), { left: 0, top: 209, width: 390, height: 560 });
});

test("visual2 regression: a two-finger pan on the padded phone map starts where the pinch left it", () => {
  // token-menu-journey group 16: after a pinch to zoom 2.5 the view is (300, 133.46); the
  // second gesture's anchor comes from the browser's own mapping (xMidYMid meet into the
  // viewport). Fingers that have not moved yet must leave the view where it is; before the
  // fix the first move jumped 61.5 scene units down (the border box moved the fitted scene).
  const scene = { width: 1000, height: 650 };
  const view = { zoom: 2.5, pan: { x: 300, y: 133.46 } };
  const w = scene.width / view.zoom;
  const h = scene.height / view.zoom;
  const viewport = { left: 0, top: 209, width: 390, height: 440 };
  const k = Math.min(viewport.width / w, viewport.height / h);
  const offX = (viewport.width - w * k) / 2;
  const offY = (viewport.height - h * k) / 2;
  const client = { x: 195, y: 349 };
  const anchor = {
    x: view.pan.x + (client.x - viewport.left - offX) / k,
    y: view.pan.y + (client.y - viewport.top - offY) / k,
  };
  const next = viewAround(scene, mapViewport(phoneMap, phoneStyle), view.zoom, anchor, client);
  assert.ok(Math.abs(next.pan.x - view.pan.x) < 1e-9, `x ${next.pan.x}`);
  assert.ok(Math.abs(next.pan.y - view.pan.y) < 1e-9, `y ${next.pan.y}`);
  // Fingers moving down 20 px move the view up by 20 px of scene (content follows them).
  const down = viewAround(scene, mapViewport(phoneMap, phoneStyle), view.zoom, anchor, {
    x: client.x,
    y: client.y + 20,
  });
  assert.ok(down.pan.y < view.pan.y);
});
