async (page) => {
  // Increment 10, journey (a): sheet conditions panel with real clicks and keyboard.
  // Poisoned from a named origin with a turn-end term, preview/apply, chip on sheet and
  // Table inspector, end one origin, Undo, two origins, Exhaustion stepper, Escape/cancel.
  const errors = [],
    passed = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/inc10-closure/";
  const check = (c, m) => {
    if (!c) throw Error(m);
  };
  const button = (name) => page.getByRole("button", { name, exact: true });
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const livia = async () => (await saved()).actors.livia;
  const ids = (a) => (a.conditions || []).map((c) => (typeof c === "string" ? c : c.id));
  const dialog = page.locator("#dialog");
  const field = (k) => page.locator("#dialog [data-conditions-field=" + k + "]");
  const closeDialog = () => page.locator("#dialog footer [data-close]").click();
  await page.goto("http://127.0.0.1:8879/#characters?id=livia");
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await button("Ripristina esempio").click();
  await button("Ripristina").click();
  await page.goto("http://127.0.0.1:8879/#characters?id=livia");
  const summary = page.locator("#content [data-conditions-summary=livia]");
  await summary.waitFor();
  check(
    (await summary.innerText()).includes("Nessuna condizione"),
    "fresh Livia is not condition-free",
  );
  // Add Poisoned with a declared origin and "end of Livia's next turn".
  await summary.locator("[data-conditions-entry=livia]").click();
  await dialog.getByRole("heading", { name: "Condizioni e stato", exact: true }).waitFor();
  await page.locator("[data-conditions-command=add]").click();
  await field("search").pressSequentially("Avvel");
  check(
    (await page.locator("[data-conditions-definition]").count()) === 1,
    "search did not narrow to one condition",
  );
  check(
    await field("search").evaluate((n) => n === document.activeElement),
    "search lost focus while typing",
  );
  await page.locator("[data-conditions-definition=poisoned]").click();
  const card = await dialog.innerText();
  check(
    card.includes("Svantaggio ai propri tiri per colpire") && card.includes("SRD 5.2.1"),
    "definition card lacks effects/SRD source",
  );
  await field("originLabel").fill("Lama avvelenata");
  await field("termKind").selectOption("turn");
  await field("termActor").selectOption("livia");
  await field("termPhase").selectOption("end");
  await field("termWhen").selectOption("next");
  const beforePreview = JSON.stringify(await saved());
  await page.locator("[data-conditions-preview]").click();
  check(
    /Non attiva → Attiva/.test(await dialog.innerText()) &&
      (await dialog.innerText()).includes("Lama avvelenata"),
    "preview lacks before/after rows",
  );
  check(JSON.stringify(await saved()) === beforePreview, "preview mutated state");
  await page.screenshot({ path: dir + "conditions-a-preview.png" });
  await page.locator("[data-conditions-apply]").click();
  let a = await livia();
  const first = a.conditions.find((c) => c.id === "poisoned");
  check(
    first &&
      first.origin.label === "Lama avvelenata" &&
      first.term.kind === "turn" &&
      first.term.phase === "end" &&
      first.term.actorId === "livia",
    "Poisoned origin/term not stored: " + JSON.stringify(first),
  );
  check(
    (await dialog.innerText()).includes("Fine del prossimo turno di Livia"),
    "term not readable in active list",
  );
  passed.push(
    'Poisoned from "Lama avvelenata", end of Livia next turn: preview without mutation, Apply once',
  );
  await closeDialog();
  check(
    (await summary.locator("[data-conditions-chip=poisoned]").count()) === 1,
    "sheet chip missing",
  );
  // Same creature on the Table inspector.
  await page.goto("http://127.0.0.1:8879/#table");
  const inspector = page.locator("#content [data-conditions-summary=livia]");
  await inspector.waitFor();
  check(
    (await inspector.locator("[data-conditions-chip=poisoned]").count()) === 1,
    "Table inspector chip missing",
  );
  await page.screenshot({ path: dir + "conditions-a-table-chip.png" });
  passed.push("chip Avvelenato on sheet summary and Table inspector from the same state");
  // End the origin from the Table, then Undo restores it.
  await inspector.locator("[data-conditions-entry=livia]").click();
  await page.locator("[data-conditions-end]").first().click();
  await field("reason").fill("Antidoto bevuto");
  await page.locator("[data-conditions-preview]").click();
  await page.locator("[data-conditions-apply]").click();
  check(!ids(await livia()).includes("poisoned"), "Termina did not end Poisoned");
  check(
    (await dialog.innerText()).includes("Nessuna condizione attiva"),
    "panel still lists Poisoned",
  );
  await page.locator("[data-conditions-undo]").click();
  a = await livia();
  check(
    ids(a).filter((x) => x === "poisoned").length === 1 &&
      a.conditions.find((c) => c.id === "poisoned").origin.label === "Lama avvelenata",
    "Undo did not restore the same origin",
  );
  await closeDialog();
  check(
    (await inspector.locator("[data-conditions-chip=poisoned]").count()) === 1,
    "chip not back after Undo",
  );
  passed.push("Termina with reason ends the origin; Undo restores the same origin and chip");
  // Second origin of the same condition, then end only one.
  await inspector.locator("[data-conditions-entry=livia]").click();
  await page.locator("[data-conditions-command=add]").click();
  await field("search").fill("Poisoned");
  await page.locator("[data-conditions-definition=poisoned]").click();
  await field("originLabel").fill("Morso di ragno");
  await page.locator("[data-conditions-preview]").click();
  await page.locator("[data-conditions-apply]").click();
  a = await livia();
  check(ids(a).filter((x) => x === "poisoned").length === 2, "second origin not distinct");
  check(
    (await dialog.innerText()).includes("resta attiva per le altre"),
    "multi-origin note missing",
  );
  await closeDialog();
  check(
    (await inspector.locator("[data-conditions-chip=poisoned]").innerText()).includes("×2"),
    "grouped chip lacks ×2",
  );
  await inspector.locator("[data-conditions-entry=livia]").click();
  const panelText = await dialog.innerText();
  check(
    (panelText.match(/Svantaggio ai propri attacchi/g) || []).length === 1,
    "penalty duplicated by two origins",
  );
  await page.screenshot({ path: dir + "conditions-a-two-origins.png" });
  const spider = page.locator("[data-conditions-instance]").filter({ hasText: "Morso di ragno" });
  await spider.locator("[data-conditions-end]").click();
  await field("reason").fill("Veleno del ragno smaltito");
  await page.locator("[data-conditions-preview]").click();
  await page.locator("[data-conditions-apply]").click();
  a = await livia();
  const left = a.conditions.filter((c) => c.id === "poisoned");
  check(
    left.length === 1 && left[0].origin.label === "Lama avvelenata",
    "ended the wrong origin: " + JSON.stringify(left.map((c) => c.origin)),
  );
  await closeDialog();
  check(
    !(await inspector.locator("[data-conditions-chip=poisoned]").innerText()).includes("×2"),
    "chip still ×2",
  );
  passed.push(
    'two origins grouped ×2 with one penalty; ending "Morso di ragno" keeps "Lama avvelenata"',
  );
  // Exhaustion stepper operated with the keyboard.
  await inspector.locator("[data-conditions-entry=livia]").click();
  await page.locator("[data-conditions-command=exhaustion]").click();
  const plus = page.locator('[data-conditions-step="1"]');
  await plus.focus();
  await page.keyboard.press("Enter");
  await page.locator('[data-conditions-step="1"]').focus();
  await page.keyboard.press("Space");
  check(
    (await field("level").inputValue()) === "2",
    "stepper did not reach level 2: " + (await field("level").inputValue()),
  );
  const effect = await page.locator(".conditions-effect").innerText();
  check(/4/.test(effect) && /3 m/.test(effect), "level 2 effect text wrong: " + effect);
  await field("reason").fill("Marcia forzata");
  await page.locator("[data-conditions-preview]").click();
  await page.locator("[data-conditions-apply]").click();
  a = await livia();
  check(a.exhaustion === 2, "exhaustion not 2: " + a.exhaustion);
  const vit = await dialog.innerText();
  check(/Velocità\s*\n?\s*6 m/.test(vit), "effective speed not 6 m with Exhaustion 2");
  await closeDialog();
  check(
    (await inspector.locator("[data-conditions-chip=exhaustion]").innerText()).includes("2"),
    "Exhaustion chip missing level",
  );
  await page.screenshot({ path: dir + "conditions-a-exhaustion.png" });
  passed.push(
    'Exhaustion stepper by keyboard: level 2, −4 d20 and −3 m shown, speed 9 → 6 m, chip "Indebolimento 2"',
  );
  // Escape and Cancel change nothing, and reopening is clean.
  const stable = JSON.stringify(await saved());
  await inspector.locator("[data-conditions-entry=livia]").click();
  await page.locator("[data-conditions-command=add]").click();
  await field("search").fill("Prono");
  await page.locator("[data-conditions-definition=prone]").click();
  await field("originLabel").fill("Bozza da scartare");
  await page.locator("[data-conditions-preview]").click();
  await page.keyboard.press("Escape");
  check(!(await dialog.evaluate((d) => d.open)), "Escape did not close the dialog");
  check(JSON.stringify(await saved()) === stable, "Escape changed state");
  await inspector.locator("[data-conditions-entry=livia]").click();
  check(
    !(await dialog.innerText()).includes("Bozza da scartare") &&
      (await page.locator("[data-conditions-apply]").count()) === 0,
    "reopened panel kept the discarded draft",
  );
  await page.locator("[data-conditions-command=add]").click();
  await page.locator("[data-conditions-definition=prone]").click();
  await field("originLabel").fill("Altra bozza");
  await page.locator("[data-conditions-cancel]").first().click();
  check(JSON.stringify(await saved()) === stable, "Cancel changed state");
  check(
    (await page.locator("[data-conditions-apply]").count()) === 0,
    "Cancel left an Apply control",
  );
  await closeDialog();
  passed.push(
    "Escape after preview and in-panel Cancel leave state identical; reopening shows no stale draft",
  );
  // Reload keeps the resulting state on the sheet.
  await page.reload();
  await page.goto("http://127.0.0.1:8879/#characters?id=livia");
  await summary.waitFor();
  check(
    (await summary.locator("[data-conditions-chip=poisoned]").count()) === 1 &&
      (await summary.locator("[data-conditions-chip=exhaustion]").innerText()).includes("2"),
    "reload lost sheet chips",
  );
  await page.screenshot({ path: dir + "conditions-a-sheet-reload.png" });
  passed.push("reload: sheet summary keeps Avvelenato and Indebolimento 2");
  // Journey (b), Table: Prone targets at range and adjacent, Livia crawling and Stand up.
  const findings = [];
  const role = (r) =>
    page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption(r);
  const map = (x, y) =>
    page.evaluate(
      ([x, y]) => {
        const svg = document.querySelector("#battle-map");
        const pt = svg.createSVGPoint();
        pt.x = x;
        pt.y = y;
        const c = pt.matrixTransform(svg.getScreenCTM());
        return { x: c.x, y: c.y };
      },
      [x, y],
    );
  const reasons = () =>
    page
      .locator("#content .combat-conditions")
      .allInnerTexts()
      .then((x) => x.join(" | "));
  const addCondition = async (actorId, search, id, origin) => {
    await page.locator("#content [data-conditions-entry=" + actorId + "]").click();
    await page.locator("[data-conditions-command=add]").click();
    await field("search").fill(search);
    await page.locator("[data-conditions-definition=" + id + "]").click();
    await field("originLabel").fill(origin);
    await page.locator("[data-conditions-preview]").click();
    await page.locator("[data-conditions-apply]").click();
    await closeDialog();
  };
  await page.goto("http://127.0.0.1:8879/#table");
  await button("Ripristina esempio").click();
  await button("Ripristina").click();
  await role("dm");
  // Exploration: the DM moves the Sentinella next to Livia. Refreshed by the hand-off writer
  // (29/09/2026): P6 TV-01 moves a token by dragging it (Foundry, Roll20), not select + click.
  const sentinel = await page.locator("#battle-map [data-actor=goblin-1]").boundingBox();
  let p = await map(285, 380);
  await page.mouse.move(sentinel.x + sentinel.width / 2, sentinel.y + sentinel.height / 2);
  await page.mouse.down();
  await page.mouse.move(p.x, p.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  await button("Avvia combattimento").click();
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
  await button("Inizia combattimento").click();
  await page.locator("#battle-map").waitFor();
  let data = await saved();
  const gob = data.scenes[0].tokens.find((t) => t.actorId === "goblin-1"),
    liv = data.scenes[0].tokens.find((t) => t.actorId === "livia");
  check(
    (Math.hypot(gob.x - liv.x, gob.y - liv.y) / 50) * 1.5 <= 1.5,
    "Sentinella not adjacent to Livia",
  );
  for (const id of ["goblin-1", "goblin-2"]) {
    await page.locator("[data-select=" + id + "]").click();
    await addCondition(id, "Prono", "prone", "Spinta nel fango");
  }
  data = await saved();
  check(
    ids(data.actors["goblin-1"]).includes("prone") &&
      ids(data.actors["goblin-2"]).includes("prone"),
    "DM Prone not applied to both sentinels",
  );
  await role("player");
  await page.locator("[data-select=livia]").click();
  await page.locator("[data-combat-action=quarterstaff]").click();
  await page.locator("#battle-map [data-actor=goblin-1]").hover();
  const melee = await reasons();
  check(
    melee.includes("Vantaggio: Prono (bersaglio)") && !melee.includes("Svantaggio"),
    "adjacent melee vs Prone lacks Advantage reason: " + melee,
  );
  check(
    (await page.locator("#content").innerText()).includes("Tiro con vantaggio"),
    "adjacent melee roll not stated as advantage",
  );
  await page.screenshot({ path: dir + "conditions-b-prone-adjacent.png" });
  await page.locator("[data-combat-action=fire-bolt]").click();
  await page.locator("#battle-map [data-actor=goblin-2]").hover();
  const ranged = await reasons();
  check(
    ranged.includes("Svantaggio: Prono (bersaglio)") && !ranged.includes("Vantaggio:"),
    "ranged vs distant Prone lacks Disadvantage reason: " + ranged,
  );
  await page.screenshot({ path: dir + "conditions-b-prone-range.png" });
  await page.locator("#battle-map [data-actor=goblin-1]").hover();
  const closeRanged = await reasons();
  // SRD 5.2.1 "Ranged Attacks in Close Combat" (EN 15 / IT 17): a ranged attack within 5 ft
  // of a seeing, non-Incapacitated enemy has Disadvantage, cancelling the Prone Advantage.
  check(
    closeRanged.includes("Svantaggio: Attacco a distanza con un nemico entro 1,5 m che ti vede") &&
      closeRanged.includes("SRD 5.2.1 p. 17") &&
      closeRanged.includes("Vantaggio: Prono (bersaglio)"),
    "close-combat reason missing: " + closeRanged,
  );
  check(
    (await page.locator("#content").innerText()).includes(
      "Tiro normale: vantaggio e svantaggio si annullano",
    ),
    "net normal roll not stated",
  );
  passed.push(
    'Fire Bolt at the adjacent Prone Sentinella: "Svantaggio: Attacco a distanza con un nemico entro 1,5 m" (SRD p. 17) + "Vantaggio: Prono" → "Tiro normale: si annullano"',
  );
  if (JSON.stringify(await saved()) !== JSON.stringify(data))
    throw Error("attack previews mutated state");
  passed.push(
    'Prone targets: adjacent quarterstaff "Vantaggio: Prono (bersaglio)", Fire Bolt at 14.8 m "Svantaggio: Prono (bersaglio)", previews do not mutate',
  );
  await page.locator("#battle-map").focus();
  await page.keyboard.press("Escape");
  // Livia becomes Prone; her own attack is at Disadvantage; the map drag crawls.
  await addCondition("livia", "Prono", "prone", "Inciampata sul selciato");
  await page.locator("[data-combat-action=quarterstaff]").click();
  await page.locator("#battle-map [data-actor=goblin-1]").hover();
  const ownProne = await reasons();
  check(
    ownProne.includes("Svantaggio: Prono") && ownProne.includes("Vantaggio: Prono (bersaglio)"),
    "Prone attacker reasons missing: " + ownProne,
  );
  await page.locator("#battle-map").focus();
  await page.keyboard.press("Escape");
  const stand = page.locator("[data-table=stand]");
  check((await stand.innerText()).includes("4,5 m"), "Stand up cost not on the action bar");
  const token = page.locator("#battle-map [data-actor=livia]");
  const box = await token.locator("circle").first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  p = await map(liv.x, liv.y + 50);
  await page.mouse.move(p.x, p.y, { steps: 8 });
  const crawl = await page.locator("#map-message").innerText();
  check(
    /Distanza: 1,5 m · Costo movimento: 3 m/.test(crawl) && crawl.includes("strisci"),
    "crawling cost not shown with Italian decimals during drag: " + crawl,
  );
  await page.screenshot({ path: dir + "conditions-b-crawl-drag.png" });
  await page.mouse.up();
  data = await saved();
  // B61: the map is drawn at another scale beside the sidebar; a pointer position carries
  // a float residue (5.999998), so the cost is compared to the micrometre.
  check(
    Math.abs(data.actors.livia.movement - 6) < 1e-4 &&
      Math.abs(data.actors.livia.movementSpent - 3) < 1e-4,
    "crawl 1.5 m did not cost 3 m: " + data.actors.livia.movement,
  );
  passed.push(
    'Prone Livia: own attack "Svantaggio: Prono"; mouse drag shows "Distanza: 1,5 m · Costo movimento: 3 m" and spends 3 m (9 → 6 m)',
  );
  const actionBefore = data.actors.livia.action;
  await stand.click();
  data = await saved();
  check(
    !ids(data.actors.livia).includes("prone") &&
      Math.abs(data.actors.livia.movement - 1.5) < 1e-4 &&
      data.actors.livia.action === actionBefore &&
      (data.actors.livia.dashCount ?? 0) === 0,
    "Stand up did not spend exactly half speed: " + data.actors.livia.movement,
  );
  check(
    (await page.locator("[data-table=stand]").count()) === 0,
    "Stand up still offered after standing",
  );
  await page.screenshot({ path: dir + "conditions-b-stood.png" });
  passed.push(
    "Rialzati spends half Speed (4.5 m) from the remaining 6 m → 1.5 m; action and Dash unchanged; button disappears",
  );
  check(errors.length === 0, "Page errors: " + errors.join("; "));
  return { passed, findings, errors };
}
