async (page) => {
  // Increment 10 review fixes in the running app (see blueprint-conditions-fixes.md):
  // single HP entry on the sheet, Temporary HP command (keep/replace), field-level
  // validation, potion blocked while Incapacitated, return to the panel after a vital
  // roll, Stand up disabled with a visible reason, private origin gone from the DOM after
  // a role change while the shared log line stays.
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
  const role = (r) =>
    page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption(r);
  const dialog = page.locator("#dialog");
  const field = (k) => page.locator("#dialog [data-conditions-field=" + k + "]");
  const closeDialog = () => page.locator("#dialog footer [data-close]").click();
  const panelTitle = () =>
    dialog.getByRole("heading", { name: "Condizioni e stato", exact: true }).waitFor();
  await page.goto("http://127.0.0.1:8879/#characters?id=livia");
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await button("Ripristina esempio").click();
  await button("Ripristina").click();
  await page.goto("http://127.0.0.1:8879/#characters?id=livia");
  // 1. One HP entry, inside the Conditions box (visual pass 2: D&D Beyond's strip over the
  // tabs; it moves into the HP box at 0 HP), opening the panel with no preselected command.
  const entries = page.locator("#content [data-conditions-entry=livia]");
  await entries.first().waitFor();
  check((await entries.count()) === 1, "sheet has " + (await entries.count()) + " HP entries");
  check(
    (await page.locator("#content [data-character-action=hp]").count()) === 0,
    "old Correct-only HP button still present",
  );
  const card = page.locator("#content .character-conditions");
  check(
    (await card.innerText()).includes("Danni, cure e condizioni") &&
      (await card.locator("[data-conditions-entry=livia]").count()) === 1,
    "entry not inside the Conditions box",
  );
  await card.screenshot({ path: dir + "fixes-sheet-hp-card.png" });
  await entries.click();
  await panelTitle();
  check(
    (await page.locator("#dialog [data-conditions-command][aria-pressed=true]").count()) === 0,
    "panel opened with a preselected command",
  );
  passed.push(
    'sheet: one entry "Danni, cure e condizioni" inside the Conditions box opens the panel with no preselected command',
  );
  // 2. Temporary HP: do not stack (keep or replace), never a correction. Refreshed by the
  // hand-off writer (29/09/2026): P3 PG-22 (Roll20 / D&D Beyond, one HP control) moved damage,
  // healing and Temporary HP into the HP widget, which applies at once with its own Undo.
  await page.locator("[data-conditions-command=hp]").click();
  const temp = page.locator('#dialog [data-dt-details="temp"]');
  await temp.locator("summary").click();
  await temp.locator("[data-dt-temp]").fill("5");
  await temp.locator("[data-dt-temp-set]").click();
  await page.waitForTimeout(200);
  check((await saved()).actors.livia.tempHp === 5, "temp HP not 5");
  const temp2 = page.locator('#dialog [data-dt-details="temp"]');
  if ((await temp2.getAttribute("open")) === null) await temp2.locator("summary").click();
  await temp2.locator("[data-dt-temp]").fill("8");
  check((await temp2.innerText()).includes("non si sommano"), "no do-not-stack message");
  await temp2.locator('[data-dt-temp-choice][value="replace"]').check();
  await page.screenshot({ path: dir + "fixes-temp-hp-replace.png" });
  await temp2.locator("[data-dt-temp-set]").click();
  await page.waitForTimeout(200);
  let data = await saved();
  check(data.actors.livia.tempHp === 8 && data.actors.livia.hp === 18, "replace not 8 / HP moved");
  passed.push(
    "Temporary HP in the HP widget: 5 applied; 8 more says they do not stack and offers keep/replace; replace → 8, HP unchanged",
  );
  // 3. Damage 40 with its cause: Temporary HP absorb first, then HP to 0 (SRD EN 18 / IT 20).
  await page.locator("#dialog [data-dt-note]").fill("Colpo di mazza");
  await page.locator("#dialog [data-dt-amount]").fill("40");
  await page.locator("#dialog [data-dt-damage]").click();
  await page.waitForTimeout(200);
  data = await saved();
  check(data.actors.livia.hp === 0 && data.actors.livia.tempHp === 0, "damage 40 not applied");
  const log = page.locator('#dialog [data-dt-details="log"]');
  if ((await log.getAttribute("open")) === null) await log.locator("summary").click();
  check(
    (await log.locator(".dt-log-entry").first().innerText()).includes("Colpo di mazza"),
    "the HP log does not name the cause",
  );
  passed.push(
    "damage 40 with the cause «Colpo di mazza»: Temporary HP 8 absorbed, HP 18 → 0, the HP log names the cause",
  );
  await closeDialog();
  // 4. A dying (Incapacitated) creature cannot drink its own potion.
  const potions = data.actors.livia.inventory.find((i) => i.id === "potion").quantity;
  await page.goto("http://127.0.0.1:8879/#characters?id=livia&tab=inventory");
  await page.locator("#content [data-character-action=use-healing]").first().click();
  check(
    (await dialog.innerText()).includes("Incapacitato: non può bere da solo"),
    "potion dialog lacks the Incapacitated reason",
  );
  check(
    (await dialog.getByRole("button", { name: "Bevi · esegui", exact: true }).count()) === 0,
    "Drink still offered",
  );
  await closeDialog();
  check(
    (await saved()).actors.livia.inventory.find((i) => i.id === "potion").quantity === potions,
    "potion spent",
  );
  passed.push("potion: dying Livia cannot drink; the dialog explains why and offers no Drink");
  // 5. Death save from the panel, then back to the panel from the result.
  await page.goto("http://127.0.0.1:8879/#characters?id=livia");
  await page.locator("#content [data-conditions-entry=livia]").click();
  await panelTitle();
  await page.locator("[data-conditions-death-save]").click();
  await page.getByRole("dialog", { name: "Risolvi tiro", exact: true }).waitFor();
  await page.locator("[name=diceMode]").selectOption("physical");
  await page.locator("[name=face0]").fill("10");
  await button("Registra tiro").click();
  await button("Torna a Condizioni e stato").click();
  await panelTitle();
  check((await saved()).actors.livia.deathSaves.successes === 1, "death save not recorded");
  passed.push(
    "death save from the panel (physical 10 = success) → result → Torna a Condizioni e stato reopens the panel",
  );
  await closeDialog();
  // 6. Table: vital status first; Stand up disabled with a visible reason at Speed 0.
  await page.goto("http://127.0.0.1:8879/#table");
  const stand = page.locator("#content [data-table=stand]");
  await stand.waitFor();
  check(await stand.isDisabled(), "Stand up enabled at Speed 0");
  check(
    (await page.locator("#stand-why").innerText()).includes("Velocità 0"),
    "no visible Stand up reason",
  );
  check(
    (await page.locator("#map-message").innerText()) !== "" &&
      (await page.locator(".map-caption").innerText()).includes("1,5 m / casella"),
    "scale not in Italian decimals",
  );
  await page.screenshot({ path: dir + "fixes-table-stand-disabled.png" });
  passed.push(
    'Table: "Rialzati" disabled with "Velocità 0: non può rialzarsi." in view; scale "1,5 m / casella"',
  );
  // 7. A private origin leaves no markup after closing and a role change; the log line is shared.
  await role("dm");
  await page.locator("#battle-map [data-actor=goblin-1]").click();
  await page.locator("#content [data-conditions-entry=goblin-1]").click();
  await panelTitle();
  await page.locator("[data-conditions-command=add]").click();
  await field("search").fill("Spaventato");
  await page.locator("[data-conditions-definition=frightened]").click();
  await field("originLabel").fill("DM-SECRET-ABC");
  await field("sourcePrivate").check();
  await page.locator("[data-conditions-preview]").click();
  await page.locator("[data-conditions-apply]").click();
  await closeDialog();
  check(
    !(await page.evaluate(() => document.querySelector("#dialog").innerHTML.includes("DM-SECRET"))),
    "closed dialog still holds the private origin",
  );
  await role("player");
  check(
    !(await page.evaluate(() => document.documentElement.outerHTML.includes("DM-SECRET-ABC"))),
    "private origin still in the DOM after the role change",
  );
  data = await saved();
  const line = data.log.at(-1);
  check(
    line.visibility === "shared" && line.label.includes("Spaventato") && !line.label.includes("DM"),
    "log line not shared or leaks: " + JSON.stringify(line),
  );
  passed.push(
    'private origin "DM-SECRET-ABC": gone from the closed dialog and the DOM after switching to Player; log line "Condizione applicata: Spaventato" shared',
  );
  check(errors.length === 0, "Page errors: " + errors.join("; "));
  return { passed, findings: [], errors };
};
