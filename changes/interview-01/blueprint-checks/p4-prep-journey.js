async (rootPage) => {
  // P4 DM-tool fixes in the one app, real clicks and touch, from a clean state:
  // PR-55 «Genera…» › Tesoro: a CR hoard put into a hidden Treasure parcel (IT and EN);
  // PR-17 a furnished dungeon draft saved with «Salva preparazione» brings its objects;
  // TV-133 the camp's hour sets the watch plan and «Controlla la guardia» logs Perception;
  // PR-62 the multi-sided token tool opens the table picker; «Lati…» on the goblin's token.
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
  const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const run = async (viewport, lang, touch, full) => {
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`${lang} ${viewport.width}: ${error.message}`));
    const press = (l) => (touch ? l.tap() : l.click());
    const t = (it, en) => (lang === "it" ? it : en);
    const close = async () => {
      for (let i = 0; i < 3 && (await page.locator("#dialog[open]").count()); i++) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(150);
      }
    };
    await page.goto(base + "#preparation");
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await page.locator("#demo-role").selectOption("dm");
    await page.waitForFunction(() => document.querySelector("#demo-role").value === "dm");
    if (lang === "en") {
      await press(page.locator('[data-service="preferences"]'));
      await page.locator('#dialog [name="lang"]').selectOption("en");
      await press(page.locator('#dialog button[type="submit"]'));
    }
    // PR-55: «Genera…» › Tesoro › «Metti nel bottino».
    await press(page.locator('[data-prep-command="generators.open"]'));
    await press(page.locator('#dialog [data-gen-kind="treasure"]'));
    await page.locator('#dialog [data-gen-opt="treasure.cr"]').selectOption("5");
    await page.locator("#dialog [data-gen-treasure]").waitFor();
    await page.screenshot({ path: `${dir}p4-prep-${lang}-${viewport.width}-treasure.png` });
    const parcels = (await stored(page))?.ext?.loot?.parcels?.length ?? 0;
    await press(page.locator('#dialog [data-gen-act="treasure-loot"]'));
    await page.waitForFunction(
      ([k, n]) => JSON.parse(localStorage.getItem(k)).ext.loot.parcels.length === n + 1,
      [key, parcels],
    );
    const parcel = (await stored(page)).ext.loot.parcels.at(-1);
    check(parcel.revealed === false && parcel.coins.gp > 0, "hidden parcel with coins");
    await page.waitForFunction(() => location.hash.includes("tab=loot"));
    passed.push(
      `${lang} ${viewport.width}: CR 5 hoard → hidden Treasure parcel (${parcel.coins.gp} gp)`,
    );
    if (full) {
      // PR-17: furnished dungeon → draft → save → objects.
      await page.goto(base + "#preparation");
      await press(page.locator('[data-prep-command="generators.open"]'));
      await press(page.locator('#dialog [data-gen-kind="dungeon"]'));
      await page.locator("#dialog .gen-prop").first().waitFor();
      await page.screenshot({ path: `${dir}p4-prep-${lang}-${viewport.width}-dungeon.png` });
      await press(page.locator('#dialog [data-gen-act="dungeon-open"]'));
      await page.locator("[data-prep-save]").waitFor();
      await press(page.locator("[data-prep-save]"));
      await page.waitForFunction((k) => {
        const s = JSON.parse(localStorage.getItem(k));
        const scene = s.scenes.find((x) => x.id.startsWith("gen-dungeon-"));
        return scene && (s.ext["scene-assets"]?.props?.[scene.id] ?? []).length > 0;
      }, key);
      passed.push(`${lang} ${viewport.width}: saved dungeon has its furniture objects`);
      // TV-133: camp at 20:00, then check the watch.
      await page.goto(base + "#table?tab=travel-camp");
      await page.locator("#battle-map").waitFor();
      await page.locator("[data-travel-camp-at]").waitFor();
      await page.locator("[data-travel-camp-at]").fill("20:00");
      await page.locator("[data-travel-camp-at]").dispatchEvent("change");
      await page.locator("[data-travel-watch-plan]", { hasText: "20:00" }).waitFor();
      await press(page.locator('[data-travel-camp-start] button[type="submit"]'));
      await page.locator("[data-travel-camp-watch]").waitFor();
      await press(page.locator("[data-travel-camp-watch]"));
      await press(page.locator('#dialog button[type="submit"]'));
      await page.waitForFunction((k) => {
        const c = JSON.parse(localStorage.getItem(k)).ext.travel.campaigns.lanterns;
        return (c.camp?.events ?? []).some((e) => e.watch);
      }, key);
      await page.screenshot({ path: `${dir}p4-prep-${lang}-${viewport.width}-camp.png` });
      passed.push(`${lang} ${viewport.width}: camp at 20:00; watch checked and logged`);
      await close();
      // PR-62: the tool opens the picker; «Lati…» on the goblin.
      await page.goto(base + "#table");
      await page.locator("#battle-map").waitFor();
      await press(page.locator('[data-tool-group="dm"]'));
      await press(page.locator('[data-tool="random-tables-place"]'));
      await page.locator("#dialog [data-rt-token-picker]").waitFor();
      await press(page.locator('#dialog input[name="table"]').first());
      await press(page.locator('#dialog button[type="submit"]'));
      await page
        .locator("#map-message", { hasText: t("Clicca sulla mappa", "Click the map") })
        .waitFor();
      passed.push(`${lang} ${viewport.width}: token tool opens the table picker`);
      await page.keyboard.press("Escape");
      await page.locator('#battle-map [data-actor="goblin-1"]').click({ button: "right" });
      const menu = page.locator("body > .token-menu");
      await menu.waitFor();
      if (!(await menu.locator('[data-token-menu-item="random-tables-sides"]').count()))
        await press(menu.locator('[data-token-menu-category="look"]'));
      await press(menu.locator('[data-token-menu-item="random-tables-sides"]'));
      await press(page.locator('#dialog input[name="side"][value="v-goblin-1-b"]'));
      await press(page.locator('#dialog button[type="submit"]'));
      await page.waitForFunction(
        (k) =>
          JSON.parse(localStorage.getItem(k)).ext.media.looks["goblin-1"].token.active ===
          "v-goblin-1-b",
        key,
      );
      passed.push(`${lang} ${viewport.width}: «Lati…» turns the goblin's token`);
    }
    await context.close();
  };
  await run({ width: 1440, height: 900 }, "it", false, true);
  await run({ width: 390, height: 844 }, "en", true, false);
  check(!errors.length, "page errors: " + errors.join(" | "));
  return passed.join("\n");
}
