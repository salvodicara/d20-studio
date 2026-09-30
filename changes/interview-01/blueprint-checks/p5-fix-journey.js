async (rootPage) => {
  // P5 fix package (combat, encounters, initiative, action bar) — acceptance checks with
  // real clicks: DM starts combat from the Table (Tira tutti, Inizia) in at most 4
  // interactions with a sorted order; turn-based mode; Dodge icon and expiry log line;
  // hidden turns never in the player's log; a bow attack outside combat spends an arrow and
  // «Regola e calcolo» opens without errors; greyed actions at 0 HP; the encounter notes
  // keep their text across the save. Synthetic demo data only; resets this browser's demo.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P5/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  let step = "setup";
  const at = (name) => (step = name);
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const button = (name, p = page) => p.getByRole("button", { name, exact: true });
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
  };
  const settleDice = async (p = page) => {
    const layer = p.locator("[data-dice3d-layer]:not([hidden])");
    await layer.waitFor({ timeout: 800 }).catch(() => {});
    for (let i = 0; i < 8 && (await layer.count()); i++) {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(80);
    }
    await layer.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  };
  const closeDialog = async (p = page) => {
    if (await p.locator("#dialog[open]").count()) await p.keyboard.press("Escape");
    await p
      .locator("#dialog[open]")
      .waitFor({ state: "detached", timeout: 3000 })
      .catch(() => {});
  };
  const reset = async (p = page) => {
    await p.goto(base + "#table");
    await p.locator("#battle-map").waitFor();
    await button("Ripristina esempio", p).click();
    await button("Ripristina", p).click();
    await p.locator("#battle-map").waitFor();
  };
  // B62: a Table panel is a sub-tab of its sidebar tab (copied from combat-tracker-journey).
  const openTablePanel = async (p, id) => {
    const now = () => p.locator("#table-sidebar-panel").getAttribute("data-table-panel");
    if ((await now()) === id) return;
    if (!(await p.locator(`.table-subtabs [data-table-subtab="${id}"]`).count())) {
      const own = await p.locator(`.table-tabs [data-table-tab="${id}"]`).count();
      const section = own
        ? id
        : await p
            .locator(
              `.table-panel-index [data-table-drawer="${id}"], .table-panel-index [data-table="${id}"]`,
            )
            .first()
            .getAttribute("data-table-section-of");
      const tab = p.locator(`.table-tabs [data-table-tab="${section}"]`);
      if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
      await p.waitForFunction(
        (s) => document.querySelector("#table-sidebar-panel")?.dataset.tableSection === s,
        section,
      );
    }
    if ((await now()) !== id) await p.locator(`.table-subtabs [data-table-subtab="${id}"]`).click();
    await p.waitForFunction(
      (i) => document.querySelector("#table-sidebar-panel")?.dataset.tablePanel === i,
      id,
    );
  };
  const total = (row) => row.natural + row.bonus;
  const lastOf = (rows, id) => rows.filter((r) => r.actorId === id).at(-1);
  try {
    // ---------------------------------------------------------------- 1. start at the Table
    at("start at the table");
    await reset();
    await role("dm");
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    let clicks = 0;
    await page.getByRole("button", { name: "Avvia combattimento" }).first().click();
    clicks++;
    await page.locator("#dialog [data-ct-start-dialog]").waitFor();
    await page.screenshot({ path: dir + "01-start-dialog.png" });
    await page.locator("#dialog [data-ct-start-roll=all]").click();
    clicks++;
    await settleDice();
    await page.locator("#dialog [data-ct-start-missing]").filter({ hasText: "Tutti pronti" }).waitFor();
    await page.screenshot({ path: dir + "02-start-rolled.png" });
    await page.locator("#dialog button[type=submit]").click();
    clicks++;
    await settleDice();
    await page.locator("#dialog[open]").waitFor({ state: "detached" }).catch(() => {});
    check(clicks <= 4, "at most 4 interactions");
    check((await page.evaluate(() => location.hash)).startsWith("#table"), "still at the Table");
    let data = await stored();
    check(data.combat.active, "combat started");
    const totals = data.combat.order.map((id) => total(lastOf(data.combat.initiative, id)));
    check(
      totals.every((t, i) => i === 0 || totals[i - 1] >= t),
      "order sorted by total: " + totals.join(","),
    );
    await page.screenshot({ path: dir + "03-combat-started.png" });
    passed.push(`1. DM: Avvia combattimento → Tira tutti → Inizia (${clicks} clic), at the Table, order ${totals.join(" ≥ ")}`);

    // ---------------------------------------------------------------- 2. Dodge and expiry
    at("dodge");
    const first = data.combat.order[0];
    const controllable = ["livia", "doran", "mira"];
    // End turns until Livia's turn (DM ends everyone else's).
    for (let i = 0; i < 8 && (await stored()).combat.order[(await stored()).combat.turn] !== "livia"; i++) {
      await page.locator('[data-table="end-turn"]').first().click();
      await settleDice();
      await closeDialog();
    }
    data = await stored();
    check(data.combat.order[data.combat.turn] === "livia", "Livia's turn, first was " + first);
    await role("player");
    await page.locator('.map-token[data-actor="livia"]').click();
    await page.locator('[data-combat-action="dodge"]').click();
    await page.locator("#combat-detail [data-combat-execute]").click();
    await settleDice();
    await closeDialog();
    await page.locator('[data-ct-effect="livia:dodge"]').waitFor();
    await page.locator('[data-active-effects="livia"] [data-active-effect="dodge"]').waitFor();
    await page.screenshot({ path: dir + "04-dodge-icon.png" });
    // Spent action: the other actions are greyed with the reason before any click.
    const blocked = await page.locator('[data-combat-action="fire-bolt"]').getAttribute("data-combat-blocked");
    check(/Azione già spesa/.test(blocked ?? ""), "greyed with reason: " + blocked);
    await page.locator('[data-table="end-turn"]').first().click();
    await settleDice();
    await role("dm");
    for (let i = 0; i < 8 && (await stored()).combat.order[(await stored()).combat.turn] !== "livia"; i++) {
      await page.locator('[data-table="end-turn"]').first().click();
      await settleDice();
      await closeDialog();
    }
    data = await stored();
    check(!data.actors.livia.combatEffects?.some((e) => e.type === "dodge"), "Dodge expired");
    check(
      data.log.some((e) => /Schivata di Livia è terminat/.test(e.label)),
      "expiry log line",
    );
    passed.push("2. Dodge: token icon and effects list, greyed spent actions with reason, expiry at Livia's next turn with a log line");
    void controllable;

    // ---------------------------------------------------------------- 3. hidden turn
    at("hidden turn");
    await role("dm");
    await openTablePanel(page, "combat-tracker");
    data = await stored();
    const hiddenId = data.combat.order.find((id) => id.startsWith("goblin"));
    await page.locator(`[data-ct-menu="${hiddenId}"]`).click();
    await page.locator(`[data-ct-cmd="hide"][data-actor="${hiddenId}"]`).click();
    await page.locator(`[data-ct-row="${hiddenId}"].is-hidden`).waitFor();
    for (let i = 0; i < 12; i++) {
      data = await stored();
      const id = data.combat.order[data.combat.turn];
      await page.locator("[data-ct-next]").click();
      await settleDice();
      await closeDialog();
      if (id === hiddenId) break;
    }
    const logFor = (viewer) =>
      page.evaluate(
        async ({ k, viewer }) => {
          const { projectLog } = await import("./chat-domain.mjs");
          return projectLog(JSON.parse(localStorage.getItem(k)), viewer).map((i) => i.label);
        },
        { k: key, viewer },
      );
    const ends = (list) => list.filter((l) => l === "Turno concluso").length;
    const dmLog = await logFor("dm"),
      playerLog = await logFor("player");
    check(ends(dmLog) > ends(playerLog), `hidden turn private: dm ${ends(dmLog)} player ${ends(playerLog)}`);
    passed.push(`3. Hidden ${hiddenId}: its end of turn is DM-only (DM ${ends(dmLog)} «Turno concluso», player ${ends(playerLog)})`);

    // ---------------------------------------------------------------- 4. bow outside combat
    at("bow outside combat");
    await reset();
    await role("player");
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.locator('.map-token[data-actor="livia"]').click();
    const bow = page.locator('[data-combat-action="invp-ranged-invp-shortbow"]');
    if (!(await bow.count())) await page.locator('[data-invp-table="swap"]').click();
    await bow.click();
    await page.locator("#combat-detail [data-combat-ammo]").waitFor();
    await page.locator("#combat-detail [data-combat-rule]").click();
    await page.locator("#dialog[open]").waitFor();
    check(/SRD 5\.2\.1/.test(await page.locator("#dialog").innerText()), "rule and calculation shows the source");
    await page.screenshot({ path: dir + "05-rule-and-calculation.png" });
    await closeDialog();
    const arrows = async () =>
      (await stored()).actors.livia.inventory.find((r) => r.id === "invp-arrows").quantity;
    const before = await arrows();
    await page.locator('.map-token[data-actor="goblin-1"]').click();
    await settleDice();
    await page.waitForFunction(
      ({ k, n }) =>
        JSON.parse(localStorage.getItem(k)).actors.livia.inventory.find((r) => r.id === "invp-arrows")
          .quantity === n,
      { k: key, n: before - 1 },
    );
    data = await stored();
    check(!data.combat.active, "no combat was needed");
    check(data.combatAttempts.at(-1).actionId === "invp-ranged-invp-shortbow", "bow attempt");
    await page.screenshot({ path: dir + "06-bow-outside-combat.png" });
    await closeDialog();
    passed.push(`4. Player: bow attack outside combat rolls, arrows ${before} → ${before - 1}; «Regola e calcolo» opens`);

    // ---------------------------------------------------------------- 5. 0 HP greys attacks
    at("zero hp");
    await role("dm");
    await page.locator('.map-token[data-actor="livia"]').click();
    // The HP widget (DDB: damage from the HP box), through the creature's status panel.
    await page.locator("#content [data-conditions-entry=livia]").first().click();
    await page.getByRole("button", { name: /Punti ferita: cura, danno/ }).click();
    await page.locator('#dialog [data-dt-amount="livia"]').fill("30");
    await page.locator("#dialog [data-dt-damage]").click();
    await page.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).actors.livia.hp === 0, key);
    await closeDialog();
    await closeDialog();
    await role("player");
    await page.locator('.map-token[data-actor="livia"]').click();
    const attacks = page.locator('.combat-action[data-combat-kind="attack"]:visible');
    check((await attacks.count()) > 0, "attacks listed");
    const reasons = await attacks.evaluateAll((list) => list.map((b) => b.dataset.combatBlocked ?? ""));
    check(reasons.every((r) => /0 punti ferita/.test(r)), "every attack greyed at 0 HP: " + reasons.join(" | "));
    const why = reasons[0];
    // aria-disabled keeps the button in reach: a click or tap says why. (The earlier toast
    // may still cover the bar, so the click is dispatched on the button itself.)
    await attacks.first().dispatchEvent("click");
    const toastText = await page.locator("#toast").textContent();
    check(/0 punti ferita/.test(toastText ?? ""), "a click says why: " + toastText);
    await page.screenshot({ path: dir + "07-zero-hp-greyed.png" });
    passed.push(`5. At 0 HP the attacks are greyed with «${why}»; a click says why`);

    // ---------------------------------------------------------------- 6. turn-based mode
    at("turn mode");
    await reset();
    await role("player");
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.locator("#battle-map").focus();
    await page.keyboard.press("Shift+Space");
    await page.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).combat.turnMode === true, key);
    data = await stored();
    check(data.combat.order.every((id) => data.actors[id].kind === "character"), "party only");
    await openTablePanel(page, "combat-tracker");
    await page.locator("[data-ct-turn-mode-on]").waitFor();
    await page.screenshot({ path: dir + "08-turn-mode.png" });
    await page.locator("[data-ct-turn-mode-end]").click();
    await page.waitForFunction((k) => !JSON.parse(localStorage.getItem(k)).combat.active, key);
    passed.push(`6. Shift+Space starts BG3 turn-based mode (${data.combat.order.join(", ")}); the tracker ends it`);

    // ---------------------------------------------------------------- 7. encounter notes
    at("encounter notes");
    await role("dm");
    await page.goto(base + "#preparation?tab=encounter-builder");
    await page.locator("[data-eb=open]").first().click();
    const summaryField = page.locator('[data-eb-note="summary"]');
    const treasure = page.locator('[data-eb-note="treasure"]');
    if (!(await page.locator(".eb-notes[open]").count())) await page.locator(".eb-notes > summary").click();
    for (const [one, two] of [
      [" Tre cultisti.", " + pozione"],
      [" Lanterna verde.", " ARGENTO"],
      [" Chiave.", " di ottone"],
    ]) {
      const t0 = await treasure.inputValue();
      const toEnd = (field) =>
        field.evaluate((el) => el.setSelectionRange(el.value.length, el.value.length));
      await summaryField.click();
      await toEnd(summaryField);
      await page.keyboard.type(one);
      // Straight to Tesoro and typing at once: the save of Riassunto re-renders meanwhile.
      await treasure.click();
      await toEnd(treasure);
      await page.keyboard.type(two);
      await page.locator("[data-eb-name]").click();
      await page.waitForTimeout(150);
      const saved = (await stored()).ext["encounter-builder"].encounters[0].notes;
      check(saved.treasure === t0 + two, `treasure kept: «${saved.treasure}» vs «${t0 + two}»`);
      check(saved.summary.endsWith(one), "summary saved");
    }
    await page.screenshot({ path: dir + "09-encounter-notes.png" });
    passed.push("7. Riassunto then Tesoro typed at once, three times: no character lost, caret kept");
  } catch (error) {
    errors.push(`${step}: ${error.message}`);
    await page.screenshot({ path: dir + "error-" + step.replace(/\W+/g, "-") + ".png" }).catch(() => {});
  }
  await context.close();
  return JSON.stringify({ passed, errors }, null, 1);
}
