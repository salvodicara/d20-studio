async (rootPage) => {
  // R1 fix package (round 2), TV-89 (D&D Beyond right-click on every roll: «Crit», «Roll to»;
  // Foundry roll modes): right-click on Livia's Fire Bolt at 1440 offers «Danno critico» and
  // «Chi vede» with the dice tray's audiences; «Solo il DM» keeps the dice from the player's
  // card while the DM reads them, and the declared critical names its reason in the log. The
  // DM's «Solo DM» attack of a goblin warrior leaves no roll in the player's log. Long press at
  // 390 × 844 (touch) opens the same menu. Synthetic demo data only; resets the example.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R1/images/";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const browser = rootPage.context().browser();
  let context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let page = await context.newPage();
  const watch = (p) => {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("dialog", (d) => d.accept().catch(() => {}));
  };
  watch(page);
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const button = (name) => page.getByRole("button", { name, exact: true });
  const setRole = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await page.waitForTimeout(150);
  };
  const settleDice = async () => {
    const layer = page.locator("[data-dice3d-layer]:not([hidden])");
    await layer.waitFor({ timeout: 800 }).catch(() => {});
    for (let i = 0; i < 8 && (await layer.count()); i++) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);
    }
    await layer.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  };
  const closeDialog = async () => {
    if (await page.locator("#dialog[open]").count()) await page.keyboard.press("Escape");
    await page
      .locator("#dialog[open]")
      .waitFor({ state: "detached", timeout: 3000 })
      .catch(() => {});
  };
  const table = async () => {
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.waitForTimeout(300);
  };
  const results = async (attemptId) => {
    await closeDialog();
    await page.locator("[data-combat-requests]").first().click();
    await page.locator("#dialog[open]").waitFor();
    await page.waitForTimeout(150);
    return page.locator("#dialog[open] .combat-results").innerText();
  };
  const menuItems = () =>
    page
      .locator(".combat-roll-menu [role=menuitem]")
      .evaluateAll((items) => items.map((i) => i.textContent.trim()));
  const logText = async () => {
    const tab = page.locator('.table-tabs [data-table-tab="chat"]');
    if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
    await page.waitForTimeout(200);
    const log = page.locator('.table-subtabs [data-table-subtab="log"]');
    if (await log.count()) await log.click();
    await page.waitForTimeout(200);
    return page.locator("#table-sidebar-panel").innerText();
  };
  let step = "setup";
  try {
    await table();
    await button("Ripristina esempio").click();
    await button("Ripristina").click();
    await page.locator("#battle-map").waitFor();
    await setRole("player");

    // ------------------------------------------------------------------ 1. right-click 1440
    step = "right-click";
    await page.locator('.map-token[data-actor="livia"]').click();
    const fireBolt = page.locator('[data-combat-action="fire-bolt"]');
    await fireBolt.click({ button: "right" });
    await page.locator(".combat-roll-menu").waitFor();
    const items = await menuItems();
    await page.screenshot({ path: shots + "r1-07-menu-player-it-1440.png" });
    check(
      items.some((i) => /^Danno critico/.test(i)),
      "menu: " + items.join(" | "),
    );
    check(
      ["Tutti", "Io e il DM", "Solo il DM", "Solo io"].every((a) => items.includes(a)),
      "audiences: " + items.join(" | "),
    );
    check(
      /Chi vede/i.test(await page.locator(".combat-roll-menu").innerText()),
      "«Chi vede» heading",
    );
    await page.locator('.combat-roll-menu [data-combat-menu-audience="blind"]').click();
    await page.locator("#combat-detail").waitFor();
    check(
      (await page.locator('#combat-detail [data-combat-param="audience"]').inputValue()) ===
        "blind",
      "the detail keeps «Solo il DM»",
    );
    await fireBolt.click({ button: "right" });
    await page.locator(".combat-roll-menu [data-combat-menu-critical]").click();
    const critical = page.locator('#combat-detail [data-combat-flag="forceCritical"]');
    check(await critical.isChecked(), "«Danno critico» ticked in the detail");
    await page
      .locator('#combat-detail [data-combat-text="criticalReason"]')
      .fill("Colpo alle spalle");
    await page.locator('.map-token[data-actor="goblin-1"]').click();
    await settleDice();
    const attempt = (await stored()).combatAttempts.at(-1);
    check(attempt.audience === "blind", "the attempt records «Solo il DM»");
    check(attempt.selection.forceCritical === true, "declared critical recorded");
    const player = await results();
    check(/Risultato riservato al DM/.test(player), "player card: " + player);
    check(/Danno critico dichiarato: Colpo alle spalle/.test(player), "reason: " + player);
    const d20 = attempt.requests[0].values[0];
    check(!new RegExp(`\\b${d20} \\+ 5 = `).test(player), "the player reads the dice: " + player);
    await page.screenshot({ path: shots + "r1-08-blind-player-card-it-1440.png" });
    await closeDialog();
    await setRole("dm");
    const dm = await results();
    check(
      new RegExp(`${d20}(?: \\+ \\[\\d\\] \\(\\w+\\))? \\+ 5 = \\d+`).test(dm),
      "DM card: " + dm,
    );
    const labels = (await stored()).log.map((e) => e.label);
    check(
      labels.some((l) => /danno critico dichiarato: Colpo alle spalle/.test(l)),
      "log label: " + labels.slice(-4).join(" | "),
    );
    passed.push(
      `1. TV-89 1440: right-click on Fire Bolt shows ${items.length} items (${items.join(" · ")}); «Solo il DM» + «Danno critico» (reason «Colpo alle spalle»): the player's card reads «Risultato riservato al DM», the DM's shows the d20 ${d20}; the log names the declared critical`,
    );
    await closeDialog();

    // ------------------------------------------------------------------ 2. DM «Solo DM»
    step = "dm only";
    await page.locator('.table-topline [data-table="scenes"]').click();
    await page.locator('#dialog [data-table-scene-activate="road-ambush"]').click();
    await page.waitForTimeout(400);
    await closeDialog();
    await table();
    const warrior = page.locator('.map-token[data-actor="goblin-warrior-a"]');
    await warrior.click();
    const attacks = page.locator('.combat-action[data-combat-kind="attack"]');
    await attacks.first().waitFor();
    const names = await attacks.allInnerTexts();
    const bowIndex = names.findIndex((n) => /arco/i.test(n));
    const chosen = attacks.nth(bowIndex >= 0 ? bowIndex : 0);
    const actionId = await chosen.getAttribute("data-combat-action");
    await chosen.click({ button: "right" });
    const dmItems = await menuItems();
    check(dmItems.includes("Solo DM"), "DM audiences: " + dmItems.join(" | "));
    await page.locator('.combat-roll-menu [data-combat-menu-audience="self"]').click();
    await page.locator('.map-token[data-actor="livia"]').click();
    await settleDice();
    await page.waitForTimeout(300);
    const own = (await stored()).combatAttempts.at(-1);
    check(own.actorId === "goblin-warrior-a" && own.audience === "self", "DM «Solo DM» attempt");
    const values = own.requests.find((r) => r.kind === "attack")?.values ?? [];
    await closeDialog();
    await setRole("player");
    const log = await logText();
    await results();
    // The attack targets Livia, so its card is the player's; its dice stay with the DM.
    const card =
      (await page.locator("#dialog[open] .attempt-result").allInnerTexts()).find((c) =>
        c.startsWith("Goblin guerriero A"),
      ) ?? "";
    check(!/Goblin guerriero A · .*Attacco/.test(log), "the player's log shows the roll: " + log);
    check(card && !/= \d+/.test(card), "the player's card shows the dice: " + card);
    await page.screenshot({ path: shots + "r1-09-dm-only-player-log-it-1440.png" });
    passed.push(
      `2. TV-89: the DM's «Solo DM» ${actionId} of Goblin guerriero A on Livia (d20 ${values.join("+")}): no roll in the player's log; the player's card «${card.split("\n").slice(0, 2).join(" · ")}» shows no dice`,
    );
    await context.close();

    // ------------------------------------------------------------------ 3. long press 390
    step = "long press";
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    page = await context.newPage();
    watch(page);
    await table();
    await page.locator("#demo-role").selectOption("player");
    await page.waitForTimeout(200);
    await page.locator('.map-token[data-actor="livia"]').tap();
    const phoneBolt = page.locator('[data-combat-action="fire-bolt"]');
    await phoneBolt.scrollIntoViewIfNeeded();
    const box = await phoneBolt.boundingBox();
    const at = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 };
    await phoneBolt.dispatchEvent("pointerdown", { ...at, button: 0, pointerType: "touch" });
    await page.waitForTimeout(700);
    await page.locator(".combat-roll-menu").waitFor();
    const phoneItems = await menuItems();
    await page.screenshot({ path: shots + "r1-10-longpress-menu-it-390.png" });
    await phoneBolt.dispatchEvent("pointerup", { ...at, button: 0, pointerType: "touch" });
    check(
      phoneItems.some((i) => /^Danno critico/.test(i)),
      "phone menu: " + phoneItems.join(" | "),
    );
    check(phoneItems.includes("Solo il DM"), "phone audiences: " + phoneItems.join(" | "));
    const menuBox = await page.locator(".combat-roll-menu").boundingBox();
    check(
      menuBox.x >= 0 && menuBox.x + menuBox.width <= 390 && menuBox.y >= 0,
      "menu inside the screen: " + JSON.stringify(menuBox),
    );
    await page.locator(".combat-roll-menu [data-combat-menu-critical]").tap();
    await page.locator("#combat-detail").waitFor();
    check(
      await page.locator('#combat-detail [data-combat-flag="forceCritical"]').isChecked(),
      "phone: «Danno critico» ticked",
    );
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    check(width <= 390, "the phone page widens to " + width);
    await page.locator("#combat-detail [data-combat-flag=forceCritical]").scrollIntoViewIfNeeded();
    await page.screenshot({ path: shots + "r1-12-phone-detail-it-390.png" });
    passed.push(
      `3. TV-89 390 touch: a long press on Fire Bolt opens the menu inside the screen (${phoneItems.join(" · ")}); «Danno critico» ticks the detail; page width ${width} px`,
    );
  } catch (error) {
    await page.screenshot({ path: shots + "r1-menu-failure.png" }).catch(() => {});
    await context.close();
    return JSON.stringify({ failedAt: step, error: error.message, passed, errors });
  }
  await context.close();
  return JSON.stringify({ passed, errors });
}
