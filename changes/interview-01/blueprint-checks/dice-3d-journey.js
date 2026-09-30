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
  // B56 animated dice: acceptance checks of the card with real clicks, keys and touch.
  // (A) IT desktop 1440 as the player in the Table drawer "Prova i dadi": BG3 check with DC
  //     lands on the recorded face then SUCCESS/FAILURE; click and Esc skip; all the dice
  //     tumble (d100 = two d10); physical faces are never animated; reasoned correction and
  //     withdrawal; identical retry reuses withdrawn faces; replay; colour per identity;
  //     reload persistence; reduced motion (B22 choice and system); Preferences; a hidden
  //     DM roll never reaches the player; a personal sheet's roll stays private; the Table's
  //     free roll is presented too. (B) Real combat: a digital Fire Bolt tumbles and shows
  //     the breakdown; a creature's hidden digital save (Burning Hands) rolls on the table
  //     over the requests dialog with DC and result, Esc never closes that dialog, it is
  //     invisible to the player, Undo marks it undone in Tiri recenti and Undo/reapply never
  //     changes or re-animates the recorded face. (C) EN phone 390 with touch: tap to skip,
  //     no overflow; the check screen fits a phone in landscape.
  //     Review fixes (24/09): keyboard focus kept, hint "chiudere" once landed, practice
  //     label in the log, layer emptied on identity switch. Round 2: the BG3 check screen
  //     is modal until it closes: its closing click, tap or Enter never runs the control
  //     underneath (the drawer's "Lancia i dadi", the requests dialog's "Risolvi tiro").
  // Resets this browser's synthetic demo state (fresh contexts).
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B56/";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const status = (p = page) => p.evaluate(async () => (await import("/dice-3d.mjs")).diceStatus());
  const layer = (p = page) => p.locator("[data-dice3d-layer]");
  const rolling = (p = page) =>
    p.locator('[data-dice3d-layer][data-phase="rolling"]').waitFor({ timeout: 4000 });
  const landed = (p = page) =>
    p.locator('[data-dice3d-layer][data-phase="landed"]').waitFor({ timeout: 6000 });
  const closed = (p = page) => layer(p).waitFor({ state: "hidden", timeout: 8000 });
  const button = (name, p = page) => p.getByRole("button", { name, exact: true });
  const role = async (value, p = page) => {
    await p.getByRole("combobox", { name: /Visita come|Visit as/ }).selectOption(value);
    await p.waitForTimeout(150);
  };
  const openDrawer = async (p = page, tap = false) => {
    // B61: the drawer is a tab of the Table's right sidebar (the panel's own close button
    // carries the same data attribute); each identity finds its last tab open again.
    // W2b1 integration: with B34 built the drawer is the «Aspetto e prova» section of the
    // Dadi tab (B34 absorbs «Prova i dadi»); its own tab stays the fallback.
    // B62: both are sub-tabs of the Chat tab; openTablePanel opens the tab, then the sub-tab.
    await p.locator(".table-tabs [data-table-tab]").first().waitFor();
    const trayBuilt =
      (await p
        .locator('[data-table-drawer="dice-tray"], [data-table-subtab="dice-tray"]')
        .count()) > 0;
    await openTablePanel(p, trayBuilt ? "dice-tray" : "dice-3d", tap);
    if (trayBuilt) {
      const look = p.locator('[data-dtray-section="look"]');
      if ((await look.getAttribute("aria-selected")) !== "true")
        tap ? await look.tap() : await look.click();
    }
    await p.locator(".dice3d-drawer").waitFor();
  };
  const slice = async () => (await stored()).ext["dice-3d"].rolls;
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const verdictText = (p = page) =>
    p.locator("[data-dice3d-verdict]").evaluate((el) => el.textContent.trim());
  const shot = (name, p = page) => p.screenshot({ path: shots + name, fullPage: false });
  // The die is really drawn: an opaque canvas pixel at the centre of the stage.
  const painted = (p = page) =>
    p.evaluate(() => {
      const root = document.querySelector("[data-dice3d-layer]");
      const canvas = root.querySelector("canvas");
      const r = root.querySelector("[data-dice3d-stage]").getBoundingClientRect();
      const dpr = canvas.width / innerWidth;
      return canvas
        .getContext("2d")
        .getImageData(
          Math.round((r.left + r.width / 2) * dpr),
          Math.round((r.top + r.height / 2) * dpr),
          1,
          1,
        ).data[3];
    });
  // Coarse fingerprint of the canvas, to prove the dice move between two frames.
  const frame = (p = page) =>
    p.evaluate(() => {
      const canvas = document.querySelector("[data-dice3d-layer] canvas");
      const g = canvas.getContext("2d");
      const data = g.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0;
      for (let i = 3; i < data.length; i += 4 * 97) sum += data[i] * ((i / 4) % 1013);
      return sum;
    });

  try {
    // ------------------------------------------------------------------ (A) demo drawer
    await page.goto(base + "#table");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    await openDrawer();
    check(
      (await page.locator("[data-dice3d-add]").count()) === 7,
      "the picker does not offer d4–d100",
    );
    await page.locator(".table-drawer").scrollIntoViewIfNeeded();
    await shot("01-drawer-player-it-1440.png");

    // BG3 check: Livia's Constitution save, DC 12, from the preset; digital dice.
    await page.locator('[data-dice3d-preset="save"]').click();
    check(
      (await page.locator('[data-dice3d-field="modifier"]').inputValue()) === "2" &&
        (await page.locator('[data-dice3d-field="dc"]').inputValue()) === "12",
      "save preset did not fill +2 and DC 12",
    );
    await page.locator("[data-dice3d-roll]").click();
    await rolling();
    check(
      (await layer().getAttribute("data-layout")) === "check",
      "a DC roll is not the check screen",
    );
    check(!(await page.locator(".dice3d-result").isVisible()), "result shown before the die lands");
    const f1 = await frame();
    await page.waitForTimeout(260);
    const f2 = await frame();
    check(f1 !== f2, "the d20 does not move while rolling");
    await page.waitForTimeout(200);
    await shot("02-check-rolling-it-1440.png");
    await landed();
    let rolls = await slice();
    let record = rolls.at(-1);
    let st = await status();
    check(
      JSON.stringify(st.history.at(-1).views[0].faces) === JSON.stringify(record.values) &&
        JSON.stringify(st.history.at(-1).dice) ===
          JSON.stringify([["d20", record.values[0], "plain"]]),
      "the d20 did not land on the recorded face",
    );
    check((await page.locator(".dice3d-dc strong").innerText()) === "12", "DC not listed");
    check(
      (await page.locator(".dice3d-mods").innerText()).includes("Costituzione +2"),
      "modifier not listed",
    );
    check(
      (await verdictText()) === (record.success ? "Successo" : "Fallimento") &&
        record.success === record.total >= 12,
      "verdict differs from the recorded success",
    );
    check((await painted()) > 200, "no die drawn on the canvas");
    const log = (await stored()).log.at(-1).label;
    check(
      log.startsWith("Tiro di prova · Livia · ") &&
        log.includes("CD 12") &&
        log.includes("dado digitale"),
      "practice roll missing from the log or not marked as practice: " + log,
    );
    check(
      (await page.locator("[data-dice3d-hint]").innerText()) === "Clic, Invio o Esc per chiudere",
      "the landed hint still says skip",
    );
    await shot("03-check-landed-it-1440.png");
    await page.keyboard.press("Escape");
    await closed();
    check(
      await page.evaluate(() => document.activeElement?.matches("[data-dice3d-roll]")),
      "focus left Lancia i dadi after the roll",
    );
    passed.push(
      `(1) BG3 check: d20 rolls (frames differ), lands on the recorded ${record.values[0]}, DC 12 and +2 listed, ${record.success ? "SUCCESSO" : "FALLIMENTO"} = recorded, logged as practice; hint "chiudere" once landed; focus kept on Lancia i dadi`,
    );

    // Skip with a click and with Esc while rolling; nothing else is triggered.
    await page.locator("[data-dice3d-roll]").click();
    await rolling();
    const formBefore = await page.locator("[data-dice3d-form]").innerHTML();
    await page.mouse.click(720, 300);
    await landed();
    check((await status()).current.phase === "landed", "click did not skip to the result");
    check(
      (await page.locator("[data-dice3d-form]").innerHTML()) === formBefore,
      "the skipping click went through to the page",
    );
    await page.keyboard.press("Escape");
    await closed();
    await page.locator("[data-dice3d-roll]").click();
    await rolling();
    const logBefore = (await stored()).log.length;
    await page.keyboard.press("Escape");
    await landed();
    check(await page.locator(".dice3d-result").isVisible(), "Esc did not show the result at once");
    await page.keyboard.press("Escape");
    await closed();
    check((await stored()).log.length === logBefore, "skipping changed the state");
    passed.push(
      "(2) click and Esc skip to the recorded result; a second Esc closes; no state change",
    );

    // The landed check screen is modal (BG3, CRP-131): the click or Enter that closes it
    // never reaches "Lancia i dadi" underneath, with or without animation.
    const rollButton = page.locator("[data-dice3d-roll]");
    const rollBox = await rollButton.boundingBox();
    const recordsBefore = (await slice()).length;
    await rollButton.focus();
    await page.keyboard.press("Enter");
    await landed();
    await page.keyboard.press("Tab");
    check((await status()).current?.phase === "landed", "Tab left the check screen");
    await page.keyboard.press("Enter");
    await closed();
    check((await slice()).length === recordsBefore + 1, "the closing Enter rolled again");
    check(
      await page.evaluate(() => document.activeElement?.matches("[data-dice3d-roll]")),
      "focus left Lancia i dadi after the closing Enter",
    );
    await rollButton.click();
    await landed();
    check(
      await page.evaluate(
        ({ x, y }) => !!document.elementFromPoint(x, y)?.closest("[data-dice3d-layer]"),
        { x: rollBox.x + rollBox.width / 2, y: rollBox.y + rollBox.height / 2 },
      ),
      "the landed check screen lets the pointer through to the page",
    );
    const logAtRest = (await stored()).log.length;
    await page.mouse.click(rollBox.x + rollBox.width / 2, rollBox.y + rollBox.height / 2);
    await closed();
    await page.waitForTimeout(300);
    check(
      (await slice()).length === recordsBefore + 2 && (await stored()).log.length === logAtRest,
      "the closing click ran Lancia i dadi underneath",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await rollButton.click();
    await landed();
    check((await layer().getAttribute("data-animate")) === "false", "reduced motion animated");
    await page.mouse.click(rollBox.x + rollBox.width / 2, rollBox.y + rollBox.height / 2);
    await closed();
    await page.waitForTimeout(300);
    check(
      (await slice()).length === recordsBefore + 3,
      "the closing click rolled again (no motion)",
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    passed.push(
      "(2b) landed check screen is modal: Tab stays, the closing Enter and the closing click where «Lancia i dadi» sits record nothing (also with reduced motion); focus kept",
    );

    // All the dice: a tumble across the Table with a summary; d100 is two d10s.
    await page.locator('[data-dice3d-preset="all"]').click();
    await page.locator("[data-dice3d-roll]").click();
    await rolling();
    check((await layer().getAttribute("data-layout")) === "tumble", "free roll is not a tumble");
    await page.waitForTimeout(450);
    await shot("04-tumble-rolling-it-1440.png");
    await landed();
    record = (await slice()).at(-1);
    st = await status();
    const d100 = record.values.at(-1);
    const expected = [
      ["d4", record.values[0]],
      ["d6", record.values[1]],
      ["d8", record.values[2]],
      ["d10", record.values[3] % 10],
      ["d12", record.values[4]],
      ["d20", record.values[5]],
      ["d10", Math.floor((d100 % 100) / 10)],
      ["d10", d100 % 10],
    ];
    check(
      JSON.stringify(st.history.at(-1).dice.map(([k, f]) => [k, f])) === JSON.stringify(expected),
      "dice did not land on the recorded faces: " + JSON.stringify(st.history.at(-1).dice),
    );
    const summary = await page.locator(".dice3d-summary").innerText();
    check(
      summary.includes(`= ${record.total}`) && summary.includes("dado digitale"),
      "summary missing the total",
    );
    await shot("05-tumble-landed-it-1440.png");
    await page.keyboard.press("Escape");
    await closed();
    passed.push(
      `(3) all dice tumble and land on [${record.values.join(", ")}] (d100 ${d100} = two d10s), summary = ${record.total}`,
    );

    // Physical faces are shown as entered, never animated; reasoned correction.
    await page.locator('[data-dice3d-preset="save"]').click();
    await page.locator('[data-dice3d-mode][value="physical"]').check();
    await page.locator('[data-dice3d-face="0"]').fill("15");
    await page.locator("[data-dice3d-roll]").click();
    await landed();
    check((await layer().getAttribute("data-animate")) === "false", "a physical die was animated");
    check((await page.locator(".dice3d-tile strong").innerText()) === "15", "typed face not shown");
    check((await verdictText()) === "Successo", "physical 15 + 2 vs DC 12 is not a success");
    await page.waitForTimeout(300);
    await shot("06-physical-check-it-1440.png");
    await page.keyboard.press("Escape");
    await closed();
    const physical = (await slice()).at(-1);
    await page.locator(`[data-dice3d-correct="${physical.id}"]`).click();
    const dialog = page.locator("#dialog");
    await dialog.locator("[name=face-0]").fill("5");
    await dialog.locator("[name=reason]").fill("Letto male: era un 5");
    await dialog.getByRole("button", { name: "Registra la correzione", exact: true }).click();
    await landed();
    check((await layer().getAttribute("data-animate")) === "false", "a correction was animated");
    check((await verdictText()) === "Fallimento", "corrected 5 + 2 vs DC 12 is not a failure");
    check(
      (await page.locator(".dice3d-status").innerText()) === "Correzione",
      "not marked as correction",
    );
    await page.keyboard.press("Escape");
    await closed();
    const row = page.locator(`[data-dice3d-row="${physical.id}"]`);
    check(
      (await row.innerText()).includes("Corretto: Letto male: era un 5 (prima 15)"),
      "correction history not listed",
    );
    passed.push(
      "(4) physical 15 shown flat (no animation), corrected to 5 with a reason: FALLIMENTO, history kept",
    );

    // Digital faces are never edited: reasoned withdrawal, then an identical retry reuses them.
    await page.locator('[data-dice3d-mode][value="digital"]').check();
    await page.locator("[data-dice3d-clear]").click();
    await page.locator('[data-dice3d-add="8"]').click();
    await page.locator("[data-dice3d-roll]").click();
    await landed();
    await page.keyboard.press("Escape");
    await closed();
    const digital = (await slice()).at(-1);
    check(
      (await page.locator(`[data-dice3d-correct="${digital.id}"]`).count()) === 0,
      "digital faces offered a correction",
    );
    await page.locator(`[data-dice3d-withdraw="${digital.id}"]`).click();
    await dialog.locator("[name=reason]").fill("Tiro partito per sbaglio");
    await dialog.getByRole("button", { name: "Ritira", exact: true }).click();
    const withdrawnRow = page.locator(`[data-dice3d-row="${digital.id}"]`);
    check((await withdrawnRow.getAttribute("data-status")) === "withdrawn", "roll not withdrawn");
    check(
      (await withdrawnRow.locator("[data-dice3d-replay]").count()) === 0,
      "a withdrawn roll can be replayed",
    );
    await page.locator("[data-dice3d-roll]").click();
    await landed();
    const reused = (await slice()).at(-1);
    check(
      reused.status === "reused" &&
        JSON.stringify(reused.values) === JSON.stringify(digital.values),
      "identical retry drew new faces",
    );
    check(
      (await layer().getAttribute("data-animate")) === "false",
      "reused faces were re-animated",
    );
    check(
      (await page.locator(".dice3d-summary").innerText()).includes("Facce riusate"),
      "reuse not stated",
    );
    await page.keyboard.press("Escape");
    await closed();
    passed.push(
      `(5) digital d8 ${digital.values[0]} withdrawn with a reason (no correction, no replay); identical retry reuses ${reused.values[0]} without animation`,
    );

    // Replay: same recorded result, animated again, never a new roll (the latest digital
    // check still in Tiri recenti, which lists the last 8).
    const checkRoll = (await slice())
      .filter((r) => r.dc !== null && r.mode === "digital" && r.status === "accepted")
      .at(-1);
    const countBefore = (await slice()).length;
    await page.locator(`[data-dice3d-replay="${checkRoll.id}"]`).click();
    await rolling();
    await landed();
    st = await status();
    check(
      st.history.at(-1).replay === true &&
        JSON.stringify(st.history.at(-1).views[0].faces) === JSON.stringify(checkRoll.values) &&
        (await slice()).length === countBefore,
      "replay changed or added a roll",
    );
    await page.keyboard.press("Escape");
    await closed();
    passed.push("(6) Rivedi replays the same recorded face, adds nothing");

    // Colour per identity (chosen with the arrow keys), persisted; reload keeps rolls,
    // statuses and colour.
    await page.locator('[data-dice3d-color][value="gold"]').focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
    check(
      await page.evaluate(() =>
        document.activeElement?.matches('[data-dice3d-color][value="ruby"]:checked'),
      ),
      "arrow keys lost focus in the colour group",
    );
    let data = await stored();
    check(
      data.ext["core-settings"].personal.player["dice-3d.color"] === "ruby",
      "colour not saved for the player",
    );
    await page.reload();
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    await openDrawer();
    check(
      await page.locator('[data-dice3d-color][value="ruby"]').isChecked(),
      "colour lost on reload",
    );
    check(
      (await page.locator(`[data-dice3d-row="${physical.id}"]`).innerText()).includes("Corretto") &&
        (await page.locator(`[data-dice3d-row="${digital.id}"]`).getAttribute("data-status")) ===
          "withdrawn",
      "recent rolls or their statuses lost on reload",
    );
    await page.locator("[data-dice3d-roll]").click();
    await landed();
    await page.waitForTimeout(100);
    await shot("07-ruby-dice-after-reload-it-1440.png");
    await page.keyboard.press("Escape");
    await closed();
    passed.push(
      "(7) Rubino chosen with the arrow keys (focus kept), saved per identity; reload keeps rolls, correction, withdrawal and colour",
    );

    // Reduced motion: B22's choice offered in the drawer, then the system preference.
    await page.locator("[data-dice3d-motion]").selectOption("reduced");
    data = await stored();
    check(
      data.ext["core-settings"].personal.player["preferences-motion.reduced-motion"] === "reduced",
      "the drawer did not write B22's reduced-motion choice",
    );
    await page.locator("[data-dice3d-roll]").click();
    await landed();
    check(
      (await layer().getAttribute("data-animate")) === "false" &&
        (await page.locator(".dice3d-summary").isVisible()),
      "reduced motion still animates",
    );
    await shot("08-reduced-motion-it-1440.png");
    await page.keyboard.press("Escape");
    await closed();
    await page.locator("[data-dice3d-motion]").selectOption("system");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator("[data-dice3d-roll]").click();
    await landed();
    check(
      (await layer().getAttribute("data-animate")) === "false",
      "system reduced motion ignored",
    );
    await page.keyboard.press("Escape");
    await closed();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    passed.push(
      "(8) reduced motion (B22 choice from the drawer and prefers-reduced-motion) shows the result at once",
    );
    // B22 "Movimento ridotto: Sempre attivo" (personal preference) is honoured too.
    await page.locator('[data-service="preferences"]').click();
    const b22 = page.locator('#dialog select[name="setting:preferences-motion.reduced-motion"]');
    if (await b22.count()) {
      await b22.selectOption({ label: "Sempre attivo" });
      await button("Salva preferenze").click();
      check(
        (await page.evaluate(() => document.documentElement.dataset.motion)) === "reduced",
        "B22 did not mark reduced motion",
      );
      await page.locator("[data-dice3d-roll]").click();
      await landed();
      check((await layer().getAttribute("data-animate")) === "false", "B22 reduced motion ignored");
      await page.keyboard.press("Escape");
      await closed();
      await page.locator('[data-service="preferences"]').click();
      await b22.selectOption({ label: "Come il sistema" });
      await button("Salva preferenze").click();
      passed.push(
        "(8b) B22 Preferenze › Movimento ridotto «Sempre attivo»: dice show the result at once",
      );
    } else {
      await page.locator("#dialog").getByRole("button", { name: "Annulla", exact: true }).click();
      passed.push("(8b) B22 motion field not loaded: system preference only");
    }

    // Preferences show the same personal and device choices.
    await page.locator('[data-service="preferences"]').click();
    const prefs = page.locator("#dialog");
    const section = prefs.locator("h3", { hasText: "Dadi animati" });
    await section.scrollIntoViewIfNeeded();
    check(
      (await prefs.locator('select[name="setting:dice-3d.color"] option:checked').innerText()) ===
        "Rubino",
      "Preferences do not show the chosen colour",
    );
    check(
      await prefs.locator('input[name="setting:dice-3d.enabled"]').isChecked(),
      "Preferences do not show animated dice on",
    );
    check(
      (await prefs.locator('[name="setting:dice-3d-device.motion"]').count()) === 0,
      "Preferences still show a second reduced-motion control",
    );
    await shot("09-preferences-it-1440.png");
    await prefs.getByRole("button", { name: "Annulla", exact: true }).click();
    passed.push(
      "(9) Preferences › Dadi animati (personal); reduced motion only once (B22 Movimento ed effetti)",
    );

    // A hidden DM roll: presented to the DM, never to the player.
    await role("dm");
    await openDrawer();
    await page.locator('[data-dice3d-visibility][value="private"]').check();
    await page.locator("[data-dice3d-roll]").click();
    await rolling();
    await landed();
    const hidden = (await slice()).at(-1);
    check(hidden.visibility === "private" && hidden.by === "dm", "DM roll not hidden");
    check(
      (await page.locator(".dice3d-line-meta").first().innerText()).includes("Solo DM"),
      "the DM's own hidden roll is not shown to the DM as DM only",
    );
    await role("player");
    check(!(await layer().isVisible()), "the player inherited the DM's dice on screen");
    check(
      (await layer().evaluate((el) => el.textContent.trim())) === "",
      "the DM's hidden result stays in the hidden layer's DOM",
    );
    await openDrawer();
    check(
      (await page.locator(`[data-dice3d-row="${hidden.id}"]`).count()) === 0,
      "the player lists the DM's hidden roll",
    );
    data = await stored();
    check(
      data.log.some(
        (e) => e.label.includes(`[${hidden.values.join(", ")}]`) && e.visibility === "private",
      ),
      "hidden log label not private",
    );
    passed.push(
      "(10) DM's hidden roll shown to the DM (Solo DM), cleared (DOM emptied) on switching, never listed for the player",
    );

    // A personal sheet (Iria, B21) rolls only for its owner, whatever the audience chosen.
    await page.locator("[data-dice3d-actor]").selectOption("iria");
    check(
      (await page.locator('[data-dice3d-visibility][value="shared"]').isDisabled()) &&
        (await page.locator('[data-dice3d-visibility][value="private"]').isChecked()) &&
        (await page.locator("[data-dice3d-forced]").innerText()).includes("scheda personale"),
      "a personal sheet can still roll for the whole table",
    );
    await page.locator('[data-dice3d-preset="save"]').click();
    await page.locator("[data-dice3d-roll]").click();
    await landed();
    await page.keyboard.press("Escape");
    await closed();
    const iria = (await slice()).at(-1);
    data = await stored();
    check(
      iria.actorId === "iria" &&
        iria.visibility === "private" &&
        data.log.at(-1).visibility === "private" &&
        data.log.at(-1).label.startsWith("Tiro di prova · Iria"),
      "Iria's practice roll is not private",
    );
    await role("dm");
    await openDrawer();
    check(
      (await page.locator(`[data-dice3d-row="${iria.id}"]`).count()) === 0,
      "the DM lists Iria's practice roll",
    );
    // B61: Registro is a tab of the Table's right sidebar.
    await openTablePanel(page, "log"); // B62: Chat › Registro
    await page.waitForTimeout(300);
    check(
      !(await page.locator("body").innerText()).includes("Tiro di prova · Iria"),
      "the DM's Registro shows Iria's practice roll",
    );
    await page.keyboard.press("Escape");
    await role("player");
    passed.push(
      "(10b) Iria (personal sheet): «Tutto il tavolo» disabled with the reason, roll and log private, absent from the DM's Tiri recenti and Registro",
    );

    // The Table's free roll (inspector → Tira i dadi) shows the same dice.
    await page.goto(base + "#table");
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    const beforeFree = (await status()).history.length;
    await page.locator('[data-table="dice"]').first().click();
    // W2b1 integration: with B34 built «Tira i dadi» opens the Dadi tray (DDB-151): a digital
    // 1d20 from it; the one-die «Tiro libero» dialog stays the fallback.
    await page.locator("[data-dtray-roll-button], #dialog[open]").first().waitFor();
    const trayRoll = (await page.locator("[data-dtray-roll-button]").count()) > 0;
    if (trayRoll) {
      await page.locator("[data-dtray-formula]").fill("1d20");
      await page.locator("[data-dtray-formula]").press("Tab");
      await page.locator('label.dtray-seg:has([data-dtray-mode][value="digital"])').click();
      await page.locator("[data-dtray-roll-button]").click();
    } else await button("Registra tiro").click();
    await rolling();
    await landed();
    const freeLabel = (await stored()).log.at(-1).label;
    const freeFace = Number(freeLabel.match(trayRoll ? /\[(\d+)\] = / : /d20: (\d+)/)[1]);
    const freeTitle = trayRoll ? "1d20" : "Tiro libero";
    st = await status();
    check(
      st.history.length === beforeFree + 1 &&
        JSON.stringify(st.history.at(-1).dice) === JSON.stringify([["d20", freeFace, "plain"]]),
      "the free roll did not land on its logged face: " + freeLabel,
    );
    check(
      (await page.locator(".dice3d-summary").innerText()).includes(freeTitle),
      "free roll not titled",
    );
    await page.keyboard.press("Escape");
    await closed();
    await openDrawer();
    check(
      (await page.locator("[data-dice3d-row]").first().innerText()).includes(freeTitle),
      "free roll missing from Tiri recenti",
    );
    passed.push(
      `(10c) Table free roll (digital d20 ${freeFace}): same dice, lands on the logged face, listed in Tiri recenti`,
    );

    // ------------------------------------------------------------------ (B) real combat
    const reset = async () => {
      await page.goto(base + "#table");
      await button("Ripristina esempio").click();
      await button("Ripristina").click();
    };
    const encounter = async (arrange = []) => {
      await role("dm");
      // Refreshed by the hand-off writer (29/09/2026): P6 TV-106 and P7 PR-06 (the title row's
      // «Scene» is a list dialog, Preparation has folders): the courtyard's editor by its route.
      await page.goto("http://127.0.0.1:8879/#preparation?id=old-watch");
      await page.getByRole("heading", { name: "Pedine nella scena", exact: true }).waitFor();
      const map = page.locator("[data-prep-interactive]");
      for (const [id, x, y] of arrange) {
        const token = map.locator("[data-prep-token=token-" + id + "] circle");
        await token.scrollIntoViewIfNeeded();
        const box = await token.boundingBox();
        const dest = await map.evaluate(
          (svg, { x, y }) => {
            const p = svg.createSVGPoint();
            p.x = x;
            p.y = y;
            const c = p.matrixTransform(svg.getScreenCTM());
            return { x: c.x, y: c.y };
          },
          { x, y },
        );
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(dest.x, dest.y, { steps: 8 });
        await page.mouse.up();
      }
      // Saved only when the draft changed (the include and d20 fields left Preparation).
      if (
        await page
          .getByRole("button", { name: "Salva preparazione", exact: true })
          .isEnabled({ timeout: 1000 })
          .catch(() => false)
      )
        await page.getByRole("button", { name: "Salva preparazione", exact: true }).click();
      // Saved only when the draft changed (the include and d20 fields left Preparation).
      if (
        await page
          .getByRole("button", { name: "Aggiorna scena attiva", exact: true })
          .isEnabled({ timeout: 1000 })
          .catch(() => false)
      )
        await page.getByRole("button", { name: "Aggiorna scena attiva", exact: true }).click();
      // Refreshed by the hand-off writer (29/09/2026): R5 PR-32 replaced Preparation's «Incontro
      // preparato» with the Table's start dialog (Foundry roll call): who fights and each typed
      // d20; the Initiative bonus comes from the sheet.
      await page.getByRole("button", { name: "Avvia incontro salvato…", exact: true }).click();
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
      await button("Inizia combattimento").click();
      await page.locator("#battle-map").waitFor();
      await role("player");
      await page
        .getByRole("combobox", { name: "Modalità dei dadi dell’azione", exact: true })
        .selectOption("digital");
    };
    await reset();
    await encounter();
    await button("Dardo di fuoco").click();
    await page.locator("#battle-map [data-actor=goblin-2]").click();
    await rolling();
    await landed();
    data = await stored();
    const attempt = data.combatAttempts.at(-1);
    const attack = attempt.requests.find((r) => r.kind === "attack");
    const outcome = attempt.outcomes[0];
    st = await status();
    const view = st.history
      .at(-1)
      .views.find((v) => v.faces.length === 1 && v.total === attack.total);
    check(
      view && view.faces[0] === attack.values[0],
      "attack die did not land on the recorded face",
    );
    check(
      st.history.at(-1).dice[0][0] === "d20" && st.history.at(-1).dice[0][1] === attack.values[0],
      "no d20 on the attack face",
    );
    const attackLine = await page.locator(".dice3d-line").first().innerText();
    check(
      attackLine.includes("Attacco · Dardo di fuoco") &&
        attackLine.includes(`[${attack.values[0]}] + ${attack.modifier} = ${attack.total}`) &&
        attackLine.includes(
          outcome.critical ? "Colpo critico" : outcome.hit ? "Colpito" : "Mancato",
        ),
      "attack breakdown or outcome missing: " + attackLine,
    );
    await shot("10-combat-attack-landed-it-1440.png");
    await page.keyboard.press("Escape");
    await closed();
    passed.push(
      `(11) digital Fire Bolt: d20 lands on ${attack.values[0]}, breakdown +${attack.modifier} = ${attack.total}, ${outcome.hit ? "Colpito" : "Mancato"} as recorded`,
    );

    // Burning Hands: the DM's hidden digital save shows the BG3 screen over the dialog.
    await reset();
    await encounter([
      ["livia", 400, 320],
      ["goblin-1", 470, 305],
      ["goblin-2", 500, 340],
      ["doran", 475, 350],
    ]);
    await button("Mani brucianti").click();
    const battle = page.locator("#battle-map");
    await battle.scrollIntoViewIfNeeded();
    const point = await battle.evaluate((svg) => {
      const p = svg.createSVGPoint();
      p.x = 550;
      p.y = 320;
      const v = p.matrixTransform(svg.getScreenCTM());
      return { x: v.x, y: v.y };
    });
    await page.mouse.click(point.x, point.y);
    await button("Lancia Mani brucianti").click();
    await landed();
    data = await stored();
    const damage = data.combatAttempts.at(-1).requests.find((r) => r.kind === "damage");
    st = await status();
    check(
      JSON.stringify(st.history.at(-1).dice.map((d) => d[1])) === JSON.stringify(damage.values),
      "damage dice did not land on the recorded faces",
    );
    await page.keyboard.press("Escape");
    await closed();
    const playerHistory = (await status()).history.length;
    await role("dm");
    await page.locator("[data-combat-requests]").click();
    // B61 (owner direction after wave 1): a save resolved in combat (here Doran's, a hero)
    // tumbles on the table and never holds the next click (Dice So Nice, D&D Beyond): the
    // click where Sentinella's "Risolvi tiro" sits reaches that button at once. The modal
    // BG3 screen stays for the check with a DC one starts oneself (step 1).
    const resolveFor = (name) =>
      page
        .locator(".roll-request")
        .filter({ hasText: name })
        .getByRole("button", { name: "Risolvi tiro", exact: true });
    await resolveFor("Doran").click();
    await page.locator("[name=diceMode]").selectOption("digital");
    await button("Registra tiro").click();
    await layer().waitFor({ state: "visible" });
    check((await status()).current?.layout === "tumble", "Doran's combat save is modal");
    check(
      (await layer().evaluate((el) => getComputedStyle(el).pointerEvents)) === "none",
      "the dice of a combat save take the pointer",
    );
    const sentinelBox = await resolveFor("Sentinella").boundingBox();
    await page.mouse.click(
      sentinelBox.x + sentinelBox.width / 2,
      sentinelBox.y + sentinelBox.height / 2,
    );
    await page.locator("#dialog [name=diceMode]").waitFor();
    check(
      (await page.locator("dialog[open]").count()) === 1,
      "the click under the dice did not open Sentinella's roll",
    );
    await closed();
    await page.locator("[name=diceMode]").selectOption("digital");
    await button("Registra tiro").click();
    await rolling();
    check(
      await layer().evaluate((el) => el.matches(":popover-open")),
      "the dice are not above the dialog",
    );
    // Esc acts on the dice only (topmost layer): it skips, the dialog stays open.
    await page.waitForTimeout(200);
    await page.keyboard.press("Escape");
    await landed();
    check(
      (await page.locator("dialog[open]").count()) === 1,
      "Esc on the dice closed the requests dialog",
    );
    data = await stored();
    const burn = data.combatAttempts.at(-1);
    const save = burn.requests.find((r) => r.kind === "save" && r.actorId === "goblin-1");
    const saveOutcome = burn.outcomes.find((o) => o.actorId === "goblin-1");
    const dc = burn.targets.find((t) => t.actorId === "goblin-1").saveDC;
    st = await status();
    // A creature's save rolls on the table (BG3 keeps its roll screen for heroes).
    check(
      st.history.at(-1).layout === "tumble" && st.history.at(-1).role === "dm",
      "a creature's save is not on the DM's table",
    );
    check(
      st.history.at(-1).views[0].faces[0] === save.values[0],
      "save die not on the recorded face",
    );
    const saveLine = await page.locator(".dice3d-line").first().innerText();
    const expectedVerdict =
      saveOutcome && typeof saveOutcome.saveSuccess === "boolean"
        ? saveOutcome.saveSuccess
        : save.total >= dc;
    check(saveLine.includes(`CD ${dc}`), "save DC not shown: " + saveLine);
    check(
      (await verdictText()) === (expectedVerdict ? "Successo" : "Fallimento"),
      "save verdict differs from the recorded outcome",
    );
    check(saveLine.includes("Solo DM"), "hidden save not marked DM only");
    check(saveLine.includes("Tiro salvezza su Destrezza"), "save title missing");
    await shot("11-dm-hidden-save-over-dialog-it-1440.png");
    await page.keyboard.press("Escape");
    await closed();
    check(
      (await page.locator("dialog[open]").count()) === 1 &&
        (await page.evaluate(() => !!document.activeElement?.closest("dialog"))),
      "closing the dice closed the dialog or lost focus",
    );
    if (await page.locator("#dialog[open]").count()) await button("Torna al gioco").click();
    const logRoll = data.log.flatMap((e) => e.rolls ?? []).find((r) => r.requestId === save.id);
    check(logRoll && logRoll.visibility === "private", "goblin save not private in the log");
    await role("player");
    check((await status()).history.length === playerHistory + 2, "unexpected presentations");
    check(!(await layer().isVisible()), "player sees the DM's dice");
    await openDrawer();
    check(
      (await page.locator(`[data-dice3d-row="${logRoll.id}"]`).count()) === 0,
      "the player lists the goblin's hidden save",
    );
    await page.locator(".table-drawer").scrollIntoViewIfNeeded();
    await shot("12-player-recent-without-hidden-save-it-1440.png");
    passed.push(
      `(12) Doran's combat save: dice on the table (pointer-events none), the click where Sentinella's «Risolvi tiro» sits opens that roll at once (B61). DM digital DEX save of Sentinella: dice on the table over the dialog, DC ${dc}, ${expectedVerdict ? "Successo" : "Fallimento"}, Solo DM; Esc skipped and closed the dice only (dialog open, focus inside); invisible to the player`,
    );

    // Undo and reapply: the recorded face never changes and nothing is re-animated.
    await role("dm");
    const dmHistory = (await status()).history.length;
    await page.getByRole("button", { name: "Annulla ultima modifica" }).first().click();
    await page.waitForTimeout(250);
    data = await stored();
    const undone = data.combatAttempts.at(-1).requests.find((r) => r.id === save.id);
    check(
      undone.status === "pending" &&
        undone.withdrawn === true &&
        JSON.stringify(undone.acceptedValues) === JSON.stringify(save.values),
      "Undo changed or lost the accepted face",
    );
    check((await status()).history.length === dmHistory, "Undo was animated as a new roll");
    await openDrawer();
    const undoneRow = page.locator(`[data-dice3d-row="${logRoll.id}"]`);
    check(
      (await undoneRow.getAttribute("data-status")) === "reverted" &&
        (await undoneRow.innerText()).includes("Annullato con «Annulla»") &&
        (await undoneRow.locator("[data-dice3d-replay]").count()) === 0,
      "Tiri recenti still shows the undone save as standing",
    );
    await page.locator("[data-combat-requests]").click();
    await page
      .locator(".roll-request")
      .filter({ hasText: "Sentinella" })
      .getByRole("button", { name: "Riapplica risultato noto", exact: true })
      .click();
    await button("Riapplica risultato").click();
    await page.waitForTimeout(300);
    data = await stored();
    const reapplied = data.combatAttempts.at(-1).requests.find((r) => r.id === save.id);
    check(
      reapplied.status === "resolved" &&
        JSON.stringify(reapplied.values) === JSON.stringify(save.values),
      "reapply changed the face",
    );
    check((await status()).history.length === dmHistory, "reapply was animated as a new roll");
    if (await page.locator("#dialog[open]").count()) await button("Torna al gioco").click();
    passed.push(
      `(13) Undo withdraws the save keeping face ${save.values[0]} (Tiri recenti: «Annullato», no Rivedi); reapply keeps it; no new animation`,
    );
    check(await noOverflow(), "desktop overflow");
    await context.close();

    // ------------------------------------------------------------------ (C) EN phone 390, touch
    const phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const phone = await phoneContext.newPage();
    phone.on("pageerror", (error) => errors.push("phone: " + error.message));
    await phone.goto(base + "#table");
    await phone.getByRole("heading", { level: 1 }).first().waitFor();
    await phone.locator('[data-service="preferences"]').tap();
    await phone.locator("#dialog select[name=lang]").selectOption("en");
    await phone.getByRole("button", { name: "Salva preferenze", exact: true }).tap();
    await openDrawer(phone, true);
    check(await noOverflow(phone), "phone drawer overflows");
    await phone.locator('[data-dice3d-preset="all"]').tap();
    await phone.locator("[data-dice3d-roll]").tap();
    await rolling(phone);
    check(
      (await phone.locator(".dice3d-summary .dice3d-hint").textContent()) === "Tap to skip",
      "touch hint missing",
    );
    // B61: a tap on rolling table dice reaches the page (here «Map» on the Table's tab bar,
    // pinned at the bottom) and the dice land on their result.
    const mapLink = await phone.locator("[data-table-map-link]").boundingBox();
    await phone.touchscreen.tap(mapLink.x + mapLink.width / 2, mapLink.y + mapLink.height / 2);
    await landed(phone);
    check((await status(phone)).current.phase === "landed", "tap did not skip");
    await phone.waitForTimeout(700);
    const mapTop = (await phone.locator("#battle-map").boundingBox()).y;
    check(mapTop > -5 && mapTop < 300, "the tap on rolling dice did not reach the page: " + mapTop);
    const box = await phone.locator(".dice3d-summary").boundingBox();
    check(box.x >= 0 && box.x + box.width <= 390, "summary wider than the phone");
    check(await noOverflow(phone), "phone overflow with dice on screen");
    check(
      (await phone.locator(".dice3d-summary").innerText()).includes("digital die"),
      "summary not in English",
    );
    await shot("13-phone-en-tumble-390.png", phone);
    await closed(phone);
    await phone.locator('[data-dice3d-preset="save"]').tap();
    await phone.locator("[data-dice3d-roll]").tap();
    await landed(phone);
    const phoneRecord = (await phone.evaluate((k) => JSON.parse(localStorage.getItem(k)), key)).ext[
      "dice-3d"
    ].rolls.at(-1);
    check(
      (await phone.locator(".dice3d-title").innerText()) === "Constitution saving throw" &&
        (await phone.locator(".dice3d-dc span").innerText()).toLowerCase() === "difficulty class" &&
        (await verdictText(phone)) === (phoneRecord.success ? "Success" : "Failure"),
      "English check screen wrong",
    );
    check(await noOverflow(phone), "phone overflow on the check screen");
    check(
      (await phone.locator("[data-dice3d-hint]").innerText()) === "Tap to close",
      "landed touch hint missing",
    );
    await shot("14-phone-en-check-390.png", phone);
    // The same screen fits a phone turned to landscape.
    await phone.setViewportSize({ width: 844, height: 390 });
    await phone.waitForTimeout(200);
    const fit = await phone.evaluate(() => {
      const box = document.querySelector(".dice3d-check");
      const title = document.querySelector(".dice3d-title").getBoundingClientRect();
      const verdict = document.querySelector("[data-dice3d-verdict]").getBoundingClientRect();
      return (
        box.scrollHeight <= box.clientHeight && title.top >= 0 && verdict.bottom <= innerHeight
      );
    });
    check(fit, "the check screen is cut in landscape");
    await shot("15-phone-en-check-landscape-844.png", phone);
    // "Tap to close" on the die: the tap ends on the screen, never on the page under it.
    const phoneRecords = (await phone.evaluate((k) => JSON.parse(localStorage.getItem(k)), key))
      .ext["dice-3d"].rolls.length;
    const stage = await phone.locator("[data-dice3d-stage]").boundingBox();
    await phone.touchscreen.tap(stage.x + stage.width / 2, stage.y + stage.height / 2);
    await closed(phone);
    await phone.waitForTimeout(300);
    check(
      (await phone.evaluate((k) => JSON.parse(localStorage.getItem(k)), key)).ext["dice-3d"].rolls
        .length === phoneRecords,
      "the closing tap went through to the page",
    );
    passed.push(
      "(14) EN phone 390: a tap on rolling table dice reaches the page («Map» brings the map back) and lands them, auto-close, English check screen, «Tap to close» once landed and the closing tap records nothing, no overflow; fits 844×390 landscape",
    );
    await phoneContext.close();
  } catch (error) {
    // Name the last passed check, so a failure says where the journey stopped.
    throw Error(`After ${passed.length} passed (${passed.at(-1) ?? "start"}): ${error.message}`);
  }
  if (errors.length) throw Error("Page errors: " + errors.join(" | "));
  return { passed, errors };
};
