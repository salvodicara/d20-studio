async (rootPage) => {
  // B62: a Table panel is a sub-tab of its sidebar tab (Foundry's document tabs): open that
  // tab (its own, or the one its hidden handle names), then the sub-tab. No-op when open.
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
  // B62: a token-menu command by id, through the labelled submenu that holds it.
  const menuItemById = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const menu = page.locator("body > .token-menu");
    const item = () => menu.locator(`[data-token-menu-item="${id}"]`);
    await menu.locator("[data-nav]").first().waitFor();
    if (await item().count()) return press(item().first());
    const ids = await menu
      .locator("[data-token-menu-category]")
      .evaluateAll((els) => els.map((e) => e.dataset.tokenMenuCategory));
    for (const category of ids) {
      await press(menu.locator(`[data-token-menu-category="${category}"]`));
      if (await item().count()) return press(item().first());
      await press(menu.locator("[data-token-menu-back]"));
    }
    throw Error("token menu command not found: " + id);
  };
  // B26 review fixes, round 2, in the one app with real clicks, keys and touch.
  // A: a creature parcel under a hidden name (B12) and on a hidden token: no true name, no
  //    marker, no "On the creature"; the marker names the parcel once; showing then hiding
  //    works; the players' notification opens the Loot drawer on the parcel.
  // B: a stat block with Gear outside the catalog (Priest); players never read the stat
  //    block a clean copy came from, only the item's own Equipment data.
  // C: loot never merges into an equipped row; the stash round trip keeps the spellbook.
  // D: the XP bar below the level threshold.
  // E: an empty ware price is the SRD price, an empty till is refused; the party stash
  //    sells and pays at the shop.
  // F: isolated EN 390 touch audit of the player's shop and loot drawers.
  // Synthetic demo data only; resets this browser's state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B26/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [],
    errors = [],
    notes = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
  };
  const drawerOf = (id, p = page) => p.locator(`[data-ext-slot="table-panel:${id}"]`);
  const openDrawer = async (id, p = page) => {
    await openTablePanel(p, id, p !== page); // B62: Items › Loot / Shop
    await drawerOf(id, p).waitFor();
    return drawerOf(id, p);
  };
  const toTable = async (p = page) => {
    await p.goto(base + "#table");
    await p.locator("#battle-map").waitFor();
  };
  const toast = () =>
    page.evaluate(() => {
      const el = document.querySelector("#toast");
      return { text: el?.textContent ?? "", error: !!el?.classList.contains("error") };
    });
  const clearToast = () =>
    page.evaluate(() => {
      const el = document.querySelector("#toast");
      if (el) {
        el.textContent = "";
        el.className = "";
      }
    });
  const tokenMenu = async (actorId, item) => {
    await page.locator(`#battle-map [data-actor="${actorId}"]`).click({ button: "right" });
    await menuItemById(page, item); // B62: labelled submenus
    await page.waitForTimeout(150);
    for (let i = 0; i < 2 && (await page.locator(".token-menu").count()); i++)
      await page.keyboard.press("Escape");
  };
  const active = (p = page) =>
    p.evaluate(() => {
      const a = document.activeElement;
      return {
        tag: a?.tagName,
        id: a?.id ?? "",
        select: a?.getAttribute("data-loot-select") ?? "",
        text: (a?.textContent ?? "").trim().slice(0, 60),
      };
    });

  try {
    // ------------------------------------------------------------ A: hidden name, hidden token
    await page.goto(base + "#campaign");
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await page.locator("[data-campaign-tab]").first().waitFor();
    await role("dm");
    await toTable();
    await tokenMenu("goblin-1", "loot-open");
    let drawer = drawerOf("loot");
    await drawer.waitFor();
    let card = drawer.locator(".loot-parcel").first();
    await card.locator('[name="coin-gp"]').fill("12");
    await card.locator('form[data-loot-form="parcel-coins"] button[type="submit"]').click();
    await card.locator("[data-loot-parcel-coins]", { hasText: "12 mo" }).waitFor();
    await tokenMenu("goblin-1", "token-menu-hide-name");
    let state = await stored();
    check(state.actors["goblin-1"].name === "Creatura sconosciuta 1", "B12 alias not applied");
    drawer = await openDrawer("loot");
    card = drawer.locator(".loot-parcel").first();
    notes.push("DM parcel heading: " + (await card.locator("h3").innerText()).trim());
    // Owlbear Loot!: show, hide again (nothing handed out), show.
    await clearToast();
    await card.locator('[data-loot="parcel-reveal"]').click();
    await drawer.locator(".loot-parcel .loot-status-revealed").waitFor();
    await drawer.locator('.loot-parcel [data-loot="parcel-reveal"]').click();
    await drawer.locator(".loot-parcel .loot-status-prepared").waitFor();
    let message = await toast();
    check(!message.error, "Hide refused: " + message.text);
    state = await stored();
    check(state.ext.loot.parcels[0].revealed === false, "Parcel still shown after Hide");
    check(state.ext.loot.ledger.at(-1).kind === "parcel-hidden", "No hidden entry in the log");
    await drawer.locator('.loot-parcel [data-loot="parcel-reveal"]').click();
    await drawer.locator(".loot-parcel .loot-status-revealed").waitFor();
    // Players: marker and drawer under the alias, never the true name.
    await role("player");
    await toTable();
    let marker = page.locator("#battle-map [data-loot-marker]");
    check((await marker.count()) === 1, "Player marker count " + (await marker.count()));
    const markerLabel = await marker.first().getAttribute("aria-label");
    check(markerLabel === "Bottino: Creatura sconosciuta 1", "Marker label: " + markerLabel);
    // Notification → Table with the Loot drawer open on the parcel.
    await page.goto(base + "#campaign");
    await page.locator("[data-campaign-tab]").first().waitFor();
    await page.locator('[data-service="requests"]').click();
    const noteButton = page.locator("#dialog [data-notifications-open]", {
      hasText: "Bottino da dividere",
    });
    await noteButton.first().waitFor();
    const noteText = (await noteButton.first().innerText()).replace(/\s+/g, " ");
    check(!/Sentinella/.test(noteText), "Notification leaks the name: " + noteText);
    check(/Creatura sconosciuta 1/.test(noteText), "Notification title: " + noteText);
    await noteButton.first().click();
    await page.locator("#battle-map").waitFor();
    drawer = drawerOf("loot");
    await drawer.waitFor();
    await page.waitForFunction(() => document.activeElement?.id?.startsWith("loot-parcel-"));
    const drawerText = await drawer.innerText();
    check(
      !/Sentinella/.test(drawerText),
      "Player drawer leaks the name: " + drawerText.slice(0, 300),
    );
    check(/Bottino: Creatura sconosciuta 1/.test(drawerText), "Player drawer title");
    check(page.url().includes("tab=loot"), "Notification route: " + page.url());
    await page.screenshot({ path: dir + "b26-r2-01-player-hidden-name-from-notification.png" });
    // DM hides the token (B12): the player loses the marker and "On the creature".
    await role("dm");
    await toTable();
    await tokenMenu("goblin-1", "token-menu-hide");
    state = await stored();
    const hiddenToken = state.scenes
      .find((s) => s.id === state.activeSceneId)
      .tokens.find((t) => t.actorId === "goblin-1");
    check(hiddenToken.hidden === true, "Token not hidden");
    await role("player");
    await toTable();
    check((await page.locator('#battle-map [data-actor="goblin-1"]').count()) === 0, "Token drawn");
    check((await page.locator("#battle-map [data-loot-marker]").count()) === 0, "Marker drawn");
    drawer = await openDrawer("loot");
    const hiddenCard = await drawer.locator(".loot-parcel").first().innerText();
    check(
      !/Sentinella|Sulla creatura|Creatura sconosciuta/.test(hiddenCard),
      "Card on a hidden creature: " + hiddenCard.slice(0, 200),
    );
    check(/^\s*Bottino\b/.test(hiddenCard), "Generic title expected: " + hiddenCard.slice(0, 60));
    await page.screenshot({ path: dir + "b26-r2-02-player-no-marker-hidden-token.png" });
    // VTL-143 Spectre: the DM shows the hidden token to Livia only; her player sees the marker.
    const audience = async (mode, ids = []) => {
      await role("dm");
      await toTable();
      await page.locator('#battle-map [data-actor="goblin-1"]').click({ button: "right" });
      await menuItemById(page, "token-menu-audience"); // B62: «Visibilità» submenu
      await page.locator(`#dialog [name="mode"][value="${mode}"]`).check();
      for (const id of ids) await page.locator(`#dialog [name="audience"][value="${id}"]`).check();
      await page.locator('#dialog button[type="submit"]').click();
      await page
        .locator("#dialog[open]")
        .waitFor({ state: "detached" })
        .catch(() => null);
    };
    await audience("some", ["livia"]);
    await role("player");
    await toTable();
    marker = page.locator("#battle-map [data-loot-marker]");
    check((await marker.count()) === 1, "Spectre audience lost the marker");
    await audience("all");
    passed.push(
      "A. Parcel on the Sentinella under B12 alias: marker 'Bottino: Creatura sconosciuta 1' (not doubled), drawer and notification without the true name; Show → Hide → Show with no refusal and a 'parcel-hidden' log entry; the notification opens the drawer with focus on the parcel; hidden token → no marker, card titled 'Bottino' without 'Sulla creatura'; Spectre audience (Livia) → marker back",
    );

    // ------------------------------------------------------------ B: stat block gear
    await page.goto(base + "#preparation?tab=loot");
    await page.locator('form[data-loot-form="parcel-create"] [name="name"]').fill("Tempio");
    await page.locator('form[data-loot-form="parcel-create"] button[type="submit"]').click();
    await page.locator("#loot-parcel-title", { hasText: "Tempio" }).waitFor();
    const gearForm = page.locator('form[data-loot-form="parcel-statblock-add"]');
    const details = gearForm.locator("xpath=ancestor::details");
    if (!(await details.evaluate((el) => el.open))) await details.locator("summary").click();
    const priestOption = await gearForm
      .locator('option[value="srd2024:creature:priest"]')
      .innerText();
    check(
      priestOption === "Sacerdote · Giaco di maglia, Simbolo sacro, Mazza",
      "Priest option: " + priestOption,
    );
    await gearForm.locator('[name="creatureId"]').selectOption("srd2024:creature:priest");
    await gearForm.locator('button[type="submit"]').click();
    await page.locator(".loot-parcel-editor .loot-row", { hasText: "Simbolo sacro" }).waitFor();
    const dmRows = await page.locator(".loot-parcel-editor .loot-list").innerText();
    check(/Voce Attrezzatura del blocco: Sacerdote/.test(dmRows), "DM gear note: " + dmRows);
    check((await page.locator(".loot-parcel-editor .loot-list .loot-row").count()) === 3, "3 rows");
    await page.locator('.loot-parcel-editor [data-loot="parcel-reveal"]').click();
    await page.locator("#loot-parcel-title .loot-status-revealed").waitFor();
    await role("player");
    await toTable();
    drawer = await openDrawer("loot");
    const temple = drawer.locator(".loot-parcel", { hasText: "Tempio" });
    const templeText = await temple.innerText();
    check(
      !/Sacerdote|Copia pulita|Non copiato|Attacco|Voce Attrezzatura/.test(templeText),
      "Player reads stat block data: " + templeText,
    );
    check(/1d6 contundenti/.test(templeText), "Mace damage missing: " + templeText);
    await temple.screenshot({ path: dir + "b26-r2-03-player-priest-gear.png" });
    passed.push(
      "B. Priest's Gear (Holy Symbol outside the catalog) adds 3 rows with the DM note 'Voce Attrezzatura del blocco'; the player's card shows Mazza 1d6 contundenti and nothing about the stat block",
    );

    // ------------------------------------------------------------ C: equipped row, stash trip
    await role("dm");
    await toTable();
    drawer = await openDrawer("loot");
    const templeDm = drawer.locator(".loot-parcel", { hasText: "Tempio" });
    const quick = templeDm.locator("details.loot-quick-add");
    if (!(await quick.evaluate((el) => el.open))) await quick.locator("summary").click();
    await quick.locator('[name="srdId"]').selectOption("srd2024:item:quarterstaff");
    await quick.locator('form[data-loot-form="parcel-item-add"] button[type="submit"]').click();
    await templeDm.locator(".loot-parcel-item", { hasText: "Bastone ferrato" }).waitFor();
    await role("player");
    await toTable();
    drawer = await openDrawer("loot");
    const staffRow = drawer.locator(".loot-parcel-item", { hasText: "Bastone ferrato" });
    await staffRow.locator('[name="target"]').selectOption("livia");
    await staffRow.locator('button[type="submit"]').click();
    await staffRow.waitFor({ state: "detached" });
    state = await stored();
    const staffs = state.actors.livia.inventory
      .filter((row) => (row.name?.en ?? row.name) === "Quarterstaff")
      .map((row) => [row.id, row.quantity, row.equipped]);
    check(
      staffs.length === 2 &&
        staffs[0][0] === "staff" &&
        staffs[0][1] === 1 &&
        staffs[0][2] === true,
      "Staff rows: " + JSON.stringify(staffs),
    );
    check(staffs[1][1] === 1 && staffs[1][2] === false, "New staff row: " + JSON.stringify(staffs));
    await page.goto(base + "#characters?id=livia&tab=inventory");
    const stashBox = page.locator('[data-ext-slot="sheet-section:loot-stash"]');
    await stashBox.waitFor();
    const deposit = stashBox.locator('form[data-loot-form="stash-deposit"]');
    await deposit.locator('[name="row"]').selectOption("sample-readable-spellbook");
    await deposit.locator('[name="quantity"]').fill("1");
    await deposit.locator('button[type="submit"]').click();
    const bookRow = stashBox.locator("[data-stash-item]", {
      hasText: "Libro degli incantesimi di Livia",
    });
    await bookRow.waitFor();
    state = await stored();
    check(
      !state.actors.livia.inventory.some((row) => row.id === "sample-readable-spellbook"),
      "Spellbook still on Livia",
    );
    await bookRow.locator('[data-loot="stash-take"]').click();
    await bookRow.waitFor({ state: "detached" });
    state = await stored();
    const book = state.actors.livia.inventory.find((row) => row.id === "sample-readable-spellbook");
    check(
      book &&
        book.spellbook?.readable === true &&
        book.spellbook.spellIds.includes("find-familiar"),
      "Spellbook after the round trip: " + JSON.stringify(book),
    );
    // The new staff can go to the stash (it was never merged into the equipped one).
    await deposit.locator('[name="row"]').selectOption(staffs[1][0]);
    await deposit.locator('button[type="submit"]').click();
    await stashBox.locator("[data-stash-item]", { hasText: "Bastone ferrato" }).waitFor();
    passed.push(
      "C. A looted Quarterstaff becomes its own unequipped row next to Livia's equipped staff and can go to the stash; the spellbook goes to the stash and back with its id and its Find Familiar spellbook data",
    );

    // ------------------------------------------------------------ D: XP below the threshold
    await page.goto(base + "#characters?id=livia&tab=features");
    const xpBox = page.locator('[data-ext-slot="sheet-section:loot-xp"]');
    await xpBox.locator('[data-loot="xp-correct"]').click();
    await page.locator('#dialog [name="xp"]').fill("100");
    await page.locator('#dialog [name="reason"]').fill("Prova sotto soglia");
    await page.locator('#dialog button[type="submit"]').click();
    await xpBox.locator("[data-loot-xp]", { hasText: "100 PE" }).waitFor();
    const bar = xpBox.locator('[role="progressbar"]');
    const now = await bar.getAttribute("aria-valuenow");
    const width = await bar.locator("span").evaluate((el) => el.getBoundingClientRect().width);
    check(now === "0" && width === 0, `XP bar ${now}, width ${width}`);
    await xpBox.locator("[data-loot-xp-below]").waitFor();
    await xpBox.locator(".loot-xp").screenshot({ path: dir + "b26-r2-04-xp-below-threshold.png" });
    passed.push(
      "D. XP corrected to 100 at level 3: progress bar at 0 (width 0) with 'Sotto la soglia del livello 3 (900 PE)'",
    );

    // ------------------------------------------------------------ E: merchants and the stash
    await role("dm");
    await page.goto(base + "#preparation?tab=loot-merchants");
    const kitForm = page.locator(
      'form[data-loot-form="stock-save"][data-stock="tessa-healers-kit"]',
    );
    await kitForm.locator('[name="priceGp"]').fill("9");
    await kitForm.locator('button[type="submit"]').click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext.loot.merchants[0].stock.find(
          (s) => s.id === "tessa-healers-kit",
        ).priceCp === 900,
      key,
    );
    await kitForm.locator('[name="priceGp"]').fill("");
    await kitForm.locator('button[type="submit"]').click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext.loot.merchants[0].stock.find(
          (s) => s.id === "tessa-healers-kit",
        ).priceCp === 500,
      key,
    );
    const merchantForm = page.locator('form[data-loot-form="merchant-save"]');
    await merchantForm.locator('[name="fundsGp"]').fill("");
    await merchantForm.locator('button[type="submit"]').click();
    const missing = await merchantForm
      .locator('[name="fundsGp"]')
      .evaluate((el) => el.validity.valueMissing);
    state = await stored();
    check(missing && state.ext.loot.merchants[0].fundsCp === 6000, "Empty till accepted");
    await merchantForm.locator('[name="fundsGp"]').fill("60");
    await merchantForm.locator('[name="open"]').check();
    await merchantForm.locator('button[type="submit"]').click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).ext.loot.merchants[0].open === true,
      key,
    );
    // The player puts the Temple's gear in the stash, then sells the chain shirt from it.
    await role("player");
    await toTable();
    drawer = await openDrawer("loot");
    await drawer
      .locator(".loot-parcel", { hasText: "Tempio" })
      .locator('[data-loot="parcel-all-stash"]')
      .click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext.loot.stash.items.some(
          (i) => i.srdId === "srd2024:item:chain-shirt",
        ),
      key,
    );
    const shopDrawer = await openDrawer("loot-shop");
    const shirt = shopDrawer.locator(".loot-row", { hasText: "Giaco di maglia" });
    check(/Il mercante paga 25 mo/.test(await shirt.innerText()), "Stash sale price");
    await shirt.locator('[data-kind="sell-stash"]').click();
    // W2b1 integration: B36 seeds Livia with rations, so the row also offers to sell hers;
    // this step buys them.
    await shopDrawer
      .locator(".loot-row", { hasText: "Razioni" })
      .locator('[data-loot="cart-add"][data-kind="buy"]')
      .click();
    const pay = shopDrawer.locator('[data-loot-select="pay"]');
    await pay.waitFor();
    await pay.focus();
    await pay.selectOption("stash");
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).ext.loot.carts[0]?.payFrom === "stash",
      key,
    );
    const payFocus = await active();
    check(payFocus.select === "pay", "Focus after the payment choice: " + JSON.stringify(payFocus));
    const before = (await stored()).ext.loot.stash.coins;
    const purseBefore = JSON.stringify((await stored()).actors.livia.currency ?? null);
    await shopDrawer
      .locator(".loot-cart")
      .screenshot({ path: dir + "b26-r2-05-shop-pay-from-stash.png" });
    await shopDrawer.locator('[data-loot="checkout"]').click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).ext.loot.carts.length === 0,
      key,
    );
    state = await stored();
    const after = state.ext.loot.stash.coins;
    check(
      after.gp === before.gp + 24 && after.sp === before.sp + 5,
      `Stash coins ${JSON.stringify(before)} → ${JSON.stringify(after)}`,
    );
    check(JSON.stringify(state.actors.livia.currency ?? null) === purseBefore, "Livia paid");
    check(
      !state.ext.loot.stash.items.some((i) => i.srdId === "srd2024:item:chain-shirt"),
      "Shirt still in the stash",
    );
    check(state.ext.loot.merchants[0].buyback[0].fromStash === true, "Buyback source");
    check(
      /vende Giaco di maglia ×1 \(dalla scorta\).*riceve 24 mo · 5 ma nella scorta del gruppo/.test(
        state.ext.loot.ledger.at(-1).text.it,
      ),
      "Trade log: " + state.ext.loot.ledger.at(-1).text.it,
    );
    check(
      state.actors.livia.inventory.some((row) => row.srdId === "srd2024:item:rations"),
      "Rations not with Livia",
    );
    passed.push(
      "E. Empty ware price → SRD 5 mo (not free); empty till blocked by the required field and unchanged; the player sells the Chain Shirt from the party stash and pays the rations with the stash coins (+24 mo 5 ma to the stash, Livia's purse untouched, buyback 'dalla scorta', focus stays on the payment choice)",
    );

    // ------------------------------------------------------------ F: EN 390 touch audit
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    const phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const phone = await phoneContext.newPage();
    phone.on("pageerror", (error) => errors.push("phone: " + error.message));
    await phone.goto(base + "#table");
    await phone.evaluate(([k, v]) => localStorage.setItem(k, v), [key, snapshot]);
    await phone.reload();
    await phone.locator("#battle-map").waitFor();
    await phone.locator("#demo-role").selectOption("player");
    await phone.locator('[data-service="preferences"]').tap();
    await phone.locator('#dialog [name="lang"]').selectOption("en");
    await phone.locator('#dialog button[type="submit"]').tap();
    const audit = (selector) =>
      phone.evaluate((sel) => {
        const root = document.querySelector(sel);
        const small = [];
        for (const el of root.querySelectorAll("button, input, select, summary")) {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || el.type === "hidden") continue;
          const check = el.type === "checkbox" || el.type === "radio";
          const box = check ? (el.closest("label")?.getBoundingClientRect() ?? r) : r;
          if (box.height < 40 || (!check && box.width < 40))
            small.push(`${el.tagName} ${(el.textContent || el.name || "").trim().slice(0, 20)}`);
        }
        return {
          small,
          overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          italian: (
            [...root.querySelectorAll("button, label, summary, h4, dt, .muted, .badge, small")]
              .filter((node) => !node.closest(".loot-ledger, .loot-parcel-head h3"))
              .map((node) => node.innerText)
              .join(" ")
              .match(/\b(Scorta|Vendi|Monete|Borsa|Bottino|Nessun[ao]?|Assegna|dalla)\b/g) ?? []
          ).join(","),
        };
      }, selector);
    const phoneShop = await openDrawer("loot-shop", phone);
    await phoneShop.locator(".loot-row", { hasText: "Holy Symbol" }).waitFor();
    await phoneShop
      .locator(".loot-row", { hasText: "Mace" })
      .locator('[data-kind="sell-stash"]')
      .tap();
    await phoneShop.locator('[data-loot-select="pay"]').waitFor();
    let result = await audit('[data-ext-slot="table-panel:loot-shop"]');
    check(
      !result.overflow && !result.small.length && !result.italian,
      "Phone shop: " + JSON.stringify(result),
    );
    await phoneShop
      .locator("#loot-shop-stash-title")
      .evaluate((el) => el.scrollIntoView({ block: "start" }));
    await phone.screenshot({ path: dir + "b26-r2-06-phone-en-shop-stash.png" });
    await phoneShop.locator('[data-loot="cart-clear"]').tap();
    const phoneLoot = await openDrawer("loot", phone);
    result = await audit('[data-ext-slot="table-panel:loot"]');
    check(!result.overflow && !result.small.length, "Phone loot: " + JSON.stringify(result));
    await phoneContext.close();
    passed.push(
      "F. EN 390 touch as player: shop with the party stash section, a stash sale and the payment choice, and the loot drawer: no overflow, every control ≥ 40 px, no Italian leftovers",
    );

    check(!errors.length, "Page errors: " + errors.join(" | "));
  } catch (error) {
    await page.screenshot({ path: dir + "b26-r2-failure.png" }).catch(() => null);
    await context.close().catch(() => null);
    return { failed: String(error.message).slice(0, 900), passed, notes, errors };
  }
  await context.close();
  return { passed, notes, errors };
};
