// P8 fixes — compendium: every level's class features (BI-09), each entry's history
// (BI-13), the SRD source's automation level (BI-28), the Forge one click from an item
// (BI-24). Real registry with the compendium and the homebrew editor; synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import * as data from "../srd-compendium.mjs";
import * as compendium from "../compendium.mjs";
import * as hb from "../homebrew.mjs";
import * as D from "../homebrew-editor-domain.mjs";
import * as UI from "../homebrew-editor.mjs";
import { harness } from "./p8-harness.mjs";

const page = (h, revision, lang = "it") => {
  h.ctx.lang = lang;
  h.ctx.view = { page: "library", tab: "compendium", id: "", revision };
  return compendium.renderCompendium(h.ctx);
};

test("BI-09: the class page lists the SRD class features of every level, IT and EN", () => {
  for (const id of Object.keys(data.CLASS_FEATURE_TABLE)) {
    const s = data.classSummary(id);
    assert.equal(s.levels.length, 20);
    assert.ok(s.levels[18].features.length, `${id}: level 19 (Epic Boon) listed`);
    assert.equal(s.levels[18].features[0].en, "Epic Boon");
    assert.equal(s.levels[18].features[0].it, "Dono epico");
  }
  const wizard = data.classSummary("wizard");
  assert.deepEqual(
    [wizard.levels[1].features[0].it, wizard.levels[17].features[0].en],
    ["Studioso", "Spell Mastery"],
  );
  assert.deepEqual(wizard.levels[6].features, [], "a level with no new feature stays empty (—)");
  const h = harness();
  const html = page(h, "class:wizard");
  assert.match(html, /Maestria negli incantesimi/);
  assert.doesNotMatch(html, /non sono ancora nel catalogo/);
  assert.match(page(h, "class:wizard", "en"), /Signature Spells/);
  // One click from the list: the class row opens its full page.
  h.ctx.lang = "it";
  h.ctx.view = { page: "library", tab: "compendium", id: "", revision: "" };
  compendium.uiState(h.ctx).category = "classes";
  const browse = compendium.renderCompendium(h.ctx);
  assert.match(browse, /class="compendium-row-toggle" data-row-toggle="srd2024:class:wizard" data-row-opens="class:wizard"/);
});

test("BI-13 and BI-28: each entry shows what changed and its automation; the sources page states the SRD's", () => {
  const h = harness();
  const html = page(h, "srd2024:spell:fire-bolt");
  assert.match(html, /Cosa è cambiato/);
  assert.match(html, /SRD 5\.2\.1<\/strong> · [^<]* · voce importata \(EN p\.\d+/);
  assert.match(html, /data-srd-automation="partial"/);
  assert.match(page(h, "srd2024:condition:prone"), /data-srd-automation="full"/);
  const legal = page(h, "legal");
  assert.match(legal, /data-srd-automation-table/);
  assert.match(legal, /data-srd-automation-row="condition"[\s\S]*?Automazione completa/);
  assert.match(page(h, "legal", "en"), /Automation level of the source/);
  // A homebrew entry lists its revisions with the fields each one changed.
  h.ctx.lang = "it";
  h.as("dm");
  UI.startDraft(h.ctx, "feat", "scratch");
  const draftId = h.ctx.view.id;
  h.edit(draftId);
  UI.setField("name.it", "Occhio di lince");
  UI.setField("source.label", "Tavolo di Bruma");
  h.run("save-content");
  const contentId = h.ctx.view.id;
  h.run("revise");
  h.edit(h.ctx.view.id, "modifiers");
  h.run("add-modifier");
  h.run("save-content");
  const revisions = hb.listHomebrew(h.store.state, "dm").find((e) => e.id === contentId).revisions;
  h.ctx.navigate("homebrew-editor", { id: contentId, revision: revisions[1].id });
  const detail = UI.renderRoute(h.ctx);
  assert.match(detail, /Cosa è cambiato/);
  assert.match(detail, /data-hbe-history="2"[^>]*><strong>rev\. 2<\/strong>[^<]*· cambiati: Modificatori/);
  assert.match(detail, /data-hbe-history="1"[^>]*><strong>rev\. 1<\/strong>[^<]*· prima revisione/);
  assert.deepEqual(D.changedFields({ name: { it: "a" } }, { name: { it: "b" } }), ["name"]);
});

test("BI-24: the Forge opens from «Crea contenuto» and from a weapon or armor page with that base", () => {
  const h = harness();
  h.as("dm");
  const html = page(h, "srd2024:item:chain-mail");
  assert.match(html, /data-cmd="forge"/);
  assert.doesNotMatch(page(h, "srd2024:item:rope"), /data-cmd="forge"/);
  h.ctx.registry.run(h.ctx.registry.get("command", "homebrew-editor.forge", h.ctx), h.ctx, {
    baseId: "srd2024:item:chain-mail",
  });
  assert.equal(h.ctx.view.tab, "forge");
  assert.match(UI.renderRoute(h.ctx), /<option value="srd2024:item:chain-mail" selected>/);
  assert.match(UI.renderRoute(h.ctx), /Cotta di maglia \+1/);
  // From «Crea contenuto»: «Oggetto magico» goes to the Forge.
  h.ctx.registry.run(h.ctx.registry.get("command", "homebrew-editor.create", h.ctx), h.ctx, {});
  h.submit({ kind: "magic-item" });
  assert.equal(h.ctx.view.tab, "forge");
});
