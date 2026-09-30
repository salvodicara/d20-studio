async (page) => {
  const errors = [],
    passed = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__journeyErrors = [];
    window.addEventListener("error", (e) => window.__journeyErrors.push(e.message));
  });
  await page.route("**/*.mjs", (route) => route.continue());
  await page.goto("http://127.0.0.1:8879/#table");
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 1000 });
  const button = (name) => page.getByRole("button", { name, exact: true });
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const mapPoint = async (selector, x, y) =>
    page.locator(selector).evaluate(
      (svg, p) => {
        const pt = svg.createSVGPoint();
        pt.x = p.x;
        pt.y = p.y;
        const point = pt.matrixTransform(svg.getScreenCTM());
        return { x: point.x, y: point.y };
      },
      { x, y },
    );
  await button("Ripristina esempio").click();
  await button("Ripristina").click();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  await button("Avvia combattimento").click();
  await button("Apri preparazione").click();
  await page.getByRole("button", { name: "Salva preparazione", exact: true }).waitFor();
  await page.locator("[name=gridSnap]").uncheck();
  const svg = "[data-prep-interactive]";
  // Refreshed by the hand-off writer (29/09/2026): P6 added the courtyard's walls (an inner
  // wall runs along y 200 from x 99 to 340) and B40 the fountain (500, 325): the encounter
  // moves 250 px right and 50 px up, same distances, on open ground.
  for (const [id, x, y] of [
    ["livia", 450, 150],
    ["goblin-1", 475, 130],
    ["goblin-2", 475, 170],
  ]) {
    const token = page.locator('[data-prep-token="token-' + id + '"]');
    const box = await token.boundingBox();
    const point = await mapPoint(svg, x, y);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(point.x, point.y, { steps: 8 });
    await page.mouse.up();
  }
  await page.locator('[data-prep-token="token-goblin-1"]').click();
  await button("Attacco e disposizione…").click();
  await page.getByText("Attacco in mischia (facoltativo)", { exact: true }).click();
  await page.locator("[name=meleeEnabled]").check();
  for (const [key, value] of [
    ["meleeName", "Lama della sentinella"],
    ["meleeReach", "1.5"],
    ["meleeAttackBonus", "4"],
    ["meleeDamageCount", "1"],
    ["meleeDamageModifier", "2"],
  ])
    await page.locator("[name=" + key + "]").fill(value);
  await page.locator("[name=meleeDamageSides]").selectOption("6");
  await page.locator("[name=meleeDamageType]").selectOption("slashing");
  await page.locator("[name=npcTeam]").selectOption("watch");
  await button("Applica alla bozza").click();
  await page.locator('[data-prep-token="token-goblin-2"]').click();
  await button("Attacco e disposizione…").click();
  await page.getByText("Attacco in mischia (facoltativo)", { exact: true }).click();
  await page.locator("[name=meleeEnabled]").check();
  for (const [key, value] of [
    ["meleeName", "Lama dell’esploratore"],
    ["meleeReach", "1.5"],
    ["meleeAttackBonus", "4"],
    ["meleeDamageCount", "1"],
    ["meleeDamageModifier", "2"],
  ])
    await page.locator("[name=" + key + "]").fill(value);
  await page.locator("[name=meleeDamageSides]").selectOption("6");
  await page.locator("[name=meleeDamageType]").selectOption("slashing");
  await page.locator("[name=npcTeam]").selectOption("watch");
  await button("Applica alla bozza").click();
  // Saved only when the draft changed (the include and d20 fields left Preparation).
  if (
    await page
      .getByRole("button", { name: "Salva preparazione", exact: true })
      .isEnabled({ timeout: 1000 })
      .catch(() => false)
  )
    await page.getByRole("button", { name: "Salva preparazione", exact: true }).click();
  // Saved only when the draft changed (the include and d20 fields left Preparation).
  if (
    await page
      .getByRole("button", { name: "Aggiorna scena attiva", exact: true })
      .isEnabled({ timeout: 1000 })
      .catch(() => false)
  )
    await page.getByRole("button", { name: "Aggiorna scena attiva", exact: true }).click();
  // Refreshed by the hand-off writer (29/09/2026): R5 PR-32 replaced Preparation's «Incontro
  // preparato» with the Table's start dialog (Foundry roll call): who fights and each typed
  // d20; the Initiative bonus comes from the sheet.
  await page.getByRole("button", { name: "Avvia incontro salvato…", exact: true }).click();
  await page.locator("[data-ct-start-dialog]").waitFor();
  {
    const naturals = { livia: 18, "goblin-1": 12, doran: 10, "goblin-2": 8 };
    const startIds = await page
      .locator("[data-ct-start-include]")
      .evaluateAll((els) => els.map((el) => el.dataset.ctStartInclude));
    for (const id of startIds) {
      const box = page.locator('[data-ct-start-include="' + id + '"]');
      if ((await box.isChecked()) !== Object.hasOwn(naturals, id)) await box.click();
    }
    for (const [id, natural] of Object.entries(naturals)) {
      const d20 = page.locator('[data-ct-start-natural="' + id + '"]');
      await d20.fill(String(natural));
      await d20.dispatchEvent("change");
    }
  }
  await button("Inizia combattimento").click();
  await page.locator("#battle-map").waitFor();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("player");

  const before = await saved();
  await page.locator("#battle-map").focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  let data = await saved();
  check(
    data.movements.at(-1).phase === "order",
    "Simultaneous exit did not request explicit order",
  );
  await button("Apri richieste").click();
  await button("Scegli ordine").click();
  check(
    (await page.locator(".reaction-order li").count()) === 2,
    "Expected both simultaneous occasions",
  );
  const first = await page.locator(".reaction-order li strong").first().innerText();
  await button("Posticipa").first().click();
  check(
    (await page.locator(".reaction-order li strong").first().innerText()) !== first,
    "Order did not change",
  );
  await button("Applica ordine").click();
  data = await saved();
  check(
    data.combatReactions.every((r) => r.status === "pending") &&
      data.actors["goblin-1"].reaction &&
      data.actors["goblin-2"].reaction,
    "Ordering spent a reaction",
  );
  await button("Torna al gioco").click();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  await button("Preferenze").click();
  await page.locator("[name=lang]").selectOption("en");
  await button("Salva preferenze").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await page.getByRole("button", { name: /^Open requests/ }).click();
  // Refreshed by the hand-off writer (29/09/2026): the ordered reactions are offered one at a
  // time (the first with «Choose», the next named under «Next, one at a time»), so two
  // simultaneous reactions can never run concurrently.
  const reactionText = await page.locator("#dialog").innerText();
  check(
    (await page
      .getByRole("button", { name: "Choose", exact: true })
      .filter({ visible: true })
      .count()) === 1 && /Next, one at a time: .*Opportunity attack/.test(reactionText),
    "English reaction cards absent: " + reactionText.slice(0, 300),
  );
  check(
    !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)),
    "Mobile page overflow",
  );
  check(
    !(await page.locator("#dialog").evaluate((el) => el.scrollWidth > el.clientWidth + 1)),
    "Mobile dialog overflow",
  );
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/reactions-mobile-en.png",
    fullPage: true,
  });
  for (let i = 0; i < 2; i++) {
    await page.locator("[data-reaction-open]:enabled").click();
    await page.getByRole("button", { name: "Decline this opportunity", exact: true }).click();
  }
  data = await saved();
  check(data.movements.at(-1).status === "resolved", "Declining all did not resume path");
  check(
    data.actors["goblin-1"].reaction && data.actors["goblin-2"].reaction,
    "Declining spent NPC reactions",
  );
  check(data.actors.livia.hp === before.actors.livia.hp, "Declining applied damage");
  await button("Return to game").click();
  await button("Preferences").click();
  await page.locator("[name=lang]").selectOption("it");
  await button("Save preferences").click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  passed.push(
    "simultaneous opportunities require player order",
    "order changes without resources",
    "only first ordered reaction actionable",
    "English mobile requests accessible without overflow",
    "sequential declines consume nothing",
    "original movement resumes after all responses",
  );
  errors.push(...(await page.evaluate(() => window.__journeyErrors)));
  check(errors.length === 0, errors.join(";"));
  return { passed, errors };
}
