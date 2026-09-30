import * as forms from "./forms-companions.mjs";
import { placeAtChosenPoint } from "./companion-map.mjs";
import { runsSession } from "./table-spatial.mjs";

let panel = null;
const uid = () => crypto.randomUUID();
const copy = (v) => structuredClone(v);
const number = (v) => (String(v ?? "").trim() === "" ? null : Number(v));
const label = (ctx, v) => ctx.label(v);
const message = (ctx, error) => error?.[ctx.lang] || error?.message || String(error ?? "");
function val(ctx, v) {
  if (v == null) return ctx.t("Non registrato", "Not recorded");
  if (typeof v === "boolean") return v ? ctx.t("Sì", "Yes") : ctx.t("No", "No");
  if (typeof v === "number")
    return v.toLocaleString(ctx.lang === "it" ? "it-IT" : "en-GB", { maximumFractionDigits: 2 });
  if (Array.isArray(v))
    return v.length ? v.map((x) => val(ctx, x)).join(" · ") : ctx.t("Nessuno", "None");
  if (typeof v === "object") {
    if (v.it || v.en) return label(ctx, v);
    if (v.name) return label(ctx, v.name);
    return Object.entries(v)
      .filter(([k]) => !["id", "source"].includes(k))
      .map(([k, x]) => `${fieldName(ctx, k)}: ${val(ctx, x)}`)
      .join(" · ");
  }
  return (
    {
      tiny: ctx.t("Minuscola", "Tiny"),
      small: ctx.t("Piccola", "Small"),
      medium: ctx.t("Media", "Medium"),
      large: ctx.t("Grande", "Large"),
      merge: ctx.t("Fuso", "Merged"),
      drop: ctx.t("A terra", "Dropped"),
      wear: ctx.t("Indossato", "Worn"),
    }[v] || String(v)
  );
}
// SV-37 (Roll20 errors that name the fix): a disabled button carries its reason, one sentence
// «cause: remedy» right after it, linked by aria-describedby.
let whyCount = 0;
const button = (ctx, attr, it, en, disabled = false, primary = false, why = null) => {
  const id = disabled && why ? `forms-why-${++whyCount}` : "";
  return `<button type="button" class="button${primary ? " primary" : ""}" ${attr}${disabled ? ` disabled${id ? ` aria-describedby="${id}"` : ""}` : ""}>${ctx.esc(ctx.t(it, en))}</button>${id ? `<small class="forms-why" id="${id}">${ctx.esc(typeof why === "string" ? why : ctx.t(why[0], why[1]))}</small>` : ""}`;
};
const OFFLINE = [
  "Sei senza rete: riconnettiti per applicarlo.",
  "You are offline: reconnect to apply it.",
];
const field = (ctx, title, html) =>
  `<label class="field"><span>${ctx.esc(title)}</span>${html}</label>`;
const input = (ctx, key, value, extra = "") =>
  `<input data-forms-field="${ctx.esc(key)}" value="${ctx.esc(value ?? "")}" ${extra}>`;
const select = (ctx, attr, value, items) =>
  `<select ${attr}>${items.map(([id, text]) => `<option value="${ctx.esc(id)}"${String(id) === String(value) ? " selected" : ""}>${ctx.esc(text)}</option>`).join("")}</select>`;
const choose = (ctx, key, value, items) =>
  select(ctx, `data-forms-field="${ctx.esc(key)}"`, value, items);
const check = (ctx, key, checked, text) =>
  `<label class="forms-check"><input type="checkbox" data-forms-field="${ctx.esc(key)}"${checked ? " checked" : ""}>${ctx.esc(text)}</label>`;
const issues = (ctx, list = []) =>
  list.length ? `<ul>${list.map((x) => `<li>${ctx.esc(message(ctx, x))}</li>`).join("")}</ul>` : "";
function initial(ctx, actorId, tab) {
  return {
    owner: ctx.role,
    actorId,
    tab: tab || "forms",
    companionId: null,
    castingId: null,
    profileId: "",
    search: "",
    filter: "known",
    fields: {
      name: "",
      creatureType: "fey",
      cost: "wild-shape",
      spellMode: "slot",
      slotLevel: "1",
      materialValue: "10",
      materialQuantity: "1",
      manualReason: ctx.t(
        "Registrazione manuale di una creatura esistente",
        "Manual record of an existing creature",
      ),
      timeMinutes: "10",
      timeReason: ctx.t("Proseguimento dell’attività", "Continuing the activity"),
    },
    equipment: {},
    controllers: null,
    known: null,
    knownMode: null,
    appearance: null,
    generation: 0,
    review: null,
    error: "",
    details: {},
  };
}
/** PG-77: Wild Shape shows only for a sheet that has it (a form, its uses or a profile). */
const hasWildShape = (o) =>
  Boolean(o && (o.activeForm || o.wildShapeResource || o.permissions?.canTransform));
function overview(ctx) {
  return forms.getFormsOverview(ctx.state, panel.actorId, ctx.role);
}
function tryOverview(ctx) {
  try {
    return panel.actorId ? overview(ctx) : null;
  } catch {
    return null;
  }
}
function sourceHTML(ctx, source) {
  if (!source) return `<small>${ctx.t("Fonte non registrata", "Source not recorded")}</small>`;
  const localized = source[ctx.lang] || source.en || source.it;
  const title = [
    source.kind === "srd"
      ? `SRD ${source.edition || ""}`
      : label(ctx, source.title || source.label || ctx.t("Regola dichiarata", "Authored rule")),
    source.revision,
    localized?.pages?.length ? `p. ${localized.pages.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const url = localized?.url || source.url;
  return `<small>${/^https:\/\//.test(url || "") ? `<a href="${ctx.esc(url)}" target="_blank" rel="noopener noreferrer">${ctx.esc(title)}</a>` : ctx.esc(title)}</small>`;
}
function fieldName(ctx, key) {
  return (
    {
      hp: ctx.t("PF", "HP"),
      maxHp: ctx.t("PF massimi", "Maximum HP"),
      tempHp: ctx.t("PF temporanei", "Temporary HP"),
      ac: ctx.t("CA", "AC"),
      speed: ctx.t("Velocità", "Speed"),
      movement: ctx.t("Movimento residuo", "Remaining movement"),
      size: ctx.t("Taglia", "Size"),
      abilities: ctx.t("Caratteristiche", "Abilities"),
      savingThrows: ctx.t("Tiri salvezza", "Saving throws"),
      skills: ctx.t("Abilità", "Skills"),
      hitDice: ctx.t("Dadi Vita", "Hit Dice"),
      slots: ctx.t("Slot", "Slots"),
      conditions: ctx.t("Condizioni", "Conditions"),
      concentration: ctx.t("Concentrazione", "Concentration"),
      equipment: ctx.t("Equipaggiamento", "Equipment"),
      activeForm: ctx.t("Forma attiva", "Active form"),
      knownForms: ctx.t("Forme note", "Known forms"),
      form: ctx.t("Forma", "Form"),
      skillModifiers: ctx.t("Abilità", "Skills"),
      str: ctx.t("FOR", "STR"),
      dex: ctx.t("DES", "DEX"),
      con: ctx.t("COS", "CON"),
      int: ctx.t("INT", "INT"),
      wis: ctx.t("SAG", "WIS"),
      cha: ctx.t("CAR", "CHA"),
      senses: ctx.t("Sensi", "Senses"),
      darkvisionMeters: ctx.t("Scurovisione (m)", "Darkvision (m)"),
      passivePerception: ctx.t("Percezione passiva", "Passive Perception"),
      perception: ctx.t("Percezione", "Perception"),
      stealth: ctx.t("Furtività", "Stealth"),
      walk: ctx.t("Camminare", "Walking"),
      climb: ctx.t("Scalare", "Climbing"),
      fly: ctx.t("Volare", "Flying"),
      swim: ctx.t("Nuotare", "Swimming"),
      name: ctx.t("Nome", "Name"),
      lifecycle: ctx.t("Stato", "Status"),
      controllers: ctx.t("Controllori", "Controllers"),
    }[key] || ctx.t("Dato del profilo", "Profile value")
  );
}
function redraw(ctx) {
  if (!refreshFormsUI(ctx)) ctx.render();
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
function mutate(ctx, title, callback, commitOptions) {
  let result;
  const outcome = ctx.commit(
    title,
    (state) => {
      result = callback(state);
    },
    commitOptions,
  );
  if (outcome?.applied === false)
    throw Error(ctx.t("La modifica non è stata applicata.", "The change was not applied."));
  panel.error = "";
  return result;
}
function options(ctx, request) {
  return {
    operationId: request.operationId,
    reviewKey: request.preview?.reviewKey,
    online: !ctx.offline,
  };
}
function preview(ctx, type, target, selection) {
  const request = { type, target, selection: copy(selection), operationId: uid(), dirty: false };
  request.preview = queryPreview(ctx, request);
  panel.review = request;
  panel.error = "";
  redraw(ctx);
  if (typeof document !== "undefined") {
    const title = document.querySelector("#dialog [data-forms-review]");
    title?.focus({ preventScroll: true });
    title?.scrollIntoView({ block: "start" });
  }
}
function placeAtAppearance(ctx, state, out, r) {
  const app = r.selection?.appearance ?? r.preview?.selection?.appearance ?? null;
  const placed = placeAtChosenPoint(state, out?.actorId ?? out?.resultActorId, app, ctx.role, {
    online: !ctx.offline,
  });
  return placed?.error ? { error: label(ctx, placed.error) } : placed;
}
function queryPreview(ctx, r) {
  const fn = {
    wild: "previewWildShape",
    return: "previewFormReturn",
    known: "previewKnownForms",
    create: "previewCompanionCreation",
    command: "previewCompanionCommand",
    familiar: "previewFamiliarCasting",
    completion: "previewFamiliarCompletion",
    correction: "previewFormCorrection",
  }[r.type];
  return forms[fn](ctx.state, r.target, r.selection, ctx.role);
}
function apply(ctx) {
  const r = panel.review;
  if (!r || r.dirty || queryPreview(ctx, r).reviewKey !== r.preview.reviewKey)
    throw Error(ctx.t("Rivedi l’anteprima aggiornata.", "Review the updated preview."));
  const fn = {
    wild: "applyWildShape",
    return: "returnToNormalForm",
    known: "setKnownForms",
    create: "createCompanion",
    command: "applyCompanionCommand",
    familiar: "startFamiliarCasting",
    completion: "completeFamiliarCasting",
    correction: "applyFormCorrection",
  }[r.type];
  let placed = null;
  const result = mutate(
    ctx,
    ctx.t("Forma o creatura aggiornata", "Form or creature updated"),
    (state) => {
      const out = forms[fn](state, r.target, r.selection, ctx.role, options(ctx, r));
      // PG-78 (dnd5e Summon): the point chosen while creating is kept: the token appears
      // there in the same change, instead of waiting for «Posiziona pedina».
      if (["create", "completion"].includes(r.type)) placed = placeAtAppearance(ctx, state, out, r);
      return out;
    },
    r.preview.commit,
  );
  if (placed?.error) ctx.toast(placed.error, true);
  // PG-77: one flow, one message (BG3): the use spent and the form taken, or the return.
  if (r.type === "wild" || r.type === "return") {
    const o = tryOverview(ctx);
    const who = o ? label(ctx, o.actorName) : "";
    ctx.toast(
      r.type === "wild"
        ? `${who}: ${label(ctx, o?.activeForm?.profile?.name) || ctx.t("forma assunta", "form taken")}${o?.wildShapeResource ? ` · ${ctx.t("Forma Selvatica", "Wild Shape")} ${val(ctx, o.wildShapeResource.used)}/${val(ctx, o.wildShapeResource.max)} ${ctx.t("usi spesi", "uses spent")}` : ""}`
        : `${who}: ${ctx.t("di nuovo nella forma originale", "back in the original form")}`,
    );
  }
  panel.review = null;
  panel.appearance = null;
  if (r.type === "create" || r.type === "completion") {
    panel.tab = "companions";
    panel.castingId = null;
  }
  if (r.type === "familiar") {
    panel.tab = "casting";
    panel.castingId = result.castingId || result.id;
  }
  redraw(ctx);
}
function previewHTML(ctx) {
  const r = panel.review;
  if (!r)
    return `<aside class="forms-preview"><h3>${ctx.t("Prima di applicare", "Before applying")}</h3><p>${ctx.t("Controlla fonte, costi, dati conservati e conseguenze. Selezionare o chiudere non consuma risorse.", "Review the source, costs, retained data and consequences. Selecting or closing does not spend resources.")}</p></aside>`;
  const p = queryPreview(ctx, r),
    stale = r.dirty || p.reviewKey !== r.preview.reviewKey;
  const titles = {
    wild: ctx.t("Assumi forma", "Take form"),
    return: ctx.t("Ritorno alla forma originale", "Return to original form"),
    known: ctx.t("Forme note", "Known forms"),
    create: ctx.t("Creatura collegata", "Linked creature"),
    command: ctx.t("Aggiornamento della creatura", "Creature update"),
    familiar: ctx.t("Avvio del lancio", "Start casting"),
    completion: ctx.t("Completa il lancio", "Complete casting"),
    correction: ctx.t("Correzione della forma", "Form correction"),
  };
  return `<aside class="forms-preview" aria-live="polite"><h3 tabindex="-1" data-forms-review>${titles[r.type]}</h3>${p.actorName ? `<p><strong>${ctx.esc(label(ctx, p.actorName))}</strong></p>` : ""}${sourceHTML(ctx, p.source)}${selectionHTML(ctx, r, p)}${(p.costs || []).length ? `<h4>${ctx.t("Costi", "Costs")}</h4>${p.costs.map((cost) => `<div class="forms-cost"><strong>${ctx.esc(label(ctx, cost.label) || fieldName(ctx, cost.kind))}</strong><p class="forms-values">${ctx.t("Disponibili", "Available")}: ${ctx.esc(val(ctx, cost.before))} → ${ctx.esc(val(ctx, cost.after))} · ${ctx.t("quantità", "amount")} ${ctx.esc(cost.amount)}</p><p>${["complete", "completion"].includes(cost.phase) ? ctx.t("Al completamento", "At completion") : ctx.t("Alla conferma di questa fase", "On confirming this phase")}</p>${sourceHTML(ctx, cost.source)}</div>`).join("")}` : `<p>${ctx.t("Nessun costo di risorsa dichiarato per questa operazione.", "No resource cost is declared for this operation.")}</p>`}${(p.changes || []).map((row) => `<div class="forms-row"><strong>${ctx.esc(label(ctx, row.label) || fieldName(ctx, row.field))}</strong><p class="forms-values">${ctx.esc(val(ctx, row.before))} → ${ctx.esc(val(ctx, row.after))}</p>${sourceHTML(ctx, row.source)}</div>`).join("")}${p.retained?.length ? `<p><strong>${ctx.t("Conservati", "Retained")}</strong>: ${p.retained.map((key) => ctx.esc(fieldName(ctx, key))).join(", ")}.</p>` : ""}${issues(ctx, p.proposed?.formLimitations)}${issues(ctx, p.errors)}${issues(ctx, p.warnings)}${stale ? `<p class="forms-notice">${ctx.t("Scelte o dati cambiati: ripeti l’anteprima prima di applicare.", "Choices or data changed: preview again before applying.")}</p>` : ""}<div class="forms-toolbar">${button(ctx, "data-forms-apply", "Applica", "Apply", !p.canApply || stale || (ctx.offline && !p.commit.local), true, stale ? ["Scelte o dati cambiati: premi di nuovo l’anteprima.", "Choices or data changed: preview again."] : !p.canApply ? message(ctx, p.errors[0]) || ctx.t("Anteprima non applicabile: correggi le scelte.", "Preview cannot apply: correct the choices.") : OFFLINE)}${button(ctx, "data-forms-cancel-preview", "Annulla anteprima", "Cancel preview")}</div></aside>`;
}
function selectionHTML(ctx, r, p) {
  const sel = r.selection;
  const row = (name, value) => `<p><strong>${ctx.esc(name)}</strong>: ${ctx.esc(value)}</p>`;
  const o = tryOverview(ctx);
  const profile =
    sel.profileId && o
      ? forms
          .listCreatureProfiles(ctx.state, o.actorId, ctx.role, {
            purpose: r.type === "wild" ? "wild-shape" : "manual",
          })
          .find((x) => x.id === sel.profileId)
      : null;
  let html = sel.name ? row(ctx.t("Nome", "Name"), sel.name) : "";
  if (profile && r.type !== "wild")
    html +=
      row(ctx.t("Profilo acquisito", "Acquired profile"), label(ctx, profile.name)) +
      sourceHTML(ctx, profile.source);
  if (r.type === "wild")
    html += `<p>${ctx.t("Azione bonus in iniziativa. PF, risorse e dati mentali rimangono quelli del personaggio.", "Bonus Action in initiative. HP, resources and mental data remain the character’s live values.")}</p>${sel.equipment
      .map((choice) => {
        const item = o?.equipment.find((i) => i.id === choice.itemId);
        return item ? row(label(ctx, item.name), val(ctx, choice.disposition)) : "";
      })
      .join("")}`;
  if (r.type === "wild" && p.tempHp)
    html +=
      row(
        ctx.t("PF temporanei", "Temporary HP"),
        `${val(ctx, p.tempHp.before)} → ${val(ctx, p.tempHp.after)} · ${ctx.t("offerti dalla forma", "offered by the form")}: ${val(ctx, p.tempHp.offered)}`,
      ) + row(ctx.t("Durata massima", "Maximum duration"), duration(ctx, p.durationSeconds));
  if (r.type === "familiar")
    html +=
      row(ctx.t("Durata richiesta", "Required duration"), duration(ctx, p.requiredSeconds)) +
      `<p>${ctx.t("Avvia la concentrazione; non crea ancora la creatura. Materiali consumati alla conclusione: fase dichiarata dal prototipo.", "Starts Concentration; does not create the creature yet. Material is consumed at completion: the prototype’s declared timing.")}</p>`;
  if (r.type === "create")
    html += `<p>${sel.mode === "manual" ? ctx.t("Registrazione manuale: nessuna evocazione o spesa. I dati del profilo vengono copiati nella nuova scheda.", "Manual record: no summoning or cost. Profile values are copied into the new sheet.") : ctx.t("Azione di Magia in iniziativa. Famiglio folletto; termina al lungo del personaggio collegato.", "Magic action in initiative. Fey familiar; ends at the linked character’s Long Rest.")}</p>`;
  if (r.type === "known") {
    const catalog = forms.listCreatureProfiles(ctx.state, r.target, ctx.role, {
      purpose: "wild-shape",
    });
    html += row(
      ctx.t("Forme selezionate", "Selected forms"),
      sel.profileIds
        .map(
          (id) =>
            label(ctx, catalog.find((c) => c.id === id)?.name) ||
            ctx.t("Profilo non disponibile", "Unavailable profile"),
        )
        .join(", ") || ctx.t("Nessuna", "None"),
    );
  }
  if (r.type === "command" && ["dismiss", "reappear", "release"].includes(sel.command))
    html += `<p>${ctx.t("Azione di Magia del personaggio collegato, se in iniziativa. Non ricarica PF, azioni o risorse della creatura.", "The linked character’s Magic action while in initiative. Does not refresh the creature’s HP, actions or resources.")}</p>`;
  if (sel.command === "controllers") {
    const c = forms.getCompanion(ctx.state, r.target, ctx.role);
    html += row(
      ctx.t("Controllori confermati", "Confirmed controllers"),
      c.controllerChoices
        .filter((m) => m.isOwner || sel.controllers.includes(m.id))
        .map((m) =>
          m.name === "player"
            ? ctx.t("Giocatore", "Player")
            : m.name === "dm"
              ? "DM"
              : label(ctx, m.name),
        )
        .join(", "),
    );
  }
  if (sel.command === "archive")
    html += `<p>${ctx.t("La scheda resta consultabile; rappresentazioni rimosse dalla scena e dall’iniziativa.", "The sheet remains available; representations are removed from scenes and initiative.")}</p>`;
  for (const [key, value] of Object.entries(sel.patch || sel.manual || {}))
    if (["name", "hp", "maxHp", "tempHp", "ac", "speed"].includes(key))
      html += row(fieldName(ctx, key), val(ctx, value));
  const reason = sel.reason || sel.manual?.reason;
  if (reason) html += row(ctx.t("Motivo", "Reason"), reason);
  return html;
}
function formCorrectionHTML(ctx) {
  return details(
    ctx,
    "form-correction",
    ctx.t("Correggi la forma attiva", "Correct the active form"),
    `<p>${ctx.t("Corregge soltanto questa forma e ne registra la provenienza. Le statistiche base rimangono conservate.", "Corrects only this form and records the source. Base statistics remain intact.")}</p>${field(
      ctx,
      ctx.t("Dato", "Value"),
      choose(ctx, "formCorrectField", panel.fields.formCorrectField || "ac", [
        ["ac", fieldName(ctx, "ac")],
        ["speed", fieldName(ctx, "speed")],
      ]),
    )}${field(ctx, ctx.t("Nuovo valore", "New value"), input(ctx, "formCorrectValue", panel.fields.formCorrectValue, 'type="number" min="0" step="any"'))}${field(ctx, ctx.t("Motivo", "Reason"), input(ctx, "formCorrectReason", panel.fields.formCorrectReason))}${button(ctx, "data-forms-form-correct", "Vedi correzione della forma", "Preview form correction")}`,
  );
}
function profiles(ctx, purpose) {
  return forms.listCreatureProfiles(ctx.state, panel.actorId, ctx.role, {
    purpose,
    query: panel.search,
  });
}
function catalogHTML(ctx, purpose) {
  const rows = profiles(ctx, purpose).filter(
    (p) =>
      purpose !== "wild-shape" ||
      panel.filter === "all" ||
      (panel.filter === "known" ? p.known : panel.filter === "recent" ? p.recent : p.eligible),
  );
  return `<section class="forms-fields">${field(ctx, ctx.t("Cerca profilo", "Search profiles"), `<input type="search" data-forms-search value="${ctx.esc(panel.search)}">`)}${
    purpose === "wild-shape"
      ? field(
          ctx,
          ctx.t("Mostra", "Show"),
          select(ctx, "data-forms-filter", panel.filter, [
            ["known", ctx.t("Forme note", "Known forms")],
            ["eligible", ctx.t("Ammissibili", "Eligible")],
            ["recent", ctx.t("Recenti", "Recent")],
            ["all", ctx.t("Catalogo disponibile", "Available catalog")],
          ]),
        )
      : ""
  }<div class="forms-catalog">${rows.map((p) => `<div class="forms-profile">${button(ctx, `data-forms-profile="${ctx.esc(p.id)}" aria-pressed="${panel.profileId === p.id}"`, label(ctx, p.name), label(ctx, p.name), !p.eligible)}<p>${ctx.t("GS", "CR")} ${ctx.esc(p.cr === 0.25 ? "¼" : p.cr === 0.5 ? "½" : p.cr)} · ${ctx.esc(val(ctx, p.size))}${p.known ? ` · ${ctx.t("Nota", "Known")}` : ""}</p>${sourceHTML(ctx, p.source)}${issues(ctx, p.reasons)}</div>`).join("") || `<p>${ctx.t("Nessun profilo disponibile per questi filtri.", "No profiles are available for these filters.")}</p>`}</div><small>${ctx.t("Catalogo dimostrativo: tre profili verificati. Non rappresenta tutte le forme possibili.", "Demonstration catalog: three verified profiles. This is not every possible form.")}</small></section>`;
}
function details(ctx, key, title, html) {
  return `<details data-forms-details="${ctx.esc(key)}"${panel.details[key] ? " open" : ""}><summary>${ctx.esc(title)}</summary>${html}</details>`;
}
function carriedEquipment(o) {
  return (o.equipment || []).filter((item) => item.quantity > 0 && item.location !== "ground");
}
function equipmentHTML(ctx, o) {
  return details(
    ctx,
    "equipment",
    ctx.t("Equipaggiamento nella forma", "Equipment in the form"),
    `<p>${ctx.t("Oggetti fusi inoperanti; quelli caduti non ritornano in mano automaticamente. Quantità e sintonia restano registrate.", "Merged items are inoperative; dropped items do not automatically return to your hands. Quantities and attunement remain recorded.")}</p>${
      carriedEquipment(o)
        .map((item) => {
          const choice = (panel.equipment[item.id] ??= {
            disposition: "merge",
            wearApproved: false,
          });
          return `<div class="forms-row">${field(
            ctx,
            label(ctx, item.name),
            select(ctx, `data-forms-equipment="${ctx.esc(item.id)}"`, choice.disposition, [
              ["merge", ctx.t("Si fonde", "Merge")],
              ["drop", ctx.t("Cade", "Drop")],
              ["wear", ctx.t("Indossato", "Wear")],
            ]),
          )}${choice.disposition === "wear" ? `<label class="forms-check"><input type="checkbox" data-forms-wear="${ctx.esc(item.id)}"${choice.wearApproved ? " checked" : ""}>${ctx.t("Compatibilità confermata dal DM al tavolo", "The DM at the table confirmed compatibility")}</label>` : ""}</div>`;
        })
        .join("") || `<p>${ctx.t("Nessun oggetto da gestire.", "No equipment to manage.")}</p>`
    }`,
  );
}
function wildSelection(ctx, o) {
  return {
    profileId: panel.profileId,
    tempHpChoice: panel.fields.tempHpChoice || (o.effective.tempHp > 0 ? "" : "replace"),
    equipment: carriedEquipment(o).map((item) => ({
      itemId: item.id,
      ...(panel.equipment[item.id] || { disposition: "merge", wearApproved: false }),
    })),
  };
}
function formsHTML(ctx, o) {
  const active = o.activeForm;
  return `<div class="forms-layout"><section class="forms-fields"><h3>${ctx.t("Forma Selvatica", "Wild Shape")}</h3><p>${ctx.t("Assumere la forma e tornare volontariamente richiedono ciascuno una azione bonus, quando sei in iniziativa.", "Taking a form and voluntarily returning each require a Bonus Action while in initiative.")}</p>${active ? `<div class="forms-notice"><strong>${ctx.t("Forma attiva", "Active form")}: ${ctx.esc(label(ctx, active.profile?.name))}</strong><p>${ctx.t("I PF e le risorse sono quelli vivi del personaggio. Il ritorno non annulla la partita.", "HP and resources are the character’s live values. Returning does not undo play.")}</p>${sourceHTML(ctx, active.source)}${issues(ctx, o.effective.formLimitations)}${active.clockId === `personal:${o.actorId}` && o.permissions.canControl ? personalTimeHTML(ctx, o.commit) : ""}<div class="forms-toolbar">${button(ctx, "data-forms-return", "Torna alla forma originale", "Return to original form")}</div></div>` : ""}${o.wildShapeResource ? `<p>${ctx.t("Forma Selvatica · usi spesi", "Wild Shape · spent uses")}: ${ctx.esc(val(ctx, o.wildShapeResource.used))} / ${ctx.esc(val(ctx, o.wildShapeResource.max))}</p>` : ""}${
    o.permissions.canTransform
      ? `${catalogHTML(ctx, "wild-shape")}${
          o.effective.tempHp > 0
            ? field(
                ctx,
                `${ctx.t("PF temporanei già presenti", "Existing temporary HP")}: ${o.effective.tempHp}`,
                select(ctx, "data-forms-temp-hp", panel.fields.tempHpChoice || "", [
                  ["", ctx.t("Scegli quale fonte mantenere", "Choose which source to keep")],
                  ["keep", ctx.t("Mantieni i precedenti", "Keep existing")],
                  ["replace", ctx.t("Usa i nuovi della forma", "Use the form’s new temporary HP")],
                ]),
              )
            : ""
        }${equipmentHTML(ctx, o)}${button(ctx, "data-forms-preview", "Vedi trasformazione", "Preview transformation", !panel.profileId, false, ["Scegli prima una forma dall’elenco.", "Choose a form from the list first."])}`
      : `<p>${ctx.t("Questa scheda non ha un profilo Forma Selvatica verificato utilizzabile.", "This sheet has no usable verified Wild Shape profile.")}</p>`
  }${button(ctx, 'data-forms-tab="known"', "Gestisci forme note", "Manage known forms", !o.permissions.canManageKnownForms, false, ["Le forme note le gestisce chi controlla un druido di livello 2 o più.", "Known forms are managed by whoever controls a level 2+ druid."])}${details(ctx, "return-correction", ctx.t("Correggi una forma già terminata", "Correct an already ended form"), `${field(ctx, ctx.t("Motivo", "Reason"), `<textarea data-forms-field="returnReason">${ctx.esc(panel.fields.returnReason || "")}</textarea>`)}${button(ctx, "data-forms-return-correction", "Vedi correzione del ritorno", "Preview corrected return", !active, false, ["Nessuna forma attiva: la correzione del ritorno serve solo durante una forma.", "No active form: the return correction only applies during a form."])}`)}${active && o.permissions.canControl ? formCorrectionHTML(ctx) : ""}${historyHTML(ctx, o.actorId)}</section>${previewHTML(ctx)}</div>`;
}
function creationSelection(ctx, o) {
  const f = panel.fields;
  if (panel.tab === "wild-companion")
    return {
      mode: "wild-companion",
      profileId: panel.profileId,
      name: f.name,
      creatureType: "fey",
      cost: parseCost(f.cost),
      appearance: panel.appearance,
    };
  const patch = Object.fromEntries(
    ["hp", "maxHp", "ac", "speed"]
      .filter((key) => Object.hasOwn(f, key))
      .map((key) => [key, number(f[key])]),
  );
  return {
    mode: "manual",
    profileId: panel.profileId,
    name: f.name,
    ...(Object.keys(patch).length
      ? {
          manual: {
            ...patch,
            source: {
              kind: "authored-demo",
              edition: "2024",
              revision: "manual-record-1",
              title: ctx.t("Registrazione manuale", "Manual record"),
            },
            reason: f.manualReason,
          },
        }
      : {}),
  };
}
function parseCost(value) {
  const [kind, level] = value.split(":");
  return { kind, ...(level ? { level: Number(level) } : {}) };
}
function slotChoices(ctx, o) {
  return [...(o.slots || []), ...(o.pactSlots ? [{ ...o.pactSlots, kind: "pact-slot" }] : [])].map(
    (slot) => [
      `${slot.kind || "slot"}:${slot.level}`,
      `${slot.kind === "pact-slot" ? ctx.t("Patto", "Pact") : ctx.t("Slot", "Slot")} ${slot.level} · ${val(ctx, slot.used)}/${val(ctx, slot.max)} ${ctx.t("spesi", "spent")}`,
    ],
  );
}
function personalTimeHTML(ctx, commit) {
  const inInitiative = ctx.state.combat?.active && ctx.state.combat.order?.includes(panel.actorId);
  return `<fieldset><legend>${ctx.t("Tempo personale dichiarato", "Recorded personal time")}</legend>${field(ctx, ctx.t("Minuti trascorsi", "Elapsed minutes"), input(ctx, "timeMinutes", panel.fields.timeMinutes, 'type="number" min="0" step="any"'))}${field(ctx, ctx.t("Attività e motivo", "Activity and reason"), input(ctx, "timeReason", panel.fields.timeReason))}${button(ctx, "data-forms-personal-time", "Registra intervallo", "Record interval", inInitiative || (ctx.offline && !commit.local), false, inInitiative ? ["In iniziativa il tempo passa a turni: registra l’intervallo fuori dal combattimento.", "In initiative time passes by turns: record the interval outside combat."] : OFFLINE)}<p>${ctx.t("Questo gesto avanza l’orologio personale. Può terminare effetti e forme scaduti; non applica un riposo.", "This advances the personal clock. It may end expired effects and forms; it does not apply a rest.")}</p>${inInitiative ? `<p>${ctx.t("Durante l’iniziativa il tempo segue i turni; prosegui usando le azioni richieste.", "During initiative, time follows turns; continue using the required actions.")}</p>` : ""}</fieldset>`;
}
function familiarSelection(o = null) {
  const f = panel.fields;
  if (!f.materialId && o?.materials?.length === 1) f.materialId = o.materials[0].id;
  return {
    profileId: panel.profileId,
    name: f.name,
    creatureType: f.creatureType,
    mode: f.spellMode,
    slotLevel: number(f.slotLevel),
    material: {
      itemId: f.materialId || "",
      quantity: number(f.materialQuantity),
      unitValueGp: number(f.materialValue),
      incenseConfirmed: f.incenseConfirmed === true,
    },
    replaceConcentration: f.replaceConcentration === true,
  };
}
function castingStatus(ctx, c) {
  return (
    {
      casting: ctx.t("Lancio in corso", "Casting in progress"),
      completed: ctx.t("Lancio completato", "Casting completed"),
      cancelled: ctx.t("Lancio interrotto", "Casting cancelled"),
      failed: ctx.t("Lancio fallito", "Casting failed"),
    }[c.status] || ctx.t("Stato da verificare", "Status needs verification")
  );
}
function duration(ctx, seconds) {
  if (!Number.isFinite(seconds)) return ctx.t("Non registrato", "Not recorded");
  const minutes = Math.floor(seconds / 60),
    rest = Math.round(seconds % 60);
  return `${minutes} min${rest ? ` ${rest} s` : ""}`;
}
function familiarHTML(ctx, o) {
  const f = panel.fields,
    concentration = o.concentrationActive;
  return `<div class="forms-layout"><section class="forms-fields"><h3>${ctx.t("Trova Famiglio", "Find Familiar")}</h3>${(o.castings || []).map((c) => `<div class="forms-row"><strong>${ctx.esc(c.selection.name)}</strong><p>${castingStatus(ctx, c)}</p>${button(ctx, `data-forms-casting="${ctx.esc(c.id)}"`, "Apri attività", "Open activity")}</div>`).join("")}${
    o.permissions.canCastFamiliar
      ? `${field(ctx, ctx.t("Nome della creatura", "Creature name"), input(ctx, "name", f.name, 'maxlength="120"'))}${catalogHTML(ctx, "familiar")}${field(
          ctx,
          ctx.t("Tipo di creatura", "Creature type"),
          choose(ctx, "creatureType", f.creatureType, [
            ["celestial", ctx.t("Celestiale", "Celestial")],
            ["fey", ctx.t("Folletto", "Fey")],
            ["fiend", ctx.t("Immondo", "Fiend")],
          ]),
        )}${field(
          ctx,
          ctx.t("Modalità di lancio", "Casting mode"),
          choose(ctx, "spellMode", f.spellMode, [
            ["slot", ctx.t("Con slot · 60 minuti", "Spell slot · 60 minutes")],
            ["ritual", ctx.t("Rituale · 70 minuti", "Ritual · 70 minutes")],
          ]),
        )}${
          f.spellMode === "slot"
            ? field(
                ctx,
                ctx.t("Livello dello slot", "Spell slot level"),
                choose(
                  ctx,
                  "slotLevel",
                  f.slotLevel,
                  (o.slots || [])
                    .filter((s) => s.kind === "slot")
                    .map((s) => [
                      s.level,
                      `${s.level} · ${val(ctx, s.used)}/${val(ctx, s.max)} ${ctx.t("spesi", "spent")}`,
                    ]),
                ),
              )
            : ""
        }<fieldset><legend>${ctx.t("Incenso consumato", "Consumed incense")}</legend>${field(ctx, ctx.t("Oggetto nell’inventario", "Inventory item"), choose(ctx, "materialId", f.materialId || (o.materials?.length === 1 ? o.materials[0].id : ""), [["", ctx.t("Scegli l’oggetto", "Choose an item")], ...(o.materials || []).map((i) => [i.id, `${label(ctx, i.name)} · ${i.quantity}`])]))}<div class="forms-pair">${field(ctx, ctx.t("Quantità da consumare", "Quantity to consume"), input(ctx, "materialQuantity", f.materialQuantity, 'type="number" min="1" step="1"'))}${field(ctx, ctx.t("Valore unitario in mo", "Value per unit in GP"), input(ctx, "materialValue", f.materialValue, 'type="number" min="0" step="any"'))}</div>${check(ctx, "incenseConfirmed", f.incenseConfirmed, ctx.t("È incenso disponibile per questo lancio", "This is incense available for this casting"))}<p>${ctx.t("Almeno 10 mo di incenso, non denaro sottratto automaticamente. Materiale e slot si consumano soltanto al completamento; saranno rivalidati.", "At least 10 GP of incense; money is not automatically deducted. Material and slot are spent only on completion and will be checked again.")}</p></fieldset><p>${ctx.t("L’avvio richiede concentrazione per tutta l’attività e, in iniziativa, l’azione di Magia a ogni turno. Chiudere non interrompe il lancio. Perdita della concentrazione o azione mancata lo fanno fallire senza spendere lo slot.", "Starting requires Concentration throughout the activity and, in initiative, a Magic action each turn. Closing does not stop casting. Lost Concentration or a missed action fails it without spending the slot.")}</p>${concentration ? check(ctx, "replaceConcentration", f.replaceConcentration, ctx.t("Termina la concentrazione precedente per avviare questo lancio", "End the previous Concentration to begin this casting")) : ""}${sourceHTML(ctx, o.profile?.familiarCasting?.source)}${button(ctx, "data-forms-preview", "Vedi avvio del lancio", "Preview casting start")}`
      : `<p>${ctx.t("Trova Famiglio non è registrato come disponibile per questa scheda.", "Find Familiar is not recorded as available for this sheet.")}</p>`
  }</section>${previewHTML(ctx)}</div>`;
}
function castingHTML(ctx, o) {
  const c = forms.getFamiliarCasting(ctx.state, panel.castingId, ctx.role),
    active = c.status === "casting";
  const personal = c.clockId === `personal:${c.actorId}`;
  const failure =
    {
      "concentration-ended": ctx.t("Concentrazione terminata", "Concentration ended"),
      "magic-action-missed": ctx.t(
        "Azione di Magia non proseguita nel turno",
        "Magic action not continued on the turn",
      ),
    }[c.failure] || c.failure;
  return `<div class="forms-layout"><section class="forms-fields"><h3>${ctx.esc(c.selection.name)}</h3><p><strong>${castingStatus(ctx, c)}</strong></p>${sourceHTML(ctx, c.source)}<p class="forms-values">${ctx.t("Tempo trascorso", "Elapsed time")}: ${duration(ctx, c.elapsedSeconds)} / ${duration(ctx, c.requiredSeconds)} · ${ctx.t("Restano", "Remaining")}: ${duration(ctx, c.remainingSeconds)}</p>${failure ? `<p>${ctx.esc(failure)}</p>` : ""}${active ? `<p>${ctx.t("Concentrazione durante il lancio. Slot e incenso non sono ancora consumati. Il tempo reale trascorso fuori dall’app non avanza questo orologio.", "Concentrating while casting. The slot and incense have not yet been spent. Real time outside the app does not advance this clock.")}</p>${c.permissions.canContinue && ctx.state.combat?.active && ctx.state.combat.order?.includes(c.actorId) ? button(ctx, "data-forms-continue", "Usa azione per continuare", "Use action to continue", ctx.offline && !c.commit.local, false, OFFLINE) : ""}${personal && c.permissions.canControl ? personalTimeHTML(ctx, c.commit) : `<p>${ctx.t("Il DM conferma gli intervalli del tempo di gioco condiviso.", "The DM confirms intervals of shared game time.")}</p>${ctx.role === "dm" ? button(ctx, "data-forms-game-time", "Apri tempo di gioco", "Open game time") : ""}`}${appearanceHTML(ctx, c.appearanceContext)}${button(ctx, "data-forms-completion", "Vedi completamento", "Preview completion", !c.permissions.canComplete, false, ["Il lancio non è ancora completabile: continua finché è trascorso il tempo richiesto.", "The casting cannot complete yet: continue until the required time has passed."])}${c.permissions.canCancel ? details(ctx, "cancel-casting", ctx.t("Interrompi il lancio", "Stop casting"), `${field(ctx, ctx.t("Motivo dell’interruzione", "Reason for stopping"), `<textarea data-forms-field="cancelReason">${ctx.esc(panel.fields.cancelReason || "")}</textarea>`)}${button(ctx, "data-forms-cancel-casting", "Interrompi attività", "Stop activity", ctx.offline && !c.commit.local, false, OFFLINE)}`) : ""}` : c.resultActorId ? button(ctx, `data-forms-companion="${ctx.esc(c.resultActorId)}"`, "Apri creatura", "Open creature") : ""}</section>${previewHTML(ctx)}</div>`;
}
function bindCastingControls(root, ctx, on) {
  on("data-forms-casting", "click", (n) => {
    panel.castingId = n.dataset.formsCasting;
    panel.tab = "casting";
    panel.review = null;
    panel.appearance = null;
    panel.generation++;
    redraw(ctx);
  });
  on("data-forms-completion", "click", () =>
    preview(ctx, "completion", panel.castingId, { appearance: panel.appearance }),
  );
  on("data-forms-continue", "click", () => {
    const c = forms.getFamiliarCasting(ctx.state, panel.castingId, ctx.role);
    mutate(
      ctx,
      ctx.t("Attività proseguita", "Activity continued"),
      (state) =>
        forms.continueFamiliarCasting(state, c.id, ctx.role, {
          operationId: uid(),
          online: !ctx.offline,
        }),
      c.commit,
    );
    panel.review = null;
    redraw(ctx);
  });
  on("data-forms-cancel-casting", "click", () => {
    const c = forms.getFamiliarCasting(ctx.state, panel.castingId, ctx.role);
    mutate(
      ctx,
      ctx.t("Attività interrotta", "Activity stopped"),
      (state) =>
        forms.cancelFamiliarCasting(state, c.id, panel.fields.cancelReason || "", ctx.role, {
          operationId: uid(),
          online: !ctx.offline,
        }),
      c.commit,
    );
    panel.review = null;
    redraw(ctx);
  });
  on("data-forms-personal-time", "click", () => {
    const c =
      panel.tab === "casting"
        ? forms.getFamiliarCasting(ctx.state, panel.castingId, ctx.role)
        : overview(ctx);
    mutate(
      ctx,
      ctx.t("Tempo personale aggiornato", "Personal time updated"),
      (state) =>
        forms.recordPersonalFormsTime(
          state,
          c.actorId,
          number(panel.fields.timeMinutes) * 60,
          panel.fields.timeReason,
          ctx.role,
          { operationId: uid(), online: !ctx.offline },
        ),
      { ...c.commit, visibility: "private" },
    );
    panel.review = null;
    redraw(ctx);
  });
  on("data-forms-game-time", "click", () => ctx.openGameTime());
}
function appearanceHTML(ctx, context) {
  if (panel.appearance)
    return `<p class="forms-notice">${panel.appearance.kind === "map" ? ctx.t("Punto di comparsa selezionato. Sarà rivalidato prima dell’applicazione.", "Appearance point selected. It will be checked again before applying.") : ctx.t("Posizione nella finzione attestata esplicitamente.", "Position in the fiction explicitly attested.")}</p>${button(ctx, "data-forms-clear-appearance", "Cambia posizione di comparsa", "Change appearance position")}`;
  return `<fieldset><legend>${ctx.t("Comparsa della creatura", "Creature appearance")}</legend><p>${context?.canUseMap ? ctx.t("Scegli un punto libero entro la distanza consentita: la pedina compare lì appena applichi.", "Choose a free point within the permitted range: the token appears there as soon as you apply.") : ctx.t("Conferma spazio libero e distanza consentita. Il token si può collocare più tardi senza ripagare.", "Confirm free space and permitted range. Its token can be placed later without paying again.")}</p>${context?.canUseMap ? button(ctx, "data-forms-appearance-map", "Scegli il punto sul Tavolo", "Choose a point at the Table") : context?.needsAttestation ? check(ctx, "appearanceAttested", panel.fields.appearanceAttested, ctx.t("Attesto uno spazio libero nella distanza indicata dalla fonte", "I attest free space within the range stated by the source")) : `<p>${ctx.t("Contesto di comparsa non disponibile.", "Appearance context unavailable.")}</p>`}</fieldset>`;
}
function creationHTML(ctx, o) {
  const wild = panel.tab === "wild-companion";
  return `<div class="forms-layout"><section class="forms-fields"><h3>${wild ? ctx.t("Compagno Selvatico", "Wild Companion") : ctx.t("Registra compagno manuale", "Record manual companion")}</h3>${field(ctx, ctx.t("Nome della creatura", "Creature name"), input(ctx, "name", panel.fields.name))}${catalogHTML(ctx, wild ? "familiar" : "manual")}${wild ? `${field(ctx, ctx.t("Una sola risorsa da spendere", "Spend exactly one resource"), choose(ctx, "cost", panel.fields.cost, [["wild-shape", `${ctx.t("Uso Forma Selvatica", "Wild Shape use")} · ${val(ctx, o.wildShapeResource?.used)}/${val(ctx, o.wildShapeResource?.max)} ${ctx.t("spesi", "spent")}`], ...slotChoices(ctx, o)]))}<p>${ctx.t("Azione di Magia, famiglio folletto, senza materiale. Termina al tuo lungo; non al lungo di un altro personaggio.", "Magic action, Fey familiar, no material cost. Ends on your Long Rest, not another character’s rest.")}</p>${appearanceHTML(ctx, o.appearanceContext)}` : `${details(ctx, "manual-stats", ctx.t("Dati manuali e correzioni", "Manual values and corrections"), `<p>${ctx.t("I campi non modificati usano il profilo scelto. Svuotare un campo dopo averlo modificato registra il dato come sconosciuto. Ogni correzione richiede un motivo.", "Untouched fields use the selected profile. Clearing an edited field records the value as unknown. Each correction requires a reason.")}</p><div class="forms-pair">${["hp", "maxHp", "ac", "speed"].map((key) => field(ctx, fieldName(ctx, key), input(ctx, key, panel.fields[key], 'type="number" min="0" step="any"'))).join("")}</div>${field(ctx, ctx.t("Provenienza e motivo della registrazione", "Record provenance and reason"), `<textarea data-forms-field="manualReason">${ctx.esc(panel.fields.manualReason)}</textarea>`)}`)}<p>${ctx.t("Registra una creatura già esistente. Non esegue un lancio, non spende slot e non crea una pedina.", "Records an existing creature. Does not cast a spell, spend slots or create a token.")}</p>`}${button(ctx, "data-forms-preview", "Vedi creazione", "Preview creation")}</section>${previewHTML(ctx)}</div>`;
}
function companionsHTML(ctx, o) {
  const rows = forms.listCompanions(ctx.state, panel.actorId, ctx.role);
  return `<section><h3>${ctx.t("Creature collegate", "Linked creatures")}</h3><div class="forms-toolbar">${button(ctx, "data-forms-add-manual", "Aggiungi manualmente", "Add manually", !o.permissions.canCreateCompanion, false, ["Puoi aggiungere creature solo alle schede che controlli.", "You can only add creatures to sheets you control."])}${button(ctx, 'data-forms-tab="wild-companion"', "Compagno Selvatico", "Wild Companion", !o.permissions.canTransform, false, ["Compagno Selvatico richiede un druido di livello 2 che controlli.", "Wild Companion needs a level 2 druid you control."])}${button(ctx, 'data-forms-tab="familiar"', "Trova Famiglio", "Find Familiar", !o.permissions.canCastFamiliar, false, ["Serve Trova Famiglio preparato o come rituale dal libro degli incantesimi.", "Needs Find Familiar prepared, or as a ritual from the spellbook."])}</div>${rows.map((c) => `<div class="forms-row"><strong>${ctx.esc(label(ctx, c.name))}</strong><p>${lifecycle(ctx, c.lifecycle)} · ${ctx.t("PF", "HP")} ${ctx.esc(val(ctx, c.hp))}/${ctx.esc(val(ctx, c.maxHp))}</p><p>${c.placements?.length ? ctx.t("Presente in una scena leggibile", "Present in a readable scene") : ctx.t("Non nella scena corrente", "Not in the current scene")}</p>${button(ctx, `data-forms-companion="${ctx.esc(c.actorId)}"`, "Gestisci creatura", "Manage creature")}</div>`).join("") || `<p>${ctx.t("Nessuna creatura collegata disponibile.", "No linked creatures available.")}</p>`}</section>`;
}
function lifecycle(ctx, status) {
  return (
    {
      available: ctx.t("Disponibile", "Available"),
      dismissed: ctx.t("Congedato temporaneamente", "Temporarily dismissed"),
      destroyed: ctx.t(
        "Scomparso a 0 PF: nuovo lancio necessario",
        "Gone at 0 HP: a new casting is required",
      ),
      released: ctx.t("Congedato definitivamente", "Permanently released"),
      expired: ctx.t("Effetto terminato", "Effect ended"),
      archived: ctx.t("Archiviato", "Archived"),
    }[status] || ctx.t("Stato da verificare", "Status needs verification")
  );
}
function companionHTML(ctx) {
  const c = forms.getCompanion(ctx.state, panel.companionId, ctx.role);
  return `<div class="forms-layout"><section class="forms-fields"><h3>${ctx.esc(label(ctx, c.name))}</h3><p>${lifecycle(ctx, c.lifecycle)} · ${ctx.t("PF", "HP")}: ${ctx.esc(val(ctx, c.hp))} / ${ctx.esc(val(ctx, c.maxHp))}</p>${sourceHTML(ctx, c.source)}<p>${ctx.t("Iniziativa e reazione proprie", "Own initiative and reaction")}${c.attacksAllowed === false ? ` · ${ctx.t("Non può attaccare", "Cannot attack")}` : ""}.</p><div class="forms-toolbar">${button(ctx, "data-forms-sheet", "Apri scheda", "Open sheet")}${button(ctx, "data-forms-place", c.placements?.length ? "Seleziona/posiziona pedina" : "Posiziona pedina", c.placements?.length ? "Select/place token" : "Place token", !c.permissions.canPlace)}${c.permissions.canDismiss ? button(ctx, 'data-forms-command="dismiss"', "Congeda temporaneamente", "Temporarily dismiss") : ""}${c.permissions.canReappear ? button(ctx, 'data-forms-command="reappear"', "Vedi ricomparsa", "Preview reappearance") : ""}${c.permissions.canRelease ? button(ctx, 'data-forms-command="release"', "Congeda definitivamente", "Permanently release") : ""}</div>${c.permissions.canReappear ? appearanceHTML(ctx, c.appearanceContext) : ""}${companionManagementHTML(ctx, c)}${historyHTML(ctx, c.actorId)}</section>${previewHTML(ctx)}</div>`;
}
function companionManagementHTML(ctx, c) {
  panel.controllers ??= [...c.controllers];
  const controllers = c.permissions.canManage
    ? details(
        ctx,
        "controllers",
        ctx.t("Chi controlla questa creatura", "Who controls this creature"),
        `<p id="forms-owner-why">${ctx.t("Il proprietario rimane controllore. Questo accesso riguarda la creatura, non concede accesso ai piani privati del personaggio collegato.", "The owner remains a controller. This access concerns the creature; it does not grant access to the linked character’s private plans.")}</p>${(c.controllerChoices || []).map((m) => `<label class="forms-check"><input type="checkbox" data-forms-controller="${ctx.esc(m.id)}"${panel.controllers.includes(m.id) ? " checked" : ""}${m.isOwner ? ` disabled aria-describedby="forms-owner-why"` : ""}>${ctx.esc(m.name === "player" ? ctx.t("Giocatore", "Player") : m.name === "dm" ? "DM" : label(ctx, m.name))}${m.isOwner ? ` · ${ctx.t("proprietario", "owner")}` : ""}</label>`).join("")}${button(ctx, "data-forms-controllers", "Vedi controllori", "Preview controllers")}`,
      )
    : "";
  const correction = c.permissions.canCorrect
    ? details(
        ctx,
        "correction",
        ctx.t("Correggi un dato", "Correct a value"),
        `${field(
          ctx,
          ctx.t("Dato da correggere", "Value to correct"),
          choose(
            ctx,
            "correctField",
            panel.fields.correctField || "hp",
            ["hp", "maxHp", "tempHp", "ac", "speed", "name"].map((k) => [k, fieldName(ctx, k)]),
          ),
        )}${field(ctx, ctx.t("Nuovo valore (vuoto = non registrato)", "New value (blank = unrecorded)"), input(ctx, "correctValue", panel.fields.correctValue || ""))}${field(ctx, ctx.t("Motivo", "Reason"), `<textarea data-forms-field="correctReason">${ctx.esc(panel.fields.correctReason || "")}</textarea>`)}${button(ctx, "data-forms-correct", "Vedi correzione", "Preview correction")}`,
      )
    : "";
  const archive =
    c.permissions.canArchive && c.lifecycle !== "archived"
      ? details(
          ctx,
          "archive",
          ctx.t("Archivia creatura", "Archive creature"),
          `<p>${ctx.t("Rimuove le rappresentazioni dalla scena e dall’iniziativa. Non dichiara morte e non cancella la scheda.", "Removes scene and initiative representations. Does not declare death or delete the sheet.")}</p>${field(ctx, ctx.t("Motivo", "Reason"), input(ctx, "archiveReason", panel.fields.archiveReason))}${button(ctx, "data-forms-archive", "Vedi archiviazione", "Preview archive")}`,
        )
      : "";
  return controllers + correction + archive;
}
function historyHTML(ctx, actorId) {
  const rows = forms.getFormsHistory(ctx.state, actorId, ctx.role);
  const names = {
    "wild-shape": ["Forma assunta", "Form taken"],
    return: ["Ritorno dalla forma", "Returned from form"],
    "form-correction": ["Forma corretta", "Form corrected"],
    "known-forms": ["Forme note aggiornate", "Known forms updated"],
    companion: ["Creatura registrata", "Creature recorded"],
    "casting-start": ["Lancio avviato", "Casting started"],
    "casting-complete": ["Lancio completato", "Casting completed"],
    "casting-cancel": ["Lancio interrotto", "Casting stopped"],
    "casting-continue": ["Lancio proseguito", "Casting continued"],
    "companion-dismiss": ["Creatura congedata temporaneamente", "Creature temporarily dismissed"],
    "companion-reappear": ["Creatura ricomparsa", "Creature reappeared"],
    "companion-release": ["Congedo definitivo", "Permanent release"],
    "companion-archive": ["Creatura archiviata", "Creature archived"],
    "companion-correct": ["Dato corretto", "Value corrected"],
    "companion-controllers": ["Controllori aggiornati", "Controllers updated"],
    "personal-time": ["Tempo personale aggiornato", "Personal time updated"],
  };
  return details(
    ctx,
    "history",
    ctx.t("Registro delle modifiche", "Change record"),
    rows
      .map(
        (row) =>
          `<div class="forms-row"><strong>${ctx.esc(names[row.kind] ? ctx.t(...names[row.kind]) : ctx.t("Forma o creatura aggiornata", "Form or creature updated"))}</strong>${row.result?.reason ? `<p>${ctx.esc(row.result.reason)}</p>` : ""}${sourceHTML(ctx, row.source)}</div>`,
      )
      .join("") || `<p>${ctx.t("Nessuna modifica registrata.", "No changes recorded.")}</p>`,
  );
}
function knownHTML(ctx, o) {
  const catalog = forms.listCreatureProfiles(ctx.state, o.actorId, ctx.role, {
    purpose: "wild-shape",
  });
  panel.known ??= [...(o.profile?.knownForms || [])];
  panel.knownMode ??= !o.profile?.knownFormsInitialized
    ? "initial"
    : o.profile?.knownFormReplacement && !o.profile.knownFormReplacement.used
      ? "replace"
      : "correction";
  return `<div class="forms-layout"><section class="forms-fields"><h3>${ctx.t("Forme note", "Known forms")}</h3>${field(
    ctx,
    ctx.t("Operazione", "Operation"),
    choose(ctx, "knownMode", panel.fields.knownMode || panel.knownMode, [
      ["initial", ctx.t("Scelta iniziale", "Initial choices")],
      ["replace", ctx.t("Sostituisci dopo un lungo", "Replace after a Long Rest")],
      ["correction", ctx.t("Correzione con motivo", "Correction with a reason")],
    ]),
  )}<p>${ctx.t("Scelte registrate", "Recorded choices")}: ${panel.known.length} / ${ctx.esc(val(ctx, o.profile?.knownFormsLimit))}</p><p>${ctx.t("Le forme ammissibili non sono tutte automaticamente note. I posti oltre questo catalogo restano da completare.", "Eligible forms are not automatically known. Choices beyond this catalog remain to be completed.")}</p>${catalog
    .map(
      (p) =>
        `<div class="forms-row"><label class="forms-check"><input type="checkbox" data-forms-known="${ctx.esc(p.id)}"${panel.known.includes(p.id) ? " checked" : ""}${!p.eligible && !panel.known.includes(p.id) ? ` disabled aria-describedby="forms-known-why-${ctx.esc(p.id.replace(/[^A-Za-z0-9_-]/g, "-"))}"` : ""}>${ctx.esc(label(ctx, p.name))}</label><div class="forms-why" id="forms-known-why-${ctx.esc(p.id.replace(/[^A-Za-z0-9_-]/g, "-"))}">${issues(ctx, p.reasons)}</div></div>`,
    )
    .join("")}${panel.known
    .filter((id) => !catalog.some((p) => p.id === id))
    .map(
      (id, index) =>
        `<label class="forms-check"><input type="checkbox" data-forms-known="${ctx.esc(id)}" checked>${ctx.t("Profilo fuori dal catalogo disponibile", "Profile outside the available catalog")} ${index + 1}</label>`,
    )
    .join(
      "",
    )}${field(ctx, ctx.t("Motivo della correzione, se scelta", "Reason if correcting"), `<textarea data-forms-field="knownReason">${ctx.esc(panel.fields.knownReason || "")}</textarea>`)}${button(ctx, "data-forms-preview", "Vedi forme note", "Preview known forms")}</section>${previewHTML(ctx)}</div>`;
}
export function renderFormsPanel(ctx) {
  if (!panel || panel.owner !== ctx.role) return "";
  try {
    if (!panel.actorId && !panel.companionId)
      return `<h3>${ctx.t("Scegli il personaggio", "Choose a character")}</h3>${Object.keys(
        ctx.state.actors,
      )
        .flatMap((id) => {
          try {
            const o = forms.getFormsOverview(ctx.state, id, ctx.role);
            return o.permissions.canControl
              ? [
                  button(
                    ctx,
                    `data-forms-actor="${ctx.esc(id)}"`,
                    label(ctx, o.actorName),
                    label(ctx, o.actorName),
                  ),
                ]
              : [];
          } catch {
            return [];
          }
        })
        .join(" ")}`;
    const o = tryOverview(ctx);
    if (o && panel.tab === "forms" && !hasWildShape(o)) panel.tab = "companions";
    if (!o && panel.tab !== "companion")
      return `<p>${ctx.t("Forme e creature non disponibili per questa scheda.", "Forms and creatures are unavailable for this sheet.")}</p>`;
    let content =
      panel.tab === "companion"
        ? companionHTML(ctx)
        : panel.tab === "companions"
          ? companionsHTML(ctx, o)
          : ["manual", "wild-companion"].includes(panel.tab)
            ? creationHTML(ctx, o)
            : panel.tab === "known"
              ? knownHTML(ctx, o)
              : panel.tab === "familiar"
                ? familiarHTML(ctx, o)
                : panel.tab === "casting"
                  ? castingHTML(ctx, o)
                  : formsHTML(ctx, o);
    return `${
      o
        ? `<p><strong>${ctx.esc(label(ctx, o.actorName))}</strong></p><nav class="forms-tabs" aria-label="${ctx.t("Forme e compagni", "Forms and companions")}">${[
            ["forms", "Forma Selvatica", "Wild Shape"],
            ["companions", "Creature collegate", "Linked creatures"],
            ["familiar", "Trova Famiglio", "Find Familiar"],
          ]
            .filter(([key]) => key !== "forms" || hasWildShape(o))
            .map(([key, it, en]) =>
              button(ctx, `data-forms-tab="${key}" aria-current="${panel.tab === key}"`, it, en),
            )
            .join("")}</nav>`
        : ""
    }${ctx.offline ? `<p class="forms-notice">${ctx.t("Senza rete: i cambi condivisi richiedono riconnessione. I dati personali seguono i propri permessi.", "Offline: shared changes require reconnection. Personal data follows its own permissions.")}</p>` : ""}${panel.error ? `<p class="forms-notice" role="alert">${ctx.esc(panel.error)}</p>` : ""}${content}<div class="forms-toolbar">${button(ctx, "data-forms-undo", "Annulla ultima modifica", "Undo last change", !ctx.canUndo?.(), false, ["Niente da annullare: nessuna modifica recente tua.", "Nothing to undo: no recent change of yours."])}</div><p class="forms-notice">${ctx.t("Chiudi/Esc non risolve né annulla attività già avviate. Il ritorno dalla forma è un comando distinto da Undo.", "Close/Esc does not resolve or cancel activities already started. Returning from a form is separate from Undo.")}</p>`;
  } catch (error) {
    return `<p role="status">${ctx.esc(message(ctx, error))}</p>`;
  }
}
/** PG-78: the first resource with something left (Wild Shape use, then a spell slot). */
function defaultCost(o) {
  const ws = o?.wildShapeResource;
  if (ws && Number.isInteger(ws.max) && (ws.used ?? 0) < ws.max) return "wild-shape";
  const slot = [
    ...(o?.slots || []),
    ...(o?.pactSlots ? [{ ...o.pactSlots, kind: "pact-slot" }] : []),
  ].find((row) => Number.isInteger(row.max) && (row.used ?? 0) < row.max);
  return slot ? `${slot.kind || "slot"}:${slot.level}` : "wild-shape";
}
function changeTab(ctx, tab) {
  panel.tab = tab;
  if (tab === "wild-companion") panel.fields.cost = defaultCost(tryOverview(ctx));
  panel.companionId = null;
  panel.controllers = null;
  panel.castingId = null;
  panel.review = null;
  panel.error = "";
  panel.profileId = "";
  panel.appearance = null;
  panel.fields.appearanceAttested = false;
  panel.generation++;
  redraw(ctx);
}
export function bindFormsPanel(root, ctx) {
  if (!panel || panel.owner !== ctx.role || !root) return;
  const on = (attr, type, fn) =>
    root.querySelectorAll(`[${attr}]`).forEach((node) =>
      node.addEventListener(type, (event) => {
        if (panel?.owner !== ctx.role) return;
        if (type === "click") event.preventDefault();
        safe(ctx, () => fn(node, event));
      }),
    );
  const dirty = () => {
    panel.generation++;
    if (panel.review) panel.review.dirty = true;
    root.querySelectorAll("[data-forms-apply]").forEach((n) => {
      n.disabled = true;
      // SV-37: the disabled Apply says why and what to do.
      if (!root.querySelector?.("#forms-apply-dirty"))
        n.insertAdjacentHTML?.(
          "afterend",
          `<small class="forms-why" id="forms-apply-dirty">${ctx.esc(ctx.t("Scelte cambiate: premi di nuovo l’anteprima.", "Choices changed: preview again."))}</small>`,
        );
      n.setAttribute?.("aria-describedby", "forms-apply-dirty");
    });
  };
  on("data-forms-tab", "click", (n) => changeTab(ctx, n.dataset.formsTab));
  on("data-forms-actor", "click", (n) => openForms(ctx, { actorId: n.dataset.formsActor }));
  on("data-forms-add-manual", "click", () => changeTab(ctx, "manual"));
  on("data-forms-profile", "click", (n) => {
    panel.profileId = n.dataset.formsProfile;
    dirty();
    // PG-77 (BG3): picking a Wild Shape form shows its preview with «Applica» at once.
    if (panel.tab === "forms") {
      const o = overview(ctx);
      if (o.permissions.canTransform && !(o.effective.tempHp > 0 && !panel.fields.tempHpChoice))
        return preview(ctx, "wild", panel.actorId, wildSelection(ctx, o));
    }
    redraw(ctx);
  });
  on("data-forms-search", "input", (n) => {
    panel.search = n.value;
    redraw(ctx);
  });
  on("data-forms-filter", "change", (n) => {
    panel.filter = n.value;
    redraw(ctx);
  });
  on("data-forms-field", "input", (n) => {
    if (["checkbox", "radio"].includes(n.type)) return;
    panel.fields[n.dataset.formsField] = n.value;
    dirty();
  });
  on("data-forms-field", "change", (n) => {
    const key = n.dataset.formsField;
    panel.fields[key] = ["checkbox", "radio"].includes(n.type) ? n.checked : n.value;
    if (key === "appearanceAttested")
      panel.appearance = n.checked ? { kind: "attested", confirmed: true } : null;
    dirty();
    // A text blur happens between pointerdown and click on the next control.
    // Keep that control mounted; only structural choices need a new layout.
    if (n.tagName === "SELECT" || ["checkbox", "radio"].includes(n.type)) redraw(ctx);
  });
  on("data-forms-temp-hp", "change", (n) => {
    panel.fields.tempHpChoice = n.value;
    dirty();
    redraw(ctx);
  });
  on("data-forms-equipment", "change", (n) => {
    panel.equipment[n.dataset.formsEquipment] = { disposition: n.value, wearApproved: false };
    dirty();
    redraw(ctx);
  });
  on("data-forms-wear", "change", (n) => {
    panel.equipment[n.dataset.formsWear].wearApproved = n.checked;
    dirty();
    redraw(ctx);
  });
  on("data-forms-details", "toggle", (n) => {
    panel.details[n.dataset.formsDetails] = n.open;
  });
  on("data-forms-known", "change", (n) => {
    panel.known = panel.known.filter((id) => id !== n.dataset.formsKnown);
    if (n.checked) panel.known.push(n.dataset.formsKnown);
    dirty();
    redraw(ctx);
  });
  on("data-forms-preview", "click", () => {
    const o = overview(ctx);
    if (panel.tab === "forms") preview(ctx, "wild", panel.actorId, wildSelection(ctx, o));
    else if (["manual", "wild-companion"].includes(panel.tab))
      preview(ctx, "create", panel.actorId, creationSelection(ctx, o));
    else if (panel.tab === "known")
      preview(ctx, "known", panel.actorId, {
        mode: panel.fields.knownMode || panel.knownMode,
        profileIds: panel.known,
        reason: panel.fields.knownReason || "",
      });
    else if (panel.tab === "familiar")
      preview(ctx, "familiar", panel.actorId, familiarSelection(overview(ctx)));
  });
  on("data-forms-return", "click", () => preview(ctx, "return", panel.actorId, { mode: "normal" }));
  on("data-forms-return-correction", "click", () =>
    preview(ctx, "return", panel.actorId, {
      mode: "correction",
      reason: panel.fields.returnReason || "",
    }),
  );
  on("data-forms-form-correct", "click", () =>
    preview(ctx, "correction", panel.actorId, {
      patch: { [panel.fields.formCorrectField || "ac"]: number(panel.fields.formCorrectValue) },
      reason: panel.fields.formCorrectReason || "",
    }),
  );
  on("data-forms-apply", "click", () => apply(ctx));
  on("data-forms-cancel-preview", "click", () => {
    panel.review = null;
    redraw(ctx);
  });
  on("data-forms-companion", "click", (n) => {
    panel.companionId = n.dataset.formsCompanion;
    panel.tab = "companion";
    panel.review = null;
    panel.appearance = null;
    panel.controllers = null;
    panel.generation++;
    redraw(ctx);
  });
  on("data-forms-sheet", "click", () => {
    ctx.closeDialog?.();
    ctx.openSheet(panel.companionId || panel.actorId);
  });
  on("data-forms-place", "click", () => {
    const placement = forms.getCompanionPlacement(ctx.state, panel.companionId, ctx.role);
    if (!placement.canPlace)
      throw Error(ctx.t("Collocazione non disponibile.", "Placement unavailable."));
    ctx.beginCompanionPlacement(panel.companionId);
  });
  on("data-forms-command", "click", (n) =>
    preview(ctx, "command", panel.companionId, {
      command: n.dataset.formsCommand,
      ...(n.dataset.formsCommand === "reappear" ? { appearance: panel.appearance } : {}),
    }),
  );
  on("data-forms-controller", "change", (n) => {
    panel.controllers = panel.controllers.filter((id) => id !== n.dataset.formsController);
    if (n.checked) panel.controllers.push(n.dataset.formsController);
    dirty();
  });
  on("data-forms-controllers", "click", () =>
    preview(ctx, "command", panel.companionId, {
      command: "controllers",
      controllers: panel.controllers,
    }),
  );
  on("data-forms-correct", "click", () => {
    const key = panel.fields.correctField || "hp";
    preview(ctx, "command", panel.companionId, {
      command: "correct",
      patch: {
        [key]: key === "name" ? panel.fields.correctValue || "" : number(panel.fields.correctValue),
      },
      reason: panel.fields.correctReason || "",
    });
  });
  on("data-forms-archive", "click", () =>
    preview(ctx, "command", panel.companionId, {
      command: "archive",
      reason: panel.fields.archiveReason || "",
    }),
  );
  on("data-forms-clear-appearance", "click", () => {
    panel.appearance = null;
    panel.fields.appearanceAttested = false;
    dirty();
    redraw(ctx);
  });
  on("data-forms-appearance-map", "click", () => requestAppearance(ctx));
  on("data-forms-undo", "click", () => {
    panel.review = null;
    ctx.undo();
    redraw(ctx);
  });
  bindCastingControls(root, ctx, on);
}
function requestAppearance(ctx) {
  const origin = panel,
    generation = panel.generation,
    actorId = panel.actorId;
  const context =
    panel.tab === "companion"
      ? forms.getCompanion(ctx.state, panel.companionId, ctx.role).appearanceContext
      : overview(ctx).appearanceContext;
  ctx.confirmCompanionAppearance(
    {
      parentActorId: context?.parentActorId || actorId,
      ...(panel.tab === "companion" && panel.companionId
        ? { companionActorId: panel.companionId }
        : {}),
      rangeMeters: context?.rangeMeters || (panel.tab === "companion" ? 9 : 3),
    },
    (appearance) => {
      if (panel !== origin || panel.owner !== ctx.role || panel.generation !== generation) return;
      panel.appearance = appearance ? copy(appearance) : null;
      panel.review = null;
      show(ctx);
    },
  );
}
function show(ctx) {
  ctx.dialog(
    ctx.t("Forme e creature collegate", "Forms and linked creatures"),
    `<div class="forms-panel" data-forms-panel>${renderFormsPanel(ctx)}</div>`,
    { cancelLabel: ctx.t("Chiudi", "Close"), onSubmit: () => false },
  );
  if (typeof document !== "undefined")
    bindFormsPanel(document.querySelector("#dialog [data-forms-panel]"), ctx);
}
export function openForms(ctx, { actorId, tab } = {}) {
  panel = initial(ctx, actorId || ctx.view?.id || null, tab);
  show(ctx);
}
/** PG-77 (dnd5e «Revert» on the token): the forms panel with the return already previewed. */
export function openFormReturn(ctx, actorId) {
  openForms(ctx, { actorId, tab: "forms" });
  try {
    preview(ctx, "return", actorId, { mode: "normal" });
  } catch (error) {
    panel.error = message(ctx, error);
    redraw(ctx);
  }
}
export function openCompanion(ctx, { actorId }) {
  panel = initial(ctx, null, "companion");
  panel.companionId = actorId;
  try {
    const c = forms.getCompanion(ctx.state, actorId, ctx.role);
    if (c.parentActorId) {
      try {
        forms.getFormsOverview(ctx.state, c.parentActorId, ctx.role);
        panel.actorId = c.parentActorId;
      } catch {}
    }
  } catch {}
  show(ctx);
}
// ---------------------------------------------------------------- transform (R3 PG-79)

// dnd5e's Transform dialog (FVT-034: presets, keep switches, Revert) for any creature: the DM
// on any of them, a player on the creatures she controls. Metamorfosi is SRD 5.2.1 Polymorph;
// Forma Selvatica opens its own flow (same activeForm engine); the custom preset is the DM's.
let transformDraft = null;
let saveDomain = null;
const loadSaveDomain = () =>
  import("./special-moves-domain.mjs").then((module) => (saveDomain = module)).catch(() => null);
// The DM (or the session runner, C3) transforms any creature on the scene; a player the
// creatures she controls.
const canTransformAny = (ctx) => runsSession(ctx.state, ctx.role);
function transformTargets(ctx) {
  const scene = ctx.state.scenes?.find((x) => x.id === ctx.state.activeSceneId);
  return (scene?.tokens ?? [])
    .map((t) => ctx.state.actors[t.actorId])
    .filter((a) => a && !a.dead && (ctx.canControl(a) || canTransformAny(ctx)));
}
function draftFor(ctx, actorId, preset) {
  const targets = transformTargets(ctx);
  const target = targets.find((a) => a.id === actorId) ?? targets[0] ?? null;
  return {
    owner: ctx.role,
    actorId: target?.id ?? null,
    preset: preset && preset !== "wild-shape" ? preset : "polymorph",
    profileId: "",
    casterId: "",
    unwilling: false,
    dc: "13",
    keep: { physical: false, mental: true, saves: false, skills: false, classFeatures: false },
    hp: "temp",
  };
}
function transformSelection(d) {
  return {
    preset: d.preset,
    profileId: d.profileId,
    ...(d.casterId ? { casterId: d.casterId } : {}),
    ...(d.casterId && d.preset === "polymorph" && d.slotLevel
      ? { slotLevel: Number(d.slotLevel) }
      : {}),
    ...(d.preset === "custom" ? { keep: { ...d.keep }, hp: d.hp } : {}),
  };
}
const beastLine = (ctx, p) =>
  `${label(ctx, p.name)} · ${ctx.t("GS", "CR")} ${forms.crText(p.cr)} · ${ctx.t("PF", "HP")} ${p.hp} · ${ctx.t("CA", "AC")} ${p.ac} · ${val(ctx, p.speeds.walk)} m`;
function transformHTML(ctx) {
  const d = transformDraft;
  const actor = ctx.state.actors[d.actorId];
  const targets = transformTargets(ctx);
  if (!actor)
    return `<p class="forms-notice">${ctx.t("Nessuna creatura da trasformare sulla scena: seleziona una pedina che controlli.", "No creature to transform on the scene: select a token you control.")}</p>`;
  const who = `<label class="field"><span>${ctx.t("Creatura", "Creature")}</span><select data-tf="actorId">${targets.map((a) => `<option value="${ctx.esc(a.id)}"${a.id === d.actorId ? " selected" : ""}>${ctx.esc(a.name)}</option>`).join("")}</select></label>`;
  if (actor.activeForm) {
    const limits = forms.formLimitsText(actor);
    return `${who}<section class="forms-transform-current" data-tf-current><h3>${ctx.esc(forms.formTokenName(actor, ctx.lang))}</h3><p>${ctx.esc(label(ctx, TRANSFORM_KIND[actor.activeForm.kind] ?? TRANSFORM_KIND["wild-shape"]))}${actor.activeForm.casterId ? ` · ${ctx.t("Concentrazione di", "Concentration of")} ${ctx.esc(ctx.state.actors[actor.activeForm.casterId]?.name ?? "")}` : ""}</p>${limits ? `<p class="muted">${ctx.esc(label(ctx, limits))}</p>` : ""}<p>${ctx.t("Conferma per tornare alla forma originale: l’immagine della pedina torna subito quella di prima.", "Confirm to return to the original form: the token’s image is the old one again at once.")}</p></section>`;
  }
  const dmOnly = !canTransformAny(ctx);
  const wild =
    actor.formsProfile?.wildShapeFeatureId ||
    actor.features?.some((f) => f.definitionId === "druid:wild-shape");
  const presetRadio = (id, it, en, hint, off = "") =>
    `<label class="forms-preset"><input type="radio" name="tf-preset" value="${id}" data-tf="preset"${d.preset === id ? " checked" : ""}${off ? ` disabled aria-describedby="tf-why-${id}"` : ""}> <span><strong>${ctx.t(it, en)}</strong><small>${hint}</small>${off ? `<small class="forms-why" id="tf-why-${id}">${off}</small>` : ""}</span></label>`;
  const presets = `<fieldset class="forms-presets"><legend>${ctx.t("Trasformazione", "Transformation")}</legend>${presetRadio("polymorph", "Metamorfosi", "Polymorph", ctx.t("Incantesimo SRD: una bestia di GS pari o inferiore; PF temporanei della forma.", "SRD spell: a Beast of equal or lower CR; the form's HP as Temporary HP."))}${wild ? presetRadio("wild-shape", "Forma Selvatica", "Wild Shape", ctx.t("Le forme note del druido, con i suoi usi.", "The druid's known forms, with its uses.")) : ""}${presetRadio("custom", "Trasformazione personalizzata", "Custom transformation", ctx.t("Il DM sceglie cosa conservare (Metamorfosi pura, Mutaforma, maledizioni).", "The DM chooses what to keep (True Polymorph, Shapechange, curses)."), dmOnly ? ctx.t("La decide il DM: chiedi al DM o usa Metamorfosi.", "The DM decides it: ask the DM or use Polymorph.") : "")}</fieldset>`;
  if (d.preset === "wild-shape")
    return `${who}${presets}<p>${ctx.t("Conferma per aprire le forme note di", "Confirm to open the known forms of")} ${ctx.esc(actor.name)}.</p>`;
  const rows = forms.listTransformProfiles(
    ctx.state,
    actor.id,
    canTransformAny(ctx) ? "dm" : ctx.role,
    {
      preset: d.preset,
    },
  );
  const beasts = `<fieldset class="forms-beasts"><legend>${ctx.t("Forma", "Form")}</legend>${rows
    .map((p) => {
      const why = p.eligible ? "" : label(ctx, p.reasons[0]);
      const id = `tf-beast-${p.id.replace(/[^A-Za-z0-9_-]/g, "-")}`;
      return `<label class="forms-beast${p.eligible ? "" : " is-out"}"><input type="radio" name="tf-profile" value="${ctx.esc(p.id)}" data-tf="profileId"${d.profileId === p.id ? " checked" : ""}${p.eligible ? "" : ` disabled aria-describedby="${id}-why"`}> <span>${ctx.esc(beastLine(ctx, p))}${why ? `<small class="forms-why" id="${id}-why">${ctx.esc(why)}</small>` : ""}</span></label>`;
    })
    .join("")}</fieldset>`;
  const others = transformTargets(ctx).filter((a) => a.id !== actor.id);
  // PG-79: casting Polymorph spends a slot of level 4+ (the caster picks it, BG3 upcast).
  const casterActor = d.casterId ? ctx.state.actors[d.casterId] : null;
  const freeSlots =
    d.preset === "polymorph" && casterActor
      ? forms.polymorphSlots(casterActor).filter((row) => row.remaining > 0)
      : [];
  const slotPicker =
    freeSlots.length > 1
      ? `<label class="field"><span>${ctx.t("Slot da spendere", "Slot to spend")}</span><select data-tf="slotLevel">${freeSlots.map((row) => `<option value="${row.level}"${Number(d.slotLevel || freeSlots[0].level) === row.level ? " selected" : ""}>${ctx.t(`${row.level}° livello`, `Level ${row.level}`)} · ${row.remaining}/${row.max}</option>`).join("")}</select></label>`
      : "";
  const casting = `<label class="field"><span>${ctx.t("Incantatore (spende slot e Azione, tiene la Concentrazione)", "Caster (spends the slot and the Action, holds Concentration)")}</span><select data-tf="casterId"><option value="">${ctx.t("Nessuno: effetto deciso dal DM", "None: an effect the DM decides")}</option>${[actor, ...others].map((a) => `<option value="${ctx.esc(a.id)}"${d.casterId === a.id ? " selected" : ""}>${ctx.esc(a.name)}</option>`).join("")}</select></label>${slotPicker}`;
  const unwilling =
    d.preset === "polymorph"
      ? `<label class="forms-check"><input type="checkbox" data-tf="unwilling"${d.unwilling ? " checked" : ""}> ${ctx.t(`${actor.name} resiste: tiro salvezza su Saggezza`, `${actor.name} resists: Wisdom saving throw`)}</label>${d.unwilling ? `<label class="field"><span>${ctx.t("CD (tiro salvezza degli incantesimi dell’incantatore)", "DC (the caster's spell save DC)")}</span><input type="number" min="1" max="40" inputmode="numeric" value="${ctx.esc(d.dc)}" data-tf="dc"></label>` : ""}`
      : "";
  const keep =
    d.preset === "custom"
      ? `<fieldset class="forms-keep"><legend>${ctx.t("Conserva", "Keep")}</legend>${forms.KEEP_SWITCHES.map(([key, text]) => `<label class="forms-check"><input type="checkbox" data-tf-keep="${key}"${d.keep[key] ? " checked" : ""}> ${ctx.esc(label(ctx, text))}</label>`).join("")}<label class="field"><span>${ctx.t("Punti ferita", "Hit points")}</span><select data-tf="hp"><option value="temp"${d.hp === "temp" ? " selected" : ""}>${ctx.t("PF temporanei pari a quelli della forma", "Temporary HP equal to the form's")}</option><option value="own"${d.hp === "own" ? " selected" : ""}>${ctx.t("Solo i propri PF", "Own HP only")}</option></select></label></fieldset>`
      : "";
  let summary = "";
  if (d.profileId) {
    const p = forms.previewTransform(ctx.state, actor.id, transformSelection(d), ctx.role);
    const def = forms.transformProfile(d.profileId);
    summary = `<div class="forms-transform-summary" aria-live="polite" data-tf-summary><p><strong>${ctx.esc(actor.name)} → ${ctx.esc(label(ctx, def?.name))}</strong>: ${ctx.t("CA", "AC")} ${def?.ac} · ${ctx.t("velocità", "Speed")} ${val(ctx, def?.speeds.walk)} m${p.tempHp ? ` · ${ctx.t("PF temporanei", "Temporary HP")} ${p.tempHp.after}` : ""}.</p>${p.ends ? `<p class="muted">${ctx.esc(label(ctx, p.ends))}</p>` : ""}${p.costs?.length ? `<p data-tf-costs>${ctx.t("Costo del lancio", "Casting cost")} (${ctx.esc(casterActor?.name ?? "")}): ${p.costs.map((cost) => ctx.esc(label(ctx, cost.label))).join(" · ")}</p>` : ""}${issues(ctx, p.warnings)}${issues(ctx, p.errors)}${sourceHTML(ctx, p.source)}</div>`;
  } else
    summary = `<p class="muted" data-tf-summary>${ctx.t("Scegli la forma: la pedina mostrerà la bestia e il nome «forma (creatura)».", "Choose the form: the token will show the Beast and the name “form (creature)”.")}</p>`;
  return `${who}${presets}${beasts}${d.preset === "polymorph" || d.preset === "custom" ? casting : ""}${unwilling}${keep}${summary}`;
}
const TRANSFORM_KIND = {
  polymorph: { it: "Metamorfosi", en: "Polymorph" },
  custom: { it: "Trasformazione personalizzata", en: "Custom transformation" },
  "wild-shape": { it: "Forma Selvatica", en: "Wild Shape" },
};
function bindTransform(root, ctx) {
  const redrawTransform = (focusKey) => {
    root.innerHTML = transformHTML(ctx);
    bindTransform(root, ctx);
    const submit = root.closest("form")?.querySelector('footer [type="submit"]');
    if (submit) submit.textContent = transformSubmitLabel(ctx);
    if (focusKey) root.querySelector(focusKey)?.focus({ preventScroll: true });
  };
  root.querySelectorAll("[data-tf]").forEach((node) =>
    node.addEventListener("change", () => {
      const key = node.dataset.tf;
      transformDraft[key] = node.type === "checkbox" ? node.checked : node.value;
      if (key === "actorId")
        transformDraft = { ...draftFor(ctx, node.value, transformDraft.preset) };
      if (key === "preset") transformDraft.profileId = "";
      if (key === "casterId") transformDraft.slotLevel = "";
      const focus =
        node.type === "radio"
          ? `[data-tf="${key}"][value="${CSS.escape(node.value)}"]`
          : `[data-tf="${key}"]`;
      redrawTransform(focus);
    }),
  );
  root.querySelectorAll("[data-tf-keep]").forEach((node) =>
    node.addEventListener("change", () => {
      transformDraft.keep[node.dataset.tfKeep] = node.checked;
      redrawTransform(`[data-tf-keep="${node.dataset.tfKeep}"]`);
    }),
  );
}
function transformSubmitLabel(ctx) {
  const d = transformDraft;
  const actor = ctx.state.actors[d?.actorId];
  if (actor?.activeForm) return ctx.t("Torna alla forma originale", "Return to original form");
  if (d?.preset === "wild-shape") return ctx.t("Apri Forma Selvatica", "Open Wild Shape");
  if (d?.preset === "polymorph" && d.unwilling)
    return ctx.t("Chiedi il tiro salvezza", "Ask for the saving throw");
  return ctx.t("Trasforma", "Transform");
}
function submitTransform(ctx) {
  const d = transformDraft;
  const actor = ctx.state.actors[d.actorId];
  if (!actor)
    throw Object.assign(Error("no actor"), {
      it: "Scegli una creatura.",
      en: "Choose a creature.",
    });
  const refuse = (issue) => {
    throw Object.assign(Error(issue.en), { it: issue.it, en: issue.en });
  };
  if (actor.activeForm) {
    const selection = { mode: "normal" };
    const p = forms.previewFormReturn(ctx.state, actor.id, selection, ctx.role);
    if (!p.canApply) refuse(p.errors[0]);
    ctx.commit(
      ctx.t(`${actor.name}: forma originale`, `${actor.name}: original form`),
      (draft) =>
        forms.returnToNormalForm(draft, actor.id, selection, ctx.role, {
          operationId: uid(),
          reviewKey: p.reviewKey,
          online: !ctx.offline,
        }),
      p.commit,
    );
    ctx.toast(
      ctx.t(
        `${actor.name}: di nuovo nella forma originale`,
        `${actor.name}: back in the original form`,
      ),
    );
    return true;
  }
  if (d.preset === "wild-shape") {
    queueMicrotask(() => openForms(ctx, { actorId: actor.id, tab: "forms" }));
    return true;
  }
  if (!d.profileId)
    refuse({
      it: "Scegli la forma: una bestia dell’elenco.",
      en: "Choose the form: a Beast from the list.",
    });
  const selection = transformSelection(d);
  const p = forms.previewTransform(ctx.state, actor.id, selection, ctx.role);
  if (!p.canApply) refuse(p.errors[0]);
  const form = label(ctx, forms.transformProfile(d.profileId)?.name);
  if (d.preset === "polymorph" && d.unwilling) {
    if (!saveDomain)
      refuse({
        it: "Le richieste di tiro non sono disponibili.",
        en: "Roll requests are unavailable.",
      });
    const dc = Number(d.dc);
    let attempt = null;
    ctx.commit(
      ctx.t(
        `Metamorfosi su ${actor.name}: tiro salvezza`,
        `Polymorph on ${actor.name}: saving throw`,
      ),
      (draft) => {
        attempt = saveDomain.commitTransformSave(
          draft,
          { actorId: actor.id, dc, selection },
          ctx.role,
          { operationId: uid() },
        );
      },
    );
    ctx.toast(
      ctx.t(
        `Richiesta inviata: ${actor.name} tira un tiro salvezza su Saggezza CD ${dc}. Se fallisce diventa ${form}.`,
        `Request sent: ${actor.name} makes a DC ${dc} Wisdom saving throw. On a failure it becomes ${form}.`,
      ),
    );
    return true;
  }
  ctx.commit(
    ctx.t(`${actor.name} diventa ${form}`, `${actor.name} becomes ${form}`),
    (draft) =>
      forms.applyTransform(draft, actor.id, selection, ctx.role, {
        operationId: uid(),
        reviewKey: p.reviewKey,
        online: !ctx.offline,
      }),
    p.commit,
  );
  ctx.toast(
    `${forms.formTokenName(ctx.state.actors[actor.id], ctx.lang)} · ${label(ctx, TRANSFORM_KIND[d.preset])}`,
  );
  return true;
}
/** «Trasforma…» / «Metamorfosi…» (token menu, palette): the Transform dialog. */
export async function openTransform(ctx, { actorId = null, preset = "polymorph" } = {}) {
  if (!saveDomain) await loadSaveDomain();
  if (preset === "wild-shape" && actorId) return openForms(ctx, { actorId, tab: "forms" });
  transformDraft = draftFor(ctx, actorId, preset);
  ctx.dialog(
    preset === "polymorph"
      ? ctx.t("Metamorfosi", "Polymorph")
      : ctx.t("Trasforma una creatura", "Transform a creature"),
    `<div class="forms-transform" data-forms-transform>${transformHTML(ctx)}</div>`,
    {
      submitLabel: transformSubmitLabel(ctx),
      cancelLabel: ctx.t("Chiudi", "Close"),
      onSubmit: () => submitTransform(ctx),
    },
  );
  if (typeof document !== "undefined") {
    const root = document.querySelector("#dialog [data-forms-transform]");
    if (root) bindTransform(root, ctx);
  }
}
export const transformState = () => transformDraft;
export function resetTransformUI() {
  transformDraft = null;
}

export function renderFormsSummary(ctx, actorId) {
  try {
    const o = forms.getFormsOverview(ctx.state, actorId, ctx.role);
    let companions = [];
    try {
      companions = forms.listCompanions(ctx.state, actorId, ctx.role) ?? [];
    } catch {
      companions = [];
    }
    // PG-78: D&D Beyond's Extras: each linked creature as a card with its HP and AC.
    const cards = companions
      .map((c) => {
        const creature = ctx.state.actors[c.actorId ?? c.id] ?? c;
        const hp = Number.isFinite(creature.hp) ? `${creature.hp}/${creature.maxHp ?? "—"}` : "—";
        const kind = creature.companion?.kind ?? c.kind;
        return `<article class="forms-card" data-forms-card="${ctx.esc(creature.id)}"><div><strong>${ctx.esc(creature.name ?? "")}</strong><p class="muted">${ctx.esc(kind === "wild-companion" ? ctx.t("Compagno Selvatico", "Wild Companion") : kind === "familiar" ? ctx.t("Famiglio", "Familiar") : ctx.t("Creatura collegata", "Linked creature"))}${creature.companion?.lifecycle && creature.companion.lifecycle !== "available" ? " · " + ctx.esc(val(ctx, creature.companion.lifecycle)) : ""}</p></div><dl class="forms-card-stats"><div><dt>${ctx.t("PF", "HP")}</dt><dd>${ctx.esc(hp)}</dd></div><div><dt>${ctx.t("CA", "AC")}</dt><dd>${ctx.esc(creature.ac ?? "—")}</dd></div></dl>${button(ctx, `data-forms-open-companion="${ctx.esc(creature.id)}"`, "Gestisci", "Manage")}</article>`;
      })
      .join("");
    return `<section class="forms-summary"><h3>${ctx.t("Forme e creature collegate", "Forms and linked creatures")}</h3>${o.activeForm ? `<p>${ctx.t("Forma attiva", "Active form")}: ${ctx.esc(label(ctx, o.activeForm.profile?.name))}</p>` : ""}${cards ? `<div class="forms-cards">${cards}</div>` : ""}<div class="forms-toolbar">${o.activeForm && forms.isTransformation(o.activeForm) ? button(ctx, `data-forms-revert="${ctx.esc(actorId)}"`, "Torna alla forma originale", "Return to original form") : hasWildShape(o) ? button(ctx, `data-forms-entry="${ctx.esc(actorId)}" data-forms-tab="forms"`, "Forma Selvatica", "Wild Shape") : ""}${!o.activeForm && (o.permissions?.canControl || canTransformAny(ctx)) ? button(ctx, `data-forms-transform="${ctx.esc(actorId)}"`, "Trasforma…", "Transform…") : ""}${button(ctx, `data-forms-entry="${ctx.esc(actorId)}" data-forms-tab="companions"`, "Creature collegate", "Linked creatures")}</div></section>`;
  } catch {
    return "";
  }
}
export function bindFormsSummary(root, ctx) {
  root
    .querySelectorAll("[data-forms-revert]")
    .forEach((n) =>
      n.addEventListener("click", () => openTransform(ctx, { actorId: n.dataset.formsRevert })),
    );
  // R3 PG-79: «Trasforma…» beside Wild Shape on Extra › Forme and in the Creature tab.
  root
    .querySelectorAll("[data-forms-transform]")
    .forEach((n) =>
      n.addEventListener("click", () =>
        openTransform(ctx, { actorId: n.dataset.formsTransform, preset: "polymorph" }),
      ),
    );
  root
    .querySelectorAll("[data-forms-open-companion]")
    .forEach((n) =>
      n.addEventListener("click", () =>
        openCompanion(ctx, { actorId: n.dataset.formsOpenCompanion }),
      ),
    );
  root
    .querySelectorAll("[data-forms-entry]")
    .forEach((n) =>
      n.addEventListener("click", () =>
        openForms(ctx, { actorId: n.dataset.formsEntry, tab: n.dataset.formsTab }),
      ),
    );
}
export function refreshFormsUI(ctx) {
  if (!panel || panel.owner !== ctx.role || typeof document === "undefined") return false;
  const root = document.querySelector("#dialog[open] [data-forms-panel]");
  if (!root) return false;
  root.querySelectorAll("[data-forms-details]").forEach((n) => {
    panel.details[n.dataset.formsDetails] = n.open;
  });
  const focused = root.contains(document.activeElement),
    active = document.activeElement;
  const attrs = focused
    ? [...active.attributes].filter((a) => a.name.startsWith("data-")).map((a) => [a.name, a.value])
    : [];
  const range =
    focused && typeof active.selectionStart === "number"
      ? [active.selectionStart, active.selectionEnd]
      : null;
  const dialog = root.closest("dialog"),
    body = root.closest(".dialog-body"),
    top = dialog?.scrollTop,
    bodyTop = body?.scrollTop;
  root.innerHTML = renderFormsPanel(ctx);
  bindFormsPanel(root, ctx);
  if (attrs.length) {
    const node = [...root.querySelectorAll(`[${attrs[0][0]}]`)].find((n) =>
      attrs.every(([key, value]) => n.getAttribute(key) === value),
    );
    node?.focus({ preventScroll: true });
    if (range && node?.setSelectionRange) node.setSelectionRange(...range);
  }
  if (dialog) dialog.scrollTop = top;
  if (body) body.scrollTop = bodyTop;
  return true;
}
export function resetFormsUI() {
  panel = null;
}
