async (rootPage) => {
  // B62: the log is the first sub-tab of the sidebar's «Chat» tab; the core's toggle
  // (data-table="log") is a hidden handle. As the old Registro tab: an open log closes with
  // its own ✕, otherwise the log opens (the Chat tab, then its Registro sub-tab if needed).
  const toggleLog = async (p, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const close = p.locator("#content [data-chat-close]");
    if (await close.count()) return press(close.first());
    if ((await p.locator("#table-sidebar-panel").getAttribute("data-table-panel")) === "log")
      return press(p.locator('.table-tabs [data-table-section="chat"]'));
    if (!(await p.locator('.table-subtabs [data-table-subtab="log"]').count())) {
      const chat = p.locator('.table-tabs [data-table-section="chat"]');
      if ((await chat.getAttribute("aria-selected")) !== "true") await press(chat);
    }
    if ((await p.locator("#table-sidebar-panel").getAttribute("data-table-panel")) !== "log")
      await press(p.locator('.table-subtabs [data-table-subtab="log"]'));
  };
  // B12: token menu, selection and visibility. Real clicks, keys and touch on the one app:
  // IT desktop 1440 (DM and player) and an isolated EN 390 touch context. Synthetic data
  // only; each group starts from the sample state and uses the UI to build its situation.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const page = rootPage;
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B12/";
  const passed = [],
    errors = [],
    notes = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const check = (c, m) => {
    if (!c) throw Error(m);
  };
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const role = async (r) => {
    await page.locator("#demo-role").selectOption(r);
    await page.locator("#battle-map").waitFor();
  };
  const tok = (id) => page.locator(`#battle-map [data-actor="${id}"]`);
  const menu = page.locator("body > .token-menu");
  // B62: the commands of the labelled submenus (Foundry Token HUD FVT-119, D&D Beyond token
  // menu DDB-117) are one step deeper: a command not in the current view is shown by opening
  // its submenu first (from the top level); a one-command submenu shows it at the top.
  const SUBMENU = {
    "token-menu-hide": "visibility",
    "token-menu-audience": "visibility",
    "token-menu-rename": "visibility",
    "token-menu-hide-name": "visibility",
    "token-menu-ring": "look",
    "token-menu-size": "look",
    "token-menu-rotate": "look",
    "token-menu-lock": "dm",
    "token-menu-group": "dm",
    "token-menu-copy": "dm",
    "token-menu-paste": "dm",
    "token-menu-remove": "dm",
  };
  const show = async (id) => {
    if (await menu.locator(`[data-token-menu-item="${id}"]`).count()) return;
    const category = SUBMENU[id];
    if (!category) return;
    for (let i = 0; i < 2 && (await menu.locator("[data-token-menu-back]").count()); i++)
      await menu.locator("[data-token-menu-back]").click();
    const entry = menu.locator(`[data-token-menu-category="${category}"]`);
    if (await entry.count()) await entry.click();
  };
  const item = (id) => {
    const at = () => menu.locator(`[data-token-menu-item="${id}"]`);
    return {
      click: async (options) => (await show(id), at().click(options)),
      innerText: async () => (await show(id), at().innerText()),
      locator: (selector) => ({
        innerText: async () => (await show(id), at().locator(selector).innerText()),
      }),
    };
  };
  const isOpen = () => menu.evaluate((n) => !n.hidden).catch(() => false);
  const active = () =>
    page.evaluate(() => ({
      actor: document.activeElement?.getAttribute("data-actor"),
      label: document.activeElement?.getAttribute("aria-label"),
      text: document.activeElement?.textContent?.trim(),
    }));
  const tokenOf = (s, id) => s.scenes[0].tokens.find((t) => t.actorId === id);
  const shot = (name) => page.screenshot({ path: dir + name });
  // B61: map tools stand in toolbar groups; a tool of another group shows after its group.
  const pickTool = async (id) => {
    const chip = page.locator(`.map-toolbar [data-tool="${id}"]`);
    if (!(await chip.isVisible()))
      await page.locator(`.map-tool-cluster:has([data-tool="${id}"]) [data-tool-group]`).click();
    await chip.click();
  };
  const reset = async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("http://127.0.0.1:8879/#table");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#battle-map").waitFor();
  };
  const openOn = async (id) => {
    await tok(id).click({ button: "right" });
    await menu.locator("[data-nav]").first().waitFor();
  };
  // Escape in a submenu goes back to the list first (ARIA menu): press until closed.
  const closeMenu = async () => {
    for (let i = 0; i < 3 && (await isOpen()); i++) await page.keyboard.press("Escape");
    check(!(await isOpen()), "menu did not close");
  };
  const hp = async (value) => {
    await menu.locator("#token-menu-hp-input").fill(value);
    await menu.locator("#token-menu-hp-input").press("Enter");
    await page.waitForTimeout(80);
  };
  // A failing group is reported with its reason and the next group still runs.
  const failedGroups = [];
  const group = async (name, fn) => {
    try {
      await fn();
      passed.push(name);
    } catch (e) {
      failedGroups.push(name + " :: " + e.message);
      await page.keyboard.press("Escape").catch(() => {});
    }
  };
  const startCombat = async () => {
    const button = (name) => page.getByRole("button", { name, exact: true });
    await button("Avvia combattimento").click();
    // Refreshed by the hand-off writer (29/09/2026): R5 PR-32 replaced Preparation's «Incontro
    // preparato» with the Table's start dialog (Foundry roll call): who fights and each typed
    // d20; the Initiative bonus comes from the sheet.
    await page.locator("[data-ct-start-dialog]").waitFor();
    {
      const naturals = { livia: 18, mira: 14, "goblin-1": 12, doran: 10, "goblin-2": 8 };
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
    await button("Inizia combattimento").click();
    await page.locator("#battle-map").waitFor();
    check((await saved()).combat.active, "combat did not start");
  };

  await group(
    "1 · DM: same labelled menu by right-click and keyboard (Tab + Menu key)",
    async () => {
      await reset();
      await role("dm");
      await openOn("goblin-1");
      const header = await menu.locator(".token-menu-head").innerText();
      check(header.includes("Sentinella"), "menu header lacks the creature name");
      const labels = await menu.locator("[role=menuitem] .token-menu-label").allInnerTexts();
      // B62: the frequent commands on top, then the labelled submenus in a fixed order.
      const expected = [
        "Condizioni",
        "Apri la scheda",
        "Centra sulla mappa",
        "Aggiungi alla selezione",
        "Aspetto",
        "Visibilità",
        "Strumenti DM",
      ];
      let at = -1;
      for (const label of expected) {
        const next = labels.indexOf(label);
        check(next > at, "menu order/label missing: " + label + " in " + labels.join(" | "));
        at = next;
      }
      check(labels.length <= 12, "more than twelve top-level commands: " + labels.length);
      // Inside the submenus: the same commands, in the same order, with their shortcuts.
      const inside = async (category, list, keys) => {
        await menu.locator(`[data-token-menu-category="${category}"]`).click();
        const names = await menu.locator("[role=menuitem] .token-menu-label").allInnerTexts();
        let k = -1;
        for (const label of list) {
          const next = names.indexOf(label);
          check(next > k, `${category}: order/label missing: ${label} in ${names.join(" | ")}`);
          k = next;
        }
        const kbd = await menu.locator("kbd").allInnerTexts();
        for (const key of keys) check(kbd.includes(key), `${category}: shortcut ${key} missing`);
        await menu.locator("[data-token-menu-back]").click();
      };
      await inside(
        "visibility",
        ["Nascondi ai giocatori", "Visibile solo a…", "Rinomina…", "Nascondi il nome ai giocatori"],
        ["Maiusc+H"],
      );
      await inside("look", ["Colore del bordo", "Dimensione della pedina"], []);
      await inside("dm", ["Blocca la posizione", "Copia"], ["Maiusc+L"]);
      const others = await menu
        .locator('[data-token-menu-item]:not([data-token-menu-item^="token-menu-"])')
        .allInnerTexts();
      notes.push("items from other areas in the DM goblin menu: " + (others.join(", ") || "none"));
      check(
        (await menu.locator("#token-menu-hp-input").inputValue()) === "7",
        "HP field missing in the DM menu",
      );
      await shot("b12-1-dm-menu-1440.png");
      await page.keyboard.press("Escape");
      check(!(await isOpen()), "Escape did not close");
      check((await active()).actor === "goblin-1", "focus did not return to the token");
      // Keyboard only: Tab through the tokens, then the Menu key on the goblin.
      await page.locator("#battle-map").focus();
      const heard = [];
      for (let i = 0; i < 8 && (await active()).actor !== "goblin-1"; i++) {
        await page.keyboard.press("Tab");
        heard.push((await active()).label);
      }
      check((await active()).actor === "goblin-1", "Tab did not reach the goblin: " + heard);
      await page.keyboard.press("ContextMenu");
      await menu.locator("[data-nav]").first().waitFor();
      check((await active()).text.startsWith("Condizioni"), "focus not on the first item");
      await page.keyboard.press("ArrowDown");
      check((await active()).text.startsWith("Apri la scheda"), "ArrowDown did not move");
      await page.keyboard.press("End");
      const last = (await active()).text;
      await page.keyboard.press("Home");
      check((await active()).text.startsWith("Condizioni"), "Home did not return to the first");
      // ArrowRight opens the submenu; in its two-column palette ArrowDown moves by a row.
      await page.keyboard.press("ArrowRight");
      check((await menu.getAttribute("data-view")) === "conditions", "ArrowRight: no submenu");
      const firstCell = (await active()).text;
      await page.keyboard.press("ArrowDown");
      const cells = await menu.locator("[data-token-menu-condition]").allInnerTexts();
      check(
        (await active()).text === cells[cells.indexOf(firstCell) + 2],
        "ArrowDown in the palette did not move one row",
      );
      await page.keyboard.press("Escape");
      check((await menu.getAttribute("data-view")) === "main", "Escape did not go back");
      check((await active()).text.startsWith("Condizioni"), "back did not refocus Condizioni");
      await page.keyboard.press("Escape");
      check((await active()).actor === "goblin-1", "keyboard Escape lost focus");
      await page.keyboard.press("Shift+F10");
      await menu.locator("[data-nav]").first().waitFor();
      check(await isOpen(), "Shift+F10 did not open the menu");
      // Hidden while dragging: pressing elsewhere on the map closes it.
      const box = await tok("livia").boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      check(!(await isOpen()), "menu stayed open while a drag started");
      await page.mouse.up();
      notes.push("Tab reads: " + heard.join(" → ") + "; End focuses: " + last);
    },
  );

  await group("2 · HP -5, +3, =12 update sheet, token and log; invalid kept; Undo", async () => {
    await reset();
    await role("player");
    await openOn("livia");
    await hp("-5");
    check((await saved()).actors.livia.hp === 13, "-5 not applied");
    check(
      (await menu.locator(".token-menu-status").innerText()).includes("PF 18 → 13"),
      "status after -5",
    );
    check(
      (await menu.locator("#token-menu-hp-input").inputValue()) === "13",
      "field does not show the new HP",
    );
    check(
      (await tok("livia").getAttribute("aria-label")).startsWith("Livia, 13 punti ferita"),
      "token label not updated",
    );
    await hp("+3");
    check((await saved()).actors.livia.hp === 16, "+3 not applied");
    await hp("=12");
    check((await saved()).actors.livia.hp === 12, "=12 not applied");
    await hp("abc");
    const input = menu.locator("#token-menu-hp-input");
    check((await input.inputValue()) === "abc", "invalid value not kept");
    check((await input.getAttribute("aria-invalid")) === "true", "invalid value not flagged");
    check(
      (await menu.locator("#token-menu-hp-error").innerText()).includes("-5 per un danno"),
      "invalid value not explained",
    );
    await hp("=0");
    check(
      (await menu.locator("#token-menu-hp-error").innerText()).includes("-12"),
      "=0 not explained as damage",
    );
    check((await saved()).actors.livia.hp === 12, "invalid input changed HP");
    await shot("b12-2-hp-invalid-1440.png");
    await menu.locator("#token-menu-hp-input").fill("-2");
    await menu.locator("#token-menu-hp-input").press("Enter");
    check((await saved()).actors.livia.hp === 10, "-2 after the error not applied");
    check(
      (await menu.locator("[data-token-menu-undo]").innerText()).includes(
        "Annulla: Livia: danno 2 (menu della pedina)",
      ),
      "Undo does not name the change it reverts",
    );
    await menu.locator("[data-token-menu-undo]").click();
    check((await saved()).actors.livia.hp === 12, "menu Undo did not restore 12");
    const s = await saved();
    const labels = s.log.map((l) => l.label);
    for (const label of [
      "Livia: danno 5 (menu della pedina)",
      "Livia: cura 3 (menu della pedina)",
      "Livia: PF impostati a 12 (menu della pedina)",
    ])
      check(labels.includes(label), "log lacks " + label);
    check(s.log.at(-1).kind === "correction", "Undo left no correction");
    await closeMenu();
    // The Table's Registro shows the same entries (the core log or an area's replacement).
    // B61: Registro is a tab of the Table's right sidebar; B62: the first sub-tab of «Chat».
    await toggleLog(page);
    const logText = await page.locator(".table-log").innerText();
    if (logText.includes("Livia: danno 5 (menu della pedina)"))
      notes.push("Registro lists the HP entries");
    else
      notes.push(
        "Registro panel replaced by another area without commit labels; log checked in state",
      );
    await toggleLog(page);
    // The sheet reads the same HP after a reload.
    await page.reload();
    await role("player");
    await openOn("livia");
    await item("token-menu-sheet").click();
    await page.locator(".character-hp strong").waitFor();
    check(
      (await page.locator(".character-hp strong").innerText()).startsWith("12"),
      "sheet does not show 12 HP",
    );
  });

  await group(
    "3 · Hide: player loses token and turn-order row, DM sees it faded; reveal; reload",
    async () => {
      await reset();
      await role("dm");
      await startCombat();
      await openOn("goblin-2");
      await item("token-menu-hide").click();
      check(tokenOf(await saved(), "goblin-2").hidden === true, "goblin-2 not hidden");
      check((await saved()).log.at(-1).visibility === "private", "hide label is not DM-only");
      const faded = await tok("goblin-2")
        .locator(".token-display")
        .first()
        .evaluate((n) => [getComputedStyle(n).filter, getComputedStyle(n).opacity]);
      check(faded[0].includes("grayscale") && faded[1] === "0.5", "DM view not faded: " + faded);
      check(
        (await page.locator('[data-token-menu-deco="goblin-2"] .hidden-badge').count()) === 1,
        "eye-slash badge missing",
      );
      check(
        (await item("token-menu-hide").innerText()).startsWith("Rivela ai giocatori"),
        "menu does not offer Reveal",
      );
      await closeMenu();
      await shot("b12-3-dm-hidden-faded-1440.png");
      await role("player");
      check((await tok("goblin-2").count()) === 0, "player sees the hidden token");
      check(
        (await page.locator('.initiative [data-select="goblin-2"]').count()) === 0,
        "player sees the hidden turn-order row",
      );
      check(!(await page.locator(".initiative").innerText()).includes("Esploratore"), "name leaks");
      await shot("b12-3-player-hidden-1440.png");
      await page.reload();
      await role("player");
      check((await tok("goblin-2").count()) === 0, "reload revealed the token");
      await role("dm");
      check(
        (await page.locator('.initiative [data-select="goblin-2"]').count()) === 1,
        "DM lost row",
      );
      await openOn("goblin-2");
      await item("token-menu-hide").click();
      await closeMenu();
      check(tokenOf(await saved(), "goblin-2").hidden === false, "Reveal failed");
      // Shift+H on the selected token does the same from the keyboard.
      await tok("goblin-1").focus();
      await page.keyboard.press("Enter");
      await tok("goblin-1").focus();
      await page.keyboard.press("Shift+H");
      check(tokenOf(await saved(), "goblin-1").hidden === true, "Shift+H did not hide");
      await page.keyboard.press("Shift+H");
      check(tokenOf(await saved(), "goblin-1").hidden === false, "Shift+H did not reveal");
      await page.reload();
      await role("player");
      check((await tok("goblin-2").count()) === 1, "revealed token missing after reload");
      check(
        (await page.locator('.initiative [data-select="goblin-2"]').count()) === 1,
        "revealed row missing after reload",
      );
    },
  );

  await group(
    "4 · Box + Shift on three NPCs, group, lock, copy and paste: independent sheets",
    async () => {
      await reset();
      await role("dm");
      // A third NPC through the menu: copy the Sentinel, right-click an empty spot to paste.
      await openOn("goblin-1");
      await item("token-menu-copy").click();
      check(
        (await menu.locator(".token-menu-status").innerText()).includes("Copiate: 1"),
        "copy status",
      );
      await closeMenu();
      const map = await page.locator("#battle-map").boundingBox();
      const g1 = await tok("goblin-1").boundingBox();
      const g2 = await tok("goblin-2").boundingBox();
      // Screen position of an empty courtyard spot (scene 850, 180), outside the later box.
      const spot = await page.locator("#battle-map").evaluate((svg) => {
        const p = svg.createSVGPoint();
        p.x = 850;
        p.y = 180;
        const q = p.matrixTransform(svg.getScreenCTM());
        return { x: q.x, y: q.y };
      });
      // Review fix: the empty-map right-click opens the scene menu (R20-129); nothing is
      // pasted until "Paste here" is chosen, and the result is reported with Undo.
      const actorsBefore = Object.keys((await saved()).actors).length;
      await page.mouse.click(spot.x, spot.y, { button: "right" });
      await menu.locator('[data-token-menu-scene="paste"]').waitFor();
      check(
        Object.keys((await saved()).actors).length === actorsBefore,
        "right-click alone pasted",
      );
      check(
        (await menu.locator('[data-token-menu-scene="paste"]').innerText()).includes(
          "Incolla qui (1)",
        ),
        "scene menu lacks Paste here (1)",
      );
      await page.keyboard.press("Escape");
      await page.mouse.click(spot.x + 40, spot.y + 40, { button: "right" });
      await page.keyboard.press("Escape");
      check(
        Object.keys((await saved()).actors).length === actorsBefore,
        "repeated right-clicks pasted",
      );
      await page.mouse.click(spot.x, spot.y, { button: "right" });
      await menu.locator('[data-token-menu-scene="paste"]').click();
      check(
        (await menu.locator(".token-menu-status").innerText()).includes("Incollate: Sentinella B"),
        "paste result not reported in the menu",
      );
      check(
        (await page.locator("#map-message").innerText()).includes("Incollate: Sentinella B"),
        "paste result not reported on the map",
      );
      check((await menu.locator("[data-token-menu-undo]").count()) === 1, "no Undo after paste");
      await closeMenu();
      let s = await saved();
      const third = Object.values(s.actors).find((a) => a.name === "Sentinella B");
      check(third, "scene-menu paste did not create Sentinella B");
      // Box selection around the two goblins with the Select tool, Shift+click adds the third.
      await pickTool("token-menu-select");
      await page.mouse.move(g1.x - 15, g1.y - 15);
      await page.mouse.down();
      await page.mouse.move(g2.x + g2.width + 15, g1.y + g1.height + 8, { steps: 6 });
      await page.mouse.move(g2.x + g2.width + 15, g2.y + g2.height + 12, { steps: 3 });
      await page.mouse.up();
      const panel = page.locator("[data-token-menu-panel]");
      const picked = await panel.locator(".token-menu-picked").innerText();
      check(picked.startsWith("2 selezionate"), "box did not select two: " + picked);
      await tok(third.id).click({ modifiers: ["Shift"] });
      check(
        (await panel.locator(".token-menu-picked").innerText()).startsWith("3 selezionate"),
        "Shift+click did not add the third",
      );
      await openOn("goblin-2");
      check(
        (await menu.locator(".token-menu-multi").innerText()).startsWith(
          "3 pedine selezionate: PF e voci con ×3",
        ),
        "menu does not say what applies to 3",
      );
      check(
        (await item("token-menu-group").locator(".token-menu-many").innerText()) === "×3",
        "group item not marked ×3",
      );
      await item("token-menu-group").click();
      s = await saved();
      const groups = Object.values(s.ext["token-menu"].groups);
      check(groups.length === 1 && groups[0].tokenIds.length === 3, "group of 3 not saved");
      await closeMenu();
      await shot("b12-4-selection-group-1440.png");
      await page.locator("#battle-map").focus();
      await page.keyboard.press("Shift+L");
      s = await saved();
      check(
        groups[0].tokenIds.every((id) => s.ext["token-menu"].tokens[id]?.locked),
        "Shift+L did not lock the group",
      );
      // Locked: a drag with the Move tool and the arrow keys do not move it.
      await pickTool("move");
      const before = tokenOf(await saved(), "goblin-1");
      const g1b = await tok("goblin-1").boundingBox();
      await page.mouse.move(g1b.x + g1b.width / 2, g1b.y + g1b.height / 2);
      await page.mouse.down();
      await page.mouse.move(g1b.x + 90, g1b.y + 60, { steps: 6 });
      await page.mouse.up();
      const after = tokenOf(await saved(), "goblin-1");
      check(before.x === after.x && before.y === after.y, "locked token moved by drag");
      check(
        (await page.locator("#map-message").innerText()).includes("Pedina bloccata"),
        "no lock explanation",
      );
      await tok("goblin-1").focus();
      await page.keyboard.press("ArrowRight");
      check(
        (await page.locator("#map-message").innerText()).includes("Pedina bloccata"),
        "arrow key not refused",
      );
      // Copy and paste the whole group from the keyboard, under the pointer.
      await tok("goblin-1").click({ modifiers: ["Shift"] });
      await tok("goblin-1").click({ modifiers: ["Shift"] });
      await page.locator("#battle-map").focus();
      const mod = "Control"; // the map accepts Ctrl or Cmd
      await page.keyboard.press(mod + "+c");
      check(
        (await page.locator("#map-message").innerText()).startsWith("Copiate: 3"),
        "Ctrl+C did not copy three",
      );
      await page.mouse.move(map.x + map.width * 0.3, map.y + map.height * 0.25);
      await page.keyboard.press(mod + "+v");
      s = await saved();
      const copies = Object.values(s.actors).filter(
        (a) => a.id.includes("-c") && !["Sentinella B"].includes(a.name),
      );
      check(
        copies.length === 3,
        "paste did not create three creatures: " + copies.map((a) => a.name),
      );
      const names = copies.map((a) => a.name).sort();
      check(
        JSON.stringify(names) === JSON.stringify(["Esploratore B", "Sentinella C", "Sentinella D"]),
        "copy names " + names,
      );
      const copyTokens = copies.map((a) => tokenOf(s, a.id).id);
      check(
        copyTokens.every((id) => !s.ext["token-menu"].tokens[id]?.locked),
        "copies came out locked",
      );
      check(
        Object.values(s.ext["token-menu"].groups).some((g) =>
          copyTokens.every((id) => g.tokenIds.includes(id)),
        ),
        "copies not grouped together",
      );
      // Independent sheets: damage on a copy leaves the original alone.
      const copy = copies.find((a) => a.name === "Sentinella C");
      await openOn(copy.id);
      await hp("-3");
      s = await saved();
      check(
        s.actors[copy.id].hp === 4 && s.actors["goblin-1"].hp === 7,
        "sheets are not independent",
      );
      await closeMenu();
      await page.goto("http://127.0.0.1:8879/#characters?id=" + copy.id + "&tab=actions");
      await page.locator(".character-hp strong").waitFor();
      check(
        (await page.locator(".character-hp strong").innerText()).startsWith("4"),
        "copy sheet HP",
      );
      await page.goto("http://127.0.0.1:8879/#characters?id=goblin-1&tab=actions");
      await page.locator(".character-hp strong").waitFor();
      check(
        (await page.locator(".character-hp strong").innerText()).startsWith("7"),
        "original sheet HP",
      );
      await page.goto("http://127.0.0.1:8879/#table");
      await page.locator("#battle-map").focus();
      await page.keyboard.press(mod + "+z");
      check((await saved()).actors[copy.id].hp === 7, "Undo did not restore the copy's HP");
    },
  );

  await group("5 · Visible only to Livia: her player sees it, Doran's does not", async () => {
    await reset();
    await role("dm");
    await openOn("goblin-2");
    await item("token-menu-audience").click();
    const dialog = page.locator("#dialog");
    await dialog.locator('[name=mode][value="some"]').check();
    await dialog.locator('[name=audience][value="livia"]').check();
    const who = async (id) => dialog.locator(`[data-token-menu-who="${id}"]`).innerText();
    check((await who("livia")).includes("la vede"), "preview Livia");
    check((await who("doran")).includes("non la vede"), "preview Doran");
    check((await who("mira")).includes("non la vede"), "preview Mira");
    await shot("b12-5-audience-dialog-1440.png");
    await dialog.locator("button[type=submit]").click();
    let s = await saved();
    check(tokenOf(s, "goblin-2").hidden === true, "token not hidden for the others");
    check(
      JSON.stringify(s.ext["token-menu"].tokens["token-goblin-2"].audience) === '["livia"]',
      "audience not saved",
    );
    check(
      (await page
        .locator('[data-token-menu-deco="goblin-2"] .token-menu-caption')
        .textContent()) === "solo Livia",
      "DM caption",
    );
    await role("player");
    const ghost = page.locator('#battle-map [data-token-menu-ghost="goblin-2"]');
    check((await ghost.count()) === 1, "Livia's player does not see it");
    check(
      (await ghost.getAttribute("aria-label")) === "Esploratore, visibile solo a te e al DM",
      "ghost accessible name",
    );
    check((await tok("goblin-2").count()) === 0, "core token leaked");
    await ghost.click({ button: "right" });
    await menu.locator(".token-menu-head").waitFor();
    check(
      (await menu.locator(".token-menu-head").innerText()).includes("Visibile solo a te e al DM"),
      "observer menu fact",
    );
    check((await menu.locator("#token-menu-hp-input").count()) === 0, "player got HP field");
    await shot("b12-5-player-audience-1440.png");
    await closeMenu();
    await page.reload();
    await role("player");
    check((await ghost.count()) === 1, "reload lost the audience");
    await role("dm");
    await openOn("goblin-2");
    await item("token-menu-audience").click();
    await dialog.locator('[name=audience][value="livia"]').uncheck();
    await dialog.locator('[name=audience][value="doran"]').check();
    check((await who("livia")).includes("non la vede"), "preview after change");
    await dialog.locator("button[type=submit]").click();
    await role("player");
    check(
      (await ghost.count()) === 0 && (await tok("goblin-2").count()) === 0,
      "Livia's player still sees a Doran-only token",
    );
    notes.push(
      "The demo has no identity that plays only Doran (Doran is DM-run). Doran-only viewing is proven by the dialog preview and by the Node test with a Doran-only viewer; Livia's player (who also plays Mira) is excluded from a Doran-only token.",
    );
  });

  await group(
    "6 · Double-click row centres the token; Tab/arrows read names without secrets",
    async () => {
      await reset();
      await role("dm");
      await startCombat();
      await page.locator('.initiative [data-select="goblin-2"]').dblclick();
      await page.waitForTimeout(100);
      const view = await page
        .locator("#battle-map")
        .evaluate((n) => n.getAttribute("viewBox").split(" ").map(Number));
      const centre = [view[0] + view[2] / 2, view[1] + view[3] / 2];
      const t2 = tokenOf(await saved(), "goblin-2");
      check(
        Math.abs(centre[0] - t2.x) < 2 && Math.abs(centre[1] - t2.y) < 2 && view[2] <= 667,
        "row double-click did not centre: " + view,
      );
      check((await page.locator(".token-menu-ping").count()) === 1, "no ping on the found token");
      await shot("b12-6-row-centred-1440.png");
      // The token list in the inspector: arrows move, double-click centres.
      const details = page.locator(".token-menu-list-details");
      await details.locator("summary").click();
      const rows = details.locator("[data-token-menu-row]");
      await rows.first().focus();
      const first = (await active()).text;
      await page.keyboard.press("ArrowDown");
      const second = (await active()).text;
      check(first !== second, "arrow did not move in the token list");
      await details.locator('[data-token-menu-row="livia"]').dblclick();
      const view2 = await page
        .locator("#battle-map")
        .evaluate((n) => n.getAttribute("viewBox").split(" ").map(Number));
      const lv = tokenOf(await saved(), "livia");
      check(Math.abs(view2[0] + view2[2] / 2 - lv.x) < 2, "list double-click did not centre");
      await page.locator('[data-table="fit"]').click();
      // A hidden name: players' screen readers get the alias, the DM keeps the real one.
      await openOn("goblin-1");
      await item("token-menu-hide-name").click();
      await closeMenu();
      check(
        (await page
          .locator('[data-token-menu-deco="goblin-1"] .token-menu-caption')
          .textContent()) === "Sentinella",
        "DM caption lacks the real name",
      );
      await shot("b12-6-hidden-name-dm-1440.png");
      await role("player");
      await page.locator("#battle-map").focus();
      const heard = [];
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press("Tab");
        const a = await active();
        if (a.actor || a.label) heard.push(a.label);
      }
      check(
        heard.some((l) => l?.startsWith("Creatura sconosciuta 1")),
        "alias not read: " + heard,
      );
      check(!heard.some((l) => l?.includes("Sentinella")), "real name read: " + heard);
      check(
        !(await page.locator(".initiative").innerText()).includes("Sentinella"),
        "turn order leaks the real name",
      );
      check(
        !(await page.locator("[data-token-menu-panel]").innerText()).includes("Sentinella"),
        "token list leaks the real name",
      );
      notes.push("player Tab reads: " + heard.join(" → "));
    },
  );

  await group("7 · Conditions from the menu stay in sync with the sheet", async () => {
    await reset();
    await role("dm");
    await openOn("goblin-2");
    await item("token-menu-conditions").click();
    await menu.locator('[data-token-menu-condition="poisoned"]').click();
    check(
      (await menu
        .locator('[data-token-menu-condition="poisoned"]')
        .getAttribute("aria-checked")) === "true",
      "palette not checked",
    );
    check(
      (await page
        .locator('[data-token-menu-deco="goblin-2"] [data-token-menu-icon="poisoned"]')
        .count()) === 1,
      "token status icon missing",
    );
    check(
      (await menu.locator(".token-menu-conditions").innerText()).includes("Avvelenato"),
      "menu header chip missing",
    );
    await shot("b12-7-conditions-1440.png");
    await page.keyboard.press("Escape");
    await item("token-menu-sheet").click();
    await page.locator('[data-conditions-chip="poisoned"]').first().waitFor();
    // Sheet → menu: Prone applied in the sheet's conditions panel shows up in the menu.
    await page.locator("[data-conditions-entry=goblin-2]").first().click();
    await page.locator("[data-conditions-command=add]").click();
    await page.locator("[data-conditions-definition=prone]").click();
    await page.locator("[data-conditions-preview]").click();
    await page.locator("[data-conditions-apply]").click();
    await page.locator("#dialog footer [data-close]").first().click();
    await page.goto("http://127.0.0.1:8879/#table");
    await page.locator("#battle-map").waitFor();
    await openOn("goblin-2");
    await item("token-menu-conditions").click();
    check(
      (await menu.locator('[data-token-menu-condition="prone"]').getAttribute("aria-checked")) ===
        "true",
      "sheet condition not in the menu",
    );
    await menu.locator('[data-token-menu-condition="poisoned"]').click();
    check(
      !(await saved()).actors["goblin-2"].conditions.some((c) => c.id === "poisoned"),
      "ending from the menu failed",
    );
    await page.keyboard.press("Escape");
    await item("token-menu-sheet").click();
    await page.locator('[data-conditions-chip="prone"]').first().waitFor();
    check(
      (await page.locator('[data-conditions-chip="poisoned"]').count()) === 0,
      "sheet still shows Poisoned",
    );
  });

  await group("8 · Every drag has a menu or keyboard alternative", async () => {
    await reset();
    await role("dm");
    // Box select → Shift+Enter on focused tokens, or the menu item.
    await tok("goblin-1").focus();
    await page.keyboard.press("Shift+Enter");
    await tok("goblin-2").focus();
    await page.keyboard.press("Shift+Enter");
    const picked = await page.locator("[data-token-menu-panel] .token-menu-picked").innerText();
    check(
      picked.includes("Sentinella") && picked.includes("Esploratore"),
      "Shift+Enter: " + picked,
    );
    await openOn("doran");
    await item("token-menu-pick").click();
    check(
      (await item("token-menu-pick").innerText()).startsWith("Togli dalla selezione"),
      "menu pick did not toggle",
    );
    await closeMenu();
    // Token drag → arrows + Enter (core), unlocked token moves.
    await tok("mira").focus();
    await page.keyboard.press("Enter");
    const start = tokenOf(await saved(), "mira");
    await page.locator("#battle-map").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    const moved = tokenOf(await saved(), "mira");
    check(moved.x > start.x, "keyboard move alternative failed");
  });

  await group(
    "9 · EN phone 390: long-press sheet, tap then …, HP, 40 px targets, no overflow",
    async () => {
      const context = await page
        .context()
        .browser()
        .newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      const phone = await context.newPage();
      phone.on("pageerror", (e) => errors.push("phone: " + e.message));
      await phone.goto("http://127.0.0.1:8879/#table");
      await phone.evaluate(() => localStorage.clear());
      await phone.reload();
      await phone.locator('[data-service="preferences"]').click();
      await phone.locator('#dialog [name="lang"]').selectOption("en");
      await phone.locator('#dialog button[type="submit"]').click();
      await phone.locator("#demo-role").selectOption("dm");
      const pmenu = phone.locator("body > .token-menu");
      const cdp = await context.newCDPSession(phone);
      const longPress = async (selector) => {
        const node = phone.locator(selector);
        await node.scrollIntoViewIfNeeded();
        const b = await node.boundingBox();
        const x = b.x + b.width / 2,
          y = b.y + b.height / 2;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        await phone.waitForTimeout(750);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await phone.waitForTimeout(250);
      };
      await longPress('#battle-map [data-actor="goblin-1"]');
      check(await pmenu.evaluate((n) => !n.hidden), "long-press did not open the menu");
      check((await pmenu.getAttribute("class")).includes("sheet"), "no bottom sheet on the phone");
      // B62: «Hide from players» sits in the «Visibility» submenu with its shortcut.
      await pmenu.locator('[data-token-menu-category="visibility"]').tap();
      const labels = await pmenu.locator("[role=menuitem] .token-menu-label").allInnerTexts();
      check(labels.includes("Hide from players"), "English labels: " + labels);
      check((await pmenu.locator("kbd").allInnerTexts()).includes("Shift+H"), "EN shortcut");
      await pmenu.locator("[data-token-menu-back]").tap();
      const small = await pmenu.evaluate((n) =>
        [...n.querySelectorAll("button, input")]
          .map((b) => [b.textContent.trim().slice(0, 18), b.getBoundingClientRect().height])
          .filter(([, h]) => h < 40),
      );
      check(!small.length, "targets under 40 px: " + JSON.stringify(small));
      check(
        (await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0,
        "horizontal overflow",
      );
      // Second review: the first-visit tip (docked at the bottom on a phone) stays behind the
      // sheet the user just opened, instead of covering its lower rows.
      // The tip's text lets pointers through; its buttons do not: probe at its first button.
      const front = await phone.evaluate(() => {
        const button = document.querySelector(".home-pop:not(:empty) .home-pop-actions .button");
        const sheet = document.querySelector("body > .token-menu");
        if (!button) return "no tip";
        const r = button.getBoundingClientRect();
        const m = sheet.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        if (y < m.top || y > m.bottom) return "no overlap";
        return sheet.contains(document.elementFromPoint(x, y)) ? "menu" : "tip";
      });
      check(front !== "tip", "the help tip covers the sheet");
      notes.push("390: tip and long-press sheet → in front: " + front);
      await phone.screenshot({ path: dir + "b12-9-phone-longpress-390.png" });
      await pmenu.locator("#token-menu-hp-input").fill("-2");
      await pmenu.locator("#token-menu-hp-input").press("Enter");
      const s = await phone.evaluate(() =>
        JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")),
      );
      check(s.actors["goblin-1"].hp === 5, "phone HP -2");
      check(
        (await pmenu.locator(".token-menu-status").innerText()).startsWith("HP 7 → 5"),
        "EN status",
      );
      await pmenu.locator("[data-token-menu-close]").tap();
      check(await pmenu.evaluate((n) => n.hidden), "close button");
      // Tap then "…" (Owlbear): the inspector button opens the same menu.
      await phone.locator("[data-token-menu-open]").scrollIntoViewIfNeeded();
      await phone.locator("[data-token-menu-open]").tap();
      check(await pmenu.evaluate((n) => !n.hidden), "the … button did not open the menu");
      await pmenu.locator("[data-token-menu-close]").tap();
      await phone.locator("#demo-role").selectOption("player");
      await longPress('#battle-map [data-actor="livia"]');
      check((await pmenu.locator("#token-menu-hp-input").inputValue()) === "18", "player HP field");
      await phone.screenshot({ path: dir + "b12-9-phone-player-390.png" });
      check(
        (await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0,
        "player overflow",
      );
      await context.close();
    },
  );

  // ---------------------------------------------------------------- review fixes
  const sceneSpot = (x, y) =>
    page.locator("#battle-map").evaluate(
      (svg, [sx, sy]) => {
        const p = svg.createSVGPoint();
        p.x = sx;
        p.y = sy;
        const q = p.matrixTransform(svg.getScreenCTM());
        return { x: q.x, y: q.y };
      },
      [x, y],
    );
  const conditionIds = (s, id) =>
    (s.actors[id].conditions ?? []).map((c) => (typeof c === "string" ? c : c.id));

  await group("10 · Review: HP and conditions reach every selected token", async () => {
    await reset();
    await role("dm");
    // The review's case: Sentinella and Esploratore added with Shift+Enter (Livia, the
    // current selection, joins them: three selected).
    await tok("goblin-1").focus();
    await page.keyboard.press("Shift+Enter");
    await tok("goblin-2").focus();
    await page.keyboard.press("Shift+Enter");
    await tok("goblin-2").click({ button: "right" });
    await menu.locator("[data-nav]").first().waitFor();
    const multi = await menu.locator(".token-menu-multi").innerText();
    check(multi.startsWith("3 pedine selezionate: PF e voci con ×3"), "multi header: " + multi);
    await hp("-3");
    let s = await saved();
    check(
      s.actors["goblin-2"].hp === 6 && s.actors["goblin-1"].hp === 4 && s.actors.livia.hp === 15,
      "-3 did not reach the three: " +
        [s.actors["goblin-2"].hp, s.actors["goblin-1"].hp, s.actors.livia.hp],
    );
    const status = await menu.locator(".token-menu-status").innerText();
    check(
      status.includes("Sentinella 7 → 4") && status.includes("Esploratore 9 → 6"),
      "status: " + status,
    );
    const label = s.log.at(-1).label;
    check(
      label.startsWith("Danno 3 (menu della pedina): ") &&
        ["Sentinella", "Esploratore", "Livia"].every((n) => label.includes(n)),
      "one record for the group: " + label,
    );
    await shot("b12-10-multi-hp-1440.png");
    await menu.locator("[data-token-menu-undo]").click();
    s = await saved();
    check(
      s.actors["goblin-2"].hp === 9 && s.actors["goblin-1"].hp === 7 && s.actors.livia.hp === 18,
      "one Undo did not restore the three",
    );
    await item("token-menu-conditions").click();
    await menu.locator('[data-token-menu-condition="prone"]').click();
    s = await saved();
    check(
      ["goblin-1", "goblin-2", "livia"].every((id) => conditionIds(s, id).includes("prone")),
      "Prone did not reach the three",
    );
    await menu.locator('[data-token-menu-condition="prone"]').click();
    s = await saved();
    check(
      ["goblin-1", "goblin-2", "livia"].every((id) => !conditionIds(s, id).includes("prone")),
      "ending Prone did not reach the three",
    );
    await page.keyboard.press("Escape");
    await closeMenu();
  });

  await group("11 · Review: at 0 HP or dead the field guides to healing or the panel", async () => {
    await reset();
    await role("player");
    await openOn("livia");
    await hp("-18");
    let s = await saved();
    check(s.actors.livia.hp === 0 && conditionIds(s, "livia").includes("unconscious"), "0 HP");
    await hp("=5");
    const error = await menu.locator("#token-menu-hp-error").innerText();
    check(error.includes("+5") && error.includes("Privo di sensi"), "0-HP set: " + error);
    check((await saved()).actors.livia.hp === 0, "=5 changed HP at 0");
    check(
      (await menu.locator('[data-focus-key="full-hp"]').count()) === 1,
      "no way to the conditions panel",
    );
    await shot("b12-11-zero-hp-guidance-1440.png");
    await hp("+5");
    s = await saved();
    check(
      s.actors.livia.hp === 5 && !conditionIds(s, "livia").includes("unconscious"),
      "healing did not end Unconscious",
    );
    await hp("=50");
    check(
      (await menu.locator("#token-menu-hp-error").innerText()).includes("22"),
      "above max not explained",
    );
    await hp("-5");
    await hp("5");
    await menu.locator('[data-focus-key="full-hp"]').click();
    check(!(await isOpen()), "menu stayed open over the panel");
    check(
      await page.locator("#dialog").evaluate((d) => d.open),
      "the conditions panel did not open",
    );
    notes.push(
      "11: panel heading after the guidance: " +
        (await page.locator("#dialog h2").first().innerText()),
    );
    await page.keyboard.press("Escape");
  });

  await group("12 · Review: focus stays with the menu, the token and the dialogs", async () => {
    await reset();
    await role("dm");
    const openByKeys = async () => {
      await tok("goblin-1").focus();
      await page.keyboard.press("Shift+F10");
      await menu.locator("[data-nav]").first().waitFor();
    };
    await openByKeys();
    for (let i = 0; i < 12 && (await isOpen()); i++) await page.keyboard.press("Tab");
    check(!(await isOpen()), "Tab never closed the menu");
    check((await active()).actor === "goblin-1", "Tab past the end lost the token focus");
    await openByKeys();
    for (let i = 0; i < 12 && (await isOpen()); i++) await page.keyboard.press("Shift+Tab");
    check((await active()).actor === "goblin-1", "Shift+Tab past the start lost the focus");
    // Focus moved elsewhere closes the menu (no menu left open behind the page).
    await openByKeys();
    await page.locator("#demo-role").focus();
    await page.waitForTimeout(50);
    check(!(await isOpen()), "menu stayed open after the focus left");
    // Rename: the field gets the focus; after Enter or Escape the token has it back.
    await openByKeys();
    await item("token-menu-rename").click();
    check(
      await page.evaluate(() => document.activeElement?.getAttribute("name") === "name"),
      "Rename did not focus the name field",
    );
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("Vedetta");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(80);
    check((await saved()).actors["goblin-1"].name === "Vedetta", "rename not applied");
    check(
      (await active()).actor === "goblin-1",
      "focus after Rename: " + JSON.stringify(await active()),
    );
    await openByKeys();
    await item("token-menu-rename").click();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(80);
    check((await active()).actor === "goblin-1", "focus after Rename Escape");
    await openByKeys();
    await item("token-menu-audience").click();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(80);
    check((await active()).actor === "goblin-1", "focus after Visible only to… Escape");
  });

  await group("13 · Review: tools keep their Shift+click; hotkeys and locks explain", async () => {
    await reset();
    await role("dm");
    await pickTool("pointer");
    await tok("goblin-1").click({ modifiers: ["Shift"] });
    await page.waitForTimeout(80);
    check(
      (await page.locator("#map-message").innerText()).includes("Proposta inviata"),
      "pointer Shift+click on a token: " + (await page.locator("#map-message").innerText()),
    );
    check(
      (await page.locator("[data-token-menu-panel] .token-menu-picked").count()) === 0,
      "pointer Shift+click selected tokens",
    );
    await pickTool("move");
    await tok("goblin-1").focus();
    await page.keyboard.press("Enter");
    await tok("goblin-1").focus();
    const messages = [];
    for (const key of ["Shift+H", "Shift+H", "Shift+L", "Shift+L"]) {
      await page.keyboard.press(key);
      messages.push(await page.locator("#map-message").innerText());
    }
    check(
      messages.join(" | ") ===
        "Nascosta: Sentinella | Rivelata: Sentinella | Bloccata: Sentinella | Sbloccata: Sentinella",
      "hotkey feedback: " + messages.join(" | "),
    );
    // The DM locks Livia: her player is told who locked it and sees the lock.
    await tok("livia").focus();
    await page.keyboard.press("Enter");
    await tok("livia").focus();
    await page.keyboard.press("Shift+L");
    await role("player");
    const b = await tok("livia").boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + 90, b.y + 40, { steps: 5 });
    await page.mouse.up();
    check(
      (await page.locator("#map-message").innerText()).startsWith(
        "Il DM ha bloccato questa pedina",
      ),
      "player lock message: " + (await page.locator("#map-message").innerText()),
    );
    check(
      (
        await page
          .locator('[data-token-menu-deco="livia"] .token-menu-badge title')
          .allTextContents()
      ).includes("Bloccata dal DM"),
      "player sees no lock badge",
    );
    await openOn("livia");
    check(
      (await menu.locator(".token-menu-head").innerText()).includes("Bloccata dal DM"),
      "player menu lacks the lock fact",
    );
    await shot("b12-13-player-locked-1440.png");
    await closeMenu();
  });

  await group("14 · Review: hidden names keep the real name for the DM everywhere", async () => {
    await reset();
    await role("dm");
    await openOn("goblin-1");
    // A paste reproduces what was copied (DDB-119): copied after hiding the name, the copy
    // gets its own alias; a copy made earlier would paste the visible name.
    await item("token-menu-hide-name").click();
    await item("token-menu-copy").click();
    await closeMenu();
    const spot = await sceneSpot(850, 180);
    await page.mouse.click(spot.x, spot.y, { button: "right" });
    await menu.locator('[data-token-menu-scene="paste"]').click();
    await closeMenu();
    const s = await saved();
    const copy = Object.values(s.actors).find(
      (a) => s.ext["token-menu"].names[a.id]?.trueName === "Sentinella B",
    );
    check(copy?.name === "Creatura sconosciuta 2", "copy alias: " + copy?.name);
    // Turn-order row and inspector are covered by the same projection; here, other areas.
    await page.goto("http://127.0.0.1:8879/#characters?id=goblin-1&tab=actions");
    await page.locator("h1").first().waitFor();
    const h1 = await page.locator("h1").first().innerText();
    check(h1.includes("Sentinella") && h1.includes("Creatura sconosciuta 1"), "DM sheet h1: " + h1);
    await shot("b12-14-dm-sheet-true-name-1440.png");
    await page.goto("http://127.0.0.1:8879/#preparation?id=old-watch");
    await page.waitForTimeout(200);
    const prep = await page.locator("#content").innerText();
    check(
      prep.includes("Creatura sconosciuta 1 · Sentinella") &&
        prep.includes("Creatura sconosciuta 2 · Sentinella B"),
      "Preparation does not tell the copies apart",
    );
    await shot("b12-14-dm-preparation-1440.png");
    await page.goto("http://127.0.0.1:8879/#table");
    await page.locator("#battle-map").waitFor();
    check(
      (await tok("goblin-1").getAttribute("aria-label")).startsWith(
        "Creatura sconosciuta 1 · Sentinella",
      ),
      "DM token accessible name",
    );
    // An English player reads the aliases in English and never the real names.
    await page.locator('[data-service="preferences"]').click();
    await page.locator('#dialog [name="lang"]').selectOption("en");
    await page.locator('#dialog button[type="submit"]').click();
    await role("player");
    const label = await tok("goblin-1").getAttribute("aria-label");
    check(label === "Unknown creature 1", "EN player alias: " + label);
    const body = await page.locator("body").innerText();
    check(!body.includes("Sentinella") && !body.includes("Creatura sconosciuta"), "EN player text");
    await openOn("goblin-1");
    check(
      (await menu.locator(".token-menu-head").innerText()).includes("Unknown creature 1"),
      "EN player menu header",
    );
    await closeMenu();
    await shot("b12-14-player-en-alias-1440.png");
    await page.locator('[data-service="preferences"]').click();
    await page.locator('#dialog [name="lang"]').selectOption("it");
    await page.locator('#dialog button[type="submit"]').click();
  });

  await group("15 · Review: scene and door menus, Delete, select all, rotation", async () => {
    await reset();
    await role("dm");
    // Delete removes the focused token from the scene; the sheet stays; Ctrl+Z undoes.
    await tok("goblin-2").focus();
    await page.keyboard.press("Delete");
    let s = await saved();
    check(!tokenOf(s, "goblin-2") && s.actors["goblin-2"], "Delete: token/sheet");
    check(
      (await page.locator("#map-message").innerText()).startsWith("Tolte dalla scena: Esploratore"),
      "Delete not reported",
    );
    await page.locator("#battle-map").focus();
    await page.keyboard.press("Control+z");
    check(tokenOf(await saved(), "goblin-2"), "Ctrl+Z did not restore the token");
    // Scene menu: select all tokens.
    const spot = await sceneSpot(900, 560);
    await page.mouse.click(spot.x, spot.y, { button: "right" });
    await menu.locator('[data-token-menu-scene="select-all"]').click();
    check(
      (await page.locator("[data-token-menu-panel] .token-menu-picked").innerText()).startsWith(
        "5 selezionate",
      ),
      "select all",
    );
    await shot("b12-15-scene-menu-1440.png");
    await closeMenu();
    // Rotation: TouchVTT-style buttons turn the portrait and draw the facing arrow.
    await page.locator("[data-token-menu-panel] [data-token-menu-clear]").click();
    await openOn("goblin-1");
    await item("token-menu-rotate").click();
    await menu.locator('[data-token-menu-rotate="right"]').click();
    await menu.locator('[data-token-menu-rotate="right"]').click();
    s = await saved();
    check(s.ext["token-menu"].tokens["token-goblin-1"]?.rotation === 90, "rotation not 90");
    check(
      (await page.locator('[data-token-menu-deco="goblin-1"] .token-menu-facing').count()) === 1,
      "no facing arrow",
    );
    check(
      (await menu.locator("[data-token-menu-rotation]").innerText()) === "90°",
      "rotation readout",
    );
    await closeMenu();
    // A door authored in Preparation gets its own labelled menu (X-06).
    await page.goto("http://127.0.0.1:8879/#preparation?id=old-watch");
    await page.getByRole("button", { name: "Porta", exact: true }).click();
    const prepMap = page.locator("[data-prep-interactive]");
    for (const [x, y] of [
      [470, 120],
      [470, 200],
    ]) {
      const p = await prepMap.evaluate(
        (svg, [sx, sy]) => {
          const pt = svg.createSVGPoint();
          pt.x = sx;
          pt.y = sy;
          const q = pt.matrixTransform(svg.getScreenCTM());
          return { x: q.x, y: q.y };
        },
        [x, y],
      );
      await page.mouse.click(p.x, p.y);
    }
    await page.getByRole("button", { name: "Salva preparazione", exact: true }).click();
    const update = page.getByRole("button", { name: "Aggiorna scena attiva", exact: true });
    if (await update.count()) await update.click();
    await page.goto("http://127.0.0.1:8879/#table");
    await page.locator("#battle-map").waitFor();
    const door = page.locator("#battle-map [data-door]").first();
    check((await door.count()) === 1, "authored door not on the Table");
    await door.click({ button: "right" });
    await menu.locator('[data-token-menu-scene="door-use"]').waitFor();
    check(
      (await menu.locator(".token-menu-head").innerText()).startsWith("Porta · Chiusa"),
      "door menu header",
    );
    await shot("b12-15-door-menu-1440.png");
    await menu.locator('[data-token-menu-scene="door-set:open"]').click();
    s = await saved();
    check(
      s.scenes[0].walls.find((w) => w.kind === "door").doorState === "open",
      "DM correction from the door menu",
    );
    await closeMenu();
    await door.focus();
    await page.keyboard.press("Shift+F10");
    await menu.locator('[data-token-menu-scene="door-use"]').click();
    check(await page.locator("#dialog").evaluate((d) => d.open), "door dialog did not open");
    await page.keyboard.press("Escape");
  });

  await group(
    "16 · Review: phone pinch, two-finger pan, empty-map long-press, rotation",
    async () => {
      const context = await page
        .context()
        .browser()
        .newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      const phone = await context.newPage();
      phone.on("pageerror", (e) => errors.push("phone: " + e.message));
      await phone.goto("http://127.0.0.1:8879/#table");
      await phone.evaluate(() => localStorage.clear());
      await phone.reload();
      await phone.locator('[data-service="preferences"]').click();
      await phone.locator('#dialog [name="lang"]').selectOption("en");
      await phone.locator('#dialog button[type="submit"]').click();
      await phone.locator("#demo-role").selectOption("dm");
      const tip = phone.getByRole("button", { name: "Got it", exact: true });
      if (await tip.count()) await tip.click();
      const pmenu = phone.locator("body > .token-menu");
      const cdp = await context.newCDPSession(phone);
      const touchAt = (type, points) =>
        cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
      const map = phone.locator("#battle-map");
      await map.scrollIntoViewIfNeeded();
      const b = await map.boundingBox();
      const cx = b.x + b.width / 2,
        cy = b.y + b.height * 0.25;
      const before = JSON.stringify(
        (
          await phone.evaluate(() =>
            JSON.parse(localStorage.getItem("d20-studio-blueprint-v1") ?? "null"),
          )
        )?.scenes?.[0]?.tokens ?? null,
      );
      check((await map.getAttribute("viewBox")) === "0 0 1000 650", "start view");
      await touchAt("touchStart", [
        { x: cx - 20, y: cy, id: 1 },
        { x: cx + 20, y: cy, id: 2 },
      ]);
      for (let i = 1; i <= 6; i++) {
        await touchAt("touchMove", [
          { x: cx - 20 - i * 5, y: cy, id: 1 },
          { x: cx + 20 + i * 5, y: cy, id: 2 },
        ]);
        await phone.waitForTimeout(25);
      }
      await touchAt("touchEnd", []);
      await phone.waitForTimeout(200);
      const zoomed = (await map.getAttribute("viewBox")).split(" ").map(Number);
      check(Math.abs(zoomed[2] - 400) < 1, "pinch ×2.5 → width 400: " + zoomed);
      await touchAt("touchStart", [
        { x: cx - 40, y: cy, id: 3 },
        { x: cx + 40, y: cy, id: 4 },
      ]);
      for (let i = 1; i <= 5; i++) {
        await touchAt("touchMove", [
          { x: cx - 40 - i * 10, y: cy + i * 4, id: 3 },
          { x: cx + 40 - i * 10, y: cy + i * 4, id: 4 },
        ]);
        await phone.waitForTimeout(25);
      }
      await touchAt("touchEnd", []);
      await phone.waitForTimeout(200);
      const panned = (await map.getAttribute("viewBox")).split(" ").map(Number);
      check(
        panned[2] === zoomed[2] && panned[0] > zoomed[0] && panned[1] < zoomed[1],
        "two-finger pan: " + zoomed + " → " + panned,
      );
      const after = JSON.stringify(
        (
          await phone.evaluate(() =>
            JSON.parse(localStorage.getItem("d20-studio-blueprint-v1") ?? "null"),
          )
        )?.scenes?.[0]?.tokens ?? null,
      );
      check(before === after || before === "null", "a gesture moved a token");
      // The popup element is created on first use: none yet means no menu was opened.
      check(
        (await pmenu.count()) === 0 || (await pmenu.evaluate((n) => n.hidden)),
        "a gesture opened the menu",
      );
      check((await phone.evaluate(() => visualViewport.scale)) === 1, "the page zoomed");
      await phone.screenshot({ path: dir + "b12-16-phone-pinch-390.png" });
      // Back to the whole scene, then long-press on the empty map → the scene menu.
      await phone.locator('[data-table="fit"]').tap();
      const empty = await map.evaluate((svg) => {
        const p = svg.createSVGPoint();
        p.x = 900;
        p.y = 120;
        const q = p.matrixTransform(svg.getScreenCTM());
        return { x: q.x, y: q.y };
      });
      await touchAt("touchStart", [{ x: empty.x, y: empty.y }]);
      await phone.waitForTimeout(750);
      await touchAt("touchEnd", []);
      await phone.waitForTimeout(250);
      check(await pmenu.evaluate((n) => !n.hidden), "empty-map long-press: no scene menu");
      check(
        (await pmenu.locator("[data-token-menu-scene]").allInnerTexts()).some((t) =>
          t.includes("Select all tokens"),
        ),
        "EN? scene menu labels",
      );
      await phone.screenshot({ path: dir + "b12-16-phone-scene-menu-390.png" });
      const small = await pmenu.evaluate((n) =>
        [...n.querySelectorAll("button")]
          .map((x) => [x.textContent.trim().slice(0, 18), x.getBoundingClientRect().height])
          .filter(([, h]) => h < 40),
      );
      check(!small.length, "scene menu targets under 40 px: " + JSON.stringify(small));
      await pmenu.locator("[data-token-menu-close]").tap();
      check(
        (await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0,
        "horizontal overflow",
      );
      await context.close();
    },
  );

  // ---------------------------------------------------------------- second review
  const points = () => page.locator(".path-planner li").count();
  const message = () => page.locator("#map-message").innerText();
  await group(
    "17 · Review 2: a lock also refuses Plan path; the V key picks the Select tool",
    async () => {
      await reset();
      await role("dm");
      await openOn("livia");
      await item("token-menu-lock").click();
      await closeMenu();
      // The reviewer's case: Livia's player plans a path with the locked token.
      await role("player");
      await tok("livia").click();
      await pickTool("plan");
      const start = tokenOf(await saved(), "livia");
      const to = await sceneSpot(start.x + 100, start.y);
      await page.mouse.move(to.x, to.y);
      await page.mouse.click(to.x, to.y);
      check((await message()).startsWith("Il DM ha bloccato questa pedina"), await message());
      check((await points()) === 0, "a path point was added to a locked token");
      check(await page.locator("[data-path-execute]").isDisabled(), "Execute path enabled");
      await page.locator("#battle-map").focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Enter");
      check((await points()) === 0, "arrows + Enter added a point");
      const still = tokenOf(await saved(), "livia");
      check(still.x === start.x && still.y === start.y, "the locked token moved");
      // Measuring is not movement: it still works on the locked token.
      await pickTool("measure");
      await page.locator("#battle-map").focus();
      await page.keyboard.press("ArrowRight");
      check(
        (await message()).startsWith("Misura diretta"),
        "measure refused: " + (await message()),
      );
      await pickTool("move");
      // A path planned before the lock is refused at "Execute path"; unlocked, it runs.
      await role("dm");
      await tok("goblin-1").click();
      await pickTool("plan");
      const g = tokenOf(await saved(), "goblin-1");
      for (const dx of [60, 110]) {
        const p = await sceneSpot(g.x + dx, g.y + 40);
        await page.mouse.click(p.x, p.y);
      }
      check((await points()) === 2, "path not planned");
      await page.locator("#battle-map").focus();
      await page.keyboard.press("Shift+L");
      await page.locator("[data-path-execute]").click();
      check((await message()).startsWith("Pedina bloccata"), "Execute path: " + (await message()));
      let now = tokenOf(await saved(), "goblin-1");
      check(now.x === g.x && now.y === g.y, "Execute path moved the locked token");
      await shot("b12-17-lock-plan-path-1440.png");
      await page.locator("#battle-map").focus();
      await page.keyboard.press("Shift+L");
      await page.locator("[data-path-execute]").click();
      now = tokenOf(await saved(), "goblin-1");
      check(now.x !== g.x || now.y !== g.y, "unlocked, the planned path did not run");
      // DDB-118: V selects the Select tool.
      await page.locator("#battle-map").focus();
      await page.keyboard.press("v");
      check(
        (await page.locator('[data-tool="token-menu-select"]').getAttribute("aria-pressed")) ===
          "true",
        "V did not choose the Select tool",
      );
      await pickTool("move");
    },
  );

  await group(
    "18 · Review 2: Undo only for its own change; HP chains and arrows; long names; copy",
    async () => {
      await reset();
      await role("dm");
      const undo = menu.locator("[data-token-menu-undo]");
      await openOn("goblin-1");
      await hp("-3");
      await closeMenu();
      // The reviewer's case: Add to selection and Copy commit nothing, so no Undo.
      await openOn("goblin-2");
      const esploratore = (await saved()).actors["goblin-2"].hp;
      await item("token-menu-pick").click();
      check(
        (await menu.locator(".token-menu-status").innerText()).startsWith("Selezionate"),
        "pick",
      );
      check((await undo.count()) === 0, "Undo offered after Add to selection");
      await item("token-menu-copy").click();
      check((await undo.count()) === 0, "Undo offered after Copy");
      await hp("-1");
      check(
        (await undo.innerText()).includes("Annulla: Esploratore: danno 1 (menu della pedina)"),
        "Undo not named: " + (await undo.innerText()),
      );
      await undo.click();
      let s = await saved();
      check(s.actors["goblin-2"].hp === esploratore, "Undo did not revert its own change");
      check(s.actors["goblin-1"].hp === 4, "Undo reverted the other creature");
      await closeMenu();
      // VTL-234: chains and arrows in the HP field, through the conditions domain.
      await openOn("goblin-1");
      await hp("4-1");
      s = await saved();
      check(s.actors["goblin-1"].hp === 3, "4-1 at 4 HP");
      check(s.log.at(-1).label === "Sentinella: danno 1 (menu della pedina)", s.log.at(-1).label);
      const field = menu.locator("#token-menu-hp-input");
      await field.focus();
      await page.keyboard.press("ArrowUp");
      check((await field.inputValue()) === "4", "ArrowUp: " + (await field.inputValue()));
      await page.keyboard.press("Enter");
      await page.waitForTimeout(80);
      check((await saved()).actors["goblin-1"].hp === 4, "ArrowUp + Enter did not set 4");
      await hp("-1-1");
      check((await saved()).actors["goblin-1"].hp === 2, "-1-1 is damage 2");
      await shot("b12-18-hp-chain-1440.png");
      await closeMenu();
      // A 123-character rename (DDB-117 allows 128) can still be copied and pasted.
      await openOn("goblin-1");
      await item("token-menu-rename").click();
      const long = "Sentinella della torre di guardia di Bruma".padEnd(123, "a");
      await page.locator("#dialog input[name=name]").fill(long);
      await page.locator("#dialog button[type=submit]").click();
      await page.waitForTimeout(80);
      check((await saved()).actors["goblin-1"].name === long, "long rename not saved");
      await openOn("goblin-1");
      await item("token-menu-copy").click();
      await item("token-menu-paste").click();
      const pasted = await menu.locator(".token-menu-status").innerText();
      check(pasted.startsWith("Incollate: ") && !pasted.includes("non validi"), pasted);
      s = await saved();
      const copy = Object.values(s.actors).find((a) => a.id.startsWith("goblin-1-c"));
      check(copy && copy.name.length <= 100 && copy.name.endsWith(" B"), "copy: " + copy?.name);
      await closeMenu();
    },
  );

  await group(
    "19 · Review 2: players' visible changes reach the DM's log; neutral copy; sheet rename",
    async () => {
      await reset();
      await role("player");
      await openOn("livia");
      await item("token-menu-ring").click();
      await menu.locator('[data-token-menu-ring="red"]').click();
      await closeMenu();
      let s = await saved();
      const entry = s.log.at(-1);
      check(
        entry.label === "Colore del bordo: Livia" && entry.visibility === "shared",
        "player ring change: " + JSON.stringify([entry.label, entry.visibility]),
      );
      await role("dm");
      // B61: Registro is a tab of the Table's right sidebar. B62: the first sub-tab of Chat.
      await toggleLog(page);
      check(
        (await page.locator(".table-log").innerText()).includes("Colore del bordo: Livia"),
        "the DM's Registro lacks the player's change",
      );
      await toggleLog(page);
      // The Visible only to… dialog names no other product.
      await openOn("goblin-2");
      await item("token-menu-audience").click();
      const dialog = await page.locator("#dialog").innerText();
      check(!/Owlbear|Smoke|Spectre/.test(dialog), "a product name in the dialog");
      check(
        dialog.includes("Una pedina nascosta può restare visibile ad alcuni personaggi"),
        dialog,
      );
      await page.keyboard.press("Escape");
      // A hidden name renamed on the sheet: the new name wins, the old one never returns.
      await openOn("goblin-2");
      await item("token-menu-hide-name").click();
      await closeMenu();
      check((await saved()).actors["goblin-2"].name === "Creatura sconosciuta 1", "alias");
      await page.goto("http://127.0.0.1:8879/#characters?id=goblin-2&tab=actions");
      await page.locator('[data-character-action="edit-character"]').click();
      await page.locator('#dialog [name="name"]').fill("Capo");
      await page.locator('#dialog button[type="submit"]').click();
      await page.waitForTimeout(80);
      check((await saved()).actors["goblin-2"].name === "Capo", "sheet rename not saved");
      await page.goto("http://127.0.0.1:8879/#table");
      await page.locator("#battle-map").waitFor();
      await openOn("goblin-2");
      const head = await menu.locator(".token-menu-head").innerText();
      check(head.includes("Capo") && !head.includes("Esploratore"), "header: " + head);
      check(
        (await item("token-menu-hide-name").innerText()).includes("Nascondi il nome"),
        "the menu still offers to show the stale name",
      );
      await closeMenu();
      await role("player");
      check((await tok("goblin-2").getAttribute("aria-label")).startsWith("Capo"), "player name");
    },
  );

  return { passed, failedGroups, errors, notes };
};
