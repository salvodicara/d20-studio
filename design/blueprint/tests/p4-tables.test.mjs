// P4 fix PR-62 — Roll20 multi-sided tokens: the «Pedina a più facce» tool opens the table
// picker at once (never a tool that does nothing), and a creature token with several
// images offers «Lati…» in its right-click menu (random or chosen side). Real store and
// registry, the tool and token-menu contributions as the Table calls them.
import test from "node:test";
import assert from "node:assert/strict";
import * as rt from "../random-tables.mjs";
import * as mediaArea from "../media.mjs";
import * as media from "../media-domain.mjs";
import { harness, form } from "./p4-harness.mjs";

const setup = (role = "dm", lang = "it") =>
  harness({
    role,
    lang,
    areas: [
      ["media", mediaArea.register],
      ["random-tables", rt.register],
    ],
    view: { page: "table", id: "", tab: "" },
  });
function tableDouble(h) {
  const messages = [];
  const t = {
    scene: h.store.state.scenes.find((s) => s.id === h.store.state.activeSceneId),
    root: { querySelector: () => null },
    messages,
    mode: "random-tables-place",
    message: (text) => messages.push(text),
    setMode: (mode) => (t.mode = mode),
    point: (event) => ({ x: event.clientX, y: event.clientY }),
  };
  return t;
}

test("PR-62: the multi-sided token tool opens the table picker; the choice arms the click", () => {
  const h = setup();
  const tool = h.registry.get("table-tool", "random-tables-place");
  const table = tableDouble(h);
  tool.activate(h.ctx, table);
  const picker = h.dialogs.at(-1);
  assert.ok(picker, "the picker opens with the tool");
  assert.equal(picker.title, "Pedina a più facce");
  assert.match(picker.body, /name="table" value="marsh-weather"/);
  picker.options.onSubmit(form({ table: "marsh-weather" }));
  assert.match(table.messages.at(-1), /Clicca sulla mappa per posizionare «[^»]+»/);
  tool.onClick(h.ctx, { clientX: 320, clientY: 210 }, table);
  const tokens = h.store.state.ext["random-tables"].tokens;
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].tableId, "marsh-weather");
  assert.equal(table.mode, "move");
});

test("PR-62: right-click «Lati…» on a creature token with several images (Roll20 sides)", () => {
  const h = setup();
  const target = { actorId: "goblin-1", sceneId: h.store.state.activeSceneId };
  const item = h.registry
    .list("token-menu", h.ctx, target)
    .find((c) => c.id === "random-tables-sides");
  assert.ok(item, "offered on a token with two images");
  assert.equal(item.submenu, "look");
  assert.ok(
    !h.registry
      .list("token-menu", h.ctx, { actorId: "livia", sceneId: target.sceneId })
      .some((c) => c.id === "random-tables-sides"),
    "not on a token with one image",
  );
  item.run(h.ctx, target);
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.title, /Lati: Sentinella|Lati: /);
  assert.match(dialog.body, /name="side" value="v-goblin-1-b"/);
  assert.match(dialog.body, /name="side" value="random"/);
  dialog.options.onSubmit(form({ side: "v-goblin-1-b" }));
  assert.equal(media.lookOf(h.store.state, "goblin-1").token.active, "v-goblin-1-b");
  // A random side with a physical die: face 1 is the first image.
  item.run(h.ctx, target);
  h.dialogs.at(-1).options.onSubmit(form({ side: "random", face: "1" }));
  assert.equal(media.lookOf(h.store.state, "goblin-1").token.active, "v-goblin-1-a");
  // Players do not turn DM creatures.
  h.ctx.role = "player";
  assert.ok(
    !h.registry.list("token-menu", h.ctx, target).some((c) => c.id === "random-tables-sides"),
  );
});
