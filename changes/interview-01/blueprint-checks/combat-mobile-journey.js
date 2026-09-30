async (rootPage) => {
  const context = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
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
  await page.addInitScript(() => {
    window.__journeyErrors = [];
    window.addEventListener("error", (event) => window.__journeyErrors.push(event.message));
  });
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
  await page.getByRole("button", { name: "Preferenze", exact: true }).click();
  await page.locator("[name=lang]").selectOption("en");
  await page.getByRole("button", { name: "Salva preferenze", exact: true }).click();
  await page.getByRole("button", { name: "Fire Bolt", exact: true }).click();
  await page.getByRole("button", { name: "Esc · Cancel preview", exact: true }).click();
  if (await page.locator("#combat-detail h3").count())
    throw Error("Cancelled action still has inspector");
  await page.getByRole("button", { name: "Fire Bolt", exact: true }).click();
  await page.locator("[data-actor=goblin-1]").click();
  await __settleDice(page);
  let data = await saved();
  if (data.combatAttempts.at(-1).status !== "resolved" || data.actors.livia.action)
    throw Error("Digital attack failed");
  if (await page.locator("#dialog").isVisible())
    throw Error("Digital attack introduced extra dialog");
  await page.getByRole("combobox", { name: "Visit as", exact: true }).selectOption("dm");
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "End turn", exact: true }).click();
  await page.getByRole("combobox", { name: "Visit as", exact: true }).selectOption("player");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Dodge", exact: true }).tap();
  await page.locator("[data-combat-execute]").tap();
  await page.getByRole("button", { name: "Dash", exact: true }).tap();
  const map = page.locator("#battle-map");
  await map.scrollIntoViewIfNeeded();
  const point = await map.evaluate((svg) => {
    const p = svg.createSVGPoint();
    p.x = 300;
    p.y = 380;
    const v = p.matrixTransform(svg.getScreenCTM());
    return { x: v.x, y: v.y };
  });
  await page.touchscreen.tap(point.x, point.y);
  data = await saved();
  if (data.actors.livia.action || Math.abs(data.actors.livia.movement - 7.5) > 0.1)
    throw Error("Short Dash consumed action or used extra budget");
  if (data.combatAttempts.at(-1).actionName.en !== "Movement") throw Error("Short Dash misnamed");
  await page.locator(".service-nav [data-service=requests]").tap();
  await page.locator("#dialog [data-notifications-requests]").tap();
  if (!(await page.locator("#dialog").innerText()).includes("Livia · Movement"))
    throw Error("Result mislabels ordinary movement");
  await page.getByRole("button", { name: "Return to game", exact: true }).tap();
  await page.getByRole("combobox", { name: "Visit as", exact: true }).selectOption("dm");
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "End turn", exact: true }).tap();
  await page.getByRole("combobox", { name: "Visit as", exact: true }).selectOption("player");
  await page
    .getByRole("combobox", { name: "Action dice mode", exact: true })
    .selectOption("physical");
  await page.getByRole("button", { name: "Fire Bolt", exact: true }).tap();
  await page.locator("[data-actor=goblin-2]").tap();
  await page.getByRole("button", { name: "I have rolled the dice", exact: true }).tap();
  await page.getByRole("button", { name: "Resolve roll", exact: true }).tap();
  await page.locator("[name=face0]").fill("1");
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
    throw Error("Mobile overflow");
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/combat-mobile-en.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Record roll", exact: true }).tap();
  await __settleDice(page);
  if ((await saved()).combatAttempts.at(-1).outcomes[0].hit !== false)
    throw Error("Natural one did not miss");
  await page.getByRole("button", { name: "Return to game", exact: true }).tap();
  // Refreshed by the hand-off writer (29/09/2026): P5 TV-74 greys an action once the Action
  // is spent (Fire Bolt spent it, BG3), so Livia's next turn comes first.
  await page.getByRole("combobox", { name: "Visit as", exact: true }).selectOption("dm");
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "End turn", exact: true }).tap();
  await page.getByRole("combobox", { name: "Visit as", exact: true }).selectOption("player");
  await page.getByRole("button", { name: "Burning Hands", exact: true }).tap();
  const adjacent = await page.locator(".combat-bar").evaluate((bar) => {
    /* B62: the action bar lives in the hotbar pinned above the tabs, in view whatever the inspector's length. */ const h =
      bar.closest(".table-hotbar");
    if (!h) return bar.previousElementSibling?.classList.contains("map-container");
    const r = h.getBoundingClientRect();
    return getComputedStyle(h).position === "sticky" && r.top >= 0 && r.bottom <= innerHeight + 1;
  });
  if (!adjacent) throw Error("Mobile action bar remains below long inspector");
  await page.getByRole("button", { name: "Map", exact: true }).tap();
  if ((await page.locator("#battle-map").boundingBox()).y > 100)
    throw Error("Map shortcut did not return to scene");
  await page.getByRole("button", { name: "Move details", exact: true }).tap();
  const detailBounds = await page.locator("#combat-detail").boundingBox();
  if (detailBounds.y < 0 || detailBounds.y > 100) throw Error("Move detail shortcut not reachable");

  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/combat-mobile-map-en.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  const windowErrors = await page.evaluate(() => window.__journeyErrors);
  if (windowErrors.length) throw Error(windowErrors.join(";"));
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/combat-table-en.png",
    fullPage: true,
  });
  if (errors.length) throw Error(errors.join(";"));
  await context.close();
  return {
    passed: [
      "digital attack at target click without extra dialog",
      "toolbar cancel clears inspector",
      "English controls",
      "touch no-target action",
      "short Dash after spent action",
      "ordinary movement result heading",
      "mobile physical natural face and miss",
      "no horizontal overflow",
      "action palette adjacent to map",
      "persistent map and detail touch shortcuts",
    ],
    errors,
  };
};
