async (rootPage) => {
  const context = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage(),
    passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__libraryErrors = [];
    window.addEventListener("error", (event) => window.__libraryErrors.push(event.message));
  });
  await page.goto("http://127.0.0.1:8879/#library");
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const button = (name) => page.getByRole("button", { name, exact: true });
  const field = (path) => page.locator('[data-library-path="' + path + '"]');
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  // Refreshed by the round-2 regression (29/09/2026): P8 BI-15 (DDB «Create» into one
  // editor) sends «Crea contenuto» to the structured editor's one create dialog (kind and
  // template), here by tap on the phone. The rest of this journey proves the Library's own
  // text editor on a phone, which stays the editor when that area is not built: the area is
  // served as missing (404) for the steps below, as in library-journey and library-builder.
  // The language lives in memory only, so English is chosen after that reload.
  await page.locator("[data-library-new]").tap();
  await page.locator("#dialog [name=kind]").waitFor();
  await page.keyboard.press("Escape");
  await page.route("**/sw.js", (route) => route.fulfill({ status: 404, body: "" }));
  await page.evaluate(async () => {
    for (const r of (await navigator.serviceWorker?.getRegistrations?.()) ?? [])
      await r.unregister();
  });
  await page.route("**/homebrew-editor.mjs", (route) => route.fulfill({ status: 404, body: "" }));
  await page.reload();
  await page.getByRole("heading", { name: "Biblioteca", exact: true }).waitFor();
  await button("Preferenze").tap();
  await page.locator("#dialog [name=lang]").selectOption("en");
  await button("Salva preferenze").tap();
  await page.locator("[data-library-new]").tap();
  await page.locator("#dialog [name=type]").selectOption("feature");
  await button("Create private draft").tap();
  await field("name.en").fill("Guiding spark");
  await field("name.it").fill("Scintilla guida");
  await field("description.en").fill("A small guiding light, resolved manually at the table.");
  await field("source.label").fill("Original synthetic feature");
  await page.getByText("Pool and recovery", { exact: true }).tap();
  await page.locator('[data-library-resource="add"]').tap();
  await field("resource.max").fill("3");
  await page.locator("[data-library-preview]").tap();
  check(
    await page.locator("[data-library-apply]").isEnabled(),
    "Valid mobile definition cannot be saved",
  );
  check(
    !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)),
    "Mobile editor horizontal overflow",
  );
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/library-mobile-editor-en.png",
    fullPage: true,
  });
  await page.locator("[data-library-apply]").tap();
  await page.getByRole("heading", { name: "Guiding spark", exact: true, level: 1 }).waitFor();
  let state = await saved();
  check(state.library.length === 1, "Mobile Save did not create definition");
  check(!state.campaign.enabledContent?.length, "Mobile Save enabled content");
  passed.push(
    "English touch authoring, pool input, preview and save retain private content without enabling it",
  );
  check(
    !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)),
    "Mobile detail horizontal overflow",
  );
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/library-mobile-detail-en.png",
    fullPage: true,
  });
  await page.locator("[data-library-revise]").tap();
  await field("name.en").fill("Guiding spark revised");
  await button("Library").tap();
  check(await page.locator("#dialog").isVisible(), "Touch departure lost unsaved content");
  await page.keyboard.press("Escape");
  check(
    (await field("name.en").inputValue()) === "Guiding spark revised",
    "Escape did not retain working text",
  );
  await page.locator("[data-library-preview]").tap();
  await page.locator("[data-library-apply]").tap();
  await page
    .getByRole("heading", { name: "Guiding spark revised", exact: true, level: 1 })
    .waitFor();
  state = await saved();
  check(state.library[0].revisions.length === 2, "Touch revise overwrote old revision");
  await page.locator("[data-library-revision]").selectOption(state.library[0].revisions[0].id);
  await page.getByRole("heading", { name: "Guiding spark", exact: true, level: 1 }).waitFor();
  passed.push(
    "touch revision selection shows the saved older revision; dirty departure and Escape retain working text",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  check(
    !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)),
    "Desktop detail horizontal overflow",
  );
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/library-desktop-detail-en.png",
    fullPage: true,
  });
  passed.push("390px and1440px Library editor/detail have no horizontal page overflow");
  errors.push(...(await page.evaluate(() => window.__libraryErrors || [])));
  check(!errors.length, errors.join("; "));
  await context.close();
  return { passed, errors };
}
