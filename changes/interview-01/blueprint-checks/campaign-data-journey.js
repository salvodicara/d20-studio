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
  // B62: campaign sections sit in Kanka-style groups; a folded group is opened first.
  const openCampaignSection = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const link = page.locator(`.campaign-sidebar nav [data-campaign-tab="${id}"]`);
    await link.waitFor({ state: "attached" });
    const toggle = page.locator(
      `.campaign-sidebar [data-campaign-group]:has([data-campaign-tab="${id}"]) [data-campaign-group-toggle]`,
    );
    if ((await toggle.getAttribute("aria-expanded")) === "false") await press(toggle);
    await press(link);
  };
  // B50 — Campaign data: copy, archive, snapshots, export and trash. Real clicks, keys,
  // file chooser, downloads and touch against the one app: IT desktop 1440 (DM and player
  // identities), then EN phone 390 with touch. Synthetic data only; resets this browser's
  // demo state. Screenshots and downloaded files go to the B50 evidence folder, never into
  // the checkout.
  const browser = rootPage.context().browser();
  for (const prior of browser.contexts()) if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  // Since the independent review (B50-rf) the journey writes into the reviewer's folder.
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B50-rf/";
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const members = async () => (await stored()).ext["campaign-members"];
  const data = async () => (await stored()).ext["campaign-data"];
  const as = (role) => page.locator("#demo-role").selectOption(role);
  const button = (name, root = page) => root.getByRole("button", { name, exact: true });
  const toast = (text) => page.locator("#toast.shown", { hasText: text }).waitFor();
  const dialog = page.locator("#dialog[open]");
  const submit = () => page.locator("#dialog[open] button[type=submit]").click();
  const shot = (name, full = true) => page.screenshot({ path: dir + name, fullPage: full });
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const readDownload = async (download) => {
    const stream = await download.createReadStream();
    let text = "";
    for await (const chunk of stream) text += chunk.toString("utf8");
    return text;
  };
  const campaignByName = async (name) => {
    const slice = await members();
    const all = { ...slice.parked };
    return Object.entries(all).find(([, row]) => row.campaign?.name === name)?.[0] ?? null;
  };
  const openData = async () => {
    await page.locator('.app-header [data-nav="home"]').last().click();
    await page.getByRole("button", { name: "Apri campagna" }).first().click();
    await openCampaignSection(page, "campaign-data"); // B62: the «Gestione DM» group
    await page.getByRole("heading", { name: "Dati della campagna", level: 1 }).waitFor();
  };
  // The Table header has only the logo and the App menu: Home first, then Campagne.
  const goCampaigns = async () => {
    await page.locator('.app-header [data-nav="home"]').first().click();
    await page.locator('.app-header [data-nav="campaigns"]').first().click();
    await page.getByRole("heading", { name: "Campagne", level: 1 }).waitFor();
  };
  const moveTokenLeft = async (actorId) => {
    await page.locator("#battle-map").waitFor();
    const token = page.locator(`#battle-map [data-actor="${actorId}"]`);
    await token.focus();
    await page.keyboard.press("Enter");
    await page.locator("#battle-map").focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
  };
  const tokenOf = (state, actorId) =>
    state.scenes.find((s) => s.id === "old-watch").tokens.find((t) => t.actorId === actorId);
  // A copy's scenes have their own ids; `dataCopy.root` names the scene they come from.
  const byRoot = (scenes, root) => scenes.find((s) => (s.dataCopy?.root ?? s.id) === root);
  const torchOn = (state, sceneId) =>
    state.ext["fog-vision"]?.scenes?.[sceneId]?.lights?.find((l) => l.id === "tower-torch")?.on !==
    false;
  const PLAN = "Piano di Livia: scoprire chi paga il custode";
  // Players' sheets never travel; everything else on the maps is a campaign creature.
  const PLAYER_SHEETS = ["livia", "mira"];
  const playerTokens = (scenes) =>
    scenes.reduce(
      (n, s) => n + s.tokens.filter((t) => PLAYER_SHEETS.includes(t.actorId)).length,
      0,
    );
  const allTokens = (scenes) => scenes.reduce((n, s) => n + s.tokens.length, 0);

  try {
    // 1. Reset, then the player writes a personal "Solo io" note in the campaign.
    await page.goto(base + "#home");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await as("player");
    await page.locator('.service-nav [data-service="notes"]').click();
    await button("Nuovo appunto").click();
    check(
      (await page.locator("[data-campaign-context]").inputValue()) === "lanterns",
      "Note context is not the campaign",
    );
    await page.locator('[data-campaign-path="data.title"]').fill("Sospetto di Livia");
    await page
      .locator('[data-campaign-path="data.body"]')
      .fill("Credo che la lanterna l’abbia riaccesa il custode.");
    await button("Salva bozza e aggiorna anteprima").click();
    await button("Salva contenuto per questi destinatari").click();
    await page.waitForTimeout(300);
    let state = await stored();
    const playerNote = state.campaignContent.entries.find((e) => e.ownerId === "player");
    check(
      playerNote?.access.mode === "private" && playerNote.campaignId === "lanterns",
      "Player note not private in the campaign",
    );
    // The DM writes their own "Solo io" note too.
    await as("dm");
    await page.locator('.service-nav [data-service="notes"]').click();
    await button("Nuovo appunto").click();
    await page.locator('[data-campaign-path="data.title"]').fill("Appunti del DM");
    await page.locator('[data-campaign-path="data.body"]').fill("Il custode mente sul carro.");
    await button("Salva bozza e aggiorna anteprima").click();
    await button("Salva contenuto per questi destinatari").click();
    await page.waitForTimeout(300);
    // The DM gives Doran to Livia's player (Membri › Personaggi, B13 seat); she writes her
    // "Solo io" plan on Doran's sheet, which the DM never reads, not even in an export.
    await page.goto(base + "#campaign?tab=campaign-members");
    await page.locator('[data-cm="tab"][data-tab="characters"]').first().click();
    const seat = page.locator('[data-cm-form="assign"][data-actor="doran"]');
    await seat.locator("select").selectOption("player");
    await seat.getByRole("button", { name: "Riassegna" }).click();
    await page.waitForTimeout(300);
    check((await stored()).actors.doran.controllers?.includes("player"), "Doran not assigned");
    await as("player");
    await page.goto(base + "#characters?id=doran&tab=extras");
    await button("Modifica piano").click();
    await page.locator('#dialog [name="text"]').fill(PLAN);
    await submit();
    await page.waitForTimeout(300);
    check((await stored()).actors.doran.personalPlans?.player === PLAN, "Player plan not saved");
    await as("dm");
    passed.push(
      "Player and DM each wrote a «Solo io» note; the player also a «Solo io» plan on Doran, assigned to her",
    );

    // 2. DM: Inizio → Apri campagna → Dati della campagna (two clicks from Home).
    await openData();
    check(await noOverflow(), "Overflow on the data section at 1440");
    await shot("01-section-it.png");
    check(
      (await page.locator("[data-cd-page]").innerText()).includes(
        "Includi le mie note «Solo io» (1)",
      ),
      "Own private note count not offered",
    );
    passed.push("Section reached in two clicks from Home; blocks visible; no overflow at 1440");

    // 3. Snapshot "Prima della battaglia" with the keyboard (Enter submits the dialog).
    await button("Crea istantanea…").click();
    await page.locator("#dialog [name=name]").fill("Prima della battaglia");
    await page.keyboard.press("Enter");
    await toast("Istantanea creata · Prima della battaglia");
    check(
      (await page.locator(".cd-row", { hasText: "Prima della battaglia" }).count()) === 1,
      "Snapshot row missing",
    );
    const snapshotId = (await data()).snapshots[0].id;
    passed.push("Snapshot «Prima della battaglia» taken from the keyboard");

    // 4. The battle: the Sentinella moves on the Table (keyboard), then Show changes.
    await page
      .locator(".campaign-sidebar")
      .getByRole("button", { name: "Entra al Tavolo" })
      .click();
    await moveTokenLeft("goblin-1");
    state = await stored();
    const movedX = tokenOf(state, "goblin-1").x;
    check(movedX < 620, "Goblin did not move: " + movedX);
    await openData();
    await page
      .locator(`[data-cd-snapshot="${snapshotId}"]`)
      .getByRole("button", { name: "Mostra differenze" })
      .click();
    await dialog.waitFor();
    const diffText = await page.locator("#dialog").innerText();
    check(
      diffText.includes(`Sentinella spostato (620, 250) → (${movedX}, 250)`),
      "Diff does not show the move: " + diffText,
    );
    await shot("02-snapshot-diff.png", false);
    // Restore as copy from the diff dialog (Obsidian "copy"), never overwriting.
    await submit();
    await page.locator("#dialog h2", { hasText: "Ripristina come copia" }).waitFor();
    const restoreName = await page.locator("#dialog [name=name]").inputValue();
    check(restoreName.includes("Prima della battaglia"), "Restore name: " + restoreName);
    await shot("03-restore-as-copy-dialog.png", false);
    await submit();
    await toast("Ripristinata come copia");
    state = await stored();
    const restoredId = await campaignByName(restoreName);
    const restored = state.ext["campaign-members"].parked[restoredId];
    const restoredGoblin = byRoot(restored.scenes, "old-watch").tokens.find(
      (t) => state.actors[t.actorId]?.dataCopy?.from === "goblin-1",
    );
    check(
      !restored.scenes.some((s) => state.scenes.some((o) => o.id === s.id)),
      "The restored copy shares a scene id with the campaign in play",
    );
    check(restoredGoblin?.x === 620, "Restored copy is not as before the battle");
    check(tokenOf(state, "goblin-1").x === movedX, "Restore overwrote the campaign in play");
    check(
      (await page.locator(`[data-cd-campaign="${restoredId}"].is-new`).count()) === 1,
      "New campaign not highlighted",
    );
    passed.push(
      `Show changes lists the move 620 → ${movedX}; restored as a new campaign with the goblin at 620; campaign in play untouched`,
    );

    // 5. Global Undo reverts only the gameplay move; the restored copy stays.
    await page
      .locator(".campaign-sidebar")
      .getByRole("button", { name: "Entra al Tavolo" })
      .click();
    await page.locator('[data-table="undo"]').click();
    await page.waitForTimeout(300);
    state = await stored();
    check(tokenOf(state, "goblin-1").x === 620, "Undo did not revert the move");
    check(state.ext["campaign-members"].parked[restoredId], "Undo removed the restored copy");
    check((await data()).snapshots.length === 1, "Undo removed the snapshot");
    passed.push("Table Undo reverted the move; snapshot and restored copy kept (data commands)");

    // 6. Copy Game: checklist without Treasure; players copied, their sheets not.
    await openData();
    await button("Copia la campagna…").click();
    await dialog.waitFor();
    const copyName = "Le lanterne — seconda tavola";
    await page.locator("#dialog [name=name]").fill(copyName);
    check(
      await page.locator('#dialog input[value="loot"]').isChecked(),
      "Treasure not offered checked",
    );
    await page.locator("#dialog .cd-component", { hasText: "Tesoro e scorta del gruppo" }).click();
    check(
      !(await page.locator('#dialog input[value="loot"]').isChecked()),
      "Treasure still checked",
    );
    const sourceScenes = (await stored()).scenes;
    check(
      (await page.locator("#dialog").innerText()).includes(
        `le ${playerTokens(sourceScenes)} dei giocatori restano fuori`,
      ),
      "Player tokens note missing",
    );
    await page.locator("#dialog .dialog-body").evaluate((el) => (el.scrollTop = 0));
    await shot("04-copy-dialog.png", false);
    await submit();
    await toast("Copia creata");
    const copyId = await campaignByName(copyName);
    state = await stored();
    const copy = state.ext["campaign-members"].parked[copyId];
    check(
      copy.scenes.length === sourceScenes.length &&
        allTokens(copy.scenes) === allTokens(sourceScenes) - playerTokens(sourceScenes) &&
        playerTokens(copy.scenes) === 0,
      "Copy tokens: " + allTokens(copy.scenes),
    );
    check(
      copy.campaign.members.some((m) => m.id === "player"),
      "Players not copied with their role",
    );
    check(!copy.ext.loot && copy.ext.handouts && copy.ext["random-tables"], "Copy components");
    check(
      !state.campaignContent.entries.some(
        (e) => e.campaignId === copyId && JSON.stringify(e).includes("Sospetto di Livia"),
      ),
      "The player's Solo io note was copied",
    );
    passed.push(
      `Copy Game: new campaign with ${allTokens(copy.scenes)} creature tokens on ${copy.scenes.length} scenes (players' ${playerTokens(sourceScenes)} left out), players as members, no Treasure, no Solo io note of others`,
    );

    // 7. The player sees the copy in Campaigns, but no data section anywhere.
    await as("player");
    await goCampaigns();
    await page.locator(".cm-card", { hasText: copyName }).waitFor();
    await page.locator('.app-header [data-nav="home"]').last().click();
    await page.getByRole("button", { name: "Apri campagna" }).first().click();
    check(
      !(await page.locator('.campaign-sidebar [data-campaign-tab="campaign-data"]').count()),
      "Player sees the data section",
    );
    await page.goto(base + "#campaign?tab=campaign-data");
    await page.getByRole("heading", { name: "Sezione non disponibile per questo ruolo" }).waitFor();
    await shot("05-player-view.png", false);
    // The palette (B23) offers the data commands to the campaign's DM only.
    const paletteHas = async (text) => {
      await page.keyboard.press("Control+k");
      await page.locator("[data-cmdk-input]").fill(">" + text);
      await page.waitForTimeout(200);
      const found = await page.locator(".cmdk-option", { hasText: text }).count();
      await page.keyboard.press("Escape");
      return found;
    };
    check(!(await paletteHas("Esporta la campagna")), "Player's palette offers the export");
    passed.push(
      "Player: copy listed in Campagne; no data section; direct address refused; no data commands in the palette",
    );

    // 8. Independence: launch the copy, move its goblin, come back: the original is intact.
    await as("dm");
    await goCampaigns();
    await page.locator(`.cm-card [data-cm="launch"][data-id="${copyId}"]`).click();
    await page.locator("#battle-map").waitFor();
    state = await stored();
    check(state.campaign.id === copyId, "Copy not launched");
    const copyActive = state.scenes.find((s) => s.id === state.activeSceneId);
    const copyGoblin = copyActive.tokens.find(
      (t) => state.actors[t.actorId].dataCopy?.from === "goblin-1",
    ).actorId;
    check(
      (await page.locator("#battle-map [data-actor]").count()) === copyActive.tokens.length &&
        !(await page.locator('#battle-map [data-actor="livia"]').count()),
      "Copy map does not show only its creatures",
    );
    await moveTokenLeft(copyGoblin);
    // B43 missions and B42 world map came with the copy, under its own campaign id.
    await page.goto(base + "#campaign?tab=quests");
    const firstQuest = Object.values(state.ext.quests?.campaigns?.lanterns?.pages ?? []).find(
      (p) => p.type === "quest" && p.status === "active",
    );
    if (firstQuest) await page.getByText(firstQuest.title).first().waitFor();
    await page.goto(base + "#campaign?tab=world-map");
    await page.waitForTimeout(300);
    check(!(await page.getByText("Nessuna mappa ancora").count()), "World map not copied");
    await shot("16-copy-missions-world.png", false);
    // The copy's tower keeps its lights under its own id: putting out its torch leaves
    // the original's torch burning (B35 fog-vision data per scene).
    const copyTower = byRoot(state.scenes, "lantern-tower");
    if (copyTower) {
      check(copyTower.id !== "lantern-tower" && torchOn(state, copyTower.id), "Copy tower");
      await page.goto(base + "#preparation");
      const activate = page.locator(`[data-prep-activate="${copyTower.id}"]`);
      // The command sits in the scene's «Altre azioni» menu.
      await page.locator("details", { has: activate }).locator("summary").click();
      await activate.click();
      await submit();
      await page.locator("#battle-map").waitFor();
      const torch = page.locator('[data-fv-diag-light="tower-torch"]');
      if (!(await torch.isVisible())) await openTablePanel(page, "fog-vision-panel"); // B62: Scene › Vision
      await torch.click();
      await page.waitForTimeout(300);
      state = await stored();
      check(!torchOn(state, copyTower.id), "The copy's torch did not go out");
      check(torchOn(state, "lantern-tower"), "The original's torch went out with the copy's");
      await shot("17-copy-tower-torch-out.png", false);
    }
    await goCampaigns();
    await page.locator('.cm-card [data-cm="launch"][data-id="lanterns"]').click();
    await page.locator("#battle-map").waitFor();
    state = await stored();
    check(state.campaign.id === "lanterns", "Lanterns not back");
    check(tokenOf(state, "goblin-1").x === 620, "Original goblin changed with the copy");
    check(allTokens(state.scenes) === allTokens(sourceScenes), "Original lost tokens");
    const copyGoblinX = state.ext["campaign-members"].parked[copyId].scenes
      .find((s) => s.id === copyActive.id)
      .tokens.find((t) => t.actorId === copyGoblin).x;
    check(copyGoblinX < 620, "Copy move not kept");
    check(torchOn(state, "lantern-tower"), "Original tower torch changed");
    passed.push(
      `Copy launched with its own ${copyActive.tokens.length} tokens; its goblin moved to ${copyGoblinX}; original goblin still at 620, all ${allTokens(sourceScenes)} tokens kept; the copy's missions and world map are there; its tower torch out, the original's still burning`,
    );

    // 9. Export JSON (Kanka: prepare, notice, download); the bell counts it.
    await openData();
    const bell = page.locator('.service-nav [data-service="requests"]');
    const bellBefore = Number(
      /(\d+) notific/.exec((await bell.getAttribute("aria-label")) ?? "")?.[1] ?? 0,
    );
    await button("Prepara l’esportazione").click();
    await toast("Esportazione JSON pronta");
    const bellAfter = Number(
      /(\d+) notific/.exec((await bell.getAttribute("aria-label")) ?? "")?.[1] ?? 0,
    );
    check(bellAfter === bellBefore + 1, `Bell ${bellBefore} → ${bellAfter}`);
    const jsonWait = page.waitForEvent("download");
    await page.locator("[data-cd-export]").first().getByRole("button", { name: "Scarica" }).click();
    const jsonDownload = await jsonWait;
    check(
      /^le-lanterne-di-bruma-\d{4}-\d{2}-\d{2}\.d20campaign\.json$/.test(
        jsonDownload.suggestedFilename(),
      ),
      "JSON file name: " + jsonDownload.suggestedFilename(),
    );
    await jsonDownload.saveAs(dir + "export-lanterns.d20campaign.json");
    const jsonText = await readDownload(jsonDownload);
    const exported = JSON.parse(jsonText);
    check(exported.format === "d20-studio-campaign" && exported.rules.edition === "2024", "Format");
    check(!jsonText.includes("Sospetto di Livia"), "Player's Solo io note exported");
    check(!jsonText.includes(PLAN), "Player's Solo io plan on Doran exported");
    check(exported.linked?.quests && !exported.linked?.media, "Missions in, library refs out");
    check(!jsonText.includes("Appunti del DM"), "DM's own Solo io note exported without opt-in");
    check(
      exported.scenes.length === sourceScenes.length &&
        exported.creatures.every((a) => a.kind === "npc" || a.owner === "dm") &&
        !exported.creatures.some((a) => PLAYER_SHEETS.includes(a.id)) &&
        exported.characters.some((a) => a.id === "livia"),
      "JSON content",
    );
    // Markdown, chosen with the arrow keys, with the DM's own notes this time.
    await page.locator('[data-cd-form="export"] input[value="json"]').focus();
    await page.keyboard.press("ArrowRight");
    check(
      await page.locator('[data-cd-form="export"] input[value="markdown"]').isChecked(),
      "Arrow key did not choose Markdown",
    );
    await page.locator('[data-cd-form="export"] .cd-check').click();
    await button("Prepara l’esportazione").click();
    await toast("Esportazione Markdown pronta");
    const mdWait = page.waitForEvent("download");
    await page.locator("[data-cd-export]").first().getByRole("button", { name: "Scarica" }).click();
    const mdDownload = await mdWait;
    await mdDownload.saveAs(dir + "export-lanterns.md");
    const md = await readDownload(mdDownload);
    check(md.startsWith("# Le lanterne di Bruma"), "Markdown title");
    check(md.includes("## Scene e mappe") && md.includes("| Sentinella | PNG |"), "Markdown body");
    check(md.includes("Appunti del DM"), "Own notes missing after opt-in");
    check(!md.includes("Sospetto di Livia"), "Player's Solo io note in Markdown");
    check(!md.includes(PLAN), "Player's Solo io plan in Markdown after the DM's opt-in");
    check(md.includes("## Missioni e archivio"), "Missions missing from Markdown");
    await shot("06-export-ready.png");
    passed.push(
      "Export JSON and Markdown downloaded (real files); bell +1; others' Solo io notes and plans never in; own notes only when chosen; missions and world included",
    );

    // 10. Import: a Markdown file is refused readably; the JSON opens a preview first.
    let chooserWait = page.waitForEvent("filechooser");
    await button("Importa da file…").click();
    await (await chooserWait).setFiles(dir + "export-lanterns.md");
    await toast("non è JSON leggibile");
    check(!(await dialog.count()), "A dialog opened for an invalid file");
    chooserWait = page.waitForEvent("filechooser");
    await button("Importa da file…").click();
    await (await chooserWait).setFiles(dir + "export-lanterns.d20campaign.json");
    await page.locator("#dialog h2", { hasText: "Importa come nuova campagna" }).waitFor();
    const preview = await page.locator("#dialog").innerText();
    check(preview.includes("I giocatori del file non entrano"), "Members warning missing");
    check(await page.locator('#dialog input[value="members"]').isDisabled(), "Members importable");
    await shot("07-import-preview.png", false);
    await submit();
    await toast("Campagna importata");
    const importName = "Le lanterne di Bruma (importata)";
    const importId = await campaignByName(importName);
    state = await stored();
    check(
      state.ext["campaign-members"].campaigns[importId].ownerId === "dm" &&
        !state.ext["campaign-members"].parked[importId].campaign.members.some(
          (m) => m.id === "player",
        ),
      "Import owner/members",
    );
    passed.push(
      "Import: Markdown refused with a message; JSON previewed, then a new campaign without the file's players",
    );

    // 11. Copy a scene into the copy: overwrite warning by object ID, then Replace.
    await page.locator('[data-cd-form="scene-copy"] [name=targetId]').selectOption(copyId);
    await button("Controlla e copia…").click();
    await dialog.waitFor();
    const warning = await page.locator("#dialog").innerText();
    check(warning.includes(`«${copyName}» ha già questa scena`), "Overwrite warning missing");
    check(/Pedine che restano fuori\s*Livia, Mira/.test(warning), "Dropped tokens: " + warning);
    await shot("08-scene-copy-warning.png", false);
    await page.locator("#dialog .cd-choice", { hasText: "Sostituiscila" }).click();
    await submit();
    await toast("Scena sostituita");
    state = await stored();
    const target = state.ext["campaign-members"].parked[copyId];
    check(
      target.scenes.filter((s) => (s.dataCopy?.root ?? s.id) === "old-watch").length === 1,
      "Scene duplicated instead of replaced",
    );
    const replacedGoblin = byRoot(target.scenes, "old-watch").tokens.find(
      (t) => state.actors[t.actorId].dataCopy?.from === "goblin-1",
    );
    check(replacedGoblin.x === 620, "Replaced scene is not the source scene");
    const auto = state.ext["campaign-data"].snapshots.find((s) => s.campaignId === copyId);
    check(auto?.kind === "auto", "No automatic snapshot of the destination");
    passed.push(
      "Scene copy: warning that the copy already has the scene, Livia and Mira left out, Replace after an automatic snapshot of the destination",
    );

    // 12. Archive with the blocked list; the copy picker refuses it; Restore.
    await page
      .locator(`[data-cd-campaign="${importId}"]`)
      .getByRole("button", { name: "Archivia…" })
      .click();
    const archiveText = await page.locator("#dialog").innerText();
    for (const line of [
      "Avviare la campagna ed entrare al Tavolo",
      "Link d’invito, inviti diretti e richieste d’ingresso",
      "Copia, istantanee ed esportazione",
    ])
      check(archiveText.includes(line), "Blocked list: " + line);
    await shot("09-archive-dialog.png", false);
    await submit();
    await toast("Campagna archiviata");
    const archivedRow = page.locator(`[data-cd-campaign="${importId}"]`);
    await archivedRow.locator("summary").click();
    check(
      (await archivedRow.innerText()).includes("Ricevere scene copiate da altre campagne"),
      "Archived row does not list the blocks",
    );
    check(
      await page
        .locator(`[data-cd-form="scene-copy"] option[value="${importId}"]`)
        .evaluate((o) => o.disabled),
      "Archived campaign still a copy target",
    );
    await shot("10-archived-row.png");
    await archivedRow.getByRole("button", { name: "Ripristina" }).click();
    await toast("Campagna ripristinata");
    check((await members()).campaigns[importId].status === "active", "Not restored");
    passed.push(
      "Archive lists 5 blocked commands, refuses it as a copy target; Restore makes it active",
    );

    // 13. Delete with the typed name (wrong name refused), trash 30 days, recover, purge.
    await page
      .locator(`[data-cd-campaign="${importId}"]`)
      .getByRole("button", { name: "Elimina…" })
      .click();
    await page.locator("#dialog [name=confirmName]").fill("le lanterne");
    await submit();
    await page
      .locator("#dialog .dialog-error", { hasText: "Scrivi esattamente il nome" })
      .waitFor();
    await page.locator("#dialog [name=confirmName]").fill(importName);
    await submit();
    await toast("Campagna nel cestino");
    const trashRow = page.locator(`[data-cd-trash="${importId}"]`);
    check((await trashRow.innerText()).includes("(30 giorni)"), "Trash window not shown");
    await shot("11-trash.png");
    await trashRow.getByRole("button", { name: "Recupera" }).click();
    await toast("Campagna recuperata");
    check((await members()).campaigns[importId].status === "active", "Not recovered");
    await page
      .locator(`[data-cd-campaign="${importId}"]`)
      .getByRole("button", { name: "Elimina…" })
      .click();
    await page.locator("#dialog [name=confirmName]").fill(importName);
    await submit();
    await toast("Campagna nel cestino");
    await page
      .locator(`[data-cd-trash="${importId}"]`)
      .getByRole("button", { name: "Elimina definitivamente…" })
      .click();
    await page.locator("#dialog [name=confirmName]").fill(importName);
    await submit();
    await toast("Campagna eliminata definitivamente");
    check(!(await members()).campaigns[importId], "Purged campaign still stored");
    check(!(await page.locator(`[data-cd-trash="${importId}"]`).count()), "Trash row left");
    passed.push(
      "Delete: wrong name refused, trash shows 30 days, Recover, then typed purge removes it",
    );

    // 14. Reload keeps snapshots, exports, copies and the activity.
    await page.reload();
    // The demo identity is per visit: a reload comes back as the player, who is refused.
    await page.getByRole("heading", { name: "Sezione non disponibile per questo ruolo" }).waitFor();
    await as("dm");
    await page.getByRole("heading", { name: "Dati della campagna", level: 1 }).waitFor();
    const after = await data();
    check(after.snapshots.length === 2 && after.exports.length === 2, "Slice after reload");
    check(
      (await page.locator(".cd-activity li").count()) >= 8,
      "Activity after reload: " + (await page.locator(".cd-activity li").count()),
    );
    check((await page.locator(`[data-cd-campaign="${copyId}"]`).count()) === 1, "Copy row");
    check(await noOverflow(), "Overflow after reload at 1440");
    await shot("12-after-reload.png");
    // "Cosa è pronto": the area is active with no contained warning of its own.
    await page.locator('[data-service="scope"]').first().click();
    const report = await page.locator("#dialog .ext-report").evaluate((el) => el.textContent);
    check(
      /B50 · Dati della campagna[^·]*— attiva · \d+ contributi(?! ·)/.test(report) &&
        !report.includes("campaign-data ·"),
      "B50 report row or warnings: " +
        report.slice(report.indexOf("B50"), report.indexOf("B50") + 160),
    );
    await page.keyboard.press("Escape");
    passed.push("Reload keeps 2 snapshots, 2 ready exports, copies and the data activity");

    // 15. EN phone 390 with touch: same local data, DM, All sections → Campaign data.
    const saved = await page.evaluate((k) => localStorage.getItem(k), key);
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
    });
    const mobile = await phone.newPage();
    mobile.on("pageerror", (error) => errors.push("390: " + error.message));
    await mobile.goto(base + "#home");
    await mobile.evaluate(([k, v]) => localStorage.setItem(k, v), [key, saved]);
    await mobile.reload();
    await mobile.locator("#demo-role").selectOption("dm");
    await mobile.locator('.service-nav [data-service="preferences"]').tap();
    await mobile.locator("#dialog select[name=lang]").selectOption("en");
    await mobile.locator("#dialog button[type=submit]").tap();
    await mobile.getByRole("button", { name: "Open campaign" }).first().tap();
    await mobile.locator("[data-campaign-sections]").tap();
    await mobile.locator("#dialog").getByRole("button", { name: "Campaign data" }).tap();
    await mobile.getByRole("heading", { name: "Campaign data", level: 1 }).waitFor();
    check(await noOverflow(mobile), "Overflow on EN data section at 390");
    const small = await mobile.evaluate(() =>
      [
        ...document.querySelectorAll(
          "[data-cd-page] button, [data-cd-page] summary, [data-cd-page] .cd-choice, [data-cd-page] select",
        ),
      ]
        .filter((el) => el.offsetParent !== null)
        .map((el) => [
          el.textContent.trim().slice(0, 30),
          Math.round(el.getBoundingClientRect().height),
        ])
        .filter(([, h]) => h < 40),
    );
    check(!small.length, "Targets under 40 px at 390: " + JSON.stringify(small));
    await mobile.screenshot({ path: dir + "13-phone-en-section.png", fullPage: true });
    await mobile.getByRole("button", { name: "Take snapshot…" }).tap();
    await mobile.locator("#dialog [name=name]").fill("Before the ambush");
    await mobile.locator("#dialog button[type=submit]").tap();
    await mobile
      .locator("#toast.shown", { hasText: "Snapshot taken · Before the ambush" })
      .waitFor();
    await mobile.getByRole("button", { name: "Copy the campaign…" }).tap();
    await mobile.locator("#dialog h2", { hasText: "Copy the campaign" }).waitFor();
    check(await noOverflow(mobile), "Overflow on EN copy dialog at 390");
    check(
      (await mobile.locator("#dialog").innerText()).includes("What is never copied"),
      "EN copy dialog",
    );
    await mobile.screenshot({ path: dir + "14-phone-en-copy-dialog.png" });
    await mobile.locator("#dialog").getByRole("button", { name: "Cancel" }).tap();
    await mobile.getByRole("button", { name: "Prepare export" }).tap();
    await mobile.locator("#toast.shown", { hasText: "JSON export ready" }).waitFor();
    check(
      (await mobile.locator("[data-cd-page]").innerText()).includes("Trash (30 days)"),
      "EN trash heading",
    );
    check(await noOverflow(mobile), "Overflow after EN export at 390");
    await mobile.screenshot({ path: dir + "15-phone-en-after.png", fullPage: true });
    const phoneData = await mobile.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).ext["campaign-data"],
      key,
    );
    check(
      phoneData.snapshots.some((s) => s.name === "Before the ambush") &&
        phoneData.exports.length === 3,
      "Phone commands not stored",
    );
    passed.push(
      "EN 390 touch: All sections → Campaign data; snapshot and export by touch; copy dialog fits; targets ≥ 40 px; no overflow",
    );
    await phone.close();
  } catch (error) {
    // Where it stopped: the steps already proven and a picture of the page.
    await page.screenshot({ path: dir + "failure.png", fullPage: true }).catch(() => {});
    throw Error(`${error.message}\nPassed so far: ${passed.join(" / ")}`);
  }
  check(!errors.length, "Page errors: " + errors.join(" | "));
  await context.close();
  return passed;
};
