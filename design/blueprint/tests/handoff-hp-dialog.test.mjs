// Found while refreshing the stale conditions journeys (hand-offs of audit round 2): the
// conditions panel's «Punti ferita…» closes its own dialog and opens the HP widget dialog in
// the same `<dialog>`. The browser dispatches the first dialog's `close` event afterwards, and
// the HP dialog took it for its own close: it forgot it was open and stopped redrawing, so
// after «Imposta» 5 Temporary HP it still showed 0 and no «non si sommano» choice. A fake
// dialog element replays that order. Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import * as UI from "../damage-tray.mjs";
import * as W from "../hp-widget.mjs";
import { harness } from "./p5-harness.mjs";

const previous = globalThis.document;
afterEach(() => {
  globalThis.document = previous;
  W.resetWidgetView?.();
});

test("the HP dialog opened right after another dialog closed keeps redrawing after a change", () => {
  const h = harness({ role: "player" });
  assert.equal(h.registry.use("damage-tray", UI.register).status, "built");
  h.registry.initState(h.ctx.state);
  const ctx = h.ctx;
  const node = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
  const listeners = [];
  const dialog = {
    open: false,
    addEventListener: (type, fn, options) => listeners.push({ type, fn, once: options?.once }),
    removeEventListener: (type, fn) => {
      const i = listeners.findIndex((l) => l.type === type && l.fn === fn);
      if (i >= 0) listeners.splice(i, 1);
    },
  };
  globalThis.document = {
    querySelector(selector) {
      if (selector === "#dialog") return dialog;
      if (selector === "#dialog[open] [data-dt-dialog]") return dialog.open ? node : null;
      return null;
    },
    querySelectorAll: () => [],
  };
  let queued = false;
  ctx.dialog = (title, body) => {
    dialog.open = true;
    node.innerHTML = body;
  };
  ctx.closeDialog = () => {
    dialog.open = false;
    queued = true; // the browser fires `close` later, as a task
  };
  // The conditions panel was open; «Punti ferita…» closes it and opens the HP dialog.
  dialog.open = true;
  ctx.closeDialog();
  UI.openHpDialog(ctx, "livia", "sheet");
  assert.equal(dialog.open, true);
  // Now the first dialog's close event arrives.
  if (queued)
    for (const l of [...listeners].filter((l) => l.type === "close")) {
      if (l.once) listeners.splice(listeners.indexOf(l), 1);
      l.fn({ target: dialog });
    }
  // Temporary HP set in the widget: the dialog is drawn again with the new value.
  W.commitChange(ctx, "livia", "PF temporanei", (draft) => {
    draft.actors.livia.tempHp = 5;
  });
  assert.equal(ctx.state.actors.livia.tempHp, 5);
  assert.match(node.innerHTML, /Ne hai già 5: non si sommano/);
  // A real close later still forgets the dialog (nothing redraws a closed dialog).
  dialog.open = false;
  for (const l of [...listeners].filter((l) => l.type === "close")) l.fn({ target: dialog });
  const before = node.innerHTML;
  W.commitChange(ctx, "livia", "PF temporanei", (draft) => {
    draft.actors.livia.tempHp = 7;
  });
  assert.equal(node.innerHTML, before);
});
