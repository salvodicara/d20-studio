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
  // W2b2 integration shell check (B41, B46, B47, B53, B57, B58): clean load (console, page
  // errors, failed requests), the wave's pages and Table tab for player and DM, the "Cosa è
  // pronto" registry report, header and Table top line density at 1440 and 390 (IT and EN),
  // and findability of the wave's entry points where the registry places them (B61): map
  // tools in their toolbar group (Regions: DM tools; Line of sight: Measure), the Scene tab
  // of the Table sidebar (rail or All panels), the quick bar row of the action bar, the
  // Knowledge section of the Creature tab, the token menu, the Preparation sections (strip or
  // "All sections") with Generate beside New scene and Generate encounter, the Archive's
  // «Elenco | Grafo» switch and the sheet's Custom actions. Synthetic data only; resets this
  // browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/W2b2-integ/shell/";
  const WAVE = {
    regions: "B41",
    knowledge: "B46",
    "scene-assets": "B47",
    quickbar: "B53",
    generators: "B57",
    "relations-graph": "B58",
  };
  // P7 / reconcile: the scenes area has no section of its own any more; its folders, objects,
  // levels and variants live in Preparation's one scene list and editor (reachScenes below).
  const PREP = ["regions"];
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
      // A group's tools stand beside the toolbar column: their own column is the strip.
      const strip = el.closest(
        ".map-subtools, .table-tabs, .campaign-sidebar nav, .map-toolbar, .prep-sections, .jp-subnav",
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
    return clicks;
  };
  // B62: every command of the token menu, the labelled submenus included.
  const allMenuItems = async (p) => {
    const menu = p.locator(".token-menu").first();
    const read = () =>
      menu
        .locator("[data-token-menu-item]")
        .evaluateAll((els) => els.map((el) => el.dataset.tokenMenuItem));
    const items = await read();
    const categories = await menu
      .locator("[data-token-menu-category]")
      .evaluateAll((els) => els.map((el) => el.dataset.tokenMenuCategory));
    for (const id of categories) {
      await menu.locator(`[data-token-menu-category="${id}"]`).click();
      items.push(...(await read()));
      await menu.locator("[data-token-menu-back]").click();
    }
    return { items, top: await menu.locator(".token-menu-list > li > [role=menuitem]").count() };
  };
  // B62: the quick bar is the second page of the one BG3 hotbar.
  const showQuickbar = async (p, touch = false) => {
    const pageTab = p.locator('[data-hotbar-page="quickbar"]');
    if ((await pageTab.count()) && (await pageTab.getAttribute("aria-selected")) !== "true")
      await press(pageTab, touch);
    await p.locator(".action-dock [data-qb]").first().waitFor();
  };
  // A map tool: seen in the toolbar (1), else its group then the tool (2).
  const reachTool = async (p, tool, touch = false) => {
    const chip = `.map-toolbar [data-tool="${tool}"]`;
    check(await p.locator(chip).count(), `tool ${tool} missing`);
    let n = 1;
    // P6 TV-06 (TouchVTT, Roll20 tablet): on a phone the tool columns fold into one «Strumenti
    // della mappa» button; unfold them with a tap first, as a user would (one tap more).
    const fold = p.locator('#content [data-map-tools-toggle][aria-expanded="false"]');
    if (await fold.isVisible().catch(() => false)) {
      await press(fold, touch);
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
    // The phone toolbar folds again once a tool is chosen (P6 TV-06): the chip stays pressed.
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
    // B62: a section is in the open group's strip, or is its group's only section.
    const sel = `.prep-sections [data-prep-section="${id}"], .prep-groups [data-prep-section="${id}"]`;
    const inAll = async () => {
      await press(p.locator("[data-prep-sections-all]"), touch);
      const found = await p.locator(`#dialog [data-prep-section-jump="${id}"]`).count();
      await p.keyboard.press("Escape");
      return found;
    };
    check((await p.locator(sel).count()) || (await inAll()), `preparation section ${id} missing`);
    const direct = await seen(p, sel);
    if (direct) await press(p.locator(sel), touch);
    else {
      const all = p.locator("[data-prep-sections-all]");
      check(
        await all.isVisible().catch(() => false),
        `preparation section ${id} is off the strip and no "All sections" is shown`,
      );
      await press(all, touch);
      await press(p.locator(`#dialog [data-prep-section-jump="${id}"]`), touch);
    }
    await p.waitForFunction((t) => location.hash.includes("tab=" + t), id);
    const active = `.prep-sections [data-prep-section="${id}"].active, .prep-groups [data-prep-section="${id}"].active`;
    await p.locator(active).first().waitFor();
    // B61: after the jump the open section is shown in the redrawn strip.
    check(await seen(p, active), `${id} off the strip`);
    return direct ? 1 : 2;
  };
  // P7 (one scene list and editor): the scenes area's content is where Preparation opens:
  // the list with its folders (1 press: Preparation itself), then a scene's «Oggetti» tab.
  const reachScenes = async (p, touch = false) => {
    await p.goto(base + "#preparation");
    await p.locator("[data-sa-scene-card]").first().waitFor();
    await quiet(p, touch);
    check(await p.locator("[data-sa-new-folder], [data-sa-drop]").count(), "scene folders missing");
    await press(p.locator("[data-prep-open]").first(), touch);
    const objects = p.locator('[data-prep-view="objects"]');
    await objects.waitFor();
    await press(objects, touch);
    await p.waitForFunction(() => location.hash.includes("tab=objects"));
    await p.goto(base + "#preparation");
    await p.locator("[data-sa-scene-card]").first().waitFor();
    return 1;
  };
  const stripReach = (page, selector, itemSelector) =>
    page.evaluate(
      ([sel, itemSel]) => {
        const strip = document.querySelector(sel);
        if (!strip) return null;
        const box = strip.getBoundingClientRect();
        const items = [...strip.querySelectorAll(itemSel)].filter((el) => el.checkVisibility());
        const shown = [],
          hidden = [];
        for (const el of items) {
          const r = el.getBoundingClientRect();
          const inside =
            r.left >= box.left - 1 &&
            r.right <= box.right + 1 &&
            r.right <= innerWidth + 1 &&
            r.left >= -1;
          const id =
            el.dataset.prepSection || el.dataset.tableTab || el.textContent.trim().slice(0, 30);
          (inside ? shown : hidden).push(id);
        }
        return {
          count: items.length,
          shown,
          hidden,
          scrollsX: strip.scrollWidth > strip.clientWidth + 1,
          small: items
            .map((el) => el.getBoundingClientRect())
            .filter((r) => r.height < 40 || r.width < 40).length,
        };
      },
      [selector, itemSelector],
    );
  // The action bar: height, the quick bar row inside the viewport, no sideways page scroll.
  const dock = (p) =>
    p.evaluate(() => {
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) };
      };
      const d = document.querySelector(".action-dock");
      const qb = document.querySelector(".action-dock [data-qb]");
      const slots = [...document.querySelectorAll(".action-dock [data-qb-slots] > *")].filter(
        (el) => el.checkVisibility(),
      );
      const strip = document.querySelector(".action-dock [data-qb-slots]");
      const sb = strip?.getBoundingClientRect();
      const inStrip = slots.filter((el) => {
        const r = el.getBoundingClientRect();
        return sb && r.left >= sb.left - 1 && r.right <= sb.right + 1;
      }).length;
      const map = document.querySelector("#battle-map")?.getBoundingClientRect();
      const db = d?.getBoundingClientRect();
      return {
        dock: box(d),
        quickbar: box(qb),
        qbInsideDock: Boolean(
          qb &&
          db &&
          qb.getBoundingClientRect().top >= db.top - 1 &&
          qb.getBoundingClientRect().bottom <= db.bottom + 1,
        ),
        slots: slots.length,
        slotsOnScreen: inStrip,
        smallSlots: slots.filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width < 40 || r.height < 40;
        }).length,
        mapVisible:
          map && db
            ? Math.round(Math.max(0, Math.min(map.bottom, db.top) - Math.max(map.top, 0)))
            : null,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });

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
    "A W2b2 module is missing: " + missingIds.filter((id) => id in WAVE),
  );
  check(!(await page.locator("#ext-notice .ext-alert").count()), "Strip reports area warnings");
  passed.push(
    `Clean load IT 1440: 0 page errors, 0 console errors or warnings besides ${missingIds.length} resource 404s (${missingIds.join(", ") || "none"}), each a planned area not built yet (B11 design); no other failed request; no area warning in the strip`,
  );

  // ------------------------------------------------------------------ 1b. wave pages, both roles
  const pages = {
    player: [
      "home",
      "table",
      "characters?id=livia&tab=actions",
      "campaign?tab=quests-archive&id=relations",
      "campaign?tab=quests-archive",
    ],
    dm: [
      "home",
      "table",
      "preparation",
      "preparation?tab=scene-assets",
      "preparation?tab=regions",
      "preparation?tab=encounter-builder",
      "characters?id=doran&tab=actions",
      "campaign?tab=quests-archive&id=relations",
    ],
  };
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
      visited.push(`${role}:${target}${fell === "#" + target ? "" : " → " + fell}`);
    }
    await goTable(page);
    await reachTab(page, "scene-assets-panel");
    const text = await page.locator("#table-sidebar-panel").innerText();
    check(text.trim().length > 20, `${role}: the Scene tab renders an empty panel`);
    visited.push(`${role}:table›scene-assets-panel`);
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
    `${visited.length} visits (player ${pages.player.length} pages + Scene tab, DM ${pages.dm.length} + Scene tab: Table, Preparation Scenes (list and editor)/Regions/Encounters, sheet Actions, Archive › Relations): 0 page errors, 0 console errors or warnings, no horizontal overflow at 1440`,
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
    check(row && row.includes("attiva"), "W2b2 area not listed as ready: " + id);
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
  await report.locator("li", { hasText: "B41 ·" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: dir + "01b-report-w2b2-rows-it-1440.png" });
  passed.push(
    `"Cosa è pronto": ${reportData.summary}; the six W2b2 areas are listed as active (${Object.values(
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
    await showQuickbar(page);
    docks[role] = await dock(page);
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
    check(
      d.quickbar && d.qbInsideDock,
      `${role} 1440: the quick bar is not a row of the action bar`,
    );
    check(
      d.slots === 10 && d.slotsOnScreen === 10,
      `${role} 1440: quick bar slots ${JSON.stringify(d)}`,
    );
    check(!d.smallSlots && d.overflow <= 0, `${role} 1440: dock ${JSON.stringify(d)}`);
  }
  passed.push(
    `1440 IT: header one row (home ${headers["home-player"].count} controls, Table ${headers["table-dm"].count}); Table top line only core commands (DM ${headers["topline-dm"].count}, player ${headers["topline-player"].count}); no area button in the header or top line; B53 quick bar is a row inside the action bar (dock ${docks.player.dock.h} px, row ${docks.player.quickbar.h} px, 10 of 10 slots on screen, none under 40 px); nothing outside, overlapping or overflowing`,
  );

  // ------------------------------------------------------------------ 4. entry points at 1440
  const entry = { tabs: {}, tools: {}, prep: {}, menu: {}, creature: {} };
  for (const role of ["player", "dm"]) {
    await setRole(page, role);
    await goTable(page);
    entry.tabs[role] = await reachTab(page, "scene-assets-panel");
    await reachTab(page, "creature");
    entry.tools[`${role}:knowledge-los`] = await reachTool(page, "knowledge-los");
    check(entry.tools[`${role}:knowledge-los`].group === "measure", "LOS tool not in Measure");
    if (role === "dm") {
      entry.tools["dm:regions"] = await reachTool(page, "regions");
      check(entry.tools["dm:regions"].group === "dm", "Regions tool not in DM tools");
    } else
      check(
        !(await page.locator('.map-toolbar [data-tool="regions"]').count()),
        "Player sees the Regions tool",
      );
    // Token menu (B12) on the goblin: Examine for both roles; the DM hides its identity.
    const sentinel = page.locator("#battle-map [data-actor='goblin-1']");
    await sentinel.click({ button: "right" });
    await page.locator(".token-menu").first().waitFor();
    const menuBox = await page.locator(".token-menu").first().boundingBox();
    const { items } = await allMenuItems(page);
    check(items.includes("knowledge-examine"), `${role}: no Examine on the goblin`);
    if (role === "dm") check(items.includes("knowledge-conceal"), "DM: no Hide identity");
    entry.menu[`${role}:goblin`] = {
      items: items.length,
      wave: items.filter((i) => /^(knowledge|regions|scene-assets)/.test(i)),
      inViewport: menuBox.y >= 0 && menuBox.y + menuBox.height <= 900,
    };
    await page.keyboard.press("Escape");
    // Own creature: Hide, Search and Search for traps.
    await page.locator("#battle-map [data-actor='livia']").click({ button: "right" });
    await page.locator(".token-menu").first().waitFor();
    const ownBox = await page.locator(".token-menu").first().boundingBox();
    const { items: own, top: ownTop } = await allMenuItems(page);
    // B62: one Search action (SRD 5.2.1 EN 187 / IT 212) — B46's «Cerca» also checks B41's
    // traps, so «Cerca trappole» is no longer a second command.
    for (const id of ["knowledge-hide", "knowledge-search"])
      check(own.includes(id), `${role}: ${id} not in Livia's token menu`);
    check(!own.includes("regions-search"), `${role}: a second Search in Livia's token menu`);
    check(ownTop <= 12, `${role}: ${ownTop} top-level commands in Livia's token menu`);
    entry.menu[`${role}:livia`] = {
      items: own.length,
      wave: own.filter((i) => /^(knowledge|regions|scene-assets)/.test(i)),
      inViewport: ownBox.y >= 0 && ownBox.y + ownBox.height <= 900,
    };
    check(entry.menu[`${role}:livia`].inViewport, `${role}: Livia's token menu off screen`);
    await page.keyboard.press("Escape");
    // Creature tab: the Knowledge section on the selected goblin.
    await sentinel.click();
    await reachTab(page, "creature");
    await page.locator("#table-sidebar-panel [data-knowledge-panel]").waitFor({ timeout: 5000 });
    entry.creature[role] = await page.evaluate(() =>
      [...document.querySelectorAll("#table-sidebar-panel [data-ext-slot^='table-panel:']")]
        .filter((el) => el.innerHTML.trim())
        .map((el) => el.dataset.extSlot.replace("table-panel:", "")),
    );
  }
  await page.screenshot({ path: dir + "03-creature-goblin-dm-it-1440.png" });
  // Preparation (DM): the wave's sections, Generate beside New scene, Generate encounter.
  await setRole(page, "dm");
  await page.goto(base + "#preparation");
  await page.locator(".prep-sections").waitFor();
  const prepStrip = await stripReach(page, ".prep-sections", "[data-prep-section]");
  out.prepStrip1440 = prepStrip;
  const genScene = page.locator('.page-heading [data-prep-command="generators.open"]');
  check(await genScene.isVisible(), "Genera… not beside Nuova scena");
  check(
    await page.locator(".page-heading [data-prep-new]").isVisible(),
    "Nuova scena missing beside Genera…",
  );
  await page.locator(".prep-sections").screenshot({ path: dir + "04-prep-strip-dm-it-1440.png" });
  entry.prep["scene-assets"] = await reachScenes(page);
  for (const id of PREP) entry.prep[id] = await reachPrep(page, id);
  // Every section of the strip is reachable in ≤ 2 clicks (strip or All sections).
  for (const id of prepStrip.hidden) entry.prep[id] = await reachPrep(page, id);
  entry.prep["encounter-builder"] = await reachPrep(page, "encounter-builder");
  check(
    await page.locator('.page-heading [data-prep-command="generators.encounter"]').isVisible(),
    "Genera incontro… not in the Encounters heading",
  );
  check(
    Object.values(entry.prep).every((n) => n <= 2),
    "A preparation section takes > 2 clicks",
  );
  // Archive › Relations › Graph (both roles): campaign rail, the Relations part, the switch.
  for (const role of ["player", "dm"]) {
    await setRole(page, role);
    await page.goto(base + "#campaign?tab=overview");
    await page.locator(".campaign-sidebar nav").waitFor();
    await openCampaignSection(page, "quests-archive"); // B62: the «Racconto» group
    await page.locator('[data-jp-sub="relations"]').click();
    await page.locator('[data-rg-view="graph"]').click();
    await page.locator('[data-rg-view="graph"][aria-pressed="true"]').waitFor();
    await page.locator('[data-rg-view="list"]').click();
    await page.locator('[data-rg-view="list"][aria-pressed="true"]').waitFor();
    entry[`relations-${role}`] = 3;
    // The sheet's Custom actions (B53) on the Actions tab.
    await page.goto(base + `#characters?id=${role === "dm" ? "doran" : "livia"}&tab=actions`);
    await page
      .locator('[data-ext-slot="sheet-section:quickbar-custom"]')
      .first()
      .waitFor({ state: "attached" });
    entry[`custom-actions-${role}`] = await page
      .locator('[data-ext-slot="sheet-section:quickbar-custom"]')
      .first()
      .evaluate((el) => el.innerText.trim().split("\n")[0]);
  }
  out.entry1440 = entry;
  passed.push(
    `1440 entry points: Scene tab player ${entry.tabs.player} / DM ${entry.tabs.dm} click(s); Line of sight in Measure (${entry.tools["player:knowledge-los"].clicks} clicks, both roles), Regions in DM tools (${entry.tools["dm:regions"].clicks} clicks, none for the player); token menu goblin player ${entry.menu["player:goblin"].items} items (${entry.menu["player:goblin"].wave.join(", ")}), DM ${entry.menu["dm:goblin"].items}; Livia ${entry.menu["player:livia"].items}/${entry.menu["dm:livia"].items} items with Hide and one Search (B62), inside the viewport; Creature tab on the goblin: ${entry.creature.player.join(", ")}; Preparation strip ${prepStrip.count} sections (${prepStrip.shown.length} shown, off the strip: ${prepStrip.hidden.join(", ") || "none"}), ${Object.entries(
      entry.prep,
    )
      .map(([k, v]) => `${k} ${v}`)
      .join(
        ", ",
      )} click(s); Genera… beside Nuova scena and Genera incontro… in Encounters; Archive › Relations › Graph in 3 clicks; Custom actions on the sheet's Actions tab («${entry["custom-actions-player"]}»)`,
  );
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
    await goTable(p, true);
    const tabs = {},
      tools = {},
      docks390 = {};
    for (const role of ["player", "dm"]) {
      await setRole(p, role);
      bars["table-" + role] = await measureBar(p, ".app-header");
      bars["topline-" + role] = await measureBar(p, ".table-topline");
      await showQuickbar(p, true);
      docks390[role] = await dock(p);
      tabs[role] = await reachTab(p, "scene-assets-panel", true);
      // B61: after the jump, the open tab, Map and All panels are on screen.
      for (const sel of [
        '.table-tabs [data-table-tab="scene"]', // B62: Scene is a tab with the Scene panel
        "[data-table-map-link]",
        "[data-table-panels]",
      ])
        check(await seen(p, sel), `390 ${lang} ${role}: ${sel} not seen after the jump`);
      await press(p.locator("[data-table-map-link]"), true);
      await p.waitForTimeout(150);
      tools[`${role}:knowledge-los`] = (await reachTool(p, "knowledge-los", true)).clicks;
      if (role === "dm") tools["dm:regions"] = (await reachTool(p, "regions", true)).clicks;
    }
    await p.screenshot({ path: dir + `05-table-dm-${lang}-390.png` });
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
        d.quickbar && d.qbInsideDock && d.overflow <= 0,
        `390 ${lang} ${role}: ${JSON.stringify(d)}`,
      );
      check(!d.smallSlots, `390 ${lang} ${role}: a quick bar slot under 40 px`);
    }
    check(
      Object.values(tabs).every((n) => n <= 2),
      `390 ${lang}: Scene tab > 2 taps`,
    );
    // P6 TV-06: the folded phone toolbar adds its unfolding tap (TouchVTT's tool drawer).
    check(
      Object.values(tools).every((n) => n <= 3),
      `390 ${lang}: a wave tool > 3 taps`,
    );
    // Preparation on the phone (DM): every section in ≤ 2 taps.
    await setRole(p, "dm");
    await p.goto(base + "#preparation");
    await p.locator(".prep-sections").waitFor();
    const strip390 = await stripReach(p, ".prep-sections", "[data-prep-section]");
    await p.screenshot({ path: dir + `06-prep-dm-${lang}-390.png` });
    const prep = {};
    prep["scene-assets"] = await reachScenes(p, true);
    for (const id of PREP) prep[id] = await reachPrep(p, id, true);
    check(
      Object.values(prep).every((n) => n <= 2),
      `390 ${lang}: a wave section > 2 taps`,
    );
    await p.screenshot({ path: dir + `07-prep-regions-dm-${lang}-390.png` });
    // Archive › Relations › Graph on the phone (player).
    await setRole(p, "player");
    await p.goto(base + "#campaign?tab=quests-archive&id=relations");
    await p.locator('[data-rg-view="graph"]').tap();
    await p.locator('[data-rg-view="graph"][aria-pressed="true"]').waitFor();
    const overflowGraph = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(overflowGraph <= 0, `390 ${lang}: the graph overflows by ${overflowGraph}px`);
    await p.locator('[data-rg-view="list"]').tap();
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
    out.phone[lang] = { bars, small, docks: docks390, tabs, tools, strip: strip390, prep };
    passed.push(
      `390 ${lang.toUpperCase()} touch: header ${bars["home-player"].rows} row(s) (${bars["home-player"].count} controls), Table ${bars["table-dm"].rows} row(s); action bar ${docks390.player.dock.h} px with the quick bar row (${docks390.player.slotsOnScreen} of 10 slots on screen, the rest in its sideways strip; map visible ${docks390.player.mapVisible} px above the bar); Scene tab ${JSON.stringify(tabs)} taps with the open tab, Map and All panels on screen; Line of sight / Regions ${JSON.stringify(tools)} taps; Preparation strip ${strip390.count} sections (${strip390.shown.length} on screen), Scene list and editor ${prep["scene-assets"]} / Regions ${prep.regions} taps; Graph switch without overflow; no page or console errors${Object.keys(small).length ? "; under 40 px: " + JSON.stringify(small) : ""}`,
    );
    await phone.context.close();
  }
  return { passed, out };
}
