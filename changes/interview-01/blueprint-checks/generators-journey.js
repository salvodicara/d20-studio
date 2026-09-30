async (rootPage) => {
  // B57 assisted procedural generators: the card's acceptance checks with real clicks, keys
  // and touch. IT desktop 1440 as DM and player, then EN phone 390 with touch. Resets this
  // browser's synthetic demo state. Screenshots go to the dated evidence folder.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B57-rf/";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const context = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const dialog = page.locator("#dialog");
  const panel = page.locator("#dialog [data-gen-panel]");
  const role = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForTimeout(150);
  };
  const toPreparation = async () => {
    await page.goto(base + "#campaign");
    await page.locator('[data-campaign-tab="preparation"]').click();
    await page.locator(".prep-collection").waitFor();
  };
  const openPanel = async (label = "Genera…") => {
    await page.locator("[data-prep-command]", { hasText: label }).click();
    await panel.waitFor();
  };
  const kind = async (id) => {
    await panel.locator(`[data-gen-kind="${id}"]`).click();
    await panel.locator(`[data-gen-view="${id}"]`).waitFor();
  };
  const seed = async (value) => {
    const input = panel.locator("[data-gen-seed]");
    await input.fill(value);
    await input.press("Enter");
    await page.waitForFunction(
      (v) => document.querySelector("#dialog [data-gen-seed]")?.value === v,
      value,
    );
  };
  const noOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  // Area warnings (registry report): other areas may report theirs; none may be ours.
  const areaWarnings = async (where) => {
    const link = page.locator("text=/\\d+ con avvisi/");
    if (!(await link.count())) return;
    await link.first().click();
    await dialog.waitFor();
    const report = await dialog.innerText();
    passed.push(
      `Registry warnings at ${where} (other areas): ` + report.replace(/\s+/g, " ").slice(0, 700),
    );
    check(!/generat/i.test(report), "Generator warning: " + report);
    await dialog.locator("footer [data-close]").click();
  };
  const shot = async (name, target = null) => {
    if (target) await target.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: shots + name, fullPage: false });
  };

  await page.goto(base);
  await page.evaluate((k) => {
    localStorage.removeItem(k);
    sessionStorage.clear();
  }, key);
  await page.reload();
  await page.locator("#demo-role").waitFor();

  // (0) The player has no generator: Preparation is reserved and no create command exists.
  await role("player");
  await page.goto(base + "#preparation");
  await page.locator(".empty-state", { hasText: "Preparazione riservata ai DM" }).waitFor();
  check(!(await page.locator("[data-prep-command]").count()), "Player sees a generator button");
  await role("dm");

  // (1) Entry point inside Preparation (beside «Nuova scena», not a new tab or header row).
  await toPreparation();
  const heading = page.locator(".prep-collection .page-heading");
  const buttons = await heading.locator(".prep-create-actions button").allInnerTexts();
  check(buttons.join("|") === "Genera…|Nuova scena", "Heading actions: " + buttons.join("|"));
  check(
    !(await page.locator('.prep-sections [data-prep-section="generators"]').count()),
    "A generator tab was added",
  );
  await shot("01-prep-generate-entry-it-1440.png", heading);
  passed.push("(1) DM: «Genera…» beside «Nuova scena» in Preparation; player: no generator");

  // (2) donjon/Watabou dungeon: visible seed, own seed + Enter, options keep the seed,
  // Rigenera picks a new one, «Bozza precedente» returns (undo of a regeneration), Ctrl+G.
  await openPanel();
  await kind("dungeon");
  check(
    (await panel.locator(".gen-draft-badge").innerText()).includes("non ancora in gioco"),
    "Draft badge missing",
  );
  await seed("NEBBIA-4821");
  const statsA = await panel.locator("[data-gen-stats]").innerText();
  await panel.locator('[data-gen-opt="dungeon.doors"]').selectOption("secure");
  await panel.locator('[data-gen-opt="dungeon.secret"]').check();
  await panel.locator("[data-gen-stats]", { hasText: "segrete" }).waitFor();
  const statsB = await panel.locator("[data-gen-stats]").innerText();
  check(
    (await panel.locator("[data-gen-seed]").inputValue()) === "NEBBIA-4821",
    "Options changed the seed",
  );
  check(/[1-9]\d* a chiave/.test(statsB) && /[1-9]\d* segrete/.test(statsB), "Stats: " + statsB);
  await panel.locator('[data-gen-act="regen"]').click();
  await page.waitForFunction(
    () => document.querySelector("#dialog [data-gen-seed]")?.value !== "NEBBIA-4821",
  );
  const rerolled = await panel.locator("[data-gen-seed]").inputValue();
  await panel.locator('[data-gen-act="back"]').click();
  await page.waitForFunction(
    () => document.querySelector("#dialog [data-gen-seed]")?.value === "NEBBIA-4821",
  );
  check((await panel.locator("[data-gen-stats]").innerText()) === statsB, "Previous draft differs");
  await panel.locator("[data-gen-seed]").focus();
  await page.keyboard.press("Control+KeyG");
  await page.waitForFunction(
    () => document.querySelector("#dialog [data-gen-seed]")?.value !== "NEBBIA-4821",
  );
  await seed("NEBBIA-4821");
  check((await panel.locator("[data-gen-stats]").innerText()) === statsB, "Seed not reproducible");
  await panel.locator('[data-gen-name="dungeon"]').fill("Cantine sotto Bruma");
  await panel.locator('[data-gen-name="dungeon"]').press("Enter");
  await shot("02-dungeon-draft-it-1440.png");
  passed.push(
    `(2) Dungeon NEBBIA-4821: ${statsA} → options on the same seed: ${statsB}; Rigenera → ${rerolled}; Bozza precedente and typed seed reproduce it; Ctrl+G rerolls`,
  );

  // (3) Hand-off to Preparation's editor: a DRAFT scene with walls and doors; nothing is
  // saved until «Salva preparazione»; then it persists across a reload.
  const statsMatch = statsB.match(/(\d+) muri · (\d+) porte \((\d+) a chiave, (\d+) segrete/);
  const expectedBarriers = Number(statsMatch[1]) + Number(statsMatch[2]);
  const scenesBefore = (await stored()).scenes.length;
  await panel.locator('[data-gen-act="dungeon-open"]').click();
  await page.locator(".prep-editor").waitFor();
  check(!(await dialog.evaluate((d) => d.open)), "Dialog still open after hand-off");
  check(
    (await page.locator(".prep-editor h1").innerText()) === "Cantine sotto Bruma",
    "Editor title",
  );
  await page.locator("[data-prep-status]", { hasText: "Modifiche non salvate" }).waitFor();
  check(
    (await page.locator(".prep-editor").innerText()).includes("Nuova bozza riservata"),
    "Not a new draft",
  );
  check((await stored()).scenes.length === scenesBefore, "Scene saved before explicit save");
  const drawn = await page.locator(".spatial-properties summary").innerText();
  check(drawn.includes(`(${expectedBarriers})`), `Drawn geometry ${drawn} ≠ ${expectedBarriers}`);
  check(
    (await page.locator('textarea[name="description"]').inputValue()).includes("seme NEBBIA-4821"),
    "Room key and seed not in DM notes",
  );
  await shot("03-dungeon-in-editor-it-1440.png", page.locator(".prep-editor"));
  await page.locator("[data-prep-save]").click();
  await page.locator("[data-prep-status]", { hasText: "Versione salvata" }).waitFor();
  let data = await stored();
  const dungeon = data.scenes.find((s) => s.name === "Cantine sotto Bruma");
  check(dungeon && dungeon.walls.length === expectedBarriers, "Saved walls/doors mismatch");
  check(/^data:image\/png;base64,/.test(dungeon.background), "Dungeon image not saved");
  check(dungeon.revealed === false, "Generated scene revealed by default");
  await page.reload();
  await role("dm");
  await toPreparation();
  await page.locator(".prep-scene-row", { hasText: "Cantine sotto Bruma" }).waitFor();
  passed.push(
    `(3) «Apri come bozza di scena»: unsaved editor draft with ${expectedBarriers} walls/doors, key+seed in DM notes; saved only by «Salva preparazione» (PNG map, private) and kept after reload`,
  );

  // (4) DM vs player at the Table: secret doors exist for the DM only.
  await page
    .locator(".prep-scene-row", { hasText: "Cantine sotto Bruma" })
    .locator("summary")
    .click();
  await page
    .locator(".prep-scene-row", { hasText: "Cantine sotto Bruma" })
    .locator("[data-prep-activate]")
    .click();
  await dialog.getByRole("button", { name: "Attiva per il gruppo" }).click();
  await page.goto(base + "#table");
  const wallCount = () => page.locator("[data-spatial-wall]").count();
  await page.locator("[data-spatial-wall]").first().waitFor({ state: "attached" });
  const dmWalls = await wallCount();
  await role("player");
  await page.goto(base + "#table");
  await page.locator("[data-spatial-wall]").first().waitFor({ state: "attached" });
  const playerWalls = await wallCount();
  await page.waitForTimeout(500);
  await areaWarnings("the player Table");
  const secretDoors = Number(statsMatch[4]);
  check(
    dmWalls === expectedBarriers && playerWalls === expectedBarriers - secretDoors,
    `Table walls DM ${dmWalls}, player ${playerWalls}, secret ${secretDoors}`,
  );
  await shot("04-table-dungeon-player-1440.png");
  await role("dm");
  passed.push(
    `(4) Activated at the Table: DM sees ${dmWalls} walls/doors, the player ${playerWalls} (the ${secretDoors} secret doors stay DM-only)`,
  );

  // (5) Kobold+ Generate inside the encounter builder (Ctrl+G), 2024 budget, FG/Kobold+
  // counts with a physical die, DM corrections, 5e.tools adjust, save to B19, Undo.
  await toPreparation();
  await page.locator('[data-prep-section="encounter-builder"]').click();
  await page.locator('[data-eb-view="library"]').waitFor();
  check(
    (await page.locator("[data-prep-command]").allInnerTexts()).join("|") === "Genera incontro…",
    "Encounter builder entry missing",
  );
  await page.locator("body").click({ position: { x: 700, y: 20 } });
  await page.keyboard.press("Control+KeyG");
  await panel.locator('[data-gen-view="encounter"]').waitFor();
  await panel.locator('[data-gen-opt="encounter.difficulty"]').selectOption("high");
  await panel.locator('[data-gen-opt="encounter.type"]').selectOption("boss-minions");
  await seed("GUADO-1234");
  const budget = await panel.locator("[data-gen-budget]").innerText();
  check(
    budget.includes("3 personaggi (3, 3, 3)") && budget.includes("Difficile 1.200"),
    "Budget: " + budget,
  );
  const minions = panel.locator(".gen-row", {
    has: page.locator('[data-gen-expr][value="$PC..2*$PC"]'),
  });
  const minionId = await minions.getAttribute("data-gen-row");
  await minions.locator(`[data-gen-open="row:${minionId}"]`).click();
  await minions.locator(`[data-gen-face="${minionId}"][data-index="0"]`).fill("4");
  await minions.locator('[data-gen-act="physical"]').click();
  await panel.locator(`[data-gen-count="${minionId}"]`, { hasText: "dado fisico" }).waitFor();
  check(
    (await panel.locator(`[data-gen-count="${minionId}"] strong`).innerText()) === "6",
    "Physical d4 = 4 did not give 6",
  );
  await panel.locator(`[data-gen-act="plus"][data-row="${minionId}"]`).click();
  await panel.locator(`[data-gen-count="${minionId}"]`, { hasText: "scelta del DM" }).waitFor();
  const expr = panel.locator(`[data-gen-expr="${minionId}"]`);
  await expr.fill("2*$PC");
  await expr.press("Enter");
  await page.waitForFunction(
    (id) => document.querySelector(`#dialog [data-gen-count="${id}"] strong`)?.textContent === "6",
    minionId,
  );
  const leader = panel.locator(".gen-row", { hasText: "capo" });
  await leader.locator('[data-gen-act="remove"]').click();
  await panel.locator('[data-gen-act="adjust"]').waitFor();
  await panel.locator('[data-gen-act="adjust"]').click();
  await panel.locator('[data-gen-band="high"]').waitFor();
  const total = await panel.locator("[data-gen-total]").innerText();
  await panel.locator('[data-gen-name="encounter"]').fill("Pattuglia al guado");
  await panel.locator('[data-gen-name="encounter"]').press("Enter");
  await shot("05-encounter-draft-it-1440.png");
  await panel.locator('[data-gen-act="encounter-save"]').click();
  await page.locator('[data-eb-view="editor"]').waitFor();
  check(
    (await page.locator("[data-eb-name]").inputValue()) === "Pattuglia al guado",
    "B19 did not open the saved encounter",
  );
  check(
    (await page.locator("[data-eb-band]").innerText()) === "Difficile",
    "B19 difficulty differs",
  );
  await shot("06-encounter-in-builder-it-1440.png");
  data = await stored();
  const saved = data.ext["encounter-builder"].encounters.find(
    (e) => e.name === "Pattuglia al guado",
  );
  check(saved?.notes.summary.includes("seme GUADO-1234"), "Seed not in the encounter summary");
  await page.locator('[data-eb="undo"]').click();
  await page.waitForTimeout(200);
  data = await stored();
  check(
    !data.ext["encounter-builder"].encounters.some((e) => e.name === "Pattuglia al guado"),
    "Undo did not remove the generated encounter",
  );
  // The draft is still in the panel (nothing lost by Undo): save it again, then reload.
  await page.locator("[data-prep-command]", { hasText: "Genera incontro…" }).click();
  await panel.locator('[data-gen-view="encounter"]').waitFor();
  check(
    (await panel.locator("[data-gen-total]").innerText()) === total,
    "Draft changed after Undo",
  );
  await panel.locator('[data-gen-act="encounter-save"]').click();
  await page.locator('[data-eb-view="editor"]').waitFor();
  await page.reload();
  await role("dm");
  data = await stored();
  check(
    data.ext["encounter-builder"].encounters.some((e) => e.name === "Pattuglia al guado"),
    "Encounter not persisted",
  );
  passed.push(
    `(5) Ctrl+G in the builder: budget «${budget.split("\n")[0]}»; physical d4=4 → 6, +1 (DM), 2*$PC → 6, leader removed, «Adatta a Difficile» → ${total}; saved to B19 (opened there, summary with seed), Undo removes it, saved again, reload keeps it`,
  );

  // (5b) Review fix: a draft made for the open encounter's own (typical) party keeps that
  // party when saved as a new encounter, so B19 shows the difficulty the generator showed.
  await page.goto(base + "#preparation?tab=encounter-builder");
  await page.locator('[data-eb-encounter="enc-lantern"] .eb-lib-actions [data-eb="open"]').click();
  await page.locator('[data-eb-view="editor"]').waitFor();
  await page.locator('[data-eb-party][value="custom"]').check();
  await page.locator('[data-eb-level="3"]').waitFor();
  for (const i of [0, 1, 2, 3]) {
    await page.locator(`[data-eb-level="${i}"]`).selectOption("6");
    await page.waitForTimeout(100);
  }
  await page.locator("[data-prep-command]", { hasText: "Genera incontro…" }).click();
  await panel.locator('[data-gen-view="encounter"]').waitFor();
  check(
    (await panel.locator("[data-gen-budget]").innerText()).includes("4 personaggi (6, 6, 6, 6)"),
    "Generator did not use the open encounter's party",
  );
  const generatedBand = await panel.locator("[data-gen-band]").innerText();
  await panel.locator('[data-gen-act="encounter-save"]').click();
  await page.locator('[data-eb-view="editor"]').waitFor();
  await page.waitForTimeout(200);
  const builderLevels = await page
    .locator("[data-eb-level]")
    .evaluateAll((selects) => selects.map((x) => x.value).join(","));
  check(
    (await page.locator('[data-eb-party][value="custom"]').isChecked()) &&
      builderLevels === "6,6,6,6" &&
      (await page.locator("[data-eb-band]").innerText()) === generatedBand,
    `New encounter party ${builderLevels}, band differs from ${generatedBand}`,
  );
  passed.push(
    `(5b) Open encounter with a typical party 6,6,6,6 → «Genera incontro…» → saved as new: B19 keeps party 6,6,6,6 and the same band «${generatedBand}»`,
  );

  // (6) donjon inn through the B25 tables (arrow keys between kinds), physical die, DM text,
  // saved to the campaign World for the group; a second, DM-only one stays hidden.
  await toPreparation();
  await openPanel();
  await panel.locator("[data-gen-kind].active").focus();
  const active = await panel.locator("[data-gen-kind].active").getAttribute("data-gen-kind");
  const order = ["dungeon", "encounter", "inn", "town", "names", "walls"];
  for (let i = order.indexOf(active); i !== order.indexOf("inn"); i = (i + 1) % order.length)
    await page.keyboard.press("ArrowRight");
  await panel.locator('[data-gen-view="inn"]').waitFor();
  check(
    await page.evaluate(() => document.activeElement?.dataset.genKind === "inn"),
    "Focus not on the Inn tab",
  );
  await seed("CANNETO-42");
  const rumour = await panel.locator('[data-gen-field="rumour"] .gen-field-text').inputValue();
  check(rumour.length > 10, "No rumour from «Voci alla Lanterna»");
  const special = panel.locator('[data-gen-field="special"]');
  await special.locator('[data-gen-open-rolls="special"]').click();
  await special.locator('[data-gen-open="step:special:0"]').click();
  await special.locator('[data-gen-step-face="special:0"]').fill("1");
  await special.locator('[data-gen-act="step-physical"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector('#dialog [data-gen-field="special"] .gen-field-text')?.value ===
      "zuppa d’anguilla",
  );
  check(
    (await panel.locator('[data-gen-field="special"]').innerText()).includes("dado fisico"),
    "Physical face not labelled",
  );
  const title = panel.locator('[data-gen-field-text="name"]');
  await title.fill("La Lanterna e il Salice");
  await title.press("Enter");
  await panel.locator('[data-gen-field="name"]', { hasText: "modificato dal DM" }).waitFor();
  await panel.locator('[data-gen-opt="world.access"]').selectOption("campaign");
  await shot("07-inn-draft-it-1440.png");
  await panel.locator('[data-gen-act="world-save"]').click();
  await page.locator("[data-campaign-heading]", { hasText: "La Lanterna e il Salice" }).waitFor();
  await shot("08-inn-world-entry-it-1440.png", page.locator("[data-campaign-heading]"));
  // A second inn for the DMs only.
  await toPreparation();
  await openPanel();
  await kind("inn");
  await seed("CANNETO-43");
  await panel.locator('[data-gen-field-text="name"]').fill("Il Corvo Segreto");
  await panel.locator('[data-gen-field-text="name"]').press("Enter");
  await panel.locator('[data-gen-opt="world.access"]').selectOption("dms");
  await panel.locator('[data-gen-act="world-save"]').click();
  await page.locator("[data-campaign-heading]", { hasText: "Il Corvo Segreto" }).waitFor();
  await role("player");
  await page.goto(base + "#campaign?tab=world");
  await page.locator("main", { hasText: "La Lanterna e il Salice" }).waitFor();
  check(
    !(await page.locator("main").innerText()).includes("Il Corvo Segreto"),
    "Player reads the DM-only inn",
  );
  await role("dm");
  passed.push(
    "(6) Inn CANNETO-42 through B25 tables (ArrowRight to the tab; rumour from «Voci alla Lanterna»), physical d8=1 → «zuppa d’anguilla», DM title; World entry for the group read by the player; the DM-only one is not",
  );

  // (7) Owlbear Forecast: proposals on the courtyard, each confirmed or discarded, a toggle
  // as correction, map click selects; confirmed walls go to the editor draft; save; reload.
  await toPreparation();
  await openPanel();
  await kind("walls");
  await panel.locator('[data-gen-opt="walls.sceneId"]').selectOption("old-watch");
  await panel.locator('[data-gen-act="analyze"]').click();
  await panel.locator("[data-gen-walls-stats]").waitFor();
  const proposals = await panel.locator("[data-gen-proposal-row]").count();
  check(proposals >= 4, "Too few proposals: " + proposals);
  await panel.locator("[data-gen-proposal]").first().locator(".gen-hit").click({ force: true });
  await panel.locator(".gen-proposal-row.is-selected").waitFor();
  // The four longest proposals are the courtyard's sides.
  const ranked = await panel.locator("[data-gen-proposal-row]").evaluateAll((rows) =>
    rows
      .map((row) => ({
        id: row.dataset.genProposalRow,
        m: Number(
          row
            .querySelector("span")
            .textContent.split("·")
            .at(-1)
            .replace(/[^\d,]/g, "")
            .replace(",", "."),
        ),
      }))
      .sort((a, b) => b.m - a.m),
  );
  const decide = (id, act) =>
    panel.locator(`[data-gen-act="${act}"][data-proposal="${id}"]`).click();
  for (const { id } of ranked.slice(0, 4)) await decide(id, "accept");
  await decide(ranked[4].id, "reject");
  await decide(ranked[0].id, "accept"); // correction: back to «da decidere»
  await panel.locator("[data-gen-walls-stats]", { hasText: "3 confermate" }).waitFor();
  await decide(ranked[0].id, "accept");
  await panel.locator("[data-gen-walls-stats]", { hasText: "4 confermate · 1 scartate" }).waitFor();
  check(
    (await panel
      .locator(`[data-gen-act="accept"][data-proposal="${ranked[0].id}"]`)
      .getAttribute("aria-pressed")) === "true",
    "aria-pressed not set",
  );
  await shot("09-walls-proposals-it-1440.png");
  const before = (await stored()).scenes.find((s) => s.id === "old-watch").walls.length;
  await panel.locator('[data-gen-act="walls-open"]').click();
  await page.locator(".prep-editor").waitFor();
  await page.locator("[data-prep-status]", { hasText: "Modifiche non salvate" }).waitFor();
  check(
    (await stored()).scenes.find((s) => s.id === "old-watch").walls.length === before,
    "Scene changed before the explicit save",
  );
  await shot("10-walls-in-editor-it-1440.png", page.locator(".prep-editor"));
  await page.locator("[data-prep-save]").click();
  await page.locator("[data-prep-status]", { hasText: "Versione salvata" }).waitFor();
  await page.reload();
  await role("dm");
  data = await stored();
  const courtyard = data.scenes.find((s) => s.id === "old-watch");
  check(
    courtyard.walls.length === before + 4,
    "Confirmed walls not saved: " + courtyard.walls.length,
  );
  check(
    courtyard.walls.every((w) => w.source.kind === "authored-demo"),
    "Detected walls without source",
  );
  passed.push(
    `(7) Forecast on «Il cortile dell’osservatorio»: ${proposals} proposals, map click selects, 4 confirmed + 1 discarded (a second press returns one to «da decidere»), editor draft unsaved until «Salva preparazione», 4 walls after reload`,
  );

  // (7b) Review fix: Forecast from the scene editor's map tools (Owlbear puts it in the map's
  // tools, VTL-065) on the draft being edited; the walls join that unsaved draft and the
  // DM's own unsaved change stays (no «Scartare le modifiche?»).
  await page.goto(base + "#preparation?id=old-watch&tab=edit");
  await page.locator(".prep-editor").waitFor();
  await page.locator('input[name="name"]').fill("Cortile in revisione");
  await page.locator('input[name="name"]').press("Tab");
  await page.locator("[data-prep-status]", { hasText: "Modifiche non salvate" }).waitFor();
  const toolsFirst = await page.evaluate(() => {
    const tools = document.querySelector(".prep-canvas-panel .spatial-toolbar");
    const detect = document.querySelector(
      '.prep-canvas-panel [data-prep-command="generators.walls-here"]',
    );
    return Boolean(tools && detect && tools.compareDocumentPosition(detect) & 4);
  });
  check(toolsFirst, "«Rileva i muri…» is not beside the editor's map tools");
  const geometry = async () =>
    Number((await page.locator(".spatial-properties summary").innerText()).match(/\((\d+)\)/)[1]);
  const geometryBefore = await geometry();
  await page.locator("[data-prep-command]", { hasText: "Rileva i muri…" }).click();
  await panel.locator('[data-gen-view="walls"]').waitFor();
  check(
    (await panel.locator('[data-gen-opt="walls.sceneId"] option:checked').innerText()).includes(
      "Cortile in revisione · bozza non salvata",
    ),
    "Forecast is not on the editor's draft",
  );
  await panel.locator('[data-gen-act="analyze"]').click();
  await panel
    .locator("[data-gen-walls-stats]", { hasText: "4 già presenti nella scena" })
    .waitFor();
  const fresh = await panel
    .locator("[data-gen-proposal-row]")
    .evaluateAll((rows) => rows.map((row) => row.dataset.genProposalRow));
  await panel.locator(`[data-gen-act="accept"][data-proposal="${fresh[0]}"]`).click();
  const dialogsBefore = await page.locator("#dialog").count();
  await panel.locator('[data-gen-act="walls-open"]').click();
  await page.locator(".prep-editor").waitFor();
  check(!(await dialog.evaluate((d) => d.open)), "A discard confirmation was asked");
  check(
    (await page.locator('input[name="name"]').inputValue()) === "Cortile in revisione",
    "The DM's unsaved rename was lost",
  );
  check((await geometry()) === geometryBefore + 1, "The confirmed wall did not join the draft");
  check(dialogsBefore === 1, "Unexpected dialog count");
  await shot("10b-walls-from-editor-it-1440.png", page.locator(".prep-editor"));
  await page.locator("[data-prep-cancel]").click();
  await dialog.getByRole("button", { name: "Scarta modifiche" }).click();
  await page.waitForTimeout(150);
  passed.push(
    `(7b) Editor › «Rileva i muri…» under the map tools: analyses the unsaved draft (4 walls already present), 1 confirmed → added to that draft (geometry ${geometryBefore} → ${geometryBefore + 1}) keeping the unsaved rename, no discard prompt; then discarded`,
  );

  // Reload keeps the panel's draft and seed (this tab's session).
  await toPreparation();
  await openPanel();
  await kind("dungeon");
  check(
    (await panel.locator("[data-gen-seed]").inputValue()) === "NEBBIA-4821",
    "Draft seed lost on reload",
  );
  await dialog.locator("footer [data-close]").click();
  check(await noOverflow(), "Desktop overflow");
  passed.push("(8) After reloads the panel reopens on the same dungeon seed (session draft)");

  // (9) EN phone 390 with touch: every generator fits; names saved to the World.
  const phoneContext = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const phone = await phoneContext.newPage();
  phone.on("pageerror", (error) => errors.push("phone: " + error.message));
  await phone.goto(base);
  await phone.getByRole("button", { name: "Preferenze" }).tap();
  await phone.locator('#dialog [name="lang"]').selectOption("en");
  await phone.getByRole("button", { name: "Salva preferenze" }).tap();
  await phone.locator("#demo-role").selectOption("dm");
  await phone.waitForTimeout(150);
  await phone.goto(base + "#preparation?tab=preparation");
  await phone.locator("[data-prep-command]", { hasText: "Generate…" }).tap();
  const phonePanel = phone.locator("#dialog [data-gen-panel]");
  await phonePanel.waitFor();
  const small = [];
  for (const id of ["dungeon", "encounter", "inn", "town", "names", "walls"]) {
    await phonePanel.locator(`[data-gen-kind="${id}"]`).tap();
    await phonePanel.locator(`[data-gen-view="${id}"]`).waitFor();
    const fits = await phone.evaluate(() => {
      const body = document.querySelector("#dialog .dialog-body");
      return (
        document.documentElement.scrollWidth <= window.innerWidth &&
        body.scrollWidth <= body.clientWidth + 1
      );
    });
    check(fits, "Phone overflow in " + id);
    small.push(
      ...(await phonePanel.evaluate((el) =>
        [...el.querySelectorAll("button, select, input, summary")]
          .filter((n) => n.offsetParent && !["checkbox", "radio", "range"].includes(n.type))
          .filter((n) => n.getBoundingClientRect().height < 40)
          .map((n) => n.outerHTML.slice(0, 70)),
      )),
    );
    if (id === "dungeon") await phone.screenshot({ path: shots + "11-phone-en-dungeon-390.png" });
  }
  check(!small.length, "Phone targets under 40px: " + small.join(" | "));
  await phonePanel.locator('[data-gen-kind="encounter"]').tap();
  const enBudget = await phonePanel.locator("[data-gen-budget]").innerText();
  check(/× 1\.15 =/.test(enBudget) && !/«/.test(enBudget), "EN budget line: " + enBudget);
  await phonePanel.locator('[data-gen-kind="names"]').tap();
  await phonePanel.locator('[data-gen-view="names"]').waitFor();
  for (let i = 3; i <= 8; i++) await phonePanel.locator(`[data-gen-pick="name-${i}"]`).tap();
  await phonePanel
    .locator('[data-gen-act="world-save"]', { hasText: "Save 2 names as people in the World" })
    .waitFor();
  const chosen = await phonePanel
    .locator('[data-gen-field-text="name-1"], [data-gen-field-text="name-2"]')
    .evaluateAll((inputs) => inputs.map((i) => i.value));
  await phone.screenshot({ path: shots + "12-phone-en-names-390.png" });
  await phonePanel.locator('[data-gen-act="world-save"]').tap();
  await phone.locator("main", { hasText: chosen[0] }).waitFor();
  check((await phone.locator("main").innerText()).includes(chosen[1]), "Second name missing");
  check(
    await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    "Phone overflow in the World list",
  );
  passed.push(
    `(9) EN phone 390 touch: all six generators fit (no overflow, targets ≥ 40px); 2 of 8 names saved to the World: ${chosen.join(", ")}`,
  );
  await phoneContext.close();

  check(!errors.length, "Page errors: " + errors.join(" | "));
  await context.close();
  return passed.join("\n");
}
