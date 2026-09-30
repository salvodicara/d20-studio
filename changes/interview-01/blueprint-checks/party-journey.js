async (rootPage) => {
  // B62: area sheet tabs are sub-sections of D&D Beyond's sheet categories; the category
  // opens first, then the sub-section.
  const SHEET_CATEGORY = {
    projects: "extras",
    "party-bastion": "extras",
    "projects-track": "features",
    "home-levelup": "features",
    media: "story",
    "character-library-log": "notes",
    "character-library-revisions": "notes",
  };
  const openSheetTab = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const handle = () => page.locator(`[data-character-tab="${id}"]`).first();
    if (!(await handle().count()) && SHEET_CATEGORY[id])
      await press(page.locator(`.character-tabs [data-character-tab="${SHEET_CATEGORY[id]}"]`));
    await handle().waitFor();
    await press(handle());
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
  // B44 — party: DM overview, shared spells, bastion, vehicle, role dashboards and the
  // session-start message, in the one app with real clicks, keys, drag and touch.
  // Group 1 IT desktop 1440 (DM and player), group 2 isolated EN phone 390 with touch.
  // Synthetic demo data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const seenKey = "d20-studio-party-motd-seen";
  // Review run (B44-rf); the builder's first run wrote to …/2026-09-25/B44/.
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B44-rf/";
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
  const party = async (p = page) => (await stored(p)).ext.party;
  const content = (p = page) => p.locator("#content").innerText();
  const shot = async (name, locator = null, p = page) => {
    if (locator) await locator.evaluate((el) => el.scrollIntoView({ block: "start" }));
    else await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: dir + name });
  };
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
  };
  const sidebar = (id, p = page) => p.locator(`[data-campaign-tab="${id}"]`).first();
  const dismissTips = async (p = page) => {
    const got = p.getByRole("button", { name: /^(Ho capito|Got it)$/ });
    if (await got.count())
      await got
        .first()
        .click({ timeout: 2000 })
        .catch(() => {});
  };
  const waitStored = (fn, arg = null, p = page) =>
    p.waitForFunction(
      ([k, source, a]) => {
        const s = JSON.parse(localStorage.getItem(k));
        return new Function("s", "a", "return (" + source + ")(s, a)")(s, a);
      },
      [key, fn.toString(), arg],
    );
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const toast = (p = page) => p.locator("#toast").innerText();
  const toHub = async (p = page) => {
    await p.goto(base + "#campaign");
    await sidebar("overview", p).waitFor();
  };
  // The demo identity is a shell choice: a reload may start again as the player.
  const reloadAs = async (who, p = page) => {
    await p.reload();
    await p.locator("#demo-role").waitFor();
    await role(who, p);
  };

  // ------------------------------------------------------------ reset
  await page.goto(base + "#campaign");
  await page.evaluate(
    ([k, s]) => {
      localStorage.removeItem(k);
      localStorage.removeItem(s);
    },
    [key, seenKey],
  );
  await page.reload();
  await sidebar("overview").waitFor();
  check((await party()).motd.enabled === false, "A fresh example must not show a message");

  // ------------------------------------------------------------ 1. DM party overview
  await role("dm");
  await sidebar("group").click(); // one click from the campaign hub
  await page.locator('[data-party-page="overview"]').waitFor();
  const table = page.locator(".party-table");
  const heads = await table.locator("thead").innerText();
  for (const word of [
    "PF",
    "CA",
    "Percezione passiva",
    "Intuizione passiva",
    "Indagare passiva",
    "Tiri salvezza",
    "Lingue",
  ])
    check(heads.includes(word), `Overview column missing: ${word}`);
  const livia = await page.locator('tr[data-party-row="livia"]').innerText();
  check(
    livia.includes("18") &&
      livia.includes("/ 22") &&
      // Hand-off (R7 PG-25): the Gruppo reads the sheet's number, Cloak of Protection included.
      livia.includes("INT +6") &&
      livia.includes("Comune, Elfico, Draconico"),
    "Livia's row does not come from her sheet: " + livia,
  );
  check(
    (await page
      .locator('tr[data-party-row="livia"] [data-party-passive="perception"]')
      .innerText()) === "11",
    "Livia passive Perception is not 10 + Wis",
  );
  check(!(await page.locator('tr[data-party-row="iria"]').count()), "Private Iria shown to the DM");
  await page.locator('[data-party-hide="mira"]').click();
  await page.locator("[data-party-hidden-list]").waitFor();
  check(
    !(await page.locator('tr[data-party-row="mira"]').count()),
    "Hidden Mira still in the table",
  );
  await reloadAs("dm");
  await page.locator("[data-party-hidden-list]", { hasText: "Mira" }).waitFor();
  check((await party()).overview.hidden.includes("mira"), "Hidden player not saved");
  await shot("b44-01-overview-dm-it-1440.png");
  // Review: hiding is the DM's filter only; the player keeps Mira in the Party list.
  await role("player");
  await page.locator('[data-party-row="mira"]').waitFor();
  await role("dm");
  await page.locator("[data-party-hidden-list]").waitFor();
  // Sheets reachable from the overview.
  await page.locator('tr[data-party-row="livia"] [data-party-sheet="livia"]').click();
  await page.waitForFunction(() => /characters.*id=livia/.test(location.hash));
  await page.goBack();
  await page.locator('[data-party-page="overview"]').waitFor();
  // Show again from the keyboard, Undo, show again with a click.
  await page.locator('[data-party-show="mira"]').focus();
  await page.keyboard.press("Enter");
  await page.locator('tr[data-party-row="mira"]').waitFor();
  await page.locator("[data-party-undo]", { hasText: "Mira di nuovo nel riepilogo" }).click();
  await page.locator("[data-party-hidden-list]").waitFor();
  await page.locator('[data-party-show="mira"]').click();
  await page.locator('tr[data-party-row="mira"]').waitFor();
  // FG Party Sheet option: share with players.
  await role("player");
  check(
    (await content()).includes("Il DM non ha condiviso il riepilogo completo"),
    "Player sees the DM overview before it is shared",
  );
  check(!(await page.locator(".party-table").count()), "Player sees the table");
  await role("dm");
  await page.locator("[data-party-share]").check();
  await waitStored((s) => s.ext.party.overview.shareWithPlayers === true);
  await role("player");
  await page.locator(".party-table").waitFor();
  check(!(await page.locator("[data-party-hide]").count()), "Player can hide characters");
  passed.push(
    "1. DM overview (Campaign › Party, 1 click from the hub): HP, AC, passive Perception/Insight/Investigation, saves, languages from the sheets; Mira hidden (reload keeps it; the player still sees her), shown by keyboard, Undo, shown again; Open sheet → Livia and Back; FG option shares the table with players (no Hide for them)",
  );

  // ------------------------------------------------------------ 3a. Iria's bastion (player)
  await page.locator('[data-nav="characters"]').first().click();
  await page.locator('[data-character-action="open"][data-actor="iria"]').click();
  await dismissTips();
  await openSheetTab(page, "party-bastion"); // B62: Extras › Bastion // 3 clicks from anywhere
  await page.locator("[data-bastion-private]").waitFor();
  check((await content()).includes("Faro di Capo Sale"), "Iria's bastion missing");
  // Review: the bastion spends Iria's own coins (B26 purse), no second treasury.
  // W2b1 (B38) seeds Iria with 150 gp: the bastion shows that purse, then the player empties it
  // with B26's «Correggi monete» so that the order refused at 0 gp is still checked below.
  const seededGp = (await stored()).actors.iria.currency?.gp ?? 0;
  check(
    (await content()).includes(`Monete di Iria ${seededGp} mo`),
    "Bastion does not show Iria's coins",
  );
  if (seededGp) {
    await openSheetTab(page, "inventory");
    await page.locator('[data-loot="purse-correct"]').click();
    await page.locator('#dialog [name="gp"]').fill("0");
    await page.locator('#dialog [name="reason"]').fill("Borsa lasciata al faro");
    await page.locator('#dialog button[type="submit"]').click();
    await waitStored((s) => (s.actors.iria.currency?.gp ?? 0) === 0);
    await openSheetTab(page, "party-bastion");
    await page.locator("[data-bastion-private]").waitFor();
  }
  check((await content()).includes("Monete di Iria 0 mo"), "Bastion does not show Iria's coins");
  check(!(await page.locator("[data-bastion-treasury]").count()), "A bastion shows a treasury");
  check(
    (await content()).includes("non sono riprodotte"),
    "The DMG boundary is not stated on the bastion",
  );
  await shot("b44-02-bastion-private-it-1440.png", page.locator(".party-sheet-bastion"));
  // The core command connects the private sheet: now the DM can run the bastion turn.
  await page.locator('[data-character-action="connect-campaign"]').click();
  await page.locator('#dialog button[type="submit"]').click();
  await page.locator("[data-bastion-private]").waitFor({ state: "detached" });
  await page.locator('[data-bastion="order"][data-order="distil-healing"]').click();
  await page.locator("#toast", { hasText: "Monete insufficienti: servono 25 mo" }).waitFor();
  check(!(await page.locator(".party-order-pending").count()), "An unpaid order started");
  // «Monete sulla scheda» → Inventory › Coins (B26): the player records Iria's 40 gp.
  await page.locator('.party-base [data-party-sheet="iria"][data-tab="inventory"]').click();
  await page.locator('[data-loot="purse-correct"]').click();
  await page.locator('#dialog [name="gp"]').fill("40");
  await page.locator('#dialog [name="reason"]').fill("Oro portato dal faro");
  await page.locator('#dialog button[type="submit"]').click();
  await page.locator('[data-loot-coin="gp"]', { hasText: "40" }).waitFor();
  await openSheetTab(page, "party-bastion"); // B62: Extras › Bastion
  await page.locator("[data-bastion-purse]", { hasText: "40 mo" }).waitFor();
  await page.locator('[data-bastion="order"][data-order="distil-healing"]').click();
  await page.locator("[data-bastion-purse]", { hasText: "15 mo" }).waitFor();
  await page.locator('[data-bastion="order"][data-order="search-records"]').click();
  await page.locator("[data-bastion-purse]", { hasText: "10 mo" }).waitFor();
  check((await stored()).actors.iria.currency.gp === 10, "Orders not paid from Iria's purse");
  check(
    (await page.locator(".party-order-pending").count()) === 2,
    "Two orders should be in progress",
  );
  await reloadAs("player");
  await page.locator(".party-order-pending").first().waitFor();
  check((await page.locator(".party-order-pending").count()) === 2, "Orders lost on reload");
  await shot("b44-03-bastion-orders-it-1440.png", page.locator(".party-sheet-bastion"));
  passed.push(
    `3a. Player: Characters › Iria › Bastion (3 clicks); private notice and DMG boundary; the bastion shows Iria's purse (${seededGp} gp), emptied with B26 Correct coins; core Connect to campaign; with 0 gp the order is refused; «Coins on the sheet» → B26 Correct coins 40 gp; orders Distil (25 gp) and Search the records (5 gp) paid from Iria's purse 40 → 15 → 10 gp; reload keeps both orders`,
  );

  // ------------------------------------------------------------ 2. shared spells (player)
  await toHub();
  await sidebar("group").click();
  await page.locator('[data-party-tab="spells"]').click();
  const missile = page.locator('[data-party-spell^="magic-missile"]');
  await missile.waitFor();
  const missileText = await missile.innerText();
  check(
    missileText.includes("Iria") &&
      missileText.includes("Livia") &&
      missileText.includes("In comune"),
    "Magic Missile not shared by Iria and Livia: " + missileText,
  );
  check((await content()).includes("Trucchetti"), "Spells not grouped by level");
  check(
    // Hand-off (R4 TV-79): Mira now has her prepared Druid spells; only Doran has none.
    (await content()).includes("Senza incantesimi registrati: Doran") &&
      !(await content()).includes("Senza incantesimi registrati: Doran, Mira"),
    "Casters without spells not listed",
  );
  check(
    !(await page.locator('[data-character-action="prepare-spell"]').count()),
    "Shared spells must be read-only",
  );
  await page.locator('[data-party-spell-filter="shared"]').check();
  check(!(await content()).includes("Mani brucianti"), "Filter kept a spell only Livia has");
  await shot("b44-04-spells-it-1440.png");
  await missile.locator('[data-party-sheet="iria"]').click();
  await page.waitForFunction(
    () => /id=iria/.test(location.hash) && /tab=spells/.test(location.hash),
  );
  passed.push(
    "2. Player: Party › Shared spells: grouped by level, Magic Missile/Shield/Fire Bolt shared by Iria and Livia, casters without spells named, read-only, filter «Solo magie in comune», chip opens Iria's spells",
  );

  // ------------------------------------------------------------ 3b. DM advances the turn
  await role("dm");
  // Review: the bell (B24) and the palette (B23) reach the bases turn.
  const bell = page.locator('.service-nav [data-service="requests"]');
  await bell.click();
  await page
    .locator("#dialog .notifications-item", { hasText: "Ordini delle basi in attesa del turno: 2" })
    .waitFor();
  await page.locator("#dialog footer [data-close]").click();
  await page.locator("#dialog[open]").waitFor({ state: "detached" });
  await page.locator('.service-nav [data-service="search"]').click();
  await page.locator("#dialog [data-cmdk-input]").waitFor();
  // The palette opens filtered by the page (here Iria's Spells tab): pick «Comandi».
  await page.locator("#dialog [data-cmdk-filter]").selectOption("commands");
  await page.locator("#dialog [data-cmdk-input]").fill("Avanza il turno delle basi");
  const command = page.locator('#dialog [data-cmdk-option][data-type="command"]', {
    hasText: "Avanza il turno delle basi",
  });
  await command.waitFor({ timeout: 5000 }).catch(async () => {
    throw Error("Palette: " + (await page.locator("#dialog").innerText()).slice(0, 600));
  });
  await command.click();
  await page.locator("#dialog[open] [data-advance-order]").first().waitFor();
  check(/tab=group/.test(await page.evaluate(() => location.hash)), "Palette did not go to Bases");
  await page.locator("#dialog footer [data-close]").click();
  check((await party()).bastions.turn === 0, "Closing the dialog advanced the turn");
  await toHub();
  await sidebar("group").click();
  await page.locator('[data-party-tab="bases"]').click(); // 2 clicks from the hub
  await page.locator('article[data-base="bastion-iria"]').waitFor();
  const advance = async (note) => {
    await page.locator('[data-bastion="advance"]').click();
    const dialog = page.locator("#dialog");
    await dialog.locator("[data-advance-order]").first().waitFor();
    check(
      (await dialog.innerText()).includes("Consegna: Pozione di guarigione ×1"),
      "Advance dialog does not propose the potion",
    );
    await dialog
      .locator("[data-advance-order]", { hasText: "Consulta i registri" })
      .locator("textarea")
      .fill(note);
    return dialog;
  };
  let dialog = await advance("Nei registri: una nave senza bandiera a ogni luna nuova.");
  await shot("b44-05-advance-dialog-it-1440.png");
  await dialog.locator('button[type="submit"]').click();
  await page.locator("[data-bastion-turn]", { hasText: "1" }).waitFor();
  check((await toast()).includes("Turno 1: 2 esiti nel registro."), "No turn toast");
  const potions = async () =>
    (await stored()).actors.iria.inventory.find((i) => i.id === "iria-potion").quantity;
  check((await potions()) === 2, "The potion did not reach Iria's inventory");
  check(
    (await stored()).log.some(
      (e) =>
        e.label === "Turno delle basi 1: Distilla una pozione di guarigione, Consulta i registri",
    ),
    "The turn is not in the campaign log",
  );
  let log = await page.locator('article[data-base="bastion-iria"] .party-base-log').innerText();
  check(
    log.includes("Esito · Laboratorio d’erbe: Distilla una pozione di guarigione") &&
      log.includes("Pozione di guarigione ×1 → Iria") &&
      log.includes("una nave senza bandiera"),
    "Outcome not in the base log: " + log,
  );
  // Undo reverts turn and potion together; the DM advances again.
  await page.locator("[data-party-undo]", { hasText: "Turno delle basi 1:" }).click();
  await page.locator("[data-bastion-turn]", { hasText: "0" }).waitFor();
  check((await potions()) === 1, "Undo left the potion");
  dialog = await advance("Nei registri: una nave senza bandiera a ogni luna nuova.");
  await dialog.locator('button[type="submit"]').click();
  await page.locator("[data-bastion-turn]", { hasText: "1" }).waitFor();
  // Correction with a reason, appended to the log.
  await page
    .locator('article[data-base="bastion-iria"] li', { hasText: "Consulta i registri" })
    .locator('[data-bastion="correct-outcome"]')
    .click();
  await page.locator('#dialog [name="text"]').fill("La nave batte bandiera di Bruma.");
  await page.locator('#dialog [name="reason"]').fill("Letto male al tavolo");
  await page.locator('#dialog button[type="submit"]').click();
  await page
    .locator('article[data-base="bastion-iria"] .party-base-log', {
      hasText: "Corretto: Letto male al tavolo",
    })
    .waitFor();
  await shot("b44-06-bases-log-dm-it-1440.png", page.locator('article[data-base="bastion-iria"]'));
  // CA-80: the DM founds a party base and writes a new facility into the campaign rules.
  await page
    .locator('form[data-bastion-form="create-party-base"] [name="name"]')
    .fill("Torre dell’osservatorio");
  await page.locator('form[data-bastion-form="create-party-base"] button[type="submit"]').click();
  const tower = page.locator("article.party-base", { hasText: "Torre dell’osservatorio" });
  await tower.waitFor();
  check((await tower.innerText()).includes("Base del gruppo"), "Party base not labelled");
  await page.locator(".party-rules summary").click();
  const rule = page.locator('form[data-bastion-form="facility-type"]');
  await rule.locator('[name="name"]').fill("Sala delle mappe");
  await rule.locator('[name="orderName"]').fill("Traccia una rotta");
  await rule.locator('[name="outcomeText"]').fill("Il DM descrive la rotta trovata.");
  await rule.locator('button[type="submit"]').click();
  await waitStored((s) =>
    s.ext.party.bastions.rules.facilityTypes.some((t) => t.name.it === "Sala delle mappe"),
  );
  const towerAdd = page
    .locator("article.party-base", { hasText: "Torre dell’osservatorio" })
    .locator('form[data-bastion-form="add-facility"]');
  const mapsType = (await party()).bastions.rules.facilityTypes.find(
    (t) => t.name.it === "Sala delle mappe",
  ).id;
  await towerAdd.locator('[name="typeId"]').selectOption(mapsType);
  await towerAdd.locator('button[type="submit"]').click();
  await page
    .locator("article.party-base", { hasText: "Torre dell’osservatorio" })
    .locator('[data-bastion="order"]', { hasText: "Traccia una rotta" })
    .click();
  await page
    .locator("article.party-base", { hasText: "Torre dell’osservatorio" })
    .locator(".party-order-pending", { hasText: "Traccia una rotta" })
    .waitFor();
  // The player sees the outcome on the sheet and the potion in the inventory.
  await role("player");
  await page.locator('[data-nav="characters"]').first().click();
  await page.locator('[data-character-action="open"][data-actor="iria"]').click();
  await openSheetTab(page, "party-bastion"); // B62: Extras › Bastion
  log = await page.locator(".party-base-log").innerText();
  check(
    log.includes("La nave batte bandiera di Bruma."),
    "Player does not see the corrected outcome",
  );
  await page.locator('[data-character-tab="inventory"]').click();
  check((await content()).includes("Pozione di guarigione"), "Potion not in the inventory tab");
  check((await potions()) === 2, "Potion count changed");
  passed.push(
    "3b. DM: bell «Ordini delle basi in attesa del turno: 2»; palette «Avanza il turno delle basi» opens the turn dialog on Party › Bases (closing it changes nothing); Party › Bases (2 clicks) › Advance the bases turn: dialog proposes the potion and a DM-written outcome; turn 1, 2 outcomes in the base log and «Turno delle basi 1: …» in the campaign log, potion 1 → 2 on Iria's sheet; Undo reverts turn and potion; advance again; outcome corrected with a reason; the DM founds the party base «Torre dell’osservatorio», writes the facility «Sala delle mappe» into the rules, adds it and orders «Traccia una rotta»; the player reads the outcome on the Bastion tab",
  );

  // ------------------------------------------------------------ 4. vehicle "Carro"
  await toHub();
  await sidebar("group").click();
  await page.locator('[data-party-tab="vehicles"]').click();
  await page.locator('article[data-vehicle="wagon"]').waitFor();
  check((await page.locator("[data-party-speed]").innerText()) === "12 m", "Wagon speed");
  check(
    (await page.locator("[data-party-load]").innerText()) === "80 kg / 2500 kg",
    "Wagon load/capacity",
  );
  check((await content()).includes("SRD 5.2.1 EN 100 / IT 113–114"), "SRD source missing");
  const loadForm = page.locator('form[data-party-form="load"]');
  await loadForm.locator('[name="source"]').selectOption("livia|rope");
  await loadForm.locator('button[type="submit"]').click();
  await page.locator("[data-party-load]", { hasText: "82,5 kg / 2500 kg" }).waitFor();
  check(
    !(await stored()).actors.livia.inventory.some((i) => i.id === "rope"),
    "The rope stayed in Livia's inventory",
  );
  const board = page.locator('form[data-party-form="board"]');
  await board.locator('[name="actorId"]').selectOption("livia");
  await board.locator('button[type="submit"]').click();
  await page.locator("[data-party-aboard]", { hasText: "2 / 4" }).waitFor();
  await shot("b44-07-vehicle-it-1440.png", page.locator('article[data-vehicle="wagon"]'));
  const rope = page.locator("tr[data-party-cargo]", { hasText: "Corda" });
  await rope.locator('[name="actorId"]').selectOption("livia");
  await rope.locator('button[type="submit"]').click();
  await page.locator("[data-party-load]", { hasText: "80 kg / 2500 kg" }).waitFor();
  check(
    (await stored()).actors.livia.inventory.some((i) => i.id === "rope"),
    "The rope did not come back to Livia",
  );
  await page.locator("[data-party-undo]").click();
  await page.locator("[data-party-load]", { hasText: "82,5 kg / 2500 kg" }).waitFor();
  await reloadAs("player");
  await page.locator("[data-party-load]", { hasText: "82,5 kg / 2500 kg" }).waitFor();
  passed.push(
    "4. Party › Vehicles: Carro 12 m, 80/2500 kg (2 draft horses × 270 kg × 5 − 200 kg, SRD EN 100 / IT 113–114); Livia's rope loaded (gone from her inventory, 82,5 kg), Livia boards (2/4), unloaded back to her, Undo puts it on the wagon again, reload keeps it",
  );

  // ------------------------------------------------------------ 5. dashboards per role
  await role("dm");
  await sidebar("overview").click();
  await page.locator('[data-party-dashboard="dm"]').waitFor();
  await page.locator('[data-party-dash="setup"]').click();
  await page.locator('[data-party-dash-target="player"]').click();
  await page.locator('[data-party-setup="player"]').waitFor();
  await page
    .locator('[data-party-dash-item="party"]')
    .dragTo(page.locator('[data-party-dash-item="recap"]'));
  await waitStored(
    (s) =>
      s.ext.party.dashboards.player.map((r) => r.id).join() ===
      "motd,party,recap,next,revealed,links",
  );
  await page.locator('[data-party-dash="down"][data-tile="motd"]').focus();
  await page.keyboard.press("Enter");
  await waitStored(
    (s) =>
      s.ext.party.dashboards.player.map((r) => r.id).join() ===
      "party,motd,recap,next,revealed,links",
  );
  const add = page.locator('form[data-party-form="add-tile"]');
  await add.locator('[name="tile"]').selectOption("vehicle");
  await add.locator('button[type="submit"]').click();
  await waitStored((s) => s.ext.party.dashboards.player.some((r) => r.id === "vehicle"));
  await shot("b44-08-dashboard-setup-it-1440.png");
  await page.locator('[data-party-dash="done"]').click();
  const tiles = (p = page) =>
    p.evaluate(() =>
      [...document.querySelectorAll("[data-party-tile]")].map((t) => t.dataset.partyTile),
    );
  check(
    (await tiles()).slice(0, 3).join() === "party,next,bases",
    "The DM dashboard changed with the players' one",
  );
  await role("player");
  await page.locator('[data-party-dashboard="player"]').waitFor();
  check(
    (await tiles()).join() === "party,recap,next,revealed,links,vehicle",
    "Players' dashboard order: " + (await tiles()).join(),
  );
  check(!(await page.locator('[data-party-dash="setup"]').count()), "Players can customise");
  await reloadAs("player");
  await page.locator('[data-party-dashboard="player"]').waitFor();
  check((await tiles())[0] === "party", "Dashboard order lost on reload");
  await shot("b44-09-dashboard-player-it-1440.png");
  passed.push(
    "5. Overview › Customise (Kanka): players' dashboard edited by the DM — «Il gruppo» dragged above «Dove eravamo rimasti», «Messaggio» moved down with the keyboard, «Veicolo» added; DM dashboard unchanged; players see their order without Customise; reload keeps it",
  );

  // ------------------------------------------------------------ 6. session-start message
  await role("dm");
  await page.locator('[data-party-motd="edit"]').click();
  await page
    .locator('#dialog [name="text"]')
    .fill("Stasera si parte dal cortile: portate le lanterne.");
  await page.locator('#dialog [name="enabled"]').check();
  await page.locator('#dialog button[type="submit"]').click();
  await waitStored((s) => s.ext.party.motd.enabled && s.ext.party.motd.revision === 1);
  await role("player");
  await page.locator('[data-party-tile="motd"]', { hasText: "portate le lanterne" }).waitFor();
  // Final review F20 (Kanka): «Entra al Tavolo» lives in the campaign sidebar only.
  await page.locator('.campaign-sidebar [data-nav="table"]').click();
  const motd = page.locator("#dialog[open] [data-party-motd-dialog]");
  await motd.waitFor();
  check((await motd.innerText()).includes("portate le lanterne"), "Wrong message at the Table");
  await shot("b44-10-motd-table-it-1440.png");
  await page.locator("#dialog[open] footer button[data-close]").click();
  await motd.waitFor({ state: "detached" });
  await toHub();
  await page.locator('.campaign-sidebar [data-nav="table"]').click();
  await page.locator("#battle-map").waitFor();
  await page.waitForTimeout(600);
  check(!(await motd.count()), "The same message came back");
  // Review: FG shows it at every login; a new load of the app is a new login.
  check(
    !(await page.evaluate(() => Object.keys(localStorage).some((k) => /motd/.test(k)))),
    "The message's reading is stored on the device",
  );
  await page.reload(); // still at the Table: the new load is a new login
  await motd.waitFor();
  check((await page.locator("#demo-role").inputValue()) === "player", "Reload changed identity");
  await page.locator("#dialog[open] footer button[data-close]").click();
  await motd.waitFor({ state: "detached" });
  passed.push(
    "6. DM writes and turns on the session-start message from the Overview tile; the player sees it once on entering the Table (FG Message of the Day), not again on re-entry; after a reload (new login) it shows again; it stays in the player's dashboard",
  );

  // ------------------------------------------------------------ DM Table tab
  await role("dm");
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await openTablePanel(page, "party"); // B62: Creature › Party summary
  const panel = page.locator('[data-ext-slot="table-panel:party"]');
  await panel.waitFor();
  check((await panel.innerText()).includes("PP"), "Table tab without passives");
  await panel.locator('[data-party-select="mira"]').click();
  await page.waitForFunction(() =>
    /Mira/.test(
      document.querySelector('[data-table-tab="creature"]')?.getAttribute("aria-label") ??
        document.querySelector('[data-table-tab="creature"]')?.textContent ??
        "",
    ),
  );
  await shot("b44-11-table-party-tab-dm-it-1440.png");
  passed.push(
    "DM Table: sidebar tab «Gruppo» with HP, AC and passives; a name selects the token (Mira)",
  );
  check(await noOverflow(), "Desktop page overflows");

  // ------------------------------------------------------------ group 2: EN phone 390, touch
  const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const phone = await phoneContext.newPage();
  phone.on("pageerror", (error) => errors.push("phone: " + error.message));
  await phone.goto(base + "#campaign");
  await phone.evaluate(([k, v]) => localStorage.setItem(k, v), [key, snapshot]);
  await phone.reload();
  await sidebar("overview", phone).waitFor();
  await phone.locator('[data-service="preferences"]').first().tap();
  await phone.locator('#dialog [name="lang"]').selectOption("en");
  await phone.locator('#dialog button[type="submit"]').tap();
  await role("player", phone);
  await sidebar("group", phone).tap();
  await phone.locator('[data-party-tab="vehicles"]').tap();
  await phone.locator('article[data-vehicle="wagon"]').waitFor();
  check((await phone.locator("[data-party-speed]").innerText()) === "40 ft", "Phone speed in feet");
  check(
    (await phone.locator("[data-party-load]").innerText()) === "165 lb / 5000 lb",
    "Phone load in pounds: " + (await phone.locator("[data-party-load]").innerText()),
  );
  const phoneLoad = phone.locator('form[data-party-form="load"]');
  await phoneLoad.locator('[name="source"]').selectOption("livia|potion");
  await phoneLoad.locator('button[type="submit"]').tap();
  await phone.locator("[data-party-load]", { hasText: "165.5 lb / 5000 lb" }).waitFor();
  check(await noOverflow(phone), "Phone vehicle overflows");
  await shot(
    "b44-12-phone-en-vehicle-390.png",
    phone.locator('article[data-vehicle="wagon"]'),
    phone,
  );
  await phone.locator('[data-party-tab="overview"]').tap();
  await phone.locator(".party-table").waitFor();
  check(await noOverflow(phone), "Phone overview overflows");
  // Cards on a phone: the column names are the cells' labels.
  check(
    (await phone.locator('.party-table td[data-label="Passive Perception"]').count()) >= 3,
    "Phone overview not in English",
  );
  await shot("b44-13-phone-en-overview-390.png", phone.locator(".party-table"), phone);
  await role("dm", phone);
  await sidebar("overview", phone).tap();
  await phone.locator('[data-party-dash="setup"]').tap();
  await phone.locator('[data-party-dash="down"][data-tile="party"]').tap();
  await waitStored(
    (s) =>
      s.ext.party.dashboards.dm
        .map((r) => r.id)
        .slice(0, 2)
        .join() === "next,party",
    null,
    phone,
  );
  check(await noOverflow(phone), "Phone dashboard setup overflows");
  await shot("b44-14-phone-en-setup-390.png", phone.locator("[data-party-setup]"), phone);
  await phone.locator('[data-party-dash="done"]').tap();
  await role("player", phone);
  await phone.goto(base + "#characters?id=iria&tab=party-bastion");
  await phone.locator(".party-sheet-bastion").waitFor();
  check((await content(phone)).includes("Capo Sale lighthouse"), "Phone bastion not in English");
  check(await noOverflow(phone), "Phone bastion overflows");
  passed.push(
    "Phone EN 390 (touch): vehicle 40 ft and 165 → 165.5 lb after loading Livia's potion by tap, overview as cards, DM moves «The party» down by tap, Iria's Bastion tab in English, no horizontal overflow",
  );
  await phoneContext.close();
  await context.close();
  check(!errors.length, "Page errors: " + errors.join(" | "));
  return JSON.stringify({ passed, errors }, null, 1);
};
