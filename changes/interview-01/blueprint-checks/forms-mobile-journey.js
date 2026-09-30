async (rootPage) => {
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const context = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(),
    passed = [],
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.testWindowErrors = [];
    addEventListener("error", (e) => window.testWindowErrors.push(e.message));
  });
  const check = (v, m) => {
    if (!v) throw Error(m);
  };
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const close = () => page.locator("#dialog [data-close]").first().tap();
  const shapeUses = (s) =>
    s.actors.mira.features.find((f) => f.id === s.actors.mira.formsProfile.wildShapeFeatureId).used;
  async function openCompanions() {
    await page.goto("http://127.0.0.1:8879/#characters?id=mira&tab=extras");
    await page.locator('[data-forms-entry="mira"][data-forms-tab="companions"]').first().tap();
  }
  await page.route("**/*.mjs", (route) => route.continue());
  await page.goto("http://127.0.0.1:8879/#characters?id=mira&tab=extras");
  await page.locator('[data-service="reset"]').tap();
  await page.locator('#dialog button[type="submit"]').tap();
  await page.locator('[data-service="preferences"]').tap();
  await page.locator('#dialog [name="lang"]').selectOption("en");
  await page.locator('#dialog button[type="submit"]').tap();
  await openCompanions();
  await page.locator('[data-forms-tab="wild-companion"]').first().tap();
  await page.locator('[data-forms-field="name"]').fill("Thistle");
  await page.locator('[data-forms-profile="srd2024:rat"]').tap();
  await page.locator('[data-forms-field="cost"]').selectOption("slot:1");
  await page.locator("[data-forms-appearance-map]").tap();
  await page.locator("[data-placement-cancel]").waitFor();
  await page.locator("#battle-map").focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await page.locator("[data-forms-preview]").tap();
  await page.locator("[data-forms-review]").scrollIntoViewIfNeeded();
  check(await page.locator("[data-forms-apply]").isEnabled(), "Wild Companion slot choice blocked");
  check(
    (await page.locator("#dialog").innerText()).includes("Spell slot"),
    "English cost breakdown missing",
  );
  check(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth + 1 &&
        document.querySelector("#dialog").scrollWidth <=
          document.querySelector("#dialog").clientWidth + 1,
    ),
    "Horizontal overflow in mobile forms dialog",
  );
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/forms-mobile-en.png",
  });
  await page.locator("[data-forms-apply]").tap();
  let s = await saved();
  const pet = Object.values(s.actors).find((a) => a.name === "Thistle");
  check(
    pet?.companion && shapeUses(s) === 1 && s.actors.mira.spellSlots[1].used === 2,
    "Wild Companion spent wrong resource",
  );
  // Refreshed by R3 (27/09/2026), P2 PG-78 (dnd5e Summon): the token appears at the chosen
  // point in the same change as the confirmation, instead of waiting for «Place token».
  check(
    s.scenes[0].tokens.some((t) => t.actorId === pet.id),
    "Wild Companion token not placed at the chosen point on confirmation",
  );
  passed.push(
    "English touch controls choose exactly one Wild Companion resource; keyboard chooses appearance, readable preview has no horizontal overflow; the token appears at that point on confirmation (PG-78)",
  );
  if (await page.locator("#dialog[open]").count()) await page.keyboard.press("Escape");
  await page.locator('#battle-map [data-actor="' + pet.id + '"]').focus();
  await page.keyboard.press("Enter");
  await page.locator('[data-actor="' + pet.id + '"].selected').waitFor();
  check(
    (await page.locator('[data-combat-action="melee-attack"]').count()) === 0,
    "Wild Companion familiar can attack",
  );
  await openCompanions();
  await page.locator('[data-forms-companion="' + pet.id + '"]').tap();
  await page.locator('[data-forms-command="dismiss"]').tap();
  await page.locator("[data-forms-apply]").tap();
  s = await saved();
  check(
    s.actors[pet.id].companion.lifecycle === "dismissed" &&
      !s.scenes[0].tokens.some((t) => t.actorId === pet.id),
    "Dismissal left active token",
  );
  check(
    await page.locator("[data-forms-place]").isDisabled(),
    "Dismissed companion can be placed without reappearance",
  );
  await page.locator("[data-forms-appearance-map]").tap();
  await page.locator("[data-placement-cancel]").waitFor();
  await page.keyboard.press("Escape");
  s = await saved();
  check(s.actors[pet.id].companion.lifecycle === "dismissed", "Escape brought creature back");
  await page.locator("[data-forms-appearance-map]").tap();
  await page.locator("[data-placement-cancel]").waitFor();
  await page.locator("#battle-map").focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await page.locator('[data-forms-command="reappear"]').tap();
  await page.locator("[data-forms-apply]").tap();
  s = await saved();
  check(
    s.actors[pet.id].companion.lifecycle === "available" &&
      shapeUses(s) === 1 &&
      s.actors.mira.spellSlots[1].used === 2,
    "Reappearance spent original resource twice",
  );
  passed.push(
    "Keyboard placement, dismissal, Escape and reappearance preserve the same actor and do not repay its creation cost",
  );
  await close();
  await page.locator('[data-service="preferences"]').tap();
  await page.locator('#dialog [name="offline"]').check();
  await page.locator('#dialog button[type="submit"]').tap();
  await openCompanions();
  await page.locator('[data-forms-companion="' + pet.id + '"]').tap();
  await page.locator('[data-forms-command="dismiss"]').tap();
  check(await page.locator("[data-forms-apply]").isDisabled(), "Offline shared mutation enabled");
  check(
    (await saved()).actors[pet.id].companion.lifecycle === "available",
    "Offline preview mutated shared creature",
  );
  await page.keyboard.press("Escape");
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  errors.push(...(await page.evaluate(() => window.testWindowErrors)));
  check(errors.length === 0, errors.join("; "));
  passed.push(
    "Offline shared Apply is disabled while previews remain available; Escape closes without applying",
  );
  await context.close();
  return { passed, errors };
}
