async (rootPage) => {
  // B62: token-menu commands of labelled submenus are one step deeper (Foundry Token HUD
  // FVT-119, D&D Beyond token menu DDB-117): open the submenu holding it, then the command.
  const menuPick = async (page, name, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const menu = page.locator("body > .token-menu");
    const item = () => menu.getByRole("menuitem", { name });
    await menu.locator("[data-nav]").first().waitFor();
    if (await item().count()) return press(item().first());
    const ids = await menu
      .locator("[data-token-menu-category]")
      .evaluateAll((els) => els.map((e) => e.dataset.tokenMenuCategory));
    for (const id of ids) {
      await press(menu.locator(`[data-token-menu-category="${id}"]`));
      if (await item().count()) return press(item().first());
      await press(menu.locator("[data-token-menu-back]"));
    }
    throw Error("token menu command not found: " + name);
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
  // B14 — Table: presentation, session state and presence. Real clicks, keys and touch on
  // the one app with synthetic demo data (resets this browser's demo state). Groups:
  // A IT 1440 DM+player (gate, pause, presence, split, countdown/clock, view as, spectator
  // and pop-out, hide UI, arrival centring, end story), B inactivity keep-alive with the
  // Playwright clock, C EN 390 touch, D review fixes (IT 1440). Images go to the B14
  // evidence directory.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B14/";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const watch = (page) => page.on("pageerror", (error) => errors.push(error.message));

  // ---------------------------------------------------------------- Group A: IT 1440
  const context = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  watch(page);
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const session = async () => (await stored()).ext["session-view"];
  const button = (name, root = page) => root.getByRole("button", { name, exact: true });
  const role = async (value) => {
    await page.getByRole("combobox", { name: /Visita come|Visit as/ }).selectOption(value);
    await page.waitForTimeout(50);
  };
  const content = () => page.locator("#content").innerText();
  const drawer = page.locator("#table-drawer");
  const openDrawer = async () => {
    if (await drawer.locator(".session-view-controls").count()) return;
    await openTablePanel(page, "session-view-controls");
    await drawer.locator(".session-view-controls").waitFor();
  };
  const hud = page.locator(".session-view-hud");
  // Visual pass 2 (30/09/2026): the DM's session commands (Session panel, Pause, Hide scene,
  // countdown, clocks, party) sit in the map's one «Sessione» menu (Owlbear keeps one row of
  // controls); open it before pressing one. It stays open while Pause and Hide are pressed.
  const sessionMenu = async (h) => {
    const menu = h.locator("[data-session-menu]");
    if ((await menu.count()) && (await menu.getAttribute("aria-expanded")) !== "true")
      await menu.click();
  };
  const livia = page.locator("[data-actor=livia]");

  await page.goto(base);
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await page.getByRole("heading", { name: "La prossima avventura", level: 1 }).waitFor();
  await role("dm");
  await button("Entra al Tavolo").first().click();
  await page.locator("#battle-map").waitFor();
  check((await hud.locator('[data-sv="hide"]').count()) === 1, "DM HUD has no Hide scene button");
  // The Crypt is created through Preparation, reached from the session panel. W2a1: B35
  // seeds a second scene (the Lantern tower); with two scenes the panel lists both and
  // drops its one-scene shortcut, so Preparation opens from the Table's «Scene».
  await openDrawer();
  if (await button("Crea un’altra scena in Preparazione", drawer).count())
    await button("Crea un’altra scena in Preparazione", drawer).click();
  else {
    // P6 TV-106: the title row's «Scene» lists the scenes; «Prepara le scene» opens Preparation.
    await page.locator('.table-topline [data-table="scenes"]').click();
    await page.locator("#dialog [data-table-scene-prepare]").click();
  }
  await page.locator(".prep-scene-row").first().waitFor();
  // P7 folders: the list no longer starts with the courtyard; copy the courtyard itself.
  const pageCourtyard = page.locator(".prep-scene-row", {
    hasText: "Il cortile dell’osservatorio",
  });
  await pageCourtyard.locator("summary", { hasText: "Altre azioni" }).click();
  await pageCourtyard.getByRole("button", { name: "Duplica con oggetti e varianti…" }).click();
  await page.locator("#dialog input[name=name]").fill("Cripta");
  await button("Crea copia", page.locator("#dialog")).click();
  // P7: the copy stays in the one scene list (no editor jump); wait for it in the state.
  await page.waitForFunction(
    (k) => JSON.parse(localStorage.getItem(k)).scenes.some((s) => s.name === "Cripta"),
    key,
  );
  const cryptId = (await stored()).scenes.find((s) => s.name === "Cripta").id;
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await openDrawer();
  await button("Avvia sessione", drawer).click();
  await drawer.locator("[data-sv-status]", { hasText: "In corso" }).waitFor();
  check(
    (await session()).sessions.at(-1).status === "live",
    "Session not live after Avvia sessione",
  );
  passed.push(
    "A0 DM: Crypt created through Preparation from the session panel; session started from the drawer",
  );

  // (1) Hide the scene, change it privately, the player waits with a tip, Show brings everyone.
  await sessionMenu(hud);
  await hud.locator('[data-sv="hide"]').click();
  await hud.locator('[data-sv-chip="hidden"]').waitFor();
  await openDrawer();
  await drawer.locator("input[name=message]").first().fill("Dieci minuti di pausa, poi si scende");
  await button("Salva messaggio", drawer).click();
  await drawer.locator(`[data-sv-scene="${cryptId}"]`).click();
  await page.locator(".table-topline h1", { hasText: "Cripta" }).waitFor();
  const privateEntry = (await stored()).log.at(-1);
  check(
    privateEntry.visibility === "private" && /Cripta/.test(privateEntry.label),
    "Private scene change not private: " + JSON.stringify(privateEntry),
  );
  await page.screenshot({ path: shots + "b14-01-dm-hidden-scene.png" });
  await role("player");
  await page
    .locator(".session-view-wait h1", { hasText: "Il DM sta preparando la scena" })
    .waitFor();
  let text = await content();
  check(text.includes("Dieci minuti di pausa, poi si scende"), "Waiting message missing");
  check(
    !/Cripta|cortile|Esploratore|Sentinella/.test(text),
    "Waiting screen leaks the scene: " + text.slice(0, 400),
  );
  check(!(await page.locator("#battle-map").count()), "Player still sees the map while hidden");
  const tip = await page.locator("[data-sv-tip-text]").innerText();
  await button("Altro consiglio").click();
  check((await page.locator("[data-sv-tip-text]").innerText()) !== tip, "Tip did not change");
  await page.screenshot({ path: shots + "b14-02-player-waiting.png" });
  await page.reload();
  await page
    .locator(".session-view-wait h1", { hasText: "Il DM sta preparando la scena" })
    .waitFor();
  await role("dm");
  await sessionMenu(hud);
  await hud.locator('[data-sv="show"]').click();
  await hud.locator('[data-sv="hide"]').waitFor();
  await role("player");
  await page.locator(".table-topline h1", { hasText: "Cripta" }).waitFor();
  check(
    (await page.locator("#battle-map").count()) === 1,
    "Show did not bring the player back to the map",
  );
  await role("dm");
  await openDrawer();
  await drawer.locator('[data-sv-scene="old-watch"]').click();
  await page.locator(".table-topline h1", { hasText: "cortile" }).waitFor();
  check(
    (await session()).sessions
      .at(-1)
      .scenes.map((s) => s.sceneId)
      .join() === `old-watch,${cryptId},old-watch`,
    "Scene timeline not recorded",
  );
  passed.push(
    "A1 Hide scene → player waiting message + rotating tip, no scene data, reload keeps it; private switch to Crypt; Show → player on Crypt; timeline old-watch→Crypt→old-watch",
  );

  // (2) Pause: the player's drag and keyboard move are refused with the reason.
  await sessionMenu(hud);
  await hud.locator('[data-sv="pause"]').click();
  await hud.locator(".session-view-paused").waitFor();
  await role("player");
  await hud.locator(".session-view-paused", { hasText: "In pausa" }).waitFor();
  const start = await livia.getAttribute("transform");
  const box = await livia.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 40, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  check((await livia.getAttribute("transform")) === start, "Paused drag moved Livia");
  check(
    /in pausa/i.test(await page.locator("#map-message").innerText()),
    "Refusal reason missing: " + (await page.locator("#map-message").innerText()),
  );
  await page.locator("#battle-map").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  check((await livia.getAttribute("transform")) === start, "Paused keyboard move moved Livia");
  await page.screenshot({ path: shots + "b14-03-player-paused.png" });
  await role("dm");
  await sessionMenu(hud);
  await hud.locator('[data-sv="resume"]').click();
  await hud.locator('[data-sv="pause"]').waitFor();
  check(!(await hud.locator(".session-view-paused").count()), "Pause indicator still shown");
  check((await session()).sessions.at(-1).pauses.length === 1, "Pause not recorded in the session");
  passed.push(
    'A2 Foundry pause: centred indicator, player drag and ArrowRight+Enter refused with "in pausa" reason, token unchanged; DM resumes',
  );

  // (5) Presence: Livia "Away — back soon", visible to the party, kept after reload.
  await role("player");
  await hud.locator('[data-sv="group"]').click();
  await page.locator("#dialog h2", { hasText: "Il gruppo" }).waitFor();
  await page.locator("#dialog input[name=status][value=away]").check();
  await page.locator("#dialog input[name=message]").fill("torno subito");
  await button("Aggiorna il mio stato", page.locator("#dialog")).click();
  await hud
    .locator('[data-sv-chip="away"]', { hasText: "Livia: assente — torno subito" })
    .waitFor();
  await role("dm");
  await hud
    .locator('[data-sv-chip="away"]', { hasText: "Livia: assente — torno subito" })
    .waitFor();
  await openDrawer();
  check(
    (await drawer.locator('[data-sv-member="player"]').innerText()).includes(
      "Assente — torno subito",
    ),
    "DM presence list missing the status",
  );
  await page.reload();
  await page.locator("#battle-map").waitFor();
  await hud.locator('[data-sv-chip="away"]', { hasText: "torno subito" }).waitFor();
  passed.push(
    'A3 Alchemy presence: player sets Away + "torno subito"; DM HUD chip and drawer list show it; kept after reload',
  );

  // (6) Split party: Doran to the Crypt (select + Move here), Mira by drag, Undo, Regroup.
  await role("dm");
  const doranStart = (await stored()).scenes
    .find((s) => s.id === "old-watch")
    .tokens.find((t) => t.actorId === "doran");
  await openDrawer();
  await drawer.locator('[data-sv-chip-actor="doran"]').click();
  await drawer.locator(`[data-sv-move-here="${cryptId}"]`).click();
  await page.locator("[data-actor=doran]").waitFor({ state: "detached" });
  // P10 TV-115: one ribbon chip per group (Roll20 party ribbons): scene name, then names.
  await hud
    .locator(`[data-sv-chip="split"][data-sv-ribbon-scene="${cryptId}"]`, { hasText: "Doran" })
    .filter({ hasText: "Cripta" })
    .waitFor();
  await openDrawer();
  check(
    (await drawer.locator(`[data-sv-ribbon="${cryptId}"]`).innerText()).includes("Doran"),
    "Crypt ribbon does not list Doran",
  );
  await drawer
    .locator('[data-sv-chip-actor="mira"]')
    .dragTo(drawer.locator(`[data-sv-ribbon="${cryptId}"]`));
  await page.locator("[data-actor=mira]").waitFor({ state: "detached" });
  await page.screenshot({ path: shots + "b14-04-dm-split-ribbons.png", fullPage: true });
  await drawer.getByRole("button", { name: /Annulla: Mira si separa dal gruppo/ }).click();
  await page.locator("[data-actor=mira]").waitFor();
  check((await stored()).log.at(-1).kind === "correction", "Undo did not record a correction");
  await role("player");
  await hud
    .locator(`[data-sv-chip="split"][data-sv-ribbon-scene="${cryptId}"]`, { hasText: "Doran" })
    .filter({ hasText: "un’altra scena" })
    .waitFor();
  check(!(await content()).includes("Cripta"), "Player reads the breakout scene name");
  await role("dm");
  await openDrawer();
  await button("Riunisci il gruppo", drawer).click();
  await page.locator("[data-actor=doran]").waitFor();
  const doranBack = (await stored()).scenes
    .find((s) => s.id === "old-watch")
    .tokens.find((t) => t.actorId === "doran");
  check(
    doranBack.x === doranStart.x && doranBack.y === doranStart.y,
    "Regroup did not restore Doran’s position",
  );
  check(
    !(await hud.locator('[data-sv-chip="split"]').count()),
    "Split chip still shown after Regroup",
  );
  passed.push(
    'A4 Roll20 ribbons: Doran by select+"Sposta qui", Mira by drag onto the Crypt ribbon; Undo returns Mira; player sees "in un’altra scena" only; Regroup restores Doran at his spot',
  );

  // (7) Countdown 5 minutes hidden from players, pinned progress clock, close and re-pin.
  await openDrawer();
  await drawer.locator('form[data-sv-form="timer"] input[name=label]').fill("La porta si chiude");
  await drawer.locator('form[data-sv-form="timer"] input[name=hideRemaining]').check();
  await button("Salva", drawer.locator('form[data-sv-form="timer"]')).click();
  await drawer.locator('[data-sv-timer-add="300000"]').click();
  await drawer.locator(".session-view-countdown strong", { hasText: "5:00" }).waitFor();
  await drawer.locator('[data-sv-timer-add="10000"]').click({ button: "right" });
  await drawer.locator(".session-view-countdown strong", { hasText: "4:50" }).waitFor();
  await drawer.locator('[data-sv-timer-add="10000"]').click({ modifiers: ["Shift"] });
  await drawer.locator(".session-view-countdown strong", { hasText: "4:40" }).waitFor();
  await drawer.locator('[data-sv-timer-add="10000"]').click();
  await drawer.locator('[data-sv-timer-add="10000"]').click();
  await drawer.locator(".session-view-countdown strong", { hasText: "5:00" }).waitFor();
  await button("Avvia", drawer).click();
  await drawer
    .locator(".session-view-countdown strong", { hasText: /^4:5\d$/ })
    .waitFor({ timeout: 6000 });
  check((await session()).timer.running === true, "Countdown is not running");
  await drawer.locator('form[data-sv-form="clock"] input[name=label]').fill("Il rituale");
  await button("Aggiungi orologio", drawer).click();
  await drawer.getByRole("button", { name: "Il rituale: riempi fino a 2" }).click();
  await drawer.locator(".session-view-clock-row", { hasText: "2/6" }).waitFor();
  await button("Fissa ai giocatori", drawer).click();
  await hud.locator(".session-view-clock", { hasText: "Il rituale" }).waitFor();
  check(
    /\d:\d\d/.test(await hud.locator(".session-view-timer").innerText()),
    "DM HUD does not show the remaining time",
  );
  await page.screenshot({ path: shots + "b14-05-dm-timer-clock.png" });
  await role("player");
  const timerText = await hud.locator(".session-view-timer").innerText();
  check(
    timerText.includes("La porta si chiude") &&
      timerText.includes("in corso") &&
      !/\d:\d\d/.test(timerText),
    "Player sees the hidden remaining time: " + timerText,
  );
  await hud.locator(".session-view-clock", { hasText: "Il rituale" }).waitFor();
  await page.screenshot({ path: shots + "b14-06-player-timer-clock.png" });
  await hud.getByRole("button", { name: "Chiudi l’orologio fissato" }).click();
  await hud.locator(".session-view-clock").waitFor({ state: "detached" });
  await role("dm");
  await openDrawer();
  await button("Togli dagli schermi", drawer).click();
  await button("Fissa ai giocatori", drawer).click();
  await role("player");
  await hud.locator(".session-view-clock", { hasText: "Il rituale" }).waitFor();
  passed.push(
    'A5 Ticker/Count!: +5m, right-click and Shift+click subtract, running 4:5x; "hide remaining" shows the player "in corso" only; clock 2/6 pinned, closed by the player, re-pinned',
  );

  // (4) View as Livia: banner, act for her (map tap and keyboard), log "DM per Livia", exit.
  await role("dm");
  await openDrawer();
  await button("Vedi come Livia", drawer).click();
  await page
    .locator(".session-view-banner", { hasText: "Stai vedendo il Tavolo come Livia" })
    .waitFor();
  check(!(await page.locator("#battle-map").count()), "DM Table still rendered under view-as");
  check(
    /in corso/.test(await page.locator(".session-view-as .session-view-timer").innerText()),
    "View-as does not hide the remaining time like the player",
  );
  await page.locator('[data-sv-behalf-pick="livia"]').click();
  const map = page.locator("[data-sv-behalf-map]");
  const mbox = await map.boundingBox();
  await map.click({ position: { x: mbox.width * 0.3, y: mbox.height * 0.45 } });
  await page.locator(".session-view-behalf-status", { hasText: "Distanza" }).waitFor();
  await page.screenshot({ path: shots + "b14-07-dm-view-as-livia.png" });
  const liviaBefore = (await stored()).scenes
    .find((s) => s.id === "old-watch")
    .tokens.find((t) => t.actorId === "livia");
  await button("Conferma movimento per Livia").click();
  let log = (await stored()).log.at(-1);
  check(
    log.label === "DM per Livia · Livia: movimento confermato" && log.controller === "dm",
    'Log not "DM per Livia": ' + JSON.stringify(log),
  );
  const liviaAfter = (await stored()).scenes
    .find((s) => s.id === "old-watch")
    .tokens.find((t) => t.actorId === "livia");
  check(
    liviaAfter.x !== liviaBefore.x || liviaAfter.y !== liviaBefore.y,
    "On-behalf move did not move Livia",
  );
  await page.locator("[data-sv-behalf-map]").focus();
  await page.keyboard.press("ArrowDown");
  await page.locator(".session-view-behalf-status", { hasText: "Distanza" }).waitFor();
  await page.keyboard.press("Enter");
  log = (await stored()).log.at(-1);
  check(
    log.label.startsWith("DM per Livia") && log.id !== undefined,
    "Keyboard on-behalf move not logged",
  );
  await button("Cambia lo stato di Livia").click();
  await page.locator("#dialog input[name=status][value=here]").check();
  await page.locator("#dialog input[name=message]").fill("");
  await button("Aggiorna per Livia", page.locator("#dialog")).click();
  check(
    (await stored()).log.at(-1).label === "DM per Livia · Presente",
    "On-behalf presence label wrong",
  );
  await button("Esci dalla vista").click();
  await page.locator("#battle-map").waitFor();
  check(!(await page.locator(".session-view-banner").count()), "Banner left after exit");
  check(
    (await page.locator(".table-topline h1").innerText()).includes("cortile"),
    "DM Table not restored",
  );
  passed.push(
    'A6 Roll20 Player View: banner, player-like timer, tap and ArrowDown+Enter moves logged "DM per Livia · …" by the DM, presence on behalf; clean exit to the DM Table',
  );

  // (3) Spectator view in a new tab: no UI, no hidden token or DM note, follows scene
  // changes, grid locked to scale; pop-out board for timer and clock (Foundry V14).
  await livia.waitFor();
  await page.locator("[data-actor=goblin-2]").click({ button: "right" });
  await menuPick(page, /Nascondi ai giocatori/); // B62: «Visibilità» submenu
  await page.waitForTimeout(150);
  check(
    (await stored()).scenes
      .find((s) => s.id === "old-watch")
      .tokens.find((t) => t.actorId === "goblin-2").hidden === true,
    "Goblin not hidden through the token menu",
  );
  await page.keyboard.press("Escape");
  await openDrawer();
  const [spectator] = await Promise.all([
    context.waitForEvent("page"),
    button("Apri vista spettatore", drawer).click(),
  ]);
  watch(spectator);
  await spectator.locator(".session-view-display .session-view-map").waitFor();
  check(
    !(await spectator.locator(".app-header").isVisible()) &&
      !(await spectator.locator(".demo-strip").isVisible()),
    "Spectator shows the app interface",
  );
  const specText = await spectator.locator(".session-view-display").innerText();
  check(
    !/Esploratore/.test(specText) && /Sentinella/.test(specText) && /Livia/.test(specText),
    "Spectator tokens wrong: " + specText,
  );
  check(
    !/Un cortile aperto|ostacoli di regole/.test(specText),
    "Spectator shows the DM description",
  );
  const width = Number(
    await spectator.locator(".session-view-display .session-view-map").getAttribute("width"),
  );
  check(width === 1890, "Grid not locked at 25 mm / 96 ppi (1890 px): " + width);
  const place = await spectator.locator("[data-sv-locked]").getAttribute("style");
  await spectator.mouse.move(400, 300);
  await spectator.mouse.wheel(0, 600);
  check(
    (await spectator.locator("[data-sv-locked]").getAttribute("style")) === place,
    "Spectator view moved on wheel",
  );
  await spectator.screenshot({ path: shots + "b14-08-spectator.png" });
  await drawer.locator('form[data-sv-form="display"] input[name=cellMm]').fill("25.4");
  await drawer.locator('form[data-sv-form="display"] input[name=ruler]').check();
  await button("Salva scala e area", drawer).click();
  await spectator.locator(".session-view-ruler").waitFor();
  check(
    Number(
      await spectator.locator(".session-view-display .session-view-map").getAttribute("width"),
    ) === 1920,
    "Spectator did not follow the new scale",
  );
  await openDrawer();
  await drawer.locator(`[data-sv-scene="${cryptId}"]`).click();
  await spectator.locator(`.session-view-display[data-sv-scene="${cryptId}"]`).waitFor();
  await sessionMenu(hud);
  await hud.locator('[data-sv="hide"]').click();
  await spectator.locator(".session-view-wait").waitFor();
  check(
    !(await spectator.locator(".session-view-display").innerText()).includes("Cripta"),
    "Hidden scene leaks to the spectator",
  );
  await sessionMenu(hud);
  await hud.locator('[data-sv="show"]').click();
  await spectator
    .locator(`.session-view-display[data-sv-scene="${cryptId}"] .session-view-map`)
    .waitFor();
  await openDrawer();
  await drawer.locator('[data-sv-scene="old-watch"]').click();
  await spectator.locator('.session-view-display[data-sv-scene="old-watch"]').waitFor();
  // Review fix P1: the spectator tab is a locked read-only shell. The DM keeps playing
  // after it opened; keys, the palette, Undo and a hash to a writable page in the TV tab
  // never change the shared state.
  await openDrawer();
  await drawer.locator('form[data-sv-form="clock"] input[name=label]').fill("Guardie in arrivo");
  await button("Aggiungi orologio", drawer).click();
  await drawer.locator(".session-view-clock-row", { hasText: "Guardie in arrivo" }).waitFor();
  const sharedBefore = await page.evaluate((k) => localStorage.getItem(k), key);
  await spectator.bringToFront();
  await spectator.locator("body").click({ position: { x: 20, y: 20 } });
  for (const k of ["Control+z", "Meta+z", "Control+k", "Escape", "?", "Control+Shift+H"])
    await spectator.keyboard.press(k);
  for (const k of ["Home", "Tab", "Enter", "Tab", "Enter", "Tab", "Enter"])
    await spectator.keyboard.press(k);
  check(
    /solo visione/.test(await spectator.locator("#toast").innerText()),
    "Spectator keys not refused as view only",
  );
  check(
    !(await spectator.locator("#dialog[open], [data-cmdk-list]").count()),
    "Palette or dialog opened in the spectator tab",
  );
  await spectator.evaluate(() => (location.hash = "#campaign?tab=journal"));
  await spectator.waitForTimeout(200);
  check(
    (await spectator.locator(".session-view-display").count()) === 1 &&
      !(await spectator.locator(".campaign-sidebar, #battle-map").count()),
    "Spectator tab left the display for a writable page",
  );
  await spectator.evaluate(() => (location.hash = "#table"));
  await spectator.waitForTimeout(200);
  check(
    (await spectator.locator(".session-view-display").count()) === 1 &&
      !(await spectator.locator("#battle-map").count()),
    "Spectator tab reached the Table",
  );
  check(
    (await page.evaluate((k) => localStorage.getItem(k), key)) === sharedBefore,
    "The spectator tab changed the shared state",
  );
  await page.bringToFront();
  await openDrawer();
  const [board] = await Promise.all([
    context.waitForEvent("page"),
    button("Stacca timer e orologi in una finestra", drawer).click(),
  ]);
  watch(board);
  await board
    .locator(".session-view-display.is-board .session-view-clock", { hasText: "Il rituale" })
    .waitFor();
  // Review fix P2: the DM's pop-out is the DM's view (seconds, every clock), read only.
  const boardText = await board.locator(".session-view-display").innerText();
  check(
    /Vista del DM/i.test(boardText) &&
      /\d:\d\d/.test(await board.locator(".session-view-timer").innerText()) &&
      boardText.includes("I giocatori leggono solo «in corso»") &&
      boardText.includes("Guardie in arrivo") &&
      !(await board.locator("button:visible").count()),
    "DM pop-out is not the DM's read-only view: " + boardText.slice(0, 300),
  );
  await board.screenshot({ path: shots + "b14-09-popout-board.png" });
  await board.close();
  await spectator.close();
  passed.push(
    "A7 Spectator tab: no header/strip, hidden goblin and DM description absent, 1890→1920 px locked grid with ruler, wheel ignored, follows Crypt/hide/show/old-watch; locked shell (keys, palette, Undo, hash to Diario/Tavolo refused, shared state byte-identical after the DM's newer clock); DM pop-out with seconds and every clock, no controls",
  );

  // Hide the interface (Owlbear Ctrl+Shift+H) and back with the on-map button.
  await page.locator("#battle-map").focus();
  await page.keyboard.press("Control+Shift+H");
  await hud
    .locator(".session-view-clean")
    .waitFor()
    .catch(() => page.locator(".session-view-clean").waitFor());
  // B61: the inspector is one tab of the Table's right sidebar; the sidebar (panel and tabs)
  // is what the clean view hides and brings back.
  check(
    !(await page.locator(".app-header").isVisible()) &&
      !(await page.locator(".table-sidebar-panel").isVisible()) &&
      !(await page.locator(".table-sidebar-rail").isVisible()),
    "Interface still visible",
  );
  const mapBox = await page.locator("#battle-map").boundingBox();
  check(
    mapBox.width >= 1400 && mapBox.height >= 880,
    "Map not full screen when the UI is hidden: " + JSON.stringify(mapBox),
  );
  await page.screenshot({ path: shots + "b14-10-clean-ui.png" });
  await page.getByRole("button", { name: /Mostra interfaccia/ }).click();
  await page.locator(".app-header").waitFor();
  check(
    (await page.locator(".table-sidebar-panel").isVisible()) &&
      (await page.locator(".table-sidebar-rail").isVisible()),
    "Interface not restored",
  );
  passed.push(
    "A8 Ctrl+Shift+H hides header, inspector and toolbars (map full screen); on-map button restores",
  );

  // (9) Arrival centred on the player's own tokens; Home recentres, Shift+Home fits.
  await role("player");
  await button("Ingrandisci").click();
  await button("Ingrandisci").click();
  // P2 PG-20: «Scheda completa» now opens the sheet over the map; leave the Table for the
  // sheet page instead, then come back with the shell's «Torna al Tavolo».
  await page.goto(base + "#characters?id=livia");
  await page.waitForURL(/#characters/);
  await page
    .getByRole("button", { name: /Torna al Tavolo/ })
    .first()
    .click();
  await page.locator("#battle-map").waitFor();
  await page.waitForTimeout(150);
  const state = await stored();
  const own = state.scenes
    .find((s) => s.id === "old-watch")
    .tokens.filter((t) => ["livia", "mira"].includes(t.actorId));
  const cx = (Math.min(...own.map((t) => t.x)) + Math.max(...own.map((t) => t.x))) / 2;
  const [vx, , vw] = (await page.locator("#battle-map").getAttribute("viewBox"))
    .split(" ")
    .map(Number);
  check(
    Math.abs(vx + vw / 2 - Math.max(vw / 2, cx)) < 2 && vw < 1000,
    "Arrival not centred on own tokens: " + [vx, vw, cx],
  );
  await page.locator("#battle-map").focus();
  await page.keyboard.press("Shift+Home");
  await page.waitForTimeout(100);
  check(
    (await page.locator("#battle-map").getAttribute("viewBox")) === "0 0 1000 650",
    "Shift+Home did not show the whole scene",
  );
  await page.locator("#battle-map").focus();
  await page.keyboard.press("Home");
  await page.waitForTimeout(100);
  const home = (await page.locator("#battle-map").getAttribute("viewBox")).split(" ").map(Number);
  check(
    home[2] === 500 && Math.abs(home[0] + 250 - Math.max(250, cx)) < 2,
    "Home did not centre on own tokens: " + home,
  );
  passed.push(
    "A9 Arrival after zooming in is centred on Livia and Mira; Shift+Home fits the scene; Home zooms to 2 on own tokens",
  );

  // (8) End of session: story draft with attendance, duration, scenes; edit; turn off.
  await role("dm");
  await openDrawer();
  await button("Termina sessione…", drawer).click();
  const preview = await page.locator("#dialog .session-view-preview").innerText();
  check(
    /Presenze: Livia \(giocatore\).*DM: presente/.test(preview) &&
      /Durata:/.test(preview) &&
      /Scene: Il cortile dell’osservatorio.*Cripta/.test(preview),
    "End preview incomplete: " + preview,
  );
  await page.locator("#dialog input[name=message]").fill("Alla prossima settimana!");
  await button("Termina sessione", page.locator("#dialog")).click();
  await page.locator("#toast", { hasText: "Bozza del racconto nel Diario" }).waitFor();
  await openDrawer();
  await drawer.locator("[data-sv-status]", { hasText: "Conclusa" }).waitFor();
  await role("player");
  await page.locator(".session-view-wait h1", { hasText: "La sessione è terminata" }).waitFor();
  check((await content()).includes("Alla prossima settimana!"), "End message missing for players");
  await page.screenshot({ path: shots + "b14-11-player-ended.png" });
  // The draft is the DM's: the player's Journal does not list it.
  await button("Torna alla campagna").click();
  await page
    .locator(".campaign-sidebar")
    .getByRole("button", { name: "Diario", exact: true })
    .click();
  await page.waitForURL(/tab=journal/);
  check(
    !(await content()).includes("Racconto della sessione"),
    "Story draft visible in the player Journal",
  );
  await page.locator(".campaign-sidebar").getByRole("button", { name: "Entra al Tavolo" }).click();
  await page.locator(".session-view-wait").waitFor();
  await role("dm");
  await openDrawer();
  await button("Apri la bozza", drawer).click();
  await page.waitForURL(/#campaign\?tab=edit/);
  const title = await page.locator('#content [data-campaign-path="data.title"]').inputValue();
  const body = await page.locator('#content [data-campaign-path="data.body"]').inputValue();
  // Review fix P2: the evening is a played session in Campaign → Sessions, linked here.
  // Refreshed by the hand-off writer (29/09/2026): besides the evening, the example has its
  // own «Il sigillo della torre» on the coming Thursday (sample-clock.mjs).
  const campaignSessions = (await stored()).campaign.sessions.filter(
    (s) => s.id !== "session-sample-13",
  );
  const linked = await page.locator('#content [data-campaign-path="data.sessionId"]').inputValue();
  check(
    campaignSessions.length === 1 &&
      campaignSessions[0].played === true &&
      /^Sessione 1 · /.test(campaignSessions[0].title) &&
      linked === campaignSessions[0].id,
    "Story not linked to a played campaign session: " + JSON.stringify([linked, campaignSessions]),
  );
  check(
    title === "Racconto della sessione 1" &&
      /Presenze:/.test(body) &&
      /Durata:/.test(body) &&
      /Scene:/.test(body),
    "Story draft wrong: " + title + " / " + body,
  );
  await page
    .locator('#content [data-campaign-path="data.body"]')
    .fill(body + "Il gruppo ha trovato la chiave della cripta.");
  await button("Salva bozza e aggiorna anteprima").click();
  await page.locator("[data-campaign-status]", { hasText: "Bozza privata salvata" }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: shots + "b14-12-story-draft.png" });
  // Correction: reopen the ended session with a reason; ending again keeps the DM's edit.
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await openDrawer();
  await button("Riapri la sessione conclusa…", drawer).click();
  await page.locator("#dialog input[name=reason]").fill("Abbiamo giocato altri dieci minuti");
  await button("Riapri", page.locator("#dialog")).click();
  await drawer.locator("[data-sv-status]", { hasText: "In corso" }).waitFor();
  check(
    (await session()).sessions.at(-1).reopened[0].reason === "Abbiamo giocato altri dieci minuti",
    "Reopen reason not recorded",
  );
  await button("Termina sessione…", drawer).click();
  await button("Termina sessione", page.locator("#dialog")).click();
  await page.locator("#toast", { hasText: "non è stata sovrascritta" }).waitFor();
  // Turn the automatic story off in Preferences (campaign scope), then run a short session.
  await page.locator('.service-nav [data-service="preferences"]').click();
  await page
    .locator("#dialog")
    .getByLabel("Prepara una bozza di racconto a fine sessione")
    .uncheck();
  await button("Salva preferenze", page.locator("#dialog")).click();
  await page.locator("#battle-map").waitFor();
  await openDrawer();
  await button("Avvia sessione", drawer).click();
  await button("Termina sessione…", drawer).click();
  check(
    !(await page.locator("#dialog input[name=story]").isChecked()),
    "Story checkbox ignores the setting",
  );
  await button("Termina sessione", page.locator("#dialog")).click();
  const drafts = (await stored()).campaignContent.drafts.filter((d) =>
    /Racconto della sessione/.test(d.data.title),
  );
  check(
    drafts.length === 1 && /trovato la chiave/.test(drafts[0].data.body),
    "Disabled story still wrote a draft or lost the edit",
  );
  passed.push(
    'A10 End: preview with attendance/duration/scenes, player end message, draft absent from the player Journal, opened and edited by the DM, linked to the played "Sessione 1 · …" in Campaign → Sessions; reopen with reason and re-end keeps the edit; story turned off in Preferences → next end writes nothing',
  );
  await context.close();

  // ---------------------------------------------------------------- Group B: keep-alive
  const idleContext = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 900 } });
  const idlePage = await idleContext.newPage();
  watch(idlePage);
  await idlePage.clock.install();
  await idlePage.goto(base);
  await idlePage.evaluate((k) => localStorage.removeItem(k), key);
  await idlePage.reload();
  await idlePage.getByRole("combobox", { name: "Visita come" }).selectOption("dm");
  await idlePage.goto(base + "#table");
  await idlePage.locator("#battle-map").waitFor();
  await openTablePanel(idlePage, "session-view-controls");
  await idlePage.getByRole("button", { name: "Avvia sessione", exact: true }).click();
  await idlePage.clock.fastForward("55:05");
  await idlePage.clock.runFor(2000);
  await idlePage.locator("#dialog h2", { hasText: "Sei ancora al tavolo?" }).waitFor();
  await idlePage.clock.fastForward("05:05");
  await idlePage.clock.runFor(2000);
  await idlePage.locator("#dialog h2", { hasText: "Gioco in pausa per inattività" }).waitFor();
  const idleState = await idlePage.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)).ext["session-view"].pause,
    key,
  );
  check(idleState.active === true, "Keep-alive expiry did not pause the game");
  await idlePage.screenshot({ path: shots + "b14-13-keepalive-paused.png" });
  // Review fix P3: an offline player is told the truth, and the keep-alive re-arms after
  // the next input.
  await idlePage.keyboard.press("Escape");
  await sessionMenu(idlePage.locator(".session-view-hud"));
  await idlePage.locator('.session-view-hud [data-sv="resume"]').click();
  await idlePage.getByRole("combobox", { name: "Visita come" }).selectOption("player");
  await idlePage.locator('.service-nav [data-service="preferences"]').click();
  await idlePage.locator("#dialog [name=offline]").check();
  await idlePage.getByRole("button", { name: "Salva preferenze" }).click();
  await idlePage.mouse.click(5, 5);
  await idlePage.clock.fastForward("55:05");
  await idlePage.clock.runFor(2000);
  await idlePage.locator("#dialog h2", { hasText: "Sei ancora al tavolo?" }).waitFor();
  await idlePage.clock.fastForward("05:05");
  await idlePage.clock.runFor(2000);
  await idlePage
    .locator("#dialog h2", { hasText: "Sei senza rete: stato non aggiornato" })
    .waitFor();
  const offlinePresence = await idlePage.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)).ext["session-view"].presence.player,
    key,
  );
  check(!offlinePresence || offlinePresence.status === "here", "Offline player shown as away");
  await idlePage.keyboard.press("Escape");
  await idlePage.mouse.click(5, 5);
  await idlePage.clock.runFor(2000);
  await idlePage.clock.fastForward("55:05");
  await idlePage.clock.runFor(2000);
  await idlePage.locator("#dialog h2", { hasText: "Sei ancora al tavolo?" }).waitFor();
  passed.push(
    "B DDB keep-alive with the Playwright clock: warning after 55 min idle, automatic pause 5 min later; offline player: «Sei senza rete: stato non aggiornato», presence untouched, the next input re-arms the warning",
  );
  await idleContext.close();

  // ---------------------------------------------------------------- Group D: review fixes
  // IT 1440: split party played on its own scene (Roll20 pages), the DM runs a breakout at
  // the Table without re-homing anyone, view as with another area's shared drawing, focus
  // after HUD Pause/Resume, "Here" without the old away message.
  const fixContext = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 900 } });
  const fix = await fixContext.newPage();
  watch(fix);
  const fstored = () => fix.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const frole = (value) => fix.locator("#demo-role").selectOption(value);
  const fdrawer = fix.locator("#table-drawer");
  const fhud = fix.locator(".session-view-hud");
  const fopen = async () => {
    if (await fdrawer.locator(".session-view-controls").count()) return;
    await sessionMenu(fhud);
    await fhud.locator('[data-table-drawer="session-view-controls"]:not([data-sv])').click();
    await fdrawer.locator(".session-view-controls").waitFor();
  };
  await fix.goto(base);
  await fix.evaluate((k) => localStorage.removeItem(k), key);
  await fix.reload();
  await frole("dm");
  await fix.goto(base + "#table");
  await fix.locator("#battle-map").waitFor();
  await fopen();
  // W2a1: with the B35 tower seeded the one-scene shortcut is absent (see group A).
  if (await button("Crea un’altra scena in Preparazione", fdrawer).count())
    await button("Crea un’altra scena in Preparazione", fdrawer).click();
  else {
    await fix.locator('.table-topline [data-table="scenes"]').click();
    await fix.locator("#dialog [data-table-scene-prepare]").click();
  }
  await fix.locator(".prep-scene-row").first().waitFor();
  // P7 folders: the list no longer starts with the courtyard; copy the courtyard itself.
  const fixCourtyard = fix.locator(".prep-scene-row", {
    hasText: "Il cortile dell’osservatorio",
  });
  await fixCourtyard.locator("summary", { hasText: "Altre azioni" }).click();
  await fixCourtyard.getByRole("button", { name: "Duplica con oggetti e varianti…" }).click();
  await fix.locator("#dialog input[name=name]").fill("Cripta");
  await button("Crea copia", fix.locator("#dialog")).click();
  await fix.waitForFunction(
    (k) => JSON.parse(localStorage.getItem(k)).scenes.some((s) => s.name === "Cripta"),
    key,
  );
  const crypt = (await fstored()).scenes.find((s) => s.name === "Cripta").id;
  await fix.goto(base + "#table");
  await fix.locator("#battle-map").waitFor();
  await fopen();
  await fdrawer.locator('[data-sv-chip-actor="livia"]').click();
  await fdrawer.locator('[data-sv-chip-actor="mira"]').click();
  await fdrawer.locator(`[data-sv-move-here="${crypt}"]`).click();
  await fix.locator("[data-actor=livia]").waitFor({ state: "detached" });
  // The player plays the Crypt: own tokens by tap and by keyboard, sheet, party, notes.
  await frole("player");
  await fix.locator(".session-view-breakout").waitFor();
  const breakoutButtons = await fix
    .locator("#content button:visible")
    .evaluateAll((els) => els.map((el) => el.innerText.trim()));
  for (const name of ["Livia", "Mira", "Scheda e tiri: Livia", "Il gruppo e il tuo stato"])
    check(breakoutButtons.includes(name), "Breakout without " + name + ": " + breakoutButtons);
  const cryptToken = async () =>
    (await fstored()).scenes.find((s) => s.id === crypt).tokens.find((t) => t.actorId === "livia");
  const startToken = await cryptToken();
  await fix.locator('[data-sv-behalf-pick="livia"]').click();
  const fmap = fix.locator("[data-sv-behalf-map]");
  const fbox = await fmap.boundingBox();
  await fmap.click({ position: { x: fbox.width * 0.5, y: fbox.height * 0.5 } });
  await fix.locator(".session-view-behalf-status", { hasText: "Distanza" }).waitFor();
  await button("Conferma movimento", fix).click();
  await fix.waitForTimeout(150);
  const tapped = await cryptToken();
  check(
    tapped.x !== startToken.x &&
      (await fstored()).log.at(-1).label === "Livia: movimento nella scena separata",
    "Breakout tap move not applied: " + JSON.stringify([startToken, tapped]),
  );
  await fmap.focus();
  await fix.keyboard.press("ArrowRight");
  await fix.locator(".session-view-behalf-status", { hasText: "Distanza" }).waitFor();
  await fix.keyboard.press("Enter");
  await fix.waitForTimeout(150);
  check((await cryptToken()).x === tapped.x + 50, "Breakout keyboard move not applied");
  check(
    await fix.evaluate(() => document.activeElement?.hasAttribute("data-sv-behalf-map")),
    "Focus left the breakout map after Enter",
  );
  await fix.screenshot({ path: shots + "b14-18-player-breakout.png" });
  // The DM runs the Crypt at the Table: the party stays in the courtyard.
  await frole("dm");
  await fix.locator("#battle-map").waitFor();
  await fopen();
  await fdrawer.locator(`[data-sv-run-scene="${crypt}"]`).click();
  await fix.locator(".table-topline h1", { hasText: "Cripta" }).waitFor();
  await fopen();
  const mainRibbon = await fdrawer.locator('[data-sv-ribbon="old-watch"]').innerText();
  check(
    mainRibbon.includes("Scena del gruppo") &&
      mainRibbon.includes("Doran") &&
      !(await button("Riunisci il gruppo", fdrawer).isDisabled()),
    "Running the Crypt re-homed the party: " + mainRibbon,
  );
  await fhud
    .locator('[data-sv-chip="split"][data-sv-ribbon-scene="old-watch"]', { hasText: "Doran" })
    .filter({ hasText: "Il cortile dell’osservatorio" })
    .waitFor();
  await frole("player");
  await fix.locator(".table-topline h1", { hasText: "Cripta" }).waitFor();
  check((await fix.locator("#battle-map").count()) === 1, "Player not on the Crypt Table");
  await frole("dm");
  await fopen();
  await button("Riunisci il gruppo", fdrawer).click();
  await fix.locator(".table-topline h1", { hasText: "cortile" }).waitFor();
  const homeTokens = (await fstored()).scenes
    .find((s) => s.id === "old-watch")
    .tokens.map((t) => t.actorId);
  check(
    ["livia", "mira", "doran"].every((id) => homeTokens.includes(id)) &&
      (await fstored()).ext["session-view"].party === null,
    "Regroup did not bring everyone and the Table home",
  );
  passed.push(
    "D1 Roll20 split fixed: Livia+Mira on the Crypt get their own tokens (tap and ArrowRight+Enter moves logged), sheet and party; DM's «Guida al Tavolo» keeps Doran on the party ribbon with Regroup enabled and chip «Doran: Il cortile…»; player plays the Crypt Table; Regroup returns everyone and the Table",
  );
  // View as shows another area's shared drawing (annotations "Disegna").
  const suggestion = fix.getByRole("button", { name: "Ho capito" });
  if (await suggestion.count()) await suggestion.click();
  // B61: for the DM "Disegna" stands in the "Disegna e annota" group (with Spillo).
  if (!(await fix.locator('[data-tool="annotations-draw"]').isVisible()))
    await fix.locator('[data-tool-group="draw"]').click();
  await fix.locator('[data-tool="annotations-draw"]').click();
  const dbox = await fix.locator("#battle-map").boundingBox();
  await fix.mouse.move(dbox.x + dbox.width * 0.55, dbox.y + dbox.height * 0.3);
  await fix.mouse.down();
  for (let i = 1; i <= 10; i++)
    await fix.mouse.move(dbox.x + dbox.width * 0.55 + i * 8, dbox.y + dbox.height * 0.3 + i * 4);
  await fix.mouse.up();
  // B61: back to Move with the action bar's own Muovi (the toolbar shows the draw group).
  await fix.locator('.action-dock [data-tool="move"]').click();
  await frole("player");
  await fix.locator("#battle-map").waitFor();
  const playerMarks = await fix.locator("#battle-map .annotations-marks > *").count();
  await frole("dm");
  await fix.locator("#battle-map").waitFor();
  await fopen();
  await button("Vedi come Livia", fdrawer).click();
  await fix.locator(".session-view-banner").waitFor();
  const viewMarks = await fix.locator(".session-view-map .annotations-marks > *").count();
  check(
    playerMarks === 1 && viewMarks === playerMarks,
    "View as does not show the shared drawing: " + [playerMarks, viewMarks],
  );
  check(
    !(await fix
      .locator('.session-view-layer [tabindex="0"], .session-view-layer button:not([disabled])')
      .count()),
    "Projected area layers are focusable",
  );
  await fix.screenshot({ path: shots + "b14-19-view-as-drawing.png" });
  await button("Esci dalla vista", fix).click();
  await fix.locator("#battle-map").waitFor();
  // Keyboard focus stays on the HUD after Pause and Resume.
  await sessionMenu(fhud);
  await fhud.locator('[data-sv="pause"]').focus();
  await fix.keyboard.press("Enter");
  await fhud.locator('[data-sv="resume"]').waitFor();
  check(
    (await fix.evaluate(() => document.activeElement?.dataset?.sv)) === "resume",
    "Focus lost after Pause",
  );
  await fix.keyboard.press(" ");
  await fhud.locator('[data-sv="pause"]').waitFor();
  check(
    (await fix.evaluate(() => document.activeElement?.dataset?.sv)) === "pause",
    "Focus lost after Resume",
  );
  // "Here" does not keep the old away message.
  await frole("player");
  await fhud.locator('[data-sv="group"]').click();
  await fix.locator("#dialog input[name=status][value=away]").check();
  await fix.locator("#dialog input[name=message]").fill("torno subito");
  await button("Aggiorna il mio stato", fix.locator("#dialog")).click();
  await fhud.locator('[data-sv="group"]').click();
  await fix.locator("#dialog input[name=status][value=here]").check();
  check(
    (await fix.locator("#dialog input[name=message]").inputValue()) === "",
    "Choosing Here kept the away message",
  );
  await button("Aggiorna il mio stato", fix.locator("#dialog")).click();
  const presence = (await fstored()).ext["session-view"].presence.player;
  check(presence.status === "here" && presence.message === "", "Here stored a message");
  passed.push(
    "D2 View as shows the DM's shared annotations drawing like the player's Table (1 = 1), projected layers not focusable; HUD Pause/Resume by Enter/Space keep focus on the replacement; Here clears the away message",
  );
  await fixContext.close();

  // ---------------------------------------------------------------- Group C: EN 390 touch
  const phone = await rootPage
    .context()
    .browser()
    .newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
  const mobile = await phone.newPage();
  watch(mobile);
  const mstored = () => mobile.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const noOverflow = () =>
    mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  await mobile.goto(base);
  await mobile.evaluate((k) => localStorage.removeItem(k), key);
  await mobile.reload();
  await mobile.locator('.service-nav [data-service="preferences"]').tap();
  await mobile.locator("#dialog select[name=lang]").selectOption("en");
  await mobile.getByRole("button", { name: "Salva preferenze" }).tap();
  await mobile.getByRole("combobox", { name: "Visit as" }).selectOption("dm");
  await mobile.goto(base + "#table");
  await mobile.locator("#battle-map").waitFor();
  const mhud = mobile.locator(".session-view-hud");
  await sessionMenu(mhud);
  await mhud.locator('[data-table-drawer="session-view-controls"]:not([data-sv])').tap();
  await mobile.locator("#table-drawer .session-view-controls").waitFor();
  check(await noOverflow(), "DM session drawer overflows at 390");
  await mobile.getByRole("button", { name: "Start session", exact: true }).tap();
  await sessionMenu(mhud);
  await mhud.locator('[data-sv="pause"]').tap();
  await mhud.locator(".session-view-paused", { hasText: "Paused" }).waitFor();
  await mobile.screenshot({ path: shots + "b14-14-phone-dm-paused.png" });
  await mobile.getByRole("combobox", { name: "Visit as" }).selectOption("player");
  const mliv = mobile.locator("[data-actor=livia]");
  const mstart = await mliv.getAttribute("transform");
  await mliv.tap();
  await mobile.waitForTimeout(150);
  check((await mliv.getAttribute("transform")) === mstart, "Paused tap moved Livia");
  check(
    /paused/i.test(await mobile.locator("#toast").innerText()),
    "No English pause reason on touch",
  );
  await mhud.locator('[data-sv="group"]').tap();
  await mobile.locator("#dialog input[name=status][value=away]").tap();
  await mobile.locator("#dialog input[name=message]").fill("back soon");
  await mobile.getByRole("button", { name: "Update my status" }).tap();
  await mhud.locator('[data-sv-chip="away"]', { hasText: "Livia: away — back soon" }).waitFor();
  check(await noOverflow(), "Player Table overflows at 390");
  // Review fix P3: the HUD's chips only inform; a tap there reaches the map below.
  const passThrough = await mhud.locator(".session-view-chip").evaluateAll((chips) =>
    chips.map((chip) => {
      const r = chip.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return Boolean(hit?.closest("#battle-map") && !hit.closest(".session-view-hud-stack"));
    }),
  );
  check(passThrough.length && passThrough.every(Boolean), "HUD chips take the map's taps");
  await mobile.screenshot({ path: shots + "b14-15-phone-player-paused-away.png" });
  const targets = await mhud.locator("button").evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return Math.min(r.width, r.height);
    }),
  );
  check(
    targets.every((size) => size >= 39.5),
    "HUD targets below 40 px: " + targets,
  );
  await mobile.getByRole("combobox", { name: "Visit as" }).selectOption("dm");
  // Review fix P2: on the phone the HUD shows icons only; every button keeps its name and
  // Pause/Resume does not reuse the Session clock.
  const named = await mhud
    .locator(".session-view-hud-bar button")
    .evaluateAll((els) =>
      els.map((el) => [el.getAttribute("aria-label"), el.getAttribute("title")]),
    );
  // P10 TV-130/131 added Countdown and Progress clocks (and CA-66 the safety signals) to the
  // bar: every button, however many, keeps its name.
  check(
    named.length >= 7 && named.every(([label, title]) => label && title),
    "Phone HUD buttons without a name: " + JSON.stringify(named),
  );
  const glyph = (selector) => mhud.locator(`${selector} svg path`).first().getAttribute("d");
  check(
    (await glyph('[data-table-drawer="session-view-controls"]:not([data-sv])')) !==
      (await glyph('[data-sv="resume"]')),
    "Session and Resume share an icon",
  );
  await sessionMenu(mhud);
  await mhud.locator('[data-sv="resume"]').tap();
  await mhud.locator('[data-sv="hide"]').tap();
  await mobile.getByRole("combobox", { name: "Visit as" }).selectOption("player");
  await mobile
    .locator(".session-view-wait h1", { hasText: "The DM is preparing the scene" })
    .waitFor();
  check(await noOverflow(), "Waiting screen overflows at 390");
  await mobile.screenshot({ path: shots + "b14-16-phone-player-waiting.png", fullPage: true });
  await mobile.reload();
  await mobile.getByRole("combobox", { name: /Visita come|Visit as/ }).selectOption("dm");
  const reloaded = (await mstored()).ext["session-view"];
  check(
    reloaded.gate.hidden === true && reloaded.presence.player.message === "back soon",
    "Phone state not kept after reload",
  );
  await mobile.locator('.service-nav [data-service="preferences"]').tap();
  await mobile.locator("#dialog select[name=lang]").selectOption("en");
  await mobile.getByRole("button", { name: /Salva preferenze|Save preferences/ }).tap();
  await sessionMenu(mhud);
  await mobile.locator('.session-view-hud [data-sv="show"]').tap();
  // B61: the HUD button opens the sidebar's Session tab, which the DM may have left open.
  // B62: Session is a sub-tab of the Scene tab; the open panel names itself.
  if (
    (await mobile.locator("#table-sidebar-panel").getAttribute("data-table-panel")) !==
    "session-view-controls"
  ) {
    await sessionMenu(mhud);
    await mobile
      .locator('.session-view-hud [data-table-drawer="session-view-controls"]:not([data-sv])')
      .tap();
  }
  await mobile.getByRole("button", { name: "View as Livia" }).tap();
  await mobile
    .locator(".session-view-banner", { hasText: "You are viewing the Table as Livia" })
    .waitFor();
  check(await noOverflow(), "View-as overflows at 390");
  // Review fix P3: the projection keeps the core Table's touch size for tokens.
  const tokenSize = await mobile
    .locator('.session-view-map [data-sv-token="livia"] circle')
    .first()
    .evaluate((c) => c.getBoundingClientRect().width);
  check(tokenSize >= 40, "View-as tokens too small on the phone: " + tokenSize);
  await mobile.screenshot({ path: shots + "b14-17-phone-view-as.png", fullPage: true });
  await mobile.getByRole("button", { name: "Exit view" }).tap();
  await mobile.locator("#battle-map").waitFor();
  // Review fix P2: a long press on a countdown step subtracts (touch has no right click);
  // a tap still adds. Real CDP touch events, as a finger.
  if (!(await mobile.locator("#table-drawer .session-view-controls").count())) {
    await sessionMenu(mhud);
    await mhud.locator('[data-table-drawer="session-view-controls"]:not([data-sv])').tap();
  }
  const step = mobile.locator('#table-drawer [data-sv-timer-add="60000"]');
  await step.scrollIntoViewIfNeeded();
  await step.tap();
  await step.tap();
  await mobile.waitForTimeout(150);
  const remaining = async () => (await mstored()).ext["session-view"].timer.remainingMs;
  const beforePress = await remaining();
  const cdp = await phone.newCDPSession(mobile);
  const touch = async (ms) => {
    const b = await step.boundingBox();
    const point = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
    await mobile.waitForTimeout(ms);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await mobile.waitForTimeout(500);
  };
  await touch(900);
  const afterPress = await remaining();
  await touch(100);
  const afterTap = await remaining();
  check(
    afterPress === beforePress - 60000 && afterTap === afterPress + 60000,
    "Long press did not subtract / tap did not add: " + [beforePress, afterPress, afterTap],
  );
  const chipWidths = await mobile
    .locator("#table-drawer .session-view-ribbon-chip")
    .evaluateAll((chips) => chips.map((c) => c.getBoundingClientRect().width));
  check(
    chipWidths.length && chipWidths.every((w) => w >= 40),
    "Ribbon chips below 40 px: " + chipWidths,
  );
  passed.push(
    'C EN 390 touch: drawer without overflow, Start/Pause by tap, paused tap refused ("paused"), Away "back soon" chip lets taps through to the map, ≥40 px HUD targets each with a name and distinct Pause icon, waiting screen in English, reload keeps gate+presence, view as Livia with touch-size tokens and exit; countdown long press −1m then tap +1m (CDP touch); ribbon chips ≥40 px',
  );
  await phone.close();

  check(!errors.length, "Page errors: " + errors.join(" | "));
  return { passed, errors };
};
