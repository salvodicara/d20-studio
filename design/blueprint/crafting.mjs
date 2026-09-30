// B54 — crafting domain (pure): recipe books, requirement checks, materials, delivery and
// refund. No DOM. Used by projects.mjs, which owns the downtime time and the UI.
//
// Rules (SRD 5.2.1, printed pages): "Crafting Nonmagical Items" — the required tool and
// proficiency with it, raw materials worth half the purchase cost (rounded down), one day of
// 8 hours of work per 10 GP of cost (rounded up), days need not be consecutive, the GM assigns
// the tool for items not listed (EN 103 / IT 117); "Brewing Potions of Healing" — Herbalism
// Kit proficiency, the kit and 25 GP of raw material over 1 day of 8 hours (EN 103 / IT 117);
// Herbalism Kit "Craft: Antitoxin, Candle, Healer's Kit, Potion of Healing" (EN 94 /
// IT 106); Core Druid Traits "Tool Proficiencies: Herbalism Kit" (EN 41 / IT 46).
//
// Patterns: Mastercrafted recipe books with required tools, ingredients and the "Craft as"
// actor checked for tools, checks and resources (FVT-043); Solasta crafting over an in-game
// duration with the tool required and recipes from manuals (CRP-030). The recipe is started
// explicitly, materials are consumed at the start and returned by the cancel command or by
// Undo; the item lands in the existing character inventory when the work time is complete.

import { costInCp, getById } from "./srd-sample.mjs";
import { canControlActor } from "./character-access.mjs";
import {
  addCoins,
  catalogEntry,
  coinsFromCp,
  coinsValue,
  formatCp,
  giveItemToActor,
  itemFromCatalog,
  newId,
  purseOf,
  setPurse,
  spendCp,
} from "./party-stash.mjs";

export const L = (it, en) => ({ it, en });
/** A refusal with its text in both languages (shown as it is, never as a malfunction). */
export function fail(it, en) {
  return Object.assign(new Error(en), { it, en });
}
const srd = (en, it) => ({ kind: "srd", edition: "2024", revision: "5.2.1", pages: { en, it } });
export const RULES = Object.freeze({
  crafting: srd([103], [117]),
  potion: srd([103], [117]),
  herbalism: srd([94], [106]),
  druid: srd([41], [46]),
});
/** One working day of the SRD crafting rules. */
export const WORKDAY_HOURS = 8;
const CP_PER_GP = 100;

// SRD tools of the sample catalog (the GM may assign one of them to a campaign recipe).
export const TOOL_IDS = Object.freeze([
  "herbalism-kit",
  "alchemists-supplies",
  "smiths-tools",
  "thieves-tools",
  "disguise-kit",
]);
const toolItemId = (tool) => "srd2024:item:" + tool;
export const toolName = (tool) => getById(toolItemId(tool))?.name ?? L(tool, tool);

// The Herbalism Kit "Craft:" list, limited to the items present in the sample catalog
// (the Candle is not in it). Potion of Healing follows its own brewing rule.
const HERBALISM_CRAFTS = ["potion-of-healing", "antitoxin", "healers-kit"];
// Tool proficiencies granted by an initial class in the SRD (only the verified ones).
const CLASS_TOOLS = Object.freeze({ druid: ["herbalism-kit"] });

/** Nonmagical crafting: materials worth half the cost (whole copper, rounded down). */
export const materialsCpFor = (valueCp) => Math.floor(valueCp / 2);
/** Nonmagical crafting: one 8-hour day per 10 GP of cost, rounded up (at least one day). */
export const hoursFor = (valueCp) =>
  Math.max(1, Math.ceil(valueCp / (10 * CP_PER_GP))) * WORKDAY_HOURS;

export function srdRecipes() {
  return HERBALISM_CRAFTS.map((slug) => {
    const entry = getById("srd2024:item:" + slug);
    const valueCp = costInCp(entry.cost);
    const potion = slug === "potion-of-healing";
    return {
      id: "srd:" + slug,
      book: "srd:herbalism-kit",
      tool: "herbalism-kit",
      output: { srdId: entry.id, name: { ...entry.name }, valueCp },
      materialsCp: potion ? 25 * CP_PER_GP : materialsCpFor(valueCp),
      hours: potion ? WORKDAY_HOURS : hoursFor(valueCp),
      rule: potion ? "potion" : "nonmagical",
      source: potion ? RULES.potion : RULES.crafting,
    };
  });
}
/** Campaign recipes authored by the DM: an item not listed in the SRD tools, crafted with
 * the tool the GM assigns and the SRD nonmagical formula for materials and time. */
export function campaignRecipe(row) {
  return {
    id: row.id,
    book: "campaign",
    tool: row.tool,
    output: {
      name: typeof row.name === "string" ? row.name : { ...row.name },
      valueCp: row.valueCp,
      weightKg: row.weightKg ?? null,
      description: row.description ?? "",
    },
    materialsCp: materialsCpFor(row.valueCp),
    hours: hoursFor(row.valueCp),
    manual: row.manual || null,
    rule: "nonmagical",
    source: row.source,
  };
}
export const allRecipes = (slice) => [
  ...srdRecipes(),
  ...(slice?.recipes ?? []).filter((row) => !row.retired).map(campaignRecipe),
];
export function recipeById(slice, id) {
  const recipe = allRecipes(slice).find((row) => row.id === id);
  if (!recipe) throw fail("Ricetta non trovata.", "Recipe not found.");
  return recipe;
}

// ---------------------------------------------------------------- requirements

const plain = (value) => (typeof value === "object" && value ? (value.en ?? value.it) : value);
const names = (value) =>
  (typeof value === "object" && value ? [value.it, value.en] : [value])
    .filter(Boolean)
    .map((text) => String(text).trim().toLowerCase());
const sameName = (a, b) => names(a).some((name) => names(b).includes(name));
const usable = (row) => row && row.quantity > 0 && row.location !== "ground";

/** Tool proficiencies with their source: explicit records (a completed training) and the
 * verified tool of the initial SRD class; nothing is inferred from a class name. */
export function toolProficiencies(actor) {
  const out = new Map();
  for (const entry of actor?.toolProficiencies ?? []) {
    const id = typeof entry === "string" ? entry : entry?.tool;
    if (id) out.set(id, { kind: "record", source: typeof entry === "object" ? entry : null });
  }
  const initial = actor?.buildSeed?.levelOrder?.[0] ?? actor?.buildSeed?.classes?.[0]?.classId;
  for (const tool of CLASS_TOOLS[initial] ?? [])
    if (!out.has(tool)) out.set(tool, { kind: "class", classId: initial, source: RULES.druid });
  return out;
}
export function toolRow(actor, tool) {
  return (actor?.inventory ?? []).find(
    (row) =>
      usable(row) && (row.srdId === toolItemId(tool) || catalogEntry(row)?.id === toolItemId(tool)),
  );
}
/** Raw materials in the inventory for a tool: rows marked `material` with a unit value. */
export function materialRows(actor, tool) {
  return (actor?.inventory ?? []).filter(
    (row) =>
      usable(row) &&
      !row.equipped &&
      Array.isArray(row.material?.tools) &&
      row.material.tools.includes(tool) &&
      Number.isInteger(row.value) &&
      row.value > 0,
  );
}
function manualRow(actor, manual) {
  return manual
    ? (actor?.inventory ?? []).find((row) => usable(row) && sameName(row.name, manual))
    : null;
}
/** How raw materials are paid: materials from the inventory, coins from the purse, or both. */
export function materialsPlan(actor, recipe, source) {
  const need = recipe.materialsCp;
  const rows = materialRows(actor, recipe.tool).sort((a, b) => b.value - a.value);
  const items = [];
  let covered = 0;
  if (source === "inventory" || source === "mixed") {
    for (const row of rows) {
      const want = Math.floor((need - covered) / row.value);
      const take = Math.min(row.quantity, want);
      if (take > 0) {
        items.push({ rowId: row.id, quantity: take, unitCp: row.value });
        covered += take * row.value;
      }
    }
    // An inventory-only plan may round up with one more unit of the cheapest material.
    if (source === "inventory" && covered < need) {
      const cheapest = [...rows].reverse().find((row) => {
        const used = items.find((entry) => entry.rowId === row.id)?.quantity ?? 0;
        return row.quantity > used;
      });
      if (cheapest) {
        const entry = items.find((row) => row.rowId === cheapest.id);
        if (entry) entry.quantity += 1;
        else items.push({ rowId: cheapest.id, quantity: 1, unitCp: cheapest.value });
        covered += cheapest.value;
      }
    }
  }
  const coinsCp = source === "purse" ? need : source === "mixed" ? Math.max(0, need - covered) : 0;
  const haveCp = coinsValue(purseOf(actor));
  const ok =
    source === "purse"
      ? haveCp >= need
      : source === "inventory"
        ? covered >= need
        : source === "mixed"
          ? items.length > 0 && coinsCp > 0 && haveCp >= coinsCp
          : false;
  return {
    source,
    needCp: need,
    items,
    itemsCp: covered,
    coinsCp,
    haveCp,
    overshootCp: Math.max(0, covered - need),
    ok,
  };
}
export const MATERIAL_SOURCES = Object.freeze(["inventory", "purse", "mixed"]);

/** The Mastercrafted "Craft as" check: every requirement with ✓/✗ and a readable reason. */
export function checkRecipe(actor, recipe) {
  const tool = toolName(recipe.tool);
  const row = toolRow(actor, recipe.tool);
  const prof = toolProficiencies(actor).get(recipe.tool);
  const plans = MATERIAL_SOURCES.map((source) => materialsPlan(actor, recipe, source));
  const materials = plans.find((plan) => plan.ok);
  const manual = recipe.manual ? manualRow(actor, recipe.manual) : null;
  const checks = [
    {
      id: "tool",
      ok: !!row,
      text: L(
        `Strumento: ${tool.it} ${row ? "nell'inventario" : "non nell'inventario"}`,
        `Tool: ${tool.en} ${row ? "in the inventory" : "not in the inventory"}`,
      ),
    },
    {
      id: "proficiency",
      ok: !!prof,
      text: prof
        ? prof.kind === "class"
          ? L(
              `Competenza: ${tool.it} (tratti del druido, SRD EN 41 / IT 46)`,
              `Proficiency: ${tool.en} (Druid traits, SRD EN 41 / IT 46)`,
            )
          : L(
              `Competenza: ${tool.it} (registrata sulla scheda)`,
              `Proficiency: ${tool.en} (recorded on the sheet)`,
            )
        : L(`Competenza con ${tool.it}: mancante`, `Proficiency with ${tool.en}: missing`),
    },
    {
      id: "materials",
      ok: !!materials,
      text: L(
        `Materie prime: ${formatCp(recipe.materialsCp, "it")} · ${materialsSummary(actor, recipe, "it")}`,
        `Raw materials: ${formatCp(recipe.materialsCp, "en")} · ${materialsSummary(actor, recipe, "en")}`,
      ),
    },
    ...(recipe.manual
      ? [
          {
            id: "manual",
            ok: !!manual,
            text: L(
              `Manuale: ${recipe.manual} ${manual ? "nell'inventario" : "non nell'inventario"}`,
              `Manual: ${recipe.manual} ${manual ? "in the inventory" : "not in the inventory"}`,
            ),
          },
        ]
      : []),
  ];
  return { checks, plans, canStart: checks.every((check) => check.ok) };
}
function materialsSummary(actor, recipe, lang) {
  const rows = materialRows(actor, recipe.tool);
  const itemsCp = rows.reduce((sum, row) => sum + row.quantity * row.value, 0);
  const purse = coinsValue(purseOf(actor));
  const it = lang === "it";
  const parts = [];
  if (rows.length)
    parts.push(
      rows
        .map((row) => `${plain(it ? (row.name?.it ?? row.name) : row.name)} ×${row.quantity}`)
        .join(", ") + ` (${formatCp(itemsCp, lang)})`,
    );
  parts.push((it ? "borsa " : "purse ") + formatCp(purse, lang));
  return parts.join(" · ");
}

// ---------------------------------------------------------------- start, delivery, refund

const localeName = (name) => (typeof name === "string" ? L(name, name) : { ...name });
/**
 * Starts crafting: checks the requirements, consumes the chosen materials now and returns
 * the new project (a single time step of the recipe's hours). Mutates the actor.
 */
export function startCrafting(
  state,
  role,
  { actorId, recipe, source, id = newId("project"), now },
) {
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, role, state))
    throw fail("Non controlli questo personaggio.", "You do not control this character.");
  const { checks } = checkRecipe(actor, recipe);
  const missing = checks.filter((check) => !check.ok && check.id !== "materials");
  if (missing.length)
    throw fail(
      "Requisiti mancanti: " + missing.map((check) => check.text.it).join("; ") + ".",
      "Missing requirements: " + missing.map((check) => check.text.en).join("; ") + ".",
    );
  if (!MATERIAL_SOURCES.includes(source))
    throw fail("Scegli come pagare le materie prime.", "Choose how to pay the raw materials.");
  const plan = materialsPlan(actor, recipe, source);
  if (!plan.ok)
    throw fail(
      `Materie prime insufficienti: servono ${formatCp(recipe.materialsCp, "it")}.`,
      `Not enough raw materials: ${formatCp(recipe.materialsCp, "en")} needed.`,
    );
  const consumed = [];
  for (const entry of plan.items) {
    const row = actor.inventory.find((item) => item.id === entry.rowId);
    consumed.push({
      rowId: row.id,
      quantity: entry.quantity,
      unitCp: entry.unitCp,
      name: localeName(row.name),
      row: structuredClone({ ...row, quantity: entry.quantity }),
    });
    row.quantity -= entry.quantity;
    if (row.quantity === 0) actor.inventory = actor.inventory.filter((item) => item !== row);
  }
  if (plan.coinsCp) setPurse(null, role, actor, spendCp(purseOf(actor), plan.coinsCp));
  const tool = toolName(recipe.tool);
  const output = localeName(recipe.output.name);
  return {
    id,
    actorId,
    kind: "craft",
    title: L(`Fabbricare: ${output.it}`, `Craft: ${output.en}`),
    source: recipe.source,
    status: "active",
    createdAt: now,
    createdBy: role,
    steps: [
      {
        id: "work",
        kind: "time",
        label: L(`Lavoro con ${tool.it.toLowerCase()}`, `Work with the ${tool.en}`),
        targetHours: recipe.hours,
        adjustHours: 0,
      },
    ],
    work: [],
    corrections: [],
    craft: {
      recipeId: recipe.id,
      tool: recipe.tool,
      output: structuredClone(recipe.output),
      materials: { source, items: consumed, coinsCp: plan.coinsCp, overshootCp: plan.overshootCp },
      delivered: null,
      refunded: false,
    },
  };
}
function outputItem(recipe) {
  if (recipe.output.srdId) {
    const item = itemFromCatalog(recipe.output.srdId, { quantity: 1 });
    delete item.lootId;
    return item;
  }
  return {
    id: newId("item"),
    name: localeName(recipe.output.name),
    quantity: 1,
    weight: recipe.output.weightKg ?? null,
    kind: "gear",
    value: recipe.output.valueCp,
    description: recipe.output.description || "",
    source: recipe.source,
  };
}
/** The crafted item lands in the existing inventory (stacking with a plain equal row). */
export function deliverCraft(state, project) {
  const actor = state.actors?.[project.actorId];
  if (!actor) throw fail("Il personaggio non esiste più.", "The character no longer exists.");
  const item = outputItem(project.craft);
  const row = giveItemToActor(actor, { ...item, crafted: { projectId: project.id } }, 1);
  project.craft.delivered = { rowId: row.id, quantity: 1 };
  return row;
}
/**
 * Cancels a craft: returns every consumed material (same rows when their id is free) and the
 * coins' value; a delivered item is taken back first, and the cancel is refused when it is
 * no longer in the inventory (it was used, sold or given away).
 */
export function refundCraft(state, role, project, { returnMaterials = true } = {}) {
  const actor = state.actors?.[project.actorId];
  if (!actor) throw fail("Il personaggio non esiste più.", "The character no longer exists.");
  if (project.craft.refunded)
    throw fail("I materiali sono già stati restituiti.", "The materials were already returned.");
  const delivered = project.craft.delivered;
  if (delivered) {
    const row = actor.inventory?.find((item) => item.id === delivered.rowId);
    if (!row || row.quantity < delivered.quantity || row.equipped)
      throw fail(
        "L'oggetto fabbricato non è più nell'inventario: correggi l'inventario a mano, con il suo motivo.",
        "The crafted item is no longer in the inventory: correct the inventory by hand, with its reason.",
      );
    row.quantity -= delivered.quantity;
    if (row.quantity === 0) actor.inventory = actor.inventory.filter((item) => item !== row);
    project.craft.delivered = null;
    project.craft.takenBack = { ...delivered };
  }
  if (returnMaterials) {
    for (const entry of project.craft.materials.items) {
      const { id, ...rest } = entry.row;
      giveItemToActor(
        actor,
        { ...rest, id: newId("item"), origin: { actorId: actor.id, rowId: entry.rowId } },
        entry.quantity,
      );
    }
    if (project.craft.materials.coinsCp)
      setPurse(
        null,
        role,
        actor,
        addCoins(purseOf(actor), coinsFromCp(project.craft.materials.coinsCp)),
      );
    project.craft.refunded = true;
  }
  return project;
}

// ---------------------------------------------------------------- DM recipes

/** A campaign recipe written by the DM (SRD: the GM assigns the tool of an unlisted item). */
export function createCampaignRecipe(slice, role, input, { id = newId("recipe"), now } = {}) {
  if (role !== "dm")
    throw fail(
      "Solo il DM scrive le ricette della campagna.",
      "Only the DM writes campaign recipes.",
    );
  const name = String(input.name ?? "").trim();
  if (!name || name.length > 80)
    throw fail(
      "Scrivi il nome dell'oggetto (massimo 80 caratteri).",
      "Write the item name (80 characters at most).",
    );
  if (!TOOL_IDS.includes(input.tool))
    throw fail("Scegli lo strumento richiesto.", "Choose the required tool.");
  const gp = Number(input.valueGp);
  if (!Number.isInteger(gp) || gp < 1 || gp > 10000)
    throw fail(
      "Il valore è un numero intero di mo tra 1 e 10.000.",
      "The value is a whole number of GP from 1 to 10,000.",
    );
  const weight = input.weightKg === "" || input.weightKg == null ? null : Number(input.weightKg);
  if (weight !== null && (!Number.isFinite(weight) || weight < 0 || weight > 500))
    throw fail("Il peso va da 0 a 500 kg.", "Weight ranges from 0 to 500 kg.");
  const manual = String(input.manual ?? "").trim();
  if (manual.length > 80)
    throw fail(
      "Il nome del manuale ha al massimo 80 caratteri.",
      "The manual name has 80 characters at most.",
    );
  const description = String(input.description ?? "")
    .trim()
    .slice(0, 300);
  if (allRecipes(slice).some((row) => sameName(row.output.name, name)))
    throw fail(
      "Esiste già una ricetta per questo oggetto.",
      "A recipe for this item already exists.",
    );
  const row = {
    id,
    name,
    tool: input.tool,
    valueCp: gp * CP_PER_GP,
    weightKg: weight,
    manual: manual || null,
    description,
    createdAt: now,
    source: {
      kind: "campaign-rule",
      author: "dm",
      edition: "2024",
      revision: id,
      note: "Ricetta scritta dal DM: strumento assegnato dal GM, materie e tempo con la formula SRD 5.2.1 EN 103 / IT 117.",
    },
  };
  slice.recipes.push(row);
  return campaignRecipe(row);
}
/**
 * The DM retires a campaign recipe from the book (Mastercrafted: the GM manages its recipe
 * books). The row is kept, marked retired; crafts already started keep their own copy of
 * the recipe's output, so they still deliver.
 */
export function retireCampaignRecipe(slice, role, recipeId, { now } = {}) {
  if (role !== "dm")
    throw fail(
      "Solo il DM ritira le ricette della campagna.",
      "Only the DM retires campaign recipes.",
    );
  const row = (slice?.recipes ?? []).find((entry) => entry.id === recipeId && !entry.retired);
  if (!row)
    throw fail(
      "Si ritira solo una ricetta della campagna ancora nel ricettario.",
      "Only a campaign recipe still in the book can be retired.",
    );
  row.retired = true;
  row.retiredAt = now ?? null;
  return campaignRecipe(row);
}
