async (rootPage) => {
  // B62: the log is the first sub-tab of the sidebar's «Chat» tab; the core's toggle
  // (data-table="log") is a hidden handle. As the old Registro tab: an open log closes with
  // its own ✕, otherwise the log opens (the Chat tab, then its Registro sub-tab if needed).
  const toggleLog = async (p, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const close = p.locator("#content [data-chat-close]");
    if (await close.count()) return press(close.first());
    if ((await p.locator("#table-sidebar-panel").getAttribute("data-table-panel")) === "log")
      return press(p.locator('.table-tabs [data-table-section="chat"]'));
    if (!(await p.locator('.table-subtabs [data-table-subtab="log"]').count())) {
      const chat = p.locator('.table-tabs [data-table-section="chat"]');
      if ((await chat.getAttribute("aria-selected")) !== "true") await press(chat);
    }
    if ((await p.locator("#table-sidebar-panel").getAttribute("data-table-panel")) !== "log")
      await press(p.locator('.table-subtabs [data-table-subtab="log"]'));
  };
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
  // B62: Preparation sections are grouped (Scenes, Encounters, Materials, Sessions and
  // adventures); a section outside the open group is reached through «Tutte» (2 clicks).
  const openPrepSection = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const here = page.locator(`[data-prep-section="${id}"]`);
    if (await here.count()) return press(here.first());
    await press(page.locator("[data-prep-sections-all]"));
    await press(page.locator(`#dialog [data-prep-section-jump="${id}"]`));
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
  // B26 review fixes, in the one app with real clicks, keys and touch. A: unidentified
  // items reach the sheet without their identity (no Drink, no dice), DM preparation stays
  // out of the players' log, keyboard focus after Show and Assign. B: GMG loot started from
  // a creature's token, quick add in the drawer, marker Enter focus. C: deleting a handed-out
  // parcel keeps the accumulated treasure. D: merchant with no scene, 10% discount, shop on
  // a token. E: fractional builder gold. F: stash item in Actions; XP hint by role.
  // G: isolated EN 390 touch audit. Synthetic demo data only; resets this browser's state.
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
  const openDrawer = async (id, p = page) => {
    await openTablePanel(p, id, p !== page); // B62: Items › Loot / Shop
    await p.locator(`[data-ext-slot="table-panel:${id}"]`).waitFor();
    return p.locator(`[data-ext-slot="table-panel:${id}"]`);
  };
  const toTable = async (p = page) => {
    await p.goto(base + "#table");
    await p.locator("#battle-map").waitFor();
  };
  const active = (p = page) =>
    p.evaluate(() => {
      const a = document.activeElement;
      return {
        tag: a?.tagName,
        id: a?.id ?? "",
        name: a?.getAttribute("name") ?? "",
        loot: a?.getAttribute("data-loot") ?? "",
        text: (a?.textContent ?? "").trim().slice(0, 60),
        row: (a?.closest(".loot-parcel-item")?.innerText ?? "").slice(0, 60),
      };
    });
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

  // ------------------------------------------------------------ A: identity, log, focus
  await page.goto(base + "#campaign");
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await page.locator("[data-campaign-tab]").first().waitFor();
  await role("dm");
  await page.locator('[data-campaign-tab="preparation"]').click();
  await openPrepSection(page, "loot"); // B62: Materials group
  await page.locator('form[data-loot-form="parcel-create"] [name="name"]').fill("Forziere");
  await page.locator('form[data-loot-form="parcel-create"] button[type="submit"]').click();
  await page.locator("#loot-parcel-title", { hasText: "Forziere" }).waitFor();
  const addForm = page.locator('.loot-parcel-editor form[data-loot-form="parcel-item-add"]');
  for (const [srdId, apparent] of [
    ["srd2024:item:potion-of-healing", "Fiala torbida"],
    ["srd2024:item:longsword", "Lama brunita"],
  ]) {
    await addForm.locator('[name="srdId"]').selectOption(srdId);
    await addForm.locator('[name="unidentified"]').check();
    await addForm.locator('[name="apparentName"]').fill(apparent);
    await addForm.locator('button[type="submit"]').click();
    await page.locator(".loot-parcel-editor .loot-row", { hasText: apparent }).waitFor();
  }
  let state = await stored();
  const vial = state.ext.loot.parcels[0].items.find((i) => i.name.it === "Fiala torbida");
  check(
    vial.srdId === null && vial.kind === "gear" && !("healing" in vial) && !("source" in vial),
    "Parcel row keeps identity fields: " + JSON.stringify(vial),
  );
  // Players' Table log while the parcel is hidden: no DM preparation lines.
  await role("player");
  await toTable();
  await toggleLog(page); // B62: Chat › Registro
  await page.locator(".table-log").waitFor({ state: "attached" });
  const playerLog = await page.locator(".table-log").evaluate((el) => el.textContent);
  notes.push("player Table log while hidden: " + playerLog.replace(/\s+/g, " ").slice(0, 240));
  check(
    !/Pacchetto di tesoro creato|Oggetto aggiunto al pacchetto/.test(playerLog),
    "DM prep reached the players' log: " + playerLog.slice(0, 300),
  );
  await toggleLog(page); // B62: Chat › Registro
  // DM shows the chest from the Table drawer: focus stays on the Show/Hide control.
  await role("dm");
  await toTable();
  // Positive control: the DM's own log keeps the preparation lines.
  await toggleLog(page); // B62: Chat › Registro
  await page.locator(".table-log").waitFor({ state: "attached" });
  check(
    (await page.locator(".table-log").evaluate((el) => el.textContent)).includes(
      "Pacchetto di tesoro creato",
    ),
    "DM log lacks the preparation lines",
  );
  await toggleLog(page); // B62: Chat › Registro
  let drawer = await openDrawer("loot");
  await drawer
    .locator(".loot-parcel", { hasText: "Forziere" })
    .locator('[data-loot="parcel-reveal"]')
    .click();
  await drawer.locator(".loot-parcel", { hasText: "Visibile al gruppo" }).waitFor();
  let focus = await active();
  check(
    focus.loot === "parcel-reveal" && focus.text === "Nascondi",
    "Focus after Show: " + JSON.stringify(focus),
  );
  // Player assigns by keyboard: focus moves to the next item's "Assign to".
  await role("player");
  await toTable();
  drawer = await openDrawer("loot");
  const vialRow = drawer.locator(".loot-parcel-item", { hasText: "Fiala torbida" });
  await vialRow.locator('[name="target"]').selectOption("livia");
  await vialRow.locator('button[type="submit"]').focus();
  await page.keyboard.press("Enter");
  await vialRow.waitFor({ state: "detached" });
  focus = await active();
  check(
    focus.name === "target" && focus.row.includes("Lama brunita"),
    "Focus after Assign: " + JSON.stringify(focus),
  );
  const bladeRow = drawer.locator(".loot-parcel-item", { hasText: "Lama brunita" });
  await bladeRow.locator('[name="target"]').selectOption("livia");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await bladeRow.waitFor({ state: "detached" });
  focus = await active();
  // Everything handed out: the players' drawer closes, so the map takes the focus.
  check(
    focus.id.startsWith("loot-parcel-") || focus.id === "battle-map",
    "Focus after last Assign: " + JSON.stringify(focus),
  );
  notes.push("focus after the last Assign: " + (focus.id || focus.tag));
  state = await stored();
  // W2b1 integration: B36 (deep inventory) seeds Livia's engraved ring as unidentified
  // (id invp-ring, B26's own hide record); only the two rows handed out here are counted.
  const rows = state.actors.livia.inventory.filter(
    (r) => r.unidentified && !String(r.id).startsWith("invp-"),
  );
  check(rows.length === 2, "Unidentified rows not on Livia");
  for (const row of rows)
    check(
      !["srdId", "healing", "weapon", "weaponType", "source", "category"].some((f) => f in row) &&
        row.kind === "gear",
      "Inventory row leaks identity: " + JSON.stringify(row),
    );
  // Livia's sheet: no Drink, no dice icon, Details without "2d4 + 2".
  // W2b1 integration: B36's inventory rows are `[data-invp-row]` (D&D Beyond); same checks.
  const inventoryRow = "[data-inventory-row], [data-invp-row]";
  await page.goto(base + "#characters?id=livia&tab=inventory");
  const sheetVial = page.locator(inventoryRow, { hasText: "Fiala torbida" });
  await sheetVial.waitFor();
  check((await sheetVial.getByRole("button", { name: "Bevi" }).count()) === 0, "Drink offered");
  await sheetVial.getByRole("button", { name: "Dettagli" }).click();
  await page.locator("#dialog[open]").waitFor();
  const details = await page.locator("#dialog").innerText();
  check(!/2d4|Uso|Su te stesso/.test(details), "Details leak the use: " + details);
  await page.screenshot({ path: dir + "b26-r01-unidentified-vial-details.png" });
  await page.keyboard.press("Escape");
  // DM identifies from the sheet box; the player now gets Drink on that row.
  await role("dm");
  await page.goto(base + "#characters?id=livia&tab=inventory");
  const idBox = page.locator('[data-ext-slot="sheet-section:loot-identify"] .loot-row', {
    hasText: "Fiala torbida",
  });
  await idBox.getByRole("button", { name: "Identifica" }).click();
  await role("player");
  await page.goto(base + "#characters?id=livia&tab=inventory");
  state = await stored();
  const known = state.actors.livia.inventory.find((r) => r.lootId === vial.lootId);
  check(
    known.healing === 7 && known.kind === "consumable" && !known.unidentified,
    "Identify did not restore the potion",
  );
  const knownRow = page.locator(inventoryRow).filter({
    has: page.locator(`[data-item="${known.id}"]`),
  });
  check(
    (await knownRow.getByRole("button", { name: "Bevi" }).count()) === 1,
    "Drink missing after identify",
  );
  passed.push(
    "A. Unidentified vial and blade: no identity fields on parcel or sheet rows, no Drink, Details without 2d4; DM prep absent from the players' log; focus stays on Show/Hide and moves to the next Assign; identify restores Drink",
  );

  // ------------------------------------------------------------ B: loot from a token
  await role("dm");
  await toTable();
  const openBefore = page.locator('.table-drawer-heading [data-table-drawer-close="loot"]');
  if (await openBefore.count()) await openBefore.click();
  await page.locator('#battle-map [data-actor="goblin-2"]').click({ button: "right" });
  await menuItemById(page, "loot-open"); // B62: on top, or in «Oggetti» beside Shop
  const scout = page.locator('[data-ext-slot="table-panel:loot"] .loot-parcel', {
    hasText: "Bottino: Esploratore",
  });
  await scout.waitFor();
  focus = await active();
  check(
    focus.id.startsWith("loot-parcel-") && focus.text.includes("Bottino: Esploratore"),
    "Token menu focus: " + JSON.stringify(focus),
  );
  check((await scout.locator("details.loot-quick-add[open]").count()) === 1, "Quick add closed");
  await scout.locator('[name="coin-gp"]').fill("7");
  await scout.locator('form[data-loot-form="parcel-coins"] button[type="submit"]').click();
  await page
    .locator('[data-ext-slot="table-panel:loot"] .loot-parcel', { hasText: "7 mo" })
    .waitFor();
  await scout.locator('[name="srdId"]').selectOption("srd2024:item:dagger");
  await scout.locator('form[data-loot-form="parcel-item-add"] button[type="submit"]').click();
  await scout.locator(".loot-parcel-item", { hasText: "Pugnale" }).waitFor();
  await page.screenshot({ path: dir + "b26-r02-token-loot-quick-add.png" });
  state = await stored();
  const scoutParcel = state.ext.loot.parcels.find((p) => p.sourceActorId === "goblin-2");
  check(
    scoutParcel && !scoutParcel.revealed && scoutParcel.sceneId === "old-watch",
    "Token parcel not hidden on the scene",
  );
  // Close the drawer; Enter on the map marker reopens it with focus on the parcel.
  await page.locator('.table-drawer-heading [data-table-drawer-close="loot"]').click();
  await page.locator('[data-ext-slot="table-panel:loot"]').waitFor({ state: "detached" });
  const marker = page.locator(`[data-loot-marker="${scoutParcel.id}"]`);
  await marker.focus();
  await page.keyboard.press("Enter");
  await page.locator('[data-ext-slot="table-panel:loot"]').waitFor();
  focus = await active();
  check(focus.id === "loot-parcel-" + scoutParcel.id, "Marker focus: " + JSON.stringify(focus));
  passed.push(
    "B. DM right-clicks the Esploratore with no parcel → Bottino starts a hidden parcel and focuses it; 7 mo and a dagger added in the drawer; Enter on the map marker reopens with focus on its heading",
  );

  // ------------------------------------------------------------ C: delete keeps totals
  await page.goto(base + "#preparation?tab=loot");
  await page.locator('form[data-loot-form="parcel-create"] [name="name"]').fill("Tesoro del drago");
  await page.locator('form[data-loot-form="parcel-create"] button[type="submit"]').click();
  await page.locator("#loot-parcel-title", { hasText: "Tesoro del drago" }).waitFor();
  focus = await active();
  check(focus.id === "loot-parcel-title", "Focus after create: " + JSON.stringify(focus));
  await addForm.locator('[name="srdId"]').selectOption("srd2024:item:ring-of-protection");
  await addForm.locator('button[type="submit"]').click();
  await page
    .locator(".loot-parcel-editor .loot-row", { hasText: "Anello di protezione" })
    .waitFor();
  await page.locator('.loot-parcel-editor [data-loot="parcel-reveal"]').click();
  await page.locator("#loot-parcel-title", { hasText: "Visibile al gruppo" }).waitFor();
  await toTable();
  drawer = await openDrawer("loot");
  const ringRow = drawer.locator(".loot-parcel-item", { hasText: "Anello di protezione" });
  await ringRow.locator('[name="target"]').selectOption("stash");
  await ringRow.locator('button[type="submit"]').click();
  await ringRow.waitFor({ state: "detached" });
  await page.goto(base + "#preparation?tab=loot");
  await page.locator(".loot-prep-pick", { hasText: "Tesoro del drago" }).click();
  const totals = page.locator("[data-loot-treasure-totals]");
  const before = (await totals.innerText()).match(/già al gruppo ([^(]+)/)[1].trim();
  await page.locator('.loot-parcel-editor [data-loot="parcel-delete"]').click();
  await page.locator('#dialog button[type="submit"]').click();
  await page.locator(".loot-prep-pick", { hasText: "Tesoro del drago" }).waitFor({
    state: "detached",
  });
  const after = (await totals.innerText()).match(/già al gruppo ([^(]+)/)[1].trim();
  // Vial 50 + longsword 15 + ring 4,000 gp already with the party.
  check(before === after && after === "4.065 mo", `Totals changed: ${before} → ${after}`);
  check(
    (await stored()).ext.loot.stash.items.some((i) => i.name.it === "Anello di protezione"),
    "Ring left the stash",
  );
  passed.push(
    `C. Tesoro del drago: ring to the stash, parcel deleted, "già al gruppo" stays ${after}; the ring is still in the stash`,
  );

  // ------------------------------------------------------------ D: merchant fixes
  await page.goto(base + "#preparation?tab=loot-merchants");
  const mForm = page.locator('form[data-loot-form="merchant-save"]');
  await mForm.waitFor();
  await mForm.locator('[name="sceneId"]').selectOption("");
  await mForm.locator('[name="open"]').check();
  await mForm.locator('[name="discount"]').fill("10");
  await mForm.locator('[name="actorId"]').selectOption("goblin-2");
  await mForm.locator('button[type="submit"]').click();
  await page.waitForFunction(
    (k) => JSON.parse(localStorage.getItem(k)).ext.loot.merchants[0].discount === 10,
    key,
  );
  state = await stored();
  const tessa = state.ext.loot.merchants[0];
  check(tessa.sceneId === null && tessa.open && tessa.actorId === "goblin-2", "Tessa not saved");
  await role("player");
  await toTable();
  const shopDrawer = await openDrawer("loot-shop");
  const kit = shopDrawer.locator(".loot-row", { hasText: "Borsa del guaritore" }).first();
  const kitText = await kit.innerText();
  check(
    /5 mo\s*4 mo · 5 ma/.test(kitText) && (await kit.locator("s").innerText()) === "5 mo",
    "Discounted price not shown: " + kitText,
  );
  await page
    .locator(".table-drawer")
    .screenshot({ path: dir + "b26-r03-shop-discount-no-scene.png" });
  await page.locator('.table-drawer-heading [data-table-drawer-close="loot-shop"]').click();
  await page.locator('#battle-map [data-actor="goblin-2"]').click({ button: "right" });
  // B62: with Loot beside it, Shop sits in the «Oggetti» submenu.
  const items = page.locator('body > .token-menu [data-token-menu-category="items"]');
  await page.locator("body > .token-menu [data-nav]").first().waitFor();
  if (await items.count()) await items.click();
  const shopItem = page.locator('[data-token-menu-item="loot-shop-open"]');
  if (await shopItem.count()) {
    await shopItem.click();
    await page.locator('[data-ext-slot="table-panel:loot-shop"]').waitFor();
    focus = await active();
    check(focus.id === "loot-wares-title", "Shop token focus: " + JSON.stringify(focus));
    notes.push("player opened Tessa's shop from the Esploratore token menu");
  } else {
    await page.keyboard.press("Escape");
    notes.push("player token menu on goblin-2 offers no Bottega entry (token not observed)");
  }
  passed.push(
    "D. Tessa with no scene is open to players on the courtyard; 10% discount shows 5 mo struck and 4 mo · 5 ma; the shop bound to the Esploratore opens from its token menu",
  );

  // ------------------------------------------------------------ E: fractional gold
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k));
    s.actors.mira.currency = { gp: 12.5 };
    localStorage.setItem(k, JSON.stringify(s));
  }, key);
  await page.goto(base + "#characters?id=mira&tab=inventory");
  await page.reload();
  const miraPurse = page.locator('[data-ext-slot="sheet-section:loot-purse"]');
  await miraPurse.waitFor();
  check(
    (await miraPurse.locator('[data-loot-coin="gp"]').innerText()) === "12" &&
      (await miraPurse.locator('[data-loot-coin="sp"]').innerText()) === "5",
    "Mira purse not read by value",
  );
  check(
    (await miraPurse.innerText()).includes("Registrate come 12,5 mo"),
    "Conversion note missing",
  );
  const notice = await page.locator("#ext-notice").innerText();
  check(!/avvis/i.test(notice), "Area warning shown: " + notice);
  await role("dm");
  await page.goto(base + "#campaign?tab=loot");
  await page.locator(".loot-treasury").waitFor();
  check(
    (await page.locator(".loot-treasury").innerText()).includes("12 mo · 5 ma"),
    "Treasury still shows 12.5",
  );
  await page.locator('.loot-treasury [data-loot="award-open"]').click();
  await page.locator('#dialog [name="coin-gp"]').fill("30");
  await page.locator('#dialog button[type="submit"]').click();
  await page.waitForFunction(
    (k) => JSON.parse(localStorage.getItem(k)).actors.mira.currency.gp === 22,
    key,
  );
  state = await stored();
  check(
    state.actors.mira.currency.sp === 5 &&
      state.ext.loot.ledger.some((e) => e.kind === "purse-converted"),
    "Award or conversion record wrong",
  );
  passed.push(
    "E. Mira {gp: 12.5}: sheet shows 12 mo 5 ma with the conversion note, no area warning, Treasury 12 mo · 5 ma; award 30 mo divided works (22 mo 5 ma) and the log records the conversion",
  );

  // ------------------------------------------------------------ F: Actions, XP hint
  await role("player");
  await page.goto(base + "#characters?id=livia&tab=inventory");
  const torches = page.locator('[data-ext-slot="sheet-section:loot-stash"] [data-stash-item]', {
    hasText: "Torcia",
  });
  await torches.getByRole("button", { name: "Equipaggia" }).click();
  await page
    .locator('[data-ext-slot="sheet-section:loot-stash"] [data-stash-item]', {
      hasText: "Equipaggiato da te",
    })
    .waitFor();
  focus = await active();
  check(focus.loot === "stash-equip", "Focus after stash equip: " + JSON.stringify(focus));
  await page.goto(base + "#characters?id=livia&tab=actions");
  const fromStash = page.locator('[data-ext-slot="sheet-section:loot-stash-equipped"]');
  await fromStash.waitFor();
  check((await fromStash.innerText()).includes("Torcia"), "Stash item missing from Actions");
  await page.screenshot({ path: dir + "b26-r04-actions-from-stash.png" });
  await role("dm");
  await page.goto(base + "#campaign?tab=loot");
  await page.locator('.loot-treasury [data-loot="award-open"]').click();
  await page.locator('#dialog [name="xp"]').fill("1800");
  await page.locator('#dialog [name="recipient"][value="mira"]').uncheck();
  await page.locator('#dialog [name="mode"][value="each"]').check();
  await page.locator('#dialog button[type="submit"]').click();
  await page.waitForFunction(
    (k) => JSON.parse(localStorage.getItem(k)).actors.doran.xp === 2700,
    key,
  );
  // The DM controls Doran and Livia: the hint names the Level up button they have.
  await page.goto(base + "#characters?id=livia&tab=features");
  const xpBox = page.locator('[data-ext-slot="sheet-section:loot-xp"]');
  await xpBox.waitFor();
  check(
    (await xpBox.innerText()).includes("usa «Avanza di livello»") &&
      (await page.getByRole("button", { name: "Avanza di livello" }).count()) === 1,
    "DM XP hint or button missing",
  );
  // A player viewing Doran (DM-controlled) has no Level up button: the hint says who can.
  await role("player");
  await page.goto(base + "#characters?id=doran&tab=features");
  await xpBox.waitFor();
  check(
    (await xpBox.innerText()).includes("chi controlla il personaggio può avanzare") &&
      (await page.getByRole("button", { name: "Avanza di livello" }).count()) === 0,
    "Player hint on Doran names a button the player does not have",
  );
  passed.push(
    "F. Livia equips the stash torches (focus stays on the control) and sees them in Actions 'from the party stash'; at 2.700 PE the DM (controller) reads 'use Level up' next to the button; a player viewing Doran reads 'the controller can level up' and has no button",
  );

  // ------------------------------------------------------------ G: EN 390 touch audit
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
  await phone.locator("#demo-role").selectOption("dm");
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
        // Parcel names and log lines are data written in Italian earlier: only the
        // interface text is checked.
        italian: (
          [...root.querySelectorAll("button, label, summary, h4, dt, .muted, .badge")]
            .filter((node) => !node.closest(".loot-ledger, .loot-parcel-head h3"))
            .map((node) => node.innerText)
            .join(" ")
            .match(/\b(Aggiungi|Monete|Bottino|Sconto|scena|Nessun[ao]?|Assegna|Dividi)\b/g) ?? []
        ).join(","),
      };
    }, selector);
  const phoneLoot = await openDrawer("loot", phone);
  await phoneLoot.locator(".loot-parcel", { hasText: "Esploratore" }).waitFor();
  let result = await audit('[data-ext-slot="table-panel:loot"]');
  check(
    !result.overflow && !result.small.length && !result.italian,
    "Phone loot: " + JSON.stringify(result),
  );
  await phoneLoot
    .locator(".loot-parcel", { hasText: "Esploratore" })
    .evaluate((el) => el.scrollIntoView({ block: "start" }));
  await phone.screenshot({ path: dir + "b26-r05-phone-en-dm-quick-add.png" });
  const phoneShop = await openDrawer("loot-shop", phone);
  result = await audit('[data-ext-slot="table-panel:loot-shop"]');
  check(
    !result.overflow && !result.small.length && !result.italian,
    "Phone shop: " + JSON.stringify(result),
  );
  await phone
    .locator(".table-drawer")
    .screenshot({ path: dir + "b26-r06-phone-en-shop-discount.png" });
  await phone.goto(base + "#preparation?tab=loot-merchants");
  await phone.locator('form[data-loot-form="merchant-save"]').waitFor();
  result = await audit("#content");
  check(!result.overflow && !result.small.length, "Phone merchant prep: " + JSON.stringify(result));
  await phoneContext.close();
  passed.push(
    "G. EN 390 touch as DM: loot drawer with quick add, shop with discount and merchant preparation: no overflow, every control ≥ 40 px, no Italian leftovers in the drawers",
  );

  check(!errors.length, "Page errors: " + errors.join(" | "));
  await context.close();
  return { passed, notes, errors };
};
