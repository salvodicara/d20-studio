async (rootPage) => {
  // B62: campaign sections sit in Kanka-style groups; a folded group is opened first.
  const openCampaignSection = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const link = page.locator(`.campaign-sidebar nav [data-campaign-tab="${id}"]`);
    await link.waitFor({ state: "attached" });
    const toggle = page.locator(
      `.campaign-sidebar [data-campaign-group]:has([data-campaign-tab="${id}"]) [data-campaign-group-toggle]`,
    );
    if ((await toggle.getAttribute("aria-expanded")) === "false") await press(toggle);
    await press(link);
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
  // B20 campaign settings, permissions, table rules and "view as". Real clicks, keys and
  // touch on synthetic data; resets this browser's demo state. IT desktop 1440x900, then an
  // EN 390x844 touch phone with the same state. Acceptance checks of the card:
  // (1) players' pointer off → disabled with the reason; (2) view as Livia: banner, the
  // DM's and Doran's "Only me" content invisible, way back; (3) Standard 2024 preset, house
  // rule with source/author/date, history, locked rules with lock and reason; (4) the same
  // attack card shows the applied effect with Undo (automatic) or Apply (assisted);
  // (5) enemy HP exact/words/hidden changes the player's view; (6) legacy source "blocked in
  // this campaign" in the builder; (7) "name visible to" default applied to existing with
  // impact count and Undo; (8) a section turned off leaves everyone's navigation; (9) the DM
  // edits Livia's sheet only with her authorization, traced. Run with:
  // playwright-cli -s=d20-b20 --raw run-code --filename=<this file>
  // from /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B20/.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B20/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  const findings = [];
  page.on("pageerror", (error) => errors.push("desktop: " + error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const button = (name, p = page) => p.getByRole("button", { name, exact: true });
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const area = async (p = page) => (await stored(p)).ext["campaign-settings"].campaigns.lanterns;
  const setRole = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForTimeout(150);
  };
  const toast = (p = page) => p.locator("#toast").innerText();
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  // B62: campaign sections sit in folding groups; a click opens the group first.
  const sidebar = (tab, p = page) => {
    const at = p.locator(`.campaign-sidebar [data-campaign-tab="${tab}"]`);
    return {
      click: () => openCampaignSection(p, tab),
      tap: () => openCampaignSection(p, tab, true),
      waitFor: (options) => at.waitFor(options),
      count: () => at.count(),
    };
  };
  const dialogOpen = (p = page) =>
    p.evaluate(() => document.querySelector("#dialog")?.open === true);
  const closeDialog = async (p = page) => {
    if (await dialogOpen(p)) await p.keyboard.press("Escape");
    await p.waitForTimeout(100);
  };
  const styled = (p = page) =>
    p.waitForFunction(() =>
      [...document.styleSheets].some(
        (sheet) => sheet.href?.endsWith("/campaign-settings.css") && sheet.cssRules.length,
      ),
    );
  const smallTargets = (selector, p = page) =>
    p.evaluate(
      (sel) =>
        [...document.querySelectorAll(sel)]
          .filter((el) => el.getBoundingClientRect().height > 0)
          .map((el) => ({
            text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 40),
            h: Math.round(el.getBoundingClientRect().height),
            w: Math.round(el.getBoundingClientRect().width),
          }))
          .filter((box) => box.h < 40 || box.w < 40),
      selector,
    );
  const settingsTab = async (tab, p = page) => {
    await p.locator(`[data-cs-tab="${tab}"]`).click();
    await p.locator(`[data-cs-tab="${tab}"][aria-current="page"]`).waitFor();
  };
  const goSettings = async (tab = "rules", p = page) => {
    await p.goto(base + "#campaign?tab=settings&id=" + tab);
    await p.locator(`[data-cs-tab="${tab}"][aria-current="page"]`).waitFor();
  };
  const table = async (p = page) => {
    await p.goto(base + "#table");
    await p.locator("#battle-map").waitFor();
    await closeDialog(p);
    // B61: the inspector panels live in the sidebar's Creature tab, and each identity finds
    // its last tab again (here B18's Annotations): show the Creature tab, as on arrival.
    const creature = p.locator('.table-tabs [data-table-tab="creature"]');
    if ((await creature.getAttribute("aria-selected")) !== "true")
      await (p === page ? creature.click() : creature.tap());
  };

  let mobile = null;
  try {
    // ---------------------------------------------------------------------------------
    // Reset and reach Settings from Home in ≤ 3 clicks as the DM.
    await page.goto(base);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#content").waitFor();
    await setRole("dm");
    let clicks = 0;
    const openCampaign = button("Apri campagna").first();
    if (await openCampaign.count()) {
      await openCampaign.click();
      clicks++;
    } else {
      await page.goto(base + "#campaign");
      findings.push("Home has no 'Apri campagna' button: opened #campaign directly");
    }
    await sidebar("settings").click();
    clicks++;
    await page.getByRole("heading", { name: "Impostazioni della campagna", level: 1 }).waitFor();
    check(clicks <= 3, "Settings need more than 3 clicks from Home");
    await styled();
    const headerText = await page.locator(".cs-heading").innerText();
    // Standard 2024 is assisted (census C1); the sample group chose automatic at creation.
    check(
      // Refreshed by the hand-off writer (29/09/2026): the example's dates follow the visit
      // (sample-clock.mjs): customised the day before the start, some months ago.
      /Regole personalizzate · dal \d+ \p{L}+ \d{4}/u.test(headerText) &&
        /Avviata il \d+ \p{L}+ \d{4}/u.test(headerText),
      "Preset/start badges missing: " + headerText,
    );

    // (3) Rules: locked multiclassing with lock and reason, edition locked, keyboard switch,
    // Standard 2024 restore with the custom mark kept, house rule with source/author/date.
    const multiclass = page.locator('[data-cs-rule="multiclass"]');
    check((await multiclass.locator(".cs-lock").count()) === 1, "Multiclass lock badge missing");
    check(
      (await multiclass.locator("[data-cs-lock-reason]").innerText()).includes(
        "Bloccata dall’avvio della campagna",
      ),
      "Multiclass lock reason missing",
    );
    check(
      (await multiclass.locator("input:disabled").count()) === 2,
      "Locked multiclass radios are not disabled",
    );
    check(
      (await page.locator(".cs-edition").innerText()).includes("Fissata alla creazione"),
      "Edition lock reason missing",
    );
    const automatic = page.locator('[data-cs-rule-input="automation"][value="automatic"]');
    await automatic.focus();
    await page.keyboard.press("ArrowLeft");
    await page.locator('[data-cs-rule-input="automation"][value="assisted"]:checked').waitFor();
    check(
      await page.evaluate(() =>
        document.activeElement?.matches?.('[data-cs-rule-input="automation"][value="assisted"]'),
      ),
      "Focus did not stay on the chosen radio after the commit",
    );
    check((await area()).policy.automation === "assisted", "Keyboard rule change not stored");
    await page.locator(".cs-badge.is-standard").first().waitFor();
    // P10 CA-71: enemy health lives in «Cosa vedono i giocatori»; CA-69: the preset picker.
    await settingsTab("disclosure");
    await page.locator('[data-cs-rule-input="enemyHp"][value="exact"]').check();
    await page.locator(".cs-badge.is-custom").first().waitFor();
    await settingsTab("rules");
    await page.locator('[data-cs-preset-pick][value="standard-2024"]').check();
    const presetDialog = await page.locator("#dialog").innerText();
    check(
      presetDialog.includes("Salute dei nemici vista dai giocatori: PF esatti → A parole") &&
        presetDialog.includes("Restano come sono (bloccate): Multiclasse") === false,
      "Preset dialog does not list the change: " + presetDialog,
    );
    await page.locator("#dialog button[type=submit]").click();
    await page.locator(".cs-badge.is-standard").first().waitFor();
    check(
      /Personalizzata il \d+ \p{L}+ \d{4}/u.test(await page.locator(".cs-heading").innerText()),
      "Custom mark lost after restoring the preset",
    );
    check((await area()).policy.enemyHp === "words", "Preset did not restore the words");
    passed.push(
      "Rules: the sample reads “Regole personalizzate · dal <date>” (automatic chosen; Standard 2024 is assisted, C1); multiclassing locked with lock and reason, edition fixed; keyboard ArrowLeft switches automation to Assistito (focus kept); Standard 2024 restore lists the change and keeps the “custom” mark",
    );
    await page.locator("#cs-house-title-input").fill("Pozioni come azione bonus");
    await button("Aggiungi regola della casa").click();
    check(await page.locator("#cs-house-text-input:invalid").count(), "Empty rule text accepted");
    await page
      .locator("#cs-house-text-input")
      .fill("Bere una pozione di guarigione da sé costa un’azione bonus.");
    await button("Aggiungi regola della casa").click();
    const house = page.locator(".cs-house", { hasText: "Pozioni come azione bonus" });
    await house.waitFor();
    const source = await house.locator("[data-cs-house-source]").innerText();
    check(
      /regola della casa · decisa da DM · \d+ \p{L}+ \d{4}/u.test(source),
      "House rule source/author/date missing: " + source,
    );
    await page.screenshot({ path: shots + "b20-01-dm-rules.png", fullPage: true });
    passed.push("House rule added with source “regola della casa”, author DM and date");

    // (1) Permissions: the D&D Beyond Game Settings panel. Pointer off; the player's tool is
    // disabled with the reason. One value with B18's annotations switch (review P2).
    await settingsTab("permissions");
    const setting = async (id, p = page) =>
      (await stored(p)).ext["core-settings"].campaign["annotations-table." + id];
    // P10 CA-61: moving the DM's creatures and locking tokens are switches now.
    check(
      (await page.locator('[data-cs-permission="dmCreatures"]').count()) === 1 &&
        (await page.locator('[data-cs-permission="playerLock"]').count()) === 1,
      "Permission switches missing",
    );
    await page.locator('[data-cs-tool="players-pointer"]').click();
    await page.locator('[data-cs-tool="players-pointer"]:not(:checked)').waitFor();
    check((await setting("players-pointer")) === false, "Pointer switch not stored in B18's key");
    await setRole("player");
    await table();
    const pointer = page.locator('.map-toolbar [data-tool="pointer"]');
    check((await pointer.getAttribute("aria-disabled")) === "true", "Player pointer not disabled");
    check(
      (await pointer.getAttribute("aria-label")).includes("disattivato dal DM"),
      "Pointer reason missing from its name",
    );
    // aria-disabled keeps the chip focusable and clickable for users; Playwright treats it
    // as disabled, so the real mouse click is forced past its actionability check.
    await pointer.click({ force: true });
    check(
      (await page.locator("#map-message").innerText()).includes("Il DM ha disattivato «Puntatore»"),
      "Click on the disabled pointer gave no reason",
    );
    check(
      (await pointer.getAttribute("aria-pressed")) === "false",
      "Disabled pointer became active",
    );
    await pointer.focus();
    await page.keyboard.press("Enter");
    check(
      (await page
        .locator('.map-toolbar [data-tool="move"]')
        .first()
        .getAttribute("aria-pressed")) === "true",
      "Keyboard activated the disabled pointer",
    );
    await page.screenshot({ path: shots + "b20-02-player-pointer-disabled.png" });
    await setRole("dm");
    await table();
    check(
      !(await page.locator('.map-toolbar [data-tool="pointer"]').getAttribute("aria-disabled")),
      "The DM lost the pointer",
    );
    // B18's own drawer shows the same value and changes the same value.
    await openTablePanel(page, "annotations-list"); // B62: Scene › Annotations
    const drawerPointer = page.locator('[data-annot-perm="players-pointer"]');
    await drawerPointer.waitFor();
    check(!(await drawerPointer.isChecked()), "B18's drawer disagrees with Permissions");
    await page.locator('[data-annot-perm="players-draw"]').uncheck();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["core-settings"].campaign[
          "annotations-table.players-draw"
        ] === false,
      key,
    );
    await setRole("player");
    await table();
    check(
      (await page
        .locator('.map-toolbar [data-tool="annotations-draw"]')
        .getAttribute("aria-disabled")) === "true",
      "Drawing turned off in B18's drawer is not disabled for the player",
    );
    await page.goto(base + "#campaign?tab=campaign-settings-rules");
    for (const id of ["players-pointer", "players-draw"])
      check(
        (await page.locator(`[data-cs-read-tool="${id}"]`).innerText()).includes(
          "Disattivato dal DM",
        ),
        "Table rules disagree with the Table for " + id,
      );
    await setRole("dm");
    await goSettings("permissions");
    check(
      !(await page.locator('[data-cs-tool="players-draw"]').isChecked()),
      "Permissions switch disagrees with B18's drawer",
    );
    await page.locator('[data-cs-tool="players-draw"]').click();
    await page.locator('[data-cs-tool="players-draw"]:checked').waitFor();
    passed.push(
      "Players' tools (DDB-128 panel: pointer, drawing, templates + fixed rows): pointer off → the player's chip stays visible, aria-disabled, named with the reason; mouse and Enter explain; the DM keeps it. B18's drawer shows the same value; drawing off there → player chip disabled, “Regole della tavola” and the Permissions switch agree (one source of truth)",
    );

    // (8) Sections: "Mondo" off disappears for DM and player; an old link redirects; reload.
    await goSettings("sections");
    await page.locator('[data-cs-section="world"]').click();
    await sidebar("world").waitFor({ state: "detached" });
    await setRole("player");
    await page.goto(base + "#campaign?tab=overview");
    await sidebar("overview").waitFor();
    check(!(await sidebar("world").count()), "Player still sees the hidden section");
    await page.goto(base + "#campaign?tab=world");
    await page.waitForFunction(() => location.hash.includes("tab=overview"));
    check((await toast()).includes("disattivata in questa campagna"), "Redirect gave no reason");
    await page.reload();
    await sidebar("overview").waitFor();
    check(!(await sidebar("world").count()), "Hidden section came back after reload");
    // Review P2: the overview drops the cards and buttons of a section turned off (Kanka).
    check(!(await button("Esplora il mondo").count()), "Overview still offers the hidden World");
    await page.screenshot({ path: shots + "b20-03-player-section-hidden.png" });
    await setRole("dm");
    await goSettings("sections");
    await page.locator('[data-cs-section="journal"]').click();
    await sidebar("journal").waitFor({ state: "detached" });
    await setRole("player");
    await page.goto(base + "#campaign?tab=overview");
    await sidebar("overview").waitFor();
    check(
      !(await page.locator("#content").innerText()).includes("Dove eravamo rimasti") &&
        !(await button("Leggi il resoconto").count()),
      "Overview still shows the hidden Journal",
    );
    await setRole("dm");
    await goSettings("sections");
    await page.locator('[data-cs-section="journal"]').click();
    await sidebar("journal").waitFor();
    await setRole("player");
    passed.push(
      "Section “Mondo” turned off: gone from DM and player navigation and from the overview (“Esplora il mondo”), old link lands on the overview with the reason, reload keeps it; “Diario” off removes “Dove eravamo rimasti” and its button, on again brings them back",
    );

    // (2) View as Livia: create a DM "Only me" note, Livia's own private note and a DM
    // "Only me" plan on Doran through the real editors, then view as Livia and return.
    const newNote = async (title, body) => {
      await button("Appunti personali").click();
      await page.getByRole("heading", { name: "Appunti", exact: true }).waitFor();
      await page.locator('[data-campaign-new="note"]').click();
      await page.locator('[data-campaign-path="data.title"]').fill(title);
      await page.locator('[data-campaign-path="data.body"]').fill(body);
      await page.locator("[data-campaign-save]").click();
      await page.locator("[data-campaign-apply]").click();
      await page.getByRole("heading", { name: title, exact: true, level: 1 }).waitFor();
    };
    await newNote("Sospetti di Livia", "Livia non si fida del cartografo. Nota sintetica privata.");
    await setRole("dm");
    await newNote("Il faro è una trappola", "Solo il DM lo sa. Nota sintetica privata.");
    await page.goto(base + "#characters?id=doran&tab=extras");
    await button("Modifica piano").click();
    await page.locator("#dialog textarea").fill("Doran tradirà il gruppo al livello 5.");
    await page.locator("#dialog button[type=submit]").click();
    await goSettings("permissions");
    await button("Vedi come Livia").click();
    await page.locator("[data-cs-view-title]").waitFor();
    const viewText = await page.locator("#content").innerText();
    check(viewText.includes("Stai vedendo la campagna come Livia"), "View-as banner missing");
    check(!viewText.includes("Il faro è una trappola"), "DM Only-me note visible as Livia");
    check(!viewText.includes("tradirà"), "Doran's Only-me plan text visible as Livia");
    check(!viewText.includes("Sospetti di Livia"), "Livia's own private note shown to the DM");
    check(
      (await page.locator("[data-cs-va-plans]").innerText()).includes("Doran"),
      "Doran's hidden plan not named",
    );
    check(
      (await page.locator("[data-cs-va-hidden]").innerText()).includes("tuoi contenuti privati"),
      "Hidden DM content not counted",
    );
    check(
      !(await page.locator("[data-cs-va-sections]").innerText()).includes("Mondo"),
      "View as lists the hidden section",
    );
    check(await sidebar("campaign-settings-view").count(), "No sidebar entry while viewing as");
    await page.screenshot({ path: shots + "b20-04-dm-view-as-livia.png", fullPage: true });
    // Review P2 (Kanka SVC-040): the member's pages open inside the view, the banner and
    // "Back to my user" stay on each, entries open, and a reload keeps the view.
    await page.locator('[data-cs-va-go="journal"]').click();
    await page.locator('[data-cs-va-go="journal"][aria-current="page"]').waitFor();
    check(
      (await page.locator("[data-cs-view-title]").innerText()).includes("come Livia"),
      "Banner lost on the Journal page",
    );
    const firstEntry = page.locator("[data-cs-va-entries] [data-cs-va-entry]").first();
    await firstEntry.click();
    await page.locator("[data-cs-va-entry-page]").waitFor();
    check(await button("Torna al mio utente").count(), "No way back on the entry page");
    check(await button("Torna a Diario").count(), "Entry page has no way back to its section");
    await page.screenshot({ path: shots + "b20-17-dm-view-as-entry.png", fullPage: true });
    await page.locator('[data-cs-va-go="table"]').click();
    await page.locator("[data-cs-va-table]").waitFor();
    check(
      (await page.locator("[data-cs-va-table]").innerText()).includes(
        "Puntatore e segnali dei giocatori: disattivato dal DM",
      ),
      "View as does not show the pointer policy",
    );
    await page.reload();
    await setRole("dm");
    await page.locator("[data-cs-va-table]").waitFor();
    check(
      (await page.locator("[data-cs-view-title]").innerText()).includes("come Livia"),
      "Reload left the view",
    );
    await button("Torna al mio utente").click();
    await page.locator('[data-cs-tab="permissions"][aria-current="page"]').waitFor();
    check(!(await sidebar("campaign-settings-view").count()), "View-as entry stayed after return");
    passed.push(
      "View as Livia: banner on every page; sections she sees open as she reads them (Diario → a recap entry, Tavolo with the tools policy), a reload keeps the view; DM “Only me” note and Doran's plan invisible (only counted/named), Livia's own note never shown to the DM; “Torna al mio utente” returns",
    );

    // (9) Sheet access: Livia withholds DM edits; the DM asks; she allows; the edit is traced.
    await setRole("player");
    await page.goto(base + "#characters?id=livia&tab=actions");
    const allow = page.locator('[data-cs-sheet-allow="livia"]');
    await allow.scrollIntoViewIfNeeded();
    check(await allow.isChecked(), "Standing authorization not shown");
    await allow.click();
    await page.locator('[data-cs-sheet-allow="livia"]:not(:checked)').waitFor();
    await setRole("dm");
    await page.goto(base + "#characters?id=livia&tab=actions");
    await page.locator("[data-cs-sheet-status]").waitFor();
    check(!(await button("Correggi valori").count()), "DM can still edit Livia's sheet");
    check(
      (await page.locator("[data-cs-sheet-status]").innerText()).includes("Modifica riservata"),
      "DM not told the sheet is reserved",
    );
    // Review P1: every sheet-page command follows the owner's choice, not only "Correggi
    // valori": damage/conditions/HP read-only, an inventory change refused with the reason.
    const liviaBefore = JSON.stringify((await stored()).actors.livia);
    await button("Danni, cure e condizioni").first().click();
    await page.locator("#dialog[open]").waitFor();
    const conditionsText = await page.locator("#dialog").innerText();
    check(
      conditionsText.includes("Consultazione") &&
        !(await page
          .locator("#dialog")
          .getByRole("button", { name: "Danno", exact: true })
          .count()) &&
        !(await page
          .locator("#dialog")
          .getByRole("button", { name: /Correggi PF/ })
          .count()),
      "The DM still edits HP and conditions on the reserved sheet",
    );
    await page.screenshot({ path: shots + "b20-18-dm-reserved-conditions.png" });
    await closeDialog();
    await page.goto(base + "#characters?id=livia&tab=inventory");
    const split = button("Dividi tra il gruppo").first();
    if (await split.count()) {
      await split.click();
      await page.locator("#dialog button[type=submit]").click();
      check(
        (await page.locator("#dialog .dialog-error").innerText()).includes("Modifica riservata"),
        "Inventory change on the reserved sheet not refused",
      );
      await closeDialog();
    } else findings.push("No party-stash split on Livia's inventory to try");
    check(
      JSON.stringify((await stored()).actors.livia) === liviaBefore,
      "Livia's sheet changed without her authorization",
    );
    await page.goto(base + "#characters?id=livia&tab=actions");
    await page.locator("[data-cs-sheet-status]").waitFor();
    await button("Chiedi autorizzazione").click();
    await page.locator(".cs-request", { hasText: "Richiesta inviata" }).waitFor();
    await page.screenshot({ path: shots + "b20-05-dm-sheet-reserved.png" });
    await setRole("player");
    const bell = page.locator('.service-nav [data-service="requests"]');
    check(
      /notific/.test((await bell.getAttribute("aria-label")) ?? ""),
      "Player bell does not count the request",
    );
    await page.goto(base + "#characters?id=livia&tab=actions");
    await page.locator("[data-cs-grant]").click();
    await page.locator('[data-cs-sheet-allow="livia"]:checked').waitFor();
    await setRole("dm");
    await page.goto(base + "#characters?id=livia&tab=actions");
    await button("Correggi valori").click();
    // P2 PG-25: Armor Class is derived now («Cambia con un motivo…»), not a field of
    // «Correggi valori»; the authorized DM edit corrects a recorded value, her speed.
    await page.locator("#dialog input[name=speed]").fill("10.5");
    await page.locator("#dialog button[type=submit]").click();
    await page.locator("[data-cs-trace] li", { hasText: "Scheda modificata" }).waitFor();
    let data = await stored();
    check(data.actors.livia.speed === 10.5, "Authorized DM edit not applied");
    check(
      data.log.some((row) => row.label.includes("Traccia: modifica del DM sulla scheda di Livia")),
      "DM edit not traced in the log",
    );
    await setRole("player");
    await page.goto(base + "#characters?id=livia&tab=actions");
    await page.locator("[data-cs-trace] li", { hasText: "Scheda modificata" }).waitFor();
    await page.locator(".cs-sheet").scrollIntoViewIfNeeded();
    await page.screenshot({ path: shots + "b20-06-player-sheet-trace.png" });
    passed.push(
      "Livia withholds DM edits: DM sheet read-only with the reason (values, damage/conditions/HP panel in “Consultazione”, a stash split into her inventory refused with the reason, her data unchanged), “Chiedi autorizzazione” → player bell → “Consenti” → DM corrects her speed to 10.5 m → trace on Livia's sheet and in the log",
    );

    // (6) Builder: the legacy 2014 source is "blocked in this campaign".
    await page.goto(base + "#characters");
    await button("Crea personaggio").first().click();
    await page.locator('.builder-section-link[data-builder-section="sources"]').click();
    const legacy = page.locator('[data-builder-source-blocked="legacy-2014"]');
    await legacy.waitFor();
    check(
      (await legacy.innerText()).includes("bloccata in questa campagna"),
      "Legacy source not blocked in the builder",
    );
    check(await legacy.locator("input:disabled").count(), "Legacy source checkbox enabled");
    await page.screenshot({ path: shots + "b20-07-builder-legacy-blocked.png" });
    await button("Scarta bozza").click();
    if (await dialogOpen()) await page.locator("#dialog button[type=submit]").click();
    passed.push(
      "Builder › Fonti: “Contenuti legacy 2014 (SRD 5.1) · bloccata in questa campagna”, disabled",
    );

    // (4)+(5) Combat: automatic first (card shows the effect with Undo), enemy health words/
    // exact/hidden on the player's map, then assisted (the target's controller applies).
    await setRole("dm");
    await goSettings("rules");
    await page.locator('[data-cs-rule-input="automation"][value="automatic"]').check();
    await page.locator('[data-cs-rule-input="automation"][value="automatic"]:checked').waitFor();
    check((await area()).policy.automation === "automatic", "Automatic not stored");
    await table();
    // P5 (Foundry combat tracker start): «Avvia combattimento» opens the start dialog with
    // the creatures on the scene and their initiative; «Inizia combattimento» starts it.
    await button("Avvia combattimento").click();
    await page.locator("[data-ct-start-dialog]").waitFor();
    const naturals = { livia: 18, "goblin-1": 12, doran: 10, "goblin-2": 8 };
    for (const id of await page
      .locator("[data-ct-start-include]")
      .evaluateAll((els) => els.map((el) => el.dataset.ctStartInclude))) {
      const box = page.locator('[data-ct-start-include="' + id + '"]');
      if ((await box.isChecked()) !== Object.hasOwn(naturals, id)) await box.click();
    }
    for (const [id, natural] of Object.entries(naturals)) {
      const d20 = page.locator('[data-ct-start-natural="' + id + '"]');
      await d20.fill(String(natural));
      await d20.dispatchEvent("change");
    }
    await button("Inizia combattimento").click();
    await page.locator("[data-select=livia]").waitFor();
    const physicalBolt = async (target, attackFace, damageFace) => {
      await page.locator("[data-select=livia]").click();
      await page
        .getByRole("combobox", { name: "Modalità dei dadi dell’azione", exact: true })
        .selectOption("physical");
      await page.locator("[data-combat-action=fire-bolt]").click();
      await page.locator("[data-combat-action=fire-bolt][aria-pressed=true]").waitFor();
      await page.locator(`#battle-map [data-actor=${target}]`).click();
      await page.getByRole("dialog", { name: "Tiro fisico", exact: true }).waitFor();
      await button("Ho lanciato i dadi").click();
      await button("Risolvi tiro").first().click();
      await page.locator("[name=diceMode]").selectOption("physical");
      await page.locator("[name=face0]").fill(String(attackFace));
      await button("Registra tiro").click();
      await button("Risolvi tiro").first().click();
      await page.locator("[name=diceMode]").selectOption("physical");
      await page.locator("[name=face0]").fill(String(damageFace));
      await button("Registra tiro").click();
      await page.getByRole("dialog", { name: "Tiri e risultati", exact: true }).waitFor();
    };
    await setRole("player");
    await table();
    await physicalBolt("goblin-1", 15, 4);
    const card = page.locator("#dialog .attempt-result").first();
    check((await card.innerText()).includes("4 danni"), "Automatic card lacks the effect");
    check(await card.locator("[data-undo-outcome]").count(), "Automatic card lacks Undo");
    check(!(await card.locator("[data-apply-outcome]").count()), "Automatic card offers Apply");
    data = await stored();
    check(data.actors["goblin-1"].hp === 3, "Automatic damage not applied (7 → 3)");
    await page.screenshot({ path: shots + "b20-08-automatic-card-undo.png" });
    await button("Torna al gioco").click();
    passed.push(
      "Automatic: physical Fire Bolt 15/4 → the card shows “4 danni” with “Annulla”; Sentinella 7 → 3 at once",
    );
    // (5) Enemy health for the player: words (Bloodied), exact, hidden.
    const pill = page.locator('[data-cs-health="goblin-1"]');
    await pill.waitFor();
    check((await pill.textContent()).includes("Sanguinante"), "Words: Sentinella not Bloodied");
    await page.locator("#battle-map [data-actor=goblin-1]").click();
    await page.locator("[data-cs-health-panel]").waitFor();
    check(
      (await page.locator("[data-cs-health-panel]").innerText()).includes("Sanguinante"),
      "Inspector panel lacks the word",
    );
    await page.screenshot({ path: shots + "b20-09-player-enemy-health-words.png" });
    await setRole("dm");
    await goSettings("disclosure");
    await page.locator('[data-cs-rule-input="enemyHp"][value="exact"]').check();
    await setRole("player");
    await table();
    check(
      (await page.locator('[data-cs-health="goblin-1"]').textContent()).includes("3/7 PF"),
      "Exact HP not shown to the player",
    );
    await setRole("dm");
    await goSettings("disclosure");
    await page.locator('[data-cs-rule-input="enemyHp"][value="hidden"]').check();
    await setRole("player");
    await table();
    check(!(await page.locator("[data-cs-health]").count()), "Hidden health still drawn");
    await page.locator("#battle-map [data-actor=goblin-1]").click();
    check(
      (await page.locator("[data-cs-health-panel]").innerText()).includes("tiene nascosta"),
      "Hidden health panel has no reason",
    );
    await setRole("dm");
    await goSettings("disclosure");
    await page.locator('[data-cs-rule-input="enemyHp"][value="words"]').check();
    passed.push(
      "Enemy health for the player: “Sanguinante” (SRD 5.2.1) → “3/7 PF” → nothing, with the inspector reason",
    );
    // Next round: the DM ends turns, then switches to assisted.
    await table();
    for (let i = 0; i < 4; i++) {
      const state = await stored();
      if (state.combat.round === 2 && state.combat.order[state.combat.turn] === "livia") break;
      await button("Termina turno").click();
      await page.waitForTimeout(150);
      await closeDialog();
    }
    data = await stored();
    check(
      data.combat.round === 2 && data.combat.order[data.combat.turn] === "livia",
      "Did not reach Livia's second turn: " + JSON.stringify(data.combat),
    );
    await goSettings("rules");
    await page.locator('[data-cs-rule-input="automation"][value="assisted"]').check();
    await setRole("player");
    await table();
    await physicalBolt("goblin-2", 15, 5);
    const assisted = page.locator("#dialog .attempt-result").first();
    const assistedText = await assisted.innerText();
    check(assistedText.includes("da applicare"), "Assisted card not waiting");
    // Review P2 (dnd5e FVT-138): the goblin's controller applies, not the attacking player.
    check(!(await assisted.locator("[data-apply-outcome]").count()), "The attacker can apply");
    check(assistedText.includes("lo applica il DM"), "The card does not say who applies");
    check((await stored()).actors["goblin-2"].hp === 9, "Assisted damage applied before Apply");
    await page.screenshot({ path: shots + "b20-10-assisted-card-player.png" });
    await button("Torna al gioco").click();
    await closeDialog();
    await button("Termina turno").click();
    await page.locator("#toast", { hasText: "Danni ancora da applicare" }).waitFor();
    await closeDialog();
    await setRole("dm");
    await table();
    const readyPanel = page.locator("[data-cs-ready]");
    await readyPanel.waitFor();
    check(
      (await readyPanel.innerText()).includes("Esploratore · 5 danni · da Livia"),
      "The DM's “Da applicare” panel lacks the pending damage",
    );
    check(
      /notific/.test(
        (await page.locator('.service-nav [data-service="requests"]').getAttribute("aria-label")) ??
          "",
      ),
      "The DM's bell does not count the pending damage",
    );
    await page.screenshot({ path: shots + "b20-10-assisted-dm-to-apply.png" });
    // The same card, opened from the panel: Apply for the DM, then its Undo.
    await readyPanel.locator("[data-cs-open-card]").click();
    const dmCard = page.locator("#dialog .attempt-result").first();
    await dmCard.locator("[data-apply-outcome]").click();
    await page.locator("#dialog [data-undo-outcome]").waitFor();
    check((await stored()).actors["goblin-2"].hp === 4, "Apply did not apply 5 damage");
    await page.locator("#dialog [data-undo-outcome]").click();
    await page.locator("#dialog [data-apply-outcome]").waitFor();
    check((await stored()).actors["goblin-2"].hp === 9, "Undo did not restore HP");
    await button("Torna al gioco").click();
    await closeDialog();
    await page.locator("[data-cs-ready] [data-cs-apply-ready]").click();
    await page.locator("[data-cs-ready]").waitFor({ state: "detached" });
    check((await stored()).actors["goblin-2"].hp === 4, "Apply from the panel failed");
    passed.push(
      "Assisted: the player's card shows “5 danni · da applicare · lo applica il DM” without Apply; ending the turn reminds that damage waits; the DM's Table shows “Da applicare: Esploratore · 5 danni · da Livia” and the bell counts it; the DM applies on the card (9 → 4), “Annulla” → 9, then “Applica” in the panel → 4",
    );

    // (7) Defaults: "names visible to the DM only", Apply to existing with count, Undo.
    await setRole("dm");
    await goSettings("disclosure");
    // W2a1 / R4 sample data: the DM creatures with a token and their scenes are read from the
    // stored state (the tower and the ambush add scenes and two goblin warriors).
    const sample = await stored();
    const onScene = (id) =>
      sample.scenes.some((scene) => (scene.tokens ?? []).some((t) => t.actorId === id));
    const dmCreatures = Object.values(sample.actors).filter(
      (a) => a.kind === "npc" && !a.companion && onScene(a.id),
    );
    const creatureScenes = sample.scenes.filter((scene) =>
      (scene.tokens ?? []).some((t) => dmCreatures.some((a) => a.id === t.actorId)),
    ).length;
    const scenesText = creatureScenes === 1 ? "1 scena" : `${creatureScenes} scene`;
    const count = dmCreatures.length;
    await page.locator('[data-cs-default-input][value="dm"]').check();
    await page
      .locator("[data-cs-impact]", { hasText: `${count} creature cambierebbero` })
      .waitFor();
    await button("Applica alle esistenti…").click();
    const impact = await page.locator("#dialog [data-cs-impact-count]").innerText();
    check(
      impact.includes(`${count} creature cambieranno su ${scenesText}: Sentinella, Esploratore`),
      "Impact count wrong: " + impact,
    );
    await page.screenshot({ path: shots + "b20-11-defaults-impact.png" });
    await page.keyboard.press("Escape");
    check(!(await stored()).ext["token-menu"].names["goblin-1"], "Escape applied the defaults");
    await button("Applica alle esistenti…").click();
    await page.locator("#dialog button[type=submit]").click();
    await page.locator("[data-cs-apply-result]").waitFor();
    data = await stored();
    check(
      /^Creatura sconosciuta/.test(data.actors["goblin-1"].name) &&
        /^Creatura sconosciuta/.test(data.actors["goblin-2"].name),
      "Names not hidden",
    );
    await setRole("player");
    await table();
    check(
      !(await page.locator("#battle-map #tokens").textContent()).includes("Sentinella"),
      "Player still reads the real name",
    );
    await setRole("dm");
    await goSettings("disclosure");
    await page.locator("[data-cs-undo-apply]").click();
    await page.locator("[data-cs-apply-result]", { hasText: "annullato" }).waitFor();
    data = await stored();
    check(data.actors["goblin-1"].name === "Sentinella", "Undo did not restore names");
    passed.push(
      `Defaults: “Solo il DM”, “Applica alle esistenti…” shows “${count} creature cambieranno su ${scenesText}”, Esc changes nothing, Apply hides the names for the player, “Annulla” restores them`,
    );

    // (3) History: every change listed; a correction with a reason turns the pointer on.
    await goSettings("history");
    const historyText = await page.locator(".cs-history").innerText();
    for (const expected of [
      "Regola della casa aggiunta: Pozioni come azione bonus",
      "Puntatore e segnali dei giocatori",
      "Disegni dei giocatori",
      "Sezione «Mondo»",
      "Livello di automazione",
      "Preset delle regole",
    ])
      check(historyText.includes(expected), "History lacks: " + expected);
    const pointerEntry = page
      .locator(".cs-history li", { hasText: "Puntatore e segnali dei giocatori" })
      .first();
    await pointerEntry.locator("[data-cs-restore]").click();
    await page.locator("#dialog button[type=submit]").click();
    check(
      (await page.locator("#dialog .dialog-error").innerText()).length > 0 ||
        (await page.locator("#cs-restore-reason:invalid").count()) > 0,
      "Restore without a reason accepted",
    );
    await page.locator("#cs-restore-reason").fill("Serve per indicare le trappole");
    await page.locator("#dialog button[type=submit]").click();
    await page
      .locator(".cs-history li", { hasText: "motivo: Serve per indicare le trappole" })
      .waitFor();
    check((await setting("players-pointer")) === true, "Correction did not turn the pointer on");
    await page.screenshot({ path: shots + "b20-12-dm-history.png", fullPage: true });
    passed.push(
      "History lists every change; “Ripristina…” needs a reason and records a correction",
    );

    // Review P2: offline, a refused change never leaves the control showing the refused
    // value; focus stays on it.
    const offline = async (value) => {
      await page.locator('[data-service="preferences"]').first().click();
      const box = page.locator('#dialog input[name="offline"]');
      if ((await box.isChecked()) !== value) await box.click();
      await page.locator("#dialog button[type=submit]").click();
      await page.waitForTimeout(200);
    };
    await offline(true);
    await goSettings("disclosure");
    await page.locator('[data-cs-rule-input="enemyHp"][value="exact"]').click();
    await page.locator("#toast", { hasText: "modifica condivisa" }).waitFor();
    check(
      (await page.locator('[data-cs-rule-input="enemyHp"][value="words"]').isChecked()) &&
        !(await page.locator('[data-cs-rule-input="enemyHp"][value="exact"]').isChecked()),
      "The refused radio still shows the refused value",
    );
    check(
      await page.evaluate(() =>
        document.activeElement?.matches?.('[data-cs-rule-input="enemyHp"][value="exact"]'),
      ),
      "Focus left the refused control",
    );
    await settingsTab("permissions");
    await page.locator('[data-cs-tool="players-templates"]').click();
    await page.locator("#toast", { hasText: "modifica condivisa" }).waitFor();
    check(
      await page.locator('[data-cs-tool="players-templates"]').isChecked(),
      "The refused switch shows OFF",
    );
    check((await setting("players-templates")) !== false, "Offline change stored");
    await page.screenshot({ path: shots + "b20-19-offline-refused.png" });
    await offline(false);
    passed.push(
      "Offline: “PF esatti” and the templates switch are refused with the reason; both controls go back to the stored value and keep focus",
    );

    // Reload keeps everything; players read the rules page.
    // The demonstration identity is not persisted: after a reload the shell starts as the
    // player; the DM switches back and finds the same settings.
    // (A player on the DM's settings link is sent to the table rules.)
    await page.reload();
    await page.waitForFunction(() => location.hash.includes("tab=campaign-settings-rules"));
    await setRole("dm");
    await goSettings("history");
    await page.locator(".cs-history").waitFor();
    const kept = await area();
    check(
      kept.policy.automation === "assisted" &&
        kept.policy.hiddenSections.includes("world") &&
        kept.houseRules.some((r) => r.title === "Pozioni come azione bonus"),
      "Reload lost settings",
    );
    await setRole("player");
    await page.goto(base + "#campaign?tab=campaign-settings-rules");
    await page.getByRole("heading", { name: "Regole della tavola", level: 1 }).waitFor();
    const rulesText = await page.locator("#content").innerText();
    check(
      rulesText.includes("Assistito") && rulesText.includes("Pozioni come azione bonus"),
      "Player rules page incomplete",
    );
    check(!(await page.locator("[data-cs-rule-input]").count()), "Player can edit rules");
    await page.goto(base + "#campaign?tab=settings");
    await page.waitForFunction(() => location.hash.includes("tab=campaign-settings-rules"));
    check(!(await page.locator("[data-cs-tab]").count()), "Player reached the settings");
    await page.getByRole("heading", { name: "Regole della tavola", level: 1 }).waitFor();
    await page.screenshot({ path: shots + "b20-13-player-table-rules.png", fullPage: true });
    const deskSmall = await smallTargets(
      ".cs-page button, .cs-page .cs-option, .cs-page .cs-switch, .cs-page a",
    );
    check(!deskSmall.length, "Small desktop targets: " + JSON.stringify(deskSmall));
    check(await noOverflow(), "Desktop overflow");
    passed.push(
      "Reload keeps settings; the player reads “Regole della tavola” without edit controls; the Settings link lands there; targets ≥ 40 px, no overflow",
    );

    // ---------------------------------------------------------------------------------
    // EN phone 390x844, touch, the same synthetic state.
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await phone.addInitScript(
      ([k, value]) => {
        if (!sessionStorage.getItem("b20-seeded")) {
          localStorage.setItem(k, value);
          sessionStorage.setItem("b20-seeded", "1");
        }
      },
      [key, snapshot],
    );
    mobile = await phone.newPage();
    mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
    await mobile.goto(base + "#campaign?tab=overview");
    await mobile.locator("#content").waitFor();
    await mobile.locator('[data-service="preferences"]').tap();
    await mobile.locator('#dialog [name="lang"]').selectOption("en");
    await mobile.locator("#dialog button[type=submit]").tap();
    await setRole("dm", mobile);
    await mobile.goto(base + "#campaign?tab=settings&id=rules");
    await mobile.getByRole("heading", { name: "Campaign settings", level: 1 }).waitFor();
    await styled(mobile);
    check(await noOverflow(mobile), "Phone settings overflow");
    // P10 CA-71: enemy health is in «What players see».
    await mobile.goto(base + "#campaign?tab=settings&id=disclosure");
    await mobile.getByRole("heading", { name: "What players see", level: 2 }).waitFor();
    check(await noOverflow(mobile), "Phone «What players see» overflow");
    await mobile.locator('[data-cs-rule-input="enemyHp"][value="exact"]').tap();
    await mobile.locator('[data-cs-rule-input="enemyHp"][value="exact"]:checked').waitFor();
    check((await area(mobile)).policy.enemyHp === "exact", "Phone tap did not change the rule");
    // Review P3: the SRD page links are 40 px targets on the phone too.
    const phoneSmall = await smallTargets(
      ".cs-page button, .cs-page .cs-option, .cs-page .cs-switch, .cs-page a",
      mobile,
    );
    check(!phoneSmall.length, "Small phone targets: " + JSON.stringify(phoneSmall));
    await mobile.screenshot({ path: shots + "b20-14-phone-settings-en.png", fullPage: true });
    await mobile.locator('[data-cs-tab="permissions"]').tap();
    await button("View as Livia", mobile).tap();
    await mobile.getByText("You are viewing the campaign as Livia").waitFor();
    check(await noOverflow(mobile), "Phone view-as overflow");
    await mobile.screenshot({ path: shots + "b20-15-phone-view-as-en.png", fullPage: true });
    // Review P2: the member's Table page, health words in the DM's language (EN).
    await mobile.locator('[data-cs-va-go="table"]').tap();
    await mobile.locator("[data-cs-va-table]").waitFor();
    const vaTable = await mobile.locator("[data-cs-va-table]").innerText();
    check(
      vaTable.includes("Sentinella · 3/7 HP") && !vaTable.includes("PF"),
      "View-as health not in EN: " + vaTable,
    );
    const vaSmall = await smallTargets(".cs-page button", mobile);
    check(!vaSmall.length, "Small view-as targets: " + JSON.stringify(vaSmall));
    check(await noOverflow(mobile), "Phone view-as table overflow");
    await button("Back to my user", mobile).tap();
    await mobile.locator('[data-cs-tab="permissions"][aria-current="page"]').waitFor();
    await setRole("player", mobile);
    await mobile.goto(base + "#table");
    await mobile.locator("#battle-map").waitFor();
    await closeDialog(mobile);
    const phonePill = mobile.locator('[data-cs-health="goblin-1"]');
    await phonePill.waitFor();
    check((await phonePill.textContent()).includes("3/7 HP"), "Phone player lacks exact HP in EN");
    check(await noOverflow(mobile), "Phone table overflow");
    await mobile.screenshot({ path: shots + "b20-16-phone-player-table-en.png" });
    passed.push(
      "EN phone (touch): settings tap changes enemy HP to exact (SRD links ≥ 40 px), view as Livia → Table page with “Sentinella · 3/7 HP” in EN, back; player map shows “3/7 HP”; ≥ 40 px targets, no overflow",
    );

    check(errors.length === 0, "Page errors: " + errors.join("; "));
    await phone.close();
    await context.close();
    return { passed, findings, errors };
  } catch (error) {
    await page
      .screenshot({ path: shots + "b20-failure-desktop.png", fullPage: true })
      .catch(() => {});
    if (mobile) await mobile.screenshot({ path: shots + "b20-failure-phone.png" }).catch(() => {});
    throw Error(error.message + " | passed so far: " + passed.join(" / "));
  }
};
