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
  const button = (name) => page.getByRole("button", { name, exact: true });
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const path =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/library-export.json";
  const before = (await saved()).libraryDrafts.length;
  await page.evaluate(() => {
    const original = File.prototype.text;
    window.__restoreLibraryRead = () => {
      File.prototype.text = original;
    };
    File.prototype.text = function () {
      const file = this;
      return new Promise((resolve) => {
        window.__finishLibraryRead = async () => resolve(await original.call(file));
      });
    };
  });
  await page.locator("[data-library-import]").setInputFiles(path);
  await page.waitForFunction(() => typeof window.__finishLibraryRead === "function");
  await page.locator("[data-library-new]").click();
  await page.locator("#dialog [name=type]").selectOption("feature");
  await button("Crea bozza privata").click();
  await page.locator('[data-library-path="name.it"]').fill("Bozza da preservare");
  await page.evaluate(async () => {
    await window.__finishLibraryRead();
    window.__restoreLibraryRead();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  check(
    (await page.locator('[data-library-path="name.it"]').inputValue()) === "Bozza da preservare",
    "Stale file completion lost working text",
  );
  check(
    (await page.locator("[data-library-status]").innerText()).includes("Modifiche non salvate"),
    "Stale file cleared dirty state",
  );
  check(
    (await saved()).libraryDrafts.length === before + 1,
    "Stale read created unexpected import draft",
  );
  passed.push(
    "a real delayed file read cannot replace a newer dirty editor or commit its stale result",
  );
  await page.locator("[data-library-save]").click();
  await button("Personaggi").click();
  await page.locator('[data-character-action="create"]').click();
  await page.locator('[data-builder-path="identity.name"]').fill("Viaggiatrice");
  await page.locator('.builder-sections [data-builder-section="features"]').click();
  const draftId = (await saved()).characterDrafts.at(-1).id;
  await page.locator('[data-builder-library="features"]').click();
  await page.getByRole("heading", { name: "Biblioteca", exact: true }).waitFor();
  await page.locator("[data-library-import]").setInputFiles(path);
  await page.locator("[data-library-apply]").waitFor();
  let state = await saved(),
    importDraft = state.libraryDrafts.at(-1);
  check(importDraft.returnTo?.draftId === draftId, "Import preview lost originating draft");
  const bundleId = importDraft.data.bundle.contents[0].id;
  await page.reload();
  check(
    await page.locator("[data-library-apply]").isEnabled(),
    "Import preview unavailable after reload",
  );
  await page.locator("[data-library-apply]").click();
  await page.getByRole("heading", { name: "Biblioteca", exact: true }).waitFor();
  await page.locator('[data-library-open="' + bundleId + '"]').click();
  await page.locator("[data-library-choose]").click();
  await page.locator("[data-builder-section-title]").waitFor();
  state = await saved();
  const draft = state.characterDrafts.find((entry) => entry.id === draftId);
  check(
    draft.data.features.custom.some((row) => row.homebrewRef?.contentId === bundleId),
    "Imported content not selectable into original builder draft",
  );
  check(draft.data.identity.name === "Viaggiatrice", "Contextual import lost builder input");
  passed.push(
    "contextual file import survives reload and returns selected content to the originating builder draft",
  );
  // Serve the structured editor and the service worker again for later visits.
  await page.unroute("**/homebrew-editor.mjs");
  await page.unroute("**/sw.js");
  errors.push(...(await page.evaluate(() => window.__libraryErrors || [])));
  check(!errors.length, errors.join("; "));
  return { passed, errors };
};
