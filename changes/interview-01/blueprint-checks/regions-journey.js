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
  // B41 — Regions, traps and behaviours. Acceptance checks of the card in
  // docs/interview/CAPABILITY_CENSUS.md (#### B41) with real clicks, drags, keys and touch:
  // (1) region «Lastra a pressione» on enter: Dexterity save DC 13, then 2d6 piercing, once;
  // a new region drawn and configured from the DM tool, Undo removes it; (2) Livia enters: the
  // movement stops at the edge, the save is requested, the outcome applies after the roll;
  // «Riarma»; (3) Perception finds the trap and marks it for the party (physical roll
  // corrected with a reason); disarm with Thieves' Tools; (4) Difficult Terrain and «1d4 fire
  // at turn start»; (5) stairs between Courtyard and Crypt with confirmation, both ways;
  // (6) the DM previews events and can cancel them; nothing runs unseen. Plus DM vs player
  // view, reload persistence, Undo keeping the DM's dice (I-229), Preparation section with
  // reusable traps and drawing, EN phone 390 with touch. Synthetic data; resets this
  // browser's local state.
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  // Independent review (B41-rf) reruns write their images here; the builder's run used B41/.
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B41-rf/";
  const CRYPT = "old-watch-crypt";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  let phone = null;
  page.on("pageerror", (error) =>
    errors.push(error.message + " @ " + String(error.stack).split("\n").slice(1, 3).join(" ")),
  );
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const slice = async (p = page) => (await stored(p)).ext.regions;
  const region = async (id, p = page) => (await slice(p)).regions.find((r) => r.id === id);
  const lastEvent = async (p = page) => (await slice(p)).events.at(-1);
  const tokenOf = async (actorId, sceneId = "old-watch", p = page) =>
    (await stored(p)).scenes
      .find((s) => s.id === sceneId)
      .tokens.find((t) => t.actorId === actorId);
  const dialog = (p = page) => p.locator("#dialog");
  const submit = async (p = page, tap = false) => {
    const b = dialog(p).locator("button[type=submit]");
    await (tap ? b.tap() : b.click());
    await p.waitForTimeout(250);
  };
  const closeDialog = async (p = page) => {
    if (await dialog(p).evaluate((d) => d.open)) {
      await dialog(p).locator("footer [data-close]").click();
      await p.waitForTimeout(150);
    }
  };
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForTimeout(250);
  };
  const shot = (name, p = page) => p.screenshot({ path: dir + name + ".png" });
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const go = async (hash, p = page) => {
    await p.goto(base + "#" + hash);
    await p.locator("#content").waitFor();
    await p.waitForTimeout(250);
  };
  const toast = (p = page) => p.locator("#toast").textContent();
  const dismissTip = async (p = page, tap = false) => {
    const tip = p.getByRole("button", { name: /^(Ho capito|Got it)$/ });
    if (
      await tip
        .first()
        .isVisible()
        .catch(() => false)
    )
      await (tap ? tip.first().tap() : tip.first().click());
  };
  const at = (x, y, p = page) =>
    p.locator("#battle-map").evaluate(
      (svg, q) => {
        const t = svg.createSVGPoint();
        t.x = q.x;
        t.y = q.y;
        const r = t.matrixTransform(svg.getScreenCTM());
        return { x: r.x, y: r.y };
      },
      { x, y },
    );
  const clickScene = async (x, y, p = page) => {
    const q = await at(x, y, p);
    await p.mouse.click(q.x, q.y);
    await p.waitForTimeout(250);
  };
  const dragScene = async (from, to, p = page, selector = "#battle-map") => {
    // The map in the middle of the viewport: the bottom toast must not sit on the gesture.
    await p.locator(selector).evaluate((el) => el.scrollIntoView({ block: "center" }));
    await p.waitForTimeout(100);
    const map = (x, y) =>
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
    const a = await map(from.x, from.y);
    const b = await map(to.x, to.y);
    await p.mouse.move(a.x, a.y);
    await p.mouse.down();
    for (let i = 1; i <= 10; i++)
      await p.mouse.move(a.x + ((b.x - a.x) * i) / 10, a.y + ((b.y - a.y) * i) / 10);
    await p.mouse.up();
    await p.waitForTimeout(300);
  };
  // P6 TV-01 (Foundry, Owlbear): a token moves by dragging it from where it stands.
  // The grab point sits a little below the centre: a region's badge (the disarmed plate's
  // tick) or a neighbour token can cover the centre of a crowded token.
  const dragToken = async (actorId, x, y, p = page) => {
    const t = await tokenOf(actorId, (await stored(p)).activeSceneId, p);
    await dragScene({ x: t.x - 4, y: t.y + 12 }, { x, y }, p);
  };
  const selectToken = async (actorId, p = page) => {
    const t = await tokenOf(actorId, (await stored(p)).activeSceneId, p);
    await clickScene(t.x, t.y, p);
  };
  const tool = async (id, p = page, tap = false) => {
    const chip = p.locator(`.map-toolbar [data-tool="${id}"]`);
    // P6 TV-06: on a phone the map tools fold into «Strumenti della mappa»; unfold first.
    const fold = p.locator('#content [data-map-tools-toggle][aria-expanded="false"]');
    if (await fold.isVisible().catch(() => false)) {
      await (tap ? fold.tap() : fold.click());
      await p.waitForTimeout(150);
    }
    if (!(await chip.isVisible())) {
      const group = p
        .locator(".map-tool-cluster", { has: p.locator(`[data-tool="${id}"]`) })
        .locator("[data-tool-group]");
      await (tap ? group.tap() : group.click());
      await p.waitForTimeout(150);
    }
    await (tap ? chip.tap() : chip.click());
    await p.waitForTimeout(200);
  };
  const regionPanel = (p = page) => p.locator("[data-regions-panel]");
  const panelText = async (p = page) =>
    (await regionPanel(p).count()) ? regionPanel(p).innerText() : "";
  const creatureTab = async (p = page) => {
    const tab = p.locator('.table-tabs [data-table-tab="creature"]');
    if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
    await p.waitForTimeout(150);
  };
  const noAreaWarnings = async (where, p = page) => {
    const link = p.getByText(/con avvisi|with warnings/).first();
    if (!(await link.count())) return;
    await link.click();
    await p.waitForTimeout(250);
    throw Error(`Area warning after ${where}: ${(await dialog(p).innerText()).slice(-1500)}`);
  };
  const dice = async (prefix, values, p = page) => {
    await dialog(p).locator(`[name="${prefix}-mode"]`).selectOption("physical");
    for (const [i, v] of values.entries())
      await dialog(p).locator(`[name="${prefix}-face${i}"]`).fill(String(v));
  };
  const undoButton = (p = page) => p.locator('.action-dock [data-table="undo"]');

  try {
    await go("table");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#battle-map").waitFor();
    await dismissTip();
    let s = await stored();
    check(
      s.scenes.some((row) => row.id === CRYPT) && s.ext.regions.regions.length === 4,
      "Crypt scene and sample regions not seeded",
    );

    // ------------------------------------------------ (1) configuration and drawing (DM)
    await role("dm");
    await go("table");
    await tool("regions");
    check(
      (await page.locator('[data-regions-layer="dm"] [data-region="region-plate"]').count()) === 1,
      "The DM does not see the hidden plate",
    );
    await clickScene(425, 380); // select
    await clickScene(425, 380); // second click on the selected region: configuration
    check(
      (await dialog().locator("#dialog-title").innerText()).includes("Lastra a pressione"),
      "Plate configuration did not open",
    );
    const d = dialog();
    check((await d.locator("[name=event]").inputValue()) === "enter", "Plate event is not enter");
    check(await d.locator("[name=once]").isChecked(), "Plate is not once");
    check(await d.locator("[name=stopMovement]").isChecked(), "Plate does not stop movement");
    check(await d.locator("[name=act-save]").isChecked(), "Plate has no saving throw");
    check((await d.locator("[name=save-ability]").inputValue()) === "dex", "Save is not Dex");
    check((await d.locator("[name=save-dc]").inputValue()) === "13", "Save DC is not 13");
    check(
      (await d.locator("[name=save-count]").inputValue()) === "2" &&
        (await d.locator("[name=save-sides]").inputValue()) === "6" &&
        (await d.locator("[name=save-type]").inputValue()) === "piercing",
      "Plate damage is not 2d6 piercing",
    );
    await shot("01-dm-plate-config");
    await closeDialog();
    // Draw a new region (Foundry: drag with the Regions tool), configure it as a net trap.
    const before = (await slice()).regions.length;
    await dragScene({ x: 620, y: 470 }, { x: 720, y: 540 });
    check(
      (await dialog().locator("#dialog-title").innerText()).includes("Regione"),
      "Drawing did not open the new region's configuration",
    );
    await d.locator("[name=name]").fill("Rete che cade");
    await d.locator("[name=kind]").selectOption("trap");
    await d.locator("[name=once]").check();
    await d.locator("[name=stopMovement]").check();
    await d.locator("[name=act-save]").check();
    await d.locator("[name=save-has-damage]").uncheck();
    await d.locator("[name=save-dc]").fill("10");
    await d.locator("[name=save-condition]").selectOption("restrained");
    await d.locator("[name=is-trap]").check();
    await d.locator("[name=detect-dc]").fill("11");
    await d.locator("[name=disarm-dc]").fill("10");
    await submit();
    s = await stored();
    const net = s.ext.regions.regions.at(-1);
    check(
      s.ext.regions.regions.length === before + 1 &&
        net.name === "Rete che cade" &&
        net.actions[0].conditionId === "restrained" &&
        net.actions[0].dice === null &&
        net.trap.detectDC === 11,
      "New region not saved: " + JSON.stringify(net),
    );
    check(
      s.log.slice(-2).every((entry) => entry.visibility === "private"),
      "DM authoring must stay private in the Log",
    );
    // Undo twice: the configuration, then the drawing.
    await undoButton().click();
    await page.waitForTimeout(200);
    await undoButton().click();
    await page.waitForTimeout(200);
    check((await slice()).regions.length === before, "Undo did not remove the drawn region");
    // Keyboard: the chosen region moves one cell with an arrow, Ctrl+Z restores it, Enter
    // opens its configuration and Escape closes it.
    await clickScene(425, 380);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(250);
    check((await region("region-plate")).shape.y === 400, "ArrowDown did not nudge the region");
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(250);
    check((await region("region-plate")).shape.y === 350, "Ctrl+Z did not restore the region");
    await page.locator("#battle-map").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    check(await dialog().evaluate((el) => el.open), "Enter did not open the configuration");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    check(!(await dialog().evaluate((el) => el.open)), "Escape did not close the configuration");
    // The player never sees the hidden plate, nor the tool.
    await role("player");
    await go("table");
    check(
      (await page.locator('[data-region="region-plate"]').count()) === 0,
      "The player sees the hidden plate",
    );
    check((await page.locator('[data-tool="regions"]').count()) === 0, "Player has the tool");
    check(
      (await page
        .locator('[data-regions-layer="player"] [data-region="region-embers"]')
        .count()) === 1,
      "Shared embers not drawn for the player",
    );
    await shot("02-player-map-hidden-plate");
    passed.push(
      "(1) DM tool in the DM group: the seeded «Lastra a pressione» opens with enter / once / stop / Dex DC 13 / 2d6 piercing; a region drawn by drag opens its configuration and saves a net trap (Restrained, no damage, DCs 11/10); both commits are private in the Log; Undo ×2 removes it; keyboard: ArrowDown nudges the plate one cell, Ctrl+Z restores it, Enter opens its configuration, Escape closes it; the player sees neither the plate nor the tool, only the shared embers",
    );

    // ------------------------------------------------ (2) Livia steps on the plate
    await dragToken("livia", 550, 380);
    let livia = await tokenOf("livia");
    check(Math.abs(livia.x - 400) < 0.5, "Livia did not stop at the plate's edge: " + livia.x);
    // The stop toast can be replaced by B40's swim toast for the same commit (the path was
    // planned through the fountain): the Creature tab carries the message either way.
    await creatureTab();
    let text = await panelText();
    check(
      text.includes("si ferma") && text.includes("Il DM sta decidendo"),
      "Player panel does not say Livia stops and the DM decides: " + text,
    );
    check(!text.includes("Lastra"), "Trap name revealed before the DM runs it");
    const hp0 = (await stored()).actors.livia.hp;
    await dragToken("livia", 560, 500);
    check(Math.abs((await tokenOf("livia")).x - 400) < 0.5, "Livia moved on while held");
    await shot("03-player-stopped");
    await role("dm");
    await go("table");
    await creatureTab();
    text = await panelText();
    check(
      text.includes("Lastra a pressione") && text.includes("TS Destrezza CD 13 → 2d6 perforanti"),
      "DM preview missing: " + text,
    );
    check((await stored()).actors.livia.hp === hp0, "Something applied before the DM ran it");
    await regionPanel().scrollIntoViewIfNeeded();
    await shot("04-dm-preview");
    await regionPanel().getByRole("button", { name: "Esegui…" }).click();
    await dice("damage-save", [4, 5]);
    await submit();
    let event = await lastEvent();
    check(event.status === "awaiting-roll", "Run did not request the save: " + event.status);
    // DM Undo: the run is withdrawn; running again keeps the recorded damage faces.
    await undoButton().click();
    await page.waitForTimeout(250);
    check((await lastEvent()).status === "awaiting-dm", "Undo did not withdraw the run");
    await regionPanel().getByRole("button", { name: "Esegui…" }).click();
    check(
      (await dialog().innerText()).includes("Facce già registrate: 4, 5"),
      "Recorded damage faces not kept after Undo",
    );
    await submit();
    await role("player");
    await go("table");
    await creatureTab();
    text = await panelText();
    check(text.includes("Lastra a pressione"), "Public name not shown once run");
    await regionPanel().getByRole("button", { name: "Tira il tiro salvezza" }).click();
    await dialog().locator("[name=diceMode]").selectOption("physical");
    await dialog().locator("[name=face0]").fill("7");
    await submit();
    const rolls = await dialog().innerText();
    check(rolls.includes("9 danni") && rolls.includes("TS fallito"), "Outcome missing: " + rolls);
    await closeDialog();
    s = await stored();
    check(s.actors.livia.hp === hp0 - 9, "Damage not applied after the save: " + s.actors.livia.hp);
    event = s.ext.regions.events.at(-1);
    check(event.status === "applied" && event.result.damage === 9, "Event not applied");
    check(s.ext.regions.regions.find((r) => r.id === "region-plate").status.spent, "Not spent");
    check(
      (await page.locator('[data-regions-layer="player"] [data-region="region-plate"]').count()) ===
        1,
      "The fired trap is not marked for the player",
    );
    await shot("05-player-result");
    await page.reload();
    await page.locator("#battle-map").waitFor();
    s = await stored();
    check(
      s.actors.livia.hp === hp0 - 9 && s.ext.regions.events.at(-1).status === "applied",
      "Result not persisted after reload",
    );
    await creatureTab();
    check((await panelText()).includes("9 danni"), "Result missing from the panel after reload");
    await role("dm");
    await go("table");
    await tool("regions");
    await clickScene(425, 395);
    await creatureTab();
    await regionPanel().getByRole("button", { name: "Riarma" }).click();
    await page.waitForTimeout(200);
    check(!(await region("region-plate")).status.spent, "Riarma did not re-arm the plate");
    await shot("06-dm-rearmed");
    // Review F6 (Foundry Region Legend, FVT-082): keyboard only, the DM picks a region from
    // the list of the scene's regions, lands on «Configura…» and opens it with Enter.
    // With a region chosen the list is folded: its summary opens it from the keyboard.
    const legend = page.locator(".regions-legend");
    if (!(await legend.evaluate((d) => d.open))) {
      await legend.locator("summary").focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(100);
    }
    await page.locator('[data-regions-choose="region-embers"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    check(
      (await page.locator("[data-regions-selected]").getAttribute("data-regions-selected")) ===
        "region-embers",
      "Legend pick did not select the embers",
    );
    check(
      await page.evaluate(() => document.activeElement?.matches("[data-regions-config]")),
      "Focus did not move to «Configura…»",
    );
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    check(
      (await dialog().locator("#dialog-title").innerText()).includes("Brace ardenti"),
      "Enter on «Configura…» did not open the embers",
    );
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    passed.push(
      "(2) Livia stops on the plate's edge (x 400); the player reads «il DM sta decidendo» without the trap's name and cannot move on; the DM previews «TS Destrezza CD 13 → 2d6 perforanti», runs it with physical 4+5, Undo withdraws the run and running again keeps the faces 4, 5 (I-229); the player rolls a physical 7 (+2 = 9) in the request queue: 9 damage after the roll, spent plate marked on the player map; persisted after reload; the DM re-arms it; keyboard only, the DM picks «Brace ardenti» from the scene's region list, focus lands on «Configura…», Enter opens it (review F6)",
    );

    // ------------------------------------------------ (6) the DM cancels an event
    await tool("move");
    await selectToken("doran");
    await dragToken("doran", 440, 395);
    event = await lastEvent();
    check(event.actorId === "doran" && event.status === "awaiting-dm", "Doran did not trigger");
    const doranHp = (await stored()).actors.doran.hp;
    await creatureTab();
    await regionPanel().getByRole("button", { name: "Annulla evento" }).first().click();
    await dialog().locator("[name=reason]").fill("Doran la scavalca");
    await submit();
    s = await stored();
    event = s.ext.regions.events.at(-1);
    check(event.status === "cancelled" && event.reason === "Doran la scavalca", "Not cancelled");
    check(s.actors.doran.hp === doranHp, "A cancelled event applied damage");
    check(
      !s.ext.regions.regions.find((r) => r.id === "region-plate").status.spent,
      "Cancel spent the plate",
    );
    const doran = await tokenOf("doran");
    await dragToken("doran", doran.x - 60, doran.y + 40);
    check((await tokenOf("doran")).x < doran.x - 30, "Doran still held after the cancel");
    await shot("07-dm-cancelled");
    passed.push(
      "(6) Doran steps on the re-armed plate: the event waits for the DM with nothing applied; «Annulla evento» with a reason closes it, Doran moves freely again, the plate stays armed",
    );

    // ------------------------------------------------ (3) search, correction, disarm
    await role("player");
    await go("table");
    await selectToken("mira");
    await dragToken("mira", 360, 330);
    const mira = await tokenOf("mira");
    check(Math.hypot(mira.x - 360, mira.y - 330) < 2, "Mira did not move next to the plate");
    await creatureTab();
    // B62: one Search action (SRD 5.2.1 EN 187 / IT 212) — B46's «Cerca» in the Creature tab
    // rolls one Wisdom (Perception) check that this area compares with its hidden traps.
    await page.locator('[data-knowledge-search="mira"]').click();
    check((await dialog().innerText()).includes("Percezione"), "Search dialog not Perception");
    await dialog().locator('[name="diceMode"]').selectOption("physical");
    await dialog().locator('[name="face0"]').fill("3");
    await submit();
    check(/niente di sospetto/i.test(await toast()), "Low search found something");
    check(!(await region("region-plate")).status.discovered, "Discovered with 8");
    await regionPanel().getByRole("button", { name: "Correggi" }).first().click();
    await dialog().locator("[name=face0]").fill("12");
    await dialog().locator("[name=reason]").fill("Letto male il dado");
    await submit();
    check((await toast()).includes("Lastra a pressione"), "Corrected search did not find it");
    check((await region("region-plate")).status.discovered, "Not marked for the party");
    // Review F1: both rolls are in their commits' Log entries (chat, dice): the physical 3,
    // then the reasoned correction to 12.
    s = await stored();
    // B62: the physical 3 is the one Search roll (logged by B46); this area logs the reasoned
    // correction of its copy to 12.
    const logRolls = s.log.flatMap((e) => e.rolls ?? []);
    const searchRoll = logRolls
      .filter((r) => r.source === "knowledge" && JSON.stringify(r.label ?? "").includes("Cercare"))
      .at(-1);
    const regionRolls = logRolls.filter((r) => r.source === "regions");
    check(
      searchRoll?.values?.[0] === 3 &&
        regionRolls.at(-1)?.status === "corrected" &&
        regionRolls.at(-1).values[0] === 12 &&
        regionRolls.at(-1).correctionReason === "Letto male il dado",
      "Search rolls missing from the Log: " +
        JSON.stringify([searchRoll, ...regionRolls.slice(-1)]),
    );
    await openTablePanel(page, "log"); // B62: Chat › Registro
    await page.waitForTimeout(300);
    const cards = await page.locator(".chat-roll-card").allInnerTexts();
    check(
      cards.some((c) => c.includes("Cercare (trappole)") && c.includes("Letto male il dado")),
      "The corrected search roll is not in the Log and chat: " + cards.slice(-2).join(" / "),
    );
    await creatureTab();
    check(
      (await page.locator('[data-regions-layer="player"] [data-region="region-plate"]').count()) ===
        1 && (await page.locator(".regions-marks").textContent()).includes("individuata"),
      "Found trap not marked on the player's map",
    );
    await shot("08-player-found");
    await regionPanel().getByRole("button", { name: "Disinnesca «Lastra a pressione»" }).click();
    check((await dialog().innerText()).includes("Arnesi da scasso"), "Disarm dialog wrong");
    await dice("check", [13]);
    await submit();
    check((await toast()).includes("disinnescata"), "Disarm failed with 13 + 2");
    check((await region("region-plate")).status.disarmed, "Plate not disarmed");
    await shot("09-player-disarmed");
    passed.push(
      "(3) Mira searches (Search action, Perception +5): physical 3 → 8, nothing; «Correggi» with the reason «Letto male il dado» → 17 finds «Lastra a pressione», marked «individuata» on the party map; both rolls are in the Log and chat, the second as a correction with its reason (review F1); Thieves' Tools (Dex +2) physical 13 → 15 disarms it",
    );

    // ------------------------------------------------ (4) difficult terrain and embers
    await role("dm");
    // TV-45/PR-32: the Table's start dialog (Foundry Combat Tracker) chooses who fights and
    // takes the physical d20s; the bonus comes from the sheet (+2 each here).
    await go("table");
    await page.locator('[data-table="combat"]').click();
    await page.locator("[data-ct-start-dialog]").waitFor();
    const fighters = { livia: 15, "goblin-1": 12 };
    // Each change re-sorts the list: address the rows by id, not by position.
    const ids = await page
      .locator("[data-ct-start-include]")
      .evaluateAll((els) => els.map((el) => el.dataset.ctStartInclude));
    for (const id of ids) {
      const box = page.locator(`[data-ct-start-include="${id}"]`);
      if ((await box.isChecked()) !== Boolean(fighters[id])) await box.click();
    }
    for (const [id, natural] of Object.entries(fighters)) {
      const d20 = page.locator(`[data-ct-start-natural="${id}"]`);
      await d20.fill(String(natural));
      await d20.dispatchEvent("change");
    }
    await page.getByRole("button", { name: "Inizia combattimento", exact: true }).click();
    await page.locator("#battle-map").waitFor();
    s = await stored();
    check(s.combat.active && s.combat.order[0] === "livia", "Combat did not start with Livia");
    await role("player");
    await go("table");
    await selectToken("livia");
    livia = await tokenOf("livia");
    // P6 TV-10: the SRD grid default counts a diagonal cell as one (the larger of dx, dy).
    const plain = (Math.max(Math.abs(250 - livia.x), Math.abs(520 - livia.y)) / 50) * 1.5;
    const eventsBefore = (await slice()).events.length;
    await dragToken("livia", 250, 520);
    s = await stored();
    const moved = s.scenes[0].tokens.find((t) => t.actorId === "livia");
    check(
      Math.hypot(moved.x - 250, moved.y - 520) < 2,
      `Livia did not reach the embers: from ${livia.x},${livia.y} to ${moved.x},${moved.y}, movement left ${s.actors.livia.movement}`,
    );
    const spent = 9 - s.actors.livia.movement;
    check(spent > plain + 1, `Difficult terrain not counted: spent ${spent} m for ${plain} m`);
    check(
      s.ext.regions.events.length === eventsBefore,
      "Entering the embers must not be the trigger",
    );
    await page.locator('[data-table="end-turn"]').click();
    await page.waitForTimeout(250);
    await role("dm");
    await go("table");
    await page.locator('[data-table="end-turn"]').click();
    await page.waitForTimeout(300);
    event = await lastEvent();
    check(
      event.cause === "turn-start" && event.actorId === "livia" && event.status === "awaiting-dm",
      "Embers did not trigger at Livia's turn start: " + JSON.stringify(event),
    );
    const hpBurn = (await stored()).actors.livia.hp;
    await creatureTab();
    check((await panelText()).includes("1d4 fuoco"), "Embers preview missing");
    await regionPanel().getByRole("button", { name: "Esegui…" }).click();
    await dice("damage-burn", [3]);
    await submit();
    s = await stored();
    check(s.actors.livia.hp === hpBurn - 3, "1d4 fire not applied: " + s.actors.livia.hp);
    check(s.ext.regions.events.at(-1).status === "applied", "Embers event not applied");
    await shot("10-dm-embers");
    // End the combat (no pending consequence left).
    await page.locator('[data-table="combat"]').click();
    await submit();
    check(!(await stored()).combat.active, "Combat did not end");
    passed.push(
      `(4) Combat Livia/Sentinella from the Table start dialog; Livia walks into the embers: ${spent.toFixed(2)} m spent for ${plain.toFixed(2)} m (Difficult Terrain doubles inside), entering is not the trigger; at her next turn start the DM previews «1d4 fuoco» and runs it with a physical 3: HP ${hpBurn} → ${hpBurn - 3}`,
    );

    // ------------------------------------------------ (5) stairs Courtyard ↔ Crypt
    await role("player");
    await go("table");
    await selectToken("livia");
    await dragToken("livia", 900, 560);
    livia = await tokenOf("livia");
    check(Math.abs(livia.x - 860) < 0.5, "Livia did not stop on the stairs: " + livia.x);
    event = await lastEvent();
    check(event.status === "awaiting-mover" && !event.attemptId, "Stairs did not ask the mover");
    await creatureTab();
    text = await panelText();
    check(text.includes("Scale per la cripta"), "Stairs question missing: " + text);
    await regionPanel().getByRole("button", { name: "Resta qui" }).click();
    await page.waitForTimeout(200);
    check((await lastEvent()).status === "declined", "Stay here not recorded");
    await dragToken("livia", 800, 560);
    await dragToken("livia", 900, 560);
    await regionPanel().getByRole("button", { name: "Prendi il passaggio" }).click();
    await page.waitForTimeout(250);
    check(!(await tokenOf("livia")), "Livia is still in the courtyard");
    const inCrypt = await tokenOf("livia", CRYPT);
    check(inCrypt && inCrypt.x === 120 && inCrypt.y === 120, "Livia not at the crypt stairs");
    await role("dm");
    await go("table");
    await creatureTab();
    await regionPanel()
      .getByRole("button", { name: "Attiva «La cripta sotto il cortile» al Tavolo" })
      .click();
    await page.waitForTimeout(300);
    check((await stored()).activeSceneId === CRYPT, "Crypt not activated");
    check(
      (await page.locator(".table-topline h1").innerText()).includes("cripta"),
      "Table not showing the crypt",
    );
    await shot("11-dm-crypt");
    // Back up: out of the stairs and in again, confirm.
    await role("player");
    await go("table");
    await selectToken("livia");
    await dragToken("livia", 260, 260);
    await dragToken("livia", 120, 120);
    event = await lastEvent();
    check(event.status === "awaiting-mover" && event.sceneId === CRYPT, "Crypt stairs silent");
    await creatureTab();
    await regionPanel().getByRole("button", { name: "Prendi il passaggio" }).click();
    await page.waitForTimeout(250);
    const back = await tokenOf("livia", "old-watch");
    check(back && back.x === 900 && back.y === 560, "Livia did not come back up");
    await role("dm");
    await go("table");
    await creatureTab();
    await regionPanel()
      .getByRole("button", { name: "Attiva «Il cortile dell’osservatorio» al Tavolo" })
      .click();
    await page.waitForTimeout(300);
    check((await stored()).activeSceneId === "old-watch", "Courtyard not activated again");
    passed.push(
      "(5) Livia stops on «Scale per la cripta» (x 860), «Resta qui» declines, out and in asks again, «Prendi il passaggio» moves her token to the crypt stairs (120, 120); the DM activates the crypt from the event; back up through «Scale per il cortile» to (900, 560) and the courtyard is active again",
    );

    // ------------------------------------------------ Preparation: library and drawing
    await go("preparation?tab=regions");
    await page.locator("[data-regions-prep]").waitFor();
    await page.locator("[data-regions-scene]").selectOption(CRYPT);
    await page.waitForTimeout(200);
    await page
      .locator('[data-regions-library="trap-falling-net"]')
      .getByRole("button", { name: "Piazza in questa scena" })
      .click();
    check(
      (await dialog().locator("#dialog-title").innerText()).includes("Rete che cade"),
      "Placed trap configuration not opened",
    );
    await submit();
    s = await stored();
    check(
      s.ext.regions.regions.some((r) => r.sceneId === CRYPT && r.name === "Rete che cade"),
      "Library trap not placed in the crypt",
    );
    await page.getByRole("button", { name: "Disegna regione" }).click();
    await dragScene({ x: 600, y: 420 }, { x: 750, y: 540 }, page, "[data-regions-prep-map]");
    await d.locator("[name=name]").fill("Pozza di fango");
    await d.locator("[name=visibility]").selectOption("shared");
    await d.locator("[name=difficult]").check();
    await submit();
    s = await stored();
    const mud = s.ext.regions.regions.find((r) => r.name === "Pozza di fango");
    check(mud && mud.sceneId === CRYPT && mud.difficult, "Drawn prep region not saved");
    check(
      s.scenes
        .find((row) => row.id === CRYPT)
        .terrain.some((t) => t.regionId === mud.id && t.width === mud.shape.width),
      "Region difficult terrain not in the scene geometry",
    );
    check(await noOverflow(), "Overflow in Preparation at 1440");
    await shot("12-dm-preparation");
    await role("player");
    await go("preparation?tab=regions");
    check(
      (await page.locator("[data-regions-prep]").count()) === 0,
      "Players reach the region editor",
    );
    await role("dm");
    passed.push(
      "Preparation → «Regioni e trappole»: the crypt chosen, «Rete che cade» placed from the reusable traps and configured, «Pozza di fango» drawn by drag, visible and difficult (its terrain joins the crypt geometry); no overflow at 1440; players are refused",
    );
    await noAreaWarnings("desktop journey");

    // ------------------------------------------------ EN phone 390 (touch)
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    const phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    phone = await phoneContext.newPage();
    phone.on("pageerror", (error) => errors.push("phone: " + error.message));
    await phone.goto(base);
    await phone.evaluate(([k, v]) => localStorage.setItem(k, v), [key, snapshot]);
    await phone.reload();
    await phone.locator("#content").waitFor();
    await phone.getByRole("button", { name: "Preferenze", exact: true }).tap();
    await phone.locator("#dialog [name=lang]").selectOption("en");
    await phone.getByRole("button", { name: "Salva preferenze", exact: true }).tap();
    await role("player", phone);
    await go("table", phone);
    await phone.locator("#battle-map").waitFor();
    await dismissTip(phone, true);
    const phoneTab = phone.locator('.table-tabs [data-table-tab="creature"]');
    if ((await phoneTab.getAttribute("aria-selected")) !== "true") await phoneTab.tap();
    await regionPanel(phone).scrollIntoViewIfNeeded();
    text = await panelText(phone);
    // B62: the panel keeps its events; the one «Search» of the Creature tab searches traps.
    check(
      text.includes("Latest events") &&
        !text.includes("Search for traps") &&
        (await phone.locator("#table-sidebar-panel [data-knowledge-search]").innerText()) ===
          "Search",
      "Phone panel not English: " + text,
    );
    await phone.locator("#table-sidebar-panel [data-knowledge-search]").first().tap();
    check(
      (await dialog(phone).innerText()).includes("Wisdom (Perception)"),
      "Phone search dialog not English",
    );
    await submit(phone, true);
    check(/Found|Nothing suspicious/.test(await toast(phone)), "Phone search result missing");
    check(await noOverflow(phone), "Overflow on the phone (player)");
    const small = await regionPanel(phone)
      .locator("button")
      .evaluateAll(
        (list) =>
          list.filter((b) => b.getBoundingClientRect().height < 40 && b.offsetParent).length,
      );
    check(small === 0, "Region buttons under 40px on the phone");
    await shot("13-phone-player-en", phone);
    await role("dm", phone);
    await go("table", phone);
    await tool("regions", phone, true);
    const stairs = await at(900, 560, phone);
    await phone.touchscreen.tap(stairs.x, stairs.y);
    await phone.waitForTimeout(250);
    if ((await phoneTab.getAttribute("aria-selected")) !== "true") await phoneTab.tap();
    text = await panelText(phone);
    check(
      text.includes("Configure…") && text.includes("Scale per la cripta"),
      "Phone DM card: " + text,
    );
    check(await noOverflow(phone), "Overflow on the phone (DM)");
    await regionPanel(phone).scrollIntoViewIfNeeded();
    await shot("14-phone-dm-en", phone);
    await noAreaWarnings("phone journey", phone);
    passed.push(
      "EN phone 390 (touch): the player's Creature tab shows the one «Search» (B62) and «Latest events» in English, a tapped search rolls and reports, buttons ≥ 40px, no overflow; the DM taps the Regions tool from its group and taps the stairs: «Configure…» card in English, no overflow",
    );
    await phoneContext.close();
    await context.close();
    check(!errors.length, "Page errors: " + errors.join(" | "));
    return { passed, errors };
  } catch (error) {
    await page.screenshot({ path: dir + "failure.png", fullPage: true }).catch(() => {});
    if (phone)
      await phone.screenshot({ path: dir + "failure-phone.png", fullPage: true }).catch(() => {});
    throw Object.assign(error, {
      message: error.message + " | passed: " + passed.length + " | errors: " + errors.join(" | "),
    });
  }
}
