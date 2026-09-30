async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // W1b integration: B56 dice sit above the page and keep the click that skips or closes
  // them (no click-through, B56 review r2); let them go (Esc skips, then closes) first.
  const __settleDice = async (p) => {
    const layer = p.locator("[data-dice3d-layer]:not([hidden])");
    await layer.waitFor({ timeout: 1000 }).catch(() => {});
    for (let i = 0; i < 8 && (await layer.count()); i++) {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(80);
    }
    await layer.waitFor({ state: "hidden", timeout: 5000 });
  };
  await page.goto("http://127.0.0.1:8879/#table");
  await page.reload();
  await page.getByRole("button", { name: "Ripristina esempio", exact: true }).click();
  await page.getByRole("button", { name: "Ripristina", exact: true }).click();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  // P7 PR-06: the one scene list (folders keep every scene in sight); «Modifica» opens the editor.
  await page.goto("http://127.0.0.1:8879/#preparation");
  await page.locator('[data-prep-open="old-watch"]').first().click();
  await page.getByRole("heading", { name: "Pedine nella scena", exact: true }).waitFor();
  const map = page.locator("[data-prep-interactive]");
  for (const [id, x, y] of [
    ["livia", 400, 320],
    ["goblin-1", 470, 305],
    ["goblin-2", 500, 340],
    ["doran", 475, 350],
  ]) {
    const token = map.locator("[data-prep-token=token-" + id + "] circle");
    await token.scrollIntoViewIfNeeded();
    const box = await token.boundingBox();
    const dest = await map.evaluate(
      (svg, { x, y }) => {
        const p = svg.createSVGPoint();
        p.x = x;
        p.y = y;
        const c = p.matrixTransform(svg.getScreenCTM());
        return { x: c.x, y: c.y };
      },
      { x, y },
    );
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(dest.x, dest.y, { steps: 8 });
    await page.mouse.up();
  }
  await page.getByRole("button", { name: "Salva preparazione", exact: true }).click();
  await page.getByRole("button", { name: "Aggiorna scena attiva", exact: true }).click();
  // TV-45/PR-32: initiative is prepared in the Table's start dialog (Foundry Combat Tracker):
  // the saved scene's «Avvia incontro salvato…» opens it; physical d20s typed per row.
  await page.getByRole("button", { name: "Avvia incontro salvato…", exact: true }).click();
  await page.locator("[data-ct-start-dialog]").waitFor();
  const include = page.locator('[data-ct-start-include="mira"]');
  if (await include.isChecked()) await include.uncheck();
  for (const [id, natural] of [
    ["livia", 18],
    ["goblin-1", 12],
    ["doran", 10],
    ["goblin-2", 8],
  ]) {
    const box = page.locator('[data-ct-start-include="' + id + '"]');
    if (!(await box.isChecked())) await box.check();
    const d20 = page.locator('[data-ct-start-natural="' + id + '"]');
    await d20.fill(String(natural));
    await d20.dispatchEvent("change");
  }
  await page.getByRole("button", { name: "Inizia combattimento", exact: true }).click();
  await page.locator("#battle-map").waitFor();
  const order = await page.evaluate(
    () => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")).combat.order,
  );
  if (order.join() !== "livia,goblin-1,doran,goblin-2")
    throw Error("Order not sorted by the typed d20s: " + order);
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("player");
  await page
    .getByRole("combobox", { name: "Modalità dei dadi dell’azione", exact: true })
    .selectOption("physical");
  await page.getByRole("button", { name: "Mani brucianti", exact: true }).click();
  const battle = page.locator("#battle-map");
  await battle.scrollIntoViewIfNeeded();
  const point = await battle.evaluate((svg) => {
    const p = svg.createSVGPoint();
    p.x = 550;
    p.y = 320;
    const v = p.matrixTransform(svg.getScreenCTM());
    return { x: v.x, y: v.y };
  });
  await page.mouse.click(point.x, point.y);
  const shape = await page.locator("#combat-map-layer polygon").getAttribute("points");
  const targets = await page.locator(".combat-targets").innerText();
  if (
    !targets.includes("Doran") ||
    !targets.includes("Sentinella") ||
    !targets.includes("Esploratore")
  )
    throw Error("Cone excluded known targets/ally");
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")),
  );
  await page.mouse.move(point.x - 80, point.y + 70, { steps: 5 });
  if (shape !== (await page.locator("#combat-map-layer polygon").getAttribute("points")))
    throw Error("Placed cone changed on hover");
  if (!before.actors.livia.action || before.actors.livia.slots.used !== 1)
    throw Error("Area preview consumed resources");
  await page.locator(".table-inspector").evaluate((e) => (e.scrollTop = e.scrollHeight));
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/area-preview-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Lancia Mani brucianti", exact: true }).click();
  await __settleDice(page);
  await page.getByRole("button", { name: "Risolvi tiro", exact: true }).click();
  for (const [index, face] of [4, 4, 3].entries())
    await page.locator("[name=face" + index + "]").fill(String(face));
  await page.getByRole("button", { name: "Registra tiro", exact: true }).click();
  await __settleDice(page);
  let state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")),
  );
  if (state.actors.livia.slots.used !== 2 || state.actors["goblin-1"].hp !== 7)
    throw Error("Common damage spent twice or applied before saves");
  const playerText = await page.locator("#dialog").innerText();
  if (!playerText.includes("Altri tiri attendono"))
    throw Error("Other controller waiting hidden entirely");
  await page.getByRole("button", { name: "Torna al gioco", exact: true }).click();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  for (const [name, face] of [
    ["Sentinella", 8],
    ["Doran", 14],
    ["Esploratore", 14],
  ]) {
    await page.locator(".service-nav [data-service=requests]").click();
    await page.locator("#dialog [data-notifications-requests]").click();
    await page
      .locator(".roll-request")
      .filter({ hasText: name })
      .getByRole("button", { name: "Risolvi tiro", exact: true })
      .click();
    await page.locator("[name=diceMode]").selectOption("physical");
    await page.locator("[name=face0]").fill(String(face));
    await page.getByRole("button", { name: "Registra tiro", exact: true }).click();
    await __settleDice(page);
    await page.getByRole("button", { name: "Torna al gioco", exact: true }).click();
  }
  state = await page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  if (
    state.combatAttempts.at(-1).status !== "resolved" ||
    state.actors["goblin-1"].hp !== 0 ||
    state.actors["goblin-2"].hp !== 4 ||
    state.actors.doran.hp !== 22 ||
    state.actors.livia.slots.used !== 2
  )
    throw Error("Area outcomes mismatch");
  if (errors.length) throw Error(errors.join(";"));
  return {
    passed: [
      "direct prepared-token positioning",
      "initiative typed in the start dialog, sorted",
      "cone includes allies",
      "placement survives hover",
      "preview consumes nothing",
      "one cast one slot",
      "common 11 damage waits for saves",
      "player sees authorized waiting only",
      "individual physical saves apply full or half once",
    ],
    errors,
  };
}
