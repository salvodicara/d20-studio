// B62 — campaign rail groups (information architecture once all 48 areas exist).
//
// Kanka's sidebar groups its modules (CMP-23) and World Anvil folds its categories; the
// campaign rail does the same: every section joins one of CAMPAIGN_SECTION_GROUPS (areas
// declare `group` on their campaign-section; core sections are mapped here), each group
// is collapsible and remembers its state per identity on this device, the "campaign" group
// (the most used sections) starts open, and the group holding the open section is always
// open. A section without a known group joins "Altro", open by default, so nothing is lost.
import { CAMPAIGN_SECTION_GROUPS } from "./registry.mjs";

export const CORE_CAMPAIGN_GROUPS = Object.freeze({
  overview: "campaign",
  sessions: "campaign",
  journal: "campaign",
  group: "campaign",
  world: "campaign",
  preparation: "campaign",
  settings: "manage",
});
const OTHER = Object.freeze({
  id: "other",
  order: 90,
  icon: "grid",
  label: Object.freeze({ it: "Altro", en: "More" }),
  open: true,
});
const RAIL_KEY = "d20-studio-campaign-rail";
let memory = null;
function load() {
  if (memory) return memory;
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(RAIL_KEY) ?? "null");
    memory = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch {
    memory = {};
  }
  return memory;
}
/** This identity's open/closed groups on this device: {groupId: boolean}. */
export function campaignRailFor(role) {
  const open = load()[role]?.open;
  return open && typeof open === "object" && !Array.isArray(open)
    ? Object.fromEntries(Object.entries(open).filter(([, v]) => typeof v === "boolean"))
    : {};
}
export function rememberCampaignGroup(role, groupId, open) {
  memory = { ...load(), [role]: { open: { ...campaignRailFor(role), [groupId]: open === true } } };
  try {
    globalThis.localStorage?.setItem(RAIL_KEY, JSON.stringify(memory));
  } catch {
    /* no storage: the choice lasts for this page */
  }
}
/** "Reset example" forgets every identity's groups; a role change re-reads them. */
export function resetCampaignRail({ forget = false } = {}) {
  if (forget)
    try {
      globalThis.localStorage?.removeItem(RAIL_KEY);
    } catch {
      /* nothing saved */
    }
  memory = null;
}
const groupOf = (item) => item.group ?? CORE_CAMPAIGN_GROUPS[item.id] ?? null;
/**
 * Visible groups of the rail in order: [{id, label, open, items}], `items` in their merged
 * order. `active` is the open section's id; `role` picks the player's name of "manage".
 */
export function campaignGroups(items, { role, active = null, open = campaignRailFor(role) } = {}) {
  const known = new Set(CAMPAIGN_SECTION_GROUPS.map((g) => g.id));
  return [...CAMPAIGN_SECTION_GROUPS, OTHER]
    .map((group) => {
      const inside = items.filter((item) =>
        group === OTHER ? !known.has(groupOf(item)) : groupOf(item) === group.id,
      );
      const label =
        role !== "dm" && group.player ? { it: group.player[0], en: group.player[1] } : group.label;
      const holdsActive = inside.some((item) => item.id === active);
      return {
        id: group.id,
        label,
        open: holdsActive || (open[group.id] ?? group.open === true),
        holdsActive,
        items: inside,
      };
    })
    .filter((group) => group.items.length);
}
