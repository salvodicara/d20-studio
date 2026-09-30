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
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const button = (name) => page.getByRole("button", { name, exact: true });
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const stateBefore = await saved(),
    content = stateBefore.library.find((entry) => entry.owner === "player");
  check(!!content, "Run library-journey first to create and revise the fixture");
  await page.locator('[data-library-open="' + content.id + '"]').click();
  const downloadWait = page.waitForEvent("download");
  await page.locator("[data-library-export]").click();
  const download = await downloadWait;
  const filePath =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/library-export.json";
  await download.saveAs(filePath);
  check(!(await download.failure()), "Local export download failed");
  await page.locator("[data-library-back]").click();
  await page
    .locator("[data-library-import]")
    .setInputFiles(
      "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/library-invalid.json",
    );
  await page.getByRole("alert").waitFor();
  check(
    JSON.stringify((await saved()).library) === JSON.stringify(stateBefore.library),
    "Invalid import mutated library",
  );
  await page.locator("[data-library-import]").setInputFiles(filePath);
  await page.locator("[data-library-apply]").waitFor();
  check(
    JSON.stringify((await saved()).library) === JSON.stringify(stateBefore.library),
    "Import preview added definitions",
  );
  check(
    await page.locator("[data-library-apply]").isEnabled(),
    "Identical revision import unexpectedly blocked",
  );
  await page.locator("[data-library-apply]").click();
  await page.getByRole("heading", { name: "Biblioteca", exact: true }).waitFor();
  let state = await saved();
  check(
    JSON.stringify(state.library) === JSON.stringify(stateBefore.library),
    "Existing revisions duplicated or changed on import",
  );
  check(
    JSON.stringify(state.actors) === JSON.stringify(stateBefore.actors),
    "Import changed actors",
  );
  passed.push(
    "local export downloads; malformed import does not mutate; preview and repeated existing revision import preserve definitions and actors",
  );
  await page.locator("#demo-role").selectOption("dm");
  await page.getByRole("heading", { name: "Biblioteca", exact: true }).waitFor();
  const dmBefore = await saved();
  await page
    .locator("[data-library-import]")
    .setInputFiles(
      "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/library-wrong-format.json",
    );
  await page.locator("[data-library-apply]").waitFor();
  check(
    await page.locator("[data-library-apply]").isDisabled(),
    "Wrong-format file can be applied",
  );
  check((await saved()).library.length === dmBefore.library.length, "Wrong-format file imported");
  await page.locator("#demo-role").selectOption("player");
  await page.getByRole("heading", { name: "Biblioteca", exact: true }).waitFor();
  await page.locator('[data-service="preferences"]').first().click();
  await page.locator("#dialog [name=offline]").check();
  await button("Salva preferenze").click();
  await page.locator("[data-library-new]").click();
  await page.locator("#dialog [name=type]").selectOption("item");
  await button("Crea bozza privata").click();
  await page.locator('[data-library-path="name.it"]').fill("Diario da viaggio");
  await page.locator('[data-library-path="name.en"]').fill("Travel journal");
  await page.locator('[data-library-path="source.label"]').fill("Oggetto originale");
  await page.locator("[data-library-preview]").click();
  await page.locator("[data-library-apply]").click();
  await page.getByRole("heading", { name: "Diario da viaggio", exact: true, level: 1 }).waitFor();
  state = await saved();
  const offlineContent = state.library.at(-1);
  check(
    offlineContent.revisions[0].data.name.it === "Diario da viaggio",
    "Private offline authoring did not persist",
  );
  await page.locator("[data-library-share]").click();
  await page.locator('#dialog [name="read-dm"]').check();
  await button("Salva accessi").click();
  check(
    !(await saved()).library
      .find((entry) => entry.id === offlineContent.id)
      .accessByRevision[offlineContent.revisions[0].id].readers.includes("dm"),
    "Offline shared edit applied",
  );
  if (await page.locator("#dialog").isVisible()) await page.keyboard.press("Escape");
  await page.locator('[data-service="preferences"]').first().click();
  await page.locator("#dialog [name=offline]").uncheck();
  await button("Salva preferenze").click();
  passed.push(
    "wrong format rejected; private authoring works offline, shared access changes stay blocked",
  );
  // Serve the structured editor and the service worker again for later visits.
  await page.unroute("**/homebrew-editor.mjs");
  await page.unroute("**/sw.js");
  errors.push(...(await page.evaluate(() => window.__libraryErrors || [])));
  check(!errors.length, errors.join("; "));
  return { passed, errors, filePath };
};
