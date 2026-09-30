import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../state.mjs";
import { listCampaignEntries } from "../campaign-content.mjs";
import * as content from "../campaign-content.mjs";
import * as sessions from "../campaign-sessions.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
};

test("narrative commands do not enter the game's undo stack", () => {
  const store = createStore({ storage: memory() });
  store.commit(
    "Private draft saved",
    (state) => {
      state.campaignContent = {
        ...state.campaignContent,
        version: 1,
        entries: [],
        drafts: [{ id: "private", body: "New text" }],
      };
    },
    "player",
    { shared: false, visibility: "private", undoable: false },
  );
  assert.equal(store.history.length, 0);
  assert.throws(() => store.undo("player"), /No change/);
  assert.equal(store.state.log.at(-1).visibility, "private");
});

test("game correction preserves subsequent narrative revisions, revocations, appointments and drafts", () => {
  const storage = memory();
  const store = createStore({ storage });
  const hp = store.state.actors.livia.hp;
  store.commit(
    "Damage",
    (state) => {
      state.actors.livia.hp -= 3;
    },
    "player",
  );
  store.commit(
    "Content updated",
    (state) => {
      const first = content.createCampaignDraft(
        state,
        { id: "first", kind: "note", campaignId: state.campaign.id },
        "dm",
      );
      content.saveCampaignDraft(
        state,
        first.id,
        {
          data: { ...first.data, title: "Clue", body: "Initial shared text" },
          access: {
            mode: "selected",
            grants: [{ id: "player", read: true, edit: false, invite: false }],
          },
          expectedDraftRevision: first.revision,
        },
        "dm",
      );
      const result = content.applyCampaignDraft(
        state,
        first.id,
        { reviewKey: content.previewCampaignDraft(state, first.id, "dm").reviewKey },
        "dm",
      );
      const edit = content.createCampaignDraft(
        state,
        { id: "edit", entryId: result.entryId },
        "dm",
      );
      content.saveCampaignDraft(
        state,
        edit.id,
        {
          data: { ...edit.data, body: "Revised private text" },
          access: { mode: "private", grants: [] },
          expectedDraftRevision: edit.revision,
        },
        "dm",
      );
      content.applyCampaignDraft(
        state,
        edit.id,
        { reviewKey: content.previewCampaignDraft(state, edit.id, "dm").reviewKey },
        "dm",
      );
      content.createCampaignDraft(state, { id: "unfinished", kind: "note" }, "dm");
      const direct = sessions.createSessionDraft(state, { id: "direct", kind: "direct" }, "dm");
      sessions.saveSessionDraft(
        state,
        direct.id,
        {
          data: {
            ...direct.data,
            title: "Next session",
            localTime: "2026-10-09T21:00",
            timeZone: "Europe/Rome",
          },
          expectedDraftRevision: direct.revision,
        },
        "dm",
      );
      const appointment = sessions.applySessionDraft(
        state,
        direct.id,
        { reviewKey: sessions.previewSessionDraft(state, direct.id, "dm").reviewKey },
        "dm",
      );
      const cancel = sessions.createSessionDraft(
        state,
        { id: "cancel", kind: "cancel", sessionId: appointment.sessionId },
        "dm",
      );
      sessions.applySessionDraft(
        state,
        cancel.id,
        { reviewKey: sessions.previewSessionDraft(state, cancel.id, "dm").reviewKey },
        "dm",
      );
      sessions.createSessionDraft(state, { id: "next", kind: "direct" }, "dm");
      const poll = sessions.createSessionDraft(state, { id: "poll", kind: "poll" }, "dm");
      sessions.saveSessionDraft(
        state,
        poll.id,
        {
          data: {
            ...poll.data,
            title: "Options",
            participants: ["player", "dm"],
            slots: [{ id: "slot", localTime: "2026-10-16T21:00", timeZone: "Europe/Rome" }],
          },
          expectedDraftRevision: poll.revision,
        },
        "dm",
      );
      const polling = sessions.applySessionDraft(
        state,
        poll.id,
        { reviewKey: sessions.previewSessionDraft(state, poll.id, "dm").reviewKey },
        "dm",
      );
      const slot = state.campaign.polls.find((entry) => entry.id === polling.pollId).slots[0];
      sessions.setSessionAvailability(
        state,
        polling.pollId,
        { slotId: slot.id, slotRevision: slot.revision, response: "maybe" },
        "player",
      );
      state.campaign.members.push({ id: "bob", name: "Bob", role: "player" });
    },
    "dm",
    { visibility: "private", undoable: false },
  );
  const narrative = structuredClone(store.state.campaignContent);
  const campaign = structuredClone(store.state.campaign);
  store.undo("player");
  assert.equal(store.state.actors.livia.hp, hp);
  assert.deepEqual(store.state.campaignContent, narrative);
  assert.deepEqual(store.state.campaign, campaign);
  assert.deepEqual(createStore({ storage }).state.campaignContent, narrative);
  assert.equal(store.state.log.filter((entry) => entry.kind === "change").length, 2);
  assert.equal(store.state.log.at(-1).kind, "correction");
});

test("legacy notes, journal and overview migrate once through store load without losing text or privacy", () => {
  const storage = memory();
  const legacy = createInitialState();
  delete legacy.campaignContent;
  legacy.notes = [
    { owner: "player", body: "Private voyage detail" },
    { owner: "dm", body: "Private villain detail" },
  ];
  legacy.campaign.journal = [{ id: "old-recap", title: "Arrival", body: "The old arrival" }];
  legacy.campaign.summary = "Earlier synthetic summary";
  storage.setItem("d20-studio-blueprint-v1", JSON.stringify(legacy));
  const first = createStore({ storage });
  assert.equal(first.storageError, "");
  const playerText = JSON.stringify(listCampaignEntries(first.state, {}, "player"));
  const dmText = JSON.stringify(listCampaignEntries(first.state, {}, "dm"));
  assert.match(playerText, /Private voyage detail/);
  assert.doesNotMatch(playerText, /Private villain detail/);
  assert.match(dmText, /Private villain detail/);
  assert.doesNotMatch(dmText, /Private voyage detail/);
  assert.match(playerText, /The old arrival/);
  assert.match(playerText, /Earlier synthetic summary/);
  assert.equal(Object.hasOwn(first.state, "notes"), false);
  assert.equal(Object.hasOwn(first.state.campaign, "journal"), false);
  assert.equal(Object.hasOwn(first.state.campaign, "summary"), false);
  first.persist();
  assert.deepEqual(createStore({ storage }).state.campaignContent, first.state.campaignContent);
});

test("unrecognized legacy narrative data triggers recovery without overwriting the saved source", () => {
  const storage = memory();
  const legacy = createInitialState();
  delete legacy.campaignContent;
  legacy.notes = [{ owner: "player", body: { unexpected: "Preserve this original" } }];
  const original = JSON.stringify(legacy);
  storage.setItem("d20-studio-blueprint-v1", original);
  const store = createStore({ storage });
  assert.equal(store.storageError, "read");
  store.commit(
    "Temporary edit",
    (state) => {
      state.actors.livia.hp = 11;
    },
    "player",
  );
  assert.equal(storage.getItem("d20-studio-blueprint-v1"), original);
});
