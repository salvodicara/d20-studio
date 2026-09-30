async (page) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:8879");
  // B61: like «Ripristina esempio», also forget each identity's last Table sidebar tab, so the
  // Table opens on the Creature tab (with Inventario) whatever an earlier journey left open.
  await page.evaluate(() => {
    localStorage.removeItem("d20-studio-blueprint-v1");
    localStorage.removeItem("d20-studio-table-sidebar");
  });
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Entra al Tavolo", exact: true }).click();
  const map = page.locator("#battle-map");
  const before = await page.locator("[data-actor=livia]").getAttribute("transform");
  await map.focus();
  await page.keyboard.press("ArrowRight");
  if ((await page.locator("[data-actor=livia]").getAttribute("transform")) !== before)
    throw Error("Preview moved actor");
  await page.keyboard.press("Escape");
  if (await page.locator("#preview-layer").innerHTML()) throw Error("Escape did not clear preview");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  if ((await page.locator("[data-actor=livia]").getAttribute("transform")) === before)
    throw Error("Keyboard movement did not execute");
  await page.getByRole("button", { name: "Annulla ultima modifica", exact: true }).click();
  if ((await page.locator("[data-actor=livia]").getAttribute("transform")) !== before)
    throw Error("Undo failed");
  await page.getByRole("button", { name: "Inventario", exact: true }).click();
  await page.getByRole("button", { name: "Bevi", exact: true }).click();
  // Final review F17: the potion asks the dice with the roll window's radios.
  await page.locator('#dialog input[name="mode"][value="physical"]').check();
  await page.getByRole("button", { name: "Bevi · esegui", exact: true }).click();
  await page.getByRole("button", { name: "Completa più tardi", exact: true }).click();
  await page.getByRole("button", { name: "Registra 2d4", exact: true }).waitFor();
  await page.getByRole("button", { name: "Registra 2d4", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Primo d4", exact: true }).fill("1");
  await page.getByRole("spinbutton", { name: "Secondo d4", exact: true }).fill("2");
  await page.getByRole("button", { name: "Registra e applica cura", exact: true }).click();
  const stored = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  let data = await stored();
  if (
    data.actors.livia.hp !== 22 ||
    data.actors.livia.inventory.find((i) => i.id === "potion").quantity !== 2
  )
    throw Error("Healing/consumption mismatch");
  // P2 PG-20 (Foundry sheet window over the canvas, D&D Beyond sheet inside Maps): the Table's
  // «Inventario» opens the sheet in a drawer over the map; closing it returns to the map.
  if (await page.locator("[data-sheet-overlay-close]").count())
    await page
      .getByRole("button", { name: "Chiudi la scheda e torna alla mappa", exact: true })
      .click();
  else await page.getByRole("button", { name: "Vai al Tavolo", exact: true }).click();
  if ((await page.evaluate(() => location.hash)) !== "#table")
    throw Error("Closing the sheet did not return to the Table");
  await page.getByRole("button", { name: "Livia, 22 punti ferita", exact: true }).waitFor();
  await page.getByRole("button", { name: "Annulla ultima modifica", exact: true }).click();
  data = await stored();
  if (data.actors.livia.hp !== 18 || !data.actors.livia.pendingHealing)
    throw Error("Undo result should retain pending roll");
  await page.getByRole("button", { name: "Annulla ultima modifica", exact: true }).click();
  data = await stored();
  if (
    data.actors.livia.pendingHealing ||
    data.actors.livia.inventory.find((i) => i.id === "potion").quantity !== 3
  )
    throw Error("Undo attempt should restore potion");
  await page.getByRole("button", { name: "Tira i dadi", exact: true }).click();
  // W2b1 integration: with B34 built, the dock «Tira i dadi» opens the Dadi tray (DDB-151)
  // instead of the one-die «Tiro libero» dialog (kept as the fallback); same physical 8 + 2.
  await page.locator("[data-dtray-formula], [name=natural]").first().waitFor();
  if (await page.locator("[data-dtray-formula]").count()) {
    await page.locator("[data-dtray-formula]").fill("1d20+2");
    await page.locator("[data-dtray-formula]").press("Tab");
    await page.locator('label.dtray-seg:has([data-dtray-mode][value="physical"])').click();
    await page.locator('[data-dtray-face="0"]').fill("8");
    await page.locator("[data-dtray-roll-button]").click();
    await page.waitForFunction(() =>
      /\[8\] \+ 2 = 10/.test(
        JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")).log.at(-1)?.label ?? "",
      ),
    );
  } else {
    await page.locator("[name=mode]").selectOption("physical");
    await page.locator("[name=natural]").fill("8");
    await page.locator("[name=modifier]").fill("2");
    await page.getByRole("button", { name: "Registra tiro", exact: true }).click();
  }
  data = await stored();
  if (!/8\]? \+ 2 = 10/.test(data.log.at(-1).label)) throw Error("Physical roll breakdown missing");
  await page.reload();
  await page.locator("#battle-map").waitFor();
  data = await stored();
  if (data.actors.livia.hp !== 18) throw Error("Reload lost shared state");
  // P9 CA-11 (D&D Beyond Quick Jot): at the Table «Appunti personali» opens «Appunto rapido»
  // over the map and the Table stays; elsewhere it opens the notes page (route `notes`).
  await page.getByRole("button", { name: "Appunti personali", exact: true }).click();
  if (await page.locator('#dialog [name="body"]').count()) {
    await page.locator('#dialog [name="body"]').fill("Solo il giocatore legge questo.");
    await page.getByRole("button", { name: "Salva appunto", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector("#dialog").open);
    if ((await page.evaluate(() => location.hash)) !== "#table")
      throw Error("The quick jot left the Table");
  } else {
    await page.locator('[data-campaign-new="note"]').click();
    await page.locator('[data-campaign-path="data.body"]').fill("Solo il giocatore legge questo.");
    await page.locator("[data-campaign-save]").click();
    await page.locator("[data-campaign-apply]").click();
  }
  // The author finds the note in Appunti personali (so the check below is not vacuous).
  await page.goto("http://127.0.0.1:8879/#notes");
  await page.getByRole("heading", { name: "Appunti", exact: true, level: 1 }).waitFor();
  await page.locator("#content", { hasText: "Solo il giocatore legge questo." }).waitFor();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  await page.goto("http://127.0.0.1:8879/#notes");
  await page.getByRole("heading", { name: "Appunti", exact: true, level: 1 }).waitFor();
  if ((await page.locator("#content").innerText()).includes("Solo il giocatore legge questo."))
    throw Error("Private note leaked across demo role");
  await page.goto("http://127.0.0.1:8879/#table");
  await page.locator("#battle-map").waitFor();
  // TV-45/PR-32: the Table's start dialog (Foundry Combat Tracker) takes the typed d20s; the
  // bonus comes from the sheet (+2 each); opening it starts nothing (the players' roll call).
  await page.getByRole("button", { name: "Avvia combattimento", exact: true }).click();
  await page.locator("[data-ct-start-dialog]").waitFor();
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
  if (
    (await page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")))).combat
      .active
  )
    throw Error("Preparing initiative started combat");
  await page.getByRole("button", { name: "Inizia combattimento", exact: true }).click();
  await page.locator("#battle-map").waitFor();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("player");
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("player");
  await page.locator("#battle-map").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  data = await stored();
  if (data.actors.livia.movement !== 7.5) throw Error("Budget consumed incorrectly");
  const hash = await page.evaluate(() => location.hash);
  await page.locator(".skip-link").focus();
  await page.keyboard.press("Enter");
  if ((await page.evaluate(() => location.hash)) !== hash) throw Error("Skip link changed route");
  await page.getByRole("button", { name: "Preferenze", exact: true }).click();
  await page.locator("[name=offline]").check();
  await page.getByRole("button", { name: "Salva preferenze", exact: true }).click();
  const preOffline = JSON.stringify(await stored());
  await page.locator("#battle-map").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  if (JSON.stringify(await stored()) !== preOffline)
    throw Error("Offline movement changed shared state");
  await page.getByRole("button", { name: "Preferenze", exact: true }).click();
  await page.locator("[name=offline]").uncheck();
  await page.getByRole("button", { name: "Salva preferenze", exact: true }).click();
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/table-desktop.png",
    fullPage: true,
  });
  if (errors.length) throw Error(errors.join(";"));
  return {
    passed: [
      "preview",
      "keyboard move",
      "escape",
      "undo",
      "physical potion pending/resolve",
      "shared HP",
      "two-stage undo",
      "physical free dice",
      "reload",
      "private notes",
      "turn budget",
      "skip link",
      "offline preview",
    ],
    errors,
  };
}
