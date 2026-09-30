async (page) => {
  const errors = [],
    passed = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*.mjs", (route) => route.continue());
  await page.goto("http://127.0.0.1:8879/#home");
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 1000 });
  const button = (name) => page.getByRole("button", { name, exact: true });
  const check = (v, m) => {
    if (!v) throw Error(m);
  };
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const place = async (x, y) => {
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await page.locator("[data-prep-interactive]").scrollIntoViewIfNeeded();
    const pt = await page.locator("[data-prep-interactive]").evaluate(
      (svg, p) => {
        const t = svg.createSVGPoint();
        t.x = p.x;
        t.y = p.y;
        const r = t.matrixTransform(svg.getScreenCTM());
        return { x: r.x, y: r.y };
      },
      { x, y },
    );
    await page.mouse.click(pt.x, pt.y);
  };
  await button("Ripristina esempio").click();
  await button("Ripristina").click();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  await button("Apri campagna").click();
  await button("Preparazione").click();
  await button("Nuova scena").click();
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Prova del custode");
  await button("Crea bozza").click();
  await page.locator("[name=gridSnap]").uncheck();
  await page
    .getByRole("combobox", { name: "Personaggio o creatura", exact: true })
    .selectOption("livia");
  await button("Posiziona sulla mappa").click();
  await place(200, 200);
  await button("Crea PNG…").click();
  check(
    (await page.locator("[name=npcTeam]").inputValue()) === "neutral",
    "New NPC is implicitly hostile",
  );
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Custode autonomo");
  await page.locator("[name=npcTeam]").selectOption("watch");
  await page.getByText("Attacco in mischia (facoltativo)", { exact: true }).click();
  await page.locator("[name=meleeEnabled]").check();
  for (const [key, value] of [
    ["meleeName", "Lancia del custode"],
    ["meleeReach", "1.5"],
    ["meleeAttackBonus", "4"],
    ["meleeDamageCount", "1"],
    ["meleeDamageModifier", "2"],
  ])
    await page.locator("[name=" + key + "]").fill(value);
  await page.locator("[name=meleeDamageSides]").selectOption("6");
  await page.locator("[name=meleeDamageType]").selectOption("piercing");
  await button("Crea e posiziona").click();
  await place(225, 200);
  await button("Salva preparazione").click();
  let data = await saved();
  const npc = Object.values(data.actors).find((a) => a.name === "Custode autonomo");
  check(
    npc.combatProfile.team === "watch" && npc.combatProfile.meleeAttack.attackBonus === 4,
    "Configured disposition/attack lost",
  );
  // Saved only when the draft changed (the include and d20 fields left Preparation).
  if (
    await page
      .getByRole("button", { name: "Salva preparazione", exact: true })
      .isEnabled({ timeout: 1000 })
      .catch(() => false)
  )
    await page.getByRole("button", { name: "Salva preparazione", exact: true }).click();
  // Refreshed by the hand-off writer (29/09/2026): R5 PR-32 replaced Preparation's «Incontro
  // preparato» with the Table's start dialog (Foundry roll call): who fights and each typed
  // d20; the Initiative bonus comes from the sheet.
  await page.getByRole("button", { name: "Avvia incontro salvato…", exact: true }).click();
  await page.locator("[data-ct-start-dialog]").waitFor();
  {
    const naturals = { livia: 18, [npc.id]: 12 };
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
  await button("Attiva e avvia").click();
  await page.locator("#battle-map").waitFor();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("player");
  await page.locator("#battle-map").focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  data = await saved();
  check(
    data.movements.at(-1).status === "pending" && data.combatReactions.at(-1).actorId === npc.id,
    "Custom hostile NPC did not trigger opportunity",
  );
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  await page.getByRole("button", { name: /^Apri richieste/ }).click();
  await button("Scegli").click();
  await page.locator("[name=reactionMode]").selectOption("physical");
  await button("Ho lanciato i dadi").click();
  await page.locator("[name=face0]").fill("1");
  await button("Registra tiro").click();
  data = await saved();
  check(
    data.movements.at(-1).status === "resolved" && !data.actors[npc.id].reaction,
    "Miss did not consume only NPC reaction and resume",
  );
  check(errors.length === 0, errors.join(";"));
  passed.push(
    "new NPC defaults neutral",
    "explicit hostility and melee persist",
    "custom NPC opportunity reaches table",
    "physical miss spends reaction and resumes",
  );
  return { passed, errors };
}
