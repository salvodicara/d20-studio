async (page) => {
  // Increment 10 dice evidence, journey (d). Declared Fire Bolt ("Ho lanciato i dadi"), then
  // digital attack and digital damage in the common dialog; Undo both; correct the attack face
  // 16→20 with a reason in "Riapplica risultato noto"; the recomputed 2d10 damage keeps the
  // known face and asks only for the missing die; history shows original and correction.
  // Group 2: a fully digital click-to-attack is the attempt plus its dice (two commits);
  // one Undo keeps the attempt spent with known faces, a second withdraws it, and an
  // identical retry reuses the same faces (review 10: Undo is never a free reroll).
  const errors = [],
    passed = [],
    findings = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/";
  const check = (c, m) => {
    if (!c) throw Error(m);
  };
  const button = (name) => page.getByRole("button", { name, exact: true });
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
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const role = (r) =>
    page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption(r);
  const diceMode = (m) =>
    page
      .getByRole("combobox", { name: "Modalità dei dadi dell’azione", exact: true })
      .selectOption(m);
  const dialogText = () => page.locator("#dialog").innerText();
  const last = async () => (await saved()).combatAttempts.at(-1);
  const req = (a, kind) => a.requests.find((r) => r.kind === kind);
  const start = async () => {
    if (await page.locator("#dialog[open]").count()) await page.keyboard.press("Escape");
    await page.goto("http://127.0.0.1:8879/#table");
    await button("Ripristina esempio").click();
    await button("Ripristina").click();
    await role("dm");
    await button("Avvia combattimento").click();
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
    await button("Inizia combattimento").click();
    await page.locator("[data-select=livia]").waitFor();
    await role("player");
    await page.locator("[data-select=livia]").click();
  };
  const fireBolt = async () => {
    await page.locator("[data-combat-action=fire-bolt]").click();
    await page.locator("[data-combat-action=fire-bolt][aria-pressed=true]").waitFor();
    await page.locator("#battle-map [data-actor=goblin-1]").click();
  };
  await page.goto("http://127.0.0.1:8879/#table");
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 1000 });
  // A digital attack is random: repeat from a fresh example until it is a normal hit.
  let tries = 0,
    attack;
  for (; tries < 8; tries++) {
    await start();
    await diceMode("physical");
    await fireBolt();
    await page.getByRole("dialog", { name: "Tiro fisico", exact: true }).waitFor();
    await button("Ho lanciato i dadi").click();
    await button("Risolvi tiro").click();
    await page.locator("[name=diceMode]").selectOption("digital");
    await button("Registra tiro").click();
    await __settleDice(page);
    attack = req(await last(), "attack").acceptedValues[0];
    const o = (await last()).outcomes[0];
    if (o.hit && !o.critical) break;
  }
  check(tries < 8, "no normal digital hit in 8 tries");
  check(req(await last(), "damage").status === "pending", "damage resolved without its own roll");
  await button("Risolvi tiro").click();
  await page.locator("[name=diceMode]").selectOption("digital");
  await button("Registra tiro").click();
  await __settleDice(page);
  let data = await saved();
  const damage = req(data.combatAttempts.at(-1), "damage").acceptedValues[0];
  check(data.actors["goblin-1"].hp === Math.max(0, 7 - damage), "digital damage not applied once");
  passed.push(
    "declared Fire Bolt, digital attack " +
      attack +
      " (hit, " +
      (tries + 1) +
      " example run(s)) and digital damage " +
      damage +
      ": Sentinella 7 → " +
      Math.max(0, 7 - damage),
  );
  await button("Torna al gioco").click();
  // Undo twice: damage, then the attack. Faces stay as evidence; the action stays spent.
  await button("Annulla ultima modifica").click();
  await button("Annulla ultima modifica").click();
  data = await saved();
  let a = data.combatAttempts.at(-1);
  check(
    data.actors["goblin-1"].hp === 7 &&
      req(a, "attack").status === "pending" &&
      JSON.stringify(req(a, "attack").acceptedValues) === "[" + attack + "]" &&
      data.actors.livia.action === false,
    "Undo lost attack evidence or refunded the action",
  );
  passed.push(
    "two Undo: HP back to 7, attack pending with known face " + attack + ", action still spent",
  );
  await page.locator(".service-nav [data-service=requests]").click();
  await page.locator("#dialog [data-notifications-requests]").click();
  check(
    (await dialogText()).includes("ritirato con Annulla, facce note: " + attack),
    "request list does not say the result was withdrawn",
  );
  await button("Riapplica risultato noto").click();
  await page.getByRole("dialog", { name: "Riapplica risultato noto", exact: true }).waitFor();
  check((await dialogText()).includes("Livia · " + attack), "reapply dialog lacks the known face");
  await page.locator("#dialog details summary").click();
  await page.locator("[name=knownFace0]").fill("20");
  await page.locator("[name=correctionReason]").fill("Il dado mostrava 20: trascritto male");
  await page.screenshot({ path: dir + "dice-d-reapply-correction.png" });
  await button("Riapplica risultato").click();
  a = await last();
  const dmg = req(a, "damage");
  check(
    req(a, "attack").acceptedValues[0] === 20 && a.outcomes[0].critical === true,
    "correction did not make a critical",
  );
  check(
    JSON.stringify(dmg.dice) === '[{"count":2,"sides":10}]' &&
      JSON.stringify(dmg.knownValues) === "[" + damage + ",null]" &&
      dmg.status === "pending",
    "damage not recomputed to 2d10 with one known face: " + JSON.stringify(dmg),
  );
  check(
    (await dialogText()).includes("facce già registrate: " + damage + ", ?"),
    "request list does not show the known face",
  );
  passed.push(
    "Riapplica with reason: attack 20 critical; damage 1d10 → 2d10 keeps face " +
      damage +
      " and stays pending, no automatic reroll",
  );
  await button("Risolvi tiro").click();
  await page.getByRole("dialog", { name: "Completa il tiro", exact: true }).waitFor();
  const complete = await dialogText();
  check(
    complete.includes("1d10 → 2d10") &&
      complete.includes("Dado 1 · d10: " + damage + " · già registrato"),
    "completion dialog lacks known face",
  );
  await page.locator("[name=diceMode]").selectOption("physical");
  check(
    (await page.locator("#dialog [name=face0]").count()) === 0 &&
      (await page.locator("#dialog [name=face1]").isVisible()),
    "completion asks again for the known die",
  );
  await page.locator("[name=face1]").fill("3");
  await page.screenshot({ path: dir + "dice-d-complete-missing.png" });
  await button("Registra i dadi mancanti").click();
  data = await saved();
  a = data.combatAttempts.at(-1);
  check(
    JSON.stringify(req(a, "damage").acceptedValues) === "[" + damage + ",3]" &&
      data.actors["goblin-1"].hp === Math.max(0, 7 - damage - 3),
    "missing die not combined: " + JSON.stringify(req(a, "damage").acceptedValues),
  );
  passed.push(
    "Completa il tiro asks only die 2: physical 3 + known " +
      damage +
      " → " +
      (damage + 3) +
      " damage",
  );
  // History: original faces reversed, correction with reason, completed damage with known face.
  await page.locator(".roll-evidence summary").click();
  const history = await page.locator(".roll-evidence").innerText();
  check(
    history.includes("Annullato · risultato conservato") &&
      history.includes("Corregge " + attack) &&
      history.includes("Il dado mostrava 20") &&
      history.includes("Facce già registrate: " + damage),
    "history lacks original/correction/known-face rows: " + history,
  );
  const combined = history.split("\n").find((l) => l.includes("Facce già registrate"));
  check(
    combined.includes("Digitale (dado 1) + Fisico (dado 2)"),
    "history does not label each die of the combined damage: " + combined,
  );
  await page.screenshot({ path: dir + "dice-d-history.png" });
  await button("Torna al gioco").click();
  await page.reload();
  await page.locator(".service-nav [data-service=requests]").click();
  await page.locator("#dialog [data-notifications-requests]").click();
  await page.locator(".roll-evidence summary").click();
  check(
    (await page.locator(".roll-evidence").innerText()).includes("Corregge " + attack),
    "correction history lost on reload",
  );
  await button("Torna al gioco").click();
  passed.push(
    "Storico dei tiri: original " +
      attack +
      " and damage " +
      damage +
      ' reversed, correction "Corregge ' +
      attack +
      '" with reason, completed 2d10 with known face; survives reload',
  );
  // Group 2: fully digital click-to-attack = attempt + dice; Undo never rerolls.
  await start();
  await diceMode("digital");
  const before = (await saved()).log.length;
  await fireBolt();
  await __settleDice(page);
  data = await saved();
  const firstId = data.combatAttempts.at(-1).id,
    firstFaces = data.combatAttempts.at(-1).requests.map((r) => r.acceptedValues);
  check(
    data.log.length === before + 2 && data.actors.livia.action === false,
    "digital attack is not attempt + dice commits: " + (data.log.length - before),
  );
  await button("Annulla ultima modifica").click();
  data = await saved();
  a = (data.combatAttempts || []).find((x) => x.id === firstId);
  check(
    a &&
      data.actors.livia.action === false &&
      req(a, "attack").status === "pending" &&
      req(a, "attack").withdrawn === true &&
      JSON.stringify(req(a, "attack").acceptedValues) === JSON.stringify(firstFaces[0]),
    "one Undo did not keep the spent attempt with its known faces",
  );
  await page.locator(".service-nav [data-service=requests]").click();
  await page.locator("#dialog [data-notifications-requests]").click();
  check(
    (await button("Riapplica risultato noto").count()) >= 1,
    "withdrawn digital result offers no Reapply",
  );
  await button("Torna al gioco").click();
  passed.push(
    "digital Fire Bolt = 2 commits; one Undo keeps the attempt spent (action used) with known faces " +
      JSON.stringify(firstFaces) +
      " and offers Riapplica risultato noto",
  );
  await button("Annulla ultima modifica").click();
  data = await saved();
  check(
    !(data.combatAttempts || []).some((x) => x.id === firstId) && data.actors.livia.action === true,
    "second Undo did not withdraw the attempt",
  );
  await fireBolt();
  await __settleDice(page);
  data = await saved();
  const again = data.combatAttempts.at(-1);
  check(
    again.id !== firstId &&
      JSON.stringify(again.requests.map((r) => r.acceptedValues)) === JSON.stringify(firstFaces),
    "identical retry drew new dice: " +
      JSON.stringify(again.requests.map((r) => r.acceptedValues)) +
      " vs " +
      JSON.stringify(firstFaces),
  );
  await page.locator(".service-nav [data-service=requests]").click();
  await page.locator("#dialog [data-notifications-requests]").click();
  await page.locator(".roll-evidence summary").first().click();
  const reusedHistory = await page.locator(".roll-evidence").first().innerText();
  check(
    reusedHistory.includes("Riusato: stesse facce del tentativo annullato"),
    "history does not mark the reused faces: " + reusedHistory,
  );
  await page.screenshot({ path: dir + "dice-d-digital-undo-reroll.png" });
  await button("Torna al gioco").click();
  passed.push(
    "second Undo withdraws the attempt and refunds the action; the identical retry reuses " +
      JSON.stringify(firstFaces) +
      " (history: Riusato), no free reroll",
  );
  check(errors.length === 0, "Page errors: " + errors.join("; "));
  return { passed, findings, errors };
}
