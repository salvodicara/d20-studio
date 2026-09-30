async (rootPage) => {
  // B53 — personal commands and quick bar, in the one app with real clicks, keys and touch.
  // Group 1 (IT 1440, player): the selected creature's bar (Livia, Mira, the Sentinel as an
  // observer); a sheet action slot opens the Table's own action preview. Group 2: custom
  // action "Stretta folgorante" created from Livia's sheet (SRD template, live preview) and
  // "Add to the quick bar". Group 3: saved roll "Arcano" validated live, digital roll (log
  // card), physical roll, reasoned correction, Undo withdraws it. Group 4 (DM, Doran):
  // "Attacco con spada" dragged from the tray and added from the menu by keyboard; rename,
  // colour, right click, mouse reorder, arrows and Shift+F10; attack + damage run. Group 5
  // (combat): sequence with per-step results and a blocked second Action; Undo; physical
  // sequence stopped with a reason. Group 6: page shared with Doran as a copy; the DM's
  // bell, the copy on Doran's sheet, later edits do not travel; the DM never sees the
  // player's bar. Group 7: pages, keys 1–0, Alt+1–5, ‹ ›. Group 8: reload, history.
  // Group 9: EN phone 390 with touch (tap runs, long press edits, touch drag reorders).
  // Synthetic demo data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B53/";
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
  const qb = async (p = page) => (await stored(p)).ext.quickbar;
  const rolls = async (p = page) => (await stored(p)).ext["quickbar-rolls"].rolls;
  const bar = async (role, actorId, p = page) => (await qb(p)).bars[role]?.[actorId];
  const slot = (index, p = page) => p.locator(`.qb-slot[data-qb-index="${index}"]`);
  const dialog = (p = page) => p.locator("#dialog[open]");
  const submitDialog = async (p = page, tap = false) => {
    const button = p.locator('#dialog[open] button[type="submit"]');
    await (tap ? button.tap() : button.click());
    await p.waitForFunction(() => !document.querySelector("#dialog")?.open);
  };
  const shot = (name, p = page) => p.screenshot({ path: dir + name });
  const quietTips = async (p = page) => {
    for (const name of [/Non mostrare suggerimenti|Stop showing tips/, /^(Ho capito|Got it)$/]) {
      const b = p.getByRole("button", { name });
      if (await b.count()) await b.first().click();
    }
  };
  // B62: the quick bar is the hotbar's second page (Foundry hotbar pages FVT-194); open it
  // as a player would, once per identity (the page is remembered with the sidebar).
  const showQuickbar = async (p = page) => {
    await p.locator("[data-qb]").waitFor({ state: "attached" });
    const tab = p.locator('[data-hotbar-page="quickbar"]');
    if ((await tab.count()) && (await tab.getAttribute("aria-selected")) !== "true")
      await tab.click();
    await p.locator("[data-qb]").waitFor();
  };
  // B62: a slot on the quick bar page runs the Table's own action preview; the pressed
  // action sits on the hotbar's Actions page (hidden while the quick bar page is open), so
  // the preview is read from the bar's state and the pressed action in the page.
  const firePreview = async (p = page) => {
    await p
      .locator('[data-combat-action="fire-bolt"][aria-pressed="true"]')
      .waitFor({ state: "attached" });
    await p.locator(".table-hotbar.has-preview").waitFor();
  };
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await quietTips(p);
    if (await p.locator('[data-hotbar-page="quickbar"]').count()) await showQuickbar(p);
  };
  const select = async (actorId, p = page) => {
    await p.locator(`#battle-map [data-actor="${actorId}"]`).click();
    await p.waitForFunction(
      (id) => document.querySelector("[data-qb]")?.dataset.qbActor === id,
      actorId,
    );
  };
  // The B56 dice cover the page while on screen: let them go (Esc skips, then closes).
  const settleDice = async (p = page) => {
    const layer = p.locator("[data-dice3d-layer]:not([hidden])");
    await layer.waitFor({ timeout: 800 }).catch(() => {});
    for (let i = 0; i < 8 && (await layer.count()); i++) {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(80);
    }
    await layer.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const smallTargets = (p, scope) =>
    p.locator(`${scope} button, ${scope} select, ${scope} input`).evaluateAll((nodes) =>
      nodes
        .filter((n) => n.offsetParent && !["radio", "checkbox", "hidden"].includes(n.type))
        .map((n) => [
          (n.getAttribute("aria-label") || n.textContent || n.name || "").trim().slice(0, 30),
          Math.round(n.getBoundingClientRect().height),
          Math.round(n.getBoundingClientRect().width),
        ])
        .filter(([, h, w]) => h < 40 || w < 40),
    );
  const drag = async (from, to, p = page) => {
    const a = await from.boundingBox();
    const b = await to.boundingBox();
    await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await p.mouse.down();
    await p.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 8, { steps: 3 });
    await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
    await p.mouse.up();
  };

  // ------------------------------------------------ group 1: the selected creature's bar
  await page.goto(base + "#table");
  await page.evaluate((k) => {
    localStorage.removeItem(k);
    localStorage.removeItem("d20-studio-quickbar");
    localStorage.removeItem("d20-studio-table-sidebar");
  }, key);
  await page.reload();
  await showQuickbar();
  await quietTips();
  await role("player");
  check(
    (await page.locator("[data-qb]").getAttribute("aria-label")) === "Barra rapida di Livia",
    "Livia's bar",
  );
  check((await slot(0).getAttribute("aria-label")).startsWith("1: Dardo di fuoco"), "slot 1");
  check((await page.locator(".qb-slot").count()) === 10, "ten slots 1–0");
  check((await slot(9).getAttribute("aria-keyshortcuts")) === "0", "key 0");
  await shot("b53-01-bar-livia-it.png");
  await select("mira");
  check((await slot(0).innerText()).includes("Percezione"), "Mira's bar");
  await page.locator('#battle-map [data-actor="goblin-1"]').click();
  await page.locator(".qb-observer").waitFor();
  check(
    (await page.locator(".qb-observer").innerText()).includes(
      "Sentinella non è sotto il tuo controllo",
    ),
    "observer note",
  );
  await select("livia");
  // A sheet action slot runs the Table's own action preview (Roll20 token action).
  await slot(0).click();
  await firePreview();
  await page.keyboard.press("Escape");
  passed.push(
    "(4) Selected creature's bar: Livia (Dardo di fuoco, 10 slots, keys 1–0), Mira (Percezione), Sentinel as observer note; a sheet-action slot opens the Table's own Fire Bolt preview",
  );

  // ------------------------------------------------ group 2: custom action from the sheet
  // Table → pen → "Sheet custom actions": two clicks to the sheet's Actions tab.
  await page.locator("[data-qb-edit]").click();
  await page.locator("[data-qb-custom-sheet]").click();
  await page.locator("[data-qb-custom]").waitFor();
  await page.locator("[data-qb-custom-new]").click();
  await dialog().waitFor();
  await page.locator('#dialog [name="template"]').selectOption("srd2024:spell:shocking-grasp");
  const preview = await page.locator("#dialog [data-qb-custom-preview]").innerText();
  check(preview.includes("+5 per colpire · 1d8 fulmine"), "live preview: " + preview);
  check(
    (await page.locator('#dialog [name="name"]').inputValue()) === "Stretta folgorante",
    "template name",
  );
  await shot("b53-02-custom-action-form-it.png");
  await submitDialog();
  const livia = page.locator("[data-qb-custom-row]").first();
  check((await livia.innerText()).includes("SRD 5.2.1: Stretta folgorante"), "custom row");
  const grasp = (await qb()).customActions.livia[0];
  check(grasp.attack.ability === "int" && grasp.damage.type === "lightning", "stored action");
  await page.locator(`[data-qb-custom-bar="${grasp.id}"]`).click();
  check(
    (await bar("player", "livia")).pages[0].slots[3]?.ref.customId === grasp.id,
    "added to slot 4",
  );
  await shot("b53-02b-custom-action-sheet-it.png");
  passed.push(
    "(7) Custom action from the sheet: Stretta folgorante from the SRD template, live preview +5 / 1d8 lightning, row with SRD source, 'Add to the quick bar' puts it in slot 4",
  );

  // ------------------------------------------------ group 3: saved roll, physical, correction
  await page.locator('[data-character-action="table"]').first().click();
  await showQuickbar();
  await page.locator("[data-qb-edit-done]").click();
  await slot(4).click();
  await dialog().waitFor();
  await page.locator('#dialog input[name=item][value="new:roll"]').check();
  await page.locator("#dialog [data-qb-roll-name]").fill("Arcano");
  await page.locator("#dialog [data-qb-formula]").fill("1d20+");
  check(
    (await page.locator("#dialog [data-qb-formula-status]").innerText()).includes("incompleta"),
    "live invalid",
  );
  await page.locator("#dialog [data-qb-formula]").fill("1d20+5");
  check(
    (await page.locator("#dialog [data-qb-formula-status]").innerText()).startsWith("Valida"),
    "live valid",
  );
  await shot("b53-03a-saved-roll-dialog-it.png");
  await submitDialog();
  check((await slot(4).getAttribute("aria-label")).startsWith("5: Arcano"), "Arcano in 5");
  await slot(4).click();
  await settleDice();
  let r = (await rolls()).at(-1);
  check(r.mode === "digital" && r.total === r.values[0] + 5, "digital Arcano");
  let entry = (await stored()).log.at(-1);
  check(entry.rolls[0]?.source === "quickbar" && entry.label.includes("Arcano"), "log card");
  await page.locator("[data-qb-dice]").selectOption("physical");
  await slot(4).click();
  await dialog().waitFor();
  await page.locator('#dialog [name="face0"]').fill("14");
  await submitDialog();
  r = (await rolls()).at(-1);
  check(r.mode === "physical" && r.total === 19, "physical 14 + 5");
  await page.locator(`[data-qb-correct="${r.id}"]`).click();
  await page.locator('#dialog [name="face0"]').fill("11");
  await page.locator("#dialog [data-qb-correct-reason]").fill("Letto male il dado");
  await submitDialog();
  r = (await rolls()).at(-1);
  check(
    r.status === "corrected" && r.total === 16 && r.corrections[0].values[0] === 14,
    "correction",
  );
  check(
    (await page.locator("[data-qb-run]").innerText()).includes("corretto: Letto male il dado"),
    "correction shown",
  );
  await shot("b53-03-saved-roll-physical-correction-it.png");
  // Undo withdraws the roll (its faces stay in the history).
  await page.locator('[data-table="undo"]').click();
  const live = (await qb()).live;
  check(!live.includes(r.id), "Undo withdrew the physical roll");
  await page.locator("[data-qb-dice]").selectOption("digital");
  passed.push(
    "(2) Saved roll Arcano: live refusal of '1d20+', valid '1d20+5', digital roll with log card, physical face 14 = 19, reasoned correction to 11 = 16 (previous face kept), Undo withdraws it",
  );

  // ------------------------------------------------ group 4: "Attacco con spada" (DM, Doran)
  await role("dm");
  await select("doran");
  await page.locator("[data-qb-edit]").click();
  await page.locator("[data-qb-tray]").waitFor();
  const chip = page.locator('[data-qb-item="custom:qb-doran-longsword"]');
  const a = await chip.boundingBox();
  const b = await slot(2).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + 40, a.y + 20, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
  await shot("b53-04-tray-drag-it.png");
  await page.mouse.up();
  await page.waitForFunction(() =>
    document
      .querySelector('.qb-slot[data-qb-index="2"]')
      ?.getAttribute("aria-label")
      ?.includes("Attacco con spada"),
  );
  await page.locator("[data-qb-edit-done]").click();
  // Menu and keyboard: "+" by Enter, radio already on the sword, Tab to Add, Enter.
  await page.locator("[data-qb-add]").focus();
  await page.keyboard.press("Enter");
  await dialog().waitFor();
  check(
    await page.locator('#dialog input[value="custom:qb-doran-longsword"]').isChecked(),
    "sword preselected",
  );
  await page.locator('#dialog button[type="submit"]').focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => !document.querySelector("#dialog")?.open);
  check(
    (await slot(3).getAttribute("aria-label")).includes("Attacco con spada"),
    "keyboard add in slot 4",
  );
  // Remove the duplicate from its editor (Shift+click, Roll20).
  await slot(3).click({ modifiers: ["Shift"] });
  await page.locator("#dialog [data-qb-remove]").click();
  check(!(await bar("dm", "doran")).pages[0].slots[3], "duplicate removed");
  // Rename and colour (Shift+click), then right click opens the same editor.
  await slot(2).click({ modifiers: ["Shift"] });
  await page.locator("#dialog [data-qb-edit-label]").fill("Spadata");
  await page.locator('#dialog input[name="color"][value="red"]').check();
  await submitDialog();
  check(
    (await slot(2).getAttribute("class")).includes("qb-c-red") &&
      (await slot(2).innerText()).includes("Spadata"),
    "renamed red",
  );
  await slot(2).click({ button: "right" });
  await dialog().waitFor();
  check((await dialog().innerText()).includes("Modifica casella 3"), "right click edits");
  await page.keyboard.press("Escape");
  // Mouse reorder: slot 3 onto slot 1 swaps them.
  await drag(slot(2), slot(0));
  await page.waitForFunction(() =>
    document.querySelector('.qb-slot[data-qb-index="0"]')?.innerText.includes("Spadata"),
  );
  check((await slot(2).innerText()).includes("TS Cos"), "swapped: TS Cos in slot 3");
  // Keyboard: arrows move between slots, Shift+F10 edits the focused one.
  await slot(0).focus();
  await page.keyboard.press("ArrowRight");
  check(
    await page.evaluate(() => document.activeElement?.dataset.qbIndex === "1"),
    "ArrowRight moves focus",
  );
  await page.keyboard.press("Shift+F10");
  await dialog().waitFor();
  check((await dialog().innerText()).includes("Modifica casella 2"), "Shift+F10 edits");
  await page.keyboard.press("Escape");
  // Run it: attack roll then damage, per-step results.
  await slot(0).click();
  await settleDice();
  const run = page.locator("[data-qb-run]");
  await run.waitFor();
  const runText = await run.innerText();
  check(
    runText.includes("Attacco con spada · per colpire") &&
      runText.includes("Attacco con spada · danni"),
    "attack + damage",
  );
  const sword = (await rolls()).slice(-2);
  check(sword[0].rollKind === "attack" && sword[1].rollKind === "damage", "two rolls");
  check(sword[0].total === sword[0].natural + 2, "Doran +2 to hit");
  await shot("b53-05-attack-run-it.png");
  await page.locator("[data-qb-run-close]").click();
  passed.push(
    "(1) 'Attacco con spada' dragged from the tray onto slot 3 (mouse) and added from '+' with the keyboard; duplicate removed; renamed 'Spadata', red; right click and Shift+F10 open the editor; mouse drag swaps it into slot 1; arrows move focus; run = attack +2 then damage",
  );

  // ------------------------------------------------ group 5: sequences in combat
  await page.locator("[data-table=combat]").click();
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
  let s = await stored();
  check(s.combat.active && s.combat.order[s.combat.turn] === "livia", "combat on Livia's turn");
  await role("player");
  await select("livia");
  await slot(5).click();
  await dialog().waitFor();
  await page.locator('#dialog input[name=item][value="new:sequence"]').check();
  await page.locator("#dialog [data-qb-seq-name]").fill("Doppia stretta");
  await page.locator('#dialog [name="step0"]').selectOption(`custom:${grasp.id}`);
  await page.locator('#dialog [name="step1"]').selectOption(`custom:${grasp.id}`);
  await page.locator('#dialog input[name="color"][value="blue"]').check();
  await submitDialog();
  await slot(5).click();
  await settleDice();
  await run.waitFor();
  check((await run.getAttribute("data-qb-run-status")) === "blocked", "blocked run");
  const steps = await page
    .locator("[data-qb-run] .qb-step")
    .evaluateAll((n) => n.map((x) => x.className));
  check(
    JSON.stringify(steps) ===
      JSON.stringify([
        "qb-step is-done",
        "qb-step is-done",
        "qb-step is-blocked",
        "qb-step is-skipped",
      ]),
    "per-step results: " + steps,
  );
  check((await run.innerText()).includes("Azione già usata in questo turno"), "reason shown");
  s = await stored();
  check(s.actors.livia.action === false, "the first Stretta spent the Action");
  check(s.log.at(-1).label.includes("fermata: Azione già usata"), "log reason");
  await shot("b53-06-sequence-blocked-it.png");
  await page.locator('[data-table="undo"]').click();
  check((await stored()).actors.livia.action === true, "Undo gives the Action back");
  // Physical sequence stopped with a reason.
  await page.locator("[data-qb-dice]").selectOption("physical");
  await slot(6).click();
  await page.locator('#dialog input[name=item][value="new:sequence"]').check();
  await page.locator("#dialog [data-qb-seq-name]").fill("Agguato");
  await page.locator('#dialog [name="step0"]').selectOption("check:dex:check");
  await page.locator('#dialog [name="step1"]').selectOption("check:wis:save");
  await submitDialog();
  await slot(6).click();
  await dialog().waitFor();
  check((await dialog().innerText()).includes("Passo 1 di 2"), "physical step 1");
  await page.locator('#dialog [name="face0"]').fill("13");
  await submitDialog();
  await page.locator("[data-qb-run-next]").waitFor();
  await page.locator("[data-qb-run-stop]").click();
  await page.locator("#dialog [data-qb-stop-reason]").fill("Il goblin è fuggito");
  await submitDialog();
  check((await run.getAttribute("data-qb-run-status")) === "stopped", "stopped run");
  check(
    (await run.innerText()).includes("Motivo dell'interruzione: Il goblin è fuggito"),
    "reason",
  );
  check(
    (await stored()).log.at(-1).label.includes("sequenza interrotta — Il goblin è fuggito"),
    "log stop",
  );
  await shot("b53-07-sequence-stopped-it.png");
  await page.locator("[data-qb-run-close]").click();
  await page.locator("[data-qb-dice]").selectOption("digital");
  passed.push(
    "(3) Sequence 'Doppia stretta' in combat: steps 1–2 done, step 3 blocked 'Azione già usata in questo turno', step 4 skipped, Action spent, reason in the log; Undo returns the Action; physical 'Agguato' stopped after step 1 with reason 'Il goblin è fuggito' (panel and log)",
  );

  // ------------------------------------------------ group 6: share a copy with Doran
  await page.locator(".qb-tools [data-qb-menu]").click();
  await dialog().waitFor();
  await page.locator('#dialog [data-qb-m="share"]').click();
  await dialog().waitFor();
  await page.locator('#dialog input[name="target"][value="doran"]').check();
  const shareText = await dialog().innerText();
  check(shareText.includes("Arcano") && shareText.includes("Dardo di fuoco"), "share preview");
  await shot("b53-08-share-dialog-it.png");
  await submitDialog();
  const copy = (await bar("dm", "doran")).pages.at(-1);
  check(copy.sharedFrom?.actorName === "Livia", "copy on Doran's bar");
  check(
    JSON.stringify(copy.slots.filter(Boolean).map((x) => x.kind)) ===
      JSON.stringify(["roll", "sequence"]),
    "copied kinds " + JSON.stringify(copy.slots.filter(Boolean).map((x) => x.kind)),
  );
  // A copy: the player's later rename does not travel.
  await slot(4).click({ modifiers: ["Shift"] });
  await page.locator("#dialog [data-qb-edit-label]").fill("Arcano+");
  await submitDialog();
  await role("dm");
  await page.locator('[data-service="requests"], [data-service="notifications"]').first().click();
  const bell = page.getByText("Copia di una pagina della barra rapida per Doran").first();
  await bell.waitFor();
  await bell.click();
  await page.waitForFunction(
    () => document.querySelector("[data-qb]")?.dataset.qbActor === "doran",
  );
  await page.locator('[data-qb-page="next"]').click();
  check(await page.locator(".qb-page-name.is-shared").count(), "shared page open");
  check(
    (await slot(0).innerText()).includes("Arcano") &&
      !(await slot(0).innerText()).includes("Arcano+"),
    "copy unchanged",
  );
  // The copied sequence reads Doran's sheet (Dexterity 14: +2).
  await slot(1).click();
  await settleDice();
  const doranDex = (await rolls()).filter((x) => x.actorId === "doran").at(-2);
  check(doranDex.total === doranDex.values[0] + 2, "Doran's own Dexterity");
  await shot("b53-09-doran-shared-copy-it.png");
  await page.locator("[data-qb-run-close]").click();
  // The DM never sees the player's bar: Livia's bar for the DM is empty.
  await select("livia");
  check(!(await page.locator("[data-qb]").innerText()).includes("Dardo di fuoco"), "DM privacy");
  check((await page.locator(".qb-slot.is-empty").count()) === 10, "DM's own empty bar for Livia");
  passed.push(
    "(5) Page shared with Doran as a copy: preview lists copied (Arcano, Agguato) and kept (sheet actions, custom action); the DM's bell opens the Table on Doran; the copy keeps 'Arcano' after the player's rename; the copied Agguato uses Doran's Dexterity +2; the DM's bar for Livia is empty (the player's bar stays private)",
  );

  // ------------------------------------------------ group 7: pages, keys 1–0, Alt+1–5
  await role("player");
  await select("livia");
  await page.locator(".qb-tools [data-qb-menu]").click();
  await page.locator('#dialog [data-qb-m="new-page"]').click();
  await page.locator("#dialog [data-qb-m-name]").fill("Esplorazione");
  await page.locator('#dialog [data-qb-m="rename"]').click();
  await page.keyboard.press("Escape");
  check(
    (await page.locator("[data-qb]").getAttribute("data-qb-page-index")) === "1",
    "page 2 open",
  );
  check((await page.locator(".qb-page-name").innerText()).includes("Esplorazione"), "renamed page");
  await slot(0).click();
  await page.locator('#dialog input[name=item][value="new:roll"]').check();
  await page.locator("#dialog [data-qb-roll-name]").fill("Indagare");
  await page.locator("#dialog [data-qb-formula]").fill("1d20+5");
  await submitDialog();
  await page.locator("#battle-map").focus();
  const before = (await rolls()).length;
  await page.keyboard.press("1");
  await settleDice();
  check(
    (await rolls()).length === before + 1 && (await rolls()).at(-1).label === "Indagare",
    "key 1 on page 2",
  );
  await page.locator("#battle-map").focus();
  await page.keyboard.press("Alt+1");
  await page.waitForFunction(
    () => document.querySelector("[data-qb]")?.dataset.qbPageIndex === "0",
  );
  await page.locator("#battle-map").focus();
  await page.keyboard.press("5");
  await settleDice();
  check((await rolls()).at(-1).label === "Arcano+", "key 5 runs Arcano+");
  await page.locator("#battle-map").focus();
  await page.keyboard.press("0");
  await page.getByText("Casella 0 vuota").first().waitFor();
  await slot(0).focus();
  await page.keyboard.press("Alt+2");
  await page.waitForFunction(
    () => document.querySelector("[data-qb]")?.dataset.qbPageIndex === "1",
  );
  await page.locator('[data-qb-page="prev"]').click();
  check((await page.locator("[data-qb]").getAttribute("data-qb-page-index")) === "0", "‹ page");
  await page.locator('[data-qb-page="next"]').click();
  check((await page.locator("[data-qb]").getAttribute("data-qb-page-index")) === "1", "› page");
  await shot("b53-10-pages-keys-it.png");
  passed.push(
    "(6) Pages and keys: new page 'Esplorazione' from ⋯, key 1 runs its 'Indagare', Alt+1 opens page 1, key 5 runs 'Arcano+', key 0 explains the empty slot, Alt+2 from the bar, ‹ › switch pages",
  );

  // ------------------------------------------------ group 8: reload persistence and history
  await page.reload();
  await showQuickbar();
  await quietTips();
  check((await page.locator("[data-qb]").getAttribute("data-qb-page-index")) === "1", "page kept");
  check((await slot(0).innerText()).includes("Indagare"), "slot kept");
  await page.locator(".qb-tools [data-qb-menu]").click();
  await dialog().waitFor();
  const history = await page
    .locator("#dialog [data-qb-history-status]")
    .evaluateAll((n) => n.map((x) => x.dataset.qbHistoryStatus));
  check(history.includes("withdrawn") && history.includes("accepted"), "history " + history);
  check((await dialog().innerText()).includes("Tutte le pagine"), "all pages list");
  await shot("b53-11-menu-history-it.png");
  await page.keyboard.press("Escape");
  const small = await smallTargets(page, ".qb");
  check(!small.length, "small targets: " + JSON.stringify(small));
  check(await noOverflow(), "1440 overflow");
  // Offline (simulated): the bar is personal, so editing it still works; a roll for the
  // campaign is a shared change and is refused with the reason, nothing recorded.
  const setOffline = async (value) => {
    await page.locator('.service-nav [data-service="preferences"]').click();
    const box = page.locator('#dialog [name="offline"]');
    await (value ? box.check() : box.uncheck());
    await submitDialog();
  };
  await setOffline(true);
  const offlineRolls = (await rolls()).length;
  await slot(0).click();
  await page.getByText("Sei senza rete").first().waitFor();
  check((await rolls()).length === offlineRolls, "no roll recorded offline");
  await slot(0).click({ modifiers: ["Shift"] });
  await page.locator('#dialog input[name="color"][value="green"]').check();
  await submitDialog();
  check((await slot(0).getAttribute("class")).includes("qb-c-green"), "offline personal edit");
  await setOffline(false);
  passed.push(
    "Reload keeps pages, open page, slots and custom actions; ⋯ lists all pages (FVT-195) and the roll history with withdrawn/accepted/corrected statuses; all quick bar targets ≥ 40 px; no overflow at 1440; offline: the shared roll is refused with its reason and not recorded, the personal colour change still applies",
  );

  // ------------------------------------------------ group 9: EN phone 390, touch
  const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const phone = await phoneContext.newPage();
  phone.on("pageerror", (error) => errors.push("phone: " + error.message));
  await phone.goto(base + "#home");
  await phone.evaluate(([k, v]) => localStorage.setItem(k, v), [key, snapshot]);
  await phone.reload();
  await phone.locator('[data-service="preferences"]').tap();
  await phone.locator('#dialog [name="lang"]').selectOption("en");
  await submitDialog(phone, true);
  await role("player", phone);
  await phone.goto(base + "#table");
  await showQuickbar(phone);
  await quietTips(phone);
  check(
    (await phone.locator("[data-qb]").getAttribute("aria-label")) === "Livia's quick bar",
    "EN bar",
  );
  check((await slot(0, phone).getAttribute("aria-label")).startsWith("1: Fire Bolt"), "EN slot");
  await phone.locator("[data-qb-slots]").scrollIntoViewIfNeeded();
  check(await noOverflow(phone), "390 overflow");
  const phoneSmall = await smallTargets(phone, ".qb");
  check(!phoneSmall.length, "phone small targets: " + JSON.stringify(phoneSmall));
  // Tap runs a slot (Arcano+, slot 5).
  const n = (await rolls(phone)).length;
  await slot(4, phone).tap();
  await settleDice(phone);
  check((await rolls(phone)).length === n + 1, "tap rolls");
  // Long press edits (touch has no right click).
  const cdp = await phoneContext.newCDPSession(phone);
  const press = async (locator, ms) => {
    const box = await locator.boundingBox();
    const at = [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at });
    await phone.waitForTimeout(ms);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };
  await press(slot(1, phone), 800);
  await dialog(phone).waitFor();
  check((await dialog(phone).innerText()).includes("Edit slot 2"), "long press edits");
  await phone.locator("#dialog [data-close]").first().tap();
  // Touch drag reorders while customising: slot 1 (Fire Bolt) onto slot 3.
  await phone.locator("[data-qb-edit]").tap();
  const from = await slot(0, phone).boundingBox();
  const to = await slot(2, phone).boundingBox();
  const points = (x, y) => [{ x, y }];
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: points(from.x + from.width / 2, from.y + from.height / 2),
  });
  for (let i = 1; i <= 8; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: points(
        from.x + from.width / 2 + ((to.x - from.x) * i) / 8,
        from.y + from.height / 2 + ((to.y - from.y) * i) / 8,
      ),
    });
  await phone.screenshot({ path: dir + "b53-12-phone-touch-drag-en.png" });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await phone.waitForFunction(() =>
    document
      .querySelector('.qb-slot[data-qb-index="2"]')
      ?.getAttribute("aria-label")
      ?.includes("Fire Bolt"),
  );
  check((await slot(0, phone).getAttribute("aria-label")).includes("Quarterstaff"), "touch swap");
  await phone.locator("[data-qb-edit-done]").tap();
  await phone.locator("[data-qb-slots]").scrollIntoViewIfNeeded();
  await phone.screenshot({ path: dir + "b53-13-phone-bar-en.png" });
  // Options on the phone: dice mode lives in the ⋯ menu.
  await phone.locator(".qb-tools [data-qb-menu]").tap();
  await phone.locator("#dialog [data-qb-m-dice]").selectOption("physical");
  await phone.waitForTimeout(150);
  await phone.locator("#dialog [data-close]").first().tap();
  await slot(4, phone).tap();
  await dialog(phone).waitFor();
  check((await dialog(phone).innerText()).includes("Step 1 of 1"), "phone physical dialog EN");
  await phone.locator('#dialog [name="face0"]').fill("20");
  await submitDialog(phone, true);
  check((await rolls(phone)).at(-1).total === 25, "phone physical 20 + 5");
  check(await noOverflow(phone), "390 overflow after");
  await phone.screenshot({ path: dir + "b53-14-phone-physical-en.png" });
  passed.push(
    "EN phone 390: 'Livia's quick bar' in English, no overflow, targets ≥ 40 px; tap rolls; long press opens 'Edit slot 2'; touch drag while customising swaps Fire Bolt and Quarterstaff (slots 1 and 3); dice mode from ⋯; physical 20 + 5 = 25",
  );
  await phoneContext.close();

  check(!errors.length, "Page errors: " + errors.join(" | "));
  await context.close();
  return { passed, errors };
};
