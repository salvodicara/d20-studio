async (rootPage) => {
  // B62: a Table panel is a sub-tab of its sidebar tab (Foundry's document tabs): open that
  // tab (its own, or the one its hidden handle names), then the sub-tab. No-op when open.
  const openTablePanel = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const now = () => page.locator("#table-sidebar-panel").getAttribute("data-table-panel");
    if ((await now()) === id) return;
    if (!(await page.locator(`.table-subtabs [data-table-subtab="${id}"]`).count())) {
      const own = await page.locator(`.table-tabs [data-table-tab="${id}"]`).count();
      const section = own
        ? id
        : await page
            .locator(
              `.table-panel-index [data-table-drawer="${id}"], .table-panel-index [data-table="${id}"]`,
            )
            .first()
            .getAttribute("data-table-section-of");
      const tab = page.locator(`.table-tabs [data-table-tab="${section}"]`);
      if ((await tab.getAttribute("aria-selected")) !== "true") await press(tab);
      await page.waitForFunction(
        (s) => document.querySelector("#table-sidebar-panel")?.dataset.tableSection === s,
        section,
      );
    }
    if ((await now()) !== id)
      await press(page.locator(`.table-subtabs [data-table-subtab="${id}"]`));
    await page.waitForFunction(
      (i) => document.querySelector("#table-sidebar-panel")?.dataset.tablePanel === i,
      id,
    );
  };
  // B34 dice tray — independent review fixes (reviewer-fixer), real clicks and keys:
  // (P1-1) a personal sheet's roll (Iria) is never announced to the DM, not even its name;
  // (P1-2) the DM's reveal list names only characters a player plays;
  // (P2-3) saves add the first class's proficiency: the tray and the sheet (B37) agree;
  // (P2-4) a Heroic Inspiration reroll of the DM's creature stays private in the log;
  // (P2-6) physical dice for rolls in place (tray, sheet «Tiri»), remembered, keyboard;
  // (P2-7) closing a request withdraws it from «Tiri e risultati»; reopening restores it;
  // (P3-8) «Sempre con vantaggio»; (P3-9) the Roll menu decides one roll only;
  // (P3-10) aria-expanded on «…»; (P2-12) Restrained gives Disadvantage on Dex saves;
  // EN phone 390: the physical dialog fits.
  // Resets this browser's synthetic demo state (fresh contexts).
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B34-rf/";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const slice = async (p = page) => (await stored(p)).ext["dice-tray"];
  const shot = (name, p = page) => p.screenshot({ path: shots + name, fullPage: false });
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForTimeout(150);
  };
  const openTray = async (p = page) => {
    if (!(await p.locator("[data-dtray]").count()))
      await p.locator('.action-dock [data-table="dice"]').click();
    await p.locator("[data-dtray]").waitFor();
  };
  const section = async (name, p = page) => {
    const tab = p.locator(`[data-dtray-section="${name}"]`);
    if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
    await p.locator(`[data-dtray-section="${name}"][aria-selected="true"]`).waitFor();
  };
  const seg = (name, value, p = page) =>
    p.locator(`label.dtray-seg:has([data-dtray-${name}][value="${value}"])`);
  const waitRolls = (n, p = page) =>
    p.waitForFunction(
      ([k, count]) => JSON.parse(localStorage.getItem(k)).ext["dice-tray"].rolls.length >= count,
      [key, n],
    );
  const skipDice = async (p = page) => {
    for (let i = 0; i < 3 && (await p.locator("[data-dice3d-layer]:not([hidden])").count()); i++) {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(120);
    }
  };
  const dismissTips = async (p = page) => {
    for (let i = 0; i < 3; i++) {
      const tip = p.getByRole("button", { name: /^(Ho capito|Got it)$/ }).first();
      if (!(await tip.isVisible().catch(() => false))) return;
      await tip.click();
      await p.waitForTimeout(100);
    }
  };
  const number = (kind, id, p = page) =>
    p.locator(
      `[data-dtray] [data-dtray-roll][data-kind="${kind}"][data-${kind === "skill" ? "skill" : "ability"}="${id}"]`,
    );
  const numberText = async (kind, id, actor = "livia", p = page) =>
    (
      await p
        .locator(
          `[data-dtray-roll][data-actor="${actor}"][data-kind="${kind}"][data-${kind === "skill" ? "skill" : "ability"}="${id}"] strong`,
        )
        .first()
        .textContent()
    ).trim();

  try {
    await page.goto(base + "#table");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    await dismissTips();
    let state = await stored();
    check(state.actors.iria?.visibility === "private", "Iria is not a personal sheet here");

    // (P1-1) a personal sheet's roll is never announced to the DM
    await openTray();
    await page.locator("[data-dtray-actor]").selectOption("iria");
    await page.locator("[data-dtray-roll-button]").click();
    await waitRolls(1);
    await skipDice();
    const iriaRoll = (await slice()).rolls.at(-1);
    check(
      iriaRoll.actorId === "iria" && iriaRoll.audience === "self" && !iriaRoll.announced,
      "Iria's roll was announced: " + JSON.stringify(iriaRoll).slice(0, 160),
    );
    state = await stored();
    check(state.log.at(-1).visibility === "private", "Iria's roll left a shared log line");
    await role("dm");
    await openTray();
    check(
      !(await page.locator("[data-dtray]").textContent()).includes("Iria"),
      "the DM's tray names the personal sheet",
    );
    check(
      !state.log.some((e) => e.visibility !== "private" && /Iria/.test(e.label ?? "")),
      "a shared log line names Iria",
    );
    passed.push(
      "(P1-1) Iria (personal sheet) rolls «Solo io» without announcement: private log line, the DM's tray and the shared log never name her",
    );

    // (P1-2) reveal list; (P3-10) aria-expanded on the Roll button's «…»
    await page.locator("[data-dtray-actor]").selectOption("");
    await seg("audience", "self").click();
    await page.locator("[data-dtray-roll-button]").click();
    await waitRolls(2);
    await skipDice();
    const hidden = (await slice()).rolls.at(-1);
    const options = await page
      .locator(`[data-dtray-reveal-target="${hidden.id}"] option`)
      .evaluateAll((list) => list.map((o) => o.value));
    check(
      JSON.stringify(options) === JSON.stringify(["all", "livia", "mira"]),
      "reveal options: " + options.join(","),
    );
    passed.push("(P1-2) DM reveal list: «A tutti», Livia, Mira (no Doran, no Iria)");

    const more = page.locator(".dtray-roll-row [data-dtray-more]");
    check((await more.getAttribute("aria-expanded")) === "false", "«…» has no aria-expanded");
    await more.click();
    await page.locator(".dtray-menu").waitFor();
    check((await more.getAttribute("aria-expanded")) === "true", "«…» not expanded when open");
    await page.keyboard.press("Escape");
    check((await more.getAttribute("aria-expanded")) === "false", "«…» still expanded");
    passed.push("(P3-10) the Roll «…» button reports aria-expanded true/false");

    // (P3-9) the Roll menu decides one roll only (the DM's default stays «Tutti»)
    await seg("audience", "public").click();
    await page.locator("[data-dtray-formula]").fill("1d20+1");
    await page.locator("[data-dtray-formula]").press("Tab");
    await more.click();
    await page.locator(".dtray-menu").getByRole("menuitem", { name: "Solo DM" }).click();
    await waitRolls(3);
    await skipDice();
    check((await slice()).rolls.at(-1).audience === "self", "the menu audience was not applied");
    check(
      await page.locator('[data-dtray-audience][value="public"]').isChecked(),
      "the menu changed the form's audience for later rolls",
    );
    await page.locator("[data-dtray-roll-button]").click();
    await waitRolls(4);
    await skipDice();
    check(
      (await slice()).rolls.at(-1).audience === "public",
      "the next roll kept the menu's audience",
    );
    passed.push(
      "(P3-9) the Roll menu's «Solo DM» applies to that roll only; the next roll is public",
    );

    // (P2-3) saves with class proficiency: tray numbers and the sheet (B37) agree
    await page.locator("[data-dtray-actor]").selectOption("doran");
    await page.waitForTimeout(100);
    check((await numberText("save", "con", "doran")) === "+4", "Doran's CON save is not +4");
    check((await numberText("save", "str", "doran")) === "+2", "Doran's STR save is not +2");
    const agree = await page.evaluate(async () => {
      const tray = await import("/dice-tray-domain.mjs");
      let sheet = null;
      try {
        sheet = await import("/sheet-plus-domain.mjs");
      } catch {
        return { skipped: true, diffs: [] };
      }
      const s = JSON.parse(localStorage.getItem("d20-studio-blueprint-v1"));
      const diffs = [];
      for (const id of ["livia", "doran", "mira"])
        for (const ability of tray.ABILITIES) {
          const a = tray.testModifier(s, id, { kind: "save", ability }).modifier;
          const b = sheet.statValue(s, id, "save:" + ability).total;
          if (a !== b) diffs.push(`${id} save ${ability}: tray ${a}, sheet ${b}`);
        }
      return { skipped: false, diffs };
    });
    check(!agree.diffs.length, "tray and sheet disagree: " + agree.diffs.join("; "));
    await role("player");
    // Refreshed by the round-2 regression (29/09/2026): P3 PG-23 (one roll engine) moved the
    // saves out of the sheet's «Tiri» box into the sheet's own save list, and P2 PG-25 attuned
    // Livia's Cloak of Protection (+1 to saving throws): her INT save is 3 + 2 (Wizard
    // proficiency) + 1 = +6, her Dex save +3 and her WIS save +4 on every surface.
    await page.goto(base + "#characters?id=livia");
    const intSave = page.locator('[data-shp="roll"][data-kind="save"][data-subject="int"]');
    await intSave.waitFor();
    check(
      (await intSave.innerText()).trim() === "+6",
      "the sheet shows Livia's INT save without proficiency or cloak: " +
        (await intSave.innerText()),
    );
    await intSave.scrollIntoViewIfNeeded();
    await shot("r03-sheet-saves-with-proficiency-it-1440.png");
    passed.push(
      "(P2-3) saves add the first class's proficiency (Livia INT +6 with the cloak, Doran CON +4, STR +2); tray = sheet (B37) for every save of Livia, Doran, Mira",
    );

    // (P2-6) physical dice for rolls in place, from the sheet (remembered choice) and the tray
    await page.goto(base + "#table");
    await openTray();
    await page.locator("[data-dtray-actor]").selectOption("livia");
    await seg("mode", "physical").click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["core-settings"].personal.player[
          "dice-tray.dice"
        ] === "physical",
      key,
    );
    const before6 = (await slice()).rolls.length;
    await number("save", "dex").click();
    await page.locator('#dialog [name="face-0"]').waitFor();
    check(
      (await page.locator("#dialog-title").textContent()) === "Facce del dado fisico",
      "no physical faces dialog",
    );
    check((await slice()).rolls.length === before6, "rolled before the faces");
    check(
      await page.locator('#dialog [name="face-0"]').evaluate((el) => el === document.activeElement),
      "the face field is not focused",
    );
    await shot("r06-physical-faces-dialog-it-1440.png");
    await page.keyboard.type("12");
    await page.keyboard.press("Enter");
    await waitRolls(before6 + 1);
    await skipDice();
    let r6 = (await slice()).rolls.at(-1);
    check(
      r6.mode === "physical" && r6.values.join() === "12" && r6.total === 15 && r6.kind === "save",
      "physical save not recorded: " + JSON.stringify(r6).slice(0, 160),
    );
    // Shift+click: advantage asks two d20s.
    await number("skill", "stealth").click({ modifiers: ["Shift"] });
    await page.locator('#dialog [name="face-1"]').waitFor();
    await page.locator('#dialog [name="face-0"]').fill("4");
    await page.locator('#dialog [name="face-1"]').fill("21");
    await page.locator("#dialog button[type=submit]").click();
    check(
      (await page.locator("#dialog[open]").count()) === 1 &&
        (await slice()).rolls.length === before6 + 1 &&
        (await page.locator('#dialog [name="face-1"]').evaluate((el) => !el.checkValidity())),
      "a face of 21 was not refused",
    );
    await page.locator('#dialog [name="face-1"]').fill("15");
    await page.locator("#dialog button[type=submit]").click();
    await waitRolls(before6 + 2);
    await skipDice();
    r6 = (await slice()).rolls.at(-1);
    check(
      r6.rollMode === "advantage" && r6.values.join() === "4,15" && r6.natural === 15,
      "physical advantage not recorded",
    );
    // The sheet follows the same remembered choice. Refreshed by the round-2 regression
    // (29/09/2026): since P3 PG-23 the sheet's WIS save rolls in the sheet's roll window, which
    // opens on «Fisici» with the face field (it had opened on «Digitali»: fixed in
    // sheet-plus.mjs, tests/r2-regression.test.mjs); the roll is kept in the sheet's rolls.
    await page.goto(base + "#characters?id=livia");
    // F10: the right-click opens the roll window (a plain click rolls at once).
    await page
      .locator('[data-shp="roll"][data-kind="save"][data-subject="wis"]')
      .click({ button: "right" });
    await page.locator('#dialog [name="face0"]').waitFor();
    check(
      await page.locator('#dialog input[name="mode"][value="physical"]').isChecked(),
      "the sheet's roll window does not open on the remembered physical dice",
    );
    const sheetRolls = async () => (await stored()).ext["sheet-plus-rolls"]?.rolls ?? [];
    const sheetBefore = (await sheetRolls()).length;
    await page.locator('#dialog [name="face0"]').fill("9");
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction(
      ([k, n]) =>
        (JSON.parse(localStorage.getItem(k)).ext["sheet-plus-rolls"]?.rolls ?? []).length > n,
      [key, sheetBefore],
    );
    const sheetRoll = (await sheetRolls()).at(-1);
    check(
      sheetRoll.mode === "physical" && sheetRoll.total === 13,
      "the sheet did not roll the physical WIS save: " + JSON.stringify(sheetRoll).slice(0, 160),
    );
    // Back to digital from «Aspetto e prova»: numbers roll at once.
    await page.goto(base + "#table");
    await openTray();
    await section("look");
    await page.locator('[data-dtray-setting="dice"]').selectOption("digital");
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["core-settings"].personal.player[
          "dice-tray.dice"
        ] === "digital",
      key,
    );
    await section("roll");
    check(
      await page.locator('[data-dtray-mode][value="digital"]').isChecked(),
      "the tray's Dadi does not follow the remembered choice",
    );
    await number("check", "str").click();
    await waitRolls(before6 + 3);
    await skipDice();
    check(!(await page.locator("#dialog[open]").count()), "digital still asked for faces");
    check((await slice()).rolls.at(-1).mode === "digital", "the digital roll is not digital");
    passed.push(
      "(P2-6) physical dice for rolls in place: tray «Fisici» remembered, a click asks the d20 face (focused, Enter records 12 + 3 = 15), Shift+click asks two faces and refuses 21, the sheet's roll window opens on «Fisici» too (9 + 4 = 13); «Digitali» in «Aspetto e prova» rolls at once again",
    );

    // (P3-8) «Sempre con vantaggio»
    await section("look");
    await page.locator('[data-dtray-setting="advantage"]').selectOption("advantage");
    await page.waitForTimeout(150);
    await section("roll");
    await number("save", "dex").click();
    // The sheet's roll above is kept in the sheet's rolls, not the tray's (round-2 regression).
    await waitRolls(before6 + 4);
    await skipDice();
    check((await slice()).rolls.at(-1).rollMode === "advantage", "«always advantage» not applied");
    await section("look");
    await page.locator('[data-dtray-setting="advantage"]').selectOption("normal");
    await page.waitForTimeout(150);
    passed.push("(P3-8) policy «Sempre con vantaggio»: a click on a number rolls with advantage");

    // (P2-4) DM reroll of Doran's request stays private; (P2-7) close/reopen through the queue
    await role("dm");
    await openTray();
    await section("requests");
    await page.locator('[data-dtray-rq="ability"]').selectOption("con");
    await page.locator('[data-dtray-rq="dc"]').fill("20");
    await page.locator('[data-dtray-rq-target][value="mira"]').uncheck();
    await page.locator("[data-dtray-request-send]").click();
    await page.locator("[data-dtray-group]").first().waitFor();
    state = await stored();
    const conGroup = state.combatAttempts.filter((a) => a.kind === "roll-request").at(-1)
      .rollRequest.groupId;
    const doranReq = state.combatAttempts.find(
      (a) => a.rollRequest?.groupId === conGroup && a.actorId === "doran",
    );
    check(doranReq.requests[0].modifier === 4, "Doran's CON save request is not +4");
    await page.locator(`[data-dtray-answer="${doranReq.requests[0].id}"]`).click();
    await page.waitForTimeout(150);
    await skipDice();
    await page.locator('[data-dtray-inspiration-wrap="party-doran"] input').check({ force: true });
    await page.locator(`[data-dtray-request-reroll="${doranReq.requests[0].id}"]`).click();
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction(
      (k) => /Ispirazione eroica spesa/.test(JSON.parse(localStorage.getItem(k)).log.at(-1).label),
      key,
    );
    await skipDice();
    state = await stored();
    check(state.log.at(-1).visibility === "private", "Doran's reroll is in the shared log");
    passed.push(
      "(P2-4) the DM's Heroic Inspiration reroll of Doran's CON save (+4) is a private log line",
    );

    await page.locator(`[data-dtray-request-close="${conGroup}"]`).click();
    await page.waitForTimeout(150);
    await role("player");
    const requestsButton = page.locator("[data-combat-requests]");
    check(
      !/·\s*\d/.test(await requestsButton.textContent()),
      "«Tiri e risultati» still counts the closed request: " + (await requestsButton.textContent()),
    );
    await requestsButton.click();
    await page.locator("#dialog[open]").waitFor();
    const dialogText = await page.locator("#dialog").textContent();
    check(
      dialogText.includes("Non più applicabile") && !dialogText.includes("Risolvi tiro"),
      "the core dialog still asks for the closed request",
    );
    await shot("r07-closed-request-core-dialog-it-1440.png");
    await page.keyboard.press("Escape");
    await role("dm");
    await openTray();
    await section("requests");
    await page.locator("details.dtray-details summary", { hasText: "Richieste concluse" }).click();
    await page.locator(`[data-dtray-request-reopen="${conGroup}"]`).click();
    await page.waitForTimeout(150);
    await role("player");
    check(
      /·\s*1/.test(await page.locator("[data-combat-requests]").textContent()),
      "reopening did not restore Livia's pending roll",
    );
    await openTray();
    await section("requests");
    const livReq = (await stored()).combatAttempts.find(
      (a) => a.rollRequest?.groupId === conGroup && a.actorId === "livia",
    );
    await page.locator(`[data-dtray-answer="${livReq.requests[0].id}"]`).click();
    await page.waitForFunction(
      ([k, id]) =>
        JSON.parse(localStorage.getItem(k)).combatAttempts.find((a) => a.id === id).requests[0]
          .status === "resolved",
      [key, livReq.id],
    );
    await skipDice();
    passed.push(
      "(P2-7) closing the card withdraws Livia's pending roll from «Tiri e risultati» (no count, «Non più applicabile», no «Risolvi tiro»); reopening restores it and she answers",
    );

    // (P2-12) conditions: Restrained applied through the conditions panel gives
    // Disadvantage on Livia's Dexterity save in the tray and in a DM request.
    await page.goto(base + "#characters?id=livia");
    const conditions = page.locator("#content [data-conditions-summary=livia]");
    await conditions.waitFor();
    await conditions.locator("[data-conditions-entry=livia]").click();
    await page.locator("[data-conditions-command=add]").click();
    await page.locator("#dialog [data-conditions-field=search]").pressSequentially("Tratt");
    await page.locator("[data-conditions-definition=restrained]").click();
    await page.locator("[data-conditions-preview]").click();
    await page.locator("[data-conditions-apply]").click();
    await page.waitForFunction(
      (k) =>
        (JSON.parse(localStorage.getItem(k)).actors.livia.conditions ?? []).some(
          (c) => (typeof c === "string" ? c : c.id) === "restrained",
        ),
      key,
    );
    if (await page.locator("#dialog[open]").count()) await page.keyboard.press("Escape");
    await page.goto(base + "#table");
    await openTray();
    await section("roll");
    await page.locator("[data-dtray-actor]").selectOption("livia");
    const before12 = (await slice()).rolls.length;
    await number("save", "dex").click();
    await waitRolls(before12 + 1);
    await skipDice();
    const r12 = (await slice()).rolls.at(-1);
    check(
      r12.rollMode === "disadvantage" &&
        r12.values.length === 2 &&
        r12.conditionReasons?.disadvantage?.[0]?.conditionId === "restrained",
      "Restrained did not give Disadvantage: " + JSON.stringify(r12).slice(0, 200),
    );
    check(
      (await page.locator("[data-dtray-result] .dtray-meta").textContent()).includes(
        "svantaggio (Trattenuto)",
      ),
      "the result does not name Trattenuto",
    );
    await page.locator("[data-dtray-result]").scrollIntoViewIfNeeded();
    await shot("r09-restrained-dex-save-disadvantage-it-1440.png");
    await role("dm");
    await openTray();
    await section("requests");
    await page.locator('[data-dtray-rq="ability"]').selectOption("dex");
    await page.locator('[data-dtray-rq="dc"]').fill("12");
    for (const id of ["doran", "mira"])
      if (await page.locator(`[data-dtray-rq-target][value="${id}"]`).isChecked())
        await page.locator(`[data-dtray-rq-target][value="${id}"]`).uncheck();
    await page.locator('[data-dtray-rq-target][value="livia"]').check();
    await page.locator("[data-dtray-request-send]").click();
    await page.waitForTimeout(150);
    state = await stored();
    const restrainedReq = state.combatAttempts.filter((a) => a.kind === "roll-request").at(-1);
    check(
      restrainedReq.requests[0].rollMode === "disadvantage" &&
        restrainedReq.requests[0].dice[0].count === 2,
      "the DM request ignores Restrained",
    );
    check(
      (
        await page
          .locator(`[data-dtray-request-row="${restrainedReq.requests[0].id}"]`)
          .textContent()
      ).includes("svantaggio (Trattenuto)"),
      "the request card does not name Trattenuto",
    );
    passed.push(
      "(P2-12) Restrained applied in the conditions panel: Livia's tray Dexterity save rolls two d20 with «svantaggio (Trattenuto)», and the DM's Dex save request asks two d20 with the same reason",
    );

    // EN phone 390: the physical faces dialog fits, English text.
    const phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const phone = await phoneContext.newPage();
    phone.on("pageerror", (error) => errors.push("phone: " + error.message));
    await phone.goto(base + "#table");
    await phone.evaluate(() => localStorage.clear());
    await phone.reload();
    await phone.getByRole("heading", { level: 1 }).first().waitFor();
    await phone.locator('[data-service="preferences"]').tap();
    await phone.locator("#dialog select[name=lang]").selectOption("en");
    await phone.getByRole("button", { name: "Salva preferenze", exact: true }).tap();
    await dismissTips(phone);
    await openTablePanel(phone, "dice-tray", true); // B62: Chat › Dice
    await phone.locator("[data-dtray]").waitFor();
    await seg("mode", "physical", phone).tap();
    await phone.waitForTimeout(150);
    const phoneSave = phone.locator('[data-dtray-roll][data-kind="save"][data-ability="int"]');
    await phoneSave.scrollIntoViewIfNeeded();
    await phoneSave.tap();
    await phone.locator('#dialog [name="face-0"]').waitFor();
    check(
      (await phone.locator("#dialog-title").textContent()) === "Physical die faces",
      "the faces dialog is not in English",
    );
    check(
      (await phone.locator("#dialog").textContent()).includes("Intelligence saving throw"),
      "the dialog does not name the save",
    );
    const box = await phone.locator("#dialog").boundingBox();
    check(box.x >= 0 && box.x + box.width <= 390, "the faces dialog is wider than the phone");
    await shot("r08-phone-en-physical-faces-390.png", phone);
    await phone.locator('#dialog [name="face-0"]').fill("11");
    await phone.getByRole("button", { name: "Record the roll", exact: true }).tap();
    await waitRolls(1, phone);
    const phoneRoll = (await slice(phone)).rolls.at(-1);
    check(
      phoneRoll.mode === "physical" && phoneRoll.total === 17,
      "phone physical INT save: " + JSON.stringify(phoneRoll).slice(0, 120),
    );
    check(
      await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      "phone overflow",
    );
    passed.push(
      "EN phone 390: «Physical die faces» dialog fits, names «Intelligence saving throw», 11 + 6 = 17 recorded physically, no overflow",
    );
    await phoneContext.close();
  } catch (error) {
    throw Error(`After ${passed.length} passed (${passed.at(-1) ?? "start"}): ${error.message}`);
  }
  if (errors.length) throw Error("Page errors: " + errors.join(" | "));
  return { passed, errors };
};
