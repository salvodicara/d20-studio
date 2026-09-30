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
  // B62: Preparation sections are grouped (Scenes, Encounters, Materials, Sessions and
  // adventures); a section outside the open group is reached through «Tutte» (2 clicks).
  const openPrepSection = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const here = page.locator(`[data-prep-section="${id}"]`);
    if (await here.count()) return press(here.first());
    await press(page.locator("[data-prep-sections-all]"));
    await press(page.locator(`#dialog [data-prep-section-jump="${id}"]`));
  };
  // B19 — 2024 encounter builder in the one app, with real clicks, keys and touch.
  // Group 1: DM, IT, 1440: an increment-2 encounter prepared in the scene editor reopens in
  // the builder with its rolls; a new encounter with CR/type filters, four goblins on one
  // shared initiative, "Add again", staged "Rinforzi", in-place stat block edit with a
  // parsed action confirmed and rolled, hand-off (digital HP, Undo, physical HP), group
  // initiative with a reasoned correction, reload, start through Preparation's flow.
  // Group 2: Table: player view (aliases, staged hidden), DM drawer activates the
  // reinforcements mid-combat. Group 3: library Resume/Duplicate/Restart/history and
  // "Add all tokens". Group 4: isolated EN phone 390 with touch. Synthetic demo data only;
  // resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B19/";
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
  const slice = async (p = page) => (await stored(p)).ext["encounter-builder"];
  const content = (p = page) => p.locator("#content").innerText();
  const shot = async (name, locator = null) => {
    if (locator) await locator.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: dir + name });
  };
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const toast = (p = page) => p.locator("#toast").innerText();
  const submitDialog = async (p = page, tap = false) => {
    const button = p.locator("#dialog button[type=submit]");
    await (tap ? button.tap() : button.click());
  };
  // A row by its exact name (link selects list every block name as an option).
  const row = (text, p = page) =>
    p
      .locator(".eb-row")
      .filter({ has: p.locator(".eb-row-name", { hasText: new RegExp(`^${text}$`) }) })
      .first();
  const init = (text, p = page) => p.locator(".eb-init", { hasText: text }).first();
  // Keyboard focus after a command: the element's outerHTML start, or BODY when lost.
  const focused = (p = page) =>
    p.evaluate(() =>
      document.activeElement === document.body
        ? "BODY"
        : document.activeElement.outerHTML.slice(0, 160),
    );
  const scene = async (p = page) => (await stored(p)).scenes.find((s) => s.id === "old-watch");
  let step = "setup";
  const at = (name) => (step = name);
  try {
    // ------------------------------------------------------------ group 1: DM builder
    await page.goto(base + "#campaign");
    await page.evaluate((k) => {
      localStorage.removeItem(k);
      sessionStorage.clear();
    }, key);
    await page.reload();
    await page.locator("[data-campaign-tab]").first().waitFor();
    await role("dm");

    at("inc2-prep");
    // A prepared order saved outside the builder (PR-32: the scene editor's old list is gone;
    // the Table's start dialog saves each roll at once, Foundry Combat Tracker): Livia and the
    // Sentinel roll, then «Annulla l’avvio» leaves the saved order on the scene.
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.locator('[data-table="combat"]').click();
    await page.locator("[data-ct-start-dialog]").waitFor();
    const startIds = await page
      .locator("[data-ct-start-include]")
      .evaluateAll((els) => els.map((el) => el.dataset.ctStartInclude));
    for (const id of startIds) {
      const box = page.locator(`[data-ct-start-include="${id}"]`);
      if ((await box.isChecked()) !== ["livia", "goblin-1"].includes(id)) await box.click();
    }
    // The digital d20s land on 14 (Livia) and 9 (Sentinel), the faces this journey's later
    // order checks use: the page's random source gives that one face, then is restored.
    for (const [id, face] of [
      ["livia", 14],
      ["goblin-1", 9],
    ]) {
      await page.evaluate((n) => {
        const own = crypto.getRandomValues.bind(crypto);
        crypto.getRandomValues = (arr) => {
          crypto.getRandomValues = own;
          if (arr instanceof Uint32Array && arr.length === 1) {
            arr[0] = n - 1;
            return arr;
          }
          return own(arr);
        };
      }, face);
      await page.locator(`[data-ct-start-roll-one="${id}"]`).click();
      const layer = page.locator("[data-dice3d-layer]:not([hidden])");
      await layer.waitFor({ timeout: 600 }).catch(() => {});
      for (let i = 0; i < 6 && (await layer.count()); i++) await page.keyboard.press("Escape");
    }
    await page.locator("[data-ct-start-dialog] [data-ct-rollcall-close]").click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).scenes[0].encounter?.participants?.every(
          (p) => p.rollId,
        ),
      key,
    );
    const inc2 = JSON.parse(JSON.stringify((await scene()).encounter.participants));
    check(inc2.length === 2, "Increment-2 encounter not saved");

    at("open-builder");
    // Campaign → Preparazione → Incontri: two clicks from the campaign.
    await page.goto(base + "#campaign");
    await page.locator('[data-campaign-tab="preparation"]').click();
    await openPrepSection(page, "encounter-builder"); // B62: the Encounters group
    await page.locator('[data-eb-view="library"]').waitFor();
    check((await content()).includes("Chi ha riacceso la lanterna"), "Seed encounter missing");
    const sceneRow = page.locator('[data-eb-scene-encounter="old-watch"]');
    check(
      (await sceneRow.innerText()).includes("2 tiri registrati"),
      "Scene encounter rolls not listed",
    );
    await sceneRow.locator('[data-eb="import"]').click();
    await page.locator('[data-eb-view="editor"]').waitFor();
    check((await row("Livia").innerText()).includes("Gruppo"), "Livia not on the party side");
    // Game Master's Grimoire: link a stat block to the unnamed sentry.
    await row("Sentinella").locator("[data-eb-link]").selectOption({ label: "Guardia · GS 1/8" });
    await row("Sentinella").locator(".eb-linked").waitFor();
    check((await page.locator("[data-eb-xp]").innerText()) === "25", "Linked Guard XP missing");
    let sc = await scene();
    check(
      JSON.stringify(sc.encounter.participants) === JSON.stringify(inc2),
      "Reopening changed the prepared rolls",
    );
    passed.push(
      "4a. A scene's prepared order saved outside the builder (the Table's start dialog, 2 rolls) reopens in the builder via “Riprendi nel costruttore”; rolls untouched; Guard block linked to Sentinella",
    );

    at("acc1");
    // Acceptance 1: new encounter, campaign party, CR ≤ 1 + Humanoid, four goblins.
    await page.locator('[data-eb="back"]').click();
    await page.locator('[data-eb="new"]').click();
    await page.locator("[data-eb-name]").fill("Agguato al cortile");
    await page.locator("[data-eb-name]").press("Tab");
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["encounter-builder"].encounters.some(
          (e) => e.name === "Agguato al cortile",
        ),
      key,
    );
    check(
      (await page.locator(".eb-party").innerText()).includes(
        "Livia liv. 3 · Doran liv. 3 · Mira liv. 3",
      ),
      "Campaign party not shown",
    );
    // A person picking from a select focuses it first (Playwright's selectOption does not).
    await page.locator('[data-eb-filter="crMax"]').focus();
    await page.locator('[data-eb-filter="crMax"]').selectOption("1");
    check((await focused()).includes('data-eb-filter="crMax"'), "Focus lost after a filter");
    await page.locator('[data-eb-filter="type"]').selectOption("humanoid");
    await page.locator(".eb-chip", { hasText: "Umanoide" }).waitFor();
    check(
      !(await content()).includes("goblin sono Folletti"),
      "The card's note is still product text",
    );
    check((await page.locator("[data-eb-count]").innerText()) === "5 risultati", "Humanoid filter");
    check(
      (await page.locator(".eb-result").count()) === 5 &&
        !(await page.locator(".eb-results").innerText()).includes("Goblin"),
      "Goblins listed as Humanoid (2024: Fey)",
    );
    await shot("b19-01-filter-humanoid-it-1440.png", page.locator(".eb-bar"));
    await page.locator('[data-eb-filter="type"]').selectOption("fey");
    await page.locator('[data-eb-filter="q"]').fill("goblin guerriero");
    await page.locator('[data-eb-result="srd:srd2024:creature:goblin-warrior"]').waitFor();
    // "goblin guerriero" also finds the Hobgoblin guerriero (Fey, CR 1/2).
    await page.waitForFunction(() => document.querySelectorAll(".eb-result").length === 2);
    // Keyboard: Enter on the row name expands the block and keeps focus there; Enter on
    // "+ Aggiungi" adds the creature and keeps focus on the (now "Aggiungi di nuovo") button.
    await page
      .locator('[data-eb-result="srd:srd2024:creature:goblin-warrior"] [data-eb="expand"]')
      .focus();
    await page.keyboard.press("Enter");
    await page.locator(".eb-result-block .eb-block").waitFor();
    check(
      /data-eb="expand"[^>]*aria-expanded="true"/.test(await focused()),
      "Focus lost after expanding a row",
    );
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => !document.querySelector(".eb-result-block"));
    await page
      .locator('[data-eb-result="srd:srd2024:creature:goblin-warrior"] [data-eb="add"]')
      .focus();
    await page.keyboard.press("Enter");
    await row("Goblin guerriero").waitFor();
    check(
      /data-eb="add"[^>]*goblin-warrior/.test(await focused()),
      "Focus lost after Aggiungi: " + (await focused()),
    );
    for (let i = 0; i < 3; i++)
      await row("Goblin guerriero").locator('[data-eb="count"][data-delta="1"]').click();
    // Keyboard: Enter on the focused "+" adds one, Space on "−" removes it again.
    await row("Goblin guerriero").locator('[data-eb="count"][data-delta="1"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => document.querySelector("[data-eb-count-of]")?.textContent === "5",
    );
    await row("Goblin guerriero").locator('[data-eb="count"][data-delta="-1"]').focus();
    await page.keyboard.press("Space");
    await page.waitForFunction(
      () => document.querySelector("[data-eb-count-of]")?.textContent === "4",
    );
    check(
      (await row("Goblin guerriero").innerText()).includes("Iniziativa condivisa"),
      "Shared initiative badge",
    );
    // Kobold+ 2024 bands (CMP-106): 200 XP is under the Low budget (450) → Banale.
    check((await page.locator("[data-eb-band]").innerText()) === "Banale", "Band not Banale");
    // Final review P3: no research code in visible text; the bands are explained in words.
    check(
      /Fasce: sotto Facile è Banale/.test(await page.locator(".eb-source").innerText()),
      "Band source not cited",
    );
    check((await page.locator("[data-eb-xp]").innerText()) === "200", "XP not 200");
    const budget = await page.locator(".eb-budget").innerText();
    check(
      budget.includes("450") && budget.includes("675") && /1\.?200/.test(budget),
      "Budget 450/675/1200 missing",
    );
    check(
      (await page.locator(".eb-source").innerText()).includes("IT p. 230–231 · EN p. 202"),
      "Budget table source missing",
    );
    await shot("b19-02-four-goblins-it-1440.png", page.locator(".eb-bar"));
    passed.push(
      "1. New encounter, campaign party Livia/Doran/Mira lvl 3; CR ≤ 1 + Umanoide = 5 humanoids, no goblins (Fey in SRD 5.2.1); 4 Goblin guerriero (Enter on expand/Aggiungi keeps focus, + click, Enter/Space) → Banale (Kobold+ CMP-106), 200 PE of 450/675/1.200, source IT 230–231 · EN 202",
    );

    at("acc2");
    // Acceptance 2: "Aggiungi di nuovo" separates the initiative.
    const again = page.locator(
      '[data-eb-result="srd:srd2024:creature:goblin-warrior"] [data-eb="add"]',
    );
    check((await again.innerText()).includes("Aggiungi di nuovo"), "Add again label");
    await again.click();
    await page.locator(".eb-row .eb-separate").first().waitFor();
    check((await page.locator(".eb-row").count()) === 2, "Add again did not create a row");
    check((await page.locator("[data-eb-xp]").innerText()) === "250", "XP after add again");
    const second = page.locator(".eb-row").nth(1);
    await second.locator(".eb-row-more summary").click();
    await second.locator("[data-eb-row-side]").focus();
    await second.locator("[data-eb-row-side]").selectOption("neutral");
    await page.waitForFunction(
      () => document.querySelector(".eb-row:nth-child(2) [data-eb-row-side]")?.value === "neutral",
    );
    check(
      await page
        .locator(".eb-row")
        .nth(1)
        .locator(".eb-row-more")
        .evaluate((d) => d.open),
      "Options closed after a change",
    );
    check((await focused()).includes("data-eb-row-side"), "Focus lost after a row option");
    await page.locator(".eb-row").nth(1).locator('[data-eb="remove-row"]').click();
    await page.waitForFunction(() => document.querySelectorAll(".eb-row").length === 1);
    // Enter on a filter chip removes it; focus moves to the next chip, not to the page.
    await page.locator(".eb-chip").first().focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelectorAll(".eb-chip").length === 2);
    check((await focused()) !== "BODY", "Focus lost after removing a chip");
    passed.push(
      "2. +/− keeps one row with “Iniziativa condivisa”; “Aggiungi di nuovo” adds a row with “Iniziativa separata” (250 PE); Options → Lato keeps the panel open and focus on the select → Rimuovi; Enter on a chip keeps focus in the chip list",
    );

    at("acc3-builder");
    // Acceptance 3 (builder half): staged group "Rinforzi" with a bandit.
    await page.locator('[data-eb="group-add"]').click();
    check(
      (await page.locator('#dialog [name="name"]').inputValue()) === "Rinforzi",
      "Default name",
    );
    await submitDialog();
    await page.locator("[data-eb-group] h4", { hasText: "Rinforzi" }).waitFor();
    check(
      (await page.locator("[data-eb-target] option:checked").innerText()).includes("Rinforzi"),
      "Target",
    );
    await page.locator('[data-eb-filter="q"]').fill("");
    await page.locator('[data-eb-filter="type"]').selectOption("humanoid");
    await page.locator('[data-eb-result="srd:srd2024:creature:bandit"] [data-eb="add"]').click();
    const reinforcements = page.locator(".eb-group.staged");
    await reinforcements.locator(".eb-row", { hasText: "Bandito" }).waitFor();
    check((await reinforcements.innerText()).includes("In attesa"), "Staged badge");
    check((await page.locator("[data-eb-xp]").innerText()) === "225", "Staged XP counted");
    const notes = page.locator(".eb-notes");
    if (!(await notes.evaluate((el) => el.open))) await notes.locator("summary").click();
    await page.locator('[data-eb-note="readAloud"]').fill("Frecce sibilano dal buio del cortile!");
    await page.locator('[data-eb-note="readAloud"]').press("Tab");
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["encounter-builder"].encounters.some((e) =>
          e.notes.readAloud.startsWith("Frecce"),
        ),
      key,
    );

    at("skeleton-block");
    // The complete 2024 block: defenses, condition immunities and gear (PR-42).
    await page.locator('[data-eb-filter="type"]').selectOption("");
    await page.locator('[data-eb-filter="q"]').fill("schel");
    await page.waitForFunction(() => document.querySelectorAll(".eb-result").length === 1);
    await page.locator('.eb-result [data-eb="expand"]').click();
    const skeleton = page.locator(".eb-result-block .eb-block");
    await skeleton.waitFor();
    const skeletonText = await skeleton.innerText();
    check(
      [
        "Vulnerabilità",
        "Contundente",
        "Immunità",
        "Veleno; Indebolimento, Avvelenato",
        "Equipaggiamento",
        "Arco corto, Spada corta",
      ].every((w) => skeletonText.includes(w)),
      "Skeleton block misses defenses or gear: " + skeletonText,
    );
    await shot("b19-12-skeleton-block-it-1440.png", skeleton);
    await page.locator('.eb-result [data-eb="expand"]').click();
    await page.locator('[data-eb-filter="q"]').fill("");
    passed.push(
      "PR-42 fix: Scheletro block shows Vulnerabilità Contundente, Immunità Veleno; Indebolimento, Avvelenato and Equipaggiamento Arco corto, Spada corta",
    );

    at("acc7-block");
    // Acceptance 7: full 2024 stat block, in-place edit, parsed action confirmed and rolled.
    await row("Goblin guerriero").locator('[data-eb="block"]').click();
    const rowBlock = page.locator(".eb-row-block");
    await rowBlock.waitFor();
    const blockText = await rowBlock.innerText();
    check(
      [
        "CA",
        "Iniziativa",
        "PF",
        "Velocità",
        "GS",
        "Scimitarra",
        "Arco corto",
        "Equipaggiamento",
        "Fuga agile",
        "SRD 5.2.1 · IT p. 340",
      ].every((word) => blockText.includes(word)),
      "2024 stat block incomplete",
    );
    await rowBlock.locator('[data-eb="block-edit"]').click();
    await rowBlock.locator('[data-eb-block-form] [name="name"]').waitFor();
    await page.keyboard.press("Escape");
    await rowBlock.locator('[data-eb="block-edit"]').waitFor();
    check((await slice()).blocks.length === 0, "Escape saved the edit");
    await rowBlock.locator('[data-eb="block-edit"]').click();
    const editForm = rowBlock.locator("[data-eb-block-form]");
    await editForm.locator('[name="ac"]').fill("16");
    // Every section edits in place (R20-102): defenses, senses, languages, gear, bonus actions.
    check(
      (await editForm.locator('[name="bonusActions-name-nimble-escape"]').count()) === 1 &&
        (await editForm.locator('[name="skills"]').count()) === 1 &&
        (await editForm.locator('[name="save-dex"]').count()) === 1,
      "Block sections not editable",
    );
    await editForm.locator(".eb-edit-more summary").click();
    await editForm.locator('[name="resistances"][value="fire"]').check();
    check(
      (await editForm.locator('[name="gear"]:checked').count()) === 4,
      "Gear not listed in the edit form",
    );
    await editForm
      .locator('[name="action-text-scimitar"]')
      .fill(
        "Tiro per colpire in mischia: +5, portata 1,5 m. Colpito: 6 (1d8 + 2) danni taglienti.",
      );
    await editForm.locator('[name="action-name-scimitar"]').fill("Falcetto");
    await editForm.locator('[name="name"]').fill("Goblin della lanterna");
    await editForm.locator('[name="name"]').press("Enter");
    const proposal = rowBlock.locator('[data-eb-proposal="scimitar"]');
    await proposal.waitFor();
    check(
      (await proposal.innerText()).includes(
        "Attacco in mischia +5 · portata 1,5 m · 1d8+2 Tagliente",
      ),
      "Parsed proposal text",
    );
    check(
      (await rowBlock.locator('[data-eb-roll*="scimitar"]').count()) === 0,
      "Unconfirmed text is already rollable",
    );
    await proposal.locator('[data-eb="action-confirm"]').click();
    const hit = rowBlock.locator('.eb-roll[data-eb-roll*="attack"][data-eb-roll*="scimitar"]');
    await hit.waitFor();
    check((await hit.innerText()).includes("Colpire +5"), "Confirmed attack button");
    await hit.click();
    await page.locator('#dialog [name="dieMode"][value="physical"]').check();
    await page.locator('#dialog [name="face-0"]').fill("12");
    await submitDialog();
    await rowBlock.locator("[data-eb-last-roll]").waitFor();
    check(
      (await rowBlock.locator("[data-eb-last-roll]").innerText()).includes(
        "1d20 + 5 → [12] = 17 · dado fisico",
      ),
      "Physical roll not recorded",
    );
    let data = await slice();
    const custom = data.blocks[0];
    check(
      custom.name.it === "Goblin della lanterna" && custom.ac === 16 && custom.revision === 2,
      "Block",
    );
    check(
      custom.resistances.includes("fire") &&
        (await rowBlock.innerText()).includes("Resistenze") &&
        custom.actions.find((a) => a.id === "scimitar").summary.en ===
          custom.actions.find((a) => a.id === "scimitar").summary.it,
      "Resistance or one-language text not saved",
    );
    check(
      (await stored()).ext["compendium-rolls"].rolls.at(-1).total === 17,
      "Roll missing from the roll log",
    );
    await shot("b19-03-statblock-edit-roll-it-1440.png", rowBlock);
    passed.push(
      "7. Full 2024 block (SRD IT p. 340, Gear, Bonus Actions) → Modifica in linea (Escape discards, Enter saves; saves, skills, bonus actions, defenses and gear editable; Fuoco resistance added) → custom block rev. 2; changed text parsed to “Attacco in mischia +5 · portata 1,5 m · 1d8+2”, stored for both languages, not rollable until “Conferma azione”; physical d20 12 → 17 in the roll log",
    );

    at("acc5-handoff");
    // Acceptance 5: hand-off. Digital HP first, then Undo, then physical HP.
    await rowBlock.locator('[data-eb="row-block-close"]').click();
    const before = (await scene()).tokens.length;
    await page.locator('[data-eb-ho="hpMode"][value="digital"]').check();
    await page.locator('[data-eb="handoff"]').click();
    await page.locator("[data-eb-prepared]").waitFor();
    sc = await scene();
    check(sc.tokens.length === before + 5, "Digital hand-off did not place 5 tokens");
    data = await slice();
    let encounter = data.encounters.find((e) => e.name === "Agguato al cortile");
    check(
      encounter.handoff.copies.every((c) => c.hpRoll?.mode === "digital" && c.hpRoll.faces.length),
      "Digital HP not recorded",
    );
    await page.locator('[data-eb="undo"]').click();
    await page.locator('[data-eb="handoff"]').waitFor();
    check((await scene()).tokens.length === before, "Undo left tokens on the scene");
    check(
      (await slice()).encounters.find((e) => e.name === "Agguato al cortile").handoff === null,
      "Undo left the hand-off",
    );
    await page.locator('[data-eb-ho="hpMode"][value="physical"]').check();
    await page.locator('[data-eb="handoff"]').click();
    const faces = page.locator('#dialog input[name^="hp-"]');
    await faces.first().waitFor();
    check((await faces.count()) === 4 * 3 + 2, "Physical HP dice inputs (4 × 3d6 + 2d8)");
    for (let i = 0; i < (await faces.count()); i++) await faces.nth(i).fill("4");
    await submitDialog();
    await page.locator("[data-eb-prepared]").waitFor();
    data = await stored();
    encounter = data.ext["encounter-builder"].encounters.find(
      (e) => e.name === "Agguato al cortile",
    );
    const names = data.ext["token-menu"].names;
    const goblinCopies = encounter.handoff.copies.filter((c) => c.rowId === encounter.rows[0].id);
    check(
      goblinCopies.map((c) => names[c.actorId]?.trueName).join() ===
        "Goblin della lanterna 1,Goblin della lanterna 2,Goblin della lanterna 3,Goblin della lanterna 4",
      "Numbered true names",
    );
    check(
      goblinCopies.every((c) => /^Creatura sconosciuta \d+$/.test(data.actors[c.actorId].name)),
      "Names not hidden from players",
    );
    check(
      goblinCopies.every((c) => c.hp === 12 && c.hpRoll.mode === "physical"),
      "Physical HP (4+4+4) not applied",
    );
    check(
      data.actors[goblinCopies[0].actorId].combatProfile.meleeAttack.name.it === "Falcetto",
      "Confirmed action not the combat attack",
    );
    const banditCopy = encounter.handoff.copies.find((c) => c.rowId !== encounter.rows[0].id);
    sc = data.scenes.find((s) => s.id === "old-watch");
    check(
      sc.tokens.find((t) => t.actorId === banditCopy.actorId).hidden === true,
      "Staged not hidden",
    );
    for (const prior of inc2) {
      const now = sc.encounter.participants.find((p) => p.actorId === prior.actorId);
      check(
        now.natural === prior.natural && now.rollId === prior.rollId,
        "Hand-off lost an increment-2 roll",
      );
    }
    await page.locator(".eb-copies summary").click();
    const copiesText = await page.locator(".eb-copies").innerText();
    check(copiesText.includes("i giocatori vedono"), "Copies list does not show the alias");
    passed.push(
      "5. Prepara nella scena: digital HP → Annulla restores the scene → physical HP dialog (14 faces) → 4 “Goblin della lanterna 1–4” (players see “Creatura sconosciuta N”), 12 HP from 3d6 faces 4+4+4, Falcetto as combat attack, bandit token hidden, increment-2 rolls kept",
    );

    at("initiative");
    // Group initiative: one d20 for the four goblins, reasoned physical correction; then the
    // review's reproduction (goblins 3+2, Doran 20, Mira 12, Livia's 14+2 from increment 2):
    // the list and the prepared order follow the totals.
    const goblinInit = () => init("Goblin della lanterna ×4");
    const goblinTotal = () => goblinInit().locator("[data-eb-init-total]").innerText();
    await goblinInit().locator('[data-eb="init-roll"]').click();
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".eb-init")].some(
        (li) =>
          li.textContent.includes("Goblin della lanterna ×4") &&
          !li.querySelector("[data-eb-init-total]").textContent.includes("Da tirare"),
      ),
    );
    check((await focused()).includes('data-eb="init-roll"'), "Focus lost after Tira d20");
    data = await stored();
    const goblinRolls = data.initiativeRolls.filter((r) =>
      goblinCopies.some((c) => c.actorId === r.actorId),
    );
    check(
      goblinRolls.length === 4 &&
        new Set(goblinRolls.map((r) => r.natural)).size === 1 &&
        new Set(goblinRolls.map((r) => r.sharedGroup)).size === 1,
      "Group initiative is not one shared roll",
    );
    check(
      (await init("Doran").locator('[name="advantage"] option').allTextContents()).join() ===
        "Normale,Vantaggio,Svantaggio",
      "No Advantage/Disadvantage choice",
    );
    const gForm = goblinInit().locator("form");
    await gForm.locator(".eb-init-fix summary").click();
    await gForm.locator('[name="natural"]').fill("3");
    await gForm.locator('button[type="submit"]').click();
    check((await toast()).includes("motivo"), "Correction without reason accepted");
    await gForm.locator('[name="natural"]').fill("3");
    await gForm.locator('[name="reason"]').fill("Il dado è caduto dal tavolo");
    await gForm.locator('button[type="submit"]').click();
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".eb-init")].some(
        (li) =>
          li.textContent.includes("Goblin della lanterna ×4") &&
          li.querySelector("[data-eb-init-total]").textContent.startsWith("3 + (2) = 5"),
      ),
    );
    for (const [who, natural] of [
      ["Doran", "20"],
      ["Mira", "12"],
    ]) {
      await init(who).locator('[name="natural"]').fill(natural);
      await init(who).locator('button[type="submit"]').click();
      await page.waitForFunction(
        (n) =>
          [...document.querySelectorAll("[data-eb-init-total]")].some((o) =>
            o.textContent.startsWith(`${n} + (0)`),
          ),
        natural,
      );
    }
    check((await init("Livia").innerText()).includes("14 + (2) = 16"), "Livia's roll lost");
    const listed = await page.locator(".eb-init .eb-init-head strong").allTextContents();
    check(
      listed.join(" | ") === "Doran | Livia | Mira | Sentinella | Goblin della lanterna ×4",
      "Builder initiative list not in total order: " + listed.join(" | "),
    );
    data = await stored();
    const preparedOrder = data.scenes[0].encounter.participants.map((p) => p.actorId);
    check(
      JSON.stringify(preparedOrder) ===
        JSON.stringify([
          "doran",
          "livia",
          "mira",
          "goblin-1",
          ...goblinCopies.map((c) => c.actorId),
        ]),
      "Prepared order not sorted: " + preparedOrder.join(","),
    );
    check(
      data.initiativeRolls.filter(
        (r) => r.kind === "correction" && r.reason === "Il dado è caduto dal tavolo",
      ).length === 4,
      "Correction reason not in the ledger",
    );
    await page.reload();
    // The demo identity is not persisted: a reload starts as the player again.
    await page.locator("#demo-role").waitFor();
    await role("dm");
    await page.locator('[data-eb-view="editor"]').waitFor();
    check((await goblinTotal()).includes("3 + (2) = 5"), "Reload lost initiative");
    check(
      (await page.locator("[data-eb-name]").inputValue()) === "Agguato al cortile",
      "Reload lost the editor",
    );
    await shot("b19-04-handoff-initiative-it-1440.png", page.locator(".eb-initiative"));
    passed.push(
      "Initiative: “Tira d20” once for Goblin ×4 (4 ledger entries, one sharedGroup, focus kept); physical 3 refused without reason, accepted with reason (4 corrections); Doran 20 and Mira 12 physical; Livia’s 14+2 kept; the list and the scene's prepared order read Doran 20, Livia 16, Mira 12, Sentinella 11, Goblins 5; reload keeps editor and rolls",
    );

    at("start");
    // Start through the existing Preparation flow (ctx.startEncounter).
    await page.locator('.eb-handoff [data-eb="start"]').click();
    await page.locator("#dialog", { hasText: "Inizia combattimento" }).waitFor();
    // P5 (TV-45): the Table start dialog lists the participants by total, one row each.
    const startList = await page
      .locator("#dialog [data-ct-start-row].is-included .ct-start-who strong")
      .allTextContents();
    check(startList[0] === "Doran" && startList[1] === "Livia", "Start dialog order: " + startList);
    await shot("b19-10-start-dialog-sorted-it-1440.png");
    await submitDialog();
    await page.locator("#battle-map").waitFor();
    data = await stored();
    check(
      data.combat.active &&
        JSON.stringify(data.combat.order) === JSON.stringify(preparedOrder) &&
        data.combat.order[data.combat.turn] === "doran",
      "Combat order not the sorted prepared order: " + data.combat.order.join(","),
    );
    // Auto-placed tokens: off the courtyard's drawn walls, labels apart (the review's P3).
    const walls = [
      [
        [90, 70],
        [910, 70],
      ],
      [
        [910, 70],
        [910, 580],
      ],
      [
        [910, 580],
        [90, 580],
      ],
      [
        [90, 580],
        [90, 70],
      ],
      [
        [340, 70],
        [340, 200],
      ],
      [
        [340, 200],
        [90, 200],
      ],
      [
        [660, 580],
        [660, 450],
      ],
      [
        [660, 450],
        [910, 450],
      ],
    ];
    const wallDistance = (p, [[ax, ay], [bx, by]]) => {
      const dx = bx - ax,
        dy = by - ay;
      const t = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(p.x - (ax + t * dx), p.y - (ay + t * dy));
    };
    const placed = [...goblinCopies, banditCopy].map((c) =>
      data.scenes[0].tokens.find((t) => t.actorId === c.actorId),
    );
    check(
      placed.every(
        (t) =>
          walls.every((w) => wallDistance(t, w) >= 37.5) &&
          t.x > 90 &&
          t.x < 910 &&
          t.y > 70 &&
          t.y < 580,
      ),
      "A token sits on a wall or outside the courtyard: " +
        placed.map((t) => `${t.x},${t.y}`).join(" "),
    );
    check(
      placed.every((a) =>
        placed.every((b) => a === b || Math.abs(a.y - b.y) >= 95 || Math.abs(a.x - b.x) >= 177),
      ),
      "Token labels overlap: " + placed.map((t) => `${t.x},${t.y}`).join(" "),
    );
    check(!data.combat.order.includes(banditCopy.actorId), "Staged bandit already in the order");
    await page.locator(`.map-token[data-actor="${goblinCopies[0].actorId}"]`).click();
    await page.locator("#content button", { hasText: "Falcetto" }).first().waitFor();
    passed.push(
      "Avvia combattimento… → Preparation’s start dialog lists Doran, Livia… (sorted) → Table; combat.order = the sorted prepared order, turn on Doran; bandit not in it; auto-placed tokens off the drawn walls with labels apart; a selected goblin’s combat actions offer “Falcetto”",
    );

    at("player-drawer");
    // ------------------------------------------------------------ group 2: player and drawer
    await role("player");
    await page.locator("#battle-map").waitFor();
    const playerNames = await page.locator(".map-token .token-name").allTextContents();
    check(
      playerNames.filter((n) => n.startsWith("Creatura sconosciuta")).length >= 4 &&
        !playerNames.some((n) => n.includes("Goblin della lanterna") || n.includes("Bandito")),
      "Player sees true names or the staged bandit",
    );
    check(
      (await page.locator('[data-table-drawer="encounter-builder"]').count()) === 0,
      "Player drawer",
    );
    await shot("b19-05-player-table-it-1440.png");
    await role("dm");
    await openTablePanel(page, "encounter-builder"); // B62: Combat › Encounter
    const drawer = page.locator('[data-ext-slot="table-panel:encounter-builder"]');
    await drawer.waitFor();
    check(
      (await drawer.innerText()).includes("Frecce sibilano dal buio del cortile!"),
      "Read-aloud",
    );
    const turnBefore = (await stored()).combat.order[(await stored()).combat.turn];
    await drawer.locator("[data-eb-activate]").click();
    await page.locator('#dialog [value="physical"]').check();
    await page.locator('#dialog input[name^="natural-"]').fill("18");
    await submitDialog();
    await drawer.locator("[data-eb-arrived]").waitFor();
    data = await stored();
    check(data.combat.order.includes(banditCopy.actorId), "Bandit did not join the order");
    check(
      data.combat.order[data.combat.turn] === turnBefore,
      "Activation changed the current turn",
    );
    const banditIndex = data.combat.order.indexOf(banditCopy.actorId);
    const totals = data.combat.initiative.reduce(
      (m, r) => ((m[r.actorId] = r.natural + r.bonus), m),
      {},
    );
    check(
      data.combat.order
        .slice(0, banditIndex)
        .every((id) => totals[id] === undefined || totals[id] >= 19),
      "Bandit (18+1) placed after a lower total",
    );
    check(
      banditIndex === 1 && data.combat.order[0] === "doran",
      "Bandit (19) not right after Doran (20): " + data.combat.order.join(","),
    );
    check(
      data.scenes[0].tokens.find((t) => t.actorId === banditCopy.actorId).hidden === false,
      "Bandit token still hidden",
    );
    await shot("b19-06-drawer-activated-it-1440.png");
    await role("player");
    await page.locator("#battle-map").waitFor();
    check(
      (await page.locator(`.map-token[data-actor="${banditCopy.actorId}"]`).count()) === 1,
      "Player does not see the activated bandit",
    );
    await role("dm");
    passed.push(
      "3/5. Player: 4+ “Creatura sconosciuta” tokens, no true names, no staged bandit, no drawer. DM drawer “Incontro”: read-aloud, “Attiva gruppo…” physical 18 → bandit (19) joins at position 2, right after Doran (20), turn unchanged; player then sees it",
    );

    at("library");
    // ------------------------------------------------------------ group 3: library and board
    await page.goto(base + "#preparation?tab=encounter-builder");
    await page.locator(".eb").first().waitFor();
    if (await page.locator('[data-eb="back"]').count())
      await page.locator('[data-eb="back"]').click();
    const ambush = page.locator(".eb-lib-row").filter({
      has: page.getByRole("heading", { name: "Agguato al cortile", exact: true }),
    });
    check((await ambush.innerText()).includes("In corso"), "Running status");
    await ambush.locator('[data-eb="resume"]').click();
    await page.locator("#battle-map").waitFor();
    await page.locator('[data-table="combat"]').click();
    await submitDialog();
    await page.waitForFunction((k) => !JSON.parse(localStorage.getItem(k)).combat.active, key);
    await page.goto(base + "#preparation?tab=encounter-builder");
    await page.locator('[data-eb-view="library"]').waitFor();
    await ambush.locator(".eb-menu summary").click();
    await ambush.locator('[data-eb="duplicate"]').click();
    await page.locator(".eb-lib-row", { hasText: "Agguato al cortile (copia)" }).waitFor();
    const oldCopies = (await slice()).encounters
      .find((e) => e.name === "Agguato al cortile")
      .handoff.copies.map((c) => c.actorId);
    const beforeRestart = await stored();
    const ledgerBefore = beforeRestart.initiativeRolls.length;
    const aliasesBefore = oldCopies.map((id) => beforeRestart.actors[id].name);
    await ambush.locator(".eb-menu summary").click();
    await ambush.locator('[data-eb="restart"]').click();
    // DDB Restart with physical HP dice (average, digital and physical are offered).
    check(
      (await page.locator('#dialog [name="hpMode"]').count()) === 3,
      "Restart does not offer physical dice",
    );
    await page.locator('#dialog [name="hpMode"][value="physical"]').check();
    await submitDialog();
    await page.locator("#dialog", { hasText: "dadi fisici" }).waitFor();
    const restartFaces = page.locator('#dialog input[name^="hp-"]');
    check((await restartFaces.count()) === 4 * 3 + 2, "Restart dice inputs (4 × 3d6 + 2d8)");
    for (let i = 0; i < (await restartFaces.count()); i++) await restartFaces.nth(i).fill("2");
    await shot("b19-13-restart-physical-it-1440.png");
    await submitDialog();
    await page.locator(".eb-history summary").waitFor();
    data = await stored();
    const restarted = data.ext["encounter-builder"].encounters.find(
      (e) => e.name === "Agguato al cortile",
    );
    check(
      JSON.stringify(restarted.handoff.copies.map((c) => c.actorId).sort()) ===
        JSON.stringify([...oldCopies].sort()) &&
        oldCopies.every((id) => data.scenes[0].tokens.some((t) => t.actorId === id)),
      "Restart did not bring the same creatures back in place",
    );
    check(
      restarted.handoff.copies.every((c) => c.hp === 6 && c.hpRoll?.mode === "physical") &&
        oldCopies.every((id) => data.actors[id].hp === 6),
      "Physical restart HP not applied",
    );
    check(
      JSON.stringify(oldCopies.map((id) => data.actors[id].name)) === JSON.stringify(aliasesBefore),
      "Aliases changed on restart",
    );
    const pcs = data.scenes[0].encounter.participants.filter((p) =>
      ["livia", "doran", "mira"].includes(p.actorId),
    );
    check(
      pcs.map((p) => p.natural).join() === "20,14,12",
      "Restart wiped the characters' rolls: " + pcs.map((p) => p.natural).join(),
    );
    check(restarted.groups.find((g) => g.name === "Rinforzi").staged, "Restart did not re-stage");
    check(data.initiativeRolls.length === ledgerBefore, "Restart dropped ledger entries");
    await shot("b19-07-library-it-1440.png");
    // Encounter treasure into the loot area's parcels (B26), one per creature with gear.
    await ambush.locator('[data-eb="open"]').first().click();
    await page.locator('[data-eb="treasure"]').click();
    await page.locator("#toast", { hasText: "pacchetti di bottino" }).waitFor();
    data = await stored();
    const lootParcels = data.ext.loot.parcels.filter((p) =>
      restarted.handoff.copies.some((c) => c.actorId === p.sourceActorId),
    );
    check(
      lootParcels.length === 5 && lootParcels.every((p) => !p.revealed && p.items.length),
      "Encounter loot parcels not prepared",
    );
    await page.locator('[data-eb="back"]').click();
    passed.push(
      "4. Library: “In corso” → Riprendi opens the Table; after ending combat, Duplica makes “(copia)”; Riavvia… with physical dice (14 faces of 2) brings the same 5 creatures back in place at 6 HP, aliases unchanged, re-stages Rinforzi, keeps Doran/Livia/Mira's rolls and the ledger, adds a Cronologia entry; “Prepara il bottino” makes 5 hidden loot parcels tied to the creatures",
    );

    at("acc6-tokens");
    // Acceptance 6: from the Table, "Aggiungi tutte le pedine" with sides.
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    // B61: "Incontro" is a sidebar tab remembered per identity: open it only if closed.
    await openTablePanel(page, "encounter-builder"); // B62: reopens only if closed
    const tokensDrawer = page.locator('[data-ext-slot="table-panel:encounter-builder"]');
    await tokensDrawer.locator("[data-eb-all-tokens]").click();
    await page.locator("#toast", { hasText: "creato da" }).waitFor();
    // DDB-134: the map stays open and the drawer shows the scene's encounter.
    check(
      page.url().includes("#table") && (await page.locator("#battle-map").count()) === 1,
      "Add all tokens left the Table",
    );
    if (!(await tokensDrawer.isVisible())) await openTablePanel(page, "encounter-builder");
    await tokensDrawer.locator("text=Incontro: Il cortile dell’osservatorio").first().waitFor();
    check((await focused()).includes("data-eb-all-tokens"), "Focus lost after Add all tokens");
    await tokensDrawer.locator("[data-eb-all-tokens]").click();
    await page.locator("#toast", { hasText: "già nell’incontro" }).waitFor();
    data = await stored();
    const boardEncounters = data.ext["encounter-builder"].encounters.filter(
      (e) => e.handoff?.fromTokens,
    );
    check(boardEncounters.length === 1, "A second click made a second encounter");
    check(
      ["goblin-1", "goblin-2", "livia", "doran", "mira"].every((id) =>
        data.scenes[0].encounter.participants.some((p) => p.actorId === id),
      ),
      "Board creatures not in the prepared initiative",
    );
    const boardArticle = tokensDrawer.locator(
      `[data-eb-drawer-encounter="${boardEncounters[0].id}"]`,
    );
    await boardArticle.locator(".eb-drawer-blocks summary").click();
    check(
      (await boardArticle.locator(".eb-drawer-blocks").innerText()).includes("Resistenze"),
      "Drawer stat blocks miss the custom block's defenses",
    );
    await shot("b19-11-drawer-from-tokens-it-1440.png");
    await boardArticle.locator("[data-eb-open-builder]").click();
    await page.locator('[data-eb-view="editor"]').waitFor();
    check(
      (await page.locator(".eb-bar .eb-status").innerText()) === "Preparato",
      "Board encounter not prepared",
    );
    check(
      (await init("Esploratore").count()) === 1 && (await init("Sentinella").count()) === 1,
      "Board encounter's initiative list misses its own creatures",
    );
    const partyText = await page.locator(".eb-party").innerText();
    check(
      partyText.includes("Dalle pedine della scena") && partyText.includes("Mira"),
      "Party from tokens",
    );
    check((await row("Esploratore").innerText()).includes("caricato dal nome"), "Name auto-load");
    check((await row("Livia").innerText()).includes("Gruppo"), "Party side");
    check((await row("Sentinella").innerText()).includes("Nemici"), "Enemies side");
    check(
      (await page.locator("[data-eb-unknown]").innerText()).includes("Sentinella"),
      "Unknown XP",
    );
    await shot("b19-08-from-tokens-it-1440.png", page.locator(".eb-bar"));
    passed.push(
      "6. Table drawer → “Aggiungi tutte le pedine” stays on the map (focus kept), the drawer lists “Incontro: Il cortile dell’osservatorio” with its stat blocks; a second click is refused (“già nell’incontro”), still one board encounter; board creatures in the prepared initiative; “Apri nel costruttore” → Preparato, its own Esploratore/Sentinella in the list, Gruppo (Livia, Doran, Mira), Nemici; “Esploratore” loaded from the name; Sentinella without CR outside the total",
    );
    check(await noOverflow(), "Desktop builder overflows");

    at("phone");
    // ------------------------------------------------------------ group 4: EN phone, touch
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    const phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const phone = await phoneContext.newPage();
    phone.on("pageerror", (error) => errors.push("phone: " + error.message));
    await phone.goto(base + "#campaign");
    await phone.evaluate(([k, v]) => localStorage.setItem(k, v), [key, snapshot]);
    await phone.reload();
    await phone.locator("[data-campaign-tab]").first().waitFor();
    await phone.locator('[data-service="preferences"]').tap();
    await phone.locator('#dialog [name="lang"]').selectOption("en");
    await submitDialog(phone, true);
    await role("dm", phone);
    await phone.goto(base + "#preparation?tab=encounter-builder");
    await phone.locator('[data-eb-view="library"]').waitFor();
    check((await content(phone)).includes("My encounters"), "EN library");
    check(await noOverflow(phone), "Phone library overflows");
    await phone.locator('[data-eb="new"]').tap();
    await phone.locator('[data-eb-view="editor"]').waitFor();
    await phone.locator('[data-eb-filter="q"]').fill("minion");
    await phone.waitForFunction(() => document.querySelectorAll(".eb-result").length === 1);
    await phone.locator(".eb-result .eb-result-name").tap();
    await phone.locator(".eb-result-block .eb-block").waitFor();
    check(await noOverflow(phone), "Phone stat block overflows");
    await phone.locator('.eb-result [data-eb="add"]').tap();
    await phone.locator(".eb-row", { hasText: "Goblin Minion" }).waitFor();
    await phone.locator('.eb-row [data-eb="count"][data-delta="1"]').tap();
    await phone.waitForFunction(
      () => document.querySelector("[data-eb-count-of]")?.textContent === "2",
    );
    // 50 XP under the Low budget (450): Kobold+'s Trivial.
    check((await phone.locator("[data-eb-band]").innerText()) === "Trivial", "EN band");
    // The Italian-edited custom block reads as one wording in English, marked, no stale text.
    await phone.locator('.eb-result [data-eb="expand"][aria-expanded="true"]').tap();
    await phone.waitForFunction(() => !document.querySelector(".eb-result-block"));
    await phone.locator('[data-eb-filter="q"]').fill("lantern");
    const lanternRow = phone.locator('.eb-result[data-eb-result^="block:"]');
    await lanternRow.waitFor();
    await lanternRow.locator(".eb-result-name").tap();
    const lantern = lanternRow.locator(".eb-result-block .eb-block");
    await lantern.waitFor();
    check(
      (await lantern
        .locator('[data-eb-action="scimitar"] [data-eb-text-lang="it"]')
        .innerText()) === "text in Italian" &&
        !(await lantern.innerText()).includes("Hit: 5 (1d6 + 2)"),
      "EN view of an IT edit is stale or unmarked",
    );
    check(await noOverflow(phone), "Phone custom block overflows");
    await lanternRow.locator(".eb-result-name").tap();
    await phone.locator('[data-eb="handoff"]').tap();
    await phone.locator("[data-eb-prepared]").waitFor();
    check((await content(phone)).includes("2 creatures created"), "EN hand-off");
    check(await noOverflow(phone), "Phone editor overflows");
    await phone.screenshot({ path: dir + "b19-09-phone-en-390.png", fullPage: false });
    await role("player", phone);
    await phone.goto(base + "#table");
    await phone.locator("#battle-map").waitFor();
    check(!(await content(phone)).includes("Goblin Minion"), "Phone player sees a hidden name");
    check(
      (await phone.locator('[data-table-drawer="encounter-builder"]').count()) === 0,
      "Phone drawer",
    );
    check(await noOverflow(phone), "Phone player table overflows");
    await phoneContext.close();
    passed.push(
      "Phone EN 390 touch: My encounters, New encounter, search “minion”, tap row → stat block, Add, + → 2, band “Trivial”; the IT-edited “Goblin della lanterna” shows its Falcetto text marked “text in Italian” with no stale English numbers; Prepare on the scene → “2 creatures created”; player Table hides the names; no horizontal overflow",
    );

    check(!errors.length, "Page errors: " + errors.join(" | "));
  } catch (error) {
    await page.screenshot({ path: dir + "b19-failure.png" }).catch(() => {});
    throw Error(`[${step}] after ${passed.length} checks: ${error.message}`);
  }
  await context.close();
  return { passed: passed.length, checks: passed, errors };
};
