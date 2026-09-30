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
  // B45 — exploration, travel and camp in the one app with real clicks, keys, drag and touch:
  // (1) marching grid and «Posiziona il gruppo» keeping the formation; (2) travel at a pace
  // with SRD effects, clock and days advancing, table event proposed not applied; (3) weather
  // of the day with its declared effect, edited by the DM; (4) provisions proposed with
  // consent, a shortage warns without Exhaustion; (5) watch shifts with Perception, an event
  // interrupts the Long Rest of increment 8; (6) a one-hour torch on the clock with the
  // 10-minute warning and consumption; (7) Search lists finds and empty containers.
  // Group 1 IT desktop 1440 (DM and player), group 2 isolated EN phone 390 with touch.
  // Synthetic demo data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B45/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const camp = async (p = page) => (await stored(p)).ext.travel.campaigns.lanterns;
  const waitStored = (fn, arg = null, p = page) =>
    p
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
  const dismissTips = async (p = page) => {
    const got = p.getByRole("button", { name: /^(Ho capito|Got it)$/ });
    for (let i = 0; i < 3 && (await got.count()); i++)
      await got
        .first()
        .click({ timeout: 1500 })
        .catch(() => {});
  };
  const role = async (value, p = page) => {
    if ((await p.locator("#demo-role").inputValue()) === value) return;
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await dismissTips(p);
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const shot = async (name, locator = null, p = page) => {
    if (locator) await locator.first().evaluate((el) => el.scrollIntoView({ block: "center" }));
    await p.waitForTimeout(250);
    await p.screenshot({ path: dir + name });
  };
  const panel = (p = page) => p.locator("[data-travel-panel]");
  const openTravel = async (sub = null, p = page) => {
    await openTablePanel(p, "travel"); // B62: Exploration › Travel and camp
    await panel(p).waitFor();
    if (sub) {
      await p.locator(`[data-travel-sub="${sub}"]`).click();
      await p.locator(`[data-travel-sub="${sub}"][aria-selected="true"]`).waitFor();
    }
  };
  const creatureTab = async (p = page) => {
    await p.locator('[data-table-tab="creature"]').click();
    await p.locator("[data-travel-inspector]").waitFor();
  };
  const dialog = (p = page) => p.locator("#dialog[open]");
  const submitDialog = async (p = page) => {
    await dialog(p).locator('button[type="submit"]').click();
  };
  const rollIn = async (mode, faces = [], p = page) => {
    await dialog(p).locator('[name="diceMode"]').selectOption(mode);
    for (let i = 0; i < faces.length; i++)
      await dialog(p).locator(`[name="face${i}"]`).fill(String(faces[i]));
    await submitDialog(p);
    await dialog(p).waitFor({ state: "detached" });
  };
  const reloadAs = async (who, p = page) => {
    await p.reload();
    await p.locator("#battle-map").waitFor();
    await dismissTips(p);
    await role(who, p);
  };
  const nowText = (p = page) => p.locator("[data-travel-now]").innerText();

  // ------------------------------------------------------------ reset
  await page.goto(base + "#table");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("#battle-map").waitFor();
  await dismissTips();
  check((await camp()).journey.to === "Porto Grigio", "Seed journey missing");

  // ------------------------------------------------------------ 1. formation and Place Party
  await role("dm");
  await openTravel("march"); // Table → «Viaggio e accampamento» tab: one click
  check((await nowText()).includes("14 Nebbie 1287"), "Clock line not from the World calendar");
  // Mouse drag of Mira's portrait onto the front-left cell (FG formation grid).
  const from = await page.locator('[data-travel-cell="5"]').boundingBox();
  const to = await page.locator('[data-travel-cell="0"]').boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++)
    await page.mouse.move(
      from.x + from.width / 2 + ((to.x - from.x) * i) / 8,
      from.y + from.height / 2 + ((to.y - from.y) * i) / 8,
    );
  await page.mouse.up();
  await waitStored((s) => s.ext.travel.campaigns.lanterns.formation.cells[0] === "mira");
  // Keyboard: Enter picks Livia, Tab to the next cell, Enter drops her there.
  await page.locator('[data-travel-cell="3"]').focus();
  await page.keyboard.press("Enter");
  await page.locator('[data-travel-cell="3"][aria-pressed="true"]').waitFor();
  await page.keyboard.press("Tab");
  check(
    await page.evaluate(() => document.activeElement?.dataset.travelCell === "4"),
    "Tab did not reach the next cell",
  );
  await page.keyboard.press("Enter");
  await waitStored((s) => s.ext.travel.campaigns.lanterns.formation.cells[4] === "livia");
  check(
    (await page.locator("[data-travel-order]").innerText()).includes("davanti: Mira, Doran"),
    "Marching order text not updated",
  );
  await page.locator('[data-travel-rotate="1"]').click();
  await waitStored((s) => s.ext.travel.campaigns.lanterns.formation.facing === "east");
  // «Posiziona il gruppo» arms the DM tool of the left toolbar; a map click places the party.
  const scenePoint = (x, y) =>
    page.evaluate(
      ([x, y]) => {
        const m = document.querySelector("#battle-map #tokens").getScreenCTM();
        const p = new DOMPoint(x, y).matrixTransform(m);
        return { x: p.x, y: p.y };
      },
      [x, y],
    );
  const placeAt = async (x, y) => {
    await page.locator("[data-travel-place]").click();
    await page.locator('[data-tool="travel-place"][aria-pressed="true"]').waitFor();
    const p = await scenePoint(x, y);
    await page.mouse.move(p.x - 20, p.y - 20);
    await page.mouse.move(p.x, p.y);
    await page.mouse.click(p.x, p.y);
    await waitStored((s) => s.log.at(-1).label === "Gruppo posizionato in formazione");
  };
  await placeAt(270, 380);
  let tokens = (await stored()).scenes[0].tokens;
  let at = (id) => tokens.find((t) => t.actorId === id);
  check(
    at("doran").x === 275 && at("doran").y === 375,
    "Doran should stand on the cell centre of the chosen point",
  );
  check(
    at("mira").x === at("doran").x && at("mira").y === at("doran").y - 50,
    "Facing east: Mira should stand beside Doran on his left (north)",
  );
  check(
    at("livia").x === at("doran").x - 50 && at("livia").y === at("doran").y,
    "Facing east: Livia should follow one cell behind Doran",
  );
  check(
    (await page.locator('[data-tool="move"][aria-pressed="true"]').count()) > 0,
    "The tool did not return to Move",
  );
  // Undo from the panel puts the tokens back; placing again, the reload keeps it.
  await page.locator("[data-travel-undo]").click();
  await waitStored((s) => s.scenes[0].tokens.find((t) => t.actorId === "livia").x === 250);
  await placeAt(270, 380);
  await shot("b45-01-formation-placed-dm-it-1440.png", page.locator("[data-travel-formation]"));
  await reloadAs("dm");
  await openTravel();
  tokens = (await stored()).scenes[0].tokens;
  check(
    (await camp()).formation.cells[0] === "mira" &&
      (await page.locator('[data-travel-cell="4"]').innerText()).includes("Livia") &&
      at("livia").x === 225 &&
      at("livia").y === 375,
    "Formation or placement lost on reload",
  );
  passed.push(
    "1. DM: Table › «Viaggio e accampamento» › Marcia; Mira dragged with the mouse to the front, Livia moved with Enter/Tab/Enter, formation turned east; «Posiziona il gruppo sulla mappa» arms the DM tool (ghost preview under the pointer), one map click places Doran on the chosen cell with Mira beside and Livia behind (east-facing formation, cell centres) and returns to Move; Undo in the panel puts the tokens back; placed again, the reload keeps grid and tokens",
  );

  // ------------------------------------------------------------ 7. Search (player, Livia)
  await role("player");
  await creatureTab();
  // B62: one Search action (B46's «Cerca»); this area lists the points it found.
  await page.locator('[data-knowledge-search="livia"]').click();
  await rollIn("physical", [12]);
  await page.locator("[data-travel-found]").waitFor();
  const found = await page.locator("[data-travel-found]").innerText();
  check(found.includes("Cassa sfondata") && found.includes("vuoto"), "Empty crate not listed");
  check(
    found.includes("Nicchia sotto il gradino") && found.includes("Razioni ×2"),
    "Niche missing",
  );
  check(!found.includes("Segni di trascinamento"), "A far point was found");
  const log = (await stored()).log.at(-1);
  // B62: the one Search roll is logged by B46 (knowledge) and reused by this area.
  check(
    log.rolls?.[0]?.source === "knowledge" &&
      log.rolls[0].values[0] === 12 &&
      log.rolls[0].mode === "physical",
    "The physical face is not in the log",
  );
  check(
    (await page.locator('[data-travel-point="drag-marks"]').count()) === 0,
    "Players see an unfound point on the map",
  );
  await shot("b45-02-search-found-player-it-1440.png", page.locator("[data-travel-inspector]"));
  await page.locator('[data-travel-take="niche"]').click();
  await waitStored((s) =>
    s.actors.livia.inventory.some((r) => r.srdId === "srd2024:item:rations" && r.quantity === 2),
  );
  await page.locator('[data-travel-found-point="niche"] [data-travel-empty]').waitFor();
  passed.push(
    "7. Player: Creature tab › «Cerca» (B62: the one Search) with a physical d20 (12, Perception +1 = 13): the list shows «Cassa sfondata · vuoto» and «Nicchia sotto il gradino · Razioni ×2, Torcia ×1» (DC 13); far drag marks stay hidden (also on the map); «Prendi» puts 2 Rations and 1 Torch in Livia's inventory; the physical face is in the log",
  );

  // ------------------------------------------------------------ 7b. DM search points
  await role("dm");
  await page.locator('[data-tool-group="dm"]').click();
  await page.locator('[data-tool="travel-point"]').click();
  const hidePoint = await scenePoint(820, 520);
  await page.mouse.click(hidePoint.x, hidePoint.y);
  await dialog().locator('[name="name"]').fill("Pietra smossa");
  await dialog().locator('[name="kind"]').selectOption("hidden");
  await dialog().locator('[name="dc"]').fill("18");
  await dialog().locator('[name="srd2024:item:rations"]').fill("1");
  await submitDialog();
  await waitStored((s) =>
    s.ext.travel.points["old-watch"].some((p) => p.name.it === "Pietra smossa"),
  );
  const newPoint = (await stored()).ext.travel.points["old-watch"].find(
    (p) => p.name.it === "Pietra smossa",
  );
  check(newPoint.dc === 18 && newPoint.found === false, "Hidden point not saved with its DC");
  await page.locator(`[data-travel-point="${newPoint.id}"]`).waitFor();
  await page.keyboard.press("Escape");
  await role("player");
  check(
    !(await page.locator(`[data-travel-point="${newPoint.id}"]`).count()),
    "Players see a hidden search point",
  );
  await role("dm");
  // Keyboard: the DM focuses the marker and edits it with Enter (here: deletes it).
  await page.locator(`[data-travel-point="${newPoint.id}"]`).focus();
  await page.keyboard.press("Enter");
  await dialog().locator('[name="remove"]').check();
  await submitDialog();
  await waitStored(
    (s, id) => !s.ext.travel.points["old-watch"].some((p) => p.id === id),
    newPoint.id,
  );
  passed.push(
    "7b. DM tools › «Punto di ricerca»: a map click opens the dialog, «Pietra smossa» hidden with DC 18 and 1 Rations is saved and drawn only for the DM; the player never sees it; the DM focuses the marker, Enter opens it and deletes it",
  );

  // ------------------------------------------------------------ 6. torch on the clock
  await role("player");
  await creatureTab();
  await page.locator('[data-travel-light-on="livia"]').click();
  await page.locator('[data-travel-light="lit"]').waitFor();
  check(
    (await page.locator('[data-travel-light="lit"]').innerText()).includes("1 h 0 min"),
    "Torch does not burn for 1 hour",
  );
  check(
    !(await stored()).actors.livia.inventory.some((r) => r.srdId === "srd2024:item:torch"),
    "The torch was not consumed from the inventory",
  );
  check(
    (await page.locator('[data-travel-glow="livia"]').count()) === 1,
    "No light on the map around Livia",
  );
  const advanceTime = async (minutes) => {
    await role("dm");
    await page.locator('[data-table="time"]').click();
    await dialog().locator("[data-rest-time-value]").fill(String(minutes));
    await dialog().locator("[data-rest-time-unit]").selectOption("60");
    await dialog().locator("[data-rest-preview-time]").click();
    await dialog().locator("[data-rest-apply]").click();
    await dialog().locator("[data-close]").first().click();
    await dialog().waitFor({ state: "detached" });
  };
  const clockBefore = (await stored()).restTime?.clocks?.lanterns?.seconds ?? 0;
  await advanceTime(50);
  await waitStored((s, a) => s.restTime.clocks.lanterns.seconds === a + 3000, clockBefore);
  await role("player");
  await creatureTab();
  await page.locator('[data-travel-light="warning"]').waitFor();
  check(
    (await page.locator('[data-travel-light="warning"]').innerText()).includes("10 min"),
    "No 10-minute warning",
  );
  await shot(
    "b45-03a-torch-warning-creature-player-it-1440.png",
    page.locator('[data-travel-light="warning"]'),
  );
  await page.locator('[data-service="requests"]').first().click();
  await dialog()
    .getByText(/si spegne tra 10 min/)
    .first()
    .waitFor();
  await shot("b45-03-torch-warning-bell-player-it-1440.png");
  await dialog().locator("[data-close]").first().click();
  await advanceTime(10);
  await role("player");
  await creatureTab();
  await page.locator('[data-travel-light="none"]').waitFor();
  check(
    (await page.locator('[data-travel-light="none"]').innerText()).includes("si è consumata"),
    "The burnt torch is not reported",
  );
  check((await page.locator('[data-travel-glow="livia"]').count()) === 0, "Light still on the map");
  passed.push(
    "6. Player lights a torch: one Torch leaves Livia's inventory, «resta 1 h 0 min», a light ring follows her token; DM › Tempo +50 min: the Creature tab warns «si spegne tra poco» and the bell lists «La torcia di Livia si spegne tra 10 min»; +10 min: the light goes out («La torcia si è consumata»), the ring disappears",
  );

  // ------------------------------------------------------------ 2. travel, pace, events
  await role("dm");
  await openTravel("journey");
  await page.locator('[data-travel-pace][value="fast"]').check();
  await waitStored((s) => s.ext.travel.campaigns.lanterns.journey.pace === "fast");
  check(
    (await panel().innerText()).includes("Svantaggio a Saggezza (Percezione o Sopravvivenza)"),
    "Fast pace effect not shown",
  );
  await page.locator("[data-travel-hours]").selectOption("10");
  await page.locator("[data-travel-extended]").waitFor();
  check(
    (await page.locator("[data-travel-extended]").innerText()).includes("CD 11, 12"),
    "Extended travel DCs not previewed",
  );
  const beforeTravel = (await stored()).restTime.clocks.lanterns.seconds;
  await page.locator("[data-travel-go]").click();
  await waitStored((s, a) => s.restTime.clocks.lanterns.seconds === a + 36000, beforeTravel);
  const j = (await camp()).journey;
  check(j.travelledKm === 57, "10 h fast: 45 km for the day + 2 × 6 km, got " + j.travelledKm);
  check((await nowText()).includes("19:00"), "Clock line did not advance to 19:00");
  check(
    (await camp()).checks.filter((c) => c.kind === "extended").length === 6,
    "Extended travel saves not requested",
  );
  await page.locator("[data-travel-event]").click();
  await rollIn("physical", [5]);
  await page.locator("[data-travel-proposal]").waitFor();
  check(
    /proposta, non applicata/i.test(await page.locator("[data-travel-proposal]").innerText()),
    "Event is not presented as a proposal",
  );
  check(
    (await camp()).checks.filter((c) => c.kind === "travel").length === 0,
    "The draw applied a check by itself",
  );
  await shot(
    "b45-04-journey-event-proposal-dm-it-1440.png",
    page.locator("[data-travel-proposal]"),
  );
  await role("player");
  await openTravel("journey");
  check(!(await page.locator("[data-travel-proposal]").count()), "Player sees the proposal");
  check(!(await page.locator("[data-travel-go]").count()), "Player can move the journey");
  await role("dm");
  await openTravel("journey");
  // Review F7: «Chi tira» preselects the marching order's front rank (Mira and Doran now).
  check(
    (await page.locator('[data-travel-event-actor="mira"]').isChecked()) &&
      (await page.locator('[data-travel-event-actor="doran"]').isChecked()) &&
      !(await page.locator('[data-travel-event-actor="livia"]').isChecked()),
    "The event check does not ask the front rank",
  );
  await page.locator("[data-travel-accept]").click();
  await waitStored((s) => s.ext.travel.campaigns.lanterns.checks.some((c) => c.kind === "travel"));
  passed.push(
    "2. DM › Viaggio: Veloce (allowed on hills with the good road) shows its SRD effect; 10 h previews Extended Travel (DC 11, 12); «Viaggia» advances the shared clock 10 h (09:00 → 19:00, the World calendar date line) and 57 km (SRD Day column + 2 extra hours), asking 6 Constitution saves; «Tira un evento» (physical d8 = 5) shows «Tracce recenti» as «Proposta, non applicata» only to the DM; accepting asks the front rank's checks (Mira and Doran, preselected from the marching order, review F7)",
  );

  // Player rolls: Disadvantage from the Fast pace (two d20), then corrects a mistyped face.
  await role("player");
  await openTravel("journey");
  const travelCheck = (await camp()).checks.find(
    (c) => c.kind === "travel" && c.actorId === "mira",
  );
  const row = page.locator(`[data-travel-check="${travelCheck.id}"]`);
  check((await row.innerText()).includes("svantaggio"), "Pace Disadvantage not shown");
  await row.locator("[data-travel-roll]").click();
  check((await dialog().innerText()).includes("il più basso"), "Two d20, keep the lower");
  await rollIn("physical", [14, 9]);
  await waitStored(
    (s, id) => s.ext.travel.campaigns.lanterns.checks.find((c) => c.id === id).natural === 9,
    travelCheck.id,
  );
  await page.locator(`[data-travel-correct="${travelCheck.id}"]`).click();
  await dialog().locator('[name="face1"]').fill("12");
  await dialog().locator('[name="reason"]').fill("Avevo letto male il secondo dado");
  await submitDialog();
  await waitStored(
    (s, id) => s.ext.travel.campaigns.lanterns.checks.find((c) => c.id === id).natural === 12,
    travelCheck.id,
  );
  const corrected = (await stored()).ext["travel-rolls"].rolls.find(
    (r) => r.checkId === travelCheck.id,
  );
  check(corrected.corrections[0].values.join() === "14,9", "Earlier faces not kept");
  // Extended travel saves: digital rolls for Livia's two saves.
  for (const save of (await camp()).checks.filter(
    (c) => c.kind === "extended" && c.actorId === "livia",
  )) {
    await page.locator(`[data-travel-check="${save.id}"] [data-travel-roll]`).click();
    await rollIn("digital");
    await waitStored(
      (s, id) =>
        s.ext.travel.campaigns.lanterns.checks.find((c) => c.id === id).status === "rolled",
      save.id,
    );
  }
  await shot("b45-05-checks-player-it-1440.png", page.locator(".travel-checks"));
  // DM: Doran fails a save (physical 5 + 4 < 11); Exhaustion is proposed, applied by hand.
  await role("dm");
  await openTravel("journey");
  const doranSave = (await camp()).checks.find(
    (c) => c.kind === "extended" && c.actorId === "doran" && c.dc === 11,
  );
  check(
    (await page.locator(`[data-travel-check="${doranSave.id}"]`).innerText()).includes("CD 11"),
    "Extended travel DC not shown",
  );
  await page.locator(`[data-travel-check="${doranSave.id}"] [data-travel-roll]`).click();
  await rollIn("physical", [5]);
  await page.locator(`[data-travel-result="${doranSave.id}"] .travel-warn`).waitFor();
  check(((await stored()).actors.doran.exhaustion ?? 0) === 0, "Exhaustion applied automatically");
  await shot(
    "b45-05a-extended-save-failed-dm-it-1440.png",
    page.locator(`[data-travel-result="${doranSave.id}"]`),
  );
  await page
    .locator(`[data-travel-result="${doranSave.id}"] [data-travel-conditions="doran"]`)
    .click();
  await dialog()
    .getByText(/Indebolimento/)
    .first()
    .waitFor();
  await dialog().locator("[data-close]").first().click();
  await dialog().waitFor({ state: "detached" });
  passed.push(
    "2b. Player: Mira's requested check shows Disadvantage (Fast pace); the dialog asks two d20 and keeps the lower (physical 14, 9); «Correggi» with a reason changes 9 → 12 and keeps the earlier faces; Livia's two Extended Travel saves rolled with digital dice. DM: Doran's save (CD 11, physical 5 + 4) fails: «Fallito: 1 livello di Indebolimento, lo applica il DM» with «Condizioni e stato» opening the shared Conditions panel; Exhaustion stays 0 until applied there",
  );

  // ------------------------------------------------------------ 3. weather
  await role("dm");
  await openTravel("journey");
  await page.locator("[data-travel-weather-roll]").click();
  await rollIn("physical", [17]);
  await page.locator('[data-travel-weather="heavy-rain"]').waitFor();
  const weather = await page.locator('section[aria-labelledby="travel-weather-title"]').innerText();
  check(
    weather.includes("Pioggia battente") &&
      weather.includes("spegne le fiamme scoperte") &&
      weather.includes("p. 223"),
    "Heavy rain effect or SRD source missing",
  );
  await role("player");
  await openTravel("journey");
  await page.locator("[data-travel-weather-hidden]").waitFor();
  await role("dm");
  await openTravel("journey");
  await page.locator("[data-travel-weather-share]").check();
  await waitStored((s) => Object.values(s.ext.travel.campaigns.lanterns.weather.days)[0].shared);
  await page.locator("[data-travel-weather-set]").click();
  await dialog().locator('[name="condition"]').selectOption("fog");
  await dialog().locator('[name="reason"]').fill("La nebbia sale dal fiume");
  await submitDialog();
  await page.locator('[data-travel-weather="fog"]').waitFor();
  await page.locator("[data-travel-weather-map]").check();
  await page.locator(".travel-weather-fog").waitFor({ state: "attached" });
  await shot(
    "b45-06-weather-dm-it-1440.png",
    page.locator('section[aria-labelledby="travel-weather-title"]'),
  );
  await role("player");
  await openTravel("journey");
  await page.locator('[data-travel-weather="fog"]').waitFor();
  check(
    (await page.locator('section[aria-labelledby="travel-weather-title"]').innerText()).includes(
      "Nebbia rada",
    ),
    "Player does not see the shared weather",
  );
  passed.push(
    "3. DM › «Genera il meteo» (temperate autumn from the World calendar, physical d20 = 17): «Pioggia battente» with the SRD Heavy Precipitation effect (IT p. 223), DM-only until «Mostra ai giocatori»; «Cambia» to «Nebbia rada» requires a reason (history kept); «Sulla mappa» draws the fog over the map (Owlbear Weather); the player then sees fog and its effect",
  );

  // ------------------------------------------------------------ 4. provisions with consent
  await role("dm");
  await openTravel("journey");
  await page.locator('[data-travel-propose] [name="water"]').uncheck();
  await page.locator('[data-travel-propose] button[type="submit"]').click();
  await page.locator("[data-travel-warnings]").waitFor();
  check(
    !(await page.locator('[data-travel-eat="livia"]').count()),
    "The DM can eat Livia's rations",
  );
  await role("player");
  await openTravel("journey");
  // W2b1 (B36) seeds 4 more Rations in Livia's backpack: count every Rations row, so the
  // eaten ration is one less in total, whatever row it came from.
  const rationsOf = (s) =>
    s.actors.livia.inventory
      .filter((r) => r.srdId === "srd2024:item:rations")
      .reduce((sum, r) => sum + (r.quantity ?? 1), 0);
  const rationsBefore = rationsOf(await stored());
  const rationsLeft = rationsBefore - 1;
  await page.locator('[data-travel-eat="livia"]').click();
  await waitStored(
    (s, left) =>
      s.actors.livia.inventory
        .filter((r) => r.srdId === "srd2024:item:rations")
        .reduce((sum, r) => sum + (r.quantity ?? 1), 0) === left,
    rationsLeft,
  );
  check(
    await page.locator('[data-travel-eat="mira"]').isDisabled(),
    "Mira can eat without rations",
  );
  await page.locator('[data-travel-skip="mira"]').click();
  await waitStored((s) => {
    const day = Object.values(s.ext.travel.campaigns.lanterns.provisions.days)[0];
    return day.rows.mira.status === "skip";
  });
  const warnings = await page.locator("[data-travel-warnings]").innerText();
  check(
    warnings.includes("Mira: senza cibo oggi") &&
      warnings.includes("Acqua scarsa") &&
      warnings.includes("nulla viene applicato da solo"),
    "Shortage warnings missing",
  );
  check(((await stored()).actors.mira.exhaustion ?? 0) === 0, "Exhaustion applied automatically");
  await shot(
    "b45-07-provisions-player-it-1440.png",
    page.locator('section[aria-labelledby="travel-supplies-title"]'),
  );
  // The same count in the sheet's Inventory tab.
  await page.goto(base + "#characters?id=livia&tab=inventory");
  await page.locator("[data-travel-sheet]").waitFor();
  const sheetText = await page.locator("[data-travel-sheet]").innerText();
  check(
    new RegExp(`Razioni:\\s*${rationsLeft}\\s*\\(${rationsLeft} giorn[oi] di cibo\\)`).test(
      sheetText,
    ),
    "Sheet does not show the remaining Rations: " + sheetText,
  );
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await dismissTips();
  passed.push(
    `4. DM proposes today's provisions with scarce water (the DM cannot eat for Livia); Livia's player consents: 1 Rations leaves her inventory (${rationsBefore} → ${rationsLeft}, also in the sheet's Inventory › Luce e provviste); Mira has none («Consuma» disabled) and skips: Malnutrition and Dehydration warnings with SRD pages, «nulla viene applicato da solo», Exhaustion unchanged`,
  );

  // ------------------------------------------------------------ 5. camp, watch, interruption
  await role("dm");
  await openTravel("camp");
  await page.locator("[data-travel-rotate-watch]").click();
  await waitStored((s) => s.ext.travel.campaigns.lanterns.watch.shifts[0][0] === "mira");
  check(
    (await page.locator("[data-travel-watch-warnings]").innerText()).includes("Turno 4 scoperto"),
    "Uncovered shift not warned",
  );
  await page.locator('[data-travel-camp-start] button[type="submit"]').click();
  await waitStored((s) => s.ext.travel.campaigns.lanterns.camp?.status === "active");
  const restId = (await camp()).camp.restId;
  check(
    (await stored()).restTime.rests
      .find((r) => r.id === restId)
      .participants.find((p) => p.actorId === "livia").activity === "sleep",
    "Livia is not asleep in the Long Rest",
  );
  await page.locator("[data-travel-camp-next]").click();
  await waitStored((s) => s.ext.travel.campaigns.lanterns.camp.shift === 1);
  await page.locator("[data-travel-camp-event]").click();
  await dialog().locator('[name="source"][value="text"]').check();
  await dialog().locator('[name="text"]').fill("Rami spezzati oltre il fuoco");
  await dialog().locator('[name="dc"]').fill("12");
  await dialog().locator('[name="weather"]').uncheck();
  await submitDialog();
  await page.locator("[data-travel-camp-card]").waitFor();
  const watchCheck = (await camp()).checks.find((c) => c.kind === "watch");
  check(watchCheck.actorId === "doran", "Shift 2 watcher should be Doran");
  await page.locator(`[data-travel-check="${watchCheck.id}"] [data-travel-roll]`).click();
  await rollIn("physical", [11]);
  await page.locator("[data-travel-noticed]").waitFor();
  check(
    (await page.locator("[data-travel-noticed]").innerText()).includes("Doran"),
    "Doran did not notice",
  );
  await shot("b45-08-camp-watch-event-dm-it-1440.png", page.locator("[data-travel-noticed]"));
  await page.locator("[data-travel-camp-fight]").click();
  await page.locator("[data-travel-interrupted]").waitFor();
  const interrupted = (await stored()).restTime.rests.find((r) => r.id === restId);
  check(
    interrupted.participants.every(
      (p) => p.status === "interrupted" && p.interruptions[0].cause === "initiative",
    ),
    "The Long Rest was not interrupted by Initiative",
  );
  check(
    interrupted.participants.find((p) => p.actorId === "livia").benefits[0]?.kind === "short",
    "2 hours rested: no Short Rest benefits",
  );
  await shot("b45-09-camp-interrupted-dm-it-1440.png", page.locator("[data-travel-interrupted]"));
  // The same rest in the increment 8 panel (Riposi).
  if (await dialog().count())
    throw Error("Unexpected dialog: " + (await dialog().innerText()).slice(0, 300));
  await page.locator("[data-travel-open-rest]").click();
  await dialog().getByText("Interrotto").first().waitFor();
  check(
    (await dialog().innerText()).includes("Beneficio del breve"),
    "The rest panel does not show the Short Rest benefit",
  );
  await dialog().locator("[data-close]").first().click();
  await dialog().waitFor({ state: "detached" });
  await page.locator("[data-travel-camp-resume]").click();
  await waitStored((s) => s.ext.travel.campaigns.lanterns.camp.status === "active");
  for (let i = 0; i < 3; i++) {
    await page.locator("[data-travel-camp-next]").click();
    await waitStored((s, n) => s.ext.travel.campaigns.lanterns.camp.shift === n, i + 2);
  }
  await page.locator("[data-travel-camp-hour]").click();
  await page.locator("[data-travel-camp-finish]").click();
  await page.locator("[data-travel-camp-done]").waitFor();
  const done = await stored();
  check(done.actors.livia.hp === done.actors.livia.maxHp, "Long Rest did not restore HP");
  await shot("b45-10-camp-done-dm-it-1440.png", page.locator("[data-travel-camp-done]"));
  passed.push(
    "5. DM › Campo: «Turni a rotazione» follows the marching order (Mira, Doran, Livia; shift 4 uncovered warned); «Accampatevi» starts the Long Rest of increment 8 (sleepers asleep, watcher awake); shift 2 event «Rami spezzati» (DC 12) asks Doran's Perception (physical 11 → noticed); «Si tira l’iniziativa» interrupts every rest (cause initiative, Short Rest benefits after 2 h; the Riposi panel shows it); resume, three shifts, the extra hour, «Concludi il riposo lungo»: HP restored",
  );

  // ------------------------------------------------------------ reload persistence
  await reloadAs("dm");
  await openTravel("journey");
  const after = await camp();
  check(
    after.journey.travelledKm === 57 &&
      after.camp.status === "done" &&
      Object.values(after.weather.days)[0].conditionId === "fog",
    "State lost on reload",
  );
  check((await nowText()).includes("15 Nebbie"), "The night did not move the calendar date");
  check(await noOverflow(), "Desktop page overflows");
  passed.push(
    "Reload keeps journey (57 km), weather (fog, shared) and the finished camp; the date line moved to 15 Nebbie; no horizontal overflow at 1440",
  );

  // ------------------------------------------------------------ palette and bell reach the tab
  await page.goto(base + "#campaign");
  await page.locator("#content").waitFor();
  await page.keyboard.press("ControlOrMeta+K");
  await page.locator("[data-cmdk-input]").fill(">viaggio e accamp");
  await page
    .getByRole("option", { name: /Apri viaggio e accampamento/ })
    .first()
    .waitFor();
  await page.keyboard.press("Enter");
  await page.locator('#table-sidebar-panel[data-table-panel="travel"]').waitFor();
  await role("player");
  await page.goto(base + "#campaign");
  await page.locator("#content").waitFor();
  await page.locator('[data-service="requests"]').first().click();
  await dialog()
    .getByText(/Prova richiesta: Mira/)
    .first()
    .click();
  await page.locator('#table-sidebar-panel[data-table-panel="travel"]').waitFor();
  // Review F5: the request opens the sub-tab that lists it, with its roll on screen.
  await page.locator('[data-travel-sub="journey"][aria-selected="true"]').waitFor();
  await page.locator("[data-travel-roll]").first().waitFor();
  check(/#table/.test(page.url()), "The notification did not open the Table");
  passed.push(
    "Palette (Ctrl/Cmd+K, «Apri viaggio e accampamento») and the bell («Prova richiesta: Mira …») both open the Table on the «Viaggio e accampamento» tab from the campaign page (the bell on the Viaggio sub-tab with the requested roll, review F5)",
  );

  // ------------------------------------------------------------ group 2: EN phone 390, touch
  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const phone = await phoneContext.newPage();
  phone.on("pageerror", (error) => errors.push("phone: " + error.message));
  await phone.goto(base + "#table");
  await phone.locator("#battle-map").waitFor();
  await dismissTips(phone);
  await phone.locator('[data-service="preferences"]').first().tap();
  await phone.locator('#dialog [name="lang"]').selectOption("en");
  await phone.locator('#dialog button[type="submit"]').tap();
  await role("player", phone);
  await dismissTips(phone);
  await phone.locator("[data-table-panels]").first().tap();
  await phone.locator('[data-table-panel-jump="travel"]').tap();
  await panel(phone).waitFor();
  await phone.locator('[data-travel-sub="march"]').tap();
  check((await panel(phone).innerText()).includes("Marching order"), "Phone panel not in English");
  await phone.locator('[data-travel-cell="3"]').tap();
  await phone.locator('[data-travel-cell="3"][aria-pressed="true"]').waitFor();
  await phone.locator('[data-travel-cell="0"]').tap();
  await waitStored(
    (s) => s.ext.travel.campaigns.lanterns.formation.cells[0] === "livia",
    null,
    phone,
  );
  check(await noOverflow(phone), "Phone page overflows (march)");
  await shot(
    "b45-11-phone-en-march-player-390.png",
    phone.locator("[data-travel-formation]"),
    phone,
  );
  await role("dm", phone);
  await phone.locator("[data-table-panels]").first().tap();
  await phone.locator('[data-table-panel-jump="travel"]').tap();
  await phone.locator('[data-travel-sub="journey"]').tap();
  await phone.locator('[data-travel-pace][value="slow"]').tap();
  await waitStored((s) => s.ext.travel.campaigns.lanterns.journey.pace === "slow", null, phone);
  await phone.locator("[data-travel-hours]").selectOption("4");
  await phone.locator("[data-travel-go]").tap();
  await waitStored((s) => s.ext.travel.campaigns.lanterns.journey.travelledKm === 12, null, phone);
  check(
    (await phone.locator("[data-travel-progress]").innerText()).includes("mi"),
    "Distances are not in miles in English",
  );
  check(await noOverflow(phone), "Phone page overflows (journey)");
  await shot("b45-12-phone-en-journey-dm-390.png", phone.locator("[data-travel-progress]"), phone);
  await phone.locator('[data-travel-sub="camp"]').tap();
  await phone.locator("[data-travel-watch-plan]").waitFor();
  check(await noOverflow(phone), "Phone page overflows (camp)");
  await shot("b45-13-phone-en-camp-dm-390.png", phone.locator("[data-travel-watch-plan]"), phone);
  passed.push(
    "Group 2, isolated EN phone 390 with touch: All panels › Travel and camp; the player taps Livia then the front cell (formation saved); the DM taps Slow, 4 h, Travel: 12 km shown in miles; March, Journey and Camp without horizontal overflow",
  );
  await phoneContext.close();

  check(!errors.length, "Page errors: " + errors.join(" | "));
  await context.close();
  return { passed, errors };
};
