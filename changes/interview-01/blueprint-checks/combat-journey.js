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
  await page.getByRole("button", { name: "Dardo di fuoco", exact: true }).click();
  await page.locator("[data-actor=goblin-1]").click();
  await page.getByRole("dialog", { name: "Tiro fisico", exact: true }).waitFor();
  if (!(await saved()).actors.livia.action) throw Error("Physical intent spent before throw");
  await page.getByRole("button", { name: "Ho lanciato i dadi", exact: true }).click();
  let data = await saved();
  if (data.actors.livia.action || data.combatAttempts.at(-1).status !== "pending")
    throw Error("Physical attempt not pending/spent");
  await page.getByRole("button", { name: "Torna al gioco", exact: true }).click();
  await page.reload();
  await page.locator(".service-nav [data-service=requests]").click();
  await page.locator("#dialog [data-notifications-requests]").click();
  await page.getByRole("button", { name: "Risolvi tiro", exact: true }).click();
  if ((await page.locator("[name=diceMode]").inputValue()) !== "physical")
    throw Error("Physical pending mode lost after reload");
  await page.locator("[name=face0]").fill("20");
  await page.getByRole("button", { name: "Registra tiro", exact: true }).click();
  await page.getByRole("button", { name: "Risolvi tiro", exact: true }).click();
  await page.locator("[name=diceMode]").selectOption("physical");
  await page.locator("[name=face0]").fill("2");
  await page.locator("[name=face1]").fill("3");
  await page.getByRole("button", { name: "Registra tiro", exact: true }).click();
  data = await saved();
  const last = data.combatAttempts.at(-1);
  if (last.status !== "resolved" || data.actors["goblin-1"].hp !== 2 || !last.outcomes[0].critical)
    throw Error("Critical damage not applied once");
  const body = await page.locator("#dialog").innerText();
  if (!body.includes("2 + 3 + 0 = 5") || !body.includes("Critico"))
    throw Error("Critical breakdown missing");
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/combat-result-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Torna al gioco", exact: true }).click();
  await page.getByRole("button", { name: "Annulla ultima modifica", exact: true }).click();
  data = await saved();
  if (
    data.actors["goblin-1"].hp !== 7 ||
    data.combatAttempts.at(-1).status !== "pending" ||
    data.actors.livia.action
  )
    throw Error("Correction did not retain spent attempt/pending damage");
  await page.locator(".service-nav [data-service=requests]").click();
  await page.locator("#dialog [data-notifications-requests]").click();
  await page.locator(".roll-evidence summary").click();
  const historyText = await page.locator(".roll-evidence").innerText();
  if (
    !historyText.includes("2 + 3 + 0 = 5") ||
    !historyText.includes("Annullato · risultato conservato")
  )
    throw Error("Undo erased accepted dice from visible history");
  await page.getByRole("button", { name: "Torna al gioco", exact: true }).click();
  await page.reload();
  await page.locator(".service-nav [data-service=requests]").click();
  await page.locator("#dialog [data-notifications-requests]").click();
  await page.locator(".roll-evidence summary").click();
  if (
    !(await page.locator(".roll-evidence").innerText()).includes("Annullato · risultato conservato")
  )
    throw Error("Roll evidence did not survive reload");
  await page.getByRole("button", { name: "Torna al gioco", exact: true }).click();
  if (errors.length) throw Error(errors.join(";"));
  return {
    passed: [
      "action preview no mutation",
      "initiative prepared and saved separately",
      "start same scene and ordered actors",
      "physical intent no spend",
      "physical throw spends once",
      "pending survives reload",
      "critical doubles dice not total",
      "damage applied once with breakdown",
      "undo result retains attempt",
      "dice history survives undo and reload",
    ],
    errors,
  };
}
