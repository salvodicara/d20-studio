async (rootPage) => {
  // R3 PG-79 on a phone (390 × 844, touch): the token menu's new entries are reachable by a
  // long press and a tap, IT and EN. DM on the Sentinella: Azioni › «Trasforma…» (tap it, pick
  // the Wolf, «Trasforma»: the token shows «Lupo (Sentinella)»); DM › «Porta una cavalcatura
  // qui». Player on Livia (horse beside her): Azioni › «Trasforma…» and «Monta in sella…».
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const browser = rootPage.context().browser();
  const base = "http://127.0.0.1:8879/";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R3/images/";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const open = async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept().catch(() => {}));
    await page.goto(base + "#home");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector("#demo-role");
    return { context, page };
  };
  const setRole = async (page, role) => {
    await page.locator("#demo-role").selectOption(role);
    await page.waitForTimeout(250);
  };
  const english = async (page) => {
    await page.locator('[data-service="preferences"]').first().click();
    await page.locator('#dialog [name="lang"]').selectOption("en");
    await page.locator('#dialog button[type="submit"]').click();
    await page.waitForTimeout(300);
  };
  const tapCentre = async (page, locator) => {
    await locator.scrollIntoViewIfNeeded();
    const b = await locator.boundingBox();
    check(b && b.width >= 40 && b.height >= 40, "target under 40 px: " + JSON.stringify(b));
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(250);
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
    await page.waitForTimeout(500);
    const menu = page.locator("body > .token-menu");
    check(await menu.isVisible(), `the long press on ${actorId} did not open the menu`);
    return menu;
  };
  const words = {
    it: { actions: "actions", transform: "Trasforma…", mount: "Monta in sella…", bring: "Porta una cavalcatura qui", submit: "Trasforma", wolf: "Lupo (Sentinella)" },
    en: { actions: "actions", transform: "Transform…", mount: "Mount…", bring: "Bring a mount here", submit: "Transform", wolf: "Wolf (Sentinella)" },
  };
  for (const lang of ["it", "en"]) {
    const w = words[lang];
    // DM on the Sentinella: Azioni › Trasforma… → Lupo → Trasforma.
    {
      const { context, page } = await open();
      if (lang === "en") await english(page);
      await setRole(page, "dm");
      await page.goto(base + "#table");
      await page.locator('#battle-map [data-actor="goblin-1"]').waitFor();
      let menu = await longPress(context, page, "goblin-1");
      await tapCentre(page, menu.locator(`[data-token-menu-category="${w.actions}"]`));
      const transform = menu.locator(".token-menu-item", { hasText: w.transform }).first();
      check(await transform.count(), `${lang} DM: «${w.transform}» not in Azioni`);
      await page.screenshot({ path: `${shots}r3-phone-menu-dm-${lang}.png` });
      await tapCentre(page, transform);
      await page.locator("#dialog [data-forms-transform]").waitFor();
      await tapCentre(page, page.locator('#dialog label.forms-beast:has(input[value="srd2024:wolf"])'));
      const submit = page.locator('#dialog footer button[type="submit"]');
      check((await submit.textContent()) === w.submit, `${lang}: submit label ${await submit.textContent()}`);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      check(width <= 390, `${lang}: the dialog widens the phone page (${width})`);
      await page.screenshot({ path: `${shots}r3-phone-transform-${lang}.png` });
      await tapCentre(page, submit);
      await page.waitForTimeout(300);
      const name = await page.locator('#battle-map [data-actor="goblin-1"] .token-name').textContent();
      check(name === w.wolf, `${lang}: token name ${name}`);
      // DM submenu: Porta una cavalcatura qui (next to Doran).
      menu = await longPress(context, page, "doran");
      const dmCategory = menu.locator('[data-token-menu-category="dm"]');
      if (await dmCategory.count()) await tapCentre(page, dmCategory);
      const bring = menu.locator(".token-menu-item", { hasText: w.bring }).first();
      if (!(await bring.count())) {
        await page.screenshot({ path: `${shots}r3-phone-debug-${lang}.png` });
        check(false, `${lang} DM: «${w.bring}» missing: ${(await menu.locator("[role=menuitem]").allTextContents()).join(" | ")}`);
      }
      await tapCentre(page, bring);
      const horse = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")).actors).find((id) => id.startsWith("sm-horse-")));
      check(horse, `${lang}: no horse after «${w.bring}»`);
      passed.push(`${lang.toUpperCase()} phone DM: long press on the Sentinella › Azioni › «${w.transform}» → Wolf → «${w.submit}»: the token reads «${name}»; long press on Doran › «${w.bring}» brings the horse`);
      await context.close();
    }
    // Player on Livia (the DM brought a horse beside her): Azioni › Trasforma…, Monta in sella….
    {
      const { context, page } = await open();
      if (lang === "en") await english(page);
      await setRole(page, "dm");
      await page.goto(base + "#table");
      await page.locator('#battle-map [data-actor="livia"]').waitFor();
      let menu = await longPress(context, page, "livia");
      const dmCategory = menu.locator('[data-token-menu-category="dm"]');
      if (await dmCategory.count()) await tapCentre(page, dmCategory);
      await tapCentre(page, menu.locator(".token-menu-item", { hasText: w.bring }).first());
      await setRole(page, "player");
      await page.locator('#battle-map [data-actor="livia"]').waitFor();
      menu = await longPress(context, page, "livia");
      await tapCentre(page, menu.locator(`[data-token-menu-category="${w.actions}"]`));
      const labels = await menu.locator(".token-menu-item").allTextContents();
      check(labels.some((l) => l.includes(w.transform)) && labels.some((l) => l.includes(w.mount)), `${lang} player: ${labels.join(" | ")}`);
      await page.screenshot({ path: `${shots}r3-phone-menu-player-${lang}.png` });
      await tapCentre(page, menu.locator(".token-menu-item", { hasText: w.mount }).first());
      await page.locator('[data-sm-card="mount"]').waitFor();
      check(await page.locator('[data-sm-card="mount"] input[value="controlled"]').isChecked(), `${lang}: Controlled not preselected`);
      await page.screenshot({ path: `${shots}r3-phone-mount-${lang}.png` });
      passed.push(`${lang.toUpperCase()} phone player: long press on Livia › Azioni lists «${w.transform}» and «${w.mount}»; tapping «${w.mount}» opens the mount card with «Controllata» chosen`);
      await context.close();
    }
  }
  check(!errors.length, "page errors: " + errors.join(" | "));
  return passed.join("\n");
}
