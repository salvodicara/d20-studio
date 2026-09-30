// Conditions and vitality panel (increment 10).
// One contextual dialog plus a compact summary next to HP. It renders only the
// domain's authorized projections, previews every change before applying it and
// never generates dice: death saves, Medicine and stable recovery go through the
// root's existing request queue via the agreed ctx callbacks.
import * as domain from "./conditions.mjs";
import { observeConcentrationEnd, refreshConsequences } from "./combat.mjs";
import { SPELLS } from "./srd-sample.mjs";

// Only the open panel's inputs live here; conditions, events and rolls live in state.
let panel = null;
const uid = () => crypto.randomUUID();
const copy = (v) => structuredClone(v);
const num = (v) => (String(v ?? "").trim() === "" ? null : Number(v));
const message = (ctx, v) => v?.[ctx.lang] || v?.message || String(v ?? "");
const name = (ctx, v) => ctx.label(v);
const fmt = (ctx, n) =>
  Number(n).toLocaleString(ctx.lang === "it" ? "it-IT" : "en-GB", { maximumFractionDigits: 2 });
const CATALOG = domain.listConditionDefinitions();
const definition = (id) => CATALOG.find((d) => d.id === id) ?? null;
// Facts typed into this panel are manual records, never an SRD citation.
const MANUAL = {
  kind: "manual",
  edition: "2024",
  revision: "conditions-panel-1",
  title: { it: "Registrazione manuale dal pannello", en: "Manual record from the panel" },
};
const UNITS = { rounds: 6, minutes: 60, hours: 3600 };
const CLOSED = ["resolved", "expired", "cancelled", "reversed", "declined"];
const GLOBAL_MODES = ["add", "exhaustion", "damage", "heal", "temp-hp", "correct", "stand", "aid"];
const INSTANCE_MODES = ["end", "correct-term", "held-items"];

// ---------------------------------------------------------------- markup helpers

const attr = (ctx, v) => ctx.esc(v);
/**
 * A command button. SV-37 (Roll20 errors that name cause and fix): a disabled one names why
 * and what to do next to it, linked by aria-describedby (`why`: {id, text}).
 */
function button(ctx, attrs, text, { disabled = false, kind = "", why = null } = {}) {
  const reason = disabled && why?.id && why?.text;
  return `<button type="button" class="button${kind ? " " + kind : ""}" ${attrs}${disabled ? " disabled" : ""}${reason ? ` aria-describedby="${attr(ctx, why.id)}"` : ""}>${ctx.esc(text)}</button>${reason ? `<p class="conditions-why muted" id="${attr(ctx, why.id)}" data-conditions-why>${ctx.esc(why.text)}</p>` : ""}`;
}
// Domain error codes tied to the field that fixes them (aria-invalid + message there).
const ERROR_FIELDS = {
  reason: "reason",
  amount: "amount",
  label: "customLabel",
  level: "level",
  term: "termKind",
  origin: "originActor",
  "temp-hp-choice": "choice",
  "temp-hp-keep": "choice",
  "death-count": "failures",
  "stable-count": "successes",
  "zero-by-correction": "hp",
  "max-hp-zero": "maxHp",
};
function fieldError(ctx, key) {
  const r = panel?.review;
  if (!r || r.dirty) return null;
  const error = (r.preview?.errors ?? []).find((e) => ERROR_FIELDS[e.code] === key);
  return error ? message(ctx, error) : null;
}
// The hint stays outside the label so the accessible name remains short; a field error
// sits under its field and is announced through aria-describedby.
function field(ctx, label, control, hint = "") {
  const key = control.match(/data-conditions-field="([^"]+)"/)?.[1] ?? "field";
  const error = fieldError(ctx, key);
  if (!hint && !error)
    return `<label class="field"><span>${ctx.esc(label)}</span>${control}</label>`;
  const ids = [hint ? `conditions-hint-${key}` : "", error ? `conditions-error-${key}` : ""]
    .filter(Boolean)
    .join(" ");
  const described = control.replace(/^<(input|select)/, `<$1 aria-describedby="${ids}"`);
  return `<div class="conditions-field"><label class="field"><span>${ctx.esc(label)}</span>${described}</label>${hint ? `<small class="muted" id="conditions-hint-${key}">${ctx.esc(hint)}</small>` : ""}${error ? `<small class="error" id="conditions-error-${key}">${ctx.esc(error)}</small>` : ""}</div>`;
}
const invalidAttr = (ctx, key) => (fieldError(ctx, key) ? ' aria-invalid="true"' : "");
function input(ctx, key, { type = "text", extra = "" } = {}) {
  return `<input type="${type}" data-conditions-field="${key}" value="${ctx.esc(panel.fields[key] ?? "")}"${invalidAttr(ctx, key)}${extra ? " " + extra : ""}>`;
}
function select(ctx, key, items) {
  const value = String(panel.fields[key] ?? "");
  return `<select data-conditions-field="${key}"${invalidAttr(ctx, key)}>${items.map(([id, text]) => `<option value="${ctx.esc(id)}"${String(id) === value ? " selected" : ""}>${ctx.esc(text)}</option>`).join("")}</select>`;
}
function check(ctx, key, text) {
  return `<label class="conditions-check"><input type="checkbox" data-conditions-field="${key}"${panel.fields[key] ? " checked" : ""}><span>${ctx.esc(text)}</span></label>`;
}
const issues = (ctx, list = [], kind = "") =>
  list.length
    ? `<ul class="conditions-issues${kind ? " " + kind : ""}">${list.map((x) => `<li>${ctx.esc(message(ctx, x))}</li>`).join("")}</ul>`
    : "";
function sourceHTML(ctx, source) {
  if (!source)
    return `<small class="conditions-source muted">${ctx.t("Fonte non registrata", "Source not recorded")}</small>`;
  const local = source[ctx.lang] || source.en || source.it;
  const pages = local?.pages ?? source.pages;
  const title = [
    source.kind === "srd"
      ? `SRD ${source.revision || ""}`.trim()
      : name(ctx, source.title || source.label || "") ||
        (source.kind === "manual"
          ? ctx.t("Registrazione manuale", "Manual record")
          : ctx.t("Regola dichiarata", "Authored rule")),
    source.kind === "srd" ? "" : source.revision,
    pages?.length ? `p. ${pages.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const url = local?.url || source.url;
  return `<small class="conditions-source">${ctx.t("Fonte", "Source")}: ${/^https:\/\//.test(url || "") ? `<a href="${ctx.esc(url)}" target="_blank" rel="noopener noreferrer">${ctx.esc(title)}</a>` : ctx.esc(title)}</small>`;
}

// ---------------------------------------------------------------- projections

function effective(ctx, actorId, state = ctx.state) {
  try {
    return ctx.conditionActor?.(actorId, state) ?? undefined;
  } catch {
    return undefined;
  }
}
function overviewOf(ctx, actorId) {
  const o = domain.getConditionOverview(ctx.state, actorId, ctx.role, {
    effectiveActor: effective(ctx, actorId),
  });
  // B20 (campaign-settings.mjs, PG-94): where the shell withholds control (a DM on the
  // sheet of a player who reserved it) the panel is read-only, as on the sheet itself.
  if (o.permissions.canControl && ctx.canControl && !ctx.canControl(ctx.state.actors[actorId]))
    for (const key of Object.keys(o.permissions)) o.permissions[key] = false;
  return o;
}
function pendingRolls(ctx, actorId) {
  try {
    return (ctx.conditionRolls?.(actorId) ?? []).filter(
      (r) => r?.descriptorId && !CLOSED.includes(r.status),
    );
  } catch {
    return [];
  }
}
function actorName(ctx, o, id) {
  const row = o.choices.actors.find((a) => a.id === id);
  return row ? name(ctx, row.name) : ctx.t("creatura non disponibile", "unavailable creature");
}
function aidCandidates(ctx, o) {
  const rows = o.choices.actors
    .map(({ id }) => {
      try {
        return id === o.actorId ? o : domain.getConditionOverview(ctx.state, id, ctx.role);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return {
    targets: rows.filter((x) => x.vitality === "dying" || x.vitality === "knocked-out"),
    helpers: rows.filter(
      (x) => x.permissions.canControl && !x.dead && x.hp > 0 && !x.mechanics.incapacitated,
    ),
  };
}
function aidRelevant(o, c) {
  if (c.targets.some((t) => t.actorId === o.actorId))
    return c.helpers.some((h) => h.actorId !== o.actorId);
  return (
    c.helpers.some((h) => h.actorId === o.actorId) && c.targets.some((t) => t.actorId !== o.actorId)
  );
}

// ---------------------------------------------------------------- human text

function vitalText(ctx, o) {
  if (o.vitality === "conscious" && o.mechanics.conditionIds.includes("unconscious"))
    return ctx.t("Privo di sensi", "Unconscious");
  return {
    conscious: ctx.t("Cosciente", "Conscious"),
    "knocked-out": ctx.t("Privo di sensi (knockout)", "Knocked out"),
    dying: ctx.t("Morente", "Dying"),
    stable: ctx.t("Stabile", "Stable"),
    dead: ctx.t("Morto", "Dead"),
    "zero-hp": ctx.t("A 0 PF", "At 0 HP"),
    gone: ctx.t("Scomparso", "Gone"),
    unknown: ctx.t("PF non registrati", "HP not recorded"),
  }[o.vitality];
}
function policyText(ctx, value) {
  return (
    {
      "death-saves": ctx.t("Tiri salvezza contro la morte", "Death saving throws"),
      death: ctx.t("Muore a 0 PF", "Dies at 0 HP"),
      disappear: ctx.t("Scompare a 0 PF", "Disappears at 0 HP"),
      manual: ctx.t("Decide il DM", "The DM decides"),
    }[value] || ctx.t("Non registrata", "Not recorded")
  );
}
function duration(ctx, seconds) {
  const h = Math.floor(seconds / 3600),
    m = Math.ceil((seconds % 3600) / 60);
  const parts = [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean);
  return parts.length ? parts.join(" ") : "0 min";
}
function termText(ctx, o, term) {
  if (!term || typeof term !== "object") return ctx.t("Termine non registrato", "End not recorded");
  const who = (id) => actorName(ctx, o, id);
  if (term.kind === "manual") return ctx.t("Fino a rimozione", "Until removed");
  if (term.kind === "clock") {
    const now = o.choices.clock?.seconds ?? 0;
    return ctx.t(
      `Tempo di gioco: scade tra ${duration(ctx, Math.max(0, term.expiresAt - now))}`,
      `Game time: ends in ${duration(ctx, Math.max(0, term.expiresAt - now))}`,
    );
  }
  if (term.kind === "turn")
    return ctx.t(
      `${term.phase === "start" ? "Inizio" : "Fine"} del ${term.when === "current" ? "turno corrente" : "prossimo turno"} di ${who(term.actorId)}`,
      `${term.phase === "start" ? "Start" : "End"} of ${who(term.actorId)}'s ${term.when === "current" ? "current" : "next"} turn`,
    );
  if (term.kind === "rest")
    return ctx.t(
      `Fino al ${{ short: "riposo breve", long: "riposo lungo", any: "prossimo riposo" }[term.restKind]} di ${who(term.actorId)}`,
      `Until ${who(term.actorId)} finishes ${{ short: "a Short Rest", long: "a Long Rest", any: "a rest" }[term.restKind]}`,
    );
  if (term.kind === "concentration")
    return ctx.t(
      `Finché ${who(term.actorId)} mantiene la concentrazione`,
      `While ${who(term.actorId)} keeps Concentration`,
    );
  return ctx.t("Termine non riconosciuto", "Unrecognized end");
}
function itemName(ctx, o, id) {
  const item = o.choices.heldItems.find((i) => i.id === id);
  return item ? name(ctx, item.name) : ctx.t("oggetto", "item");
}
function valueText(ctx, o, row, value) {
  if (value === null || value === undefined) return ctx.t("Non registrato", "Not recorded");
  const f = String(row.field || "");
  if (typeof value === "boolean") {
    if (f.startsWith("conditions."))
      return value ? ctx.t("Attiva", "Active") : ctx.t("Non attiva", "Not active");
    if (f === "concentration.active")
      return value ? ctx.t("Attiva", "Active") : ctx.t("Terminata", "Ended");
    if (f === "action") return value ? ctx.t("Disponibile", "Available") : ctx.t("Spesa", "Spent");
    return value ? ctx.t("Sì", "Yes") : ctx.t("No", "No");
  }
  if (typeof value === "number") return fmt(ctx, value) + (f === "movement" ? " m" : "");
  if (Array.isArray(value))
    return value.length
      ? value.map((id) => itemName(ctx, o, id)).join(", ")
      : ctx.t("Nessuno", "None");
  if (f === "term") return termText(ctx, o, value);
  if (f === "vitalityPolicy.zeroHp") return policyText(ctx, value);
  if (f === "sourceVisibility")
    return value === "private" ? ctx.t("Riservata", "Private") : ctx.t("Condivisa", "Shared");
  if (typeof value === "object") return name(ctx, value);
  return String(value);
}
const REQUIRES = {
  "source-in-sight": ["se vede la fonte della paura", "while the source of fear is in sight"],
  "target-not-grappler": ["contro chi non la afferra", "against anyone but the grappler"],
  "target-cannot-see": ["se il bersaglio non la vede", "if the target cannot see it"],
  "attacker-cannot-see": ["se l’attaccante non la vede", "if the attacker cannot see it"],
};
function reasons(ctx, list) {
  return list
    .map(
      (r) =>
        name(ctx, r.name) +
        (r.requires && REQUIRES[r.requires] ? ` (${ctx.t(...REQUIRES[r.requires])})` : ""),
    )
    .join(", ");
}
const FOLLOW = {
  "end-concentration": [
    "La concentrazione termina e chiude i suoi effetti collegati.",
    "Concentration ends and closes its linked effects.",
  ],
  "start-knockout-rest": [
    "Inizia il riposo breve del knockout.",
    "The knockout Short Rest starts.",
  ],
  "request-stable-recovery": [
    "Si apre la richiesta 1d4 ore di recupero.",
    "The 1d4-hour recovery request opens.",
  ],
  "expire-vitality-requests": [
    "Le richieste di tiro non più dovute scadono con la loro causa.",
    "Roll requests no longer due expire with their cause.",
  ],
  "held-items": [
    "Resta da registrare cosa cade dalle mani.",
    "What falls from its hands still needs recording.",
  ],
};

// ---------------------------------------------------------------- panel state

function initial(ctx, actorId) {
  return {
    owner: ctx.role,
    actorId,
    mode: null,
    definitionId: null,
    custom: false,
    instanceId: null,
    fields: {},
    held: [],
    heldTouched: false,
    termTouched: false,
    review: null,
    error: "",
    notice: "",
    history: false,
    details: {},
    focus: null,
    returnFocus: null,
  };
}
function termDefaults(o, term) {
  const remaining = term?.remainingSeconds;
  return {
    termKind: ["manual", "clock", "turn", "rest", "concentration"].includes(term?.kind)
      ? term.kind
      : "manual",
    termAmount:
      Number.isFinite(remaining) && remaining > 0 ? String(Math.ceil(remaining / 60)) : "1",
    termUnit: "minutes",
    termActor: term?.actorId ?? o.actorId,
    termPhase: term?.phase ?? "end",
    termWhen: term?.when ?? "next",
    termRest: term?.restKind ?? "long",
    termConcentration: o.choices.concentrations[0]
      ? `${o.choices.concentrations[0].actorId}|${o.choices.concentrations[0].id}`
      : "",
  };
}
function defaults(ctx, o, mode, instance) {
  const base = { reason: "" };
  if (mode === "add")
    return {
      ...base,
      ...termDefaults(o),
      search: "",
      originLabel: "",
      originActor: "",
      customLabel: "",
      sourcePrivate: false,
    };
  if (mode === "exhaustion") return { ...base, level: String(o.exhaustion ?? 0) };
  if (mode === "damage") return { ...base, amount: "", critical: false };
  if (mode === "heal") return { ...base, amount: "" };
  if (mode === "temp-hp") return { ...base, amount: "", choice: "" };
  if (mode === "correct")
    return {
      ...base,
      hp: o.hp ?? "",
      maxHp: o.maxHp ?? "",
      tempHp: o.tempHp ?? "",
      successes: String(o.deathSaves.successes),
      failures: String(o.deathSaves.failures),
      stable: o.deathSaves.stable,
      dead: o.dead,
      policy: o.policy?.zeroHp ?? "",
    };
  if (mode === "correct-term")
    return {
      ...base,
      ...termDefaults(o, instance?.term),
      sourcePrivate: instance?.sourceVisibility === "private",
    };
  if (mode === "aid") {
    const c = aidCandidates(ctx, o);
    const target = c.targets.find((t) => t.actorId === o.actorId)
      ? o.actorId
      : c.targets.find((t) => t.actorId !== o.actorId)?.actorId;
    const helper = c.helpers.find((h) => h.actorId === o.actorId && h.actorId !== target)
      ? o.actorId
      : c.helpers.find((h) => h.actorId !== target)?.actorId;
    return { ...base, helper: helper ?? "", target: target ?? "" };
  }
  return base;
}
function startMode(ctx, o, mode, { instanceId = null, definitionId = null, from = null } = {}) {
  const instance = instanceId ? o.instances.find((i) => i.instanceId === instanceId) : null;
  if (instanceId && !instance)
    throw Error(ctx.t("Origine non più disponibile.", "Origin no longer available."));
  Object.assign(panel, {
    mode,
    instanceId,
    definitionId,
    custom: false,
    review: null,
    error: "",
    notice: "",
    held: mode === "held-items" ? [] : o.choices.heldItems.filter((i) => i.held).map((i) => i.id),
    heldTouched: false,
    termTouched: false,
    fields: defaults(ctx, o, mode, instance),
    focus: "[data-conditions-work-title]",
    returnFocus: from,
  });
  if (mode === "stand") panel.review = review(ctx, o);
}
function redraw(ctx) {
  if (!refreshConditionsUI(ctx)) ctx.render();
}
function safe(ctx, fn) {
  try {
    return fn();
  } catch (error) {
    if (panel) panel.error = message(ctx, error);
    ctx.toast?.(message(ctx, error), true);
    redraw(ctx);
    return null;
  }
}

// ---------------------------------------------------------------- selections

function termFrom(o) {
  const f = panel.fields;
  if (f.termKind === "clock") {
    const amount = num(f.termAmount),
      clock = o.choices.clock;
    return {
      kind: "clock",
      clockId: clock?.id ?? null,
      expiresAt:
        Number.isFinite(amount) && clock
          ? clock.seconds + Math.round(amount * (UNITS[f.termUnit] ?? 60))
          : null,
    };
  }
  if (f.termKind === "turn")
    return { kind: "turn", actorId: f.termActor, phase: f.termPhase, when: f.termWhen };
  if (f.termKind === "rest") return { kind: "rest", actorId: f.termActor, restKind: f.termRest };
  if (f.termKind === "concentration") {
    const [actorId, concentrationId] = String(f.termConcentration || "").split("|");
    return { kind: "concentration", actorId, concentrationId };
  }
  return { kind: "manual" };
}
function originFrom() {
  const label = String(panel.fields.originLabel ?? "").trim(),
    actorId = panel.fields.originActor;
  const out = { ...(label ? { label } : {}), ...(actorId ? { actorId } : {}) };
  return Object.keys(out).length ? out : null;
}
function vitalityPatch(o) {
  const f = panel.fields,
    patch = {};
  for (const key of ["hp", "maxHp", "tempHp"])
    if (String(f[key] ?? "").trim() !== "" && num(f[key]) !== o[key]) patch[key] = num(f[key]);
  for (const key of ["successes", "failures"])
    if (num(f[key]) !== o.deathSaves[key]) patch[key] = num(f[key]);
  if (!!f.stable !== o.deathSaves.stable) patch.stable = !!f.stable;
  if (!!f.dead !== o.dead) patch.dead = !!f.dead;
  if (f.policy && f.policy !== (o.policy?.zeroHp ?? "")) patch.zeroHpPolicy = f.policy;
  return patch;
}
function request(ctx, o) {
  const f = panel.fields,
    reason = String(f.reason ?? "").trim();
  switch (panel.mode) {
    case "add": {
      const origin = originFrom();
      const common = {
        term: termFrom(o),
        visibility: "shared",
        sourceVisibility: f.sourcePrivate ? "private" : "shared",
        ...(origin ? { origin } : {}),
      };
      if (panel.custom)
        return {
          type: "condition",
          selection: {
            kind: "custom",
            label: String(f.customLabel ?? "").trim(),
            reason,
            source: copy(MANUAL),
            ...common,
          },
        };
      return {
        type: "condition",
        selection: {
          kind: "apply",
          conditionId: panel.definitionId,
          source: copy(definition(panel.definitionId)?.source ?? null),
          mode: "record",
          ...common,
          ...(panel.definitionId === "unconscious" && panel.heldTouched
            ? { heldItemIds: [...panel.held] }
            : {}),
        },
      };
    }
    case "end":
      return {
        type: "condition",
        selection: { kind: "end", instanceId: panel.instanceId, reason },
      };
    case "correct-term": {
      const instance = o.instances.find((i) => i.instanceId === panel.instanceId);
      const patch = {};
      if (panel.termTouched) patch.term = termFrom(o);
      const visibility = f.sourcePrivate ? "private" : "shared";
      if (instance && visibility !== instance.sourceVisibility) patch.sourceVisibility = visibility;
      return {
        type: "condition",
        selection: { kind: "correct", instanceId: panel.instanceId, patch, reason },
      };
    }
    case "held-items":
      return {
        type: "condition",
        selection: {
          kind: "held-items",
          instanceId: panel.instanceId,
          itemIds: [...panel.held],
          reason,
        },
      };
    case "exhaustion":
      return {
        type: "condition",
        selection: {
          kind: "exhaustion",
          level: num(f.level),
          reason,
          source: copy(definition("exhaustion").source),
        },
      };
    case "damage":
      return {
        type: "vitality",
        selection: {
          kind: "damage",
          amount: num(f.amount),
          reason,
          source: copy(MANUAL),
          ...(f.critical ? { critical: true } : {}),
        },
      };
    case "heal":
      return {
        type: "vitality",
        selection: { kind: "heal", amount: num(f.amount), reason, source: copy(MANUAL) },
      };
    case "temp-hp":
      return {
        type: "vitality",
        selection: {
          kind: "temp-hp",
          amount: num(f.amount),
          reason,
          source: copy(MANUAL),
          ...(f.choice ? { choice: f.choice } : {}),
        },
      };
    case "correct":
      return {
        type: "vitality",
        selection: { kind: "correct", patch: vitalityPatch(o), reason, source: copy(MANUAL) },
      };
    case "stand":
      return { type: "stand", selection: {} };
    case "aid": {
      const target = aidCandidates(ctx, o).targets.find((t) => t.actorId === f.target);
      return {
        type: "aid",
        selection: {
          actorId: f.helper,
          targetId: f.target,
          kind: target?.vitality === "knocked-out" ? "wake-knockout" : "stabilize",
        },
      };
    }
    default:
      throw Error(ctx.t("Scegli un comando.", "Choose a command."));
  }
}
function standContext(ctx, state) {
  const blocking = ctx.conditionBlocking?.(panel.actorId, state);
  return {
    effectiveActor: effective(ctx, panel.actorId, state),
    ...(blocking === true ? { blocking: true } : {}),
  };
}
function query(ctx, r) {
  try {
    const s = ctx.state,
      v = ctx.role,
      id = panel.actorId;
    if (r.type === "condition") return domain.previewConditionChange(s, id, r.selection, v);
    if (r.type === "vitality") return domain.previewVitalityChange(s, id, r.selection, v);
    if (r.type === "stand") return domain.previewStand(s, id, v, standContext(ctx, s));
    return domain.previewAid(s, r.selection, v, {
      effectiveActor: effective(ctx, r.selection.actorId),
    });
  } catch (error) {
    return {
      canApply: false,
      errors: [{ it: message({ lang: "it" }, error), en: message({ lang: "en" }, error) }],
      warnings: [],
      rows: [],
      costs: [],
      followUps: [],
      reconciliation: [],
      reviewKey: null,
      commit: { local: false, visibility: "shared" },
    };
  }
}
function review(ctx, o) {
  const r = { ...request(ctx, o), operationId: uid(), dirty: false };
  r.preview = query(ctx, r);
  return r;
}
function preview(ctx) {
  panel.review = review(ctx, overviewOf(ctx, panel.actorId));
  panel.error = "";
  panel.notice = "";
  panel.focus = "[data-conditions-review]";
  redraw(ctx);
}
function commitTitle(ctx, o, r) {
  const s = r.selection;
  const def = definition(s.conditionId);
  if (r.type === "stand") return ctx.t("Si rialza da Prono", "Stands up from Prone");
  if (r.type === "vitality")
    return {
      damage: ctx.t("Danno registrato", "Damage recorded"),
      heal: ctx.t("Cura registrata", "Healing recorded"),
      "temp-hp": ctx.t("PF temporanei registrati", "Temporary HP recorded"),
      correct: ctx.t("Correzione dello stato vitale", "Vitality correction"),
    }[s.kind];
  if (s.kind === "apply")
    return ctx.t("Condizione applicata", "Condition applied") + ": " + name(ctx, def?.name ?? "");
  if (s.kind === "end") {
    const instance = o.instances.find((i) => i.instanceId === s.instanceId);
    return (
      ctx.t("Condizione terminata", "Condition ended") + ": " + name(ctx, instance?.name ?? "")
    );
  }
  return {
    custom: ctx.t("Etichetta manuale aggiunta", "Manual label added"),
    correct: ctx.t("Termine della condizione corretto", "Condition end corrected"),
    "held-items": ctx.t("Oggetti caduti registrati", "Dropped items recorded"),
    exhaustion: ctx.t("Indebolimento: livello ", "Exhaustion: level ") + s.level,
  }[s.kind];
}
function closeWork(ctx, notice = "") {
  Object.assign(panel, {
    mode: null,
    instanceId: null,
    definitionId: null,
    custom: false,
    review: null,
    fields: {},
    error: "",
    notice,
    focus: notice ? "[data-conditions-notice]" : panel.returnFocus,
    returnFocus: null,
  });
}
function apply(ctx) {
  const r = panel.review;
  if (!r) return;
  const fresh = query(ctx, r);
  if (r.dirty || fresh.reviewKey !== r.preview.reviewKey)
    throw Error(
      ctx.t(
        "Dati o scelte cambiati: rivedi l’anteprima aggiornata.",
        "Data or choices changed: review the updated preview.",
      ),
    );
  if (!fresh.canApply) throw Error(message(ctx, fresh.errors[0]));
  if (ctx.offline && !fresh.commit?.local)
    throw Error(
      ctx.t(
        "Senza rete: riconnettiti per applicare questa modifica condivisa.",
        "Offline: reconnect to apply this shared change.",
      ),
    );
  if (r.type === "aid") return startAid(ctx, r);
  const o = overviewOf(ctx, panel.actorId),
    id = panel.actorId,
    v = ctx.role;
  const title = commitTitle(ctx, o, r);
  const options = {
    operationId: r.operationId,
    reviewKey: r.preview.reviewKey,
    online: !ctx.offline,
  };
  let result;
  const outcome = ctx.commit(
    title,
    (draft) => {
      if (r.type === "condition")
        result = domain.applyConditionChange(draft, id, r.selection, v, options);
      else if (r.type === "vitality")
        result = domain.applyVitalityChange(draft, id, r.selection, v, options);
      else result = domain.standUp(draft, id, v, { ...options, ...standContext(ctx, draft) });
      ctx.applyConditionFollowUps?.(draft, result);
    },
    r.preview.commit,
  );
  if (outcome?.applied === false)
    throw Error(ctx.t("La modifica non è stata applicata.", "The change was not applied."));
  closeWork(ctx, title);
  redraw(ctx);
}
function openRoll(ctx, descriptorId) {
  if (!descriptorId)
    throw Error(ctx.t("Richiesta di tiro non disponibile.", "Roll request unavailable."));
  const actorId = panel?.actorId;
  // After the roll, the result dialog offers a way back to this panel.
  ctx.openConditionRoll(descriptorId, {
    returnTo: actorId ? () => openConditions(ctx, { actorId }) : undefined,
  });
}
function startAid(ctx, r) {
  const { actorId, targetId, kind } = r.selection;
  const existing = [...pendingRolls(ctx, targetId), ...pendingRolls(ctx, actorId)].find(
    (x) => x.kind === "medicine",
  );
  const descriptorId =
    existing?.descriptorId ??
    ctx.beginConditionRoll({
      kind: "medicine",
      actorId,
      targetId,
      aidKind: kind,
      reviewKey: r.preview.reviewKey,
    })?.descriptorId;
  closeWork(
    ctx,
    existing
      ? ctx.t(
          "Prova di Medicina già in attesa: riaperta.",
          "Medicine check already pending: reopened.",
        )
      : ctx.t(
          "Prova di Medicina avviata nella coda dei tiri.",
          "Medicine check started in the roll queue.",
        ),
  );
  openRoll(ctx, descriptorId);
  redraw(ctx);
}
function vitalRoll(ctx, kind) {
  const id = panel.actorId;
  const existing = pendingRolls(ctx, id).find((r) => r.kind === kind);
  if (existing) return openRoll(ctx, existing.descriptorId);
  const o = overviewOf(ctx, id);
  if (!o.permissions.canControl)
    throw Error(ctx.t("Non puoi gestire questo soggetto.", "You cannot manage this actor."));
  if (kind === "death-save" && !o.permissions.canRequestDeathSave)
    throw Error(
      ctx.t(
        "Il tiro salvezza contro la morte non è dovuto ora.",
        "A death saving throw is not due now.",
      ),
    );
  openRoll(ctx, ctx.beginConditionRoll({ kind, actorId: id })?.descriptorId);
}

// ---------------------------------------------------------------- rendering

// A shared roll needs the connection: its buttons say so instead of failing on click.
const offlineShared = (ctx, o) => !!ctx.offline && !o.commit?.local;
const offlineRollNote = (ctx, id = "conditions-offline-why") =>
  `<p class="conditions-why" data-conditions-offline id="${id}">${ctx.t("Senza rete: riconnettiti per registrare questo tiro condiviso.", "Offline: reconnect to record this shared roll.")}</p>`;

/** SV-37: why the preview's Apply is off, and what to do (errors listed above it). */
function applyWhy(ctx, p, { stale, offline }) {
  if (offline)
    return ctx.t(
      "Senza rete: riconnettiti e premi Applica; gli input restano.",
      "Offline: reconnect and press Apply; the inputs stay.",
    );
  if (stale)
    return ctx.t(
      "Scelte o dati cambiati: premi di nuovo Anteprima.",
      "Choices or data changed: press Preview again.",
    );
  return ctx.t(
    "Non si può applicare: correggi quanto indicato sopra, poi rifai l’anteprima.",
    "It cannot be applied: fix what is listed above, then preview again.",
  );
}
function statusHTML(ctx, o) {
  const m = o.mechanics;
  const facts = [
    [
      ctx.t("Punti ferita", "Hit points"),
      o.hp === null
        ? ctx.esc(ctx.t("Non registrati", "Not recorded"))
        : `<strong>${o.hp}</strong> / ${o.maxHp ?? "?"}`,
    ],
    [ctx.t("PF temporanei", "Temporary HP"), o.tempHp === null ? "?" : String(o.tempHp)],
    ...(m.speed !== null ? [[ctx.t("Velocità", "Speed"), `${ctx.esc(fmt(ctx, m.speed))} m`]] : []),
    ...(o.exhaustion > 0
      ? [[ctx.t("Indebolimento", "Exhaustion"), `${ctx.t("livello", "level")} ${o.exhaustion}`]]
      : []),
  ];
  return `<section class="conditions-status" aria-label="${attr(ctx, ctx.t("Stato vitale", "Vital status"))}"><div class="conditions-identity"><h3>${ctx.esc(name(ctx, o.actorName))}</h3><span class="conditions-vital" data-vital="${attr(ctx, o.vitality)}">${ctx.esc(vitalText(ctx, o))}</span></div><dl class="conditions-facts">${facts.map(([k, v]) => `<div><dt>${ctx.esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>${deathHTML(ctx, o)}${pendingHTML(ctx, o)}</section>`;
}
function pips(ctx, count, kind) {
  return [0, 1, 2]
    .map((i) => `<span class="conditions-pip ${kind}${i < count ? " filled" : ""}"></span>`)
    .join("");
}
function deathHTML(ctx, o) {
  const ds = o.deathSaves;
  if (o.policy?.zeroHp !== "death-saves" || o.dead) return "";
  if (o.hp !== 0 && !ds.successes && !ds.failures) return "";
  const control = o.permissions.canControl;
  const pending = pendingRolls(ctx, o.actorId);
  let action = "";
  if (o.vitality === "dying") {
    const due = pending.find((r) => r.kind === "death-save");
    // One primary per view: while another command is open, this one steps back.
    const kind = panel?.mode ? "" : "primary";
    if (due && control)
      action = button(
        ctx,
        "data-conditions-death-save",
        ctx.t("Apri il tiro contro la morte in attesa", "Open the pending death saving throw"),
        { kind },
      );
    else if (o.permissions.canRequestDeathSave)
      action =
        button(
          ctx,
          `data-conditions-death-save${offlineShared(ctx, o) ? ' aria-describedby="conditions-death-offline"' : ""}`,
          ctx.t("Tira contro la morte", "Roll death saving throw"),
          {
            kind,
            disabled: offlineShared(ctx, o),
          },
        ) + (offlineShared(ctx, o) ? offlineRollNote(ctx, "conditions-death-offline") : "");
    else if (control)
      action = `<p class="muted">${ctx.t("In combattimento il tiro è richiesto all’inizio del suo turno.", "In combat the roll is requested at the start of its turn.")}</p>`;
  }
  let recovery = "";
  if (ds.stable && ds.recovery) {
    if (ds.recovery.expiresAt == null) {
      const due = pending.find((r) => r.kind === "stable-recovery");
      recovery = `<p>${ctx.t("Stabile: recupera 1 PF dopo 1d4 ore di gioco.", "Stable: regains 1 HP after 1d4 hours of game time.")}</p>${control ? button(ctx, `data-conditions-stable-recovery${!due && offlineShared(ctx, o) ? ' aria-describedby="conditions-recovery-offline"' : ""}`, due ? ctx.t("Apri il tiro 1d4 ore in attesa", "Open the pending 1d4-hour roll") : ctx.t("Tira 1d4 ore di recupero", "Roll 1d4 hours of recovery"), { disabled: !due && offlineShared(ctx, o) }) + (!due && offlineShared(ctx, o) ? offlineRollNote(ctx, "conditions-recovery-offline") : "") : ""}`;
    } else
      recovery = `<p>${ctx.t("Stabile: recupera 1 PF tra", "Stable: regains 1 HP in")} ${ctx.esc(duration(ctx, ds.recovery.remainingSeconds ?? 0))}.</p>`;
  } else if (ds.stable)
    recovery = `<p>${ctx.t("Stabile senza periodo di recupero registrato.", "Stable without a recorded recovery period.")}</p>`;
  return `<div class="conditions-death" role="group" aria-label="${attr(ctx, ctx.t("Tiri salvezza contro la morte", "Death saving throws"))}"><p><strong>${ctx.t("Tiri contro la morte", "Death saves")}</strong> <span>${ctx.t("Successi", "Successes")} ${ds.successes}/3</span> · <span>${ctx.t("Fallimenti", "Failures")} ${ds.failures}/3</span></p><p class="conditions-pips" aria-hidden="true">${pips(ctx, ds.successes, "success")}<span class="conditions-pip-gap"></span>${pips(ctx, ds.failures, "failure")}</p>${action}${recovery}</div>`;
}
function rollLabel(ctx, r) {
  if (r.label) return name(ctx, r.label);
  return (
    {
      "death-save": ctx.t("Tiro salvezza contro la morte", "Death saving throw"),
      medicine: ctx.t("Prova di Medicina", "Medicine check"),
      "stable-recovery": ctx.t("Recupero da stabile (1d4 ore)", "Stable recovery (1d4 hours)"),
    }[r.kind] || ctx.t("Tiro in attesa", "Pending roll")
  );
}
function pendingHTML(ctx, o) {
  if (!o.permissions.canControl) return "";
  const list = pendingRolls(ctx, o.actorId).filter(
    (r) => !["death-save", "stable-recovery"].includes(r.kind),
  );
  if (!list.length) return "";
  return `<div class="conditions-pending"><strong>${ctx.t("Tiri in attesa", "Pending rolls")}</strong>${list.map((r) => button(ctx, `data-conditions-open-roll="${attr(ctx, r.descriptorId)}"`, ctx.t("Apri", "Open") + ": " + rollLabel(ctx, r))).join("")}</div>`;
}
// Why Stand up is unavailable, from the same domain preview that would apply it.
function standReason(ctx, o) {
  try {
    const p = domain.previewStand(ctx.state, o.actorId, ctx.role, standContext(ctx, ctx.state));
    return p.errors[0] ? message(ctx, p.errors[0]) : "";
  } catch (error) {
    return message(ctx, error);
  }
}
/** The HP widget's command (B33), when that area is built. */
const hpCommand = (ctx) => {
  try {
    return ctx.registry?.get?.("command", "damage-tray.hp", ctx) ?? null;
  } catch {
    return null;
  }
};
function toolbarHTML(ctx, o) {
  const prone = o.mechanics.conditionIds.includes("prone");
  const c = aidCandidates(ctx, o);
  const target = c.targets.find((t) => t.actorId === o.actorId);
  const aidLabel = target
    ? target.vitality === "dying"
      ? ctx.t("Stabilizza", "Stabilize")
      : ctx.t("Pronto soccorso", "First aid")
    : ctx.t("Soccorri un alleato", "Aid an ally");
  const standWhy = prone && !o.permissions.canStand ? standReason(ctx, o) : "";
  // PG-22 (Roll20 / D&D Beyond: one HP control everywhere): with the HP widget built, damage,
  // healing and Temporary HP open that widget, which also carries cause, type and critical.
  const hpWidget = hpCommand(ctx);
  const items = [
    ...(hpWidget
      ? [
          [
            "hp",
            ctx.t("Punti ferita: cura, danno, temporanei…", "Hit points: heal, damage, temporary…"),
          ],
        ]
      : [
          ["damage", ctx.t("Danno", "Damage")],
          ["heal", ctx.t("Cura", "Heal"), !o.permissions.canHeal],
          ["temp-hp", ctx.t("PF temporanei", "Temporary HP"), o.dead],
        ]),
    ["add", ctx.t("Aggiungi condizione", "Add condition")],
    ["exhaustion", ctx.t("Indebolimento", "Exhaustion")],
    prone ? ["stand", ctx.t("Rialzati", "Stand up"), !!standWhy] : null,
    aidRelevant(o, c) ? ["aid", aidLabel] : null,
    ["correct", ctx.t("Correggi PF e stato", "Correct HP and status")],
  ].filter(Boolean);
  // One primary per view. With a command open, Apply in its preview is the primary and
  // the pressed command shows as selected; otherwise the roll a dying creature owes (in
  // the status above), else aid for a creature that needs it, else a new condition.
  const dueRoll =
    o.vitality === "dying" &&
    (o.permissions.canRequestDeathSave ||
      pendingRolls(ctx, o.actorId).some((r) => r.kind === "death-save"));
  const primary = GLOBAL_MODES.includes(panel.mode)
    ? null
    : dueRoll
      ? null
      : target && aidRelevant(o, c)
        ? "aid"
        : "add";
  const why = !o.permissions.canHeal
    ? o.dead
      ? ctx.t(
          "Una creatura morta non recupera PF finché la magia non la riporta in vita.",
          "A dead creature regains no HP until magic returns it to life.",
        )
      : ctx.t(
          "PF attuali o massimi non registrati: correggili prima di curare.",
          "Current or maximum HP not recorded: correct them before healing.",
        )
    : "";
  const tempWhy = o.dead
    ? ctx.t(
        "Una creatura morta non riceve PF temporanei: riportala in vita prima.",
        "A dead creature gets no temporary HP: bring it back to life first.",
      )
    : "";
  const whyId = {
    heal: "conditions-heal-why",
    stand: "conditions-stand-why",
    "temp-hp": "conditions-temp-why",
  };
  return `<div class="conditions-toolbar" role="group" aria-label="${attr(ctx, ctx.t("Comandi di stato", "Status commands"))}">${items
    .map(([key, text, disabled]) =>
      button(
        ctx,
        `data-conditions-command="${key}"${key === "add" ? " data-conditions-add" : ""} aria-pressed="${GLOBAL_MODES.includes(panel.mode) && panel.mode === key}"${disabled && whyId[key] ? ` aria-describedby="${whyId[key]}"` : ""}`,
        text,
        { disabled, kind: key === primary ? "primary" : "" },
      ),
    )
    .join(
      "",
    )}</div>${why ? `<p class="conditions-why muted" id="conditions-heal-why">${ctx.esc(why)}</p>` : ""}${standWhy ? `<p class="conditions-why muted" id="conditions-stand-why">${ctx.esc(standWhy)}</p>` : ""}${tempWhy && items.some(([key, , off]) => key === "temp-hp" && off) ? `<p class="conditions-why muted" id="conditions-temp-why">${ctx.esc(tempWhy)}</p>` : ""}`;
}
function termFieldsHTML(ctx, o) {
  const f = panel.fields;
  // A turn can belong to any creature seen on the Table; a rest only to readable sheets.
  const actors = o.choices.actors.map((a) => [a.id, name(ctx, a.name)]);
  const resting = o.choices.actors
    .filter((a) => !a.observable)
    .map((a) => [a.id, name(ctx, a.name)]);
  const kinds = [
    ["manual", ctx.t("Fino a rimozione manuale", "Until removed manually")],
    ...(o.choices.clock ? [["clock", ctx.t("Dopo un tempo di gioco", "After game time")]] : []),
    ["turn", ctx.t("All’inizio o alla fine di un turno", "At the start or end of a turn")],
    ["rest", ctx.t("Al termine di un riposo", "When a rest ends")],
    ...(o.choices.concentrations.length
      ? [["concentration", ctx.t("Finché dura una concentrazione", "While a Concentration lasts")]]
      : []),
  ];
  let detail = "";
  if (f.termKind === "clock")
    detail = `<div class="conditions-pair">${field(ctx, ctx.t("Durata", "Duration"), input(ctx, "termAmount", { type: "number", extra: 'min="1" step="1" inputmode="numeric"' }))}${field(
      ctx,
      ctx.t("Unità", "Unit"),
      select(ctx, "termUnit", [
        ["rounds", ctx.t("Round (6 s)", "Rounds (6 s)")],
        ["minutes", ctx.t("Minuti", "Minutes")],
        ["hours", ctx.t("Ore", "Hours")],
      ]),
    )}</div><p class="muted">${ctx.t("Scade nel tempo di gioco di questa creatura; nessun timer reale.", "Expires in this creature's game time; no real-time timer.")}</p>`;
  else if (f.termKind === "turn")
    detail = `${field(ctx, ctx.t("Turno di", "Turn of"), select(ctx, "termActor", actors))}<div class="conditions-pair">${field(
      ctx,
      ctx.t("Momento", "Moment"),
      select(ctx, "termPhase", [
        ["start", ctx.t("Inizio del turno", "Start of turn")],
        ["end", ctx.t("Fine del turno", "End of turn")],
      ]),
    )}${field(
      ctx,
      ctx.t("Quale turno", "Which turn"),
      select(ctx, "termWhen", [
        ["next", ctx.t("Il prossimo", "The next one")],
        ["current", ctx.t("Quello in corso", "The current one")],
      ]),
    )}</div><p class="muted">${ctx.t("«In corso» vale solo per la fine del turno che si sta svolgendo.", "“Current” only applies to the end of the turn under way.")}</p>`;
  else if (f.termKind === "rest")
    detail = `<div class="conditions-pair">${field(ctx, ctx.t("Riposo di", "Rest of"), select(ctx, "termActor", resting))}${field(
      ctx,
      ctx.t("Tipo di riposo", "Rest kind"),
      select(ctx, "termRest", [
        ["short", ctx.t("Riposo breve", "Short Rest")],
        ["long", ctx.t("Riposo lungo", "Long Rest")],
        ["any", ctx.t("Qualsiasi riposo", "Any rest")],
      ]),
    )}</div>`;
  else if (f.termKind === "concentration")
    detail = field(
      ctx,
      ctx.t("Concentrazione", "Concentration"),
      select(
        ctx,
        "termConcentration",
        o.choices.concentrations.map((c) => [
          `${c.actorId}|${c.id}`,
          `${name(ctx, c.label)} · ${actorName(ctx, o, c.actorId)}`,
        ]),
      ),
    );
  return `<fieldset class="conditions-fieldset"><legend>${ctx.t("Quando termina", "When it ends")}</legend>${field(ctx, ctx.t("Termine", "End"), select(ctx, "termKind", kinds))}${detail}</fieldset>`;
}
function originFieldsHTML(ctx, o) {
  return `<fieldset class="conditions-fieldset"><legend>${ctx.t("Origine", "Origin")}</legend>${field(ctx, ctx.t("Causa dichiarata", "Stated cause"), input(ctx, "originLabel", { extra: 'maxlength="120" autocomplete="off"' }), ctx.t("Per esempio: veleno della lama, incantesimo, caduta.", "For example: blade poison, a spell, a fall."))}${field(ctx, ctx.t("Creatura che l’ha causata", "Creature that caused it"), select(ctx, "originActor", [["", ctx.t("Nessuna indicata", "None stated")], ...o.choices.actors.map((a) => [a.id, name(ctx, a.name)])]))}${o.commit.local ? "" : check(ctx, "sourcePrivate", ctx.t("Origine riservata: gli altri vedono la condizione, non la sua causa", "Private origin: others see the condition, not its cause"))}</fieldset>`;
}
function heldHTML(ctx, o, legend, hint) {
  if (!o.choices.heldItems.length) return "";
  return `<fieldset class="conditions-fieldset"><legend>${ctx.esc(legend)}</legend>${hint ? `<p class="muted">${ctx.esc(hint)}</p>` : ""}${o.choices.heldItems.map((i) => `<label class="conditions-check"><input type="checkbox" data-conditions-held="${attr(ctx, i.id)}"${panel.held.includes(i.id) ? " checked" : ""}><span>${ctx.esc(name(ctx, i.name))}${i.quantity > 1 ? ` ×${i.quantity}` : ""}</span></label>`).join("")}</fieldset>`;
}
function effectsList(ctx, title, list) {
  return `<h5>${ctx.esc(title)}</h5>${list.length ? `<ul class="conditions-effect-list">${list.map((e) => `<li>${ctx.esc(name(ctx, e))}</li>`).join("")}</ul>` : `<p class="muted">${ctx.t("Nessuno", "None")}</p>`}`;
}
function definitionCardHTML(ctx, def, action = "") {
  const other = ctx.lang === "it" ? def.name.en : def.name.it;
  return `<div class="conditions-definition-card"><p class="conditions-definition-title"><strong>${ctx.esc(name(ctx, def.name))}</strong> <span class="muted">${ctx.esc(other)}</span>${action}</p>${sourceHTML(ctx, def.source)}${effectsList(ctx, ctx.t("Calcolato dall’app", "Computed by the app"), def.supported)}${effectsList(ctx, ctx.t("Da gestire al tavolo", "Handled at the table"), def.manual)}</div>`;
}
function catalogHTML(ctx) {
  const list = domain.listConditionDefinitions({ query: panel.fields.search || "" });
  return `${field(ctx, ctx.t("Cerca fra le 15 condizioni ufficiali", "Search the 15 official conditions"), input(ctx, "search", { type: "search", extra: 'autocomplete="off"' }))}<ul class="conditions-catalog">${list.map((d) => `<li><button type="button" class="conditions-definition" data-conditions-definition="${attr(ctx, d.id)}"><strong>${ctx.esc(name(ctx, d.name))}</strong><small>${ctx.esc(ctx.lang === "it" ? d.name.en : d.name.it)}</small></button></li>`).join("")}</ul>${list.length ? "" : `<p class="muted">${ctx.t("Nessuna condizione corrisponde.", "No condition matches.")}</p>`}<div class="conditions-actions">${button(ctx, "data-conditions-custom", ctx.t("Etichetta manuale senza regole", "Manual label without rules"))}${button(ctx, "data-conditions-cancel", ctx.t("Annulla", "Cancel"), { kind: "quiet" })}</div>`;
}
function addFormHTML(ctx, o) {
  const change = button(ctx, "data-conditions-change-definition", ctx.t("Cambia", "Change"), {
    kind: "quiet",
  });
  if (panel.custom)
    return `<div class="conditions-definition-card"><p class="conditions-definition-title"><strong>${ctx.t("Etichetta manuale", "Manual label")}</strong>${change}</p><p>${ctx.t("Un’etichetta manuale registra un fatto. Non applica regole né effetti automatici, qualunque sia il nome.", "A manual label records a fact. It applies no rules and has no automatic effects, whatever its name.")}</p></div>${field(ctx, ctx.t("Etichetta", "Label"), input(ctx, "customLabel", { extra: 'maxlength="80" autocomplete="off"' }))}${field(ctx, ctx.t("Motivo (obbligatorio)", "Reason (required)"), input(ctx, "reason", { extra: 'autocomplete="off"' }))}${originFieldsHTML(ctx, o)}${termFieldsHTML(ctx, o)}`;
  const def = definition(panel.definitionId);
  const held =
    def.id === "unconscious"
      ? heldHTML(
          ctx,
          o,
          ctx.t("Oggetti tenuti in mano (cadono)", "Items held in hand (dropped)"),
          o.choices.heldItems.some((i) => i.held === null)
            ? ctx.t(
                "Oggetti tenuti non registrati: indica cosa cade o lascialo da riconciliare. Un’armatura indossata non è un oggetto tenuto.",
                "Held items not recorded: mark what falls or leave it to reconcile. Worn armor is not a held item.",
              )
            : "",
        )
      : "";
  return `${definitionCardHTML(ctx, def, change)}${originFieldsHTML(ctx, o)}${termFieldsHTML(ctx, o)}${held}`;
}
function exhaustionEffect(ctx, level) {
  if (!Number.isInteger(level) || level < 0 || level > 6)
    return ctx.t("Livello da 0 a 6.", "Level from 0 to 6.");
  if (level === 0) return ctx.t("Livello 0: nessun effetto.", "Level 0: no effect.");
  if (level === 6) return ctx.t("Livello 6: la creatura muore.", "Level 6: the creature dies.");
  return ctx.t(
    `Livello ${level}: −${2 * level} alle prove con d20 · Velocità −${fmt(ctx, 1.5 * level)} m`,
    `Level ${level}: −${2 * level} to d20 Tests · Speed −${fmt(ctx, 1.5 * level)} m`,
  );
}
function exhaustionFormHTML(ctx, o) {
  const level = num(panel.fields.level);
  const def = definition("exhaustion");
  return `<p>${ctx.t("Livello attuale", "Current level")}: <strong>${o.exhaustion}</strong></p><div class="conditions-stepper" role="group" aria-label="${attr(ctx, ctx.t("Livello di Indebolimento", "Exhaustion level"))}">${button(ctx, `data-conditions-step="-1" aria-label="${attr(ctx, ctx.t("Riduci di un livello", "Decrease by one level"))}"`, "−", { disabled: !(level > 0), why: { id: "conditions-step-down-why", text: ctx.t("Livello 0: nessun Indebolimento da togliere.", "Level 0: no Exhaustion to remove.") } })}${input(ctx, "level", { type: "number", extra: `min="0" max="6" step="1" inputmode="numeric" aria-label="${attr(ctx, ctx.t("Nuovo livello", "New level"))}"` })}${button(ctx, `data-conditions-step="1" aria-label="${attr(ctx, ctx.t("Aumenta di un livello", "Increase by one level"))}"`, "+", { disabled: !(level < 6), why: { id: "conditions-step-up-why", text: ctx.t("Livello 6 è il massimo: la creatura muore (SRD 5.2.1).", "Level 6 is the maximum: the creature dies (SRD 5.2.1).") } })}</div><p class="conditions-effect">${ctx.esc(exhaustionEffect(ctx, level))}</p><p class="muted">${ctx.t("Un riposo lungo concluso riduce il livello di 1 dal pannello Riposo.", "A finished Long Rest lowers the level by 1 from the Rest panel.")}</p>${field(ctx, ctx.t("Motivo (obbligatorio)", "Reason (required)"), input(ctx, "reason", { extra: 'autocomplete="off"' }))}${sourceHTML(ctx, def.source)}`;
}
function vitalityFormHTML(ctx, o) {
  const reason = (label) =>
    field(ctx, label, input(ctx, "reason", { extra: 'autocomplete="off"' }));
  const amount = (label) =>
    field(
      ctx,
      label,
      input(ctx, "amount", { type: "number", extra: 'min="0" step="1" inputmode="numeric"' }),
    );
  if (panel.mode === "damage")
    return `${amount(ctx.t("Danni subiti", "Damage taken"))}${check(ctx, "critical", ctx.t("Da colpo critico (a 0 PF conta due fallimenti)", "From a Critical Hit (at 0 HP counts two failures)"))}${reason(ctx.t("Causa (obbligatoria)", "Cause (required)"))}<p class="muted">${ctx.t("I PF temporanei assorbono per primi. Il danno degli attacchi al Tavolo arriva già dal comando d’attacco.", "Temporary HP absorb first. Damage from Table attacks already arrives through the attack command.")}</p>`;
  if (panel.mode === "heal")
    return `${amount(ctx.t("PF recuperati", "HP regained"))}${reason(ctx.t("Fonte della cura (obbligatoria)", "Healing source (required)"))}<p class="muted">${ctx.t("La cura non resuscita, non concede PF temporanei e non rimuove Prono.", "Healing does not revive, grant Temporary HP or remove Prone.")}</p>`;
  if (panel.mode === "temp-hp")
    return `<p>${ctx.t("PF temporanei attuali", "Current Temporary HP")}: <strong>${o.tempHp ?? "?"}</strong></p>${amount(ctx.t("PF temporanei ricevuti", "Temporary HP received"))}${
      o.tempHp > 0
        ? field(
            ctx,
            ctx.t("Non si sommano: quali tieni?", "They do not stack: which do you keep?"),
            select(ctx, "choice", [
              ["", ctx.t("Scegli", "Choose")],
              ["keep", ctx.t(`Tieni i ${o.tempHp} attuali`, `Keep the current ${o.tempHp}`)],
              ["replace", ctx.t("Prendi i nuovi", "Take the new ones")],
            ]),
          )
        : ""
    }${reason(ctx.t("Fonte (obbligatoria), per esempio un incantesimo", "Source (required), for example a spell"))}<p class="muted">${ctx.t("I PF temporanei assorbono i danni per primi, non sono cura e a 0 PF non fanno riprendere i sensi. Durano fino all’esaurimento o a un riposo lungo.", "Temporary HP absorb damage first, are not healing and at 0 HP do not restore consciousness. They last until depleted or a Long Rest.")}</p>`;
  const counts = [0, 1, 2, 3].map((n) => [String(n), String(n)]);
  return `<p class="muted">${ctx.t("Una correzione sistema dati sbagliati: non è danno, cura, tiro salvezza, riposo o resurrezione.", "A correction fixes wrong data: it is not damage, healing, a saving throw, a rest or a resurrection.")}</p><div class="conditions-pair">${field(ctx, ctx.t("PF attuali", "Current HP"), input(ctx, "hp", { type: "number", extra: `min="${o.hp === 0 ? 0 : 1}" step="1" inputmode="numeric"` }))}${field(ctx, ctx.t("PF massimi", "Maximum HP"), input(ctx, "maxHp", { type: "number", extra: 'min="1" step="1" inputmode="numeric"' }))}</div>${field(ctx, ctx.t("PF temporanei", "Temporary HP"), input(ctx, "tempHp", { type: "number", extra: 'min="0" step="1" inputmode="numeric"' }))}<div class="conditions-pair">${field(ctx, ctx.t("Successi contro la morte", "Death save successes"), select(ctx, "successes", counts))}${field(ctx, ctx.t("Fallimenti contro la morte", "Death save failures"), select(ctx, "failures", counts))}</div>${check(ctx, "stable", ctx.t("Stabile", "Stable"))}${check(ctx, "dead", ctx.t("Morto", "Dead"))}${field(ctx, ctx.t("A 0 PF", "At 0 HP"), select(ctx, "policy", [...(o.policy ? [] : [["", ctx.t("Non registrata", "Not recorded")]]), ["death-saves", policyText(ctx, "death-saves")], ["death", policyText(ctx, "death")], ["disappear", policyText(ctx, "disappear")], ["manual", policyText(ctx, "manual")]]))}${reason(ctx.t("Motivo della correzione (obbligatorio)", "Correction reason (required)"))}`;
}
function standFormHTML(ctx, o) {
  return `<p>${ctx.t("Rialzarsi costa metà della Velocità effettiva in movimento. Non usa azioni né Scatto.", "Standing up costs half your effective Speed in movement. It uses no action or Dash.")}</p><p class="muted">${ctx.t("Per strisciare, muovi la pedina al Tavolo: ogni metro costa il doppio.", "To crawl, move the token on the Table: each meter costs double.")}</p>${o.mechanics.speed !== null ? `<p>${ctx.t("Velocità effettiva", "Effective Speed")}: ${ctx.esc(fmt(ctx, o.mechanics.speed))} m</p>` : ""}`;
}
function aidFormHTML(ctx, o) {
  const c = aidCandidates(ctx, o);
  const f = panel.fields;
  const helpers = c.helpers.filter((h) => h.actorId !== f.target);
  // A new target can exclude the chosen helper: keep the selection honest.
  if (!helpers.some((h) => h.actorId === f.helper)) f.helper = helpers[0]?.actorId ?? "";
  const target = c.targets.find((t) => t.actorId === f.target);
  const pending = [...pendingRolls(ctx, f.target), ...pendingRolls(ctx, f.helper)].find(
    (x) => x.kind === "medicine",
  );
  return `<p>${ctx.t("Con l’azione Aiuto una creatura presta soccorso: prova di Saggezza (Medicina) CD 10. Stabilizza chi sta morendo o risveglia chi è privo di sensi per knockout; non fa recuperare PF.", "With the Help action a creature gives first aid: Wisdom (Medicine) check DC 10. It stabilizes a dying creature or wakes a knocked-out one; it restores no HP.")}</p><p class="muted">${ctx.t("L’SRD non fissa una distanza per il soccorso: verifica al tavolo che chi aiuta possa raggiungere la creatura.", "The SRD sets no distance for first aid: check at the table that the helper can reach the creature.")}</p>${field(
    ctx,
    ctx.t("Chi riceve l’aiuto", "Who receives aid"),
    select(
      ctx,
      "target",
      c.targets.map((t) => [t.actorId, `${name(ctx, t.actorName)} · ${vitalText(ctx, t)}`]),
    ),
  )}${field(
    ctx,
    ctx.t("Chi aiuta", "Who helps"),
    helpers.length
      ? select(
          ctx,
          "helper",
          helpers.map((h) => [h.actorId, name(ctx, h.actorName)]),
        )
      : `<p class="muted">${ctx.t("Nessuna creatura che controlli può aiutare.", "No creature you control can help.")}</p>`,
  )}${target?.vitality === "knocked-out" ? `<p class="muted">${ctx.t("Il pronto soccorso termina solo il knockout: Prono resta.", "First aid ends only the knockout: Prone remains.")}</p>` : ""}${pending ? `<p class="conditions-notice">${ctx.t("Una prova di Medicina è già in attesa.", "A Medicine check is already pending.")} ${button(ctx, `data-conditions-open-roll="${attr(ctx, pending.descriptorId)}"`, ctx.t("Apri richiesta", "Open request"))}</p>` : ""}`;
}
function instanceFormHTML(ctx, o, instance) {
  const reason = field(
    ctx,
    ctx.t("Motivo (obbligatorio)", "Reason (required)"),
    input(ctx, "reason", { extra: 'autocomplete="off"' }),
  );
  if (panel.mode === "end")
    return `<p>${ctx.t("Termina solo questa origine; le altre restano.", "Ends only this origin; the others remain.")}</p>${reason}`;
  if (panel.mode === "held-items")
    return `${heldHTML(ctx, o, ctx.t("Oggetti caduti", "Dropped items"), ctx.t("Segna solo ciò che teneva in mano, non l’armatura indossata.", "Mark only what it held in hand, not worn armor."))}${reason}`;
  const canPrivacy = instance.owner === ctx.role || instance.owner === null;
  return `${termFieldsHTML(ctx, o)}${canPrivacy && !o.commit.local ? check(ctx, "sourcePrivate", ctx.t("Origine riservata", "Private origin")) : ""}${reason}`;
}
function workTitle(ctx) {
  return {
    add: panel.custom
      ? ctx.t("Etichetta manuale", "Manual label")
      : ctx.t("Aggiungi condizione", "Add condition"),
    exhaustion: ctx.t("Livello di Indebolimento", "Exhaustion level"),
    damage: ctx.t("Registra danno", "Record damage"),
    heal: ctx.t("Registra cura", "Record healing"),
    "temp-hp": ctx.t("Ricevi PF temporanei", "Receive Temporary HP"),
    correct: ctx.t("Correggi PF e stato vitale", "Correct HP and vital status"),
    stand: ctx.t("Rialzati", "Stand up"),
    aid: ctx.t("Soccorso con Medicina", "Aid with Medicine"),
    end: ctx.t("Termina questa origine", "End this origin"),
    "correct-term": ctx.t("Correggi termine o riservatezza", "Correct end or privacy"),
    "held-items": ctx.t("Registra oggetti caduti", "Record dropped items"),
  }[panel.mode];
}
function workHTML(ctx, o, instance = null) {
  const choosing = panel.mode === "add" && !panel.definitionId && !panel.custom;
  let form;
  if (choosing) form = catalogHTML(ctx);
  else if (panel.mode === "add") form = addFormHTML(ctx, o);
  else if (panel.mode === "exhaustion") form = exhaustionFormHTML(ctx, o);
  else if (["damage", "heal", "temp-hp", "correct"].includes(panel.mode))
    form = vitalityFormHTML(ctx, o);
  else if (panel.mode === "stand") form = standFormHTML(ctx, o);
  else if (panel.mode === "aid") form = aidFormHTML(ctx, o);
  else form = instanceFormHTML(ctx, o, instance);
  const previewLabel =
    panel.mode === "stand"
      ? ctx.t("Aggiorna anteprima", "Refresh preview")
      : ctx.t("Anteprima", "Preview");
  return `<section class="conditions-work${choosing ? " choosing" : ""}" aria-labelledby="conditions-work-title"><h4 id="conditions-work-title" tabindex="-1" data-conditions-work-title>${ctx.esc(workTitle(ctx))}</h4>${choosing ? form : `<div class="conditions-work-layout"><div class="conditions-form">${form}<div class="conditions-actions">${button(ctx, "data-conditions-preview", previewLabel)}</div></div>${previewHTML(ctx, o)}</div>`}</section>`;
}
function costText(ctx, cost) {
  if (cost.kind === "movement")
    return `${ctx.t("Movimento", "Movement")}: ${fmt(ctx, cost.before)} m → ${fmt(ctx, cost.after)} m · ${ctx.t("costo", "cost")} ${fmt(ctx, cost.amount)} m`;
  if (cost.kind === "action")
    return `${ctx.t("Azione", "Action")}: ${ctx.t("disponibile → spesa", "available → spent")}`;
  return name(ctx, cost.label) || cost.kind;
}
function breakdownHTML(ctx, b) {
  if (!b) return "";
  if ("damage" in b)
    return `<p class="conditions-values">${ctx.t("Danno", "Damage")} ${b.damage} · ${ctx.t("assorbiti dai PF temporanei", "absorbed by Temporary HP")} ${b.tempHpAbsorbed ?? 0} · ${ctx.t("PF persi", "HP lost")} ${b.hpLost ?? 0}</p>`;
  if ("healing" in b)
    return `<p class="conditions-values">${ctx.t("Cura", "Healing")} ${b.healing} · ${ctx.t("recuperati", "regained")} ${b.regained} · ${ctx.t("oltre il massimo", "over maximum")} ${b.overheal}</p>`;
  if ("granted" in b)
    return `<p class="conditions-values">${ctx.t("PF temporanei", "Temporary HP")} ${b.tempHpBefore} → ${b.tempHpAfter} · ${ctx.t("non si sommano", "they do not stack")}</p>`;
  return "";
}
function descriptorHTML(ctx, d) {
  if (!d) return "";
  const mod = d.modifier >= 0 ? `+${d.modifier}` : `−${Math.abs(d.modifier)}`;
  const dice = d.dice.map((x) => `${x.count}d${x.sides}`).join(" + ");
  const parts = (d.modifierSources ?? [])
    .map((m) =>
      m.kind === "ability"
        ? `${ctx.t("Saggezza", "Wisdom")} ${m.value >= 0 ? "+" : "−"}${Math.abs(m.value)}`
        : m.kind === "proficiency"
          ? `${ctx.t("competenza", "proficiency")} +${m.value}`
          : m.kind === "exhaustion"
            ? `${ctx.t("Indebolimento", "Exhaustion")} −${Math.abs(m.value)}`
            : `${ctx.t("Medicina", "Medicine")} ${m.value >= 0 ? "+" : "−"}${Math.abs(m.value)}`,
    )
    .join(", ");
  const mode =
    d.context?.rollMode === "disadvantage"
      ? ` · ${ctx.t("svantaggio (tira due d20, tieni il più basso)", "disadvantage (roll two d20, keep the lower)")}`
      : "";
  return `<p class="conditions-values">${ctx.t("Saggezza (Medicina) CD", "Wisdom (Medicine) DC")} ${d.dc} · ${ctx.esc(dice)} ${mod}${parts ? ` (${ctx.esc(parts)})` : ""}${mode}</p><p class="muted">${ctx.t("Dadi fisici o digitali nella coda dei tiri comune; il risultato applica l’esito.", "Physical or digital dice in the shared roll queue; the result applies the outcome.")}</p>${sourceHTML(ctx, d.source)}`;
}
function scopeText(ctx, commit) {
  if (commit?.local)
    return ctx.t("Scheda personale: modifica privata.", "Personal sheet: private change.");
  if (commit?.visibility === "private")
    return ctx.t(
      "Modifica condivisa con registro riservato.",
      "Shared change with a private log entry.",
    );
  return ctx.t("Modifica condivisa con il tavolo.", "Change shared with the table.");
}
function previewHTML(ctx, o) {
  const cancel = button(ctx, "data-conditions-cancel", ctx.t("Annulla", "Cancel"), {
    kind: "quiet",
  });
  const r = panel.review;
  if (!r)
    return `<aside class="conditions-preview"><h5>${ctx.t("Prima di applicare", "Before applying")}</h5><p class="muted">${ctx.t("L’anteprima mostra cosa cambia, costi, fonte e limiti. Nulla cambia finché non applichi.", "The preview shows what changes, costs, source and limits. Nothing changes until you apply.")}</p><div class="conditions-actions">${cancel}</div></aside>`;
  const p = query(ctx, r);
  const stale = r.dirty || p.reviewKey !== r.preview.reviewKey;
  const offline = ctx.offline && !p.commit?.local;
  const pendingAid =
    r.type === "aid" &&
    [...pendingRolls(ctx, r.selection.targetId), ...pendingRolls(ctx, r.selection.actorId)].some(
      (x) => x.kind === "medicine",
    );
  const applyLabel =
    r.type === "aid"
      ? pendingAid
        ? ctx.t("Apri la prova in attesa", "Open the pending check")
        : ctx.t("Avvia prova di Medicina", "Start Medicine check")
      : ctx.t("Applica", "Apply");
  const rows = (p.rows ?? [])
    .map((row) => {
      const same =
        String(row.field).startsWith("conditions.") && row.before === true && row.after === true;
      const note = !same
        ? ""
        : r.selection?.kind === "end"
          ? ctx.t("resta attiva per un’altra origine", "remains active through another origin")
          : ctx.t("già attiva: si aggiunge questa origine", "already active: this origin is added");
      return `<div class="conditions-row"><dt>${ctx.esc(name(ctx, row.label))}</dt><dd class="conditions-values">${ctx.esc(valueText(ctx, o, row, row.before))} → ${ctx.esc(valueText(ctx, o, row, row.after))}${note ? ` · ${note}` : ""}</dd>${row.source ? `<dd>${sourceHTML(ctx, row.source)}</dd>` : ""}</div>`;
    })
    .join("");
  const follow = (p.followUps ?? [])
    .map((x) => FOLLOW[x.kind])
    .filter(Boolean)
    .map(([it, en]) => ({ it, en }));
  return `<aside class="conditions-preview" aria-live="polite"><h5 tabindex="-1" data-conditions-review>${ctx.t("Anteprima", "Preview")}${p.targetName ? ` · ${ctx.esc(name(ctx, p.actorName))} → ${ctx.esc(name(ctx, p.targetName))}` : ""}</h5><p class="muted">${ctx.esc(scopeText(ctx, p.commit))}</p>${breakdownHTML(ctx, p.breakdown)}${rows ? `<dl class="conditions-rows">${rows}</dl>` : ""}${(p.costs ?? []).length ? `<h6>${ctx.t("Costi", "Costs")}</h6><ul class="conditions-issues">${p.costs.map((c) => `<li>${ctx.esc(costText(ctx, c))}</li>`).join("")}</ul>` : ""}${descriptorHTML(ctx, p.descriptor)}${issues(ctx, p.errors, "error")}${issues(ctx, p.warnings)}${issues(ctx, p.reconciliation)}${follow.length ? `<h6>${ctx.t("Poi, nello stesso passo", "Then, in the same step")}</h6>${issues(ctx, follow)}` : ""}${stale ? `<p class="conditions-notice">${ctx.t("Scelte o dati cambiati: ripeti l’anteprima.", "Choices or data changed: preview again.")}</p>` : ""}${offline ? `<p class="conditions-notice">${ctx.t("Senza rete: non applicata. Riconnettiti e premi Applica; gli input restano finché il pannello è aperto.", "Offline: not applied. Reconnect and press Apply; inputs stay while the panel is open.")}</p>` : ""}<div class="conditions-actions">${button(ctx, "data-conditions-apply", applyLabel, { disabled: !p.canApply || stale || offline, kind: "primary", why: { id: "conditions-apply-why", text: applyWhy(ctx, p, { stale, offline }) } })}${cancel}</div></aside>`;
}
const CAUSES = {
  "zero-hp": ["Scesa a 0 punti ferita", "Dropped to 0 Hit Points"],
  knockout: ["Knockout in mischia", "Melee knockout"],
  sleep: ["Sonno durante il riposo", "Sleeping during a rest"],
  "unconscious-fall": ["Caduta per incoscienza", "Fell unconscious"],
};
function boundText(ctx, instance) {
  if (instance.cause === "sleep" || (instance.id === "unconscious" && instance.restId))
    return ctx.t(
      "Termina con il suo riposo: svegliala dal pannello Riposo.",
      "Ends with its rest: wake it from the Rest panel.",
    );
  if (instance.cause === "zero-hp")
    return ctx.t(
      "Termina quando recupera PF: usa Cura o Correggi.",
      "Ends when it regains Hit Points: use Heal or Correct.",
    );
  return "";
}
function instanceHTML(ctx, o, instance) {
  const unknown =
    !instance.sourceHidden &&
    !instance.origin &&
    !instance.source &&
    instance.term.kind === "unknown";
  const origin = unknown
    ? ctx.t("Origine, termine e fonte non registrati", "Origin, end and source not recorded")
    : instance.sourceHidden
      ? ctx.t("Origine riservata", "Private origin")
      : instance.origin?.label
        ? name(ctx, instance.origin.label)
        : instance.origin?.actorId
          ? actorName(ctx, o, instance.origin.actorId)
          : CAUSES[instance.cause]
            ? ctx.t(...CAUSES[instance.cause])
            : ctx.t("Origine non registrata", "Origin not recorded");
  const by =
    instance.origin?.label && instance.origin?.actorId
      ? ` · ${ctx.esc(actorName(ctx, o, instance.origin.actorId))}`
      : "";
  const notes = [
    instance.legacy
      ? ctx.t("Registrazione precedente a questa versione.", "Recorded before this version.")
      : "",
    instance.sourceVisibility === "private" && !instance.sourceHidden
      ? ctx.t("Origine riservata agli altri.", "Origin hidden from others.")
      : "",
    instance.droppedItemIds.length
      ? `${ctx.t("Oggetti caduti", "Dropped items")}: ${instance.droppedItemIds.map((id) => itemName(ctx, o, id)).join(", ")}`
      : "",
  ].filter(Boolean);
  const why =
    !instance.permissions.canEnd && o.permissions.canControl ? boundText(ctx, instance) : "";
  const actions = [
    instance.permissions.canEnd
      ? button(
          ctx,
          `data-conditions-end="${attr(ctx, instance.instanceId)}"`,
          ctx.t("Termina", "End"),
        )
      : "",
    instance.permissions.canCorrect && !instance.sourceHidden && !instance.cause
      ? button(
          ctx,
          `data-conditions-correct-term="${attr(ctx, instance.instanceId)}"`,
          ctx.t("Correggi termine", "Correct end"),
          { kind: "quiet" },
        )
      : "",
    instance.permissions.canResolveHeldItems
      ? button(
          ctx,
          `data-conditions-held-items="${attr(ctx, instance.instanceId)}"`,
          ctx.t("Registra oggetti caduti", "Record dropped items"),
        )
      : "",
    why && instance.restId && typeof ctx.openRest === "function"
      ? button(ctx, "data-conditions-rest", ctx.t("Apri Riposo", "Open Rest"), { kind: "quiet" })
      : "",
  ].join("");
  const open = INSTANCE_MODES.includes(panel.mode) && panel.instanceId === instance.instanceId;
  return `<li class="conditions-instance${open ? " editing" : ""}" data-conditions-instance="${attr(ctx, instance.instanceId)}"><p class="conditions-origin"><strong>${ctx.esc(origin)}</strong>${by}</p>${unknown ? "" : `<p class="conditions-term">${ctx.esc(name(ctx, instance.term.label))}</p>${instance.sourceHidden ? "" : sourceHTML(ctx, instance.source)}`}${notes.map((n) => `<p class="muted">${ctx.esc(n)}</p>`).join("")}${issues(ctx, instance.reconciliation)}${why ? `<p class="conditions-why">${ctx.esc(why)}</p>` : ""}${actions ? `<div class="conditions-actions">${actions}</div>` : ""}${open ? workHTML(ctx, o, instance) : ""}</li>`;
}
function groupEffectsHTML(ctx, id) {
  const def = definition(id);
  if (!def) return "";
  const key = "effects-" + id;
  return `<details class="conditions-details" data-conditions-details="${attr(ctx, key)}"${panel.details[key] ? " open" : ""}><summary>${ctx.t("Effetti e fonte", "Effects and source")}</summary>${definitionCardHTML(ctx, def)}</details>`;
}
function activeHTML(ctx, o) {
  const groups = o.active.map((g) => {
    if (g.id === "exhaustion")
      return `<li class="conditions-group" data-conditions-group="exhaustion"><div class="conditions-group-head"><strong>${ctx.esc(name(ctx, g.name))}</strong><span class="badge">${ctx.t("livello", "level")} ${g.level}</span></div><p>${ctx.esc(exhaustionEffect(ctx, g.level))}</p>${o.permissions.canControl ? `<div class="conditions-actions">${button(ctx, 'data-conditions-command="exhaustion"', ctx.t("Cambia livello", "Change level"), { kind: "quiet" })}</div>` : ""}${groupEffectsHTML(ctx, "exhaustion")}</li>`;
    const instances = o.instances.filter((i) => g.instanceIds.includes(i.instanceId));
    const count =
      g.count > 1 ? `<span class="badge">${g.count} ${ctx.t("origini", "origins")}</span>` : "";
    const kind = g.custom
      ? `<span class="badge">${ctx.t("etichetta senza regole", "label without rules")}</span>`
      : "";
    return `<li class="conditions-group" data-conditions-group="${attr(ctx, g.id)}"><div class="conditions-group-head"><strong>${ctx.esc(name(ctx, g.name))}</strong>${count}${kind}</div>${g.count > 1 && !g.custom ? `<p class="muted">${ctx.t("Terminando un’origine, la condizione resta attiva per le altre.", "Ending one origin, the condition remains active through the others.")}</p>` : ""}<ul class="conditions-instances">${instances.map((i) => instanceHTML(ctx, o, i)).join("")}</ul>${g.custom ? "" : groupEffectsHTML(ctx, g.id)}</li>`;
  });
  return `<section class="conditions-active" aria-labelledby="conditions-active-title"><h4 id="conditions-active-title">${ctx.t("Condizioni attive", "Active conditions")}</h4>${groups.length ? `<ul class="conditions-list">${groups.join("")}</ul>` : `<p class="muted">${ctx.t("Nessuna condizione attiva.", "No active conditions.")}</p>`}</section>`;
}
function effectsHTML(ctx, o) {
  const m = o.mechanics;
  if (!m.conditionIds.length && !m.exhaustion) return "";
  const lines = [];
  if (m.speed !== null)
    lines.push(
      `${ctx.t("Velocità", "Speed")} ${fmt(ctx, m.speed)} m` +
        (m.speedZero
          ? ` (${ctx.t("0 per condizione", "0 from a condition")})`
          : m.speedPenalty
            ? ` (−${fmt(ctx, m.speedPenalty)} m ${ctx.t("Indebolimento", "Exhaustion")})`
            : ""),
    );
  if (m.d20Penalty)
    lines.push(
      `${ctx.t("Prove con d20", "d20 Tests")} −${m.d20Penalty} (${ctx.t("Indebolimento", "Exhaustion")})`,
    );
  if (m.incapacitated)
    lines.push(
      ctx.t(
        "Incapacitato: nessuna azione, azione bonus o reazione; non può parlare",
        "Incapacitated: no action, Bonus Action or Reaction; cannot speak",
      ),
    );
  if (m.autoFailSaves.length)
    lines.push(
      ctx.t(
        "Fallisce automaticamente i TS di Forza e Destrezza",
        "Automatically fails Strength and Dexterity saves",
      ),
    );
  if (m.attackDisadvantage.length)
    lines.push(
      `${ctx.t("Svantaggio ai propri attacchi", "Disadvantage on its attacks")}: ${reasons(ctx, m.attackDisadvantage)}`,
    );
  if (m.attackAdvantage.length)
    lines.push(
      `${ctx.t("Vantaggio ai propri attacchi", "Advantage on its attacks")}: ${reasons(ctx, m.attackAdvantage)}`,
    );
  if (m.attacksAgainstAdvantage.length)
    lines.push(
      `${ctx.t("Attacchi contro: vantaggio", "Attacks against it: Advantage")} (${reasons(ctx, m.attacksAgainstAdvantage)})`,
    );
  if (m.attacksAgainstDisadvantage.length)
    lines.push(
      `${ctx.t("Attacchi contro: svantaggio", "Attacks against it: Disadvantage")} (${reasons(ctx, m.attacksAgainstDisadvantage)})`,
    );
  if (m.attacksAgainstByDistance.length)
    lines.push(
      ctx.t(
        "Prono: attacchi entro 1,5 m con vantaggio, oltre con svantaggio",
        "Prone: attacks within 1.5 m have Advantage, farther ones Disadvantage",
      ),
    );
  if (m.criticalWithinMeters)
    lines.push(
      ctx.t(
        `I colpi entro ${fmt(ctx, m.criticalWithinMeters)} m sono critici`,
        `Hits from within ${fmt(ctx, m.criticalWithinMeters)} m are Critical Hits`,
      ),
    );
  if (m.checkDisadvantage.length)
    lines.push(
      `${ctx.t("Svantaggio alle prove di caratteristica", "Disadvantage on ability checks")}: ${reasons(ctx, m.checkDisadvantage)}`,
    );
  if (m.dexSaveDisadvantage.length)
    lines.push(ctx.t("Svantaggio ai TS di Destrezza", "Disadvantage on Dexterity saves"));
  if (m.cannotSee) lines.push(ctx.t("Non può vedere", "Cannot see"));
  if (m.cannotHear) lines.push(ctx.t("Non può sentire", "Cannot hear"));
  if (m.crawling)
    lines.push(
      m.speed > 0
        ? ctx.t(
            "Può strisciare (ogni metro costa il doppio) o rialzarsi",
            "Can crawl (each meter costs double) or stand up",
          )
        : ctx.t(
            "Prono con Velocità 0: non può strisciare né rialzarsi",
            "Prone with Speed 0: it can neither crawl nor stand up",
          ),
    );
  const manual = m.limitations.map((l) => name(ctx, l));
  return `<section class="conditions-effects" aria-labelledby="conditions-effects-title"><h4 id="conditions-effects-title">${ctx.t("Effetti in vigore", "Effects in play")}</h4>${lines.length ? `<ul class="conditions-effect-list">${lines.map((l) => `<li>${ctx.esc(l)}</li>`).join("")}</ul>` : ""}${manual.length ? `<p class="muted"><strong>${ctx.t("Da gestire al tavolo", "Handled at the table")}:</strong> ${ctx.esc(manual.join(" · "))}</p>` : ""}${issues(ctx, m.reconciliation)}</section>`;
}
// Each vitality reconciliation offers the command that resolves it, not only a message.
const RECONCILE = {
  "zero-hp-without-unconscious": [
    ["add", "unconscious", ["Aggiungi Privo di sensi", "Add Unconscious"]],
    ["correct", null, ["Correggi PF", "Correct HP"]],
  ],
  "zero-hp-policy": [
    ["correct", null, ["Registra la politica a 0 PF", "Record the zero-HP policy"]],
  ],
  "hp-unknown": [["correct", null, ["Registra i PF", "Record HP"]]],
  "max-hp-unknown": [["correct", null, ["Registra i PF massimi", "Record maximum HP"]]],
  "exhaustion-death": [["correct", null, ["Correggi stato vitale", "Correct vital status"]]],
  "stable-recovery-missing": [["correct", null, ["Correggi stabilità", "Correct stability"]]],
  "zero-hp-cause-remains": [["correct", null, ["Correggi PF e stato", "Correct HP and status"]]],
  exhaustion: [["exhaustion", null, ["Correggi il livello", "Correct the level"]]],
  "exhaustion-label": [["exhaustion", null, ["Registra il livello", "Record the level"]]],
};
function reconciliationHTML(ctx, o) {
  if (!o.reconciliation.length) return "";
  return `<ul class="conditions-issues conditions-reconcile">${o.reconciliation
    .map(
      (x) =>
        `<li><span>${ctx.esc(message(ctx, x))}</span>${
          o.permissions.canControl
            ? (RECONCILE[x.code] ?? [])
                .map(([mode, definitionId, label]) =>
                  button(
                    ctx,
                    `data-conditions-reconcile="${attr(ctx, mode)}"${definitionId ? ` data-conditions-reconcile-definition="${attr(ctx, definitionId)}"` : ""}`,
                    ctx.t(...label),
                    { kind: "quiet" },
                  ),
                )
                .join("")
            : ""
        }</li>`,
    )
    .join("")}</ul>`;
}
function historyHTML(ctx, o) {
  const toggle = `<button type="button" class="button quiet" data-conditions-history aria-expanded="${panel.history}" aria-controls="conditions-history">${ctx.t("Storico di condizioni e PF", "Conditions and HP history")}</button>`;
  if (!panel.history) return `<section class="conditions-history">${toggle}</section>`;
  let list = [];
  try {
    list = domain.getConditionHistory(ctx.state, o.actorId, ctx.role).slice(-20).reverse();
  } catch (error) {
    return `<section class="conditions-history">${toggle}<p role="status">${ctx.esc(message(ctx, error))}</p></section>`;
  }
  return `<section class="conditions-history">${toggle}<div id="conditions-history">${list.length ? `<ol class="conditions-history-list">${list.map((e) => `<li><p><strong>${ctx.esc(name(ctx, e.label))}</strong>${e.reason ? ` · ${ctx.esc(e.reason)}` : ""}</p><ul>${e.rows.map((row) => `<li>${ctx.esc(name(ctx, row.label))}: ${ctx.esc(valueText(ctx, o, row, row.before))} → ${ctx.esc(valueText(ctx, o, row, row.after))}</li>`).join("")}</ul>${e.source ? sourceHTML(ctx, e.source) : ""}</li>`).join("")}</ol>` : `<p class="muted">${ctx.t("Nessuna modifica registrata.", "No recorded change.")}</p>`}</div></section>`;
}

// Undo names the change it will reverse, which may not be a condition change.
function undoText(ctx) {
  const label = ctx.canUndo?.() ? ctx.undoLabel?.() : "";
  return label
    ? ctx.t("Annulla: ", "Undo: ") + label
    : ctx.t("Annulla ultima modifica", "Undo last change");
}
export function renderConditionsPanel(ctx) {
  if (!panel || panel.owner !== ctx.role) return "";
  let o;
  try {
    o = overviewOf(ctx, panel.actorId);
  } catch {
    return `<p role="status">${ctx.t("Condizioni e stato non disponibili per questa creatura.", "Conditions and status are unavailable for this creature.")}</p>`;
  }
  try {
    const control = o.permissions.canControl;
    const work = control && GLOBAL_MODES.includes(panel.mode) ? workHTML(ctx, o) : "";
    return `${statusHTML(ctx, o)}${ctx.offline ? `<p class="conditions-notice">${ctx.t("Senza rete: le modifiche condivise non si applicano e niente viene messo in coda. Riconnettiti e premi Applica; gli input restano finché il pannello è aperto. Le schede personali restano modificabili.", "Offline: shared changes are not applied and nothing is queued. Reconnect and press Apply; inputs stay while the panel is open. Personal sheets remain editable.")}</p>` : ""}${panel.error ? `<p class="conditions-notice error" role="alert">${ctx.esc(panel.error)}</p>` : ""}${panel.notice ? `<p class="conditions-notice" role="status" tabindex="-1" data-conditions-notice>${ctx.esc(panel.notice)}</p>` : ""}${control ? toolbarHTML(ctx, o) : `<p class="muted">${ctx.t("Consultazione: solo chi controlla la creatura può modificarla.", "View only: only the creature's controllers can change it.")}</p>`}${work}${reconciliationHTML(ctx, o)}${activeHTML(ctx, o)}${effectsHTML(ctx, o)}${historyHTML(ctx, o)}${control ? `<div class="conditions-footer">${button(ctx, "data-conditions-undo", undoText(ctx), { disabled: !ctx.canUndo?.(), kind: "quiet", why: { id: "conditions-undo-why", text: ctx.t("Niente da annullare qui: non c’è una tua ultima modifica di gioco.", "Nothing to undo here: there is no last gameplay change of yours.") } })}<p class="muted">${ctx.t("Annulla ripristina l’ultima modifica di gioco: non termina una singola origine e non resuscita. Chiudere o Esc non tira e non annulla richieste già avviate.", "Undo restores the last gameplay change: it does not end a single origin or revive. Closing or Esc neither rolls nor cancels requests already started.")}</p></div>` : ""}`;
  } catch (error) {
    return `<p role="status">${ctx.esc(message(ctx, error))}</p>`;
  }
}

export function bindConditionsPanel(root, ctx) {
  if (!panel || panel.owner !== ctx.role || !root) return;
  const on = (name, type, fn) =>
    root.querySelectorAll(`[${name}]`).forEach((node) =>
      node.addEventListener(type, (event) => {
        if (!panel || panel.owner !== ctx.role) return;
        if (type === "click") event?.preventDefault?.();
        safe(ctx, () => fn(node, event));
      }),
    );
  const dirty = () => {
    if (panel.review) panel.review.dirty = true;
    root.querySelectorAll("[data-conditions-apply]").forEach((n) => {
      n.disabled = true;
      // SV-37: the reason sits beside the button, linked to it.
      n.setAttribute?.("aria-describedby", "conditions-apply-dirty");
      const note = n.ownerDocument?.getElementById?.("conditions-apply-dirty");
      if (note) note.hidden = false;
      else
        n.insertAdjacentHTML?.(
          "afterend",
          `<p class="conditions-why muted" id="conditions-apply-dirty">${ctx.esc(ctx.t("Scelte cambiate dopo l’anteprima: premi di nuovo Anteprima per rivedere e applicare.", "Choices changed after the preview: press Preview again to review and apply."))}</p>`,
        );
    });
  };
  const overview = () => overviewOf(ctx, panel.actorId);
  const begin = (mode, options) => {
    startMode(ctx, overview(), mode, options);
    redraw(ctx);
  };
  on("data-conditions-command", "click", (n) => {
    if (n.dataset.conditionsCommand === "hp") {
      const actorId = panel.actorId;
      ctx.closeDialog?.();
      return ctx.registry.run(hpCommand(ctx), ctx, { actorId, surface: "sheet" });
    }
    begin(n.dataset.conditionsCommand, {
      from: `[data-conditions-command="${n.dataset.conditionsCommand}"]`,
    });
  });
  on("data-conditions-definition", "click", (n) => {
    const id = n.dataset.conditionsDefinition;
    if (id === "exhaustion") return begin("exhaustion", { from: panel.returnFocus });
    panel.definitionId = id;
    panel.custom = false;
    panel.review = null;
    panel.focus = "[data-conditions-work-title]";
    redraw(ctx);
  });
  on("data-conditions-custom", "click", () => {
    panel.custom = true;
    panel.definitionId = null;
    panel.review = null;
    panel.focus = "[data-conditions-work-title]";
    redraw(ctx);
  });
  on("data-conditions-change-definition", "click", () => {
    panel.custom = false;
    panel.definitionId = null;
    panel.review = null;
    redraw(ctx);
  });
  for (const [name, key, mode] of [
    ["data-conditions-end", "conditionsEnd", "end"],
    ["data-conditions-correct-term", "conditionsCorrectTerm", "correct-term"],
    ["data-conditions-held-items", "conditionsHeldItems", "held-items"],
  ])
    on(name, "click", (n) => {
      const instanceId = n.dataset[key];
      begin(mode, { instanceId, from: `[${name}="${instanceId}"]` });
    });
  on("data-conditions-reconcile", "click", (n) => {
    const mode = n.dataset.conditionsReconcile;
    startMode(ctx, overview(), mode, { from: `[data-conditions-reconcile="${mode}"]` });
    if (mode === "add" && n.dataset.conditionsReconcileDefinition)
      panel.definitionId = n.dataset.conditionsReconcileDefinition;
    redraw(ctx);
  });
  on("data-conditions-held", "change", (n) => {
    const id = n.dataset.conditionsHeld;
    panel.held = panel.held.filter((x) => x !== id);
    if (n.checked) panel.held.push(id);
    panel.heldTouched = true;
    dirty();
  });
  on("data-conditions-field", "input", (n) => {
    if (["checkbox", "radio"].includes(n.type)) return;
    const key = n.dataset.conditionsField;
    panel.fields[key] = n.value;
    if (key === "search") return redraw(ctx);
    if (key.startsWith("term")) panel.termTouched = true;
    dirty();
    // The Exhaustion level updates its effect line and step limits as it is typed.
    if (key === "level") redraw(ctx);
  });
  on("data-conditions-field", "change", (n) => {
    const key = n.dataset.conditionsField;
    if (key === "search") return;
    panel.fields[key] = ["checkbox", "radio"].includes(n.type) ? n.checked : n.value;
    if (key.startsWith("term")) panel.termTouched = true;
    dirty();
    // A text blur fires between pointerdown and click on the next control:
    // keep that control mounted and only rebuild for structural choices.
    if (n.tagName === "SELECT" || ["checkbox", "radio"].includes(n.type)) redraw(ctx);
  });
  on("data-conditions-field", "keydown", (n, event) => {
    if (event.key !== "Enter" || n.tagName !== "INPUT" || n.type === "checkbox") return;
    event.preventDefault();
    if (n.dataset.conditionsField !== "search") preview(ctx);
  });
  on("data-conditions-step", "click", (n) => {
    const level = Math.min(
      6,
      Math.max(0, (num(panel.fields.level) ?? 0) + Number(n.dataset.conditionsStep)),
    );
    panel.fields.level = String(level);
    dirty();
    panel.focus = `[data-conditions-step="${n.dataset.conditionsStep}"]`;
    redraw(ctx);
  });
  on("data-conditions-preview", "click", () => preview(ctx));
  on("data-conditions-apply", "click", () => apply(ctx));
  on("data-conditions-cancel", "click", () => {
    closeWork(ctx);
    redraw(ctx);
  });
  on("data-conditions-death-save", "click", () => vitalRoll(ctx, "death-save"));
  on("data-conditions-stable-recovery", "click", () => vitalRoll(ctx, "stable-recovery"));
  on("data-conditions-open-roll", "click", (n) => openRoll(ctx, n.dataset.conditionsOpenRoll));
  on("data-conditions-history", "click", () => {
    panel.history = !panel.history;
    panel.focus = "[data-conditions-history]";
    redraw(ctx);
  });
  on("data-conditions-details", "toggle", (n) => {
    panel.details[n.dataset.conditionsDetails] = n.open;
  });
  on("data-conditions-rest", "click", () => {
    const actorId = panel.actorId;
    ctx.closeDialog?.();
    ctx.openRest(actorId);
  });
  on("data-conditions-undo", "click", () => {
    closeWork(ctx);
    ctx.undo();
    redraw(ctx);
  });
}

function show(ctx) {
  ctx.dialog(
    ctx.t("Condizioni e stato", "Conditions and status"),
    `<div class="conditions-panel" data-conditions-panel>${renderConditionsPanel(ctx)}</div>`,
    { cancelLabel: ctx.t("Chiudi", "Close"), onSubmit: () => false },
  );
  if (typeof document !== "undefined") {
    const root = document.querySelector("#dialog [data-conditions-panel]");
    bindConditionsPanel(root, ctx);
    // A preselected command focuses its work area title, not the dialog's close button.
    const target = panel?.focus ? root?.querySelector(panel.focus) : null;
    if (panel) panel.focus = null;
    target?.focus?.({ preventScroll: true });
  }
}

// Opens the single contextual dialog; `tab` may preselect a command.
export function openConditions(ctx, { actorId, tab } = {}) {
  panel = initial(ctx, actorId || ctx.view?.id || null);
  if (GLOBAL_MODES.includes(tab))
    try {
      startMode(ctx, overviewOf(ctx, panel.actorId), tab);
    } catch {
      panel.mode = null;
    }
  show(ctx);
}

// ---------------------------------------------------------------- quick controls (PG-27, PG-28)

// A change made from the quick controls on the sheet or the Table: preview first (the same
// rules as the panel), then one commit; the refusal is shown in place of a failed click.
function quickCommit(ctx, actorId, title, type, selection) {
  const s = ctx.state;
  const preview =
    type === "condition"
      ? domain.previewConditionChange(s, actorId, selection, ctx.role)
      : domain.previewVitalityChange(s, actorId, selection, ctx.role);
  if (!preview.canApply) throw Error(message(ctx, preview.errors[0]));
  if (ctx.offline && !preview.commit?.local)
    throw Error(
      ctx.t(
        "Senza rete: riconnettiti per applicare questa modifica condivisa.",
        "Offline: reconnect to apply this shared change.",
      ),
    );
  const options = { operationId: uid(), reviewKey: preview.reviewKey, online: !ctx.offline };
  ctx.commit(
    title,
    (draft) => {
      const result =
        type === "condition"
          ? domain.applyConditionChange(draft, actorId, selection, ctx.role, options)
          : domain.applyVitalityChange(draft, actorId, selection, ctx.role, options);
      ctx.applyConditionFollowUps?.(draft, result);
    },
    preview.commit,
  );
}
const QUICK_SOURCE = {
  kind: "manual",
  edition: "2024",
  revision: "conditions-quick-1",
  title: { it: "Segnato dalla scheda", en: "Marked from the sheet" },
};
function quickTry(ctx, fn) {
  try {
    fn();
  } catch (error) {
    ctx.toast?.(message(ctx, error), true);
  }
}
/**
 * Close review 01/10 (D&D Beyond conditions pane, Foundry status icons: a second click
 * removes it): ends, in one change, every application of a condition this viewer may end.
 * The reason is recorded for it; a correction of the term keeps its own reason in the panel.
 */
export function quickEnd(ctx, actorId, conditionId) {
  const o = overviewOf(ctx, actorId);
  const ids = (o.instances ?? [])
    .filter((i) => i.id === conditionId && i.permissions?.canEnd !== false)
    .map((i) => i.instanceId);
  if (!ids.length)
    throw Error(
      ctx.t(
        "Questa condizione viene da un’origine che non termini da qui: apri «Danni, cure e condizioni».",
        "This condition comes from an origin you do not end here: open “Damage, healing and conditions”.",
      ),
    );
  const reason = ctx.t("Tolta dalla scheda", "Removed from the sheet");
  const selection = (instanceId) => ({ kind: "end", instanceId, reason });
  const first = domain.previewConditionChange(ctx.state, actorId, selection(ids[0]), ctx.role);
  if (!first.canApply) throw Error(message(ctx, first.errors[0]));
  if (ctx.offline && !first.commit?.local)
    throw Error(
      ctx.t(
        "Senza rete: riconnettiti per applicare questa modifica condivisa.",
        "Offline: reconnect to apply this shared change.",
      ),
    );
  ctx.commit(
    ctx.t("Condizione terminata", "Condition ended") +
      ": " +
      name(ctx, definition(conditionId)?.name ?? ""),
    (draft) => {
      for (const instanceId of ids) {
        const preview = domain.previewConditionChange(
          draft,
          actorId,
          selection(instanceId),
          ctx.role,
        );
        if (!preview.canApply) throw Error(message(ctx, preview.errors[0]));
        const result = domain.applyConditionChange(
          draft,
          actorId,
          selection(instanceId),
          ctx.role,
          {
            operationId: uid(),
            reviewKey: preview.reviewKey,
            online: !ctx.offline,
          },
        );
        ctx.applyConditionFollowUps?.(draft, result);
      }
    },
    first.commit,
  );
}
/**
 * Two clicks (D&D Beyond conditions panel): «+ Condizione» (or a condition's chip), then the
 * condition. An active one is pressed: a click on it ends it (close review 01/10).
 */
function openQuickAdd(ctx, actorId) {
  const o = overviewOf(ctx, actorId);
  const active = new Set(o.active.map((g) => g.id));
  const body = `<div class="conditions-quick-add" data-conditions-quick-list="${attr(ctx, actorId)}"><p class="muted">${ctx.t("Un clic applica una condizione fino a rimozione; un clic su una attiva (evidenziata) la toglie. Causa, durata e origine riservata si scelgono in «Danni, cure e condizioni».", "One click applies a condition until removed; one click on an active (highlighted) one removes it. Cause, duration and a private origin are chosen in “Damage, healing and conditions”.")}</p><ul class="conditions-catalog">${CATALOG.filter(
    (d) => d.id !== "exhaustion",
  )
    .map(
      (d) =>
        `<li><button type="button" class="conditions-definition" data-conditions-quick-apply="${attr(ctx, d.id)}" aria-pressed="${active.has(d.id)}" title="${attr(ctx, (d.supported ?? []).map((e) => name(ctx, e)).join(" · "))}"><strong>${ctx.esc(name(ctx, d.name))}</strong><small>${active.has(d.id) ? ctx.t("attiva · clic per toglierla", "active · click to remove") : ctx.esc(ctx.lang === "it" ? d.name.en : d.name.it)}</small></button></li>`,
    )
    .join(
      "",
    )}<li><button type="button" class="conditions-definition" data-conditions-quick-concentration><strong>${ctx.t("Concentrazione…", "Concentration…")}</strong><small>${ctx.t("su un incantesimo", "on a spell")}</small></button></li></ul></div>`;
  ctx.dialog(
    ctx.t(
      `Aggiungi condizione · ${name(ctx, o.actorName)}`,
      `Add condition · ${name(ctx, o.actorName)}`,
    ),
    body,
    {
      cancelLabel: ctx.t("Chiudi", "Close"),
    },
  );
  const root = typeof document !== "undefined" ? document.querySelector("#dialog") : null;
  root?.querySelectorAll?.("[data-conditions-quick-apply]").forEach((n) =>
    n.addEventListener("click", () => {
      const id = n.dataset.conditionsQuickApply;
      quickTry(ctx, () => {
        if (n.getAttribute("aria-pressed") === "true") {
          quickEnd(ctx, actorId, id);
          ctx.closeDialog?.();
          return;
        }
        quickCommit(
          ctx,
          actorId,
          ctx.t("Condizione applicata", "Condition applied") +
            ": " +
            name(ctx, definition(id)?.name ?? ""),
          "condition",
          {
            kind: "apply",
            conditionId: id,
            source: copy(definition(id)?.source ?? null),
            mode: "record",
            term: { kind: "manual" },
            visibility: "shared",
            sourceVisibility: "shared",
          },
        );
        ctx.closeDialog?.();
      });
    }),
  );
  root
    ?.querySelector?.("[data-conditions-quick-concentration]")
    ?.addEventListener("click", () => openConcentration(ctx, actorId));
  root?.querySelector?.("[data-conditions-quick-apply]")?.focus?.();
}
// TV-79 (Fantasy Grounds "(C)" effect, dnd5e Concentration): Concentration recorded by hand
// beside the conditions; damage while concentrating then asks the Constitution save (DC
// max(10, half the damage), SRD 5.2.1 EN 179 / IT 206) through the combat engine.
function concentrationCommit(ctx, actorId, title, mutate) {
  const subject = ctx.state.actors[actorId];
  ctx.commit(
    title,
    (draft) => {
      const actor = draft.actors[actorId];
      if (!actor) throw Error(ctx.t("Creatura non disponibile.", "Creature unavailable."));
      const previous = actor.concentration?.active ? actor.concentration.id : null;
      mutate(actor);
      if (previous && (actor.concentration?.id !== previous || !actor.concentration?.active)) {
        for (const other of Object.values(draft.actors))
          other.combatEffects = (other.combatEffects || []).filter(
            (effect) => effect.concentrationId !== previous,
          );
        observeConcentrationEnd(draft, actorId, previous);
      }
      if (actor.visibility !== "private") refreshConsequences(draft);
    },
    subject?.visibility === "private" ? { local: true, visibility: "private" } : {},
  );
}
function openConcentration(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  const active = actor?.concentration?.active ? actor.concentration : null;
  const spells = SPELLS.filter((spell) => spell.concentration).map((spell) =>
    ctx.label(spell.name),
  );
  const body = `<div class="conditions-concentration"><p class="muted">${ctx.t("Registra un incantesimo già lanciato che richiede concentrazione. Se subisci danni, arriva il tiro salvezza su Costituzione (CD 10 o metà dei danni).", "Record a spell already cast that needs Concentration. If you take damage, the Constitution save arrives (DC 10 or half the damage).")}</p>${active ? `<p class="error">${ctx.esc(ctx.t(`Sostituisce la concentrazione su ${ctx.label(active.name)}.`, `It replaces the Concentration on ${ctx.label(active.name)}.`))}</p>` : ""}<label class="field">${ctx.t("Incantesimo", "Spell")}<input name="name" list="conditions-concentration-spells" maxlength="100" required autocomplete="off" placeholder="${attr(ctx, ctx.t("Benedizione", "Bless"))}"></label><datalist id="conditions-concentration-spells">${spells.map((n) => `<option value="${attr(ctx, n)}"></option>`).join("")}</datalist></div>`;
  ctx.dialog(
    ctx.t(`Concentrazione · ${actor?.name ?? ""}`, `Concentration · ${actor?.name ?? ""}`),
    body,
    {
      submitLabel: active ? ctx.t("Sostituisci", "Replace") : ctx.t("Registra", "Record"),
      cancelLabel: ctx.t("Annulla", "Cancel"),
      onSubmit: (data) => {
        const name = String(data.get("name") ?? "").trim();
        if (!name) {
          ctx.toast?.(ctx.t("Scrivi l’incantesimo.", "Write the spell."), true);
          return false;
        }
        const spell = SPELLS.find(
          (row) => row.concentration && [row.name?.it, row.name?.en].includes(name),
        );
        try {
          concentrationCommit(
            ctx,
            actorId,
            ctx.t(`Concentrazione: ${name}`, `Concentration: ${name}`),
            (a) => {
              a.concentration = {
                id: "conc-" + uid(),
                name: spell ? copy(spell.name) : { it: name, en: name },
                active: true,
                source: spell
                  ? { kind: "spell", spellId: spell.id, revision: "5.2.1" }
                  : {
                      kind: "manual",
                      label: ctx.t("Registrata dalla scheda", "Recorded from the sheet"),
                      revision: uid(),
                    },
              };
            },
          );
        } catch (error) {
          ctx.toast?.(message(ctx, error), true);
          return false;
        }
      },
    },
  );
}
/** Exhaustion 1–6 as segments (D&D Beyond): a click sets that level; the level already set
 *  lowers it by one. Level 6 (death) opens the panel's preview instead of killing at once. */
function setExhaustion(ctx, actorId, level) {
  const o = overviewOf(ctx, actorId);
  const next = level === o.exhaustion ? level - 1 : level;
  if (next >= 6) return openConditions(ctx, { actorId, tab: "exhaustion" });
  quickCommit(
    ctx,
    actorId,
    ctx.t("Indebolimento: livello ", "Exhaustion: level ") + next,
    "condition",
    {
      kind: "exhaustion",
      level: next,
      reason: ctx.t("Segnato con un clic sui livelli", "Marked with one click on the levels"),
      source: copy(definition("exhaustion").source),
    },
  );
}
/** «Tira il TS contro la morte» from the HP box: the pending request, or a new one. */
function deathSaveFrom(ctx, actorId) {
  const pending = pendingRolls(ctx, actorId).find((r) => r.kind === "death-save");
  const back = { returnTo: undefined };
  if (pending) return ctx.openConditionRoll?.(pending.descriptorId, back);
  const o = overviewOf(ctx, actorId);
  if (!o.permissions.canRequestDeathSave)
    throw Error(
      ctx.t(
        "In combattimento il tiro contro la morte arriva all’inizio del suo turno.",
        "In combat the death save arrives at the start of its turn.",
      ),
    );
  const started = ctx.beginConditionRoll?.({ kind: "death-save", actorId });
  if (started?.descriptorId) ctx.openConditionRoll?.(started.descriptorId, back);
}
/** «Riporta a 1 PF» (Roll20 Restore 1 HP): healing of 1, which ends Dying. */
function restoreOne(ctx, actorId) {
  quickCommit(ctx, actorId, ctx.t("Riportato a 1 PF", "Restored to 1 HP"), "vitality", {
    kind: "heal",
    amount: 1,
    reason: ctx.t("Riporta a 1 PF dalla scheda", "Restore 1 HP from the sheet"),
    source: copy(QUICK_SOURCE),
  });
}
// The magic that returns a dead creature to life (SRD 5.2.1 spells; pages EN / IT).
const REVIVE = [
  ["revivify", { it: "Rinascita", en: "Revivify" }, "EN 159 / IT 181"],
  ["raise-dead", { it: "Rianimare morti", en: "Raise Dead" }, "EN 157 / IT 180"],
  ["other", { it: "Altra magia o decisione del DM", en: "Other magic or the DM's call" }, ""],
];
/** «Riporta in vita…»: a Dead creature returns with 1 HP, naming the magic (logged). */
function openRevive(ctx, actorId) {
  const o = overviewOf(ctx, actorId);
  const body = `<div class="conditions-revive"><p>${ctx.t(`${name(ctx, o.actorName)} è morto. Riportalo in vita con 1 PF: i tiri contro la morte ripartono da zero.`, `${name(ctx, o.actorName)} is dead. Return them to life with 1 HP: death saves start again from zero.`)}</p><label class="field">${ctx.t("Con quale magia", "With which magic")}<select name="magic">${REVIVE.map(([id, label, pages]) => `<option value="${id}">${ctx.esc(name(ctx, label))}${pages ? ` (SRD 5.2.1 ${pages})` : ""}</option>`).join("")}</select></label><label class="field">${ctx.t("Nota (obbligatoria per «Altra»)", "Note (required for “Other”)")}<input name="note" maxlength="200" autocomplete="off"></label><p class="muted">${ctx.t("Rianimare morti lascia −4 alle prove con d20, che cala di 1 a ogni riposo lungo: segnalo come effetto.", "Raise Dead leaves −4 to D20 Tests, easing by 1 with each Long Rest: record it as an effect.")}</p></div>`;
  ctx.dialog(
    ctx.t(
      `Riporta in vita · ${name(ctx, o.actorName)}`,
      `Return to life · ${name(ctx, o.actorName)}`,
    ),
    body,
    {
      submitLabel: ctx.t("Riporta in vita", "Return to life"),
      cancelLabel: ctx.t("Annulla", "Cancel"),
      onSubmit: (data) => {
        const magic = REVIVE.find(([id]) => id === data.get("magic")) ?? REVIVE[0];
        const note = String(data.get("note") ?? "").trim();
        if (magic[0] === "other" && !note) {
          ctx.toast?.(
            ctx.t("Scrivi quale magia o decisione.", "Write which magic or decision."),
            true,
          );
          return false;
        }
        const reason = [name(ctx, magic[1]), magic[2] ? `SRD 5.2.1 ${magic[2]}` : "", note]
          .filter(Boolean)
          .join(" · ");
        try {
          const s = ctx.state;
          const correction = {
            kind: "correct",
            patch: { dead: false, successes: 0, failures: 0, stable: false },
            reason,
            source: copy(QUICK_SOURCE),
          };
          const first = domain.previewVitalityChange(s, actorId, correction, ctx.role);
          if (!first.canApply) throw Error(message(ctx, first.errors[0]));
          ctx.commit(
            ctx.t(
              `Riportato in vita: ${name(ctx, o.actorName)}`,
              `Returned to life: ${name(ctx, o.actorName)}`,
            ),
            (draft) => {
              const opts = (key) => ({ operationId: uid(), reviewKey: key, online: !ctx.offline });
              const a = domain.applyVitalityChange(
                draft,
                actorId,
                correction,
                ctx.role,
                opts(first.reviewKey),
              );
              ctx.applyConditionFollowUps?.(draft, a);
              const heal = {
                kind: "heal",
                amount: 1,
                reason,
                source: copy(QUICK_SOURCE),
              };
              const second = domain.previewVitalityChange(draft, actorId, heal, ctx.role);
              if (!second.canApply) throw Error(message(ctx, second.errors[0]));
              const b = domain.applyVitalityChange(
                draft,
                actorId,
                heal,
                ctx.role,
                opts(second.reviewKey),
              );
              ctx.applyConditionFollowUps?.(draft, b);
            },
            first.commit,
          );
        } catch (error) {
          ctx.toast?.(message(ctx, error), true);
          return false;
        }
      },
    },
  );
}
// The HP box turned death-save box (D&D Beyond; Roll20 Stabilize / Restore 1 HP): pips,
// the roll, Stabilize, «Riporta a 1 PF»; Dead is an explicit state with a way back.
function deathBoxHTML(ctx, o) {
  const control = o.permissions.canControl;
  const id = attr(ctx, o.actorId);
  if (o.dead)
    return `<div class="conditions-deathbox is-dead" role="group" aria-label="${attr(ctx, ctx.t("Stato vitale: morto", "Vital state: dead"))}" data-conditions-deathbox="dead"><p class="conditions-dead-state"><strong>${ctx.t("Morto", "Dead")}</strong></p>${control ? button(ctx, `data-conditions-revive="${id}" aria-haspopup="dialog"`, ctx.t("Riporta in vita…", "Return to life…")) : ""}</div>`;
  if (o.policy?.zeroHp !== "death-saves" || o.hp !== 0) return "";
  const ds = o.deathSaves;
  const pending = pendingRolls(ctx, o.actorId).some((r) => r.kind === "death-save");
  const canRoll =
    control && o.vitality === "dying" && (pending || o.permissions.canRequestDeathSave);
  const waiting = control && o.vitality === "dying" && !canRoll;
  const pip = (n, kind, label) =>
    `<span class="conditions-pips" role="img" aria-label="${attr(ctx, `${label} ${n}/3`)}">${[0, 1, 2].map((i) => `<span class="conditions-pip ${kind}${i < n ? " filled" : ""}"></span>`).join("")}</span>`;
  return `<div class="conditions-deathbox" role="group" aria-label="${attr(ctx, ctx.t("Tiri salvezza contro la morte", "Death saving throws"))}" data-conditions-deathbox="${o.vitality}"><p class="conditions-deathbox-title"><strong>${ctx.t("Tiri contro la morte", "Death saves")}</strong>${ds.stable ? ` <span class="badge">${ctx.t("Stabile", "Stable")}</span>` : ""}</p><div class="conditions-deathbox-pips"><span>${ctx.t("Successi", "Successes")}</span>${pip(ds.successes, "success", ctx.t("Successi", "Successes"))}<span>${ctx.t("Fallimenti", "Failures")}</span>${pip(ds.failures, "failure", ctx.t("Fallimenti", "Failures"))}</div>${
    control
      ? `<div class="conditions-deathbox-actions">${canRoll ? button(ctx, `data-conditions-death-roll="${id}"`, pending ? ctx.t("Tira il TS contro la morte (in attesa)", "Roll the death save (pending)") : ctx.t("Tira il TS contro la morte", "Roll the death save"), { kind: "primary", disabled: !pending && offlineShared(ctx, o), why: { id: `conditions-deathbox-offline-${attr(ctx, id)}`, text: ctx.t("Senza rete: riconnettiti per registrare questo tiro condiviso.", "Offline: reconnect to record this shared roll.") } }) : ""}${o.vitality === "dying" ? button(ctx, `data-conditions-stabilize="${id}"`, ctx.t("Stabilizza…", "Stabilize…")) : ""}${button(ctx, `data-conditions-restore="${id}"`, ctx.t("Riporta a 1 PF", "Restore 1 HP"), { disabled: !o.permissions.canHeal, why: { id: `conditions-restore-why-${attr(ctx, id)}`, text: o.dead ? ctx.t("Una creatura morta non recupera PF finché la magia non la riporta in vita.", "A dead creature regains no HP until magic returns it to life.") : ctx.t("PF attuali o massimi non registrati: correggili prima di curare.", "Current or maximum HP not recorded: correct them before healing.") } })}</div>${waiting ? `<p class="muted">${ctx.t("In combattimento il tiro arriva all’inizio del suo turno.", "In combat the roll arrives at the start of its turn.")}</p>` : ""}`
      : ""
  }</div>`;
}
function quickHTML(ctx, o) {
  if (!o.permissions.canControl) return "";
  const id = attr(ctx, o.actorId);
  const segments = [1, 2, 3, 4, 5, 6]
    .map(
      (n) =>
        `<button type="button" class="conditions-segment${n <= o.exhaustion ? " filled" : ""}" data-conditions-exhaustion-level="${n}" data-conditions-exhaustion-actor="${id}" aria-pressed="${n === o.exhaustion}" aria-label="${attr(ctx, ctx.t(`Indebolimento livello ${n}${n === o.exhaustion ? " (attuale: clic per scendere)" : ""}`, `Exhaustion level ${n}${n === o.exhaustion ? " (current: click to lower)" : ""}`))}" title="${attr(ctx, exhaustionEffect(ctx, n))}">${n}</button>`,
    )
    .join("");
  return `<div class="conditions-quick"><button type="button" class="button quiet conditions-quick-add" data-conditions-quick-add="${id}" aria-haspopup="dialog">+ ${ctx.t("Condizione", "Condition")}</button><div class="conditions-exhaustion" role="group" aria-label="${attr(ctx, ctx.t("Indebolimento", "Exhaustion"))}"><span class="conditions-exhaustion-label">${ctx.t("Indebolimento", "Exhaustion")}</span><span class="conditions-segments">${segments}</span></div>${o.exhaustion > 0 ? `<p class="conditions-effect muted">${ctx.esc(exhaustionEffect(ctx, o.exhaustion))}</p>` : ""}</div>`;
}

// `embedded` renders inside the sheet's HP card (the single entry, as in D&D Beyond's HP
// box): no repeated name or HP, only vital state, the death-save box at 0 HP, chips with a
// quick add, Exhaustion segments and the panel.
/** Concentration is read by whoever reads the sheet (its HP and conditions). */
const canSeeConcentration = (ctx, actorId) => {
  try {
    return domain.canReadVitals(ctx.state, ctx.state.actors[actorId], ctx.role);
  } catch {
    return false;
  }
};
export function renderConditionsSummary(ctx, actorId, { embedded = false } = {}) {
  let o;
  try {
    o = overviewOf(ctx, actorId);
  } catch {
    return "";
  }
  // Close review 01/10 (D&D Beyond: a condition is clicked to manage it): a controller's chip
  // opens the same two-click list, where the active condition is ended with one click.
  const manage = o.permissions.canControl;
  const chips = o.active.map((g) => {
    const text = `${ctx.esc(name(ctx, g.name))}${g.id === "exhaustion" ? `<span class="conditions-count"> ${g.level}</span>` : g.count > 1 ? `<span class="conditions-count"> ×${g.count}</span>` : ""}`;
    return `<li class="conditions-chip" data-conditions-chip="${attr(ctx, g.id)}">${
      manage && g.id !== "exhaustion"
        ? `<button type="button" class="conditions-chip-manage" data-conditions-chip-manage="${attr(ctx, actorId)}" aria-haspopup="dialog" title="${attr(ctx, ctx.t("Gestisci o togli la condizione", "Manage or remove the condition"))}" aria-label="${attr(ctx, `${name(ctx, g.name)}: ${ctx.t("gestisci o togli", "manage or remove")}`)}">${text}</button>`
        : text
    }</li>`;
  });
  const deathBox = deathBoxHTML(ctx, o);
  const concentrating = ctx.state.actors[actorId]?.concentration;
  if (concentrating?.active && canSeeConcentration(ctx, actorId))
    chips.unshift(
      `<li class="conditions-chip is-concentration" data-conditions-chip="concentration" title="${attr(ctx, ctx.t("Concentrazione", "Concentration"))}">(C) ${ctx.esc(ctx.label(concentrating.name ?? ""))}${o.permissions.canControl ? ` <button type="button" class="conditions-chip-end" data-conditions-end-concentration="${attr(ctx, actorId)}" aria-label="${attr(ctx, ctx.t(`Termina la concentrazione su ${ctx.label(concentrating.name ?? "")}`, `End Concentration on ${ctx.label(concentrating.name ?? "")}`))}">×</button>` : ""}</li>`,
    );
  const pending =
    o.permissions.canControl &&
    pendingRolls(ctx, actorId).filter((r) => r.kind !== "death-save").length;
  const label = ctx.t("Condizioni e stato", "Conditions and status");
  const entry = ctx.t("Danni, cure e condizioni", "Damage, healing and conditions");
  const chipList = chips.length
    ? `<ul class="conditions-chips" aria-label="${attr(ctx, ctx.t("Condizioni attive", "Active conditions"))}">${chips.join("")}</ul>`
    : `<p class="muted">${ctx.t("Nessuna condizione", "No conditions")}</p>`;
  const pendingLine = pending
    ? `<p class="conditions-summary-pending">${ctx.t("Tiro in attesa", "Roll pending")}</p>`
    : "";
  if (embedded)
    return `<div class="conditions-summary embedded" data-conditions-summary="${attr(ctx, actorId)}"><span class="conditions-vital" data-vital="${attr(ctx, o.vitality)}">${ctx.esc(vitalText(ctx, o))}</span>${deathBox}${chipList}${quickHTML(ctx, o)}${pendingLine}<button type="button" class="button" data-conditions-entry="${attr(ctx, actorId)}">${ctx.esc(entry)}</button></div>`;
  return `<section class="conditions-summary" data-conditions-summary="${attr(ctx, actorId)}" aria-label="${attr(ctx, `${label}: ${name(ctx, o.actorName)}`)}"><div class="conditions-summary-head"><strong>${ctx.esc(name(ctx, o.actorName))}</strong><span class="conditions-vital" data-vital="${attr(ctx, o.vitality)}">${ctx.esc(vitalText(ctx, o))}</span></div><p class="conditions-summary-hp"><span>${ctx.t("PF", "HP")}</span> <strong>${o.hp ?? "?"}</strong> / <span>${o.maxHp ?? "?"}</span>${o.tempHp ? ` · <span class="conditions-temp">${ctx.t("PF temporanei", "Temporary HP")} <strong>${o.tempHp}</strong></span>` : ""}</p>${deathBox}${chipList}${quickHTML(ctx, o)}${pendingLine}<button type="button" class="button" data-conditions-entry="${attr(ctx, actorId)}">${ctx.esc(label)}</button></section>`;
}

export function bindConditionsSummary(root, ctx) {
  const on = (selector, fn) =>
    root?.querySelectorAll(`[${selector}]`).forEach((n) =>
      n.addEventListener("click", (event) => {
        event?.preventDefault?.();
        quickTry(ctx, () => fn(n));
      }),
    );
  on("data-conditions-entry", (n) =>
    openConditions(ctx, { actorId: n.dataset.conditionsEntry, tab: n.dataset.conditionsTab }),
  );
  on("data-conditions-quick-add", (n) => openQuickAdd(ctx, n.dataset.conditionsQuickAdd));
  on("data-conditions-chip-manage", (n) => openQuickAdd(ctx, n.dataset.conditionsChipManage));
  on("data-conditions-exhaustion-level", (n) =>
    setExhaustion(
      ctx,
      n.dataset.conditionsExhaustionActor,
      Number(n.dataset.conditionsExhaustionLevel),
    ),
  );
  on("data-conditions-death-roll", (n) => deathSaveFrom(ctx, n.dataset.conditionsDeathRoll));
  on("data-conditions-stabilize", (n) =>
    openConditions(ctx, { actorId: n.dataset.conditionsStabilize, tab: "aid" }),
  );
  on("data-conditions-restore", (n) => restoreOne(ctx, n.dataset.conditionsRestore));
  on("data-conditions-revive", (n) => openRevive(ctx, n.dataset.conditionsRevive));
  on("data-conditions-end-concentration", (n) => {
    const id = n.dataset.conditionsEndConcentration;
    concentrationCommit(ctx, id, ctx.t("Concentrazione terminata", "Concentration ended"), (a) => {
      a.concentration = null;
    });
  });
}

export function refreshConditionsUI(ctx) {
  if (!panel) return false;
  const hasDocument = typeof document !== "undefined";
  const root = hasDocument ? document.querySelector("#dialog[open] [data-conditions-panel]") : null;
  if (panel.owner !== ctx.role) {
    // Role changes never reuse another identity's inputs or cached preview.
    panel = null;
    if (root) ctx.closeDialog?.();
    return false;
  }
  if (!root) return false;
  root.querySelectorAll("[data-conditions-details]").forEach((n) => {
    panel.details[n.dataset.conditionsDetails] = n.open;
  });
  const active = document.activeElement,
    focused = root.contains(active);
  const attrs = focused
    ? [...active.attributes].filter((a) => a.name.startsWith("data-")).map((a) => [a.name, a.value])
    : [];
  const range =
    focused && typeof active.selectionStart === "number" && active.type !== "number"
      ? [active.selectionStart, active.selectionEnd]
      : null;
  const dialog = root.closest("dialog"),
    body = root.closest(".dialog-body"),
    top = dialog?.scrollTop,
    bodyTop = body?.scrollTop;
  root.innerHTML = renderConditionsPanel(ctx);
  bindConditionsPanel(root, ctx);
  if (dialog) dialog.scrollTop = top;
  if (body) body.scrollTop = bodyTop;
  const target = panel?.focus ? root.querySelector(panel.focus) : null;
  if (panel) panel.focus = null;
  if (target) {
    target.focus({ preventScroll: true });
    target.scrollIntoView?.({ block: "nearest" });
  } else if (attrs.length) {
    const node = [...root.querySelectorAll(`[${attrs[0][0]}]`)].find((n) =>
      attrs.every(([key, value]) => n.getAttribute(key) === value),
    );
    node?.focus({ preventScroll: true });
    if (range && node?.setSelectionRange) node.setSelectionRange(...range);
  }
  return true;
}

export function resetConditionsUI() {
  panel = null;
}
