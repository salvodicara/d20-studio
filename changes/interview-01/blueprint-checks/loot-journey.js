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
  // B26 — treasure, loot, party stash and merchants, in the one app with real clicks, keys
  // and touch. Group 1 DM preparation (IT 1440), group 2 player loot at the Table with
  // split/Undo/reload, group 3 shop (insufficient funds, 80% sale, DM price, buyback),
  // group 4 DM identify/award/NPC clean copies, group 5 isolated EN 390 touch context.
  // Synthetic demo data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B26/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const loot = async (p = page) => (await stored(p)).ext.loot;
  const content = (p = page) => p.locator("#content").innerText();
  const shot = async (name, locator = null, top = false) => {
    if (locator && top) await locator.evaluate((el) => el.scrollIntoView({ block: "start" }));
    else if (locator) await locator.scrollIntoViewIfNeeded();
    await page.screenshot({ path: dir + name });
  };
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
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

  // ------------------------------------------------------------ group 1: DM preparation
  await page.goto(base + "#campaign");
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await page.locator("[data-campaign-tab]").first().waitFor();
  // W2b1 integration: B36 (deep inventory) seeds a sample purse on Livia (30 mo, 45 ma,
  // 120 mr); this journey's arithmetic (split, shop, award) starts from empty purses, so the
  // fixture empties hers once. B36 seeds only a missing slice, so the reload keeps it empty.
  await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k));
    delete s.actors.livia.currency;
    localStorage.setItem(k, JSON.stringify(s));
  }, key);
  await page.reload();
  await page.locator("[data-campaign-tab]").first().waitFor();
  await role("dm");
  // Campaign → Preparazione → Tesori: two clicks.
  await page.locator('[data-campaign-tab="preparation"]').click();
  await openPrepSection(page, "loot"); // B62: Materials group
  await page.locator('form[data-loot-form="parcel-create"]').waitFor();
  check((await content()).includes("Nessun pacchetto"), "Empty treasure list not shown");
  await page.locator('form[data-loot-form="parcel-create"] [name="name"]').fill("Forziere");
  await page.locator('form[data-loot-form="parcel-create"] button[type="submit"]').click();
  await page.locator("#loot-parcel-title", { hasText: "Forziere" }).waitFor();
  await page.locator('[name="coin-gp"]').fill("120");
  await page.locator('[name="coin-sp"]').fill("25");
  await page.locator('form[data-loot-form="parcel-coins"] button[type="submit"]').click();
  const addForm = page.locator('form[data-loot-form="parcel-item-add"]');
  await addForm.locator('[name="srdId"]').selectOption("srd2024:item:potion-of-healing");
  await addForm.locator('button[type="submit"]').click();
  await page
    .locator(".loot-parcel-editor .loot-row", { hasText: "Pozione di guarigione" })
    .waitFor();
  await addForm.locator('[name="srdId"]').selectOption("srd2024:item:ring-of-protection");
  await addForm.locator('[name="unidentified"]').check();
  await addForm.locator('[name="apparentName"]').fill("Anello d'argento inciso");
  await addForm.locator('button[type="submit"]').click();
  await page
    .locator(".loot-parcel-editor .loot-row", { hasText: "Anello d'argento inciso" })
    .waitFor();
  let data = await loot();
  let chest = data.parcels.find((p) => p.name === "Forziere");
  check(
    chest.sceneId === "old-watch" && chest.coins.gp === 120 && chest.coins.sp === 25,
    "Chest coins/scene not saved",
  );
  check(chest.items.length === 2 && chest.items[1].identified === false, "Chest items not saved");
  check(
    data.secrets[chest.items[1].lootId].name.it === "Anello di protezione",
    "True ring identity not kept for the DM",
  );
  check(
    (await content()).includes("in realtà: Anello di protezione"),
    "DM does not see the true name",
  );
  check((await content()).includes("Nascosto ai giocatori"), "Prepared parcel not marked hidden");
  check(
    (await page.locator("[data-loot-treasure-totals]").innerText()).includes(
      "da trovare 4.172 mo · 5 ma · già al gruppo 0 mo",
    ),
    "Treasure totals (PR-55) wrong",
  );
  await shot("b26-01-prep-chest-it-1440.png", page.locator(".loot-prep-layout"), true);
  passed.push(
    "1. DM: Campaign → Preparazione → Tesori; Forziere 120 mo 25 ma + potion + unidentified ring, tied to the scene",
  );

  // NPC gear from the stat block's Gear entry, as clean catalog copies (PR-47).
  await page
    .locator('form[data-loot-form="parcel-create"] [name="name"]')
    .fill("Bottino della Sentinella");
  await page.locator('form[data-loot-form="parcel-create"] button[type="submit"]').click();
  await page.locator("#loot-parcel-title", { hasText: "Bottino della Sentinella" }).waitFor();
  await page
    .locator('form[data-loot-form="parcel-save"] [name="sourceActorId"]')
    .selectOption("goblin-1");
  await page.locator('form[data-loot-form="parcel-save"] button[type="submit"]').click();
  await page.waitForFunction(
    (k) => JSON.parse(localStorage.getItem(k)).ext.loot.parcels.at(-1).sourceActorId === "goblin-1",
    key,
  );
  const gearForm = page.locator('form[data-loot-form="parcel-statblock-add"]');
  await gearForm.locator('[name="creatureId"]').selectOption("srd2024:creature:goblin-warrior");
  await gearForm.locator('button[type="submit"]').click();
  await page.locator(".loot-parcel-editor .loot-row", { hasText: "Scimitarra" }).waitFor();
  const scimitarRow = await page
    .locator(".loot-parcel-editor .loot-row", { hasText: "Scimitarra" })
    .innerText();
  check(
    scimitarRow.includes("1d6 taglienti"),
    "Clean scimitar damage not the Equipment 1d6: " + scimitarRow,
  );
  check(
    scimitarRow.includes("Non copiato dal blocco") && scimitarRow.includes("+4"),
    "Dropped stat-block attack not shown",
  );
  data = await loot();
  const sentinel = data.parcels.at(-1);
  check(
    sentinel.items.map((i) => i.name.en).join() === "Leather Armor,Scimitar,Shield,Shortbow",
    "Gear list wrong",
  );
  check(!JSON.stringify(sentinel.items).includes("1d6+2"), "Stat-block damage leaked into loot");
  await shot("b26-02-prep-npc-clean-copies.png", page.locator(".loot-parcel-editor .loot-list"));
  passed.push(
    "6. Sentinella loot from the Goblin Warrior Gear entry: clean SRD copies (1d6), the +4/1d6+2 attack shown as not copied",
  );

  // Show the chest to the players (Owlbear Loot! "share").
  await page.locator(".loot-prep-pick", { hasText: "Forziere" }).click();
  await page.locator("#loot-parcel-title", { hasText: "Forziere" }).waitFor();
  await page.locator('.loot-parcel-editor [data-loot="parcel-reveal"]').click();
  await page.locator("#loot-parcel-title", { hasText: "Visibile al gruppo" }).waitFor();
  // Merchant: open the shop and set its rate to 80% (SRD default 50% shown).
  await openPrepSection(page, "loot-merchants");
  const merchantForm = page.locator('form[data-loot-form="merchant-save"]');
  await merchantForm.waitFor();
  check(
    (await merchantForm.locator('[name="buyRate"]').inputValue()) === "50",
    "SRD default rate is not 50%",
  );
  check((await content()).includes("metà del prezzo (50%)"), "SRD selling rule note missing");
  await merchantForm.locator('[name="buyRate"]').fill("80");
  await merchantForm.locator('[name="open"]').check();
  await merchantForm.locator('button[type="submit"]').click();
  await page.waitForFunction(
    (k) => JSON.parse(localStorage.getItem(k)).ext.loot.merchants[0].buyRate === 80,
    key,
  );
  data = await loot();
  check(data.merchants[0].open === true, "Shop not opened");
  await shot("b26-03-prep-merchant.png");
  passed.push(
    "DM reveals the chest and opens Carro di Tessa at 80% (SRD 50% default and rule note visible)",
  );

  // ------------------------------------------------------------ group 2: player loot at the Table
  await role("player");
  await toTable();
  check(
    (await page.locator("[data-loot-marker]").count()) === 0,
    "Hidden NPC loot marker visible to the player",
  );
  const drawer = await openDrawer("loot");
  const drawerText = await drawer.innerText();
  check(
    drawerText.includes("Forziere") && drawerText.includes("Anello d'argento inciso"),
    "Player drawer lacks the chest",
  );
  check(!drawerText.includes("Anello di protezione"), "True ring name leaked to the player");
  check(!drawerText.includes("Sentinella"), "Hidden parcel visible to the player");
  await shot("b26-04-table-loot-player.png", drawer);
  const potionRow = drawer.locator(".loot-parcel-item", { hasText: "Pozione di guarigione" });
  check(
    (await potionRow.locator('[name="target"] option').allInnerTexts()).join() ===
      "Livia,Mira,Scorta del gruppo",
    "Player targets not limited to own characters and stash",
  );
  await potionRow.locator('[name="target"]').selectOption("livia");
  await potionRow.locator('button[type="submit"]').click();
  await page
    .locator(".loot-parcel-item", { hasText: "Pozione di guarigione" })
    .waitFor({ state: "detached" });
  const ringRow = page.locator(".loot-parcel-item", { hasText: "Anello d'argento inciso" });
  await ringRow.locator('[name="target"]').selectOption("stash");
  await ringRow.locator('button[type="submit"]').click();
  await ringRow.waitFor({ state: "detached" });
  // Split coins: keyboard toggles Mira off and on; the preview follows; remainder to the stash.
  await page.locator('[data-loot="parcel-split"]').click();
  const preview = page.locator("#dialog [data-loot-split-preview]");
  await preview.waitFor();
  check(
    (await preview.innerText()) === "A testa: 40 mo · 8 ma · resto nella scorta: 1 ma",
    "Split preview: " + (await preview.innerText()),
  );
  await page.locator('#dialog [name="recipient"][value="mira"]').focus();
  await page.keyboard.press("Space");
  check(
    (await preview.innerText()) === "A testa: 60 mo · 12 ma · resto nella scorta: 1 ma",
    "Preview after unchecking Mira: " + (await preview.innerText()),
  );
  await page.keyboard.press("Space");
  await shot("b26-05-split-dialog.png");
  await page.locator('#dialog button[type="submit"]').click();
  await page.waitForFunction(
    (k) => JSON.parse(localStorage.getItem(k)).actors.mira.currency?.gp === 40,
    key,
  );
  let state = await stored();
  for (const id of ["livia", "doran", "mira"])
    check(
      state.actors[id].currency.gp === 40 && state.actors[id].currency.sp === 8,
      id + " purse wrong",
    );
  check(
    state.ext.loot.stash.coins.gp === 15 && state.ext.loot.stash.coins.sp === 1,
    "Remainder not kept in the stash",
  );
  check(
    state.actors.livia.inventory.find((r) => r.id === "potion").quantity === 4,
    "Potion did not stack on Livia's potions",
  );
  check(
    state.ext.loot.stash.items.some((i) => i.name.it === "Anello d'argento inciso"),
    "Ring not in the stash",
  );
  check(
    state.ext.loot.ledger.at(-1).text.it.includes("resto nella scorta: 1 ma"),
    "Ledger lacks the remainder",
  );
  check(
    (await page.locator('[data-table-drawer="loot"]').count()) === 0,
    "Emptied loot still offered to the player",
  );
  passed.push(
    "2. Player at the Table: potion → Livia (3→4), ring → stash, keyboard-checked split 40 mo 8 ma each, 1 ma kept",
  );
  // Undo from the Table inspector, then split again.
  await page.locator('[data-table="undo"]').click();
  await page.locator('[data-table-drawer="loot"]').first().waitFor({ state: "attached" });
  state = await stored();
  check(state.actors.livia.currency === undefined, "Undo left Livia's coins");
  check(
    state.ext.loot.parcels[0].coins.gp === 120 && state.log.at(-1).kind === "correction",
    "Undo did not restore the chest coins",
  );
  await openDrawer("loot");
  await page.locator('[data-loot="parcel-split"]').click();
  await page.locator('#dialog button[type="submit"]').click();
  await page.waitForFunction(
    (k) => JSON.parse(localStorage.getItem(k)).actors.livia.currency?.gp === 40,
    key,
  );
  passed.push("Undo from the Table restores the chest coins with a correction record; split again");
  // Reload keeps everything; the sheet shows the same data (one click from the Table).
  await page.reload();
  await page.locator("#battle-map").waitFor();
  check(
    (await page.locator("[data-loot-table-purse]").innerText()) === "40 mo · 8 ma",
    "Table inspector purse not shown",
  );
  await page.locator('[data-table="inventory"]').click();
  await page.locator('[data-ext-slot="sheet-section:loot-purse"]').waitFor();
  check(
    (await page.locator('[data-loot-coin="gp"]').innerText()) === "40",
    "Sheet purse wrong after reload",
  );
  // W2b1 integration: B36's inventory rows read "×4 · 0,25 kg" (D&D Beyond) where the core
  // wrote "× 4 · …"; the check now reads the potion's own row, in either format. Since the
  // interview-01 fixes «Inventario» opens the sheet in a drawer over the Table (TV-70).
  const sheetText = async () =>
    (await page.locator(".sheet-overlay").count())
      ? page.locator(".sheet-overlay").innerText()
      : content();
  check(
    /Pozione di guarigione comune[^×]{0,40}× ?4\b/.test(await sheetText()),
    "Sheet potion count not 4",
  );
  const stashBox = page.locator('[data-ext-slot="sheet-section:loot-stash"]');
  const liviaRing = stashBox.locator("[data-stash-item]", { hasText: "Anello d'argento inciso" });
  check(
    (await liviaRing.innerText()).includes("Non identificato"),
    "Unidentified badge missing on the sheet stash",
  );
  await liviaRing.getByRole("button", { name: "Equipaggia", exact: true }).click();
  await stashBox.locator(".loot-badge-equipped", { hasText: "Equipaggiato da te" }).waitFor();
  await shot(
    "b26-06-sheet-purse-stash-livia.png",
    page.locator('[data-ext-slot="sheet-section:loot-purse"]'),
  );
  passed.push(
    "Reload keeps loot; Table inspector purse; Inventory tab shows potion ×4, 40 mo, stash ring equipped by Livia",
  );
  // Mira's sheet: the ring equipped by Livia cannot be taken, equipped or removed (3).
  await page.goto(base + "#characters?id=mira&tab=inventory");
  const miraRing = page.locator('[data-ext-slot="sheet-section:loot-stash"] [data-stash-item]', {
    hasText: "Anello d'argento inciso",
  });
  await miraRing.waitFor();
  check(
    (await miraRing.innerText()).includes("Equipaggiato da Livia"),
    "Mira does not see who equipped it",
  );
  for (const name of ["Prendi", "Equipaggia", "Rimuovi"])
    check(
      await miraRing.getByRole("button", { name, exact: true }).isDisabled(),
      name + " not disabled for Mira",
    );
  await shot("b26-07-sheet-stash-locked-mira.png", miraRing);
  passed.push(
    "3. Stash on Mira's sheet: 'Equipaggiato da Livia', Take/Equip/Remove disabled with the reason in view",
  );

  // ------------------------------------------------------------ group 3: shop
  await toTable();
  const shop = await openDrawer("loot-shop");
  check((await shop.locator("[data-loot-rate]").innerText()) === "80%", "Shop rate not 80%");
  await shop.getByRole("button", { name: "Aggiungi al carrello: Antitossina" }).click();
  const checkoutButton = page.locator('[data-loot="checkout"]');
  await checkoutButton.waitFor();
  check(await checkoutButton.isDisabled(), "Checkout enabled with insufficient funds");
  check(
    (await page.locator("#loot-checkout-why").innerText()).includes(
      "Fondi insufficienti: Livia ha 40 mo · 8 ma, servono 50 mo",
    ),
    "Insufficient funds reason missing",
  );
  await shot("b26-08-shop-insufficient-funds.png", page.locator(".loot-shop-grid"));
  await page.getByRole("button", { name: "Uno in meno: Antitossina" }).click();
  await checkoutButton.waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Aggiungi al carrello: Borsa del guaritore" }).click();
  const ropeSell = page
    .locator(".loot-shop-col .loot-row", { hasText: "Corda" })
    .filter({ has: page.locator('[data-kind="sell"]') });
  check(
    (await ropeSell.innerText()).includes("Il mercante paga 8 ma"),
    "Rope not offered at 80% (8 ma)",
  );
  await page.getByRole("button", { name: "Vendi: Corda" }).click();
  await page.locator("[data-loot-net]", { hasText: "4 mo · 2 ma" }).waitFor();
  check(
    (await page.locator(".loot-net dt").innerText()) === "Totale netto: paghi",
    "Net total label missing",
  );
  passed.push(
    "4a. Shop: Antitossina blocked by insufficient funds; − removes it; Borsa del guaritore + sell Corda at 80% (8 ma): net 4 mo 2 ma",
  );
  // DM corrects the total (haggle) with a reason.
  await role("dm");
  await toTable();
  await openDrawer("loot-shop");
  await page.locator('[data-loot="cart-override"]').click();
  await page.locator('#dialog [name="amountGp"]').fill("4");
  await page.locator('#dialog [name="reason"]').fill("Sconto per la lanterna ritrovata");
  await page.locator('#dialog button[type="submit"]').click();
  await page.locator("[data-loot-override]").waitFor();
  await shot("b26-09-shop-dm-corrected.png", page.locator(".loot-shop-grid"));
  await role("player");
  await toTable();
  await openDrawer("loot-shop");
  check(
    (await page.locator("[data-loot-override]").innerText()).includes(
      "Prezzo corretto dal DM: paghi 4 mo",
    ),
    "Player does not see the DM price",
  );
  await page.locator('[data-loot="checkout"]').click();
  await page.locator(".loot-shop-col h4", { hasText: "Riacquista" }).waitFor();
  state = await stored();
  const livia = state.actors.livia;
  check(
    livia.currency.gp === 36 && livia.currency.sp === 8,
    "Purse after trade: " + JSON.stringify(livia.currency),
  );
  check(
    livia.inventory.some((r) => r.srdId === "srd2024:item:healers-kit"),
    "Healer's kit not in inventory",
  );
  check(!livia.inventory.some((r) => r.id === "rope"), "Rope still in inventory");
  const tessa = state.ext.loot.merchants[0];
  check(tessa.fundsCp === 6400 && tessa.buyback[0].priceCp === 80, "Till/buyback wrong");
  check(
    state.ext.loot.ledger.at(-1).text.it.includes("prezzo corretto dal DM"),
    "Trade ledger lacks the DM price",
  );
  // Buyback at the sold price.
  await page.getByRole("button", { name: "Riacquista: Corda" }).click();
  await page.locator("[data-loot-net]", { hasText: "8 ma" }).waitFor();
  await page.locator('[data-loot="checkout"]').click();
  await page.waitForFunction(
    (k) => JSON.parse(localStorage.getItem(k)).actors.livia.currency.sp === 0,
    key,
  );
  state = await stored();
  check(
    state.actors.livia.inventory.some((r) => r.name?.en === "Rope"),
    "Rope not bought back",
  );
  check(state.ext.loot.merchants[0].buyback.length === 0, "Buyback not emptied");
  passed.push(
    "4b. DM corrected total to 4 mo (reason); player checkout: 36 mo 8 ma, kit in inventory, till +4 mo; rope bought back at 8 ma",
  );

  // ------------------------------------------------------------ group 4: DM identify, awards, NPC loot
  await role("dm");
  await toTable();
  const dmDrawer = await openDrawer("loot");
  await dmDrawer.getByRole("button", { name: "Identifica", exact: true }).click();
  await page
    .locator(".loot-ledger li", {
      hasText: "Identificato: Anello d'argento inciso è Anello di protezione",
    })
    .waitFor();
  state = await stored();
  check(
    state.ext.loot.stash.items.find((i) => i.lootId && i.name.it === "Anello di protezione")
      .equippedBy === "livia",
    "Identified ring lost its bearer",
  );
  await page.locator('[data-loot="award-open"]').click();
  await page.locator('#dialog [name="xp"]').fill("150");
  await page.locator('#dialog [name="coin-gp"]').fill("10");
  await page.locator('#dialog [name="reason"]').fill("Goblin dell'osservatorio messi in fuga");
  await page
    .locator("#dialog [data-loot-award-preview]", {
      hasText: "A testa: 50 PE + 3 mo · resto nella scorta: 1 mo",
    })
    .waitFor();
  await page.locator('#dialog button[type="submit"]').click();
  await page
    .locator(".loot-ledger li", { hasText: "50 PE + 3 mo a testa a Livia, Doran, Mira" })
    .waitFor();
  state = await stored();
  check(state.actors.livia.xp === 950 && state.actors.doran.xp === 950, "XP not 900 + 50");
  check(
    state.actors.livia.currency.gp === 39 && state.ext.loot.stash.coins.gp === 16,
    "Award coins or remainder wrong",
  );
  passed.push(
    "5. DM: ring identified in the stash (bearer kept); award 150 XP + 10 mo divided: 50 PE + 3 mo each, 1 mo to the stash, ledger",
  );
  // B12 token menu (right click on the Sentinella) offers "Bottino" and opens the drawer.
  await page.locator('.table-drawer-heading [data-table-drawer-close="loot"]').click();
  await page.locator('[data-ext-slot="table-panel:loot"]').waitFor({ state: "detached" });
  await page.locator('#battle-map [data-actor="goblin-1"]').click({ button: "right" });
  await menuItemById(page, "loot-open"); // B62: on top, or in «Oggetti» beside Shop
  await page
    .locator('[data-ext-slot="table-panel:loot"] .loot-parcel.is-focused', {
      hasText: "Bottino della Sentinella",
    })
    .waitFor();
  await page.keyboard.press("Escape");
  // NPC loot marker on the Sentinella token → reveal → scimitar to Doran.
  const marker = page.locator("[data-loot-marker]");
  check(
    (await marker.count()) === 1 && (await marker.getAttribute("class")).includes("is-hidden"),
    "DM loot marker missing",
  );
  await shot("b26-10a-map-loot-marker-dm.png", page.locator("#battle-map"));
  await marker.click();
  const sentinelCard = page.locator(".loot-parcel", { hasText: "Bottino della Sentinella" });
  await sentinelCard.locator('[data-loot="parcel-reveal"]').click();
  await page
    .locator(".loot-parcel", { hasText: "Bottino della Sentinella" })
    .locator(".loot-status-revealed")
    .waitFor();
  const scimitarLoot = page.locator(".loot-parcel-item", { hasText: "Scimitarra" });
  await scimitarLoot.locator('[name="target"]').selectOption("doran");
  await scimitarLoot.locator('button[type="submit"]').click();
  await scimitarLoot.waitFor({ state: "detached" });
  state = await stored();
  const doranBlade = state.actors.doran.inventory.find((r) => r.srdId === "srd2024:item:scimitar");
  check(
    doranBlade && doranBlade.weapon.damage.dice === "1d6" && doranBlade.clean.from === "stat-block",
    "Doran's scimitar is not a clean copy",
  );
  await shot("b26-10-table-dm-loot-drawer.png", page.locator(".table-drawer"));
  // Livia's Experience box on the sheet.
  await page.goto(base + "#characters?id=livia&tab=features");
  const xpBox = page.locator('[data-ext-slot="sheet-section:loot-xp"]');
  await xpBox.waitFor();
  check(
    (await xpBox.innerText()).includes("950 PE") &&
      (await xpBox.innerText()).includes("Livello 4 a 2.700 PE"),
    "XP box wrong",
  );
  await shot("b26-11-sheet-xp.png", xpBox);
  await page.goto(base + "#campaign?tab=loot");
  await page.locator(".loot-treasury h1").waitFor();
  await shot("b26-12-campaign-treasury.png");
  passed.push(
    '6b. B12 token menu "Bottino" and the map marker on the Sentinella open the drawer; revealed; scimitar → Doran as clean 1d6 copy; XP box 950/2.700; campaign Treasury',
  );

  // ------------------------------------------------------------ group 5: EN phone 390, touch
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
  await phone.locator('[data-service="preferences"]').tap();
  await phone.locator('#dialog [name="lang"]').selectOption("en");
  await phone.locator('#dialog button[type="submit"]').tap();
  await phone.locator("[data-loot-table-purse]", { hasText: "39 GP" }).waitFor();
  await openDrawer("loot", phone);
  const bow = phone.locator(".loot-parcel-item", { hasText: "Shortbow" });
  await bow.locator('[name="target"]').selectOption("mira");
  await bow.locator('button[type="submit"]').tap();
  await bow.waitFor({ state: "detached" });
  await phone.locator('[data-loot="parcel-all-stash"]').first().tap();
  await phone.waitForFunction(
    (k) => JSON.parse(localStorage.getItem(k)).ext.loot.parcels.every((p) => !p.items.length),
    key,
  );
  check(await noOverflow(phone), "Phone loot drawer overflows horizontally");
  state = await stored(phone);
  check(
    state.actors.mira.inventory.some((r) => r.srdId === "srd2024:item:shortbow"),
    "Shortbow not on Mira",
  );
  check(
    state.ext.loot.stash.items.some((i) => i.name.en === "Leather Armor"),
    "Everything-to-stash failed",
  );
  // Shop by touch with Mira bartering, EN labels.
  const phoneShop = await openDrawer("loot-shop", phone);
  await phoneShop.locator('[data-loot-select="barter"]').selectOption("mira");
  await phone.getByRole("button", { name: "Add to cart: Rations" }).tap();
  await phone.locator("[data-loot-net]", { hasText: "5 SP" }).waitFor();
  check(
    (await phone.locator(".loot-net dt").innerText()) === "Net total: you pay",
    "EN net label missing",
  );
  const smallTargets = await phone
    .locator(
      '[data-ext-slot^="table-panel:loot"] button, [data-ext-slot^="table-panel:loot"] select',
    )
    .evaluateAll((nodes) =>
      nodes
        .filter((n) => n.offsetParent)
        .map((n) => [
          n.textContent.trim() || n.getAttribute("aria-label"),
          Math.round(n.getBoundingClientRect().height),
        ])
        .filter(([, h]) => h < 40),
    );
  check(!smallTargets.length, "Phone targets under 40px: " + JSON.stringify(smallTargets));
  await phone.getByRole("button", { name: "Confirm trade" }).tap();
  await phone.waitForFunction(
    (k) =>
      JSON.parse(localStorage.getItem(k)).actors.mira.inventory.some(
        (r) => r.srdId === "srd2024:item:rations",
      ),
    key,
  );
  check(await noOverflow(phone), "Phone shop overflows horizontally");
  await phone.screenshot({ path: dir + "b26-13-phone-en-shop.png" });
  // Mira's sheet in English: lock reason by Livia; no overflow.
  await phone.goto(base + "#characters?id=mira&tab=inventory");
  const phoneRing = phone.locator('[data-ext-slot="sheet-section:loot-stash"] [data-stash-item]', {
    hasText: "Ring of Protection",
  });
  await phoneRing.waitFor();
  check((await phoneRing.innerText()).includes("Equipped by Livia"), "EN lock reason missing");
  check(
    await phoneRing.getByRole("button", { name: "Take", exact: true }).isDisabled(),
    "Take enabled on phone",
  );
  check(await noOverflow(phone), "Phone sheet overflows horizontally");
  await phoneRing.scrollIntoViewIfNeeded();
  await phone.screenshot({ path: dir + "b26-14-phone-en-stash.png" });
  // Simulated offline: a shared stash change is refused with a readable message.
  await phone.locator('[data-service="preferences"]').tap();
  await phone.locator('#dialog [name="offline"]').check();
  await phone.locator('#dialog button[type="submit"]').tap();
  const torch = phone.locator('[data-ext-slot="sheet-section:loot-stash"] [data-stash-item]', {
    hasText: "Torch",
  });
  await torch.getByRole("button", { name: "Take", exact: true }).tap();
  await phone.locator('#dialog [name="quantity"]').fill("2");
  await phone.locator('#dialog button[type="submit"]').tap();
  await phone.locator("#dialog .dialog-error", { hasText: "You are offline" }).waitFor();
  await phone.locator("#dialog footer [data-close]").tap();
  check(
    !(await stored(phone)).actors.mira.inventory.some((r) => r.srdId === "srd2024:item:torch"),
    "Offline take changed the sheet",
  );
  await phone.locator('[data-service="preferences"]').tap();
  await phone.locator('#dialog [name="offline"]').uncheck();
  await phone.locator('#dialog button[type="submit"]').tap();
  // DM award dialog on the phone: Escape discards without awarding.
  await phone.locator("#demo-role").selectOption("dm");
  await phone.goto(base + "#campaign?tab=loot");
  await phone.locator('[data-loot="award-open"]').tap();
  await phone.locator('#dialog [name="xp"]').fill("999");
  check(
    await phone.evaluate(
      () =>
        document.querySelector("#dialog").scrollWidth <=
        document.querySelector("#dialog").clientWidth + 1,
    ),
    "Award dialog overflows",
  );
  await phone.keyboard.press("Escape");
  await phone.waitForFunction(() => !document.querySelector("#dialog").open);
  state = await stored(phone);
  check(state.actors.livia.xp === 950, "Escape applied the award");
  await phoneContext.close();
  passed.push(
    "EN 390 touch: Mira takes the Shortbow, rest to the stash, buys Rations (net 5 SP, targets ≥40px, no overflow), EN lock reason, offline take refused, award dialog Escape discards",
  );

  check(!errors.length, "Page errors: " + errors.join(" | "));
  await context.close();
  return { passed, errors };
};
