import { rollDie } from "./state.mjs";
import { formatNumber } from "./ui.mjs";
import {
  projectReactions,
  projectMovements,
  projectApproaches,
  confirmApproachAttack,
  cancelApproachAttack,
  resolveReaction,
  resumeMovement,
  changeMovement,
  setReactionOrder,
  resolveAutomaticRolls,
} from "./combat.mjs";
const selections = new Map();
const orders = new Map();
const pending = (m) => ["pending", "awaiting-choice", "blocked"].includes(m.status);
const title = (ctx, r) =>
  r.type === "shield"
    ? ctx.t("Scudo", "Shield")
    : ctx.t("Attacco di opportunità", "Opportunity attack");
const safe = (ctx, fn) => () => {
  try {
    return fn();
  } catch (error) {
    ctx.toast(ctx.label(error.it ? { it: error.it, en: error.en } : error.message), true);
  }
};
export function resetReactionUI() {
  selections.clear();
  orders.clear();
}
export function reactionCount(ctx) {
  return projectReactions(ctx.state, ctx.role).filter((r) => r.status === "pending").length;
}
export function renderInterruptions(ctx) {
  const reactions = projectReactions(ctx.state, ctx.role).filter((r) => r.status === "pending");
  const movements = projectMovements(ctx.state, ctx.role).filter(pending);
  const approaches = projectApproaches(ctx.state, ctx.role).filter((a) =>
    ["awaiting-throw", "blocked"].includes(a.status),
  );
  if (!reactions.length && !movements.length && !approaches.length) return "";
  return `<aside class="interruption-banner" aria-label="${ctx.t("Sequenze in attesa", "Pending sequences")}"><div><strong>${reactions.length ? ctx.t("Puoi scegliere una reazione", "A reaction awaits your choice") : approaches.length ? ctx.t("Attacco dopo l’avvicinamento", "Attack after approaching") : ctx.t("Movimento in attesa", "Movement pending")}</strong><span>${ctx.t("Puoi consultare il tavolo. Le conseguenze collegate attendono la risposta.", "You can inspect the table. Related consequences await a response.")}</span></div><button class="button primary" data-open-interruptions>${ctx.t("Apri richieste", "Open requests")}${reactions.length ? " · " + reactions.length : ""}</button></aside>`;
}
export function renderReactionRequests(ctx) {
  const { t, esc } = ctx;
  const reactions = projectReactions(ctx.state, ctx.role).filter((r) => r.status === "pending");
  const movements = projectMovements(ctx.state, ctx.role).filter(pending);
  // TV-80 (D&D Beyond: one reaction prompt at a time): only the reaction that can be
  // answered now is a card; the simultaneous ones wait in line, named, in the chosen order.
  const ready = reactions.filter((r) => r.canRespond !== false);
  const queued = [...ready.slice(1), ...reactions.filter((r) => r.canRespond === false)];
  const cards =
    ready
      .slice(0, 1)
      .map(
        (r) =>
          `<article class="reaction-card"><div><strong>${esc(r.actorName)} · ${title(ctx, r)}</strong><p>${esc(ctx.label(r.triggerLabel || ""))}</p><span class="muted">${t("Nessuna risorsa spesa dalla proposta", "The offer spends no resources")}</span></div><button class="button primary" data-reaction-open="${esc(r.id)}">${t("Scegli", "Choose")}</button></article>`,
      )
      .join("") +
    (queued.length
      ? `<p class="muted reaction-queue" data-reaction-queue="${queued.length}">${ready.length ? t("Poi, una alla volta", "Next, one at a time") : t("In attesa dell’ordine, una alla volta", "Waiting for the order, one at a time")}: ${queued.map((r) => `${esc(r.actorName)} · ${title(ctx, r)}`).join("; ")}</p>`
      : "");
  const approaches = projectApproaches(ctx.state, ctx.role)
    .filter((a) => ["awaiting-throw", "blocked"].includes(a.status))
    .map(
      (a) =>
        `<section class="movement-request"><h3>${esc(a.actorName)} · ${esc(ctx.label(a.actionName))}</h3>${a.status === "awaiting-throw" ? `<p>${t("Sei arrivato a portata. L’azione non è ancora spesa: lancia i dadi fisici per tentare l’attacco, oppure cambia idea.", "You have arrived within reach. Your action is unspent: roll the physical dice to attempt the attack, or change your mind.")}</p><button class="button primary" data-approach-throw="${esc(a.id)}">${t("Ho lanciato i dadi", "I have rolled the dice")}</button>` : `<p>${esc(ctx.label(a.reason))}</p>`}<button class="button" data-approach-cancel="${esc(a.id)}">${t("Cambia mossa", "Change move")}</button><p class="muted">${t("Cambiare mossa conserva la posizione e il movimento già speso.", "Changing the move keeps your position and movement already spent.")}</p></section>`,
    )
    .join("");
  return (
    approaches +
    (cards
      ? `<section class="reaction-list"><h3>${t("Reazioni da scegliere", "Reactions to choose")}</h3>${cards}</section>`
      : "") +
    movements
      .map(
        (m) =>
          `<section class="movement-request"><h3>${esc(m.actorName)} · ${t("Movimento", "Movement")}</h3><p>${formatNumber(ctx.lang, m.traveledMeters)} m ${t("già percorsi", "already traveled")} · ${formatNumber(ctx.lang, m.remainingPathMeters)} m ${t("nel percorso rimasto", "in the remaining path")}</p>${m.status === "awaiting-choice" ? `<p>${t("Il danno è già applicato. Puoi proseguire sullo stesso percorso oppure cambiare strategia dalla posizione attuale.", "Damage is already applied. Continue on the same path or change strategy from the current position.")}</p><div class="toolbar"><button class="button primary" data-movement-continue="${esc(m.id)}" ${disabledFor(m)}>${t("Continua movimento", "Continue movement")}</button><button class="button" data-movement-change="${esc(m.id)}" ${disabledFor(m)}>${t("Cambia mossa", "Change move")}</button></div>${reasonFor(ctx, m)}` : m.phase === "order" && m.orderRequiresDM ? `<p>${t("Il DM deve coordinare l’ordine di questo evento. Il movimento resta in attesa; puoi continuare a consultare il tavolo.", "The DM needs to coordinate this event’s order. Movement stays pending; you can continue inspecting the table.")}</p>` : m.phase === "order" ? `<p>${t("Queste occasioni sono simultanee. Chi gestisce il turno decide l’ordine; la velocità del clic non dà priorità.", "These opportunities are simultaneous. The turn controller chooses their order; click speed grants no priority.")}</p><button class="button" data-order-open="${esc(m.id)}" ${disabledFor(m)}>${t("Scegli ordine", "Choose order")}</button>${reasonFor(ctx, m)}` : `<p class="muted">${m.status === "blocked" ? esc(ctx.label(m.reason || t("Il percorso non è più disponibile.", "The path is no longer available."))) : t("Le richieste collegate devono risolversi prima di proseguire. Chiudere questa finestra non le rifiuta.", "Linked requests must resolve before proceeding. Closing this window does not decline them.")}</p>${m.status === "blocked" && m.canRespond ? `<button class="button" data-movement-change="${esc(m.id)}">${t("Cambia mossa", "Change move")}</button>` : ""}`}</section>`,
      )
      .join("")
  );
}
// SV-37 (Roll20 errors that name cause and fix): a control this viewer cannot use says why
// and what to do, linked by aria-describedby.
const reasonId = (m) => "movement-reason-" + String(m.id).replace(/[^\w-]/g, "-");
const disabledFor = (m) => (m.canRespond ? "" : `disabled aria-describedby="${reasonId(m)}"`);
const reasonFor = (ctx, m) =>
  m.canRespond
    ? ""
    : `<p class="muted" id="${ctx.esc(reasonId(m))}">${ctx.t("Questo movimento è di una creatura che non controlli. Lo decide chi la gioca o il DM.", "This movement belongs to a creature you do not control. Whoever plays it or the DM decides.")}</p>`;
export function bindReactionRequests(root, ctx, callbacks) {
  root.querySelectorAll("[data-approach-throw]").forEach(
    (b) =>
      (b.onclick = safe(ctx, () => {
        const id = b.dataset.approachThrow;
        ctx.commit(ctx.t("Tentativo dopo avvicinamento", "Attempt after approaching"), (s) => {
          confirmApproachAttack(s, id, ctx.role);
          resolveAutomaticRolls(s, rollDie);
        });
        callbacks.accepted({
          actorId: ctx.state.combatAttempts.find((a) => a.id === id).actorId,
          mode: "physical",
          attemptIds: [id],
        });
      })),
  );
  root.querySelectorAll("[data-approach-cancel]").forEach(
    (b) =>
      (b.onclick = safe(ctx, () => {
        ctx.commit(ctx.t("Attacco successivo annullato", "Follow-up attack cancelled"), (s) =>
          cancelApproachAttack(s, b.dataset.approachCancel, ctx.role),
        );
        ctx.closeDialog();
        ctx.toast(
          ctx.t(
            "Scegli una nuova mossa dalla posizione attuale.",
            "Choose a new move from your current position.",
          ),
        );
      })),
  );
  root
    .querySelectorAll("[data-reaction-open]")
    .forEach((b) => (b.onclick = () => openReaction(ctx, b.dataset.reactionOpen, callbacks)));
  root.querySelectorAll("[data-movement-continue]").forEach(
    (b) =>
      (b.onclick = safe(ctx, () => {
        ctx.commit(ctx.t("Movimento ripreso", "Movement resumed"), (s) => {
          resumeMovement(s, b.dataset.movementContinue, ctx.role);
          resolveAutomaticRolls(s, rollDie);
        });
        callbacks.refresh();
      })),
  );
  root.querySelectorAll("[data-movement-change]").forEach(
    (b) =>
      (b.onclick = safe(ctx, () => {
        ctx.commit(ctx.t("Percorso abbandonato", "Path abandoned"), (s) =>
          changeMovement(s, b.dataset.movementChange, ctx.role),
        );
        ctx.closeDialog();
        ctx.toast(
          ctx.t(
            "Puoi scegliere una nuova mossa dalla posizione attuale.",
            "Choose a new move from your current position.",
          ),
        );
      })),
  );
  root
    .querySelectorAll("[data-order-open]")
    .forEach((b) => (b.onclick = () => openOrder(ctx, b.dataset.orderOpen, callbacks)));
}
function openReaction(ctx, id, callbacks) {
  const r = projectReactions(ctx.state, ctx.role).find(
    (r) => r.id === id && r.status === "pending",
  );
  if (!r || r.canRespond === false) return;
  const { t, esc } = ctx;
  const key = ctx.role + ":" + id;
  const draft = selections.get(key) || { slotLevel: 1, mode: callbacks.mode() };
  const explanation =
    r.type === "shield"
      ? t(
          "Aumenti la CA di 5 fino all’inizio del tuo prossimo turno, anche contro il colpo che ha innescato la reazione. Un 20 naturale resta un colpo; Scudo blocca Dardo incantato.",
          "Gain +5 AC until your next turn starts, including the triggering attack. A natural 20 still hits; Shield blocks Magic Missile.",
        )
      : t(
          "Effettui un attacco in mischia prima che la creatura esca dalla portata. Il movimento successivo attende il risultato.",
          "Make one melee attack before the creature leaves your reach. The rest of the movement awaits the result.",
        );
  const fields =
    r.type === "shield"
      ? `<label class="field">${t("Slot da usare", "Spell slot")}<select name="reactionSlot">${(r.slotLevels || []).map((level) => `<option value="${level.level}" ${level.level === draft.slotLevel ? "selected" : ""} ${level.remaining < 1 ? "disabled" : ""}>${t("Livello ", "Level ")}${level.level} · ${level.remaining ?? t("da verificare", "to verify")}/${level.max}</option>`).join("")}</select></label>`
      : `<label class="field">${t("Dadi dell’attacco", "Attack dice")}<select name="reactionMode"><option value="digital" ${draft.mode === "digital" ? "selected" : ""}>${t("Digitali", "Digital")}</option><option value="physical" ${draft.mode === "physical" ? "selected" : ""}>${t("Fisici", "Physical")}</option></select></label><p class="muted" data-physical-reaction ${draft.mode === "physical" ? "" : "hidden"}>${t("Lancia i dadi fisici prima di confermare il tentativo. Potrai inserire le facce subito o ritrovare il tiro in Richieste.", "Roll your physical dice before confirming the attempt. Enter the faces now or find the roll later in Requests.")}</p>`;
  ctx.dialog(
    r.actorName + " · " + title(ctx, r),
    `<p>${esc(ctx.label(r.triggerLabel || ""))}</p><p>${explanation}</p><p class="reaction-cost">${t("Costo all’uso: reazione", "Cost when used: reaction")}${r.type === "shield" ? " + " + t("slot selezionato", "selected spell slot") : ""}</p>${fields}<button type="button" class="button quiet" data-decline-reaction>${t("Rinuncia per questa occasione", "Decline this opportunity")}</button><p class="muted">${t("Rinunciare non spende la reazione. Esc o Riduci conserva la richiesta senza rispondere.", "Declining does not spend the reaction. Escape or Minimize leaves this request unanswered.")}</p>${r.source?.url ? `<a href="${esc(r.source.url)}" target="_blank" rel="noopener noreferrer">${t("Regola · SRD 2024", "Rule · 2024 SRD")}</a>` : ""}`,
    {
      submitLabel:
        r.type === "shield"
          ? t("Usa Scudo", "Use Shield")
          : draft.mode === "physical"
            ? t("Ho lanciato i dadi", "I have rolled the dice")
            : t("Effettua attacco", "Make attack"),
      cancelLabel: t("Riduci richiesta", "Minimize request"),
      onSubmit: (data) => {
        const before = new Set((ctx.state.combatAttempts || []).map((a) => a.id));
        const mode = data.get("reactionMode") || draft.mode;
        ctx.commit(t("Reazione usata", "Reaction used"), (s) => {
          resolveReaction(
            s,
            id,
            { use: true, slotLevel: Number(data.get("reactionSlot") || 1), mode },
            ctx.role,
          );
          resolveAutomaticRolls(s, rollDie);
        });
        selections.delete(key);
        callbacks.accepted({
          actorId: r.actorId,
          mode,
          attemptIds: (ctx.state.combatAttempts || [])
            .filter((a) => !before.has(a.id))
            .map((a) => a.id),
        });
      },
    },
  );
  const form = document.querySelector("#dialog form");
  form.querySelector("[data-decline-reaction]").onclick = safe(ctx, () => {
    ctx.commit(t("Reazione declinata", "Reaction declined"), (s) => {
      resolveReaction(s, id, { use: false }, ctx.role);
      resolveAutomaticRolls(s, rollDie);
    });
    selections.delete(key);
    callbacks.refresh();
  });
  form.querySelector("[name=reactionSlot]")?.addEventListener("change", (e) => {
    draft.slotLevel = Number(e.target.value);
    selections.set(key, { ...draft });
  });
  form.querySelector("[name=reactionMode]")?.addEventListener("change", (e) => {
    draft.mode = e.target.value;
    selections.set(key, { ...draft });
    form.querySelector("[data-physical-reaction]").hidden = draft.mode !== "physical";
    form.querySelector("[type=submit]").textContent =
      draft.mode === "physical"
        ? t("Ho lanciato i dadi", "I have rolled the dice")
        : t("Effettua attacco", "Make attack");
  });
}
function openOrder(ctx, id, callbacks) {
  const movement = projectMovements(ctx.state, ctx.role).find((m) => m.id === id);
  if (!movement?.canRespond || movement.orderRequiresDM) return;
  const { t, esc } = ctx;
  const candidates = movement.orderCandidates || [];
  let list = (orders.get(id) || candidates.map((c) => c.reactionId)).filter((id) =>
    candidates.some((c) => c.reactionId === id),
  );
  for (const c of candidates) if (!list.includes(c.reactionId)) list.push(c.reactionId);
  ctx.dialog(
    t("Ordine delle occasioni simultanee", "Order simultaneous opportunities"),
    `<p>${t("Registra l’ordine per questo evento. Nessuna reazione viene usata da questa scelta.", "Set the order for this event. This does not use any reaction.")}</p><ol class="reaction-order">${list.map((id, index) => `<li><strong>${esc(candidates.find((c) => c.reactionId === id)?.actorName || t("Creatura riservata", "Private creature"))}</strong><button type="button" class="button" data-order-index="${index}" data-order-step="-1" ${index === 0 ? 'disabled aria-describedby="reaction-order-ends"' : ""}>${t("Anticipa", "Earlier")}</button><button type="button" class="button" data-order-index="${index}" data-order-step="1" ${index === list.length - 1 ? 'disabled aria-describedby="reaction-order-ends"' : ""}>${t("Posticipa", "Later")}</button></li>`).join("")}</ol><p class="muted" id="reaction-order-ends">${t("La prima occasione non può anticipare e l’ultima non può posticipare. Sposta le altre intorno a loro.", "The first opportunity cannot move earlier and the last cannot move later. Move the others around them.")}</p>`,
    {
      submitLabel: t("Applica ordine", "Apply order"),
      cancelLabel: t("Riduci richiesta", "Minimize request"),
      onSubmit: () => {
        ctx.commit(t("Ordine delle reazioni registrato", "Reaction order recorded"), (s) =>
          setReactionOrder(s, id, list, ctx.role),
        );
        orders.delete(id);
        callbacks.refresh();
      },
    },
  );
  document.querySelectorAll("[data-order-index]").forEach(
    (b) =>
      (b.onclick = () => {
        const index = Number(b.dataset.orderIndex),
          target = index + Number(b.dataset.orderStep);
        [list[index], list[target]] = [list[target], list[index]];
        orders.set(id, list);
        openOrder(ctx, id, callbacks);
      }),
  );
}
