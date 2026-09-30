async (page) => {
  const errors = [],
    passed = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__libraryErrors = [];
    window.addEventListener("error", (event) => window.__libraryErrors.push(event.message));
  });
  await page.route("**/*.mjs", (route) => route.continue());
  await page.goto("http://127.0.0.1:8879/#library");
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 1000 });
  const button = (name) => page.getByRole("button", { name, exact: true });
  // P8 BI-15 (DDB «Create» into one editor): with the structured editor built, «Crea
  // contenuto» opens its one create dialog (kind and template). The rest of this journey
  // proves the Library's own text editor, which stays the editor when that area is not
  // built: the area is served as missing (404) for the steps below.
  await page.locator("[data-library-new]").click();
  await page.locator("#dialog [name=kind]").waitFor();
  await page.keyboard.press("Escape");
  // The service worker (installable app) would serve the module from its cache: it is
  // unregistered and kept from registering again while the area is missing.
  await page.route("**/sw.js", (route) => route.fulfill({ status: 404, body: "" }));
  await page.evaluate(async () => {
    for (const r of (await navigator.serviceWorker?.getRegistrations?.()) ?? [])
      await r.unregister();
  });
  await page.route("**/homebrew-editor.mjs", (route) => route.fulfill({ status: 404, body: "" }));
  await page.reload();
  await page.getByRole("heading", { name: "Biblioteca", exact: true }).waitFor();
  const field = (path) => page.locator('[data-library-path="' + path + '"]');
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const role = async (value) => {
    await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption(value);
    await page.getByRole("heading", { name: "Biblioteca", exact: true }).waitFor();
  };
  await button("Ripristina esempio").click();
  await button("Ripristina").click();
  await role("player");
  await page.locator("[data-library-new]").click();
  await page.locator("#dialog [name=type]").selectOption("feature");
  await button("Crea bozza privata").click();
  await field("name.it").fill("Luce della gilda");
  await field("name.en").fill("Guild light");
  await field("description.it").fill("Una capacità originale per la visita del blueprint.");
  await field("description.en").fill("An original feature for the blueprint visit.");
  await field("source.label").fill("Contenuto originale sintetico");
  await page.getByText("Riserva e recupero", { exact: true }).click();
  await page.locator('[data-library-resource="add"]').click();
  await field("resource.max").fill("3");
  await page.locator('[data-nav="characters"]').first().click();
  check(await page.locator("#dialog").isVisible(), "Library dirty navigation not guarded");
  await page.keyboard.press("Escape");
  check(
    (await field("name.it").inputValue()) === "Luce della gilda",
    "Cancel navigation lost input",
  );
  await page.locator("[data-library-preview]").click();
  await page.locator("[data-library-apply]").click();
  await page.getByRole("heading", { name: "Luce della gilda", exact: true, level: 1 }).waitFor();
  let state = await saved(),
    content = state.library[0],
    ref = { contentId: content.id, revisionId: content.revisions[0].id };
  check(
    state.actors.livia.features?.every((row) => !row.homebrewRef) || !state.actors.livia.features,
    "Saving definition assigned it to a character",
  );
  check(!(state.campaign.enabledContent || []).length, "Saving enabled a campaign option");
  passed.push("private draft guards navigation; saving definition neither assigns nor enables it");
  await role("dm");
  check(
    !(await page.locator('[data-library-open="' + content.id + '"]').count()),
    "DM sees a private definition",
  );
  await role("player");
  await page.locator('[data-library-open="' + content.id + '"]').click();
  await page.locator("[data-library-share]").click();
  await page.locator('#dialog [name="read-dm"]').check();
  await button("Salva accessi").click();
  await role("dm");
  await page.locator('[data-library-open="' + content.id + '"]').click();
  await page.locator("[data-library-enable]").click();
  await role("player");
  await page.locator('[data-library-open="' + content.id + '"]').click();
  await page.locator("[data-library-actor]").selectOption("livia");
  await page.locator("[data-library-assign]").click();
  await field("instance.used").fill("2");
  await page.locator("[data-library-preview]").click();
  await page.locator("[data-library-apply]").click();
  await page.getByRole("heading", { name: "Livia", exact: true, level: 1 }).waitFor();
  state = await saved();
  let instance = state.actors.livia.features.find(
    (row) => row.homebrewRef?.contentId === content.id,
  );
  check(
    instance?.max === 3 && instance.used === 2,
    "Assignment did not preserve explicit used count",
  );
  passed.push(
    "sharing, exact-revision enablement and assignment are separate; consumed uses are explicit",
  );
  await page.locator('[data-library-instance="' + instance.id + '"]').click();
  await page.locator("[data-library-revise]").click();
  await field("resource.max").fill("4");
  await page.locator("[data-library-preview]").click();
  await page.locator("[data-library-apply]").click();
  await page.getByRole("heading", { name: "Luce della gilda", exact: true, level: 1 }).waitFor();
  state = await saved();
  content = state.library[0];
  const nextRef = { contentId: content.id, revisionId: content.revisions.at(-1).id };
  check(content.revisions.length === 2, "Revision replaced the original");
  check(
    state.actors.livia.features.find((row) => row.id === instance.id).max === 3,
    "Revision silently updated the live copy",
  );
  await page.locator("[data-library-update]").click();
  check(
    await page.locator("[data-library-apply]").isDisabled(),
    "Unenabled new revision can update campaign sheet",
  );
  await page.locator("[data-library-back]").click();
  await page.locator('[data-library-open="' + content.id + '"]').click();
  await page.locator("[data-library-share]").click();
  await page.locator('#dialog [name="read-dm"]').check();
  await button("Salva accessi").click();
  await role("dm");
  await page.locator('[data-library-open="' + content.id + '"]').click();
  await page.locator("[data-library-enable]").click();
  await role("player");
  await page.locator('[data-nav="characters"]').first().click();
  await page.locator('[data-character-action="open"][data-actor="livia"]').click();
  await page.locator('[data-character-tab="features"]').click();
  await page.getByRole("heading", { name: "Capacità e tratti", exact: true }).waitFor();
  await page.locator('[data-library-instance="' + instance.id + '"]').click();
  await page.locator("[data-library-revision]").selectOption(nextRef.revisionId);
  await page.locator("[data-library-update]").click();
  check(
    (await page.locator("#content").innerText()).includes("2"),
    "Current use count absent from update",
  );
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/library-update-it.png",
    fullPage: true,
  });
  await page.locator("[data-library-apply]").click();
  await page.getByRole("heading", { name: "Livia", exact: true, level: 1 }).waitFor();
  await page.reload();
  state = await saved();
  instance = state.actors.livia.features.find((row) => row.id === instance.id);
  check(
    instance.max === 4 &&
      instance.used === 2 &&
      instance.homebrewRef.revisionId === nextRef.revisionId,
    "Update reset uses or lost revision across reload",
  );
  passed.push(
    "new revision is immutable, separately enabled and explicitly applied without restoring spent uses",
  );
  errors.push(...(await page.evaluate(() => window.__libraryErrors || [])));
  // Serve the structured editor and the service worker again for later visits.
  await page.unroute("**/homebrew-editor.mjs");
  await page.unroute("**/sw.js");
  check(!errors.length, errors.join("; "));
  return { passed, errors, ref: nextRef, instanceId: instance.id };
};
