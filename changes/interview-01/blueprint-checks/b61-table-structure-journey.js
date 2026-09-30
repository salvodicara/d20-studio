async (rootPage) => {
  // B61 — where commands live at the Table and in the app header (24/09/2026).
  // Acceptance: no row of area buttons in the header or the Table's top line at 1440 and
  // 390; every area reachable in ≤ 2 clicks from its context (sidebar tab, toolbar group);
  // keyboard and touch; EN/IT; per-identity sidebar memory; bottom action bar with
  // resources; phone tab bar with Map always reachable; the first-visit tip does not
  // cover the map at 390; animated table dice let clicks through, the own check screen
  // stays modal. Synthetic data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B61/journey/";
  const browser = rootPage.context().browser();
  const passed = [];
  const errors = [];
  const measures = {};
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const open = async (options) => {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base);
    await page.evaluate(() => localStorage.clear());
    await page.goto(base + "#home");
    await page.locator("#content").waitFor();
    return { context, page };
  };
  const role = async (page, value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await page.waitForTimeout(150);
  };
  const toTable = async (page) => {
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.waitForTimeout(300);
  };
  const dismissTip = async (page, tap = false) => {
    const got = page.locator("[data-home-pop] [data-home-pop-action=got-it]");
    if (await got.count()) await (tap ? got.tap() : got.click());
  };
  // Every visible control of a region: size, rows, overlap-free, inside the viewport.
  const region = (page, selector) =>
    page.evaluate((sel) => {
      const root = document.querySelector(sel);
      if (!root) return null;
      const items = [...root.querySelectorAll("button, a, select, [role=tab]")]
        .filter((el) => el.checkVisibility() && el.getClientRects().length)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            name: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30),
            x: r.left,
            y: r.top,
            w: r.width,
            h: r.height,
          };
        });
      const box = root.getBoundingClientRect();
      return {
        height: Math.round(box.height),
        rows: items
          .map((i) => i.y + i.h / 2)
          .sort((a, b) => a - b)
          .filter((c, k, all) => k === 0 || c - all[k - 1] > 12).length,
        names: items.map((i) => i.name),
        small: items
          .filter((i) => i.w < 40 || i.h < 40)
          .map((i) => `${i.name} ${Math.round(i.w)}×${Math.round(i.h)}`),
        outside: items.filter((i) => i.x < -1 || i.x + i.w > innerWidth + 1).map((i) => i.name),
      };
    }, selector);
  const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const tabIds = (page) =>
    page
      .locator(".table-tabs [role=tab]")
      .evaluateAll((tabs) => tabs.map((t) => t.dataset.tableTab));
  const tab = (page, id) => page.locator(`.table-tabs [data-table-tab="${id}"]`);
  const openTab = async (page, id, tap = false) => {
    const t = tab(page, id);
    if ((await t.getAttribute("aria-expanded")) !== "true") await (tap ? t.tap() : t.click());
    await page.waitForFunction(
      (i) =>
        document
          .querySelector(`.table-tabs [data-table-tab="${i}"]`)
          ?.getAttribute("aria-selected") === "true",
      id,
    );
  };
  // B62: a panel is a sub-tab of its sidebar tab (Foundry's document tabs): open the tab that
  // holds it (its own, or the one named by its hidden handle), then its sub-tab.
  const openPanel = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const sub = () => page.locator(`.table-subtabs [data-table-subtab="${id}"]`);
    if (!(await sub().count())) {
      const own = await page.locator(`.table-tabs [data-table-tab="${id}"]`).count();
      const section = own
        ? id
        : await page
            .locator(`.table-panel-index [data-table-drawer="${id}"]`)
            .getAttribute("data-table-section-of");
      const t = tab(page, section);
      if ((await t.getAttribute("aria-expanded")) !== "true") await press(t);
      await page.waitForFunction(
        (sec) => document.querySelector("#table-sidebar-panel")?.dataset.tableSection === sec,
        section,
      );
    }
    if ((await sub().count()) && (await sub().getAttribute("aria-selected")) !== "true")
      await press(sub());
    await page.waitForFunction(
      (i) => document.querySelector("#table-sidebar-panel")?.dataset.tablePanel === i,
      id,
    );
  };
  const reachable = (page, id) =>
    page.evaluate((i) => {
      const chip = document.querySelector(`.map-toolbar [data-tool="${i}"]`);
      if (!chip) return false;
      if (chip.checkVisibility()) return 1;
      const group = chip.closest(".map-tool-cluster")?.querySelector("[data-tool-group]");
      return group?.checkVisibility() ? 2 : false;
    }, id);

  // ------------------------------------------------------------------ 1. desktop 1440, IT
  const desk = await open({ viewport: { width: 1440, height: 900 } });
  const page = desk.page;
  for (const who of ["player", "dm"]) {
    await role(page, who);
    await toTable(page);
    await dismissTip(page);
    const top = await region(page, ".table-topline");
    const header = await region(page, ".app-header");
    const expected = who === "dm" ? 4 : 1;
    check(
      !(await page
        .locator(".table-topline [data-table-drawer], .app-header [data-table-drawer]")
        .count()),
      `${who}: an area drawer button in the header or top line`,
    );
    check(
      (await page.locator(".table-topline .toolbar button").count()) === expected,
      `${who}: top line holds ${await page.locator(".table-topline .toolbar button").count()} commands`,
    );
    check(
      header.rows === 1 && top.rows <= 2,
      `${who} 1440 rows: header ${header.rows}, top ${top.rows}`,
    );
    check(
      !header.small.length && !top.small.length,
      `${who} small targets: ${header.small} ${top.small}`,
    );
    const layout = await page.evaluate(() => {
      const box = (s) => document.querySelector(s)?.getBoundingClientRect();
      const map = box("#battle-map");
      const tools = box(".map-toolbar");
      const stage = box(".map-container");
      const rail = box(".table-sidebar-rail");
      const panel = box(".table-sidebar-panel");
      return {
        mapTop: Math.round(map.top + scrollY),
        mapWidth: Math.round(map.width),
        toolsInside: tools.bottom <= stage.bottom - 40,
        toolbarButtons: [...document.querySelectorAll(".map-toolbar > *")].length,
        railRight: Math.round(rail.right),
        panelLeft: Math.round(panel.left),
        mapRight: Math.round(box(".table-stage").right),
      };
    });
    measures[`${who}-1440`] = { header: header.height, topline: top.height, ...layout };
    check(layout.toolsInside, `${who}: the map toolbar runs over the scale caption`);
    check(layout.toolbarButtons <= 7, `${who}: ${layout.toolbarButtons} toolbar groups`);
    check(
      Math.abs(layout.panelLeft - layout.mapRight) <= 2 && layout.railRight === 1440,
      `${who}: the sidebar is not beside the map at the right edge: ${JSON.stringify(layout)}`,
    );
    // Every map tool: visible (1 click) or behind its group button (2 clicks).
    const tools = await page
      .locator(".map-toolbar [data-tool]")
      .evaluateAll((els) => els.map((e) => e.dataset.tool));
    for (const id of tools) check(await reachable(page, id), `${who}: tool ${id} unreachable`);
    // Every sidebar tab opens its panel in one click, inside the column; B62: every panel of a
    // tab is one more click away as its sub-tab, also inside the column.
    const ids = await tabIds(page);
    check(ids[0] === "creature" && ids[1] === "chat", `${who}: first tabs ${ids.slice(0, 2)}`);
    const panelIds = [];
    const fits = async (id) => {
      const slot =
        id === "log"
          ? page.locator(".table-sidebar-panel .table-log")
          : id === "creature"
            ? page.locator(".table-sidebar-panel .table-inspector")
            : page.locator(`#table-drawer [data-ext-slot="table-panel:${id}"]`);
      await slot.waitFor();
      // Final regression (30/09/2026): since the final review F9 the sub-tab strip is one row
      // that scrolls sideways (D&D Beyond's filters), so its scroll width is not an overflow;
      // it must be a scroll container and show the open sub-tab whole instead.
      const { width, strip } = await page.evaluate(() => {
        const p = document.querySelector("#table-sidebar-panel");
        const row = p.querySelector(":scope > .table-subtabs");
        let strip = "";
        if (row) {
          const scrolls = ["auto", "scroll"].includes(getComputedStyle(row).overflowX);
          if (row.scrollWidth - row.clientWidth > 1 && !scrolls) strip = "strip does not scroll";
          const open = row.querySelector('[aria-selected="true"]');
          const s = row.getBoundingClientRect();
          const o = open?.getBoundingClientRect();
          if (o && (o.left < s.left - 1 || o.right > s.right + 1))
            strip = `open sub-tab ${Math.round(o.left)}–${Math.round(o.right)} outside the strip ${Math.round(s.left)}–${Math.round(s.right)}`;
        }
        const others = [...p.children].filter((c) => c !== row);
        return { width: Math.max(...others.map((c) => c.scrollWidth - c.clientWidth)), strip };
      });
      check(width <= 1, `${who}: panel ${id} overflows its column by ${width}px`);
      check(!strip, `${who}: panel ${id} sub-tabs: ${strip}`);
      panelIds.push(id);
    };
    for (const id of ids.slice(1)) {
      await openTab(page, id);
      const subs = await page
        .locator(".table-subtabs [data-table-subtab]")
        .evaluateAll((els) => els.map((e) => e.dataset.tableSubtab));
      if (!subs.length)
        await fits(await page.locator("#table-sidebar-panel").getAttribute("data-table-panel"));
      for (const sub of subs) {
        await openPanel(page, sub);
        await fits(sub);
      }
    }
    measures[`${who}-tabs`] = ids;
    measures[`${who}-panels`] = panelIds;
    if (who === "player")
      for (const dmOnly of ["encounter-builder", "compendium-screen", "session-view-controls"])
        check(!panelIds.includes(dmOnly), `player sees the DM panel ${dmOnly}`);
    else
      for (const id of [
        "encounter-builder",
        "compendium-screen",
        "session-view-controls",
        "loot",
        "handouts-panel",
        "random-tables",
        "annotations-list",
      ])
        check(panelIds.includes(id), `DM panel ${id} missing`);
    await page.screenshot({ path: dir + `table-${who}-1440.png` });
  }
  passed.push(
    `1440 IT: header one row, top line only core commands (DM 4, player 1), no area button above the map; map toolbar ≤ 7 groups inside the map; every tool reachable in ≤ 2 clicks; sidebar beside the map at the right edge; every tab (DM ${measures["dm-tabs"].length}, player ${measures["player-tabs"].length}) opens in one click and every panel (DM ${measures["dm-panels"].length}, player ${measures["player-panels"].length}) in two, without overflow; DM-only panels hidden from the player`,
  );

  // 2. Keyboard: tabs are a tablist (arrows move, Enter opens, focus kept).
  await openTab(page, "creature");
  await tab(page, "creature").focus();
  await page.keyboard.press("ArrowDown");
  check(
    await page.evaluate(() => document.activeElement?.dataset.tableTab === "chat"),
    "ArrowDown did not move to the Chat tab (B62: it holds the Log)",
  );
  await page.keyboard.press("End");
  const last = await page.evaluate(() => document.activeElement?.dataset.tableTab);
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    (i) =>
      document
        .querySelector(`.table-tabs [data-table-tab="${i}"]`)
        ?.getAttribute("aria-selected") === "true",
    last,
  );
  await page.keyboard.press("Home");
  check(
    await page.evaluate(() => document.activeElement?.dataset.tableTab === "creature"),
    "Home did not move to the Creature tab",
  );
  await page.keyboard.press("Enter");
  await page.locator(".table-sidebar-panel .table-inspector").waitFor();
  check(
    await page.evaluate(() => document.activeElement?.dataset.tableTab === "creature"),
    "Focus lost after opening a tab from the keyboard",
  );
  passed.push(
    `Keyboard: ArrowDown → Chat (with the Log), End → ${last}, Enter opens it, Home + Enter back to Creature with the focus kept`,
  );

  // 3. Per-identity memory (reload too), collapse, token click opens the Creature tab.
  await role(page, "player");
  await openTab(page, "creature");
  await role(page, "dm");
  // B62: Loot is a panel of the «Oggetti» tab.
  await openPanel(page, "loot");
  await role(page, "player");
  check(
    (await tab(page, "creature").getAttribute("aria-selected")) === "true",
    "The player inherited the DM's tab",
  );
  await openTab(page, "chat");
  await role(page, "dm");
  check((await tab(page, "items").getAttribute("aria-selected")) === "true", "DM tab not kept");
  await page.reload();
  await page.locator("#battle-map").waitFor();
  await role(page, "dm");
  check(
    (await tab(page, "items").getAttribute("aria-selected")) === "true" &&
      (await page.locator("#table-sidebar-panel").getAttribute("data-table-panel")) === "loot",
    "DM tab lost on reload",
  );
  const wide = async () =>
    page.evaluate(() =>
      Math.round(document.querySelector("#battle-map").getBoundingClientRect().width),
    );
  const before = await wide();
  await page.locator('[data-table-sidebar="toggle"]').click();
  check(!(await page.locator(".table-sidebar-panel").isVisible()), "Collapse left the panel");
  const after = await wide();
  check(after > before + 300, `Collapsed map not wider: ${before} → ${after}`);
  check(
    (await page.locator('[data-table-sidebar="toggle"]').getAttribute("aria-expanded")) === "false",
    "Collapse state not exposed",
  );
  // Selecting a creature keeps the open tab (Foundry): the Creature tab names it.
  await page.locator('[data-table-sidebar="toggle"]').click();
  await page.locator("#battle-map [data-actor=goblin-1]").click();
  await page.waitForFunction(() =>
    document
      .querySelector('.table-tabs [data-table-tab="creature"]')
      ?.getAttribute("aria-label")
      ?.includes("Sentinella"),
  );
  check(
    (await tab(page, "items").getAttribute("aria-selected")) === "true",
    "Selecting a token changed the open tab",
  );
  await openTab(page, "creature");
  await page
    .locator(".table-sidebar-panel .table-inspector h2", { hasText: "Sentinella" })
    .waitFor();
  passed.push(
    `Memory: DM Loot (Oggetti tab) kept across the player's Chat and a reload; collapse hides the panel (map ${before} → ${after} px) and expands again; selecting a token keeps the open tab and the Creature tab names it (Foundry)`,
  );

  // 4. Bottom action bar: resources and commands of the controlled creature.
  await page.locator("#battle-map [data-actor=livia]").click();
  const dock = await page.locator(".action-dock").innerText();
  for (const word of [
    "Azione",
    "Bonus",
    "Reazione",
    "Movimento",
    "Muovi",
    "Azioni della scheda",
    "Tira i dadi",
    "Annulla ultima modifica",
  ])
    check(dock.includes(word), "Action bar lacks " + word);
  // An action preview brings the Creature tab forward with its details.
  await openTab(page, "chat");
  await page.locator(".combat-bar button", { hasText: "Dardo di fuoco" }).click();
  await page.locator(".table-sidebar-panel #combat-detail").waitFor();
  check(
    (await tab(page, "creature").getAttribute("aria-selected")) === "true",
    "An action preview did not bring the Creature tab forward",
  );
  await page.keyboard.press("Escape");
  passed.push(
    "Bottom bar: Azione/Bonus/Reazione/Movimento, Muovi, Azioni della scheda, Tira i dadi, Annulla ultima modifica; an action preview opens the Creature tab with its details",
  );

  // 5. B56 (6a): table dice never hold a click; the own practice check stays modal.
  await page.locator('.action-dock [data-table="dice"]').click();
  // W2b1 integration: with B34 built «Tira i dadi» opens the Dadi tab (DDB-151) and B56's
  // «Prova i dadi» lives in its «Aspetto e prova» section; the old dialog is the fallback.
  await page.locator('[data-dtray-roll-button], #dialog select[name="mode"]').first().waitFor();
  const trayBuilt = (await page.locator("[data-dtray-roll-button]").count()) > 0;
  if (trayBuilt) {
    await page.locator('label.dtray-seg:has([data-dtray-mode][value="digital"])').click();
    await page.locator("[data-dtray-roll-button]").click();
  } else {
    await page.locator('#dialog select[name="mode"]').selectOption("digital");
    await page.locator("#dialog button[type=submit]").click();
  }
  const layer = page.locator("[data-dice3d-layer]");
  await layer.waitFor({ state: "visible" });
  check((await layer.getAttribute("data-layout")) === "tumble", "Free roll not on the table");
  check(
    (await layer.evaluate((el) => getComputedStyle(el).pointerEvents)) === "none",
    "Table dice take the pointer",
  );
  const box0 = await page.locator("#battle-map").getAttribute("viewBox");
  await page.locator('[data-table="zoom-in"]').click();
  check(
    (await page.locator("#battle-map").getAttribute("viewBox")) !== box0,
    "A click during the dice did not reach the zoom control",
  );
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.locator('[data-table="fit"]').click();
  if (trayBuilt) {
    await openPanel(page, "dice-tray");
    await page.locator('[data-dtray-section="look"]').click();
    await page.locator('[data-dtray-section="look"][aria-selected="true"]').waitFor();
  } else await openPanel(page, "dice-3d");
  await page.locator('[data-dice3d-preset="save"]').click();
  await page.locator("[data-dice3d-roll]").click();
  await page.locator('[data-dice3d-layer][data-layout="check"]').waitFor();
  check(
    (await page
      .locator('[data-dice3d-layer][data-layout="check"]')
      .evaluate((el) => getComputedStyle(el).pointerEvents)) === "auto",
    "The own check screen is not modal",
  );
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  passed.push(
    "Dice: a free roll tumbles with pointer-events none and the zoom click goes through; the own practice save with a DC shows the modal BG3 screen; Esc skips and closes",
  );
  await openTab(page, "creature");

  // 6. Header outside the Table and the App menu.
  await page.goto(base + "#home");
  const home = await region(page, ".app-header");
  measures["home-1440"] = { header: home.height, rows: home.rows };
  check(home.rows === 1 && !home.small.length, `Home header 1440: ${JSON.stringify(home)}`);
  await desk.context.close();

  // ------------------------------------------------------------------ 7. phone 390, touch
  const phone = await open({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const m = phone.page;
  // B62 (I-236): first-occurrence tips are off by default; 6b checks where the Table tip docks,
  // so each identity turns tips on first (Aiuto › Tour e suggerimenti).
  for (const who of ["player", "dm"]) {
    await role(m, who);
    await m.goto(base + "#home?tab=guides");
    const tips = m.locator("[data-home-tips-enabled]").first();
    await tips.waitFor();
    if (!(await tips.isChecked())) await tips.tap();
    await m.waitForFunction(() => document.querySelector("[data-home-tips-enabled]")?.checked);
  }
  for (const lang of ["it", "en"]) {
    if (lang === "en") {
      await m.locator('.service-nav [data-service="preferences"]').tap();
      await m.locator("#dialog select[name=lang]").selectOption("en");
      await m.locator("#dialog button[type=submit]").tap();
      await m.waitForFunction(() => document.documentElement.lang === "en");
    }
    await m.goto(base + "#home");
    await m.locator("#content").waitFor();
    const header = await region(m, ".app-header");
    const wordmark = await m.locator(".app-header .brand > span").isVisible();
    check(!wordmark, `${lang} 390: the wordmark is still shown`);
    check(
      header.rows <= 2 && !header.small.length,
      `${lang} 390 home header: ${JSON.stringify(header)}`,
    );
    check(
      await m.locator('.app-header .service-nav [data-service="home-help"]').isVisible(),
      "Help not reachable outside the Table",
    );
    measures[`home-${lang}-390`] = { header: header.height, rows: header.rows };
    for (const who of ["player", "dm"]) {
      await role(m, who);
      await toTable(m);
      const tip = m.locator('[data-home-pop="tip"][data-home-pop-id="table"]');
      if (lang === "it" && (await tip.count())) {
        // 6b: the first-visit tip is one docked row above the action bar, off the map.
        await tip.locator("h2").waitFor();
        await m.waitForTimeout(150);
        const g = await m.evaluate(() => {
          const r = (s) => document.querySelector(s).getBoundingClientRect();
          const tip = r("[data-home-pop]");
          const map = r("#battle-map");
          const dock = r("#content .action-dock");
          const over = Math.max(0, Math.min(tip.bottom, map.bottom) - Math.max(tip.top, map.top));
          return {
            tip: [Math.round(tip.top), Math.round(tip.bottom)],
            map: [Math.round(map.top), Math.round(map.bottom)],
            dock: [Math.round(dock.top), Math.round(dock.bottom)],
            over,
            compact: document.querySelector("[data-home-pop]").classList.contains("is-compact"),
          };
        });
        measures[`tip-${who}-390`] = g;
        // Above the action bar when there is room under the map; otherwise over the tab bar
        // below it: never over the map or the actions.
        check(
          g.compact && g.over === 0 && (g.tip[1] <= g.dock[0] + 1 || g.tip[0] >= g.dock[1] - 1),
          `${who} tip at 390: ${JSON.stringify(g)}`,
        );
        await m.screenshot({ path: dir + `tip-${who}-390.png` });
        await tip.locator("[data-home-pop-more]").tap();
        check(await tip.locator("#home-pop-body").isVisible(), "Read did not open the whole tip");
        await tip.locator("[data-home-pop-action=got-it]").tap();
        await tip.waitFor({ state: "detached" });
      } else await dismissTip(m, true);
      const header2 = await region(m, ".app-header");
      const top = await region(m, ".table-topline");
      const rail = await region(m, ".table-sidebar-rail");
      const dockR = await region(m, ".action-dock");
      const tools = await region(m, ".map-toolbar");
      const geo = await m.evaluate(() => {
        const r = (s) => document.querySelector(s).getBoundingClientRect();
        return {
          mapTop: Math.round(r("#battle-map").top + scrollY),
          railBottom: Math.round(r(".table-sidebar-rail").bottom),
          dockBottom: Math.round(r(".action-dock").bottom),
          railTop: Math.round(r(".table-sidebar-rail").top),
          inner: innerHeight,
        };
      });
      measures[`${who}-${lang}-390`] = {
        header: header2.height,
        headerRows: header2.rows,
        topline: top.height,
        toplineRows: top.rows,
        ...geo,
      };
      check(header2.rows === 1, `${who} ${lang} 390: Table header ${header2.rows} rows`);
      check(top.rows <= 2, `${who} ${lang} 390: top line ${top.rows} rows`);
      for (const [name, r] of Object.entries({ header: header2, top, rail, dock: dockR, tools }))
        check(!r.small.length, `${who} ${lang} 390 ${name} small: ${r.small}`);
      check(
        geo.railBottom === geo.inner && Math.abs(geo.dockBottom - geo.railTop) <= 1,
        `${who} ${lang} 390: tab bar not pinned under the action bar: ${JSON.stringify(geo)}`,
      );
      check((await overflow(m)) <= 0, `${who} ${lang} 390: horizontal overflow`);
      // B62: the Log is the first sub-tab of the «Chat» tab.
      if (lang === "en")
        check(
          (await tab(m, "chat").getAttribute("aria-label")) === "Chat" &&
            (await tab(m, "chat").boundingBox()).width >= 40,
          "EN Chat tab under 40 px",
        );
      // Every tab from the pinned bar; the panel follows the map; Map brings it back.
      for (const id of (await tabIds(m)).filter((i) => i !== "chat")) {
        await openTab(m, id, true);
        await m.locator("#table-sidebar-panel").waitFor();
        check((await overflow(m)) <= 0, `${who} ${lang} 390: tab ${id} overflows`);
      }
      await m.locator("[data-table-map-link]").tap();
      await m.waitForTimeout(400);
      const mapBox = await m.locator("#battle-map").boundingBox();
      check(mapBox.y >= -1 && mapBox.y < 200, `Map link did not bring the map back: ${mapBox.y}`);
      if (lang === "it") await m.screenshot({ path: dir + `table-${who}-390.png` });
      await openTab(m, "creature", true);
      // Help at the Table: in the App menu on a phone.
      if (who === "player" && lang === "it") {
        check(
          !(await m.locator('.table-header .service-nav [data-service="home-help"]').isVisible()),
          "Help still takes a header slot at 390",
        );
        await m.locator('.table-header [data-service="app-menu"]').tap();
        await m.locator('#dialog [data-jump-service="home-help"]').tap();
        await m.locator("#dialog").getByText("Aiuto per questa pagina").waitFor();
        await m.keyboard.press("Escape");
      }
    }
  }
  await phone.context.close();
  passed.push(
    "390 touch IT/EN: home header without wordmark ≤ 2 rows, Help in the header; Table header one row with Help in the App menu; top line ≤ 2 rows; tab bar pinned at the bottom under the action bar; every tab opens from it, Map brings the map back; EN Chat (with the Log) ≥ 40 px; no overflow; all targets ≥ 40 px; first-visit tip compact above the action bar, off the map, Read opens it",
  );

  check(!errors.length, "Page errors: " + errors.join(" | "));
  return { passed, errors, measures };
};
