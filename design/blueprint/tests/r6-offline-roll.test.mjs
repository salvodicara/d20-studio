// R6 stale-journey fix (offline-journey): since the one roll engine (P2/P3) a sheet roll
// writes its evidence beside the sheet (`sheet-plus-rolls`); offline it is still refused
// with the roll's own reason, not the generic Table one. Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import * as O from "../offline.mjs";

const slice = () => ({
  identities: { player: { items: [{ kind: "sheet", id: "livia" }], queue: [], lastSyncAt: null } },
});

test("offline: a roll that writes roll evidence keeps «I tiri di dado» as its reason", () => {
  const before = createInitialState();
  before.ext = { "sheet-plus": { last: null }, "sheet-plus-rolls": { rolls: [] } };
  const draft = structuredClone(before);
  draft.ext["sheet-plus"].last = { kind: "check", subject: "str" };
  draft.ext["sheet-plus-rolls"].rolls.push({ id: "r1", faces: [12] });
  assert.throws(
    () => O.captureOfflineWrite(before, draft, slice(), "player", { shared: true }),
    (error) => /^Sei senza rete: .*I tiri di dado/.test(error.it) && /Dice rolls/.test(error.en),
  );
  // Any other shared change still names the Table or the campaign.
  const other = structuredClone(before);
  other.ext["sheet-plus"].last = { kind: "note" };
  assert.throws(
    () => O.captureOfflineWrite(before, other, slice(), "player", { shared: true }),
    (error) => /tavolo o la campagna/.test(error.it),
  );
});
