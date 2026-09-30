async (page) => {
  // Increment 10, journey (c): survival in combat through the existing request queue.
  // 0 HP from the panel, death save at the next turn start in "Tiri e risultati", physical
  // typed face and digital die, Medicine aid to Stable, healing ends Unconscious,
  // three failures show Dead on token and sheet, reload keeps everything.
  const errors = [],
    passed = [],
    notes = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/inc10-closure/";
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
  const ids = (a) => (a.conditions || []).map((c) => (typeof c === "string" ? c : c.id));
  const field = (k) => page.locator("#dialog [data-conditions-field=" + k + "]");
  const closeDialog = () => page.locator("#dialog footer [data-close]").click();
  const dialogText = () => page.locator("#dialog").innerText();
  const summary = (id) => page.locator("#content [data-conditions-summary=" + id + "]");
  const openPanel = async (id) => {
    await page.locator("[data-select=" + id + "]").click();
    await summary(id)
      .locator("[data-conditions-entry=" + id + "]")
      .click();
  };
  // Refreshed by the hand-off writer (29/09/2026): P3 PG-22 (Roll20 / D&D Beyond, one HP
  // control everywhere): the panel's «Punti ferita…» opens the HP widget, where the cause, the
  // amount and «Danno» or «Cura» apply at once (with its own Undo in the HP log).
  const vitality = async (id, command, amount, reason) => {
    await openPanel(id);
    await page.locator("[data-conditions-command=hp]").click();
    await page.locator("#dialog [data-dt-amount]").waitFor();
    await page.locator("#dialog [data-dt-note]").fill(reason);
    await page.locator("#dialog [data-dt-amount]").fill(String(amount));
    await page
      .locator(command === "heal" ? "#dialog [data-dt-heal]" : "#dialog [data-dt-damage]")
      .click();
    await page.waitForTimeout(200);
    await closeDialog();
  };
  const endTurnsUntil = async (id) => {
    for (let i = 0; i < 6; i++) {
      const s = await saved();
      if (s.combat.order[s.combat.turn] === id && i > 0) return;
      await button("Termina turno").click();
    }
    const s = await saved();
    check(s.combat.order[s.combat.turn] === id, "turn did not reach " + id);
  };
  const deathRequests = async (id) =>
    ((await saved()).combatAttempts || []).filter(
      (a) =>
        a.kind === "vitality" &&
        a.requests[0].actorId === id &&
        a.requests[0].kind === "death-save",
    );
  await page.goto("http://127.0.0.1:8879/#table");
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await button("Ripristina esempio").click();
  await button("Ripristina").click();
  await role("dm");
  await button("Avvia combattimento").click();
  // Refreshed by the hand-off writer (29/09/2026): R5 PR-32 replaced Preparation's «Incontro
  // preparato» with the Table's start dialog (Foundry roll call): who fights and each typed
  // d20; the Initiative bonus comes from the sheet.
  await page.locator("[data-ct-start-dialog]").waitFor();
  {
    const naturals = { livia: 18, mira: 14, "goblin-1": 12, doran: 10, "goblin-2": 8 };
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
  let data = await saved();
  check(
    data.combat.order.join() === "livia,mira,goblin-1,doran,goblin-2" && data.combat.turn === 0,
    "unexpected order " + data.combat.order,
  );
  // DM records 18 damage on Livia during her own turn: 0 HP, dying, no roll yet.
  await vitality("livia", "damage", 18, "Colpo di mazza della sentinella");
  data = await saved();
  check(
    data.actors.livia.hp === 0 &&
      ids(data.actors.livia).includes("unconscious") &&
      ids(data.actors.livia).includes("prone") &&
      !data.actors.livia.dead,
    "Livia not dying at 0 HP",
  );
  check((await deathRequests("livia")).length === 0, "death save requested before a turn start");
  check((await summary("livia").innerText()).includes("Morente"), "summary not Morente");
  passed.push(
    "panel damage 18 in combat: Livia 0 HP, Morente, Privo di sensi + Prono, no death save yet",
  );
  // Next turn start: one death save in the common requests, resolved with a typed face.
  await endTurnsUntil("livia");
  check(
    (await deathRequests("livia")).length === 1,
    "turn start did not queue exactly one death save",
  );
  await role("player");
  await page.locator("[data-select=livia]").click();
  check(
    // Refreshed by the hand-off writer (29/09/2026): the pending death save is the death
    // box's own «Tira il TS contro la morte (in attesa)» (not the generic pending line).
    /Tira il TS contro la morte \(in attesa\)/.test(await summary("livia").innerText()),
    "summary lacks pending roll",
  );
  await page.locator(".service-nav [data-service=requests]").click();
  await page.locator("#dialog [data-notifications-requests]").click();
  await page.getByRole("dialog", { name: "Tiri e risultati", exact: true }).waitFor();
  check(
    (await dialogText()).includes("Livia · Tiro salvezza contro la morte"),
    "death save missing from Tiri e risultati",
  );
  await page.screenshot({ path: dir + "conditions-c-requests.png" });
  await button("Risolvi tiro").click();
  await page.getByRole("dialog", { name: "Risolvi tiro", exact: true }).waitFor();
  check((await dialogText()).includes("CD 10"), "death save rule missing");
  await page.locator("[name=diceMode]").selectOption("physical");
  await page.locator("[name=face0]").fill("12");
  await button("Registra tiro").click();
  await __settleDice(page);
  data = await saved();
  check(
    data.actors.livia.deathSaves.successes === 1 && data.actors.livia.deathSaves.failures === 0,
    "physical 12 not one success",
  );
  await button("Torna al gioco").click();
  check(
    // Refreshed by the hand-off writer (29/09/2026): the summary's death box shows pips named
    // «Successi 1/3» for assistive technology (D&D Beyond death-save box), not as text.
    (await summary("livia").locator('[aria-label="Successi 1/3"]').count()) === 1,
    "summary does not show 1 success",
  );
  passed.push(
    "turn start queues one death save in Tiri e risultati (header Richieste); physical face 12 = 1 success",
  );
  // Next round: digital die, consequence checked against the face actually rolled.
  await role("dm");
  await endTurnsUntil("livia");
  check(
    (await deathRequests("livia")).length === 2,
    "second turn start did not queue a new death save",
  );
  await role("player");
  await page.locator(".service-nav [data-service=requests]").click();
  await page.locator("#dialog [data-notifications-requests]").click();
  await button("Risolvi tiro").click();
  await page.locator("[name=diceMode]").selectOption("digital");
  await button("Registra tiro").click();
  await __settleDice(page);
  data = await saved();
  const face = (await deathRequests("livia")).at(-1).requests[0].acceptedValues[0];
  const ds = data.actors.livia.deathSaves;
  const expected =
    face === 20
      ? data.actors.livia.hp === 1
      : face === 1
        ? ds.failures === 2 && ds.successes === 1
        : face >= 10
          ? ds.successes === 2
          : ds.failures === 1 && ds.successes === 1;
  check(
    Number.isInteger(face) && expected,
    "digital face " + face + " gave " + JSON.stringify(ds) + " hp " + data.actors.livia.hp,
  );
  check((await dialogText()).includes(String(face)), "digital face not visible in the result");
  await button("Torna al gioco").click();
  passed.push(
    "digital death save: face " +
      face +
      " → " +
      JSON.stringify(ds) +
      (face === 20 ? " and 1 HP" : ""),
  );
  if (data.actors.livia.hp > 0) {
    notes.push("natural 20 on the digital die: DM drops Livia to 0 again before the aid");
    await role("dm");
    await vitality("livia", "damage", 1, "Nuovo colpo");
    await role("player");
  }
  // Mira's turn: Medicine aid on Livia through the panel and the same request queue.
  await role("dm");
  await endTurnsUntil("mira");
  await role("player");
  await openPanel("livia");
  await page.locator("[data-conditions-command=aid]").click();
  await field("target").selectOption("livia");
  await field("helper").selectOption("mira");
  await page.locator("[data-conditions-preview]").click();
  const aid = await dialogText();
  check(aid.includes("CD 10"), "aid preview lacks DC");
  await page.screenshot({ path: dir + "conditions-c-aid-preview.png" });
  await page.locator("[data-conditions-apply]").click();
  await page.getByRole("dialog", { name: "Risolvi tiro", exact: true }).waitFor();
  await page.locator("[name=diceMode]").selectOption("physical");
  await page.locator("[name=face0]").fill("15");
  await button("Registra tiro").click();
  await __settleDice(page);
  data = await saved();
  check(
    data.actors.livia.hp === 0 &&
      data.actors.livia.deathSaves.stable === true &&
      ids(data.actors.livia).includes("unconscious"),
    "Medicine 15 did not stabilize: " + JSON.stringify(data.actors.livia.deathSaves),
  );
  check(data.actors.mira.action === false, "Help did not spend Mira action");
  await button("Torna al gioco").click();
  await page.locator("[data-select=livia]").click();
  check((await summary("livia").innerText()).includes("Stabile"), "summary not Stabile");
  await page.screenshot({ path: dir + "conditions-c-stable.png" });
  passed.push(
    "Mira Help: Medicine physical 15 → Livia Stable at 0 HP, still Unconscious, Mira action spent",
  );
  // Healing ends the 0-HP Unconscious cause; Prone remains.
  await vitality("livia", "heal", 5, "Pozione di guarigione");
  data = await saved();
  check(
    data.actors.livia.hp === 5 &&
      !ids(data.actors.livia).includes("unconscious") &&
      ids(data.actors.livia).includes("prone"),
    "healing did not end Unconscious only",
  );
  check(
    (await summary("livia").innerText()).includes("Cosciente"),
    "summary not Cosciente after healing",
  );
  passed.push("heal 5: HP 0 → 5, Unconscious ended, Prone remains, Cosciente");
  // Doran: 0 HP, natural 1 at his turn start, then damage at 0 HP = third failure.
  await role("dm");
  await vitality("doran", "damage", data.actors.doran.hp, "Dardo avvelenato");
  await endTurnsUntil("doran");
  check((await deathRequests("doran")).length === 1, "Doran death save not queued");
  await page.locator(".service-nav [data-service=requests]").click();
  await page.locator("#dialog [data-notifications-requests]").click();
  await page
    .locator(".roll-request")
    .filter({ hasText: "Doran" })
    .getByRole("button", { name: "Risolvi tiro", exact: true })
    .click();
  await page.locator("[name=diceMode]").selectOption("physical");
  await page.locator("[name=face0]").fill("1");
  await button("Registra tiro").click();
  await __settleDice(page);
  data = await saved();
  check(data.actors.doran.deathSaves.failures === 2, "natural 1 did not add two failures");
  await button("Torna al gioco").click();
  await vitality("doran", "damage", 2, "Colpo mentre è a terra");
  data = await saved();
  check(data.actors.doran.dead === true, "third failure from damage at 0 HP did not kill");
  const dead = await page
    .locator("#battle-map [data-actor=doran] [data-token-status]")
    .getAttribute("data-token-status");
  check(dead === "dead", "token not dead: " + dead);
  await openPanel("doran");
  // P3 PG-22: healing lives in the HP widget; a dead creature's «Cura» is refused there.
  await page.locator("[data-conditions-command=hp]").click();
  await page.locator("#dialog [data-dt-amount]").fill("5");
  const hpBeforeHeal = (await saved()).actors.doran.hp;
  const heal = page.locator("#dialog [data-dt-heal]");
  if (!(await heal.isDisabled())) await heal.click();
  await page.waitForTimeout(200);
  check(
    (await saved()).actors.doran.hp === hpBeforeHeal,
    "ordinary healing applied to a dead creature",
  );
  await page.screenshot({ path: dir + "conditions-c-dead-panel.png" });
  await closeDialog();
  passed.push(
    "Doran: physical 1 = 2 failures, damage at 0 HP = third, Morto on token; Cura disabled with reason",
  );
  // Reload keeps vitality and the requests history.
  await page.reload();
  await role("dm");
  data = await saved();
  check(data.actors.livia.hp === 5 && data.actors.doran.dead === true, "reload lost vitality");
  check(
    (await page.locator("#battle-map [data-actor=doran] [data-token-status=dead]").count()) === 1,
    "dead token lost on reload",
  );
  await page.goto("http://127.0.0.1:8879/#characters?id=doran");
  await page.locator("#content [data-conditions-summary=doran] [data-vital=dead]").waitFor();
  await page.screenshot({ path: dir + "conditions-c-dead-sheet.png" });
  await page.goto("http://127.0.0.1:8879/#table");
  await role("player");
  await page.locator("[data-select=livia]").click();
  // Visual pass 2 (30/09/2026): the Table's Creature tab embeds the summary without its HP
  // line; the hotbar's HP button names the HP (as in forms-journey). The summary still shows
  // Livia's state and her Prone chip.
  check(
    /Punti ferita 5 su 22\b/.test(
      await page.locator(".table-hotbar .hotbar-hp").getAttribute("aria-label"),
    ),
    "player HP after reload wrong",
  );
  check(
    /Cosciente/.test(await summary("livia").innerText()) &&
      (await summary("livia").locator("[data-conditions-chip=prone]").count()) === 1,
    "player summary after reload wrong",
  );
  passed.push("reload: Livia 5 HP Prone, Doran dead on token and sheet");
  check(errors.length === 0, "Page errors: " + errors.join("; "));
  return { passed, notes, errors };
};
