async (rootPage) => {
  // B61 independent review (24/09/2026): findability audit of every wave-1 area entry point
  // from its natural context, DM and player, 1440 (mouse) and 390 (touch), plus the fixes:
  // "All panels" quick-jump in the Table rail (DDB-060), the open tab kept in view, the
  // phone action bar that wraps (End turn, Undo, Cancel never off-screen), the rail that
  // fits a 1366 × 768 laptop, and "All sections" in the campaign strip on a phone.
  // A target counts as seen only if no inner strip must scroll sideways (or a tab rail
  // vertically) to show it; page scrolling and panel content scrolling are allowed.
  // Synthetic data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B61-rf/journey/";
  const browser = rootPage.context().browser();
  const passed = [];
  const errors = [];
  const audit = [];
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
  const go = async (page, hash) => {
    await page.goto(base + "#" + hash);
    await page.locator("#content").waitFor();
    if (hash === "table") await page.locator("#battle-map").waitFor();
    await page.waitForTimeout(250);
    const got = page.locator("[data-home-pop] [data-home-pop-action=got-it]");
    if (await got.count()) await got.first().click();
  };
  // Seen without a hidden sideways strip: the page (and panel content, dialog bodies) may
  // scroll; a tab strip, campaign strip or rail must not have to.
  const seen = (page, selector) =>
    page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el || !el.checkVisibility()) return { ok: false, why: "not rendered" };
      const chain = [];
      for (let a = el.parentElement; a; a = a.parentElement) chain.push(a);
      const before = chain.map((a) => [a.scrollLeft, a.scrollTop]);
      const content = (a) =>
        a === document.documentElement ||
        a === document.body ||
        a.matches(".table-sidebar-panel, .table-sidebar-panel > *, .dialog-body, #dialog, main");
      // Final review F9 (D&D Beyond's filters on one row that scrolls sideways): the sub-tab
      // strip may scroll to show its tab; the rail and the other strips still must not.
      const strip = (a) => a.matches(".table-subtabs");
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      const hidden = [];
      chain.forEach((a, i) => {
        if (a.scrollLeft !== before[i][0] && !strip(a))
          hidden.push("x " + (a.className || a.tagName));
        if (a.scrollTop !== before[i][1] && !content(a))
          hidden.push("y " + (a.className || a.tagName));
        // The sub-tab strip stays where it scrolled, as a person leaves it (F9).
        if (!strip(a)) a.scrollLeft = before[i][0];
        if (!content(a)) a.scrollTop = before[i][1];
      });
      const r = el.getBoundingClientRect();
      if (r.left < -1 || r.right > innerWidth + 1) hidden.push("outside the screen");
      // Not covered by another layer (a sheet, a tip, the pinned bars).
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (top && !el.contains(top) && !top.contains(el))
        hidden.push("covered by " + (top.className || top.tagName));
      return { ok: !hidden.length, why: hidden.join(", ") };
    }, selector);
  // Presses a sequence of targets, each seen first; records the count per entry point.
  const reach = async (page, who, width, area, steps, done, touch = false) => {
    for (const step of steps) {
      const s = await seen(page, step);
      check(s.ok, `${who} ${width}: ${area}: «${step}» not seen (${s.why})`);
      const target = page.locator(step).first();
      await (touch ? target.tap() : target.click());
      await page.waitForTimeout(120);
    }
    if (done) await page.locator(done).first().waitFor({ timeout: 5000 });
    check(steps.length <= 2, `${who} ${width}: ${area} takes ${steps.length} clicks`);
    audit.push(`${who} ${width} ${area}: ${steps.length}`);
  };
  // A sidebar tab: pressed where it is seen (1), else from "All panels" (2). B62: a panel
  // is a sub-tab of its sidebar tab (Foundry's document tabs): its tab, then — when the tab
  // opens another of its panels — its sub-tab (2); or All panels then the panel (2).
  // Returns 1 when reached from the rail, 2 from All panels.
  const panelSection = async (page, id) => {
    if (await page.locator(`.table-tabs [data-table-tab="${id}"]`).count()) return id;
    if (await page.locator(`.table-subtabs [data-table-subtab="${id}"]`).count())
      return page.locator("#table-sidebar-panel").getAttribute("data-table-section");
    // The index handle: an area panel's drawer, or the core log's toggle (data-table="log").
    const handle = page.locator(
      `.table-panel-index [data-table-drawer="${id}"], .table-panel-index [data-table="${id}"]`,
    );
    return (await handle.count()) ? handle.first().getAttribute("data-table-section-of") : null;
  };
  const panelOpen = async (page, id) =>
    (await page.locator("#table-sidebar-panel").getAttribute("data-table-panel")) === id;
  const reachTab = async (page, who, width, area, id, touch = false) => {
    const section = await panelSection(page, id);
    check(section, `${who} ${width}: panel ${id} (${area}) missing`);
    if (
      id !== "creature" &&
      (await page.locator("#table-sidebar-panel").getAttribute("data-table-section")) === section
    ) {
      // Uncounted reset to the Creature tab (B62: the open section may have scrolled the
      // phone strip, so Creature is scrolled back into view as a person would).
      const creature = page.locator('.table-tabs [data-table-tab="creature"]').first();
      await (touch ? creature.tap() : creature.click());
      await page.waitForTimeout(120);
    }
    const tab = `.table-tabs [data-table-tab="${section}"]`;
    const steps = [];
    const press = async (sel) => {
      const s = await seen(page, sel);
      check(s.ok, `${who} ${width}: ${area}: «${sel}» not seen (${s.why})`);
      const target = page.locator(sel).first();
      await (touch ? target.tap() : target.click());
      await page.waitForTimeout(120);
      steps.push(sel);
    };
    const direct = (await seen(page, tab)).ok;
    if (direct) {
      await press(tab);
      if (!(await panelOpen(page, id))) await press(`.table-subtabs [data-table-subtab="${id}"]`);
    } else {
      await press("[data-table-panels]");
      await press(`#dialog [data-table-panel-jump="${id}"]`);
    }
    await page.waitForFunction(
      (i) => document.querySelector("#table-sidebar-panel")?.dataset.tablePanel === i,
      id,
      { timeout: 5000 },
    );
    check(steps.length <= 2, `${who} ${width}: ${area} takes ${steps.length} clicks`);
    audit.push(`${who} ${width} ${area}: ${steps.length}`);
    return direct ? 1 : 2;
  };
  // W2a1 integration: the wave's sidebar tabs (B32, B35, B42, B43, B45; B44 for the DM)
  // join the audit. Tabs a rail cannot show without scrolling are reached from All panels
  // (B61's rule, ≤ 2) and listed in `railOverflow` of the result (an open density issue).
  const railOverflow = [];
  const tabsFor = {
    dm: {
      log: "B17 chat",
      "combat-tracker": "B32 combat tracker",
      "encounter-builder": "B19 encounter builder",
      "handouts-panel": "B15 handouts",
      "quests-tracker": "B43 quests",
      "random-tables": "B25 random tables and decks",
      loot: "B26 loot",
      "loot-shop": "B26 merchants",
      "compendium-screen": "B16 compendium (DM screen)",
      party: "B44 party overview",
      "session-view-controls": "B14 session view",
      "world-map-calendar": "B42 world",
      travel: "B45 travel and camp",
      "annotations-list": "B18 annotations",
      "fog-vision-panel": "B35 vision",
      // W2b1/W2b2 integration: B34's Dice tab absorbs B56's demo (its «Aspetto e prova»
      // section); B40 adds the DM's movement rules, B47 the scene panel.
      "dice-tray": "B34 dice tray (absorbs B56)",
      "media-dock": "B28 media",
      safety: "B27 safety",
      "special-moves-rules": "B40 movement rules",
      "scene-assets-panel": "B47 scene",
      // Refreshed by R3 (27/09/2026): P6 TV-21 put the DM's bestiary at the Table (Scene tab).
      "token-menu-creatures": "P6 add creatures",
      // Final review X-07 (Foundry's compendium in the sidebar): «Consultazione › Compendio».
      "compendium-browse": "X-07 compendium browser",
    },
    player: {
      log: "B17 chat",
      "combat-tracker": "B32 combat tracker",
      "quests-tracker": "B43 quests",
      "world-map-calendar": "B42 world",
      travel: "B45 travel and camp",
      "fog-vision-panel": "B35 vision",
      "handouts-panel": "B15 handouts",
      "random-tables": "B25 random tables and decks",
      "annotations-list": "B18 annotations",
      "dice-tray": "B34 dice tray (absorbs B56)",
      "media-dock": "B28 media",
      safety: "B27 safety",
      "scene-assets-panel": "B47 scene",
      "compendium-browse": "X-07 compendium browser",
    },
  };
  const services = [
    ["search", "B23 command palette", "#dialog"],
    ["notes", "core personal notes", null],
    ["requests", "B24 notifications", "#dialog"],
    ["preferences", "B22 preferences", "#dialog"],
    ["account", "B29 account", null],
    ["home-help", "B30 help", "#dialog"],
  ];
  const closeAll = async (page) => {
    for (let i = 0; i < 3 && (await page.locator("#dialog[open]").count()); i++)
      await page.keyboard.press("Escape");
  };
  const campaign = (id) => `.campaign-sidebar nav [data-campaign-tab="${id}"]`;
  // From the campaign page: the section seen (1) or "All sections" then it (2).
  const reachSection = async (page, who, width, area, id, touch = false) => {
    const direct = (await seen(page, campaign(id))).ok;
    await reach(
      page,
      who,
      width,
      area,
      direct ? [campaign(id)] : ["[data-campaign-sections]", `#dialog [data-campaign-tab="${id}"]`],
      `${campaign(id)}.active`,
      touch,
    );
  };

  // ------------------------------------------------------------------ 1. desktop 1440, IT
  const desk = await open({ viewport: { width: 1440, height: 900 } });
  const page = desk.page;
  for (const who of ["player", "dm"]) {
    await role(page, who);
    await go(page, "table");
    // Table header and top line: no area button rows.
    check(
      !(await page
        .locator(".app-header [data-table-drawer], .table-topline [data-table-drawer]")
        .count()),
      `${who}: an area button in the header or top line`,
    );
    for (const [id, area, done] of services) {
      await go(page, "table");
      await reach(page, who, 1440, area, [`.app-header [data-service="${id}"]`], done);
      await closeAll(page);
    }
    await go(page, "table");
    // Measured on the fresh rail (Creature open, strip at its start), before any tab
    // scrolls it; each tab is then reached in ≤ 2 (seen: 1, else All panels: 2).
    for (const [id, area] of Object.entries(tabsFor[who]))
      if (!(await seen(page, `.table-tabs [data-table-tab="${await panelSection(page, id)}"]`)).ok)
        railOverflow.push(`${who} 1440×900: ${area}`);
    for (const [id, area] of Object.entries(tabsFor[who]))
      await reachTab(page, who, 1440, area, id);
    // B62: the panels are grouped in nine (DM) and eight (player) sidebar tabs (final review
    // X-07 adds the player's «Consultazione», the compendium browser).
    check(
      (await page.locator(".table-tabs [role=tab]").count()) === (who === "dm" ? 9 : 8),
      `${who}: unexpected tabs`,
    );
    // Map tools: the chip seen, or its group then the chip.
    for (const [tool, area] of [
      ["annotations-draw", "B18 draw"],
      ["annotations-template", "B18 template"],
      ["token-menu-select", "B12 select several tokens"],
      ["pointer", "B18 ping"],
      // W2b1/W2b2 integration: B40's two-tier ruler, B46's line of sight, B41's regions (DM).
      ["special-moves-ruler", "B40 two-tier ruler"],
      ["knowledge-los", "B46 line of sight"],
      ...(who === "dm"
        ? [
            ["handouts-pin", "B15 pin"],
            ["random-tables-place", "B25 multi-sided token"],
            ["regions", "B41 regions and traps"],
          ]
        : []),
    ]) {
      const chip = `.map-toolbar [data-tool="${tool}"]`;
      const group = await page.evaluate(
        (s) =>
          document
            .querySelector(s)
            ?.closest(".map-tool-cluster")
            ?.querySelector("[data-tool-group]")?.dataset.toolGroup ?? null,
        chip,
      );
      const visible = await page.locator(chip).isVisible();
      await reach(
        page,
        who,
        1440,
        area,
        visible ? [chip] : [`[data-tool-group="${group}"]`, chip],
        `${chip}[aria-pressed="true"]`,
      );
      // Refreshed by R3 (27/09/2026): the multi-sided token tool opens its table picker at
      // once (P4 PR-62); the picker is where the content went, then Escape closes it before
      // the next tool.
      if (tool === "random-tables-place") {
        await page.locator("#dialog[open]").waitFor({ timeout: 5000 });
        audit.push(`${who} 1440 B25 multi-sided token: its table picker opens with the tool`);
      }
      for (let i = 0; i < 3 && (await page.locator("#dialog[open]").count()); i++) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(100);
      }
    }
    await page
      .locator('.map-toolbar [data-tool="move"]')
      .click({ force: true })
      .catch(() => {});
    await go(page, "table");
    // B12 token menu: right-click on the own token; also from the Creature tab.
    await page.locator("#battle-map [data-actor=livia]").click({ button: "right" });
    await page.locator(".token-menu").first().waitFor();
    audit.push(`${who} 1440 B12 token menu: 1 (right-click)`);
    await page.keyboard.press("Escape");
    await reachTab(page, who, 1440, "Creature tab", "creature");
    const creatureMenu = await page
      .locator(".table-sidebar-panel button", { hasText: "Menu di Livia" })
      .count();
    check(creatureMenu, `${who}: no token menu button in the Creature tab`);
    // B26 for the player at the Table: coins and stash from the Creature tab.
    if (who === "player")
      check(
        await page.locator(".table-sidebar-panel button", { hasText: "Monete e scorta" }).count(),
        "player: no coins and stash in the Creature tab",
      );
    // B14: the DM's session button on the map opens its tab; the player sees presence.
    // Visual pass 2 (30/09/2026): the button is the first row of the map's «Sessione» menu
    // (Owlbear keeps one row of controls): two presses, within this check's limit of two.
    if (who === "dm")
      await reach(
        page,
        who,
        1440,
        "B14 session HUD",
        [
          ".map-container [data-session-menu]",
          '.map-container [data-table-drawer="session-view-controls"]',
        ],
        '#table-sidebar-panel[data-table-panel="session-view-controls"]',
      );
    else
      check(await page.locator(".map-container button", { hasText: "Gruppo" }).count(), "presence");
    await page.screenshot({ path: dir + `table-${who}-1440.png` });

    // Outside the Table, from Home.
    const fromHome = async (area, steps, done) => {
      await go(page, "home");
      await reach(page, who, 1440, area, steps, done);
      await closeAll(page);
    };
    await fromHome("B21 character library", ['.app-header nav [data-nav="characters"]'], null);
    await fromHome("B30 home", [".app-header .brand"], null);
    await fromHome("B59 community", ['#content [data-community-tab="find"]'], null);
    await fromHome(
      "B13 invitation link",
      ['.app-header nav [data-nav="campaigns"]', '#content [data-cm="paste-link"]'],
      "#dialog[open]",
    );
    await fromHome(
      "B16 compendium",
      ['.app-header nav [data-nav="library"]', '#content [data-library-scope="compendium"]'],
      null,
    );
    await fromHome(
      "B28 library files",
      ['.app-header nav [data-nav="library"]', '#content [data-library-scope="media"]'],
      null,
    );
    for (const [id, area] of [
      ["campaign-members", "B13 members"],
      ["handouts", "B15 materials"],
      ["chat-archive", "B17 chat archive"],
      ["media", "B28 attachments"],
      ["loot", "B26 treasure"],
      ["safety", "B27 safety"],
      ["assistant", "B60 assistant"],
      ...(who === "dm"
        ? [
            ["settings", "B20 campaign settings"],
            ["community", "B59 recruiting"],
          ]
        : []),
    ]) {
      await go(page, "home");
      // B62: the campaign rail folds its sections in Kanka-style groups (5–7 visible first).
      // From Home: enter the campaign, then the section where the rail shows it (1), else its
      // group heading and the section (2) — one click more than B61's flat rail for a
      // section of a folded group, still ≤ 2 inside the rail.
      await page.locator('#content [data-nav="campaign"]').first().click();
      await page.locator(".campaign-sidebar nav").waitFor();
      await page.waitForTimeout(150);
      const toggle = `.campaign-sidebar [data-campaign-group]:has([data-campaign-tab="${id}"]) [data-campaign-group-toggle]`;
      const folded = (await page.locator(toggle).getAttribute("aria-expanded")) === "false";
      await reach(
        page,
        who,
        1440,
        area + " (campaign)",
        folded ? [toggle, campaign(id)] : [campaign(id)],
        `${campaign(id)}.active`,
      );
      audit.push(`${who} 1440 ${area} (campaign) from Home: ${folded ? 3 : 2}`);
    }
    // B23 by keyboard as well.
    await go(page, "home");
    await page.keyboard.press("Control+k");
    await page.locator("#dialog[open]").waitFor();
    await closeAll(page);
  }
  passed.push(
    `1440 IT, player and DM: every header service in 1 click; every sidebar panel (DM ${Object.keys(tabsFor.dm).length - 1} area panels + Log, player ${Object.keys(tabsFor.player).length - 1}; B62: in 9 / 8 tabs) in ≤ 2 clicks from its tab where the rail shows it, else 2 from All panels (${railOverflow.length} beyond the rail: ${railOverflow.join(", ") || "none"}); every area map tool in ≤ 2 (group, tool); token menu by right-click and from the Creature tab; B14 HUD; from Home: Characters, Home, community, invitations, compendium, library files, campaign sections (members, materials, chat archive, attachments, treasure, safety, assistant; DM settings and recruiting) in ≤ 2 inside the campaign rail (B62: + 1 from Home for a folded group); Ctrl+K opens the palette`,
  );

  // 2. Keyboard and EN: All panels opens the list; Enter on an entry opens that tab and
  // the focus lands on it; labels in English.
  await role(page, "dm");
  await go(page, "table");
  await page.locator("[data-table-panels]").focus();
  await page.keyboard.press("Enter");
  await page.locator("#dialog [data-table-panel-jump]").first().waitFor();
  const entries = await page.locator("#dialog [data-table-panel-jump]").count();
  check(entries === Object.keys(tabsFor.dm).length + 1, `All panels lists ${entries}`);
  await page.locator('#dialog [data-table-panel-jump="safety"]').focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () =>
      document.activeElement?.dataset?.tableTab === "safety" &&
      !document.querySelector("#dialog").open,
  );
  // Choosing the open tab again keeps it open (the list never toggles it closed).
  await page.locator("[data-table-panels]").click();
  await page.locator('#dialog [data-table-panel-jump="safety"][aria-current="true"]').click();
  // B62: Safety is a sub-tab of the Chat tab.
  check(
    (await page
      .locator('.table-subtabs [data-table-subtab="safety"]')
      .getAttribute("aria-selected")) === "true",
    "Choosing the open tab closed it",
  );
  await page.locator('.app-header [data-service="preferences"]').click();
  await page.locator("#dialog select[name=lang]").selectOption("en");
  await page.locator("#dialog button[type=submit]").click();
  await page.waitForFunction(() => document.documentElement.lang === "en");
  check(
    (await page.locator("[data-table-panels]").getAttribute("aria-label")) === "All panels",
    "EN All panels label",
  );
  await page.locator("[data-table-panels]").click();
  check(
    (await page.locator("#dialog #dialog-title").innerText()) === "Table panels",
    "EN list title",
  );
  await closeAll(page);
  await page.locator('.app-header [data-service="preferences"]').click();
  await page.locator("#dialog select[name=lang]").selectOption("it");
  await page.locator("#dialog button[type=submit]").click();
  await page.waitForFunction(() => document.documentElement.lang === "it");
  passed.push(
    "Keyboard: All panels by Enter, an entry by Enter opens its tab with the focus on it; choosing the open tab keeps it open; EN «All panels» / «Table panels»",
  );
  await desk.context.close();

  // 3. Laptop 1366 × 768: the DM's wave-1 rail (fourteen tabs) fit (Safety was clipped).
  // W2a1 integration: with the wave's tabs the rail no longer fits; the ones beyond it are
  // recorded in `railOverflow` and each must be listed in All panels.
  const laptop = await open({ viewport: { width: 1366, height: 768 } });
  await role(laptop.page, "dm");
  await go(laptop.page, "table");
  const laptopSeen = [];
  // B62: every panel's tab (its sidebar section) is seen in the 1366 × 768 rail.
  for (const id of ["creature", ...Object.keys(tabsFor.dm)]) {
    const section = await panelSection(laptop.page, id);
    const s = await seen(laptop.page, `.table-tabs [data-table-tab="${section}"]`);
    if (s.ok) laptopSeen.push(id);
    else railOverflow.push(`dm 1366×768: ${tabsFor.dm[id] ?? id} (${s.why})`);
  }
  check(laptopSeen.includes("creature") && laptopSeen.includes("log"), "1366×768: rail start");
  check(
    laptopSeen.length === Object.keys(tabsFor.dm).length + 1,
    "1366×768: panels whose tab is beyond the rail: " + railOverflow.join(", "),
  );
  await laptop.page.locator("[data-table-panels]").click();
  for (const id of Object.keys(tabsFor.dm))
    check(
      await laptop.page.locator(`#dialog [data-table-panel-jump="${id}"]`).count(),
      `1366×768: ${id} not in All panels`,
    );
  await closeAll(laptop.page);
  await laptop.page.screenshot({ path: dir + "table-dm-1366x768.png" });
  await laptop.context.close();
  passed.push(
    `1366 × 768 DM: the tabs of all ${laptopSeen.length} of ${Object.keys(tabsFor.dm).length + 1} panels seen in the rail without scrolling it; every panel listed in All panels`,
  );

  // ------------------------------------------------------------------ 4. phone 390, touch
  const phone = await open({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const m = phone.page;
  const counts = {};
  for (const who of ["player", "dm"]) {
    await role(m, who);
    await go(m, "table");
    for (const [id, area, done] of services.filter(([id]) => id !== "home-help")) {
      await go(m, "table");
      await reach(m, who, 390, area, [`.app-header [data-service="${id}"]`], done, true);
      await closeAll(m);
    }
    await go(m, "table");
    await reach(
      m,
      who,
      390,
      "B30 help",
      ['.table-header [data-service="app-menu"]', '#dialog [data-jump-service="home-help"]'],
      "#dialog[open]",
      true,
    );
    await closeAll(m);
    await go(m, "table");
    counts[who] = { direct: 0, list: 0 };
    for (const [id, area] of Object.entries(tabsFor[who])) {
      const n = await reachTab(m, who, 390, area, id, true);
      counts[who][n === 1 ? "direct" : "list"]++;
      // B17 on a phone: the log is a full-screen sheet over the bars; its close is seen.
      if (id === "log") {
        const s = await seen(m, "[data-chat-close]");
        check(s.ok, `${who} 390: the log sheet has no close in view (${s.why})`);
        await m.locator("[data-chat-close]").tap();
        await m.waitForTimeout(150);
        continue;
      }
      // The open tab is in view in the strip; Map and All panels stay pinned.
      for (const sel of [
        `.table-tabs [data-table-tab="${await m.locator("#table-sidebar-panel").getAttribute("data-table-section")}"]`,
        "[data-table-map-link]",
        "[data-table-panels]",
      ]) {
        const s = await seen(m, sel);
        check(s.ok, `${who} 390 after ${id}: ${sel} not seen (${s.why})`);
      }
    }
    // The action bar out of combat: every command on screen.
    for (const sel of [
      '.action-dock [data-tool="move"]',
      '.action-dock [data-table="actions"]',
      '.action-dock [data-table="dice"]',
      '.action-dock [data-table="cancel"]',
      '.action-dock [data-table="undo"]',
    ]) {
      const s = await seen(m, sel);
      check(s.ok, `${who} 390: ${sel} off-screen (${s.why})`);
    }
    // B12 on touch: long press on the own token.
    await reachTab(m, who, 390, "Creature tab", "creature", true);
    await m.locator("[data-table-map-link]").tap();
    const box = await m.locator("#battle-map [data-actor=livia]").boundingBox();
    const cdp = await m.context().newCDPSession(m);
    const at = [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at });
    await m.waitForTimeout(800);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await m.locator(".token-menu").first().waitFor();
    audit.push(`${who} 390 B12 token menu: 1 (long press)`);
    await m.keyboard.press("Escape");
    await m.screenshot({ path: dir + `table-${who}-390.png` });
    // Campaign sections from the campaign page: seen in the strip, or All sections (2).
    for (const [id, area] of [
      ["campaign-members", "B13 members"],
      ["handouts", "B15 materials"],
      ["chat-archive", "B17 chat archive"],
      ["media", "B28 attachments"],
      ["loot", "B26 treasure"],
      ["safety", "B27 safety"],
      ["assistant", "B60 assistant"],
      ...(who === "dm"
        ? [
            ["settings", "B20 campaign settings"],
            ["community", "B59 recruiting"],
          ]
        : []),
    ]) {
      await go(m, "campaign");
      await reachSection(m, who, 390, area + " (campaign)", id, true);
      const s = await seen(m, `${campaign(id)}.active`);
      check(s.ok, `${who} 390: the open section ${id} is not in view in the strip (${s.why})`);
    }
    await m.screenshot({ path: dir + `campaign-${who}-390.png` });
  }
  passed.push(
    `390 touch IT: header services in 1 tap, Help from the App menu in 2; every Table tab in ≤ 2 taps (player ${counts.player.direct} in the bar + ${counts.player.list} from All panels, DM ${counts.dm.direct} + ${counts.dm.list}); after each the open tab, Map and All panels are on screen; the action bar shows Move, Sheet actions, Roll dice, Cancel and Undo; long press opens the token menu; every campaign section in ≤ 2 taps from the campaign page, the open one kept in view`,
  );
  await phone.context.close();

  // 5. Phone in combat: End turn (and Undo, Cancel) on screen for the DM and the player.
  const fight = await open({ viewport: { width: 1440, height: 900 }, hasTouch: true });
  const f = fight.page;
  await role(f, "dm");
  await go(f, "table");
  // Refreshed by R3 (27/09/2026): «Avvia combattimento» opens the start dialog at the Table
  // (P5 roll call: who fights, each d20 typed or rolled, «Inizia combattimento»).
  await f.getByRole("button", { name: "Avvia combattimento", exact: true }).click();
  const start = f.locator("#dialog");
  await start.locator("[data-ct-start-natural]").first().waitFor();
  for (const [id, natural] of [
    ["livia", 18],
    ["goblin-1", 12],
    ["doran", 10],
    ["goblin-2", 8],
  ]) {
    await start.locator(`[data-ct-start-include="${id}"]`).check();
    await start.locator(`[data-ct-start-natural="${id}"]`).fill(String(natural));
    await start.locator(`[data-ct-start-natural="${id}"]`).press("Tab");
  }
  if (await start.locator('[data-ct-start-include="mira"]').count())
    await start.locator('[data-ct-start-include="mira"]').uncheck();
  await start.getByRole("button", { name: "Inizia combattimento", exact: true }).click();
  await f.locator("#battle-map").waitFor();
  // B61 wanted the dock's commands on one row of a full-width bar. B62 merges the bars into one
  // BG3 hotbar: the commands are its right column (two short rows, End turn as tall as both),
  // and what stays compact is the whole bottom — one bar of at most 120 px (B61's two: 293 px).
  const bottom = await f.evaluate(() => {
    const ys = [...document.querySelectorAll(".action-dock .toolbar > .button")].map((b) =>
      Math.round(b.getBoundingClientRect().top),
    );
    const bars = [
      ...document.querySelectorAll(".table-layout > .combat-bar, .table-layout > .action-dock"),
    ].filter((el) => el.checkVisibility());
    return {
      rows: new Set(ys).size,
      bars: bars.length,
      height: Math.round(bars[0]?.getBoundingClientRect().height ?? 0),
    };
  });
  check(
    bottom.bars === 1 && bottom.rows <= 2 && bottom.height <= 120,
    `1440 combat action bar: ${JSON.stringify(bottom)}`,
  );

  // W2b1 integration: B40's «Mosse» had joined this bar and wrapped «Termina turno» to a
  // second row; it now closes the combat action bar above (BG3 common actions), and End
  // turn is also checked on screen.
  const endTurn = await f.locator('.action-dock [data-table="end-turn"]').boundingBox();
  check(endTurn && endTurn.y + endTurn.height <= 900, "1440 combat: End turn off screen");
  await f.setViewportSize({ width: 390, height: 844 });
  await f.waitForTimeout(300);
  for (const who of ["dm", "player"]) {
    await role(f, who);
    const got = f.locator("[data-home-pop] [data-home-pop-action=got-it]");
    if (await got.count()) await got.first().tap();
    for (const sel of [
      '.action-dock [data-table="end-turn"]',
      '.action-dock [data-table="undo"]',
      '.action-dock [data-table="cancel"]',
    ]) {
      const s = await seen(f, sel);
      check(s.ok, `${who} 390 in combat: ${sel} off-screen (${s.why})`);
    }
    await f.screenshot({ path: dir + `combat-${who}-390.png` });
  }
  await fight.context.close();
  passed.push(
    "Combat: 1440 one bottom bar (B62 hotbar, ≤ 120 px, ≤ 2 rows of commands); 390 End turn, Undo and Cancel on screen for DM and player (wrapped, not scrolled away)",
  );

  // 6. Larger interface (B22 scales it and makes the map toolbar scroll inside the map):
  // every tool of every group can be scrolled into view and pressed, none cut off.
  const big = await open({ viewport: { width: 1440, height: 900 } });
  const b = big.page;
  await role(b, "dm");
  await b.locator('.app-header [data-service="preferences"]').click();
  await b.locator('#dialog select[name="setting:preferences-look.ui-scale"]').selectOption("3");
  await b.locator('#dialog select[name="setting:preferences-look.text-size"]').selectOption("2");
  await b.locator("#dialog button[type=submit]").click();
  await go(b, "table");
  check(
    await b.evaluate(() => document.documentElement.hasAttribute("data-pref-scaled")),
    "not scaled",
  );
  const cut = () =>
    b.evaluate(() =>
      [...document.querySelectorAll(".map-toolbar [data-tool], .map-toolbar [data-tool-group]")]
        .filter((el) => el.checkVisibility())
        .filter((el) => {
          el.scrollIntoView({ block: "nearest", inline: "nearest" });
          const r = el.getBoundingClientRect();
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !(top && (el === top || el.contains(top)));
        })
        .map((el) => el.dataset.tool ?? "group " + el.dataset.toolGroup),
    );
  const groups = await b
    .locator("[data-tool-group]")
    .evaluateAll((g) => g.map((x) => x.dataset.toolGroup));
  for (const group of groups) {
    await b
      .locator(`[data-tool-group="${group}"]`)
      .evaluate((el) => el.scrollIntoView({ block: "nearest" }));
    await b.locator(`[data-tool-group="${group}"]`).click();
    await b.waitForTimeout(150);
    const hidden = await cut();
    check(!hidden.length, `125 %: group ${group}: tools cut off: ${hidden}`);
  }
  await b.screenshot({ path: dir + "table-dm-1440-ui125.png" });
  await big.context.close();
  passed.push(
    `Interface 125 % and text 125 % (DM, 1440): with each of the ${groups.length} groups open, every group button and tool can be scrolled into view in the toolbar and nothing covers it`,
  );

  check(!errors.length, "Page errors: " + errors.join(" | "));
  return { passed, errors, audit, railOverflow };
};
