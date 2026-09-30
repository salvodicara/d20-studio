async (rootPage) => {
  // B49 adventures and reusable packages: acceptance checks 1–6 of the card with real
  // clicks, keys and touch. IT desktop 1440 as DM and player, then EN phone 390 with touch.
  // Resets this browser's synthetic demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B49/";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const context = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const role = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForTimeout(150);
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const shot = async (name, target = null) => {
    if (target) await target.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: shots + name, fullPage: false });
  };
  const content = page.locator("#content");
  const toast = page.locator("#toast");
  const openAdventures = async () => {
    await page.locator('.app-header [data-nav="library"]').click();
    await page.locator('[data-library-scope="adventures"]').click();
    await content.locator(".adv-list").waitFor();
  };
  const openAdventure = async (title) => {
    await openAdventures();
    await content.locator(".adv-card-open", { hasText: title }).click();
    await content.locator(".adv-detail-head h1", { hasText: title }).waitFor();
  };
  const parkedId = (data, name) =>
    Object.entries(data.ext["campaign-members"].parked).find(
      ([, p]) => p.campaign.name === name,
    )?.[0];

  await page.goto(base);
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await page.locator("#demo-role").waitFor();
  await role("dm");

  // (1) Library › Adventures › Create adventure: La cripta from the campaign in play.
  await openAdventures();
  check((await content.locator(".adv-card").count()) === 1, "Seeded package missing from the list");
  await content.locator("[data-adv-new]").click();
  const editor = content.locator('form[data-adv-form="create"]');
  await editor.waitFor();
  await editor.locator('input[name="title"]').fill("La cripta");
  await editor
    .locator('textarea[name="summary"]')
    .fill("Il cortile, la cripta sotto l’osservatorio e chi ha riacceso la lanterna.");
  await editor.locator('select[name="startSceneKey"]').selectOption("scene:old-watch");
  await editor.locator('select[name="introKey"]').selectOption("material:material-notice");
  await editor.locator('input[name="pick"][value="scene:old-watch"]').check();
  await editor.locator('input[name="pick"][value="material:material-crypt"]').check();
  // Keyboard: focus a choice and toggle it with Space.
  const notice = editor.locator('input[name="pick"][value="material:material-notice"]');
  await notice.focus();
  await page.keyboard.press("Space");
  check(await notice.isChecked(), "Space did not check the handout");
  await editor.locator('input[name="pick"][value="table:swamp-encounters"]').check();
  await editor.locator('input[name="pick"][value="encounter:enc-lantern"]').check();
  const preview = content.locator("[data-adv-preview]");
  await preview.locator(".adv-dep-auto", { hasText: "Consistenza della pattuglia" }).waitFor();
  const previewText = await preview.innerText();
  for (const expected of [
    "Sentinella",
    "pedina in «Il cortile dell’osservatorio»",
    "sottotabella di «Incontri nella palude»",
    "Sacerdote · SRD 5.2.1",
    "Cultista · SRD 5.2.1",
    "Scala della cripta",
    "Pedina di Livia",
  ])
    check(previewText.includes(expected), "Package preview lacks: " + expected);
  check(
    (await preview.locator("[data-adv-total]").innerText()).startsWith("1 scena · 2 PNG"),
    "Package count wrong: " + (await preview.locator("[data-adv-total]").innerText()),
  );
  await shot("01-create-la-cripta-it-1440.png", content.locator(".page-heading"));
  // Leaving with unsaved choices asks first; «Continua a modificare» keeps them.
  await content.locator("[data-adv-library]").click();
  await page.locator("#dialog", { hasText: "Scartare le scelte?" }).waitFor();
  await page.locator("#dialog footer [data-close]").click();
  check(
    await editor.locator('input[name="pick"][value="encounter:enc-lantern"]').isChecked(),
    "Choices lost after cancelling the guard",
  );
  await editor.locator('button[type="submit"]').click();
  await content.locator(".adv-detail-head h1", { hasText: "La cripta" }).waitFor();
  check(
    (await content.locator(".adv-items .item-row").count()) === 8,
    "La cripta should hold 8 entries",
  );
  const deps = await content.locator(".adv-dep-list").first().innerText();
  check(
    deps.includes("Sacerdote · SRD 5.2.1") && deps.includes("Pedina di Livia"),
    "Dependencies not listed on the detail",
  );
  await shot("02-detail-la-cripta-v1-it-1440.png", content.locator(".adv-crumbs"));
  await page.reload();
  await role("dm");
  await openAdventure("La cripta");
  let data = await stored();
  const cryptId = data.ext.adventures.adventures.find((a) => a.title === "La cripta").id;
  check(
    data.ext.adventures.adventures.find((a) => a.id === cryptId).versions[0].items[0].data
      .revealed === false,
    "Package did not keep the initial (hidden) scene state",
  );
  passed.push(
    "(1) La cripta built by clicks and Space: 8 entries, auto-added NPCs/subtable explained, SRD/art dependencies, PC tokens excluded; draft guard; reload keeps it",
  );

  // (4) Il faro sommerso into the campaign in play: required homebrew, one action per entry.
  await openAdventure("Il faro sommerso");
  await content.locator('[data-adv-go="import"]').click();
  const importForm = content.locator('form[data-adv-form="import"]');
  await importForm.waitFor();
  check(
    (await importForm.locator('select[name="campaign"]').inputValue()) === "lanterns",
    "Default target is not the campaign in play",
  );
  const focused = (locator) => locator.evaluate((el) => el === document.activeElement);
  // Review fix: the first change on a freshly opened form keeps the choice and the focus.
  const introBox = importForm.locator('input[name="intro"]');
  await introBox.focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
  check(!(await introBox.isChecked()), "First change on the import form was reverted");
  check(await focused(introBox), "Keyboard focus lost after the first change");
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
  check(await introBox.isChecked(), "Introduction not ticked again from the keyboard");
  const req = importForm.locator('[data-adv-req-row="content-faro-lanterna"]');
  check(
    (await req.innerText()).includes("Manca nella tua Biblioteca"),
    "Missing homebrew not reported",
  );
  check(await importForm.locator("[data-adv-submit]").isDisabled(), "Import not blocked");
  await req.locator('[data-adv-req="install"]').click();
  await req.locator('[data-adv-req="enable"]').waitFor();
  check(
    (await req.innerText()).includes("Non abilitato in questa campagna"),
    "Installed homebrew should wait for enabling",
  );
  check(await focused(req.locator('[data-adv-req="enable"]')), "Focus not on the next action");
  await shot("03-faro-requirements-it-1440.png", content.locator(".page-heading"));
  await page.keyboard.press("Enter");
  await req.locator(".adv-status-ready").waitFor();
  check(!(await importForm.locator("[data-adv-submit]").isDisabled()), "Import still blocked");
  check(
    await focused(importForm.locator("[data-adv-submit]")),
    "Focus not on Import once every entry is ready",
  );
  // Keep the courtyard in play: no start scene, but show the introduction.
  await importForm.locator('input[name="startScene"]').uncheck();
  check(await importForm.locator('input[name="intro"]').isChecked(), "Intro not offered");
  await importForm.locator("[data-adv-submit]").click();
  await content.locator("[data-adv-report]").waitFor();
  data = await stored();
  check(
    data.ext.handouts.materials.some((m) => m.title === "Diario del guardiano del faro"),
    "Imported handout missing from Materials",
  );
  check(data.activeSceneId === "old-watch", "Active scene changed without the option");
  // Undo from the page, then import again.
  await content.locator("[data-adv-undo]").click();
  await page.waitForTimeout(150);
  data = await stored();
  check(
    !data.ext.handouts.materials.some((m) => m.title === "Diario del guardiano del faro"),
    "Undo did not remove the imported handout",
  );
  check(
    data.library.some((c) => c.id === "content-faro-lanterna") &&
      data.campaign.enabledContent?.length === 1,
    "Undo of the import also reverted the separate install/enable",
  );
  await content.locator('[data-adv-go="import"]').click();
  await importForm.waitFor();
  await importForm.locator('input[name="startScene"]').uncheck();
  await importForm.locator("[data-adv-submit]").click();
  await content.locator("[data-adv-report]").waitFor();
  data = await stored();
  const diary = data.ext.handouts.materials.find(
    (m) => m.title === "Diario del guardiano del faro",
  );
  check(diary?.access.mode === "all" && diary.shows.length === 1, "Introduction not shown");
  const keeper = Object.values(data.actors).find((a) => a.name === "Custode annegato");
  check(
    keeper?.inventory[0]?.homebrewRef?.revisionId === "revision-faro-lanterna-2" &&
      keeper.campaignIds[0] === "lanterns",
    "NPC or its homebrew lantern missing",
  );
  // The player sees the introduction in Materials, never its DM text.
  await role("player");
  await page.goto(base + "#campaign?tab=handouts");
  await content.getByText("Diario del guardiano del faro").first().waitFor();
  const playerMaterials = await content.innerText();
  check(!playerMaterials.includes("Sotto il telo"), "DM text leaked to the player");
  await shot("04-player-materials-it-1440.png");
  await page.goto(base + "#library");
  await content.locator("[data-library-scope]").first().waitFor();
  check(
    (await content.locator('[data-library-scope="adventures"]').count()) === 0,
    "Adventures section visible to the player",
  );
  await page.goto(base + "#adventures?id=" + cryptId);
  await content.getByText("Pagina non disponibile per questo ruolo").waitFor();
  await role("dm");
  passed.push(
    "(4) Il faro sommerso: missing homebrew → Install → Enable (one action each), import unlocked; intro shown to the player without DM text; NPC with homebrew lantern; page Undo reverts only the import; player has no Adventures section or page",
  );

  // (2) Import into another campaign, by type; overwrite warning on the second import.
  await page.locator('.app-header [data-nav="campaigns"]').click();
  await content.locator('[data-cm="create"]').first().click();
  await page.locator('#dialog [name="name"]').fill("Gruppo del giovedì");
  await page.locator("#dialog").getByRole("button", { name: "Crea campagna" }).click();
  await page.waitForTimeout(200);
  data = await stored();
  const thursday = parkedId(data, "Gruppo del giovedì");
  check(thursday, "Second campaign not created");
  await openAdventure("La cripta");
  await content.locator('[data-adv-go="import"]').click();
  await importForm.waitFor();
  check(
    await importForm
      .locator('select[name="campaign"] option[value="lanterns"]')
      .evaluate((option) => option.disabled),
    "The origin campaign should not be a target",
  );
  await importForm.locator('select[name="campaign"]').selectOption(thursday);
  await importForm.locator('input[name="type"][value="table"]').uncheck();
  await content.locator("[data-adv-relinks]").waitFor();
  const relinks = await content.locator("[data-adv-relinks]").innerText();
  check(relinks.includes("pedine → PNG: 2"), "Token relink not previewed: " + relinks);
  check(
    (await content.locator(".adv-plan-row.is-create").count()) === 6,
    "Six new entries expected without tables",
  );
  await shot("05-import-by-type-it-1440.png", content.locator(".page-heading"));
  // Simulated offline: the shared import is refused with the reason, choices are kept.
  const setOffline = async (value) => {
    await page.locator("[data-service=preferences]").click();
    const box = page.locator("#dialog [name=offline]");
    if (value) await box.check();
    else await box.uncheck();
    await page.locator("#dialog").getByRole("button", { name: "Salva preferenze" }).click();
  };
  await setOffline(true);
  await importForm.locator("[data-adv-submit]").click();
  await toast.filter({ hasText: "Sei senza rete" }).waitFor();
  check(!(await stored()).ext.adventures.imports[thursday], "Offline import changed the campaign");
  check(
    !(await importForm.locator('input[name="type"][value="table"]').isChecked()) &&
      (await importForm.locator('select[name="campaign"]').inputValue()) === thursday,
    "Offline refusal lost the choices",
  );
  await setOffline(false);
  await importForm.locator("[data-adv-submit]").click();
  await content.locator("[data-adv-report]", { hasText: "Gruppo del giovedì" }).waitFor();
  data = await stored();
  let copy = data.ext["campaign-members"].parked[thursday];
  const copyScene = copy.scenes.find((s) => s.adventure?.id === cryptId);
  check(copyScene && copyScene.id !== "old-watch", "Scene copy missing in the other campaign");
  check(
    copyScene.tokens.every((t) => data.actors[t.actorId].campaignIds[0] === thursday),
    "Tokens not relinked to the other campaign's NPCs",
  );
  check(!copy.ext["random-tables"], "Tables imported although unchecked");
  // Import again with every type: Foundry's overwrite warning.
  await content.locator(`[data-adv-import-into="${thursday}"]`).click();
  await importForm.waitFor();
  await content.locator("[data-adv-overwrite]").waitFor();
  check(
    (await content.locator("[data-adv-overwrite]").innerText()).includes("6 voci sono già"),
    "Overwrite warning text",
  );
  await shot("06-reimport-overwrite-warning-it-1440.png", content.locator("[data-adv-overwrite]"));
  await importForm.locator("[data-adv-submit]").click();
  await content.locator("[data-adv-report]").waitFor();
  data = await stored();
  copy = data.ext["campaign-members"].parked[thursday];
  const tables = copy.ext["random-tables"].value.tables;
  const swamp = tables.find((t) => t.name.it === "Incontri nella palude");
  const patrol = tables.find((t) => t.name.it === "Consistenza della pattuglia");
  check(
    swamp.results.find((r) => r.id === "swamp-patrol").subtableId === patrol.id,
    "Subtable not relinked",
  );
  check(
    copy.scenes.filter((s) => s.adventure?.id === cryptId).length === 1,
    "Overwrite duplicated the scene",
  );
  // Undo on a parked campaign puts it back; then import again.
  await content.locator("[data-adv-undo]").click();
  await page.waitForTimeout(150);
  data = await stored();
  check(
    !data.ext["campaign-members"].parked[thursday].ext["random-tables"],
    "Undo did not revert the parked campaign's tables",
  );
  await content.locator(`[data-adv-import-into="${thursday}"]`).click();
  await importForm.locator("[data-adv-submit]").click();
  await content.locator("[data-adv-report]").waitFor();
  passed.push(
    "(2) Import into «Gruppo del giovedì» by type (tables unchecked), refused offline with the reason and choices kept, origin not a target, tokens/pins/subtables relinked; second import shows the overwrite warning and replaces without duplicates; Undo reverts the parked campaign",
  );

  // (3) The origin changes; Rebuild shows the differences; the update keeps local changes.
  await page.goto(base + "#preparation?id=old-watch");
  await content
    .locator('textarea[name="description"]')
    .fill("Il cortile è allagato: la pioggia ha riempito il pozzo.");
  await content.locator("[data-prep-save]").click();
  // The courtyard is the active scene: the core asks before updating it at the Table.
  await page.locator("#dialog").getByRole("button", { name: "Aggiorna scena attiva" }).click();
  await page.waitForTimeout(200);
  check((await stored()).scenes[0].description.includes("allagato"), "Origin scene edit not saved");
  await openAdventure("La cripta");
  await content.locator('[data-adv-go="rebuild"]').click();
  const rebuild = content.locator('form[data-adv-form="rebuild"]');
  await rebuild.waitFor();
  await rebuild.locator('input[name="pick"][value="encounter:enc-lantern"]').uncheck();
  await rebuild.locator('input[name="pick"][value="table:lantern-rumours"]').check();
  await content.locator(".adv-diff.is-removed").waitFor();
  const diff = await content.locator("[data-adv-diff]").innerText();
  check(
    diff.includes("Voci alla Lanterna") &&
      diff.includes("Chi ha riacceso la lanterna") &&
      diff.includes("Il cortile dell’osservatorio"),
    "Rebuild diff incomplete: " + diff,
  );
  check((await content.locator(".adv-diff.is-added").count()) === 1, "Added (green) count");
  check((await content.locator(".adv-diff.is-changed").count()) === 1, "Changed count");
  await rebuild
    .locator('textarea[name="notes"]')
    .fill("Cortile allagato; voci alla Lanterna; tolto l’incontro sulla torre.");
  await shot("07-rebuild-diff-it-1440.png", content.locator(".page-heading"));
  await rebuild.locator('button[type="submit"]').click();
  await content.locator(".adv-detail-head .badge", { hasText: "v2" }).waitFor();
  check(
    (await content.locator(`[data-adv-usage="${thursday}"]`).innerText()).includes(
      "Aggiornamento disponibile: versione 2",
    ),
    "Update notice missing on the campaign row",
  );
  // Launch the other campaign (B13) and change its copy of the courtyard.
  await page.locator('.app-header [data-nav="campaigns"]').click();
  await content.locator(`[data-cm="launch"][data-id="${thursday}"]`).first().click();
  await page.waitForTimeout(300);
  await page.goto(base + "#preparation");
  const copyRow = content.locator(".prep-scene-row", { hasText: "Il cortile dell’osservatorio" });
  await copyRow.getByRole("button", { name: "Modifica", exact: true }).click();
  await content.locator('input[name="name"]').fill("Il cortile (giovedì)");
  await content.locator("[data-prep-save]").click();
  // The first import activated the start scene here too (optional action, on by default).
  await page.locator("#dialog").getByRole("button", { name: "Aggiorna scena attiva" }).click();
  await page.waitForTimeout(200);
  check(
    (await stored()).scenes.some((s) => s.name === "Il cortile (giovedì)"),
    "Rename of the imported copy not saved",
  );
  // Preparation › Adventures: the update waits for review (Roll20 patch notice).
  await page.goto(base + "#preparation?tab=adventures");
  await content.locator(`[data-adv-review="${cryptId}"]`).waitFor();
  check(
    (await content.locator(`[data-adv-prep-row="${cryptId}"]`).innerText()).includes(
      "1 modificata in questa campagna",
    ),
    "Preparation does not count the local change",
  );
  await shot("07b-prep-adventures-update-it-1440.png");
  await content.locator(`[data-adv-review="${cryptId}"]`).click();
  await importForm.waitFor();
  await content.locator("[data-adv-patch]").waitFor();
  check(
    (await content.locator("[data-adv-patch]").innerText()).includes("tolto l’incontro"),
    "Patch notes not shown",
  );
  const keptRow = content.locator('[data-adv-plan-row="scene:old-watch"]');
  check(
    (await keptRow.innerText()).includes("non verrà sovrascritta") &&
      (await keptRow.locator('input[name="copy"]').isChecked()),
    "Changed scene not kept with a copy on offer",
  );
  // Review fix: the copy box refreshes the plan and keeps the keyboard focus.
  await keptRow.locator('input[name="copy"]').focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
  check(
    await keptRow
      .locator('input[name="copy"]')
      .evaluate((el) => el === document.activeElement && !el.checked),
    "Copy box lost the focus or its choice",
  );
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
  check(await keptRow.locator('input[name="copy"]').isChecked(), "Copy not offered again");
  check(
    (await content.locator('[data-adv-plan-row="table:lantern-rumours"]').innerText()).includes(
      "Nuova",
    ),
    "New table not planned",
  );
  check(
    (await content.locator(".panel", { hasText: "Non più nel pacchetto" }).innerText()).includes(
      "Chi ha riacceso la lanterna",
    ),
    "Removed encounter should stay in the campaign",
  );
  await shot("08-update-review-it-1440.png", content.locator("[data-adv-patch]"));
  await importForm.locator("[data-adv-submit]").click();
  await content.locator("[data-adv-report]", { hasText: "Aggiornata alla versione 2" }).waitFor();
  data = await stored();
  const names = data.scenes.map((s) => s.name);
  check(names.includes("Il cortile (giovedì)"), "Local change overwritten");
  const v2copy = data.scenes.find((s) => s.name === "Il cortile dell’osservatorio (v2)");
  check(v2copy?.description.includes("allagato"), "Copy of version 2 missing");
  check(
    data.ext["encounter-builder"].encounters.some((e) => e.name === "Chi ha riacceso la lanterna"),
    "Removed encounter deleted from the campaign",
  );
  // Undo the update, then apply it again; reload keeps version 2.
  await content.locator("[data-adv-undo]").click();
  await page.waitForTimeout(150);
  data = await stored();
  check(!data.scenes.some((s) => s.name.endsWith("(v2)")), "Undo kept the copy");
  check(data.ext.adventures.imports[thursday][cryptId].version === 1, "Undo kept version 2");
  await content.locator(`[data-adv-import-into="${thursday}"]`).click();
  await importForm.locator("[data-adv-submit]").click();
  await content.locator("[data-adv-report]").waitFor();
  await page.reload();
  await role("dm");
  data = await stored();
  check(data.ext.adventures.imports[thursday][cryptId].version === 2, "Version 2 not persisted");
  check(
    data.scenes.some((s) => s.name === "Il cortile (giovedì)") &&
      data.scenes.some((s) => s.name.endsWith("(v2)")),
    "Update not persisted after reload",
  );
  // Progress stayed separate: the origin campaign and the package are unchanged.
  const lanterns = data.ext["campaign-members"].parked.lanterns;
  check(
    lanterns.scenes.find((s) => s.id === "old-watch").name === "Il cortile dell’osservatorio",
    "The origin campaign changed",
  );
  passed.push(
    "(3) Origin edited → Rebuild diff (+ table, − encounter, ~ scene) with notes → v2; in the launched campaign the renamed copy is kept, a v2 copy is added, the table is new, the removed encounter stays; Undo and re-apply; reload keeps v2; origin untouched",
  );

  // (5) New campaign from the adventure with optional start scene and introduction.
  await openAdventure("La cripta");
  await content.locator('[data-adv-go="campaign"]').click();
  const campaignForm = content.locator('form[data-adv-form="campaign"]');
  await campaignForm.waitFor();
  await campaignForm.locator('input[name="name"]').fill("La cripta · one-shot");
  check(
    (await campaignForm.locator('input[name="startScene"]').isChecked()) &&
      (await campaignForm.locator('input[name="intro"]').isChecked()),
    "Optional actions not offered",
  );
  await shot("09-new-campaign-it-1440.png", content.locator(".page-heading"));
  await campaignForm.locator('button[type="submit"]').click();
  await page.waitForTimeout(300);
  check(page.url().includes("#campaigns?id="), "Not on the new campaign page");
  data = await stored();
  const oneShot = parkedId(data, "La cripta · one-shot");
  const created = data.ext["campaign-members"].parked[oneShot];
  const start = created.scenes.find((s) => s.id === created.activeSceneId);
  check(
    start?.name === "Il cortile dell’osservatorio" && start.revealed,
    "Start scene not active and shown",
  );
  check(created.scenes.length === 1, "Empty starter scene kept");
  const intro = created.ext.handouts.value.materials.find(
    (m) => m.title === "Avviso della gilda delle lanterne",
  );
  check(intro?.access.mode === "all" && intro.shows.length === 1, "Introduction not shown");
  check(
    created.ext["random-tables"].value.tables.length === 3 && start.tokens.length === 2,
    "New campaign not populated",
  );
  await shot("10-new-campaign-created-it-1440.png");
  passed.push(
    "(5) «La cripta · one-shot» created from the adventure (B13 campaign): start scene active and shown, empty starter dropped, introduction shown, 3 tables and 2 NPC tokens",
  );

  // Review fix: another target campaign re-renders its own plan and keeps the keyboard focus.
  await openAdventure("La cripta");
  await content.locator('[data-adv-go="import"]').click();
  await importForm.waitFor();
  const target = importForm.locator('select[name="campaign"]');
  const shownTarget = await target.inputValue();
  const otherTarget = await target
    .locator(`option:not([disabled]):not([value="${shownTarget}"])`)
    .first()
    .getAttribute("value");
  await target.focus();
  await target.selectOption(otherTarget);
  await content.locator(`form[data-adv-shown-campaign="${otherTarget}"]`).waitFor();
  check(
    await content
      .locator('select[name="campaign"]')
      .evaluate((el) => el === document.activeElement),
    "Focus lost after choosing another target campaign",
  );
  await importForm.locator(`[data-adv-open="${cryptId}"]`).click();

  // (6) Printable HTML export: preview, DM notes toggle, Print and Download.
  await openAdventure("La cripta");
  await content.locator('[data-adv-go="print"]').click();
  const frame = page.frameLocator(".adv-print-frame");
  await frame.locator("h1", { hasText: "La cripta" }).waitFor();
  const full = await frame.locator("body").innerText();
  check(
    full.includes("Sentinella") && full.includes("Lastra a pressione"),
    "DM content missing from the export",
  );
  await shot("11-export-html-it-1440.png", content.locator(".page-heading"));
  await content.locator("[data-adv-print-dm]").focus();
  await page.keyboard.press("Space");
  await frame.locator(".kicker", { hasText: "edizione per i giocatori" }).waitFor();
  check(
    await content
      .locator("[data-adv-print-dm]")
      .evaluate((el) => el === document.activeElement && !el.checked),
    "Keyboard focus lost on the DM notes toggle",
  );
  const playersText = await frame.locator("body").innerText();
  check(
    !playersText.includes("Sentinella") && !playersText.includes("Lastra a pressione"),
    "DM content in the players' edition",
  );
  await page.evaluate(() => {
    const win = document.querySelector(".adv-print-frame").contentWindow;
    win.print = () => (window.__advPrinted = true);
  });
  await content.locator("[data-adv-print]").click();
  check(await page.evaluate(() => window.__advPrinted === true), "Print not requested");
  await content.locator("[data-adv-print-dm]").check();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    content.locator("[data-adv-download]").click(),
  ]);
  check(download.suggestedFilename() === "la-cripta-v2.html", download.suggestedFilename());
  let file = "";
  for await (const chunk of await download.createReadStream()) file += chunk;
  check(
    file.startsWith("<!doctype html>") &&
      file.includes("pioggia ha riempito il pozzo") &&
      file.includes("Voci alla Lanterna") &&
      !file.includes("Chi ha riacceso la lanterna"),
    "Downloaded HTML incomplete",
  );
  passed.push(
    "(6) Export of v2: printable preview with DM content, players' edition without it, Print wired to the document, download «la-cripta-v2.html» with the v2 content",
  );
  check(await noOverflow(), "Desktop overflow on the export page");
  // «Cosa è pronto»: the area is active, with no contained warning after the whole run.
  await page.locator('[data-service="scope"]').first().click();
  const areaRow = page.locator("#dialog li", { hasText: "Avventure e pacchetti riutilizzabili" });
  const areaText = await areaRow.first().innerText();
  check(areaText.includes("attiva") && !areaText.includes("avvis"), "Area report: " + areaText);
  await page.keyboard.press("Escape");

  // EN phone 390 with touch: DM imports the sample package into the campaign in play.
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
  await phone.goto(base + "#library?tab=adventures");
  const phoneContent = phone.locator("#content");
  await phoneContent.locator(".adv-card-open", { hasText: "Il faro sommerso" }).tap();
  await phoneContent.locator('[data-adv-go="import"]').tap();
  const phoneReq = phoneContent.locator('[data-adv-req-row="content-faro-lanterna"]');
  check(
    (await phoneReq.innerText()).includes("Missing from your Library"),
    "EN requirement status",
  );
  await phoneReq.locator('[data-adv-req="install"]').tap();
  await phoneReq.locator('[data-adv-req="enable"]').tap();
  await phoneReq.locator(".adv-status-ready").waitFor();
  check(await noOverflow(phone), "Phone overflow on the import page");
  const small = await phoneContent.evaluate((el) =>
    [...el.querySelectorAll("button, select, input, label.adv-check")]
      .filter((n) => n.offsetParent && n.type !== "checkbox")
      .filter((n) => n.getBoundingClientRect().height < 40)
      .map((n) => n.outerHTML.slice(0, 80)),
  );
  check(!small.length, "Phone targets under 40px: " + small.join(" | "));
  await phone.screenshot({ path: shots + "12-phone-en-import-390.png", fullPage: true });
  await phoneContent.locator('input[name="startScene"]').tap();
  await phoneContent.locator("[data-adv-submit]").tap();
  await phoneContent.locator("[data-adv-report]", { hasText: "Imported into" }).waitFor();
  check(await noOverflow(phone), "Phone overflow on the detail page");
  await phone.screenshot({ path: shots + "13-phone-en-detail-390.png", fullPage: true });
  passed.push(
    "EN phone 390 touch: Install → Enable → Import of the sample package, 40px targets, no overflow",
  );
  await phoneContext.close();

  check(!errors.length, "Page errors: " + errors.join(" | "));
  await context.close();
  return passed.join("\n");
}
