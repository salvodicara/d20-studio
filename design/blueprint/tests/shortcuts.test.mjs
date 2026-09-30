// B23 — shortcut domain: effective keys, conflicts, reserved keys, rebinding, reset and
// the generated guide (Improved Initiative CMP-155–157, Foundry FVT-191, Kobold+ CMP-239).
import test from "node:test";
import assert from "node:assert/strict";
import * as S from "../shortcuts.mjs";

const cmd = (id, shortcut = null, context = "global", extra = {}) => ({
  id,
  label: { it: id, en: id },
  shortcut,
  context,
  ...extra,
});
const commands = () => [
  cmd("palette.open", "Mod+K"),
  cmd("palette.create", "N"),
  cmd("table.aura", "E", "table"),
  cmd("table.end-turn", null, "table"),
  cmd("library.reader", "R", "library"),
  cmd("table.measure", "R", "table"),
];

test("seed and normalize keep only well-formed personal choices and refuse newer data", () => {
  assert.deepEqual(S.seedBindings(), { bindings: { player: {}, dm: {} } });
  const value = S.normalizeBindings({
    bindings: {
      player: { a: "ctrl+shift+k", b: "", c: "Hyper+Q", d: 5 },
      dm: "broken",
      ghost: { x: "N" },
    },
  });
  assert.deepEqual(value, { bindings: { player: { a: "Mod+Shift+K", b: "" }, dm: {} } });
  assert.throws(() => S.normalizeBindings({}, S.SLICE_VERSION + 1));
  // Idempotent: normalizing twice changes nothing.
  assert.deepEqual(S.normalizeBindings(value), value);
});

test("rows show default, custom and missing keys; conflicts only in overlapping contexts", () => {
  const rows = S.bindingRows(commands(), { "table.end-turn": "E", "palette.create": "" });
  const row = (id) => rows.find((r) => r.id === id);
  assert.equal(row("palette.open").status, "default");
  assert.equal(row("palette.open").shortcut, "Mod+K");
  assert.equal(row("palette.create").status, "custom");
  assert.equal(row("palette.create").shortcut, null);
  assert.equal(row("table.end-turn").shortcut, "E");
  assert.deepEqual(row("table.end-turn").conflicts, ["table.aura"]);
  assert.deepEqual(row("table.aura").conflicts, ["table.end-turn"]);
  // Same key on two different pages is not a conflict (registry rule).
  assert.deepEqual(row("library.reader").conflicts, []);
  assert.deepEqual(row("table.measure").conflicts, []);
  assert.deepEqual(S.conflictGroups(rows), [
    { shortcut: "E", ids: ["table.aura", "table.end-turn"] },
  ]);
  // A global key overlaps every page.
  const global = S.bindingRows([...commands(), cmd("global.r", "R")]);
  assert.equal(global.find((r) => r.id === "global.r").conflicts.length, 2);
});

test("reserved keys follow the core list and its contexts (Foundry locked binds)", () => {
  assert.equal(S.reservedBy("Enter", "global")?.shortcut, "Enter");
  assert.equal(S.reservedBy("Enter", "library")?.id, "press-enter");
  assert.equal(S.reservedBy("Tab", "table")?.id, "focus-next");
  assert.equal(S.reservedBy("ctrl+c", "library")?.id, "edit-c");
  assert.ok(S.reservedBy("ArrowUp", "table"));
  assert.ok(S.reservedBy("ArrowUp", "global"), "a global arrow would also fire on the Table");
  assert.equal(S.reservedBy("ArrowUp", "library"), null);
  assert.equal(S.reservedBy("Mod+Z", "characters"), null);
  assert.equal(S.reservedBy("E", "table"), null);
});

test("checkBinding refuses reserved keys, reports conflicts and accepts free keys", () => {
  const rows = S.bindingRows(commands());
  assert.equal(S.checkBinding(rows, "table.end-turn", "Enter").reserved.shortcut, "Enter");
  const conflict = S.checkBinding(rows, "table.end-turn", "e");
  assert.equal(conflict.shortcut, "E");
  assert.deepEqual(
    conflict.conflicts.map((r) => r.id),
    ["table.aura"],
  );
  assert.deepEqual(S.checkBinding(rows, "table.end-turn", "Shift+N"), {
    ok: true,
    shortcut: "Shift+N",
  });
  // N is global: it overlaps the Table.
  assert.deepEqual(
    S.checkBinding(rows, "table.end-turn", "N").conflicts.map((r) => r.id),
    ["palette.create"],
  );
  assert.deepEqual(S.checkBinding(rows, "table.end-turn", "Hyper+X"), { invalid: true });
  assert.throws(() => S.checkBinding(rows, "missing", "X"), /unavailable/);
});

test("setBinding moves a key only when confirmed, and a default returns to no override", () => {
  const slice = S.seedBindings();
  let rows = S.bindingRows(commands(), slice.bindings.player);
  assert.throws(
    () => S.setBinding(slice, "player", rows, "table.end-turn", "E"),
    (error) => error.it.includes("conferma lo spostamento"),
  );
  assert.deepEqual(slice.bindings.player, {}, "nothing saved on refusal");
  assert.throws(
    () => S.setBinding(slice, "player", rows, "table.end-turn", "Escape"),
    (error) => error.en.includes("reserved"),
  );
  const moved = S.setBinding(slice, "player", rows, "table.end-turn", "E", {
    displace: ["table.aura"],
  });
  assert.deepEqual(moved, ["table.aura"]);
  assert.deepEqual(slice.bindings.player, { "table.aura": "", "table.end-turn": "E" });
  rows = S.bindingRows(commands(), slice.bindings.player);
  assert.equal(S.keyHolder(rows, "e", "table").id, "table.end-turn");
  assert.equal(S.keyHolder(rows, "e", "home"), null, "table keys stay on the Table");
  // Back to the registered default: no override is stored.
  S.setBinding(slice, "player", rows, "table.aura", "E", { displace: ["table.end-turn"] });
  assert.deepEqual(slice.bindings.player, { "table.end-turn": "" });
  S.resetBinding(slice, "player", "table.end-turn");
  assert.deepEqual(slice.bindings.player, {});
  // Identities stay separate.
  S.clearBinding(slice, "dm", "palette.open");
  assert.deepEqual(slice.bindings, { player: {}, dm: { "palette.open": "" } });
  assert.equal(S.resetAllBindings(slice, "dm"), 1);
  assert.deepEqual(slice.bindings.dm, {});
  assert.throws(() => S.clearBinding(slice, "guest", "x"), /Invalid identity/);
});

test("a user choice wins a residual clash; otherwise the first command keeps the key", () => {
  const list = [cmd("a.first", "G"), cmd("b.second", null)];
  let rows = S.bindingRows(list, { "b.second": "G" });
  assert.equal(S.keyHolder(rows, "G", "home").id, "b.second");
  rows = S.bindingRows([cmd("a.first", "G"), cmd("b.second", "G")]);
  assert.equal(S.keyHolder(rows, "G", "home").id, "a.first");
});

test("keys read in Italian or English and adapt to Mac (DDB-086)", () => {
  assert.equal(S.formatShortcut("Mod+Shift+H", { lang: "it" }), "Ctrl+Maiusc+H");
  assert.equal(S.formatShortcut("Mod+Shift+H", { lang: "en" }), "Ctrl+Shift+H");
  assert.equal(S.formatShortcut("Mod+Shift+H", { lang: "en", mac: true }), "⌘⇧H");
  assert.equal(S.formatShortcut("Alt+R", { mac: true }), "⌥R");
  assert.equal(S.formatShortcut("ArrowUp"), "↑");
  assert.equal(S.formatShortcut("Escape", { lang: "it" }), "Esc");
  assert.equal(S.formatShortcut("?"), "?");
  assert.equal(S.formatShortcut(null), "");
  assert.deepEqual(S.shortcutParts("Mod+K", { lang: "it" }), ["Ctrl", "K"]);
  assert.deepEqual(S.shortcutParts("Mod+K", { mac: true }), ["⌘K"]);
});

test("the guide lists only keyed commands, everywhere first, then Table, then pages", () => {
  const rows = S.bindingRows(commands(), { "table.end-turn": "Shift+N" });
  const groups = S.guideGroups(
    rows,
    (row) => row.id,
    (context) => "ctx:" + context,
  );
  assert.deepEqual(
    groups.map((g) => g.context),
    ["global", "table", "library"],
  );
  assert.deepEqual(
    groups[1].rows.map((r) => r.id),
    ["table.aura", "table.end-turn", "table.measure"],
  );
  assert.equal(groups[0].title, "ctx:global");
  assert.ok(!groups.flatMap((g) => g.rows).some((r) => !r.shortcut));
});

// ------------------------------------------------------------------ review fixes (24/09)

test("Mac detection works on Chromium (userAgentData 'macOS') and Safari (platform)", () => {
  assert.equal(
    S.isMacPlatform({ userAgentData: { platform: "macOS" }, platform: "MacIntel" }),
    true,
  );
  assert.equal(S.isMacPlatform({ userAgentData: { platform: "macOS" } }), true);
  assert.equal(S.isMacPlatform({ platform: "MacIntel" }), true);
  assert.equal(S.isMacPlatform({ platform: "iPhone" }), true);
  assert.equal(S.isMacPlatform({ platform: "iPad" }), true);
  assert.equal(
    S.isMacPlatform({ userAgentData: { platform: "Windows" }, platform: "Win32" }),
    false,
  );
  assert.equal(S.isMacPlatform({ platform: "Linux x86_64" }), false);
  assert.equal(S.isMacPlatform({}), false);
  assert.equal(S.isMacPlatform(null), false, "no navigator (Node, workers)");
});

test("aria-keyshortcuts names the real keys (Control or Meta)", () => {
  assert.equal(S.ariaKeyshortcuts("Mod+K"), "Control+K");
  assert.equal(S.ariaKeyshortcuts("Mod+K", { mac: true }), "Meta+K");
  assert.equal(S.ariaKeyshortcuts("Mod+Shift+H"), "Control+Shift+H");
  assert.equal(S.ariaKeyshortcuts("Shift+F10"), "Shift+F10");
  assert.equal(S.ariaKeyshortcuts("Alt+R"), "Alt+R");
  assert.equal(S.ariaKeyshortcuts("?"), "?");
  assert.equal(S.ariaKeyshortcuts(null), "");
});

test("browser keys and Table element keys are refused like core keys", () => {
  const rows = S.bindingRows(commands());
  for (const key of ["Mod+R", "Mod+F", "Mod+P", "Mod+S", "Mod+L", "Mod+W", "Mod+T", "Mod+N", "F5"])
    assert.equal(S.checkBinding(rows, "palette.create", key).reserved?.kind, "browser", key);
  assert.equal(S.checkBinding(rows, "table.end-turn", "Delete").reserved?.kind, "element");
  assert.equal(S.checkBinding(rows, "table.end-turn", "Backspace").reserved?.kind, "element");
  assert.equal(S.checkBinding(rows, "library.reader", "Delete").reserved, undefined);
  assert.ok(S.checkBinding(rows, "palette.create", "Delete").reserved, "global overlaps the Table");
  assert.throws(() => S.setBinding({}, "player", rows, "palette.create", "Mod+S"), /reserved/);
  assert.equal(S.checkBinding(rows, "palette.create", "Mod+J").ok, true);
});

test("the core's fixed keys are listed for the guide with IT/EN labels", () => {
  const locked = S.lockedKeys();
  const byId = Object.fromEntries(locked.map((row) => [row.id, row]));
  assert.deepEqual(byId.undo.shortcuts, ["Mod+Z"]);
  assert.equal(byId.undo.context, "table");
  assert.deepEqual(byId.arrowup.shortcuts, ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
  assert.deepEqual(byId.cancel.shortcuts, ["Escape"]);
  assert.equal(byId.cancel.context, "global");
  assert.ok(locked.every((row) => row.label.it && row.label.en));
});
