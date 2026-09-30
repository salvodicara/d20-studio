async (rootPage) => {
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const context = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(),
    passed = [],
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const check = (v, m) => {
    if (!v) throw Error(m);
  };
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const close = () => page.locator("#dialog [data-close]").first().click();
  const shapeUses = (s) =>
    s.actors.mira.features.find((f) => f.id === s.actors.mira.formsProfile.wildShapeFeatureId).used;
  const openForms = () =>
    page.locator('[data-forms-entry="mira"][data-forms-tab="forms"]').first().click();
  await page.route("**/*.mjs", (route) => route.continue());
  await page.goto("http://127.0.0.1:8879/#characters?id=mira&tab=extras");
  await page.locator('[data-service="reset"]').click();
  await page.locator('#dialog button[type="submit"]').click();
  await page.goto("http://127.0.0.1:8879/#characters?id=mira&tab=extras");
  await openForms();
  await page.locator('[data-forms-profile="srd2024:cat"]').click();
  await page.locator("[data-forms-preview]").click();
  check(await page.locator("[data-forms-apply]").isEnabled(), "Cat preview cannot apply");
  await page.keyboard.press("Escape");
  let s = await saved();
  check(!s.actors.mira.activeForm && shapeUses(s) === 1, "Preview or Escape spent a shape use");
  await openForms();
  await page.locator('[data-forms-profile="srd2024:cat"]').click();
  await page.locator("[data-forms-preview]").click();
  await page.locator("[data-forms-apply]").click();
  s = await saved();
  check(
    s.actors.mira.activeForm?.profile?.id === "srd2024:cat" &&
      shapeUses(s) === 2 &&
      s.actors.mira.tempHp === 3,
    "Shape costs or temp HP wrong",
  );
  await page.locator("[data-forms-return]").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/inc10-closure/forms-cat-desktop-it.png",
  });
  await close();
  // HP corrections go through Conditions and status (increment 10): Correct, preview, apply.
  await page.locator('#content [data-conditions-entry="mira"]').click();
  await page.locator('#dialog [data-conditions-command="correct"]').click();
  await page.locator('#dialog [data-conditions-field="hp"]').fill("9");
  await page
    .locator('#dialog [data-conditions-field="reason"]')
    .fill("Danno residuo già risolto al tavolo, oltre ai PF temporanei");
  await page.locator("#dialog [data-conditions-preview]").click();
  await page.locator("#dialog [data-conditions-apply]").click();
  await page.locator("#dialog footer [data-close]").click();
  s = await saved();
  check(s.actors.mira.hp === 9 && s.actors.mira.tempHp === 3, "HP correction not applied");
  await page.locator('[data-character-action="table"]').first().click();
  await page.locator('[data-actor="mira"].selected').waitFor();
  // Visual pass 2 (30/09/2026): movement and HP moved from the Creature tab to the hotbar
  // (BG3's resource row and portrait); the Creature tab no longer repeats them.
  check(
    (await page.locator(".table-hotbar .resources").innerText()).includes("12 m"),
    "Table still shows base speed",
  );
  check(
    (await page.locator('[data-combat-action="quarterstaff"]').count()) === 0,
    "Merged weapon remains in combat bar",
  );
  await page.locator('[data-combat-action="melee-attack"]').click();
  check(
    (await page.locator(".combat-formula").innerText()).includes("1"),
    "Fixed natural damage missing from preview",
  );
  check(
    // Since increment 10 the Table showed HP in the Conditions and status summary; since
    // visual pass 2 the hotbar's HP button names them (the summary no longer repeats them).
    /\b3 temporanei\b/.test(
      await page.locator(".table-hotbar .hotbar-hp").getAttribute("aria-label"),
    ),
    "Temporary HP missing from Table",
  );
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/inc10-closure/forms-table-desktop-it.png",
  });
  await page.locator("[data-combat-cancel]").click();
  const svg = page.locator("#battle-map");
  const point = await svg.evaluate((el) => {
    const p = el.createSVGPoint();
    p.x = 250;
    p.y = 450;
    const at = p.matrixTransform(el.getScreenCTM());
    return { x: at.x, y: at.y };
  });
  // Refreshed by R3 (27/09/2026), P6 TV-01: a click on the map never moves; the shape token
  // moves by a drag from it (Foundry, Owlbear), and it still gets there directly.
  const mira = await page.locator('#battle-map [data-actor="mira"] .token-hit').boundingBox();
  await page.mouse.move(mira.x + mira.width / 2, mira.y + mira.height / 2);
  await page.mouse.down();
  await page.mouse.move(point.x, point.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  s = await saved();
  check(
    Math.abs(s.scenes[0].tokens.find((t) => t.actorId === "mira").x - 250) < 1,
    "Shape token did not move directly",
  );
  passed.push(
    "Wild Shape preview cancels for free; applying spends one canonical use and changes sheet/Table capabilities",
  );
  await openForms();
  await page.locator("[data-forms-return]").click();
  await page.locator("[data-forms-apply]").click();
  s = await saved();
  check(
    !s.actors.mira.activeForm &&
      s.actors.mira.hp === 9 &&
      shapeUses(s) === 2 &&
      s.actors.mira.tempHp === 3,
    "Return rewound live health or resources",
  );
  check(
    Math.abs(s.scenes[0].tokens.find((t) => t.actorId === "mira").x - 250) < 1,
    "Return rewound map position",
  );
  await page.locator("[data-forms-undo]").click();
  s = await saved();
  check(
    s.actors.mira.activeForm && s.actors.mira.hp === 9 && shapeUses(s) === 2,
    "Undo of return damaged live state",
  );
  await page.locator("[data-forms-return]").click();
  await page.locator("[data-forms-apply]").click();
  await close();
  check(
    (await page.locator(".table-hotbar .resources").innerText()).includes("9 m"),
    "Returned speed not restored",
  );
  await page.reload();
  s = await saved();
  check(
    !s.actors.mira.activeForm && s.actors.mira.hp === 9 && shapeUses(s) === 2,
    "Reload resurrected form or refunded resources",
  );
  passed.push(
    "Return preserves live HP, spent uses and token position; Undo and reload retain the correct event boundaries",
  );
  check(errors.length === 0, errors.join("; "));
  await context.close();
  return { passed, errors };
}
