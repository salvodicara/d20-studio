import { classes, skills, ruleSource, RULE_SOURCE } from "./character-rules.mjs";
import { updateCharacterRestProfile } from "./rest-profile.mjs";

const copy = (value) => structuredClone(value);
const text = (it, en) => ({ it, en });
const verified = (record) =>
  record?.source?.kind === "srd" &&
  record.source.edition === "2024" &&
  record.source.revision === "5.2.1" &&
  record.source.sha256 === RULE_SOURCE.sha256;
const shapeSource = () => ruleSource(42, 43);
const shapeMaximum = (level) => (level < 2 ? 0 : level >= 17 ? 4 : level >= 6 ? 3 : 2);

// This projection is deliberately live: sheet preparation and inventory can change after Apply.
export function getFamiliarCastingAccess(actor) {
  if (actor.formsProfile?.managedBy !== "character-build")
    return copy(actor.formsProfile?.familiarCasting ?? null);
  return derivedFamiliarAccess(actor);
}
function derivedFamiliarAccess(actor) {
  const acquired = (actor.spells ?? []).filter(
    (row) => row.catalogId === "find-familiar" && verified(row),
  );
  if (!acquired.length) return null;
  const ritualAdept = (actor.features ?? []).some(
    (row) => row.definitionId === "wizard:ritual-adept" && verified(row),
  );
  const readableBook = (actor.inventory ?? []).some(
    (row) =>
      row.quantity > 0 &&
      row.location !== "ground" &&
      row.spellbook?.readable === true &&
      row.spellbook.spellIds?.includes("find-familiar"),
  );
  return {
    spellId: "find-familiar",
    prepared: acquired.some((row) => row.prepared === true),
    ritualFromBook: ritualAdept && readableBook,
    source: ruleSource(130),
  };
}

// Metadata only. Balances remain on the actor's existing feature, never on this profile.
export function updateCharacterFormsProfile(
  actor,
  data,
  { newCharacter = false, advancement = false } = {},
) {
  if (actor.formsProfile && actor.formsProfile.managedBy !== "character-build") return;
  const previous = actor.formsProfile ?? {};
  const levels = data.classes ?? [];
  const druidLevel = levels.find((row) => row.classId === "druid")?.level ?? 0;
  const initialClass = levels.length === 1 ? levels[0].classId : data.levelOrder?.[0];
  const initialDefinition = classes.find((row) => row.id === initialClass);
  actor.features ??= [];
  const prior =
    actor.features.find((row) => row.id === previous.wildShapeFeatureId) ??
    actor.featureUsageLedger?.[previous.wildShapeFeatureId] ??
    actor.features.find((row) => row.definitionId === "druid:wild-shape" && verified(row)) ??
    Object.values(actor.featureUsageLedger ?? {}).find(
      (row) => row.definitionId === "druid:wild-shape" && verified(row),
    );
  let feature = prior;
  if (druidLevel >= 2 || prior) {
    if (!feature)
      feature = {
        id: "forms-profile:wild-shape",
        definitionId: "druid:wild-shape",
        name: text("Forma Selvatica", "Wild Shape"),
        source: shapeSource(),
        description: text(
          "Riserva condivisa da Forma Selvatica e Compagno Selvatico.",
          "Pool shared by Wild Shape and Wild Companion.",
        ),
        used: newCharacter || advancement ? 0 : null,
        managedBy: "forms-profile",
      };
    if (!actor.features.includes(feature)) {
      feature = copy(feature);
      actor.features.push(feature);
    }
    const derivedMax = shapeMaximum(druidLevel);
    const previousDerivedMax =
      feature.formsDerivedMax ?? shapeMaximum(previous.druidLevel ?? druidLevel);
    const override = feature.manualOverrides?.max;
    if (
      Object.hasOwn(feature, "max") &&
      (feature.max !== previousDerivedMax ||
        (previousDerivedMax !== 0 && override && feature.max !== override.value))
    ) {
      feature.manualOverrides ??= {};
      feature.manualOverrides.max = {
        value: feature.max,
        source: {
          kind: "manual",
          revision: "sheet-wild-shape-maximum:" + feature.id + ":" + feature.max,
          label: "Preserved live sheet maximum correction",
        },
      };
    }
    // Zero disables a removed class; the correction stays on the same instance for its return.
    feature.max =
      derivedMax === 0
        ? 0
        : feature.manualOverrides?.max
          ? feature.manualOverrides.max.value
          : derivedMax;
    feature.formsDerivedMax = derivedMax;
    if (!Object.hasOwn(feature, "used")) feature.used = newCharacter || advancement ? 0 : null;
  }
  actor.formsProfile = {
    ...previous,
    managedBy: "character-build",
    source: shapeSource(),
    druidLevel,
    wildShapeFeatureId: feature?.id ?? null,
    knownForms: [...(previous.knownForms ?? [])],
    knownFormsInitialized: previous.knownFormsInitialized ?? false,
    savingThrowProficiencies: initialDefinition ? [...initialDefinition.savingThrows] : null,
    skillProficiencies: Array.isArray(actor.skills)
      ? actor.skills.flatMap((id) => {
          const definition = skills.find((row) => row.id === id);
          return definition
            ? [
                {
                  id,
                  ability: definition.ability,
                  multiplier: actor.expertise?.includes(id) ? 2 : 1,
                },
              ]
            : [];
        })
      : null,
    familiarCasting: derivedFamiliarAccess(actor),
  };
  if (feature) {
    actor.restProfile ??= {
      managedBy: "character-build",
      source: ruleSource(185, 187),
      longRestSeconds: 28800,
      sleepRequiredSeconds: 21600,
      recoveries: [],
    };
    const recoveries = (actor.restProfile.recoveries ?? []).filter(
      (row) => row.managedBy !== "forms-profile",
    );
    recoveries.push(
      {
        id: "srd2024:wild-shape:short",
        target: { kind: "feature", id: feature.id },
        trigger: "short",
        operation: "reduce-used",
        amount: 1,
        source: shapeSource(),
        managedBy: "forms-profile",
      },
      {
        id: "srd2024:wild-shape:long",
        target: { kind: "feature", id: feature.id },
        trigger: "long",
        operation: "all",
        source: shapeSource(),
        managedBy: "forms-profile",
      },
    );
    actor.restProfile.recoveries = recoveries;
  }
}

// Explicit fictional fixtures; never inferred from a display name or applied on each reload.
export function seedDemoFormsActors(state) {
  if (state.demoFormsSeeded) return;
  const fixtureSource = {
    kind: "authored-demo",
    edition: "2024",
    revision: "blueprint-increment9-mira",
    note: "Synthetic fixture; not a real character.",
  };
  if (!state.actors.mira) {
    const actor = {
      id: "mira",
      name: "Mira",
      kind: "character",
      owner: "player",
      controllers: [],
      visibility: "shared",
      campaignIds: state.campaign?.id ? [state.campaign.id] : [],
      className: text("Druida", "Druid"),
      level: 3,
      buildSeed: { classes: [{ classId: "druid", level: 3 }], source: fixtureSource },
      hp: 12,
      maxHp: 24,
      tempHp: 0,
      ac: 12,
      speed: 9,
      movement: 9,
      movementSpent: 0,
      dashCount: 0,
      action: true,
      bonus: true,
      reaction: true,
      proficiencyBonus: 2,
      size: "medium",
      creatureType: "humanoid",
      conditions: [],
      notes: "",
      abilities: { str: 10, dex: 14, con: 14, int: 12, wis: 16, cha: 10 },
      savingThrows: { str: 0, dex: 2, con: 2, int: 3, wis: 5, cha: 0 },
      skills: ["nature", "perception"],
      skillModifiers: { nature: 3, perception: 5 },
      hitDice: { d8: { max: 3, used: 1 } },
      spellSlots: { 1: { max: 4, used: 1 }, 2: { max: 2, used: 0 } },
      inventory: [
        {
          id: "mira-staff",
          name: text("Bastone ferrato", "Quarterstaff"),
          kind: "weapon",
          weaponType: "quarterstaff",
          quantity: 1,
          equipped: true,
          source: fixtureSource,
        },
      ],
      features: [],
      spells: [],
      combatProfile: {
        team: "party",
        spellcastingAbility: "wis",
        proficiencyBonus: 2,
        weaponProficiencies: ["quarterstaff"],
        spells: [],
        componentsAvailable: true,
        source: fixtureSource,
      },
      restProfile: {
        managedBy: "character-build",
        source: ruleSource(185, 187),
        longRestSeconds: 28800,
        sleepRequiredSeconds: 21600,
        recoveries: [
          {
            id: "srd2024:spell-slots-long",
            target: { kind: "spellSlots" },
            trigger: "long",
            operation: "all",
            source: ruleSource(43),
            managedBy: "character-build",
          },
        ],
      },
      source: fixtureSource,
    };
    actor.slots = actor.spellSlots[1];
    updateCharacterFormsProfile(actor, actor.buildSeed, { newCharacter: true });
    actor.features.find((row) => row.id === actor.formsProfile.wildShapeFeatureId).used = 1;
    actor.formsProfile.knownForms = ["srd2024:cat", "srd2024:rat", "srd2024:wolf"];
    actor.formsProfile.knownFormsInitialized = true;
    state.actors.mira = actor;
    const scene = state.scenes?.find((row) => row.id === state.activeSceneId);
    if (
      scene &&
      !(scene.tokens ?? []).some((row) => row.id === "token-mira" || row.actorId === "mira")
    ) {
      scene.tokens ??= [];
      scene.tokens.push({ id: "token-mira", actorId: "mira", x: 150, y: 450, hidden: false });
    }
  }
  const wizard = state.actors.livia;
  if (wizard) {
    wizard.spells ??= [];
    if (!wizard.spells.some((row) => row.catalogId === "find-familiar"))
      wizard.spells.push({
        id: "sample-find-familiar",
        catalogId: "find-familiar",
        name: text("Trova Famiglio", "Find Familiar"),
        level: 1,
        prepared: true,
        ritual: true,
        source: ruleSource(130),
        fixtureSource,
      });
    wizard.features ??= [];
    if (!wizard.features.some((row) => row.definitionId === "wizard:ritual-adept" && verified(row)))
      wizard.features.push({
        id: "sample-ritual-adept",
        definitionId: "wizard:ritual-adept",
        grantId: "class:wizard",
        name: text("Adepto dei rituali", "Ritual Adept"),
        source: ruleSource(78),
        fixtureSource,
      });
    // PG-41: a level-3 wizard has Arcane Recovery (SRD 5.2.1 EN 78): once per Long Rest.
    if (!wizard.features.some((row) => row.definitionId === "wizard:arcane-recovery"))
      wizard.features.push({
        id: "sample-arcane-recovery",
        definitionId: "wizard:arcane-recovery",
        grantId: "class:wizard",
        name: text("Recupero arcano", "Arcane Recovery"),
        max: 1,
        used: 0,
        recovery: "long",
        source: ruleSource(78),
        fixtureSource,
      });
    // One counter: the rest profile's Arcane Recovery points at this feature (as the builder
    // does for a new wizard), so a Long Rest restores the same boxes the sheet shows.
    if (wizard.restProfile?.managedBy === "character-build" && !wizard.restProfile.arcaneRecovery?.featureId)
      updateCharacterRestProfile(wizard, { classes: wizard.buildSeed?.classes ?? [] });
    wizard.inventory ??= [];
    if (!wizard.inventory.some((row) => row.id === "sample-readable-spellbook"))
      wizard.inventory.push({
        id: "sample-readable-spellbook",
        name: text("Libro degli incantesimi di Livia", "Livia's spellbook"),
        kind: "gear",
        quantity: 1,
        spellbook: { spellIds: ["find-familiar"], readable: true },
        source: fixtureSource,
      });
    if (!wizard.inventory.some((row) => row.id === "sample-familiar-incense"))
      wizard.inventory.push({
        id: "sample-familiar-incense",
        name: text("Incenso per Trova Famiglio", "Find Familiar incense"),
        kind: "gear",
        quantity: 1,
        materialValueGp: 10,
        source: fixtureSource,
      });
    updateCharacterFormsProfile(wizard, wizard.characterBuild?.data ?? wizard.buildSeed ?? {});
  }
  state.demoFormsSeeded = true;
}
