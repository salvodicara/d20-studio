async (rootPage) => {
  // W2b2 integration: the two cross-area fixes in the real app, IT 1440, mouse and keyboard.
  // (1) B47 archive × B41 passages: the DM archives the crypt from Preparation's scene list
  // (P7); Livia crosses the courtyard stairs without being stopped or asked; a passage that
  // was already waiting is refused with the true reason and «Resta qui» still closes it; after
  // Restore the stairs ask again and lead to the crypt. (2) Preparation «Tutte le sezioni»
  // (DDB-060): keyboard open, Escape back to the button without navigating, a section off the
  // strip reached in two steps and shown in the redrawn strip. Synthetic data; resets the demo.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/W2b2-integ/cross/";
  const CRYPT = "old-watch-crypt";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const events = async () => (await stored()).ext.regions.events;
  const tokenOf = async (actorId, sceneId = "old-watch") =>
    (await stored()).scenes
      .find((s) => s.id === sceneId)
      ?.tokens.find((t) => t.actorId === actorId);
  const role = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await page.waitForTimeout(200);
  };
  const go = async (hash) => {
    await page.goto(base + "#" + hash);
    await page.locator("#content").waitFor();
    await page.waitForTimeout(250);
    const tip = page.getByRole("button", { name: /^(Ho capito|Got it)$/ });
    if (
      await tip
        .first()
        .isVisible()
        .catch(() => false)
    )
      await tip.first().click();
  };
  const clickScene = async (x, y) => {
    const q = await page.locator("#battle-map").evaluate(
      (svg, p) => {
        const t = svg.createSVGPoint();
        t.x = p.x;
        t.y = p.y;
        const r = t.matrixTransform(svg.getScreenCTM());
        return { x: r.x, y: r.y };
      },
      { x, y },
    );
    await page.mouse.click(q.x, q.y);
    await page.waitForTimeout(300);
  };
  // P6 TV-01 (Foundry, Owlbear): a token moves by dragging it, not by a click on the map.
  const toScreen = (x, y) =>
    page.locator("#battle-map").evaluate(
      (svg, p) => {
        const t = svg.createSVGPoint();
        t.x = p.x;
        t.y = p.y;
        const r = t.matrixTransform(svg.getScreenCTM());
        return { x: r.x, y: r.y };
      },
      { x, y },
    );
  const dragLivia = async (x, y) => {
    const t = await tokenOf("livia");
    const a = await toScreen(t.x, t.y);
    const b = await toScreen(x, y);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++)
      await page.mouse.move(a.x + ((b.x - a.x) * i) / 12, a.y + ((b.y - a.y) * i) / 12);
    await page.mouse.up();
    await page.waitForTimeout(350);
  };
  const selectLivia = async () => {
    const t = await tokenOf("livia");
    await clickScene(t.x, t.y);
  };
  const creatureTab = async () => {
    const tab = page.locator('.table-tabs [data-table-tab="creature"]');
    if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
    await page.waitForTimeout(150);
  };
  const regionPanel = () => page.locator("[data-regions-panel]");
  const archiveCrypt = async () => {
    await role("dm");
    // P7: one scene list (folders, search, archive); a row's «Altre azioni» holds Archivia.
    await go("preparation");
    await page.locator("[data-sa-search]").fill("cripta sotto il cortile");
    await page.waitForTimeout(300);
    const card = page.locator(`[data-sa-scene-card="${CRYPT}"]`);
    await card.locator("details.prep-menu > summary").click();
    await card.locator(`[data-sa-archive="${CRYPT}"]`).click();
    await page.waitForTimeout(300);
    check(!(await stored()).scenes.some((s) => s.id === CRYPT), "the crypt was not archived");
  };
  const restoreCrypt = async () => {
    await role("dm");
    await go("preparation");
    await page.locator("[data-sa-archive-view]").click();
    await page.locator(`[data-sa-restore="${CRYPT}"]`).click();
    await page.waitForTimeout(300);
    check(
      (await stored()).scenes.some((s) => s.id === CRYPT),
      "the crypt was not restored",
    );
  };

  try {
    await page.goto(base);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#content").waitFor();

    // ------------------------------------------------ (1a) archived crypt: no stop, no question
    await archiveCrypt();
    await role("player");
    await go("table");
    await selectLivia();
    const before = (await events()).length;
    await dragLivia(900, 560);
    const livia = await tokenOf("livia");
    // The click lands within a pixel of x 900; a stop would hold her on the edge, x 860.
    check(livia.x > 890, "Livia was stopped by a passage to nowhere: " + livia.x);
    check((await events()).length === before, "a passage question towards an archived scene");
    await creatureTab();
    const text = (await regionPanel().count()) ? await regionPanel().innerText() : "";
    check(!text.includes("Prendi il passaggio"), "the panel still offers the passage");
    await page.screenshot({ path: dir + "01-stairs-crossed-archived-crypt-it-1440.png" });
    passed.push(
      "(1a) DM archives «La cripta sotto il cortile» from Preparation's one scene list (row «Altre azioni» › Archivia); the player moves Livia onto «Scale per la cripta»: dragged there, she reaches the point (x ≈ 900, not stopped at 860), no passage event, no «Prendi il passaggio» in the Creature tab",
    );

    // ------------------------------------------------ (1b) a waiting passage, then archived
    await restoreCrypt();
    await role("player");
    await go("table");
    await selectLivia();
    await dragLivia(800, 560);
    await dragLivia(900, 560);
    check(Math.abs((await tokenOf("livia")).x - 860) < 0.5, "Livia did not stop on the stairs");
    check((await events()).at(-1).status === "awaiting-mover", "no passage question after Restore");
    await archiveCrypt();
    await role("player");
    await go("table");
    await creatureTab();
    await regionPanel().getByRole("button", { name: "Prendi il passaggio" }).click();
    await page.waitForTimeout(300);
    const toast = await page.locator("#toast").textContent();
    check(/archiviata o eliminata/.test(toast), "refusal without the reason: " + toast);
    check(await tokenOf("livia"), "Livia left the courtyard");
    await page.screenshot({ path: dir + "02-passage-refused-archived-it-1440.png" });
    await regionPanel().getByRole("button", { name: "Resta qui" }).click();
    await page.waitForTimeout(250);
    check((await events()).at(-1).status === "declined", "«Resta qui» did not close the question");
    passed.push(
      `(1b) After Restore the stairs stop Livia at x 860 and ask again; the DM archives the crypt while the question waits: «Prendi il passaggio» is refused with «${toast.trim()}» and Livia stays; «Resta qui» closes the question (declined)`,
    );

    // ------------------------------------------------ (1c) restored: the passage works again
    await restoreCrypt();
    await role("player");
    await go("table");
    await selectLivia();
    await dragLivia(800, 560);
    await dragLivia(900, 560);
    await creatureTab();
    await regionPanel().getByRole("button", { name: "Prendi il passaggio" }).click();
    await page.waitForTimeout(300);
    check(!(await tokenOf("livia")), "Livia is still in the courtyard");
    const inCrypt = await tokenOf("livia", CRYPT);
    check(inCrypt && inCrypt.x === 120 && inCrypt.y === 120, "Livia not at the crypt stairs");
    await page.reload();
    await page.locator("#content").waitFor();
    check(await tokenOf("livia", CRYPT), "reload lost the passage");
    passed.push(
      "(1c) Restore from the archive view: out and in again, «Prendi il passaggio» puts Livia in the crypt at (120, 120); reload keeps it",
    );

    // ------------------------------------------------ (2) Preparation «Tutte le sezioni»
    await role("dm");
    await go("preparation");
    const all = page.locator("[data-prep-sections-all]");
    check(await all.isVisible(), "no «Tutte le sezioni» beside the Preparation strip");
    check(
      (await all.getAttribute("aria-label")) === "Tutte le sezioni della preparazione",
      "quick-jump label",
    );
    await all.focus();
    await page.keyboard.press("Enter");
    await page.locator("#dialog[open] [data-prep-section-jump]").first().waitFor();
    const listed = await page
      .locator("#dialog [data-prep-section-jump]")
      .evaluateAll((els) =>
        els.map((el) => [el.dataset.prepSectionJump, el.getAttribute("aria-current")]),
      );
    // B62: the sections are grouped; the list names every section of every group, under
    // one heading per group of the strip (PR-06: the badge beside «Scene» now counts scenes).
    const strip = await page.evaluate(() =>
      [...document.querySelectorAll(".prep-groups [data-prep-group]")].map(
        (g) => g.dataset.prepGroup,
      ),
    );
    const headings = await page.locator("#dialog .table-panels-group").count();
    check(headings === strip.length, `dialog has ${headings} groups of ${strip.length}`);
    check(listed.length >= strip.length, `dialog lists ${listed.length} sections`);
    check(listed.find(([id]) => id === "scenes")?.[1] === "true", "open section not marked");
    const focusIn = await page.evaluate(() =>
      document.querySelector("#dialog").contains(document.activeElement),
    );
    check(focusIn, "focus did not enter the dialog");
    await page.screenshot({ path: dir + "03-prep-all-sections-it-1440.png" });
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("#dialog")?.open);
    check(!(await page.evaluate(() => location.hash.includes("tab="))), "Escape navigated");
    const back = await page.evaluate(() =>
      document.activeElement?.hasAttribute("data-prep-sections-all"),
    );
    check(back, "focus did not return to «Tutte le sezioni»");
    // A section off the strip at 1440: two steps, then shown in the redrawn strip.
    const hidden = await page.evaluate(() => {
      const s = document.querySelector(".prep-sections").getBoundingClientRect();
      return [...document.querySelectorAll(".prep-sections [data-prep-section]")]
        .filter((el) => el.getBoundingClientRect().right > s.right + 1)
        .map((el) => el.dataset.prepSection);
    });
    const target = hidden.at(-1) ?? "adventures";
    await page.keyboard.press("Enter");
    await page.locator(`#dialog [data-prep-section-jump="${target}"]`).click();
    await page.waitForFunction((t) => location.hash.includes("tab=" + t), target);
    await page.locator(`.prep-sections [data-prep-section="${target}"].active`).waitFor();
    await page.waitForTimeout(150);
    const shown = await page.evaluate((t) => {
      const s = document.querySelector(".prep-sections").getBoundingClientRect();
      const r = document
        .querySelector(`.prep-sections [data-prep-section="${t}"]`)
        .getBoundingClientRect();
      return r.left >= s.left - 1 && r.right <= s.right + 1;
    }, target);
    check(shown, `${target} is not shown in the redrawn strip`);
    await page.screenshot({ path: dir + "04-prep-jumped-it-1440.png" });
    passed.push(
      `(2) Preparation «Tutte le sezioni» (1440, keyboard): Enter opens «Sezioni della preparazione» with all ${listed.length} sections in ${strip.length} groups and «Scene» marked, focus inside; Escape closes without navigating and gives the focus back; off the strip at 1440: ${hidden.join(", ") || "none"}; «${target}» reached in 2 steps and shown in the redrawn strip`,
    );
    check(!errors.length, "page errors: " + errors.join("; "));
    return { passed, errors };
  } finally {
    await context.close();
  }
}
