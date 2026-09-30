async (rootPage) => {
  // B36 review (B36-rf): the fixes in the one app with real clicks and keys. (1) The DM gives
  // Doran's longbow to Livia: an offer (I-071), the DM cannot accept for her, her player gets
  // the bell and accepts (I-070). (2) An offered Backpack shows its contents to Doran's player
  // and becomes unacceptable when the sender takes the rations out (INV-08). (3) Keyboard:
  // after «Dividi la pila» focus returns to the row's «Altro». (4) Table: the bow preview
  // states 24/96 m; «Cambia set» in the Creature tab keeps focus on itself. Synthetic demo
  // data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B36-rf/";
  const context = await rootPage
    .context()
    .browser()
    .newContext({
      viewport: { width: 1440, height: 900 },
    });
  const page = await context.newPage();
  const passed = [],
    errors = [];
  let step = "start";
  page.on("pageerror", (error) => errors.push(step + ": " + error.message));
  const check = (value, message) => {
    if (!value) throw Error(step + ": " + message);
  };
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const invp = () => page.locator("#content .invp");
  const dialog = () => page.locator("#dialog[open]");
  const quietTips = async () => {
    const off = page.getByRole("button", { name: /Non mostrare suggerimenti|Stop showing tips/ });
    if (await off.count()) await off.first().click();
  };
  const role = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await quietTips();
  };
  const sheet = async (id) => {
    const nav = page.locator('.nav-link[data-nav="characters"]');
    if (await nav.isVisible()) await nav.click();
    else await page.goto(base + "#characters");
    await page.locator(`[data-character-action="open"][data-actor="${id}"]`).click();
    await page.locator('[data-character-tab="inventory"]').click();
    await invp().waitFor();
    await quietTips();
  };
  const menu = async (rowId, action) => {
    await page.locator(`[data-invp="menu"][data-invp-id="${rowId}"]`).first().click();
    await page.locator(`#dialog [data-invp-menu="${action}"]`).click();
    await dialog().waitFor();
  };
  const submit = async () => {
    await page.locator('#dialog[open] button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector("#dialog")?.open);
  };
  const shot = async (name, locator) => {
    if (locator) await locator.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.screenshot({ path: dir + name });
  };

  try {
    step = "setup";
    await page.goto(base + "#home");
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await page.locator('.nav-link[data-nav="characters"]').waitFor();
    await quietTips();

    // ---------------------------------------------------------- 1. DM → Livia is an offer
    step = "dm-offer";
    await role("dm");
    await sheet("doran");
    await menu("invp-doran-longbow", "move");
    const options = await page.locator('#dialog select[name="target"] option').allInnerTexts();
    check(
      options.some((o) => /Livia · offerta da accettare/.test(o)),
      "Livia is an offer: " + options,
    );
    await page.locator('#dialog select[name="target"]').selectOption("actor:livia");
    await submit();
    await page.locator("#toast", { hasText: "Offerta inviata a Livia" }).waitFor();
    check(
      (await stored()).actors.doran.inventory.some((r) => r.id === "invp-doran-longbow"),
      "Nothing moves before the answer",
    );
    await sheet("livia");
    const waiting = page.locator(".invp-offer", { hasText: "Da Doran" });
    await waiting.waitFor();
    check(
      !(await waiting.locator('[data-invp="offer-accept"]').count()),
      "The DM must not accept for Livia's player",
    );
    check(
      (await waiting.innerText()).includes("In attesa di chi gioca il destinatario"),
      "Waiting text",
    );
    await shot("rf-10-dm-waits-for-livia.png", waiting);
    passed.push(
      "1a. DM on Doran's sheet: «Sposta, passa o copia…» lists «Livia · offerta da accettare» (I-071); confirming sends an offer, the bow stays with Doran; on Livia's sheet the DM reads «In attesa di chi gioca il destinatario», no Accept",
    );

    step = "player-accepts";
    await role("player");
    await page.locator('[data-service="requests"]').click();
    const note = page.locator("#dialog [data-notifications-open]", {
      hasText: "Offerta da Doran per Livia",
    });
    await note.waitFor();
    await note.click();
    await invp().waitFor();
    const incoming = page.locator(".invp-offer", { hasText: "Da Doran" });
    await incoming.locator('[data-invp="offer-accept"]').click();
    await page.locator("#toast", { hasText: "Offerta accettata" }).waitFor();
    const after = await stored();
    check(
      after.actors.livia.inventory.some((r) => r.srdId === "srd2024:item:longbow"),
      "Longbow reaches Livia",
    );
    check(
      !after.actors.doran.inventory.some((r) => r.id === "invp-doran-longbow"),
      "Longbow leaves Doran",
    );
    passed.push(
      "1b. Player: the bell shows «Offerta da Doran per Livia», opening it lands on Livia's Inventory; «Accetta» moves the Longbow (I-070)",
    );

    // ---------------------------------------------------------- 2. container contents
    step = "container-offer";
    await menu("invp-backpack", "move");
    await page.locator('#dialog select[name="target"]').selectOption("actor:doran");
    await submit();
    await role("dm");
    await sheet("doran");
    const bag = page.locator(".invp-offer", { hasText: "Da Livia" });
    await bag.waitFor();
    check(/Zaino ×1 \(Razioni ×4, /.test(await bag.innerText()), "Contents shown to Doran");
    await shot("rf-11-offer-with-contents.png", bag);
    await role("player");
    await sheet("livia");
    await menu("invp-rations", "move");
    await page.locator('#dialog select[name="target"]').selectOption("self:root");
    await submit();
    await role("dm");
    await sheet("doran");
    const stale = page.locator(".invp-offer", { hasText: "Da Livia" });
    await stale.locator(".error", { hasText: "Il contenuto di Zaino è cambiato" }).waitFor();
    check(
      await stale.locator('[data-invp="offer-accept"]').isDisabled(),
      "Stale offer cannot be accepted",
    );
    await shot("rf-12-offer-contents-changed.png", stale);
    passed.push(
      "2. Livia offers the Backpack: Doran's player reads «Zaino ×1 (Razioni ×4, …)»; after the rations are taken out the offer says «Il contenuto di Zaino è cambiato dopo l’offerta» and Accept is disabled (INV-08)",
    );

    // ---------------------------------------------------------- 3. keyboard focus
    step = "keyboard";
    await role("player");
    await sheet("livia");
    await page.locator('[data-invp="menu"][data-invp-id="invp-arrows"]').focus();
    await page.keyboard.press("Enter");
    await page.locator('#dialog [data-invp-menu="split"]').waitFor();
    await page.locator('#dialog [data-invp-menu="split"]').focus();
    await page.keyboard.press("Enter");
    await page.locator('#dialog input[name="quantity"]').waitFor();
    await page.locator('#dialog input[name="quantity"]').fill("5");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => !document.querySelector("#dialog")?.open);
    const focused = await page.evaluate(() => ({
      invp: document.activeElement?.dataset?.invp,
      id: document.activeElement?.dataset?.invpId,
    }));
    check(
      focused.invp === "menu" && focused.id === "invp-arrows",
      "Focus back on the row: " + JSON.stringify(focused),
    );
    const stacks = (await stored()).actors.livia.inventory
      .filter((r) => r.ammunition === "arrow")
      .map((r) => r.quantity);
    check(JSON.stringify(stacks) === "[15,5]", "Split 20 → 15 + 5: " + stacks);
    passed.push(
      "3. Keyboard: «Altro» (Enter) → «Dividi la pila…» (Enter) → 5 (Enter): 20 → 15 + 5 and focus returns to the arrows' «Altro», not the page top",
    );

    // ---------------------------------------------------------- 4. Table
    step = "table";
    await page.locator('[data-invp="swap"]').click();
    await page.goto(base + "#table");
    await quietTips();
    const box = page.locator("[data-invp-inspector]");
    await box.waitFor();
    await page.locator('.combat-action[data-combat-action="invp-ranged-invp-shortbow"]').click();
    const preview = page.locator("#combat-detail");
    await preview.waitFor();
    check(/Gittata 24\/96 m, svantaggio oltre la normale/.test(await preview.innerText()), "Range");
    await shot("rf-13-bow-long-range.png", preview);
    await page.locator("[data-combat-cancel]").click();
    await page.locator('[data-invp-table="swap"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => document.querySelector("[data-invp-table-active]")?.textContent === "Bastone",
    );
    check(
      await page.evaluate(() => document.activeElement?.dataset?.invpTable === "swap"),
      "Focus stays on «Cambia set»",
    );
    passed.push(
      "4. Table: the Shortbow preview reads «Gittata 24/96 m, svantaggio oltre la normale» (SRD Range); «Cambia set» by keyboard in the Creature tab swaps to Bastone and keeps focus on itself",
    );

    // ---------------------------------------------------------- 5. EN phone 390, touch
    step = "phone";
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    const phoneContext = await rootPage
      .context()
      .browser()
      .newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
    const phone = await phoneContext.newPage();
    phone.on("pageerror", (error) => errors.push("phone: " + error.message));
    await phone.goto(base + "#home");
    await phone.evaluate(([k, v]) => localStorage.setItem(k, v), [key, snapshot]);
    await phone.reload();
    await phone.locator('[data-service="preferences"]').tap();
    await phone.locator('#dialog [name="lang"]').selectOption("en");
    await phone.locator('#dialog[open] button[type="submit"]').tap();
    await phone.locator("#demo-role").selectOption("dm");
    await phone.goto(base + "#characters?id=doran&tab=inventory");
    await phone.locator("#content .invp").waitFor();
    const off = phone.getByRole("button", { name: /Stop showing tips/ });
    if (await off.count()) await off.first().tap();
    const offer = phone.locator(".invp-offer", { hasText: "From Livia" });
    await offer.waitFor();
    check(/Backpack ×1 \(/.test(await offer.innerText()), "EN contents");
    check(
      /The contents of Backpack changed after the offer/.test(await offer.innerText()),
      "EN reason",
    );
    check(
      await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      "Phone overflow",
    );
    await offer.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await phone.screenshot({ path: dir + "rf-14-phone-en-offer.png" });
    await phoneContext.close();
    passed.push(
      "5. EN phone 390 (touch): Doran's sheet reads «From Livia · Backpack ×1 (…)» with «The contents of Backpack changed after the offer», no horizontal overflow",
    );
  } catch (error) {
    errors.push(error.message);
    await page.screenshot({ path: dir + "rf-failure.png" }).catch(() => {});
  }
  await context.close();
  return JSON.stringify({ passed, errors });
}
