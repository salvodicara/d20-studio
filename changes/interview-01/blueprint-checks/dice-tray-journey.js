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
  // B34 dice tray: the card's acceptance checks with real clicks, keys and touch.
  // (A) IT desktop 1440, player then DM: the dock's «Tira i dadi» opens the «Dadi» tab (the
  //     B56 «Prova i dadi» tab is absorbed); (1) 2d6+1d4+3 digital and physical, advantage,
  //     last rolls repeated, a wrong formula explained; (7) «Mezza copertura +2» in the stack
  //     applied to the next roll; (2) the roll menu from right click, long press and «…»;
  //     (3) a «Solo il DM» roll: the players see the announcement without the result, the DM
  //     reveals it only to Livia, then to everyone; announcement policy off; (4) Dex save DC
  //     13 requested from Livia and Doran as cards, physical and digital answers, Undo and
  //     reapply, summary, no automatic consequence; (6) Heroic Inspiration switched on in
  //     the sheet, reroll after the failure, spending recorded; (5) opposed roll; (9) a check
  //     written in a journal entry becomes a request card; (10) «Chiedi sempre il
  //     vantaggio»; (8) 2D dice only for the roller, still with reduced motion; physical
  //     correction and withdrawal with reasons; simulated connected die; reload keeps it all.
  // (B) EN phone 390 with touch: tab from the bottom bar, tap roll, touch long press menu,
  //     physical answer to a request, no page overflow.
  // Resets this browser's synthetic demo state (fresh contexts).
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B34/";
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
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForTimeout(150);
  };
  const dock = (p = page) => p.locator('.action-dock [data-table="dice"]');
  const openTray = async (p = page, tap = false) => {
    if (!(await p.locator("[data-dtray]").count())) {
      if (tap) await dock(p).tap();
      else await dock(p).click();
    }
    await p.locator("[data-dtray]").waitFor();
  };
  const section = async (name, p = page, tap = false) => {
    const tab = p.locator(`[data-dtray-section="${name}"]`);
    if ((await tab.getAttribute("aria-selected")) !== "true")
      tap ? await tab.tap() : await tab.click();
    await p.locator(`[data-dtray-section="${name}"][aria-selected="true"]`).waitFor();
  };
  const seg = (name, value, p = page) =>
    p.locator(`label.dtray-seg:has([data-dtray-${name}][value="${value}"])`);
  const rollCount = async (p = page) => (await slice(p)).rolls.length;
  const waitRolls = (n, p = page) =>
    p.waitForFunction(
      ([k, count]) => JSON.parse(localStorage.getItem(k)).ext["dice-tray"].rolls.length >= count,
      [key, n],
    );
  const skipDice = async (p = page) => {
    // B56 dice on the table never hold the page; Escape lands and closes them.
    for (let i = 0; i < 3 && (await p.locator("[data-dice3d-layer]:not([hidden])").count()); i++) {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(120);
    }
  };
  const phoneTab = async (p) => {
    await openTablePanel(p, "dice-tray", true); // B62: Chat › Dice
    await p.locator("[data-dtray]").waitFor();
  };
  // B30 tips cover part of the page in screenshots: close them («Ho capito» / «Got it»).
  const dismissTips = async (p = page) => {
    for (let i = 0; i < 3; i++) {
      const tip = p.getByRole("button", { name: /^(Ho capito|Got it)$/ }).first();
      if (!(await tip.isVisible().catch(() => false))) return;
      await tip.click();
      await p.waitForTimeout(100);
    }
  };
  const button = (name, p = page) => p.getByRole("button", { name, exact: true });
  const status = (p = page) => p.evaluate(async () => (await import("/dice-3d.mjs")).diceStatus());
  const sum = (values) => values.reduce((a, b) => a + b, 0);

  try {
    // ------------------------------------------------------------------ (A) desktop IT
    await page.goto(base + "#table");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    await dismissTips();
    check(
      (await page.locator('[data-table-drawer="dice-3d"]').count()) === 0,
      "the B56 «Prova i dadi» tab is still separate",
    );
    await dock().click();
    await page.locator("[data-dtray]").waitFor();
    check(
      (await page
        .locator('.table-subtabs [data-table-subtab="dice-tray"]')
        .getAttribute("aria-selected")) === "true",
      "«Tira i dadi» did not open the Dadi tab",
    );
    check(!(await page.locator("#dialog[open]").count()), "the old free-roll dialog opened");
    await dock().click();
    check(await page.locator("[data-dtray]").count(), "a second «Tira i dadi» closed the tray");
    passed.push(
      "Dock «Tira i dadi» opens the Dadi sidebar tab (never closes it); no free-roll dialog; B56 tab absorbed",
    );

    // (1) 2d6+1d4+3 digital
    const formula = page.locator("[data-dtray-formula]");
    await formula.fill("2d6+1d4+3");
    check(
      (await page.locator("[data-dtray-roll-text]").textContent()).includes("2d6 + 1d4 + 3"),
      "the Roll button does not name the formula",
    );
    await page.locator("[data-dtray-roll-button]").click();
    await waitRolls(1);
    let rolls = (await slice()).rolls;
    const r1 = rolls.at(-1);
    check(
      r1.expression === "2d6+1d4+3" && r1.values.length === 3 && r1.mode === "digital",
      "digital formula not recorded: " + JSON.stringify(r1).slice(0, 200),
    );
    check(r1.total === sum(r1.values) + 3, "total is not the sum of faces + 3");
    check(
      (await page.locator("[data-dtray-total]").textContent()).trim() === String(r1.total),
      "result card total differs",
    );
    let log = (await stored()).log.at(-1);
    check(
      log.label.startsWith("Livia · 2d6 + 1d4 + 3: [") && log.label.endsWith("dado digitale"),
      "log label: " + log.label,
    );
    const st1 = await status();
    check(
      st1.history.some((h) => h.views.some((v) => v.id === r1.id)) ||
        st1.current?.views?.includes(r1.id),
      "B56 did not receive roll-accepted for the tray roll",
    );
    await page.locator("[data-dtray-result]").scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await shot("01-tray-digital-roll-it-1440.png");
    await skipDice();

    // physical faces
    await seg("mode", "physical").click();
    await page.locator('[data-dtray-face="2"]').waitFor();
    check(
      (await page.locator("[data-dtray-face]").count()) === 3,
      "physical inputs are not one per die",
    );
    await page.locator('[data-dtray-face="0"]').fill("6");
    await page.locator('[data-dtray-face="1"]').fill("5");
    await page.locator('[data-dtray-face="2"]').fill("4");
    await page.locator("[data-dtray-roll-button]").click();
    await waitRolls(2);
    const r2 = (await slice()).rolls.at(-1);
    check(
      r2.mode === "physical" && JSON.stringify(r2.values) === "[6,5,4]" && r2.total === 18,
      "physical faces not recorded as typed",
    );
    await skipDice();

    // advantage
    await seg("mode", "digital").click();
    await formula.fill("1d20+5");
    await formula.press("Tab");
    await seg("rollmode", "advantage").click();
    await page.locator("[data-dtray-roll-button]").click();
    await waitRolls(3);
    const r3 = (await slice()).rolls.at(-1);
    const faces3 = r3.groups[0].faces;
    check(
      r3.expression === "2d20kh1+5" &&
        faces3.length === 2 &&
        faces3.filter((f) => f.kept).length === 1 &&
        r3.total === Math.max(...faces3.map((f) => f.value)) + 5,
      "advantage did not keep the higher d20",
    );
    await skipDice();

    // wrong formula explained, nothing recorded
    await seg("rollmode", "normal").click();
    await formula.fill("2d6+");
    await formula.press("Tab");
    const err1 = await page.locator("[data-dtray-formula-error]").textContent();
    check(
      err1.includes("Manca un dado o un numero dopo «+»"),
      "missing term not explained: " + err1,
    );
    await page.locator("[data-dtray-roll-button]").click();
    check(
      (await page.locator("[data-dtray-error]").textContent()).includes("Manca un dado"),
      "refused roll has no message",
    );
    await formula.fill("3d7");
    await formula.press("Tab");
    check(
      (await page.locator("[data-dtray-formula-error]").textContent()).includes(
        "d7 non è un dado standard",
      ),
      "non-standard die not explained",
    );
    check((await rollCount()) === 3, "a wrong formula recorded a roll");
    await page.locator("[data-dtray-formula]").scrollIntoViewIfNeeded();
    await shot("02-tray-formula-error-it-1440.png");

    // last rolls: repeat the first one
    await page.locator(`[data-dtray-again="${r1.id}"]`).click();
    await waitRolls(4);
    const r4 = (await slice()).rolls.at(-1);
    check(r4.expression === "2d6+1d4+3" && r4.id !== r1.id, "«Ripeti il tiro» did not roll again");
    check(
      (await page.locator("[data-dtray-recent]").count()) === 4,
      "the last rolls list does not show the four rolls",
    );
    await skipDice();
    passed.push(
      "(1) 2d6+1d4+3 digital (sum + 3, log line, B56 roll-accepted) and physical [6,5,4] = 18; advantage keeps the higher d20; «2d6+» and «3d7» explained, nothing recorded; «Ripeti il tiro» from the last rolls",
    );

    // correction and withdrawal with reasons
    await page.locator(`[data-dtray-correct="${r2.id}"]`).click();
    await page.locator('#dialog input[name="face-0"]').fill("3");
    await page.locator("#dialog [data-dtray-reason]").fill("letto male il primo d6");
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction(
      ([k, id]) =>
        JSON.parse(localStorage.getItem(k)).ext["dice-tray"].rolls.find((r) => r.id === id)
          .status === "corrected",
      [key, r2.id],
    );
    const corrected = (await slice()).rolls.find((r) => r.id === r2.id);
    check(
      corrected.total === 15 && JSON.stringify(corrected.corrections[0].values) === "[6,5,4]",
      "correction lost the previous faces",
    );
    await page.locator(`[data-dtray-withdraw="${r4.id}"]`).click();
    await page.locator("#dialog [data-dtray-reason]").fill("tirato per sbaglio");
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction(
      ([k, id]) =>
        JSON.parse(localStorage.getItem(k)).ext["dice-tray"].rolls.find((r) => r.id === id)
          .status === "withdrawn",
      [key, r4.id],
    );
    check(
      (await page.locator(`[data-dtray-recent="${r4.id}"]`).textContent()).includes(
        "Ritirato: tirato per sbaglio",
      ),
      "withdrawal reason not shown",
    );
    passed.push(
      "Correction of physical faces (6 → 3, reason, previous faces kept) and withdrawal with a reason",
    );

    // (7) modifier stack: «Mezza copertura +2» applied to the next roll only
    await page.locator('[data-dtray-stack-preset="half-cover"]').click();
    await page.locator("[data-dtray-unstack]").waitFor();
    check(
      (await page.locator("[data-dtray-unstack]").textContent()).includes("Mezza copertura +2"),
      "stack chip missing",
    );
    await page.locator(".dtray-stack").scrollIntoViewIfNeeded();
    await shot("03-tray-stack-cover-it-1440.png");
    const dexSave = page.locator('[data-dtray-roll][data-kind="save"][data-ability="dex"]');
    await dexSave.click();
    await waitRolls(5);
    const r5 = (await slice()).rolls.at(-1);
    check(
      r5.kind === "save" &&
        r5.stack.length === 1 &&
        r5.stack[0].value === 2 &&
        // Refreshed by the hand-off writer (29/09/2026): P2 PG-25, Livia's attuned Cloak of
        // Protection makes her Dex save +3 (the sheet's own number); the cover adds its +2.
        r5.total === r5.natural + 3 + 2,
      "cover +2 not applied to the Dex save: " + JSON.stringify(r5.stack),
    );
    check((await slice()).stacks.player.length === 0, "the stack did not empty after the roll");
    check(!(await page.locator("[data-dtray-unstack]").count()), "stack chip still shown");
    await skipDice();
    passed.push(
      "(7) «Mezza copertura +2» (SRD cover) in the stack: next Dex save = d20 + 3 (cloak) + 2, then the stack empties",
    );

    // (2) roll menu: right click, long press, «…» with the keyboard
    const menu = page.locator(".dtray-menu");
    await dexSave.click({ button: "right" });
    await menu.waitFor();
    check(
      (await menu.getByRole("menuitem").allTextContents())
        .join("|")
        .startsWith("Tira con vantaggio|Tira con svantaggio|Tira normale (un d20)"),
      "right-click menu items differ",
    );
    await shot("04-roll-menu-right-click-it-1440.png");
    await menu.getByRole("menuitem", { name: "Tira con vantaggio" }).click();
    await waitRolls(6);
    const r6 = (await slice()).rolls.at(-1);
    check(
      r6.kind === "save" && r6.rollMode === "advantage" && r6.groups[0].faces.length === 2,
      "menu advantage not applied",
    );
    await skipDice();
    const strCheck = page.locator('[data-dtray-roll][data-kind="check"][data-ability="str"]');
    await strCheck.scrollIntoViewIfNeeded();
    const box = await strCheck.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700);
    check(await menu.isVisible(), "long press did not open the menu");
    await page.mouse.up();
    check((await rollCount()) === 6, "the long press also rolled");
    await page.keyboard.press("Escape");
    check(!(await menu.count()), "Escape did not close the menu");
    const athletics = page.locator(
      '.dtray-num:has([data-dtray-roll][data-skill="athletics"]) [data-dtray-more]',
    );
    await athletics.focus();
    await page.keyboard.press("Enter");
    await menu.waitFor();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await waitRolls(7);
    const r7 = (await slice()).rolls.at(-1);
    check(
      r7.kind === "skill" && r7.skill === "athletics" && r7.rollMode === "normal",
      "keyboard menu roll wrong",
    );
    await skipDice();
    passed.push(
      "(2) roll menu on a number from right click (advantage rolled), mouse long press (no roll, Esc closes) and «…» with Enter/arrows",
    );

    // (3) audiences: a player's blind roll, the DM's hidden roll announced, reveal to Livia, to all
    await formula.fill("1d20");
    await formula.press("Tab");
    await seg("audience", "blind").click();
    await page.locator("[data-dtray-roll-button]").click();
    await waitRolls(8);
    const blind = (await slice()).rolls.at(-1);
    check(blind.audience === "blind", "blind audience not recorded");
    check(
      (await page.locator('[data-dtray-result][data-readable="false"]').textContent()).includes(
        "Tiro inviato al DM",
      ),
      "the roller sees a blind result",
    );
    check(
      !(await status()).history.some((h) => h.views.some((v) => v.id === blind.id)),
      "B56 showed the blind roll to its roller",
    );
    await seg("audience", "public").click();
    await role("dm");
    await openTray();
    await section("roll");
    check(
      (await page.locator(`[data-dtray-recent="${blind.id}"][data-readable="true"]`).count()) === 1,
      "the DM cannot read the blind roll",
    );
    await formula.fill("1d20");
    await formula.press("Tab");
    await seg("audience", "self").click();
    await page.locator("[data-dtray-roll-button]").click();
    await waitRolls(9);
    const hidden = (await slice()).rolls.at(-1);
    check(
      hidden.by === "dm" && hidden.audience === "self" && hidden.announced,
      "DM hidden roll not announced",
    );
    log = (await stored()).log.at(-1);
    check(
      log.label === "Il DM ha fatto un tiro nascosto" && log.visibility !== "private",
      "no announcement in the log",
    );
    // The players first see only the announcement.
    await role("player");
    await openTray();
    const hiddenRow = page.locator(`[data-dtray-recent="${hidden.id}"]`);
    check(
      (await hiddenRow.getAttribute("data-readable")) === "false" &&
        (await hiddenRow.textContent()).includes("Il DM ha fatto un tiro nascosto") &&
        !(await hiddenRow.textContent()).includes(String(hidden.total) + " "),
      "the player does not see only the announcement",
    );
    await hiddenRow.scrollIntoViewIfNeeded();
    await shot("06-player-sees-announcement-only-it-1440.png");
    // Review P1-2: the DM reveals to one character a player plays (Livia); the list never
    // names Doran (the DM's own) or a personal sheet.
    await role("dm");
    await openTray();
    const revealOptions = await page
      .locator(`[data-dtray-reveal-target="${hidden.id}"] option`)
      .evaluateAll((options) => options.map((o) => o.value));
    check(
      revealOptions.includes("livia") &&
        !revealOptions.includes("doran") &&
        !revealOptions.includes("iria"),
      "reveal targets: " + revealOptions.join(","),
    );
    await page.locator(`[data-dtray-reveal-target="${hidden.id}"]`).selectOption("livia");
    await page.locator(`[data-dtray-reveal="${hidden.id}"]`).click();
    await page.waitForFunction(
      ([k, id]) =>
        JSON.parse(localStorage.getItem(k)).ext["dice-tray"].rolls.find((r) => r.id === id).reveal
          .actorIds[0] === "livia",
      [key, hidden.id],
    );
    check((await stored()).log.at(-1).visibility === "private", "a one-person reveal was shared");
    await skipDice();
    await page.locator(`[data-dtray-recent="${hidden.id}"]`).scrollIntoViewIfNeeded();
    await shot("05-dm-hidden-roll-revealed-to-livia-it-1440.png");
    await role("player");
    await openTray();
    check(
      (await page.locator(`[data-dtray-recent="${hidden.id}"]`).getAttribute("data-readable")) ===
        "true",
      "the reveal to Livia did not reach her player",
    );
    await role("dm");
    await openTray();
    await page.locator(`[data-dtray-reveal-target="${hidden.id}"]`).selectOption("all");
    await page.locator(`[data-dtray-reveal="${hidden.id}"]`).click();
    await page.waitForFunction(
      ([k, id]) =>
        JSON.parse(localStorage.getItem(k)).ext["dice-tray"].rolls.find((r) => r.id === id).reveal
          .all,
      [key, hidden.id],
    );
    check(
      (await stored()).log.at(-1).label.startsWith("Tiro rivelato a tutti"),
      "the reveal to everyone is not in the log",
    );
    // Policy off: a hidden DM roll leaves no trace for the players (Roll20 /ssr).
    await role("dm");
    await openTray();
    await section("look");
    await page.locator("[data-dtray-announce]").uncheck();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["core-settings"].campaign[
          "dice-tray-campaign.announce"
        ] === false,
      key,
    );
    await section("roll");
    await formula.fill("1d20");
    await formula.press("Tab");
    await seg("audience", "self").click();
    await page.locator("[data-dtray-roll-button]").click();
    await waitRolls(10);
    const silent = (await slice()).rolls.at(-1);
    check(!silent.announced, "a hidden roll was announced with the policy off");
    await role("player");
    await openTray();
    check(
      !(await page.locator(`[data-dtray-recent="${silent.id}"]`).count()),
      "the silent roll reached the player",
    );
    passed.push(
      "(3) player «Solo il DM» roll: roller sees «Tiro inviato al DM» (no B56 dice), DM reads it; DM «Solo DM» roll announced without result in tray and log (the player sees only the announcement); revealed only to Livia (list without Doran or a personal sheet, private log line), then to everyone; with the policy off no trace",
    );

    // (4) request: Dex save DC 13 from Livia and Doran
    await role("dm");
    await openTray();
    await section("requests");
    await page.locator('[data-dtray-rq="dc"]').fill("13");
    await page.locator('[data-dtray-rq-target][value="mira"]').uncheck();
    await page.locator("[data-dtray-request-send]").click();
    await page.locator("[data-dtray-group]").first().waitFor();
    let state = await stored();
    const attempts = state.combatAttempts.filter((a) => a.kind === "roll-request");
    check(
      attempts.length === 2 &&
        attempts.every((a) => a.requests[0].dc === 13 && a.requests[0].kind === "save") &&
        attempts
          .map((a) => a.actorId)
          .sort()
          .join() === "doran,livia",
      "request not queued for Livia and Doran",
    );
    const livReq = attempts.find((a) => a.actorId === "livia");
    const dorReq = attempts.find((a) => a.actorId === "doran");
    const card = page.locator(`[data-dtray-group]`).first();
    check(
      (await card.locator("h4").textContent()) === "Tiro salvezza su Destrezza · CD 13",
      "card title wrong",
    );
    await card.scrollIntoViewIfNeeded();
    await shot("07-dm-request-card-it-1440.png");
    const hpBefore = state.actors.livia.hp;
    await role("player");
    await openTray();
    check(
      (await page.locator("[data-dtray-pending]").textContent()).trim() === "1",
      "pending badge missing",
    );
    await section("requests");
    const livRow = page.locator(`[data-dtray-request-row="${livReq.requests[0].id}"]`);
    const dorRow = page.locator(`[data-dtray-request-row="${dorReq.requests[0].id}"]`);
    check(!(await dorRow.locator("button").count()), "the player can answer for Doran");
    await livRow.locator("[data-dtray-answer-physical]").click();
    await page.locator(`[data-dtray-request-face="${livReq.requests[0].id}"]`).fill("9");
    await page.locator(`[data-dtray-answer-record="${livReq.requests[0].id}"]`).click();
    await page.waitForFunction(
      ([k, id]) =>
        JSON.parse(localStorage.getItem(k)).combatAttempts.find((a) => a.id === id).requests[0]
          .status === "resolved",
      [key, livReq.id],
    );
    // Refreshed by the hand-off writer (29/09/2026): P2 PG-25, Livia's Dex save is +3 with
    // her Cloak of Protection: the face 9 gives 12, still below DC 13.
    check(
      (await livRow.locator("[data-dtray-request-status]").textContent()).startsWith(
        "12 · Fallimento",
      ),
      "physical answer not shown as 12 · Fallimento",
    );
    // Undo and reapply the known faces (no new dice).
    await page.locator('.action-dock [data-table="undo"]').click();
    await livRow.locator("[data-dtray-reapply]").waitFor();
    check(
      (await livRow.locator("[data-dtray-request-status]").textContent()).includes("facce note 9"),
      "Undo lost the known face",
    );
    await livRow.locator("[data-dtray-reapply]").click();
    await page.waitForFunction(
      ([k, id]) =>
        JSON.parse(localStorage.getItem(k)).combatAttempts.find((a) => a.id === id).requests[0]
          .status === "resolved",
      [key, livReq.id],
    );
    check(
      (await livRow.locator("[data-dtray-request-status]").textContent()).startsWith(
        "12 · Fallimento",
      ),
      "reapply changed the result",
    );
    await role("dm");
    await openTray();
    await section("requests");
    await dorRow.locator("[data-dtray-answer]").click();
    await page.waitForFunction(
      ([k, id]) =>
        JSON.parse(localStorage.getItem(k)).combatAttempts.find((a) => a.id === id).requests[0]
          .status === "resolved",
      [key, dorReq.id],
    );
    await skipDice();
    state = await stored();
    const dorTotal = state.combatAttempts.find((a) => a.id === dorReq.id).requests[0].total;
    const summary = await card.locator("[data-dtray-summary]").textContent();
    check(
      summary.includes(`Successi ${dorTotal >= 13 ? 1 : 0}`) &&
        summary.includes(`Fallimenti ${dorTotal >= 13 ? 1 : 2}`) &&
        summary.includes("In attesa 0"),
      "summary wrong: " + summary,
    );
    check(state.actors.livia.hp === hpBefore, "a request changed hit points");
    check(
      (await card.textContent()).includes("Nessuna conseguenza automatica"),
      "no-consequence note missing",
    );
    await card.scrollIntoViewIfNeeded();
    await shot("08-dm-request-summary-it-1440.png");
    passed.push(
      "(4) Dex save DC 13 to Livia and Doran as queue cards: player answers with a physical 9 (12 · Fallimento, Dex +3 with the cloak), Undo keeps the known face and «Riapplica» restores it, DM rolls Doran digitally, summary counts, HP unchanged, «Nessuna conseguenza automatica»",
    );

    // (6) Heroic Inspiration: switch on the sheet, reroll after the failure, spending recorded
    await role("player");
    await page.goto(base + "#characters?id=livia&tab=actions");
    await page.locator("[data-dtray-sheet]").waitFor();
    await dismissTips();
    await page.locator('[data-dtray-inspiration-wrap="sheet"]').click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["dice-tray"].inspiration.livia?.active === true,
      key,
    );
    await page.locator("[data-dtray-sheet]").scrollIntoViewIfNeeded();
    await shot("09-sheet-inspiration-and-numbers-it-1440.png");
    await page.goto(base + "#table");
    await role("dm");
    await openTray();
    await section("requests");
    check(
      await page.locator('[data-dtray-inspiration-wrap="party-livia"] input').isChecked(),
      "the DM does not see Livia's inspiration",
    );
    await role("player");
    await openTray();
    await section("requests");
    await livRow.locator("[data-dtray-request-reroll]").click();
    await page.locator("#dialog [data-dtray-reroll-mode]").selectOption("physical");
    await page.locator("#dialog input[name=face]").fill("15");
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).ext["dice-tray"].requestRerolls.length === 1,
      key,
    );
    const reroll = (await slice()).requestRerolls[0];
    check(
      reroll.from === 9 && reroll.to === 15 && reroll.total === 18 && reroll.success,
      "reroll not 9 → 15 = 18 (Dex +3 with the cloak)",
    );
    check((await slice()).inspiration.livia.active === false, "inspiration not spent");
    check(
      (await livRow.locator("[data-dtray-request-status]").textContent()).startsWith(
        "18 · Successo",
      ),
      "row does not use the rerolled total",
    );
    check(
      (await stored()).log.at(-1).label.includes("Ispirazione eroica spesa"),
      "spending not in the log",
    );
    check(!(await livRow.locator("[data-dtray-request-reroll]").count()), "reroll offered twice");
    await skipDice();
    await livRow.scrollIntoViewIfNeeded();
    await shot("10-inspiration-reroll-success-it-1440.png");
    passed.push(
      "(6) Heroic Inspiration switched on in the sheet's «Tiri» (DM sees it), reroll of the failed d20 9 → 15 = 18 success, inspiration spent and logged",
    );

    // (5) opposed roll
    await role("dm");
    await openTray();
    await section("requests");
    await seg("rq-mode", "contest").click();
    await page.locator('[data-dtray-rq="c0-actorId"]').selectOption("livia");
    await page.locator('[data-dtray-rq="c1-actorId"]').selectOption("goblin-1");
    await page.locator('[data-dtray-rq="c1-skill"]').selectOption("acrobatics");
    await page.locator("[data-dtray-request-send]").click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).combatAttempts.filter((a) => a.kind === "roll-request")
          .length === 4,
      key,
    );
    state = await stored();
    const contest = state.combatAttempts.filter((a) => a.rollRequest?.kind === "contest");
    const contestCard = page.locator(`[data-dtray-group="${contest[0].rollRequest.groupId}"]`);
    await contestCard
      .locator(
        `[data-dtray-answer="${contest.find((a) => a.actorId === "goblin-1").requests[0].id}"]`,
      )
      .click();
    await skipDice();
    await role("player");
    await openTray();
    await section("requests");
    await contestCard
      .locator(`[data-dtray-answer="${contest.find((a) => a.actorId === "livia").requests[0].id}"]`)
      .click();
    await skipDice();
    await role("dm");
    await openTray();
    await section("requests");
    state = await stored();
    const [ca, cb] = ["livia", "goblin-1"].map(
      (id) =>
        contest.length &&
        state.combatAttempts.find((a) => a.rollRequest?.kind === "contest" && a.actorId === id)
          .requests[0].total,
    );
    const verdict = await contestCard.locator("[data-dtray-verdict]").textContent();
    check(
      ca === cb
        ? verdict.startsWith("Pareggio")
        : verdict.includes(ca > cb ? "Livia" : "Sentinella"),
      `opposed verdict wrong (${ca} vs ${cb}): ${verdict}`,
    );
    await contestCard.scrollIntoViewIfNeeded();
    await shot("11-dm-opposed-roll-it-1440.png");
    passed.push(
      `(5) opposed Livia (Atletica) vs Sentinella (Acrobazia): both answered, verdict «${verdict.trim()}», no rule invented`,
    );

    // (9) a check written in a journal entry becomes a request card
    await page.goto(base + "#campaign?tab=entry&id=legacy-recap-summary");
    await page.locator("[data-campaign-edit]").click();
    const body = page.locator("[data-campaign-form] textarea").first();
    await body.fill((await body.inputValue()) + "\n\nIl ponte oscilla: @Embed[save:dex:13]");
    await page.locator("[data-campaign-save]").click();
    await page.locator("[data-campaign-apply]:not([disabled])").click();
    if (await page.locator("[data-campaign-apply]").count())
      await page.locator("[data-campaign-apply]").click();
    await page.waitForURL(/tab=entry&id=legacy-recap-summary/);
    const embed = page.locator('[data-dtray-embed="save:dex:13"]').first();
    await embed.waitFor();
    await embed.locator("[data-dtray-embed-request]").click();
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).combatAttempts.some(
          (a) => a.rollRequest?.origin?.kind === "journal",
        ),
      key,
    );
    await embed.locator("[data-dtray-embed-status]").waitFor();
    await embed.scrollIntoViewIfNeeded();
    await shot("12-journal-roll-card-dm-it-1440.png");
    await role("player");
    const playerEmbed = page.locator('[data-dtray-embed="save:dex:13"]').first();
    const trayRollsBefore = (await slice()).rolls.length;
    // Review P2-5: the player's roll from the text answers the DM's journal request.
    await playerEmbed.locator('[data-dtray-embed-roll="livia"]').click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).combatAttempts.some(
          (a) =>
            a.rollRequest?.origin?.ref === "save:dex:13" &&
            a.actorId === "livia" &&
            a.requests[0].status === "resolved",
        ),
      key,
    );
    check(
      (await slice()).rolls.length === trayRollsBefore,
      "the journal roll made a second, unrelated tray roll",
    );
    await skipDice();
    await playerEmbed.locator("[data-dtray-embed-result]").waitFor();
    check(
      (await playerEmbed.locator("[data-dtray-embed-result]").first().textContent()).startsWith(
        "Livia: ",
      ) &&
        !(await playerEmbed.locator('[data-dtray-embed-roll="livia"]').textContent()).includes(
          "richiesto dal DM",
        ),
      "the embed does not show Livia's answer",
    );
    await page.goto(base + "#table");
    await openTray();
    await section("requests");
    state = await stored();
    const journalGroup = state.combatAttempts.find((a) => a.rollRequest?.origin?.kind === "journal")
      .rollRequest.groupId;
    check(
      (await page.locator(`[data-dtray-group="${journalGroup}"] .badge`).first().textContent()) ===
        "Dal diario",
      "the journal request is not a card in the tray",
    );
    passed.push(
      "(9) «@Embed[save:dex:13]» in a journal entry renders a roll card: DM «Chiedi il tiro…» creates the request card (tray, «Dal diario»), the player's roll from the entry answers that request (no second roll; the embed shows Livia's result)",
    );

    // (10) personal policy «Chiedi sempre»
    await section("look");
    await page.locator('[data-dtray-setting="advantage"]').selectOption("ask");
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["core-settings"].personal.player[
          "dice-tray.advantage"
        ] === "ask",
      key,
    );
    await section("roll");
    const before10 = await rollCount();
    await page.locator('[data-dtray-roll][data-kind="save"][data-ability="int"]').click();
    await page.locator("#dialog [data-dtray-ask]").first().waitFor();
    await shot("13-ask-advantage-policy-it-1440.png");
    await page.locator('#dialog [data-dtray-ask="advantage"]').click();
    await waitRolls(before10 + 1);
    check(
      (await slice()).rolls.at(-1).rollMode === "advantage",
      "the asked advantage was not applied",
    );
    await skipDice();
    passed.push(
      "(10) personal policy «Chiedi sempre»: a click on a number asks Vantaggio/Normale/Svantaggio first",
    );

    // The B56 «Prova i dadi» demo lives in the tray now: a practice save rolls from here.
    await section("look");
    await page.locator('.dtray-b56 [data-dice3d-preset="save"]').click();
    await page.locator(".dtray-b56 [data-dice3d-roll]").click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).ext["dice-3d"].rolls.length === 1,
      key,
    );
    await skipDice();
    await section("look");
    await page.locator(".dtray-look").scrollIntoViewIfNeeded();
    await shot("19-look-and-practice-it-1440.png");
    passed.push(
      "B56 «Prova i dadi» absorbed: its practice roll works from the tray's «Aspetto e prova»",
    );

    // (8) 2D dice only for the roller; reduced motion keeps them still
    await section("look");
    await seg("style", "2d").click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["core-settings"].personal.player[
          "dice-3d.enabled"
        ] === false,
      key,
    );
    await section("roll");
    await formula.fill("2d6");
    await formula.press("Tab");
    await page.locator("[data-dtray-roll-button]").click();
    await page.locator('[data-dtray-2d][data-animated="true"]').waitFor();
    check(
      (await page.locator("[data-dtray-2d] .dtray-die.is-rolling").count()) === 2,
      "2D dice not rolling",
    );
    check(
      !(await page.locator("[data-dice3d-layer]:not([hidden])").count()),
      "3D dice shown with the 2D style",
    );
    await page.locator("[data-dtray-2d]").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await shot("14-2d-dice-rolling-it-1440.png");
    const r2d = (await slice()).rolls.at(-1);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator("[data-dtray-roll-button]").click();
    await page.waitForFunction(
      ([k, id]) => JSON.parse(localStorage.getItem(k)).ext["dice-tray"].rolls.at(-1).id !== id,
      [key, r2d.id],
    );
    await page.locator('[data-dtray-2d][data-animated="false"]').waitFor();
    check(
      !(await page.locator(".dtray-die.is-rolling").count()),
      "2D dice rolled with reduced motion",
    );
    await page.emulateMedia({ reducedMotion: null });
    await role("dm");
    await openTray();
    await section("roll");
    check(
      (await page.locator(`[data-dtray-recent="${r2d.id}"]`).count()) === 1 &&
        !(await page.locator("[data-dtray-2d]").count()),
      "the DM sees the player's 2D dice",
    );
    await role("player");
    await openTray();
    passed.push(
      "(8) 2D dice style (B56 3D off): two d6 roll in the tray only for the roller; with reduced motion they show still; the DM sees the result, not the dice",
    );

    // simulated connected die. Refreshed by the hand-off writer (29/09/2026): R2 TV-95 moved
    // the Pixels flow to «Dadi connessi · simulazione» (scan, «Collega», per-type method, the
    // waiting card, faces recorded as physical dice named by their die), proven step by step
    // by r2-connected-dice-journey.js; here the panel is where the tray's settings send it.
    await section("look");
    await page.locator("[data-dtray-devices]").scrollIntoViewIfNeeded();
    check(
      /non c'è Bluetooth/.test(await page.locator("[data-dtray-sim-note]").innerText()),
      "the connected dice panel does not say it is a simulation",
    );
    await page.getByRole("button", { name: "Cerca dadi vicini" }).click();
    await page.locator("[data-dtray-nearby]").waitFor();
    await page.locator('[data-dtray-connect="px-d20-onyx"]').click();
    await page.locator("[data-dtray-paired]").waitFor();
    check(
      /Pixels d20 Onice/.test(await page.locator("[data-dtray-paired]").innerText()),
      "the paired die is not listed",
    );
    // Forgotten again, so the next d20 rolls of this journey do not wait for it.
    const onyx = (await slice()).devices.player[0];
    await page.locator(`[data-dtray-device-forget="${onyx.id}"]`).click();
    await page.waitForFunction(
      (k) => !JSON.parse(localStorage.getItem(k)).ext["dice-tray"].devices.player?.length,
      key,
    );
    passed.push(
      "Simulated connected die (Pixels pattern): «Dadi connessi · simulazione» scans, pairs and forgets Onice (the full flow: r2-connected-dice-journey)",
    );

    // TV-125: a spell's roll shows a short effect on the map (switchable in Aspetto e prova)
    await role("dm");
    // Refreshed by the hand-off writer (29/09/2026): P6 TV-106 and P7 PR-06 (the title row's
    // «Scene» is a list dialog, Preparation has folders): the courtyard's editor by its route.
    await page.goto("http://127.0.0.1:8879/#preparation?id=old-watch");
    await page.getByRole("heading", { name: "Pedine nella scena", exact: true }).waitFor();
    // Saved only when the draft changed (the include and d20 fields left Preparation).
    if (
      await page
        .getByRole("button", { name: "Salva preparazione", exact: true })
        .isEnabled({ timeout: 1000 })
        .catch(() => false)
    )
      await page.getByRole("button", { name: "Salva preparazione", exact: true }).click();
    // Saved only when the draft changed (the include and d20 fields left Preparation).
    if (
      await page
        .getByRole("button", { name: "Aggiorna scena attiva", exact: true })
        .isEnabled({ timeout: 1000 })
        .catch(() => false)
    )
      await page.getByRole("button", { name: "Aggiorna scena attiva", exact: true }).click();
    // Refreshed by the hand-off writer (29/09/2026): R5 PR-32 replaced Preparation's «Incontro
    // preparato» with the Table's start dialog (Foundry roll call): who fights and each typed
    // d20; the Initiative bonus comes from the sheet.
    await page.getByRole("button", { name: "Avvia incontro salvato…", exact: true }).click();
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
    await page.locator("#battle-map").waitFor();
    await role("player");
    await page
      .getByRole("combobox", { name: "Modalità dei dadi dell’azione", exact: true })
      .selectOption("digital");
    await button("Dardo di fuoco").click();
    await page.locator("#battle-map [data-actor=goblin-2]").click();
    await page
      .locator("[data-dtray-fx] .dtray-fx-bolt")
      .waitFor({ state: "attached", timeout: 4000 });
    await page.waitForTimeout(250);
    await shot("18-spell-effect-fire-bolt-it-1440.png");
    await skipDice();
    passed.push(
      "TV-125: a digital Fire Bolt in combat draws its bolt from Livia to the Esploratore on the map layer (setting «Effetti visivi degli incantesimi», off with reduced motion)",
    );

    // reload keeps rolls, requests, inspiration spent and settings
    const countBefore = await rollCount();
    await page.reload();
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    await openTray();
    await section("roll");
    check((await rollCount()) === countBefore, "reload lost rolls");
    check(
      (await page.locator("[data-dtray-recent]").count()) === 10,
      "last rolls list not restored",
    );
    await section("requests");
    check(
      (await livRow.locator("[data-dtray-request-status]").textContent()).startsWith(
        "18 · Successo",
      ),
      "reload lost the request result",
    );
    await section("look");
    check(await seg("style", "2d").locator("input").isChecked(), "reload lost the 2D style");
    passed.push(
      "Reload keeps rolls, request cards with the reroll, spent inspiration and personal settings",
    );
    await context.close();

    // ------------------------------------------------------------------ (B) EN phone 390, touch
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
    // B61 phone: the tabs are a bar at the bottom; the Dice tab opens the tray.
    await phoneTab(phone);
    check(await noOverflow(phone), "phone tray overflows");
    check(
      (await phone.locator('[data-dtray-section="roll"]').textContent()).trim() === "Roll",
      "tray not in English",
    );
    await phone.locator("[data-dtray-formula]").fill("2d6+1d4+3");
    await phone.locator("[data-dtray-formula]").press("Tab");
    await phone.locator("[data-dtray-roll-button]").tap();
    await waitRolls(1, phone);
    await skipDice(phone);
    check(await noOverflow(phone), "phone overflow after a roll");
    await phone.locator("[data-dtray-result]").scrollIntoViewIfNeeded();
    await shot("15-phone-en-tray-roll-390.png", phone);
    // Touch long press on a number opens the menu (D&D Beyond app).
    const phoneSave = phone.locator('[data-dtray-roll][data-kind="save"][data-ability="wis"]');
    await phoneSave.scrollIntoViewIfNeeded();
    await phoneSave.dispatchEvent("pointerdown", {
      pointerType: "touch",
      button: 0,
      isPrimary: true,
    });
    await phone.waitForTimeout(650);
    await phoneSave.dispatchEvent("pointerup", {
      pointerType: "touch",
      button: 0,
      isPrimary: true,
    });
    const phoneMenu = phone.locator(".dtray-menu");
    await phoneMenu.waitFor();
    const menuBox = await phoneMenu.boundingBox();
    check(menuBox.x >= 0 && menuBox.x + menuBox.width <= 390, "menu wider than the phone");
    await shot("16-phone-en-long-press-menu-390.png", phone);
    await phoneMenu.getByRole("menuitem", { name: "Roll with disadvantage" }).tap();
    await waitRolls(2, phone);
    check((await slice(phone)).rolls.at(-1).rollMode === "disadvantage", "touch menu roll wrong");
    await skipDice(phone);
    // A DM request answered on the phone with a physical die.
    await phone.locator("#demo-role").selectOption("dm");
    await phone.waitForTimeout(150);
    await phoneTab(phone);
    await section("requests", phone, true);
    await phone.locator('[data-dtray-rq="kind"]').selectOption("skill");
    await phone.locator('[data-dtray-rq="skill"]').selectOption("perception");
    await phone.locator('[data-dtray-rq="dc"]').fill("12");
    await phone.locator('[data-dtray-rq-target][value="doran"]').uncheck();
    await phone.locator("[data-dtray-request-send]").tap();
    await phone.locator("[data-dtray-group]").first().waitFor();
    check(await noOverflow(phone), "phone overflow with the request form");
    await phone.locator("#demo-role").selectOption("player");
    await phone.waitForTimeout(150);
    await phoneTab(phone);
    await section("requests", phone, true);
    const phoneState = await stored(phone);
    const miraReq = phoneState.combatAttempts.find(
      (a) => a.kind === "roll-request" && a.actorId === "mira",
    );
    const miraRow = phone.locator(`[data-dtray-request-row="${miraReq.requests[0].id}"]`);
    await miraRow.locator("[data-dtray-answer-physical]").tap();
    await phone.locator(`[data-dtray-request-face="${miraReq.requests[0].id}"]`).fill("10");
    await phone.locator(`[data-dtray-answer-record="${miraReq.requests[0].id}"]`).tap();
    await miraRow.locator('[data-tone="success"], [data-dtray-request-status]').first().waitFor();
    check(
      (await miraRow.locator("[data-dtray-request-status]").textContent()).startsWith(
        "15 · Success",
      ),
      "Mira's Perception (+5) with a 10 is not 15 · Success",
    );
    check(await noOverflow(phone), "phone overflow on the request card");
    await miraRow.scrollIntoViewIfNeeded();
    await shot("17-phone-en-request-answered-390.png", phone);
    passed.push(
      "(B) EN phone 390: Dice tab from the bottom bar, tap roll, touch long-press menu (disadvantage), DM skill request DC 12 answered by the player with a physical 10 (+5 = 15 · Success), no overflow",
    );
    await phoneContext.close();
  } catch (error) {
    throw Error(`After ${passed.length} passed (${passed.at(-1) ?? "start"}): ${error.message}`);
  }
  if (errors.length) throw Error("Page errors: " + errors.join(" | "));
  return { passed, errors };
};
