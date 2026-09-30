async (rootPage) => {
  // R5 TV-46 (D&D Beyond's sheet roll, Foundry's d20 on the player's own combatant row): the
  // DM starts combat at the Table; in another tab the player sees «Tira l'iniziativa» on
  // Livia's row, rolls, and the DM's open start dialog re-sorts without a reload. Desktop
  // 1440 × 900 (mouse, IT) then a 390 × 844 touch phone (tap, EN). Synthetic demo data only;
  // resets the demo. Both identities share one browser context, as two tabs of one device.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R5/";
  const browser = rootPage.context().browser();
  const passed = [],
    errors = [];
  let step = "setup";
  const at = (name) => (step = name);
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const watch = (page) => {
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
    page.on("dialog", (d) => d.accept().catch(() => {}));
  };
  const role = async (page, value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
  };
  // Language is a per-tab preference: set it from Preferences on the home page.
  const english = async (page) => {
    await page.goto(base + "#home");
    await page.locator('[data-service="preferences"]').first().click();
    await page.locator("#dialog [name=lang]").selectOption("en");
    await page.locator("#dialog button[type=submit]").click();
    await page.locator("#dialog[open]").waitFor({ state: "detached" });
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
  };
  const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const settle = async (page) => {
    const layer = page.locator("[data-dice3d-layer]:not([hidden])");
    await layer.waitFor({ timeout: 600 }).catch(() => {});
    for (let i = 0; i < 6 && (await layer.count()); i++) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);
    }
  };
  const openCombatTab = async (page) => {
    const tab = page.locator('[data-table-section="combat"]').first();
    if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
    const sub = page.locator('[data-table-subtab][data-table-drawer="combat-tracker"]');
    if ((await sub.count()) && (await sub.getAttribute("aria-selected")) !== "true")
      await sub.click();
  };
  const run = async (options, { touch, inEnglish }) => {
    const context = await browser.newContext(options);
    const dm = await context.newPage();
    watch(dm);
    const tag = touch ? "phone" : "desk";
    try {
      at(tag + " reset");
      await dm.goto(base + "#table");
      await dm.locator("#battle-map").waitFor();
      await role(dm, "dm");
      await dm.getByRole("button", { name: "Ripristina esempio", exact: true }).click();
      await dm.getByRole("button", { name: "Ripristina", exact: true }).click();
      await dm.locator("#battle-map").waitFor();
      await role(dm, "dm");
      const player = await context.newPage();
      watch(player);
      await player.goto(base + "#table");
      await player.locator("#battle-map").waitFor();
      if (inEnglish) {
        await english(dm);
        await english(player);
      }
      check(
        (await player.locator("#demo-role").inputValue()) === "player",
        "second tab is the player",
      );
      passed.push(tag + ": two tabs, DM and player");

      at(tag + " DM starts combat");
      await dm.locator('[data-table="combat"]').click();
      const dialog = dm.locator("[data-ct-start-dialog]");
      await dialog.waitFor();
      await dm.locator('[data-ct-start-waiting="livia"]').waitFor();
      // The DM rolls the NPCs first (Foundry «Roll NPCs»), so the player's roll must re-sort.
      await dm.locator('[data-ct-start-roll="npc"]').click();
      await settle(dm);
      await dm
        .locator('[data-ct-start-row="goblin-1"] [data-ct-start-total]')
        .filter({ hasText: /\d/ })
        .waitFor();
      await dm.screenshot({ path: dir + `r5-${tag}-01-dm-start-dialog.png` });
      passed.push(tag + ": start dialog waits for Livia's player");

      const before = await dm
        .locator("[data-ct-start-row]")
        .evaluateAll((rows) => rows.map((row) => row.dataset.ctStartRow));
      at(tag + " player sees «Tira l'iniziativa» on Livia's row");
      await player.locator("#ct-alert[data-key^='initiative:']").waitFor({ timeout: 5000 });
      await openCombatTab(player);
      const own = player.locator('[data-ct-own-roll="livia"]');
      await own.waitFor();
      check(/Tira l’iniziativa|Roll initiative/.test(await own.innerText()), "own roll label");
      check(
        (await player
          .locator('[data-ct-own-roll="goblin-1"], [data-ct-own-roll="doran"]')
          .count()) === 0,
        "no roll for the DM's creatures",
      );
      await player.screenshot({ path: dir + `r5-${tag}-02-player-rollcall.png` });
      if (touch) await own.tap();
      else await own.click();
      await settle(player);
      await player.locator('[data-ct-own-roll="livia"]').waitFor({ state: "detached" });
      const state = await stored(player);
      const entry = state.initiativeRolls.findLast((r) => r.actorId === "livia");
      check(
        entry?.controller === "player" && entry.visibility === "shared",
        "player's ledger entry",
      );
      passed.push(tag + ": player rolled " + entry.total + " for Livia");

      at(tag + " DM order re-sorts without reload");
      await dm.locator('[data-ct-start-by="livia"]').waitFor({ timeout: 5000 });
      const said = await dm.locator('[data-ct-start-by="livia"]').innerText();
      check(said.includes(String(entry.total)), "DM reads Livia's total: " + said);
      const after = await dm
        .locator("[data-ct-start-row]")
        .evaluateAll((rows) => rows.map((row) => row.dataset.ctStartRow));
      check(await dialog.isVisible(), "the dialog stayed open");
      const totals = await dm
        .locator(".ct-start-row.is-included [data-ct-start-total]")
        .allInnerTexts();
      const numbers = totals.filter((x) => /^\d+$/.test(x)).map(Number);
      check(
        numbers.every((n, i) => i === 0 || numbers[i - 1] >= n),
        "sorted: " + totals.join(","),
      );
      await dm.screenshot({ path: dir + `r5-${tag}-03-dm-resorted.png` });
      passed.push(tag + `: DM order ${before.join(">")} → ${after.join(">")}`);

      at(tag + " DM rolls the rest and starts");
      await dm.locator('[data-ct-start-roll="all"]').click();
      await settle(dm);
      await dm.locator("#dialog button[type=submit]").click();
      await dm.locator("#dialog[open]").waitFor({ state: "detached" });
      const started = await stored(dm);
      check(started.combat.active === true, "combat started");
      check(
        started.initiativeRolls.filter((r) => r.actorId === "livia").length === 1,
        "the player's roll was used once",
      );
      passed.push(tag + ": combat started with the player's roll");
    } finally {
      await context.close();
    }
  };
  try {
    await run({ viewport: { width: 1440, height: 900 } }, { touch: false });
    await run(
      {
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 2,
      },
      { touch: true, inEnglish: true },
    );
  } catch (error) {
    return JSON.stringify({ ok: false, step, error: error.message, passed, errors });
  }
  return JSON.stringify({ ok: errors.length === 0, passed, errors });
}
