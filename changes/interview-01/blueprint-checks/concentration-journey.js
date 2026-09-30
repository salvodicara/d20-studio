async (page) => {
  const errors = [],
    passed = [];
  page.on("pageerror", (e) => errors.push(e.message));
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
    ["goblin-1", 475, 150],
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

  await button("Scheda completa").click();
  await button("Magie").click();
  const seed = await saved();
  await button("Registra concentrazione").click();
  await page.locator("[name=effectName]").fill("Benedizione di prova");
  await page.locator("[name=effectSource]").fill("Correzione sintetica della sessione");
  await page.keyboard.press("Escape");
  check(!(await saved()).actors.livia.concentration, "Canceled concentration was applied");
  await button("Registra concentrazione").click();
  await page.locator("[name=effectName]").fill("Benedizione di prova");
  await page.locator("[name=effectSource]").fill("Correzione sintetica della sessione");
  await button("Registra").click();
  check(
    (await saved()).actors.livia.slots.used === seed.actors.livia.slots.used,
    "Recording concentration cast a spell",
  );
  // Refreshed by the hand-off writer (29/09/2026): P2 PG-20 opens «Scheda completa» in a
  // drawer over the map (Foundry sheet window); closing it returns to the map.
  if (await page.locator("[data-sheet-overlay-close]").count())
    await page
      .getByRole("button", { name: "Chiudi la scheda e torna alla mappa", exact: true })
      .click();
  else await button("Vai al Tavolo").click();
  await page.locator("#battle-map").waitFor();
  const before = await saved();
  // Refreshed by the hand-off writer (29/09/2026): P6 TV-01 moves a token by dragging it
  // (Foundry, Roll20), not by clicking the destination; the path and its pause are the same.
  const point = await mapPoint("#battle-map", 700, 150);
  const livia = await page.locator('#battle-map [data-actor="livia"]').boundingBox();
  // The Sentinella stands half a square away and overlaps Livia's right side: grab her left.
  await page.mouse.move(livia.x + livia.width * 0.2, livia.y + livia.height / 2);
  await page.mouse.down();
  await page.mouse.move(point.x, point.y, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  await page.getByRole("button", { name: /^Apri richieste/ }).click();
  await button("Scegli").click();
  await page.locator("[name=reactionMode]").selectOption("physical");
  await button("Ho lanciato i dadi").click();
  await page.locator("[name=face0]").fill("10");
  await button("Registra tiro").click();
  await button("Torna al gioco").click();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("player");
  await page.getByRole("button", { name: /^Apri richieste/ }).click();
  await button("Scegli").click();
  await button("Rinuncia per questa occasione").click();
  check((await saved()).actors.livia.reaction, "Declining spent reaction");
  await button("Torna al gioco").click();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  await page.getByRole("button", { name: /^Apri richieste/ }).click();
  await button("Risolvi tiro").click();
  await page.locator("[name=diceMode]").selectOption("physical");
  await page.locator("[name=face0]").fill("3");
  await button("Registra tiro").click();
  await button("Torna al gioco").click();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("player");
  let data = await saved();
  check(
    data.actors.livia.hp === before.actors.livia.hp - 5,
    "Damage not applied before concentration",
  );
  check(data.movements.at(-1).status === "pending", "Movement resumed before concentration");
  check(data.actors.livia.concentration.active, "Concentration ended without save");
  await page.getByRole("button", { name: /^Apri richieste/ }).click();
  await button("Risolvi tiro").click();
  check(
    (await page.locator("#dialog").innerText()).includes("CD 10"),
    "Concentration threshold missing",
  );
  await page.keyboard.press("Escape");
  await page.reload();
  await page.getByRole("button", { name: /^Apri richieste/ }).click();
  await button("Risolvi tiro").click();
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/concentration-request.png",
    fullPage: true,
  });
  await page.locator("[name=diceMode]").selectOption("physical");
  await page.locator("[name=face0]").fill("1");
  await button("Registra tiro").click();
  data = await saved();
  check(data.actors.livia.concentration.active === false, "Failed CON did not end effect");
  check(data.movements.at(-1).status === "awaiting-choice", "Damage did not leave movement choice");
  const spent = data.actors.livia.movement;
  const tokenBefore = data.scenes
    .find((s) => s.id === data.activeSceneId)
    .tokens.find((t) => t.actorId === "livia");
  await button("Cambia mossa").click();
  data = await saved();
  check(
    data.movements.at(-1).status === "changed" &&
      data.actors.livia.movement === spent &&
      data.actors.livia.hp === before.actors.livia.hp - 5,
    "Change move refunded consequences",
  );
  const token = data.scenes
    .find((s) => s.id === data.activeSceneId)
    .tokens.find((t) => t.actorId === "livia");
  check(token.x === tokenBefore.x && token.y === tokenBefore.y, "Change move teleported");
  await button("Dardo di fuoco").click();
  check(
    (await page.locator("#combat-detail").innerText()).includes("Dardo di fuoco"),
    "Could not choose a different strategy",
  );
  check(data.actors.livia.action, "Opportunity spent mover action");
  passed.push(
    "concentration cancel has no effect",
    "manual concentration no spell cost",
    "decline spends no reaction",
    "damage applied before mandatory CON",
    "CON blocks remainder",
    "threshold and modifier visible",
    "pending CON survives Escape/reload",
    "failed CON ends matching effect",
    "Change retains traveled movement and damage",
    "new strategy stays available",
  );
  check(errors.length === 0, errors.join(";"));
  return { passed, errors };
}
