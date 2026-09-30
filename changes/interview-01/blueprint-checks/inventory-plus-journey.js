async (rootPage) => {
  // B36 — deep inventory in the one app with real clicks, keys, drag and touch. Group 1 player
  // IT 1440: search/filters, variant encumbrance, backpack in the Bag of Holding with the
  // capacity exceeded (menu, drag, Undo), split arrows and an offer to Doran (copy DM only),
  // coins converted/in a container/offered, attunement 3/3, BG3 equip refusal and set swap,
  // Staff of Fire usage dialog, reload. Group 2 DM: offers accepted on Doran, the swap stows
  // Doran's shield, DM copy, ring identified, clock advanced. Group 3 player: dawn recharge
  // with a physical die, fourth attunement refused, cloak ended, ring attuned. Group 4 combat:
  // two bow attacks at the Table spend two arrows, recovery of half after the fight. Group 5
  // EN phone 390 touch. Synthetic demo data only; resets this browser's demo state.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B36/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [],
    errors = [];
  let step = "start";
  page.on("pageerror", (error) => errors.push(step + ": " + error.message));
  const check = (value, message) => {
    if (!value) throw Error(step + ": " + message);
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const actor = async (id, p = page) => (await stored(p)).actors[id];
  const row = async (actorId, rowId, p = page) =>
    (await actor(actorId, p)).inventory.find((r) => r.id === rowId);
  const invp = (p = page) => p.locator("#content .invp");
  const shot = async (name, locator = null, p = page) => {
    if (locator) await locator.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await p.screenshot({ path: dir + name });
  };
  const quietTips = async (p = page) => {
    const off = p.getByRole("button", { name: /Non mostrare suggerimenti|Stop showing tips/ });
    if (await off.count()) await off.first().click();
  };
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await quietTips(p);
  };
  const dialog = (p = page) => p.locator("#dialog[open]");
  const submit = async (p = page, tap = false) => {
    const button = p.locator('#dialog[open] button[type="submit"]');
    await (tap ? button.tap() : button.click());
    await p.waitForFunction(() => !document.querySelector("#dialog")?.open);
  };
  const toast = async (text, p = page) => {
    await p.locator("#toast.shown", { hasText: text }).waitFor({ timeout: 4000 });
    return p.locator("#toast").innerText();
  };
  const menu = async (rowId, action, p = page, opens = true) => {
    await p.locator(`[data-invp="menu"][data-invp-id="${rowId}"]`).first().click();
    await p.locator(`#dialog [data-invp-menu="${action}"]`).click();
    if (opens) await dialog(p).waitFor();
  };
  const settleDice = async (p = page) => {
    const layer = p.locator("[data-dice3d-layer]:not([hidden])");
    await layer.waitFor({ timeout: 1200 }).catch(() => {});
    for (let i = 0; i < 8 && (await layer.count()); i++) {
      await p.keyboard.press("Escape");
      await p.waitForTimeout(80);
    }
    await layer.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  };
  const sheet = async (id, p = page) => {
    // At the Table the header is compact (App menu): go to Characters by its address there.
    const nav = p.locator('.nav-link[data-nav="characters"]');
    if (await nav.isVisible()) await nav.click();
    else await p.goto(base + "#characters");
    await p.locator(`[data-character-action="open"][data-actor="${id}"]`).click();
    await p.locator('[data-character-tab="inventory"]').click();
    await invp(p).waitFor();
    await quietTips(p);
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const smallTargets = (p, scope) =>
    p
      .locator(`${scope} button, ${scope} select, ${scope} input, ${scope} summary`)
      .evaluateAll((nodes) =>
        nodes
          .filter((n) => n.offsetParent && n.type !== "radio" && n.type !== "checkbox")
          .map((n) => [
            (n.textContent || n.getAttribute("aria-label") || n.name || "").trim().slice(0, 40),
            Math.round(n.getBoundingClientRect().height),
          ])
          .filter(([, h]) => h < 40),
      );

  try {
    // ------------------------------------------------------------ group 1: player, IT 1440
    step = "setup";
    await page.goto(base + "#home");
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await page.locator('.nav-link[data-nav="characters"]').waitFor();
    await quietTips();
    await role("player");
    // Personaggi → Livia → Inventario: three clicks.
    await sheet("livia");
    check((await invp().textContent()).includes("Peso trasportato"), "Summary missing");
    check(
      (await page.locator("[data-invp-attuned-count]").innerText()).startsWith("2"),
      "Two items attuned at start",
    );
    check(
      (await page.locator('[data-invp-row="invp-ring"]').innerText()).includes(
        "Anello d’argento inciso",
      ),
      "Apparent ring name",
    );
    check(
      !(await invp().innerText()).includes("Anello di protezione"),
      "The player reads the ring's secret name",
    );
    await shot("b36-01-inventory-it-1440.png", invp());
    passed.push(
      "1. Personaggi › Livia › Inventario in 3 clicks: weight/attunement 2/3/coins with Bruma scales/weapon sets, containers grouped with capacity, the ring only as «Anello d’argento inciso · Non identificato»",
    );

    step = "search";
    await page.locator("[data-invp-search]").click();
    await page.keyboard.type("frecce");
    await page.locator('[data-invp-results="1"]').waitFor();
    check(
      (await page.locator('[data-invp-row="invp-arrows"]').innerText()).includes("addosso"),
      "Location of the found row",
    );
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Backspace");
    await page.locator(".invp-tree").waitFor();
    await page.locator('[data-invp-filter="attunement"]').click();
    await page.locator('[data-invp-slot="3"]').waitFor();
    check((await page.locator(".invp-slot.is-filled").count()) === 2, "Two filled slots");
    // Final review F10: rarity, order and columns are folded under «Visualizzazione».
    if (!(await page.locator("[data-invp-rarity]").isVisible()))
      await page.locator("details.invp-view > summary").click();
    await page.locator("[data-invp-rarity]").selectOption("rare");
    await page.locator('[data-invp-results="1"]').waitFor();
    check((await page.locator('[data-invp-row="invp-amulet"]').count()) === 1, "Rare + attunement");
    await page.locator("[data-invp-rarity]").selectOption("");
    await page.locator('[data-invp-filter="all"]').click();
    await page.locator(".invp-tree").waitFor();
    passed.push(
      "11. Search typed by keyboard «frecce» → 1 result with its place («addosso»); Sintonia filter shows the three DDB slots (2 filled); rarity «raro» + Sintonia → Amuleto della salute only; the hidden ring never matches",
    );

    step = "encumbrance";
    // Final review F10: the encumbrance rule is folded with its capacity (D&D Beyond setting).
    if (!(await page.locator("[data-invp-encumbrance]").isVisible()))
      await page.locator("details.invp-rule > summary").first().click();
    await page.locator("[data-invp-encumbrance]").selectOption("variant");
    await page.locator('[data-invp-load="encumbered"]').waitFor();
    check((await page.locator("[data-invp-speed]").innerText()) === "6 m", "Variant speed 6 m");
    check(
      (await page.locator("[data-invp-load-reason]").innerText()).includes("Velocità −3 m"),
      "Variant reason",
    );
    check(
      // interview-01 fixes: the sheet's Movement now reads «9 m base, −3 m ingombro».
      /ora 6 m per ingombro|−3 m ingombro/.test(
        await page.locator(".character-vitals").innerText(),
      ),
      "Sheet speed hint names the encumbrance",
    );
    await shot("b36-02-variant-encumbrance.png", page.locator(".invp .invp-summary"));
    passed.push(
      "7. Ingombro «Variante (regola della casa)»: 38,82 kg > For × 2,5 kg → Ingombrato, Velocità 9 → 6 m with the reason and the house-rule source; the sheet's Movement says «ora 6 m per ingombro»",
    );

    step = "containers";
    const weight0 = await page.locator("[data-invp-weight]").innerText();
    await menu("invp-backpack", "move");
    await page.locator('#dialog [name="target"]').selectOption("self:invp-bag");
    await submit();
    await page
      .locator('[data-invp-container="invp-bag"] [data-invp-container="invp-backpack"]')
      .waitFor();
    check((await row("livia", "invp-backpack")).containerId === "invp-bag", "Backpack in the bag");
    const weight1 = await page.locator("[data-invp-weight]").innerText();
    check(weight0 === "38,82" && weight1 === "31,32", `Weight ${weight0} → ${weight1}`);
    check(
      (
        await page
          .locator('[data-invp-container="invp-bag"] > header [data-invp-excluded]')
          .innerText()
      ).includes("pesa sempre 2,5 kg"),
      "Excluded weight note",
    );
    // dnd5e drag: the lens crate onto the backpack head (inside the bag). Visual pass 2: the
    // inventory sits in the sheet's right column (D&D Beyond), its rows are taller, so both
    // ends are brought into the window first, as for the second drag below.
    await page.locator('[data-invp-drop="invp-backpack"]').evaluate((el) => {
      el.scrollIntoView({ block: "start" });
      globalThis.scrollBy(0, -150);
    });
    await page
      .locator('[data-invp-row="invp-crate"]')
      .dragTo(page.locator('[data-invp-drop="invp-backpack"]'));
    await page.locator('[data-invp-container="invp-backpack"] > header [data-invp-over]').waitFor();
    check(
      (await page.locator('[data-invp-capacity="invp-backpack"]').innerText()) === "25 / 15 kg",
      "Backpack 25/15 kg",
    );
    check((await page.locator("[data-invp-speed]").innerText()) === "9 m", "Load gone: 9 m");
    await shot(
      "b36-03-backpack-in-bag-capacity.png",
      page.locator('[data-invp-container="invp-bag"]'),
    );
    await page.locator('[data-invp="undo"]').click();
    await page.waitForFunction(
      (k) =>
        !JSON.parse(localStorage.getItem(k)).actors.livia.inventory.find(
          (r) => r.id === "invp-crate",
        ).containerId,
      key,
    );
    check((await page.locator("[data-invp-speed]").innerText()) === "6 m", "Undo restores 6 m");
    // The inventory toolbar grew in interview-01 (add, sort, columns): the undo toast can sit
    // over the crate row and the Backpack head under the sticky header. Wait for the toast
    // and bring both into view before dragging again.
    await page.locator("#toast.shown").waitFor({ state: "hidden", timeout: 8000 });
    // Visual pass 2: in the sheet's right column the rows are taller, so the Backpack head goes
    // 150 px (not 250) under the window's top: clear of the sticky section strip, and the crate
    // row still inside the window.
    await page.locator('[data-invp-drop="invp-backpack"]').evaluate((el) => {
      el.scrollIntoView({ block: "start" });
      globalThis.scrollBy(0, -150);
    });
    await page
      .locator('[data-invp-row="invp-crate"]')
      .dragTo(page.locator('[data-invp-drop="invp-backpack"]'));
    await page.locator('[data-invp-container="invp-backpack"] > header [data-invp-over]').waitFor();
    passed.push(
      "1. Menu «Sposta» puts the Backpack in the Bag of Holding: 38,82 → 31,32 kg, «Peso escluso: pesa sempre 2,5 kg»; the lens crate dragged onto the Backpack: 25/15 kg «Capacità superata», speed back to 9 m; Undo returns it (6 m), drag again",
    );

    step = "split-offer";
    await menu("invp-arrows", "split");
    await page.locator('#dialog [name="quantity"]').fill("8");
    await submit();
    let arrows = (await actor("livia")).inventory.filter((r) => r.ammunition === "arrow");
    check(arrows.map((r) => r.quantity).join("+") === "12+8", "Split 12+8");
    const part = arrows[1].id;
    await menu(part, "move");
    check(
      await page.locator('#dialog input[name="mode"][value="copy"]').isDisabled(),
      "Copy enabled for the player",
    );
    check(
      // R4 SV-37: the reason names cause and remedy («Solo il DM può copiare: …»).
      (await dialog().innerText()).includes("una copia crea un oggetto nuovo"),
      "Copy reason",
    );
    await page.locator('#dialog [name="target"]').selectOption("actor:doran");
    await submit();
    check((await toast("Offerta inviata a Doran")).includes("accetta o la rifiuta"), "Offer toast");
    check((await row("livia", part)).quantity === 8, "Nothing moved before acceptance");
    passed.push(
      "3. «Dividi la pila» 20 → 12 + 8; «Sposta, passa o copia…» to Doran: Copia disabled for the player with the reason (a copy creates an item: DM only), the move becomes an offer (Livia still holds 8)",
    );

    step = "coins";
    await page.locator('[data-invp="coins"]').click();
    await page.locator('#dialog [data-invp-coins="convert"]').click();
    await dialog().waitFor();
    await page.locator('#dialog [name="from"]').selectOption("cp");
    await page.locator('#dialog [name="amount"]').fill("120");
    await page.locator('#dialog [name="to"]').selectOption("sp");
    await page.locator("#dialog [data-invp-convert-preview]", { hasText: "120 → 12" }).waitFor();
    await shot("b36-05-coins-convert-dialog.png");
    await submit();
    let livia = await actor("livia");
    check(livia.currency.sp === 57 && livia.currency.cp === 0, "120 cp → 12 sp");
    await page.locator('[data-invp="coins"]').click();
    await page.locator('#dialog [data-invp-coins="container"]').click();
    await page.locator('#dialog [name="container"]').selectOption("invp-backpack");
    await page.locator('#dialog[open] button[type="submit"]').click();
    await page.locator('#dialog[open] [name="direction"]').first().waitFor();
    await page.locator('#dialog [name="gp"]').fill("10");
    await submit();
    await page
      .locator('[data-invp-container-coins="invp-backpack"]', { hasText: "10 mo" })
      .waitFor();
    await page.locator('[data-invp="coins"]').click();
    await page.locator('#dialog [data-invp-coins="give"]').click();
    await page.locator('#dialog [name="to"]').selectOption("doran");
    await page.locator('#dialog [name="gp"]').fill("5");
    await submit();
    livia = await actor("livia");
    check(livia.currency.gp === 20, "Purse 30 − 10 in the backpack, offer not yet paid");
    await page.locator(".invp-offers").waitFor();
    check((await page.locator(".invp-offer").count()) === 2, "Two pending offers");
    await shot("b36-04-offers-pending.png", page.locator(".invp-offers"));
    passed.push(
      "2. Gestisci monete › Converti 120 mr → 12 ma (live preview); 10 mo into the Backpack (shown on its row); 5 mo offered to Doran: two pending offers with «Ritira»",
    );

    step = "attune";
    await page.locator('[data-invp-filter="attunement"]').click();
    await page.locator('[data-invp="attune"][data-invp-id="invp-amulet"]').click();
    await dialog().waitFor();
    await page.locator('#dialog input[name="method"][value="record"]').check();
    await page.locator('#dialog [name="reason"]').fill("Riposo breve alla torre, sessione 12");
    await submit();
    await page.locator("[data-invp-attuned-count]", { hasText: "3" }).waitFor();
    check((await page.locator(".invp-slot.is-filled").count()) === 3, "Three filled slots");
    await shot("b36-06-attunement-slots.png", page.locator(".invp-attune"));
    await page.locator('[data-invp-filter="all"]').click();
    passed.push(
      "4a. Sintonia › «Sintonizza» Amuleto della salute recorded with its reason (no short rest completed yet): three DDB slots filled, 3/3",
    );

    step = "sets";
    await page.locator('[data-invp="equip"][data-invp-id="invp-shortbow"]').click();
    const refusal = await toast("richiede due mani");
    check(refusal.includes("hai già in mano Bastone"), "BG3 refusal with reason: " + refusal);
    check(!(await row("livia", "invp-shortbow")).equipped, "Bow equipped despite the refusal");
    await page.locator('[data-invp="swap"]').click();
    await page.locator('[data-invp-set="ranged"][aria-current="true"]').waitFor();
    check((await row("livia", "invp-shortbow")).equipped, "Bow in hand after the swap");
    check(!(await row("livia", "staff")).equipped, "Quarterstaff put away");
    await shot("b36-07-weapon-set-swapped.png", page.locator(".invp .invp-summary"));
    passed.push(
      "9. «Equipaggia» Arco corto refused (BG3) with the 2024 reason «richiede due mani quando attacchi: hai già in mano Bastone»; «Cambia set» swaps Bastone → Arco corto (in mano)",
    );

    step = "staff";
    await page.locator('[data-invp="use"][data-invp-id="invp-staff-fire"]').click();
    await dialog().waitFor();
    check((await page.locator('#dialog input[name="activity"]').count()) === 3, "Three activities");
    await page.locator('#dialog input[name="activity"][value="fireball"]').check();
    await page.locator("#dialog [data-invp-activity-facts]", { hasText: "10 → 7" }).waitFor();
    check(
      (await page.locator("#dialog [data-invp-activity-facts]").innerText()).includes("CD 13"),
      "Save DC 13",
    );
    await shot("b36-08-staff-usage-dialog.png");
    await submit();
    await settleDice();
    await page.locator('[data-invp-charges="invp-staff-fire"]', { hasText: "7/10" }).waitFor();
    const fireball = await toast("Palla di fuoco");
    check(fireball.includes("TS CD 13"), "Fireball toast: " + fireball);
    await page
      .locator('[data-invp="use"][data-invp-id="invp-staff-fire"]')
      .click({ modifiers: ["Shift"] });
    await dialog().waitFor();
    check(
      await page.locator('#dialog input[name="activity"][value="burning-hands"]').isChecked(),
      "Shift+click primary",
    );
    await page.keyboard.press("Escape");
    const log = (await stored()).log.at(-1);
    check(log.rolls?.[0]?.dice?.[0]?.count === 8, "Fireball 8d6 in the log");
    passed.push(
      `10. Bastone del fuoco «Usa»: dnd5e usage dialog with 3 activities, Palla di fuoco 10 → 7 charges, 8d6 digital = ${log.rolls[0].total}, TS Destrezza CD 13, roll in the log; Shift+click preselects the primary (Mani brucianti); Escape spends nothing`,
    );

    step = "reload";
    await page.reload();
    await invp().waitFor();
    check(
      (await page.locator('[data-invp-charges="invp-staff-fire"]').innerText()).includes("7/10"),
      "Charges after reload",
    );
    check(
      (await page.locator('[data-invp-set="ranged"]').getAttribute("aria-current")) === "true",
      "Set after reload",
    );
    check((await page.locator(".invp-offer").count()) === 2, "Offers after reload");
    check((await row("livia", "invp-crate")).containerId === "invp-backpack", "Crate after reload");
    passed.push("Reload keeps charges 7/10, ranged set, 2 offers, the crate in the Backpack");

    // ------------------------------------------------------------ group 2: DM
    step = "dm-offers";
    await role("dm");
    await sheet("doran");
    check((await page.locator(".invp-offer").count()) === 2, "DM sees two offers on Doran");
    await shot("b36-09-dm-offers-on-doran.png", page.locator(".invp-offers"));
    await page.locator('[data-invp="offer-accept"]').first().click();
    await toast("Offerta accettata");
    await page.locator('[data-invp="offer-accept"]').first().click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext["inventory-plus"].offers.every(
          (o) => o.status === "accepted",
        ),
      key,
    );
    const doran = await actor("doran");
    check(
      doran.inventory.find((r) => r.ammunition === "arrow")?.quantity === 8,
      "Doran has 8 arrows",
    );
    check(doran.currency.gp === 5, "Doran has 5 gp");
    check((await actor("livia")).currency.gp === 15, "Livia paid 5 gp");
    // interview-01 PG-74 (BG3): «Cambia set» puts away what blocks the new set (the Shield)
    // instead of refusing, and takes it back on the way home.
    await page.locator('[data-invp="swap"]').click();
    await page.waitForFunction((k) => {
      const inv = JSON.parse(localStorage.getItem(k)).actors.doran.inventory;
      const eq = (id) => inv.find((r) => r.id === id)?.equipped;
      return eq("invp-doran-longbow") && !eq("invp-doran-shield");
    }, key);
    await page.locator('[data-invp="swap"]').click();
    await page.waitForFunction((k) => {
      const inv = JSON.parse(localStorage.getItem(k)).actors.doran.inventory;
      const eq = (id) => inv.find((r) => r.id === id)?.equipped;
      return eq("invp-doran-longsword") && eq("invp-doran-shield") && !eq("invp-doran-longbow");
    }, key);
    passed.push(
      "2/3. DM on Doran's sheet: both offers accepted (8 arrows, 5 mo; Livia 20 → 15 mo); «Cambia set» puts the Shield away for the Longbow and takes it back with the Longsword",
    );

    step = "dm-copy-identify";
    await sheet("livia");
    await menu("invp-arrows", "move");
    await page.locator('#dialog input[name="mode"][value="copy"]').check();
    await page.locator('#dialog [name="target"]').selectOption("actor:doran");
    await page.locator('#dialog [name="quantity"]').fill("2");
    await submit();
    check(
      (await actor("doran")).inventory.find((r) => r.ammunition === "arrow").quantity === 10,
      "DM copy 2 → Doran 10",
    );
    check((await row("livia", "invp-arrows")).quantity === 12, "Copy leaves Livia's 12");
    check(
      (await page.locator('[data-invp-row="invp-ring"]').innerText()).includes(
        "in realtà: Anello di protezione",
      ),
      "DM sees the secret",
    );
    await shot("b36-10-dm-ring-secret.png", page.locator('[data-invp-row="invp-ring"]'));
    await menu("invp-ring", "identify", page, false);
    await page.locator('[data-invp-row="invp-ring"]', { hasText: "Richiede sintonia" }).waitFor();
    check((await row("livia", "invp-ring")).name.it === "Anello di protezione", "Ring identified");
    passed.push(
      "8. DM copies 2 arrows to Doran (Livia keeps 12); on Livia's sheet the DM reads «(in realtà: Anello di protezione)» and «Identifica (DM)» reveals it with its attunement requirement",
    );

    step = "dm-time";
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await quietTips();
    await page.locator('[data-table="time"]').click();
    await dialog().waitFor();
    await page.locator("#dialog [data-rest-time-value]").fill("22");
    await page.locator("#dialog [data-rest-time-unit]").selectOption("3600");
    await page.locator("#dialog [data-rest-preview-time]").click();
    await page.locator("#dialog [data-rest-apply]:not([disabled])").click();
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).restTime?.clocks?.lanterns?.seconds === 22 * 3600,
      key,
    );
    await page.keyboard.press("Escape");
    passed.push("5a. DM «Tempo» +22 h: the campaign clock passes 06:00 (dawn)");

    // ------------------------------------------------------------ group 3: player
    step = "recharge";
    await role("player");
    await sheet("livia");
    await page.locator('[data-invp="recharge"][data-invp-id="invp-wand"]').click();
    await dialog().waitFor();
    await page.locator('#dialog input[name="mode"][value="physical"]').check();
    await page.locator('#dialog [name="face0"]').fill("5");
    await shot("b36-11-dawn-recharge-physical.png");
    await submit();
    await page.locator('[data-invp-charges="invp-wand"]', { hasText: "7/7" }).waitFor();
    check((await toast("cariche 3 → 7")).includes("= 6"), "1d6+1 = 6");
    check((await stored()).log.at(-1).rolls?.[0]?.mode === "physical", "Physical roll logged");
    passed.push(
      "5. Bacchetta di dardi incantati: «Ricarica all’alba (1d6 + 1)» after the clock's dawn, physical face 5 → 6, charges 3 → 7/7 (capped), roll in the log",
    );

    step = "attune-fourth";
    await page.locator('[data-invp-filter="attunement"]').click();
    await page.locator('[data-invp="attune"][data-invp-id="invp-ring"]').click();
    await dialog().waitFor();
    check(
      (await page.locator("#dialog [data-invp-attune-warning]").innerText()).includes(
        "Il tentativo fallisce",
      ),
      "Fourth-slot warning",
    );
    await page.locator('#dialog input[name="method"][value="record"]').check();
    await page.locator('#dialog [name="reason"]').fill("Provo comunque");
    await page.locator('#dialog button[type="submit"]').click();
    await page.locator("#dialog .dialog-error:not([hidden])").waitFor();
    check(
      (await page.locator("#dialog .dialog-error").innerText()).includes(
        "sei già in sintonia con 3 oggetti",
      ),
      "Refusal with reason",
    );
    await shot("b36-12-fourth-attunement-refused.png");
    await page.keyboard.press("Escape");
    await page.locator('[data-invp="unattune"][data-invp-id="invp-cloak"]').click();
    await dialog().waitFor();
    await page.locator('#dialog input[name="method"][value="record"]').check();
    await page.locator('#dialog [name="reason"]').fill("Riposo breve per lasciare il mantello");
    await submit();
    await page.locator('[data-invp="attune"][data-invp-id="invp-ring"]').click();
    await dialog().waitFor();
    await page.locator('#dialog input[name="method"][value="record"]').check();
    await page.locator('#dialog [name="reason"]').fill("Riposo breve dedicato all’anello");
    await submit();
    check((await row("livia", "invp-ring")).attuned === true, "Ring attuned");
    check((await page.locator(".invp-slot.is-filled").count()) === 3, "Still three");
    await page.locator('[data-invp-filter="all"]').click();
    passed.push(
      "4b. Anello di protezione: the fourth attunement is refused in the dialog «Il tentativo fallisce: sei già in sintonia con 3 oggetti…»; ending the cloak (recorded with reason) frees a slot and the ring is attuned",
    );

    // ------------------------------------------------------------ group 4: combat, ammunition
    step = "combat-start";
    await role("dm");
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.getByRole("button", { name: "Avvia combattimento", exact: true }).click();
    await page.getByRole("button", { name: "Apri preparazione", exact: true }).click();
    // Round-2 regression (29/09/2026): the old include boxes are gone (R5 PR-32); who fights
    // is chosen in the start dialog below («doran» and «mira» are left out there).
    // Saved only when the draft changed (the include and d20 fields left Preparation).
    if (
      await page
        .getByRole("button", { name: "Salva preparazione", exact: true })
        .isEnabled({ timeout: 1000 })
        .catch(() => false)
    )
      await page.getByRole("button", { name: "Salva preparazione", exact: true }).click();
    // Saved only when the draft changed (the include and d20 fields left Preparation).
    if (
      await page
        .getByRole("button", { name: "Aggiorna scena attiva", exact: true })
        .isEnabled({ timeout: 1000 })
        .catch(() => false)
    )
      await page.getByRole("button", { name: "Aggiorna scena attiva", exact: true }).click();
    // Refreshed by the hand-off writer (29/09/2026): R5 PR-32 replaced Preparation's «Incontro
    // preparato» with the Table's start dialog (Foundry roll call): who fights and each typed
    // d20; the Initiative bonus comes from the sheet.
    await page.getByRole("button", { name: "Avvia incontro salvato…", exact: true }).click();
    await page.locator("[data-ct-start-dialog]").waitFor();
    {
      const naturals = { livia: 18, "goblin-1": 12, "goblin-2": 10 };
      const startIds = await page
        .locator("[data-ct-start-include]")
        .evaluateAll((els) => els.map((el) => el.dataset.ctStartInclude));
      for (const id of startIds) {
        const box = page.locator('[data-ct-start-include="' + id + '"]');
        if ((await box.isChecked()) !== Object.hasOwn(naturals, id)) await box.click();
      }
      for (const [id, natural] of Object.entries(naturals)) {
        const d20 = page.locator('[data-ct-start-natural="' + id + '"]');
        await d20.fill(String(natural));
        await d20.dispatchEvent("change");
      }
    }
    await page.getByRole("button", { name: "Inizia combattimento", exact: true }).click();
    await page.locator("#battle-map").waitFor();
    const dismissAlert = async () => {
      const ok = page.locator("#ct-alert [data-ct-alert-ok]");
      if (await ok.count()) await ok.click();
    };
    const shoot = async () => {
      const state = await stored();
      const target = ["goblin-2", "goblin-1"].find((id) => state.actors[id].hp > 0);
      await page.locator('[data-combat-action="invp-ranged-invp-shortbow"]').click();
      await page.locator(`.map-token[data-actor="${target}"]`).click();
      await settleDice();
      await page.keyboard.press("Escape");
    };
    step = "combat-attacks";
    await role("player");
    await dismissAlert();
    await page.locator('[data-ext-slot="table-panel:inventory-plus-gear"]').waitFor();
    check(
      (await page.locator("[data-invp-table-active]").innerText()) === "Arco corto",
      "Inspector shows the bow",
    );
    await page.locator(".invp-inspector").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await shot("b36-13-table-inspector-bow.png");
    await shoot();
    check((await row("livia", "invp-arrows")).quantity === 11, "First arrow spent");
    await page.locator('[data-table="end-turn"]').click();
    await role("dm");
    for (let i = 0; i < 4; i++) {
      const s = await stored();
      if (s.combat.order[s.combat.turn] === "livia") break;
      await page.locator('[data-table="end-turn"]').click();
      await page.waitForTimeout(150);
    }
    await role("player");
    await dismissAlert();
    await shoot();
    check((await row("livia", "invp-arrows")).quantity === 10, "Second arrow spent");
    await role("dm");
    await page.getByRole("button", { name: "Concludi incontro", exact: true }).first().click();
    await dialog().waitFor();
    await submit();
    check(!(await stored()).combat.active, "Combat ended");
    passed.push(
      "6a. At the Table the player's Creature tab shows «Distanza: Arco corto» with the quiver; the action «Arco corto» (Dex +2, Wizard Simple weapons +2 = +4, 1d6 + 2) is used twice with digital dice: arrows 12 → 11 → 10; the DM ends the encounter",
    );

    step = "recovery";
    await role("player");
    await sheet("livia");
    const recovery = page.locator("[data-invp-recovery]");
    await recovery.waitFor();
    check(
      (await recovery.innerText()).includes("usate 2 → recuperi 1, perse 1"),
      "Recovery text: " + (await recovery.innerText()),
    );
    await shot("b36-14-ammo-recovery.png", recovery);
    await recovery.locator('[data-invp="recover"]').click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).actors.livia.inventory.find(
          (r) => r.id === "invp-arrows",
        ).quantity === 11,
      key,
    );
    check(!(await page.locator("[data-invp-recovery]").count()), "Recovery offered once");
    passed.push(
      "6b. After the fight: «Frecce: usate 2 → recuperi 1, perse 1» (SRD EN 89 / IT 102, 1 minute, round down), «Recupera» → 11 arrows, offered once",
    );

    // ------------------------------------------------------------ group 5: EN phone 390, touch
    step = "phone";
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    const phoneContext = await browser.newContext({
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
    await submit(phone, true);
    await role("player", phone);
    await phone.goto(base + "#characters?id=livia&tab=inventory");
    await invp(phone).waitFor();
    await quietTips(phone);
    check((await invp(phone).textContent()).includes("Carried weight"), "EN label");
    check(await noOverflow(phone), "Phone inventory overflows horizontally");
    const small = await smallTargets(phone, ".invp");
    check(!small.length, "Phone targets under 40px: " + JSON.stringify(small));
    await phone.locator('[data-invp-filter="ammunition"]').tap();
    await phone.locator('[data-invp-row="invp-arrows"]').waitFor();
    await phone.locator('[data-invp="menu"][data-invp-id="invp-arrows"]').tap();
    await phone.locator('#dialog [data-invp-menu="split"]').tap();
    await phone.locator('#dialog [name="quantity"]').fill("3");
    check(
      await phone.evaluate(
        () =>
          document.querySelector("#dialog").scrollWidth <=
          document.querySelector("#dialog").clientWidth + 1,
      ),
      "Split dialog overflows",
    );
    await submit(phone, true);
    const phoneArrows = (await actor("livia", phone)).inventory.filter(
      (r) => r.ammunition === "arrow",
    );
    check(
      phoneArrows.some((r) => r.quantity === 3),
      "Touch split 3",
    );
    await invp(phone).evaluate((el) => el.scrollIntoView({ block: "start" }));
    await phone.screenshot({ path: dir + "b36-15-phone-en-390.png" });
    await phone.locator('[data-service="preferences"]').tap();
    await phone.locator('#dialog [name="offline"]').check();
    await submit(phone, true);
    await phone.locator('[data-invp-filter="all"]').tap();
    await phone.locator('[data-invp="swap"]').tap();
    await phone.locator("#toast.shown", { hasText: "You are offline" }).waitFor();
    check(
      (await actor("livia", phone)).weaponSets.active === "ranged",
      "Offline swap changed the state",
    );
    await phoneContext.close();
    passed.push(
      "EN phone 390 touch: «Carried weight», no horizontal overflow, targets ≥ 40 px, Ammunition filter, split 3 by touch, offline shared change refused with «You are offline»",
    );
  } catch (error) {
    await page.screenshot({ path: dir + "b36-failure.png" }).catch(() => {});
    throw Error(step + ": " + error.message.split("\n")[0] + " | passed so far: " + passed.length);
  }
  check(!errors.length, "Page errors: " + errors.join(" | "));
  await context.close();
  return { passed, errors };
};
