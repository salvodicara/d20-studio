# Condizioni e vitalità — API incremento 10

23/09/2026. API accettata tecnicamente dal coordinatore prima del codice.
Autore `/root/review_journey`. Ownership: nuovi `conditions.mjs`, test,
questo documento e rapporto dominio. Root modifica gli adapter esistenti;
l'autore UI usa proiezioni e callback concordati. Nessun browser condiviso.

Fonti: [piano, incremento 10](blueprint-build-plan.md),
[R194](blueprint-conditions-research.md),
[raccordi esistenti](blueprint-conditions-seams.md).

## Dati canonici e significato

```js
actor.conditions = [
  {
    id: "poisoned", // definition; legacy consumers already use id
    instanceId: "operation-id:condition",
    source: { kind, edition, revision, sha256, url, pages },
    origin: { actorId, eventId, label }, // each field optional when unknown
    owner: "player",
    visibility: "shared", // shared | private, for the application itself
    sourceVisibility: "private", // public condition with a private origin is possible
    originCampaignId: "lanterns", // null preserves personal history after joining
    term: { kind: "manual" },
    restId: null, // existing sleep cause remains independent
    cause: null, // zero-hp | knockout | sleep | source-specific
    reconciliation: [],
  },
];
actor.exhaustion = 0; // sole canonical level, never a second sum
actor.dead = false;
actor.vitalityPolicy = {
  zeroHp: "death-saves", // death-saves | death | disappear | manual
  source: { kind, revision },
};
actor.deathSaves = {
  successes: 0,
  failures: 0,
  stable: false,
  recovery: null, // {stabilityId,clockId,startedAt,expiresAt,originCampaignId,owner}
};
actor.conditionImmunities = null; // unknown; [] is an explicit checked empty list
actor.conditionImmunitiesSource = null;
actor.heldItemIds = null; // unknown, not the same as equipped/worn
state.conditionEvents = []; // idempotent commands/observed facts, not a dice queue
```

HP, maximum HP, temporary HP, resources, turn order and clock stay on their
existing fields. The root assigns sourced zero-HP policies to explicit fixtures
and new creatures. A controlled NPC is not thereby assigned character death
saves. An absent policy or unknown HP/maxHP yields reconciliation, not guessed
death or a fabricated damage history. A familiar retains its existing
disappearance lifecycle.

Legacy strings and `{id,restId,source}` objects remain readable. Queries project
stable identifiers without inventing authors, dates or sources. Commands may
normalize the touched actor while retaining the legacy origin as unknown.
`actor.conditions` contains only active applications. Ending an instance removes
that instanceId and preserves its projected history in `conditionEvents`, with
source/visibility/owner and reason. No stale ended entry can impose mechanics.
Two origins of Poisoned impose one condition; ending one does not end the other.
Exhaustion uses the existing numeric field, with an event explaining each change.

## Authority, previews and commands

Public operations revalidate current ownership/controllers/membership and
private origin. DM has no universal access to personal actors or private
source details. Each command accepts `{operationId,reviewKey,online}`; retries
require current authority and identical input. An irrelevant note edit does
not invalidate a vitality preview. Shared writes reject `online:false`.
Stand and Aid options additionally accept the current root-derived
`effectiveActor`; both preview and commit include pertinent projected values
in their review key. Root derives it again at commit, not from untrusted input
or an earlier dialog snapshot.

Previews are pure and return:

```js
{
  canApply, errors: [{code,it,en}], warnings: [{code,it,en}],
  reviewKey, commit: {local,visibility}, actorId, actorName,
  rows: [{field,label,before,after,source}], costs: [],
  followUps: [], reconciliation: [],
}
```

No global Undo barrier: game state, conditions, events, resources and clock
are one ordinary store transaction. The root's existing dice history preserves
accepted faces and original audience. This module never generates a die or
stores a second pending roll.

## Queries and effective mechanics

```js
listConditionDefinitions(({ query } = {}));
getConditionOverview(state, actorId, viewer, ({ effectiveActor } = {}));
getConditionHistory(state, actorId, viewer);
hasCondition(actor, definitionId); // pure internal mechanics
getConditionMechanics(actor, ({ baseSpeed } = {})); // pure, no implicit authorization
conditionAttackRules(attacker, target, ({ distanceMeters, canSeeSource } = {}));
conditionSaveRules(actor, ability);
```

Catalog contains all 15 SRD definitions, EN/IT labels, immutable source and
explicit `supported`/`manual` effects. Custom labels never gain rules by name.
Overview contains `actorId,actorName,hp,maxHp,tempHp,dead,exhaustion,deathSaves,
policy,instances,active,mechanics,reconciliation,permissions,commit`. Instances,
history, source actor links, labels and terms are projected before rendering.
Permissions include `canControl,canManage,canStand,canHeal,canCorrect,
canRequestDeathSave`. Public status never exposes a hidden source's name or ID.
Catalog rows are `{id,name:{it,en},source,supported:[],manual:[]}`. Instances
add projected `name`, `permissions:{canEnd,canCorrect,canResolveHeldItems}`.
History rows are `{id,kind,actorId,label,source,rows,reason,owner}` after projection.
Overview `choices` contains `{clock:{id,seconds}|null,actors:[{id,name}],
concentrations:[{actorId,id,label}],heldItems:[{id,name,quantity,held}]}`;
only the subject's controller receives inventory choices, and inaccessible
source actors/concentrations never appear as selectable IDs.

Mechanics shape: `{conditionIds,incapacitated,cannotSpeak,speedZero,
speedPenalty,speed,crawling,exhaustion,d20Penalty,autoFailSaves:[],
attackDisadvantage,attacksAgainstAdvantage,criticalWithinMeters,
reconciliation:[],limitations:[]}`. Condition names/metadata in a public
overview are filtered; the internal pure helper takes raw authorized actors.

Mechanics report incapacity, inability to speak, speed zero, Exhaustion speed
and d20 penalties, crawling, STR/DEX automatic failures and relevant attack
advantage/disadvantage/near-hit critical reasons. They do not generate dice.
Incapacitated/Stunned alone do not impose speed zero. Prone's incoming attack
rule uses actual distance 1.5 m, not weapon category. Sight/source-dependent
rules carry an unresolved requirement when the needed context is unknown.

Root applies this projection after the form projection, never overwriting
canonical ability scores or base speed. `conditions.mjs` does not import Forms:
Forms may import its pure condition helpers without creating a dependency cycle.
Stand/Medicine/overview accept an optional `effectiveActor`, derived by root
from `getEffectiveActor` again inside the committing transaction. The fallback
is the canonical base actor, useful for base mechanics and standalone tests.
UI does not compute the projection or provide arbitrary speeds/modifiers.

## Condition applications, removal and standing

```js
previewConditionChange(state, actorId, selection, viewer);
applyConditionChange(state, actorId, selection, viewer, options);
previewStand(state, actorId, viewer, ({ effectiveActor } = {}));
standUp(state, actorId, viewer, options);
```

Selection is one of:

- `{kind:"apply",conditionId,source,origin?,term,visibility?,sourceVisibility?,
heldItemIds?,mode:"record"|"rule",immunityConfirmed?}`.
- `{kind:"end",instanceId,reason}`.
- `{kind:"correct",instanceId,patch:{term?,sourceVisibility?},reason}`.
- `{kind:"exhaustion",level,reason,source}`.
- `{kind:"custom",label,term,source,reason}`.
- `{kind:"held-items",instanceId,itemIds,reason}` for the explicitly unresolved
  held-item consequence; no inference that worn armor is held.

Unconscious creates/retains a distinct Prone application, ends concentration
and drops only known held items. Its end leaves Prone and unrelated causes of
Unconscious intact. Legacy sleep keeps its own restId. The trusted adapters
must close instances through this domain, not delete every unconscious label.

A manual `record` applies a deliberately recorded fact and warns if immunity
data are unknown. A sourced automatic `rule` application whose result genuinely
depends on unknown immunity yields reconciliation; explicit checked metadata
or confirmation is needed before claiming that rule applied. This does not
block manual records or known consequences of the separately declared zero-HP
policy. Known immunity blocks the rule;
a reasoned correction remains possible. Neither a warning nor a pending
immunity decision spends the originating action a second time.

Standing ends active Prone applications and spends movement only. Cost is
`floor(roundNoise(effectiveSpeed / 0.3) / 2) * 0.3`: 9 m → 4.5 m;
7.5 m → 3.6 m. Speed zero, unavailable actor, insufficient remaining budget or
a blocking causal request prevents the command. It preserves canonical
`movementSpent`/`dashCount` and does not supply a Dash or action. Root's path
adapter uses crawling multipliers 2× normal and 3× difficult, without multiplying
the difficult-terrain penalty twice.
Outside initiative Stand clears Prone without spending a budget left over from
an earlier turn; it still respects actual speed zero and incapacity.

## Vitality changes and root-only damage/healing seam

```js
previewVitalityChange(state, actorId, selection, viewer);
applyVitalityChange(state, actorId, selection, viewer, options);
applyVitalityEvent(state, event); // trusted adapter for a fact already authorized
```

Public selection: `{kind:"damage"|"heal",amount,reason,source,critical?,knockout?}`
or `{kind:"correct",patch:{hp?,maxHp?,tempHp?,dead?,successes?,failures?,stable?,
zeroHpPolicy?},reason,source}`. Correction is never passed off as damage,
healing, resurrection, a save or a rest.

Trusted event: `{eventId,actorId,kind:"damage"|"healing",amount,source,
critical?,knockout?:{melee:true},clockId?}`. It updates canonical HP/tempHP and
returns a breakdown plus `followUps`; callers must not first subtract the
damage a second time. Authority belongs to the already-confirmed combat/rest/
healing operation. Invalid numeric/unknown values are not coerced to zero.
Unknown zero-HP policy does not block correct numeric damage; only the resulting
zero-HP state needs reconciliation. Clock values are seconds read from the
existing `restTime.clocks[clockId].seconds`, never another clock object.

Damage breakdown: `damage,hpBefore,hpAfter,hpLost,tempHpBefore,tempHpAfter,
tempHpAbsorbed,deadBefore,deadAfter,deathSavesBefore,deathSavesAfter`.
Zero-HP policy resolves before any otherwise irrelevant concentration request.
Damage at existing zero counts failures even when temporary HP absorb it;
this is the combined reading recorded in R194, not an invented SRD example.
Massive damage uses remaining damage after temporary HP and current HP.
Ordinary healing cannot resurrect and only ends zero-HP/knockout causes, never
all Unconscious conditions or Prone.

Knockout is an explicit qualifying melee choice when that damage would reduce
the target to zero: 1 HP, its own Unconscious cause and a short-rest follow-up
with a deterministic restId. The root starts that rest in the same transaction
and forwards its completion. Appropriate first aid or healing ends that cause.

## Existing request queue: descriptors and outcomes

```js
describeDeathSave(state, actorId, {triggerId,turnKey?,outsideInitiative?}, viewer);
previewAid(state, {actorId,targetId,kind:"stabilize"|"wake-knockout"}, viewer, {effectiveActor} = {});
beginAid(state, input, viewer, options);
describeStableRecovery(state, actorId, viewer);
getVitalityRollState(state, descriptor, viewer);
applyVitalityRoll(state, {eventId,descriptor,values}, viewer);
```

Descriptor: `{id,kind:"death-save"|"medicine"|"stable-recovery",actorId,targetId,
triggerId,dice:[{count,sides}],modifier,modifierSources,dc,source,originCampaignId,
owner,context}`. It is pure output for an existing combat request, not a new
queue. Root preserves that descriptor and accepted faces with the request and
calls the outcome adapter; it never trusts a UI-provided total. Modifiers have
an applicable source, and a death save has no default ability modifier.
`getVitalityRollState` returns `{needed,canResolve,reason,commit}` with current
authority and causal state. The outcome adapter returns `{outcome,followUps}`
and does not collect/generate faces. `outcome` includes `kind,status,natural,
modifier,total,success,rows` where relevant; an expired outcome has a reason
and no invented natural face. Root callback input agreed with UI is
`{kind:"death-save"|"medicine"|"stable-recovery",actorId,targetId?,aidKind?,reviewKey?}`.

Death save is due only at an actual turn start (or explicitly requested outside
initiative), zero HP, death-save policy, not stable/dead. Natural 1/20 remain
distinct from modified total/DC10. Healing before resolution makes a pending
request unnecessary: expire it with a cause, do not invent a face. Competing
start-turn effects use the current creature controller's ordering, not FIFO.

`beginAid` revalidates source/target, consumes the acting creature's Help action
only at an actual attempt and returns the Medicine DC10 descriptor. Root adds
that request atomically and does not spend the action again. Stabilization
resets death-save counts and keeps zero HP/Unconscious; knockout first aid
instead ends only its knockout cause. Unknown Medicine values need data.

Becoming stable creates a `stabilityId` and a recovery period at the pertinent
existing clock. The d4 descriptor is resolved in the same physical/digital
surface; its outcome sets expiry to 1–4 narrative hours. New damage cancels
stability/recovery. The next due save is not fabricated from wall-clock time.

## Trusted event observation and root adapter responsibilities

```js
observeConditionEvent(state, {
  eventId, kind:"turn-start"|"turn-end"|"clock"|"rest"|"concentration-end",
  actorIds?,turnKey?,clockId?,restId?,restKind?,concentrationId?,
});
```

Terms are mutually exclusive: manual; `{kind:"clock",clockId,expiresAt}`;
`{kind:"turn",actorId,phase:"start"|"end",when:"current"|"next",excludeTurnKey?}`;
`{kind:"rest",actorId,restKind,restId?}`; `{kind:"concentration",actorId,
concentrationId}`. Applying a next-turn term during that actor's current turn
records the current turnKey as excluded. Same-event retries never expire twice.
Leaving initiative does not manufacture a completed turn or duration. Clocks
are never implicitly rebased after joining a campaign.

Root owns actual turn-start hooks/request enqueue, damage ordering, effects
linked to ended concentration, form/familiar lifecycle, rest interruption and
knockout rest, crawling geometry, visibility facts and shared requests/history.
Callbacks return `followUps` for those seams; none starts a second dice engine.
Follow-ups are concrete tagged records, never executable expressions:

- `{kind:"end-concentration",actorId,concentrationId,reason}`; canonical active
  flag is already false, root closes linked effects/requests.
- `{kind:"reconcile-actor",actorId}`; root notifies forms/rest/movement about
  the already-applied state, without charging damage twice.
- `{kind:"start-knockout-rest",actorId,restId,clockId}`; start the explicit
  short rest in the same commit, with no implicit rest for other creatures.
- `{kind:"request-stable-recovery",actorId,stabilityId}`; root obtains its
  d4 descriptor and creates a request in the existing queue.
- `{kind:"expire-vitality-requests",actorId,reason}`; root checks existing
  requests with `getVitalityRollState`, preserving accepted evidence.
- `{kind:"held-items",actorId,instanceId}`; a visible reconciliation task,
  not a guessed drop of worn equipment.
Ended instances move to event history; active strings/objects use the same
`hasCondition` helper in combat/forms/rest. Source-specific immunities, full senses/grappling,
periodic effects, resurrection and every remaining catalog automation stay
explicit obligations, not completed by a label toggle.
