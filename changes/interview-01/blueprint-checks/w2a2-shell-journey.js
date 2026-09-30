async (rootPage) => {
  // W2a2 integration shell check (B48–B52, B54, B55): clean load (console, page errors,
  // failed requests), every wave page for player and DM, the "Cosa è pronto" registry report,
  // header and Table top line density at 1440 and 390 (IT and EN), and findability of the new
  // entry points where the registry places them: campaign sections (strip + "Tutte le sezioni"),
  // sheet tabs, Library sections, the offline header service. Synthetic data only; resets this
  // browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/W2a2-integ/shell/";
  const WAVE = {
    "homebrew-editor": "B48",
    adventures: "B49",
    "campaign-data": "B50",
    "sessions-plus": "B51",
    offline: "B52",
    projects: "B54",
    integrations: "B55",
  };
  // New top-level campaign sections of this wave (the other campaign-section contributions of
  // B51 and B52 are embedded in the Sessions tab, a session row, a recap or a note).
  // Campaign data (B50) is for the campaign's managers only (DM or co-DM), like Kanka's export.
  const NEW_SECTIONS = ["projects", "homebrew-editor", "integrations", "campaign-data"];
  const newFor = (role) => NEW_SECTIONS.filter((id) => role === "dm" || id !== "campaign-data");
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
        log.console.push({
          type: m.type(),
          text: m.text().slice(0, 300),
          url: m.location()?.url,
        });
    });
    page.on("pageerror", (e) => log.pageErrors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) log.failed.push({ status: r.status(), url: r.url() });
    });
    return { context, page, log };
  };
  const quiet = async (p) => {
    for (const name of ["Ho capito", "Got it"]) {
      const tip = p.getByRole("button", { name, exact: true });
      if (await tip.isVisible().catch(() => false)) await tip.click();
    }
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

  // A strip's buttons: which are fully shown without scrolling the strip (sideways or down).
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
            r.top >= box.top - 1 &&
            r.bottom <= box.bottom + 1 &&
            r.right <= innerWidth + 1 &&
            r.left >= -1;
          const id =
            el.dataset.campaignTab || el.dataset.characterTab || el.textContent.trim().slice(0, 30);
          (inside ? shown : hidden).push(id);
        }
        return {
          count: items.length,
          shown,
          hidden,
          scrollsX: strip.scrollWidth > strip.clientWidth + 1,
          scrollsY: strip.scrollHeight > strip.clientHeight + 1,
          small: items
            .map((el) => el.getBoundingClientRect())
            .filter((r) => r.height < 40 || r.width < 40).length,
        };
      },
      [selector, itemSelector],
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
    "A W2a2 module is missing: " + missingIds.filter((id) => id in WAVE),
  );
  check(
    !(await page.locator("#ext-notice .ext-alert").count()),
    "Strip reports areas with warnings",
  );
  passed.push(
    `Clean load IT 1440: 0 page errors, 0 console errors or warnings besides ${missingIds.length} resource 404s, each a planned area not built yet (B11 design); no other failed request; no area warning in the strip`,
  );

  // ------------------------------------------------------------------ 1b. wave pages, both roles
  const pages = {
    player: [
      "home",
      "table",
      "campaign?tab=overview",
      "campaign?tab=sessions",
      "campaign?tab=projects",
      "campaign?tab=homebrew-editor",
      "campaign?tab=integrations",
      "campaign?tab=campaign-data",
      "homebrew-editor",
      "offline",
      "library",
      "library?tab=homebrew-editor",
      "characters?id=livia",
      "characters?id=livia&tab=features",
      "characters?id=livia&tab=actions",
      "characters?id=livia&tab=projects",
      "characters?id=livia&tab=projects-track",
      "notes",
    ],
    dm: [
      "home",
      "table",
      "campaign?tab=overview",
      "campaign?tab=sessions",
      "campaign?tab=projects",
      "campaign?tab=homebrew-editor",
      "campaign?tab=integrations",
      "campaign?tab=campaign-data",
      "homebrew-editor",
      "adventures",
      "offline",
      "preparation",
      "library?tab=homebrew-editor",
      "library?tab=adventures",
      "characters?id=livia&tab=projects",
      "characters?id=livia&tab=projects-track",
    ],
  };
  const before = {
    console: desk.log.console.length,
    errors: desk.log.pageErrors.length,
  };
  const visited = [];
  for (const role of ["player", "dm"]) {
    await page.locator("#demo-role").selectOption(role);
    for (const target of pages[role]) {
      await page.goto(base + "#" + target);
      await page.locator("#content").waitFor();
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      check(overflow <= 0, `Overflow ${overflow}px on #${target} (${role})`);
      const fell = await page.evaluate(() => location.hash);
      visited.push(`${role}:${target}${fell === "#" + target ? "" : " → " + fell}`);
    }
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
    `${visited.length} page visits (player ${pages.player.length}, DM ${pages.dm.length}: Table, campaign Sessions/Downtime/Homebrew/Integrations/Campaign data, homebrew editor, adventures, offline, Library sections, sheet tabs, preparation, notes, home): 0 page errors, 0 console errors or warnings, no horizontal overflow at 1440`,
  );
  await page.goto(base + "#home");
  await page.locator("#demo-role").selectOption("player");

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
    check(row && row.includes("attiva"), "W2a2 area not listed as ready: " + id);
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
  await report.screenshot({ path: dir + "01b-report-it-1440.png" });
  await report.locator("li", { hasText: "B48 ·" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: dir + "01c-report-w2a2-rows-it-1440.png" });
  passed.push(
    `"Cosa è pronto": ${reportData.summary}; the seven W2a2 areas are listed as active, none with contained warnings`,
  );
  await page.locator("#dialog footer [data-close]").click();

  // ------------------------------------------------------------------ 3. header at 1440
  const headers = {};
  for (const role of ["player", "dm"]) {
    await page.locator("#demo-role").selectOption(role);
    await page.waitForTimeout(150);
    headers["home-" + role] = await measureBar(page, ".app-header");
  }
  check(
    await page.locator('.service-nav [data-service="offline"]').isVisible(),
    "Offline indicator (B52) not in the header",
  );
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await quiet(page);
  for (const role of ["player", "dm"]) {
    await page.locator("#demo-role").selectOption(role);
    await page.waitForTimeout(150);
    headers["table-" + role] = await measureBar(page, ".app-header");
    headers["topline-" + role] = await measureBar(page, ".table-topline");
  }
  await page.screenshot({ path: dir + "02-table-dm-it-1440.png" });
  await page.goto(base + "#home");
  await page.locator(".app-header").waitFor();
  await page.locator(".app-header").screenshot({ path: dir + "03-header-it-1440.png" });
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
  passed.push(
    `1440 IT: header one row (home ${headers["home-player"].count} controls, Table ${headers["table-dm"].count}), offline indicator among the services; Table top line ${headers["topline-dm"].count} DM controls in ${headers["topline-dm"].rows} row(s); nothing outside, overlapping or overflowing`,
  );

  // ------------------------------------------------------------------ 4. entry points at 1440
  // Campaign strip: the new sections are in the strip or, at most, one click away in
  // "Tutte le sezioni" (≤ 2 clicks, B61 rule).
  const entry = {};
  const campaignReach = async (p, role, tag, tapOrClick = "click") => {
    await p.locator("#demo-role").selectOption(role);
    await p.goto(base + "#campaign?tab=overview");
    await p.locator(".campaign-sidebar nav").waitFor();
    await quiet(p);
    const reach = await stripReach(p, ".campaign-sidebar nav", "[data-campaign-tab]");
    // In the viewport without scrolling the page (desktop rail) or the strip (phone).
    const inView = await p.locator(".campaign-sidebar nav [data-campaign-tab]").evaluateAll((els) =>
      els
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
        })
        .map((el) => el.dataset.campaignTab),
    );
    const all = p.locator("[data-campaign-sections]");
    let clicks;
    if (await all.isVisible()) {
      // Phone: the sideways strip ends with "All sections" (B61, DDB-060).
      await all[tapOrClick]();
      await p.locator("#dialog [data-campaign-tab]").first().waitFor();
      const listed = await p
        .locator("#dialog [data-campaign-tab]")
        .evaluateAll((els) => els.map((el) => el.dataset.campaignTab));
      const missingNew = newFor(role).filter((id) => !listed.includes(id));
      check(!missingNew.length, `${tag} ${role}: not in "All sections": ${missingNew}`);
      await p.locator('#dialog [data-campaign-tab="integrations"]')[tapOrClick]();
      clicks = 2;
    } else {
      // Desktop: the vertical rail lists every section. B62: in Kanka-style groups; a
      // section of a folded group is one heading away (its group, then the section).
      const folded = (id) =>
        p
          .locator(
            `.campaign-sidebar [data-campaign-group]:has([data-campaign-tab="${id}"]) [data-campaign-group-toggle][aria-expanded="false"]`,
          )
          .count();
      const missingNew = [];
      for (const id of newFor(role))
        if (!reach.shown.includes(id) && !(await folded(id))) missingNew.push(id);
      check(!missingNew.length, `${tag} ${role}: not in the campaign rail: ${missingNew}`);
      clicks = 1;
      if (await folded("integrations")) {
        await p
          .locator(
            '.campaign-sidebar [data-campaign-group]:has([data-campaign-tab="integrations"]) [data-campaign-group-toggle]',
          )
          [tapOrClick]();
        clicks = 2;
      }
      await p.locator('.campaign-sidebar nav [data-campaign-tab="integrations"]')[tapOrClick]();
    }
    await p.waitForFunction(() => location.hash.includes("tab=integrations"));
    entry[`${tag}-campaign-${role}`] = {
      clicks,
      sections: reach.count,
      inViewport: inView.length,
      notInViewport: reach.shown.concat(reach.hidden).filter((id) => !inView.includes(id)),
      shownInStrip: reach.shown.length,
      newInStrip: newFor(role).filter((id) => reach.shown.includes(id)),
      newOnlyInDialog: newFor(role).filter((id) => !reach.shown.includes(id)),
      playerSeesCampaignData: reach.shown.concat(reach.hidden).includes("campaign-data"),
      scrollsX: reach.scrollsX,
      scrollsY: reach.scrollsY,
      small: reach.small,
    };
  };
  const sheetReach = async (p, role, tag, tapOrClick = "click") => {
    await p.locator("#demo-role").selectOption(role);
    await p.goto(base + "#characters?id=livia");
    await p.locator(".character-tabs").waitFor();
    await quiet(p);
    const reach = await stripReach(p, ".character-tabs", "[data-character-tab]");
    // B62: Downtime and the tracked gifts are sub-sections of D&D Beyond's Extras and
    // Features & Traits; the categories are in the strip.
    for (const id of ["extras", "features"])
      check(
        (await p.locator(`.character-tabs [data-character-tab="${id}"]`).count()) === 1,
        `${tag} ${role}: sheet category ${id} missing`,
      );
    const jump = p.locator("[data-character-tabs-all]");
    let clicks,
      kept = null,
      escapeKeeps = null;
    if (await jump.isVisible()) {
      // Phone: the strip scrolls sideways beside "All sections" (DDB-060, W2a2 integration).
      const box = await jump.boundingBox();
      check(
        box.width >= 40 && box.height >= 40 && box.x + box.width <= 391,
        `${tag}: quick-jump ${JSON.stringify(box)}`,
      );
      await jump[tapOrClick]();
      await p.locator("#dialog [data-character-tab]").first().waitFor();
      await p.keyboard.press("Escape");
      await p.waitForFunction(() => !document.querySelector("#dialog")?.open);
      escapeKeeps = !(await p.evaluate(() => location.hash.includes("tab=")));
      check(escapeKeeps, `${tag} ${role}: Escape navigated`);
      await jump[tapOrClick]();
      await p.locator("#dialog [data-character-tab]").first().waitFor();
      const listed = await p
        .locator("#dialog [data-character-tab]")
        .evaluateAll((els) =>
          els.map((el) => [el.dataset.characterTab, el.getAttribute("aria-current")]),
        );
      // B62: the list names every category's sub-sections, so it is at least the strip.
      check(
        listed.length >= reach.count,
        `${tag} ${role}: dialog lists ${listed.length} of ${reach.count}`,
      );
      check(
        listed.find(([id]) => id === "actions")?.[1] === "true",
        `${tag} ${role}: open section not marked`,
      );
      for (const id of ["projects", "projects-track"])
        check(
          listed.some(([k]) => k === id),
          `${tag} ${role}: ${id} not in the quick-jump`,
        );
      await p.locator('#dialog [data-character-tab="projects-track"]')[tapOrClick]();
      await p.waitForFunction(() => location.hash.includes("tab=projects-track"));
      await p.locator('.character-subtabs [data-character-tab="projects-track"].active').waitFor();
      // The chosen section is shown in the redrawn strip (B61 rule for strips); B62: its
      // category (Features & Traits) is the strip's open entry.
      const after = await stripReach(p, ".character-tabs", "[data-character-tab]");
      kept =
        after.shown.includes("features") &&
        (await p.locator('.character-tabs [data-character-tab="features"].active').count()) === 1;
      check(kept, `${tag} ${role}: the open section is off the strip`);
      clicks = 2;
    } else {
      check(
        reach.shown.includes("extras") && reach.shown.includes("features"),
        `${tag} ${role}: the sheet categories are not shown`,
      );
      // B62: Extras, then its Downtime sub-section.
      await p.locator('.character-tabs [data-character-tab="extras"]')[tapOrClick]();
      await p.locator('.character-subtabs [data-character-tab="projects"]')[tapOrClick]();
      await p.waitForFunction(() => location.hash.includes("tab=projects"));
      clicks = 2;
    }
    entry[`${tag}-sheet-${role}`] = {
      clicks,
      tabs: reach.count,
      shown: reach.shown.length,
      hidden: reach.hidden,
      scrollsX: reach.scrollsX,
      small: reach.small,
      escapeKeeps,
      openKeptInStrip: kept,
    };
  };
  const libraryReach = async (p, role, tag, tapOrClick = "click") => {
    await p.locator("#demo-role").selectOption(role);
    await p.goto(base + "#library");
    await p.locator("#content").waitFor();
    await quiet(p);
    const names =
      role === "dm"
        ? ["Le mie creazioni|My creations", "Avventure|Adventures"]
        : ["Le mie creazioni|My creations"];
    const found = {};
    for (const n of names) {
      const loc = p
        .getByRole("button", { name: new RegExp(`^(${n})`) })
        .or(p.getByRole("tab", { name: new RegExp(`^(${n})`) }))
        .or(p.getByRole("link", { name: new RegExp(`^(${n})`) }));
      found[n] = await loc.count();
      check(found[n] > 0, `${tag} ${role}: Library section ${n} not found`);
    }
    entry[`${tag}-library-${role}`] = found;
  };
  for (const role of ["player", "dm"]) {
    await campaignReach(page, role, "1440");
    await sheetReach(page, role, "1440");
    await libraryReach(page, role, "1440");
  }
  await page.goto(base + "#campaign?tab=overview");
  await page
    .locator(".campaign-sidebar")
    .screenshot({ path: dir + "04-campaign-strip-dm-it-1440.png" });
  out.entry1440 = { ...entry };
  passed.push(
    `1440 entry points: campaign rail ${entry["1440-campaign-dm"].sections} sections for the DM (${entry["1440-campaign-dm"].inViewport} inside the 900 px viewport without scrolling the page), every new section (Downtime, Homebrew, Integrations; Campaign data for the DM only) in the rail (B62: in its Kanka group) and Integrations opened in ${entry["1440-campaign-dm"].clicks} click(s); sheet sections Downtime and Boons under Extras and Features (B62, D&D Beyond's sections) opened in ${entry["1440-sheet-player"].clicks} clicks (${entry["1440-sheet-player"].tabs} categories, ${entry["1440-sheet-player"].shown} shown, no quick-jump needed); Library sections My creations (both roles) and Adventures (DM)`,
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
    await quiet(p);
    const bars = {};
    for (const role of ["player", "dm"]) {
      await p.locator("#demo-role").selectOption(role);
      await p.waitForTimeout(150);
      bars["home-" + role] = await measureBar(p, ".app-header");
    }
    await p.locator(".app-header").screenshot({ path: dir + `05-header-${lang}-390.png` });
    for (const service of ["requests", "account", "home-help", "offline"])
      check(
        await p.locator(`.service-nav [data-service="${service}"]`).isVisible(),
        `390 ${lang}: home header service ${service} not visible`,
      );
    await p.goto(base + "#table");
    await p.locator("#battle-map").waitFor();
    await quiet(p);
    for (const role of ["player", "dm"]) {
      await p.locator("#demo-role").selectOption(role);
      await p.waitForTimeout(150);
      bars["table-" + role] = await measureBar(p, ".app-header");
      bars["topline-" + role] = await measureBar(p, ".table-topline");
    }
    await p.screenshot({ path: dir + `06-table-dm-${lang}-390.png` });
    const tableOffline = await p.locator('.service-nav [data-service="offline"]').isVisible();
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
    for (const role of ["player", "dm"]) {
      await campaignReach(p, role, "390-" + lang, "tap");
      await sheetReach(p, role, "390-" + lang, "tap");
    }
    await p.goto(base + "#campaign?tab=overview");
    await p.screenshot({ path: dir + `07-campaign-dm-${lang}-390.png` });
    check(!phone.log.pageErrors.length, "Phone page errors: " + phone.log.pageErrors.join("; "));
    const phoneConsole = phone.log.console.filter(
      (m) => !(m.type === "error" && m.text.startsWith("Failed to load resource")),
    );
    out.phone[lang] = { bars, small, tableOffline, phoneConsole };
    passed.push(
      `390 ${lang.toUpperCase()} touch: header ${bars["home-player"].rows} row(s) / ${bars["home-player"].height} px at home (${bars["home-player"].count} controls), ${bars["table-dm"].rows} row(s) / ${bars["table-dm"].height} px at the Table; bell, account, help and offline indicator visible at home (offline at the Table: ${tableOffline}); new campaign sections reachable in 2 taps via "All sections"; sheet: ${entry[`390-${lang}-sheet-player`].shown} of ${entry[`390-${lang}-sheet-player`].tabs} tabs on screen, every one in 2 taps via the sheet's "All sections" (Escape leaves the page as it was, the chosen Boons tab is shown in the redrawn strip); nothing outside, overlapping or overflowing${Object.keys(small).length ? "; under 40 px: " + JSON.stringify(small) : ""}`,
    );
    await phone.context.close();
  }
  out.entry = entry;
  return { passed, out };
};
