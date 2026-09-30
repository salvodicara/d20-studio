async (rootPage) => {
  // B62: area sheet tabs are sub-sections of D&D Beyond's sheet categories; the category
  // opens first, then the sub-section.
  const SHEET_CATEGORY = {
    projects: "extras",
    "party-bastion": "extras",
    "projects-track": "features",
    "home-levelup": "features",
    media: "story",
    "character-library-log": "notes",
    "character-library-revisions": "notes",
  };
  const openSheetTab = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const handle = () => page.locator(`[data-character-tab="${id}"]`).first();
    if (!(await handle().count()) && SHEET_CATEGORY[id])
      await press(page.locator(`.character-tabs [data-character-tab="${SHEET_CATEGORY[id]}"]`));
    await handle().waitFor();
    await press(handle());
  };
  // B54 — downtime projects, crafting and non-class tracks in the one app, with real clicks,
  // keys and touch. Group 1 Learn Elvish (Mira, IT 1440): steps, bar, no hours, DM advances
  // the clock in the core Time dialog, the player dedicates the hours by keyboard, Undo,
  // reload. Group 2 completion: DM grant, study, physical check on the BG3 check screen (B56),
  // language in Features and in the Party languages next to the ones Mira already knew.
  // Group 3 Potion of Healing: verified requirements, materials consumed, Undo returns them,
  // time, potion in the inventory, reload, cancel returns the materials; the DM retires a
  // campaign recipe and Undo puts it back. Group 4 Lantern's Favour track: prerequisites,
  // unlock with sparks, DM story gate and refund. Group 5 DM vs player: private notes, Iria's
  // private sheet, corrections (a completed study reopened and completed again), withheld
  // clock hours, change log kept open, party grant. Group 6 EN phone 390 with touch.
  // Synthetic demo data only; resets this browser's demo state. (Review fixes: Livia already
  // speaks Elvish in Chat and Party, so the Elvish project is Mira's.)
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R4/B54/";
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
  const slice = async (p = page) => (await stored(p)).ext.projects;
  const project = async (id, p = page) => (await slice(p)).projects.find((row) => row.id === id);
  const lastProject = async (p = page) => (await slice(p)).projects.at(-1);
  const shot = async (name, locator = null, p = page) => {
    if (locator) await locator.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await p.screenshot({ path: dir + name });
  };
  const quietTips = async (p = page) => {
    const off = p.getByRole("button", { name: /Non mostrare suggerimenti|Stop showing tips/ });
    if (await off.count()) await off.first().click();
  };
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await quietTips(p);
  };
  const card = (id, p = page) => p.locator(`[data-project-card="${id}"]`);
  const dialog = (p = page) => p.locator("#dialog[open]");
  const submitDialog = async (p = page, tap = false) => {
    const button = p.locator('#dialog[open] button[type="submit"]');
    await (tap ? button.tap() : button.click());
    await p.waitForFunction(() => !document.querySelector("#dialog")?.open);
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const smallTargets = (p, scope) =>
    p
      .locator(`${scope} button, ${scope} select, ${scope} input, ${scope} summary`)
      .evaluateAll((nodes) =>
        nodes
          .filter((n) => n.offsetParent && n.type !== "radio" && n.type !== "checkbox")
          .map((n) => [
            (n.textContent || n.getAttribute("aria-label") || n.name || "").trim().slice(0, 40),
            Math.round(n.getBoundingClientRect().height),
          ])
          .filter(([, h]) => h < 40),
      );
  // The core Time dialog (rest-ui): the DM previews, then applies.
  const advanceClock = async (amountHours, totalHours = amountHours, p = page) => {
    await dialog(p).waitFor();
    await p.locator("#dialog [data-rest-time-value]").fill(String(amountHours));
    await p.locator("#dialog [data-rest-time-unit]").selectOption("3600");
    await p.locator("#dialog [data-rest-preview-time]").click();
    await p.locator("#dialog [data-rest-apply]:not([disabled])").click();
    await p.waitForFunction(
      ([k, s]) => JSON.parse(localStorage.getItem(k)).restTime?.clocks?.lanterns?.seconds === s,
      [key, totalHours * 3600],
    );
    await p.keyboard.press("Escape");
    await p.waitForFunction(() => !document.querySelector("#dialog")?.open);
  };
  // The B56 dice cover the page while they are on screen (the check screen is modal): let
  // them go (Esc skips, then closes), as the other journeys do.
  const settleDice = async (p = page) => {
    const layer = p.locator("[data-dice3d-layer]:not([hidden])");
    await layer.waitFor({ timeout: 1000 }).catch(() => {});
    for (let i = 0; i < 8 && (await layer.count()); i++) {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(80);
    }
    await layer.waitFor({ state: "hidden", timeout: 5000 });
  };

  // ------------------------------------------------------------ group 1: Learn Elvish
  await page.goto(base + "#home");
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await page.locator('.nav-link[data-nav="characters"]').waitFor();
  await quietTips();
  await role("player");
  // Characters → Mira → Downtime: three clicks.
  await page.locator('.nav-link[data-nav="characters"]').click();
  await page.locator('[data-character-action="open"][data-actor="mira"]').click();
  await openSheetTab(page, "projects"); // B62: Extras › Downtime
  const elvish = card("project-mira-elvish");
  await elvish.waitFor();
  check((await elvish.locator("h3").innerText()) === "Imparare l'Elfico", "Elvish title");
  check(
    (await elvish.locator(".projects-segs").getAttribute("aria-label")) ===
      "Passi completati: 1 di 3",
    "Step meter label",
  );
  check(
    (await elvish.locator("[data-projects-step-progress]").innerText()) === "16 / 80 h",
    "16/80",
  );
  check((await page.locator("[data-projects-available]").innerText()) === "0 h", "0 h available");
  const dedicate = elvish.locator('[data-projects-action="time"]');
  check(await dedicate.isDisabled(), "Dedicate enabled without hours");
  check(
    (await elvish.innerText()).includes("Nessuna ora disponibile"),
    "Reason for the disabled command missing",
  );
  await shot("b54-01-elvish-no-hours.png", page.locator(".projects-time"));
  // The DM lets a day pass from the panel's own control (the core Time dialog).
  await role("dm");
  await page.locator('[data-projects-action="advance-clock"]').click();
  await advanceClock(24);
  await page.locator("[data-projects-available]", { hasText: "8 h" }).waitFor();
  check(
    (await page.locator(".projects-breakdown").first().innerText()).includes(
      "24 h · giorno 2, 00:00",
    ),
    "Campaign clock not shown",
  );
  await shot("b54-02-dm-clock-advanced.png", page.locator(".projects-time"));
  // The player dedicates the 8 hours with the keyboard (focus, Enter). The bell says first.
  await role("player");
  await page.locator('[data-service="requests"]').click();
  await dialog().waitFor();
  check(
    (await dialog().innerText()).includes("Mira: 8 h di tempo libero"),
    "Downtime notice missing from the bell",
  );
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("#dialog")?.open);
  await page
    .locator('[data-project-card="project-mira-elvish"] [data-projects-action="time"]')
    .focus();
  await page.keyboard.press("Enter");
  await dialog().waitFor();
  check((await page.locator('#dialog [name="hours"]').inputValue()) === "8", "Proposed 8 h");
  await page.locator('#dialog [name="note"]').fill("Lezione con Syl");
  await page.locator('#dialog [name="note"]').press("Enter");
  await page.waitForFunction(() => !document.querySelector("#dialog")?.open);
  await elvish.locator("[data-projects-step-progress]", { hasText: "24 / 80 h" }).waitFor();
  check(
    (await elvish.locator("[data-projects-spent]").innerText()).includes(
      "Tempo speso: 24 h · ultimo lavoro: orologio giorno 2, 00:00",
    ),
    "Time spent from the clock not shown",
  );
  // Keyboard focus returns to the project after the re-render.
  const focused = await page.evaluate(() => {
    const a = document.activeElement;
    return {
      ok: !!a?.matches('[data-project-card="project-mira-elvish"] h3'),
      what: a ? a.tagName + "#" + a.id + "." + a.className : "none",
    };
  });
  check(focused.ok, "Focus not returned to the project: " + focused.what);
  let row = await project("project-mira-elvish");
  check(row.work.at(-1).clockAt === 86400 && row.work.at(-1).hours === 8, "Work entry clock");
  await shot("b54-03-elvish-time-from-clock.png", elvish);
  // Undo from the panel returns the 8 hours; dedicated again, a reload keeps them.
  await page.locator('[data-projects-action="undo"]').first().click();
  await elvish.locator("[data-projects-step-progress]", { hasText: "16 / 80 h" }).waitFor();
  check((await page.locator("[data-projects-available]").innerText()) === "8 h", "Undo hours");
  await elvish.locator('[data-projects-action="time"]').click();
  await submitDialog();
  await elvish.locator("[data-projects-step-progress]", { hasText: "24 / 80 h" }).waitFor();
  await page.reload();
  await elvish.locator("[data-projects-step-progress]", { hasText: "24 / 80 h" }).waitFor();
  passed.push(
    "Learn Elvish: 3 clicks, steps 1/3, 16/80 h, 0 h and disabled with reason; DM advances 24 h in the core Time dialog → 8 h; bell notice for the player; keyboard dedicate → 24/80 h at clock day 2; Undo → 16/80; reload keeps 24/80",
  );

  // ------------------------------------------------------------ group 2: completion
  await role("dm");
  await page.locator('.projects-time [data-projects-action="grant"]').click();
  check(
    (await dialog().locator("h2").innerText()) === "Concedi o togli tempo libero",
    "Grant dialog title",
  );
  await page.locator('#dialog [name="hours"]').fill("56");
  await page.locator('#dialog [name="reason"]').fill("Una settimana a Bruma tra le sessioni");
  await submitDialog();
  await page.locator("[data-projects-available]", { hasText: "56 h" }).waitFor();
  await role("player");
  await elvish.locator('[data-projects-action="time"]').click();
  await page.locator('#dialog [name="hours"]').fill("56");
  await submitDialog();
  await elvish.locator('[data-projects-action="check"]').waitFor();
  await elvish.locator('[data-projects-action="check"]').click();
  check((await dialog().innerText()).includes("d20 + 1"), "Check modifier (Mira's Int 12)");
  await page.locator('#dialog input[name="mode"][value="physical"]').check();
  await page.locator('#dialog [name="face"]').fill("12");
  await submitDialog();
  await page.waitForFunction(
    (k) =>
      JSON.parse(localStorage.getItem(k)).ext.projects.projects.find(
        (p) => p.id === "project-mira-elvish",
      ).status === "completed",
    key,
  );
  // The player's own check with a DC outside combat: the BG3 check screen of B56.
  const diceLayer = page.locator('[data-dice3d-layer]:not([hidden])[data-layout="check"]');
  await diceLayer.waitFor();
  await page.waitForTimeout(250);
  await shot("b54-rf-01-check-screen.png");
  const diceText = await diceLayer.innerText();
  check(
    diceText.includes("Imparare l'Elfico") && diceText.includes("10") && /successo/i.test(diceText),
    "Check screen without title, DC or verdict: " + diceText,
  );
  await settleDice();
  let state = await stored();
  check(
    JSON.stringify(state.actors.mira.languages) ===
      JSON.stringify(["common", "gnomish", "halfling", "elvish"]),
    "Languages on the sheet: " + JSON.stringify(state.actors.mira.languages),
  );
  const roll = state.ext["projects-records"].rolls.at(-1);
  check(roll.mode === "physical" && roll.total === 13 && roll.success, "Physical check record");
  const logEntry = state.log.find((entry) => entry.id === roll.logId);
  check(logEntry?.rolls?.[0]?.source === "projects", "Log roll missing");
  await page.locator('[data-character-tab="features"]').click();
  await page.locator(".item-row", { hasText: "Lingua: Elfico" }).waitFor();
  await shot(
    "b54-04-features-language.png",
    page.locator(".item-row", { hasText: "Lingua: Elfico" }),
  );
  // The DM's Party overview (B44) reads the same languages: Mira keeps Common, Gnomish and
  // Halfling next to Elvish.
  await role("dm");
  await page.goto(base + "#campaign?tab=group");
  const miraRow = page.locator('tr[data-party-row="mira"] [data-party-languages]');
  await miraRow.waitFor();
  const partyLanguages = await miraRow.innerText();
  check(
    partyLanguages === "Comune, Gnomesco, Halfling, Elfico",
    "Party languages: " + partyLanguages,
  );
  await role("player");
  await page.goto(base + "#characters?id=mira&tab=projects");
  await page.locator(".projects-list").waitFor();
  passed.push(
    "Completion: DM grants 56 h with reason, player studies 56 h, physical d20 12 + 1 = 13 vs DC 10 on the BG3 check screen, project completed, 'Lingua: Elfico' in Features, Party languages keep Common next to Elvish, log roll attached",
  );

  // ------------------------------------------------------------ group 3: Potion of Healing
  // Mira dedicated all her hours to Elvish: the DM lets another day pass.
  await role("dm");
  await page.locator('[data-projects-action="advance-clock"]').first().click();
  await advanceClock(24, 48);
  await role("player");
  await page.locator('[data-character-action="collection"]').click();
  await page.locator('[data-character-action="open"][data-actor="mira"]').click();
  await openSheetTab(page, "projects"); // B62: Extras › Downtime
  // P2 PG-84 (D&D Beyond, Mastercrafted book): the recipes are their own page, opened from
  // Downtime with «Apri il Ricettario»; starting a craft returns to Downtime.
  await page.locator("[data-projects-open-recipes]").click();
  const potionCard = page.locator('[data-recipe-card="srd:potion-of-healing"]');
  await potionCard.waitFor();
  const checks = await potionCard.locator(".projects-checks li").allInnerTexts();
  check(checks.length === 3 && checks.every((t) => t.startsWith("✓")), "Requirements not all met");
  check(checks[1].includes("tratti del druido"), "Proficiency source missing");
  await shot("b54-05-recipe-book.png", page.locator(".projects-recipe-panel"));
  await potionCard.locator('[data-projects-action="craft"]').click();
  await dialog().waitFor();
  const craftText = await dialog().innerText();
  check(craftText.includes("Fabbrica come: Mira"), "Craft as missing");
  check(
    craftText.includes("25 mo di materie prime in 1 giorno (8 ore di lavoro)"),
    "SRD rule text",
  );
  await shot("b54-06-craft-dialog.png");
  await submitDialog();
  const herbs = (s) =>
    s.actors.mira.inventory.find((r) => r.id === "projects-mira-herbs")?.quantity ?? 0;
  state = await stored();
  check(herbs(state) === 1, "Herbs not consumed");
  let craft = await lastProject();
  check(craft.kind === "craft" && craft.steps[0].targetHours === 8, "Craft project");
  // Undo returns the five herbs and removes the project.
  await page.locator('[data-projects-action="undo"]').first().click();
  await page.waitForFunction(
    (k) =>
      JSON.parse(localStorage.getItem(k)).actors.mira.inventory.find(
        (r) => r.id === "projects-mira-herbs",
      )?.quantity === 6,
    key,
  );
  check(!(await slice()).projects.some((p) => p.kind === "craft"), "Undo left the project");
  await page.locator("[data-projects-open-recipes]").click();
  await potionCard.locator('[data-projects-action="craft"]').click();
  await submitDialog();
  craft = await lastProject();
  const craftCard = card(craft.id);
  await craftCard.waitFor();
  check((await page.locator("[data-projects-available]").innerText()) === "8 h", "Mira 8 h");
  await craftCard.locator('[data-projects-action="time"]').click();
  await submitDialog();
  await page.waitForFunction(
    ([k, id]) =>
      JSON.parse(localStorage.getItem(k)).ext.projects.projects.find((p) => p.id === id).status ===
      "completed",
    [key, craft.id],
  );
  check(
    (await page.locator("#toast").innerText()).includes(
      "Pozione di guarigione aggiunta all'inventario di Mira",
    ),
    "Delivery toast",
  );
  await page.locator('[data-character-tab="inventory"]').click();
  // W2b1 (B36 deep inventory) renders inventory rows as `.invp-row`.
  const potionRow = page.locator(".invp-row", { hasText: "Pozione di guarigione" });
  await potionRow.first().waitFor();
  await shot("b54-07-potion-in-inventory.png", potionRow.first());
  await page.reload();
  await potionRow.first().waitFor();
  state = await stored();
  check(
    state.actors.mira.inventory.some(
      (r) => r.srdId === "srd2024:item:potion-of-healing" && r.crafted?.projectId === craft.id,
    ),
    "Potion lost on reload",
  );
  // Cancel crafting with its reason: the potion leaves, the herbs return.
  await openSheetTab(page, "projects"); // B62: Extras › Downtime
  await page.locator(".projects-closed > summary").click();
  await card(craft.id).locator('[data-projects-action="abandon"]').click();
  await page.locator('#dialog [name="reason"]').fill("Il DM rivede la scena");
  await submitDialog();
  state = await stored();
  check(herbs(state) === 6, "Herbs not returned");
  check(
    !state.actors.mira.inventory.some((r) => r.srdId === "srd2024:item:potion-of-healing"),
    "Potion not taken back",
  );
  // The DM retires a campaign recipe (Mastercrafted book management); Undo puts it back.
  await role("dm");
  const salve = page.locator('[data-recipe-card="recipe-bruma-salve"]');
  await page.locator("[data-projects-open-recipes]").click();
  await salve.locator('[data-projects-action="retire-recipe"]').click();
  await salve.waitFor({ state: "detached" });
  check(
    (await page.locator("#toast").innerText()).includes("Ricetta ritirata: Unguento di Bruma"),
    "Retire toast",
  );
  await page.locator('[data-projects-action="undo"]').first().click();
  await salve.waitFor();
  await role("player");
  passed.push(
    "Potion of Healing: Mira's ✓ tool/Druid proficiency/25 GP materials; start consumes 5 herbs; Undo returns them; 8 h from the clock → potion in the inventory; reload; cancel with reason takes the potion back and returns the herbs; DM retires the Bruma salve recipe, Undo restores it",
  );

  // ------------------------------------------------------------ group 4: Lantern's Favour
  await page.goto(base + "#characters?id=livia&tab=projects-track");
  const tree = page.locator(".projects-track");
  await tree.waitFor();
  check((await tree.locator("[data-projects-currency]").innerText()).endsWith(": 2"), "2 sparks");
  const node = (id) => tree.locator(`.projects-node[data-node="${id}"]`);
  check((await node("guiding-beam").getAttribute("class")).includes("is-locked"), "Beam locked");
  await node("lantern-heart").click();
  const heartText = await tree.locator(".projects-node-detail").innerText();
  check(
    heartText.includes("Livello 5 (ora 3)") && heartText.includes("Si apre con la storia"),
    "Outer ring prerequisites",
  );
  check(
    await tree.locator('.projects-node-detail [data-projects-action="unlock"]').isDisabled(),
    "Locked boon unlockable",
  );
  await node("steady-flame").click();
  await tree.locator('.projects-node-detail [data-projects-action="unlock"]').click();
  await page.locator('[data-node="steady-flame"].is-unlocked').waitFor();
  check((await tree.locator("[data-projects-currency]").innerText()).endsWith(": 1"), "1 spark");
  // Keyboard: Tab to the now available beam and unlock it.
  await node("guiding-beam").focus();
  await page.keyboard.press("Enter");
  await page.locator('[data-node="guiding-beam"][aria-pressed="true"]').waitFor();
  await page.locator('.projects-node-detail [data-projects-action="unlock"]').click();
  await page.locator('[data-node="guiding-beam"].is-unlocked').waitFor();
  await node("warm-glow").click();
  check(
    (await tree.locator(".projects-node-detail").innerText()).includes(
      "Servono 1 × Scintilla di lanterna (ne hai 0)",
    ),
    "Missing spark reason",
  );
  await shot("b54-08-track-player.png", tree);
  // DM: story gate and a reasoned refund.
  await role("dm");
  await page.locator('[data-projects-action="story-gate"]').click();
  await node("lantern-heart").click();
  check(
    !(await page.locator(".projects-node-detail").innerText()).includes("Si apre con la storia"),
    "Story gate still closed",
  );
  await node("guiding-beam").click();
  await page.locator('[data-projects-action="refund-node"]').click();
  await page.locator('#dialog [name="reason"]').fill("Scintilla usata per sbaglio");
  await submitDialog();
  await page.locator("[data-projects-currency]", { hasText: ": 1" }).waitFor();
  await shot("b54-09-track-dm.png", page.locator(".projects-track"));
  await page.locator('[data-character-tab="features"]').click();
  await page.locator(".item-row", { hasText: "Favore della Lanterna: Fiamma salda" }).waitFor();
  check(
    !(await page.locator("#content").innerText()).includes("Favore della Lanterna: Raggio guida"),
    "Refunded boon still in Features",
  );
  passed.push(
    "Lantern's Favour: 2 sparks, locked beam and outer ring with reasons, unlock Steady flame (click) and Guiding beam (keyboard) → 0 sparks, Warm glow blocked by sparks; DM opens the story ring, refunds the beam with reason → 1 spark, Features updated",
  );

  // ------------------------------------------------------------ group 5: DM vs player
  await role("player");
  await page.goto(base + "#characters?id=mira&tab=projects");
  await page.locator(".projects-closed > summary").click();
  const closedElvish = card("project-mira-elvish");
  await closedElvish.locator(".projects-note > summary").click();
  await closedElvish.locator('textarea[name="note"]').fill("Chiedere a Syl dei verbi irregolari");
  await closedElvish.locator('.projects-note button[type="submit"]').click();
  await page.waitForFunction(
    (k) =>
      JSON.parse(localStorage.getItem(k)).ext["projects-records"].notes.player[
        "project-mira-elvish"
      ] === "Chiedere a Syl dei verbi irregolari",
    key,
  );
  check(
    !(await page.locator('[data-projects-action="correct"]').count()),
    "Player sees the DM correction",
  );
  // A free project with Crash's fixed value.
  await page.locator('[data-projects-action="new-project"]').click();
  await page.locator('#dialog input[name="type"][value="custom"]').check();
  await page.locator('#dialog [name="title"]').fill("Mappa della torre");
  await page.locator('#dialog [name="stepLabel"]').fill("Stanze disegnate");
  await page.locator('#dialog [name="stepKind"]').selectOption("fixed");
  await page.locator('#dialog [name="increase"]').fill("2");
  await page.locator('#dialog [name="target"]').fill("6");
  await submitDialog();
  const map = await lastProject();
  await card(map.id).locator('[data-projects-action="fixed"]').click();
  await card(map.id).locator("[data-projects-step-progress]", { hasText: "2 / 6" }).waitFor();
  // Iria's private sheet: no campaign clock, personal time recorded by her owner only.
  await page.goto(base + "#characters?id=iria&tab=projects");
  const iriaTime = page.locator(".projects-time");
  await iriaTime.waitFor();
  check(
    !(await iriaTime.innerText()).includes("Orologio della campagna"),
    "Clock on a private sheet",
  );
  await iriaTime.locator('[data-projects-action="grant"]').click();
  check((await dialog().locator("h2").innerText()) === "Registra tempo personale", "Personal time");
  await page.locator('#dialog [name="hours"]').fill("4");
  await page.locator('#dialog [name="reason"]').fill("Due sere a ricopiare il libro");
  await submitDialog();
  await page.locator("[data-projects-available]", { hasText: "4 h" }).waitFor();
  state = await stored();
  check(state.log.at(-1).visibility === "private", "Personal time not private");
  await role("dm");
  await page.goto(base + "#characters?id=iria&tab=projects");
  await page.waitForTimeout(300);
  check(!(await page.locator(".projects-time").count()), "The DM sees Iria's private downtime");
  await page.goto(base + "#characters?id=mira&tab=projects");
  await page.locator(".projects-list").waitFor();
  check(
    !(await page.locator("#content").innerText()).includes("Chiedere a Syl dei verbi irregolari"),
    "DM reads the player's private note",
  );
  // The DM corrects the completed Elvish study (a physical face entered wrong): it reopens
  // and the language leaves the sheet; the player's new digital check completes it again.
  await page.locator(".projects-closed > summary").click();
  await card("project-mira-elvish").locator('[data-projects-action="correct"]').click();
  await page.locator('#dialog [name="step"]').selectOption("s3");
  await page.locator('#dialog [name="value"]').fill("0");
  await page.locator('#dialog [name="reason"]').fill("Faccia del dado fisico letta male");
  await submitDialog();
  await card("project-mira-elvish").locator('[data-projects-action="check"]').waitFor();
  state = await stored();
  check(!state.actors.mira.languages.includes("elvish"), "Reopened study kept the language");
  await role("player");
  await card("project-mira-elvish").locator('[data-projects-action="check"]').click();
  await submitDialog();
  await settleDice();
  await page.waitForFunction(
    (k) =>
      JSON.parse(localStorage.getItem(k)).ext.projects.projects.find(
        (p) => p.id === "project-mira-elvish",
      ).status !== "active" ||
      JSON.parse(localStorage.getItem(k)).ext["projects-records"].rolls.length >= 2,
    key,
  );
  await role("dm");
  await card(map.id).locator('[data-projects-action="correct"]').click();
  await page.locator('#dialog [name="step"]').selectOption("s1");
  await page.locator('#dialog [name="value"]').fill("4");
  await page.locator('#dialog [name="reason"]').fill("Due stanze erano già disegnate");
  await submitDialog();
  await card(map.id).locator("[data-projects-step-progress]", { hasText: "4 / 6" }).waitFor();
  await page.locator(".projects-log > details > summary").click();
  const logItems = page.locator(".projects-log-list li");
  const before = await logItems.count();
  check(
    (await page.locator(".projects-log").innerText()).includes("correzione del DM"),
    "Correction not in the change log",
  );
  await shot("b54-10-dm-view-log.png", page.locator(".projects-log"));
  await logItems.first().locator('[data-projects-action="dismiss"]').click();
  await page.waitForFunction(
    ([n]) => document.querySelectorAll(".projects-log-list li").length === n - 1,
    [before],
  );
  // The change log stays open for the next dismissal (disclosures survive the re-render).
  check(await page.locator(".projects-log > details").evaluate((el) => el.open), "Log closed");
  // DM discretion: two days of travel are not downtime. Livia's clock hours are withheld.
  await page.goto(base + "#characters?id=livia&tab=projects");
  await page.locator("[data-projects-available]", { hasText: "16 h" }).waitFor();
  await page.locator('.projects-time [data-projects-action="grant"]').click();
  await page.locator('#dialog input[name="mode"][value="withhold"]').check();
  await page.locator('#dialog [name="hours"]').fill("16");
  await page.locator('#dialog [name="reason"]').fill("Due giorni di viaggio verso la torre");
  await submitDialog();
  await page.locator("[data-projects-available]", { hasText: "0 h" }).waitFor();
  await page
    .waitForFunction(() => document.activeElement?.id === "projects-time-livia", null, {
      timeout: 2000,
    })
    .catch(() => {});
  const grantFocus = await page.evaluate(() => {
    const a = document.activeElement;
    return a ? a.tagName + "#" + a.id + "." + a.className : "none";
  });
  check(
    grantFocus === "H2#projects-time-livia.",
    "Focus not returned to the downtime heading: " + grantFocus,
  );
  await page.locator(".projects-grants > summary").click();
  check(
    (await page.locator(".projects-grants").innerText()).includes(
      "−16 h · Due giorni di viaggio verso la torre",
    ),
    "Withheld hours not listed",
  );
  await shot("b54-rf-02-withheld.png", page.locator(".projects-time"));
  // Campaign → Downtime: the party overview and the grant to everyone.
  await page.goto(base + "#campaign?tab=projects");
  await page.locator(".projects-party").waitFor();
  await page.locator('[data-projects-action="grant-party"]').click();
  await page.locator('#dialog [name="hours"]').fill("8");
  await page.locator('#dialog [name="reason"]').fill("Festa delle lanterne");
  await submitDialog();
  state = await stored();
  check(
    state.ext.projects.downtime.mira.grants.some((g) => g.reason === "Festa delle lanterne"),
    "Party grant missing",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot("b54-11-campaign-downtime.png");
  passed.push(
    "DM vs player: private note saved and invisible to the DM; no Correct for the player; Iria's private sheet records 4 h of personal time (private log, no clock) and is hidden from the DM; free fixed-value project +2; DM reopens the completed Elvish study with reason (language off the sheet), the player's digital check follows; DM correction 2 → 4 with reason in the change log; DM dismisses an entry and the log stays open; DM withholds Livia's 16 clock hours with reason (−16 h listed, focus back); Campaign › Downtime grants 8 h to the party",
  );

  // ------------------------------------------------------------ group 6: EN phone 390, touch
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
  await quietTips(phone);
  await phone.goto(base + "#characters?id=mira&tab=projects");
  await phone.locator(".projects-time").waitFor();
  check(
    (await phone.locator(".projects-time").innerText()).includes("Working hours available"),
    "EN label",
  );
  // B62: the gifts sub-section would sit in Features & Traits: check there, then come back.
  await phone.goto(base + "#characters?id=mira&tab=features");
  await phone.locator(".character-tabs").waitFor();
  check(
    !(await phone.locator('[data-character-tab="projects-track"]').count()),
    "Boons tab for Mira",
  );
  await phone.goto(base + "#characters?id=mira&tab=projects");
  await phone.locator(".projects-time").waitFor();
  await phone.locator('[data-projects-action="new-project"]').tap();
  await phone.locator('#dialog input[name="type"][value="custom"]').check();
  await phone.locator('#dialog [name="title"]').fill("Herb garden");
  await phone.locator('#dialog [name="stepLabel"]').fill("Planting");
  await phone.locator('#dialog [name="stepKind"]').selectOption("time");
  await phone.locator('#dialog [name="hours"]').fill("8");
  check(
    await phone.evaluate(
      () =>
        document.querySelector("#dialog").scrollWidth <=
        document.querySelector("#dialog").clientWidth + 1,
    ),
    "New project dialog overflows",
  );
  await submitDialog(phone, true);
  const garden = await lastProject(phone);
  const gardenCard = card(garden.id, phone);
  await gardenCard.waitFor();
  await quietTips(phone);
  await phone.locator(".projects-list").evaluate((el) => el.scrollIntoView({ block: "start" }));
  await phone.screenshot({ path: dir + "b54-12-phone-en-downtime.png" });
  await gardenCard.locator('[data-projects-action="time"]').tap();
  await submitDialog(phone, true);
  await phone.waitForFunction(
    ([k, id]) =>
      JSON.parse(localStorage.getItem(k)).ext.projects.projects.find((p) => p.id === id).status ===
      "completed",
    [key, garden.id],
  );
  check(await noOverflow(phone), "Phone downtime tab overflows horizontally");
  const small = await smallTargets(phone, ".projects");
  check(!small.length, "Phone targets under 40px: " + JSON.stringify(small));
  // Livia's boons in English on the phone.
  await phone.goto(base + "#characters?id=livia&tab=projects-track");
  await phone.locator(".projects-track").waitFor();
  check(
    (await phone.locator(".projects-track h2").first().innerText()) === "Lantern's Favour",
    "EN track",
  );
  check(await noOverflow(phone), "Phone track overflows horizontally");
  const smallTrack = await smallTargets(phone, ".projects-track");
  check(!smallTrack.length, "Phone track targets under 40px: " + JSON.stringify(smallTrack));
  await phone.locator('.projects-node[data-node="warm-glow"]').tap();
  await phone.locator('[data-node="warm-glow"][aria-pressed="true"]').waitFor();
  await phone.locator(".projects-track").evaluate((el) => el.scrollIntoView({ block: "start" }));
  await phone.screenshot({ path: dir + "b54-13-phone-en-track.png" });
  // Offline: a shared downtime change is refused with a readable message.
  await phone.goto(base + "#characters?id=mira&tab=projects");
  await phone.locator('[data-service="preferences"]').tap();
  await phone.locator('#dialog [name="offline"]').check();
  await submitDialog(phone, true);
  await phone.locator(".projects-notice", { hasText: "You are offline" }).first().waitFor();
  await phone.locator('[data-projects-action="new-project"]').tap();
  await phone.locator('#dialog input[name="type"][value="custom"]').check();
  await phone.locator('#dialog [name="title"]').fill("Offline try");
  await phone.locator('#dialog [name="stepLabel"]').fill("Step");
  await phone.locator('#dialog button[type="submit"]').tap();
  await phone.locator("#dialog .dialog-error", { hasText: "You are offline" }).waitFor();
  await phone.locator("#dialog footer [data-close]").tap();
  check(
    !(await stored(phone)).ext.projects.projects.some((p) => p.title.en === "Offline try"),
    "Offline project created",
  );
  await phoneContext.close();
  passed.push(
    "EN 390 touch: Downtime labels, no Boons tab for Mira as player, free project 'Herb garden' 8 h completed by touch (Festa delle lanterne hours), no overflow, targets ≥40px; Livia's 'Lantern's Favour' tree; offline refusal readable",
  );

  check(!errors.length, "Page errors: " + errors.join(" | "));
  await context.close();
  return { passed, errors };
}
