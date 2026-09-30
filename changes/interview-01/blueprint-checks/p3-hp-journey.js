async (rootPage) => {
  // P3 fix package: one HP control (PG-21, PG-22), the death-save box (PG-27), Concentration
  // (TV-79) and accessible HP dialogs (SV-24, axe-core 4.12.1 from a local install, injected
  // only into this test page). (A) IT desktop 1440 × 900: the HP numbers open «Correggi»;
  // «Correggi valori» links to it; damage with type, cause and critical; 0 HP turns the box
  // into death saves with the roll, «Riporta a 1 PF»; massive damage gives an explicit
  // «Morto» and «Riporta in vita…»; Concentration asks its save on damage. (B) EN phone
  // 390 × 844 with touch: the HP numbers, the widget without page overflow. Synthetic demo
  // data only; resets this browser's example state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P3/";
  const axePath =
    "/Users/salvatoredicara/Workspace/press-on-please/node_modules/axe-core/axe.min.js";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const saved = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const button = (name) => page.getByRole("button", { name, exact: true });
  const dialog = () => page.locator("#dialog");
  const close = () => page.locator("#dialog footer [data-close]").click();
  const axe = async (label) => {
    if (!(await page.evaluate(() => Boolean(globalThis.axe))))
      await page.addScriptTag({ path: axePath });
    const result = await page.evaluate(async () => {
      const r = await globalThis.axe.run("#dialog", {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
        rules: { "color-contrast": { enabled: false } },
      });
      return r.violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
      );
    });
    check(!result.length, `axe (${label}): ${result.join(" | ")}`);
    passed.push(`SV-24 axe-core (WCAG 2 A/AA, contrast aside): ${label} without violations`);
  };
  await page.goto(base + "#characters?id=livia");
  await button("Ripristina esempio").click();
  await button("Ripristina").click();
  await page.goto(base + "#characters?id=livia");
  const card = page.locator("#content .character-hp");
  await card.waitFor();
  // Visual pass 2: above 0 HP the conditions summary is D&D Beyond's Conditions box in the strip
  // over the tabs; at 0 HP it moves into the HP box with the death saves.
  const conditions = page.locator("#content .character-conditions");

  // 1. PG-21: the HP numbers open the HP management; «Correggi» is one of its sections.
  // Final review F26 C2-3 (D&D Beyond: the HP number opens HP management, with temporary HP,
  // maximum, log and corrections): the number opens the whole widget, «Correggi» folded.
  await card.locator('[data-character-action="hp-correct"]').click();
  const fix = page.locator('#dialog [data-dt-details="correct"]');
  await fix.locator("summary").click();
  check((await fix.getAttribute("open")) !== null, "«Correggi» is not open");
  await fix.locator('[data-dt-fix="hp"]').focus();
  await fix.locator('[data-dt-fix="hp"]').fill("17");
  await fix.locator('[data-dt-fix="reason"]').fill("Avevo contato male la trappola");
  await page.screenshot({ path: shots + "p3-20-hp-correct.png" });
  await fix.locator("[data-dt-fix-apply]").click();
  let data = await saved();
  check(data.actors.livia.hp === 17, "correction not applied: " + data.actors.livia.hp);
  const logItem = page.locator("#dialog .dt-log-entry").first();
  check((await logItem.innerText()).includes("Avevo contato male"), "HP log lacks the reason");
  check((await logItem.locator("[data-dt-revert]").count()) === 1, "HP log entry has no Undo");
  await axe("sheet HP dialog");
  passed.push(
    "PG-21: HP numbers › HP management › «Correggi i punti ferita» 18 → 17 with the reason, one HP log entry with Annulla",
  );

  // 2. PG-22: damage with type, cause and critical in the same widget.
  await page.locator("#dialog [data-dt-type]").selectOption("fire");
  await page.locator("#dialog [data-dt-note]").fill("Trappola di fuoco");
  await page.locator("#dialog [data-dt-amount]").fill("3");
  await page.locator("#dialog [data-dt-damage]").click();
  data = await saved();
  check(data.actors.livia.hp === 14, "damage not applied");
  check(
    (await page.locator("#dialog .dt-log-entry").first().innerText()).includes("Trappola di fuoco"),
    "the cause is not in the HP log",
  );
  await close();
  passed.push("PG-22: one widget: Danno 3 · Fuoco · causa «Trappola di fuoco» in the HP log");

  // 3. «Correggi valori» has no HP field any more: it links to the widget.
  await page.locator('[data-character-action="edit-character"]').first().click();
  check((await page.locator('#dialog input[name="maxHp"]').count()) === 0, "maxHp field remains");
  await page.locator('#dialog [data-character-action="hp-reasoned"]').click();
  await page.locator('#dialog [data-dt-details="correct"][open]').waitFor();
  await close();
  passed.push("PG-21: «Correggi valori» has no PF field; «Correggi i PF…» opens the widget");

  // 4. The conditions panel offers the one HP control instead of its own damage form.
  await conditions.locator("[data-conditions-entry]").click();
  check(
    (await page.locator('#dialog [data-conditions-command="damage"]').count()) === 0,
    "separate damage form still offered",
  );
  check(
    (await page.locator('#dialog [data-conditions-command="hp"]').count()) === 1,
    "no HP entry in the panel",
  );
  await close();
  passed.push("PG-22: «Danni, cure e condizioni» links to the HP widget, no second damage form");

  // 5. PG-27: 0 HP turns the box into death saves: roll, pips, «Riporta a 1 PF».
  await card.locator("[data-dt-amount]").fill("14");
  await card.locator("[data-dt-damage]").click();
  const box = card.locator("[data-conditions-deathbox]");
  await box.waitFor();
  await card.screenshot({ path: shots + "p3-21-death-box.png" });
  const roll = box.locator("[data-conditions-death-roll]");
  check(/primary/.test(await roll.getAttribute("class")), "death roll is not the primary");
  await roll.click();
  await dialog().waitFor();
  await page.screenshot({ path: shots + "p3-22-death-save-dialog.png" });
  const submit = page
    .locator("#dialog footer button[type=submit], #dialog footer .primary")
    .first();
  await submit.click();
  data = await saved();
  // Round-2 regression (29/09/2026): a digital 20 regains 1 HP (SRD 5.2.1) and leaves no
  // death-save record, as the app reads it (conditions.mjs deathSavesOf: missing = none); the
  // final run met it (reading `successes` of undefined). That branch now checks the regained HP
  // in «Tiri e risultati» instead of crashing; any other face still needs a success or failure.
  const ds = { successes: 0, failures: 0, ...data.actors.livia.deathSaves };
  const regained = data.actors.livia.hp === 1;
  if (regained)
    check(
      await page
        .locator("#dialog[open]", { hasText: "Recupera 1 PF" })
        .waitFor({ timeout: 5000 })
        .then(() => true)
        .catch(() => false),
      "a death save that restored 1 HP does not say «Recupera 1 PF»",
    );
  else check(ds.successes + ds.failures >= 1, "death save not recorded");
  if (await page.locator("#dialog[open]").count()) await close().catch(() => {});
  if ((await saved()).actors.livia.hp === 0)
    await card.locator("[data-conditions-restore]").click();
  data = await saved();
  check(data.actors.livia.hp === 1, "«Riporta a 1 PF» did not restore 1 HP");
  passed.push(
    `PG-27: 0 HP › death box · ${regained ? "a 20 regains 1 HP («Recupera 1 PF»)" : `roll recorded (${ds.successes} successi, ${ds.failures} fallimenti) · «Riporta a 1 PF» → 1 PF`}`,
  );

  // 6. Massive damage: an explicit «Morto» with «Riporta in vita…».
  await card.locator("[data-dt-amount]").fill("40");
  await card.locator("[data-dt-damage]").click();
  const dead = card.locator('[data-conditions-deathbox="dead"]');
  await dead.waitFor();
  check(/morto/i.test(await dead.innerText()), "no explicit Dead state");
  await dead.locator("[data-conditions-revive]").click();
  await page.locator('#dialog select[name="magic"]').selectOption("revivify");
  await page.locator("#dialog footer .primary, #dialog footer button[type=submit]").first().click();
  data = await saved();
  check(data.actors.livia.dead !== true && data.actors.livia.hp === 1, "revive did not work");
  passed.push("PG-27: 40 damage › «Morto» explicit · «Riporta in vita…» (Rinascita) → 1 PF");

  // 7. TV-79: Concentration from «+ Condizione»; damage asks the CON save (DC 10).
  await conditions.locator("[data-conditions-quick-add]").click();
  await page.locator("#dialog [data-conditions-quick-concentration]").click();
  await page.locator('#dialog input[name="name"]').fill("Benedizione");
  await page.locator("#dialog footer .primary, #dialog footer button[type=submit]").first().click();
  await conditions.locator('[data-conditions-chip="concentration"]').waitFor();
  await card.locator("[data-dt-heal]").isVisible();
  await card.locator("[data-dt-amount]").fill("10");
  await card.locator("[data-dt-heal]").click();
  await card.locator("[data-dt-amount]").fill("4");
  await card.locator("[data-dt-damage]").click();
  data = await saved();
  const request = data.combatAttempts
    .flatMap((a) => a.requests)
    .findLast((r) => r.kind === "concentration" && r.actorId === "livia");
  check(request?.dc === 10, "no Concentration save at DC 10: " + JSON.stringify(request?.dc));
  passed.push("TV-79: (C) Benedizione from «+ Condizione»; 4 damage asks CON save DC 10");

  // 8. Tracker and Table HP dialogs pass axe too (DM).
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  await page.goto(base + "#table");
  await page.locator('.map-token[data-actor="goblin-1"]').click({ button: "right" });
  await page
    .getByRole("menuitem", { name: /Punti ferita/ })
    .first()
    .click();
  await page.locator("#dialog [data-dt-dialog]").waitFor();
  await axe("Table token HP dialog");
  await close();

  // (B) EN phone 390 × 844 with touch: the HP numbers and the widget fit.
  await context.close();
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  page = await phone.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "#characters?id=livia");
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("player");
  await page.locator('[data-service="preferences"]').tap();
  await page.locator("#dialog select[name=lang]").selectOption("en");
  await page.getByRole("button", { name: "Salva preferenze", exact: true }).tap();
  await page.goto(base + "#characters?id=livia");
  const hp = page.locator('[data-character-action="hp-correct"]');
  await hp.tap();
  await page.locator('#dialog [data-dt-details="correct"] summary').tap();
  await page.locator('#dialog [data-dt-details="correct"][open]').waitFor();
  check(
    (await page.locator('#dialog [data-dt-details="correct"] summary').innerText()).trim() ===
      "Correct hit points",
    "HP widget not in English",
  );
  check(
    (await page.getByLabel("Reason for the correction (required)").count()) === 1,
    "reason field has no accessible name",
  );
  await page.locator('#dialog [data-dt-fix="hp"]').fill("16");
  await page.locator('#dialog [data-dt-fix="reason"]').fill("Counted twice");
  await page.locator("#dialog [data-dt-fix-apply]").tap();
  check((await saved()).actors.livia.hp === 16, "phone correction not applied");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  check(!overflow, "phone page overflows sideways");
  await page.screenshot({ path: shots + "p3-23-phone-hp-correct.png" });
  passed.push(
    "EN phone 390 × 844 touch: tap on the HP numbers › HP management › «Correct hit points» 18 → 16, labelled fields, no overflow",
  );
  await phone.close();
  check(!errors.length, "page errors: " + errors.join(" | "));
  return passed;
};
