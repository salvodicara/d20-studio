async (rootPage) => {
  // R5 PR-32 (Foundry's per-scene encounters, D&D Beyond «Run encounter»): the scene editor
  // shows the encounter builder's own editor for the scene's encounter; a change made there
  // appears in «Incontri» and back. H-07: the palette finds «Allinea la griglia alla mappa»
  // and the encounter builder (IT and EN). CA-88: «Copia in un’altra campagna…» on a scene
  // row. Desktop 1440 × 900, then the scene editor on a 390 × 844 touch phone. Synthetic
  // demo data only; resets the demo.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R5/";
  const browser = rootPage.context().browser();
  const passed = [],
    errors = [];
  let step = "setup";
  const at = (name) => (step = name);
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const watch = (page) => {
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
    page.on("dialog", (d) => d.accept().catch(() => {}));
  };
  const role = async (page, value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
  };
  const openScene = async (page) => {
    await page.goto(base + "#preparation");
    await page.locator('[data-prep-open="old-watch"]').first().click();
    await page.locator('[data-eb-scene="old-watch"]').waitFor();
  };
  const countOf = (page, rowId) =>
    page.locator(`[data-eb-count-of="${rowId}"]`).first().innerText();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  watch(page);
  try {
    at("reset");
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await role(page, "dm");
    await page.getByRole("button", { name: "Ripristina esempio", exact: true }).click();
    await page.getByRole("button", { name: "Ripristina", exact: true }).click();
    await page.locator("#battle-map").waitFor();
    await role(page, "dm");

    at("PR-32 scene editor shows the builder");
    await openScene(page);
    check(
      !(await page.locator(".prep-encounter").count()),
      "no second «Incontro preparato» editor",
    );
    check(!(await page.getByText("Il bonus è dichiarato, non ricavato").count()), "H-04 line gone");
    await page.locator('[data-eb-scene] [data-eb="scene-new"]').first().click();
    await page.locator('[data-eb-host="scene"]').waitFor();
    await page.locator('[data-eb-filter="q"]').fill("goblin");
    await page.waitForTimeout(400);
    await page.locator('[data-eb="add"]').first().click();
    const row = page.locator(".eb-row").first();
    await row.waitFor();
    const rowId = await row.getAttribute("data-eb-row");
    await page.locator(`[data-eb="count"][data-row="${rowId}"][data-delta="1"]`).click();
    await page.waitForFunction(
      (id) => document.querySelector(`[data-eb-count-of="${id}"]`)?.textContent === "2",
      rowId,
    );
    await page.screenshot({ path: dir + "r5-enc-01-scene-editor-builder.png", fullPage: true });
    passed.push("scene editor: «Incontro della scena» is the builder; 2 goblins added there");

    at("PR-32 same object in «Incontri»");
    await page.locator('[data-eb-scene] [data-eb="open-in-builder"]').click();
    await page.locator('[data-eb-view="editor"]:not([data-eb-host])').waitFor();
    check((await countOf(page, rowId)) === "2", "«Incontri» shows the scene's change");
    await page.locator(`[data-eb="count"][data-row="${rowId}"][data-delta="1"]`).click();
    await page.waitForFunction(
      (id) => document.querySelector(`[data-eb-count-of="${id}"]`)?.textContent === "3",
      rowId,
    );
    await page.locator('[data-eb="back"]').click();
    const link = page.locator('[data-eb="open-scene-of"]').first();
    await link.waitFor();
    check((await link.innerText()).includes("cortile"), "the list names the encounter's scene");
    await page.screenshot({ path: dir + "r5-enc-02-builder-list-scene.png" });
    await link.click();
    await page.locator('[data-eb-scene="old-watch"]').waitFor();
    check(
      (await countOf(page, rowId)) === "3",
      "the scene editor shows the change made in Incontri",
    );
    passed.push("«Incontri» and the scene editor edit the same encounter (2 → 3 both ways)");

    at("PR-32 prepare and start from the scene editor");
    // The same controls as «Incontri»: «Prepara nella scena» puts the goblins on this map (the
    // editor's untouched draft follows the saved scene), «Avvia combattimento…» opens the
    // Table's start dialog (DDB «Run encounter» on a map).
    const tokensBefore = await page.locator("[data-prep-map] [data-prep-token]").count();
    await page.locator('[data-eb-scene] [data-eb="handoff"]').click();
    await page.waitForFunction(
      (n) => document.querySelectorAll("[data-prep-map] [data-prep-token]").length === n + 3,
      tokensBefore,
    );
    check(
      (await page.locator("[data-prep-status]").innerText()).includes("Versione salvata"),
      "the scene editor has a stale draft after the hand-off",
    );
    await page.locator('[data-eb-scene] [data-eb="start"]').click();
    await page.locator("[data-ct-start-dialog]").waitFor();
    // Refreshed by the round-2 regression (29/09/2026): since the hand-offs (TV-52, Foundry
    // group roll) creatures that share one Initiative roll are one row («Goblin guerriero A,
    // B, C», `data-ct-start-group` names its members), so the creatures are counted, not rows.
    const goblins = await page
      .locator("[data-ct-start-row]")
      .evaluateAll((rows) =>
        rows.reduce(
          (n, row) =>
            n + (row.dataset.ctStartGroup ? row.dataset.ctStartGroup.split(" ").length : 1),
          0,
        ),
      );
    check(goblins >= tokensBefore + 3, "the start dialog does not list the prepared goblins");
    await page.getByRole("button", { name: "Torna al Tavolo", exact: true }).click();
    await page.screenshot({ path: dir + "r5-enc-02b-scene-prepared.png", fullPage: true });
    passed.push(
      `scene editor: «Prepara nella scena» adds 3 goblin tokens to this map (${tokensBefore} → ${tokensBefore + 3}), draft stays the saved version; «Avvia combattimento…» opens the start dialog with ${goblins} creatures`,
    );

    at("H-07 palette IT");
    const mod = await page.evaluate(() =>
      /Mac|iPhone|iPad/.test(navigator.platform) ? "Meta" : "Control",
    );
    const palette = async (text) => {
      if (!(await page.locator("#dialog [data-cmdk-input]").count())) {
        await page.keyboard.press(`${mod}+k`);
        await page.locator("#dialog [data-cmdk-input]").waitFor();
      }
      await page.locator("#dialog [data-cmdk-input]").fill(text);
      await page.waitForTimeout(250);
      return page.locator("#dialog [data-cmdk-list]").innerText();
    };
    check((await palette("allinea")).includes("Allinea la griglia alla mappa"), "palette allinea");
    check((await palette("calibra")).includes("Allinea la griglia alla mappa"), "palette calibra");
    check(
      (await palette("costruttore di incontri")).includes("costruttore d’incontri"),
      "palette costruttore di incontri",
    );
    await palette("allinea");
    await page
      .locator("#dialog .cmdk-option")
      .filter({ hasText: "Allinea la griglia" })
      .first()
      .click();
    await page.locator(".prep-align-head").waitFor();
    passed.push(
      "palette IT: «allinea», «calibra» → grid alignment opens; «costruttore di incontri» found",
    );

    at("H-07 palette EN");
    await page.goto(base + "#home");
    await page.locator('[data-service="preferences"]').first().click();
    await page.locator("#dialog [name=lang]").selectOption("en");
    await page.locator("#dialog button[type=submit]").click();
    await page.locator("#dialog[open]").waitFor({ state: "detached" });
    check(
      (await palette("align grid")).includes("Align the grid to the map"),
      "palette align grid",
    );
    check(
      (await palette("encounter builder")).includes("Open the encounter builder"),
      "palette encounter builder",
    );
    await page.keyboard.press("Escape");
    passed.push("palette EN: «align grid», «encounter builder» found");

    at("CA-88 copy a scene to another campaign");
    await page.goto(base + "#preparation");
    const card = page.locator('.prep-scene-row:has([data-prep-open="old-watch"])').first();
    await card.locator("details.prep-menu summary").first().click();
    const copy = card.locator('[data-prep-copy-to="old-watch"]');
    check(await copy.count(), "«Copy to another campaign…» in the row menu");
    await copy.click();
    // C5: campaign-data.openCopyTo opens its own section; what it shows with a single
    // campaign (the copy form or «Crea una campagna») is the provider's (R7).
    await page.waitForFunction(() => location.hash.includes("campaign-data"), null, {
      timeout: 5000,
    });
    await page.waitForTimeout(300);
    const form = await page.locator('[data-cd-form="scene-copy"]').count();
    const picked = form
      ? await page.locator('[data-cd-form="scene-copy"] select').first().inputValue()
      : "";
    await page.screenshot({ path: dir + "r5-enc-04-copy-to.png" });
    passed.push(
      `CA-88: the row menu opens «${await page.locator("main h1, main h2").first().innerText()}» (copy form: ${form ? "yes, preselected " + (picked || "—") : "not shown with one campaign"})`,
    );
  } catch (error) {
    await context.close();
    return JSON.stringify({ ok: false, step, error: error.message, passed, errors });
  }
  await context.close();

  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const p = await phone.newPage();
  watch(p);
  try {
    at("phone scene editor");
    await p.goto(base + "#table");
    await p.locator("#battle-map").waitFor();
    await role(p, "dm");
    await p.goto(base + "#preparation");
    await p.locator('[data-prep-open="old-watch"]').first().tap();
    const panel = p.locator('[data-eb-scene="old-watch"]');
    await panel.waitFor();
    await panel.scrollIntoViewIfNeeded();
    const wide = await p.evaluate(() => document.scrollingElement.scrollWidth);
    check(wide <= 390, "the phone page does not scroll sideways: " + wide);
    await p.screenshot({ path: dir + "r5-enc-03-phone-scene-encounter.png" });
    passed.push("phone 390 touch: the scene's encounter panel fits (scrollWidth " + wide + ")");
  } catch (error) {
    await phone.close();
    return JSON.stringify({ ok: false, step, error: error.message, passed, errors });
  }
  await phone.close();
  return JSON.stringify({ ok: errors.length === 0, passed, errors });
}
