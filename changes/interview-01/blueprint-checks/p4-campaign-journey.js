async (rootPage) => {
  // P4 campaign fixes in the one app, real clicks, keys and touch, from a clean state:
  // PG-17 the DM finds «Assegna PE e monete» by searching «PE» and on «Inventario del
  // gruppo» (linked back to «Gruppo»); PG-72 the party inventory with «equipaggiato da»
  // portraits after a player equips a torch there; PG-75 «valuta» finds the campaign
  // currencies page, a new currency is added; TV-109 «Rivela aspetto» preselects the
  // goblin's own art and shares it inline. IT desktop, EN phone touch.
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
  const run = async (viewport, lang, touch) => {
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
    const search = async (text) => {
      await close();
      await press(page.locator('[data-service="search"]'));
      await page.locator("[data-cmdk-input]").fill(text);
      await page.waitForTimeout(250);
    };
    await page.goto(base + "#campaign?tab=group");
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await page.locator("#demo-role").waitFor();
    await role(page, "dm");
    if (lang === "en") {
      await press(page.locator('[data-service="preferences"]'));
      await page.locator('#dialog [name="lang"]').selectOption("en");
      await press(page.locator('#dialog button[type="submit"]'));
    }
    // PG-17: search «PE» / «XP».
    await search(t("PE", "XP"));
    const award = page.locator("#dialog .cmdk-option", {
      hasText: t("Assegna PE e monete", "Award XP and coins"),
    });
    await award.first().waitFor();
    await press(award.first());
    await page
      .locator("#dialog", {
        hasText: t("Assegna PE e monete al gruppo", "Award XP and coins to the party"),
      })
      .waitFor();
    passed.push(`${lang} ${viewport.width}: «${t("PE", "XP")}» finds the DM award`);
    await close();
    // PG-72 + PG-17: the party inventory page, linked to «Gruppo», with the award button.
    await page.goto(base + "#campaign?tab=loot");
    await page.locator("[data-loot-party-crumb]").waitFor();
    check(await page.locator('[data-loot="award-open"]').count(), "award button on the page");
    passed.push(`${lang} ${viewport.width}: «Inventario del gruppo» has «Assegna PE e monete»`);
    if (!touch) {
      // PG-17: an encounter ends → the DM's bell offers the award, which opens at the Table.
      await page.goto(base + "#table");
      await page.locator("#battle-map").waitFor();
      const button = (name) => page.getByRole("button", { name, exact: true });
      await button("Avvia combattimento").click();
      // Refreshed by the hand-off writer (29/09/2026): R5 PR-32 replaced Preparation's «Incontro
      // preparato» with the Table's start dialog (Foundry roll call): who fights and each typed
      // d20; the Initiative bonus comes from the sheet.
      await page.locator("[data-ct-start-dialog]").waitFor();
      {
        const naturals = { livia: 18, "goblin-1": 12 };
        const startIds = await page
          .locator("[data-ct-start-include]")
          .evaluateAll((els) => els.map((el) => el.dataset.ctStartInclude));
        for (const id of startIds) {
          const box = page.locator('[data-ct-start-include="' + id + '"]');
          if ((await box.isChecked()) !== Object.hasOwn(naturals, id)) await box.click();
        }
        for (const [id, natural] of Object.entries(naturals)) {
          const d20 = page.locator('[data-ct-start-natural="' + id + '"]');
          await d20.fill(String(natural));
          await d20.dispatchEvent("change");
        }
      }
      await button("Inizia combattimento").click();
      await page.locator("#battle-map").waitFor();
      await page.waitForFunction(
        (k) => JSON.parse(localStorage.getItem(k)).combat.active === true,
        key,
      );
      await button("Concludi incontro").click();
      await page.locator('#dialog[open] button[type="submit"]').click();
      await page.waitForFunction(
        (k) => JSON.parse(localStorage.getItem(k)).combat.active === false,
        key,
      );
      await close();
      await press(page.locator('[data-service="requests"]'));
      const notice = page.locator(
        "#dialog [data-notifications-open], #dialog [data-ext-notification]",
        {
          hasText: "Incontro concluso: assegna PE e monete",
        },
      );
      await notice.first().waitFor();
      await press(notice.first());
      await page.locator("#dialog", { hasText: "Assegna PE e monete al gruppo" }).waitFor();
      await page.screenshot({ path: `${dir}p4-camp-${lang}-${viewport.width}-combat-award.png` });
      passed.push(`${lang} ${viewport.width}: encounter over → bell → award dialog at the Table`);
      await close();
    }
    // PG-75: «valuta» finds the campaign currencies page; add one.
    await search(t("valuta", "currency"));
    const currencies = page.locator("#dialog .cmdk-option", {
      hasText: t("Valute e monete della campagna", "Campaign currencies and coins"),
    });
    await currencies.first().waitFor();
    await press(currencies.first());
    await page.locator("[data-invp-currency-new]").waitFor();
    await press(page.locator("[data-invp-currency-new]"));
    await page.locator('#dialog [name="nameIt"]').fill("Corona di Vetro");
    await page.locator('#dialog [name="abbrIt"]').fill("cv");
    await page.locator('#dialog [name="perGp"]').fill("2");
    await press(page.locator('#dialog button[type="submit"]'));
    await page.locator("[data-invp-currency]", { hasText: "Corona di Vetro" }).waitFor();
    await page.screenshot({ path: `${dir}p4-camp-${lang}-${viewport.width}-currencies.png` });
    passed.push(
      `${lang} ${viewport.width}: «${t("valuta", "currency")}» → currencies page; one added`,
    );
    // PG-72: a player equips a stash torch from the party inventory; the DM sees who.
    await role(page, "player");
    await page.goto(base + "#campaign?tab=loot");
    await page.locator('[data-loot="stash-equip"]').first().waitFor();
    await press(page.locator('[data-loot="stash-equip"]').first());
    await page.locator("[data-loot-equipped-by]").first().waitFor();
    await role(page, "dm");
    await page.goto(base + "#campaign?tab=loot");
    await page.locator("[data-loot-party-holders] .loot-holder-row").first().waitFor();
    await page.screenshot({ path: `${dir}p4-camp-${lang}-${viewport.width}-party-inventory.png` });
    passed.push(`${lang} ${viewport.width}: «equipaggiato da» with the holder's portrait`);
    // TV-109: reveal the goblin's own art, shared inline.
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.locator('#battle-map [data-actor="goblin-1"]').click({ button: "right" });
    const menu = page.locator("body > .token-menu");
    await menu.waitFor();
    const reveal = menu.locator('[data-token-menu-item="handouts-reveal-art"]');
    if (!(await reveal.count())) {
      const look = menu.locator('[data-token-menu-category="look"]');
      await press(look);
    }
    await press(menu.locator('[data-token-menu-item="handouts-reveal-art"]'));
    await page.locator('#dialog input[name="artId"][value="media:m-goblin"]:checked').waitFor();
    check(await page.locator("#dialog [data-hs-inline-share]").isVisible(), "inline share shown");
    await page.screenshot({ path: `${dir}p4-camp-${lang}-${viewport.width}-reveal.png` });
    await press(page.locator('#dialog button[type="submit"]'));
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["media"]?.assets?.find((a) => a.id === "m-goblin")
          ?.shared === true,
      key,
    );
    passed.push(`${lang} ${viewport.width}: own art preselected, shared and revealed in one step`);
    await context.close();
  };
  await run({ width: 1440, height: 900 }, "it", false);
  await run({ width: 390, height: 844 }, "en", true);
  check(!errors.length, "page errors: " + errors.join(" | "));
  return passed.join("\n");
}
