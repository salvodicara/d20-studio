// R6 SV-37 (Roll20 errors that name cause and fix): every disabled control rendered by the
// R6 files names why and what to do, in a sentence linked by aria-describedby. Each case
// renders a real disabled state and checks every disabled control in it.
// Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import * as L from "../character-library.mjs";
import * as IP from "../inventory-plus.mjs";
import * as SP from "../spells-plus.mjs";
import * as A from "../adventures.mjs";
import * as compendium from "../compendium.mjs";
import * as account from "../account.mjs";
import * as members from "../campaign-members.mjs";
import * as H from "../help.mjs";
import * as BP from "../builder-plus.mjs";
import * as BPD from "../builder-plus-domain.mjs";
import { createCharacterDraft } from "../character-build.mjs";
import {
  renderCharacterBuilder,
  startCharacterBuilder,
  resetCharacterBuilderView,
} from "../character-builder.mjs";
import { renderLibrary, startHomebrew, resetLibraryView } from "../library.mjs";
import { harness } from "./p4-harness.mjs";
import { harness as homeHarness, slotHTML } from "./home-harness.mjs";

// Every disabled form control must point at an element with a non-empty reason.
function described(html, label) {
  const controls = [...html.matchAll(/<(button|input|select|textarea)\b([^>]*)>/g)].filter(
    ([, , attrs]) => /\sdisabled(\s|=|$)/.test(attrs),
  );
  assert.ok(controls.length, `${label}: the case renders a disabled control`);
  for (const [whole, , attrs] of controls) {
    const id = attrs.match(/aria-describedby="([^"]+)"/)?.[1];
    assert.ok(id, `${label}: no reason for ${whole.slice(0, 160)}`);
    const at = html.indexOf(`id="${id}"`);
    assert.ok(at >= 0, `${label}: reason #${id} missing`);
    const text = html
      .slice(html.indexOf(">", at) + 1, html.indexOf("</", at))
      .replace(/<[^>]+>/g, "")
      .trim();
    assert.ok(text.length > 8, `${label}: reason #${id} is empty`);
  }
  return controls.length;
}

test("SV-37 spells-plus: confirm, prepare toggles, compare and source chips say why", () => {
  const h = harness({
    role: "player",
    areas: [
      ["character-library", L.register],
      ["inventory-plus", IP.register],
      ["spells-plus", SP.register],
    ],
    view: { page: "characters", id: "livia", tab: "spells" },
  });
  const panel = SP.spellsPanel(h.ctx, "livia");
  panel.manage = true;
  panel.tab = "prepare";
  panel.compare = ["srd:fire-bolt"];
  const html = SP.renderSpellsTab(h.ctx, h.store.state.actors.livia);
  described(html, "spells prepare");
  assert.match(html, /aria-describedby="spl-window-line"/);
  assert.match(html, /id="spl-why-compare">Serve una seconda magia/);
  panel.tab = "class";
  const list = SP.renderSpellsTab(h.ctx, h.store.state.actors.livia);
  described(list, "spells class list");
  // With the legacy source allowed (C4) the homebrew chip is shown disabled, with its reason.
  const chips = SP.renderClassList(h.ctx, "livia", { allowed: true, reason: null });
  assert.match(
    chips,
    /data-spl-source="homebrew"[^>]*disabled aria-describedby="spl-why-source-homebrew"/,
  );
  assert.match(
    chips,
    /id="spl-why-source-homebrew">Homebrew della campagna: nessuna magia attivata[^<]*il DM la abilita/,
  );
});

test("SV-37 account: a scheduled deletion locks the profile and says how to undo it", () => {
  const registry = createRegistry({ logger: null, document: null });
  registry.use("account", account.register);
  registry.use(members.ID, members.register);
  const state = createInitialState();
  registry.initState(state);
  account.requestDeletion(state, "player", {
    typed: "ELIMINA ACCOUNT",
    acknowledged: true,
    confirmWith: "email",
    now: Date.parse("2026-09-20T10:00:00Z"),
  });
  const ctx = {
    state,
    role: "player",
    lang: "it",
    view: { page: "account", tab: "profile" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (v && typeof v === "object" ? (v[ctx.lang] ?? v.it) : String(v ?? "")),
    esc,
    icon,
    registry,
  };
  const html = account.renderAccount(ctx);
  described(html, "account profile");
  assert.match(
    html,
    /id="account-locked-why">Finché è programmata il profilo non si modifica: premi «Annulla eliminazione»/,
  );
  ctx.view = { page: "account", tab: "access" };
  ctx.lang = "en";
  described(account.renderAccount(ctx), "account access");
});

test("SV-37 adventures: a blocked import names the block in the plan", () => {
  const h = harness({ role: "dm", areas: [["adventures", A.register]] });
  const adventure = A.readSlice(h.store.state).adventures[0];
  h.ctx.view = { page: "adventures", id: adventure.id, tab: "campaign" };
  h.store.state.library = [];
  const route = h.registry.get("route", "adventures", h.ctx);
  const html = route.render(h.ctx);
  if (/data-adv-submit[^>]*disabled/.test(html)) described(html, "adventure new campaign");
  h.ctx.view = { page: "adventures", id: adventure.id, tab: "import" };
  const page = route.render(h.ctx);
  described(page, "adventure import");
  assert.match(page, /id="adv-submit-why"/);
});

test("SV-37 builders and Library: apply and create name what is missing", async () => {
  resetCharacterBuilderView();
  const state = createInitialState();
  const ctx = {
    state,
    role: "player",
    lang: "it",
    view: { page: "builder", id: "", tab: "review" },
    t: (it) => it,
    label: (v) => (v && typeof v === "object" ? v.it : String(v ?? "")),
    esc,
    icon,
    storageError: null,
    commit(title, mutate) {
      mutate(this.state);
    },
    navigate(page, params = {}) {
      this.view = { page, ...params };
    },
    render() {},
    toast() {},
    dialog() {},
  };
  const id = startCharacterBuilder(ctx, { kind: "create" });
  ctx.view = { page: "builder", id, tab: "review" };
  const review = renderCharacterBuilder(ctx);
  described(review, "builder review");
  assert.match(review, /id="builder-apply-why">Mancano delle correzioni/);
  // Library editor: a new homebrew without a name cannot be applied yet.
  resetLibraryView();
  ctx.view = { page: "library" };
  startHomebrew(ctx, { kind: "create", type: "feat" });
  const editor = renderLibrary(ctx);
  described(editor, "library editor");
  // Quick path: the later steps wait for the current one.
  createCharacterDraft(state, { id: "q1", kind: "create" }, "player");
  BPD.startQuick(state, "q1", "player");
  const registry = createRegistry({ logger: null, document: null });
  registry.use("builder-plus", BP.register);
  ctx.view = { page: "builder-plus", id: "q1", tab: "quick" };
  const quick = registry.get("route", "builder-plus", ctx).render(ctx);
  described(quick, "quick path");
  assert.match(quick, /id="bp-steps-why"/);
});

test("SV-37 compendium, Home and Help: screen arrows, tours and tip reset say why", async () => {
  const h = harness({ role: "dm", areas: [["compendium", compendium.register]] });
  const screen = h.registry.get("table-panel", "compendium-screen", h.ctx).render(h.ctx);
  described(screen, "DM screen");
  const home = await homeHarness();
  home.ctx.view = { page: "home", id: "", tab: "guides" };
  const guides = slotHTML(home.registry, "route", "home", home.ctx);
  described(guides, "home guides");
  assert.match(guides, /id="home-tips-reset-why">Niente da ripristinare/);
  const help = H.helpBody(home.ctx);
  described(help, "help");
});
