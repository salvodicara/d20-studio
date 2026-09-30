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
  // B62: token-menu commands of labelled submenus are one step deeper (Foundry Token HUD
  // FVT-119, D&D Beyond token menu DDB-117): open the submenu holding it, then the command.
  const menuPick = async (page, name, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const menu = page.locator("body > .token-menu");
    const item = () => menu.getByRole("menuitem", { name });
    await menu.locator("[data-nav]").first().waitFor();
    if (await item().count()) return press(item().first());
    const ids = await menu
      .locator("[data-token-menu-category]")
      .evaluateAll((els) => els.map((e) => e.dataset.tokenMenuCategory));
    for (const id of ids) {
      await press(menu.locator(`[data-token-menu-category="${id}"]`));
      if (await item().count()) return press(item().first());
      await press(menu.locator("[data-token-menu-back]"));
    }
    throw Error("token menu command not found: " + name);
  };
  // B18 review fixes — Table annotations. Real clicks, drags, keys and roles for each
  // finding of the B18 review: (R1, P1) shared rings on a token the DM then hides reveal
  // neither its name nor its position; (R2) one players' pointer switch shared by the
  // campaign settings (B20), the Annotations drawer and the toolbar chip; (R3) the
  // spectator display draws shared annotations only, never this browser's private
  // measurement or tool bars; (R4) the Measure readout adds the elevation token to token and
  // Distances label the flat value; (R5) the eraser hits a text on its words; (R6) offline a
  // shared token note cannot be withdrawn to Only me; (R7) a shared drag measurement is a
  // broadcast that fades, never stored or logged; rings show while the button is held;
  // (R8) template sizes snap to 1,5 m (Shift: free), a DM lock stays for the player,
  // colour disabled when locked; (R9) EN ring presets and the Undo button's name.
  // Synthetic data; resets this browser's local state.
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B18/review-fixes/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) =>
    errors.push(error.message + " @ " + String(error.stack).split("\n").slice(1, 3).join(" ")),
  );
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const slice = async () => (await stored()).ext.annotations;
  const button = (name, scope = page) => scope.getByRole("button", { name, exact: true });
  const dialog = page.locator("#dialog");
  const submitDialog = async () => {
    await dialog.locator("footer .primary").click();
    await page.waitForFunction(() => !document.querySelector("#dialog").open);
  };
  const role = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForTimeout(250);
  };
  const shot = (name) => page.screenshot({ path: dir + name + ".png" });
  const go = async (hash) => {
    await page.goto(base + "#" + hash);
    await page.locator("#content").waitFor();
    await page.waitForTimeout(200);
  };
  const map = page.locator("#battle-map");
  const at = (x, y) =>
    map.evaluate(
      (svg, q) => {
        const t = svg.createSVGPoint();
        t.x = q.x;
        t.y = q.y;
        const r = t.matrixTransform(svg.getScreenCTM());
        return { x: r.x, y: r.y };
      },
      { x, y },
    );
  const dragScene = async (from, to, modifiers = []) => {
    const a = await at(from.x, from.y);
    const b = await at(to.x, to.y);
    for (const m of modifiers) await page.keyboard.down(m);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++)
      await page.mouse.move(a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8);
    await page.mouse.up();
    for (const m of modifiers) await page.keyboard.up(m);
    await page.waitForTimeout(200);
  };
  const clickScene = async (x, y) => {
    const p = await at(x, y);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(200);
  };
  // B61: map tools stand in toolbar groups; a tool of another group shows after its group.
  const tool = async (name) => {
    const chip = page.locator(".map-toolbar").getByRole("button", { name, exact: true });
    if (!(await chip.isVisible()))
      await page
        .locator(".map-tool-cluster", { has: page.locator(`[data-tool][aria-label="${name}"]`) })
        .locator("[data-tool-group]")
        .click();
    await chip.click();
    await page.waitForTimeout(150);
  };
  const bar = () => page.locator("[data-annot-bar]");
  const message = () => page.locator("#map-message").textContent();
  const share = async (on) => {
    const toggle = bar().locator('[data-annot-act="share"]');
    if ((await toggle.getAttribute("aria-pressed")) !== String(on)) await toggle.click();
    await page.waitForTimeout(200);
  };
  const tokenMenu = async (x, y, item) => {
    const p = await at(x, y);
    await page.mouse.click(p.x, p.y, { button: "right" });
    await menuPick(page, item); // B62: commands of labelled submenus are one step deeper
    await page.waitForTimeout(200);
  };
  const setOffline = async (on) => {
    await button("Preferenze").click();
    const box = dialog.locator("[name=offline]");
    if (on) await box.check();
    else await box.uncheck();
    await dialog.getByRole("button", { name: "Salva preferenze" }).click();
    await page.waitForTimeout(200);
  };
  const openDrawer = async () => {
    if (await page.locator("[data-annot-list]").count()) return;
    await openTablePanel(page, "annotations-list"); // B62: Scene › Annotations
    await page.locator("[data-annot-list]").waitFor();
  };

  try {
    await go("table");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await map.waitFor();

    // ------------------------------------------------------------ R1 (P1) rings privacy
    await role("dm");
    await go("table");
    await tool("Misura");
    await bar().getByRole("button", { name: "Anelli", exact: true }).click();
    await share(true);
    // Owlbear Ranges: holding shows the rings, the release places them.
    const scout = await at(740, 340);
    await page.mouse.move(scout.x, scout.y);
    await page.mouse.down();
    await page.waitForTimeout(100);
    check(
      (await page.locator("[data-annot-live] [data-annot-rings]").count()) === 1,
      "Rings not shown while the button is held",
    );
    await page.mouse.up();
    await page.waitForTimeout(250);
    let s = await slice();
    check(
      s.measures.length === 1 && s.measures[0].actorId === "goblin-2",
      "Shared rings on the Esploratore not stored",
    );
    await tokenMenu(740, 340, /Nascondi ai giocatori/);
    await tool("Muovi");
    await dragScene({ x: 740, y: 340 }, { x: 890, y: 520 });
    check(
      (await page.locator("[data-annot-rings]").textContent()).includes("Esploratore: spostata di"),
      "The DM lost the moved distance",
    );
    await role("player");
    await go("table");
    check((await page.locator('[data-actor="goblin-2"]').count()) === 0, "Hidden token drawn");
    const rings = page.locator("[data-annot-rings]");
    check((await rings.count()) === 1, "The DM's shared rings are missing for the player");
    const ringsText = await rings.textContent();
    check(
      !ringsText.includes("Esploratore") &&
        (await page.locator("[data-annot-rings] .annotations-moved").count()) === 0,
      "Shared rings reveal the hidden token: " + ringsText,
    );
    await shot("f01-player-rings-hidden-token");
    passed.push(
      "R1 (P1) DM shares rings on the Esploratore (shown while held), hides and moves it: the DM reads 'Esploratore: spostata di'; the player sees the rings, no name, no moved line, no token",
    );

    // ------------------------------------------------------------ R2 (P2) one pointer switch
    await role("dm");
    await go("campaign?tab=settings&id=permissions");
    await page.waitForTimeout(300);
    const b20 = page.locator('[data-cs-tool="players-pointer"]');
    const b20Loaded = (await b20.count()) === 1;
    if (b20Loaded) {
      await b20.uncheck();
      await page.waitForTimeout(300);
    }
    await go("table");
    await openDrawer();
    const drawerSwitch = page.locator('[data-annot-perm="players-pointer"]');
    if (b20Loaded)
      check(!(await drawerSwitch.isChecked()), "B20 off, the Annotations drawer still on");
    else await drawerSwitch.uncheck();
    await page.waitForTimeout(200);
    await role("player");
    await go("table");
    const chip = page.locator('.map-toolbar [data-tool="pointer"]');
    check((await chip.getAttribute("aria-disabled")) === "true", "Player pointer chip not locked");
    await role("dm");
    await go("table");
    await openDrawer();
    await page.locator('[data-annot-perm="players-pointer"]').check();
    await page.waitForTimeout(250);
    if (b20Loaded) {
      await go("campaign?tab=settings&id=permissions");
      await page.waitForTimeout(300);
      check(await b20.isChecked(), "Drawer on, B20 still off");
    }
    await role("player");
    await go("table");
    check(
      (await chip.getAttribute("aria-disabled")) !== "true",
      "Pointer chip still locked after the drawer turned it on",
    );
    passed.push(
      `R2 (P2) one switch: ${b20Loaded ? "B20 Permissions off → Annotations drawer off → player chip locked; drawer on → B20 on → chip free" : "(B20 page not loaded) drawer off → chip locked; on → free"}`,
    );

    // ------------------------------------------------------------ R3 (P2) spectator projection
    await tool("Disegna");
    await bar().getByRole("button", { name: "Freccia" }).click();
    await dragScene({ x: 280, y: 360 }, { x: 560, y: 290 });
    await role("dm");
    await go("table");
    await tool("Misura");
    await bar().getByRole("button", { name: "Linea", exact: true }).click();
    await share(false);
    await clickScene(740, 520);
    await clickScene(740, 600);
    await map.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    check(
      (await page.locator('[data-annot-measure="local"]').count()) === 1,
      "DM private pinned line missing",
    );
    await go("session-view-display");
    await page.waitForTimeout(600);
    const layers = page.locator(".session-view-layer");
    check((await layers.count()) >= 1, "No annotation layer on the spectator display");
    check(
      (await page.locator(".session-view-layer [data-annot-mark]").count()) === 1,
      "Livia's arrow missing on the spectator display",
    );
    check(
      (await page.locator('.session-view-layer [data-annot-measure="local"]').count()) === 0 &&
        (await page.locator(".session-view-layer foreignObject").count()) === 0,
      "The DM's private measurement or tool bar reached the spectator display",
    );
    await shot("f03-spectator-display");
    passed.push(
      "R3 (P2) spectator display: Livia's arrow drawn, the DM's private pinned line and the tool bars absent",
    );

    // ------------------------------------------------------------ R4 (P2) elevation
    await go("table"); // the display has no shell: back to the Table first
    await role("player");
    await go("table");
    await tool("Muovi");
    await dragScene({ x: 250, y: 380 }, { x: 570, y: 250 });
    const sentinella = page
      .locator("[data-annot-distances] .annotations-dist-row", { hasText: "Sentinella" })
      .first();
    const row = await sentinella.innerText();
    check(row.includes("↑ 3 m") && row.includes("in pianta"), "Distances row: " + row);
    check(
      (await page.locator("[data-annot-distances]").innerText()).includes(
        "misurano ancora in pianta",
      ),
      "Distances note on flat ranges missing",
    );
    await tool("Misura");
    const goblin = await at(620, 250);
    await page.mouse.move(goblin.x, goblin.y);
    await page.waitForTimeout(150);
    const reading = await message();
    check(
      reading.startsWith("Misura diretta: 1,") && reading.includes("con la quota (↑ 3 m)"),
      "Measure readout without the elevation: " + reading,
    );
    await shot("f04-elevation-readout");
    passed.push(`R4 (P2) Distances '${row.replace(/\n/g, " ")}'; Measure hover '${reading}'`);

    // ------------------------------------------------------------ R5 (P3) eraser on text
    await tool("Disegna");
    await bar().getByRole("button", { name: "Testo o nota sulla pedina" }).click();
    await clickScene(430, 120);
    await dialog.locator("[name=text]").fill("Porta nord verso il pozzo");
    await submitDialog();
    const text = page.locator("[data-annot-mark] text", { hasText: "Porta nord verso il pozzo" });
    const box = await text.evaluate((el) => {
      const b = el.getBBox();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    });
    const marks = async () => (await slice()).marks.length;
    const before = await marks();
    await bar().getByRole("button", { name: "Gomma" }).click();
    await clickScene(box.x - 50, box.y + box.h / 2);
    check((await marks()) === before, "Erased from the empty map left of the text");
    check((await message()).includes("Nessun disegno"), "No 'nothing here' message");
    await clickScene(box.x + box.w * 0.9, box.y + box.h / 2);
    check((await marks()) === before - 1, "The right part of the words did not erase the text");
    passed.push(
      `R5 (P3) eraser: text box x ${Math.round(box.x)}–${Math.round(box.x + box.w)}; 50 px left keeps it, 90% of the width erases it`,
    );

    // ------------------------------------------------------------ R6 (P3) offline note
    await bar().getByRole("button", { name: "Testo o nota sulla pedina" }).click();
    await clickScene(350, 450);
    await dialog.locator("[name=text]").fill("Ha la chiave del pozzo");
    await submitDialog();
    await setOffline(true);
    await tool("Muovi");
    await tokenMenu(350, 450, "Nota sulla pedina…");
    await dialog.locator("[name=audience]").selectOption("me");
    await dialog.locator("footer .primary").click();
    await page.waitForTimeout(200);
    check(
      (await dialog.evaluate((d) => d.open)) &&
        (await dialog.locator(".dialog-error").innerText()).includes("senza rete"),
      "Offline withdrawal of a shared note was not refused",
    );
    await dialog.locator("[data-close]").first().click();
    await setOffline(false);
    check(
      (await slice()).tooltips.find((t) => t.actorId === "doran").audience === "all",
      "The shared note changed audience offline",
    );
    passed.push("R6 (P3) offline: 'Solo io' on Livia's shared note of Doran refused, note kept");

    // ------------------------------------------------------------ R7 (P3) broadcast drag
    await tool("Misura");
    await share(true);
    const storedBefore = (await slice()).measures.length;
    const logBefore = (await stored()).log.length;
    // B61: beside the sidebar the map is drawn smaller; this 200 px drag starts right of the
    // Measure options bar at the map's bottom left instead of on it.
    await dragScene({ x: 600, y: 560 }, { x: 800, y: 560 });
    check(
      (await page.locator('[data-annot-measure="local"]').count()) === 0,
      "Shared drag stayed as a local measurement",
    );
    await role("dm");
    await go("table");
    const signal = page.locator('[data-annot-signal="measure"]');
    check(
      (await signal.count()) === 1 && (await signal.textContent()).includes("Livia"),
      "The DM does not see Livia's broadcast measurement",
    );
    await shot("f07-dm-sees-broadcast-measure");
    check((await slice()).measures.length === storedBefore, "A drag measurement was stored");
    check((await stored()).log.length === logBefore, "A drag measurement entered the log");
    await page.waitForTimeout(2300);
    await tool("Muovi"); // a new render prunes expired signals
    check((await signal.count()) === 0, "The broadcast measurement did not fade");
    passed.push(
      "R7 (P3) shared drag: broadcast in Livia's name reaches the DM, gone after 2 s; nothing stored, nothing logged",
    );

    // ------------------------------------------------------------ R8 (P3) templates
    await tool("Sagoma");
    const count = async () => (await slice()).templates.length;
    // B61: the map is narrower beside the right sidebar; this origin stays clear of the
    // template options bar at the map's bottom left (same 90 px drag).
    await dragScene({ x: 700, y: 580 }, { x: 790, y: 580 });
    let templates = (await slice()).templates;
    check(templates.at(-1).size === 3, "90 px not snapped to 3 m: " + templates.at(-1).size);
    await button("Deseleziona").click();
    await dragScene({ x: 850, y: 120 }, { x: 940, y: 120 }, ["Shift"]);
    templates = (await slice()).templates;
    check(templates.at(-1).size === 2.7, "Shift did not keep 2,7 m: " + templates.at(-1).size);
    await bar().getByRole("button", { name: "Blocca", exact: true }).click();
    await page.waitForTimeout(200);
    check(
      await bar().locator('[data-annot-swatches="selected"]').isDisabled(),
      "Colour enabled on a locked template",
    );
    const lockedCount = await count();
    await role("player");
    await go("table");
    await tool("Sagoma");
    await dragScene({ x: 120, y: 120 }, { x: 210, y: 120 });
    const playerTemplate = (await slice()).templates.at(-1);
    check(playerTemplate.author === "player", "Player template not created");
    await role("dm");
    await go("table");
    await tool("Sagoma");
    await clickScene(170, 120);
    await bar().getByRole("button", { name: "Blocca", exact: true }).click();
    await page.waitForTimeout(200);
    await role("player");
    await go("table");
    await tool("Sagoma");
    await clickScene(170, 120);
    const lock = bar().locator('[data-annot-act="tpl-lock"]');
    check(
      (await lock.isDisabled()) &&
        (await lock.getAttribute("aria-label")).includes("Bloccata dal DM"),
      "The player can remove the DM's lock",
    );
    await shot("f08-player-dm-lock");
    check((await count()) === lockedCount + 1, "Template count");
    passed.push(
      "R8 (P3) DM drag 90 px → 3 m, Shift → 2,7 m; locked: colour disabled; the DM's lock on Livia's template is disabled for her ('Bloccata dal DM')",
    );

    // ------------------------------------------------------------ R9 (P3) EN presets, Undo name
    await role("dm");
    await button("Preferenze").click();
    await dialog.locator("[name=lang]").selectOption("en");
    await dialog.getByRole("button", { name: "Salva preferenze" }).click();
    await page.waitForTimeout(250);
    await go("table");
    // B61: the Annotations tab is remembered per identity; open it unless it is open.
    await openDrawer();
    const presets = await page.locator("[data-annot-presets]").inputValue();
    check(presets === "1.5; 9; 18; 36", "EN presets: " + presets);
    await tool("Draw");
    const undo = bar().locator('[data-annot-act="undo"]');
    const undoName = await undo.getAttribute("aria-label");
    check(undoName.startsWith("Undo: "), "Undo without what it undoes: " + undoName);
    await button("Preferences").click();
    await dialog.locator("[name=lang]").selectOption("it");
    await dialog.getByRole("button", { name: "Save preferences" }).click();
    await page.waitForTimeout(250);
    passed.push(`R9 (P3) EN drawer presets '${presets}'; bar Undo named '${undoName}'`);

    // ------------------------------------------------------------ toolbar (core) observation
    await go("table");
    const fit = await page.evaluate(() => {
      const bar = document.querySelector(".map-toolbar")?.getBoundingClientRect();
      const stage = document.querySelector("#battle-map")?.getBoundingClientRect();
      return {
        chips: document.querySelectorAll(".map-toolbar [data-tool]").length,
        bar: bar && Math.round(bar.height),
        map: stage && Math.round(stage.height),
      };
    });
    passed.push(
      `Toolbar (core table.mjs, observation): ${fit.chips} chips, bar ${fit.bar}px for a ${fit.map}px map`,
    );
    await context.close();
    check(!errors.length, "Page errors: " + errors.join(" | "));
    return { passed, errors };
  } catch (error) {
    await page.screenshot({ path: dir + "failure.png", fullPage: true }).catch(() => {});
    throw Object.assign(error, {
      message: error.message + " | passed: " + passed.length + " | errors: " + errors.join(" | "),
    });
  }
};
