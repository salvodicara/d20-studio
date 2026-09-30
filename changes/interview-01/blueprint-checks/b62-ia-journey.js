async (rootPage) => {
  // B62 part A — information architecture once all 48 areas exist, in the running app.
  // Table sidebar tabs by Foundry's document taxonomy with sub-tabs, "All panels" grouped with
  // per-identity "In the rail" switches, area handles that still open their panel; token menu
  // with at most twelve commands and labelled submenus (keyboard); one BG3 hotbar with its
  // pages; one Search (SRD 5.2.1 EN 187 / IT 212); campaign rail groups with memory;
  // Preparation groups; D&D Beyond sheet categories; first-visit tips off, help on request.
  // 1440 × 900 and 1366 × 768 (mouse, IT), 390 × 844 (touch, EN). Synthetic data only.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/IA/journey/";
  const browser = rootPage.context().browser();
  const passed = [];
  const notes = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const open = async (options) => {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "#home");
    await page.waitForSelector("#demo-role");
    return { context, page };
  };
  const setRole = async (page, role) => {
    await page.locator("#demo-role").selectOption(role);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, role);
    await page.waitForTimeout(150);
  };
  const goTable = async (page) => {
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.waitForTimeout(300);
  };
  const rail = (page) =>
    page.evaluate(() => {
      const strip = document.querySelector(".table-tabs").getBoundingClientRect();
      return [...document.querySelectorAll(".table-tabs [role=tab]")].map((t) => {
        const b = t.getBoundingClientRect();
        return {
          id: t.dataset.tableTab,
          name: t.getAttribute("aria-label"),
          inside:
            b.top >= strip.top - 1 &&
            b.bottom <= strip.bottom + 1 &&
            b.left >= strip.left - 1 &&
            b.right <= strip.right + 1 &&
            b.bottom <= innerHeight &&
            b.right <= innerWidth,
          selected: t.getAttribute("aria-selected") === "true",
        };
      });
    });
  const subtabs = (page) =>
    page.locator(".table-subtabs [role=tab]").evaluateAll((tabs) =>
      tabs.map((t) => ({
        id: t.dataset.tableSubtab,
        text: t.textContent.trim(),
        selected: t.getAttribute("aria-selected") === "true",
      })),
    );
  const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

  // ---------------------------------------------------------------- 1 · DM at 1440
  {
    const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
    await setRole(page, "dm");
    await goTable(page);
    check(
      !(await page.getByRole("button", { name: "Ho capito", exact: true }).isVisible()),
      "a first-visit tip appeared although tips are off by default",
    );
    const tabs = await rail(page);
    check(tabs.length === 9, "DM rail tabs: " + tabs.map((t) => t.id));
    check(
      tabs.every((t) => t.inside),
      "a DM tab is outside the rail at 1440 × 900",
    );
    check(
      JSON.stringify(tabs.map((t) => t.id)) ===
        JSON.stringify([
          "creature",
          "chat",
          "combat",
          "scene",
          "exploration",
          "items",
          "journal",
          "tables",
          "reference",
        ]),
      // B62 review: Items before Journal, as in Foundry's sidebar (FVT-007).
      "taxonomy order: " + tabs.map((t) => t.id),
    );
    // A section opens with its sub-tabs; the sub-tab choice is remembered; pressing the open
    // section's tab returns to the Creature tab (as closing the old drawer did).
    await page.locator('.table-tabs [data-table-section="chat"]').click();
    let sub = await subtabs(page);
    check(
      sub.map((s) => s.id).join() === "log,dice-tray,safety",
      "chat sub-tabs: " + JSON.stringify(sub),
    );
    await page.locator('.table-subtabs [data-table-subtab="dice-tray"]').click();
    check(
      (await page.locator("#table-drawer-title").innerText()) === "Dadi",
      "the Dice panel did not open",
    );
    check(
      (await page.evaluate(() => document.activeElement?.dataset?.tableSubtab)) === "dice-tray",
      "the pressed sub-tab lost the focus",
    );
    await page.locator('.table-tabs [data-table-section="chat"]').click();
    check(
      (await page.locator("#table-sidebar-panel").getAttribute("data-table-panel")) === "creature",
      "pressing the open tab did not return to Creature",
    );
    await page.locator('.table-tabs [data-table-section="chat"]').click();
    check(
      (await page.locator("#table-sidebar-panel").getAttribute("data-table-panel")) === "dice-tray",
      "the chat tab forgot its last panel",
    );
    await page.screenshot({ path: dir + "b62-1-dm-chat-subtabs-1440.png" });
    // Keyboard: rail arrows, Enter opens, Tab enters the panel; sub-tab arrows.
    await page.locator('.table-tabs [data-table-section="chat"]').focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    check(
      (await page.locator("#table-sidebar-panel").getAttribute("data-table-section")) === "combat",
      "arrow + Enter did not open Combat",
    );
    sub = await subtabs(page);
    check(sub.length === 3, "combat sub-tabs: " + JSON.stringify(sub));
    await page.locator(".table-subtabs [role=tab][aria-selected=true]").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    check(
      (await page.locator("#table-sidebar-panel").getAttribute("data-table-panel")) ===
        "encounter-builder",
      "sub-tab arrows + Enter did not open Encounter",
    );
    passed.push(
      "1a. DM 1440: no first-visit tip; 9 rail tabs in Foundry order all inside the rail; Chat → Log | Dice | Safety; the sub-tab keeps focus and is remembered; pressing the open tab returns to Creature; rail and sub-tab keyboard (arrows, Enter)",
    );
    // All panels: grouped, jumps in one click, "In the rail" hides and shows a tab.
    await page.locator("[data-table-panels]").click();
    const groups = await page
      .locator("#dialog [data-table-panels-section]")
      .evaluateAll((g) => g.map((x) => x.dataset.tablePanelsSection));
    check(groups.length === 9, "All panels groups: " + groups);
    await page.locator('#dialog [data-table-section-pin="reference"]').click();
    check(
      (await page
        .locator('#dialog [data-table-section-pin="reference"]')
        .getAttribute("aria-pressed")) === "false",
      "the switch did not turn off",
    );
    await page.locator('#dialog [data-table-panel-jump="random-tables"]').click();
    await page.waitForTimeout(200);
    check(
      (await page.locator("#table-sidebar-panel").getAttribute("data-table-panel")) ===
        "random-tables",
      "the jump did not open Tables",
    );
    check(!(await rail(page)).some((t) => t.id === "reference"), "a hidden tab stayed in the rail");
    await page.reload();
    await page.locator("#battle-map").waitFor();
    await setRole(page, "dm"); // the demo identity is a shell choice a reload may reset
    check(
      !(await rail(page)).some((t) => t.id === "reference"),
      "the hidden tab came back after a reload",
    );
    await page.locator("[data-table-panels]").click();
    await page.locator('#dialog [data-table-panel-jump="compendium-screen"]').click();
    await page.waitForTimeout(200);
    check(
      (await rail(page)).some((t) => t.id === "reference" && t.selected),
      "a hidden tab is not shown while it is open",
    );
    await page.locator("[data-table-panels]").click();
    await page.locator('#dialog [data-table-section-pin="reference"]').click();
    await page.keyboard.press("Escape");
    passed.push(
      "1b. All panels: 9 groups; «Nella barra» off hides Consultazione from the rail (kept after reload, shown while open), a jump opens Tables in one click; switched back on",
    );
    // An area's own handle still opens its panel (the B14 HUD «Sessione» on the map).
    await page.locator('.table-tabs [data-table-tab="creature"]').click();
    // Visual pass 2 (30/09/2026): «Sessione» is the first row of the map's session menu.
    const sessionMenu = page.locator(".map-container [data-session-menu]");
    if (await sessionMenu.isVisible().catch(() => false)) await sessionMenu.click();
    const hud = page
      .locator(
        '#battle-map ~ * [data-table-drawer="session-view-controls"], .map-container [data-table-drawer="session-view-controls"]',
      )
      .first();
    if (await hud.isVisible().catch(() => false)) {
      await hud.click();
      await page.waitForTimeout(200);
      check(
        (await page.locator("#table-sidebar-panel").getAttribute("data-table-panel")) ===
          "session-view-controls",
        "the HUD handle did not open Session",
      );
      notes.push("HUD «Sessione» opens Scene › Session");
    } else notes.push("HUD «Sessione» not visible at this size");
    // Token menu: ≤ 12 top-level commands, submenus by keyboard, shortcuts shown.
    const goblin = page.locator('#battle-map [data-actor="goblin-1"]');
    await goblin.click({ button: "right" });
    const menu = page.locator("body > .token-menu");
    await menu.waitFor();
    const top = await menu.locator(".token-menu-list > li > [role=menuitem]").count();
    check(top <= 12, "DM token menu top level: " + top);
    check(
      await menu.evaluate((m) => m.scrollHeight <= m.clientHeight + 1),
      "the DM token menu scrolls",
    );
    await menu.locator('[data-token-menu-category="dm"]').focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
    check(
      (await menu.locator("#token-menu-subtitle").textContent()) === "Strumenti DM",
      "ArrowRight did not open DM tools",
    );
    const kbd = await menu.locator("kbd").allInnerTexts();
    check(kbd.includes("Maiusc+L") && kbd.some((k) => /C$/.test(k)), "shortcuts: " + kbd);
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(150);
    check(
      (await page.evaluate(() => document.activeElement?.dataset?.tokenMenuCategory)) === "dm",
      "ArrowLeft did not return to the DM tools entry",
    );
    await menu.locator('[data-token-menu-category="visibility"]').click();
    await menu.locator('[data-token-menu-item="token-menu-hide"]').click();
    await page.waitForTimeout(150);
    check(/Nascosta ai giocatori/.test(await menu.innerText()), "hide did not apply");
    await menu.locator('[data-token-menu-item="token-menu-hide"]').click();
    await page.screenshot({ path: dir + "b62-1-dm-token-submenu-1440.png" });
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    passed.push(
      `1c. DM token menu: ${top} top-level commands, no scroll; ArrowRight opens «Strumenti DM» (Maiusc+L, copy shortcut), ArrowLeft returns to its entry; «Visibilità › Nascondi ai giocatori» hides and shows the goblin`,
    );
    // One hotbar with pages.
    const bars = await page.evaluate(
      () =>
        document.querySelectorAll(".table-layout > .combat-bar, .table-layout > .action-dock")
          .length,
    );
    check(bars === 1, "bottom bars: " + bars);
    const height = await page
      .locator(".table-hotbar")
      .evaluate((n) => n.getBoundingClientRect().height);
    check(height <= 120, "hotbar height " + height);
    await page.locator('[data-hotbar-page="quickbar"]').click();
    await page.waitForTimeout(150);
    check(await page.locator("#hotbar-panel-quickbar [data-qb]").isVisible(), "quick bar page");
    check(!(await page.locator("#hotbar-panel-actions").isVisible()), "actions still shown");
    await page.reload();
    await page.locator("#battle-map").waitFor();
    await setRole(page, "dm");
    check(
      (await page.locator('[data-hotbar-page="quickbar"]').getAttribute("aria-selected")) ===
        "true",
      "the hotbar page was not remembered",
    );
    await page.locator('[data-hotbar-page="actions"]').click();
    await page.waitForTimeout(150);
    check(await page.locator("#hotbar-panel-actions .combat-actions").isVisible(), "actions page");
    passed.push(
      `1d. One bottom hotbar (${Math.round(height)} px): identity, «Azioni | Barra rapida» pages (remembered after reload), turn commands`,
    );
    await context.close();
  }

  // ---------------------------------------------------------------- 2 · player at 1440
  {
    const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
    await setRole(page, "player");
    await goTable(page);
    const tabs = await rail(page);
    // Final review X-07: the player's rail adds «Consultazione» (the compendium browser).
    check(
      tabs.length === 8 && tabs.every((t) => t.inside),
      "player rail: " + tabs.map((t) => t.id),
    );
    // One Search: the token menu and the Creature tab.
    await page.locator('.table-tabs [data-table-tab="creature"]').click();
    const buttons = await page
      .locator("#table-sidebar-panel button")
      .evaluateAll((b) => b.map((x) => x.textContent.trim()).filter((t) => /^Cerca/.test(t)));
    check(buttons.length === 1 && buttons[0] === "Cerca", "Creature tab search: " + buttons);
    const livia = page.locator('#battle-map [data-actor="livia"]');
    await livia.click({ button: "right" });
    const menu = page.locator("body > .token-menu");
    await menu.waitFor();
    const labels = await menu
      .locator(".token-menu-list > li > [role=menuitem] .token-menu-label")
      .allInnerTexts();
    check(labels.filter((l) => /^Cerca/.test(l)).join() === "Cerca", "menu search: " + labels);
    check(labels.length <= 12, "player menu: " + labels.length);
    await menu.locator('[data-token-menu-item="knowledge-search"]').click();
    const dialog = page.locator("#dialog");
    await dialog.waitFor();
    const text = await dialog.innerText();
    check(
      /Un solo tiro trova/.test(text) && /trappole nascoste/.test(text),
      "dialog: " + text.slice(0, 200),
    );
    await dialog.locator('select[name="diceMode"]').selectOption("physical");
    await dialog.locator('input[name="face0"]').fill("20");
    await dialog.locator('button[type="submit"]').click();
    await page.waitForTimeout(300);
    const toast = await page.locator("#toast").innerText();
    check(/Trovato|Niente di sospetto/.test(toast), "search result: " + toast);
    notes.push("Search toast: " + toast);
    await page.screenshot({ path: dir + "b62-2-player-search-1440.png" });
    passed.push(
      "2a. Player 1440: 7 rail tabs inside the rail; one «Cerca» in the Creature tab and one in the token menu (≤ 12 commands); the dialog says one roll finds creatures, traps and search points; a physical 20 reports the result",
    );
    // Campaign rail groups with memory.
    await page.goto(base + "#campaign");
    await page.locator(".campaign-sidebar").waitFor();
    const groups = await page.locator(".campaign-sidebar [data-campaign-group]").evaluateAll((g) =>
      g.map((x) => ({
        id: x.dataset.campaignGroup,
        open:
          x.querySelector("[data-campaign-group-toggle]").getAttribute("aria-expanded") === "true",
        items: x.querySelectorAll("[data-campaign-tab]").length,
      })),
    );
    check(groups.length === 5, "rail groups: " + JSON.stringify(groups));
    check(
      groups
        .filter((g) => g.open)
        .map((g) => g.id)
        .join() === "campaign" && groups[0].items === 6,
      "open by default: " + JSON.stringify(groups),
    );
    await page.locator('[data-campaign-group-toggle="story"]').click();
    check(
      await page.locator('.campaign-sidebar [data-campaign-tab="quests"]').isVisible(),
      "story did not open",
    );
    await page.reload();
    await page.locator(".campaign-sidebar").waitFor();
    await setRole(page, "player");
    check(
      (await page.locator('[data-campaign-group-toggle="story"]').getAttribute("aria-expanded")) ===
        "true",
      "the open group was not remembered",
    );
    await page.locator('[data-campaign-group-toggle="story"]').click();
    await page.goto(base + "#campaign?tab=safety");
    await page.locator(".campaign-sidebar").waitFor();
    check(
      await page.locator('.campaign-sidebar [data-campaign-tab="safety"].active').isVisible(),
      "the open section's group stayed closed",
    );
    await page.screenshot({ path: dir + "b62-2-player-campaign-groups-1440.png" });
    passed.push(
      "2b. Campaign rail: 5 groups, only «Campagna» (6 sections, with the Archive) open; «Racconto» opens and stays open after reload; opening Safety by address opens «Gioco» with Safety active",
    );
    // Sheet: seven D&D Beyond categories, area tabs as sub-sections.
    await page.goto(base + "#characters?id=livia&tab=actions");
    await page.locator(".character-tabs").waitFor();
    const cats = await page.locator(".character-tabs [data-character-tab]").allInnerTexts();
    check(cats.join() === "Azioni,Magie,Inventario,Capacità,Storia,Note,Extra", "sheet: " + cats);
    await page.locator('.character-tabs [data-character-tab="extras"]').click();
    await page.locator('.character-subtabs [data-character-tab="projects"]').click();
    await page.waitForTimeout(200);
    check(/tab=projects/.test(page.url()), "sub-section address: " + page.url());
    check(
      (await page.locator(".character-tabs .active").innerText()) === "Extra",
      "the category is not current",
    );
    await page.screenshot({ path: dir + "b62-2-player-sheet-subsections-1440.png" });
    passed.push(
      "2c. Sheet: Azioni, Magie, Inventario, Capacità, Storia, Note, Extra; Extra › Tempo libero opens with its own address (tab=projects), the category stays current",
    );
    // Tips: off by default, turned on from Help › Tours and tips.
    await page.goto(base + "#home?tab=guides");
    const tips = page.locator("[data-home-tips-enabled]").first();
    await tips.waitFor();
    check(!(await tips.isChecked()), "tips on by default");
    await tips.check();
    await page.waitForTimeout(200);
    await goTable(page);
    const tip = await page.getByRole("button", { name: "Ho capito", exact: true }).isVisible();
    check(tip, "the tip did not appear once turned on");
    passed.push(
      "2d. Tips: off by default; turned on in Aiuto › Tour e suggerimenti, the Table tip appears",
    );
    await context.close();
  }

  // ---------------------------------------------------------------- 3 · DM at 1366 × 768
  {
    const { context, page } = await open({ viewport: { width: 1366, height: 768 } });
    await setRole(page, "dm");
    await goTable(page);
    const tabs = await rail(page);
    check(tabs.length === 9 && tabs.every((t) => t.inside), "1366 rail: " + JSON.stringify(tabs));
    const geo = await page.evaluate(() => ({
      hotbar: document.querySelector(".table-hotbar").getBoundingClientRect().height,
      bottom: document.querySelector(".table-hotbar").getBoundingClientRect().bottom,
      map: document.querySelector(".map-container").getBoundingClientRect().height,
    }));
    check(geo.bottom <= 768 + 1, "the hotbar is below the fold: " + JSON.stringify(geo));
    await page.goto(base + "#preparation?tab=loot");
    await page.locator(".prep-collection").waitFor();
    const prep = await page.evaluate(() => ({
      groups: [...document.querySelectorAll(".prep-groups [data-prep-group]")].map(
        (b) => b.dataset.prepGroup,
      ),
      current: document.querySelector(".prep-groups .active")?.dataset.prepGroup,
      sub: [...document.querySelectorAll(".prep-sections.is-sub [data-prep-section]")].map(
        (b) => b.dataset.prepSection,
      ),
    }));
    check(
      prep.groups.join() === "scenes,encounters,materials,sessions",
      "prep groups: " + prep.groups,
    );
    check(
      prep.current === "materials" &&
        prep.sub.join() === "handouts,random-tables,loot,loot-merchants",
      "prep: " + JSON.stringify(prep),
    );
    await page.locator('.prep-sections.is-sub [data-prep-section="loot-merchants"]').click();
    await page.waitForTimeout(200);
    check(/tab=loot-merchants/.test(page.url()), "merchants: " + page.url());
    await page.locator('.prep-groups [data-prep-group="encounters"]').click();
    await page.waitForTimeout(200);
    check(/tab=encounter-builder/.test(page.url()), "encounters: " + page.url());
    await page.locator("[data-prep-sections-all]").click();
    const heads = await page.locator("#dialog .table-panels-group h3").allInnerTexts();
    check(heads.length === 4, "All sections groups: " + heads);
    await page.keyboard.press("Escape");
    await page.screenshot({ path: dir + "b62-3-dm-preparation-1366.png" });
    passed.push(
      `3. DM 1366 × 768: 9 rail tabs inside the rail, hotbar ${Math.round(geo.hotbar)} px above the fold (map ${Math.round(geo.map)} px); Preparation groups Scene, Incontri, Materiali, Sessioni e avventure; Materiali › Mercanti, Incontri opens its only section; All sections grouped in 4`,
    );
    await context.close();
  }

  // ---------------------------------------------------------------- 4 · phone, touch, EN
  {
    const { context, page } = await open({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await page.locator('[data-service="preferences"]').click();
    await page.locator('#dialog [name="lang"]').selectOption("en");
    await page.locator('#dialog button[type="submit"]').click();
    await setRole(page, "player");
    await goTable(page);
    await page.locator("[data-table-map-link]").tap();
    await page.waitForTimeout(300);
    const view = await page.evaluate(() => {
      const map = document.querySelector(".map-container").getBoundingClientRect();
      const hot = document.querySelector(".table-hotbar").getBoundingClientRect();
      const bar = document.querySelector(".table-sidebar-rail").getBoundingClientRect();
      const bottom = Math.min(map.bottom, hot.top, bar.top, innerHeight);
      return {
        visible: bottom - Math.max(map.top, 0),
        hotbar: hot.height,
        share: (bottom - Math.max(map.top, 0)) / innerHeight,
      };
    });
    check(view.share >= 0.6, "the map in view is under 60 %: " + JSON.stringify(view));
    check((await overflow(page)) <= 0, "horizontal overflow");
    const bar = await page
      .locator(".table-tabs [role=tab]")
      .evaluateAll((t) => t.map((x) => x.dataset.tableTab));
    // Final review X-07: eight with «Consultazione».
    check(bar.length === 8, "phone tabs: " + bar);
    await page.locator('.table-tabs [data-table-section="chat"]').tap();
    await page.waitForTimeout(250);
    const sub = await subtabs(page);
    check(
      sub
        .map((s) => s.text)
        .join("|")
        .includes("Log") && sub.length >= 3,
      "phone chat: " + JSON.stringify(sub),
    );
    const small = await page
      .locator(".table-subtabs [role=tab], .table-hotbar button, .table-hotbar select")
      .evaluateAll((els) =>
        els
          .filter((e) => e.checkVisibility())
          .map((e) => [
            e.textContent.trim().slice(0, 16),
            Math.round(e.getBoundingClientRect().height),
          ])
          .filter(([, h]) => h < 40),
      );
    check(!small.length, "targets under 40 px: " + JSON.stringify(small));
    // The Log is B17's full-screen chat sheet on a phone; its pinned sub-tabs reach Dice in one
    // tap (the sheet closes), then the bottom bar's All panels is free again.
    await page.locator('.table-subtabs [data-table-subtab="dice-tray"]').tap();
    await page.waitForFunction(
      () => document.querySelector("#table-sidebar-panel")?.dataset.tablePanel === "dice-tray",
    );
    await page.locator("[data-table-panels]").tap();
    const groups = await page
      .locator("#dialog [data-table-panels-section] h3")
      .evaluateAll((hs) => hs.map((h) => h.textContent.trim()));
    // Final review F17: the Table's journal group is «Documents» (the campaign keeps «Journal»).
    check(groups.includes("Chat") && groups.includes("Documents"), "EN groups: " + groups);
    await page.screenshot({ path: dir + "b62-4-phone-all-panels-390.png" });
    await page.keyboard.press("Escape");
    await page.locator("[data-table-map-link]").tap();
    await page.waitForTimeout(250);
    // Long press on Livia: a bottom sheet with at most twelve commands, one «Search».
    const cdp = await context.newCDPSession(page);
    const node = page.locator('#battle-map [data-actor="livia"]');
    await node.scrollIntoViewIfNeeded();
    const b = await node.boundingBox();
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }],
    });
    await page.waitForTimeout(750);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(250);
    const menu = page.locator("body > .token-menu");
    check(await menu.evaluate((n) => !n.hidden), "long-press did not open the menu");
    const labels = await menu
      .locator(".token-menu-list > li > [role=menuitem] .token-menu-label")
      .allInnerTexts();
    check(
      labels.length <= 12 && labels.filter((l) => l === "Search").length === 1,
      "phone menu: " + labels,
    );
    await menu.locator('[data-token-menu-category="look"]').tap();
    await page.waitForTimeout(150);
    check(
      (await menu.locator("#token-menu-subtitle").textContent()) === "Appearance",
      "EN submenu",
    );
    await page.screenshot({ path: dir + "b62-4-phone-token-submenu-390.png" });
    passed.push(
      `4. EN phone 390 (touch): map in view ${Math.round(view.visible)} px (${Math.round(view.share * 100)} %) above a ${Math.round(view.hotbar)} px hotbar; 7 tabs, Chat sub-tabs ≥ 40 px; All panels grouped in English; long-press menu ${labels.length} commands with one «Search», «Appearance» submenu`,
    );
    await context.close();
  }
  check(!errors.length, "page errors: " + errors.join(" | "));
  return { passed, notes, errors };
};
