// P1 IN-10 (trial without an account on a separate copy) and CA-10 (cross-tab conflict
// detection: a tab reloads another tab's save before its own next change).
import test from "node:test";
import assert from "node:assert/strict";
import {
  createStore,
  readSandbox,
  sandboxStorage,
  startSandbox,
  endSandbox,
  promoteSandbox,
  SANDBOX_KEY,
} from "../state.mjs";
import { createAccountFromSandbox, seedAccount } from "../account.mjs";

const KEY = "d20-studio-blueprint-v1";
function memory() {
  const values = new Map();
  return {
    values,
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("IN-10: the trial runs on its own copy; closing it leaves the account's data untouched", () => {
  const storage = memory();
  const account = createStore({ storage });
  account.commit("Mine", (s) => (s.actors.livia.notes = "private account note"));
  const before = storage.getItem(KEY);
  startSandbox(storage, "player", Date.UTC(2026, 8, 26));
  assert.deepEqual(readSandbox(storage).role, "player");
  const trial = createStore({ storage: sandboxStorage(storage) });
  // The trial starts from the sample campaign, not from the signed-out account's data.
  assert.notEqual(trial.state.actors.livia.notes, "private account note");
  trial.commit("Trial", (s) => (s.actors.livia.notes = "trial note"));
  assert.ok(storage.getItem(SANDBOX_KEY).includes("trial note"));
  assert.equal(storage.getItem(KEY), before);
  endSandbox(storage);
  assert.equal(readSandbox(storage), null);
  assert.equal(storage.getItem(SANDBOX_KEY), null);
  assert.equal(storage.getItem(KEY), before);
});

test("IN-10: «Crea un account per salvare» keeps the trial as the device data", () => {
  const storage = memory();
  createStore({ storage }).commit("Old", (s) => (s.actors.livia.notes = "old"));
  startSandbox(storage, "player");
  const trial = createStore({ storage: sandboxStorage(storage) });
  trial.commit("Trial", (s) => {
    s.ext ??= {};
    s.ext.account = seedAccount();
    s.ext.account.profiles.player.session = "sandbox";
    s.actors.livia.notes = "made in the trial";
  });
  trial.commit("Account", (s) => createAccountFromSandbox(s, "player", "apple"));
  const profile = trial.state.ext.account.profiles.player;
  assert.equal(profile.session, "account");
  assert.ok(profile.signIn.some((m) => m.provider === "apple"));
  promoteSandbox(storage);
  assert.equal(readSandbox(storage), null);
  const device = createStore({ storage });
  assert.equal(device.state.actors.livia.notes, "made in the trial");
  assert.throws(() => createAccountFromSandbox(device.state, "player", "email"), /trial/);
});

test("CA-10: a tab reloads another tab's save before its own change, dropping stale undo", () => {
  const storage = memory();
  const tab1 = createStore({ storage });
  const tab2 = createStore({ storage });
  let external = 0;
  tab1.onExternalChange(() => external++);
  tab1.commit("Tab 1 edit", (s) => (s.actors.livia.notes = "A"));
  tab2.commit("Tab 2 edit", (s) => (s.actors.doran.notes = "B"));
  // Tab 2 had not seen tab 1's change before its own? It had: it reloads first.
  assert.equal(tab2.state.actors.livia.notes, "A");
  // Tab 1's next change starts from tab 2's save: nothing is lost.
  tab1.commit("Tab 1 again", (s) => (s.actors.livia.hp = 7));
  assert.equal(external, 1);
  const saved = JSON.parse(storage.getItem(KEY));
  assert.equal(saved.actors.doran.notes, "B");
  assert.equal(saved.actors.livia.notes, "A");
  assert.equal(saved.actors.livia.hp, 7);
  // Undo cannot reach across the other tab's work.
  assert.equal(tab1.history.length, 1);
  assert.equal(tab1.sync(), false);
});

test("CA-10: a stale campaign draft saved after another tab's save routes to compare and resume", async () => {
  const C = await import("../campaign-content.mjs");
  const storage = memory();
  const tab1 = createStore({ storage });
  const entryId = tab1.state.campaignContent.entries.find((entry) => {
    try {
      return entry.kind !== "note" && C.getCampaignEntry(tab1.state, entry.id, "dm");
    } catch {
      return false;
    }
  })?.id;
  assert.ok(entryId, "a campaign entry the DM can edit");
  tab1.commit("Draft 1", (s) => C.createCampaignDraft(s, { id: "d1", entryId }, "dm"));
  const tab2 = createStore({ storage });
  tab2.commit("Draft 2", (s) => C.createCampaignDraft(s, { id: "d2", entryId }, "dm"));
  const edit = (s, id, text) => {
    const draft = C.getCampaignDraft(s, id, "dm");
    draft.data.body = text;
    C.saveCampaignDraft(s, id, { data: draft.data, expectedDraftRevision: draft.revision }, "dm");
    const preview = C.previewCampaignDraft(s, id, "dm");
    return C.applyCampaignDraft(s, id, { reviewKey: preview.reviewKey }, "dm");
  };
  tab2.commit("Version B", (s) => edit(s, "d2", "VERSIONE B"));
  // Tab 1 saves its own version: it now sees B and is refused with the conflict.
  assert.throws(
    () => tab1.commit("Version A", (s) => edit(s, "d1", "VERSIONE A")),
    /confronta|compare/i,
  );
  const entry = C.getCampaignEntry(tab1.state, entryId, "dm");
  assert.match(JSON.stringify(entry.data), /VERSIONE B/);
});
