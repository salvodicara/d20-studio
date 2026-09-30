async (rootPage) => {
  // R1 fix package (round 2), privacy of «Tiri e risultati», IT desktop 1440 × 900:
  // TV-141 (FG ID toggle, Foundry Anonymous): Livia attacks the Sentinella, then the DM hides
  // its name from the token menu; the player's «Tiri e risultati» never shows «Sentinella»
  // again (old and new cards), the DM keeps the true name. TV-92 (dnd5e request card): the
  // DM asks the Sentinella and Livia for a Dexterity save from the dice tray; the player's
  // list holds Livia's request only. Synthetic demo data only; resets this browser's example.
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept().catch(() => {}));
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
  const results = async () => {
    await closeDialog();
    await page.locator("[data-combat-requests]").first().click();
    await page.locator("#dialog[open]").waitFor();
    await page.waitForTimeout(150);
    return page.locator("#dialog[open] .combat-results").innerText();
  };
  const openTablePanel = async (id) => {
    const now = () => page.locator("#table-sidebar-panel").getAttribute("data-table-panel");
    if ((await now()) === id) return;
    if (!(await page.locator(`.table-subtabs [data-table-subtab="${id}"]`).count())) {
      const section = await page
        .locator(`.table-panel-index [data-table-drawer="${id}"]`)
        .first()
        .getAttribute("data-table-section-of");
      await page.locator(`.table-tabs [data-table-tab="${section}"]`).click();
    }
    if ((await now()) !== id)
      await page.locator(`.table-subtabs [data-table-subtab="${id}"]`).click();
    await page.waitForFunction(
      (i) => document.querySelector("#table-sidebar-panel")?.dataset.tablePanel === i,
      id,
    );
  };
  let step = "setup";
  try {
    await table();
    await button("Ripristina esempio").click();
    await button("Ripristina").click();
    await page.locator("#battle-map").waitFor();
    await setRole("player");

    // ------------------------------------------------------------------ 1. TV-141
    step = "attack before the disguise";
    await page.locator('.map-token[data-actor="livia"]').click();
    await page.locator('[data-combat-action="fire-bolt"]').click();
    // Round-2 regression (29/09/2026): step 2 asks the Sentinella for a save, and a dead
    // creature is (rightly) no request target; a digital Fire Bolt of 7 or more killed it
    // (7 HP) in the final run. The page's random source gives this attack a hit of 15 and 1
    // fire damage, then is restored (the same technique as encounter-builder-journey).
    await page.evaluate(
      (faces) => {
        const own = crypto.getRandomValues.bind(crypto);
        crypto.getRandomValues = (arr) => {
          if (arr instanceof Uint32Array && arr.length === 1 && faces.length) {
            arr[0] = faces.shift() - 1;
            if (!faces.length) crypto.getRandomValues = own;
            return arr;
          }
          return own(arr);
        };
      },
      [15, 1],
    );
    await page.locator('.map-token[data-actor="goblin-1"]').click();
    await settleDice();
    check((await stored()).actors["goblin-1"].hp > 0, "the Sentinella did not survive the attack");
    let text = await results();
    check(/Sentinella/.test(text), "before the disguise the player reads the name: " + text);
    step = "disguise";
    await closeDialog();
    await setRole("dm");
    await page.locator('#battle-map [data-actor="goblin-1"]').click({ button: "right" });
    const menu = page.locator("body > .token-menu");
    await menu.waitFor();
    await menu.locator('[data-token-menu-category="visibility"]').click();
    await menu.locator('[data-token-menu-item="token-menu-hide-name"]').click();
    await page.waitForTimeout(200);
    await page.keyboard.press("Escape");
    // Visual pass 2 (30/09/2026): «Tiri e risultati» moved beside the hotbar, where the token
    // menu (back on its main view after one Escape) now covers it: close the menu itself.
    for (let i = 0; i < 3 && (await menu.isVisible()); i++) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(100);
    }
    check(!(await menu.isVisible()), "the token menu did not close");
    const alias = (await stored()).actors["goblin-1"].name;
    check(alias !== "Sentinella", "the name is hidden: " + alias);
    const dmText = await results();
    check(/Sentinella/.test(dmText), "the DM keeps the true name: " + dmText);
    await closeDialog();
    await setRole("player");
    text = await results();
    check(!/Sentinella/.test(text), "the player's list still names the Sentinella: " + text);
    check(text.includes(alias), "the player's list shows the disguise " + alias);
    await page.screenshot({ path: shots + "r1-05-disguise-player-it-1440.png" });
    passed.push(
      `1. TV-141: after the DM hid the name, the player's «Tiri e risultati» shows «${alias}» on the attack made before (no «Sentinella»); the DM's shows «Sentinella»`,
    );

    // ------------------------------------------------------------------ 2. TV-92
    step = "requests";
    await closeDialog();
    await setRole("dm");
    await openTablePanel("dice-tray");
    await page.locator('[data-dtray-section="requests"]').click();
    const form = page.locator("[data-dtray-request-form]");
    await form.waitFor();
    await form
      .locator('[data-dtray-rq="kind"]')
      .selectOption("save")
      .catch(() => {});
    await form
      .locator('[data-dtray-rq="ability"]')
      .selectOption("dex")
      .catch(() => {});
    await form.locator('[data-dtray-rq="dc"]').fill("12");
    // The group request starts with the party ticked: keep Livia, add the Sentinella.
    await form.locator('[data-dtray-rq-target][value="goblin-1"]').check();
    for (const value of await form
      .locator("[data-dtray-rq-target]:checked")
      .evaluateAll((boxes) => boxes.map((b) => b.value)))
      if (!["livia", "goblin-1"].includes(value))
        await form.locator(`[data-dtray-rq-target][value="${value}"]`).uncheck();
    await form.locator("[data-dtray-request-send]").click();
    await page.waitForTimeout(300);
    const asked = (await stored()).combatAttempts.filter((a) => a.kind === "roll-request");
    check(asked.length === 2, "two requests: " + asked.map((a) => a.actorId).join(","));
    const dmList = await results();
    await closeDialog();
    await setRole("player");
    text = await results();
    const cards = await page.locator("#dialog[open] .attempt-result").allInnerTexts();
    const requestCards = cards.filter((c) => /Richiesta del DM/.test(c));
    check(requestCards.length === 1, "player request cards: " + requestCards.join(" | "));
    check(/^Livia/.test(requestCards[0]), "Livia's request: " + requestCards[0]);
    check(
      !/Sentinella/.test(text) && !text.includes(alias + " · Richiesta"),
      "DM creature: " + text,
    );
    await page.screenshot({ path: shots + "r1-06-requests-player-it-1440.png" });
    passed.push(
      `2. TV-92: the DM asked the Sentinella and Livia for a DEX save; the DM's list has ${(dmList.match(/Richiesta del DM/g) ?? []).length} request cards, the player's only Livia's («${requestCards[0].split("\n")[0]}»)`,
    );
    await closeDialog();
  } catch (error) {
    await page.screenshot({ path: shots + "r1-privacy-failure.png" }).catch(() => {});
    await context.close();
    return JSON.stringify({ failedAt: step, error: error.message, passed, errors });
  }
  await context.close();
  return JSON.stringify({ passed, errors });
}
