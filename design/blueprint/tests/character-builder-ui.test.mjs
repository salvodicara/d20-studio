import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import {
  createCharacterDraft,
  getCharacterDraft,
  saveCharacterDraft,
  discardCharacterDraft,
  beginCharacterRoll,
  resolveCharacterRoll,
  previewCharacterDraft,
  applyCharacterDraft,
  BUILD_SECTIONS,
} from "../character-build.mjs";
import {
  startCharacterBuilder,
  renderCharacterBuilder,
  bindCharacterBuilder,
  hasCharacterBuilderDraft,
  resetCharacterBuilderView,
} from "../character-builder.mjs";
import { esc } from "../ui.mjs";

afterEach(() => resetCharacterBuilderView());
function context(state = createInitialState()) {
  const commits = [],
    navigation = [],
    errors = [];
  const ctx = {
    state,
    role: "player",
    lang: "en",
    view: { page: "builder", id: "draft-ui", tab: "identity" },
    esc,
    t: (it, en) => en,
    label: (value) => (typeof value === "object" ? value?.en : value),
    storageError: null,
    commit(title, mutate, options) {
      const copy = structuredClone(this.state);
      mutate(copy);
      this.state = copy;
      commits.push({ title, options });
    },
    navigate(page, params = {}) {
      this.view = { page, ...params };
      navigation.push(this.view);
    },
    render() {},
    toast(message, error) {
      if (error) errors.push(message);
    },
  };
  return { ctx, commits, navigation, errors };
}
function controls(elements = {}) {
  return {
    querySelector: (selector) => elements[selector]?.[0] || null,
    querySelectorAll: (selector) => elements[selector] || [],
  };
}
function control(properties = {}) {
  const events = {};
  return {
    ...properties,
    events,
    addEventListener(type, handler) {
      events[type] = handler;
    },
  };
}

// Recreate controls from the rendered HTML, including after commit, as the shell does.
// Tests must reacquire a control after render instead of invoking detached handlers.
function renderedContext(h) {
  const commit = h.ctx.commit;
  h.ctx.commit = function (...args) {
    commit.apply(this, args);
    this.render();
  };
  h.ctx.render = function () {
    this.html = renderCharacterBuilder(this);
    const nodes = [
      ...this.html.matchAll(/<(input|button|select)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g),
    ].map(([, tag, source, inner]) => {
      const attrs = Object.fromEntries(
        [...source.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, key, value]) => [
          key,
          value ?? "",
        ]),
      );
      const dataset = Object.fromEntries(
        Object.entries(attrs)
          .filter(([key]) => key.startsWith("data-"))
          .map(([key, value]) => [
            key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),
            value,
          ]),
      );
      return control({
        attrs,
        dataset,
        tagName: tag.toUpperCase(),
        type: attrs.type || "",
        value:
          tag === "select"
            ? inner?.match(/<option value="([^"]*)" selected/)?.[1] || ""
            : attrs.value || "",
        checked: "checked" in attrs,
        readOnly: "readonly" in attrs,
      });
    });
    this.root = {
      querySelectorAll(selector) {
        const match = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
        return match
          ? nodes.filter(
              (node) =>
                match[1] in node.attrs &&
                (match[2] === undefined || node.attrs[match[1]] === match[2]),
            )
          : [];
      },
      querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
      },
    };
    bindCharacterBuilder(this.root, this);
  };
  const node = (selector) => {
    const result = h.ctx.root.querySelector(selector);
    assert.ok(result, `Rendered control missing: ${selector}`);
    return result;
  };
  return {
    node,
    click(selector) {
      const current = node(selector);
      (current.onclick || current.events.click)();
    },
    input(selector, value) {
      const current = node(selector);
      if (current.type === "checkbox") current.checked = value;
      else current.value = value;
      (
        current.onchange ||
        current.events[
          current.tagName === "SELECT" || current.type === "checkbox" ? "change" : "input"
        ]
      )({ target: current });
    },
  };
}

test("starting a character creates only a private draft and keeps optional identity empty", () => {
  const h = context(),
    actors = Object.keys(h.ctx.state.actors),
    scenes = structuredClone(h.ctx.state.scenes);
  startCharacterBuilder(h.ctx, { kind: "create" });
  assert.deepEqual(Object.keys(h.ctx.state.actors), actors);
  assert.deepEqual(h.ctx.state.scenes, scenes);
  assert.equal(h.commits[0].options.local, true);
  assert.equal(h.navigation[0].page, "builder");
  const draft = getCharacterDraft(h.ctx.state, h.navigation[0].id, "player");
  assert.equal(draft.owner, "player");
  assert.equal(draft.data.identity.name, "");
});

test("all direct sections render from an incomplete draft without requiring a name", () => {
  const h = context();
  createCharacterDraft(h.ctx.state, { id: "draft-ui", kind: "create" }, "player");
  for (const section of BUILD_SECTIONS) {
    h.ctx.view.tab = section.id;
    const html = renderCharacterBuilder(h.ctx);
    assert.match(html, /builder-sections/);
    assert.match(html, new RegExp('data-builder-section="' + section.id + '"'));
    assert.doesNotMatch(html, /undefined|\[object Object\]/);
  }
});

test("editing stays in a working copy until a private save and survives reopening", () => {
  const h = context();
  createCharacterDraft(h.ctx.state, { id: "draft-ui", kind: "create" }, "player");
  renderCharacterBuilder(h.ctx);
  const name = control({
      dataset: { builderPath: "identity.name" },
      tagName: "INPUT",
      type: "text",
      value: "<script>private draft</script>",
    }),
    save = control();
  bindCharacterBuilder(
    controls({ "[data-builder-path]": [name], "[data-builder-save]": [save] }),
    h.ctx,
  );
  name.events.input();
  assert.equal(hasCharacterBuilderDraft(), true);
  assert.equal(getCharacterDraft(h.ctx.state, "draft-ui", "player").data.identity.name, "");
  save.events.click();
  assert.equal(h.errors.length, 0);
  assert.equal(h.commits.at(-1).options.local, true);
  resetCharacterBuilderView();
  const html = renderCharacterBuilder(h.ctx);
  assert.match(html, /&lt;script&gt;private draft&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.equal(hasCharacterBuilderDraft(), false);
});

test("another identity cannot render or resume a private draft through a known route", () => {
  const h = context();
  createCharacterDraft(h.ctx.state, { id: "draft-ui", kind: "create" }, "player");
  h.ctx.state.characterDrafts.find((draft) => draft.id === "draft-ui").data.identity.name =
    "PrivateBuildMarker";
  renderCharacterBuilder(h.ctx);
  h.ctx.role = "dm";
  const html = renderCharacterBuilder(h.ctx);
  assert.doesNotMatch(html, /PrivateBuildMarker/);
  assert.doesNotMatch(html, /data-builder-apply/);
  assert.doesNotThrow(() => bindCharacterBuilder(controls(), h.ctx));
  assert.equal(hasCharacterBuilderDraft(), false);
});

test("closing a draft clears the working session and binding a revoked route is safe", () => {
  const h = context();
  createCharacterDraft(h.ctx.state, { id: "draft-ui" }, "player");
  renderCharacterBuilder(h.ctx);
  discardCharacterDraft(h.ctx.state, "draft-ui", "player");
  assert.doesNotThrow(() => bindCharacterBuilder(controls(), h.ctx));
  assert.doesNotMatch(renderCharacterBuilder(h.ctx), /data-builder-save/);
  assert.equal(hasCharacterBuilderDraft(), false);
});

test("the first class selector stores an explicit choice with its displayed level", () => {
  const h = context();
  createCharacterDraft(h.ctx.state, { id: "draft-ui" }, "player");
  h.ctx.view.tab = "class";
  const html = renderCharacterBuilder(h.ctx);
  assert.match(html, /data-builder-path="classes.0.classId"/);
  const input = control({
      dataset: { builderPath: "classes.0.classId" },
      tagName: "SELECT",
      type: "select-one",
      value: "fighter",
    }),
    save = control();
  bindCharacterBuilder(
    controls({ "[data-builder-path]": [input], "[data-builder-save]": [save] }),
    h.ctx,
  );
  input.events.change();
  save.events.click();
  assert.deepEqual(getCharacterDraft(h.ctx.state, "draft-ui", "player").data.classes, [
    { classId: "fighter", level: 1, subclassId: null },
  ]);
});

test("physical roll requests survive reopening and missing faces never become accepted values", () => {
  const h = context();
  const draft = createCharacterDraft(h.ctx.state, { id: "draft-ui" }, "player");
  saveCharacterDraft(
    h.ctx.state,
    draft.id,
    { data: { abilities: { ...draft.data.abilities, method: "roll" } } },
    "player",
  );
  const dom = renderedContext(h);
  h.ctx.view.tab = "abilities";
  h.ctx.render();
  const button = h.ctx.root
    .querySelectorAll("[data-builder-roll]")
    .find((node) => node.dataset.mode === "physical" && node.dataset.index === "0");
  button.onclick();
  const request = getCharacterDraft(h.ctx.state, "draft-ui", "player").rolls[0];
  assert.equal(request.status, "pending");
  h.ctx.state = JSON.parse(JSON.stringify(h.ctx.state));
  resetCharacterBuilderView();
  h.ctx.render();
  const faceSelector = `[data-builder-face="${request.id}"]`;
  h.ctx.root.querySelectorAll(faceSelector).forEach((face, index) => {
    face.value = ["6", "5", "3", ""][index];
    face.events.input?.();
  });
  const beforeInvalid = {
    commits: h.commits.length,
    revision: getCharacterDraft(h.ctx.state, "draft-ui", "player").revision,
  };
  dom.click(`[data-builder-record-roll="${request.id}"]`);
  assert.equal(getCharacterDraft(h.ctx.state, "draft-ui", "player").rolls[0].status, "pending");
  assert.equal(h.ctx.state.characterBuildRolls?.length || 0, 0);
  assert.equal(h.commits.length, beforeInvalid.commits);
  assert.equal(
    getCharacterDraft(h.ctx.state, "draft-ui", "player").revision,
    beforeInvalid.revision,
  );
  h.ctx.render();
  const currentFaces = h.ctx.root.querySelectorAll(faceSelector);
  assert.deepEqual(
    currentFaces.map((face) => face.value),
    ["6", "5", "3", ""],
  );
  currentFaces[3].value = "1";
  currentFaces[3].events.input?.();
  dom.click(`[data-builder-record-roll="${request.id}"]`);
  const accepted = getCharacterDraft(h.ctx.state, "draft-ui", "player").rolls[0];
  assert.equal(accepted.total, 14);
  assert.deepEqual(accepted.values, [6, 5, 3, 1]);
  assert.equal(h.ctx.state.characterBuildRolls.length, 1);
});

test("changing class keeps obsolete spell choices reachable for removal", () => {
  const h = context(),
    dom = renderedContext(h);
  const draft = createCharacterDraft(h.ctx.state, { id: "draft-ui" }, "player");
  saveCharacterDraft(
    h.ctx.state,
    draft.id,
    {
      data: {
        classes: [{ classId: "wizard", level: 1 }],
        spells: {
          ...draft.data.spells,
          selected: [{ id: "shield", grantId: "class:wizard" }],
          prepared: [{ id: "shield", grantId: "class:wizard" }],
        },
      },
    },
    "player",
  );
  h.ctx.view.tab = "class";
  h.ctx.render();
  dom.input('[data-builder-path="classes.0.classId"]', "fighter");
  dom.click("[data-builder-save]");
  h.ctx.view.tab = "spells";
  h.ctx.render();
  dom.click('[data-builder-remove-spell="shield"]');
  dom.click("[data-builder-save]");
  const data = getCharacterDraft(h.ctx.state, draft.id, "player").data;
  assert.deepEqual(data.spells.selected, []);
  assert.deepEqual(data.spells.prepared, []);
  assert.equal(
    previewCharacterDraft(h.ctx.state, draft.id, "player").errors.some(
      (error) => error.code === "spell-source",
    ),
    false,
  );
});

test("deselecting or removing a spell also removes its now-unreachable preparation", () => {
  for (const custom of [false, true]) {
    resetCharacterBuilderView();
    const h = context(),
      dom = renderedContext(h);
    const draft = createCharacterDraft(h.ctx.state, { id: "draft-ui" }, "player");
    const id = custom ? "manual-shield" : "shield";
    saveCharacterDraft(
      h.ctx.state,
      draft.id,
      {
        data: {
          classes: [{ classId: "wizard", level: 1 }],
          spells: {
            ...draft.data.spells,
            custom: custom
              ? [
                  {
                    id,
                    name: "Manual spell",
                    level: 1,
                    source: { kind: "manual", revision: "test" },
                  },
                ]
              : [],
            selected: [{ id, grantId: "class:wizard" }],
            prepared: [{ id, grantId: "class:wizard" }],
          },
        },
      },
      "player",
    );
    h.ctx.view.tab = "spells";
    h.ctx.render();
    if (custom) dom.click('[data-builder-remove-custom="spells"]');
    else dom.input('[data-builder-spell="shield"]', false);
    dom.click("[data-builder-save]");
    const data = getCharacterDraft(h.ctx.state, draft.id, "player").data;
    assert.deepEqual(data.spells.selected, []);
    assert.deepEqual(data.spells.prepared, []);
  }
});

test("background changes leave previous unsupported bonuses editable to zero", () => {
  for (const corrected of ["0", ""]) {
    resetCharacterBuilderView();
    const h = context(),
      dom = renderedContext(h);
    const draft = createCharacterDraft(h.ctx.state, { id: "draft-ui" }, "player");
    saveCharacterDraft(
      h.ctx.state,
      draft.id,
      {
        data: {
          origin: {
            ...draft.data.origin,
            backgroundId: "criminal",
            backgroundBonuses: { dex: 2, con: 1 },
          },
        },
      },
      "player",
    );
    h.ctx.view.tab = "origin";
    h.ctx.render();
    dom.input('[data-builder-path="origin.backgroundId"]', "sage");
    assert.equal(dom.node('[data-builder-path="origin.backgroundBonuses.dex"]').readOnly, false);
    dom.input('[data-builder-path="origin.backgroundBonuses.dex"]', corrected);
    dom.input('[data-builder-path="origin.backgroundBonuses.wis"]', "2");
    dom.click("[data-builder-save]");
    assert.equal(
      getCharacterDraft(h.ctx.state, draft.id, "player").data.origin.backgroundBonuses.dex,
      0,
    );
    assert.equal(
      previewCharacterDraft(h.ctx.state, draft.id, "player").errors.some(
        (error) => error.code === "background-bonus",
      ),
      false,
    );
  }
});

test("digital dice execute only from the command and section rendering never rerolls them", () => {
  const h = context();
  createCharacterDraft(h.ctx.state, { id: "draft-ui" }, "player");
  let count = 0;
  h.ctx.rollDie = () => {
    count++;
    return 4;
  };
  h.ctx.render = function () {
    this.html = renderCharacterBuilder(this);
  };
  const commit = h.ctx.commit;
  h.ctx.commit = function (...args) {
    commit.apply(this, args);
    this.render();
  };
  h.ctx.view.tab = "abilities";
  h.ctx.render();
  const button = control({ dataset: { builderRoll: "abilities", index: "0", mode: "digital" } });
  bindCharacterBuilder(controls({ "[data-builder-roll]": [button] }), h.ctx);
  button.onclick();
  for (const section of ["review", "abilities", "class", "abilities"]) {
    h.ctx.view.tab = section;
    resetCharacterBuilderView();
    h.ctx.render();
  }
  assert.equal(count, 4);
  assert.equal(getCharacterDraft(h.ctx.state, "draft-ui", "player").rolls[0].total, 12);
  assert.equal(h.ctx.state.characterBuildRolls.length, 1);
});

test("feature handlers preserve the granting source and species choices are rendered", () => {
  const h = context();
  const draft = createCharacterDraft(h.ctx.state, { id: "draft-ui" }, "player");
  saveCharacterDraft(
    h.ctx.state,
    draft.id,
    {
      data: {
        classes: [{ classId: "fighter", level: 1 }],
        origin: { ...draft.data.origin, speciesId: "human" },
      },
    },
    "player",
  );
  h.ctx.view.tab = "origin";
  assert.match(renderCharacterBuilder(h.ctx), /data-builder-path="origin.choices.size"/);
  h.ctx.view.tab = "features";
  const html = renderCharacterBuilder(h.ctx);
  assert.match(html, /data-grant="class:fighter:fighting-style"/);
  const input = control({
      dataset: { builderFeature: "defense", grant: "class:fighter:fighting-style" },
      checked: true,
    }),
    save = control();
  bindCharacterBuilder(
    controls({ "[data-builder-feature]": [input], "[data-builder-save]": [save] }),
    h.ctx,
  );
  input.onchange();
  save.events.click();
  assert.deepEqual(getCharacterDraft(h.ctx.state, draft.id, "player").data.features.selected, [
    { id: "defense", grantId: "class:fighter:fighting-style" },
  ]);
});

test("manual spells remain selectable under grants and reconstruction asks for used resources", () => {
  const h = context();
  const draft = createCharacterDraft(
    h.ctx.state,
    { id: "draft-ui", kind: "reconstruct" },
    "player",
  );
  saveCharacterDraft(
    h.ctx.state,
    draft.id,
    {
      data: {
        classes: [{ classId: "wizard", level: 1 }],
        spells: {
          ...draft.data.spells,
          custom: [
            {
              id: "manual-spell",
              name: "Original manual spell",
              level: 1,
              source: { kind: "manual", revision: "test", label: "Synthetic" },
            },
          ],
        },
      },
    },
    "player",
  );
  h.ctx.view.tab = "spells";
  const html = renderCharacterBuilder(h.ctx);
  assert.match(html, /data-builder-spell="manual-spell" data-grant="class:wizard"/);
  assert.match(html, /data-builder-path="spells.slotUses.1"/);
  h.ctx.view.tab = "class";
  assert.match(renderCharacterBuilder(h.ctx), /data-builder-path="hp.hitDiceUsed.d6"/);
  h.ctx.view.tab = "equipment";
  assert.doesNotMatch(renderCharacterBuilder(h.ctx), /<option value="starting-gold"/);
});

test("one source publication is listed once while item details retain page provenance", () => {
  const h = context();
  createCharacterDraft(h.ctx.state, { id: "draft-ui" }, "player");
  h.ctx.view.tab = "sources";
  const html = renderCharacterBuilder(h.ctx);
  assert.equal((html.match(/<li class="builder-breakdown">/g) || []).length, 1);
});

test("pending dice remain resolvable from review even after choosing another ability method", () => {
  const h = context();
  createCharacterDraft(h.ctx.state, { id: "draft-ui" }, "player");
  beginCharacterRoll(
    h.ctx.state,
    "draft-ui",
    { id: "pending", kind: "abilities", index: 2, mode: "physical" },
    "player",
  );
  h.ctx.view.tab = "review";
  const html = renderCharacterBuilder(h.ctx);
  assert.match(html, /Rolls to complete/);
  assert.match(html, /Abilities · group 3/);
  assert.match(html, /data-builder-record-roll="pending"/);
});

test("reversed accepted dice are marked in history and not offered as current values to correct", () => {
  const h = context();
  createCharacterDraft(h.ctx.state, { id: "draft-ui" }, "player");
  beginCharacterRoll(
    h.ctx.state,
    "draft-ui",
    { id: "reversed", kind: "abilities", index: 0, mode: "digital" },
    "player",
  );
  resolveCharacterRoll(h.ctx.state, "draft-ui", "reversed", [4, 4, 4, 4], "player");
  h.ctx.state.characterDrafts[0].rolls[0].status = "reversed";
  h.ctx.state.characterBuildRolls[0].status = "reversed";
  h.ctx.state.characterDrafts[0].data.abilities.method = "roll";
  h.ctx.view.tab = "abilities";
  assert.doesNotMatch(renderCharacterBuilder(h.ctx), /data-correction="reversed"/);
  h.ctx.view.tab = "review";
  assert.match(renderCharacterBuilder(h.ctx), /reversed · excluded from calculation/);
});

test("focus follows section transitions once and checkbox rerenders keep focus in place", () => {
  const h = context();
  createCharacterDraft(h.ctx.state, { id: "draft-ui" }, "player");
  let focused = 0,
    scrolled = 0;
  const heading = {
      isConnected: true,
      focus(options) {
        assert.deepEqual(options, { preventScroll: true });
        focused++;
      },
      scrollIntoView() {
        scrolled++;
      },
    },
    root = controls({ "[data-builder-section-title]": [heading] });
  renderCharacterBuilder(h.ctx);
  bindCharacterBuilder(root, h.ctx);
  assert.equal(focused, 1);
  renderCharacterBuilder(h.ctx);
  bindCharacterBuilder(root, h.ctx);
  assert.equal(focused, 1);
  h.ctx.view.tab = "class";
  renderCharacterBuilder(h.ctx);
  bindCharacterBuilder(root, h.ctx);
  assert.equal(focused, 2);
  assert.equal(scrolled, 2);
});

function validFighter(state, id = "draft-ui") {
  const draft = createCharacterDraft(state, { id }, "player");
  saveCharacterDraft(
    state,
    id,
    {
      data: {
        classes: [{ classId: "fighter", level: 1 }],
        origin: {
          backgroundId: "criminal",
          speciesId: "halfling",
          backgroundBonuses: { dex: 2, con: 1 },
          choices: {},
        },
        abilities: {
          method: "manual",
          scores: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
          assignment: {},
          manualTotals: {},
          source: "Synthetic fixture",
        },
        skills: {
          selected: ["athletics", "perception"],
          languages: ["elvish", "dwarvish"],
          tools: [],
          confirmed: true,
        },
        features: {
          selected: [
            { id: "defense", grantId: "class:fighter:fighting-style" },
            ...["quarterstaff", "dagger", "longsword"].map((id) => ({
              id,
              grantId: "class:fighter:mastery",
            })),
          ],
          custom: [],
          featOverride: false,
          confirmed: true,
        },
        equipment: { mode: "manual", items: [], currency: { gp: 0 }, confirmed: true },
      },
    },
    "player",
  );
  return draft;
}

test("creating a private sheet applies offline with private commit metadata", () => {
  const h = context();
  validFighter(h.ctx.state);
  h.ctx.view.tab = "review";
  renderCharacterBuilder(h.ctx);
  const commit = h.ctx.commit;
  h.ctx.commit = function (title, mutate, options) {
    assert.equal(options.local, true);
    assert.equal(options.visibility, "private");
    return commit.call(this, title, mutate, options);
  };
  const apply = control();
  bindCharacterBuilder(controls({ "[data-builder-apply]": [apply] }), h.ctx);
  apply.events.click();
  assert.deepEqual(h.errors, []);
  assert.equal(h.ctx.state.actors["character-draft-ui"].visibility, "private");
  assert.equal(h.ctx.view.page, "characters");
});

test("applying advancement classifies the current actor membership, not the private draft", () => {
  for (const shared of [false, true]) {
    resetCharacterBuilderView();
    const h = context();
    validFighter(h.ctx.state, "initial");
    const initial = previewCharacterDraft(h.ctx.state, "initial", "player");
    const { actorId } = applyCharacterDraft(
      h.ctx.state,
      "initial",
      { operationId: "initial", reviewKey: initial.reviewKey },
      "player",
    );
    const actor = h.ctx.state.actors[actorId];
    actor.hp = 3;
    if (shared) {
      actor.visibility = "shared";
      actor.campaignIds = [h.ctx.state.campaign.id];
    }
    const draft = createCharacterDraft(
      h.ctx.state,
      { id: "draft-ui", kind: "advance", actorId },
      "player",
    );
    saveCharacterDraft(
      h.ctx.state,
      draft.id,
      {
        data: {
          classes: [{ classId: "fighter", level: 2 }],
          hp: { ...draft.data.hp, perLevel: { 2: { method: "fixed" } } },
        },
      },
      "player",
    );
    h.ctx.view.tab = "review";
    const html = renderCharacterBuilder(h.ctx);
    const apply = control(),
      consent = control();
    const elements = { "[data-builder-apply]": [apply] };
    if (html.includes("data-builder-accept-incomplete"))
      elements["[data-builder-accept-incomplete]"] = [consent];
    bindCharacterBuilder(controls(elements), h.ctx);
    consent.events.change?.({ target: { checked: true } });
    apply.events.click();
    assert.deepEqual(h.errors, []);
    assert.equal(Boolean(h.commits.at(-1).options?.local), !shared);
    assert.equal(h.ctx.state.actors[actorId].hp, 3);
    assert.equal(h.ctx.state.actors[actorId].level, 2);
  }
});
