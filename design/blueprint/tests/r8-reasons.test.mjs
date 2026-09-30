// R8 SV-37 (Roll20 errors that name cause and fix): every disabled control rendered by the
// R8 files names why and what to do, in a sentence linked by aria-describedby. Each case
// renders a real disabled state and checks every disabled control in it. Every area loaded;
// synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import * as content from "../campaign-content.mjs";
import * as jp from "../journal-plus.mjs";
import { renderCampaign, resetCampaignView } from "../campaign.mjs";
import { renderAssistant, resetAssistantView, actions as assistant } from "../assistant.mjs";
import { renderSection as integrationsPage, resetIntegrationsView } from "../integrations.mjs";
import { controlsHTML } from "../command-palette.mjs";
import { openPinEditor } from "../handouts.mjs";
import { app, described, fakeRoot } from "./r8-harness.mjs";

afterEach(() => {
  resetCampaignView();
  resetAssistantView();
  resetIntegrationsView();
});

test("random tables: editor, draw in progress, missing references, empty deck", async () => {
  const h = await app({ role: "dm", lang: "it" });
  const slice = h.ctx.state.ext["random-tables"];
  const table = slice.tables[0];
  h.ctx.view = { page: "preparation", tab: "random-tables", id: `table:${table.id}` };
  const prep = h.registry.slot("preparation-section", "random-tables", h.ctx);
  described(prep, "table editor");
  assert.match(prep, /data-rt-discard disabled aria-describedby="rt-discard-why"/);
  assert.match(prep, /id="rt-discard-why"[^>]*>Versione salvata: nessuna modifica da annullare/);
  assert.match(
    prep,
    /data-rt-row-move="up" data-index="0" disabled aria-describedby="rt-move-first"/,
  );
  assert.match(prep, /id="rt-undo-target"[^>]*>Niente da annullare/);
  // A template naming a table that does not exist: the draw says which and what to do.
  h.ctx.commit("modello", (draft) =>
    draft.ext["random-tables"].templates.push({
      id: "broken-hook",
      name: { it: "Spunto rotto", en: "Broken hook" },
      origin: "authored-demo",
      text: { it: "Arriva [Tabella che non esiste].", en: "Here comes [Missing table]." },
    }),
  );
  h.ctx.view = { page: "preparation", tab: "random-tables", id: "template:broken-hook" };
  const broken = h.registry.slot("preparation-section", "random-tables", h.ctx);
  described(broken, "missing reference");
  assert.match(
    broken,
    /id="rt-missing-why"[^>]*>Riferimenti non trovati: Tabella che non esiste\. Correggi/,
  );
  // A draw in progress at the Table locks source, variables and filters, and says so.
  h.ctx.view = { page: "preparation", tab: "random-tables", id: `table:${table.id}` };
  h.registry.slot("preparation-section", "random-tables", h.ctx);
  h.ctx.view = { page: "table", tab: "", id: "" };
  const panel = h.registry.get("table-panel", "random-tables", h.ctx);
  const tableView = { scene: h.ctx.state.scenes[0], root: { querySelector: () => null } };
  const root = fakeRoot(panel.render(h.ctx, tableView));
  panel.bind(root, h.ctx, tableView);
  root.querySelector('[data-rt-start="physical"]').click();
  const busy = panel.render(h.ctx, tableView);
  described(busy, "draw in progress");
  assert.match(busy, /data-rt-source disabled aria-describedby="rt-busy-why"/);
  assert.match(busy, /id="rt-busy-why">Estrazione in corso: registrala o annullala/);
  // An empty deck: «Pesca una carta» says how to refill it.
  h.ctx.commit("mazzo vuoto", (draft) => {
    const deck = draft.ext["random-tables"].decks[0];
    deck.discard.push(...deck.pile);
    deck.pile = [];
  });
  const tabs = fakeRoot(panel.render(h.ctx, tableView));
  panel.bind(tabs, h.ctx, tableView);
  tabs.querySelector('[data-rt-tab="decks"]').click();
  const deckHTML = panel.render(h.ctx, tableView);
  assert.match(deckHTML, /data-rt-deck-draw/);
  {
    described(deckHTML.slice(deckHTML.indexOf("data-rt-deck-draw") - 200), "empty deck");
    assert.match(
      deckHTML,
      /id="rt-deck-empty-why"[^>]*>Il mazzo è vuoto: premi «Richiama e mescola…»/,
    );
  }
});

test("assistant, integrations and palette: nothing to clear, save, test or restore", async () => {
  const h = await app({ role: "dm", lang: "it" });
  assistant.enable(h.ctx, { journal: true, materials: true, chat: true, log: true });
  assistant.setEngine(h.ctx, "local");
  h.ctx.view = { page: "campaign", tab: "assistant", id: "consent" };
  const consent = renderAssistant(h.ctx);
  described(consent, "assistant consent");
  assert.match(consent, /id="assistant-clear-why">La tua cronologia è già vuota/);
  assert.match(consent, /id="assistant-local-why">Serve un indirizzo salvato/);
  h.ctx.view = { page: "campaign", tab: "integrations", id: "modules" };
  const modules = integrationsPage(h.ctx);
  described(modules, "modules");
  const shortcuts = controlsHTML(h.ctx);
  described(shortcuts, "shortcuts");
  assert.match(shortcuts, /id="cmdk-reset-why">Usi già le scorciatoie predefinite/);
  // EN too.
  h.ctx.lang = "en";
  assert.match(
    integrationsPage(h.ctx),
    /id="int-why-save">No change to save\. Flip a switch above/,
  );
});

test("journal, campaign entries and handouts: why a control is off", async () => {
  const h = await app({ role: "dm", lang: "it" });
  // A checklist the player may read but not tick.
  let entryId;
  h.ctx.commit("voce", (draft) => {
    entryId = content.createCampaignEntryNow(
      draft,
      {
        kind: "world",
        worldType: "other",
        title: "Preparativi",
        body: "- [ ] Comprare corde\n- [x] Avvisare Oben",
        access: { mode: "campaign", grants: [] },
      },
      "dm",
    ).entryId;
  });
  h.ctx.role = "player";
  h.ctx.view = { page: "campaign", tab: "entry", id: entryId };
  const entry = renderCampaign(h.ctx);
  described(entry, "read-only checklist");
  assert.match(entry, /id="campaign-task-why">Solo chi può modificare questa voce spunta l’elenco/);
  // The Archive tab bar at its first page, and a quest page's fixed type.
  h.ctx.role = "dm";
  h.ctx.view = { page: "campaign", tab: jp.ARCHIVE, id: "p:page-oben" };
  const archive = renderCampaign(h.ctx);
  described(archive, "archive tab bar");
  const quest = h.ctx.state.ext.quests.campaigns.lanterns.pages.find(
    (page) => page.type === "quest",
  );
  h.ctx.view = { page: "campaign", tab: jp.ARCHIVE, id: `edit:${quest.id}` };
  const editor = renderCampaign(h.ctx);
  described(editor, "quest editor");
  assert.match(editor, /id="jp-type-why"[^>]*>Il tipo di una missione non cambia/);
  // A pin without a link: the «use the linked text» tick says what to choose.
  openPinEditor(h.ctx, { sceneId: h.ctx.state.activeSceneId, x: 10, y: 10 });
  const pin = h.log.dialogs.at(-1).body;
  described(pin, "pin editor");
  assert.match(pin, /id="hs-excerpt-hint"[^>]*>Nessun collegamento: scegli una voce/);
});
