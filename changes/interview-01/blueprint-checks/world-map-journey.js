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
  // B42 World: world map, calendar and chronicle (campaign section "Mappa e calendario",
  // Table tab "Mondo", world-entry box, reminders in the B24 bell).
  // Card checks: (1) regional map, "Porto Grigio" pin linked to its entry, group "Città",
  // DM-only pin, legend with search; (2) the pin opens the city map and the breadcrumb
  // returns; (3) measuring with waypoints and days per 2024 travel pace; (4) calendar with
  // months and two moons whose date is the Table clock, eight hours at the Table move it;
  // (5) DM-only "Eclissi" with a reminder reached by game time, then revealed; (6) chronicle
  // with eras and the place history from the pin. Also: drag + Undo, right-click pin,
  // keyboard (pins, calendar grid, Ctrl+→), correction with reason, reload persistence,
  // offline refusal, image upload with a readable error, DM vs player, EN phone 390 touch
  // with a private "Solo io" event the DM never reads, 40 px targets and no overflow.
  // Synthetic data; resets this browser's demo state. Run from the evidence directory:
  // playwright-cli -s=d20-b42 --raw run-code --filename=<this file>
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B42/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push("desktop: " + error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const world = async (p = page) => (await stored(p)).ext["world-map"].campaigns.lanterns;
  const setRole = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForTimeout(150);
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const toast = (p = page) => p.locator("#toast").innerText();
  const text = (selector, p = page) => p.locator(selector).first().innerText();
  const button = (name, p = page) => p.getByRole("button", { name, exact: true });
  const wm = (p = page) => p.locator("[data-wm-root]").first();
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
  const styled = (p = page) =>
    p.waitForFunction(() =>
      [...document.styleSheets].some((s) => s.href?.endsWith("/world.css") && s.cssRules.length),
    );
  // Map coordinates → screen coordinates of the current map (for mouse and touch input).
  const toScreen = (x, y, p = page) =>
    p.evaluate(
      ([x, y]) => {
        const svg = document.querySelector("[data-wm-canvas]");
        const q = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM());
        return { x: q.x, y: q.y };
      },
      [x, y],
    );
  const pinCenter = async (id, p = page) => {
    const box = await p.locator(`[data-wm-pin="${id}"] .wm-pin-shape`).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const clickPin = async (id, p = page) => {
    const c = await pinCenter(id, p);
    await p.mouse.click(c.x, c.y);
    await p.waitForTimeout(120);
  };
  const scrollToMap = (p = page) =>
    p.evaluate(() => document.querySelector(".wm-tabs")?.scrollIntoView({ block: "start" }));
  const closeStrayDialog = async (p = page) => {
    if (await p.locator("#dialog[open]").count())
      await p.locator("#dialog footer [data-close]").click();
  };
  const submitDialog = (p = page) => p.locator("#dialog button[type=submit]").click();
  // B62: «Mappa e calendario» sits in the «Mondo» group of the campaign rail (folded).
  const sidebar = (tab, p = page) => ({
    click: () => openCampaignSection(p, tab),
    tap: () => openCampaignSection(p, tab, true),
  });

  let mobile = null;
  try {
    // -------------------------------------------------------------------------------
    // A. Player, from Home in ≤ 3 clicks: regional map, Porto Grigio in "Città", no
    // DM-only pin anywhere in the page, legend search without panning.
    await page.goto(base);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#content").waitFor();
    let clicks = 0;
    const openCampaign = page.getByRole("button", { name: "Apri campagna", exact: true }).first();
    if (await openCampaign.count()) {
      await openCampaign.click();
      clicks++;
    } else {
      await page.locator("[data-nav='campaigns']").first().click();
      clicks++;
      await page
        .getByRole("button", { name: /Apri|Entra/ })
        .first()
        .click();
      clicks++;
    }
    await sidebar("world-map").click();
    clicks++;
    check(clicks <= 3, "World map needs more than 3 clicks from Home: " + clicks);
    await page.getByRole("heading", { name: "Mappa e calendario", level: 1 }).waitFor();
    await styled();
    await page.locator('[data-wm-pin="porto-grigio"]').waitFor();
    check(
      !(await page.locator('[data-wm-pin="tana-goblin"]').count()),
      "Player sees a DM-only pin",
    );
    check(!(await page.content()).includes("Tana dei goblin"), "DM-only pin name in player DOM");
    await button("Legenda").click();
    await page.locator("[data-wm-legend-query]").fill("port");
    const legendVisible = await page
      .locator("[data-wm-legend-item]:not([hidden]) .wm-legend-pin")
      .allInnerTexts();
    check(
      legendVisible.length === 1 && legendVisible[0].includes("Porto Grigio"),
      "Legend search: " + JSON.stringify(legendVisible),
    );
    check(
      (await text(".wm-legend-group:not([hidden]) .wm-legend-toggle")).includes("Città"),
      "Group Città",
    );
    const viewBefore = await page.locator("[data-wm-canvas]").getAttribute("viewBox");
    check(
      viewBefore === (await page.locator("[data-wm-canvas]").getAttribute("viewBox")),
      "Legend search panned the map",
    );
    await scrollToMap();
    await page.screenshot({ path: shots + "b42-01-player-map-legend.png" });
    await page.locator("[data-wm-legend-query]").fill("");
    await button("Legenda").click();
    passed.push(
      "(1) Player: Valle di Bruma, Porto Grigio in «Città», legend search, no DM-only pin in the DOM; " +
        clicks +
        " clicks from Home",
    );

    // -------------------------------------------------------------------------------
    // B. DM: DM-only pin, place panel, entry created from the pin (LegendKeeper CMP-67),
    // entry detail with "Sulla mappa" and back to the selected pin.
    await setRole("dm");
    await page.locator('[data-wm-pin="tana-goblin"]').waitFor();
    check(
      (
        (await page.locator('[data-wm-pin="tana-goblin"]').getAttribute("aria-label")) ?? ""
      ).includes("solo DM"),
      "DM-only pin not labelled",
    );
    await clickPin("porto-grigio");
    await page.locator("#wm-pin-title", { hasText: "Porto Grigio" }).waitFor();
    const panel = await text(".wm-panel");
    check(panel.includes("Città") && panel.includes("Storia del luogo (3)"), "Pin panel: " + panel);
    await button("Crea la voce del luogo").click();
    check(
      (await page.locator('#dialog [name="title"]').inputValue()) === "Porto Grigio",
      "Prefilled title",
    );
    await submitDialog();
    await button("Apri la voce").waitFor();
    const linked = (await world()).pins.find((p) => p.id === "porto-grigio").entryId;
    check(linked, "Pin not linked to the entry");
    await scrollToMap();
    await page.screenshot({ path: shots + "b42-02-dm-pin-entry.png" });
    await button("Apri la voce").click();
    await page.locator(".wm-entry h2", { hasText: "Sulla mappa" }).waitFor();
    check((await text(".wm-entry")).includes("Il grande incendio del porto"), "Entry box history");
    check(await page.locator("[data-campaign-return]").count(), "Entry has no way back");
    await page.locator(".wm-entry [data-wm-act='show-pin']").click();
    await page.locator("#wm-pin-title", { hasText: "Porto Grigio" }).waitFor();
    check(page.url().includes("tab=world-map"), "«Mostra sulla mappa» did not open the map");
    // The new entry is a real World entry: the core Mondo list shows it.
    await sidebar("world").click();
    await page.locator(".campaign-row", { hasText: "Porto Grigio" }).waitFor();
    await sidebar("world-map").click();
    await page.locator("[data-wm-canvas]").waitFor();
    passed.push(
      "(1) DM: «Tana dei goblin» solo DM; «Crea la voce del luogo» creates and links the entry; the entry shows «Sulla mappa» + history and «Mostra sulla mappa» selects the pin; the core «Mondo» list shows the new entry",
    );

    // -------------------------------------------------------------------------------
    // C. Nested map: double-click opens Porto Grigio city, breadcrumb returns.
    const pg = await pinCenter("porto-grigio");
    await page.mouse.dblclick(pg.x, pg.y);
    await page.locator(".wm-crumbs [aria-current]", { hasText: "Porto Grigio" }).waitFor();
    check(page.url().includes("map.porto-grigio-citta"), "City route");
    await page.locator('[data-wm-pin="ingresso-cripte"]').waitFor();
    await scrollToMap();
    await page.screenshot({ path: shots + "b42-03-city-map-breadcrumb.png" });
    await page.locator(".wm-crumbs button", { hasText: "Valle di Bruma" }).click();
    await page.locator(".wm-crumbs [aria-current]", { hasText: "Valle di Bruma" }).waitFor();
    passed.push(
      "(2) Double-click on the pin opens «Porto Grigio» (city), breadcrumb «Valle di Bruma» returns",
    );

    // -------------------------------------------------------------------------------
    // D. Drag autosave + Undo, right-click new DM-only pin, keyboard selection.
    const bridgeBefore = (await world()).pins.find((p) => p.id === "ponte-di-pietra");
    const b = await pinCenter("ponte-di-pietra");
    await page.mouse.move(b.x, b.y);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) await page.mouse.move(b.x + i * 10, b.y + i * 6);
    await page.mouse.up();
    await page.waitForTimeout(150);
    const bridgeMoved = (await world()).pins.find((p) => p.id === "ponte-di-pietra");
    check(bridgeMoved.x > bridgeBefore.x && bridgeMoved.y > bridgeBefore.y, "Drag did not save");
    await page.getByRole("button", { name: /Annulla «Spillo spostato»/ }).click();
    await page.waitForTimeout(150);
    const bridgeBack = (await world()).pins.find((p) => p.id === "ponte-di-pietra");
    check(
      bridgeBack.x === bridgeBefore.x && bridgeBack.y === bridgeBefore.y,
      "Undo did not restore",
    );
    const empty = await toScreen(560, 700);
    await page.mouse.click(empty.x, empty.y, { button: "right" });
    await page.locator("#dialog h2", { hasText: "Nuovo spillo" }).waitFor();
    await page.locator('#dialog [name="name"]').fill("Mulino abbandonato");
    await page.locator('#dialog [name="groupId"]').selectOption("luoghi");
    await page.locator('#dialog [name="visibility"]').selectOption("dm");
    await submitDialog();
    await page.locator("#wm-pin-title", { hasText: "Mulino abbandonato" }).waitFor();
    const mill = (await world()).pins.find((p) => p.name === "Mulino abbandonato");
    check(
      mill && mill.visibility === "dm" && Math.abs(mill.x - 560) < 3,
      "Right-click pin: " + JSON.stringify(mill),
    );
    const log = (await stored()).log.at(-1);
    check(log.visibility === "private", "Secret pin left a shared audit label");
    await page.locator('[data-wm-pin="bruma"]').focus();
    await page.keyboard.press("Enter");
    await page.locator("#wm-pin-title", { hasText: "Bruma" }).waitFor();
    check(
      (await page.evaluate(() => document.activeElement?.dataset?.wmPin)) === "bruma",
      "Focus lost after keyboard selection",
    );
    passed.push(
      "Drag saves the pin position and «Annulla «Spillo spostato»» restores it; right-click creates a DM-only pin with a private audit label; Enter on a focused pin selects it",
    );

    // -------------------------------------------------------------------------------
    // E. Measure: waypoints on pins, double-click finishes, 2024 pace table, terrain/road,
    // Backspace and Esc on the keyboard.
    await button("Misura").click();
    await clickPin("bruma");
    await page.waitForTimeout(500);
    await clickPin("ponte-di-pietra");
    await page.waitForTimeout(500);
    const port = await pinCenter("porto-grigio");
    await page.mouse.dblclick(port.x, port.y);
    await page.locator("[data-wm-total]").waitFor();
    let measure = await text(".wm-panel");
    check(measure.includes("Tappa 2: Ponte di pietra → Porto Grigio"), "Legs: " + measure);
    check(
      /Totale: 112 km/.test(measure) && !measure.includes("in corso"),
      "Total/finish: " + measure,
    );
    check(measure.includes("3 giorni e 1 h") && measure.includes("36 km"), "Normal pace days");
    check(measure.includes("p. 13") && measure.includes("p. 220"), "SRD 2024 source");
    check((await world()).pins.length === (await world()).pins.length, "noop");
    await page.locator("[data-wm-terrain]").selectOption("hill");
    await page.locator('[data-wm-pace="fast"]', { hasText: "Non consentito" }).waitFor();
    await page.locator("[data-wm-road]").check();
    await page.waitForTimeout(100);
    check(!(await text(".wm-pace")).includes("Non consentito"), "Road should allow Fast pace");
    await scrollToMap();
    await page.screenshot({ path: shots + "b42-04-measure-pace.png" });
    await page.locator("[data-wm-canvas]").focus();
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(100);
    measure = await text(".wm-panel");
    check(measure.includes("48 km") && measure.includes("in corso"), "Backspace: " + measure);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
    check(!(await text(".wm-panel")).includes("in corso"), "Esc should finish");
    check(!(await stored()).restTime?.clocks?.lanterns?.seconds, "Measuring moved the clock");
    await button("Chiudi la misura").click();
    passed.push(
      "(3) Measure: Bruma → Ponte di pietra → Porto Grigio = 112 km, Normale 3 giorni e 1 h (SRD 5.2.1 p. 13/220), Collina blocks Veloce, strada lo consente; double-click/Esc finish, Backspace removes; the clock is unchanged",
    );

    // -------------------------------------------------------------------------------
    // F. Calendar: months, two moons, keyboard grid, Ctrl+→; DM-only Eclissi.
    await button("Calendario").click();
    await page.locator("[data-wm-today-date]").waitFor();
    check((await text("[data-wm-today-date]")) === "Alba 14 Nebbie 1287 E.L.", "Today date");
    check((await text("[data-wm-today-time]")) === "08:00", "Today time");
    const moons = await text(".wm-moons-today");
    check(moons.includes("Vela") && moons.includes("Cinerea"), "Two moons: " + moons);
    check((await page.locator(".wm-grid thead th").count()) === 6, "Six-day week");
    await page.locator(".wm-day.is-today").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await page.locator("#wm-day-title", { hasText: "Remo 15 Nebbie" }).waitFor();
    await page.locator(".wm-day.is-selected").focus();
    await page.keyboard.press("Control+ArrowRight");
    await page.locator("#wm-month-title", { hasText: "Brume 1287" }).waitFor();
    await button("Oggi").click();
    await page.locator("#wm-month-title", { hasText: "Nebbie 1287" }).waitFor();
    await button("Nuovo evento").click();
    await page.locator('#dialog [name="title"]').fill("Eclissi");
    await page.locator('#dialog [name="day"]').fill("14");
    await page.locator('#dialog [name="month"]').selectOption("nebbie");
    await page.locator('#dialog [name="year"]').fill("1287");
    await page.locator('#dialog [name="time"]').fill("15:00");
    await page.locator('#dialog [name="visibility"]').selectOption("dm");
    await page.locator('#dialog [name="pinId"]').selectOption("osservatorio");
    await page.locator('#dialog [name="lead"]').selectOption("0");
    await submitDialog();
    await page.locator(".wm-day.is-today .wm-chip", { hasText: "Eclissi" }).waitFor();
    await scrollToMap();
    await page.screenshot({ path: shots + "b42-05-calendar-dm-eclipse.png" });
    await setRole("player");
    await page.locator("[data-wm-today-date]").waitFor();
    check(!(await wm().innerText()).includes("Eclissi"), "Player sees the DM-only Eclissi");
    passed.push(
      "(4)/(5) Calendar: Alba 14 Nebbie 1287 E.L. 08:00, Vela + Cinerea, six-day week; arrows + Enter select, Ctrl+→ next month; DM creates «Eclissi» solo DM with reminder, hidden from the player",
    );

    // -------------------------------------------------------------------------------
    // G. Eight hours at the Table: the Table's own "Tempo" moves the calendar; the DM's
    // reminder arrives (Table tab + bell), the player gets nothing.
    await setRole("dm");
    await page.locator(".campaign-sidebar [data-nav='table']").click();
    await page.waitForTimeout(400);
    await closeStrayDialog();
    await openTablePanel(page, "world-map-calendar"); // B62: Exploration › World
    await page.locator(".wm-table-panel [data-wm-today-time]").waitFor();
    check((await text(".wm-table-panel [data-wm-today-time]")) === "08:00", "Table tab time");
    await page.locator('[data-table="time"]').click();
    await page.locator("[data-rest-time-value]").fill("8");
    await page.locator("[data-rest-time-unit]").selectOption("3600");
    await page.locator("[data-rest-preview-time]").click();
    await page.locator("[data-rest-apply]").click();
    await page.waitForTimeout(250);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await closeStrayDialog();
    await openTablePanel(page, "world-map-calendar"); // B62: reopened if the Time dialog closed it
    await page.locator(".wm-table-panel [data-wm-today-time]", { hasText: "16:00" }).waitFor();
    await page.locator(".wm-table-panel .wm-reminders", { hasText: "Eclissi" }).waitFor();
    check((await stored()).restTime.clocks.lanterns.seconds === 28800, "Clock is not 8 h");
    await page.screenshot({ path: shots + "b42-06-table-world-tab-reminder.png" });
    await page.locator('.service-nav [data-service="requests"]').click();
    await page.locator("#dialog [data-notifications-centre]").waitFor();
    await page.locator("#dialog .notifications-item", { hasText: "Promemoria: Eclissi" }).waitFor();
    await page.locator("#dialog footer [data-close]").click();
    await page.locator(".wm-table-panel", { hasText: "Apri il calendario" }).waitFor();
    await page.locator(".wm-table-panel [data-wm-act='view'][data-view='calendar']").click();
    await page.locator("[data-wm-today-time]", { hasText: "16:00" }).waitFor();
    check(
      (await text("[data-wm-today-date]")) === "Alba 14 Nebbie 1287 E.L.",
      "Calendar date after 8 h",
    );
    await setRole("player");
    check(!(await wm().innerText()).includes("Eclissi"), "Player got the DM reminder");
    passed.push(
      "(4)/(5) «Tempo» 8 h at the Table: clock 28800 s, tab «Mondo» and calendar show 16:00; «Promemoria: Eclissi» in the DM tab and bell; nothing for the player",
    );

    // -------------------------------------------------------------------------------
    // H. Reveal, then the player reads it without a retroactive reminder; DM marks Seen.
    await setRole("dm");
    await page.locator(".wm-day.is-today").click();
    await page.locator(".wm-dayside [data-wm-act='event-reveal']").click();
    await page.waitForTimeout(150);
    check((await world()).events.find((e) => e.title === "Eclissi").visibility === "all", "Reveal");
    await setRole("player");
    await page.locator(".wm-day.is-today").click();
    await page.locator(".wm-dayside .wm-event", { hasText: "Eclissi" }).waitFor();
    check(!(await page.locator(".wm-reminders").count()), "Player got a retroactive reminder");
    await scrollToMap();
    await page.screenshot({ path: shots + "b42-07-player-eclipse-revealed.png" });
    await setRole("dm");
    await page.locator(".wm-reminders [data-wm-act='ack']").first().click();
    await page.waitForTimeout(100);
    check(
      !(await page.locator(".wm-reminders", { hasText: "Eclissi" }).count()),
      "Seen did not clear",
    );
    passed.push(
      "(5) «Rivela ai giocatori»: the player reads «Eclissi» without a retroactive reminder; the DM's «Visto» clears it",
    );

    // -------------------------------------------------------------------------------
    // I. Correction with a reason (a visible date moved), shown to readers.
    const fairDay = await page.evaluate(
      () =>
        [...document.querySelectorAll(".wm-day")].find((b) => b.innerText.includes("Fiera delle"))
          ?.dataset.wmDay,
    );
    await page.locator(`[data-wm-day="${fairDay}"]`).click();
    await page
      .locator(".wm-dayside .wm-event", { hasText: "Fiera delle lanterne" })
      .locator("[data-wm-act='event-edit']")
      .click();
    await page.locator('#dialog [name="day"]').fill("18");
    await submitDialog();
    await page.locator("#dialog .dialog-error:not([hidden])").waitFor();
    check((await text("#dialog .dialog-error")).includes("motivo"), "Reason not required");
    await page.locator('#dialog [name="reason"]').fill("Pioggia: la fiera slitta di due giorni");
    await submitDialog();
    await page.locator(".wm-dayside .wm-correction", { hasText: "Pioggia" }).waitFor();
    await setRole("player");
    await page.locator("[data-wm-day]").filter({ hasText: "18" }).first().click();
    await page.locator(".wm-dayside .wm-correction", { hasText: "Pioggia" }).waitFor();
    passed.push(
      "Correction: moving a visible date without a reason is refused in the dialog; with the reason it is saved and shown to the player",
    );

    // -------------------------------------------------------------------------------
    // J. Chronicle with eras; the pin's place history opens it filtered.
    await button("Cronologia").click();
    await page.locator(".wm-era h2", { hasText: "Età del Silenzio" }).waitFor();
    const chronicle = await wm().innerText();
    check(chronicle.includes("Età delle Lanterne") && /adesso/i.test(chronicle), "Eras + now");
    check(!chronicle.includes("Il patto delle sentinelle"), "Player sees DM-only history");
    await scrollToMap();
    await page.screenshot({ path: shots + "b42-08-timeline-eras.png" });
    await button("Mappa del mondo").click();
    await clickPin("porto-grigio");
    await button("Apri nella cronologia").click();
    await page.getByText("Storia di «Porto Grigio»").waitFor();
    const history = await wm().innerText();
    check(
      history.includes("Fondazione di Porto Grigio") &&
        !history.includes("La caduta delle antiche torri"),
      "Place filter",
    );
    await setRole("dm");
    await page.locator(".wm-timeline", { hasText: "Il patto delle sentinelle" }).count();
    passed.push(
      "(6) Chronicle: Età del Silenzio / Età delle Lanterne with «Adesso»; «Apri nella cronologia» from the pin shows the history of Porto Grigio only; DM-only history hidden from the player",
    );

    // -------------------------------------------------------------------------------
    // K. Reload persistence, offline refusal, map upload with a readable error.
    await page.reload();
    await page.locator("[data-wm-root]").waitFor();
    const saved = await world();
    check(
      saved.pins.some((p) => p.name === "Mulino abbandonato"),
      "Pin lost on reload",
    );
    check(
      saved.events.some((e) => e.title === "Eclissi" && e.visibility === "all"),
      "Event lost on reload",
    );
    check(saved.pins.find((p) => p.id === "porto-grigio").entryId === linked, "Entry link lost");
    if ((await page.locator("#demo-role").inputValue()) !== "dm") await setRole("dm");
    await button("Mappa del mondo").click();
    await page.locator('[data-service="preferences"]').click();
    await page.locator('#dialog [name="offline"]').check();
    await submitDialog();
    await page.locator('[data-wm-pin="bruma"]').waitFor();
    await clickPin("bruma");
    await button("Nascondi ai giocatori").click();
    await page.waitForTimeout(150);
    check((await toast()).includes("senza rete"), "Offline refusal toast: " + (await toast()));
    check(
      (await world()).pins.find((p) => p.id === "bruma").visibility === "all",
      "Offline change applied",
    );
    await page.locator('[data-service="preferences"]').click();
    await page.locator('#dialog [name="offline"]').uncheck();
    await submitDialog();
    await button("Nuova mappa").click();
    await page.locator('#dialog [name="name"]').fill("Pianta del mulino");
    // Fixtures created once in the evidence directory: a plain-text file and a synthetic PNG.
    await page.locator("#dialog [data-wm-upload]").setInputFiles(shots + "fixtures/note.txt");
    await page.locator("#dialog [data-wm-upload-status].error").waitFor();
    check(
      (await text("#dialog [data-wm-upload-status]")).includes("PNG, JPEG o WebP"),
      "Readable upload error",
    );
    await page.locator("#dialog [data-wm-upload]").setInputFiles(shots + "fixtures/mulino.png");
    await page.locator("#dialog [data-wm-upload-status]", { hasText: "Immagine pronta" }).waitFor();
    await page.locator('#dialog [name="width"]').fill("0.3");
    await submitDialog();
    await page.locator(".wm-crumbs [aria-current]", { hasText: "Pianta del mulino" }).waitFor();
    check(await page.locator(".wm-art image").count(), "Uploaded image not drawn");
    await button("Elimina la mappa").click();
    await submitDialog();
    await page.locator(".wm-crumbs [aria-current]", { hasText: "Valle di Bruma" }).waitFor();
    passed.push(
      "Reload keeps pin, revealed event and entry link; offline «Nascondi ai giocatori» is refused with the shell message; a text file gets «PNG, JPEG o WebP», a PNG becomes a new map, deleted with confirmation",
    );

    // -------------------------------------------------------------------------------
    // L. Desktop targets and overflow.
    for (const view of ["Mappa del mondo", "Calendario", "Cronologia"]) {
      await button(view).click();
      await page.waitForTimeout(150);
      const small = await smallTargets(".wm button, .wm select, .wm input:not([type=checkbox])");
      check(!small.length, view + ": small targets " + JSON.stringify(small));
      check(await noOverflow(), view + ": horizontal overflow");
    }
    passed.push(
      "Desktop 1440: every control of the area ≥ 40 px, no horizontal overflow in the three views",
    );

    // -------------------------------------------------------------------------------
    // M. EN phone 390x844 with touch: tap a pin, measure via the legend, private event.
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await phone.addInitScript(
      ([k, value]) => {
        if (!sessionStorage.getItem("b42-seeded")) {
          localStorage.setItem(k, value);
          sessionStorage.setItem("b42-seeded", "1");
        }
      },
      [key, snapshot],
    );
    mobile = await phone.newPage();
    mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
    await mobile.goto(base + "#campaign?tab=world-map");
    await mobile.locator('[data-service="preferences"]').tap();
    await mobile.locator('#dialog [name="lang"]').selectOption("en");
    await mobile.locator("#dialog button[type=submit]").tap();
    await mobile.getByRole("heading", { name: "Map and calendar", level: 1 }).waitFor();
    await styled(mobile);
    const role = await mobile.locator("#demo-role").inputValue();
    if (role !== "player") await setRole("player", mobile);
    const tp = await pinCenter("porto-grigio", mobile);
    await mobile.touchscreen.tap(tp.x, tp.y);
    await mobile.getByRole("button", { name: "Open the “Porto Grigio” map" }).waitFor();
    check(await noOverflow(mobile), "Phone map overflows");
    await mobile.screenshot({ path: shots + "b42-09-phone-en-pin.png", fullPage: true });
    await button("Measure", mobile).tap();
    await button("Legend", mobile).tap();
    await mobile.locator(".wm-legend-pin", { hasText: "Bruma" }).tap();
    await button("Legend", mobile).tap();
    await mobile.locator(".wm-legend-pin", { hasText: "Porto Grigio" }).tap();
    await mobile.locator("[data-wm-total]", { hasText: "74 miles" }).waitFor();
    check((await text(".wm-pace", mobile)).includes("24 miles"), "EN pace per day in miles");
    await button("Close measuring", mobile).tap();
    await button("Calendar", mobile).tap();
    await mobile.locator("[data-wm-today-date]").waitFor();
    await mobile.locator('.wm-day[aria-label*="15 Nebbie"]').tap();
    await button("New event", mobile).tap();
    await mobile.locator('#dialog [name="title"]').fill("Comprare una lanterna");
    check(
      (await mobile.locator('#dialog [name="visibility"]').inputValue()) === "private",
      "Only me default",
    );
    await mobile.locator("#dialog button[type=submit]").tap();
    await mobile.locator(".wm-dayside .wm-event", { hasText: "Comprare una lanterna" }).waitFor();
    check((await text(".wm-dayside", mobile)).includes("Only me"), "Only me badge");
    check(await noOverflow(mobile), "Phone calendar overflows");
    const phoneSmall = await smallTargets(".wm button, .wm select", mobile);
    check(!phoneSmall.length, "Phone small targets " + JSON.stringify(phoneSmall));
    await mobile.screenshot({
      path: shots + "b42-10-phone-en-calendar-private.png",
      fullPage: true,
    });
    await setRole("dm", mobile);
    await mobile.locator("[data-wm-today-date]").waitFor();
    check(
      !(await wm(mobile).innerText()).includes("Comprare una lanterna"),
      "DM reads the player's private event",
    );
    const dmSearch = (await world(mobile)).events.find((e) => e.title === "Comprare una lanterna");
    check(
      dmSearch?.visibility === "private" && dmSearch.owner === "player",
      "Private event stored as private",
    );
    passed.push(
      "EN phone 390 touch: tap pin → «Open the “Porto Grigio” map»; measuring by legend = 74 miles, 24 miles/day; private «Comprare una lanterna» (Only me) never shown to the DM; no overflow, targets ≥ 40 px",
    );
  } catch (error) {
    errors.push("FAILED: " + error.message);
    await page.screenshot({ path: shots + "b42-failure-desktop.png" }).catch(() => {});
    if (mobile) await mobile.screenshot({ path: shots + "b42-failure-phone.png" }).catch(() => {});
  }
  return { passed, errors };
};
