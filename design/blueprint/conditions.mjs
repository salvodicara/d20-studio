// Conditions and survival domain (increment 10).
// Pure projections and atomic commands over actor.conditions, actor.exhaustion,
// vitality fields and state.conditionEvents. This module generates no dice and
// stores no pending roll: it returns descriptors and applies accepted outcomes of
// requests that the root keeps in its existing queue. It never imports Forms.
import {
  canControlActor,
  canViewActor,
  isActorAvailable,
  isCampaignActor,
} from "./character-access.mjs";
import { campaignReviewKey, isCampaignMember } from "./campaign-content.mjs";

const copy = (v) => (v === undefined ? undefined : structuredClone(v));
const text = (it, en) => ({ it, en });
const object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v, min = 0) => Number.isSafeInteger(v) && v >= min;
const validId = (v) => typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(v);
const noise = (v) => Math.round(v * 1e6) / 1e6;
const filled = (v, max = 500) => typeof v === "string" && !!v.trim() && v.length <= max;
const hasSource = (v) =>
  object(v) &&
  typeof v.kind === "string" &&
  !!v.kind &&
  typeof v.revision === "string" &&
  !!v.revision;
function deepFreeze(v) {
  if (v && typeof v === "object" && !Object.isFrozen(v)) {
    Object.freeze(v);
    Object.values(v).forEach(deepFreeze);
  }
  return v;
}

const MESSAGES = {
  unavailable: ["Soggetto o dati non disponibili.", "Actor or data unavailable."],
  permission: ["Non puoi gestire questo soggetto.", "You cannot manage this actor."],
  schema: ["Registro delle condizioni non riconosciuto.", "Unrecognized condition record."],
  "operation-id": ["Serve un identificatore valido.", "A valid identifier is required."],
  "id-conflict": [
    "Identificatore già usato per un’altra operazione.",
    "Identifier already used for another operation.",
  ],
  conflict: [
    "I dati pertinenti sono cambiati: rivedi il confronto.",
    "Relevant data changed: review the comparison again.",
  ],
  offline: [
    "Riconnettiti prima di modificare il gioco condiviso.",
    "Reconnect before changing shared gameplay.",
  ],
  selection: ["Scelta non riconosciuta.", "Unrecognized choice."],
  condition: ["Condizione assente dal catalogo SRD.", "Condition not in the SRD catalog."],
  "exhaustion-level": [
    "Indebolimento usa il livello numerico, non un’etichetta.",
    "Exhaustion uses its numeric level, not a label.",
  ],
  source: ["Indica una fonte con tipo e revisione.", "Provide a source with kind and revision."],
  origin: ["Origine non valida o non disponibile per te.", "Origin invalid or unavailable to you."],
  reason: ["Indica un motivo.", "Provide a reason."],
  label: ["Indica un’etichetta breve.", "Provide a short label."],
  visibility: ["Visibilità non valida.", "Invalid visibility."],
  mode: ["Modalità non valida: registrazione o regola.", "Invalid mode: record or rule."],
  instance: ["Applicazione non trovata o non visibile.", "Application not found or not visible."],
  "rest-bound": [
    "Questo sonno termina con il suo riposo: sveglia dal pannello Riposo.",
    "This sleep ends through its rest: wake from the Rest panel.",
  ],
  "cause-bound": [
    "Questa incoscienza deriva da 0 PF: cura o correggi i PF.",
    "This unconsciousness comes from 0 HP: heal or correct HP.",
  ],
  "immunity-unknown": [
    "Immunità alle condizioni non registrate: verificale prima di dichiarare la regola applicata.",
    "Condition immunities are unrecorded: check them before claiming the rule applied.",
  ],
  immune: [
    "La creatura è immune a questa condizione.",
    "The creature is immune to this condition.",
  ],
  "immune-record": [
    "Immunità nota: registrata come decisione esplicita.",
    "Known immunity: recorded as an explicit decision.",
  ],
  "dead-target": ["La creatura è morta.", "The creature is dead."],
  level: ["Livello di Indebolimento da 0 a 6.", "Exhaustion level from 0 to 6."],
  unchanged: ["Nessun cambiamento da applicare.", "No change to apply."],
  "held-items": [
    "Oggetti tenuti sconosciuti: registra cosa è caduto.",
    "Held items unknown: record what was dropped.",
  ],
  items: ["Oggetti non validi.", "Invalid items."],
  patch: ["Nessuna correzione valida.", "No valid correction."],
  "source-owner": [
    "Solo chi ha registrato la fonte può cambiarne la visibilità.",
    "Only whoever recorded the source can change its visibility.",
  ],
  term: ["Termine non valido.", "Invalid end."],
  "no-initiative": [
    "Nessuna iniziativa attiva: il termine attende un turno reale.",
    "No active initiative: the end waits for an actual turn.",
  ],
  "not-prone": ["La creatura non è Prona.", "The creature is not Prone."],
  "cannot-act": ["Il soggetto non può agire ora.", "The actor cannot act now."],
  dead: [
    "Una creatura morta non recupera PF finché la magia non la riporta in vita.",
    "A dead creature regains no HP until magic returns it to life.",
  ],
  "speed-zero": ["Velocità 0: non può rialzarsi.", "Speed 0: it cannot stand up."],
  "speed-unknown": ["Velocità non registrata.", "Speed not recorded."],
  pending: [
    "Risolvi prima la richiesta pendente di questo soggetto.",
    "Resolve this actor's pending request first.",
  ],
  turn: ["Non è il suo turno.", "It is not this creature's turn."],
  movement: [
    "Movimento rimanente insufficiente; nessuno Scatto implicito.",
    "Not enough movement left; no implicit Dash.",
  ],
  "movement-unknown": ["Movimento rimanente non registrato.", "Remaining movement not recorded."],
  "outside-initiative": [
    "Fuori dall’iniziativa: si rialza senza spendere un budget di turno.",
    "Outside initiative: it stands without spending a turn budget.",
  ],
  "prone-remains": ["Resta Prona.", "It remains Prone."],
  amount: ["Serve un importo intero non negativo.", "A non-negative whole amount is required."],
  "hp-unknown": ["PF attuali non registrati.", "Current HP not recorded."],
  "max-hp-unknown": [
    "PF massimi non registrati: danno massiccio e tetto della cura non verificabili.",
    "Maximum HP not recorded: massive damage and the healing cap cannot be checked.",
  ],
  "temp-hp-unknown": ["PF temporanei non validi.", "Temporary HP invalid."],
  "zero-hp-policy": [
    "Politica a 0 PF non registrata: decidi lo stato della creatura.",
    "Zero-HP policy not recorded: decide the creature's state.",
  ],
  "zero-hp-manual": [
    "0 PF con politica manuale: lo stato lo decide il DM.",
    "0 HP under a manual policy: the DM decides the state.",
  ],
  "knockout-not-needed": [
    "Il danno non porta a 0 PF: nessun knockout.",
    "The damage does not reduce to 0 HP: no knockout.",
  ],
  "knockout-melee": [
    "Il knockout richiede un attacco in mischia.",
    "Knockout requires a melee attack.",
  ],
  "correction-not-resurrection": [
    "Correzione dei dati, non una resurrezione eseguita.",
    "Data correction, not a performed resurrection.",
  ],
  "zero-hp-cause-remains": [
    "L’incoscienza da 0 PF resta: terminala se era errata.",
    "Unconsciousness from 0 HP remains: end it if it was wrong.",
  ],
  "zero-hp-without-unconscious": [
    "0 PF senza incoscienza registrata: riconcilia lo stato.",
    "0 HP without recorded unconsciousness: reconcile the state.",
  ],
  exhaustion: ["Livello di Indebolimento non valido.", "Invalid Exhaustion level."],
  "exhaustion-label": [
    "Etichetta Indebolimento senza livello numerico.",
    "Exhaustion label without a numeric level.",
  ],
  "exhaustion-death": [
    "Indebolimento 6 senza morte registrata.",
    "Exhaustion 6 without recorded death.",
  ],
  "stable-recovery-missing": [
    "Stabile senza periodo di recupero registrato.",
    "Stable without a recorded recovery period.",
  ],
  "not-due": [
    "Il tiro salvezza contro la morte non è dovuto ora.",
    "A death saving throw is not due now.",
  ],
  resolved: ["Richiesta già risolta.", "Request already resolved."],
  "not-at-zero": ["La creatura non è più a 0 PF.", "The creature is no longer at 0 HP."],
  stable: ["La creatura è già stabile.", "The creature is already stable."],
  policy: [
    "La politica a 0 PF non prevede tiri contro la morte.",
    "The zero-HP policy has no death saving throws.",
  ],
  values: ["Facce del dado non valide.", "Invalid die faces."],
  descriptor: ["Richiesta di tiro non riconosciuta.", "Roll request not recognized."],
  action: ["L’azione di questo turno è già spesa.", "This turn's action is already spent."],
  "self-aid": ["Serve un’altra creatura che aiuti.", "Another creature must help."],
  "not-dying": ["Il bersaglio non sta morendo.", "The target is not dying."],
  "not-knocked-out": [
    "Il bersaglio non è privo di sensi per knockout.",
    "The target is not knocked out.",
  ],
  "medicine-unknown": [
    "Modificatore di Saggezza (Medicina) non registrato.",
    "Wisdom (Medicine) modifier not recorded.",
  ],
  "fear-sight": [
    "Spaventato: lo svantaggio dipende dal vedere la fonte, da verificare.",
    "Frightened: Disadvantage depends on seeing the source; check it.",
  ],
  ability: ["Caratteristica non valida.", "Invalid ability."],
  "not-stable": [
    "La creatura non è stabile in attesa di recupero.",
    "The creature is not stable awaiting recovery.",
  ],
  "stability-changed": ["La stabilità è cambiata.", "Stability changed."],
  distance: [
    "Serve la distanza reale per Prono e colpi critici ravvicinati.",
    "Actual distance is needed for Prone and close critical hits.",
  ],
  "source-sight": [
    "Serve sapere se la fonte della paura è in vista.",
    "It must be known whether the source of fear is in sight.",
  ],
  "grappler-unknown": ["Chi afferra non è registrato.", "The grappler is not recorded."],
  "charmer-unknown": ["Chi affascina non è registrato.", "The charmer is not recorded."],
  "target-sight": [
    "Serve sapere se il bersaglio vede l’attaccante invisibile.",
    "It must be known whether the target sees the invisible attacker.",
  ],
  "attacker-sight": [
    "Serve sapere se l’attaccante vede il bersaglio invisibile.",
    "It must be known whether the attacker sees the invisible target.",
  ],
  "max-hp-zero": [
    "Un massimo di 0 PF uccide la creatura: registra la morte con «Morto», non con il massimo.",
    "A 0 Hit Point maximum kills the creature: record the death with “Dead”, not the maximum.",
  ],
  "zero-by-correction": [
    "Una correzione non porta a 0 PF: registra la caduta con Danno.",
    "A correction does not drop to 0 HP: record the fall with Damage.",
  ],
  "death-count": [
    "Tre fallimenti significano morte: segna anche Morto, oppure correggi il conteggio.",
    "Three failures mean death: also mark Dead, or correct the count.",
  ],
  "stable-count": [
    "Tre successi significano stabile: segna anche Stabile, oppure correggi il conteggio.",
    "Three successes mean stable: also mark Stable, or correct the count.",
  ],
  "temp-hp-choice": [
    "I PF temporanei non si sommano: scegli se tenere quelli attuali o prendere i nuovi.",
    "Temporary HP do not stack: choose whether to keep the current ones or take the new ones.",
  ],
  "temp-hp-keep": [
    "Tieni i PF temporanei attuali: nulla cambia.",
    "You keep the current Temporary HP: nothing changes.",
  ],
  "temp-hp-zero": [
    "A 0 PF i PF temporanei non fanno riprendere i sensi: serve una vera cura.",
    "At 0 HP, Temporary HP do not restore consciousness: only true healing does.",
  ],
  "max-hp-assumed": [
    "PF massimi non registrati: recupera comunque 1 PF, il massimo resta da registrare.",
    "Maximum HP not recorded: it still regains 1 HP; the maximum still needs recording.",
  ],
};
const issue = (code, it, en) => ({ code, it, en });
const message = (code) => issue(code, ...(MESSAGES[code] ?? MESSAGES.unavailable));
function fail(code = "unavailable", it, en) {
  if (it === undefined) [it, en] = MESSAGES[code] ?? MESSAGES.unavailable;
  throw Object.assign(new Error(en), { code, it, en });
}

// ---------------------------------------------------------------- sources

const EN_URL = "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf";
const EN_SHA = "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87";
const IT_URL = "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf";
const IT_SHA = "a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718";
const srd = (en, it) =>
  deepFreeze({
    kind: "srd",
    edition: "2024",
    revision: "5.2.1",
    sha256: EN_SHA,
    url: EN_URL,
    pages: en,
    en: { url: EN_URL, sha256: EN_SHA, pages: en },
    it: { url: IT_URL, sha256: IT_SHA, pages: it },
  });
const ZERO_HP = srd([17], [19]);
const DEATH_SAVES = srd([17, 18], [19, 20]);
const AT_ZERO = srd([18], [20]);
const STABILIZE = srd([18], [20]);
const KNOCKOUT = srd([17], [19]);
const DEAD_SOURCE = srd([180], [210]);

const EFFECTS = {
  "cannot-see": text("Non può vedere", "Cannot see"),
  "sight-checks-fail": text(
    "Fallisce le prove che richiedono la vista",
    "Fails ability checks that require sight",
  ),
  "attack-disadvantage": text(
    "Svantaggio ai propri tiri per colpire",
    "Disadvantage on its own attack rolls",
  ),
  "attack-advantage": text(
    "Vantaggio ai propri attacchi se il bersaglio non la vede",
    "Advantage on its attacks when the target cannot see it",
  ),
  "attacked-advantage": text(
    "Vantaggio agli attacchi contro di lei",
    "Attack rolls against it have Advantage",
  ),
  "attacked-disadvantage": text(
    "Svantaggio agli attacchi contro di lei se l’attaccante non la vede",
    "Attack rolls against it have Disadvantage when the attacker cannot see it",
  ),
  "cannot-attack-charmer": text(
    "Non può attaccare chi l’ha affascinata (origine registrata)",
    "Cannot attack the charmer (recorded origin)",
  ),
  "cannot-harm-charmer": text(
    "Non può bersagliare chi l’ha affascinata con capacità o effetti magici dannosi",
    "Cannot target the charmer with damaging abilities or magical effects",
  ),
  "charmer-social-advantage": text(
    "Chi affascina ha vantaggio nelle prove sociali con lei",
    "The charmer has Advantage on social checks with it",
  ),
  "cannot-hear": text("Non può sentire", "Cannot hear"),
  "hearing-checks-fail": text(
    "Fallisce le prove che richiedono l’udito",
    "Fails ability checks that require hearing",
  ),
  "d20-penalty": text("−2 per livello alle prove con d20", "−2 per level to d20 Tests"),
  "exhaustion-initiative": text(
    "Il −2 per livello vale anche per l’Iniziativa: includilo nel bonus dichiarato",
    "The −2 per level also applies to Initiative: include it in the declared bonus",
  ),
  "speed-penalty": text("−1,5 m di Velocità per livello", "−5 feet (1.5 m) Speed per level"),
  "death-at-6": text("Morte al livello 6", "Death at level 6"),
  "long-rest-reduces": text(
    "Un riposo lungo rimuove un livello (flusso Riposo)",
    "A Long Rest removes one level (Rest flow)",
  ),
  "fear-attack-check-disadvantage": text(
    "Svantaggio ad attacchi e prove mentre la fonte è in vista",
    "Disadvantage on attacks and checks while the source is in sight",
  ),
  "cannot-approach-source": text(
    "Non può avvicinarsi volontariamente alla fonte",
    "Cannot willingly move closer to the source",
  ),
  "speed-zero": text("Velocità 0, non aumentabile", "Speed 0, cannot increase"),
  "grappled-attack-disadvantage": text(
    "Svantaggio agli attacchi contro chi non la afferra",
    "Disadvantage on attacks against anyone but the grappler",
  ),
  "movable-by-grappler": text(
    "Chi afferra può trascinarla o trasportarla",
    "The grappler can drag or carry it",
  ),
  "no-actions": text(
    "Niente azioni, azioni bonus o reazioni",
    "No actions, Bonus Actions or Reactions",
  ),
  "concentration-ends": text("La concentrazione termina", "Concentration ends"),
  "no-speech": text("Non può parlare", "Cannot speak"),
  "initiative-disadvantage": text(
    "Svantaggio all’iniziativa se presente al tiro",
    "Disadvantage on Initiative if present when rolled",
  ),
  "initiative-advantage": text(
    "Vantaggio all’iniziativa se presente al tiro",
    "Advantage on Initiative if present when rolled",
  ),
  concealed: text(
    "Non subisce effetti che richiedono di vederla; equipaggiamento nascosto",
    "Unaffected by effects that require seeing it; its gear is concealed",
  ),
  "includes-incapacitated": text("Include Incapacitato", "Includes Incapacitated"),
  "includes-prone": text(
    "Include Prono, come applicazione distinta",
    "Includes Prone as a distinct application",
  ),
  "auto-fail-str-dex": text(
    "Fallisce automaticamente i TS di Forza e Destrezza",
    "Automatically fails Strength and Dexterity saves",
  ),
  "critical-within-1-5m": text(
    "Un colpo da entro 1,5 m è un colpo critico",
    "A hit from within 5 feet (1.5 m) is a Critical Hit",
  ),
  "poisoned-immunity": text("Immunità ad Avvelenato", "Immunity to Poisoned"),
  "inanimate-substance": text(
    "Sostanza inanimata: peso ×10, non invecchia",
    "Inanimate substance: weight ×10, no aging",
  ),
  "resist-all-damage": text("Resistenza a tutti i danni", "Resistance to all damage"),
  "check-disadvantage": text(
    "Svantaggio alle prove di caratteristica",
    "Disadvantage on ability checks",
  ),
  "crawl-or-stand": text(
    "Solo strisciare, o spendere metà Velocità per rialzarsi",
    "Only crawl, or spend half Speed to stand up",
  ),
  "prone-distance": text(
    "Attacchi contro: vantaggio entro 1,5 m, altrimenti svantaggio",
    "Attacks against it: Advantage within 5 feet (1.5 m), otherwise Disadvantage",
  ),
  "dex-save-disadvantage": text("Svantaggio ai TS di Destrezza", "Disadvantage on Dexterity saves"),
  "drop-held-items": text("Lascia cadere gli oggetti tenuti noti", "Drops known held items"),
  "remains-prone": text("Al termine resta Prona", "Remains Prone when it ends"),
  unaware: text("Non è consapevole dell’ambiente", "Unaware of its surroundings"),
};
// id | Italian | English | EN pages | IT pages | supported effects | manual effects
const DEFINITIONS = `
blinded|Accecato|Blinded|177|202|cannot-see attack-disadvantage attacked-advantage|sight-checks-fail
charmed|Affascinato|Charmed|178|202|cannot-attack-charmer|cannot-harm-charmer charmer-social-advantage
deafened|Assordato|Deafened|181|204|cannot-hear|hearing-checks-fail
exhaustion|Indebolimento|Exhaustion|181|208|d20-penalty speed-penalty death-at-6 long-rest-reduces|exhaustion-initiative
frightened|Spaventato|Frightened|182|216|fear-attack-check-disadvantage|cannot-approach-source
grappled|Afferrato|Grappled|182|203|speed-zero grappled-attack-disadvantage|movable-by-grappler
incapacitated|Incapacitato|Incapacitated|184|208|no-actions concentration-ends no-speech|initiative-disadvantage
invisible|Invisibile|Invisible|184|209|attack-advantage attacked-disadvantage|initiative-advantage concealed
paralyzed|Paralizzato|Paralyzed|186|210|includes-incapacitated speed-zero auto-fail-str-dex attacked-advantage critical-within-1-5m|
petrified|Pietrificato|Petrified|186|211|includes-incapacitated speed-zero auto-fail-str-dex attacked-advantage poisoned-immunity|inanimate-substance resist-all-damage
poisoned|Avvelenato|Poisoned|186|204|attack-disadvantage check-disadvantage|
prone|Prono|Prone|186|212|crawl-or-stand attack-disadvantage prone-distance|
restrained|Trattenuto|Restrained|187|218|speed-zero attack-disadvantage attacked-advantage dex-save-disadvantage|
stunned|Stordito|Stunned|189|216|includes-incapacitated auto-fail-str-dex attacked-advantage|
unconscious|Privo di sensi|Unconscious|191|212|includes-incapacitated includes-prone drop-held-items speed-zero attacked-advantage auto-fail-str-dex critical-within-1-5m remains-prone|unaware
`
  .trim()
  .split("\n")
  .map((line) => line.split("|"));
const codes = (list) => list.split(" ").filter(Boolean);
const effect = (code) => ({ code, ...EFFECTS[code] });
const CATALOG = deepFreeze(
  DEFINITIONS.map(([id, it, en, pagesEn, pagesIt, supported, manual]) => ({
    id,
    name: text(it, en),
    source: srd([Number(pagesEn)], [Number(pagesIt)]),
    supported: codes(supported).map(effect),
    manual: codes(manual).map(effect),
  })),
);
const DEF = new Map(CATALOG.map((row) => [row.id, row]));
const ORDER = CATALOG.map((row) => row.id);
const nameOf = (id) => DEF.get(id)?.name ?? text(id, id);

const INCLUDES_INCAPACITATED = ["paralyzed", "petrified", "stunned", "unconscious"];
const SPEED_ZERO = ["grappled", "paralyzed", "petrified", "restrained", "unconscious"];
const ATTACKED_ADVANTAGE = [
  "blinded",
  "paralyzed",
  "petrified",
  "restrained",
  "stunned",
  "unconscious",
];
const OWN_DISADVANTAGE = ["blinded", "poisoned", "prone", "restrained"];
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
const POLICIES = ["death-saves", "death", "disappear", "manual"];
const TOUCH = 1.5;
const HOUR = 3600;

const L = {
  hp: text("PF", "HP"),
  maxHp: text("PF massimi", "Maximum HP"),
  tempHp: text("PF temporanei", "Temporary HP"),
  dead: text("Morto", "Dead"),
  successes: text("Successi contro la morte", "Death save successes"),
  failures: text("Fallimenti contro la morte", "Death save failures"),
  stable: text("Stabile", "Stable"),
  recovery: text("Recupero da stabile", "Stable recovery"),
  concentration: text("Concentrazione", "Concentration"),
  held: text("Oggetti tenuti", "Held items"),
  dropped: text("Oggetti caduti", "Dropped items"),
  origin: text("Origine", "Origin"),
  term: text("Termine", "End"),
  sourceVisibility: text("Visibilità della fonte", "Source visibility"),
  exhaustion: text("Indebolimento", "Exhaustion"),
  movement: text("Movimento rimanente", "Movement left"),
  policy: text("Politica a 0 PF", "Zero-HP policy"),
  action: text("Azione", "Action"),
};
const EVENT_LABEL = {
  apply: text("Condizione applicata", "Condition applied"),
  end: text("Condizione terminata", "Condition ended"),
  correct: text("Condizione corretta", "Condition corrected"),
  exhaustion: text("Indebolimento aggiornato", "Exhaustion updated"),
  custom: text("Etichetta manuale", "Manual label"),
  "held-items": text("Oggetti tenuti riconciliati", "Held items reconciled"),
  stand: text("Si rialza", "Stands up"),
  damage: text("Danno", "Damage"),
  healing: text("Cura", "Healing"),
  "vitality-correct": text("Correzione dello stato vitale", "Vitality correction"),
  "temp-hp": text("PF temporanei", "Temporary HP"),
  aid: text("Aiuto con Medicina", "Medicine aid"),
  roll: text("Esito del tiro", "Roll outcome"),
  expired: text("Termine raggiunto", "End reached"),
  recovered: text("Recupero da stabile", "Stable recovery"),
  observed: text("Evento osservato", "Observed event"),
};

// ---------------------------------------------------------------- access

const localActor = (a) =>
  a.visibility === "private" || (Array.isArray(a.campaignIds) && a.campaignIds.length === 0);
function canRead(s, a, v) {
  return (
    object(a) &&
    canViewActor(a, v, s) &&
    (localActor(a)
      ? a.owner === v || (Array.isArray(a.controllers) && a.controllers.includes(v))
      : isCampaignMember(s, s.campaign?.id, v) && isCampaignActor(a, s.campaign?.id))
  );
}
const canControl = (s, a, v) => canRead(s, a, v) && canControlActor(a, v, s);
// The observable projection of a creature: a token the viewer can see on the active
// scene. It exposes the id and name only, never sheet data, so a player can name a
// visible creature as the cause of a condition or as the turn that ends it.
function observable(s, a, v) {
  if (!object(a) || localActor(a) || a.hidden === true || !isActorAvailable(a)) return false;
  if (!isCampaignActor(a, s.campaign?.id) || !isCampaignMember(s, s.campaign?.id, v)) return false;
  const scene = (s.scenes ?? []).find((x) => x.id === s.activeSceneId);
  const token = scene?.tokens?.find((t) => t.actorId === a.id);
  return !!token && token.hidden !== true && token.visible !== false;
}
const nameable = (s, a, v) => canRead(s, a, v) || observable(s, a, v);
/**
 * The single audience for a creature's vitals (HP, temporary HP, death-save counts and
 * vital roll results): whoever can read its sheet, as in the conditions overview.
 */
/**
 * Names a player must not see through (TV-141, Fantasy Grounds ID and Foundry Anonymous):
 * the unidentified name of the knowledge area (B46) and a name hidden from the token menu
 * (B12), while the creature still wears it. Read from their slices without importing them.
 */
export function disguises(state) {
  const out = [];
  for (const [actorId, r] of Object.entries(state?.ext?.knowledge?.identities ?? {}))
    if (r?.trueName && r.alias && state.actors?.[actorId]?.name === r.alias)
      out.push({ actorId, trueName: String(r.trueName), alias: String(r.alias) });
  for (const [actorId, r] of Object.entries(state?.ext?.["token-menu"]?.names ?? {})) {
    const shown = state.actors?.[actorId]?.name;
    if (r?.hidden && r.trueName && shown && shown !== r.trueName)
      out.push({ actorId, trueName: String(r.trueName), alias: String(shown) });
  }
  return out.filter((d) => d.trueName.trim()).sort((a, b) => b.trueName.length - a.trueName.length);
}
/** Replaces every true name with its current disguise (whole words, retroactively). */
export function maskNames(value, list) {
  let out = String(value ?? "");
  for (const d of list ?? []) {
    const escaped = d.trueName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "gu"), `$1${d.alias}`);
  }
  return out;
}
export function canReadVitals(s, a, v) {
  return canRead(s, a, v);
}
function actorFor(s, id, v) {
  const a = s?.actors?.[id];
  if (!canRead(s, a, v)) fail("unavailable");
  return a;
}
const commitFor = (a, hidden = false) =>
  localActor(a)
    ? { local: true, visibility: "private" }
    : { local: false, visibility: hidden ? "private" : "shared" };
const originCampaign = (s, a) => (localActor(a) ? null : (s.campaign?.id ?? null));
const clockIdFor = (s, a) => (localActor(a) ? "personal:" + a.id : (s.campaign?.id ?? null));
const clockNow = (s, id) => {
  const seconds = s.restTime?.clocks?.[id]?.seconds;
  return integer(seconds) ? seconds : 0;
};
const turnActor = (s) => (s.combat?.active ? (s.combat.order?.[s.combat.turn] ?? null) : null);
/**
 * Index-independent identity of the turn under way: encounter, round and the acting
 * creature. Removing or adding another creature in the order never changes it, so
 * next-turn terms, once-per-turn limits and death-save triggers stay bound to the
 * actual turn. Combat, forms and conditions share this one definition.
 */
export function combatTurnKey(combat) {
  if (!combat) return null;
  return [combat.encounterId ?? "demo", combat.round, combat.order?.[combat.turn] ?? null].join(
    ":",
  );
}
const turnKeyOf = (s) => (s.combat?.active ? combatTurnKey(s.combat) : null);
const inCombat = (s, id) => !!s.combat?.active && !!s.combat.order?.includes(id);
function events(s) {
  if (s.conditionEvents === undefined) return [];
  if (!Array.isArray(s.conditionEvents)) fail("schema");
  return s.conditionEvents;
}
function record(s, entry) {
  events(s);
  (s.conditionEvents ??= []).push(copy(entry));
}

// ---------------------------------------------------------------- instances

function blank(id, instanceId, extra = {}) {
  return {
    id,
    instanceId,
    source: null,
    origin: null,
    owner: null,
    visibility: "shared",
    sourceVisibility: "shared",
    originCampaignId: null,
    term: null,
    restId: null,
    cause: null,
    reconciliation: [],
    ...extra,
  };
}
function uniqueId(base, used) {
  let id = base;
  for (let k = 1; used.has(id); k++) id = `${base}:${k}`;
  used.add(id);
  return id;
}
function normalizeEntry(c, used, counters) {
  const counted = (id) => (counters[id] = (counters[id] ?? -1) + 1);
  if (typeof c === "string") {
    if (!c) return null;
    return blank(c, uniqueId(`legacy:${c}:${counted(c)}`, used), { legacy: true });
  }
  if (!object(c) || typeof c.id !== "string" || !c.id || c.active === false) return null;
  if (typeof c.instanceId === "string" && c.instanceId) {
    const out = { ...blank(c.id, c.instanceId), ...copy(c) };
    if (!Array.isArray(out.reconciliation)) out.reconciliation = [];
    return out;
  }
  const restBound = typeof c.restId === "string" && !!c.restId;
  const instanceId = restBound
    ? uniqueId(`rest:${c.restId}:${c.id}`, used)
    : uniqueId(`legacy:${c.id}:${counted(c.id)}`, used);
  return {
    ...blank(c.id, instanceId),
    ...copy(c),
    instanceId,
    legacy: true,
    cause: c.cause ?? (restBound && c.id === "unconscious" ? "sleep" : null),
    reconciliation: Array.isArray(c.reconciliation) ? copy(c.reconciliation) : [],
  };
}
function explicitIds(raw) {
  return new Set(
    raw.filter((c) => object(c) && typeof c.instanceId === "string").map((c) => c.instanceId),
  );
}
// Active applications with stable identifiers; legacy entries are projected, not rewritten.
function instancesOf(a) {
  const raw = Array.isArray(a?.conditions) ? a.conditions : [];
  const used = explicitIds(raw),
    counters = {};
  return raw.map((c) => normalizeEntry(c, used, counters)).filter(Boolean);
}
// Commands may normalize the touched actor; unknown provenance stays unknown.
function normalizeActor(a) {
  const raw = Array.isArray(a.conditions) ? a.conditions : [];
  const used = explicitIds(raw),
    counters = {};
  a.conditions = raw.map((c) => normalizeEntry(c, used, counters) ?? c);
}
function effectiveIds(list, a) {
  const ids = new Set(list.filter((i) => !i.custom).map((i) => i.id));
  if (a?.incapacitated === true) ids.add("incapacitated");
  if (a?.blinded === true) ids.add("blinded");
  if (integer(a?.exhaustion, 1)) ids.add("exhaustion");
  if (INCLUDES_INCAPACITATED.some((id) => ids.has(id))) ids.add("incapacitated");
  if (ids.has("unconscious")) ids.add("prone");
  // Petrified grants immunity to Poisoned: an existing application imposes nothing
  // while it lasts (SRD EN 186 / IT 211). The instance itself stays recorded.
  if (ids.has("petrified")) ids.delete("poisoned");
  return ids;
}
const visibleInstance = (i, v) => i.visibility !== "private" || i.owner === v;
const metaOf = (i) => ({
  instanceId: i.instanceId,
  owner: i.owner ?? null,
  visibility: i.visibility ?? "shared",
  sourceVisibility: i.sourceVisibility ?? "shared",
});
function boundReason(a, i) {
  if (i.cause === "sleep" || (i.id === "unconscious" && i.restId)) return "rest-bound";
  if (i.cause === "zero-hp" && a.hp === 0 && a.dead !== true) return "cause-bound";
  return null;
}
function exhaustionOf(a) {
  const v = a?.exhaustion;
  if (v === undefined || v === null) return { level: 0, valid: true };
  return integer(v) && v <= 6 ? { level: v, valid: true } : { level: null, valid: false };
}
function deathSavesOf(a) {
  const d = object(a?.deathSaves) ? a.deathSaves : {};
  return {
    successes: integer(d.successes) ? Math.min(3, d.successes) : 0,
    failures: integer(d.failures) ? Math.min(3, d.failures) : 0,
    stable: d.stable === true,
    recovery: object(d.recovery) ? copy(d.recovery) : null,
  };
}
const RESET = () => ({ successes: 0, failures: 0, stable: false, recovery: null });
const policyOf = (a) =>
  POLICIES.includes(a?.vitalityPolicy?.zeroHp) ? a.vitalityPolicy.zeroHp : null;
const dyingNow = (a) =>
  a.hp === 0 && a.dead !== true && policyOf(a) === "death-saves" && !deathSavesOf(a).stable;

// ---------------------------------------------------------------- queries

export function listConditionDefinitions({ query } = {}) {
  const q = typeof query === "string" ? query.trim().toLowerCase() : "";
  return copy(
    CATALOG.filter(
      (row) =>
        !q ||
        row.id.includes(q) ||
        row.name.it.toLowerCase().includes(q) ||
        row.name.en.toLowerCase().includes(q),
    ),
  );
}

export function hasCondition(actor, definitionId) {
  return !!actor && effectiveIds(instancesOf(actor), actor).has(definitionId);
}

function reasonFor(id, extra = {}) {
  return { conditionId: id, name: copy(nameOf(id)), ...extra };
}
function mechanicsFrom(list, a, baseSpeed) {
  const ids = effectiveIds(list, a),
    has = (id) => ids.has(id);
  const reasons = (from) => from.filter(has).map((id) => reasonFor(id));
  const reconciliation = [];
  const ex = exhaustionOf(a);
  if (!ex.valid) reconciliation.push(message("exhaustion"));
  if (list.some((i) => i.id === "exhaustion")) reconciliation.push(message("exhaustion-label"));
  const level = ex.level ?? 0;
  const base = Number.isFinite(baseSpeed) ? baseSpeed : a?.speed;
  const speedZero = SPEED_ZERO.some(has);
  const speedPenalty = noise(1.5 * level);
  let speed = null;
  if (Number.isFinite(base)) speed = speedZero ? 0 : Math.max(0, noise(base - speedPenalty));
  else reconciliation.push(message("speed-unknown"));
  const incapacitated = has("incapacitated");
  const attackDisadvantage = reasons(OWN_DISADVANTAGE);
  if (has("frightened"))
    attackDisadvantage.push(reasonFor("frightened", { requires: "source-in-sight" }));
  if (has("grappled"))
    attackDisadvantage.push(reasonFor("grappled", { requires: "target-not-grappler" }));
  const checkDisadvantage = reasons(["poisoned"]);
  if (has("frightened"))
    checkDisadvantage.push(reasonFor("frightened", { requires: "source-in-sight" }));
  const limitations = [];
  for (const id of ORDER)
    if (has(id))
      for (const m of DEF.get(id).manual) limitations.push({ conditionId: id, ...copy(m) });
  const known = ORDER.filter(has);
  return {
    conditionIds: [...known, ...[...ids].filter((id) => !DEF.has(id)).sort()],
    incapacitated,
    cannotSpeak: incapacitated,
    cannotSee: has("blinded"),
    cannotHear: has("deafened"),
    speedZero,
    speedPenalty,
    speed,
    crawling: has("prone"),
    exhaustion: ex.level,
    d20Penalty: 2 * level,
    autoFailSaves: INCLUDES_INCAPACITATED.some(has) ? ["str", "dex"] : [],
    dexSaveDisadvantage: reasons(["restrained"]),
    attackDisadvantage,
    attackAdvantage: has("invisible")
      ? [reasonFor("invisible", { requires: "target-cannot-see" })]
      : [],
    attacksAgainstAdvantage: reasons(ATTACKED_ADVANTAGE),
    attacksAgainstDisadvantage: has("invisible")
      ? [reasonFor("invisible", { requires: "attacker-cannot-see" })]
      : [],
    attacksAgainstByDistance: has("prone")
      ? [reasonFor("prone", { withinMeters: TOUCH, within: "advantage", beyond: "disadvantage" })]
      : [],
    criticalWithinMeters: has("paralyzed") || has("unconscious") ? TOUCH : null,
    checkDisadvantage,
    initiative: {
      advantage: has("invisible") ? [reasonFor("invisible")] : [],
      disadvantage: incapacitated ? [reasonFor("incapacitated")] : [],
    },
    dead: a?.dead === true,
    reconciliation,
    limitations,
  };
}

export function getConditionMechanics(actor, { baseSpeed } = {}) {
  return mechanicsFrom(instancesOf(actor), actor, baseSpeed);
}

// ---------------------------------------------------------------- private applications

// A private application still imposes its rules everywhere (sheet, Table, requests):
// viewers who cannot see it get the same effect with an anonymous reason, never its
// name, so the sheet and the Table always agree and nothing private leaks.
const PRIVATE_EFFECT = text("Effetto riservato", "Private effect");
function hiddenIdsFor(a, v) {
  const all = instancesOf(a);
  const shown = all.filter((i) => visibleInstance(i, v));
  if (shown.length === all.length) return new Set();
  const visible = effectiveIds(shown, a);
  return new Set([...effectiveIds(all, a)].filter((id) => !visible.has(id)));
}
/** Condition ids that affect the actor only through applications the viewer cannot see. */
export function hiddenConditionIds(actor, viewer) {
  return object(actor) ? [...hiddenIdsFor(actor, viewer)] : [];
}
function anonymousReason(r) {
  const out = { conditionId: null, name: copy(PRIVATE_EFFECT), private: true };
  for (const key of ["side", "requires", "withinMeters", "within", "beyond"])
    if (r[key] !== undefined) out[key] = r[key];
  return out;
}
function hideReasons(list, hidden) {
  const out = [];
  for (const r of list ?? []) {
    const next = hidden.has(r.conditionId) ? anonymousReason(r) : r;
    if (next.private && out.some((x) => x.private && x.side === next.side)) continue;
    out.push(next);
  }
  return out;
}
const REASON_LISTS = [
  "attackDisadvantage",
  "attackAdvantage",
  "attacksAgainstAdvantage",
  "attacksAgainstDisadvantage",
  "attacksAgainstByDistance",
  "checkDisadvantage",
  "dexSaveDisadvantage",
];
function hideMechanics(m, hidden) {
  if (!hidden.size) return m;
  const out = { ...m, conditionIds: m.conditionIds.filter((id) => !hidden.has(id)) };
  for (const key of REASON_LISTS) out[key] = hideReasons(m[key], hidden);
  out.initiative = {
    advantage: hideReasons(m.initiative.advantage, hidden),
    disadvantage: hideReasons(m.initiative.disadvantage, hidden),
  };
  out.limitations = m.limitations.filter((l) => !hidden.has(l.conditionId));
  out.privateEffects = true;
  return out;
}
/**
 * Projects the condition reasons of an attack, save or automatic failure for one
 * viewer: reasons coming only from applications that viewer cannot see stay in the
 * result with an anonymous name. `actors` names the attacker, target or roller.
 */
export function projectConditionReasons(rules, { attacker, target, actor } = {}, viewer) {
  if (!object(rules)) return rules;
  const sets = {
    attacker: object(attacker) ? hiddenIdsFor(attacker, viewer) : new Set(),
    target: object(target) ? hiddenIdsFor(target, viewer) : new Set(),
    self: object(actor) ? hiddenIdsFor(actor, viewer) : new Set(),
  };
  const setFor = (r) =>
    r.side === "target" ? sets.target : r.side === "attacker" ? sets.attacker : sets.self;
  const map = (list) =>
    Array.isArray(list)
      ? list.map((r) => (setFor(r).has(r.conditionId) ? anonymousReason(r) : r))
      : list;
  return {
    ...rules,
    advantage: map(rules.advantage),
    disadvantage: map(rules.disadvantage),
    ...(rules.autoFailReasons ? { autoFailReasons: map(rules.autoFailReasons) } : {}),
    ...(rules.unresolved
      ? {
          unresolved: rules.unresolved.map((u) =>
            sets.attacker.has(u.conditionId) ||
            sets.target.has(u.conditionId) ||
            sets.self.has(u.conditionId)
              ? {
                  code: "private-effect",
                  it: "Effetto riservato: lo verifica il DM",
                  en: "Private effect: the DM checks it",
                  conditionId: null,
                  private: true,
                }
              : u,
          ),
        }
      : {}),
  };
}

const exhaustionSources = (a) => {
  const level = exhaustionOf(a).level ?? 0;
  return level > 0
    ? [
        {
          kind: "exhaustion",
          level,
          value: -2 * level,
          label: copy(L.exhaustion),
          source: copy(DEF.get("exhaustion").source),
        },
      ]
    : [];
};
const originIds = (list, id) =>
  list.filter((i) => i.id === id).map((i) => i.origin?.actorId ?? null);

/**
 * `canSeeSource` is a boolean or a function (sourceActorId) → boolean|undefined for a
 * Frightened attacker: the source of fear within line of sight (SRD EN 182 / IT 216).
 * `facts` holds explicit answers when an origin is unknown: `source-sight` (the source
 * is in sight), `grappler-unknown` / `charmer-unknown` (the target is that creature).
 */
export function conditionAttackRules(
  attacker,
  target,
  { distanceMeters, canSeeSource, targetCanSeeAttacker, attackerCanSeeTarget, facts } = {},
) {
  const own = instancesOf(attacker),
    other = instancesOf(target);
  const A = effectiveIds(own, attacker),
    T = effectiveIds(other, target);
  const advantage = [],
    disadvantage = [],
    unresolved = [];
  const unknown = (code, conditionId) => unresolved.push({ ...message(code), conditionId });
  const near = Number.isFinite(distanceMeters) ? distanceMeters <= TOUCH + 1e-9 : null;
  let canAttack = true;
  for (const id of OWN_DISADVANTAGE)
    if (A.has(id)) disadvantage.push(reasonFor(id, { side: "attacker" }));
  const fact = (code) => (typeof facts?.[code] === "boolean" ? facts[code] : undefined);
  if (A.has("frightened")) {
    const seen =
      typeof canSeeSource === "function"
        ? originIds(own, "frightened").map((id) => (id === null ? undefined : canSeeSource(id)))
        : [canSeeSource];
    if (seen.includes(true) || fact("source-sight") === true)
      disadvantage.push(reasonFor("frightened", { side: "attacker" }));
    else if (seen.includes(undefined) && fact("source-sight") === undefined)
      unknown("source-sight", "frightened");
  }
  if (A.has("grappled")) {
    const grapplers = originIds(own, "grappled");
    const isGrappler = grapplers.includes(target?.id) || fact("grappler-unknown") === true;
    if (!isGrappler && grapplers.includes(null) && fact("grappler-unknown") === undefined)
      unknown("grappler-unknown", "grappled");
    else if (!isGrappler) disadvantage.push(reasonFor("grappled", { side: "attacker" }));
  }
  if (A.has("charmed")) {
    const charmers = originIds(own, "charmed");
    if ((target?.id && charmers.includes(target.id)) || fact("charmer-unknown") === true)
      canAttack = false;
    else if (charmers.includes(null) && fact("charmer-unknown") === undefined)
      unknown("charmer-unknown", "charmed");
  }
  if (A.has("invisible")) {
    if (targetCanSeeAttacker === false)
      advantage.push(reasonFor("invisible", { side: "attacker" }));
    else if (targetCanSeeAttacker === undefined) unknown("target-sight", "invisible");
  }
  for (const id of ATTACKED_ADVANTAGE)
    if (T.has(id)) advantage.push(reasonFor(id, { side: "target" }));
  if (T.has("prone")) {
    if (near === true) advantage.push(reasonFor("prone", { side: "target" }));
    else if (near === false) disadvantage.push(reasonFor("prone", { side: "target" }));
    else unknown("distance", "prone");
  }
  if (T.has("invisible")) {
    if (attackerCanSeeTarget === false)
      disadvantage.push(reasonFor("invisible", { side: "target" }));
    else if (attackerCanSeeTarget === undefined) unknown("attacker-sight", "invisible");
  }
  let criticalOnHit = false;
  if (T.has("paralyzed") || T.has("unconscious")) {
    criticalOnHit = near;
    if (near === null && !unresolved.some((u) => u.code === "distance"))
      unknown("distance", T.has("paralyzed") ? "paralyzed" : "unconscious");
  }
  const modifierSources = exhaustionSources(attacker);
  return {
    mode:
      advantage.length && !disadvantage.length
        ? "advantage"
        : disadvantage.length && !advantage.length
          ? "disadvantage"
          : "normal",
    advantage,
    disadvantage,
    modifier: modifierSources.reduce((sum, m) => sum + m.value, 0),
    modifierSources,
    criticalOnHit,
    canAttack,
    unresolved,
  };
}

export function conditionSaveRules(actor, ability) {
  if (![...ABILITIES, "death"].includes(ability)) fail("ability");
  const ids = effectiveIds(instancesOf(actor), actor);
  const autoFailReasons = ["str", "dex"].includes(ability)
    ? INCLUDES_INCAPACITATED.filter((id) => ids.has(id)).map((id) => reasonFor(id))
    : [];
  const modifierSources = exhaustionSources(actor);
  return {
    ability,
    autoFail: autoFailReasons.length > 0,
    autoFailReasons,
    advantage: [],
    disadvantage: ability === "dex" && ids.has("restrained") ? [reasonFor("restrained")] : [],
    modifier: modifierSources.reduce((sum, m) => sum + m.value, 0),
    modifierSources,
  };
}

// ---------------------------------------------------------------- projections

const actorName = (s, id, v, lang) => {
  const a = s.actors?.[id];
  if (!nameable(s, a, v)) return lang === "it" ? "un’altra creatura" : "another creature";
  return typeof a.name === "object" && a.name
    ? (a.name[lang] ?? a.name.en ?? a.name.it)
    : String(a.name ?? id);
};
function duration(seconds) {
  const h = Math.floor(seconds / HOUR),
    m = Math.ceil((seconds % HOUR) / 60);
  return [h ? `${h} h` : "", m ? `${m} min` : "", !h && !m ? "0 min" : ""]
    .filter(Boolean)
    .join(" ");
}
// A hidden source is never readable from its end term: another creature named by the
// term stays anonymous for viewers who cannot see the source (the subject itself is not
// the hidden source).
function projectTerm(s, term, cause, v, id, { hidden = false, subjectId = null } = {}) {
  if (cause === "zero-hp")
    return {
      kind: "cause",
      label: text("Finché recupera PF", "Until it regains Hit Points"),
    };
  if (!object(term))
    return { kind: "unknown", label: text("Termine non registrato", "End not recorded") };
  const out = { kind: term.kind };
  const anonymous = hidden && term.actorId && term.actorId !== subjectId;
  const who = (lang) =>
    anonymous
      ? lang === "it"
        ? "un’altra creatura"
        : "another creature"
      : actorName(s, term.actorId, v, lang);
  if (term.actorId && !anonymous && nameable(s, s.actors?.[term.actorId], v))
    out.actorId = term.actorId;
  if (term.kind === "manual")
    out.label =
      id === "prone"
        ? text("Finché si rialza o viene rimossa", "Until it stands up or is removed")
        : text("Fino a rimozione", "Until removed");
  else if (term.kind === "clock") {
    const remaining = Math.max(0, term.expiresAt - clockNow(s, term.clockId));
    Object.assign(out, {
      clockId: term.clockId,
      expiresAt: term.expiresAt,
      remainingSeconds: remaining,
    });
    out.label = text(
      `Tempo di gioco: scade tra ${duration(remaining)}`,
      `Game time: ends in ${duration(remaining)}`,
    );
  } else if (term.kind === "turn") {
    Object.assign(out, { phase: term.phase, when: term.when });
    const itWhen = term.when === "current" ? "del turno corrente" : "del prossimo turno";
    const enWhen = term.when === "current" ? "current turn" : "next turn";
    out.label = text(
      `${term.phase === "start" ? "Inizio" : "Fine"} ${itWhen} di ${who("it")}`,
      `${term.phase === "start" ? "Start" : "End"} of ${who("en")}'s ${enWhen}`,
    );
  } else if (term.kind === "rest") {
    out.restKind = term.restKind;
    const it = { short: "un riposo breve", long: "un riposo lungo", any: "un riposo" }[
      term.restKind
    ];
    const en = { short: "a Short Rest", long: "a Long Rest", any: "a rest" }[term.restKind];
    out.label = text(
      `Fino al termine di ${it} di ${who("it")}`,
      `Until ${who("en")} finishes ${en}`,
    );
  } else if (term.kind === "concentration") {
    out.label = text(
      `Finché ${who("it")} mantiene la concentrazione`,
      `While ${who("en")} keeps Concentration`,
    );
  } else out.label = text("Termine non riconosciuto", "Unrecognized end");
  return out;
}
function projectInstance(s, a, i, v, control) {
  const hidden = i.sourceVisibility === "private" && i.owner !== v;
  const def = DEF.get(i.id);
  let origin = null;
  if (!hidden && object(i.origin)) {
    origin = {};
    if (typeof i.origin.label === "string" || object(i.origin.label))
      origin.label = copy(i.origin.label);
    if (i.origin.eventId) origin.eventId = i.origin.eventId;
    if (i.origin.actorId && nameable(s, s.actors?.[i.origin.actorId], v))
      origin.actorId = i.origin.actorId;
    if (!Object.keys(origin).length) origin = null;
  }
  const held = (i.reconciliation ?? []).includes("held-items");
  return {
    instanceId: i.instanceId,
    id: i.id,
    name: i.custom ? text(i.label, i.label) : def ? copy(def.name) : text(i.id, i.id),
    custom: !!i.custom,
    legacy: !!i.legacy,
    known: !!def,
    source: hidden ? null : copy(i.source),
    sourceHidden: hidden,
    origin,
    owner: i.owner ?? null,
    visibility: i.visibility ?? "shared",
    sourceVisibility: i.sourceVisibility ?? "shared",
    originCampaignId: i.originCampaignId ?? null,
    mode: i.mode ?? null,
    term: projectTerm(s, i.term, i.cause, v, i.id, { hidden, subjectId: a.id }),
    cause: i.cause ?? null,
    restId: i.restId ?? null,
    parentInstanceId: i.parentInstanceId ?? null,
    reconciliation: (i.reconciliation ?? []).map(message),
    droppedItemIds: control ? copy(i.droppedItemIds ?? []) : [],
    permissions: {
      canEnd: control && !boundReason(a, i),
      canCorrect: control,
      canResolveHeldItems: control && held,
    },
  };
}
function vitalityState(a, all) {
  if (a.dead === true) return "dead";
  if (!integer(a.hp)) return "unknown";
  if (a.hp > 0) return all.some((i) => i.cause === "knockout") ? "knocked-out" : "conscious";
  const policy = policyOf(a);
  if (policy === "death-saves") return deathSavesOf(a).stable ? "stable" : "dying";
  if (policy === "disappear") return "gone";
  return "zero-hp";
}
function vitalityReconciliation(a, all) {
  const out = [];
  if (!integer(a.hp)) out.push("hp-unknown");
  if (!integer(a.maxHp)) out.push("max-hp-unknown");
  if (a.hp === 0 && a.dead !== true) {
    const policy = policyOf(a);
    if (!policy) out.push("zero-hp-policy");
    if (policy === "death-saves" && !all.some((i) => i.id === "unconscious"))
      out.push("zero-hp-without-unconscious");
  }
  if (integer(a.hp, 1) && all.some((i) => i.cause === "zero-hp")) out.push("zero-hp-cause-remains");
  if (a.exhaustion === 6 && a.dead !== true) out.push("exhaustion-death");
  const ds = deathSavesOf(a);
  if (ds.stable && !ds.recovery) out.push("stable-recovery-missing");
  return out;
}
function projectDeathSaves(s, a) {
  const ds = deathSavesOf(a);
  if (ds.recovery) {
    const r = ds.recovery;
    ds.recovery = {
      stabilityId: r.stabilityId,
      clockId: r.clockId,
      startedAt: r.startedAt,
      expiresAt: r.expiresAt ?? null,
      remainingSeconds: integer(r.expiresAt)
        ? Math.max(0, r.expiresAt - clockNow(s, r.clockId))
        : null,
    };
  }
  return ds;
}

export function getConditionOverview(s, actorId, v, { effectiveActor } = {}) {
  const a = actorFor(s, actorId, v);
  const eff = effectiveActor?.id === a.id ? effectiveActor : a;
  const control = canControl(s, a, v);
  const all = instancesOf(a);
  const shown = all.filter((i) => visibleInstance(i, v));
  const instances = shown.map((i) => projectInstance(s, a, i, v, control));
  const groups = [];
  for (const i of instances) {
    const key = i.custom ? i.instanceId : i.id;
    const group = groups.find((g) => g.key === key);
    if (group) {
      group.count++;
      group.instanceIds.push(i.instanceId);
    } else
      groups.push({
        key,
        id: i.id,
        name: copy(i.name),
        custom: i.custom,
        count: 1,
        instanceIds: [i.instanceId],
      });
  }
  const level = exhaustionOf(a).level;
  if (level > 0)
    groups.push({
      key: "exhaustion",
      id: "exhaustion",
      name: copy(nameOf("exhaustion")),
      custom: false,
      count: 0,
      level,
      instanceIds: [],
    });
  // Mechanics count every application (a private one still applies its rules); the
  // reasons of applications this viewer cannot see stay anonymous.
  const mechanics = hideMechanics(mechanicsFrom(all, a, eff.speed), hiddenIdsFor(a, v));
  const codes = [
    ...mechanics.reconciliation.map((r) => r.code),
    ...vitalityReconciliation(a, all),
    ...(shown.some((i) => (i.reconciliation ?? []).includes("held-items")) ? ["held-items"] : []),
  ];
  const policy = policyOf(a)
    ? { zeroHp: policyOf(a), source: copy(a.vitalityPolicy.source ?? null) }
    : null;
  const readable = Object.values(s.actors ?? {}).filter((x) => canRead(s, x, v));
  // Visible tokens can be named as a cause or as the turn that ends a condition.
  const observed = Object.values(s.actors ?? {}).filter(
    (x) => !canRead(s, x, v) && observable(s, x, v),
  );
  const clockId = clockIdFor(s, a);
  return {
    actorId: a.id,
    actorName: copy(a.name),
    hp: integer(a.hp) ? a.hp : null,
    maxHp: integer(a.maxHp) ? a.maxHp : null,
    tempHp: a.tempHp == null ? 0 : integer(a.tempHp) ? a.tempHp : null,
    dead: a.dead === true,
    exhaustion: level,
    deathSaves: projectDeathSaves(s, a),
    policy,
    vitality: vitalityState(a, all),
    instances,
    active: groups.map(({ key, ...g }) => g),
    mechanics,
    reconciliation: [...new Set(codes)].map(message),
    permissions: {
      canControl: control,
      canManage: control,
      canStand:
        control &&
        all.some((i) => i.id === "prone") &&
        previewStand(s, a.id, v, { effectiveActor }).canApply,
      canHeal: control && a.dead !== true && integer(a.hp) && integer(a.maxHp),
      canCorrect: control,
      canRequestDeathSave: control && dyingNow(a) && !inCombat(s, a.id),
    },
    commit: commitFor(a),
    choices: {
      clock: clockId ? { id: clockId, seconds: clockNow(s, clockId) } : null,
      actors: [
        ...readable.map((x) => ({ id: x.id, name: copy(x.name) })),
        ...observed.map((x) => ({ id: x.id, name: copy(x.name), observable: true })),
      ],
      concentrations: readable
        .filter((x) => x.concentration?.active && x.concentration.id)
        .map((x) => ({
          actorId: x.id,
          id: x.concentration.id,
          label: copy(x.concentration.name ?? x.concentration.id),
        })),
      heldItems: control
        ? (a.inventory ?? [])
            .filter((item) => object(item) && item.id)
            .map((item) => ({
              id: item.id,
              name: copy(item.name),
              quantity: item.quantity ?? null,
              held: Array.isArray(a.heldItemIds) ? a.heldItemIds.includes(item.id) : null,
            }))
        : [],
    },
  };
}

function projectRow(r, v) {
  if (r.visibility === "private" && r.owner !== v) return null;
  const hidden = r.sourceVisibility === "private" && r.owner !== v;
  if (hidden && r.sensitive) return null;
  return {
    field: r.field,
    label: copy(r.label),
    before: copy(r.before),
    after: copy(r.after),
    source: hidden ? null : copy(r.source ?? null),
    ...(r.instanceId ? { instanceId: r.instanceId } : {}),
  };
}
export function getConditionHistory(s, actorId, v) {
  const a = actorFor(s, actorId, v);
  return events(s)
    .filter((e) => (e.actorIds ?? [e.actorId]).includes(a.id))
    .map((e) => {
      const rows = (e.rows ?? [])
        .filter((r) => (r.actorId ?? e.actorId) === a.id)
        .map((r) => projectRow(r, v))
        .filter(Boolean);
      if (!rows.length) return null;
      const hidden = e.sourceVisibility === "private" && (e.sourceOwner ?? e.owner) !== v;
      return {
        id: e.id,
        kind: e.kind,
        actorId: a.id,
        label: copy(e.label),
        source: hidden ? null : copy(e.source ?? null),
        rows,
        reason: hidden ? null : (e.reason ?? null),
        owner: e.owner ?? null,
      };
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------- plans

const newPlan = () => ({
  add: [],
  remove: [],
  updates: [],
  drops: [],
  patch: {},
  endConcentration: null,
  rows: [],
  followUps: [],
  reconciliation: [],
  warnings: [],
  errors: [],
});
const row = (field, label, before, after, source = null, meta = {}) => ({
  field,
  label: copy(label),
  before: copy(before),
  after: copy(after),
  source: copy(source),
  ...meta,
});
const publicRows = (rows) =>
  rows.map(({ field, label, before, after, source, instanceId }) => ({
    field,
    label: copy(label),
    before: copy(before),
    after: copy(after),
    source: copy(source),
    ...(instanceId ? { instanceId } : {}),
  }));
const follow = (plan, value) => {
  if (!plan.followUps.some((f) => JSON.stringify(f) === JSON.stringify(value)))
    plan.followUps.push(value);
};
const warn = (plan, code) => {
  if (!plan.warnings.some((w) => w.code === code)) plan.warnings.push(message(code));
};
const reconcile = (plan, code) => {
  if (!plan.reconciliation.some((w) => w.code === code)) plan.reconciliation.push(message(code));
};
function merge(plan, other) {
  for (const key of ["add", "remove", "updates", "drops", "rows", "errors"])
    plan[key].push(...other[key]);
  for (const f of other.followUps) follow(plan, f);
  for (const w of other.warnings) warn(plan, w.code);
  for (const r of other.reconciliation) reconcile(plan, r.code);
  Object.assign(plan.patch, other.patch);
  plan.endConcentration ??= other.endConcentration;
  return plan;
}
// Conditions after the plan, for "does it remain active" rows.
function after(a, plan) {
  const remove = new Set(plan.remove);
  return {
    ...a,
    ...plan.patch,
    conditions: [...instancesOf(a).filter((i) => !remove.has(i.instanceId)), ...plan.add],
  };
}
function execute(a, plan) {
  normalizeActor(a);
  const ended = [];
  if (plan.remove.length)
    a.conditions = a.conditions.filter((c) => {
      if (object(c) && plan.remove.includes(c.instanceId)) {
        ended.push(copy(c));
        return false;
      }
      return true;
    });
  for (const u of plan.updates) {
    const target = a.conditions.find((c) => object(c) && c.instanceId === u.instanceId);
    if (target) Object.assign(target, copy(u.patch));
  }
  for (const i of plan.add) a.conditions.push(copy(i));
  for (const [key, value] of Object.entries(plan.patch)) a[key] = copy(value);
  // Dropped items land on the ground: no longer equipped, usable or in hand.
  for (const id of plan.drops) {
    const item = (a.inventory ?? []).find((entry) => object(entry) && entry.id === id);
    if (item) Object.assign(item, { location: "ground", equipped: false });
  }
  if (plan.endConcentration && a.concentration?.active) {
    a.concentration.active = false;
    a.concentration.endedReason = plan.endConcentration;
  }
  return ended;
}
function endConcentration(a, plan, reason) {
  if (!a.concentration?.active || plan.endConcentration) return;
  plan.endConcentration = reason;
  plan.rows.push(
    row("concentration.active", L.concentration, true, false, a.concentration.source ?? null),
  );
  follow(plan, {
    kind: "end-concentration",
    actorId: a.id,
    concentrationId: a.concentration.id,
    reason,
  });
}
function markDead(a, plan, source) {
  if (a.dead === true || plan.patch.dead === true) return;
  plan.patch.dead = true;
  plan.rows.push(row("dead", L.dead, false, true, source));
  endConcentration(a, plan, "dead");
  follow(plan, { kind: "expire-vitality-requests", actorId: a.id, reason: "dead" });
}
function makeInstance(fields) {
  return {
    ...blank(fields.id, fields.instanceId),
    mode: "record",
    ...copy(fields),
    reconciliation: copy(fields.reconciliation ?? []),
  };
}
// Unconscious includes a distinct Prone, ends concentration and drops known held items.
function unconsciousConsequences(s, a, plan, inst, declaredHeld) {
  const prone = makeInstance({
    id: "prone",
    instanceId: inst.instanceId.replace(/:unconscious$/, "") + ":prone",
    source: DEF.get("unconscious").source,
    origin: {
      eventId: inst.origin?.eventId ?? null,
      label: text("Caduta per incoscienza", "Fell unconscious"),
    },
    owner: inst.owner,
    visibility: inst.visibility,
    sourceVisibility: "shared",
    originCampaignId: inst.originCampaignId,
    term: { kind: "manual" },
    cause: "unconscious-fall",
    parentInstanceId: inst.instanceId,
    mode: "rule",
  });
  plan.add.push(prone);
  plan.rows.push(
    row(
      "conditions.prone",
      nameOf("prone"),
      hasCondition(a, "prone"),
      true,
      prone.source,
      metaOf(prone),
    ),
  );
  endConcentration(a, plan, "unconscious");
  const held = declaredHeld ?? a.heldItemIds;
  if (Array.isArray(held)) {
    if (held.length) {
      inst.droppedItemIds = [...held];
      plan.drops.push(...held);
      plan.patch.heldItemIds = [];
      plan.rows.push(row("heldItemIds", L.held, held, [], inst.source, metaOf(inst)));
    }
  } else {
    inst.reconciliation.push("held-items");
    reconcile(plan, "held-items");
    follow(plan, { kind: "held-items", actorId: a.id, instanceId: inst.instanceId });
  }
}
function addRuleUnconscious(s, a, plan, { eventId, cause, term, label, source }) {
  const inst = makeInstance({
    id: "unconscious",
    instanceId: `${eventId}:unconscious`,
    source,
    origin: { eventId, label },
    owner: a.owner ?? null,
    originCampaignId: originCampaign(s, a),
    term,
    cause,
    mode: "rule",
  });
  plan.rows.push(
    row(
      "conditions.unconscious",
      nameOf("unconscious"),
      hasCondition(a, "unconscious"),
      true,
      source,
      metaOf(inst),
    ),
  );
  unconsciousConsequences(s, a, plan, inst);
  plan.add.push(inst);
}
function removeCause(a, plan, cause) {
  const list = instancesOf(a).filter(
    (i) => i.id === "unconscious" && i.cause === cause && !plan.remove.includes(i.instanceId),
  );
  if (!list.length) return;
  const before = hasCondition(after(a, plan), "unconscious");
  plan.remove.push(...list.map((i) => i.instanceId));
  plan.rows.push(
    row(
      "conditions.unconscious",
      nameOf("unconscious"),
      before,
      hasCondition(after(a, plan), "unconscious"),
      list[0].source,
      metaOf(list[0]),
    ),
  );
}

// ---------------------------------------------------------------- vitality plans

function planDamage(s, a, { amount, critical = false, knockout = false, clockId }, eventId) {
  const plan = newPlan();
  if (!integer(amount)) return (plan.errors.push(message("amount")), { plan });
  if (!integer(a.hp)) return (plan.errors.push(message("hp-unknown")), { plan });
  const tempBefore = a.tempHp == null ? 0 : integer(a.tempHp) ? a.tempHp : null;
  if (tempBefore === null) return (plan.errors.push(message("temp-hp-unknown")), { plan });
  const hpBefore = a.hp,
    deadBefore = a.dead === true,
    dsBefore = deathSavesOf(a),
    policy = policyOf(a),
    maxKnown = integer(a.maxHp);
  const absorbed = Math.min(tempBefore, amount),
    rest = amount - absorbed;
  let hpAfter = Math.max(0, hpBefore - rest),
    massive = false,
    knocked = false,
    failuresAdded = 0;
  const ds = copy(dsBefore);
  let dsChanged = false;
  if (!deadBefore && amount > 0) {
    if (hpBefore > 0 && knockout && rest >= hpBefore) {
      // SRD 2024 knockout: "instead" of 0 HP, so no 0-HP or massive-damage branch runs.
      hpAfter = 1;
      knocked = true;
      const restId = `knockout:${eventId}`;
      addRuleUnconscious(s, a, plan, {
        eventId,
        cause: "knockout",
        term: { kind: "rest", actorId: a.id, restKind: "short", restId },
        label: text("Knockout in mischia", "Melee knockout"),
        source: KNOCKOUT,
      });
      follow(plan, {
        kind: "start-knockout-rest",
        actorId: a.id,
        restId,
        clockId: clockId ?? clockIdFor(s, a),
      });
    } else if (hpBefore > 0) {
      if (knockout) warn(plan, "knockout-not-needed");
      if (hpAfter === 0) {
        if (maxKnown) massive = rest - hpBefore >= a.maxHp;
        else reconcile(plan, "max-hp-unknown");
        if (policy === "death" || (massive && policy === "death-saves"))
          markDead(a, plan, massive ? ZERO_HP : DEAD_SOURCE);
        else if (policy === "death-saves") {
          if (!instancesOf(a).some((i) => i.cause === "zero-hp"))
            addRuleUnconscious(s, a, plan, {
              eventId,
              cause: "zero-hp",
              term: { kind: "manual" },
              label: text("Caduta a 0 PF", "Dropped to 0 HP"),
              source: ZERO_HP,
            });
          Object.assign(ds, RESET());
          dsChanged = true;
        } else if (policy === "disappear") {
          plan.rows.push(
            row(
              "vitalityPolicy.zeroHp",
              L.policy,
              null,
              "disappear",
              a.vitalityPolicy?.source ?? null,
            ),
          );
        } else reconcile(plan, policy === "manual" ? "zero-hp-manual" : "zero-hp-policy");
      }
    } else {
      if (knockout) warn(plan, "knockout-not-needed");
      if (policy === "death-saves") {
        if (maxKnown && rest >= a.maxHp) {
          massive = true;
          markDead(a, plan, AT_ZERO);
        } else {
          if (!maxKnown) reconcile(plan, "max-hp-unknown");
          failuresAdded = Math.min(critical ? 2 : 1, 3 - ds.failures);
          ds.failures += failuresAdded;
          if (ds.failures >= 3) markDead(a, plan, AT_ZERO);
        }
        if (ds.stable) {
          ds.stable = false;
          ds.recovery = null;
          follow(plan, { kind: "expire-vitality-requests", actorId: a.id, reason: "damage" });
        }
        dsChanged = true;
      } else if (policy === "death") markDead(a, plan, DEAD_SOURCE);
      else if (policy !== "disappear")
        reconcile(plan, policy === "manual" ? "zero-hp-manual" : "zero-hp-policy");
    }
  }
  if (absorbed > 0) {
    plan.patch.tempHp = tempBefore - absorbed;
    plan.rows.push(row("tempHp", L.tempHp, tempBefore, tempBefore - absorbed));
  }
  if (hpAfter !== hpBefore) {
    plan.patch.hp = hpAfter;
    plan.rows.push(row("hp", L.hp, hpBefore, hpAfter));
  }
  if (dsChanged && JSON.stringify(ds) !== JSON.stringify(dsBefore)) {
    plan.patch.deathSaves = ds;
    for (const key of ["successes", "failures", "stable"])
      if (ds[key] !== dsBefore[key])
        plan.rows.push(row(`deathSaves.${key}`, L[key], dsBefore[key], ds[key], AT_ZERO));
  }
  if (amount > 0) follow(plan, { kind: "reconcile-actor", actorId: a.id });
  const deadAfter = plan.patch.dead === true || deadBefore;
  return {
    plan,
    breakdown: {
      damage: amount,
      hpBefore,
      hpAfter,
      hpLost: hpBefore - hpAfter,
      tempHpBefore: tempBefore,
      tempHpAfter: tempBefore - absorbed,
      tempHpAbsorbed: absorbed,
      deadBefore,
      deadAfter,
      deathSavesBefore: dsBefore,
      deathSavesAfter: dsChanged ? copy(ds) : copy(dsBefore),
      critical: critical === true,
      massive,
      knockout: knocked,
      failuresAdded,
      policy,
    },
  };
}
// `regainOne` is the rule-granted regain of 1 HP at 0 HP (natural 20, stable recovery):
// it needs no known maximum, since any creature's maximum is at least 1.
function planHealing(s, a, amount, { regainOne = false } = {}) {
  const plan = newPlan();
  const assumeMax = regainOne && a.hp === 0 && amount === 1 && !integer(a.maxHp, 1);
  if (!integer(amount)) plan.errors.push(message("amount"));
  else if (a.dead === true) plan.errors.push(message("dead"));
  else if (!integer(a.hp)) plan.errors.push(message("hp-unknown"));
  else if (!integer(a.maxHp) && !assumeMax) plan.errors.push(message("max-hp-unknown"));
  if (plan.errors.length) return { plan };
  if (assumeMax) reconcile(plan, "max-hp-assumed");
  const max = assumeMax ? 1 : a.maxHp;
  const hpBefore = a.hp,
    dsBefore = deathSavesOf(a);
  const hpAfter = Math.max(hpBefore, Math.min(max, hpBefore + amount));
  const regained = hpAfter - hpBefore;
  let ds = dsBefore;
  if (regained > 0) {
    plan.patch.hp = hpAfter;
    plan.rows.push(row("hp", L.hp, hpBefore, hpAfter));
    if (hpBefore === 0) {
      ds = RESET();
      if (JSON.stringify(ds) !== JSON.stringify(dsBefore)) {
        plan.patch.deathSaves = ds;
        for (const key of ["successes", "failures", "stable"])
          if (ds[key] !== dsBefore[key])
            plan.rows.push(row(`deathSaves.${key}`, L[key], dsBefore[key], ds[key], DEATH_SAVES));
      }
      removeCause(a, plan, "zero-hp");
      follow(plan, { kind: "expire-vitality-requests", actorId: a.id, reason: "healed" });
    }
    removeCause(a, plan, "knockout");
    follow(plan, { kind: "reconcile-actor", actorId: a.id });
  }
  return {
    plan,
    breakdown: {
      healing: amount,
      hpBefore,
      hpAfter,
      regained,
      overheal: amount - regained,
      deathSavesBefore: dsBefore,
      deathSavesAfter: copy(ds),
    },
  };
}
// A rule outcome never reports a regain that did not happen: a blocked plan fails loudly.
function regainOnePlan(s, a) {
  const plan = planHealing(s, a, 1, { regainOne: true }).plan;
  if (plan.errors.length) fail(plan.errors[0].code);
  return plan;
}
function stabilizePlan(s, a, plan, eventId) {
  const dsBefore = deathSavesOf(a);
  const stabilityId = `${eventId}:stable`,
    clockId = clockIdFor(s, a);
  const ds = {
    successes: 0,
    failures: 0,
    stable: true,
    recovery: {
      stabilityId,
      clockId,
      startedAt: clockNow(s, clockId),
      expiresAt: null,
      originCampaignId: originCampaign(s, a),
      owner: a.owner ?? null,
    },
  };
  plan.patch.deathSaves = ds;
  for (const key of ["successes", "failures", "stable"])
    if (ds[key] !== dsBefore[key])
      plan.rows.push(row(`deathSaves.${key}`, L[key], dsBefore[key], ds[key], STABILIZE));
  follow(plan, { kind: "request-stable-recovery", actorId: a.id, stabilityId });
  follow(plan, { kind: "reconcile-actor", actorId: a.id });
}
const CORRECTABLE = [
  "hp",
  "maxHp",
  "tempHp",
  "dead",
  "successes",
  "failures",
  "stable",
  "zeroHpPolicy",
];
function planCorrection(s, a, patch, source, eventId) {
  const plan = newPlan();
  const keys = object(patch) ? Object.keys(patch) : [];
  if (!keys.length || keys.some((k) => !CORRECTABLE.includes(k)))
    return (plan.errors.push(message("patch")), { plan });
  const maxAfter = "maxHp" in patch ? patch.maxHp : a.maxHp;
  const bad =
    ("maxHp" in patch && !integer(patch.maxHp)) ||
    ("hp" in patch && (!integer(patch.hp) || (integer(maxAfter) && patch.hp > maxAfter))) ||
    ("tempHp" in patch && !integer(patch.tempHp)) ||
    ("dead" in patch && typeof patch.dead !== "boolean") ||
    ("stable" in patch && typeof patch.stable !== "boolean") ||
    ["successes", "failures"].some((k) => k in patch && !(integer(patch[k]) && patch[k] <= 3)) ||
    ("zeroHpPolicy" in patch && !POLICIES.includes(patch.zeroHpPolicy));
  if (bad) return (plan.errors.push(message("patch")), { plan });
  // A correction fixes data; it never produces a death or a fall to 0 HP (COND-05): a
  // 0 HP maximum kills (SRD EN 17 / IT 19) and a fall to 0 HP is recorded as damage.
  if ("maxHp" in patch && patch.maxHp === 0) plan.errors.push(message("max-hp-zero"));
  if ("hp" in patch && patch.hp === 0 && a.hp !== 0)
    plan.errors.push(message("zero-by-correction"));
  if (plan.errors.length) return { plan };
  const set = (key, label, before, value) => {
    if (JSON.stringify(before) === JSON.stringify(value)) return;
    plan.patch[key] = value;
    plan.rows.push(row(key, label, before, value, source));
  };
  if ("maxHp" in patch) set("maxHp", L.maxHp, a.maxHp ?? null, patch.maxHp);
  if ("hp" in patch) set("hp", L.hp, a.hp ?? null, patch.hp);
  if ("tempHp" in patch) set("tempHp", L.tempHp, a.tempHp ?? null, patch.tempHp);
  if ("zeroHpPolicy" in patch && policyOf(a) !== patch.zeroHpPolicy) {
    plan.patch.vitalityPolicy = { zeroHp: patch.zeroHpPolicy, source: copy(source) };
    plan.rows.push(row("vitalityPolicy.zeroHp", L.policy, policyOf(a), patch.zeroHpPolicy, source));
  }
  const dsBefore = deathSavesOf(a),
    ds = copy(dsBefore);
  for (const key of ["successes", "failures", "stable"]) if (key in patch) ds[key] = patch[key];
  // Counts of three are outcomes, not free numbers: the same command must record them.
  const deadAfter = "dead" in patch ? patch.dead === true : a.dead === true;
  if (ds.failures >= 3 && !deadAfter) return (plan.errors.push(message("death-count")), { plan });
  if (ds.successes >= 3 && !ds.stable && !deadAfter)
    return (plan.errors.push(message("stable-count")), { plan });
  if ("stable" in patch && !patch.stable) ds.recovery = null;
  if (patch.stable === true && !dsBefore.stable) {
    const clockId = clockIdFor(s, a);
    ds.recovery = {
      stabilityId: `${eventId}:stable`,
      clockId,
      startedAt: clockNow(s, clockId),
      expiresAt: null,
      originCampaignId: originCampaign(s, a),
      owner: a.owner ?? null,
    };
    follow(plan, {
      kind: "request-stable-recovery",
      actorId: a.id,
      stabilityId: ds.recovery.stabilityId,
    });
  }
  if (JSON.stringify(ds) !== JSON.stringify(dsBefore)) {
    plan.patch.deathSaves = ds;
    for (const key of ["successes", "failures", "stable"])
      if (ds[key] !== dsBefore[key])
        plan.rows.push(row(`deathSaves.${key}`, L[key], dsBefore[key], ds[key], source));
  }
  if ("dead" in patch && patch.dead !== (a.dead === true)) {
    if (patch.dead) markDead(a, plan, source);
    else {
      plan.patch.dead = false;
      plan.rows.push(row("dead", L.dead, true, false, source));
      warn(plan, "correction-not-resurrection");
    }
  }
  const hpAfter = "hp" in patch ? patch.hp : a.hp;
  if (integer(hpAfter, 1) && instancesOf(a).some((i) => i.cause === "zero-hp"))
    warn(plan, "zero-hp-cause-remains");
  if (!plan.rows.length) plan.errors.push(message("unchanged"));
  else follow(plan, { kind: "reconcile-actor", actorId: a.id });
  return { plan };
}

// ---------------------------------------------------------------- previews and commands

function relevant(s, a) {
  return {
    owner: a.owner,
    controllers: a.controllers,
    visibility: a.visibility,
    campaignIds: a.campaignIds,
    campaign: s.campaign?.id,
    members: s.campaign?.members ?? null,
    lifecycle: a.companion?.lifecycle ?? null,
    hp: a.hp,
    maxHp: a.maxHp,
    tempHp: a.tempHp,
    dead: a.dead,
    exhaustion: a.exhaustion,
    deathSaves: a.deathSaves,
    policy: a.vitalityPolicy,
    conditions: a.conditions,
    concentration: a.concentration,
    immunities: a.conditionImmunities,
    heldItemIds: a.heldItemIds,
    inventory: (a.inventory ?? []).map((i) => i?.id),
  };
}
function draft(a, hidden = false) {
  return {
    canApply: true,
    errors: [],
    warnings: [],
    reviewKey: "",
    commit: commitFor(a, hidden),
    actorId: a.id,
    actorName: copy(a.name),
    rows: [],
    costs: [],
    followUps: [],
    reconciliation: [],
  };
}
function finish(p, plan, key) {
  p.errors.push(...plan.errors);
  p.warnings.push(...plan.warnings.filter((w) => !p.warnings.some((x) => x.code === w.code)));
  p.reconciliation.push(...plan.reconciliation);
  p.canApply = p.errors.length === 0;
  // Before/after rows stay readable while a missing reason or source blocks Apply;
  // only a viewer without control gets no plan at all.
  if (!p.errors.some((e) => e.code === "permission")) p.rows = publicRows(plan.rows);
  if (p.canApply) p.followUps = copy(plan.followUps);
  p.reviewKey = campaignReviewKey(key);
  return p;
}
function perform(s, name, actorId, input, v, options, preview, commit) {
  if (!validId(options?.operationId)) fail("operation-id");
  const inputKey = campaignReviewKey({ name, actorId, input });
  const old = events(s).find((e) => e.id === options.operationId);
  if (old) {
    if (old.owner !== v || old.inputKey !== inputKey) fail("id-conflict");
    const a = actorFor(s, actorId, v);
    if (!canControl(s, a, v)) fail("permission");
    if (options.online === false && !old.commit?.local) fail("offline");
    return copy(old.result);
  }
  const p = preview();
  if (options.online === false && !p.commit.local) fail("offline");
  if (!p.canApply) fail(p.errors[0].code, p.errors[0].it, p.errors[0].en);
  if (options.reviewKey !== p.reviewKey) fail("conflict");
  return copy(commit(p, options.operationId, inputKey));
}
function stampPrivate(rows, owner) {
  return rows.map((r) => ({ ...r, visibility: "private", owner }));
}

function checkSource(p, sourceValue) {
  if (!hasSource(sourceValue)) p.errors.push(message("source"));
}
// Trusted adapters reference any existing actor; public commands only readable ones.
const TRUSTED = Symbol("trusted");
const readableBy = (s, id, v, { observed = false } = {}) =>
  v === TRUSTED
    ? object(s.actors?.[id])
    : observed
      ? nameable(s, s.actors?.[id], v)
      : canRead(s, s.actors?.[id], v);
function termFor(s, a, term, v, p) {
  const bad = (it, en) => (p.errors.push(issue("term", it, en)), null);
  if (!object(term)) return bad("Indica quando termina.", "Choose when it ends.");
  const readable = (id) => readableBy(s, id, v);
  // A turn can belong to any creature the viewer sees on the Table (its name only).
  const visibleTurn = (id) => readableBy(s, id, v, { observed: true });
  switch (term.kind) {
    case "manual":
      return { kind: "manual" };
    case "clock": {
      const clockId = clockIdFor(s, a);
      if (term.clockId !== clockId)
        return bad("Usa il tempo di gioco di questa creatura.", "Use this creature's game clock.");
      if (!integer(term.expiresAt) || term.expiresAt <= clockNow(s, clockId))
        return bad(
          "La scadenza deve essere futura nel tempo di gioco.",
          "The expiry must be later in game time.",
        );
      return { kind: "clock", clockId, expiresAt: term.expiresAt };
    }
    case "turn": {
      if (!visibleTurn(term.actorId))
        return bad("Creatura del turno non disponibile.", "Turn creature unavailable.");
      if (!["start", "end"].includes(term.phase) || !["current", "next"].includes(term.when))
        return bad(
          "Indica inizio o fine, turno corrente o prossimo.",
          "Choose start or end, current or next turn.",
        );
      const out = { kind: "turn", actorId: term.actorId, phase: term.phase, when: term.when };
      if (term.when === "current") {
        if (term.phase !== "end" || turnActor(s) !== term.actorId)
          return bad(
            "«Turno corrente» vale solo per la fine del turno in corso di quella creatura.",
            "“Current turn” only applies to the end of that creature's ongoing turn.",
          );
        out.turnKey = turnKeyOf(s);
      } else if (turnActor(s) === term.actorId) out.excludeTurnKey = turnKeyOf(s);
      if (!inCombat(s, term.actorId)) p.warnings.push(message("no-initiative"));
      return out;
    }
    case "rest": {
      if (!readable(term.actorId))
        return bad("Creatura del riposo non disponibile.", "Resting creature unavailable.");
      if (!["short", "long", "any"].includes(term.restKind))
        return bad("Indica riposo breve, lungo o qualsiasi.", "Choose a short, long or any rest.");
      if (term.restId != null && !validId(term.restId))
        return bad("Riposo non valido.", "Invalid rest.");
      return {
        kind: "rest",
        actorId: term.actorId,
        restKind: term.restKind,
        ...(term.restId ? { restId: term.restId } : {}),
      };
    }
    case "concentration": {
      const who = s.actors?.[term.actorId];
      if (
        !readable(term.actorId) ||
        !who.concentration?.active ||
        who.concentration.id !== term.concentrationId
      )
        return bad(
          "La concentrazione indicata non è attiva.",
          "The chosen Concentration is not active.",
        );
      return {
        kind: "concentration",
        actorId: term.actorId,
        concentrationId: term.concentrationId,
      };
    }
    default:
      return bad("Indica quando termina.", "Choose when it ends.");
  }
}
function originFor(s, origin, v, p) {
  if (origin === undefined || origin === null) return null;
  if (!object(origin)) return (p.errors.push(message("origin")), null);
  const out = {};
  if (origin.actorId !== undefined) {
    if (!readableBy(s, origin.actorId, v, { observed: true }))
      return (p.errors.push(message("origin")), null);
    out.actorId = origin.actorId;
  }
  if (origin.eventId !== undefined) {
    if (!validId(origin.eventId)) return (p.errors.push(message("origin")), null);
    out.eventId = origin.eventId;
  }
  if (origin.label !== undefined) {
    if (!filled(origin.label, 120)) return (p.errors.push(message("origin")), null);
    out.label = origin.label.trim();
  }
  return Object.keys(out).length ? out : null;
}
function immunities(a) {
  const list = Array.isArray(a.conditionImmunities) ? [...a.conditionImmunities] : null;
  if (hasCondition(a, "petrified")) return [...(list ?? []), "poisoned"];
  return list;
}

function conditionPlan(s, a, sel, v, eventId) {
  const p = { errors: [], warnings: [], hidden: false },
    plan = newPlan();
  if (!canControl(s, a, v)) p.errors.push(message("permission"));
  if (!object(sel)) return (p.errors.push(message("selection")), { p, plan });
  const findVisible = () => {
    const inst = instancesOf(a).find((i) => i.instanceId === sel.instanceId);
    if (!inst || !visibleInstance(inst, v)) return (p.errors.push(message("instance")), null);
    // Only a private application hides the log entry: a private origin keeps the shared
    // label ("Condition ended: Frightened"), which names no cause (review 10).
    p.hidden = inst.visibility === "private";
    return inst;
  };
  if (sel.kind === "apply" || sel.kind === "custom") {
    const custom = sel.kind === "custom";
    const def = DEF.get(sel.conditionId);
    if (!custom && sel.conditionId === "exhaustion") p.errors.push(message("exhaustion-level"));
    else if (!custom && !def) p.errors.push(message("condition"));
    if (custom && !filled(sel.label, 80)) p.errors.push(message("label"));
    if (custom && !filled(sel.reason)) p.errors.push(message("reason"));
    checkSource(p, sel.source);
    const mode = custom ? "record" : (sel.mode ?? "record");
    if (!["record", "rule"].includes(mode)) p.errors.push(message("mode"));
    const visibility = sel.visibility ?? "shared",
      sourceVisibility = sel.sourceVisibility ?? "shared";
    if (
      !["shared", "private"].includes(visibility) ||
      !["shared", "private"].includes(sourceVisibility)
    )
      p.errors.push(message("visibility"));
    // The table sees the condition and its shared log line; a private origin stays out
    // of both (the label names no cause). Only a private application hides the entry.
    p.hidden = visibility === "private";
    const origin = originFor(s, sel.origin, v, p);
    const term = termFor(s, a, sel.term, v, p);
    let held;
    if (!custom && sel.heldItemIds !== undefined) {
      const ids = (a.inventory ?? []).map((i) => i?.id);
      if (
        !Array.isArray(sel.heldItemIds) ||
        new Set(sel.heldItemIds).size !== sel.heldItemIds.length ||
        sel.heldItemIds.some((id) => !ids.includes(id))
      )
        p.errors.push(message("items"));
      else held = [...sel.heldItemIds];
    }
    if (!custom && def) {
      const known = immunities(a);
      if (known === null) {
        if (mode === "rule" && sel.immunityConfirmed !== true) {
          p.errors.push(message("immunity-unknown"));
          reconcile(plan, "immunity-unknown");
        } else if (mode === "record") p.warnings.push(message("immunity-unknown"));
      } else if (known.includes(def.id)) {
        if (mode === "rule") p.errors.push(message("immune"));
        else p.warnings.push(message("immune-record"));
      }
    }
    if (a.dead === true) p.warnings.push(message("dead-target"));
    if (p.errors.length) return { p, plan };
    const id = custom ? "custom" : def.id;
    const inst = makeInstance({
      id,
      instanceId: `${eventId}:${id}`,
      source: sel.source,
      origin,
      owner: v,
      visibility,
      sourceVisibility,
      originCampaignId: originCampaign(s, a),
      term,
      mode,
      appliedAt: {
        turnKey: turnKeyOf(s),
        clockId: clockIdFor(s, a),
        seconds: clockNow(s, clockIdFor(s, a)),
      },
      ...(custom ? { custom: true, label: sel.label.trim() } : {}),
    });
    const meta = metaOf(inst);
    plan.rows.push(
      row(
        `conditions.${id}`,
        custom ? text(inst.label, inst.label) : nameOf(id),
        custom ? false : hasCondition(a, id),
        true,
        sel.source,
        meta,
      ),
    );
    // The origin is text the user declared: it cites no source, not even the
    // definition's SRD page.
    if (origin?.label)
      plan.rows.push(
        row("origin", L.origin, null, origin.label, null, { ...meta, sensitive: true }),
      );
    // The chosen end is part of what the preview shows before applying.
    plan.rows.push(
      row("term", L.term, null, term, null, {
        ...meta,
        ...(term.actorId && term.actorId !== a.id ? { sensitive: true } : {}),
      }),
    );
    if (!custom && [...INCLUDES_INCAPACITATED, "incapacitated"].includes(id)) {
      if (id === "unconscious") unconsciousConsequences(s, a, plan, inst, held);
      else endConcentration(a, plan, id);
    }
    plan.add.unshift(inst);
    follow(plan, { kind: "reconcile-actor", actorId: a.id });
    return {
      p,
      plan,
      instanceIds: plan.add.map((i) => i.instanceId),
      source: sel.source,
      sourceVisibility,
      reason: sel.reason ?? null,
    };
  }
  if (sel.kind === "end") {
    const inst = findVisible();
    if (!filled(sel.reason)) p.errors.push(message("reason"));
    if (inst && boundReason(a, inst)) p.errors.push(message(boundReason(a, inst)));
    if (p.errors.length) return { p, plan };
    plan.remove.push(inst.instanceId);
    const stays = hasCondition(after(a, plan), inst.id);
    plan.rows.push(
      row(
        `conditions.${inst.id}`,
        inst.custom ? text(inst.label, inst.label) : nameOf(inst.id),
        inst.custom ? true : hasCondition(a, inst.id),
        inst.custom ? false : stays,
        inst.source,
        metaOf(inst),
      ),
    );
    if (inst.id === "unconscious" && hasCondition(after(a, plan), "prone"))
      p.warnings.push(message("prone-remains"));
    follow(plan, { kind: "reconcile-actor", actorId: a.id });
    return {
      p,
      plan,
      endedIds: [inst.instanceId],
      source: inst.source,
      sourceVisibility: inst.sourceVisibility,
      sourceOwner: inst.owner,
      reason: sel.reason,
    };
  }
  if (sel.kind === "correct") {
    const inst = findVisible();
    if (!filled(sel.reason)) p.errors.push(message("reason"));
    const patch = object(sel.patch) ? sel.patch : {};
    const keys = Object.keys(patch);
    if (!keys.length || keys.some((k) => !["term", "sourceVisibility"].includes(k)))
      p.errors.push(message("patch"));
    if (!inst || p.errors.length) return { p, plan };
    const change = {};
    if ("term" in patch) {
      const term = termFor(s, a, patch.term, v, p);
      if (term && JSON.stringify(term) !== JSON.stringify(inst.term)) change.term = term;
    }
    if ("sourceVisibility" in patch) {
      if (!["shared", "private"].includes(patch.sourceVisibility))
        p.errors.push(message("visibility"));
      else if (!(inst.owner === v || (inst.owner == null && canControl(s, a, v))))
        p.errors.push(message("source-owner"));
      else if (patch.sourceVisibility !== inst.sourceVisibility)
        change.sourceVisibility = patch.sourceVisibility;
    }
    if (!p.errors.length && !Object.keys(change).length) p.errors.push(message("unchanged"));
    if (p.errors.length) return { p, plan };
    plan.updates.push({ instanceId: inst.instanceId, patch: change });
    const meta = metaOf(inst);
    if (change.term) plan.rows.push(row("term", L.term, inst.term, change.term, inst.source, meta));
    if (change.sourceVisibility)
      plan.rows.push(
        row(
          "sourceVisibility",
          L.sourceVisibility,
          inst.sourceVisibility,
          change.sourceVisibility,
          null,
          meta,
        ),
      );
    follow(plan, { kind: "reconcile-actor", actorId: a.id });
    return {
      p,
      plan,
      source: inst.source,
      sourceVisibility: change.sourceVisibility === "shared" ? "shared" : inst.sourceVisibility,
      sourceOwner: inst.owner,
      reason: sel.reason,
    };
  }
  if (sel.kind === "exhaustion") {
    if (!integer(sel.level) || sel.level > 6) p.errors.push(message("level"));
    if (!filled(sel.reason)) p.errors.push(message("reason"));
    checkSource(p, sel.source);
    const before = exhaustionOf(a).level;
    if (!p.errors.length && sel.level === before) p.errors.push(message("unchanged"));
    if (p.errors.length) return { p, plan };
    plan.patch.exhaustion = sel.level;
    plan.rows.push(row("exhaustion", L.exhaustion, a.exhaustion ?? null, sel.level, sel.source));
    if (sel.level === 6) markDead(a, plan, DEF.get("exhaustion").source);
    follow(plan, { kind: "reconcile-actor", actorId: a.id });
    return { p, plan, source: sel.source, reason: sel.reason };
  }
  if (sel.kind === "held-items") {
    const inst = findVisible();
    if (!filled(sel.reason)) p.errors.push(message("reason"));
    const ids = (a.inventory ?? []).map((i) => i?.id);
    if (
      !Array.isArray(sel.itemIds) ||
      new Set(sel.itemIds).size !== sel.itemIds.length ||
      sel.itemIds.some((id) => !ids.includes(id))
    )
      p.errors.push(message("items"));
    if (inst && (inst.id !== "unconscious" || !(inst.reconciliation ?? []).includes("held-items")))
      p.errors.push(message("instance"));
    if (p.errors.length) return { p, plan };
    plan.updates.push({
      instanceId: inst.instanceId,
      patch: {
        reconciliation: inst.reconciliation.filter((c) => c !== "held-items"),
        droppedItemIds: [...sel.itemIds],
      },
    });
    plan.patch.heldItemIds = [];
    plan.drops.push(...sel.itemIds);
    plan.rows.push(
      row("heldItemIds", L.held, a.heldItemIds ?? null, [], inst.source, metaOf(inst)),
    );
    plan.rows.push(
      row("droppedItemIds", L.dropped, [], [...sel.itemIds], inst.source, metaOf(inst)),
    );
    follow(plan, { kind: "reconcile-actor", actorId: a.id });
    return {
      p,
      plan,
      source: inst.source,
      sourceVisibility: inst.sourceVisibility,
      sourceOwner: inst.owner,
      reason: sel.reason,
    };
  }
  p.errors.push(message("selection"));
  return { p, plan };
}

export function previewConditionChange(s, actorId, selection, v) {
  const a = actorFor(s, actorId, v);
  const out = conditionPlan(s, a, selection, v, "preview");
  const p = draft(a, out.p.hidden);
  p.errors.push(...out.p.errors);
  p.warnings.push(...out.p.warnings);
  return finish(p, out.plan, {
    kind: "condition",
    selection,
    actor: relevant(s, a),
    turn: turnKeyOf(s),
  });
}

export function applyConditionChange(s, actorId, selection, v, options = {}) {
  return perform(
    s,
    "condition",
    actorId,
    selection,
    v,
    options,
    () => previewConditionChange(s, actorId, selection, v),
    (p, eventId, inputKey) => {
      const a = s.actors[actorId];
      const out = conditionPlan(s, a, selection, v, eventId);
      if (out.p.errors.length) fail(out.p.errors[0].code, out.p.errors[0].it, out.p.errors[0].en);
      execute(a, out.plan);
      const result = {
        eventId,
        actorId,
        kind: selection.kind,
        instanceIds: out.instanceIds ?? [],
        endedInstanceIds: out.endedIds ?? [],
        rows: publicRows(out.plan.rows),
        followUps: copy(out.plan.followUps),
        warnings: copy(p.warnings),
        reconciliation: copy(out.plan.reconciliation),
      };
      const privateApply = selection.kind !== "exhaustion" && selection.visibility === "private";
      record(s, {
        id: eventId,
        kind: selection.kind,
        actorId,
        actorIds: [actorId],
        owner: v,
        inputKey,
        commit: p.commit,
        label: EVENT_LABEL[selection.kind],
        reason: out.reason ?? null,
        source: out.source ?? null,
        sourceVisibility: out.sourceVisibility ?? "shared",
        sourceOwner: out.sourceOwner ?? v,
        rows: (privateApply ? stampPrivate(out.plan.rows, v) : out.plan.rows).map((r) => ({
          ...r,
          actorId,
        })),
        at: { turnKey: turnKeyOf(s) },
        result,
      });
      return result;
    },
  );
}

// ---------------------------------------------------------------- standing

const standCost = (speed) => noise(Math.floor(noise(speed / 0.3) / 2) * 0.3);
function standPlan(s, a, v, { effectiveActor, blocking } = {}) {
  const p = { errors: [], warnings: [], costs: [] },
    plan = newPlan();
  const eff = effectiveActor?.id === a.id ? effectiveActor : a;
  if (!canControl(s, a, v)) p.errors.push(message("permission"));
  const all = instancesOf(a);
  const prone = all.filter((i) => i.id === "prone");
  if (!prone.length) p.errors.push(message("not-prone"));
  if (a.dead === true || !isActorAvailable(a)) p.errors.push(message("cannot-act"));
  const m = mechanicsFrom(all, a, eff.speed);
  if (m.speed === null) p.errors.push(message("speed-unknown"));
  else if (m.speedZero || m.speed <= 0) p.errors.push(message("speed-zero"));
  if (blocking === true) p.errors.push(message("pending"));
  const cost = m.speed ? standCost(m.speed) : 0;
  if (inCombat(s, a.id)) {
    if (turnActor(s) !== a.id) p.errors.push(message("turn"));
    else if (!Number.isFinite(a.movement)) p.errors.push(message("movement-unknown"));
    else if (a.movement + 1e-9 < cost) p.errors.push(message("movement"));
    if (!p.errors.length) {
      const remaining = noise(Math.max(0, a.movement - cost));
      const base = Number.isFinite(eff.speed) ? eff.speed : 0;
      const dash = integer(a.dashCount) ? a.dashCount : 0;
      const spent = Number.isFinite(a.movementSpent)
        ? a.movementSpent
        : Math.max(0, base * (1 + dash) - a.movement);
      p.costs.push({
        kind: "movement",
        actorId: a.id,
        amount: cost,
        before: a.movement,
        after: remaining,
        source: copy(DEF.get("prone").source),
      });
      plan.patch.movement = remaining;
      plan.patch.movementSpent = noise(spent + cost);
      plan.rows.push(row("movement", L.movement, a.movement, remaining, DEF.get("prone").source));
    }
  } else p.warnings.push(message("outside-initiative"));
  if (p.errors.length) return { p, plan, speed: m.speed };
  plan.remove.push(...prone.map((i) => i.instanceId));
  plan.rows.push(
    row(
      "conditions.prone",
      nameOf("prone"),
      true,
      hasCondition(after(a, plan), "prone"),
      DEF.get("prone").source,
    ),
  );
  follow(plan, { kind: "reconcile-actor", actorId: a.id });
  return { p, plan, speed: m.speed };
}
export function previewStand(s, actorId, v, { effectiveActor, blocking } = {}) {
  const a = actorFor(s, actorId, v);
  const out = standPlan(s, a, v, { effectiveActor, blocking });
  const p = draft(a);
  p.errors.push(...out.p.errors);
  p.warnings.push(...out.p.warnings);
  p.costs = out.p.costs;
  return finish(p, out.plan, {
    kind: "stand",
    actor: relevant(s, a),
    movement: [a.movement, a.movementSpent, a.dashCount],
    speed: out.speed,
    blocking: blocking === true,
    turn: turnKeyOf(s),
  });
}
export function standUp(s, actorId, v, options = {}) {
  const context = { effectiveActor: options.effectiveActor, blocking: options.blocking };
  return perform(
    s,
    "stand",
    actorId,
    {},
    v,
    options,
    () => previewStand(s, actorId, v, context),
    (p, eventId, inputKey) => {
      const a = s.actors[actorId];
      const out = standPlan(s, a, v, context);
      const ended = execute(a, out.plan);
      const result = {
        eventId,
        actorId,
        kind: "stand",
        endedInstanceIds: ended.map((i) => i.instanceId),
        costs: copy(p.costs),
        rows: publicRows(out.plan.rows),
        followUps: copy(out.plan.followUps),
      };
      record(s, {
        id: eventId,
        kind: "stand",
        actorId,
        actorIds: [actorId],
        owner: v,
        inputKey,
        commit: p.commit,
        label: EVENT_LABEL.stand,
        source: copy(DEF.get("prone").source),
        rows: out.plan.rows.map((r) => ({ ...r, actorId })),
        at: { turnKey: turnKeyOf(s) },
        result,
      });
      return result;
    },
  );
}

// ---------------------------------------------------------------- vitality commands

const TEMP_HP = srd([18], [20]);
// Temporary HP do not stack: with some already, the controller keeps them or takes the
// new ones (SRD EN 18 / IT 20). They are not healing and never restore consciousness.
function planTempHp(a, { amount, choice }) {
  const plan = newPlan();
  if (!integer(amount)) return (plan.errors.push(message("amount")), { plan });
  if (a.dead === true) return (plan.errors.push(message("dead")), { plan });
  const before = a.tempHp == null ? 0 : integer(a.tempHp) ? a.tempHp : null;
  if (before === null) return (plan.errors.push(message("temp-hp-unknown")), { plan });
  let after = amount;
  if (before > 0 && amount > 0) {
    if (!["keep", "replace"].includes(choice))
      return (plan.errors.push(message("temp-hp-choice")), { plan });
    if (choice === "keep") return (plan.errors.push(message("temp-hp-keep")), { plan });
  }
  if (after === before) return (plan.errors.push(message("unchanged")), { plan });
  plan.patch.tempHp = after;
  plan.rows.push(row("tempHp", L.tempHp, before, after, TEMP_HP));
  if (a.hp === 0) warn(plan, "temp-hp-zero");
  follow(plan, { kind: "reconcile-actor", actorId: a.id });
  return { plan, breakdown: { tempHpBefore: before, tempHpAfter: after, granted: amount } };
}
function vitalityPlan(s, a, sel, v, eventId) {
  const errors = [];
  if (!canControl(s, a, v)) errors.push(message("permission"));
  if (!object(sel) || !["damage", "heal", "correct", "temp-hp"].includes(sel.kind))
    return { errors: [...errors, message("selection")], plan: newPlan() };
  if (!filled(sel.reason)) errors.push(message("reason"));
  if (!hasSource(sel.source)) errors.push(message("source"));
  let out;
  if (sel.kind === "damage") {
    let knockout = false;
    if (sel.knockout === true || sel.knockout?.melee === true) knockout = true;
    else if (sel.knockout !== undefined && sel.knockout !== false && sel.knockout !== null)
      errors.push(message("knockout-melee"));
    out = planDamage(
      s,
      a,
      { amount: sel.amount, critical: sel.critical === true, knockout },
      eventId,
    );
  } else if (sel.kind === "heal") out = planHealing(s, a, sel.amount);
  else if (sel.kind === "temp-hp") out = planTempHp(a, sel);
  else out = planCorrection(s, a, sel.patch, sel.source, eventId);
  return {
    errors: [...errors, ...out.plan.errors],
    plan: out.plan,
    breakdown: out.breakdown ?? null,
  };
}
export function previewVitalityChange(s, actorId, selection, v) {
  const a = actorFor(s, actorId, v);
  const out = vitalityPlan(s, a, selection, v, "preview");
  const p = draft(a);
  p.errors.push(...out.errors);
  out.plan.errors = [];
  p.breakdown = p.errors.some((e) => e.code === "permission") ? null : (out.breakdown ?? null);
  const actor = relevant(s, a);
  delete actor.inventory;
  delete actor.immunities;
  return finish(p, out.plan, { kind: "vitality", selection, actor });
}
const VITALITY_KIND = {
  damage: "damage",
  heal: "healing",
  correct: "vitality-correct",
  "temp-hp": "temp-hp",
};
export function applyVitalityChange(s, actorId, selection, v, options = {}) {
  return perform(
    s,
    "vitality",
    actorId,
    selection,
    v,
    options,
    () => previewVitalityChange(s, actorId, selection, v),
    (p, eventId, inputKey) => {
      const a = s.actors[actorId];
      const out = vitalityPlan(s, a, selection, v, eventId);
      if (out.errors.length) fail(out.errors[0].code, out.errors[0].it, out.errors[0].en);
      execute(a, out.plan);
      const kind = VITALITY_KIND[selection.kind];
      const result = {
        eventId,
        actorId,
        kind,
        breakdown: copy(out.breakdown),
        rows: publicRows(out.plan.rows),
        followUps: copy(out.plan.followUps),
        warnings: copy(out.plan.warnings),
        reconciliation: copy(out.plan.reconciliation),
      };
      record(s, {
        id: eventId,
        kind,
        actorId,
        actorIds: [actorId],
        owner: v,
        inputKey,
        commit: p.commit,
        label: EVENT_LABEL[kind],
        reason: selection.reason,
        source: copy(selection.source),
        rows: out.plan.rows.map((r) => ({ ...r, actorId })),
        result,
      });
      return result;
    },
  );
}

// Trusted adapter: the combat/rest/healing operation already authorized this fact.
export function applyVitalityEvent(s, event) {
  if (!object(event) || !validId(event.eventId)) fail("operation-id");
  const inputKey = campaignReviewKey({ trusted: "vitality", event });
  const old = events(s).find((e) => e.id === event.eventId);
  if (old) {
    if (old.trusted !== true || old.inputKey !== inputKey) fail("id-conflict");
    return copy(old.result);
  }
  const a = s.actors?.[event.actorId];
  if (!object(a)) fail("unavailable");
  if (!["damage", "healing"].includes(event.kind)) fail("selection");
  if (!hasSource(event.source)) fail("source");
  let knockout = false;
  if (event.knockout?.melee === true) knockout = true;
  else if (event.knockout !== undefined && event.knockout !== null && event.knockout !== false)
    fail("knockout-melee");
  const out =
    event.kind === "damage"
      ? planDamage(
          s,
          a,
          {
            amount: event.amount,
            critical: event.critical === true,
            knockout,
            clockId: event.clockId,
          },
          event.eventId,
        )
      : planHealing(s, a, event.amount);
  if (out.plan.errors.length) fail(out.plan.errors[0].code);
  execute(a, out.plan);
  const result = {
    eventId: event.eventId,
    actorId: a.id,
    kind: event.kind,
    breakdown: copy(out.breakdown),
    rows: publicRows(out.plan.rows),
    followUps: copy(out.plan.followUps),
    warnings: copy(out.plan.warnings),
    reconciliation: copy(out.plan.reconciliation),
  };
  record(s, {
    id: event.eventId,
    trusted: true,
    kind: event.kind,
    actorId: a.id,
    actorIds: [a.id],
    owner: "system",
    inputKey,
    label: EVENT_LABEL[event.kind],
    source: copy(event.source),
    sourceVisibility: event.sourceVisibility === "private" ? "private" : "shared",
    sourceOwner: event.sourceOwner ?? null,
    rows: out.plan.rows.map((r) => ({ ...r, actorId: a.id })),
    result,
  });
  return copy(result);
}

// Trusted adapter for a rule consequence the caller already authorized (a hit, a
// rest activity). Applies or ends instances with the same consequences as commands.
export function applyConditionEvent(s, event) {
  if (!object(event) || !validId(event.eventId)) fail("operation-id");
  const inputKey = campaignReviewKey({ trusted: "condition", event });
  const old = events(s).find((e) => e.id === event.eventId);
  if (old) {
    if (old.trusted !== true || old.inputKey !== inputKey) fail("id-conflict");
    return copy(old.result);
  }
  const a = s.actors?.[event.actorId];
  if (!object(a)) fail("unavailable");
  if (!hasSource(event.source)) fail("source");
  if (event.restId != null && !validId(event.restId)) fail("selection");
  const plan = newPlan(),
    p = { errors: [], warnings: [] };
  let instanceIds = [],
    endedIds = [],
    instance = null;
  if (event.kind === "apply") {
    const def = DEF.get(event.conditionId);
    if (!def || def.id === "exhaustion") fail("condition");
    const origin = originFor(s, event.origin, TRUSTED, p);
    const term = event.term == null ? { kind: "manual" } : termFor(s, a, event.term, TRUSTED, p);
    const visibility = event.visibility === "private" ? "private" : "shared";
    const sourceVisibility = event.sourceVisibility === "private" ? "private" : "shared";
    if (p.errors.length) fail(p.errors[0].code, p.errors[0].it, p.errors[0].en);
    const known = immunities(a);
    if (known?.includes(def.id)) reconcile(plan, "immune");
    else if (known === null && event.immunityConfirmed !== true)
      reconcile(plan, "immunity-unknown");
    else {
      instance = makeInstance({
        id: def.id,
        instanceId: `${event.eventId}:${def.id}`,
        source: event.source,
        origin,
        owner: validId(event.owner) ? event.owner : "system",
        visibility,
        sourceVisibility,
        originCampaignId: originCampaign(s, a),
        term,
        restId: event.restId ?? null,
        cause: typeof event.cause === "string" ? event.cause : null,
        mode: "rule",
      });
      plan.rows.push(
        row(`conditions.${def.id}`, def.name, hasCondition(a, def.id), true, event.source, {
          ...metaOf(instance),
        }),
      );
      if (def.id === "unconscious") unconsciousConsequences(s, a, plan, instance);
      else if ([...INCLUDES_INCAPACITATED, "incapacitated"].includes(def.id))
        endConcentration(a, plan, def.id);
      plan.add.unshift(instance);
      instanceIds = plan.add.map((i) => i.instanceId);
    }
  } else if (event.kind === "exhaustion") {
    // A rule-driven level change (a Long Rest) keeps the same event history as the panel.
    const before = exhaustionOf(a).level;
    if (!integer(event.level) || event.level > 6 || before === null) fail("level");
    if (!filled(event.reason)) fail("reason");
    if (event.level !== before) {
      plan.patch.exhaustion = event.level;
      plan.rows.push(
        row("exhaustion", L.exhaustion, a.exhaustion ?? null, event.level, event.source),
      );
      if (event.level === 6) markDead(a, plan, DEF.get("exhaustion").source);
    }
  } else if (event.kind === "end") {
    if (!filled(event.reason)) fail("reason");
    const due = instancesOf(a).filter((i) =>
      event.instanceId
        ? i.instanceId === event.instanceId
        : event.restId
          ? i.restId === event.restId && i.id !== "prone"
          : typeof event.cause === "string" && i.cause === event.cause,
    );
    if (!due.length) fail("instance");
    plan.remove.push(...due.map((i) => i.instanceId));
    const remaining = after(a, plan);
    for (const i of due)
      plan.rows.push(
        row(
          `conditions.${i.id}`,
          nameOf(i.id),
          true,
          hasCondition(remaining, i.id),
          i.source,
          metaOf(i),
        ),
      );
    endedIds = due.map((i) => i.instanceId);
    instance = due[0];
  } else fail("selection");
  if (plan.rows.length) follow(plan, { kind: "reconcile-actor", actorId: a.id });
  execute(a, plan);
  const result = {
    eventId: event.eventId,
    actorId: a.id,
    kind: event.kind,
    applied: plan.rows.length > 0,
    instanceIds,
    endedInstanceIds: endedIds,
    rows: publicRows(plan.rows),
    followUps: copy(plan.followUps),
    warnings: copy(p.warnings),
    reconciliation: copy(plan.reconciliation),
  };
  record(s, {
    id: event.eventId,
    trusted: true,
    kind: event.kind,
    actorId: a.id,
    actorIds: [a.id],
    owner: "system",
    inputKey,
    label: EVENT_LABEL[event.kind],
    reason: event.reason ?? null,
    source: copy(event.source),
    sourceVisibility: instance?.sourceVisibility ?? "shared",
    sourceOwner: instance?.owner ?? null,
    rows: plan.rows.map((r) => ({ ...r, actorId: a.id })),
    result,
  });
  return copy(result);
}

// ---------------------------------------------------------------- roll descriptors and outcomes

const rollEventFor = (s, id) => events(s).find((e) => e.kind === "roll" && e.descriptorId === id);
function describe(fields) {
  return { dc: null, modifier: 0, modifierSources: [], context: {}, ...fields };
}
export function describeDeathSave(s, actorId, { triggerId, turnKey, outsideInitiative } = {}, v) {
  const a = actorFor(s, actorId, v);
  if (!canControl(s, a, v)) fail("permission");
  if (!validId(triggerId)) fail("operation-id");
  if (!dyingNow(a)) fail("not-due");
  // One save per actual turn: an in-initiative save is bound to its turn identity.
  if (turnKey !== undefined) {
    if (turnActor(s) !== a.id || turnKey !== turnKeyOf(s) || triggerId !== "turn:" + turnKey)
      fail("not-due");
  } else if (outsideInitiative !== true || inCombat(s, a.id)) fail("not-due");
  const id = `death-save:${a.id}:${triggerId}`;
  if (rollEventFor(s, id)) fail("resolved");
  const save = conditionSaveRules(a, "death");
  return describe({
    id,
    kind: "death-save",
    actorId: a.id,
    targetId: a.id,
    triggerId,
    dice: [{ count: 1, sides: 20 }],
    modifier: save.modifier,
    modifierSources: save.modifierSources,
    dc: 10,
    source: copy(DEATH_SAVES),
    originCampaignId: originCampaign(s, a),
    owner: a.owner ?? null,
    context: {
      turnKey: turnKey ?? null,
      outsideInitiative: turnKey === undefined,
      deathSavesBefore: deathSavesOf(a),
    },
  });
}
export function describeStableRecovery(s, actorId, v) {
  const a = actorFor(s, actorId, v);
  if (!canControl(s, a, v)) fail("permission");
  const ds = deathSavesOf(a);
  if (a.dead === true || a.hp !== 0 || !ds.stable || !ds.recovery || ds.recovery.expiresAt != null)
    fail("not-stable");
  const id = `stable-recovery:${a.id}:${ds.recovery.stabilityId}`;
  if (rollEventFor(s, id)) fail("resolved");
  return describe({
    id,
    kind: "stable-recovery",
    actorId: a.id,
    targetId: a.id,
    triggerId: ds.recovery.stabilityId,
    dice: [{ count: 1, sides: 4 }],
    source: copy(AT_ZERO),
    originCampaignId: originCampaign(s, a),
    owner: a.owner ?? null,
    context: {
      stabilityId: ds.recovery.stabilityId,
      clockId: ds.recovery.clockId,
      startedAt: ds.recovery.startedAt,
      unit: "hours",
    },
  });
}
function medicineModifier(eff) {
  if (Number.isFinite(eff?.skillModifiers?.medicine))
    return {
      value: eff.skillModifiers.medicine,
      sources: [{ kind: "skill-modifier", skill: "medicine", value: eff.skillModifiers.medicine }],
    };
  if (!Array.isArray(eff?.skills) || !Number.isFinite(eff.abilities?.wis)) return null;
  const wis = Math.floor((eff.abilities.wis - 10) / 2);
  const sources = [{ kind: "ability", ability: "wis", value: wis }];
  if (eff.skills.includes("medicine")) {
    if (!Number.isFinite(eff.proficiencyBonus)) return null;
    const bonus = eff.proficiencyBonus * (eff.expertise?.includes?.("medicine") ? 2 : 1);
    sources.push({ kind: "proficiency", skill: "medicine", value: bonus });
  }
  return { value: sources.reduce((sum, m) => sum + m.value, 0), sources };
}
const knockedOut = (a) =>
  instancesOf(a).some((i) => i.id === "unconscious" && i.cause === "knockout");
function aidPlan(s, input, v, { effectiveActor } = {}, eventId) {
  if (!object(input)) fail("selection");
  const helper = actorFor(s, input.actorId, v),
    target = actorFor(s, input.targetId, v);
  const eff = effectiveActor?.id === helper.id ? effectiveActor : helper;
  const p = { errors: [], warnings: [], costs: [] },
    plan = newPlan();
  if (!["stabilize", "wake-knockout"].includes(input.kind)) p.errors.push(message("selection"));
  if (!canControl(s, helper, v)) p.errors.push(message("permission"));
  if (helper.id === target.id) p.errors.push(message("self-aid"));
  const hm = mechanicsFrom(instancesOf(helper), helper, eff.speed);
  if (helper.dead === true || hm.incapacitated || !isActorAvailable(helper) || helper.hp === 0)
    p.errors.push(message("cannot-act"));
  const combat = inCombat(s, helper.id);
  if (combat) {
    if (turnActor(s) !== helper.id) p.errors.push(message("turn"));
    else if (helper.action !== true) p.errors.push(message("action"));
  }
  if (input.kind === "stabilize" && !dyingNow(target)) p.errors.push(message("not-dying"));
  if (input.kind === "wake-knockout" && !knockedOut(target))
    p.errors.push(message("not-knocked-out"));
  const medicine = medicineModifier(eff);
  if (!medicine) p.errors.push(message("medicine-unknown"));
  const modifierSources = [...(medicine?.sources ?? []), ...exhaustionSources(helper)];
  const rollMode = hm.checkDisadvantage.some((r) => !r.requires) ? "disadvantage" : "normal";
  if (hm.checkDisadvantage.some((r) => r.requires)) p.warnings.push(message("fear-sight"));
  const descriptor = describe({
    id: `medicine:${eventId}`,
    kind: "medicine",
    actorId: helper.id,
    targetId: target.id,
    triggerId: eventId,
    dice: [{ count: rollMode === "normal" ? 1 : 2, sides: 20 }],
    modifier: modifierSources.reduce((sum, m) => sum + m.value, 0),
    modifierSources,
    dc: 10,
    source: copy(STABILIZE),
    originCampaignId: originCampaign(s, target),
    owner: helper.owner ?? null,
    context: {
      aidKind: input.kind,
      rollMode,
      targetDeathSaves: deathSavesOf(target),
      // The Help action is spent only in initiative; outside it nothing is spent.
      actionSpent: combat,
    },
  });
  if (combat && !p.errors.length) {
    p.costs.push({
      kind: "action",
      actorId: helper.id,
      before: true,
      after: false,
      source: copy(STABILIZE),
    });
    plan.rows.push(row("action", L.action, true, false, STABILIZE));
  }
  return { p, plan, helper, target, descriptor, combat };
}
export function previewAid(s, input, v, { effectiveActor } = {}) {
  const out = aidPlan(s, input, v, { effectiveActor }, "preview");
  const p = draft(out.helper);
  p.commit =
    localActor(out.helper) && localActor(out.target)
      ? commitFor(out.target)
      : { local: false, visibility: "shared" };
  p.targetId = out.target.id;
  p.targetName = copy(out.target.name);
  p.errors.push(...out.p.errors);
  p.warnings.push(...out.p.warnings);
  p.costs = out.p.costs;
  p.descriptor = p.errors.length ? null : out.descriptor;
  const { id, triggerId, ...stable } = out.descriptor;
  return finish(p, out.plan, {
    kind: "aid",
    input,
    helper: relevant(s, out.helper),
    action: out.helper.action,
    target: relevant(s, out.target),
    descriptor: stable,
    turn: turnKeyOf(s),
  });
}
export function beginAid(s, input, v, options = {}) {
  return perform(
    s,
    "aid",
    input?.actorId,
    input,
    v,
    options,
    () => previewAid(s, input, v, { effectiveActor: options.effectiveActor }),
    (p, eventId, inputKey) => {
      const out = aidPlan(s, input, v, { effectiveActor: options.effectiveActor }, eventId);
      if (out.combat) out.helper.action = false;
      const result = {
        eventId,
        actorId: out.helper.id,
        targetId: out.target.id,
        kind: "aid",
        descriptor: copy(out.descriptor),
        costs: copy(p.costs),
        rows: publicRows(out.plan.rows),
        followUps: [],
      };
      record(s, {
        id: eventId,
        kind: "aid",
        actorId: out.helper.id,
        actorIds: [...new Set([out.helper.id, out.target.id])],
        owner: v,
        inputKey,
        commit: p.commit,
        label: EVENT_LABEL.aid,
        source: copy(STABILIZE),
        rows: out.plan.rows.map((r) => ({ ...r, actorId: out.helper.id })),
        result,
      });
      return result;
    },
  );
}

function rollBlocker(s, d) {
  if (rollEventFor(s, d.id)) return "resolved";
  const t = s.actors?.[d.targetId ?? d.actorId];
  if (!object(t)) return "unavailable";
  if (d.kind === "death-save" || (d.kind === "medicine" && d.context?.aidKind === "stabilize")) {
    if (t.dead === true) return "dead";
    if (t.hp !== 0) return "not-at-zero";
    if (policyOf(t) !== "death-saves") return "policy";
    if (deathSavesOf(t).stable) return "stable";
    // One save per actual turn: a request made outside initiative no longer applies once
    // the creature is in the order, a turn-bound one only in its own running encounter.
    if (d.kind === "death-save") {
      const turn = d.context?.turnKey ?? null;
      const running =
        !!s.combat?.active &&
        typeof turn === "string" &&
        turn.startsWith(`${s.combat.encounterId ?? "demo"}:`);
      if (turn === null ? inCombat(s, t.id) : !running) return "not-due";
    }
    return null;
  }
  if (d.kind === "medicine") return knockedOut(t) ? null : "not-knocked-out";
  const ds = deathSavesOf(t);
  if (t.dead === true || t.hp !== 0 || !ds.stable || !ds.recovery) return "not-stable";
  if (ds.recovery.stabilityId !== d.context?.stabilityId) return "stability-changed";
  if (ds.recovery.expiresAt != null) return "resolved";
  return null;
}
// Re-derives a roll descriptor from the domain instead of trusting the caller: Medicine
// from its recorded issuance; a death save from its turn or request binding, with the
// modifier recomputed from the creature's current d20 Test penalties; a stable recovery
// from the current stability. A forged total, subject or trigger is refused.
function trustedDescriptor(s, descriptor) {
  if (
    !object(descriptor) ||
    !["death-save", "medicine", "stable-recovery"].includes(descriptor.kind) ||
    typeof descriptor.id !== "string"
  )
    fail("descriptor");
  if (descriptor.kind === "medicine") {
    const issued = events(s).find(
      (e) => e.kind === "aid" && e.result?.descriptor?.id === descriptor.id,
    );
    if (!issued) fail("descriptor");
    return copy(issued.result.descriptor);
  }
  const actorId = descriptor.actorId,
    triggerId = descriptor.triggerId,
    a = s.actors?.[actorId],
    context = object(descriptor.context) ? descriptor.context : {};
  if (
    !object(a) ||
    typeof actorId !== "string" ||
    (descriptor.targetId ?? actorId) !== actorId ||
    !validId(triggerId) ||
    descriptor.id !== `${descriptor.kind}:${actorId}:${triggerId}`
  )
    fail("descriptor");
  if (descriptor.kind === "death-save") {
    const turn = context.turnKey ?? null;
    const bound =
      turn === null
        ? context.outsideInitiative === true
        : typeof turn === "string" &&
          turn.endsWith(":" + actorId) &&
          triggerId === "turn:" + turn &&
          context.outsideInitiative !== true;
    if (!bound) fail("descriptor");
    const save = conditionSaveRules(a, "death");
    return describe({
      ...copy(descriptor),
      targetId: actorId,
      dice: [{ count: 1, sides: 20 }],
      dc: 10,
      modifier: save.modifier,
      modifierSources: save.modifierSources,
      source: copy(DEATH_SAVES),
    });
  }
  if (context.stabilityId !== triggerId) fail("descriptor");
  return describe({
    ...copy(descriptor),
    targetId: actorId,
    dice: [{ count: 1, sides: 4 }],
    dc: null,
    modifier: 0,
    modifierSources: [],
    source: copy(AT_ZERO),
  });
}
/** The domain's current, validated form of a vitality roll descriptor. */
export function currentVitalityDescriptor(s, descriptor) {
  return trustedDescriptor(s, descriptor);
}
export function getVitalityRollState(s, descriptor, v) {
  const d = trustedDescriptor(s, descriptor);
  const roller = actorFor(s, d.actorId, v);
  const target = s.actors?.[d.targetId ?? d.actorId] ?? roller;
  const blocker = rollBlocker(s, d);
  return {
    needed: !blocker,
    canResolve: !blocker && canControl(s, roller, v),
    reason: blocker ? message(blocker) : null,
    commit: commitFor(target),
  };
}
function pickNatural(d, values) {
  const mode = d.context?.rollMode ?? "normal";
  if (mode === "advantage") return Math.max(...values);
  if (mode === "disadvantage") return Math.min(...values);
  return values[0];
}
export function applyVitalityRoll(s, { eventId, descriptor, values } = {}, v) {
  if (!validId(eventId)) fail("operation-id");
  const inputKey = campaignReviewKey({ descriptorId: descriptor?.id, values });
  const old = events(s).find((e) => e.id === eventId);
  if (old) {
    if (old.kind !== "roll" || old.inputKey !== inputKey) fail("id-conflict");
    actorFor(s, old.actorId, v);
    return copy(old.result);
  }
  const d = trustedDescriptor(s, descriptor);
  const roller = actorFor(s, d.actorId, v);
  const target = s.actors?.[d.targetId ?? d.actorId];
  // Only a controller answers, even when the roll is no longer needed: a reader
  // never records an event on someone else's creature.
  if (!canControl(s, roller, v)) fail("permission");
  if (d.kind !== "medicine" && !canControl(s, target, v)) fail("permission");
  const blocker = rollBlocker(s, d);
  const base = {
    id: eventId,
    kind: "roll",
    descriptorId: d.id,
    actorId: roller.id,
    owner: v,
    inputKey,
    source: copy(d.source),
    label: EVENT_LABEL.roll,
  };
  if (blocker) {
    const result = {
      outcome: {
        kind: d.kind,
        status: "expired",
        reason: message(blocker),
        natural: null,
        modifier: d.modifier,
        total: null,
        success: null,
        rows: [],
      },
      followUps: [],
    };
    record(s, { ...base, actorIds: [roller.id], rows: [], result });
    return copy(result);
  }
  const count = d.dice.reduce((sum, die) => sum + die.count, 0),
    sides = d.dice[0].sides;
  if (
    !Array.isArray(values) ||
    values.length !== count ||
    values.some((x) => !Number.isSafeInteger(x) || x < 1 || x > sides)
  )
    fail("values");
  const natural = pickNatural(d, values),
    total = natural + d.modifier;
  let plan = newPlan(),
    success = null,
    result = null,
    extra = {};
  if (d.kind === "death-save") {
    const ds = deathSavesOf(target),
      before = deathSavesOf(target);
    if (natural === 20) {
      plan = regainOnePlan(s, target);
      success = true;
      result = "regain-hp";
    } else {
      if (natural === 1) ds.failures = Math.min(3, ds.failures + 2);
      else if (total >= 10) ds.successes = Math.min(3, ds.successes + 1);
      else ds.failures = Math.min(3, ds.failures + 1);
      success = natural !== 1 && total >= 10;
      result = natural === 1 ? "two-failures" : success ? "success" : "failure";
      if (ds.successes >= 3) stabilizePlan(s, target, plan, eventId);
      else {
        plan.patch.deathSaves = ds;
        for (const key of ["successes", "failures"])
          if (ds[key] !== before[key])
            plan.rows.push(row(`deathSaves.${key}`, L[key], before[key], ds[key], DEATH_SAVES));
        if (ds.failures >= 3) markDead(target, plan, DEATH_SAVES);
      }
    }
  } else if (d.kind === "medicine") {
    success = total >= 10;
    result = success ? "success" : "failure";
    if (success && d.context?.aidKind === "stabilize") stabilizePlan(s, target, plan, eventId);
    else if (success) {
      removeCause(target, plan, "knockout");
      follow(plan, { kind: "reconcile-actor", actorId: target.id });
    }
  } else {
    const ds = deathSavesOf(target);
    const expiresAt = ds.recovery.startedAt + natural * HOUR;
    extra = { hours: natural, expiresAt };
    result = "scheduled";
    if (clockNow(s, ds.recovery.clockId) >= expiresAt) {
      plan = regainOnePlan(s, target);
      result = "regain-hp";
    } else {
      plan.patch.deathSaves = { ...ds, recovery: { ...ds.recovery, expiresAt } };
      plan.rows.push(row("deathSaves.recovery.expiresAt", L.recovery, null, expiresAt, AT_ZERO));
    }
  }
  execute(target, plan);
  const out = {
    outcome: {
      kind: d.kind,
      status: "applied",
      natural,
      modifier: d.modifier,
      total,
      dc: d.dc,
      success,
      result,
      ...extra,
      rows: publicRows(plan.rows),
    },
    followUps: copy(plan.followUps),
  };
  record(s, {
    ...base,
    actorIds: [...new Set([roller.id, target.id])],
    values: copy(values),
    rows: plan.rows.map((r) => ({ ...r, actorId: target.id })),
    result: out,
  });
  return copy(out);
}

// ---------------------------------------------------------------- observed facts

function expiresOn(s, i, ev) {
  const t = i.term;
  if (!object(t)) return false;
  if (ev.kind === "turn-start" || ev.kind === "turn-end")
    return (
      t.kind === "turn" &&
      t.phase === (ev.kind === "turn-start" ? "start" : "end") &&
      Array.isArray(ev.actorIds) &&
      ev.actorIds.includes(t.actorId) &&
      typeof ev.turnKey === "string" &&
      ev.turnKey !== t.excludeTurnKey &&
      (t.when !== "current" || t.turnKey === ev.turnKey)
    );
  if (ev.kind === "clock")
    return (
      t.kind === "clock" &&
      t.clockId === ev.clockId &&
      integer(t.expiresAt) &&
      clockNow(s, t.clockId) >= t.expiresAt
    );
  if (ev.kind === "rest")
    return (
      t.kind === "rest" &&
      (!Array.isArray(ev.actorIds) || ev.actorIds.includes(t.actorId)) &&
      (t.restId ? t.restId === ev.restId : t.restKind === "any" || t.restKind === ev.restKind)
    );
  return (
    t.kind === "concentration" &&
    t.concentrationId === ev.concentrationId &&
    (!Array.isArray(ev.actorIds) || ev.actorIds.includes(t.actorId))
  );
}
export function observeConditionEvent(s, event) {
  if (!object(event) || !validId(event.eventId)) fail("operation-id");
  if (!["turn-start", "turn-end", "clock", "rest", "concentration-end"].includes(event.kind))
    fail("selection");
  const inputKey = campaignReviewKey(event);
  const old = events(s).find((e) => e.id === event.eventId);
  if (old) {
    if (old.observed !== true || old.inputKey !== inputKey) fail("id-conflict");
    return copy(old.result);
  }
  const expired = [],
    rows = [],
    followUps = [];
  let recovered = false;
  for (const a of Object.values(s.actors ?? {})) {
    if (!object(a)) continue;
    const plan = newPlan();
    const due = instancesOf(a).filter((i) => expiresOn(s, i, event));
    if (due.length) {
      plan.remove.push(...due.map((i) => i.instanceId));
      const remaining = after(a, plan);
      for (const i of due) {
        expired.push({ actorId: a.id, instanceId: i.instanceId });
        plan.rows.push(
          row(
            `conditions.${i.id}`,
            i.custom ? text(i.label, i.label) : nameOf(i.id),
            true,
            i.custom ? false : hasCondition(remaining, i.id),
            i.source,
            metaOf(i),
          ),
        );
      }
      follow(plan, { kind: "reconcile-actor", actorId: a.id });
    }
    const ds = deathSavesOf(a);
    if (
      event.kind === "clock" &&
      ds.stable &&
      ds.recovery?.clockId === event.clockId &&
      integer(ds.recovery.expiresAt) &&
      clockNow(s, event.clockId) >= ds.recovery.expiresAt &&
      a.hp === 0 &&
      a.dead !== true
    ) {
      merge(plan, regainOnePlan(s, a));
      recovered = true;
    }
    if (!plan.rows.length) continue;
    execute(a, plan);
    rows.push(...plan.rows.map((r) => ({ ...r, actorId: a.id })));
    for (const f of plan.followUps) followUps.push(f);
  }
  const result = {
    eventId: event.eventId,
    expired,
    rows: rows.map((r) => ({ actorId: r.actorId, ...publicRows([r])[0] })),
    followUps,
  };
  record(s, {
    id: event.eventId,
    observed: true,
    kind: expired.length ? "expired" : recovered ? "recovered" : "observed",
    actorIds: [...new Set(rows.map((r) => r.actorId))],
    owner: "system",
    inputKey,
    label: EVENT_LABEL[expired.length ? "expired" : recovered ? "recovered" : "observed"],
    source: null,
    rows,
    result,
  });
  return copy(result);
}
