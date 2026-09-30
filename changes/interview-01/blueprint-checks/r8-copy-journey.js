async (rootPage) => {
  // R8 CA-88 (part; Roll20 Transmogrifier, contract C5): «Copia in un’altra campagna…» in
  // the item's own menus — a World entry's «Altro» and its right-click menu, a handout
  // card's «Altro», a saved random table and a card deck — opens Campagna › Dati with the
  // item picked (or, with no other campaign, C5's explanation with «Crea una campagna»).
  // Players never see it. IT desktop 1440 and phone 390 by touch. Synthetic data.
  const base = "http://127.0.0.1:8879/";
  const shots =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R8/images/";
  const browser = rootPage.context().browser();
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "it-IT",
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const role = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await page.waitForTimeout(150);
  };
  // After the copy command: either the Dati form with the item selected, or C5's dialog.
  const landed = async (label) => {
    await page.waitForTimeout(300);
    const dialog = page.locator("#dialog[open]");
    if (await dialog.count()) {
      const text = await dialog.innerText();
      check(
        /Copia in un’altra campagna/.test(text),
        label + ": unexpected dialog " + text.slice(0, 200),
      );
      await page.keyboard.press("Escape");
      return "C5 dialog";
    }
    check(page.url().includes("tab=campaign-data"), label + ": did not open Dati: " + page.url());
    const picked = await page
      .locator("[data-cd-form=scene-copy] select[name=sceneId]")
      .inputValue();
    return "Dati · " + picked;
  };
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await role("dm");
  // A World entry of the DM.
  await page.goto(base + "#campaign?tab=world");
  await page.getByRole("button", { name: "Nuova voce del mondo", exact: true }).click();
  await page.locator('[data-campaign-path="data.title"]').fill("Il ponte di Bruma");
  await page.locator('[data-campaign-path="data.body"]').fill("Il ponte crolla alla prima piena.");
  await page.locator("[data-campaign-access-mode=access]").selectOption("campaign");
  await page.locator("[data-campaign-apply]").click();
  await page.getByRole("button", { name: "Modifica", exact: true }).waitFor();
  const entryUrl = page.url();
  await page.locator(".campaign-more > summary").click();
  await page.locator("[data-campaign-copy-to]").click();
  const fromMore = await landed("entry «Altro»");
  // The right-click menu of the World list.
  await page.goto(base + "#campaign?tab=world");
  await page
    .locator("[data-campaign-row]", { hasText: "Il ponte di Bruma" })
    .click({ button: "right" });
  await page.locator('.campaign-context-menu [data-menu="copy"]').click();
  const fromRow = await landed("entry right-click");
  passed.push(`World entry: «Altro» → ${fromMore}; right-click → ${fromRow}`);
  // A handout card.
  await page.goto(base + "#preparation?tab=handouts");
  await page.locator(".handouts-card .handouts-more > summary").first().click();
  await page.locator(".handouts-card [data-hs-copy-to]").first().click();
  const fromHandout = await landed("handout");
  // A saved table and a deck in Preparation › Tabelle e mazzi.
  await page.goto(base + "#preparation?tab=random-tables");
  await page.locator("[data-rt-copy-to]").first().waitFor();
  await page.locator("[data-rt-copy-to]").first().click();
  const fromTable = await landed("table");
  await page.goto(base + "#preparation?tab=random-tables");
  await page.locator('[data-rt-select^="deck:"]').first().click();
  await page.locator('[data-rt-copy-to^="deck:"]').click();
  const fromDeck = await landed("deck");
  passed.push(`Handout → ${fromHandout}; table → ${fromTable}; deck → ${fromDeck}`);
  // C5 end to end: from the deck, «Crea una campagna» comes back to the copy of that deck.
  if (fromDeck === "C5 dialog") {
    await page.goto(base + "#preparation?tab=random-tables");
    await page.locator('[data-rt-select^="deck:"]').first().click();
    await page.locator('[data-rt-copy-to^="deck:"]').click();
    await page.locator('#dialog[open] button[type="submit"]').click();
    await page.waitForTimeout(300);
    // The creation dialog (a name) if any, then the copy of the same deck.
    for (let i = 0; i < 3; i++) {
      const open = page.locator("#dialog[open]");
      if (!(await open.count())) break;
      const text = await open.innerText();
      if (/Mazzo di carte · Destino|Destino/.test(text) && /Copia/.test(text)) break;
      const name = open.locator('input[name="name"], input[type="text"]').first();
      if (await name.count()) await name.fill("Le rovine di Sal");
      await open.locator('button[type="submit"]').click();
      await page.waitForTimeout(400);
    }
    const copy = page.locator("#dialog[open]");
    const copyText = (await copy.count()) ? await copy.innerText() : "";
    check(
      /Destino/.test(copyText),
      "after creating a campaign the deck copy did not return: " + copyText.slice(0, 300),
    );
    await page.screenshot({ path: shots + "r8-copy-deck-after-create.png" });
    await copy.locator('button[type="submit"]').click();
    await page.waitForTimeout(300);
    check(/Copiato in/.test(await page.locator("#toast").innerText()), "deck not copied");
    passed.push(
      "«Crea una campagna» (C5) comes back to the copy of the Fate deck, which is copied",
    );
  }
  // Players never see it.
  await role("player");
  await page.goto(entryUrl);
  await page.getByRole("button", { name: "Cronologia", exact: false }).first().waitFor();
  check(!(await page.locator("[data-campaign-copy-to]").count()), "a player sees the copy");
  passed.push("Players see no «Copia in un’altra campagna…»");
  // Phone 390 by touch (a touch context with the same demo state): the entry's «Altro»
  // holds it within the screen.
  const stored = await page.evaluate(() =>
    JSON.stringify(Object.fromEntries(Object.entries(localStorage))),
  );
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    locale: "it-IT",
  });
  const mobile = await phone.newPage();
  mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
  await mobile.goto(base);
  await mobile.evaluate((values) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(JSON.parse(values))) localStorage.setItem(k, v);
  }, stored);
  await mobile.reload();
  await mobile.locator("#demo-role").selectOption("dm");
  await mobile.waitForTimeout(150);
  await mobile.goto(entryUrl);
  await mobile.locator(".campaign-more > summary").tap();
  const item = mobile.locator("[data-campaign-copy-to]");
  const box = await item.boundingBox();
  check(
    box && box.x >= 0 && box.x + box.width <= 390 && box.height >= 40,
    "phone item off screen or small: " + JSON.stringify(box),
  );
  await mobile.screenshot({ path: shots + "r8-copy-entry-phone.png" });
  await item.tap();
  await mobile.waitForTimeout(300);
  const phoneDialog = (await mobile.locator("#dialog[open]").count())
    ? "C5 dialog"
    : mobile.url().includes("tab=campaign-data")
      ? "Dati"
      : "nowhere: " + mobile.url();
  check(!phoneDialog.startsWith("nowhere"), "phone copy went " + phoneDialog);
  await mobile.screenshot({ path: shots + "r8-copy-landed-phone.png" });
  passed.push(
    `Phone 390 by touch: «Altro» › «Copia in un’altra campagna…» (≥ 40 px, on screen) → ${phoneDialog}`,
  );
  await phone.close();
  await context.close();
  check(!errors.length, "page errors: " + errors.join(" | "));
  return JSON.stringify({ passed });
}
