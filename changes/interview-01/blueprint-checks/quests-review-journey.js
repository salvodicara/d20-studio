async (rootPage) => {
  // B62: a Table panel is a sub-tab of its sidebar tab (Foundry's document tabs): open that
  // tab (its own, or the one its hidden handle names), then the sub-tab. No-op when open.
  const openTablePanel = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const now = () => page.locator("#table-sidebar-panel").getAttribute("data-table-panel");
    if ((await now()) === id) return;
    if (!(await page.locator(`.table-subtabs [data-table-subtab="${id}"]`).count())) {
      const own = await page.locator(`.table-tabs [data-table-tab="${id}"]`).count();
      const section = own
        ? id
        : await page
            .locator(
              `.table-panel-index [data-table-drawer="${id}"], .table-panel-index [data-table="${id}"]`,
            )
            .first()
            .getAttribute("data-table-section-of");
      const tab = page.locator(`.table-tabs [data-table-tab="${section}"]`);
      if ((await tab.getAttribute("aria-selected")) !== "true") await press(tab);
      await page.waitForFunction(
        (s) => document.querySelector("#table-sidebar-panel")?.dataset.tableSection === s,
        section,
      );
    }
    if ((await now()) !== id)
      await press(page.locator(`.table-subtabs [data-table-subtab="${id}"]`));
    await page.waitForFunction(
      (i) => document.querySelector("#table-sidebar-panel")?.dataset.tablePanel === i,
      id,
    );
  };
  // B43 independent review: the fixes in the one app with real keys, clicks and touch.
  // R-A keyboard focus survives every command, dialog and navigation of the area.
  // R-B a nested page created from a link in a secret block starts DM only.
  // R-C Checklist pages (Monk's Checklist): the DM ticks and adds items, the player reads.
  // R-D "important NPC" is the DM's flag; attitudes shared with players stay readable.
  // R-E Story tab box only on party characters (never on private Iria).
  // R-F English party label, Italian SRD citation (IT 204), Table tracker hidden badge.
  // R-G EN 390 px touch phone: checklist and archive without overflow, targets >= 40 px.
  // Run with: playwright-cli -s=d20-b43-rf --raw run-code --filename=<this file>
  // from the evidence dir.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const tabsKey = "d20-studio-quests-tabs-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B43-rf/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push("desktop: " + error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const data = async (p = page) => (await stored(p)).ext.quests.campaigns.lanterns;
  const setRole = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForTimeout(200);
  };
  const content = (p = page) => p.locator("#content").innerText();
  const submit = async (p = page, tap = false) => {
    const b = p.locator("#dialog[open] button[type=submit]");
    await (tap ? b.tap() : b.click());
    await p.waitForFunction(() => !document.querySelector("#dialog").open);
  };
  // The focused element as a short description (tag, first data attribute, text).
  const focused = (p = page) =>
    p.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return "BODY";
      const data = [...el.attributes]
        .filter((a) => a.name.startsWith("data-"))
        .map((a) => `${a.name}=${a.value}`)
        .join(" ");
      return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""} ${data}`.trim();
    });
  const settled = (p = page) => p.waitForTimeout(150);
  const shot = (name, p = page, fullPage = false) => p.screenshot({ path: shots + name, fullPage });
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  let mobile = null;
  try {
    await page.goto(base);
    await page.evaluate(
      ([k, t]) => {
        localStorage.removeItem(k);
        localStorage.removeItem(t);
      },
      [key, tabsKey],
    );
    await page.reload();
    await page.locator("#content").waitFor();
    await setRole("dm");

    // ---------------------------------------------------------------------------------
    // R-A Keyboard focus.
    await page.goto(base + "#campaign?tab=quests");
    await page.getByRole("heading", { name: "Missioni", level: 1 }).waitFor();
    await settled();
    check((await focused()).startsWith("h1"), "Arriving on Missioni does not focus its title");
    await page.locator('[data-q-open="quest-lantern"]').focus();
    await page.keyboard.press("Enter");
    await page.locator("#q-title", { hasText: "La lanterna riaccesa" }).waitFor();
    await settled();
    check(
      (await focused()).includes("data-q-open=quest-lantern"),
      "Choosing a quest with the keyboard lost the list position: " + (await focused()),
    );
    await page.locator('[data-q-open="quest-seal"]').focus();
    await page.keyboard.press("Enter");
    await page.locator("#q-title", { hasText: "Il sigillo spezzato" }).waitFor();
    await page.locator('[data-q-toggle="o2"]').focus();
    await page.keyboard.press("Space");
    await settled();
    check(await page.locator('[data-q-toggle="o2"]').isChecked(), "Space did not tick o2");
    check(
      (await focused()).includes("data-q-toggle=o2"),
      "Ticking an objective lost the focus: " + (await focused()),
    );
    await page.locator('[data-q-objective-hidden="o3"]').focus();
    await page.keyboard.press("Enter");
    await settled();
    check(
      (await focused()).includes("data-q-objective-hidden=o3"),
      "Hide/Show objective lost the focus: " + (await focused()),
    );
    check(
      (await page.locator('[data-q-objective-hidden="o3"]').innerText()).includes("Mostra"),
      "Objective not hidden",
    );
    await page.locator('[data-q-objective-hidden="o3"]').press("Enter");
    const add = page.locator('[data-q-add-objective] input[name="text"]');
    await add.fill("Parlare con Tessa al porto");
    await add.press("Enter");
    await page.locator(".jp-objective", { hasText: "Parlare con Tessa al porto" }).waitFor();
    await settled();
    check(
      (await focused()).startsWith("input") &&
        (await page.evaluate(() => document.activeElement.name)) === "text",
      "Adding an objective with Enter lost the field: " + (await focused()),
    );
    await add.fill("Seguire il carro dell’olio");
    await add.press("Enter");
    await page.locator(".jp-objective", { hasText: "Seguire il carro dell’olio" }).waitFor();
    check(
      (await page.evaluate(() => document.activeElement.name)) === "text",
      "Second objective: field lost",
    );
    // A dialog returns to its opener after the command.
    await page.locator('[data-jp-reveal="seal-b2"]').focus();
    await page.keyboard.press("Enter");
    await page.locator('#dialog [name="mode"][value="some"]').check();
    await page.locator('#dialog [name="actor"][value="doran"]').check();
    await submit();
    await settled();
    check(
      (await focused()).includes("data-jp-reveal=seal-b2"),
      "Reveal dialog did not return the focus: " + (await focused()),
    );
    // Completing removes the button: the quest title takes the focus.
    await page.locator('[data-q-status="completed"]').focus();
    await page.keyboard.press("Enter");
    await page.locator(".jp-status-completed").first().waitFor();
    await settled();
    check(
      (await focused()).startsWith("h2#q-title"),
      "Completing lost the focus: " + (await focused()),
    );
    await page.keyboard.press("Tab");
    check((await focused()) !== "BODY", "Tab after completing starts over");
    // Undo in the heading (keyboard).
    await page.locator("[data-jp-undo]").press("Enter");
    await page.locator(".jp-status-active").first().waitFor();
    // Archive: index item keeps the focus; a link in the text moves it to the new title.
    await page.goto(base + "#campaign?tab=quests-archive");
    await page.getByRole("heading", { name: "Archivio", level: 1 }).waitFor();
    await page.locator('.jp-dir-item[data-jp-open="page-guild"]').focus();
    await page.keyboard.press("Enter");
    await page.locator("#jp-page-title", { hasText: "Gilda delle lanterne" }).waitFor();
    await settled();
    check(
      (await focused()).includes("data-jp-open=page-guild"),
      "Index item lost the focus: " + (await focused()),
    );
    await page.locator('.jp-blocks [data-jp-open="page-oben"]').first().focus();
    await page.keyboard.press("Enter");
    await page.locator("#jp-page-title", { hasText: "Maestro Oben" }).waitFor();
    await settled();
    check(
      (await focused()).startsWith("h2#jp-page-title"),
      "Following a link did not focus the new page title: " + (await focused()),
    );
    await page.locator("[data-jp-back]").press("Enter");
    await page.locator("#jp-page-title", { hasText: "Gilda delle lanterne" }).waitFor();
    await settled();
    // Back reached the first page, so it is disabled: Forward, its twin, has the focus.
    check(
      (await focused()).includes("data-jp-forward"),
      "Back lost the focus: " + (await focused()),
    );
    await page.keyboard.press("Enter");
    await page.locator("#jp-page-title", { hasText: "Maestro Oben" }).waitFor();
    await settled();
    check((await focused()).includes("data-jp-back"), "Forward lost the focus");
    passed.push(
      "R-A Keyboard focus: route title on arrival, list/index item kept, objective tick/hide/add keep their control, reveal dialog returns to its opener, completing lands on the quest title, a text link lands on the new page title, Back at the first page hands the focus to Forward and Forward back to Back",
    );

    // ---------------------------------------------------------------------------------
    // R-B Nested page from a link inside a secret block.
    await page.locator('.jp-dir-item[data-jp-open="page-observatory"]').click();
    await page.locator("#jp-page-title", { hasText: "Il vecchio osservatorio" }).waitFor();
    await page.locator("[data-jp-edit]").click();
    await page.locator("[data-jp-editor]").waitFor();
    await page.locator('[data-jp-add-block="secret"]').click();
    const secretText = page.locator('[name="block-text-1"]');
    await secretText.fill("Sotto la torre c’è [[La cella di Oben]].");
    await page.locator("[data-jp-save]").click();
    await page.locator('[data-jp-create-child="La cella di Oben"]').click();
    check(
      await page.locator('#dialog [name="mode"][value="none"]').isChecked(),
      "Secret link: DM only not preselected",
    );
    await shot("rf-b-secret-nested-dialog-it.png");
    await page.locator('#dialog [name="type"]').selectOption("place");
    await submit();
    await page.locator("#jp-page-title", { hasText: "La cella di Oben" }).waitFor();
    const cell = (await data()).pages.find((p) => p.title === "La cella di Oben");
    check(cell.access.mode === "none" && cell.parentId === "page-observatory", "Cell data wrong");
    await setRole("player");
    await page.goto(base + "#campaign?tab=quests-archive&id=p:page-observatory");
    await page.locator("#jp-page-title", { hasText: "Il vecchio osservatorio" }).waitFor();
    check(!(await content()).includes("La cella di Oben"), "Secret nested title leaks");
    passed.push(
      "R-B A [[link]] written in a secret block opens the nested-page dialog with «Solo DM» preselected; the created place is DM only and its title never reaches the player",
    );

    // ---------------------------------------------------------------------------------
    // R-C Checklist.
    await setRole("dm");
    await page.goto(base + "#campaign?tab=quests-archive&id=p:page-tower-prep");
    await page.locator("#jp-page-title", { hasText: "Preparativi per la torre" }).waitFor();
    check((await content()).includes("Elenco"), "Checklist type label missing");
    const prep2 = page.locator('[data-jp-item-toggle="prep-2"]');
    await prep2.focus();
    await page.keyboard.press("Space");
    await settled();
    check(await page.locator('[data-jp-item-toggle="prep-2"]').isChecked(), "Item not ticked");
    check((await focused()).includes("data-jp-item-toggle=prep-2"), "Item tick lost focus");
    const itemField = page.locator('[data-jp-add-item] input[name="text"]');
    await itemField.fill("Lanterna di scorta per [[Maestro Oben]]");
    await itemField.press("Enter");
    await page.locator(".jp-checklist", { hasText: "Lanterna di scorta" }).waitFor();
    const prep = (await data()).pages.find((p) => p.id === "page-tower-prep");
    check(prep.items.length === 4 && prep.items[1].done, "Checklist data wrong");
    await shot("rf-c-checklist-dm-it.png", page, true);
    await setRole("player");
    await page.locator("#jp-page-title", { hasText: "Preparativi per la torre" }).waitFor();
    check((await page.locator("[data-jp-item-toggle]").count()) === 0, "Player can tick items");
    const playerText = await content();
    check(
      playerText.includes("Lanterna di scorta per") && playerText.includes("2/4"),
      "Player does not read the checklist",
    );
    await page.locator('.jp-checklist [data-jp-open="page-oben"]').click();
    await page.locator("#jp-page-title", { hasText: "Maestro Oben" }).waitFor();
    check(
      (await page.locator(".jp-mentions").innerText()).includes("Preparativi per la torre"),
      "Checklist link is not a backlink",
    );
    await shot("rf-c-checklist-backlink-player-it.png", page, true);
    passed.push(
      "R-C Seeded Checklist «Preparativi per la torre»: the DM ticks an item with Space and adds one with Enter; the player reads 2/4 read-only, follows the item's [[link]] and finds the checklist among Maestro Oben's backlinks",
    );

    // ---------------------------------------------------------------------------------
    // R-D Important NPC flag and shared attitudes.
    await page.goto(base + "#campaign?tab=quests-archive&id=p:page-tessa");
    await page.locator("#jp-page-title", { hasText: "Tessa Varro" }).waitFor();
    let text = await content();
    check(!text.includes("PNG importante"), "Player sees the important NPC flag");
    check(text.includes("Indifferente"), "Shared attitude missing for the player");
    check(text.includes("IT 11, 203, 204, 208, 210"), "Italian SRD citation not corrected");
    await page.locator('[data-jp-sub="reputation"]').click();
    await page.locator(".jp-reputation").waitFor();
    text = await content();
    check(
      text.includes("Atteggiamento dei PNG verso il gruppo") && !text.includes("PNG importanti"),
      "Player attitude table caption",
    );
    check(text.includes("Tessa Varro") && text.includes("Maestro Oben"), "Shared NPCs missing");
    await shot("rf-d-reputation-player-it.png", page, true);
    await setRole("dm");
    check(
      (await content()).includes("Atteggiamento dei PNG importanti"),
      "DM lost the important NPC table",
    );
    passed.push(
      "R-D Players read Tessa's and Oben's shared attitudes in «Atteggiamento dei PNG verso il gruppo» without the DM's «PNG importante» flag; the DM keeps the important-NPC table; the page cites IT 11, 203, 204, 208, 210",
    );

    // ---------------------------------------------------------------------------------
    // R-E Story tab box on party characters only.
    await setRole("player");
    await page.goto(base + "#characters?id=iria&tab=story");
    await page.locator("#content h1", { hasText: "Iria" }).first().waitFor();
    await settled();
    check((await page.locator(".jp-sheet-box").count()) === 0, "Iria shows party standings");
    await page.goto(base + "#characters?id=livia&tab=story");
    await page.locator(".jp-sheet-box").waitFor();
    passed.push(
      "R-E The «Reputazione e atteggiamenti» box is on Livia's Story tab and absent from Iria's (private, outside the campaign)",
    );

    // ---------------------------------------------------------------------------------
    // R-F English party label; Table tracker marks hidden objectives for the DM.
    await setRole("dm");
    await page.locator('[data-service="preferences"]').first().click();
    await page.locator('#dialog [name="lang"]').selectOption("en");
    await page.locator("#dialog button[type=submit]").click();
    await page.goto(base + "#campaign?tab=quests-archive&id=reputation");
    await page.locator(".jp-reputation").waitFor();
    const recent = await page.locator(".jp-reputation .jp-panel").last().innerText();
    check(recent.includes("· The party ·") && !recent.includes("· Il gruppo ·"), "EN party label");
    await page.goto(base + "#table");
    await openTablePanel(page, "quests-tracker"); // B62: Journal › Quests
    await page.locator(".jp-tracker").waitFor();
    const hiddenRow = page.locator(".jp-tracker .jp-objective", {
      hasText: "Smascherare Tessa Varro",
    });
    check((await hiddenRow.innerText()).includes("Hidden"), "Tracker hides the Hidden badge");
    await page.locator('.jp-tracker [data-q-toggle="l1a"]').focus();
    await page.keyboard.press("Space");
    await settled();
    check(
      (await focused()).includes("data-q-toggle=l1a"),
      "Table tracker tick lost the focus: " + (await focused()),
    );
    await shot("rf-f-table-tracker-dm-en.png");
    passed.push(
      "R-F English recent changes say «The party»; the DM's Table tracker marks the hidden objective and a Space tick keeps the focus on its checkbox",
    );

    // ---------------------------------------------------------------------------------
    // R-G EN phone (touch): checklist and archive.
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true,
    });
    await phone.addInitScript(
      ([k, value]) => {
        if (!sessionStorage.getItem("b43rf-seeded")) {
          localStorage.setItem(k, value);
          sessionStorage.setItem("b43rf-seeded", "1");
        }
      },
      [key, snapshot],
    );
    mobile = await phone.newPage();
    mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
    await mobile.goto(base + "#campaign?tab=quests-archive&id=p:page-tower-prep");
    await mobile.locator("#content").waitFor();
    await setRole("dm", mobile);
    await mobile.locator('[data-service="preferences"]').first().tap();
    await mobile.locator('#dialog [name="lang"]').selectOption("en");
    await mobile.locator("#dialog button[type=submit]").tap();
    await mobile.locator("#jp-page-title", { hasText: "Preparativi per la torre" }).waitFor();
    check((await mobile.locator(".jp-kicker").innerText()).includes("Checklist"), "EN type");
    await mobile.locator('[data-jp-item-toggle="prep-3"]').tap();
    await mobile.waitForTimeout(200);
    check(await mobile.locator('[data-jp-item-toggle="prep-3"]').isChecked(), "Tap tick");
    check(await noOverflow(mobile), "Phone checklist overflows");
    const small = await mobile.evaluate(() =>
      [
        ...document.querySelectorAll(
          ".jp-checklist button, .jp-checklist label, .jp-checklist input[type=text], .jp-checklist input:not([type])",
        ),
      ]
        .filter((el) => el.getBoundingClientRect().height > 0)
        .map((el) => Math.round(el.getBoundingClientRect().height))
        .filter((h) => h < 40),
    );
    check(!small.length, "Small checklist targets: " + small.join(","));
    await shot("rf-g-phone-checklist-dm-en.png", mobile, true);
    passed.push(
      "R-G EN 390 px touch: the DM ticks a checklist item by tap; «Checklist» label; no overflow; checklist targets >= 40 px",
    );
  } catch (error) {
    await page
      .screenshot({ path: shots + "rf-failure-desktop.png", fullPage: true })
      .catch(() => {});
    if (mobile)
      await mobile
        .screenshot({ path: shots + "rf-failure-phone.png", fullPage: true })
        .catch(() => {});
    return JSON.stringify({ ok: false, error: error.message, passed, errors }, null, 2);
  }
  return JSON.stringify({ ok: errors.length === 0, passed, errors }, null, 2);
};
