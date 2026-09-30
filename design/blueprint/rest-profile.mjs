import { ruleSource, RULE_SOURCE } from "./character-rules.mjs";

// Structured metadata for the bounded, verified character catalogue.
// Resource balances remain canonical on the actor; deriving a profile never restores them.
export function updateCharacterRestProfile(
  actor,
  data,
  { newCharacter = false, advancement = false } = {},
) {
  if (actor.restProfile && actor.restProfile.managedBy !== "character-build") return;
  const previous = actor.restProfile ?? {};
  const classes = data.classes ?? [];
  const wizardLevel = classes.find((row) => row.classId === "wizard")?.level ?? 0;
  const pact = classes.some((row) => row.classId === "warlock");
  const trance = data.origin?.speciesId === "elf";
  const priorArcane = previous.arcaneRecovery;
  const priorArcaneFeature =
    (actor.features ?? []).find((row) => row.id === priorArcane?.featureId) ??
    actor.featureUsageLedger?.[priorArcane?.featureId];
  const priorArcaneUsed =
    priorArcaneFeature && Object.hasOwn(priorArcaneFeature, "used")
      ? priorArcaneFeature.used
      : priorArcane
        ? (priorArcane.used ?? null)
        : newCharacter || advancement
          ? 0
          : null;
  const arcaneFeature =
    wizardLevel > 0
      ? (actor.features ?? []).find(
          (row) =>
            row.definitionId === "wizard:arcane-recovery" &&
            row.source?.sha256 === RULE_SOURCE.sha256 &&
            row.source?.edition === "2024",
        )
      : null;
  if (arcaneFeature) {
    if (!Object.hasOwn(arcaneFeature, "max")) arcaneFeature.max = 1;
    if (!Object.hasOwn(arcaneFeature, "used")) arcaneFeature.used = priorArcaneUsed;
  }
  const recoveries = (previous.recoveries ?? []).filter(
    (row) => row.managedBy !== "character-build",
  );
  function add(id, target, trigger, operation, page, amount) {
    recoveries.push({
      id: "srd2024:" + id,
      target,
      trigger,
      operation,
      source: ruleSource(page),
      managedBy: "character-build",
      ...(amount === undefined ? {} : { amount }),
    });
  }
  if (
    classes.some((row) =>
      ["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "wizard"].includes(row.classId),
    )
  )
    add("spell-slots-long", { kind: "spellSlots" }, "long", "all", 25);
  if (pact) {
    add("pact-short", { kind: "pactSlots" }, "short", "all", 71);
    add("pact-long", { kind: "pactSlots" }, "long", "all", 71);
  }
  for (const feature of actor.features ?? []) {
    if (feature.source?.sha256 !== RULE_SOURCE.sha256 || feature.source?.edition !== "2024")
      continue;
    const target = {
      kind: "feature",
      id: feature.id,
      ...(feature.resourceId ? { resourceId: feature.resourceId } : {}),
    };
    if (feature.definitionId === "fighter:second-wind") {
      add(feature.id + ":short", target, "short", "reduce-used", 48, 1);
      add(feature.id + ":long", target, "long", "all", 48);
    } else if (feature.definitionId === "fighter:action-surge") {
      add(feature.id + ":short", target, "short", "all", 48);
      add(feature.id + ":long", target, "long", "all", 48);
    }
  }
  actor.restProfile = {
    ...previous,
    managedBy: "character-build",
    source: ruleSource(185, 187, ...(trance ? [85] : [])),
    longRestSeconds: trance ? 14400 : 28800,
    sleepRequiredSeconds: trance ? 0 : 21600,
    trance,
    ...(trance ? { tranceSource: ruleSource(85) } : { tranceSource: null }),
    recoveries,
    ...(wizardLevel || previous.arcaneRecovery
      ? {
          arcaneRecovery: {
            wizardLevel,
            ...(arcaneFeature ? { featureId: arcaneFeature.id } : { used: priorArcaneUsed }),
            source: ruleSource(78),
          },
        }
      : {}),
  };
}

export function seedDemoRestResources(state) {
  const { livia, doran } = state.actors;
  livia.hitDice = { d6: { max: 3, used: 1 } };
  livia.spellSlots = { 1: livia.slots, 2: { max: 2, used: 1 } };
  updateCharacterRestProfile(livia, { classes: livia.buildSeed.classes }, { newCharacter: true });
  doran.hitDice = { d10: { max: 3, used: 1 } };
  doran.features = [
    {
      id: "sample-second-wind",
      definitionId: "fighter:second-wind",
      name: { it: "Recuperare Energie", en: "Second Wind" },
      max: 2,
      used: 2,
      source: ruleSource(48),
      description: {
        it: "Contatore sintetico: azione di cura ancora manuale.",
        en: "Synthetic counter: the healing action remains manual.",
      },
    },
    {
      id: "sample-action-surge",
      definitionId: "fighter:action-surge",
      name: { it: "Azione Impetuosa", en: "Action Surge" },
      max: 1,
      used: 1,
      source: ruleSource(48),
      description: {
        it: "Contatore sintetico: azione aggiuntiva ancora manuale.",
        en: "Synthetic counter: the additional action remains manual.",
      },
    },
  ];
  updateCharacterRestProfile(doran, { classes: doran.buildSeed.classes });
}
