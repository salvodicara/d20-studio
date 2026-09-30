async (rootPage) => {
  // B48 review fixes, in the one app with real clicks (independent reviewer-fixer).
  // R1 an attack activity at the Table: one use pays the action once, the attack roll opens
  // and the damage is rolled afterwards from the use's row (dnd5e activity card, FVT-180);
  // a second use in the same turn is refused. R2 the Library's own update of Livia's sheet
  // copy to v2 is flagged in the sheet box and the effects follow it with one click.
  // R3 a role change with unsaved editor text asks through the draft guard. R4 the bell
  // reminds a due subclass advancement; a homebrew subclass can be removed. R5 EN phone
  // 390 with touch. Keyboard: sub-form focus and the activity tab keys (in R1).
  // Synthetic demo data; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B48-rf/";
  const context = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const quiet = async () => {
    for (const name of ["Ho capito", "Got it"])
      for (const b of await page.getByRole("button", { name, exact: true }).all())
        await b.click({ timeout: 1000 }).catch(() => {});
  };
  const role = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
  };
  const tick = () => page.waitForTimeout(120);
  const hbe = (action, extra = "") => page.locator(`[data-hbe="${action}"]${extra}`);
  const path = (p) => page.locator(`[data-hbe-path="${p}"]`);
  const dialog = page.locator("#dialog");
  const submit = async () => {
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForFunction(() => !document.querySelector("#dialog")?.open);
  };
  const submitNext = async (title) => {
    await page.locator("#dialog button[type=submit]").click();
    await page.locator("#dialog #dialog-title", { hasText: title }).waitFor();
  };
  const button = (name) => page.getByRole("button", { name, exact: true });

  // ------------------------------------------------------------ R1: attack card
  await page.goto(base + "#library");
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await page.locator("[data-library-scope]").first().waitFor();
  await role("player");
  await page.locator('[data-library-scope="homebrew-editor"]').click();
  await hbe("create", '[data-kind="feat"]').click();
  await submit();
  await page.locator("[data-hbe-editor]").waitFor();
  await path("name.it").fill("Colpo del faro");
  await path("name.en").fill("Beacon strike");
  await path("source.label").fill("Tavolo di Bruma");
  await hbe("save-draft").click();
  await page.locator("[data-hbe-status]", { hasText: "Bozza privata salvata" }).waitFor();
  // Keyboard: Enter on a sub-form keeps the focus on it after the page is redrawn.
  await hbe("subform", '[data-subform="activities"]').focus();
  await page.keyboard.press("Enter");
  await page.locator("[data-hbe-new-activity]").waitFor();
  check(
    await page.evaluate(() => document.activeElement?.dataset.subform === "activities"),
    "focus lost after choosing a sub-form with the keyboard",
  );
  await page.locator("[data-hbe-new-activity]").selectOption("attack");
  await hbe("add-activity").click();
  await path("structured.activities.0.name.it").waitFor();
  await path("structured.activities.0.name.it").fill("Fendente del faro");
  await path("structured.activities.0.name.en").fill("Beacon slash");
  // Activity tabs answer the ARIA tab keys: End opens and focuses "Effetto".
  await page.locator('[data-hbe="activity-tab"][data-pane="identity"]').focus();
  await page.keyboard.press("End");
  await page
    .locator('[data-hbe="activity-tab"][data-pane="effect"][aria-selected="true"]')
    .waitFor();
  check(
    await page.evaluate(() => document.activeElement?.dataset.pane === "effect"),
    "focus not on the Effect tab after End",
  );
  await path("structured.activities.0.attack.bonus").fill("5");
  await path("structured.activities.0.damage.dice").fill("1d8+3");
  await path("structured.activities.0.damage.dice").press("Tab");
  await hbe("subform", '[data-subform="modifiers"]').click();
  await hbe("add-modifier").click();
  await tick();
  await hbe("save-content").click();
  await page.locator("[data-hbe-detail]").waitFor();
  await hbe("share", '[data-shared="true"]').click();
  await tick();
  await role("dm");
  await page.goto(base + "#library?tab=homebrew-editor");
  await page.locator(".hbe-hub").waitFor();
  await page
    .locator(".hbe-row", { hasText: "Colpo del faro" })
    .locator('[data-hbe="open"]')
    .click();
  await hbe("enable", '[data-enabled="true"]').click();
  await tick();
  await role("player");
  await page.goto(base + "#library?tab=homebrew-editor");
  await page
    .locator(".hbe-row", { hasText: "Colpo del faro" })
    .locator('[data-hbe="open"]')
    .click();
  await hbe("apply-sheet").click();
  await dialog.locator('select[name="actorId"]').selectOption("livia");
  await submit();
  let data = await stored();
  check(data.actors.livia.ac === 13, "feat +1 AC not applied to Livia: " + data.actors.livia.ac);
  // The DM prepares and starts combat on Livia's turn (the core preparation flow).
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await role("dm");
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
  data = await stored();
  check(
    data.combat.active && data.combat.order[data.combat.turn] === "livia",
    "combat not on Livia",
  );
  await role("player");
  await page.locator("[data-select=livia]").click();
  const panel = page.locator('[data-ext-slot="table-panel:homebrew-editor-inspector"]');
  await panel.waitFor();
  await panel.locator('[data-hbe="use"]').click();
  check(
    (await dialog.innerText()).includes("una volta"),
    "use dialog does not say the cost is paid once",
  );
  await dialog.locator('select[name="roll"]').selectOption("attack");
  await submitNext("Tiro per colpire");
  await dialog.locator('input[name="dieMode"][value="physical"]').check();
  await dialog.locator('input[name="face-0"]').fill("14");
  await submit();
  data = await stored();
  const rolls = () => data.ext["compendium-rolls"].rolls;
  check(
    rolls().at(-1).total === 19 && rolls().at(-1).mode === "physical",
    "attack roll not 14 + 5",
  );
  check(data.actors.livia.action === false, "action not spent on use");
  const use = data.ext["homebrew-editor"].uses.at(-1);
  check(use.type === "attack" && use.rolls.length === 2, "use not recorded with its rolls");
  // The damage from the use's row: no second action, physical 6 + 3 = 9.
  await panel.locator('[data-hbe="roll-use"][data-roll="1"]').click();
  await dialog.locator('input[name="dieMode"][value="physical"]').check();
  await dialog.locator('input[name="face-0"]').fill("6");
  await submit();
  data = await stored();
  check(rolls().at(-1).total === 9, "damage not 6 + 3: " + rolls().at(-1).total);
  check(data.ext["homebrew-editor"].uses.length === 1, "the damage created another use");
  await quiet();
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: dir + "rf-01-table-attack-card.png" });
  // A second use this turn is refused with the reason; nothing is recorded.
  await panel.locator('[data-hbe="use"]').click();
  await page.locator("#dialog button[type=submit]").click();
  await page.locator("text=già usata in questo turno").first().waitFor();
  if (await dialog.evaluate((d) => d.open)) await page.keyboard.press("Escape");
  data = await stored();
  check(data.ext["homebrew-editor"].uses.length === 1, "a refused use was recorded");
  passed.push(
    "R1. Table: 'Fendente del faro' used once (action spent), physical attack 14+5 = 19; the damage rolled afterwards from the use's row, physical 6+3 = 9, without a second action; a second use this turn refused; keyboard: Enter on 'Attività' keeps the focus there and End opens and focuses the 'Effetto' tab",
  );
  await role("dm");
  await button("Concludi incontro").click();
  if (await dialog.evaluate((d) => d.open)) await submit();
  await page.waitForFunction((k) => !JSON.parse(localStorage.getItem(k)).combat.active, key);

  // ------------------------------------------------------------ R2: Library update → effects
  await role("player");
  await page.goto(base + "#library?tab=homebrew-editor");
  await page
    .locator(".hbe-row", { hasText: "Colpo del faro" })
    .locator('[data-hbe="open"]')
    .click();
  await hbe("revise").click();
  await page.locator("[data-hbe-editor]").waitFor();
  await hbe("subform", '[data-subform="modifiers"]').click();
  await path("structured.modifiers.0.value").fill("2");
  await path("structured.modifiers.0.value").press("Tab");
  await hbe("save-content").click();
  await page.locator("[data-hbe-detail]").waitFor();
  await hbe("share", '[data-shared="true"]').click();
  await tick();
  await role("dm");
  await page.goto(base + "#library?tab=homebrew-editor");
  await page
    .locator(".hbe-row", { hasText: "Colpo del faro" })
    .locator('[data-hbe="open"]')
    .click();
  await hbe("enable", '[data-enabled="true"]').click();
  await tick();
  await role("player");
  // Livia's sheet → the feat row's "Origine e revisioni" → v2 → the Library's update review.
  await page.goto(base + "#characters?id=livia&tab=features");
  await page.locator("[data-character-action][data-library-instance]").first().click();
  const revisionSelect = page.locator("[data-library-revision]");
  await revisionSelect.waitFor();
  const revisionIds = await revisionSelect.evaluate((s) => [...s.options].map((o) => o.value));
  await revisionSelect.selectOption(revisionIds.at(-1));
  await page.locator("[data-library-update]").click();
  await page.locator("[data-library-apply]").click();
  await page.locator(".hbe-sheet").first().waitFor();
  data = await stored();
  // Refreshed by the hand-off writer (29/09/2026): P8 BI-16 makes the effects follow the
  // Library update in the same change (D&D Beyond homebrew updates), so the old «effects
  // still v1's» notice and «Aggiorna gli effetti» step no longer exist: AC 14 at once.
  check(
    data.actors.livia.ac === 14,
    "the effects did not follow the update: " + data.actors.livia.ac,
  );
  const box = page.locator(".hbe-sheet").first();
  const boxText = await box.innerText();
  check(
    !boxText.includes("ancora quelli della precedente") && /Somma \+2/.test(boxText),
    "the sheet box does not show the v2 effect: " + boxText.slice(0, 300),
  );
  await quiet();
  await box.scrollIntoViewIfNeeded();
  await page.screenshot({ path: dir + "rf-02-sheet-updated-entry.png" });
  passed.push(
    "R2. Livia's feat copy moved to v2 (+2 AC) through the Library's own 'Rivedi aggiornamento di questa copia': the effects follow in the same change (AC 14, «Classe Armatura: Somma +2» in the sheet box, no stale notice)",
  );

  // ------------------------------------------------------------ R3: role change guard
  await page.goto(base + "#library?tab=homebrew-editor");
  await hbe("create", '[data-kind="spell"]').click();
  await submit();
  await page.locator("[data-hbe-editor]").waitFor();
  await path("name.it").fill("Scintilla del faro");
  check(
    (await page.locator(".hbe-heading h1").innerText()) === "Scintilla del faro",
    "the heading does not follow the typed name",
  );
  await page.locator("#demo-role").selectOption("dm");
  await page.locator("#dialog #dialog-title", { hasText: "Conservare la bozza?" }).waitFor();
  await quiet();
  await page.screenshot({ path: dir + "rf-03-role-change-guard.png" });
  await page.getByRole("button", { name: "Resta nella bozza", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector("#dialog")?.open);
  check((await page.locator("#demo-role").inputValue()) === "player", "role changed anyway");
  check(
    (await path("name.it").inputValue()) === "Scintilla del faro",
    "unsaved text lost after staying",
  );
  // "Salva e continua" keeps the text in the private draft and changes identity.
  await page.locator("#demo-role").selectOption("dm");
  await page.locator("#dialog #dialog-title", { hasText: "Conservare la bozza?" }).waitFor();
  await submit();
  await page.waitForFunction(() => document.querySelector("#demo-role").value === "dm");
  data = await stored();
  check(
    data.libraryDrafts.some(
      (d) => d.owner === "player" && d.data?.name?.it === "Scintilla del faro",
    ),
    "the draft was not saved before the identity change",
  );
  passed.push(
    "R3. Unsaved 'Scintilla del faro' in the editor: switching to DM asks 'Conservare la bozza?'; the heading follows the typed name; 'Resta nella bozza' keeps role and text; 'Salva e continua' saves the private draft, then changes identity",
  );

  // ------------------------------------------------------------ R4: subclass bell and removal
  await role("player");
  await page.goto(base + "#library?tab=homebrew-editor");
  await hbe("create", '[data-kind="subclass"]').click();
  await dialog.locator('select[name="template"]').selectOption("class-levels:druid");
  await submit();
  await page.locator("[data-hbe-editor]").waitFor();
  await path("name.it").fill("Circolo del faro");
  await path("source.label").fill("Tavolo di Bruma");
  await hbe("save-draft").click();
  await page.locator("[data-hbe-status]", { hasText: "Bozza privata salvata" }).waitFor();
  await hbe("subform", '[data-subform="advancement"]').click();
  await page.locator('[data-hbe-advancement="14"]').waitFor();
  const featureNames = page.locator('[data-hbe-path$=".features.0.name.it"]');
  for (let i = 0; i < (await featureNames.count()); i++)
    await featureNames.nth(i).fill(`Dono ${i + 1}`);
  await featureNames.last().press("Tab");
  await hbe("save-content").click();
  await page.locator("[data-hbe-detail]").waitFor();
  await hbe("share", '[data-shared="true"]').click();
  await tick();
  await role("dm");
  await page.goto(base + "#library?tab=homebrew-editor");
  await page
    .locator(".hbe-row", { hasText: "Circolo del faro" })
    .locator('[data-hbe="open"]')
    .click();
  await hbe("enable", '[data-enabled="true"]').click();
  await tick();
  await role("player");
  await page.goto(base + "#characters?id=mira&tab=features");
  await hbe("choose-subclass").click();
  await dialog.locator('input[name="pick"]').first().check();
  await submit();
  // The bell carries the due level-3 advancement and opens Mira's Features.
  await page.locator('[data-service="requests"]').first().click();
  await page
    .locator("#dialog", { hasText: "Avanzamento da applicare: Mira (livello 3)" })
    .waitFor();
  await quiet();
  await page.screenshot({ path: dir + "rf-04-bell-advancement.png" });
  await page.keyboard.press("Escape");
  await page.locator('.hbe-sheet [data-hbe="apply-advancement"]').click();
  await tick();
  data = await stored();
  const granted = () =>
    data.actors.mira.features.filter((f) => String(f.grantId).startsWith("homebrew-advancement:"));
  check(granted().length === 1, "level 3 feature not granted");
  // Remove the subclass: its granted feature goes, and it can be chosen again.
  await page.locator('.hbe-sheet [data-hbe="remove-entry"][data-row="subclass"]').click();
  await tick();
  data = await stored();
  check(granted().length === 0, "granted feature still on the sheet after removing the subclass");
  await page.locator('.hbe-sheet [data-hbe="choose-subclass"]').waitFor();
  passed.push(
    "R4. Mira picks 'Circolo del faro': the bell lists 'Avanzamento da applicare: Mira (livello 3)'; applied from the box; 'Rimuovi sottoclasse' removes the subclass and its granted feature and offers the choice again",
  );
  // ------------------------------------------------------------ R5: EN phone 390, touch
  const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
  const phoneContext = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phone = await phoneContext.newPage();
  phone.on("pageerror", (error) => errors.push("phone: " + error.message));
  await phone.goto(base + "#table");
  await phone.evaluate(([k, v]) => localStorage.setItem(k, v), [key, snapshot]);
  await phone.reload();
  await phone.locator("#battle-map").waitFor();
  await phone.locator("#demo-role").selectOption("player");
  await phone.locator('[data-service="preferences"]').first().tap();
  await phone.locator('#dialog [name="lang"]').selectOption("en");
  await phone.locator('#dialog button[type="submit"]').tap();
  await phone.locator("#battle-map [data-actor=livia]").tap();
  const phonePanel = phone.locator('[data-ext-slot="table-panel:homebrew-editor-inspector"]');
  await phonePanel.locator(".hbe-use-card", { hasText: "Last use" }).waitFor();
  check(
    (await phonePanel.innerText()).includes("Damage 1d8+3"),
    "EN use card without the damage roll",
  );
  const phoneOk = await phone.evaluate(() => {
    const small = [...document.querySelectorAll(".hbe-use-card button")].filter(
      (b) => b.getBoundingClientRect().height < 40,
    ).length;
    return { small, overflow: document.documentElement.scrollWidth > window.innerWidth + 1 };
  });
  check(!phoneOk.small && !phoneOk.overflow, "phone card: " + JSON.stringify(phoneOk));
  await phonePanel.locator('[data-hbe="roll-use"][data-roll="1"]').tap();
  await phone.locator("#dialog #dialog-title", { hasText: "Damage" }).waitFor();
  await phone.locator("#dialog button[type=submit]").tap();
  await phone.waitForFunction(() => !document.querySelector("#dialog")?.open);
  await phonePanel.scrollIntoViewIfNeeded();
  await phone.screenshot({ path: dir + "rf-05-phone-en-use-card.png" });
  await phoneContext.close();
  passed.push(
    "R5. EN phone 390 touch: Livia's 'Beacon slash' row keeps 'Last use' with 'Attack roll 1d20+5' and 'Damage 1d8+3' (≥ 40 px, no overflow); a digital damage roll is recorded outside combat",
  );
  await context.close();
  return { passed, errors };
};
