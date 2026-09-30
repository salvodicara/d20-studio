async (rootPage) => {
  // B52 — chosen offline content and reconnection, in the one app with real clicks, keys and
  // touch. Group 1 IT 1440: "Disponibile offline" on Livia's sheet (keyboard) and on a note,
  // the settings page lists both, reload keeps them. Group 2: simulated offline, sheet and
  // note changes queued with status, Mira's sheet blocked with the reason, one queued change
  // undone from the list, the DM's simulated change. Group 3: automatic reconnection,
  // conflict compared side by side (no overwrite), choice, reload, correction by reopening;
  // DM view. Group 4: restart with a queued change syncs by itself. Group 5: EN phone 390
  // with touch. Group 6 (review): a real DM change through "Visita come" while the player's
  // change waits becomes a conflict (never a silent "synced"); an offline ability check stays
  // refused; no per-row undo once online; EN and 390 px conflict. Synthetic demo data only;
  // resets this browser's demo state. Images since the review: the B52-rf folder.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B52-rf/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const mine = async (p = page, role = "player") =>
    (await stored(p)).ext.offline.identities[role] ?? { items: [], queue: [] };
  const potions = async (p = page) =>
    (await stored(p)).actors.livia.inventory.find((i) => i.id === "potion").quantity;
  const indicator = (p = page) => p.locator('.service-nav [data-service="offline"]');
  const indicatorIs = async (text, p = page) => {
    try {
      await p.waitForFunction(
        (t) =>
          document
            .querySelector('.service-nav [data-service="offline"]')
            ?.getAttribute("title")
            ?.startsWith(t),
        text,
        { timeout: 6000 },
      );
    } catch {
      const now = await p
        .locator('.service-nav [data-service="offline"]')
        .getAttribute("title")
        .catch(() => "none");
      throw Error(`Indicator: expected «${text}», found «${now}»`);
    }
  };
  const content = (p = page) => p.locator("#content").innerText();
  const shot = async (name, locator = null, p = page) => {
    if (locator) await locator.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await p.screenshot({ path: dir + name });
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  // A Home tip can float over the page corner: close it when present (it is not ours).
  const closeTip = async (p = page) => {
    const tip = p.getByRole("button", { name: /^(Ho capito|Got it)$/ });
    if (await tip.count())
      await tip
        .first()
        .click({ timeout: 2000 })
        .catch(() => {});
  };
  const setOffline = async (value, p = page, tap = false) => {
    const open = p.locator('.service-nav [data-service="preferences"]');
    await (tap ? open.tap() : open.click());
    const box = p.locator('#dialog [name="offline"]');
    await (value ? box.check() : box.uncheck());
    const save = p.locator('#dialog button[type="submit"]');
    await (tap ? save.tap() : save.click());
    await p.waitForFunction(() => !document.querySelector("#dialog").open);
  };
  const field = (path) => page.locator('[data-campaign-path="' + path + '"]');

  // ------------------------------------------------ group 1: choose what is offline (IT 1440)
  await page.goto(base + "#home");
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await indicatorIs("In linea — tutto sincronizzato");
  // Personaggi → Apri scheda (Livia): the switch sits on the sheet's first tab.
  await page.locator('[data-nav="characters"]').first().click();
  await page.locator('[data-character-action="open"][data-actor="livia"]').click();
  const sheetSwitch = page.locator('[data-offline-toggle="sheet:livia"]');
  await sheetSwitch.waitFor();
  await closeTip();
  await sheetSwitch.focus();
  await page.keyboard.press("Space");
  await page
    .locator('[data-offline-switch="sheet:livia"]', { hasText: "Salvata su questo dispositivo" })
    .waitFor();
  check(
    (await mine()).items.some((i) => i.kind === "sheet" && i.id === "livia"),
    "Livia not saved",
  );
  check(await page.locator('[data-offline-toggle="sheet:livia"]').isChecked(), "Switch not on");
  await shot("b52-01-sheet-switch-it-1440.png", page.locator(".offline-sheet"));
  passed.push(
    "1a. Personaggi → Apri scheda → «Disponibile offline» switched on with the keyboard (Space); saved size and time shown",
  );

  // A personal note ("Solo io"), then its own switch on the note page.
  await page.locator('.service-nav [data-service="notes"]').click();
  await page.locator('[data-campaign-new="note"]').click();
  await field("data.title").fill("Indizi sul cartografo");
  await field("data.body").fill("Il cartografo nasconde una mappa della torre.");
  await page.locator("[data-campaign-save]").click();
  await page.locator("[data-campaign-apply]").click();
  await page.getByRole("heading", { name: "Indizi sul cartografo", level: 1 }).waitFor();
  const noteSwitch = page.locator('[data-offline-toggle^="note:"]');
  await noteSwitch.check();
  await page.locator(".offline-entry", { hasText: "Salvato su questo dispositivo" }).waitFor();
  const noteId = (await noteSwitch.getAttribute("data-offline-toggle")).slice(5);
  await shot("b52-02-note-switch-it-1440.png", page.locator(".offline-entry"));
  passed.push("1b. Appunti → new «Solo io» note → «Disponibile offline» on the note page");

  // The settings page (header cloud, one click) lists both, with size and time.
  await indicator().click();
  await page.locator("[data-offline-page]").waitFor();
  const listed = await page.locator(".offline-available").innerText();
  check(
    listed.includes("Livia") &&
      listed.includes("Indizi sul cartografo") &&
      listed.includes("2 elementi"),
    "Available list incomplete: " + listed,
  );
  // Online: download time (the copy follows every change); offline: last connection.
  check(listed.includes("Sul dispositivo dalle"), "Saved time missing");
  await shot("b52-03-available-list-it-1440.png");
  await page.reload();
  await page.locator(`[data-offline-item="note:${noteId}"]`).waitFor();
  await page.locator('[data-offline-item="sheet:livia"]').waitFor();
  passed.push(
    "1c. Header cloud → Offline e sincronizzazione lists Livia and the note (2 elementi, kB, time); kept after reload",
  );

  // ------------------------------------------------ group 2: offline, queue and blocked
  await setOffline(true);
  await indicatorIs("Senza rete — nessuna modifica in coda");
  // Livia · inventory: Dettagli → Modifica dati → quantity 2.
  await page.goto(base + "#characters?id=livia&tab=inventory");
  await page.locator('[data-character-action="detail-item"][data-item="potion"]').click();
  await page.locator('#dialog button[type="submit"]').click();
  await page.locator('#dialog [name="quantity"]').fill("2");
  await page.locator('#dialog button[type="submit"]').click();
  await page.waitForFunction(() => !document.querySelector("#dialog").open);
  check((await potions()) === 2, "Offline inventory change not applied on the device");
  // Livia · story.
  await page.locator('[data-character-tab="story"]').click();
  await page.locator('[data-character-action="edit-story"]').click();
  await page
    .locator('#dialog [name="backstory"]')
    .fill("Cresciuta tra le lanterne di Bruma; scritto senza rete.");
  await page.locator('#dialog button[type="submit"]').click();
  await page.waitForFunction(() => !document.querySelector("#dialog").open);
  // Livia · rope (to be undone from the list below).
  await page.locator('[data-character-tab="inventory"]').click();
  await page.locator('[data-character-action="detail-item"][data-item="rope"]').click();
  await page.locator('#dialog button[type="submit"]').click();
  await page.locator('#dialog [name="quantity"]').fill("4");
  await page.locator('#dialog button[type="submit"]').click();
  await page.waitForFunction(() => !document.querySelector("#dialog").open);
  // The note, edited and applied offline.
  await page.goto(base + `#notes?tab=entry&id=${noteId}`);
  await page.locator("[data-campaign-edit]").click();
  await field("data.body").fill(
    "Il cartografo nasconde una mappa della torre. Senza rete: la chiave è nel pozzo.",
  );
  await page.locator("[data-campaign-save]").click();
  await page.locator("[data-campaign-apply]").click();
  await page.getByRole("heading", { name: "Indizi sul cartografo", level: 1 }).waitFor();
  // Mira is the player's too, but not available offline: blocked with the reason.
  await page.goto(base + "#characters?id=mira&tab=story");
  await page.locator('[data-character-action="edit-story"]').click();
  await page.locator('#dialog [name="backstory"]').fill("Tentativo senza rete");
  await page.locator('#dialog button[type="submit"]').click();
  await page
    .locator("#dialog .dialog-error", { hasText: "«Mira» non è disponibile offline" })
    .waitFor();
  const miraError = await page.locator("#dialog .dialog-error").innerText();
  check(miraError.startsWith("Sei senza rete"), "Blocked reason lost the core sentence");
  await page.keyboard.press("Escape");
  check(!(await stored()).actors.mira.backstory?.includes("Tentativo"), "Blocked change saved");
  await indicatorIs("Senza rete — 4 modifiche in coda");
  let me = await mine();
  check(
    me.queue
      .filter((e) => e.status === "pending")
      .map((e) => e.field)
      .sort()
      .join() === "backstory,inventory:potion,inventory:rope,text",
    "Queue wrong: " + JSON.stringify(me.queue.map((e) => e.field)),
  );
  check((await stored()).log.at(-1).visibility === "private", "Queued change in the shared log");
  // Page: queue with status, blocked attempt with reason; rope undone from the list (keys).
  await indicator().click();
  await page.locator(".offline-queue").waitFor();
  const queueText = await page.locator(".offline-queue").innerText();
  check(
    queueText.includes("Modifiche in coda (4)") &&
      queueText.includes("In coda · su questo dispositivo"),
    "Queue status missing",
  );
  check(queueText.includes("×3 → ×2"), "Potion change not described");
  check(
    (await page.locator(".offline-available").innerText()).includes("Copia delle"),
    "Offline copy time missing",
  );
  const blockedText = await page.locator(".offline-blocked").innerText();
  check(blockedText.includes("«Mira» non è disponibile offline"), "Blocked list without reason");
  const ropeUndo = page.getByRole("button", { name: "Annulla questa modifica: Livia · Corda" });
  await ropeUndo.focus();
  await page.keyboard.press("Enter");
  await indicatorIs("Senza rete — 3 modifiche in coda");
  check(
    (await stored()).actors.livia.inventory.find((i) => i.id === "rope").quantity === 1,
    "Rope not back",
  );
  // The DM changes the same potions at the Table meanwhile (demonstration control).
  const sim = page.locator("form[data-offline-simulate]", { hasText: "Pozione di guarigione" });
  await sim.locator("[name=value]").fill("5");
  await sim.getByRole("button", { name: "Registra la modifica del DM" }).click();
  await page
    .locator(".offline-remote", { hasText: "il DM ha cambiato questo valore in ×5" })
    .waitFor();
  await shot("b52-04-offline-queue-it-1440.png");
  await page.goto(base + "#characters?id=livia&tab=actions");
  await page.locator(".offline-sheet", { hasText: "Senza rete · 2 modifiche in coda" }).waitFor();
  await closeTip();
  await shot("b52-05-sheet-offline-it-1440.png", page.locator(".offline-sheet"));
  passed.push(
    "2. Offline: Livia potion ×3→×2, story and a note queued with status (header «Senza rete — 4 modifiche in coda», private log); Mira blocked with «Sei senza rete… «Mira» non è disponibile offline»; rope undone from the list with Enter; the DM's simulated ×5",
  );

  // ------------------------------------------------ group 3: reconnection and conflict
  await indicator().click();
  await setOffline(false);
  await indicatorIs("Riconnessione in corso");
  await page.locator('.offline-status[data-offline-phase="reconnecting"]').waitFor();
  await shot("b52-06-reconnecting-it-1440.png");
  await indicatorIs("Da rivedere — 1 conflitto");
  const toast = await page.locator("#toast").innerText();
  check(
    toast.includes("2 modifiche sincronizzate e 1 conflitto da rivedere"),
    "Sync toast: " + toast,
  );
  check((await potions()) === 5, "Shared sheet does not show the DM's version");
  let state = await stored();
  check(state.actors.livia.backstory.includes("scritto senza rete"), "Story not synced");
  // Review: the shared entry counts Livia's two sheet changes only, never the private note.
  check(
    state.log.some(
      (e) =>
        e.label.startsWith(
          "Sincronizzazione dopo la riconnessione: 2 modifiche fatte senza rete (Livia)",
        ) && e.visibility === "shared",
    ),
    "Shared sync entry missing",
  );
  const card = page.locator(".offline-conflict");
  const cardText = await card.innerText();
  check(
    /valore di partenza\s+×3/.test(cardText) &&
      /su questo dispositivo[^\n]*\n\s*×2/.test(cardText) &&
      /Il DM · al tavolo[^\n]*\n\s*×5/.test(cardText),
    "Comparison wrong: " + cardText,
  );
  await shot("b52-07-conflict-it-1440.png", page.locator(".offline-conflicts"));
  // The bell carries it for the player only.
  await page.locator('.service-nav [data-service="requests"]').click();
  await page
    .locator("#dialog", { hasText: "Conflitto da rivedere: Livia · Pozione di guarigione" })
    .waitFor();
  await page.keyboard.press("Escape");
  // DM view: nothing of the player's queue, conflict or note; the shared sync is in the log.
  await page.locator("#demo-role").selectOption("dm");
  await page.waitForFunction(() => document.querySelector("#demo-role").value === "dm");
  await indicatorIs("In linea — tutto sincronizzato");
  await page.goto(base + "#offline");
  // The player's toast fades before the DM's screenshot.
  await page.waitForFunction(
    () => !document.querySelector("#toast").className.includes("shown"),
    null,
    { timeout: 7000 },
  );
  const dmText = await content();
  check(
    !dmText.includes("Indizi sul cartografo") &&
      !dmText.includes("Pozione di guarigione") &&
      dmText.includes("Niente è ancora disponibile offline"),
    "DM sees the player's offline data",
  );
  await shot("b52-09-dm-view-it-1440.png");
  await page.locator('.service-nav [data-service="requests"]').click();
  check(
    !(await page.locator("#dialog").innerText()).includes("Conflitto da rivedere"),
    "DM bell shows the player's conflict",
  );
  await page.keyboard.press("Escape");
  await page.locator("#demo-role").selectOption("player");
  await page.waitForFunction(() => document.querySelector("#demo-role").value === "player");
  // Choose: keep mine. Reload keeps it; the history names the choice.
  await page.goto(base + "#offline");
  await page.getByRole("button", { name: "Tieni la tua", exact: true }).click();
  await indicatorIs("In linea — tutto sincronizzato");
  check((await potions()) === 2, "Keep yours not applied");
  await page.reload();
  await page.locator(".offline-history summary").click();
  await page
    .locator('.offline-history li[data-status="resolved"]', { hasText: "Risolta: tenuta la tua" })
    .waitFor();
  await shot("b52-08-resolved-history-it-1440.png", page.locator(".offline-queue"));
  // Correction: reopen the comparison, then keep the DM's.
  await page.getByRole("button", { name: "Riapri il confronto" }).click();
  await indicatorIs("Da rivedere — 1 conflitto");
  check((await potions()) === 5, "Reopen did not restore the DM's value");
  await page.getByRole("button", { name: "Tieni quella del DM" }).click();
  await indicatorIs("In linea — tutto sincronizzato");
  check((await potions()) === 5, "Keep the DM's changed the value");
  state = await stored();
  check(
    state.log.some((e) =>
      e.label.startsWith("Scelta riaperta per correzione: Livia · Pozione di guarigione"),
    ),
    "Reopen not logged",
  );
  passed.push(
    "3. Reconnect: «Riconnessione in corso», then «Da rivedere — 1 conflitto»; ×3 / ×2 / ×5 side by side with the shared sheet on the DM's ×5 (no overwrite); bell for the player only; DM view without the player's data; «Tieni la tua» (×2) kept after reload; reopened for correction and «Tieni quella del DM» (×5), all logged",
  );

  // ------------------------------------------------ group 4: restart with a queued change
  await setOffline(true);
  await page.goto(base + "#characters?id=livia&tab=inventory");
  await page.locator('[data-character-action="detail-item"][data-item="potion"]').click();
  await page.locator('#dialog button[type="submit"]').click();
  await page.locator('#dialog [name="quantity"]').fill("4");
  await page.locator('#dialog button[type="submit"]').click();
  await indicatorIs("Senza rete — 1 modifica in coda");
  await page.reload();
  await indicatorIs("Riconnessione in corso");
  await indicatorIs("In linea — tutto sincronizzato");
  check((await potions()) === 4, "Restart lost the queued change");
  me = await mine();
  check(!me.queue.some((e) => e.status === "pending"), "Queue not synced at restart");
  passed.push(
    "4. Reload with a queued change: the app reopens online, shows «Riconnessione in corso» and syncs by itself",
  );
  check(await noOverflow(), "Desktop page overflows");
  // Device setting (Preferences › Offline): the sheets you open become available offline.
  await page.locator('.service-nav [data-service="preferences"]').click();
  await page.locator('#dialog [name="setting:offline.auto"]').check();
  await page.locator('#dialog button[type="submit"]').click();
  await page.waitForFunction(() => !document.querySelector("#dialog").open);
  await page.locator('[data-nav="characters"]').first().click();
  await page.locator('[data-character-action="open"][data-actor="mira"]').click();
  await page
    .locator('[data-offline-switch="sheet:mira"]', { hasText: "Salvata su questo dispositivo" })
    .waitFor();
  check(
    (await mine()).items.some((i) => i.kind === "sheet" && i.id === "mira"),
    "Auto download missing",
  );
  passed.push(
    "4b. Preferenze › Offline «Rendi disponibili offline le tue schede quando le apri»: opening Mira saves it on the device",
  );

  // ------------------------------------------------ group 5: EN phone 390 with touch
  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const phone = await phoneContext.newPage();
  phone.on("pageerror", (error) => errors.push("phone: " + error.message));
  await phone.goto(base + "#home");
  await phone.evaluate((k) => localStorage.removeItem(k), key);
  await phone.reload();
  await phone.locator('.service-nav [data-service="preferences"]').tap();
  await phone.locator('#dialog [name="lang"]').selectOption("en");
  await phone.locator('#dialog button[type="submit"]').tap();
  await indicatorIs("Online — all synced", phone);
  await indicator(phone).tap();
  await phone.getByRole("heading", { name: "Offline and sync", level: 1 }).waitFor();
  await phone.locator('[data-offline-add="sheet:livia"]').tap();
  await phone.locator('[data-offline-item="sheet:livia"]').waitFor();
  check(await noOverflow(phone), "Phone page overflows");
  const small = await phone.evaluate(
    () =>
      [
        ...document.querySelectorAll(
          "[data-offline-page] button, [data-offline-page] input, .service-nav [data-service]",
        ),
      ]
        .filter((el) => el.offsetParent)
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height < 40 || r.width < 40).length,
  );
  check(small === 0, `${small} phone targets under 40 px`);
  await setOffline(true, phone, true);
  await phone.goto(base + "#characters?id=livia&tab=inventory");
  await phone.locator('[data-character-action="detail-item"][data-item="potion"]').tap();
  await phone.locator('#dialog button[type="submit"]').tap();
  await phone.locator('#dialog [name="quantity"]').fill("1");
  await phone.locator('#dialog button[type="submit"]').tap();
  await indicatorIs("Offline — 1 change queued", phone);
  await indicator(phone).tap();
  await phone.locator(".offline-queue", { hasText: "Queued · on this device" }).waitFor();
  check(await noOverflow(phone), "Phone offline page overflows");
  await phone.screenshot({ path: dir + "b52-10-phone-en-390.png", fullPage: true });
  // At the Table the indicator stays in the one header row.
  await phone.goto(base + "#table");
  await phone.locator("#battle-map").waitFor();
  const headerRows = await phone.evaluate(() => {
    const header = document.querySelector(".app-header");
    const cloud = header.querySelector('[data-service="offline"]').getBoundingClientRect();
    const menu = header.querySelector('[data-service="app-menu"]').getBoundingClientRect();
    const last = [...header.querySelectorAll(".service-nav [data-service]")]
      .filter((el) => el.offsetParent)
      .at(-1)
      .getBoundingClientRect();
    return {
      same: Math.abs(cloud.top - menu.top) < 4,
      right: last.right <= window.innerWidth,
    };
  });
  check(headerRows.same && headerRows.right, "Table header indicator out of its row");
  check(await noOverflow(phone), "Phone Table overflows");
  await phone.screenshot({ path: dir + "b52-11-phone-table-en-390.png" });
  await setOffline(false, phone, true);
  await indicatorIs("Online — all synced", phone);
  check(
    (
      await phone.evaluate((k) => JSON.parse(localStorage.getItem(k)), key)
    ).actors.livia.inventory.find((i) => i.id === "potion").quantity === 1,
    "Phone sync lost the change",
  );
  await phoneContext.close();
  passed.push(
    "5. EN phone 390 touch: header cloud → Make available; offline edit queued («Offline — 1 change queued»); Table header keeps the indicator in its row; reconnect syncs; ≥ 40 px targets, no overflow",
  );

  // ------------------------------------------------ group 6 (review): real DM change, rolls
  const editPotion = async (quantity) => {
    await page.goto(base + "#characters?id=livia&tab=inventory");
    await page.locator('[data-character-action="detail-item"][data-item="potion"]').click();
    await page.locator('#dialog button[type="submit"]').click();
    await page.locator('#dialog [name="quantity"]').fill(String(quantity));
    await page.locator('#dialog button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector("#dialog").open);
  };
  const actAs = async (role) => {
    await page.locator("#demo-role").selectOption(role);
    await page.waitForFunction((r) => document.querySelector("#demo-role").value === r, role);
  };
  await page.goto(base + "#home");
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await page.goto(base + "#characters?id=livia&tab=actions");
  await closeTip();
  await page.locator('[data-offline-toggle="sheet:livia"]').check();
  await page.locator('[data-offline-switch="sheet:livia"]', { hasText: "Salvata" }).waitFor();
  await setOffline(true);
  // An ability check (digital, the default) stays refused offline, with the roll reason.
  // P2 (one roll engine): the sheet's check is the ability box's roll button.
  // F10: the right-click opens the roll window (a plain click rolls at once).
  await page.locator('[data-shp="roll"][data-kind="check"]').first().click({ button: "right" });
  await page.locator('#dialog button[type="submit"]').click();
  await page.locator("#dialog .dialog-error", { hasText: "I tiri di dado" }).waitFor();
  check(
    (await page.locator("#dialog .dialog-error").innerText()).startsWith("Sei senza rete"),
    "Roll refusal lost the core sentence",
  );
  await page.keyboard.press("Escape");
  check(!(await stored()).actors.livia.lastCheck, "Offline roll saved on the sheet");
  check(!(await mine()).queue.length, "Offline roll queued");
  await editPotion(2);
  await indicatorIs("Senza rete — 1 modifica in coda");
  // The DM, back online through "Visita come", changes the same potions for real.
  await actAs("dm");
  await setOffline(false);
  await indicatorIs("In linea — tutto sincronizzato");
  await editPotion(5);
  check((await potions()) === 5, "The DM's change was not applied");
  // The player is back: automatic sync, a conflict instead of a silent loss.
  await actAs("player");
  await indicatorIs("Da rivedere — 1 conflitto");
  const toast6 = await page.locator("#toast").innerText();
  check(
    toast6.includes("1 conflitto da rivedere") && !toast6.includes("sincronizzat"),
    "Sync toast: " + toast6,
  );
  check((await potions()) === 5, "The DM's value was overwritten");
  await page.goto(base + "#offline");
  const card6 = await page.locator(".offline-conflict").innerText();
  check(
    /valore di partenza\s+×3/.test(card6) &&
      /su questo dispositivo[^\n]*\n\s*×2/.test(card6) &&
      /Il DM · al tavolo\s+×5/.test(card6),
    "Comparison wrong: " + card6,
  );
  check(
    !(await page.locator("[data-offline-discard]").count()),
    "Per-row undo offered while online",
  );
  await shot("b52-12-real-dm-conflict-it-1440.png", page.locator(".offline-conflicts"));
  // EN at 390 px: the comparison stacks, nothing overflows; keep yours with the keyboard.
  await page.locator('.service-nav [data-service="preferences"]').click();
  await page.locator('#dialog [name="lang"]').selectOption("en");
  await page.locator('#dialog button[type="submit"]').click();
  await page.waitForFunction(() => !document.querySelector("#dialog").open);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".offline-conflict", { hasText: "The DM · at the Table" }).waitFor();
  check(await noOverflow(), "Conflict page overflows at 390");
  await shot("b52-13-conflict-en-390.png", page.locator(".offline-conflicts"));
  const keep = page.getByRole("button", { name: "Keep yours", exact: true });
  await keep.focus();
  await page.keyboard.press("Enter");
  await indicatorIs("Online — all synced");
  check((await potions()) === 2, "Keep yours not applied");
  await page.setViewportSize({ width: 1440, height: 900 });
  passed.push(
    "6. Review: offline ability check refused («Sei senza rete… I tiri di dado…», nothing queued); the DM's real ×5 through «Visita come» while the player's ×2 waits → «Da rivedere — 1 conflitto», ×3 / ×2 / ×5, no «synced» claim, no per-row undo online; EN 390 without overflow; «Keep yours» with Enter",
  );

  check(!errors.length, "Page errors: " + errors.join(" | "));
  await context.close();
  return { passed, errors };
};
