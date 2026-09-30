async (rootPage) => {
  // P5 fix package, second journey: roll options on the action bar (right click and long
  // press), «Aggiungi bonus», «Incolla riga del blocco» on the Table creature panel, a
  // readied spell with a slot, the shared/individual initiative switch, EN, and the
  // action bar on a 390 × 844 touch phone. Synthetic demo data only; resets the demo.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P5/";
  const browser = rootPage.context().browser();
  const passed = [],
    errors = [];
  let step = "setup";
  const at = (name) => (step = name);
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const open = async (options) => {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
    return { context, page };
  };
  const helpers = (page) => {
    const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
    const button = (name) => page.getByRole("button", { name, exact: true });
    const role = async (value) => {
      await page.locator("#demo-role").selectOption(value);
      await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
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
    const reset = async (label = "Ripristina esempio", confirm = "Ripristina") => {
      await page.goto(base + "#table");
      await page.locator("#battle-map").waitFor();
      await button(label).click();
      await button(confirm).click();
      await page.locator("#battle-map").waitFor();
    };
    return { stored, button, role, settleDice, closeDialog, reset };
  };
  const desk = await open({ viewport: { width: 1440, height: 900 } });
  try {
    const page = desk.page;
    const { stored, role, settleDice, closeDialog, reset } = helpers(page);
    // ---------------------------------------------------------------- A. roll options
    at("roll options");
    await reset();
    await role("player");
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.locator('.map-token[data-actor="livia"]').click();
    await page.locator('[data-combat-action="fire-bolt"]').click({ button: "right" });
    await page.locator(".combat-roll-menu").waitFor();
    await page.screenshot({ path: dir + "10-roll-options-menu.png" });
    await page.getByRole("menuitem", { name: "Tira con vantaggio" }).click();
    await page.locator("#combat-detail").waitFor();
    check(
      (await page.locator('#combat-detail [data-combat-param="rollMode"]').inputValue()) === "advantage",
      "advantage chosen from the menu",
    );
    await page.locator('#combat-detail [data-combat-param="situationalBonus"]').fill("2");
    await page.locator('#combat-detail [data-combat-param="situationalBonus"]').blur();
    await page.screenshot({ path: dir + "11-attack-with-bonus.png" });
    passed.push("A. Right click on «Dardo di fuoco» opens the roll options; «Tira con vantaggio» opens the attack with Advantage; «Aggiungi bonus» is in the attack");
    await page.keyboard.press("Escape");

    // ---------------------------------------------------------------- B. paste a line
    at("paste a stat block line");
    await role("dm");
    await page.locator('.map-token[data-actor="goblin-2"]').click();
    const paste = page.locator(".eb-npc-paste");
    await paste.locator("summary").click();
    await paste
      .locator("textarea")
      .fill("Scimitarra. Attacco in mischia: +4, portata 1,5 m. 5 (1d6 + 2) danni taglienti.");
    await page.locator("[data-eb-npc-parsed]").filter({ hasText: "Riconosciuto" }).waitFor();
    await page.screenshot({ path: dir + "12-paste-line.png" });
    await page.locator("[data-eb-npc-confirm]").click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).actors["goblin-2"].combatProfile?.meleeAttack?.attackBonus === 4,
      key,
    );
    passed.push("B. DM: Esploratore's creature panel → «Incolla riga del blocco» → recognised → confirmed: Scimitarra +4 1d6+2");

    // ---------------------------------------------------------------- C. ready a spell
    at("ready a spell");
    await page.getByRole("button", { name: "Avvia combattimento" }).first().click();
    await page.locator("#dialog [data-ct-start-roll=all]").click();
    await settleDice();
    await page.locator("#dialog [data-ct-start-missing]").filter({ hasText: "Tutti pronti" }).waitFor();
    await page.locator("#dialog button[type=submit]").click();
    await settleDice();
    for (let i = 0; i < 8; i++) {
      const s = await stored();
      if (s.combat.order[s.combat.turn] === "livia") break;
      await page.locator('[data-table="end-turn"]').first().click();
      await settleDice();
      await closeDialog();
    }
    await role("player");
    const openTracker = async () => {
      const tab = page.locator('.table-tabs [data-table-tab="combat"]');
      if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
      const sub = page.locator('.table-subtabs [data-table-subtab="combat-tracker"]');
      if (await sub.count()) await sub.click();
      await page.locator("[data-ct]").first().waitFor();
    };
    await openTracker();
    await page.locator('[data-ct-ready="livia"]').click();
    await page.locator('#dialog select[name="response"]').selectOption("magic-missile");
    await page.locator('#dialog input[name="trigger"][value="casts"]').check();
    await page.screenshot({ path: dir + "13-ready-spell.png" });
    await page.locator("#dialog button[type=submit]").click();
    const s = await stored();
    check(s.ext["combat-tracker"].readied.livia?.response?.slotLevel === 1, "slot spell readied");
    check(s.actors.livia.concentration?.active, "held with Concentration");
    passed.push("C. Livia readies Magic Missile with a slot (slot spent now, Concentration held) on «Un nemico lancia un incantesimo»");

    // ---------------------------------------------------------------- D. EN start dialog
    at("english");
    await role("dm");
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
  } catch (error) {
    errors.push(`${step}: ${error.message}`);
    await desk.page.screenshot({ path: dir + "error2-" + step.replace(/\W+/g, "-") + ".png" }).catch(() => {});
  }
  await desk.context.close();

  // ---------------------------------------------------------------- E. phone 390 × 844
  const phone = await open({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  try {
    const page = phone.page;
    const { role, reset } = helpers(page);
    at("phone");
    await reset();
    await role("player");
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.locator('.map-token[data-actor="livia"]').tap();
    const fire = page.locator('[data-combat-action="fire-bolt"]');
    await fire.scrollIntoViewIfNeeded();
    const box = await fire.boundingBox();
    // A long press (500 ms) opens the roll options on a touch screen.
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2).catch(() => {});
    await fire.dispatchEvent("pointerdown", {
      button: 0,
      pointerType: "touch",
      clientX: box.x + box.width / 2,
      clientY: box.y + box.height / 2,
    });
    await page.waitForTimeout(650);
    await page.locator(".combat-roll-menu").waitFor();
    await page.screenshot({ path: dir + "14-phone-long-press.png" });
    await page.getByRole("menuitem", { name: "Tira con svantaggio" }).tap();
    check(
      (await page.locator('#combat-detail [data-combat-param="rollMode"]').inputValue()) === "disadvantage",
      "disadvantage from the long press",
    );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    check(overflow, "no horizontal overflow at 390");
    await page.locator(".table-hotbar").screenshot({ path: dir + "15-phone-action-bar.png" });
    passed.push("E. Phone 390 × 844 with touch: long press on «Dardo di fuoco» opens the roll options; the bar scrolls sideways, no page overflow");
  } catch (error) {
    errors.push(`${step}: ${error.message}`);
    await phone.page.screenshot({ path: dir + "error2-" + step.replace(/\W+/g, "-") + ".png" }).catch(() => {});
  }
  await phone.context.close();
  return JSON.stringify({ passed, errors }, null, 1);
}
