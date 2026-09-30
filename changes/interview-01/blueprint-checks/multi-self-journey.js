async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:8879/#table");
  await page.reload();
  await page.getByRole("button", { name: "Ripristina esempio", exact: true }).click();
  await page.getByRole("button", { name: "Ripristina", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  await page.getByRole("button", { name: "Dardo di fuoco", exact: true }).click();
  const sourceBefore = JSON.stringify(await saved());
  await page.locator("[data-actor=goblin-1]").hover();
  if (JSON.stringify(await saved()) !== sourceBefore) throw Error("Preview mutated state");
  await page.locator("#battle-map").focus();
  await page.keyboard.press("Escape");
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  await page.getByRole("button", { name: "Avvia combattimento", exact: true }).click();
  if ((await saved()).combat.active) throw Error("Saving initiative started combat");
  // Refreshed by the hand-off writer (29/09/2026): R5 PR-32 replaced Preparation's «Incontro
  // preparato» with the Table's start dialog (Foundry roll call): who fights and each typed
  // d20; the Initiative bonus comes from the sheet.
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
  await page.getByRole("button", { name: "Inizia combattimento", exact: true }).click();
  await page.locator("#battle-map").waitFor();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("player");
  await page
    .getByRole("combobox", { name: "Modalità dei dadi dell’azione", exact: true })
    .selectOption("physical");

  await page.getByRole("button", { name: "Dardo incantato", exact: true }).click();
  await page.locator("[data-actor=goblin-1]").click();
  await page.locator("[data-actor=goblin-2]").click();
  await page.getByRole("button", { name: "Aggiungi un dardo a Sentinella", exact: true }).click();
  await page.getByRole("button", { name: "Lancia Dardo incantato", exact: true }).click();
  await page.getByRole("button", { name: "Risolvi tiro", exact: true }).click();
  for (const [index, face] of [1, 2, 3].entries())
    await page.locator("[name=face" + index + "]").fill(String(face));
  await page.getByRole("button", { name: "Registra tiro", exact: true }).click();
  let data = await saved();
  if (
    data.actors["goblin-1"].hp !== 2 ||
    data.actors["goblin-2"].hp !== 5 ||
    data.actors.livia.slots.used !== 2
  )
    throw Error("Dart allocation or cost mismatch");
  if (!(await page.locator("#dialog").innerText()).includes("1 + 2 + 3 + 3 = 9"))
    throw Error("Dart bonus breakdown missing");
  await page.getByRole("button", { name: "Torna al gioco", exact: true }).click();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Termina turno", exact: true }).click();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("player");
  await page.getByRole("button", { name: "Scatto", exact: true }).click();
  const map = page.locator("#battle-map");
  await map.scrollIntoViewIfNeeded();
  // W2b1 integration: the straight 12 m Dash to (650, 380) crosses B41's hidden pressure plate
  // (x 400-450, y 350-410, it stops whoever enters) and B40's fountain (water, double cost).
  // Refreshed by the hand-off writer (29/09/2026): P6 TV-01 moves a token by dragging it, and
  // P6 TV-10's SRD grid counts a diagonal square as one square, so 12 m are 400 px along the
  // larger of |dx| and |dy|: Livia is dragged to (650, 502), clear of the plate and the fountain.
  const token = await page.locator('#battle-map [data-actor="livia"]').boundingBox();
  const { point, target } = await map.evaluate((svg) => {
    const p = svg.createSVGPoint();
    p.x = 650;
    p.y = 502;
    const v = p.matrixTransform(svg.getScreenCTM());
    return { point: { x: v.x, y: v.y }, target: { x: 650, y: 502 } };
  });
  await page.mouse.move(token.x + token.width / 2, token.y + token.height / 2);
  await page.mouse.down();
  await page.mouse.move(point.x, point.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  data = await saved();
  const moved = data.scenes[0].tokens.find((t) => t.actorId === "livia");
  if (
    data.actors.livia.action ||
    Math.abs(data.actors.livia.movement - 6) > 0.1 ||
    Math.hypot(moved.x - target.x, moved.y - target.y) > 2
  )
    throw Error("Dash destination/resource mismatch");
  if (await page.locator("#dialog").isVisible())
    throw Error("No-roll action unnecessarily blocked the map with a dialog");
  await page.getByRole("button", { name: "Annulla ultima modifica", exact: true }).click();
  await page.getByRole("button", { name: "Schivata", exact: true }).click();
  await page.locator("[data-combat-execute]").click();
  data = await saved();
  if (!data.actors.livia.combatEffects.some((e) => e.type === "dodge") || data.actors.livia.action)
    throw Error("Dodge effect missing");
  if (await page.locator("#dialog").isVisible())
    throw Error("Dodge required unnecessary roll/dialog");
  await page.getByRole("button", { name: "Termina turno", exact: true }).click();
  data = await saved();
  if (!data.actors.livia.combatEffects.some((e) => e.type === "dodge"))
    throw Error("Dodge expired at end instead of next start");
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Termina turno", exact: true }).click();
  data = await saved();
  if (data.actors.livia.combatEffects.some((e) => e.type === "dodge"))
    throw Error("Dodge survived next start");
  if (errors.length) throw Error(errors.join(";"));
  return {
    passed: [
      "multiple targets with repeated dart assignment",
      "per-dart physical breakdown",
      "one slot cost",
      "Dash at clicked free destination",
      "no-roll action stays on map",
      "Dodge effect and proper expiry",
    ],
    errors,
  };
}
