async (rootPage) => {
  // W2a1 integration shell check (B32, B35, B39, B42, B43, B44, B45): clean load (console,
  // page errors, failed requests), every wave page and Table tab for player and DM, the
  // "Cosa è pronto" registry report, header and Table top line density at 1440 and 390 (IT
  // and EN), and findability of the new entry points where the registry places them: Table
  // sidebar tabs (rail + "Tutti i pannelli"), map tool groups, campaign sections (rail +
  // "Tutte le sezioni"), the builder's creation methods. Synthetic data only; resets this
  // browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/W2a1-integ/shell/";
  const WAVE = {
    "combat-tracker": "B32",
    "fog-vision": "B35",
    "builder-plus": "B39",
    "world-map": "B42",
    quests: "B43",
    party: "B44",
    travel: "B45",
  };
  // The wave's Table sidebar tabs (placement "sidebar-tab", B61) and campaign sections.
  const TABS = {
    player: [
      "combat-tracker",
      "quests-tracker",
      "world-map-calendar",
      "travel",
      "fog-vision-panel",
    ],
    dm: [
      "combat-tracker",
      "quests-tracker",
      "party",
      "world-map-calendar",
      "travel",
      "fog-vision-panel",
    ],
  };
  const SECTIONS = ["group", "quests", "quests-archive", "world-map"];
  // The wave's map tools (DM): B35 in "Nebbia e visione", B35/B45 in "Strumenti del DM".
  const TOOLS = ["fog-vision", "fog-vision-lights", "fog-vision-barriers", "fog-vision-teleport"];
  const TOOLS_TRAVEL = ["travel-place", "travel-point"];
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
      const strip = el.closest(".table-tabs, .campaign-sidebar nav, .map-toolbar");
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
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
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
    return clicks;
  };
  // A campaign section: pressed where the rail/strip shows it (1), else from All sections (2).
  // B62: a section of a folded Kanka-style group: its group heading, then the section (2).
  const reachSection = async (p, id, touch = false) => {
    const sel = `.campaign-sidebar nav [data-campaign-tab="${id}"]`;
    const toggle = `.campaign-sidebar [data-campaign-group]:has([data-campaign-tab="${id}"]) [data-campaign-group-toggle]`;
    let clicks = 1;
    if (
      !(await seen(p, sel)) &&
      (await seen(p, toggle)) &&
      (await p.locator(toggle).getAttribute("aria-expanded")) === "false"
    ) {
      await press(p.locator(toggle), touch);
      clicks = 2;
    }
    if (await seen(p, sel)) await press(p.locator(sel), touch);
    else {
      await press(p.locator("[data-campaign-sections]"), touch);
      await press(p.locator(`#dialog [data-campaign-tab="${id}"]`), touch);
      clicks = 2;
    }
    await p.waitForFunction((t) => location.hash.includes("tab=" + t), id);
    return clicks;
  };

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
    "A W2a1 module is missing: " + missingIds.filter((id) => id in WAVE),
  );
  check(!(await page.locator("#ext-notice .ext-alert").count()), "Strip reports area warnings");
  passed.push(
    `Clean load IT 1440: 0 page errors, 0 console errors or warnings besides ${missingIds.length} resource 404s, each a planned area not built yet (B11 design); no other failed request; no area warning in the strip`,
  );

  // ------------------------------------------------------------------ 1b. wave pages, both roles
  const pages = {
    player: [
      "home",
      "campaign?tab=overview",
      "campaign?tab=group",
      "campaign?tab=quests",
      "campaign?tab=quests-archive",
      "campaign?tab=world-map",
      "builder-plus",
      "characters",
      "characters?id=livia",
      "characters?id=livia&tab=features",
      "characters?id=livia&tab=inventory",
      "notes",
    ],
    dm: [
      "home",
      "campaign?tab=overview",
      "campaign?tab=group",
      "campaign?tab=quests",
      "campaign?tab=quests-archive",
      "campaign?tab=world-map",
      "builder-plus",
      "preparation",
      "characters?id=livia&tab=features",
    ],
  };
  const before = { console: desk.log.console.length, errors: desk.log.pageErrors.length };
  const visited = [];
  for (const role of ["player", "dm"]) {
    await setRole(page, role);
    for (const target of pages[role]) {
      await page.goto(base + "#" + target);
      await page.locator("#content").waitFor();
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      check(overflow <= 0, `Overflow ${overflow}px on #${target} (${role})`);
      const fell = await page.evaluate(() => location.hash);
      visited.push(`${role}:${target}${fell === "#" + target ? "" : " → " + fell}`);
    }
    // Every wave tab of the Table's sidebar, opened and rendered.
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await quiet(page);
    for (const id of TABS[role]) {
      await reachTab(page, id);
      const text = await page.locator("#table-sidebar-panel").innerText();
      check(text.trim().length > 20, `${role}: tab ${id} renders an empty panel`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      check(overflow <= 0, `Overflow ${overflow}px on the ${id} tab (${role})`);
      visited.push(`${role}:table›${id}`);
    }
    await reachTab(page, "creature");
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
    `${visited.length} visits (player ${pages.player.length} pages + ${TABS.player.length} Table tabs, DM ${pages.dm.length} + ${TABS.dm.length}: campaign Group/Quests/Archive/World, builder methods, sheet, preparation, notes, home, every wave Table tab): 0 page errors, 0 console errors or warnings, no horizontal overflow at 1440`,
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
    check(row && row.includes("attiva"), "W2a1 area not listed as ready: " + id);
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
  await report.locator("li", { hasText: "B32 ·" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: dir + "01b-report-w2a1-rows-it-1440.png" });
  passed.push(
    `"Cosa è pronto": ${reportData.summary}; the seven W2a1 areas are listed as active (${Object.values(
      out.waveRows,
    )
      .map((r) => r.replace(/ · .*?— attiva · /, " "))
      .join("; ")}), none with contained warnings`,
  );
  await page.locator("#dialog footer [data-close]").click();

  // ------------------------------------------------------------------ 3. header at 1440
  const headers = {};
  for (const role of ["player", "dm"]) {
    await setRole(page, role);
    headers["home-" + role] = await measureBar(page, ".app-header");
  }
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await quiet(page);
  const areaButtons = {};
  for (const role of ["player", "dm"]) {
    await setRole(page, role);
    headers["table-" + role] = await measureBar(page, ".app-header");
    headers["topline-" + role] = await measureBar(page, ".table-topline");
    areaButtons[role] = await page
      .locator(".app-header [data-table-drawer], .table-topline [data-table-drawer]")
      .count();
  }
  await page.screenshot({ path: dir + "02-table-dm-it-1440.png" });
  out.desktop = headers;
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
  passed.push(
    `1440 IT: header one row (home ${headers["home-player"].count} controls, Table ${headers["table-dm"].count}); Table top line only core commands (DM ${headers["topline-dm"].count}: ${headers["topline-dm"].names.join(", ")}; player ${headers["topline-player"].count}); no area button in the header or top line; nothing outside, overlapping or overflowing`,
  );

  // ------------------------------------------------------------------ 4. entry points at 1440
  const entry = { rail: {}, tools: {}, campaign: {} };
  for (const role of ["player", "dm"]) {
    await setRole(page, role);
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await quiet(page);
    // The rail at rest (Creature open): which tabs are shown without scrolling it.
    const all = await page
      .locator(".table-tabs [role=tab]")
      .evaluateAll((els) => els.map((el) => el.dataset.tableTab));
    const shown = [];
    for (const id of all)
      if (await seen(page, `.table-tabs [data-table-tab="${id}"]`)) shown.push(id);
    const clicks = {};
    for (const id of TABS[role]) clicks[id] = await reachTab(page, id);
    check(
      Object.values(clicks).every((n) => n <= 2),
      `${role} 1440: a wave tab takes more than 2 clicks`,
    );
    entry.rail[role] = {
      tabs: all.length,
      shownAtRest: shown.length,
      beyondRail: all.filter((id) => !shown.includes(id)),
      waveClicks: clicks,
    };
    await reachTab(page, "creature");
  }
  // Map tools of the wave (DM): the tool seen, or its group then the tool (≤ 2).
  await setRole(page, "dm");
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  for (const tool of [...TOOLS, ...TOOLS_TRAVEL]) {
    const chip = `.map-toolbar [data-tool="${tool}"]`;
    check(await page.locator(chip).count(), `DM tool ${tool} missing`);
    let n = 1;
    if (!(await page.locator(chip).isVisible())) {
      const group = await page.evaluate(
        (s) =>
          document
            .querySelector(s)
            ?.closest(".map-tool-cluster")
            ?.querySelector("[data-tool-group]")?.dataset.toolGroup ?? null,
        chip,
      );
      check(group, `DM tool ${tool} has no group`);
      await page.locator(`[data-tool-group="${group}"]`).click();
      n = 2;
    }
    await page.locator(chip).click();
    await page.locator(`${chip}[aria-pressed="true"]`).waitFor({ timeout: 5000 });
    entry.tools[tool] = n;
    await page.keyboard.press("Escape");
    await page
      .locator('.map-toolbar [data-tool="move"]')
      .click({ force: true })
      .catch(() => {});
  }
  await setRole(page, "player");
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  check(
    !(await page
      .locator('.map-toolbar [data-tool^="fog-vision"], .map-toolbar [data-tool^="travel-"]')
      .count()),
    "Player sees a DM map tool of the wave",
  );
  // Campaign sections of the wave: in the rail (1 click) or All sections (2).
  for (const role of ["player", "dm"]) {
    await setRole(page, role);
    await page.goto(base + "#campaign?tab=overview");
    await page.locator(".campaign-sidebar nav").waitFor();
    await quiet(page);
    const ids = await page
      .locator(".campaign-sidebar nav [data-campaign-tab]")
      .evaluateAll((els) => els.map((el) => el.dataset.campaignTab));
    const inView = await page
      .locator(".campaign-sidebar nav [data-campaign-tab]")
      .evaluateAll(
        (els) =>
          els.filter(
            (el) => el.checkVisibility() && el.getBoundingClientRect().bottom <= innerHeight,
          ).length,
      );
    const clicks = {};
    for (const id of SECTIONS) {
      check(ids.includes(id), `${role}: campaign section ${id} missing`);
      await page.goto(base + "#campaign?tab=overview");
      await page.locator(".campaign-sidebar nav").waitFor();
      clicks[id] = await reachSection(page, id);
      check(clicks[id] <= 2, `${role}: ${id} takes more than 2 clicks`);
    }
    entry.campaign[role] = { sections: ids.length, inViewport: inView, clicks };
  }
  // B39: the creation methods open from the builder's first step (Characters → Create).
  await setRole(page, "player");
  await page.goto(base + "#home");
  await page.locator('.app-header [data-nav="characters"]').click();
  await page.getByRole("button", { name: "Crea personaggio", exact: true }).first().click();
  await page.getByRole("heading", { name: "Come vuoi creare il personaggio?" }).waitFor();
  for (const name of ["Percorso rapido", "Personaggi pronti"])
    check(
      await page.getByRole("button", { name, exact: true }).count(),
      `Builder method ${name} not offered`,
    );
  entry.builder =
    "Home → Personaggi → Crea personaggio → methods (Percorso rapido, Personaggi pronti)";
  // Integration fix (B27 × B61): a rail tab opened from the keyboard keeps the focus (WAI-ARIA
  // tabs), Tab then enters the open panel; a pointer press on Safety still focuses its cards.
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await quiet(page);
  const focusInfo = () =>
    page.evaluate(() => {
      const a = document.activeElement;
      return {
        tab: a?.dataset?.tableTab ?? null,
        inPanel: Boolean(a?.closest?.("#table-sidebar-panel")),
        cards: Boolean(a?.classList?.contains("safety-cards")),
      };
    });
  await reachTab(page, "creature");
  await page.locator('.table-tabs [data-table-tab="creature"]').focus();
  await page.keyboard.press("End");
  const lastTab = (await focusInfo()).tab;
  await page.keyboard.press("Enter");
  await page.locator(`.table-tabs [data-table-tab="${lastTab}"][aria-selected="true"]`).waitFor();
  await page.waitForTimeout(300);
  check((await focusInfo()).tab === lastTab, `Enter on ${lastTab}: the focus left the tab`);
  await page.keyboard.press("Home");
  check((await focusInfo()).tab === "creature", "Home did not move to the Creature tab");
  await page.keyboard.press("End");
  await page.keyboard.press("Tab");
  check((await focusInfo()).inPanel, "Tab from the tab list did not enter the open panel");
  await reachTab(page, "creature");
  await reachTab(page, "safety"); // B62: the Chat tab, then its Safety sub-tab (pointer)
  await page.waitForFunction(() => document.activeElement?.classList.contains("safety-cards"));
  entry.keyboard = `Enter on ${lastTab} keeps the focus on the tab, Home moves to Creature, Tab enters the open panel; a click on Safety focuses its signal cards`;
  out.entry1440 = entry;
  passed.push(
    `1440 entry points: Table rail player ${entry.rail.player.tabs} tabs (${entry.rail.player.shownAtRest} shown at rest), DM ${entry.rail.dm.tabs} (${entry.rail.dm.shownAtRest} shown; beyond the rail: ${entry.rail.dm.beyondRail.join(", ") || "none"}); wave tabs player ${JSON.stringify(entry.rail.player.waveClicks)}, DM ${JSON.stringify(entry.rail.dm.waveClicks)} clicks (1 rail, 2 All panels); DM map tools ${JSON.stringify(entry.tools)} clicks (group, tool), none shown to the player; campaign sections player ${entry.campaign.player.sections} (${entry.campaign.player.inViewport} in the 900 px viewport) and DM ${entry.campaign.dm.sections} (${entry.campaign.dm.inViewport}), Group/Quests/Archive/World ${JSON.stringify(entry.campaign.dm.clicks)} clicks; B39 creation methods at the builder's first step; keyboard: ${entry.keyboard}`,
  );
  await page.goto(base + "#campaign?tab=overview");
  await page
    .locator(".campaign-sidebar")
    .screenshot({ path: dir + "03-campaign-rail-it-1440.png" });
  await desk.context.close();

  // ------------------------------------------------------------------ 5. phone 390, EN and IT
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
    await p.goto(base + "#table");
    await p.locator("#battle-map").waitFor();
    await quiet(p, true);
    const tabs = {};
    for (const role of ["player", "dm"]) {
      await setRole(p, role);
      bars["table-" + role] = await measureBar(p, ".app-header");
      bars["topline-" + role] = await measureBar(p, ".table-topline");
      const clicks = {};
      for (const id of TABS[role]) {
        clicks[id] = await reachTab(p, id, true);
        const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        check(overflow <= 0, `390 ${lang} ${role}: overflow ${overflow}px on the ${id} tab`);
        // B61: after the jump, the open tab, Map and All panels are on screen.
        for (const sel of [
          `.table-tabs [data-table-tab="${await panelSection(p, id)}"]`, // B62: the panel's tab
          "[data-table-map-link]",
          "[data-table-panels]",
        ])
          check(await seen(p, sel), `390 ${lang} ${role} after ${id}: ${sel} not seen`);
      }
      tabs[role] = clicks;
      await p.screenshot({ path: dir + `04-table-${role}-${lang}-390.png` });
      await reachTab(p, "creature", true);
    }
    for (const [k, h] of Object.entries(bars)) {
      check(h, "Bar missing: " + k);
      check(
        !h.outside.length && !h.overlaps.length && h.overflow <= 0,
        `390 ${lang} ${k}: ` + JSON.stringify(h),
      );
    }
    const small = Object.fromEntries(
      Object.entries(bars)
        .filter(([, h]) => h.small.length)
        .map(([k, h]) => [k, h.small]),
    );
    check(!Object.keys(small).length, `390 ${lang}: targets under 40 px ` + JSON.stringify(small));
    const sections = {};
    for (const role of ["player", "dm"]) {
      await setRole(p, role);
      const clicks = {};
      for (const id of SECTIONS) {
        await p.goto(base + "#campaign?tab=overview");
        await p.locator(".campaign-sidebar nav").waitFor();
        await quiet(p, true);
        clicks[id] = await reachSection(p, id, true);
        check(clicks[id] <= 2, `390 ${lang} ${role}: ${id} takes more than 2 taps`);
        const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        check(overflow <= 0, `390 ${lang} ${role}: overflow ${overflow}px on ${id}`);
      }
      sections[role] = clicks;
    }
    await p.screenshot({ path: dir + `05-campaign-world-${lang}-390.png` });
    check(!phone.log.pageErrors.length, "Phone page errors: " + phone.log.pageErrors.join("; "));
    const phoneConsole = phone.log.console.filter(
      (msg) => !(msg.type === "error" && msg.text.startsWith("Failed to load resource")),
    );
    check(!phoneConsole.length, "Phone console: " + JSON.stringify(phoneConsole));
    out.phone[lang] = { bars, tabs, sections };
    passed.push(
      `390 ${lang.toUpperCase()} touch: header ${bars["home-player"].rows} row(s) / ${bars["home-player"].height} px at home (${bars["home-player"].count} controls), ${bars["table-dm"].rows} row(s) / ${bars["table-dm"].height} px at the Table; every wave Table tab in ≤ 2 taps (player ${JSON.stringify(tabs.player)}, DM ${JSON.stringify(tabs.dm)}), the open tab, Map and All panels on screen after each; wave campaign sections in ≤ 2 taps (${JSON.stringify(sections.dm)}); no overflow, nothing outside or overlapping, every header target ≥ 40 px`,
    );
    await phone.context.close();
  }
  return { passed, out };
};
