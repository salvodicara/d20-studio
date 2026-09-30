// R6 BI-45 — delegated simulation (I-233, B49): «Pacchetti di compatibilità (solo
// meccaniche)» in the Library, as Foundry and Shard compendium packs with D&D Beyond source
// toggles. A pack holds names, numbers and the page of the group's own book, never its text;
// it follows the adventure-package path: install → enable per campaign → dependency check.
// Synthetic, invented data only.
import test from "node:test";
import assert from "node:assert/strict";
import * as A from "../adventures.mjs";
import { harness } from "./p4-harness.mjs";

const setup = (role = "dm", lang = "it") =>
  harness({
    role,
    lang,
    areas: [["adventures", A.register]],
    view: { page: "library", tab: A.PACKS },
  });
const section = (h) => h.registry.get("library-section", A.PACKS, h.ctx);
const render = (h) => section(h).render(h.ctx);
// A second invented pack that needs the sample one.
const addOn = () => ({
  format: A.PACK_FORMAT,
  formatVersion: 1,
  id: "esempio-cripte",
  version: "1.0",
  title: { it: "Cripte di Bruma · esempio", en: "Bruma crypts · sample" },
  publisher: "d20 Studio · contenuto inventato",
  book: { title: "Manuale del gruppo (esempio)" },
  simulation: true,
  requires: [
    { id: A.PACK_BASE },
    { id: "esempio-valle-di-bruma", title: { it: "Valle", en: "Vale" } },
  ],
  entries: [
    {
      type: "item",
      id: "chiave-di-cripta",
      name: { it: "Chiave di cripta", en: "Crypt key" },
      page: 7,
      mechanics: { rarity: "common", weight: 0.1 },
    },
  ],
});

test("BI-45: a pack carries mechanics only — prose, long text and missing pages are refused", () => {
  const sample = A.samplePack();
  assert.deepEqual(A.validatePack(sample).errors, []);
  const prose = structuredClone(sample);
  prose.entries[0].description = { it: "Una lanterna…", en: "A lantern…" };
  assert.match(A.validatePack(prose).errors[0].it, /testo descrittivo/);
  const long = structuredClone(sample);
  long.entries[0].mechanics.attacks[0].name.en = "x".repeat(200);
  assert.match(A.validatePack(long).errors[0].en, /names and numbers only/);
  const noPage = structuredClone(sample);
  delete noPage.entries[2].page;
  assert.match(
    A.validatePack(noPage)
      .errors.map((e) => e.en)
      .join(" "),
    /book page/,
  );
  assert.match(A.validatePack({ format: "5etools" }).errors[0].it, /formato/);
});

test("BI-45: import the sample, dependency check, enable in the campaign, export as JSON", () => {
  const h = setup("dm");
  // The palette finds it with the words a new user types.
  const command = h.registry.get("command", "adventures.compat-packs", h.ctx);
  assert.ok(command.keywords.some((k) => k.it === "solo meccaniche"));
  assert.ok(command.keywords.some((k) => k.it === "compatibilità"));
  assert.ok(command.keywords.some((k) => k.it === "pacchetto"));
  let page = render(h);
  assert.match(page, /Pacchetti di compatibilità \(solo meccaniche\)/);
  assert.match(
    page,
    /data-adv-pack-licence>Licenza: Solo meccaniche[^<]*diritti restano all’editore/,
  );
  // A pack needing another one: importable, not enableable until its dependency is in.
  A.importPackFile(h.ctx, JSON.stringify(addOn()), "cripte.json");
  const cid = h.store.state.campaign.id;
  let reqs = A.packRequirements(h.store.state, "esempio-cripte", cid, "dm");
  assert.deepEqual(
    reqs.map((r) => [r.id, r.status, r.action]),
    [
      [A.PACK_BASE, "ready", null],
      ["esempio-valle-di-bruma", "missing", "import"],
    ],
  );
  page = render(h);
  assert.match(
    page,
    /data-adv-pack-enable="esempio-cripte" disabled aria-describedby="adv-pack-reason-esempio-cripte"/,
  );
  assert.match(page, /id="adv-pack-reason-esempio-cripte">Manca un pacchetto richiesto/);
  A.runPackAction(h.ctx, "enable", "esempio-cripte");
  assert.match(h.errors().at(-1), /Manca il pacchetto richiesto «Valle»/);
  // Install the sample (a simulation), then enabling the add-on brings its dependency.
  A.installSamplePack(h.ctx);
  assert.equal(A.installedPacks(h.store.state, "dm").length, 2);
  reqs = A.packRequirements(h.store.state, "esempio-cripte", cid, "dm");
  assert.equal(reqs[1].status, "disabled");
  A.runPackAction(h.ctx, "enable", "esempio-cripte");
  assert.deepEqual(
    A.campaignPacks(h.store.state, cid)
      .map((r) => r.pack.id)
      .sort(),
    ["esempio-cripte", "esempio-valle-di-bruma"],
  );
  assert.ok(
    A.packRequirements(h.store.state, "esempio-cripte", cid, "dm").every(
      (r) => r.status === "ready",
    ),
  );
  // The dependency cannot be switched off under the pack that needs it.
  A.runPackAction(h.ctx, "disable", "esempio-valle-di-bruma");
  assert.match(h.errors().at(-1), /Un altro pacchetto abilitato lo richiede/);
  // Importing the same file again changes nothing.
  A.installSamplePack(h.ctx);
  assert.match(h.errors().at(-1), /è già nella tua Biblioteca/);
  // Export: exactly the validated mechanics, re-importable.
  const json = A.exportPack(h.store.state, "esempio-valle-di-bruma", "dm");
  assert.deepEqual(A.validatePack(JSON.parse(json)).errors, []);
  assert.doesNotMatch(json, /"description"/);
  page = render(h);
  assert.match(page, /Abilitato in questa campagna/);
  assert.match(page, /badge adv-pack-sim">Simulazione/);
  assert.match(page, /Solo meccaniche<\/span>/);
});

test("BI-45: a creature's numbers with «Testo: nel vostro manuale, p. …» (IT and EN); players read enabled packs", () => {
  const h = setup("dm");
  A.installSamplePack(h.ctx);
  A.runPackAction(h.ctx, "enable", "esempio-valle-di-bruma");
  h.ctx.view = { page: "library", tab: A.PACKS, revision: "pack:esempio-valle-di-bruma" };
  let page = render(h);
  const lantern = page.slice(page.indexOf('data-adv-pack-entry="lanterna-vagante"'));
  assert.match(lantern, /Lanterna vagante/);
  assert.match(lantern, /<dt>CA<\/dt><dd>13<\/dd>/);
  assert.match(lantern, /<dt>PF<\/dt><dd>22 \(5d6\+5\)<\/dd>/);
  assert.match(lantern, /Vampata<\/dt><dd>\+5 · 2d6\+3 fuoco/);
  assert.match(lantern, /Testo: nel vostro manuale, p\. 42/);
  assert.match(page, /Fiamma del faro[\s\S]*Testo: nel vostro manuale, p\. 120/);
  h.ctx.lang = "en";
  page = render(h);
  assert.match(
    page,
    /Wandering Lantern[\s\S]*<dt>AC<\/dt><dd>13<\/dd>[\s\S]*Text: in your book, p\. 42/,
  );
  // The player: nothing of their own, the DM's enabled pack readable (no DM commands).
  h.ctx.role = "player";
  h.ctx.lang = "it";
  h.ctx.view = { page: "library", tab: A.PACKS };
  page = render(h);
  assert.match(page, /Abilitati dal DM in questa campagna/);
  assert.doesNotMatch(page, /data-adv-pack-enable|data-adv-pack-remove|data-adv-pack-export/);
  assert.ok(A.packFor(h.store.state, "esempio-valle-di-bruma", "player"));
  assert.throws(
    () =>
      A.enablePack(
        structuredClone(h.store.state),
        "esempio-valle-di-bruma",
        h.store.state.campaign.id,
        "player",
      ),
    /Only the DM/,
  );
});
