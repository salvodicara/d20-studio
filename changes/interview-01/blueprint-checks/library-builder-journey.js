async (page) => {
  const passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__libraryErrors = [];
    window.addEventListener("error", (event) => window.__libraryErrors.push(event.message));
  });
  await page.route("**/*.mjs", (route) => route.continue());
  await page.goto("http://127.0.0.1:8879/#characters");
  await page.reload();
  // P8 BI-15: «Crea contenuto» now opens the structured editor (library-journey checks it
  // first). This journey proves the Library's own text editor, which stays the editor when
  // that area is not built: the area is served as missing (404) and the service worker,
  // which would serve it from its cache, is unregistered and kept from registering again.
  await page.route("**/sw.js", (route) => route.fulfill({ status: 404, body: "" }));
  await page.evaluate(async () => {
    for (const r of (await navigator.serviceWorker?.getRegistrations?.()) ?? [])
      await r.unregister();
  });
  await page.route("**/homebrew-editor.mjs", (route) => route.fulfill({ status: 404, body: "" }));
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 1000 });
  const button = (name) => page.getByRole("button", { name, exact: true });
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const buildField = (path) => page.locator('[data-builder-path="' + path + '"]');
  const libraryField = (path) => page.locator('[data-library-path="' + path + '"]');
  const section = (id) => page.locator('.builder-sections [data-builder-section="' + id + '"]');
  await page.locator('[data-character-action="create"]').click();
  await buildField("identity.name").fill("Mira della Biblioteca");
  await section("features").click();
  const before = await saved(),
    draftId = before.characterDrafts.at(-1).id,
    actors = JSON.stringify(before.actors);
  await page.locator('[data-builder-library="features"]').click();
  await page.getByRole("heading", { name: "Biblioteca", exact: true }).waitFor();
  await page.locator("[data-library-new]").click();
  await page.locator("#dialog [name=type]").selectOption("feature");
  await button("Crea bozza privata").click();
  await libraryField("name.it").fill("Memoria delle stelle");
  await libraryField("name.en").fill("Memory of stars");
  await libraryField("source.label").fill("Esempio originale");
  await libraryField("description.it").fill(
    "Una capacità narrativa originale, risolta manualmente.",
  );
  await page.locator("[data-library-preview]").click();
  await page.locator("[data-library-apply]").click();
  await page
    .getByRole("heading", { name: "Memoria delle stelle", exact: true, level: 1 })
    .waitFor();
  let state = await saved(),
    contentId = await page.evaluate(() =>
      new URLSearchParams(location.hash.split("?")[1]).get("id"),
    ),
    content = state.library.find((entry) => entry.id === contentId);
  const detailUrl = page.url();
  await page.locator("[data-library-choose]").click();
  await page.locator("[data-builder-section-title]").waitFor();
  state = await saved();
  let draft = state.characterDrafts.find((entry) => entry.id === draftId);
  check(
    draft.data.features.custom.length === 1,
    "Library selection did not return to original private draft",
  );
  check(draft.data.features.custom[0].homebrewRef.contentId === content.id, "Chosen ref lost");
  check(JSON.stringify(state.actors) === actors, "Choosing content changed live actors");
  check(
    draft.data.identity.name === "Mira della Biblioteca",
    "Builder input lost on contextual trip",
  );
  passed.push(
    "create from a builder choice returns exact content to the same saved private draft without changing live actors",
  );
  await page.reload();
  check(
    (await page.locator("#content").innerText()).includes("Memoria delle stelle"),
    "Reload lost selected feature",
  );
  await page.goto(detailUrl);
  await page
    .getByRole("heading", { name: "Memoria delle stelle", exact: true, level: 1 })
    .waitFor();
  await page.locator("[data-library-choose]").click();
  await page.locator("[data-builder-section-title]").waitFor();
  state = await saved();
  draft = state.characterDrafts.find((entry) => entry.id === draftId);
  check(draft.data.features.custom.length === 1, "Repeated contextual return duplicates a choice");
  passed.push("context and selected revision survive reload; repeated return is idempotent");
  await section("spells").click();
  await page.locator('[data-builder-library="spells"]').click();
  await page.getByRole("heading", { name: "Biblioteca", exact: true }).waitFor();
  check(
    !(await page.locator('[data-library-open="' + content.id + '"]').count()),
    "Spell context defaults to incompatible features",
  );
  const contextControl = page.locator("[data-library-context-only]");
  check((await contextControl.count()) === 1, "Context type filter missing");
  {
    await contextControl.uncheck();
    await page.locator('[data-library-open="' + content.id + '"]').click();
    check(
      !(await page.locator("[data-library-choose]:not([disabled])").count()),
      "Wrong-type content can enter spell choice",
    );
    passed.push(
      "context defaults to matching types and browsing all cannot select an incompatible feature as a spell",
    );
  }
  // Serve the structured editor and the service worker again for later visits.
  await page.unroute("**/homebrew-editor.mjs");
  await page.unroute("**/sw.js");
  errors.push(...(await page.evaluate(() => window.__libraryErrors || [])));
  check(!errors.length, errors.join("; "));
  return { passed, errors, draftId, contentId: content.id };
};
