async (rootPage) => {
  // W2b1 integration shell check (B33, B34, B36, B37, B38, B40): clean load (console, page
  // errors, failed requests), the wave's pages and Table tabs for player and DM, the "Cosa è
  // pronto" registry report, header and Table top line density at 1440 and 390 (IT and EN),
  // the action bar in and out of combat, and findability of the wave's entry points where the
  // registry places them (B61): the Dice tab of the Table sidebar (and the dock's «Tira i
  // dadi» that opens it), the dock's «Mosse», the two-tier ruler in the Measure group, the
  // DM's «Regole di movimento» tab, the Creature tab sections (Hit points, Weapons and
  // ammunition, Speeds and effects, Special moves), the token menu «Punti ferita…», the sheet
  // tabs Inventario and Magie (strip or "All sections"), the sheet sections (HP widget, mode
  // bar, Rolls, generic actions) and the Preparation section «Movimento e griglia».
  // Synthetic data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/W2b1-integ/shell/";
  const WAVE = {
    "damage-tray": "B33",
    "dice-tray": "B34",
    "inventory-plus": "B36",
    "sheet-plus": "B37",
    "spells-plus": "B38",
    "special-moves": "B40",
  };
  const passed = [];
  const out = {};
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const browser = rootPage.context().browser();

  const open = async (options) => {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const log = { console: [], pageErrors: [], failed: [] };
    page.on("console", (m) => {
      if (["error", "warning"].includes(m.type()))
        log.console.push({ type: m.type(), text: m.text().slice(0, 300), url: m.location()?.url });
    });
    page.on("pageerror", (e) => log.pageErrors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) log.failed.push({ status: r.status(), url: r.url() });
    });
    return { context, page, log };
  };
  const quiet = async (p, touch = false) => {
    for (const name of ["Ho capito", "Got it"]) {
      const tip = p.getByRole("button", { name, exact: true });
      if (await tip.isVisible().catch(() => false)) await (touch ? tip.tap() : tip.click());
    }
  };
  const setRole = async (p, role) => {
    await p.locator("#demo-role").selectOption(role);
    await p.waitForFunction((v) => document.querySelector("#demo-role").value === v, role);
    await p.waitForTimeout(150);
  };
  const goTable = async (p, touch = false) => {
    await p.goto(base + "#table");
    await p.locator("#battle-map").waitFor();
    await p.waitForTimeout(200);
    await quiet(p, touch);
  };

  // Bar geometry: every control inside the viewport, ≥ 40 px, no two overlapping.
  const measureBar = (page, selector) =>
    page.evaluate((sel) => {
      const root = document.querySelector(sel);
      if (!root) return null;
      const items = [...root.querySelectorAll("button, a, select, [role=button]")]
        .filter((el) => el.checkVisibility())
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            name: (el.getAttribute("aria-label") || el.textContent || el.title || "")
              .trim()
              .slice(0, 40),
            x: Math.round(r.left),
            y: Math.round(r.top),
            w: Math.round(r.width),
            h: Math.round(r.height),
          };
        });
      const overlaps = [];
      for (let i = 0; i < items.length; i++)
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i],
            b = items[j];
          if (
            a.x < b.x + b.w - 1 &&
            b.x < a.x + a.w - 1 &&
            a.y < b.y + b.h - 1 &&
            b.y < a.y + a.h - 1
          )
            overlaps.push(a.name + " × " + b.name);
        }
      const box = root.getBoundingClientRect();
      return {
        height: Math.round(box.height),
        rows: items
          .map((i) => i.y + i.h / 2)
          .sort((a, b) => a - b)
          .filter((c, k, all) => k === 0 || c - all[k - 1] > 12).length,
        count: items.length,
        outside: items.filter((i) => i.x < 0 || i.x + i.w > innerWidth).map((i) => i.name),
        small: items.filter((i) => i.h < 40 || i.w < 40).map((i) => `${i.name} ${i.w}×${i.h}`),
        overlaps,
        names: items.map((i) => i.name),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    }, selector);

  // Seen without scrolling an inner strip or rail (B61 rule): page scrolling is allowed.
  const seen = (page, selector) =>
    page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el || !el.checkVisibility()) return false;
      const strip = el.closest(
        ".map-subtools, .table-tabs, .campaign-sidebar nav, .map-toolbar, .prep-sections, .character-tabs",
      );
      const r = el.getBoundingClientRect();
      if (r.left < -1 || r.right > innerWidth + 1) return false;
      if (strip) {
        const b = strip.getBoundingClientRect();
        if (
          r.top < b.top - 1 ||
          r.bottom > b.bottom + 1 ||
          r.left < b.left - 1 ||
          r.right > b.right + 1
        )
          return false;
      }
      el.scrollIntoView({ block: "nearest" });
      const q = el.getBoundingClientRect();
      const top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
      return Boolean(top && (el.contains(top) || top.contains(el)));
    }, selector);
  const press = (loc, touch) => (touch ? loc.tap() : loc.click());

  // A Table sidebar tab: pressed where the rail shows it (1), else from All panels (2).
  // B62: a panel is a sub-tab of its tab (Foundry's document tabs): its tab, then its
  // sub-tab when the tab opens another panel (2); or All panels, then the panel (2).
  const panelSection = async (p, id) => {
    if (await p.locator(`.table-tabs [data-table-tab="${id}"]`).count()) return id;
    if (await p.locator(`.table-subtabs [data-table-subtab="${id}"]`).count())
      return p.locator("#table-sidebar-panel").getAttribute("data-table-section");
    const handle = p.locator(`.table-panel-index [data-table-drawer="${id}"]`);
    return (await handle.count()) ? handle.getAttribute("data-table-section-of") : null;
  };
  const reachTab = async (p, id, touch = false) => {
    const section = await panelSection(p, id);
    check(section, `panel ${id} missing`);
    const tab = `.table-tabs [data-table-tab="${section}"]`;
    const current = () => p.locator("#table-sidebar-panel").getAttribute("data-table-panel");
    if ((await current()) === id && id === "creature") return 1;
    if ((await p.locator(tab).getAttribute("aria-selected")) === "true") {
      await press(p.locator('.table-tabs [data-table-tab="creature"]'), touch);
      await p.waitForTimeout(100);
    }
    const direct = await seen(p, tab);
    let clicks = 1;
    if (direct) {
      await press(p.locator(tab), touch);
      await p.waitForTimeout(100);
      if ((await current()) !== id) {
        await press(p.locator(`.table-subtabs [data-table-subtab="${id}"]`), touch);
        clicks = 2;
      }
    } else {
      await press(p.locator("[data-table-panels]"), touch);
      await press(p.locator(`#dialog [data-table-panel-jump="${id}"]`), touch);
      clicks = 2;
    }
    await p.locator(`${tab}[aria-selected="true"]`).waitFor({ timeout: 5000 });
    await p.locator(`#table-sidebar-panel[data-table-panel="${id}"]`).waitFor({ timeout: 5000 });
    check(clicks <= 2, `panel ${id}: ${clicks} clicks`);
    return clicks;
  };
  // A map tool: seen in the toolbar (1), else its group then the tool (2).
  const reachTool = async (p, tool, touch = false) => {
    const chip = `.map-toolbar [data-tool="${tool}"]`;
    check(await p.locator(chip).count(), `tool ${tool} missing`);
    let n = 1;
    // Refreshed by R3 (27/09/2026), P6 TV-06: on a phone the map tools fold behind «Strumenti
    // della mappa»; the first tap unfolds them (one more tap, as in Owlbear's phone toolbar).
    const fold = p.locator('#content [data-map-tools-toggle][aria-expanded="false"]');
    if ((await fold.count()) && (await fold.first().isVisible())) {
      await press(fold.first(), touch);
      await p.locator('#content [data-map-tools-toggle][aria-expanded="true"]').waitFor();
      n += 1;
    }
    if (!(await seen(p, chip))) {
      const group = await p.evaluate(
        (s) =>
          document
            .querySelector(s)
            ?.closest(".map-tool-cluster")
            ?.querySelector("[data-tool-group]")?.dataset.toolGroup ?? null,
        chip,
      );
      check(group, `tool ${tool} has no group`);
      await press(p.locator(`[data-tool-group="${group}"]`), touch);
      n += 1;
      check(await seen(p, chip), `tool ${tool} not seen after opening its group ${group}`);
    }
    await press(p.locator(chip), touch);
    // A phone toolbar folds again once a tool is chosen (P6 TV-06): pressed, maybe hidden.
    await p.locator(`${chip}[aria-pressed="true"]`).waitFor({ state: "attached", timeout: 5000 });
    const group = await p.evaluate(
      (s) =>
        document.querySelector(s)?.closest(".map-tool-cluster")?.querySelector("[data-tool-group]")
          ?.dataset.toolGroup ?? null,
      chip,
    );
    await p.keyboard.press("Escape");
    await p
      .locator('.map-toolbar [data-tool="move"]')
      .first()
      .click({ force: true })
      .catch(() => {});
    return { clicks: n, group };
  };
  // A Preparation section: pressed where the strip shows it (1), else from All sections (2).
  const reachPrep = async (p, id, touch = false) => {
    await p.goto(base + "#preparation");
    await p.locator(".prep-sections").waitFor();
    await quiet(p, touch);
    const sel = `.prep-sections [data-prep-section="${id}"]`;
    check(await p.locator(sel).count(), `preparation section ${id} missing`);
    const direct = await seen(p, sel);
    if (direct) await press(p.locator(sel), touch);
    else {
      await press(p.locator("[data-prep-sections-all]"), touch);
      await press(p.locator(`#dialog [data-prep-section-jump="${id}"]`), touch);
    }
    await p.waitForFunction((t) => location.hash.includes("tab=" + t), id);
    await p.locator(`.prep-sections [data-prep-section="${id}"].active`).waitFor();
    return direct ? 1 : 2;
  };
  // A sheet tab (B36 Inventario, B38 Magie): in the strip (1), else from "All" (2).
  const reachSheetTab = async (p, actorId, id, touch = false) => {
    await p.goto(base + `#characters?id=${actorId}`);
    await p.locator(".character-tabs").waitFor();
    await quiet(p, touch);
    const sel = `.character-tabs [data-character-tab="${id}"]`;
    check(await p.locator(sel).count(), `sheet tab ${id} missing`);
    const direct = await seen(p, sel);
    if (direct) await press(p.locator(sel), touch);
    else {
      await press(p.locator("[data-character-tabs-all]"), touch);
      await press(p.locator(`#dialog [data-character-tab="${id}"]`), touch);
    }
    await p.waitForFunction((t) => location.hash.includes("tab=" + t), id);
    await p.locator(`${sel}.active`).waitFor();
    return direct ? 1 : 2;
  };
  // The action bar: rows of its command toolbar, End turn and Moves on screen, sizes.
  const dockInfo = (p) =>
    p.evaluate(() => {
      const d = document.querySelector(".action-dock");
      const buttons = [...document.querySelectorAll(".action-dock > .toolbar > .button")].filter(
        (el) => el.checkVisibility(),
      );
      // B62: bars stacked under the map (one BG3 hotbar holds actions, quick bar and commands).
      const bars = [
        ...document.querySelectorAll(".table-layout > .combat-bar, .table-layout > .action-dock"),
      ].filter((el) => el.checkVisibility()).length;
      const box = (el) => {
        if (!el || !el.checkVisibility()) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.left),
          y: Math.round(r.top),
          w: Math.round(r.width),
          h: Math.round(r.height),
        };
      };
      const tops = new Set(buttons.map((b) => Math.round(b.getBoundingClientRect().top)));
      const r = d?.getBoundingClientRect();
      return {
        height: r ? Math.round(r.height) : null,
        bottom: r ? Math.round(r.bottom) : null,
        bars,
        rows: tops.size,
        names: buttons.map((b) =>
          (b.getAttribute("aria-label") || b.textContent).trim().slice(0, 30),
        ),
        // «Mosse» closes the combat action bar above the dock (BG3 common actions); B62
        // review: in its own column beside the actions (.combat-dock), never scrolled away.
        moves: box(document.querySelector(".combat-bar .combat-dock [data-sm-tray]")),
        dice: box(document.querySelector('.action-dock [data-table="dice"]')),
        endTurn: box(document.querySelector('.action-dock [data-table="end-turn"]')),
        small: buttons
          .map((b) => b.getBoundingClientRect())
          .filter((q) => q.width < 40 || q.height < 40).length,
        overflow: document.documentElement.scrollWidth - innerWidth,
        pageScroll: document.documentElement.scrollHeight - innerHeight,
      };
    });
  const creatureSlots = (p) =>
    p.evaluate(() =>
      [...document.querySelectorAll("#table-sidebar-panel [data-ext-slot^='table-panel:']")]
        .filter((el) => el.innerHTML.trim())
        .map((el) => el.dataset.extSlot.replace("table-panel:", "")),
    );

  // ------------------------------------------------------------------ 1. clean load, IT 1440
  const desk = await open({ viewport: { width: 1440, height: 900 } });
  const page = desk.page;
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  await page.waitForTimeout(1500);
  const planned = await page.evaluate(async () => {
    const { PLANNED_EXTENSIONS } = await import("/extensions.mjs");
    return PLANNED_EXTENSIONS.map((a) => a.id);
  });
  const idOf = (url) => url.replace(/^https?:\/\/[^/]+\//, "").replace(/\.mjs$/, "");
  const missing = desk.log.failed.filter((f) => f.status === 404);
  const missingIds = [...new Set(missing.map((f) => idOf(f.url)))];
  const unexpectedFailed = desk.log.failed.filter(
    (f) => !(f.status === 404 && planned.includes(idOf(f.url))),
  );
  const notBuilt404 = (m) =>
    m.type === "error" &&
    m.text.startsWith("Failed to load resource") &&
    missing.some((f) => f.url === m.url);
  const consoleOther = desk.log.console.filter((m) => !notBuilt404(m));
  out.load = {
    planned: planned.length,
    notBuilt404: missingIds.length,
    notBuiltIds: missingIds,
    unexpectedFailed,
    consoleAll: desk.log.console.length,
    consoleOther,
    pageErrors: desk.log.pageErrors,
  };
  check(!desk.log.pageErrors.length, "Page errors on load: " + desk.log.pageErrors.join("; "));
  check(
    !unexpectedFailed.length,
    "Unexpected failed requests: " + JSON.stringify(unexpectedFailed),
  );
  check(!consoleOther.length, "Console errors/warnings on load: " + JSON.stringify(consoleOther));
  check(
    Object.keys(WAVE).every((id) => !missingIds.includes(id)),
    "A W2b1 module is missing: " + missingIds.filter((id) => id in WAVE),
  );
  check(!(await page.locator("#ext-notice .ext-alert").count()), "Strip reports area warnings");
  passed.push(
    `Clean load IT 1440: ${desk.log.pageErrors.length} page errors, ${desk.log.console.length} console errors or warnings, ${desk.log.failed.length} failed requests (${planned.length} planned areas, ${missingIds.length} not built); no area warning in the strip`,
  );

  // ------------------------------------------------------------------ 1b. wave pages, both roles
  const pages = {
    player: [
      "home",
      "table",
      "characters?id=livia&tab=summary",
      "characters?id=livia&tab=actions",
      "characters?id=livia&tab=inventory",
      "characters?id=livia&tab=spells",
      "characters?id=livia&tab=story",
      "characters?id=livia&tab=features",
    ],
    dm: [
      "home",
      "table",
      "preparation",
      "preparation?tab=special-moves",
      "characters?id=doran&tab=summary",
      "characters?id=doran&tab=actions",
      "characters?id=doran&tab=inventory",
      "characters?id=livia&tab=spells",
    ],
  };
  const tabs = { player: ["dice-tray"], dm: ["dice-tray", "special-moves-rules"] };
  const before = { console: desk.log.console.length, errors: desk.log.pageErrors.length };
  const visited = [];
  for (const role of ["player", "dm"]) {
    await setRole(page, role);
    for (const target of pages[role]) {
      await page.goto(base + "#" + target);
      await page.locator("#content").waitFor();
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      check(overflow <= 0, `Overflow ${overflow}px on #${target} (${role})`);
      const fell = await page.evaluate(() => location.hash);
      check(fell === "#" + target, `#${target} (${role}) fell back to ${fell}`);
      visited.push(`${role}:${target}`);
    }
    await goTable(page);
    for (const id of tabs[role]) {
      await reachTab(page, id);
      const text = await page.locator("#table-sidebar-panel").innerText();
      check(text.trim().length > 20, `${role}: the ${id} tab renders an empty panel`);
      visited.push(`${role}:table›${id}`);
    }
    await reachTab(page, "creature");
    if (role === "player")
      check(
        !(await page.locator('[data-table-drawer="special-moves-rules"]').count()),
        "The player sees the DM's movement rules tab",
      );
  }
  const pageConsole = desk.log.console.slice(before.console).filter((m) => !notBuilt404(m));
  const pageErrors = desk.log.pageErrors.slice(before.errors);
  out.pages = { visited, pageConsole, pageErrors };
  check(!pageErrors.length, "Page errors on wave pages: " + pageErrors.join("; "));
  check(
    !pageConsole.length,
    "Console errors/warnings on wave pages: " + JSON.stringify(pageConsole),
  );
  passed.push(
    `${visited.length} visits (player: Table, sheet Summary/Actions/Inventory/Spells/Story/Features, Dice tab; DM: Table, Preparation and «Movimento e griglia», Doran's Summary/Actions/Inventory, Livia's Spells, Dice and Movement rules tabs): 0 page errors, 0 console errors or warnings, no fallback route, no horizontal overflow at 1440`,
  );
  await page.goto(base + "#home");
  await setRole(page, "player");

  // ------------------------------------------------------------------ 2. "Cosa è pronto"
  await page.getByRole("button", { name: "Cosa è pronto", exact: true }).click();
  const report = page.locator("#dialog .ext-report");
  await report.waitFor();
  const reportData = await report.evaluate((el) => {
    const summary = el.querySelector("p").textContent;
    const groups = {};
    for (const h of el.querySelectorAll("h4")) {
      const list = h.nextElementSibling;
      groups[h.textContent] = [...list.children].map((li) =>
        li.textContent.replace(/\s+/g, " ").trim(),
      );
    }
    const details = [...el.querySelectorAll("details")].map((d) => ({
      summary: d.querySelector("summary").textContent,
      rows: [...d.querySelectorAll("li")].map((li) => li.textContent.replace(/\s+/g, " ").trim()),
    }));
    return { summary, groups, details };
  });
  out.report = reportData;
  const ready = reportData.groups["Pronte"] ?? [];
  const failedGroup = Object.keys(reportData.groups).find((k) => k.startsWith("Con errori"));
  check(!failedGroup, "Areas with errors: " + JSON.stringify(reportData.groups[failedGroup]));
  out.waveRows = {};
  for (const [id, code] of Object.entries(WAVE)) {
    const row = ready.find((r) => r.startsWith(code + " ·"));
    check(row && row.includes("attiva"), "W2b1 area not listed as ready: " + id);
    out.waveRows[code] = row;
  }
  const warnings = reportData.details.find((d) => d.summary.startsWith("Avvisi circoscritti"));
  const withWarnings = ready.filter((row) => row.includes("avvis"));
  check(
    !warnings && !withWarnings.length,
    "Contained warnings: " + JSON.stringify(warnings ?? withWarnings),
  );
  const m = reportData.summary.match(/(\d+) pronte · (\d+) da costruire · (\d+) con errori/);
  check(
    m && Number(m[1]) + Number(m[2]) === planned.length && m[3] === "0",
    "Report summary: " + reportData.summary,
  );
  check(Number(m[2]) === missingIds.length, "Not-built count differs from 404s");
  await page.screenshot({ path: dir + "01-cosa-e-pronto-it-1440.png" });
  await report.locator("li", { hasText: "B33 ·" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: dir + "01b-report-w2b1-rows-it-1440.png" });
  passed.push(
    `"Cosa è pronto": ${reportData.summary}; the six W2b1 areas are listed as active (${Object.values(
      out.waveRows,
    )
      .map((r) => r.replace(/ · .*?— attiva · /, " "))
      .join("; ")}), none with contained warnings`,
  );
  await page.locator("#dialog footer [data-close]").click();

  // ------------------------------------------------------------------ 3. header and dock at 1440
  const headers = {};
  for (const role of ["player", "dm"]) {
    await setRole(page, role);
    headers["home-" + role] = await measureBar(page, ".app-header");
  }
  await goTable(page);
  const areaButtons = {};
  const docks = {};
  for (const role of ["player", "dm"]) {
    await setRole(page, role);
    headers["table-" + role] = await measureBar(page, ".app-header");
    headers["topline-" + role] = await measureBar(page, ".table-topline");
    areaButtons[role] = await page
      .locator(".app-header [data-table-drawer], .table-topline [data-table-drawer]")
      .count();
    docks[role] = await dockInfo(page);
  }
  await page.screenshot({ path: dir + "02-table-dm-it-1440.png" });
  out.desktop = { headers, docks };
  for (const [k, h] of Object.entries(headers)) {
    check(h, "Bar missing: " + k);
    check(
      !h.outside.length && !h.overlaps.length && h.overflow <= 0,
      `1440 ${k}: ` + JSON.stringify(h),
    );
  }
  for (const k of ["home-player", "home-dm", "table-player", "table-dm"])
    check(headers[k].rows === 1, `1440 ${k} header wraps: ${headers[k].rows} rows`);
  check(!areaButtons.player && !areaButtons.dm, "An area button in the header or top line");
  check(
    headers["topline-dm"].count === 4 && headers["topline-player"].count === 1,
    `Top line not core only: DM ${headers["topline-dm"].names}, player ${headers["topline-player"].names}`,
  );
  for (const role of ["player", "dm"]) {
    const d = docks[role];
    check(d.moves && d.dice, `${role} 1440: Moves or Roll dice missing from the action bar`);
    check(!d.small && d.overflow <= 0, `${role} 1440 dock: ${JSON.stringify(d)}`);
  }
  passed.push(
    `1440 IT out of combat: header one row (home ${headers["home-player"].count} controls, Table ${headers["table-dm"].count}); Table top line only core commands (DM ${headers["topline-dm"].count}, player ${headers["topline-player"].count}); no area button in the header or top line; action bar ${docks.player.rows} row(s) of commands (${docks.player.names.join(", ")}), height ${docks.player.height} px, page scroll ${docks.player.pageScroll} px; nothing outside, overlapping, overflowing or under 40 px`,
  );

  // ------------------------------------------------------------------ 4. entry points at 1440
  const entry = { tabs: {}, tools: {}, prep: {}, menu: {}, creature: {}, sheet: {}, dock: {} };
  for (const role of ["player", "dm"]) {
    await setRole(page, role);
    await goTable(page);
    entry.tabs[`${role}:dice-tray`] = await reachTab(page, "dice-tray");
    await reachTab(page, "creature");
    if (role === "dm")
      entry.tabs["dm:special-moves-rules"] = await reachTab(page, "special-moves-rules");
    await reachTab(page, "creature");
    // The dock's «Tira i dadi» opens the Dice tab (DDB-151), the action bar's «Mosse» its tray.
    await page.locator('.action-dock [data-table="dice"]').click();
    await page
      .locator('#table-sidebar-panel[data-table-panel="dice-tray"]')
      .waitFor({ timeout: 5000 });
    entry.dock[`${role}:dice`] = 1;
    await reachTab(page, "creature");
    await page.locator(".combat-bar [data-sm-tray]").click();
    await page.locator("#sm-tray").waitFor({ timeout: 5000 });
    entry.dock[`${role}:moves`] = 1;
    await page.keyboard.press("Escape");
    if (
      await page
        .locator("#sm-tray")
        .isVisible()
        .catch(() => false)
    )
      await page.locator(".combat-bar [data-sm-tray]").click();
    entry.tools[`${role}:ruler`] = await reachTool(page, "special-moves-ruler");
    check(entry.tools[`${role}:ruler`].group === "measure", "Two-tier ruler not in Measure");
    // Token menu (B12) on Livia: «Punti ferita…» of B33.
    await page.locator("#battle-map [data-actor='livia']").click({ button: "right" });
    await page.locator(".token-menu").first().waitFor();
    const own = await page
      .locator(".token-menu [data-token-menu-item]")
      .evaluateAll((els) => els.map((el) => el.dataset.tokenMenuItem));
    const ownBox = await page.locator(".token-menu").first().boundingBox();
    check(own.includes("damage-tray-hp"), `${role}: «Punti ferita…» not in Livia's token menu`);
    entry.menu[`${role}:livia`] = {
      items: own.length,
      hpAt: own.indexOf("damage-tray-hp") + 1,
      inViewport: ownBox.y >= 0 && ownBox.y + ownBox.height <= 900,
    };
    await page.keyboard.press("Escape");
    // Creature tab with Livia selected: the wave's sections.
    await page.locator("#battle-map [data-actor='livia']").click();
    await reachTab(page, "creature");
    await page.waitForTimeout(200);
    entry.creature[role] = await creatureSlots(page);
    for (const id of ["damage-tray-hp", "inventory-plus-gear", "special-moves-panel"])
      check(entry.creature[role].includes(id), `${role}: Creature tab lacks ${id}`);
    // Sheet tabs and sections.
    const who = role === "dm" ? "doran" : "livia";
    entry.sheet[`${role}:inventory`] = await reachSheetTab(page, who, "inventory");
    entry.sheet[`${role}:spells`] = await reachSheetTab(page, "livia", "spells");
    await page.goto(base + `#characters?id=${who}&tab=summary`);
    await page.locator(".character-tabs").waitFor();
    for (const slot of ["sheet-section:damage-tray-sheet", "sheet-section:sheet-plus-bar"])
      check(
        await page.locator(`[data-ext-slot="${slot}"]`).first().isVisible(),
        `${role}: ${slot} not on ${who}'s Summary`,
      );
    await page.goto(base + `#characters?id=${who}&tab=actions`);
    await page.locator(".character-tabs").waitFor();
    for (const slot of [
      "sheet-section:dice-tray-sheet",
      "sheet-section:sheet-plus-derived",
      "sheet-section:special-moves-actions",
    ])
      check(
        await page.locator(`[data-ext-slot="${slot}"]`).first().isVisible(),
        `${role}: ${slot} not on ${who}'s Actions`,
      );
    entry.sheet[`${role}:strip`] = await page.evaluate(() => {
      const strip = document.querySelector(".character-tabs");
      const box = strip.getBoundingClientRect();
      const items = [...strip.querySelectorAll("[data-character-tab]")];
      return {
        count: items.length,
        hidden: items
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.left < box.left - 1 || r.right > box.right + 1;
          })
          .map((el) => el.dataset.characterTab),
      };
    });
  }
  await page.screenshot({ path: dir + "03-sheet-actions-dm-it-1440.png" });
  await setRole(page, "dm");
  entry.prep["special-moves"] = await reachPrep(page, "special-moves");
  await page.screenshot({ path: dir + "04-prep-movement-dm-it-1440.png" });
  out.entry1440 = entry;
  check(
    [
      ...Object.values(entry.tabs),
      ...Object.values(entry.sheet).filter((v) => typeof v === "number"),
      entry.prep["special-moves"],
    ].every((n) => n <= 2),
    "An entry point takes > 2 clicks at 1440",
  );
  passed.push(
    `1440 entry points: Dice tab player ${entry.tabs["player:dice-tray"]} / DM ${entry.tabs["dm:dice-tray"]} click(s), also from the dock's «Tira i dadi» (1); «Mosse» at the end of the action bar (1 click, both roles); Movement rules tab (DM only) ${entry.tabs["dm:special-moves-rules"]}; two-tier ruler in Measure (${entry.tools["player:ruler"].clicks} clicks); «Punti ferita…» in Livia's token menu (item ${entry.menu["player:livia"].hpAt} of ${entry.menu["player:livia"].items} for the player, ${entry.menu["dm:livia"].hpAt} of ${entry.menu["dm:livia"].items} for the DM, menu on screen: ${entry.menu["player:livia"].inViewport && entry.menu["dm:livia"].inViewport}); Creature tab on Livia: ${entry.creature.player.join(", ")}; sheet Inventory ${entry.sheet["player:inventory"]}/${entry.sheet["dm:inventory"]}, Spells ${entry.sheet["player:spells"]}/${entry.sheet["dm:spells"]} click(s) (${entry.sheet["player:strip"].count} tabs, off the strip: ${entry.sheet["player:strip"].hidden.join(", ") || "none"}); HP widget and mode bar on Summary, Rolls, derived values and generic actions on Actions; Preparation «Movimento e griglia» ${entry.prep["special-moves"]} click(s)`,
  );

  // ------------------------------------------------------------------ 5. combat at 1440
  await goTable(page);
  // Refreshed by R3 (27/09/2026): «Avvia combattimento» opens the start dialog at the Table
  // (P5 roll call: who fights, each d20 typed or rolled, «Inizia combattimento»), not the
  // Preparation encounter form any more.
  await page.getByRole("button", { name: "Avvia combattimento", exact: true }).click();
  const start = page.locator("#dialog");
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
  await page.locator("#battle-map").waitFor();
  await page.waitForTimeout(300);
  const fight = {};
  for (const role of ["dm", "player"]) {
    await setRole(page, role);
    fight[role] = await dockInfo(page);
    const d = fight[role];
    check(
      d.endTurn && d.endTurn.y + d.endTurn.h <= 900,
      `${role} 1440 combat: End turn off screen`,
    );
    check(d.moves && !d.small && d.overflow <= 0, `${role} 1440 combat dock: ${JSON.stringify(d)}`);
    // B61 audit: the dock's commands stay on one row in combat at 1440. B62: one BG3 hotbar
    // holds the actions, the quick bar and the turn commands — two short rows of commands
    // beside at most two rows of actions, End turn as tall as both (BG3). What stays
    // compact is the whole bottom: one bar, at most 120 px (the two B61 bars took 293 px).
    check(
      d.bars === 1 && d.height <= 120 && d.rows <= 2,
      `${role} 1440 combat: ${d.bars} bars, ${d.height} px, ${d.rows} rows of dock commands`,
    );
  }
  await page.screenshot({ path: dir + "05-combat-dock-player-it-1440.png" });
  out.combat1440 = fight;
  passed.push(
    `1440 IT in combat (Livia's turn): action bar ${fight.player.rows} row(s) of commands for the player, ${fight.dm.rows} for the DM (${fight.player.names.join(", ")}), height ${fight.player.height} px, page scroll ${fight.player.pageScroll} px; End turn on screen (y ${fight.player.endTurn.y}), Moves and Roll dice present, nothing under 40 px`,
  );
  await desk.context.close();

  // ------------------------------------------------------------------ 6. phone 390, EN and IT
  out.phone = {};
  for (const lang of ["en", "it"]) {
    const phone = await open({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const p = phone.page;
    await p.goto(base);
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.locator(".app-header").waitFor();
    if (lang === "en") {
      await p.locator('.service-nav [data-service="preferences"]').tap();
      await p.locator('#dialog [name="lang"]').selectOption("en");
      await p.locator("#dialog button[type=submit]").tap();
      await p.waitForTimeout(200);
    }
    await quiet(p, true);
    const bars = {};
    for (const role of ["player", "dm"]) {
      await setRole(p, role);
      bars["home-" + role] = await measureBar(p, ".app-header");
    }
    await goTable(p, true);
    const reach = {},
      docks390 = {};
    for (const role of ["player", "dm"]) {
      await setRole(p, role);
      bars["table-" + role] = await measureBar(p, ".app-header");
      bars["topline-" + role] = await measureBar(p, ".table-topline");
      docks390[role] = await dockInfo(p);
      reach[`${role}:dice-tray`] = await reachTab(p, "dice-tray", true);
      for (const sel of [
        '.table-tabs [data-table-tab="chat"]', // B62: Dice is a sub-tab of Chat
        "[data-table-map-link]",
        "[data-table-panels]",
      ])
        check(await seen(p, sel), `390 ${lang} ${role}: ${sel} not seen after the jump`);
      await press(p.locator("[data-table-map-link]"), true);
      await p.waitForTimeout(150);
      if (role === "dm") {
        reach["dm:special-moves-rules"] = await reachTab(p, "special-moves-rules", true);
        await press(p.locator("[data-table-map-link]"), true);
        await p.waitForTimeout(150);
      }
      reach[`${role}:ruler`] = (await reachTool(p, "special-moves-ruler", true)).clicks;
      reach[`${role}:inventory`] = await reachSheetTab(
        p,
        role === "dm" ? "doran" : "livia",
        "inventory",
        true,
      );
      reach[`${role}:spells`] = await reachSheetTab(p, "livia", "spells", true);
      const overflowSheet = await p.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      );
      check(
        overflowSheet <= 0,
        `390 ${lang} ${role}: the Spells tab overflows by ${overflowSheet}px`,
      );
      await goTable(p, true);
    }
    await p.screenshot({ path: dir + `06-table-dm-${lang}-390.png` });
    for (const [k, h] of Object.entries(bars)) {
      check(h, "Bar missing: " + k);
      check(
        !h.outside.length && !h.overlaps.length && h.overflow <= 0,
        `390 ${lang} ${k}: ` + JSON.stringify(h),
      );
    }
    for (const role of ["player", "dm"]) {
      const d = docks390[role];
      check(
        d.moves && d.dice && d.overflow <= 0 && !d.small,
        `390 ${lang} ${role}: ${JSON.stringify(d)}`,
      );
      // «Mosse» stays pinned at the end of the sideways action strip, inside the screen.
      check(
        d.moves.x >= 0 && d.moves.x + d.moves.w <= 390,
        `390 ${lang} ${role}: Moves off the strip`,
      );
    }
    // Refreshed by R3 (27/09/2026): a map tool on the phone is one tap more, the unfolding of
    // «Strumenti della mappa» (P6 TV-06, Owlbear's folded phone toolbar); the rest stay ≤ 2.
    check(
      Object.entries(reach).every(([key, n]) => n <= (key.endsWith(":ruler") ? 3 : 2)),
      `390 ${lang}: an entry point > 2 taps: ${JSON.stringify(reach)}`,
    );
    check(!phone.log.pageErrors.length, "Phone page errors: " + phone.log.pageErrors.join("; "));
    const phoneConsole = phone.log.console.filter(
      (msg) => !(msg.type === "error" && msg.text.startsWith("Failed to load resource")),
    );
    check(!phoneConsole.length, "Phone console: " + JSON.stringify(phoneConsole));
    const small = Object.fromEntries(
      Object.entries(bars)
        .filter(([, h]) => h.small.length)
        .map(([k, h]) => [k, h.small]),
    );
    out.phone[lang] = { bars, small, docks: docks390, reach };
    passed.push(
      `390 ${lang.toUpperCase()} touch: header ${bars["home-player"].rows} row(s) (${bars["home-player"].count} controls, ${bars["home-player"].height} px), Table ${bars["table-dm"].rows} row(s); action bar ${docks390.player.rows} row(s), ${docks390.player.height} px, Moves and Roll dice on screen; Dice tab ${reach["player:dice-tray"]}/${reach["dm:dice-tray"]} taps with the open tab, Map and All panels on screen; Movement rules (DM) ${reach["dm:special-moves-rules"]}; ruler ${reach["player:ruler"]}; sheet Inventory ${reach["player:inventory"]}/${reach["dm:inventory"]}, Spells ${reach["player:spells"]}/${reach["dm:spells"]} taps; no overflow, page or console errors${Object.keys(small).length ? "; under 40 px: " + JSON.stringify(small) : ""}`,
    );
    await phone.context.close();
  }
  return { passed, out };
};
