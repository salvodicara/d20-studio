async (rootPage) => {
  // B53 review fixes, in the one app with real clicks, keys and touch (independent review,
  // 24/09/2026). R1: a sequence keeps a step whose saved roll was renamed. R2: saves and
  // skills roll the sheet's effective values (Doran's CON save +4 as on his sheet; Mira's
  // Perception skill from the tray by keyboard). R3: correcting a physical natural 20 before
  // the damage removes the Critical Hit from the waiting damage step. R4: a physical first
  // step that is not permitted asks no faces and records the stop. R5: a sheet-action slot
  // runs the Table action with the bar's dice mode. R6: EN phone 390 with the skills group.
  // Synthetic demo data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B53-rf/";
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

  // ------------------------------------------------ R1: renamed saved roll inside a sequence
  await slot(4).click();
  await page.locator('#dialog input[name=item][value="new:roll"]').check();
  await page.locator("#dialog [data-qb-roll-name]").fill("Arcano");
  await page.locator("#dialog [data-qb-formula]").fill("1d20+5");
  await submitDialog();
  await slot(5).click();
  await page.locator('#dialog input[name=item][value="new:sequence"]').check();
  await page.locator("#dialog [data-qb-seq-name]").fill("Studio");
  await page.locator('#dialog select[name="step0"]').selectOption("roll:1d20+5:Arcano");
  await page.locator('#dialog select[name="step1"]').selectOption("check:int:check");
  await submitDialog();
  // Roll20: Shift+click edits; the saved roll becomes "Arcano+".
  await slot(4).click({ modifiers: ["Shift"] });
  await page.locator("#dialog [data-qb-edit-label]").fill("Arcano+");
  await submitDialog();
  // Only the sequence's colour changes: its first step must survive.
  await slot(5).click({ modifiers: ["Shift"] });
  check(
    (await page.locator('#dialog select[name="step0"]').inputValue()) === "roll:1d20+5:Arcano",
    "renamed step still selected",
  );
  check(
    (await page.locator('#dialog select[name="step0"] option:checked').innerText()) ===
      "Arcano (1d20+5)",
    "current step option",
  );
  await page.locator('#dialog input[name="color"][value="blue"]').check();
  await shot("rf-r1-sequence-edit-it.png");
  await submitDialog();
  const studio = (await bar("player", "livia")).pages[0].slots[5];
  check(
    studio.color === "blue" && studio.ref.steps.map((s) => s.kind).join() === "roll,check",
    "sequence kept both steps: " + JSON.stringify(studio.ref.steps),
  );
  await slot(5).click();
  await settleDice();
  const studioRun = await page.locator("[data-qb-run]").innerText();
  check(
    studioRun.includes("Arcano") && studioRun.includes("Prova di Intelligenza"),
    "both steps ran",
  );
  await page.locator("[data-qb-run-close]").click();
  passed.push(
    "R1 Sequence 'Studio' (Arcano, INT check): after renaming the saved roll to 'Arcano+', Shift+click shows step 1 as 'Arcano (1d20+5)' under 'Passo attuale'; a colour-only edit saves blue with both steps; the sequence runs both",
  );

  // ------------------------------------------------ R2: saves and skills from the sheet
  await select("mira");
  await page.locator("[data-qb-edit]").click();
  await page.locator("[data-qb-tray]").waitFor();
  const skills = page.locator('.qb-tray-group[aria-label="Abilità"]');
  check(await skills.count(), "skills group in the tray");
  const chip = page.locator('[data-qb-item="check:wis:skill:perception"]');
  check((await chip.innerText()).includes("d20 + 5"), "Perception +5 like Mira's sheet");
  await shot("rf-r2-tray-skills-it.png");
  // R4 C9: Mira's slot 4 holds her Wild Shape (BG3 class action), so Enter fills slot 5.
  check(
    (await slot(3).getAttribute("aria-label")).includes("Forma Selvatica"),
    "Wild Shape in Mira's slot 4",
  );
  await chip.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() =>
    document
      .querySelector('.qb-slot[data-qb-index="4"]')
      ?.getAttribute("aria-label")
      ?.includes("Prova di Saggezza (Percezione)"),
  );
  await page.locator("[data-qb-edit-done]").click();
  check((await slot(4).innerText()).includes("Percezione"), "short face 'Percezione'");
  await slot(4).click();
  await settleDice();
  let r = (await rolls()).at(-1);
  check(r.total === r.natural + 5 && r.rollKind === "check", "Perception roll +5");
  // Doran's Constitution save: +4 on his sheet (Fighter), +4 on the bar.
  await role("dm");
  await select("doran");
  await slot(0).click({ modifiers: ["Shift"] });
  check((await dialog().innerText()).includes("d20 +4"), "edit dialog shows +4");
  await page.keyboard.press("Escape");
  await slot(0).click();
  await settleDice();
  r = (await rolls()).at(-1);
  check(r.total - r.natural === 4, "CON save +4, got " + (r.total - r.natural));
  await page.goto(base + "#characters?id=doran&tab=actions");
  await page.getByText("Tiri salvezza, sensi e abilità").first().waitFor();
  const sheet = await page.locator("#content").innerText();
  check(/Costituzione\s*\n\s*\+4/.test(sheet), "the sheet shows CON save +4");
  await page.goto(base + "#table");
  await showQuickbar();
  passed.push(
    "R2 Mira: tray 'Abilità' (fifth column, Italian alphabetical order) offers 'Percezione · Sag · d20 + 5'; Enter puts it in slot 4 ('Percezione', accessible name 'Prova di Saggezza (Percezione)'); the roll adds +5. Doran (DM): 'TS Cos' editor reads d20 +4 and the digital save adds +4, the same +4 his sheet shows (Fighter save proficiency)",
  );

  // ------------------------------------------------ R3: correction before the damage
  await page.locator("[data-qb-add]").focus();
  await page.keyboard.press("Enter");
  await dialog().waitFor();
  check(
    await page.locator('#dialog input[value="custom:qb-doran-longsword"]').isChecked(),
    "sword preselected",
  );
  await submitDialog();
  const swordIndex = (await bar("dm", "doran")).pages[0].slots.findIndex(
    (s) => s?.ref?.customId === "qb-doran-longsword",
  );
  await page.locator("[data-qb-dice]").selectOption("physical");
  await slot(swordIndex).click();
  await dialog().waitFor();
  check((await dialog().innerText()).includes("Passo 1 di 2"), "physical attack step");
  await page.locator('#dialog [name="face0"]').fill("20");
  await submitDialog();
  const attack = (await rolls()).at(-1);
  check(attack.natural === 20, "natural 20 recorded");
  check(
    (await page.locator("[data-qb-run]").innerText()).includes("colpo critico"),
    "critical noted",
  );
  await page.locator(`[data-qb-correct="${attack.id}"]`).click();
  await page.locator('#dialog [name="face0"]').fill("12");
  await page.locator("#dialog [data-qb-correct-reason]").fill("Letto male: era un 12");
  await submitDialog();
  await page.locator("[data-qb-run-next]").click();
  await dialog().waitFor();
  const damageDialog = await dialog().innerText();
  check(
    (await page.locator("#dialog input[name^=face]").count()) === 1,
    "one d8 after the correction",
  );
  check(!damageDialog.includes("Colpo critico"), "no Critical Hit note");
  await shot("rf-r3-damage-after-correction-it.png");
  await page.locator('#dialog [name="face0"]').fill("5");
  await submitDialog();
  const damage = (await rolls()).at(-1);
  check(damage.total === 5 && !damage.critical, "damage 1d8 = 5, not critical");
  await page.locator("[data-qb-run-close]").click();
  passed.push(
    "R3 Doran's 'Attacco con spada' with physical dice: natural 20 corrected to 12 with a reason before the damage; 'Registra passo 2' asks one d8 without the Critical Hit note; damage 5, not critical",
  );

  // ------------------------------------------------ R4: physical step not permitted
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
  await quietTips();
  await select("doran");
  const rollCount = (await rolls()).length;
  await slot(swordIndex).click();
  await page.locator('[data-qb-run-status="blocked"]').waitFor();
  check(!(await dialog().count()), "no faces dialog for a step that cannot run");
  const blocked = await page.locator("[data-qb-run]").innerText();
  check(blocked.includes("Non è il turno di Doran"), "reason: " + blocked);
  check((await rolls()).length === rollCount, "no roll recorded");
  await shot("rf-r4-physical-blocked-it.png");
  await page.locator("[data-qb-run-close]").click();
  await page.locator("[data-qb-dice]").selectOption("digital");
  passed.push(
    "R4 In combat on Livia's turn, Doran's sword with physical dice: no faces dialog opens; the panel records 'Fermata: passo non permesso' with 'Non è il turno di Doran'; no roll recorded",
  );

  // ------------------------------------------------ R5: sheet-action slot and dice mode
  await role("player");
  await select("livia");
  check((await page.locator("[data-combat-mode]").inputValue()) === "digital", "core digital");
  await page.locator("[data-qb-dice]").selectOption("physical");
  await slot(0).click();
  await firePreview();
  check(
    (await page.locator("[data-combat-mode]").inputValue()) === "physical",
    "the Table action follows the bar's physical dice",
  );
  await shot("rf-r5-action-slot-physical-it.png");
  await page.keyboard.press("Escape");
  await page.locator("[data-qb-dice]").selectOption("digital");
  await slot(0).click();
  await firePreview();
  check(
    (await page.locator("[data-combat-mode]").inputValue()) === "digital",
    "and back to digital",
  );
  await page.keyboard.press("Escape");
  passed.push(
    "R5 Livia's 'Dardo di fuoco' slot with the bar on physical dice opens the Table's Fire Bolt preview with the combat bar's dice on 'Fisici'; back on digital it follows again",
  );

  // ------------------------------------------------ R6: EN phone 390 with skills
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
  await phone.locator('#battle-map [data-actor="mira"]').tap();
  await phone.waitForFunction(
    () => document.querySelector("[data-qb]")?.dataset.qbActor === "mira",
  );
  check(
    (await slot(4, phone).getAttribute("aria-label")).includes("Wisdom (Perception) check"),
    "EN skill slot",
  );
  await phone.locator("[data-qb-edit]").tap();
  const phoneSkills = phone.locator('.qb-tray-group[aria-label="Skills"]');
  check(await phoneSkills.count(), "EN skills group");
  await phoneSkills.locator('[data-qb-item="check:dex:skill:stealth"]').scrollIntoViewIfNeeded();
  check(await noOverflow(phone), "390 overflow with the tray");
  await shot("rf-r6-phone-skills-en.png", phone);
  await phoneSkills.locator('[data-qb-item="check:dex:skill:stealth"]').tap();
  await phone.waitForFunction(() =>
    [...document.querySelectorAll(".qb-slot")].some((n) =>
      n.getAttribute("aria-label")?.includes("Dexterity (Stealth) check"),
    ),
  );
  await phone.locator("[data-qb-edit-done]").tap();
  check(await noOverflow(phone), "390 overflow after");
  passed.push(
    "R6 EN phone 390: Mira's slot 5 reads 'Wisdom (Perception) check' (slot 4 is her Wild Shape); the tray has 'Skills'; tapping 'Dexterity (Stealth) check' adds it; no horizontal overflow",
  );
  await phoneContext.close();

  check(!errors.length, "Page errors: " + errors.join(" | "));
  await context.close();
  return { passed, errors };
}
