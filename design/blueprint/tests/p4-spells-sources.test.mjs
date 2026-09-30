// P4 fix PG-53 — «Gestisci magie» › «Lista di classe» filters by source like D&D Beyond's
// «Manage Spells» source chips: SRD 2024, the campaign's enabled homebrew, legacy 2014 when
// the campaign allows it (blocked, with its reason, when it does not). Real store and
// registry, the handler the bound chips call.
import test from "node:test";
import assert from "node:assert/strict";
import * as L from "../character-library.mjs";
import * as IP from "../inventory-plus.mjs";
import * as SP from "../spells-plus.mjs";
import { harness } from "./p4-harness.mjs";

const setup = (lang = "it") => {
  const h = harness({
    lang,
    areas: [
      ["character-library", L.register],
      ["inventory-plus", IP.register],
      ["spells-plus", SP.register],
    ],
    view: { page: "characters", id: "livia", tab: "spells" },
  });
  SP.spellsPanel(h.ctx, "livia").manage = true;
  SP.spellsPanel(h.ctx, "livia").tab = "class";
  return h;
};
const html = (h) => SP.renderSpellsTab(h.ctx, h.store.state.actors.livia);
function enableHomebrewSpell(h) {
  h.store.commit(
    "seed homebrew spell",
    (draft) => {
      draft.library = [
        {
          id: "hb-starfall",
          owner: "player",
          type: "spell",
          revisions: [
            {
              id: "hb-starfall-r1",
              createdAt: "2026-09-20T10:00:00.000Z",
              data: {
                name: { it: "Pioggia di stelle", en: "Starfall" },
                source: { rights: { share: true, modify: true, export: true } },
                dependencies: [],
                fields: { level: 1, school: "evocation" },
              },
            },
          ],
          accessByRevision: { "hb-starfall-r1": { readers: ["dm"], editors: [] } },
        },
      ];
      draft.campaign.enabledContent = [{ contentId: "hb-starfall", revisionId: "hb-starfall-r1" }];
    },
    "player",
    { shared: true },
  );
}

test("PG-53: source chips SRD 2024, campaign homebrew and legacy 2014 in the class list", () => {
  const h = setup();
  // Only the SRD is usable: the sources are named on one line, no chip that filters nothing.
  let page = html(h);
  assert.doesNotMatch(page, /data-spl-source=/);
  assert.match(page, /data-spl-origins[^>]*>Fonte: <strong>SRD 5.2.1 · 2024<\/strong>/);
  assert.match(page, /Homebrew della campagna: nessuna magia attivata/);
  // Legacy 2014: the campaign's source rule decides; here it is blocked, with its reason.
  assert.match(page, /Legacy 2014: [^<]*2024/);
  // Homebrew enabled in the campaign appears beside the SRD, marked as such: now the chips.
  enableHomebrewSpell(h);
  page = html(h);
  assert.match(page, /data-spl-source="srd"[^>]*aria-pressed="true"[^>]*>SRD 2024/);
  assert.match(page, /data-spl-source="legacy"[^>]*disabled/);
  assert.match(
    page,
    /data-spl-source="homebrew"[^>]*aria-pressed="true"[^>]*>Homebrew della campagna \(1\)/,
  );
  assert.match(page, /data-spl-homebrew-row="hb-starfall"/);
  assert.match(page, /Pioggia di stelle/);
  // Turning SRD off leaves only the homebrew rows; the class list never loses the chips.
  SP.handleSpellsAction(h.ctx, "livia", "source", { source: "srd" });
  page = html(h);
  assert.doesNotMatch(page, /data-spl-class-row=/);
  assert.match(page, /data-spl-homebrew-row="hb-starfall"/);
  assert.match(page, /data-spl-source="srd"[^>]*aria-pressed="false"/);
  // The homebrew spell is added through the Library review, as every homebrew copy.
  SP.handleSpellsAction(h.ctx, "livia", "add-homebrew", {
    content: "hb-starfall",
    revision: "hb-starfall-r1",
  });
  assert.equal(h.ctx.navigated.page, "library");
  assert.match(h.ctx.navigated.params.returnTo, /"tab":"spells"/);
});

test("PG-53: the chips speak English too", () => {
  const h = setup("en");
  assert.match(html(h), /Campaign homebrew: no spell enabled/);
  enableHomebrewSpell(h);
  const page = html(h);
  assert.match(page, />SRD 2024</);
  assert.match(page, />Campaign homebrew \(1\)</);
  assert.match(page, />Legacy 2014</);
});
