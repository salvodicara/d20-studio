// R6 PG-53 (D&D Beyond «Manage Spells» with Legacy badges): with the campaign's legacy
// switch on (contract C4, R7), «Gestisci magie» shows the SRD 5.1 (2014) version of a spell
// beside its 2024 version, with «Legacy 2014» and «Cosa cambia»; the 2024 rules stay the
// default and nothing is replaced. Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import * as L from "../character-library.mjs";
import * as IP from "../inventory-plus.mjs";
import * as SP from "../spells-plus.mjs";
import * as D from "../spells-plus-domain.mjs";
import { SPELLS } from "../srd-sample.mjs";
import { LEGACY_SPELLS, LEGACY_ATTRIBUTION, legacySpell } from "../srd-legacy-sample.mjs";
import { harness } from "./p4-harness.mjs";

const setup = (lang = "it") => {
  const h = harness({
    lang,
    role: "player",
    areas: [
      ["character-library", L.register],
      ["inventory-plus", IP.register],
      ["spells-plus", SP.register],
    ],
    view: { page: "characters", id: "livia", tab: "spells" },
  });
  SP.spellsPanel(h.ctx, "livia").manage = true;
  SP.spellsPanel(h.ctx, "livia").tab = "class";
  SP.spellsPanel(h.ctx, "livia").mSources = ["srd", "homebrew", "legacy"];
  return h;
};

test("PG-53: the legacy data is our own summary of SRD 5.1 with the CC BY 4.0 attribution", () => {
  assert.ok(LEGACY_SPELLS.length >= 6);
  for (const [slug, entry] of LEGACY_SPELLS) {
    assert.ok(
      SPELLS.some((spell) => spell.slug === slug),
      `${slug} sits beside a 2024 spell`,
    );
    assert.equal(entry.source.revision, "5.1");
    assert.equal(entry.source.license, "CC BY 4.0");
    for (const lang of ["it", "en"]) {
      assert.ok(entry.summary[lang].length < 320, "a short summary, not the SRD text");
      assert.ok(entry.changes[lang].length > 10, "«Cosa cambia» says what differs");
    }
  }
  assert.match(
    LEGACY_ATTRIBUTION.en,
    /System Reference Document 5\.1.*Creative Commons Attribution 4\.0/,
  );
  assert.match(LEGACY_ATTRIBUTION.it, /Creative Commons Attribution 4\.0/);
  assert.match(legacySpell("cure-wounds").changes.en, /2d8/);
});

test("PG-53: legacy rows exist only with the campaign's legacy switch on (C4)", () => {
  const h = setup();
  const state = h.store.state;
  // Domain: nothing without C4; with it, Fire Bolt 2014 beside the 2024 entry.
  assert.deepEqual(D.legacyOptions(state, "livia", { allowed: false }), []);
  const rows = D.legacyOptions(state, "livia", { allowed: true });
  const fire = rows.find((row) => row.entry.slug === "fire-bolt");
  assert.ok(fire && fire.legacy.id === "srd2014:spell:fire-bolt");
  assert.equal(fire.entry.id, "srd2024:spell:fire-bolt", "the 2024 entry stays the base");
  assert.ok(!rows.some((row) => row.entry.slug === "cure-wounds"), "only the class list");
  // Today's sample campaign keeps legacy blocked: no legacy row, the chip says why.
  let page = SP.renderClassList(h.ctx, "livia");
  assert.doesNotMatch(page, /data-spl-legacy-row/);
  assert.doesNotMatch(page, /Legacy 2014<\/span>/);
  // With C4 on: «Dardo di fuoco» 2024 and «Legacy 2014» side by side, with «Cosa cambia».
  page = SP.renderClassList(h.ctx, "livia", { allowed: true, reason: null });
  const at2024 = page.indexOf('data-spl-class-row="fire-bolt"');
  const at2014 = page.indexOf('data-spl-legacy-row="fire-bolt"');
  assert.ok(at2024 >= 0 && at2014 > at2024, "the 2014 row follows its 2024 row");
  assert.ok(page.indexOf("data-spl-class-row=", at2024 + 10) > at2014, "right after it");
  const legacyRow = page.slice(at2014, page.indexOf("</li>", at2014));
  assert.match(legacyRow, /Dardo di fuoco/);
  assert.match(legacyRow, /class="badge spl-legacy-badge">Legacy 2014</);
  assert.match(legacyRow, /<summary>Cosa cambia<\/summary>/);
  assert.match(legacyRow, /Preferisci la 2014/);
  assert.match(page, /data-spl-source="legacy"[^>]*aria-pressed="true"/);
  assert.doesNotMatch(page, /data-spl-source="legacy"[^>]*disabled/);
  assert.match(page, /data-spl-legacy-attribution/);
  // The legacy chip hides the rows again (the 2024 ones stay).
  SP.handleSpellsAction(h.ctx, "livia", "source", { source: "legacy" });
  page = SP.renderClassList(h.ctx, "livia", { allowed: true, reason: null });
  assert.doesNotMatch(page, /data-spl-legacy-row/);
  assert.match(page, /data-spl-class-row="fire-bolt"/);
});

test("PG-53: the 2014 version is chosen per character; refused while the campaign blocks it", () => {
  const h = setup("en");
  const state = h.store.state;
  // Blocked campaign: the choice is refused with the way to turn it on.
  SP.handleSpellsAction(h.ctx, "livia", "legacy-choose", { slug: "fire-bolt" });
  assert.match(h.toasts.at(-1).text, /does not allow 2014 versions.*Sources/);
  assert.deepEqual(D.legacyChoices(state, "livia"), []);
  // Allowed (C4 on): recorded for Livia only, nothing replaced.
  h.store.commit(
    "choose",
    (draft) => D.chooseLegacy(draft, "livia", "fire-bolt", true, "player", { allowed: true }),
    "player",
    { shared: true },
  );
  assert.deepEqual(D.legacyChoices(h.store.state, "livia"), ["fire-bolt"]);
  assert.deepEqual(D.legacyChoices(h.store.state, "doran"), []);
  const page = SP.renderClassList(h.ctx, "livia", { allowed: true, reason: null });
  assert.match(page, /Chosen for this character/);
  assert.match(
    page,
    /data-spl="legacy-choose" data-slug="fire-bolt" aria-pressed="true"[^>]*>Back to 2024/,
  );
  assert.ok(SPELLS.some((s) => s.slug === "fire-bolt" && s.source.revision === "5.2.1"));
  assert.throws(
    () =>
      D.chooseLegacy(structuredClone(h.store.state), "livia", "fireball", true, "player", {
        allowed: true,
      }),
    /no 2014 version/,
  );
});
