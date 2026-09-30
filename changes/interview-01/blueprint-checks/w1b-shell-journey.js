async (rootPage) => {
  // W1b integration shell check: clean load (console, page errors, failed requests),
  // "Cosa è pronto" registry report, header/nav and Table top line density at 1440 and
  // 390 (IT and EN, player and DM). Synthetic data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/W1b-integ/shell/";
  const W1B = [
    "notifications",
    "random-tables",
    "loot",
    "safety",
    "media",
    "account",
    "home",
    "dice-3d",
    "community",
    "assistant",
  ];
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

  // Header geometry: every control inside the viewport, ≥ 40 px, no two overlapping.
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
        // Rows: clusters of vertical centres more than 12 px apart.
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

  // ------------------------------------------------------------------ 1. clean load, IT 1440
  const desk = await open({ viewport: { width: 1440, height: 900 } });
  const page = desk.page;
  await page.goto(base);
  await page.evaluate((k) => localStorage.clear(), key);
  await page.reload();
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  await page.waitForTimeout(1500);
  const planned = await page.evaluate(async () => {
    const { PLANNED_EXTENSIONS } = await import("/extensions.mjs");
    return PLANNED_EXTENSIONS.map((a) => a.id);
  });
  const missing = desk.log.failed.filter((f) => f.status === 404);
  const idOf = (url) => url.replace(/^https?:\/\/[^/]+\//, "").replace(/\.mjs$/, "");
  // Two page loads (goto, then reload after clearing storage): count distinct modules.
  const missingIds = [...new Set(missing.map((f) => idOf(f.url)))];
  const unexpectedFailed = desk.log.failed.filter(
    (f) => !(f.status === 404 && planned.includes(idOf(f.url))),
  );
  const consoleOther = desk.log.console.filter(
    (m) =>
      !(
        m.type === "error" &&
        m.text.startsWith("Failed to load resource") &&
        missing.some((f) => f.url === m.url)
      ),
  );
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
    W1B.every((id) => !missingIds.includes(id)),
    "A W1b module is missing: " + missingIds.filter((id) => W1B.includes(id)),
  );
  check(
    !(await page.locator("#ext-notice .ext-alert").count()),
    "Strip reports areas with warnings",
  );
  passed.push(
    `Clean load IT 1440: 0 page errors, 0 console errors or warnings besides ${missingIds.length} resource 404s, each a planned area not built yet (B11 design); no failed request otherwise; no area warning notice in the strip`,
  );

  // ------------------------------------------------------------------ 1b. W1b pages, both roles
  const pages = [
    "table",
    "campaign?tab=loot",
    "campaign?tab=safety",
    "campaign?tab=media",
    "campaign?tab=community",
    "campaign?tab=assistant",
    "safety-profile",
    "media",
    "account",
    "community",
    "preparation",
    "library",
    "characters?id=livia",
    "home",
  ];
  const before = { console: desk.log.console.length, errors: desk.log.pageErrors.length };
  const visited = [];
  for (const role of ["player", "dm"]) {
    await page.locator("#demo-role").selectOption(role);
    for (const target of pages) {
      await page.goto(base + "#" + target);
      await page.locator("#content").waitFor();
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      check(overflow <= 0, `Overflow ${overflow}px on #${target} (${role})`);
      visited.push(role + ":" + target);
    }
  }
  const pageConsole = desk.log.console.slice(before.console);
  const pageErrors = desk.log.pageErrors.slice(before.errors);
  out.pages = { visited: visited.length, pageConsole, pageErrors };
  check(!pageErrors.length, "Page errors on W1b pages: " + pageErrors.join("; "));
  check(
    !pageConsole.length,
    "Console errors/warnings on W1b pages: " + JSON.stringify(pageConsole),
  );
  passed.push(
    `${visited.length} page visits (player and DM: Table, campaign sections Loot/Safety/Media/Public tables/Assistant, safety profile, media, account, public tables, preparation, library, sheet, home): 0 page errors, 0 console errors or warnings, no horizontal overflow at 1440`,
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
    const later = el.querySelector("details summary")?.textContent ?? "";
    return { summary, groups, later };
  });
  out.report = reportData;
  const ready = reportData.groups["Pronte"] ?? [];
  const failedGroup = Object.keys(reportData.groups).find((k) => k.startsWith("Con errori"));
  check(!failedGroup, "Areas with errors: " + JSON.stringify(reportData.groups[failedGroup]));
  const backlog = {
    notifications: "B24",
    "random-tables": "B25",
    loot: "B26",
    safety: "B27",
    media: "B28",
    account: "B29",
    home: "B30",
    "dice-3d": "B56",
    community: "B59",
    assistant: "B60",
  };
  for (const id of W1B)
    check(
      ready.some((row) => row.startsWith(backlog[id] + " ·") && row.includes("attiva")),
      "W1b area not listed as ready: " + id,
    );
  const withWarnings = ready.filter((row) => row.includes("avvis"));
  check(
    !withWarnings.length,
    "Ready areas with contained warnings: " + JSON.stringify(withWarnings),
  );
  const m = reportData.summary.match(/(\d+) pronte · (\d+) da costruire · (\d+) con errori/);
  check(
    m && Number(m[1]) + Number(m[2]) === planned.length && m[3] === "0",
    "Report summary: " + reportData.summary,
  );
  check(Number(m[2]) === missingIds.length, "Not-built count differs from 404s");
  await page.screenshot({ path: dir + "01-cosa-e-pronto-it-1440.png" });
  await report.screenshot({ path: dir + "01b-report-it-1440.png" });
  passed.push(
    `"Cosa è pronto": ${reportData.summary}; all ten W1b areas listed as active, none with warnings`,
  );
  await page.locator("#dialog footer [data-close]").click();

  // ------------------------------------------------------------------ 3. header at 1440
  const headers = {};
  for (const role of ["player", "dm"]) {
    await page.locator("#demo-role").selectOption(role);
    await page.waitForTimeout(150);
    headers["home-" + role] = await measureBar(page, ".app-header");
  }
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
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
    `1440 IT: header one row (home ${headers["home-player"].count} controls, Table ${headers["table-dm"].count}); Table top line ${headers["topline-dm"].count} controls for the DM in ${headers["topline-dm"].rows} row(s); nothing outside, overlapping or overflowing`,
  );
  await desk.context.close();

  // ------------------------------------------------------------------ 4. phone 390, EN and IT
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
    const bars = {};
    for (const role of ["player", "dm"]) {
      await p.locator("#demo-role").selectOption(role);
      await p.waitForTimeout(150);
      bars["home-" + role] = await measureBar(p, ".app-header");
    }
    await p.locator(".app-header").screenshot({ path: dir + `04-header-${lang}-390.png` });
    // Every W1b header entry point is reachable on the phone: in the header outside the Table.
    for (const service of ["requests", "account", "home-help"])
      check(
        await p.locator(`.service-nav [data-service="${service}"]`).isVisible(),
        `390 ${lang}: home header service ${service} not visible`,
      );
    await p.goto(base + "#table");
    await p.locator("#battle-map").waitFor();
    for (const role of ["player", "dm"]) {
      await p.locator("#demo-role").selectOption(role);
      await p.waitForTimeout(150);
      bars["table-" + role] = await measureBar(p, ".app-header");
      bars["topline-" + role] = await measureBar(p, ".table-topline");
    }
    await p.screenshot({ path: dir + `05-table-dm-${lang}-390.png` });
    // At the Table: bell and account in the header; Help (B61) in the App menu on a phone.
    for (const service of ["requests", "account"])
      check(
        await p.locator(`.service-nav [data-service="${service}"]`).isVisible(),
        `390 ${lang}: header service ${service} not visible`,
      );
    await p.locator('.table-header [data-service="app-menu"]').tap();
    check(
      await p
        .locator('#dialog [data-jump-service="home-help"]')
        .waitFor({ timeout: 3000 })
        .then(
          () => true,
          () => false,
        ),
      `390 ${lang}: Help not in the Table's App menu`,
    );
    await p.keyboard.press("Escape");
    for (const [k, h] of Object.entries(bars)) {
      check(h, "Bar missing: " + k);
      check(
        !h.outside.length && !h.overlaps.length && h.overflow <= 0,
        `390 ${lang} ${k}: ` + JSON.stringify(h),
      );
    }
    check(!phone.log.pageErrors.length, "Phone page errors: " + phone.log.pageErrors.join("; "));
    out.phone[lang] = bars;
    passed.push(
      `390 ${lang.toUpperCase()} touch: header ${bars["home-player"].rows} row(s) / ${bars["home-player"].height} px (home), ${bars["table-dm"].rows} row(s) (Table); bell, account and help in the header (help in the App menu at the Table); Table top line ${bars["topline-dm"].count} DM controls in ${bars["topline-dm"].rows} row(s); nothing outside, overlapping or overflowing`,
    );
    await phone.context.close();
  }
  return { passed, out };
}
