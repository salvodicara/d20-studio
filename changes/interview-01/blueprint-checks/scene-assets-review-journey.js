async (rootPage) => {
  // B62: a Table panel is a sub-tab of its sidebar tab (Foundry's document tabs): open that
  // tab (its own, or the one its hidden handle names), then the sub-tab. No-op when open.
  const openTablePanel = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const now = () => page.locator("#table-sidebar-panel").getAttribute("data-table-panel");
    if ((await now()) === id) return;
    if (!(await page.locator(`.table-subtabs [data-table-subtab="${id}"]`).count())) {
      const own = await page.locator(`.table-tabs [data-table-tab="${id}"]`).count();
      const section = own
        ? id
        : await page
            .locator(
              `.table-panel-index [data-table-drawer="${id}"], .table-panel-index [data-table="${id}"]`,
            )
            .first()
            .getAttribute("data-table-section-of");
      const tab = page.locator(`.table-tabs [data-table-tab="${section}"]`);
      if ((await tab.getAttribute("aria-selected")) !== "true") await press(tab);
      await page.waitForFunction(
        (s) => document.querySelector("#table-sidebar-panel")?.dataset.tableSection === s,
        section,
      );
    }
    if ((await now()) !== id)
      await press(page.locator(`.table-subtabs [data-table-subtab="${id}"]`));
    await page.waitForFunction(
      (i) => document.querySelector("#table-sidebar-panel")?.dataset.tablePanel === i,
      id,
    );
  };
  // B47 review (B47-rf): verification of the review fixes with real clicks, right-click, keys
  // and touch on the running app — personal views kept by Undo (F1), objects' context menu
  // and long press (F3), keyboard prefab/stair placement and stair editing (F2), floor steps
  // at the bounds (F5), the player's way back down (F4), English UVTT texts (F9), 40 px
  // Variants controls at 390 px (F6). Synthetic data; resets this browser's local state.
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B47-rf/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const slice = async (p = page) => (await stored(p)).ext["scene-assets"];
  const go = async (hash, p = page) => {
    await p.goto(base + "#" + hash);
    await p.locator("#content").waitFor();
    await p.waitForTimeout(350);
  };
  const role = async (v, p = page) => {
    await p.locator("#demo-role").selectOption(v);
    await p.waitForTimeout(300);
  };
  const dialog = (p = page) => p.locator("#dialog");
  const sceneTab = async (p = page) => {
    await openTablePanel(p, "scene-assets-panel"); // B62: Scene › Scene
    await p.locator("[data-sa-panel]").waitFor();
  };
  const at = (selector, x, y, p = page) =>
    p.locator(selector).evaluate(
      (svg, q) => {
        const t = svg.createSVGPoint();
        t.x = q.x;
        t.y = q.y;
        const r = t.matrixTransform(svg.getScreenCTM());
        return { x: r.x, y: r.y };
      },
      { x, y },
    );
  const stack = async (sceneId) =>
    Object.values((await slice()).stacks).find((s) => s.floors.some((f) => f.sceneId === sceneId));
  try {
    await go("home");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#content").waitFor();
    await role("dm");

    // F1 — a saved view survives Undo of an earlier shared change.
    await go("preparation?tab=scene-assets&id=forest-clearing");
    await page.locator('[data-sa-sticker="rock"]').click();
    await page.waitForTimeout(300);
    const rocks = (await slice()).props["forest-clearing"].length;
    await go("table");
    await page.keyboard.press("Shift+F2");
    await page.waitForTimeout(300);
    await go("preparation?tab=scene-assets&id=forest-clearing");
    await page.locator("[data-sa-undo]").click();
    await page.waitForTimeout(300);
    let value = await slice();
    check(value.props["forest-clearing"].length === rocks - 1, "Undo did not remove the rock");
    check(value.views.saved.dm?.["old-watch"]?.[0], "Saved view lost by Undo");
    passed.push("F1 Undo of the sticker keeps the saved view (Shift+F2)");

    // F3 — right-click on objects: menu with lock, then a two-object prefab.
    await page.locator("[data-sa-canvas]").scrollIntoViewIfNeeded();
    let q = await at("[data-sa-canvas]", 110, 110);
    await page.mouse.click(q.x, q.y, { button: "right" });
    await page.waitForTimeout(350);
    const menu = page.locator("[data-sa-context]");
    check(await menu.isVisible(), "No menu on right-click of an object");
    const items = await menu.locator("button").allInnerTexts();
    check(
      items.join("|") === "Crea prefabbricato…|Nascondi ai giocatori|Blocca|Elimina (1)|Chiudi",
      "Menu items: " + items.join("|"),
    );
    await page.screenshot({ path: dir + "f3-object-context-menu.png" });
    await menu.getByRole("menuitem", { name: "Blocca" }).click();
    await page.waitForTimeout(300);
    value = await slice();
    check(value.props["forest-clearing"].find((p) => p.id === "fc-tree-1").locked, "Not locked");
    // Escape on the menu closes it and returns to the canvas.
    q = await at("[data-sa-canvas]", 270, 80);
    await page.mouse.click(q.x, q.y);
    await page.waitForTimeout(250);
    q = await at("[data-sa-canvas]", 110, 110);
    await page.keyboard.down("Shift");
    await page.mouse.click(q.x, q.y);
    await page.keyboard.up("Shift");
    await page.waitForTimeout(200);
    await page.mouse.click(q.x, q.y, { button: "right" });
    await page.waitForTimeout(350);
    check(
      (await menu.locator("button").first().innerText()) === "Crea prefabbricato con 2 oggetti…",
      "Two-object menu missing: " +
        (await menu.isVisible()) +
        " " +
        (await menu.innerText().catch(() => "")),
    );
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    check(!(await menu.isVisible()), "Escape did not close the menu");
    check(
      await page.evaluate(() => document.activeElement?.matches("[data-sa-canvas]")),
      "Focus not back on the canvas",
    );
    await page.mouse.click(q.x, q.y, { button: "right" });
    await page.waitForTimeout(350);
    await menu.getByRole("menuitem", { name: /Crea prefabbricato/ }).click();
    await dialog().locator('input[name="name"]').fill("Coppia di alberi");
    await dialog().locator("footer .primary").click();
    await page.waitForTimeout(300);
    value = await slice();
    const pair = value.prefabs.find((p) => p.name === "Coppia di alberi");
    check(pair?.props.length === 2, "Prefab from the context menu not created");
    passed.push(
      "F3 right-click on a tree: Crea prefabbricato… / Nascondi / Blocca / Elimina; Blocca locks it; Shift+click + right-click › «Crea prefabbricato con 2 oggetti…» makes the prefab; Esc closes the menu back to the canvas",
    );

    // F2 — keyboard: arm «Inserisci…» with Enter, Enter on the canvas inserts at the centre.
    await go("preparation?id=old-watch&tab=objects");
    await page.locator('[data-sa-prefab-arm="goblin-camp"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    check(
      await page.evaluate(() => document.activeElement?.matches("[data-sa-canvas]")),
      "Canvas not focused after arming",
    );
    await page.keyboard.press("Enter");
    await page.waitForTimeout(350);
    value = await slice();
    check((value.props["old-watch"] ?? []).length === 7, "Keyboard insert failed");
    const fire = value.props["old-watch"].find((p) => p.sticker === "campfire");
    await page.keyboard.press("Shift+ArrowRight");
    await page.waitForTimeout(300);
    value = await slice();
    const moved = value.props["old-watch"].find((p) => p.id === fire.id);
    check(Math.round(moved.x - fire.x) === 50, "Arrows did not move the inserted prefab");
    passed.push(
      "F2 keyboard: Enter on «Inserisci…» focuses the canvas, Enter inserts the Goblin camp at the centre (7 objects, selected), Shift+→ moves it one cell",
    );
    // Stairs by keyboard: add with typed position, then «Modifica…».
    // P7: levels are a tab of the one scene editor (route tab=levels).
    await go("preparation?id=lantern-tower&tab=levels");
    await page.waitForTimeout(250);
    await page.locator("[data-sa-stair-add]").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(350);
    check(await dialog().isVisible(), "Stair dialog did not open from the keyboard");
    check((await dialog().locator('input[name="x"]').inputValue()) === "15", "x not centre");
    await dialog().locator('input[name="name"]').fill("Botola");
    await dialog().locator('input[name="x"]').fill("3");
    await dialog().locator('input[name="y"]').fill("4.5");
    await dialog().locator('input[name="radius"]').fill("1.5");
    await page.screenshot({ path: dir + "f2-stair-dialog-position.png" });
    await dialog().locator("footer .primary").click();
    await page.waitForTimeout(300);
    let hatch = (await stack("lantern-tower")).stairs.find((s) => s.name === "Botola");
    check(hatch && hatch.x === 100 && hatch.y === 150 && hatch.radius === 50, "Stair position");
    await page.locator(`[data-sa-stair-edit="${hatch.id}"]`).click();
    await dialog().locator('input[name="radius"]').fill("3");
    await dialog().locator('input[name="x"]').fill("6");
    await dialog().locator("footer .primary").click();
    await page.waitForTimeout(300);
    hatch = (await stack("lantern-tower")).stairs.find((s) => s.id === hatch.id);
    check(hatch.radius === 100 && hatch.x === 200, "Stair edit failed");
    passed.push(
      "F2 stairs: Enter on «Aggiungi scala…», Enter on the canvas opens «Nuova scala» with position 15 m, 9,8 m; typed 3/4,5 m → stair at 100,150 px r 50; «Modifica…» sets radius 3 m and 6 m from the left",
    );

    // F5 — floor steps disabled at the ground floor; F4 player's way back.
    await page.evaluate((k) => {
      const s = JSON.parse(localStorage.getItem(k));
      const tower = s.scenes.find((x) => x.id === "lantern-tower");
      const liv = tower.tokens.find((t) => t.actorId === "livia");
      liv.x = 740;
      liv.y = 440;
      s.activeSceneId = "lantern-tower";
      localStorage.setItem(k, JSON.stringify(s));
    }, key);
    await page.reload();
    await page.locator("#content").waitFor();
    await role("dm");
    await go("table");
    await sceneTab();
    check(
      (await page.locator('[data-sa-step="-1"]').count()) === 1,
      "No floor steps: " +
        (await page.locator("[data-sa-panel]").innerText()).slice(0, 400) +
        " active=" +
        (await stored()).activeSceneId,
    );
    check(await page.locator('[data-sa-step="-1"]').isDisabled(), "Floor below not disabled");
    check(!(await page.locator('[data-sa-step="1"]').isDisabled()), "Floor above disabled");
    passed.push("F5 ground floor: «Piano sotto» disabled, «Piano sopra» enabled");
    await role("player");
    await go("table");
    await sceneTab();
    await page.locator('[data-sa-climb="livia"][data-sa-to="lantern-tower-top"]').click();
    await page.waitForTimeout(350);
    await sceneTab();
    const back = page.locator(
      '[data-sa-climb="livia"][data-sa-to="lantern-tower"][data-sa-from="lantern-tower-top"]',
    );
    check(await back.isVisible(), "No way back for the player");
    await page.screenshot({ path: dir + "f4-player-way-back.png" });
    await back.click();
    await page.waitForTimeout(350);
    const s2 = await stored();
    check(
      s2.scenes.find((x) => x.id === "lantern-tower").tokens.some((t) => t.actorId === "livia"),
      "Livia did not come back down",
    );
    check(s2.activeSceneId === "lantern-tower", "The player moved the party view");
    passed.push(
      "F4 player: Livia up the spiral stair, the Scene tab offers «▼ Scendi a Piano terra» from the floor out of view, and she is back on the shown floor",
    );
    await role("dm");

    // F9 — English UVTT import.
    await page.locator('.service-nav [data-service="preferences"]').click();
    await page.locator("#dialog select[name=lang]").selectOption("en");
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction(() => document.documentElement.lang === "en");
    // P7 PR-15: Universal VTT is a starting point of «New scene».
    await go("preparation");
    await page.locator("[data-prep-new]").first().click();
    await dialog().locator('input[name="template"][value="uvtt"]').check();
    await dialog().locator("button[type=submit]").click();
    await dialog().locator("[data-sa-uvtt-sample]").click();
    await page.waitForTimeout(300);
    await dialog().locator("footer .primary").click();
    await page.waitForTimeout(400);
    const crypt = (await stored()).scenes.at(-1);
    check(/^Imported from /.test(crypt.description), "UVTT description: " + crypt.description);
    passed.push("F9 EN: the imported crypt's description reads «Imported from …»");

    // F6/F7 — phone: long press on an object opens its menu; 40 px selects in Variants.
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    const phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const phone = await phoneContext.newPage();
    phone.on("pageerror", (e) => errors.push("phone: " + e.message));
    await phone.goto(base + "#home");
    await phone.evaluate(([k, v]) => localStorage.setItem(k, v), [key, snapshot]);
    await phone.reload();
    await phone.locator("#content").waitFor();
    await role("dm", phone);
    await go("preparation?tab=scene-assets&id=forest-clearing", phone);
    await phone.locator("[data-sa-canvas]").scrollIntoViewIfNeeded();
    // P7: the canvas sits in the one scene editor, taller than the phone screen: bring the
    // tree itself (430, 150) to the middle before the long press.
    let t = await at("[data-sa-canvas]", 430, 150, phone);
    await phone.evaluate((y) => window.scrollBy(0, y - window.innerHeight / 2), t.y);
    await phone.waitForTimeout(200);
    t = await at("[data-sa-canvas]", 430, 150, phone);
    const cdp = await phoneContext.newCDPSession(phone);
    const touch = (type, points) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: points.map((p) => ({ x: p.x, y: p.y })),
      });
    await touch("touchStart", [t]);
    await phone.waitForTimeout(800);
    await touch("touchEnd", []);
    await phone.waitForTimeout(400);
    const phoneMenu = phone.locator("[data-sa-context]");
    check(await phoneMenu.isVisible(), "Long press did not open the object menu");
    check(
      (await phoneMenu.locator("button").allInnerTexts()).includes("Blocca"),
      "Phone menu items: " + (await phoneMenu.locator("button").allInnerTexts()).join("|"),
    );
    const menuBox = await phoneMenu.boundingBox();
    check(menuBox.x >= 0 && menuBox.x + menuBox.width <= 390, "Menu outside the phone screen");
    await phone.screenshot({ path: dir + "f3-phone-long-press-menu.png" });
    await phone.locator('[data-prep-view="variants"]').tap();
    await phone.waitForTimeout(300);
    const heights = await phone
      .locator(".sa-choices select, .sa-choices input[type=file]")
      .evaluateAll((n) => n.map((x) => Math.round(x.getBoundingClientRect().height)));
    check(
      heights.every((h) => h >= 40),
      "Small variant controls: " + heights,
    );
    check(
      await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      "Phone overflow",
    );
    passed.push(
      `F3 phone 390 touch: a long press on a tree opens its menu (Crea prefabbricato…, Nascondi, Blocca, Elimina) inside the screen; F6 Variants controls ${heights.join("/")} px; no overflow`,
    );
    await phoneContext.close();
  } catch (e) {
    passed.push("FAILED: " + e.message);
  }
  passed.push("page errors: " + (errors.join(" / ") || "none"));
  await context.close();
  if (errors.length || passed.some((line) => line.startsWith("FAILED")))
    throw Error(passed.join("\n"));
  return passed.join("\n");
}
