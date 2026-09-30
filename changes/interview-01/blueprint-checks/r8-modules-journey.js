async (rootPage) => {
  // R8 SV-42 (delegated simulation): the DM switches a feature module off in Integrazioni ›
  // Moduli (Foundry Manage Modules, Owlbear room extensions). «Tabelle casuali e mazzi di
  // carte» leaves Preparation, the Table sidebar and the palette for the DM and the player;
  // switched back on, the decks return with their data. Search, dependency prompt and phone
  // 390 by touch. Synthetic data; resets this browser's demo state.
  const base = "http://127.0.0.1:8879/";
  const shots =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R8/images/";
  const browser = rootPage.context().browser();
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "it-IT",
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const mod = await page.evaluate(() => (/Mac/.test(navigator.platform) ? "Meta" : "Control"));
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await p.waitForTimeout(150);
  };
  const go = async (hash, p = page) => {
    await p.goto(base + hash);
    await p.waitForTimeout(250);
  };
  const palette = async (text) => {
    await page.keyboard.press(`${mod}+k`);
    await page.locator("#dialog [data-cmdk-input]").waitFor();
    await page.locator("#dialog [data-cmdk-input]").fill(text);
    await page.waitForTimeout(150);
    const list = await page.locator("#dialog [data-cmdk-list]").innerText();
    await page.keyboard.press("Escape");
    return list;
  };
  const decksHere = async (p = page) => {
    await go("#table", p);
    await p.locator(".table-layout").waitFor();
    return p.locator('[data-table-drawer="random-tables"]').count();
  };
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await role("dm");
  // Before: the area is everywhere.
  check((await decksHere()) > 0, "Tables and decks panel missing before the switch");
  check(
    /Apri tabelle casuali e mazzi/.test(await palette("tabelle casuali")),
    "palette misses the tables command before",
  );
  // The palette finds the Modules page by everyday words.
  await page.keyboard.press(`${mod}+k`);
  await page.locator("#dialog [data-cmdk-input]").fill("disattiva funzioni");
  await page.waitForTimeout(150);
  check(
    /Moduli: attiva o spegni funzioni/.test(
      await page.locator("#dialog [data-cmdk-list]").innerText(),
    ),
    "palette does not find the Modules page",
  );
  await page.keyboard.press("Enter");
  await page.locator("[data-int-area]").first().waitFor();
  check(page.url().includes("tab=integrations"), "the command did not open Integrations");
  passed.push("«disattiva funzioni» in the palette opens Integrazioni › Moduli");
  // Search narrows the list without re-rendering.
  await page.locator("[data-int-module-search]").fill("mazzi");
  const visible = await page.locator("[data-int-module-item]:visible").count();
  check(visible === 1, "search «mazzi» should leave one row, got " + visible);
  await page.screenshot({ path: shots + "r8-modules-search-it.png", fullPage: false });
  await page.locator("[data-int-module-search]").fill("");
  await page.locator("[data-int-module-search]").dispatchEvent("input");
  // Dependency prompt: switching the archive off asks about the relationship graph.
  await page.locator('[data-int-area="quests"]').click();
  await page.locator("#dialog[open] [data-int-dependency]").waitFor();
  check(
    /Grafo delle relazioni/.test(await page.locator("#dialog[open]").innerText()),
    "no dependency prompt",
  );
  await page.getByRole("button", { name: "Annulla", exact: true }).last().click();
  check(
    await page.locator('[data-int-area="quests"]').isChecked(),
    "cancel changed the archive switch",
  );
  passed.push(
    "Search narrows the modules; switching the archive off asks about the relationship graph (Foundry dependency prompt)",
  );
  // Switch the tables and decks off and save.
  await page.locator('[data-int-area="random-tables"]').click();
  check(
    /1 modifica non salvata/.test(await page.locator("[data-int-pending]").innerText()),
    "pending count missing",
  );
  await page.locator("[data-int-modules-save]").click();
  await page.waitForTimeout(250);
  check(
    !(await page.locator('[data-int-area="random-tables"]').isChecked()),
    "switch did not stay off",
  );
  check(
    /Funzione spenta \(dati conservati\): Tabelle casuali e mazzi di carte/.test(
      await page.locator("[data-int-history]").innerText(),
    ),
    "history line missing",
  );
  await page.screenshot({ path: shots + "r8-modules-off-it.png" });
  // Gone for the DM: Preparation, Table and palette.
  await go("#preparation");
  check(
    !(await page.locator('[data-prep-section="random-tables"]').count()),
    "Preparation still lists Tables and decks",
  );
  check((await decksHere()) === 0, "Table still has the Tables and decks panel (DM)");
  check(
    !/Apri tabelle casuali e mazzi/.test(await palette("tabelle casuali")),
    "palette still lists the tables command",
  );
  // Gone for the player too.
  await role("player");
  check((await decksHere()) === 0, "Table still has the Tables and decks panel (player)");
  check(
    !/Apri tabelle casuali e mazzi/.test(await palette("tabelle casuali")),
    "player palette still lists the tables command",
  );
  await go("#campaign?tab=integrations&id=modules");
  await page.locator('[data-int-module-row="random-tables"]').waitFor();
  check(
    /Spento/.test(await page.locator('[data-int-module-row="random-tables"]').innerText()),
    "player does not see it off",
  );
  passed.push(
    "Switched off: Preparation, the Table sidebar and the palette lose Tables and decks for the DM and the player",
  );
  // Back on: the decks return with their cards.
  await role("dm");
  await go("#campaign?tab=integrations&id=modules");
  await page.locator('[data-int-area="random-tables"]').click();
  await page.locator("[data-int-modules-save]").click();
  await page.waitForTimeout(250);
  check((await decksHere()) > 0, "Tables and decks panel did not return");
  const handle = page.locator('[data-table-drawer="random-tables"]').first();
  await handle.evaluate((el) => el.click());
  await page.locator('[data-rt-tab="decks"]').click();
  await page.locator("[data-rt-deck-draw], [data-rt-deck-shuffle]").first().waitFor();
  check(
    /Destino/.test(await page.locator("#table-drawer").innerText()),
    "the Fate deck did not return",
  );
  await page.screenshot({ path: shots + "r8-modules-back-decks-it.png" });
  passed.push("Switched on again: the Table's Tables and decks panel returns with the Fate deck");
  // Phone 390, EN, by touch.
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    locale: "en-GB",
  });
  const mobile = await phone.newPage();
  mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
  await mobile.goto(base);
  await mobile.evaluate(() => localStorage.clear());
  await mobile.reload();
  await mobile.locator("#demo-role").selectOption("dm");
  await mobile.waitForTimeout(150);
  // English through Preferences (the header gear sits in the App menu on a phone).
  await mobile
    .locator('.service-nav [data-service="preferences"], [data-service="preferences"]')
    .first()
    .evaluate((el) => el.click());
  await mobile.locator("#dialog [name=lang]").selectOption("en");
  await mobile
    .locator("#dialog")
    .getByRole("button", { name: "Salva preferenze", exact: true })
    .tap();
  await mobile.waitForTimeout(250);
  await mobile.goto(base + "#campaign?tab=integrations&id=modules");
  await mobile.locator("[data-int-area]").first().waitFor();
  check(
    /App features/.test(await mobile.locator("#content").innerText()),
    "the Modules page is not in English",
  );
  check(
    await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    "Modules page overflows at 390",
  );
  await mobile.locator('[data-int-area="dice-3d"]').tap();
  await mobile.locator("[data-int-modules-save]").tap();
  await mobile.waitForTimeout(250);
  check(
    !(await mobile.locator('[data-int-area="dice-3d"]').isChecked()),
    "phone switch did not save",
  );
  await mobile.screenshot({ path: shots + "r8-modules-phone.png", fullPage: true });
  passed.push("EN phone 390 by touch: «App features» fits, a switch saves");
  await phone.close();
  await context.close();
  check(!errors.length, "page errors: " + errors.join(" | "));
  return JSON.stringify({ passed });
}
