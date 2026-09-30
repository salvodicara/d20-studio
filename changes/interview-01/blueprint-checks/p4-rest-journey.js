async (rootPage) => {
  // P4 rest fixes in the one app, real clicks and touch, from a clean state (one browser,
  // both roles with «Visita come»): PG-81 the player's Short Rest shows the Hit Dice from the
  // start and waits for the DM; CA-77 the DM is told, opens the running rest from «Riposi»
  // and «Completa per tutti»; the player gets the Hit Dice request from the bell, spends a
  // die and reads the HP in the summary; the DM's group rest preselects the whole party;
  // PG-80 after a Long Rest the choices to change are offered. IT desktop, EN phone touch.
  // Synthetic demo data only; resets this browser's state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P4/";
  const browser = rootPage.context().browser();
  const passed = [],
    errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const role = async (page, value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
  };
  const run = async (viewport, lang, touch, withLong) => {
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`${lang} ${viewport.width}: ${error.message}`));
    const press = (l) => (touch ? l.tap() : l.click());
    const t = (it, en) => (lang === "it" ? it : en);
    const panel = page.locator("#dialog [data-rest-panel]");
    const close = async () => {
      for (let i = 0; i < 3 && (await page.locator("#dialog[open]").count()); i++) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(150);
      }
    };
    await page.goto(base + "#characters?id=livia");
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await page.locator('[data-character-action="rest"]').first().waitFor();
    await role(page, "player");
    if (lang === "en") {
      await press(page.locator('[data-service="preferences"]'));
      await page.locator('#dialog [name="lang"]').selectOption("en");
      await press(page.locator('#dialog button[type="submit"]'));
    }
    // PG-81: the player's rest dialog shows the Hit Dice at once.
    await press(page.locator('[data-character-action="rest"]').first());
    await panel.waitFor();
    check(
      /d6 2\/3/.test(await page.locator('[data-rest-hit-dice-line="livia"]').innerText()),
      "Hit Dice visible at the start",
    );
    await press(page.locator("[data-rest-preview-start]"));
    await press(page.locator("[data-rest-start]"));
    await page.locator('[data-rest-waiting="livia"]').waitFor();
    check(
      /DM/.test(await page.locator('[data-rest-waiting="livia"]').innerText()),
      "the player is told the DM advances time",
    );
    passed.push(`${lang} ${viewport.width}: Hit Dice at the start; waiting for the DM`);
    await close();
    // CA-77: the DM is told and completes the rest for all from the Table.
    await role(page, "dm");
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await press(page.locator('[data-service="requests"]'));
    await page
      .locator("#dialog", { hasText: t("in attesa del tempo", "waiting for game time") })
      .waitFor();
    passed.push(`${lang} ${viewport.width}: DM bell names the rest waiting for time`);
    await close();
    if (await page.locator("#dialog[open]").count())
      throw Error("open dialog: " + (await page.locator("#dialog-title").innerText()));
    await press(page.locator('[data-table="rests"]'));
    await page.locator("[data-rest-complete-all]").waitFor();
    await page.screenshot({ path: `${dir}p4-rest-${lang}-${viewport.width}-dm-running.png` });
    await press(page.locator("[data-rest-complete-all]"));
    await page.waitForFunction(
      (k) =>
        (JSON.parse(localStorage.getItem(k)).restTime?.rests ?? []).some((r) =>
          r.participants.some((p) => p.status === "completed"),
        ),
      key,
    );
    passed.push(`${lang} ${viewport.width}: «Completa per tutti» from the Table's «Riposi»`);
    await close();
    // The player: the bell asks for the Hit Dice; one die, HP in the summary.
    await role(page, "player");
    await press(page.locator('[data-service="requests"]'));
    const ask = page.locator("#dialog [data-notifications-open], #dialog [data-ext-notification]", {
      hasText: t("Dadi Vita", "Hit Dice"),
    });
    await ask.first().waitFor();
    await press(ask.first());
    await page.locator('[data-rest-hit-die="livia"]').waitFor();
    await press(page.locator('[data-rest-hit-die="livia"]'));
    await page.locator('[data-rest-hd-summary="livia"]').waitFor();
    check(
      /\+\d+ \(\d+ → \d+\)/.test(await page.locator('[data-rest-hd-summary="livia"]').innerText()),
      "HP from Hit Dice in the summary",
    );
    await page.screenshot({ path: `${dir}p4-rest-${lang}-${viewport.width}-hd-summary.png` });
    passed.push(`${lang} ${viewport.width}: player spends a Hit Die; HP in the summary`);
    await close();
    // CA-77: the DM's group rest starts with the whole party chosen.
    await role(page, "dm");
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await press(page.locator('[data-table="rests"]'));
    await page.locator("[data-rest-all-party]").waitFor();
    const boxes = page.locator("[data-rest-participant]");
    const n = await boxes.count();
    for (let i = 0; i < n; i++) check(await boxes.nth(i).isChecked(), "participant preselected");
    passed.push(`${lang} ${viewport.width}: DM group rest preselects ${n} party members`);
    if (withLong) {
      // PG-80: a Long Rest for all, then the choices to review.
      await page.locator("[data-rest-kind]").selectOption("long");
      await press(page.locator("[data-rest-preview-start]"));
      await press(page.locator("[data-rest-start]"));
      await press(page.locator("[data-rest-complete-all]"));
      await page.locator("[data-rest-after-long]").first().waitFor();
      check(await page.locator('[data-rest-prepare="livia"]').count(), "prepared spells offered");
      check(
        await page.locator('[data-rest-reselect="doran-weapon-mastery"]').count(),
        "Weapon Mastery offered",
      );
      await page.screenshot({ path: `${dir}p4-rest-${lang}-${viewport.width}-after-long.png` });
      await press(page.locator('[data-rest-prepare="livia"]'));
      await page.waitForFunction(() => location.hash.includes("tab=spells"));
      passed.push(`${lang} ${viewport.width}: after the Long Rest: spells and masteries`);
    }
    await context.close();
  };
  await run({ width: 1440, height: 900 }, "it", false, true);
  await run({ width: 390, height: 844 }, "en", true, false);
  check(!errors.length, "page errors: " + errors.join(" | "));
  return passed.join("\n");
}
