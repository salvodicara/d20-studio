async (page) => {
  const errors = [],
    passed = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__builderErrors = [];
    window.addEventListener("error", (event) => window.__builderErrors.push(event.message));
  });
  await page.route("**/*.mjs", (route) => route.continue());
  await page.goto("http://127.0.0.1:8879/#characters");
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 1000 });
  const button = (name) => page.getByRole("button", { name, exact: true });
  const field = (path) => page.locator('[data-builder-path="' + path + '"]');
  const section = (id) => page.locator('.builder-sections [data-builder-section="' + id + '"]');
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  await button("Ripristina esempio").click();
  await button("Ripristina").click();
  await button("Crea personaggio").click();
  await field("identity.name").fill("Neris");
  await page.locator('[data-nav="home"]').first().click();
  await button("Resta nella bozza").click();
  check(
    (await field("identity.name").inputValue()) === "Neris",
    "Navigation cancel lost entered identity",
  );
  await button("Salva bozza").click();
  const draftId = (await saved()).characterDrafts.at(-1).id;
  await page.reload();
  check((await field("identity.name").inputValue()) === "Neris", "Reload lost private draft");
  passed.push("dirty exit cancel and persisted private draft reload");
  await section("class").click();
  if ((await field("classes.0.classId").count()) === 0) await button("Aggiungi classe").click();
  await field("classes.0.classId").selectOption("fighter");
  await section("origin").click();
  await field("origin.backgroundId").selectOption("criminal");
  await field("origin.backgroundBonuses.dex").fill("2");
  await field("origin.backgroundBonuses.con").fill("1");
  await field("origin.speciesId").selectOption("halfling");
  await section("abilities").click();
  for (const [index, ability] of ["str", "dex", "con", "int", "wis", "cha"].entries())
    await field("abilities.assignment." + ability).selectOption(String(index));
  await section("skills").click();
  for (const skill of ["athletics", "perception"])
    await page.locator('[data-builder-list="skills.selected"][value="' + skill + '"]').check();
  for (const language of ["elvish", "dwarvish"])
    await page.locator('[data-builder-list="skills.languages"][value="' + language + '"]').check();
  await field("skills.confirmed").check();
  await section("features").click();
  for (const [grant, option] of [
    ["class:fighter:fighting-style", "defense"],
    ["class:fighter:mastery", "quarterstaff"],
    ["class:fighter:mastery", "dagger"],
    ["class:fighter:mastery", "longsword"],
  ])
    await page
      .locator('[data-builder-feature="' + option + '"][data-grant="' + grant + '"]')
      .check();
  await field("features.confirmed").check();
  await section("spells").click();
  await field("spells.confirmed").check();
  await section("equipment").click();
  await button("Aggiungi oggetto manuale").click();
  await page.locator('#dialog [name="name"]').fill("Corda di Neris");
  await page.locator('#dialog [name="weight"]').fill("2");
  await page.locator('#dialog [name="source"]').fill("Oggetto sintetico originale");
  await button("Aggiungi alla bozza").click();
  await field("equipment.confirmed").check();
  await section("story").click();
  await field("story.description").fill("Un mantello blu");
  await field("story.backstory").fill("Custodisce la torre di Bruma.");
  await section("review").click();
  check(
    await button("Crea scheda").isEnabled(),
    "Review blocked: " + (await page.locator(".builder-errors").allTextContents()),
  );
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/inc10-closure/builder-review.png",
    fullPage: true,
  });
  if (await page.locator("[data-builder-accept-incomplete]").count())
    await page.locator("[data-builder-accept-incomplete]").check();
  await button("Crea scheda").click();
  await page.getByRole("heading", { name: "Neris", exact: true }).waitFor();
  let state = await saved();
  const actor = state.actors[state.characterDrafts.find((d) => d.id === draftId).result.actorId];
  check(actor && actor.maxHp === 12 && actor.hp === 12, "Created scores or HP wrong");
  // Increment 10: the explicit 2024 zero-HP policy, so 0 HP means dying (death saves).
  check(
    actor.vitalityPolicy?.zeroHp === "death-saves" &&
      actor.vitalityPolicy.source.it.pages.join() === "19,20",
    "Created character has no explicit zero-HP policy",
  );
  check(
    actor.inventory.length === 1 && !actor.inventory[0].equipped,
    "Manual equipment changed/auto-equipped",
  );
  check(
    !actor.campaignIds.length &&
      !state.scenes.some((scene) => scene.tokens.some((token) => token.actorId === actor.id)),
    "Creation auto-joined or placed token",
  );
  passed.push(
    "guided creation with source choices, ability assignment and manual item",
    "one applied personal sheet without automatic placement, with the death-save zero-HP policy",
  );
  await page.locator('[data-character-tab="story"]').click();
  await page.getByRole("heading", { name: "Storia del personaggio", exact: true }).waitFor();
  check(
    (await page.locator("#content").innerText()).includes("Custodisce la torre di Bruma."),
    "Builder story not visible on sheet",
  );
  await button("Modifica storia").click();
  check(
    (await page.locator("#dialog [name=description]").inputValue()) === "Un mantello blu",
    "Builder appearance not editable on sheet",
  );
  await page.locator("#dialog [name=backstory]").fill("Custodisce la torre e il ponte.");
  await button("Salva").click();
  await page.locator('[data-character-tab="features"]').click();
  // P2 sheet renames: the features section is «Capacità e tratti» (D&D Beyond Features & Traits).
  await page.getByRole("heading", { name: "Capacità e tratti", exact: true }).waitFor();
  await page.getByRole("button", { name: "Preferenze", exact: true }).click();
  await page.locator("[name=offline]").check();
  await button("Salva preferenze").click();
  const feature = (await saved()).actors[actor.id].features.find(
    (feature) => (feature.name.en || feature.name) === "Second Wind",
  );
  check(feature, "No Second Wind record");
  await page
    .locator('[data-character-action="edit-feature"][data-feature="' + feature.id + '"]')
    .click();
  check(
    !(await page.locator("#dialog [name=name]").inputValue()).includes("[object Object]"),
    "Localized feature corrupted in editor",
  );
  await page.locator("#dialog [name=max]").fill("2");
  await page.locator("#dialog [name=used]").fill("1");
  await button("Salva capacità").click();
  state = await saved();
  check(
    state.actors[actor.id].features.find((entry) => entry.id === feature.id).used === 1,
    "Offline private feature correction failed",
  );
  check(state.log.at(-1).visibility === "private", "Private-sheet correction leaked audit");
  await page.getByRole("button", { name: "Preferenze", exact: true }).click();
  await page.locator("[name=offline]").uncheck();
  await button("Salva preferenze").click();
  passed.push(
    "created story visible and editable without losing appearance",
    "offline personal feature correction with private audit",
  );
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  check(
    !(await page.locator("#content").innerText()).includes("Neris"),
    "DM saw private character by direct route",
  );
  await page.locator('[data-nav="characters"]').click();
  await page.getByRole("heading", { name: "Personaggi", exact: true }).waitFor();
  check(
    !(await page.locator("#content").innerText()).includes("Neris"),
    "DM saw private character or draft in collection",
  );
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("player");
  await page.locator('[data-character-action="open"][data-actor="' + actor.id + '"]').click();
  await button("Collega alla campagna").click();
  await page
    .locator("#dialog")
    .getByRole("button", { name: "Collega alla campagna", exact: true })
    .click();
  state = await saved();
  check(
    state.actors[actor.id].campaignIds.includes(state.campaign.id),
    "Explicit campaign connection failed",
  );
  errors.push(...(await page.evaluate(() => window.__builderErrors || [])));
  check(errors.length === 0, errors.join("; "));
  return { passed, draftId, actorId: actor.id, errors };
}
