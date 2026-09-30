async (rootPage) => {
  // P4 fixes PR-56 and TV-144 in the one app with real clicks and touch, from a clean state:
  // a player's «Compra» shows the cart at once (sticky balance, «Nel carrello» on the row,
  // «Vedi carrello»), the player proposes a price with a Persuasion roll, the DM is notified
  // and accepts, and the trade completes at the agreed price. Phone 390x844 touch in EN.
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
  const role = async (page, value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
  };
  const inView = (locator) =>
    locator.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const scroller = el.closest(".table-drawer") ?? document.documentElement;
      const s = scroller.getBoundingClientRect();
      return r.top >= Math.max(0, s.top) - 1 && r.bottom <= Math.min(innerHeight, s.bottom) + 1;
    });

  const run = async (viewport, lang, touch) => {
    const context = await browser.newContext({
      viewport,
      hasTouch: touch,
      isMobile: touch,
      locale: lang === "en" ? "en-GB" : "it-IT",
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    const press = (l) => (touch ? l.tap() : l.click());
    const t = (it, en) => (lang === "it" ? it : en);
    await page.goto(base + "#table");
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await page.locator("#battle-map").waitFor();
    if (lang === "en") {
      await press(page.locator('[data-service="preferences"]'));
      await page.locator('#dialog [name="lang"]').selectOption("en");
      await press(page.locator('#dialog button[type="submit"]'));
    }
    // The DM opens Tessa's cart for the players.
    await role(page, "dm");
    await openTablePanel(page, "loot-shop", touch);
    const shop = page.locator('[data-ext-slot="table-panel:loot-shop"]');
    await press(shop.locator('[data-loot="merchant-toggle"]'));
    await role(page, "player");
    await openTablePanel(page, "loot-shop", touch);
    // Clean state: the bar holds its place, empty.
    const bar = shop.locator("[data-loot-cart-bar]");
    check(/vuoto|empty/.test(await bar.textContent()), "empty cart bar first");
    const rations = shop.locator('[data-loot="cart-add"][data-ref="tessa-rations"]');
    for (let i = 0; i < 3; i++) await press(rations);
    await page.waitForFunction(() =>
      /3/.test(document.querySelector("[data-loot-cart-count]")?.textContent ?? ""),
    );
    check(await inView(bar), "the cart balance is in view right after «Compra»");
    check(
      /3/.test(await shop.locator("[data-loot-in-cart]").first().textContent()),
      "the row says how many are in the cart",
    );
    await page.screenshot({ path: `${dir}pr56-${lang}-${viewport.width}-after-compra.png` });
    passed.push(`${lang} ${viewport.width}: «Compra» ×3 → bar «3» in view, row badge`);
    await press(shop.locator('[data-loot="cart-show"]'));
    await page.waitForTimeout(600);
    check(
      await inView(shop.locator("#loot-cart-title")),
      "«Vedi carrello» brings the cart in view",
    );
    passed.push(`${lang} ${viewport.width}: «Vedi carrello» scrolls the cart into view`);
    // Offer with a Persuasion roll.
    await press(shop.locator('[data-loot="cart-offer"]'));
    const dialog = page.locator("#dialog");
    await dialog.locator('input[name="amountGp"]').fill("1");
    await press(dialog.locator('input[name="roll"][value="persuasion"]'));
    await press(dialog.locator('button[type="submit"]'));
    await shop.locator("[data-loot-offer]").waitFor();
    check(
      /In attesa del DM|Waiting for the DM/.test(
        await shop.locator("[data-loot-offer]").textContent(),
      ),
      "offer waiting",
    );
    passed.push(`${lang} ${viewport.width}: offer with Persuasion roll waits for the DM`);
    await role(page, "dm");
    await press(page.locator('[data-service="requests"]'));
    const note = page.locator("#dialog [data-notifications-open]", {
      hasText: t("Offerta di Livia", "Livia's offer"),
    });
    await note.first().waitFor();
    await press(note.first());
    await page.waitForFunction(
      () => document.querySelector("#table-sidebar-panel")?.dataset.tablePanel === "loot-shop",
    );
    await press(shop.locator('[data-loot="offer-accept"]'));
    await shop.locator("[data-loot-override]").waitFor();
    passed.push(`${lang} ${viewport.width}: DM notified, opens the shop from the bell, accepts`);
    await role(page, "player");
    await openTablePanel(page, "loot-shop", touch);
    const pursesBefore = await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).actors.livia.currency,
      key,
    );
    await press(shop.locator('[data-loot="checkout"]'));
    await page.waitForFunction(() => !document.querySelector('[data-loot="checkout"]'));
    const after = await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).actors.livia.currency,
      key,
    );
    check(JSON.stringify(after) !== JSON.stringify(pursesBefore), "the trade paid");
    passed.push(`${lang} ${viewport.width}: checkout at the agreed price`);
    await context.close();
  };
  await run({ width: 1440, height: 900 }, "it", false);
  await run({ width: 390, height: 844 }, "en", true);
  check(!errors.length, "page errors: " + errors.join(" | "));
  return passed.join("\n");
}
