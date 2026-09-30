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
  // B45 review (reviewer-fixer): the fixed defects in the one app, with real clicks, keys
  // and the app's own combat start. F1 refusals inside the dialog; F9 keyboard focus kept
  // after a committed control; F7 metres, calendar season and the marching front rank;
  // F4/F8/F5 camp event private to the DM, sub-tab counts and the bell reaching Campo;
  // F3 combat from the Table interrupts the camp, resume after the encounter; F2 Search
  // after Undo reuses the faces; F6 a lit torch lights the Table's vision at night.
  // Synthetic demo data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B45-rf/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const camp = async () => (await stored()).ext.travel.campaigns.lanterns;
  const waitStored = (fn, arg = null) =>
    page
      .waitForFunction(
        ([k, source, a]) => {
          const s = JSON.parse(localStorage.getItem(k));
          return new Function("s", "a", "return (" + source + ")(s, a)")(s, a);
        },
        [key, fn.toString(), arg],
        { timeout: 8000 },
      )
      .catch((error) => {
        throw Error(`State never became: ${fn.toString()} — ${error.message.split("\n")[0]}`);
      });
  const dismissTips = async () => {
    const got = page.getByRole("button", { name: /^(Ho capito|Got it)$/ });
    for (let i = 0; i < 3 && (await got.count()); i++)
      await got
        .first()
        .click({ timeout: 1500 })
        .catch(() => {});
  };
  const role = async (value) => {
    if ((await page.locator("#demo-role").inputValue()) === value) return;
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await dismissTips();
  };
  const dialog = () => page.locator("#dialog[open]");
  const openTravel = async (sub = null) => {
    await openTablePanel(page, "travel"); // B62: Exploration › Travel and camp
    await page.locator("[data-travel-panel]").waitFor();
    if (sub) {
      await page.locator(`[data-travel-sub="${sub}"]`).click();
      await page.locator(`[data-travel-sub="${sub}"][aria-selected="true"]`).waitFor();
    }
  };
  const focused = () =>
    page.evaluate(() => {
      const a = document.activeElement;
      return a && a !== document.body ? a.outerHTML.slice(0, 160) : "BODY";
    });
  const offline = async (on) => {
    await page.locator('[data-service="preferences"]').click();
    const box = dialog().locator('[name="offline"]');
    if (on) await box.check();
    else await box.uncheck();
    await dialog().locator('button[type="submit"]').click();
    await dialog().waitFor({ state: "detached" });
  };
  const shot = async (name, locator = null) => {
    if (locator) await locator.first().evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(250);
    await page.screenshot({ path: dir + name });
  };

  // ------------------------------------------------------------ reset
  await page.goto(base + "#table");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("#battle-map").waitFor();
  await dismissTips();
  await role("dm");

  // ------------------------------------------------------------ F1: refusal inside the dialog
  await openTravel("journey");
  await offline(true);
  await page.locator("[data-travel-event]").click();
  await dialog().locator('button[type="submit"]').click();
  const inDialog = dialog().locator(".dialog-error");
  await inDialog.waitFor({ state: "visible" });
  check(/senza rete/.test(await inDialog.innerText()), "Offline reason not in the dialog");
  await shot("rf-10-offline-reason-in-dialog.png");
  await page.keyboard.press("Escape");
  await dialog().waitFor({ state: "detached" });
  await offline(false);
  check((await camp()).events.length === 0, "Offline event was drawn");
  // Invalid physical face: the reason appears in the dialog, which stays open.
  await page.locator("[data-travel-event]").click();
  await dialog().locator('[name="diceMode"]').selectOption("physical");
  await dialog()
    .locator('[name="face0"]')
    .evaluate((el) => el.removeAttribute("max"));
  await dialog().locator('[name="face0"]').fill("9");
  await dialog().locator('button[type="submit"]').click();
  await dialog().locator(".dialog-error", { hasText: "d8 fisico" }).waitFor();
  await page.keyboard.press("Escape");
  passed.push(
    "F1: offline, «Tira un evento» keeps the dialog open with «Sei senza rete…» in its own error line (not a toast behind the backdrop); an invalid physical d8 face explains itself in the dialog",
  );

  // ------------------------------------------------------------ F9: keyboard focus stays
  await openTravel("march");
  await page.locator('[data-travel-rotate="1"]').focus();
  await page.keyboard.press("Enter");
  await waitStored((s) => s.ext.travel.campaigns.lanterns.formation.facing === "east");
  await page.keyboard.press("Enter");
  await waitStored((s) => s.ext.travel.campaigns.lanterns.formation.facing === "south");
  check((await focused()).includes('data-travel-rotate="1"'), "Rotate lost the focus");
  await openTravel("journey");
  await page.locator('[data-travel-pace][value="normal"]').focus();
  await page.keyboard.press("ArrowUp");
  await waitStored((s) => s.ext.travel.campaigns.lanterns.journey.pace === "slow");
  check((await focused()).includes('value="slow"'), "Pace radio lost the focus");
  await openTravel("camp");
  await page.locator('[data-travel-watch="0"][data-actor="livia"]').focus();
  await page.keyboard.press("Space");
  await waitStored((s) => s.ext.travel.campaigns.lanterns.watch.shifts[0].includes("livia"));
  check(
    (await focused()).includes('data-travel-watch="0"') &&
      (await focused()).includes('data-actor="livia"'),
    "Watch checkbox lost the focus",
  );
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await waitStored((s) => !s.ext.travel.campaigns.lanterns.watch.shifts[0].includes("doran"));
  await page.keyboard.press("Space");
  await waitStored((s) => s.ext.travel.campaigns.lanterns.watch.shifts[0].includes("doran"));
  passed.push(
    "F9: keyboard — Enter twice on ↻ turns the formation twice (focus kept); ArrowUp on the pace radios picks Slow and the radio keeps the focus; Space on Livia's watch checkbox, then Tab, Space, Space toggles Doran's off and on without leaving the table",
  );

  // ------------------------------------------------------------ F7: metres, season, front rank
  await openTravel("journey");
  check(
    (await page.locator("[data-travel-season] option").first().innerText()) ===
      "Dal calendario (Autunno)",
    "Calendar season option not labelled",
  );
  await page.locator("[data-travel-event]").click();
  await dialog().locator('[name="diceMode"]').selectOption("physical");
  await dialog().locator('[name="face0"]').fill("7");
  await dialog().locator('button[type="submit"]').click();
  await page.locator("[data-travel-proposal]").waitFor();
  check(
    (await page.locator("[data-travel-proposal]").innerText()).includes("2d10 × 3 metri"),
    "Italian encounter distance not in metres",
  );
  await page.locator("[data-travel-dismiss]").click();
  await page.locator("[data-travel-proposal]").waitFor({ state: "detached" });
  await page.locator("[data-travel-event]").click();
  await dialog().locator('[name="face0"]').fill("5");
  await dialog().locator('button[type="submit"]').click();
  await page.locator("[data-travel-proposal]").waitFor();
  check(
    await page.locator('[data-travel-event-actor="doran"]').isChecked(),
    "The front rank (Doran) is not asked",
  );
  check(
    !(await page.locator('[data-travel-event-actor="livia"]').isChecked()),
    "Livia should not be preselected",
  );
  await shot("rf-11-event-front-rank-metres.png", page.locator("[data-travel-proposal]"));
  await page.locator("[data-travel-dismiss]").click();
  passed.push(
    "F7: the season select reads «Dal calendario (Autunno)»; a d8 = 7 proposal shows «2d10 × 3 metri» (IT SRD p. 220); a d8 = 5 check preselects Doran, the front rank of the marching order, not Livia",
  );

  // ------------------------------------------------------------ F4, F8, F5: camp event
  await openTravel("camp");
  await page.locator('[data-travel-camp-start] button[type="submit"]').click();
  await waitStored((s) => s.ext.travel.campaigns.lanterns.camp?.status === "active");
  await page.locator("[data-travel-camp-event]").click();
  check(
    await dialog().locator('[name="text"]').isHidden(),
    "Own-event fields shown for a table draw",
  );
  await dialog().locator('[name="source"][value="text"]').check();
  check(await dialog().locator('[name="face0"]').isHidden(), "Dice fields shown for own event");
  await dialog().locator('[name="text"]').fill("Due goblin esploratori strisciano verso il campo");
  await dialog().locator('[name="dc"]').fill("13");
  await dialog().locator('[name="weather"]').uncheck();
  await dialog().locator('button[type="submit"]').click();
  await page.locator("[data-travel-camp-card]").waitFor();
  check(
    (await page.locator("[data-travel-camp-card]").innerText()).includes("Due goblin"),
    "The DM does not read the event",
  );
  await role("player");
  await openTravel("march");
  const campTab = page.locator('[data-travel-sub="camp"]');
  check(
    (await campTab.locator(".travel-sub-count").innerText()) === "1" &&
      /1 tiro richiesto/.test(await campTab.getAttribute("aria-label")),
    "The Campo sub-tab does not count Livia's requested roll",
  );
  await openTravel("camp");
  const playerCamp = await page.locator("[data-travel-panel]").innerText();
  check(!/goblin/i.test(playerCamp), "The player reads the DM's camp event");
  check(/Il DM chiede una prova di Percezione/.test(playerCamp), "No check notice for the player");
  await shot("rf-12-player-camp-event-private.png", page.locator("[data-travel-camp-card]"));
  // Bell: from the campaign page, the request opens the Table on Campo with the roll.
  await openTravel("march");
  await page.goto(base + "#campaign");
  await page.locator("#content").waitFor();
  await page.locator('[data-service="requests"]').first().click();
  await dialog()
    .getByText(/Prova richiesta: Livia/)
    .first()
    .click();
  await page.locator('[data-travel-sub="camp"][aria-selected="true"]').waitFor();
  await page.locator("[data-travel-roll]").first().waitFor();
  check(/#table/.test(page.url()), "The notification did not open the Table");
  await page.locator("[data-travel-roll]").first().click();
  await dialog().locator('[name="diceMode"]').selectOption("physical");
  await dialog().locator('[name="face0"]').fill("15");
  await dialog().locator('button[type="submit"]').click();
  await dialog().waitFor({ state: "detached" });
  await role("dm");
  await openTravel("camp");
  const doranCheck = (await camp()).checks.find(
    (x) => x.kind === "watch" && x.actorId === "doran" && x.status === "pending",
  );
  if (doranCheck) await page.locator(`[data-travel-passive="${doranCheck.id}"]`).click();
  await page.locator("[data-travel-camp-calm]").click();
  await waitStored((s) => s.ext.travel.campaigns.lanterns.camp.events[0].status === "closed");
  await role("player");
  await openTravel("camp");
  const history = await page.locator("[data-travel-camp-log]").innerText();
  check(/falso allarme/.test(history) && !/goblin/i.test(history), "Player history leaks text");
  passed.push(
    "F4/F8/F5: the camp event dialog shows only the fields of its source; the DM reads «Due goblin esploratori…», the player reads only «Il DM chiede una prova di Percezione» and, after the false alarm, «Turno 1: falso allarme»; the player's Campo sub-tab counts 1 requested roll (accessible name «Campo: 1 tiro richiesto»); the bell from the campaign page opens the Table on Campo with the roll, rolled with a physical d20 = 15",
  );

  // ------------------------------------------------------------ F3: combat from the Table
  await role("dm");
  const button = (name) => page.getByRole("button", { name, exact: true });
  await button("Avvia combattimento").click();
  // Refreshed by the hand-off writer (29/09/2026): R5 PR-32 replaced Preparation's «Incontro
  // preparato» with the Table's start dialog (Foundry roll call): who fights and each typed
  // d20; the Initiative bonus comes from the sheet.
  await page.locator("[data-ct-start-dialog]").waitFor();
  {
    const naturals = { livia: 18, "goblin-1": 12, doran: 10 };
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
  await waitStored((s) => s.combat.active === true);
  await dismissTips();
  await openTravel("camp");
  await page.locator("[data-travel-camp-combat]").waitFor();
  check(
    !(await page.locator("[data-travel-camp-next], [data-travel-camp-resume]").count()),
    "Shift or resume offered during the encounter",
  );
  const interruptedText = await page.locator("[data-travel-interrupted]").innerText();
  check(
    /Livia/.test(interruptedText) && /Doran/.test(interruptedText),
    "Combat did not show the interrupted rests in the camp",
  );
  await shot("rf-13-combat-interrupts-camp.png", page.locator("[data-travel-interrupted]"));
  await button("Concludi incontro").click();
  await dialog().locator('button[type="submit"]').click();
  await waitStored((s) => s.combat.active === false);
  await openTravel("camp");
  await page.locator("[data-travel-camp-resume]").click();
  await waitStored((s) =>
    s.restTime.rests
      .find((r) => r.id === s.ext.travel.campaigns.lanterns.camp.restId)
      .participants.every((p) => p.status === "resting"),
  );
  await page.locator("[data-travel-camp-next]").click();
  await waitStored((s) => s.ext.travel.campaigns.lanterns.camp.shift === 1);
  passed.push(
    "F3: DM › «Avvia combattimento» (preparation, initiative, «Inizia combattimento») during the camp: the camp lists «Riposo interrotto: Livia, Doran» and waits for the encounter (no shift, event or resume while fighting); after «Concludi incontro» «Riprendi il riposo» resumes both rests (Mira kept resting) and «Turno successivo» advances to shift 2",
  );

  // ------------------------------------------------------------ F2: Search, Undo, Search
  await page.locator("[data-travel-camp-break]").click();
  await dialog().locator('[name="reason"]').fill("Si riparte prima dell’alba");
  await dialog().locator('button[type="submit"]').click();
  await waitStored((s) => s.ext.travel.campaigns.lanterns.camp.status === "broken");
  await role("player");
  await page.locator('[data-table-tab="creature"]').click();
  // B62: one Search action (B46's «Cerca»); the same roll finds this area's points.
  await page.locator('[data-knowledge-search="livia"]').click();
  await dialog().locator('[name="diceMode"]').selectOption("digital");
  await dialog().locator('button[type="submit"]').click();
  await page.locator("[data-travel-found], [data-travel-found-none]").first().waitFor();
  const first = (await camp()).searches.at(-1).total;
  await page.locator('[data-table="undo"]').click();
  await waitStored((s) => s.ext.travel.campaigns.lanterns.searches.length === 0);
  await page.locator('[data-knowledge-search="livia"]').click();
  await dialog().locator('button[type="submit"]').click();
  await waitStored((s) => s.ext.travel.campaigns.lanterns.searches.length === 1);
  const again = (await camp()).searches.at(-1);
  // B62: the one Search roll lives in B46's ledger; the Undo withdrew it and the retry reused it.
  const roll = (await stored()).ext["knowledge-rolls"].rolls.at(-1);
  check(again.total === first && Boolean(roll.reusedFrom), "Undo + Search rolled again");
  passed.push(
    `F2: player › Creature › «Cerca» (B62: the one Search; digital, total ${first}); «Annulla ultima modifica» removes it; «Cerca» again gives the same total, recorded as a reused roll (I-229)`,
  );

  // ------------------------------------------------------------ F6: torch lights the vision
  await role("dm");
  await openTablePanel(page, "fog-vision-panel"); // B62: Scene › Vision
  const visionBox = page.locator('input[data-fv-scene="vision"]');
  if (!(await visionBox.isChecked())) await visionBox.check();
  await page.locator('[data-fv-phase="night"]').click();
  await waitStored((s) => s.ext["fog-vision"].scenes["old-watch"]?.phase === "night");
  const levelAtLivia = () =>
    page.evaluate(async (k) => {
      const FV = await import("./fog-vision-domain.mjs");
      const s = JSON.parse(localStorage.getItem(k));
      const scene = s.scenes.find((x) => x.id === s.activeSceneId);
      const token = scene.tokens.find((t) => t.actorId === "livia");
      return FV.lightLevelAt(FV.buildLighting(s, scene), { x: token.x, y: token.y }).level;
    }, key);
  check((await levelAtLivia()) === "dark", "The night courtyard should be dark at Livia");
  await page.locator('[data-table-tab="creature"]').click();
  // Livia takes the torch from the niche she found: she needs one to light it.
  await role("player");
  await page.locator('[data-table-tab="creature"]').click();
  await page.locator('[data-knowledge-search="livia"]').click();
  await dialog().locator('[name="diceMode"]').selectOption("physical");
  await dialog().locator('[name="face0"]').fill("15");
  await dialog().locator('button[type="submit"]').click();
  await page.locator('[data-travel-take="niche"]').click();
  await waitStored((s) =>
    s.actors.livia.inventory.some((r) => r.srdId === "srd2024:item:torch" && r.quantity > 0),
  );
  await page.locator('[data-travel-light-on="livia"]').click();
  await page.locator('[data-travel-light="lit"]').waitFor();
  check((await levelAtLivia()) === "bright", "The lit torch does not light the Table's vision");
  await shot("rf-14-torch-lights-vision-player.png");
  passed.push(
    "F6: DM › Visione: dynamic vision on, «Notte»: Livia's space is dark; the player takes the niche's Torch and lights it: the same B35 lighting now reads Bright Light at Livia (the torch is a light source of the Table's vision until it burns out)",
  );

  // ------------------------------------------------------------ phone EN 390: new controls fit
  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const phone = await phoneContext.newPage();
  phone.on("pageerror", (error) => errors.push("phone: " + error.message));
  await phone.goto(base + "#table");
  await phone.evaluate(
    (state) => {
      localStorage.setItem("d20-studio-blueprint-v1", state);
    },
    JSON.stringify(await stored()),
  );
  await phone.reload();
  await phone.locator("#battle-map").waitFor();
  const phoneTips = phone.getByRole("button", { name: /^(Ho capito|Got it)$/ });
  for (let i = 0; i < 3 && (await phoneTips.count()); i++)
    await phoneTips
      .first()
      .tap({ timeout: 1500 })
      .catch(() => {});
  await phone.locator('[data-service="preferences"]').first().tap();
  await phone.locator('#dialog [name="lang"]').selectOption("en");
  await phone.locator('#dialog button[type="submit"]').tap();
  await phone.locator("[data-table-panels]").first().tap();
  await phone.locator('[data-table-panel-jump="travel"]').tap();
  await phone.locator("[data-travel-panel]").waitFor();
  await phone.locator('[data-travel-sub="camp"]').tap();
  check(
    await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    "Phone camp overflows",
  );
  await phone.screenshot({ path: dir + "rf-15-phone-camp-390.png" });
  await phoneContext.close();
  passed.push("Phone 390: the camp sub-tab with the history and counts fits without overflow");

  await context.close();
  return JSON.stringify({ passed, errors });
};
