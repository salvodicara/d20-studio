async (rootPage) => {
  // P4 shared edits in the one app, real clicks and touch, from a clean state:
  // PG-62 «Sfoglia la biblioteca» from Livia's inventory: «Aggiungi» on the result row
  // (D&D Beyond «Add» per result) adds a dagger to her, back on her inventory;
  // TV-70 the quick bar's «Usa un oggetto» opens the wand's use with its targets, at the
  // Table. IT desktop, EN phone touch. Synthetic demo data only; resets this browser's state.
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
  const run = async (viewport, lang, touch) => {
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`${lang} ${viewport.width}: ${error.message}`));
    const press = (l) => (touch ? l.tap() : l.click());
    await page.goto(base + "#characters?id=livia&tab=inventory");
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await page.locator("#demo-role").selectOption("player");
    await page.waitForFunction(() => document.querySelector("#demo-role").value === "player");
    if (lang === "en") {
      await press(page.locator('[data-service="preferences"]'));
      await page.locator('#dialog [name="lang"]').selectOption("en");
      await press(page.locator('#dialog button[type="submit"]'));
    }
    // PG-62: the Library opened for Livia's inventory, «Aggiungi» on the dagger's row.
    await page.goto(
      base +
        "#library?tab=compendium&returnTo=" +
        encodeURIComponent(
          JSON.stringify({ page: "characters", actorId: "livia", tab: "inventory" }),
        ),
    );
    await page.locator("[data-compendium-query]").fill(lang === "it" ? "pugnale" : "dagger");
    await page.locator("[data-compendium-query]").press("Enter");
    const add = page.locator('[data-compendium-add="srd2024:item:dagger"]');
    await add.waitFor();
    await page.screenshot({ path: `${dir}p4-shared-${lang}-${viewport.width}-library.png` });
    await press(add);
    await press(page.locator('#dialog button[type="submit"]'));
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).actors.livia.inventory.some(
          (r) => r.compendiumRef?.id === "srd2024:item:dagger",
        ),
      key,
    );
    await page.waitForFunction(() => location.hash.includes("tab=inventory"));
    passed.push(`${lang} ${viewport.width}: «Aggiungi» on the Library row adds the dagger`);
    // TV-70: the quick bar's items at the Table.
    await page.goto(base + "#table?id=livia");
    await page.locator("#battle-map").waitFor();
    await press(page.locator('[data-hotbar-page="quickbar"]'));
    const items = page.locator("[data-qb-items]");
    await items.waitFor();
    await press(items);
    const wand = page.locator('#dialog [data-qb-use-item="invp-wand"]');
    if (await wand.count()) await press(wand);
    await page.locator('#dialog input[name="target"]').first().waitFor();
    await page.screenshot({ path: `${dir}p4-shared-${lang}-${viewport.width}-quickbar.png` });
    check(page.url().includes("#table"), "still at the Table");
    passed.push(
      `${lang} ${viewport.width}: quick bar «${lang === "it" ? "Usa un oggetto" : "Use an item"}» → wand with targets`,
    );
    await context.close();
  };
  await run({ width: 1440, height: 900 }, "it", false);
  await run({ width: 390, height: 844 }, "en", true);
  check(!errors.length, "page errors: " + errors.join(" | "));
  return passed.join("\n");
}
