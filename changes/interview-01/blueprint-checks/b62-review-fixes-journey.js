async (rootPage) => {
  // B62 independent review (26/09/2026): strict findability audit of the IA consolidation
  // and its fixes, in the running app. A control counts as reachable only if it is rendered,
  // inside the viewport sideways, not clipped by any strip, bar, menu or rail that would have
  // to scroll (sideways or down) and not covered at its centre; the page, a panel's content
  // and a dialog's list may scroll. Clicks land on the control's centre (never Playwright's
  // scroll-into-view). Groups: 1. combat hotbar at 1366 × 768 and 1440 × 900, player and DM
  // (B40's «Mosse» pinned beside the actions, nothing inside the bar needs scrolling, the page
  // does not scroll); 2. phone token menu sheet without a hidden fold (DM on the Sentinel,
  // player on Livia, IT and EN); 3. phone DM tools column clear of the pinned hotbar;
  // 4. keyboard focus kept on the chosen sheet category / sub-section and Preparation group /
  // section / «Tutte» jump; 5. Table sidebar in Foundry's order (Items before Journal).
  // Synthetic data only; each group uses a fresh browser context.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/IA-rf/journey/";
  const browser = rootPage.context().browser();
  const passed = [];
  const notes = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const PROBE = `(() => {
    if (window.__reach) return;
    const clipping = (el) => { const s = getComputedStyle(el); return /(auto|scroll|hidden|clip)/.test(s.overflowX + s.overflowY); };
    // Content that may scroll (a dialog's list, a panel's body); strips, bars and menus may not.
    const CONTENT = ".dialog-body, .table-sidebar-panel-body, .table-drawer-body";
    const probe = (el, allowPage) => {
      if (!el) return { ok: false, why: "missing" };
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return { ok: false, why: "not-visible" };
      let b = el.getBoundingClientRect();
      if (b.width < 1 || b.height < 1) return { ok: false, why: "zero-size" };
      let contentScroll = false;
      let fixed = false;
      for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (s.position === "fixed" || s.position === "sticky") fixed = true;
        if (!clipping(a)) continue;
        const c = a.getBoundingClientRect();
        const cl = c.left + a.clientLeft, ct = c.top + a.clientTop;
        const cr = cl + a.clientWidth, cb = ct + a.clientHeight;
        if (b.left < cl - 1 || b.right > cr + 1 || b.top < ct - 1 || b.bottom > cb + 1) {
          if (a.matches(CONTENT) && b.left >= cl - 1 && b.right <= cr + 1) {
            a.scrollTop += b.top - ct - a.clientHeight / 3;
            contentScroll = true;
            b = el.getBoundingClientRect();
            continue;
          }
          const box = [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)];
          return { ok: false, why: "clipped-by:" + (a.id ? "#" + a.id : "." + [...a.classList].slice(0, 2).join(".")) + (a.scrollWidth > a.clientWidth + 1 ? ":scrolls-x" : "") + (a.scrollHeight > a.clientHeight + 1 ? ":scrolls-y" : ""), box, small: b.width < 39.5 || b.height < 39.5 };
        }
      }
      const box = [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)];
      const small = b.width < 39.5 || b.height < 39.5;
      if (b.left < -1 || b.right > innerWidth + 1) return { ok: false, why: "off-screen-x", box, small };
      let pageScroll = false;
      if (b.top < -1 || b.bottom > innerHeight + 1) {
        if (fixed) return { ok: false, why: "off-screen-y-fixed", box, small };
        pageScroll = true;
        window.scrollBy(0, b.top - innerHeight / 3);
      }
      const n = el.getBoundingClientRect();
      const x = n.left + n.width / 2, y = n.top + n.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (!hit || !(hit === el || el.contains(hit))) {
        const why = "covered-by:" + (hit ? hit.tagName.toLowerCase() + "." + [...hit.classList].slice(0, 2).join(".") + (hit.id ? "#" + hit.id : "") : "nothing");
        // A page that scrolls can bring the control out from under a pinned bar.
        if (allowPage && !fixed && document.documentElement.scrollHeight > innerHeight + 1) {
          window.scrollBy(0, n.top - innerHeight / 3);
          const again = probe(el, false);
          return again.ok ? { ...again, pageScroll: true, coveredAtRest: why } : { ...again, why: why + " (also after page scroll: " + again.why + ")" };
        }
        return { ok: false, why, box, small };
      }
      return { ok: true, box, small, pageScroll, contentScroll, x: Math.round(x), y: Math.round(y) };
    };
    window.__reach = (el) => probe(el, true);
  })()`;
  const open = async (options = {}) => {
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
    await page.waitForTimeout(200);
  };
  const english = async (page) => {
    await page.locator('[data-service="preferences"]').click();
    await page.locator('#dialog [name="lang"]').selectOption("en");
    await page.locator('#dialog button[type="submit"]').click();
    await page.waitForTimeout(300);
  };
  const goTable = async (page) => {
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.waitForTimeout(400);
  };
  const reachAll = async (page, selector) => {
    await page.evaluate(PROBE);
    return page.evaluate(
      (sel) =>
        [...document.querySelectorAll(sel)].map((el) => ({
          label: (el.getAttribute("aria-label") || el.textContent || "")
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 40),
          ...window.__reach(el),
        })),
      selector,
    );
  };
  const longPress = async (context, page, actorId) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    const point = await page.evaluate((id) => {
      const el = document.querySelector(`#battle-map [data-actor="${id}"]`);
      const r = el.getBoundingClientRect();
      for (const fy of [0.5, 0.3, 0.7])
        for (const fx of [0.5, 0.7, 0.8, 0.3]) {
          const x = r.left + r.width * fx;
          const y = r.top + r.height * fy;
          const hit = document.elementFromPoint(x, y);
          if (hit && (hit === el || el.contains(hit))) return { x, y };
        }
      return null;
    }, actorId);
    check(point, `no free point on the ${actorId} token`);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
    await page.waitForTimeout(750);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(300);
  };

  // ---------------------------------------------------------------- 1 · combat hotbar
  {
    const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
    await setRole(page, "dm");
    await goTable(page);
    await page.getByRole("button", { name: "Avvia combattimento", exact: true }).click();
    // Refreshed by the hand-off writer (29/09/2026): R5 PR-32 replaced Preparation's «Incontro
    // preparato» with the Table's start dialog (Foundry roll call): who fights and each typed
    // d20; the Initiative bonus comes from the sheet.
    await page.locator("[data-ct-start-dialog]").waitFor();
    {
      const naturals = { livia: 18, "goblin-1": 12, doran: 10, "goblin-2": 8 };
      const startIds = await page
        .locator("[data-ct-start-include]")
        .evaluateAll((els) => els.map((el) => el.dataset.ctStartInclude));
      for (const id of startIds) {
        const box = page.locator('[data-ct-start-include="' + id + '"]');
        if ((await box.isChecked()) !== Object.hasOwn(naturals, id)) await box.click();
      }
      for (const [id, natural] of Object.entries(naturals)) {
        const d20 = page.locator('[data-ct-start-natural="' + id + '"]');
        await d20.fill(String(natural));
        await d20.dispatchEvent("change");
      }
    }
    await page.getByRole("button", { name: "Inizia combattimento", exact: true }).click();
    await page.locator("#battle-map").waitFor();
    const seen = [];
    for (const [w, h] of [
      [1366, 768],
      [1440, 900],
    ])
      for (const role of ["player", "dm"]) {
        await page.setViewportSize({ width: w, height: h });
        await setRole(page, role);
        await goTable(page);
        const items = await reachAll(
          page,
          ".table-hotbar .hotbar-page:not([hidden]) button, .table-hotbar .hotbar-page:not([hidden]) select, .table-hotbar > .toolbar button",
        );
        const bad = items.filter((i) => !i.ok).map((i) => `${i.label}: ${i.why}`);
        const geo = await page.evaluate(() => ({
          pageScroll: document.documentElement.scrollHeight - innerHeight,
          bar: Math.round(document.querySelector(".table-hotbar").getBoundingClientRect().height),
          movesInDock: !!document.querySelector(".combat-dock [data-sm-tray]"),
          movesInList: !!document.querySelector(".combat-actions [data-sm-tray]"),
        }));
        check(!bad.length, `${w}×${h} ${role}: hidden in the hotbar: ${bad.join(" | ")}`);
        check(geo.movesInDock && !geo.movesInList, `${w}×${h} ${role}: Moves not pinned`);
        check(geo.pageScroll <= 0 && geo.bar <= 120, `${w}×${h} ${role}: ${JSON.stringify(geo)}`);
        check(
          items.some((i) => /Termina turno/.test(i.label) && i.ok),
          "End turn missing",
        );
        seen.push(`${w}×${h} ${role} ${items.length} controls, bar ${geo.bar} px`);
        await page.screenshot({ path: `${dir}1-combat-${w}x${h}-${role}.png` });
      }
    passed.push(
      `1. combat, Livia's turn: every hotbar control reachable without scrolling the bar, «Mosse» in the pinned dock column, page not scrolling (${seen.join("; ")})`,
    );
    await context.close();
  }

  // ---------------------------------------------------------------- 2 · phone token menu
  for (const [role, actorId, lang] of [
    ["dm", "goblin-1", "it"],
    ["player", "livia", "it"],
    ["dm", "goblin-1", "en"],
  ]) {
    const { context, page } = await open({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    if (lang === "en") await english(page);
    await setRole(page, role);
    await goTable(page);
    await longPress(context, page, actorId);
    const box = await page.evaluate(() => {
      const m = document.querySelector("body > .token-menu");
      return m && !m.hidden
        ? { scroll: m.scrollHeight - m.clientHeight, height: m.clientHeight }
        : null;
    });
    check(box, `${role} ${lang}: the long press did not open the menu`);
    const rows = await reachAll(page, "body > .token-menu .token-menu-list > li > [role=menuitem]");
    const hidden = rows.filter((r) => !r.ok).map((r) => `${r.label}: ${r.why}`);
    check(
      box.scroll <= 1 && !hidden.length,
      `${role} ${lang} sheet fold: ${box.scroll} px, ${hidden.join(" | ")}`,
    );
    await page.screenshot({ path: `${dir}2-phone-menu-${role}-${lang}.png` });
    passed.push(
      `2. phone ${lang.toUpperCase()} ${role} on ${actorId}: sheet ${box.height} px, ${rows.length} rows, none below the fold (${rows.map((r) => r.label.replace(/\d+›$/, "")).join(", ")})`,
    );
    await context.close();
  }

  // ---------------------------------------------------------------- 3 · phone DM tools
  {
    const { context, page } = await open({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await setRole(page, "dm");
    await goTable(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    // P6 TV-06 (TouchVTT, Roll20 tablet): on a phone the tool columns fold into one «Strumenti
    // della mappa» button; unfold them with a tap, as a user would, before the DM group.
    const fold = page.locator('#content [data-map-tools-toggle][aria-expanded="false"]');
    if (await fold.count()) {
      const at = await fold.evaluate((b) => {
        const r = b.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      await page.touchscreen.tap(at.x, at.y);
      await page.locator('#content [data-map-tools-toggle][aria-expanded="true"]').waitFor();
    }
    const group = await page.evaluate(() => {
      const b = document.querySelector('[data-tool-group="dm"]').getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    });
    await page.touchscreen.tap(group.x, group.y);
    await page.waitForTimeout(300);
    const tools = await page.evaluate(() => {
      window.scrollTo(0, 0);
      return [...document.querySelectorAll('[data-tool-group-tools="dm"] [data-tool]')].map((b) => {
        const r = b.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return {
          tool: b.dataset.tool,
          top: Math.round(r.top),
          clear: hit === b || b.contains(hit),
        };
      });
    });
    check(
      tools.length >= 5 && tools.every((t) => t.clear),
      "phone DM tools: " + JSON.stringify(tools),
    );
    await page.screenshot({ path: `${dir}3-phone-dm-tools.png` });
    passed.push(
      `3. phone DM: «Strumenti del DM» shows ${tools.length} tools from the toolbar's top, none under the pinned hotbar (${tools.map((t) => t.tool + "@" + t.top).join(", ")})`,
    );
    await context.close();
  }

  // ---------------------------------------------------------------- 4 · keyboard focus
  {
    const { context, page } = await open({ viewport: { width: 1440, height: 900 } });
    await setRole(page, "dm");
    const active = () =>
      page.evaluate(() => {
        const a = document.activeElement;
        return a === document.body
          ? "BODY"
          : Object.entries(a.dataset)
              .map(([k, v]) => `${k}=${v}`)
              .join(" ");
      });
    await page.goto(base + "#characters?id=livia");
    await page.waitForTimeout(500);
    await page.locator('.character-tabs [data-character-tab="features"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    const afterCategory = await active();
    check(/characterTab=features/.test(afterCategory), "sheet category focus: " + afterCategory);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);
    const tabbed = await active();
    await page.locator('.character-subtabs [data-character-subtab="projects-track"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    const afterSub = await active();
    check(/characterSubtab=projects-track/.test(afterSub), "sheet sub-section focus: " + afterSub);
    await page.locator("[data-character-tabs-all]").evaluate((b) => b.click());
    await page.locator('#dialog [data-character-tab="media"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    const afterJump = await active();
    check(/characterSubtab=media/.test(afterJump), "sheet All-sections jump focus: " + afterJump);
    await page.goto(base + "#preparation");
    await page.waitForTimeout(500);
    await page.locator('[data-prep-group="materials"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    const afterGroup = await active();
    check(/prepGroup=materials/.test(afterGroup), "prep group focus: " + afterGroup);
    await page.locator('.prep-sections [data-prep-section="loot-merchants"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    const afterSection = await active();
    check(/prepSection=loot-merchants/.test(afterSection), "prep section focus: " + afterSection);
    await page.locator("[data-prep-sections-all]").focus();
    await page.keyboard.press("Enter");
    await page.locator('#dialog [data-prep-section-jump="adventures"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    const afterPrepJump = await active();
    check(
      /prepSection=adventures/.test(afterPrepJump),
      "prep All-sections jump focus: " + afterPrepJump,
    );
    const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    check(ring !== "none", "no visible focus ring on the chosen section");
    passed.push(
      `4. keyboard: focus stays on the chosen sheet category (${afterCategory}; Tab then reaches ${tabbed}), sub-section and All-sections jump; on the Preparation group, section and «Tutte» jump (outline ${ring})`,
    );
    await context.close();
  }

  // ---------------------------------------------------------------- 5 · Foundry order
  {
    const { context, page } = await open({ viewport: { width: 1366, height: 768 } });
    await setRole(page, "dm");
    await goTable(page);
    const order = await page.evaluate(() =>
      [...document.querySelectorAll(".table-tabs [role=tab]")].map((t) => t.dataset.tableTab),
    );
    check(
      order.join() === "creature,chat,combat,scene,exploration,items,journal,tables,reference",
      "rail order: " + order,
    );
    const rail = await reachAll(page, ".table-tabs [role=tab]");
    check(
      rail.every((r) => r.ok),
      "a tab outside the 1366 × 768 rail",
    );
    passed.push(`5. DM rail at 1366 × 768 in Foundry's order, all inside: ${order.join(", ")}`);
    await context.close();
  }
  check(!errors.length, "page errors: " + errors.join(" | "));
  return { passed, notes, errors };
};
