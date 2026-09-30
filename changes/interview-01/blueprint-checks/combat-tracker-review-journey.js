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
  // B32 review (reviewer-fixer B32-rf): the defects fixed after the builder's journey,
  // checked with real clicks, keys and touch. Sample actors only (Livia, Sentinella, Doran,
  // Esploratore) on the lantern campaign's "old-watch" scene; resets this browser's demo.
  // Groups: (A) the row menu closes on a click elsewhere and when focus leaves it, and the
  // click that closes it still lands; (B) a Legendary Action is refused right after the
  // creature's own turn and allowed after another creature's; (C) hidden turn: the
  // player's "you're next" alert, timer and header do not move when a hidden creature
  // starts its turn (DDB-138); (D) a readied move (Ready: move up to your Speed) really
  // moves Livia once as her Reaction; (E) editing a countdown keeps its elapsed rounds;
  // (F) EN phone 390 with touch: the Reaction badge and the menu closing on a tap.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B32-rf/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  let step = "setup";
  const at = (name) => (step = name);
  // TV-45/PR-32: initiative is set in the Table's start dialog (Foundry Combat Tracker); the
  // scene editor's old «Incontro preparato» list is now the encounter builder. Rows are
  // addressed by id (each change re-sorts the list); the bonus comes from the sheet.
  const startWith = async (naturals) => {
    await page.locator("[data-ct-start-dialog]").waitFor();
    const ids = await page
      .locator("[data-ct-start-include]")
      .evaluateAll((els) => els.map((el) => el.dataset.ctStartInclude));
    for (const id of ids) {
      const box = page.locator(`[data-ct-start-include="${id}"]`);
      if ((await box.isChecked()) !== Object.hasOwn(naturals, id)) await box.click();
    }
    for (const [id, natural] of Object.entries(naturals)) {
      const d20 = page.locator(`[data-ct-start-natural="${id}"]`);
      await d20.fill(String(natural));
      await d20.dispatchEvent("change");
    }
    await page.getByRole("button", { name: "Inizia combattimento", exact: true }).click();
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const current = async (p = page) => {
    const s = await stored(p);
    return s.combat.order[s.combat.turn];
  };
  const openTracker = async (p = page, tap = false) => {
    // B62: the tracker is the first sub-tab of the Combat tab.
    await p.locator(".table-tabs [data-table-tab]").first().waitFor();
    await openTablePanel(p, "combat-tracker", tap);
    await p.locator("#table-drawer [data-ct], #table-drawer [data-ct-idle]").first().waitFor();
  };
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await p.goto(base + "#table");
    await openTracker(p);
  };
  const submit = (p = page) => p.locator("#dialog button[type=submit]").click();
  const closeDialog = async (p = page) => {
    if (await p.locator("#dialog[open]").count()) await p.keyboard.press("Escape");
    await p
      .locator("#dialog[open]")
      .waitFor({ state: "detached", timeout: 3000 })
      .catch(() => {});
  };
  const dismissAlert = async (p = page) => {
    const alert = p.locator("#ct-alert");
    if (await alert.count()) {
      await alert.locator("[data-ct-alert-ok]").click();
      await alert.waitFor({ state: "detached" });
    }
  };
  const next = async (p = page) => {
    await dismissAlert(p);
    await p.locator("[data-ct-next]").click();
    await p.waitForTimeout(150);
    await closeDialog(p);
  };
  const shot = (name, p = page) => p.screenshot({ path: dir + name });
  try {
    await page.goto(base + "#table");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.locator("#demo-role").selectOption("dm");
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.locator('[data-table="combat"]').click();
    await startWith({ livia: 15, "goblin-1": 12, doran: 9, "goblin-2": 8 });
    await page.locator("#battle-map").waitFor();
    await openTracker();
    check(
      (await stored()).combat.order.join() === "livia,goblin-1,doran,goblin-2",
      "Unexpected order",
    );
    // A countdown for group E, and the turn timer for group C.
    await page.locator("[data-ct-entry-new]").first().click();
    await page.locator("#dialog [name=name]").fill("Il soffitto crolla");
    await page.locator("#dialog [name=rounds]").fill("3");
    await page.locator("#dialog [name=visibility]").selectOption("all");
    await submit();
    await page.locator("[data-ct-settings]").click();
    await page.locator("#dialog [name=timer]").check();
    await submit();

    // -------------------------------------------------------------- A. row menu
    at("A-menu");
    const menu = page.locator("#ct-menu-doran");
    await page.locator('[data-ct-menu="doran"]').click();
    await menu.waitFor();
    await page.locator(".ct-head").click();
    await menu.waitFor({ state: "detached", timeout: 2000 });
    check(
      (await page.locator('[data-ct-menu="doran"]').getAttribute("aria-expanded")) === "false",
      "⋯ still expanded",
    );
    await page.locator('[data-ct-menu="doran"]').click();
    await menu.waitFor();
    for (let i = 0; i < 12 && (await menu.count()); i++) await page.keyboard.press("Tab");
    check((await menu.count()) === 0, "Menu stays open after focus left it");
    // One click on another control both closes the menu and works.
    await page.locator('[data-ct-menu="doran"]').click();
    await menu.waitFor();
    await page.locator("[data-ct-settings]").click();
    await page.locator("#dialog[open]").waitFor({ timeout: 2000 });
    check((await menu.count()) === 0, "Menu still open behind the dialog");
    await closeDialog();
    passed.push(
      "A. ⋯ menu (Foundry context menu): closes on a click elsewhere (aria-expanded false), when Tab leaves it, and one click on “Impostazioni” both closes it and opens the settings",
    );

    // -------------------------------------------------------------- B. legendary
    at("B-legendary");
    await page.locator('[data-ct-menu="goblin-1"]').click();
    await page.locator('[data-ct-cmd="monster"][data-actor="goblin-1"]').click();
    await page.locator("#dialog [name=legendary]").fill("2");
    await submit();
    const use = page.locator('[data-ct-legendary-use="goblin-1"]');
    await use.waitFor();
    await next(); // Livia -> Sentinella
    await next(); // Sentinella -> Doran: its own turn just ended
    check((await current()) === "doran", "Not Doran's turn");
    check((await use.getAttribute("aria-disabled")) === "true", "Usable right after its own turn");
    check(
      (await page.locator('[data-ct-legendary="goblin-1"]').innerText()).includes(
        "non subito dopo il proprio",
      ),
      "Reason not shown",
    );
    check(
      Number(await use.evaluate((b) => getComputedStyle(b).opacity)) < 1,
      "An unavailable “Usa” looks available",
    );
    // aria-disabled (still focusable, as in the tracker): a click explains the refusal.
    await use.click({ force: true });
    check(
      (await page.locator("#toast").innerText()).includes("non subito dopo il proprio"),
      "No refusal toast",
    );
    check((await stored()).ext["combat-tracker"].combat.legendaryLog.length === 0, "Spent anyway");
    await shot("rf-01-legendary-after-own-turn-it-1440.png");
    await next(); // Doran -> Esploratore: another creature's turn ended
    check((await use.getAttribute("aria-disabled")) === null, "Not usable after Doran's turn");
    await use.click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["combat-tracker"].combat.legendaryLog.length === 1,
      key,
    );
    const log = (await stored()).ext["combat-tracker"].combat.legendaryLog[0];
    check(log.afterActorId === "doran", "Logged after " + log.afterActorId);
    passed.push(
      "B. Sentinella with 2 Legendary Actions: right after its own turn “Usa” is dimmed and refused with “Si usa dopo il turno di un’altra creatura, non subito dopo il proprio.”; after Doran's turn it is spent and logged after Doran (SRD 5.2.1 EN 257 / IT 293)",
    );

    // -------------------------------------------------------------- C. hidden turn
    at("C-hidden");
    await page.locator('[data-ct-menu="goblin-2"]').click();
    await page.locator('[data-ct-cmd="hide"][data-actor="goblin-2"]').click();
    while ((await current()) !== "doran") await next();
    await role("player");
    const alert = page.locator("#ct-alert");
    await alert.waitFor({ timeout: 4000 });
    check((await alert.innerText()).includes("Il prossimo turno è tuo, Livia."), "No 'next' alert");
    await dismissAlert();
    const headBefore = await page.locator(".ct-head").innerText();
    const timerBefore = await page.locator("[data-ct-timer]").getAttribute("data-ct-timer");
    const bellBefore = await page.evaluate(() =>
      document.querySelector('[data-service="requests"]')?.textContent.trim(),
    );
    await role("dm");
    await next(); // Doran -> hidden Esploratore
    check((await current()) === "goblin-2", "Not the hidden creature's turn");
    await role("player");
    await page.waitForTimeout(400);
    check((await alert.count()) === 0, "A hidden turn re-alerted the player");
    const headAfter = await page.locator(".ct-head").innerText();
    check(headAfter === headBefore, `Header moved: «${headBefore}» → «${headAfter}»`);
    check(
      (await page.locator("[data-ct-timer]").getAttribute("data-ct-timer")) === timerBefore,
      "The player's timer restarted on a hidden turn",
    );
    check(
      (await page.evaluate(() =>
        document.querySelector('[data-service="requests"]')?.textContent.trim(),
      )) === bellBefore,
      "The bell changed on a hidden turn",
    );
    check(
      (await page.locator("#table-drawer").innerText()).includes("Turno di Doran"),
      "Player's tracker left Doran",
    );
    await shot("rf-02-player-hidden-turn-no-alert-it-1440.png");
    passed.push(
      "C. Esploratore hidden: during Doran's turn Livia gets “Il prossimo turno è tuo, Livia.”; when the hidden Esploratore starts its turn the player gets no second alert, the bell count, the header (“Turno di Doran”) and the turn timer do not move (DDB-138)",
    );

    // -------------------------------------------------------------- D. readied move
    at("D-ready-move");
    await role("dm");
    await next(); // hidden Esploratore -> Livia, round 3
    check((await current()) === "livia", "Not Livia's turn");
    await role("player");
    await dismissAlert();
    check(
      (await page.locator("[data-ct-next]").innerText()).trim() === "Termina turno",
      "The player's button should read “Termina turno” (Foundry: players end their turn)",
    );
    const summary = await page.locator(".ct-policies li").first().innerText();
    check(
      summary.startsWith("Livia:") && summary.includes("Scudo · Chiedi"),
      "Reaction summary: " + summary,
    );
    await page.locator('[data-ct-ready="livia"]').click();
    await page.locator("#dialog [name=response]").selectOption("move");
    await submit();
    await page.locator('[data-ct-readied="livia"]').waitFor();
    await next(); // Livia -> Sentinella
    check((await current()) === "goblin-1", "Not the Sentinella's turn");
    await page.locator('[data-ct-ready-fire="livia"]').click();
    check(
      (await page.locator("#dialog").innerText()).includes("Puoi muoverti fino alla tua Velocità"),
      "Move reaction dialog",
    );
    await submit();
    const badge = page.locator('[data-ct-ready-moving="livia"]');
    await badge.waitFor();
    check(
      (await badge.innerText()).includes("Reazione: muovi Livia sulla mappa"),
      "Reaction badge text",
    );
    let s = await stored();
    check(s.actors.livia.reaction === false, "Reaction not spent");
    const before = s.scenes[0].tokens.find((t) => t.actorId === "livia");
    await shot("rf-03-readied-move-badge-it-1440.png");
    await page.locator('.map-token[data-actor="livia"]').click();
    await page.locator("#battle-map").focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      ({ k, x }) =>
        JSON.parse(localStorage.getItem(k)).scenes[0].tokens.find((t) => t.actorId === "livia")
          .x !== x,
      { k: key, x: before.x },
    );
    await badge.waitFor({ state: "detached" });
    s = await stored();
    const moved = s.scenes[0].tokens.find((t) => t.actorId === "livia");
    check(moved.x < before.x, "Livia did not move left");
    check((await current()) === "goblin-1", "The turn changed");
    // One move per Reaction: a second one is refused.
    await page.locator('.map-token[data-actor="livia"]').click();
    await page.locator("#battle-map").focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    check(
      (await page.locator("#toast").innerText()).includes("Attendi il turno"),
      "Second move not refused",
    );
    s = await stored();
    check(
      s.scenes[0].tokens.find((t) => t.actorId === "livia").x === moved.x,
      "Second move executed",
    );
    await page.keyboard.press("Escape");
    passed.push(
      `D. Ready (SRD EN 186–187 / IT 211): Livia readies “Muoverti fino alla tua Velocità”; on the Sentinella's turn “Innesco avvenuto…” → “Usa la Reazione” → badge “Reazione: muovi Livia sulla mappa…”; ← ← Enter moves her (x ${before.x} → ${moved.x}) with the turn unchanged; a second move is refused (“Attendi il turno…”)`,
    );

    // -------------------------------------------------------------- E. countdown edit
    at("E-countdown");
    await role("dm");
    s = await stored();
    const entry = s.ext["combat-tracker"].entries[0];
    check(entry.remaining === 1, "Countdown should be at 1 in round 3: " + entry.remaining);
    await page.locator(`[data-ct-menu="entry-${entry.id}"]`).click();
    await page.locator(`[data-ct-cmd="entry-edit"]`).click();
    await page.locator("#dialog [name=note]").fill("Polvere dal soffitto");
    await submit();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["combat-tracker"].entries[0].note ===
        "Polvere dal soffitto",
      key,
    );
    check(
      (await stored()).ext["combat-tracker"].entries[0].remaining === 1,
      "Editing the note restarted the countdown",
    );
    check(
      (await page.locator(`[data-ct-entry="${entry.id}"]`).innerText()).includes("fra 1 round"),
      "Row does not say “fra 1 round”",
    );
    passed.push(
      "E. “Il soffitto crolla” (3 rounds, created in round 1) at round 3 reads “fra 1 round”; ⋯ › Modifica… → a note → still 1 round left (was reset to 3)",
    );

    // -------------------------------------------------------------- G. BG3 costs
    at("G-sheet");
    await role("player");
    await page.locator('[data-ct-sheet="livia"]').click();
    const box = page.locator(".ct-policy-box");
    await box.waitFor();
    const boxText = await box.innerText();
    check(
      boxText.includes("Reazione + slot di 1° livello o superiore") &&
        boxText.includes("Attacco di opportunità"),
      "Reaction costs missing: " + boxText,
    );
    await box.scrollIntoViewIfNeeded();
    await box.screenshot({ path: dir + "rf-05-livia-reactions-costs-it.png" });
    await page.goto(base + "#table");
    await role("dm");
    passed.push(
      "G. Livia's sheet › Azioni › Reazioni (BG3 CRP-138) lists each cost: Scudo “Reazione + slot di 1° livello o superiore”, Attacco di opportunità “Reazione”; the player's tracker reads “Livia: Scudo · Chiedi; …” and “Termina turno”",
    );

    // -------------------------------------------------------------- F. EN phone 390
    at("F-phone");
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    const phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const phone = await phoneContext.newPage();
    phone.on("pageerror", (error) => errors.push("phone: " + error.message));
    await phone.goto(base + "#table");
    await phone.evaluate(
      ([k, v]) => {
        localStorage.clear();
        localStorage.setItem(k, v);
      },
      [key, snapshot],
    );
    await phone.reload();
    await phone.locator('[data-service="preferences"]').first().tap();
    await phone.locator('#dialog [name="lang"]').selectOption("en");
    await phone.locator("#dialog button[type=submit]").tap();
    await phone.locator("#demo-role").selectOption("dm");
    await phone.goto(base + "#table");
    await openTracker(phone, true);
    // Back to Livia's turn (round 4), she readies a move again; the trigger on the next turn.
    for (let i = 0; i < 6 && (await current(phone)) !== "livia"; i++) {
      await dismissAlert(phone);
      await phone.locator("[data-ct-next]").tap();
      await phone.waitForTimeout(150);
      await closeDialog(phone);
    }
    await dismissAlert(phone);
    await phone.locator('[data-ct-ready="livia"]').tap();
    await phone.locator("#dialog [name=response]").selectOption("move");
    await phone.locator("#dialog button[type=submit]").tap();
    await phone.locator("[data-ct-next]").tap();
    await phone.waitForTimeout(150);
    await dismissAlert(phone);
    await phone.locator('[data-ct-ready-fire="livia"]').tap();
    await phone.locator("#dialog button[type=submit]").tap();
    const phoneBadge = phone.locator('[data-ct-ready-moving="livia"]');
    await phoneBadge.waitFor();
    check((await phoneBadge.innerText()).includes("Reaction: move Livia on the map"), "EN badge");
    await phoneBadge.scrollIntoViewIfNeeded();
    await phone.screenshot({ path: dir + "rf-04-phone-readied-move-en-390.png" });
    const phoneMenu = phone.locator("#ct-menu-doran");
    await phone.locator('[data-ct-menu="doran"]').tap();
    await phoneMenu.waitFor();
    await phone.locator(".ct-head").tap();
    await phoneMenu.waitFor({ state: "detached", timeout: 2000 });
    check(
      await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      "Phone overflows",
    );
    const small = await phone.locator("#table-drawer [data-ct] button").evaluateAll(
      (els) =>
        els
          .filter((e) => e.offsetParent)
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.height < 40 || r.width < 40).length,
    );
    check(small === 0, small + " tracker buttons under 40 px");
    await phoneContext.close();
    passed.push(
      "F. EN phone 390 touch: readied move → “Reaction: move Livia on the map…” badge; ⋯ menu closes on a tap elsewhere; no horizontal overflow; tracker buttons ≥ 40 px",
    );

    await context.close();
    if (errors.length) throw Error("Page errors: " + errors.join("; "));
    return { passed, errors, step };
  } catch (error) {
    await page.screenshot({ path: dir + "rf-failure.png" }).catch(() => {});
    return { failed: step, message: error.message, passed, errors };
  }
}
