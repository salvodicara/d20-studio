async (rootPage) => {
  // P4 inventory fixes in the one app, real clicks, keys and touch, from a clean state:
  // PG-62 an SRD dagger added to Livia from «Aggiungi oggetto» in three interactions, no
  // «Equipaggia» on rations; PG-64 sort and columns; PG-74 «Cambia set» stows what blocks it;
  // TV-70 the wand used at the Table with a target (a proposal to the DM); phone EN touch.
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
  const role = async (page, value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
  };
  const run = async (viewport, lang, touch) => {
    const context = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`${lang} ${viewport.width}: ${error.message}`));
    const press = (l) => (touch ? l.tap() : l.click());
    await page.goto(base + "#characters?id=livia&tab=inventory");
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await page.locator("[data-invp-actor]").waitFor();
    await role(page, "player");
    if (lang === "en") {
      await press(page.locator('[data-service="preferences"]'));
      await page.locator('#dialog [name="lang"]').selectOption("en");
      await press(page.locator('#dialog button[type="submit"]'));
    }
    await page.locator('[data-invp="add"]').waitFor();
    // PG-62: 1 «Aggiungi oggetto», 2 type the name, 3 «Aggiungi».
    await press(page.locator('[data-invp="add"]'));
    await page.keyboard.type(lang === "it" ? "pugnale" : "dagger");
    await press(page.locator('#dialog [data-invp-add-srd="srd2024:item:dagger"]'));
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).actors.livia.inventory.some(
          (r) => r.srdId === "srd2024:item:dagger",
        ),
      key,
    );
    check(await page.locator("#dialog").evaluate((d) => d.open), "the catalogue stays open");
    await page.screenshot({ path: `${dir}p4-inv-${lang}-${viewport.width}-added.png` });
    passed.push(`${lang} ${viewport.width}: SRD dagger added in 3 interactions`);
    await page.keyboard.press("Escape");
    check(
      !(await page.locator('[data-invp="equip"][data-invp-id="invp-rations"]').count()),
      "no Equip on rations",
    );
    passed.push(`${lang} ${viewport.width}: no «Equipaggia» on rations`);
    // PG-64: sort by weight, value column.
    // Final review F10: the view options are folded under «Visualizzazione».
    if (!(await page.locator("[data-invp-sort]").isVisible()))
      await page.locator("details.invp-view > summary").click();
    await page.locator("[data-invp-sort]").selectOption("weight");
    await press(page.locator('[data-invp-column="value"]'));
    await page.locator('[data-invp-col="value"]').first().waitFor();
    passed.push(`${lang} ${viewport.width}: sort by weight, value column`);
    // PG-74: hold the dagger beside the staff, then swap to the bow: no refusal.
    const dagger = (await stored(page)).actors.livia.inventory.find(
      (r) => r.srdId === "srd2024:item:dagger",
    );
    await press(page.locator(`[data-invp="equip"][data-invp-id="${dagger.id}"]`));
    await page.waitForFunction(
      ([k, id]) =>
        JSON.parse(localStorage.getItem(k)).actors.livia.inventory.find((r) => r.id === id)
          .equipped,
      [key, dagger.id],
    );
    await press(page.locator('[data-invp="swap"]'));
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).actors.livia.inventory.find(
          (r) => r.id === "invp-shortbow",
        ).equipped,
      key,
    );
    const after = (await stored(page)).actors.livia.inventory;
    check(!after.find((r) => r.id === dagger.id).equipped, "the dagger was put away");
    check(
      !(await page.locator("#toast.error").count()) ||
        !/Cambia set|Swap set/.test(await page.locator("#toast").innerText()),
      "no refusal pointing to the swap",
    );
    passed.push(`${lang} ${viewport.width}: «Cambia set» stows the dagger, bow in hand`);
    // TV-70: the wand at the Table, with a target, never leaving the Table.
    await page.goto(base + "#table?id=livia");
    await page.locator("#battle-map").waitFor();
    const use = page.locator('[data-invp-use-item="invp-wand"]');
    await use.waitFor();
    await press(use);
    const target = page.locator('#dialog input[name="target"]').first();
    await target.waitFor();
    await press(target);
    await press(page.locator('#dialog button[type="submit"]'));
    await page.waitForFunction(
      (k) => (JSON.parse(localStorage.getItem(k)).ext["damage-tray"]?.proposals ?? []).length > 0,
      key,
    );
    check(page.url().includes("#table"), "still at the Table");
    await page.screenshot({ path: `${dir}p4-inv-${lang}-${viewport.width}-wand.png` });
    passed.push(`${lang} ${viewport.width}: wand used at the Table on a target (DM proposal)`);
    await context.close();
  };
  await run({ width: 1440, height: 900 }, "it", false);
  await run({ width: 390, height: 844 }, "en", true);
  check(!errors.length, "page errors: " + errors.join(" | "));
  return passed.join("\n");
};
