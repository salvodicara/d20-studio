async (rootPage) => {
  // B62: campaign sections sit in Kanka-style groups; a folded group is opened first.
  const openCampaignSection = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const link = page.locator(`.campaign-sidebar nav [data-campaign-tab="${id}"]`);
    await link.waitFor({ state: "attached" });
    const toggle = page.locator(
      `.campaign-sidebar [data-campaign-group]:has([data-campaign-tab="${id}"]) [data-campaign-group-toggle]`,
    );
    if ((await toggle.getAttribute("aria-expanded")) === "false") await press(toggle);
    await press(link);
  };
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
  // B43 quests, factions, reputation and structured journal, in the one app with real clicks,
  // keys and touch. IT desktop 1440x900 (player and DM in the same browser, like every
  // journey), then an EN 390x844 touch context with the same synthetic state.
  // A. Player: Home → campaign → Missioni in ≤ 3 clicks; quest without secrets; "Solo io" note.
  // B. DM: tick and add objectives (keyboard), reveal the secret block to Doran then Livia,
  //    complete → Undo → complete → reopen with a reason → complete; deliver the coins to
  //    Livia's purse; the secret reward never reaches the player.
  // C. "Missioni aperte" table view with inline status; new shop with the Taverna kit, person
  //    and organization; unlinked mentions dismissed and confirmed; nested page from a
  //    [[link]]; cut-to-new-page; draft guard.
  // D. Archive tabs: back, forward (mouse and keyboard), Ctrl+click new tab, close, bookmark,
  //    reload persistence.
  // E. Reputation of the party and of Livia with a reason, hidden → shared as band only,
  //    correction; important NPC attitude; secret connection revealed to Livia; relations
  //    as a list (no graph); Livia's sheet box.
  // F. Table sidebar tab "Missioni": the DM ticks, the player sees it. G. Offline refusal of
  //    a shared change, personal note allowed. H. Reload persistence. I. EN phone.
  // Run with: playwright-cli -s=d20-b43 run-code --filename=<this file> from the evidence dir.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const tabsKey = "d20-studio-quests-tabs-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B43/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  const findings = [];
  page.on("pageerror", (error) => errors.push("desktop: " + error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const data = async (p = page) => (await stored(p)).ext.quests.campaigns.lanterns;
  const pageOf = async (id, p = page) => (await data(p)).pages.find((row) => row.id === id);
  const setRole = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForTimeout(200);
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const toast = (p = page) => p.locator("#toast").innerText();
  const content = (p = page) => p.locator("#content").innerText();
  const dialogOpen = (p = page) =>
    p.evaluate(() => document.querySelector("#dialog")?.open === true);
  const submit = async (p = page, tap = false) => {
    const b = p.locator("#dialog[open] button[type=submit]");
    await (tap ? b.tap() : b.click());
    await p.waitForFunction(() => !document.querySelector("#dialog").open);
  };
  // B62: the quest sections sit in the «Racconto» group of the campaign rail.
  const sidebar = (tab, p = page) => ({
    click: () => openCampaignSection(p, tab),
    tap: () => openCampaignSection(p, tab, true),
  });
  const styled = (p = page) =>
    p.waitForFunction(() =>
      [...document.styleSheets].some(
        (sheet) => sheet.href?.endsWith("/journal-plus.css") && sheet.cssRules.length,
      ),
    );
  // Buttons, selects and inputs of the area under 40 px (inline prose links are exempt:
  // WCAG 2.5.8 inline-target exception).
  const smallTargets = (p = page) =>
    p.evaluate(() =>
      [
        ...document.querySelectorAll(
          ".jp-archive button, .jp-archive select, .jp-log-page button, .jp-log-page select, .jp-tracker button",
        ),
      ]
        .filter((el) => el.getBoundingClientRect().height > 0)
        .filter((el) => !el.closest(".campaign-prose, .jp-card p"))
        .filter((el) => !(el.matches(".jp-link") && el.closest("p, dd")))
        .map((el) => ({
          text: (el.innerText || el.getAttribute("aria-label") || el.name || "")
            .trim()
            .slice(0, 40),
          h: Math.round(el.getBoundingClientRect().height),
          w: Math.round(el.getBoundingClientRect().width),
        }))
        .filter((box) => box.h < 40 || box.w < 40),
    );
  const shot = (name, p = page, fullPage = false) => p.screenshot({ path: shots + name, fullPage });

  let mobile = null;
  try {
    // ---------------------------------------------------------------------------------
    // A. Player reaches the quest log from Home; the quest shows no DM secret.
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
    await setRole("player");
    let clicks = 0;
    const openCampaign = page.getByRole("button", { name: "Apri campagna", exact: true }).first();
    if (await openCampaign.count()) {
      await openCampaign.click();
      clicks++;
    } else {
      await page.locator('[data-nav="campaigns"]').click();
      clicks++;
      findings.push("Home has no 'Apri campagna': used the Campagne navigation");
    }
    await sidebar("quests").click();
    clicks++;
    await page.getByRole("heading", { name: "Missioni", level: 1 }).waitFor();
    await styled();
    await page.locator('[data-q-open="quest-seal"]').click();
    clicks++;
    check(clicks <= 3, "Quest detail needs more than 3 clicks: " + clicks);
    await page.locator("#q-title", { hasText: "Il sigillo spezzato" }).waitFor();
    let text = await content();
    for (const secret of [
      "Chiave d’ottone",
      "Smascherare Tessa",
      "La lettera è di",
      "Note del DM",
      "Tessa sa che il gruppo",
    ])
      check(!text.includes(secret), "Player sees a DM secret: " + secret);
    check(text.includes("50 monete d’oro"), "Public reward missing for the player");
    check(text.includes("Committente: Gilda delle lanterne"), "Quest giver missing");
    check(
      (await page.locator("[data-q-toggle]").count()) === 0,
      "Player has DM objective controls",
    );
    await shot("b43-01-player-quest-it.png");
    passed.push(
      "A1 Player: Home → Missioni → quest in " +
        clicks +
        " clicks; objectives, giver and public reward shown; secret block, hidden objective, secret reward, DM update and DM notes absent",
    );
    const note = page.locator('[data-jp-note="quest-seal"]');
    await note.fill("Chiedere a Mira di scendere nel pozzo in forma di gatto.");
    await page.locator('[data-jp-note-save="quest-seal"]').click();
    check((await toast()).includes("solo tu"), "Personal note confirmation missing");
    check(
      (await data()).notes.player["quest-seal"].text.startsWith("Chiedere a Mira"),
      "Personal note not stored",
    );
    passed.push("A2 Player 'Le mie note · Solo io' saved as a local private change");

    // ---------------------------------------------------------------------------------
    // B. DM: objectives, secret block reveal, status flow with Undo and correction, reward.
    await setRole("dm");
    await page.locator("#q-title", { hasText: "Il sigillo spezzato" }).waitFor();
    text = await content();
    check(!text.includes("Chiedere a Mira"), "The DM reads the player's 'Solo io' note");
    check(text.includes("Chiave d’ottone") && text.includes("Note del DM"), "DM secrets missing");
    await page.locator('[data-q-toggle="o2a"]').click();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k))
          .ext.quests.campaigns.lanterns.pages.find((p) => p.id === "quest-seal")
          .objectives.find((o) => o.id === "o2a").done === true,
      key,
    );
    const addForm = page.locator('[data-q-add-objective="quest-seal"]');
    await addForm.locator('[name="parentId"]').selectOption("o2");
    await addForm.locator('[name="text"]').fill("Chiedere a Tessa Varro del sigillo");
    await addForm.locator('[name="text"]').press("Enter");
    await page
      .locator(".jp-objective", { hasText: "Chiedere a Tessa Varro del sigillo" })
      .last()
      .waitFor();
    const added = (await pageOf("quest-seal")).objectives.find((o) =>
      o.text.startsWith("Chiedere a Tessa"),
    );
    check(added?.parentId === "o2", "Sub-objective not under o2");
    passed.push("B1 DM ticks a sub-objective (mouse) and adds one under «Scoprire…» with Enter");

    await page.locator('[data-jp-reveal="seal-b2"]').click();
    await page.locator('#dialog [name="mode"][value="some"]').check();
    await page.locator('#dialog [name="actor"][value="doran"]').check();
    await shot("b43-02-dm-reveal-dialog-it.png");
    await submit();
    await setRole("player");
    check(
      !(await content()).includes("La lettera è di"),
      "Revealed to Doran, yet the player reads it",
    );
    await setRole("dm");
    await page.locator('[data-jp-reveal="seal-b2"]').click();
    await page.locator('#dialog [name="actor"][value="doran"]').uncheck();
    await page.locator('#dialog [name="actor"][value="livia"]').check();
    await submit();
    check(
      (await pageOf("quest-seal")).blocks[1].reveal.actorIds.join() === "livia",
      "Reveal not stored for Livia",
    );
    await setRole("player");
    await page.locator(".jp-revealed", { hasText: "La lettera è di Tessa Varro" }).waitFor();
    passed.push(
      "B2 Secret block revealed to Doran: player still blind; revealed to Livia: her player reads it marked «Rivelato»",
    );

    await setRole("dm");
    await page.locator('[data-q-status="completed"]').click();
    await page.locator(".jp-status-completed", { hasText: "Completata" }).first().waitFor();
    check((await pageOf("quest-seal")).status === "completed", "Quest not completed");
    await page.locator("[data-jp-undo]").first().click();
    await page.locator(".jp-status-active", { hasText: "In corso" }).first().waitFor();
    check((await pageOf("quest-seal")).status === "active", "Undo did not restore In corso");
    await page.locator('[data-q-status="completed"]').click();
    await page.locator("[data-q-reopen]").click();
    await page.locator('#dialog [name="reason"]').fill("Manca ancora il rapporto alla gilda.");
    await submit();
    let seal = await pageOf("quest-seal");
    check(seal.status === "active", "Reopen failed");
    check(
      seal.updates.at(-1).correction === true && seal.updates.at(-1).text.includes("rapporto"),
      "Reopen reason not recorded as a correction",
    );
    await page.locator('[data-q-status="completed"]').click();
    await page.locator(".jp-status-completed").first().waitFor();
    passed.push(
      "B3 In corso → Completata, Undo back to In corso, completed again, reopened with a required reason (update marked Correzione), completed",
    );

    // W2b1 (B36) seeds Livia's purse (30 gp): the 50 gp reward adds to what she holds.
    const gpBefore = (await stored()).actors.livia.currency?.gp ?? 0;
    await page.locator('[data-q-deliver-target="r1"]').selectOption("livia");
    await page.locator('[data-q-deliver="r1"]').click();
    check((await toast()).includes("Livia"), "Delivery confirmation missing");
    check(
      (await stored()).actors.livia.currency?.gp === gpBefore + 50,
      "Coins not in Livia's purse",
    );
    await shot("b43-03-dm-quest-completed-it.png", page, true);
    await setRole("player");
    await page.goto(base + "#characters?id=livia&tab=inventory");
    await page.locator("#content").waitFor();
    check(
      (await content()).includes(`${gpBefore + 50} mo`),
      `Livia's sheet does not show ${gpBefore + 50} gp`,
    );
    await page.goto(base + "#campaign?tab=quests&id=status:completed");
    await page.locator('[data-q-open="quest-seal"]').click();
    text = await content();
    check(
      !text.includes("Chiave d’ottone"),
      "The secret reward reached the player after completion",
    );
    check(text.includes("Consegnata a Livia"), "Delivery not shown to the player");
    check(text.includes("Missione completata."), "Completion update missing for the player");
    passed.push(
      `B4 Coins delivered by the DM land in Livia's purse (${gpBefore} + 50: sheet shows ${gpBefore + 50} mo); the player sees the delivery and completion, never the secret key`,
    );

    // ---------------------------------------------------------------------------------
    // C. Views, kits, new types, mentions, nested pages, cut-to-new-page, draft guard.
    await setRole("dm");
    await page.goto(base + "#campaign?tab=quests");
    await page.locator('[data-jp-view="view-open-quests"]').click();
    await page.locator(".jp-table th", { hasText: "Committente" }).waitFor();
    const heads = await page.locator(".jp-table thead th").allInnerTexts();
    check(
      heads.join("|") === "Titolo|Stato|Committente|Obiettivi|Ricompense|Aggiornata",
      "Columns: " + heads,
    );
    check(
      !(await page.locator(".jp-table").innerText()).includes("Il sigillo spezzato"),
      "A completed quest is in «Missioni aperte»",
    );
    await page.locator('[data-jp-view-status="quest-lantern"]').selectOption("available");
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext.quests.campaigns.lanterns.pages.find(
          (p) => p.id === "quest-lantern",
        ).status === "available",
      key,
    );
    await shot("b43-04-view-open-quests-it.png");
    await page.locator('[data-jp-view-status="quest-lantern"]').selectOption("active");
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k)).ext.quests.campaigns.lanterns.pages.find(
          (p) => p.id === "quest-lantern",
        ).status === "active",
      key,
    );
    passed.push(
      "C1 «Missioni aperte» is a table with columns (Bases); the DM edits a status inline and back",
    );

    await sidebar("quests-archive").click();
    await page.getByRole("heading", { name: "Archivio", level: 1 }).waitFor();
    const newPage = async ({ type, title, kit = "", parent = "", mode = "all" }) => {
      await page.locator("[data-jp-new-page]").click();
      await page.locator('#dialog [name="type"]').selectOption(type);
      await page.locator('#dialog [name="title"]').fill(title);
      await page.locator('#dialog [name="kit"]').selectOption(kit);
      if (parent) await page.locator('#dialog [name="parentId"]').selectOption({ label: parent });
      await page.locator(`#dialog [name="mode"][value="${mode}"]`).check();
      await submit();
      await page.locator("#jp-page-title", { hasText: title }).waitFor();
    };
    await newPage({ type: "shop", title: "Taverna del Gufo Stanco", kit: "tavern" });
    text = await content();
    for (const field of [
      "Oste",
      "Prezzo di una stanza",
      "Specialità della casa",
      "Voci che girano",
    ])
      check(text.includes(field), "Taverna kit field missing: " + field);
    check(text.includes("Negozio"), "Shop type label missing");
    const tavern = (await data()).pages.find((p) => p.title === "Taverna del Gufo Stanco");
    check(tavern.properties.at(-1).secret === true, "Rumours are not DM only");
    await page.locator(".jp-mentions li", { hasText: "Il vecchio osservatorio" }).waitFor();
    // P9: one links panel for pages and entries (data-jp-mention-*).
    await page.locator("[data-jp-mention-dismiss]").first().click();
    await page
      .locator(".jp-mentions", { hasText: "Nessuna menzione senza collegamento" })
      .waitFor();
    check(
      (await data()).dismissed.some(
        (d) => d.targetId === tavern.id && d.sourceId === "page-observatory",
      ),
      "Dismissal not stored",
    );
    await newPage({
      type: "person",
      title: "Ada Fumo",
      kit: "person",
      parent: "Taverna del Gufo Stanco",
    });
    check(
      (await page.locator(".jp-breadcrumb").innerText()).includes("Taverna del Gufo Stanco"),
      "Person not nested",
    );
    await newPage({
      type: "organization",
      title: "Guardia di Bruma",
      kit: "organization",
      mode: "none",
    });
    await shot("b43-05-archive-new-organization-it.png");
    passed.push(
      "C2 New shop with the «Taverna» kit (rumours DM only), person nested under it, organization DM only; the tavern's unlinked mention is dismissed",
    );

    await page.locator('.jp-dir-item[data-jp-open="page-varro"]').click();
    await page.locator("#jp-page-title", { hasText: "Casa Varro" }).waitFor();
    await page.locator('[data-jp-mention-link="page-observatory"]').click();
    await page
      .locator(".jp-backlinks li", { hasText: "Il vecchio osservatorio" })
      .first()
      .waitFor();
    check(
      (await pageOf("page-observatory")).blocks[0].text.includes("[[Casa Varro]]"),
      "Mention not converted into a link",
    );
    await page.locator("[data-jp-suggest-toggle]").uncheck();
    await page.locator(".jp-mentions", { hasText: "Suggerimenti disattivati" }).waitFor();
    await page.locator("[data-jp-suggest-toggle]").check();
    await page
      .locator(".jp-mentions", { hasText: "Nessuna menzione senza collegamento" })
      .waitFor();
    passed.push(
      "C3 Obsidian mentions: «Collega» turns the observatory's plain «Casa Varro» into [[Casa Varro]] and a backlink; suggestions can be turned off and on (personal setting)",
    );

    await page.locator('.jp-dir-item[data-jp-open="page-observatory"]').click();
    await page.locator("#jp-page-title", { hasText: "Il vecchio osservatorio" }).waitFor();
    await page.locator("[data-jp-edit]").click();
    await page.locator("[data-jp-editor]").waitFor();
    const block0 = page.locator('[name="block-text-0"]');
    await block0.click();
    await block0.press("End");
    await block0.pressSequentially(" Sotto il cortile c’è la [[Cripta del custode]].");
    check(
      (await page.locator("[data-jp-editor-status]").innerText()).includes("non salvate"),
      "Dirty state not shown",
    );
    // Draft guard: leaving asks first; keep editing.
    await sidebar("quests").click();
    await page.locator("#dialog[open]", { hasText: "Modifiche non salvate" }).waitFor();
    await page.locator("#dialog").getByRole("button", { name: "Continua a modificare" }).click();
    check(await page.locator("[data-jp-editor]").isVisible(), "Guard did not keep the editor");
    await page.locator("[data-jp-save]").click();
    await page.locator('[data-jp-create-child="Cripta del custode"]').click();
    await page.locator('#dialog [name="type"]').selectOption("place");
    await submit();
    await page.locator("#jp-page-title", { hasText: "Cripta del custode" }).waitFor();
    check(
      (await page.locator(".jp-breadcrumb").innerText()).includes("Il vecchio osservatorio"),
      "Crypt not nested",
    );
    const crypt = (await data()).pages.find((p) => p.title === "Cripta del custode");
    check(
      crypt.parentId === "page-observatory" && crypt.type === "place",
      "Nested page data wrong",
    );
    passed.push(
      "C4 Draft guard kept the unsaved editor; saved text with [[Cripta del custode]] shows a red link; one click creates the nested place under the observatory",
    );

    await page.locator('.jp-dir-item[data-jp-open="page-guild"]').click();
    await page.locator("#jp-page-title", { hasText: "Gilda delle lanterne" }).waitFor();
    await page.locator("[data-jp-edit]").click();
    await page.locator("[data-jp-editor]").waitFor();
    await page.evaluate(() => {
      const area = document.querySelector('[name="block-text-0"]');
      const start = area.value.indexOf("Custodisce");
      const end = area.value.indexOf(".") + 1;
      area.focus();
      area.setSelectionRange(start, end);
    });
    await page.locator('[data-jp-cut="0"]').click();
    await page.locator('#dialog [name="title"]').fill("Storia della gilda");
    await shot("b43-06-cut-to-new-page-it.png");
    await submit();
    await page.locator('[name="block-text-0"]').waitFor();
    check(
      (await page.locator('[name="block-text-0"]').inputValue()).includes("[[Storia della gilda]]"),
      "Selection not replaced by a link",
    );
    await page.locator("[data-jp-cancel]").click();
    await page
      .locator(".jp-page [data-jp-open]", { hasText: "Storia della gilda" })
      .first()
      .waitFor();
    const history = (await data()).pages.find((p) => p.title === "Storia della gilda");
    check(
      history.parentId === "page-guild" && history.blocks[0].text.includes("tre generazioni"),
      "Cut page wrong",
    );
    passed.push(
      "C5 Cut-to-New-Page: a selection became «Storia della gilda», nested, replaced by its link",
    );

    // ---------------------------------------------------------------------------------
    // D. Tabs with back and forward, new tab, close, bookmark, reload.
    await page.locator('.jp-dir-item[data-jp-open="page-tessa"]').click();
    await page.locator("#jp-page-title", { hasText: "Tessa Varro" }).waitFor();
    await page.locator('.jp-breadcrumb [data-jp-open="page-varro"]').click();
    await page.locator("#jp-page-title", { hasText: "Casa Varro" }).waitFor();
    await page.locator("[data-jp-back]").click();
    await page.locator("#jp-page-title", { hasText: "Tessa Varro" }).waitFor();
    await page.locator("[data-jp-forward]").focus();
    await page.keyboard.press("Enter");
    await page.locator("#jp-page-title", { hasText: "Casa Varro" }).waitFor();
    const before = await page.locator(".jp-tab").count();
    await page
      .locator('.jp-props [data-jp-open="page-tessa"]')
      .click({ modifiers: ["ControlOrMeta"] });
    await page.locator("#jp-page-title", { hasText: "Tessa Varro" }).waitFor();
    check((await page.locator(".jp-tab").count()) === before + 1, "Ctrl+click did not open a tab");
    await page.locator('[data-jp-bookmark="page-tessa"]').click();
    await page.locator('.jp-bookmarks [data-jp-open="page-tessa"]').waitFor();
    await shot("b43-07-archive-tabs-it.png");
    await page.reload();
    // The demo identity is not saved: the reload starts as the player, with its own tabs.
    await page.locator("#content").waitFor();
    if ((await page.locator("#demo-role").inputValue()) !== "dm") await setRole("dm");
    await page.locator("#jp-page-title", { hasText: "Tessa Varro" }).waitFor();
    check((await page.locator(".jp-tab").count()) === before + 1, "Tabs lost on reload");
    await page.locator('.jp-bookmarks [data-jp-open="page-tessa"]').waitFor();
    await page.locator(".jp-tab.active [data-jp-close-tab]").click();
    await page.locator("#jp-page-title", { hasText: "Casa Varro" }).waitFor();
    check((await page.locator(".jp-tab").count()) === before, "Tab not closed");
    passed.push(
      "D Monk's tabs: breadcrumb link → Back (click) → Forward (Enter), Ctrl/Cmd+click opens a new tab, bookmark bar; tabs and bookmark survive reload; closing returns to the neighbour",
    );

    // ---------------------------------------------------------------------------------
    // E. Reputation, attitudes, secret connection, relations list, sheet box.
    await page.locator('[data-jp-sub="reputation"]').click();
    await page.locator(".jp-reputation caption", { hasText: "Reputazione" }).waitFor();
    await page
      .locator('[data-jp-standing-change][data-target="page-varro"][data-subject="livia"]')
      .click();
    await page.locator('#dialog [name="value"]').fill("-3");
    await page.locator('#dialog [name="reason"]').fill("Livia ha accusato Tessa davanti al porto.");
    await page.locator('#dialog [name="visibility"]').selectOption("hidden");
    await submit();
    await page
      .locator('[data-jp-standing-change][data-target="page-guild"][data-subject="party"]')
      .click();
    await page.locator('#dialog [name="value"]').fill("4");
    await page.locator('#dialog [name="reason"]').fill("Hanno riportato la lettera alla gilda.");
    await submit();
    await shot("b43-08-reputation-dm-it.png");
    const livia = () =>
      data().then((d) =>
        d.standings.find((s) => s.targetId === "page-varro" && s.subject === "livia"),
      );
    check(
      (await livia()).value === -3 && (await livia()).visibility === "hidden",
      "Livia's track wrong",
    );
    await setRole("player");
    text = await page.locator(".jp-reputation").innerText();
    check(!text.includes("Diffidente"), "Hidden reputation visible to the player");
    check(text.includes("Fidato (+4)"), "Shared party reputation missing");
    await setRole("dm");
    await page.locator('.jp-reputation [data-jp-open="page-varro"]').click();
    await page
      .locator(`[data-jp-standing-visibility="${(await livia()).id}"]`)
      .selectOption("tier");
    await page.waitForTimeout(200);
    await setRole("player");
    await page.locator(".jp-standing", { hasText: "Livia" }).waitFor();
    text = await page.locator(".jp-standings").innerText();
    check(text.includes("Diffidente") && !text.includes("-3"), "Band-only sharing wrong: " + text);
    await page.locator(".jp-standing", { hasText: "Livia" }).locator("summary").click();
    check(
      (await page.locator(".jp-standings").innerText()).includes("accusato Tessa"),
      "Reason not visible once shared",
    );
    await shot("b43-09-reputation-player-band-it.png");
    passed.push(
      "E1 Livia's reputation at Casa Varro (−3, reason) hidden from the player, then shared as band only: «Diffidente» with its reason and no number; party +4 «Fidato» shared",
    );
    await setRole("dm");
    await page.locator('.jp-dir-item[data-jp-open="page-guild"]').click();
    await page.locator("#jp-page-title", { hasText: "Gilda delle lanterne" }).waitFor();
    await page.locator(".jp-standing", { hasText: "Il gruppo" }).locator("summary").click();
    await page.locator("[data-jp-standing-correct]").click();
    await page.locator('#dialog [name="reason"]').fill("La lettera l’ha consegnata Doran da solo.");
    await submit();
    const guild = (await data()).standings.find((s) => s.id === "st-guild-party");
    check(guild.value === 3 && guild.history.at(-1).correction === true, "Correction not applied");
    passed.push("E2 Correction with a reason reverts +4 to +3 and keeps both history rows");

    await page.locator('.jp-dir-item[data-jp-open="page-tessa"]').click();
    await page.locator("#jp-page-title", { hasText: "Tessa Varro" }).waitFor();
    await page.locator(".jp-standings", { hasText: "Indifferente" }).waitFor();
    await page.locator('[data-jp-standing-subject="page-tessa"]').selectOption("livia");
    await page.locator('[data-jp-standing-add="page-tessa"]').click();
    await page.locator('#dialog [name="value"][value="hostile"]').check();
    await page.locator('#dialog [name="reason"]').fill("Livia ha visto l’anello con il sigillo.");
    await page.locator('#dialog [name="visibility"]').selectOption("full");
    await submit();
    await page.locator("[data-jp-relation-reveal]").first().click();
    await page.locator('#dialog [name="mode"][value="some"]').check();
    await page.locator('#dialog [name="actor"][value="livia"]').check();
    await submit();
    await shot("b43-10-important-npc-dm-it.png", page, true);
    await setRole("player");
    text = await content();
    // Review fix: "important NPC" is the DM's prep flag, never shown to players.
    check(!text.includes("PNG importante"), "Important NPC flag shown to the player");
    check(
      text.includes("Ostile") && text.includes("Indifferente"),
      "Attitudes missing for the player",
    );
    check(
      text.includes("paga in segreto") && text.includes("Connessione segreta rivelata"),
      "Revealed connection missing",
    );
    check(!text.includes("Comprare la torre"), "Secret property visible to the player");
    passed.push(
      "E3 Tessa Varro, important NPC: party Indifferente (SRD), Livia Ostile shared with a reason; secret connection «paga in segreto» revealed to Livia only when the DM chooses",
    );
    await page.locator('[data-jp-sub="relations"]').click();
    await page.locator(".jp-relations-screen").waitFor();
    check(
      (await page
        .locator(".jp-relations-screen svg:not(.icon), .jp-relations-screen canvas")
        .count()) === 0,
      "A graph was drawn (F-014)",
    );
    const playerRelations = await page.locator(".jp-relations-screen .jp-relation").count();
    await setRole("dm");
    const dmRelations = await page.locator(".jp-relations-screen .jp-relation").count();
    check(dmRelations > playerRelations, "The DM should see the unrevealed secret connection too");
    const form = page.locator(".jp-relations-screen [data-jp-relation-form]");
    const ada = (await data()).pages.find((p) => p.title === "Ada Fumo");
    await form.locator('[name="from"]').selectOption("page:" + ada.id);
    await form.locator('[name="label"]').fill("deve un favore a");
    await form.locator('[name="to"]').selectOption("page:page-oben");
    await form.locator('[name="label"]').press("Enter");
    await page.locator(".jp-relation", { hasText: "deve un favore a" }).waitFor();
    await shot("b43-11-relations-list-it.png");
    passed.push(
      "E4 Relations as a list (no graph): player " +
        playerRelations +
        ", DM " +
        dmRelations +
        "; a new relation added with the keyboard",
    );
    await setRole("player");
    await page.goto(base + "#characters?id=livia&tab=story");
    await page.locator(".jp-sheet-box").waitFor();
    text = await page.locator(".jp-sheet-box").innerText();
    check(
      text.includes("Casa Varro") && text.includes("Diffidente"),
      "Sheet box missing Casa Varro",
    );
    check(text.includes("Gilda delle lanterne"), "Sheet box missing the party's guild standing");
    await page.locator(".jp-sheet-box").scrollIntoViewIfNeeded();
    await shot("b43-12-livia-sheet-reputation-it.png");
    passed.push("E5 Livia's sheet (Storia) lists her shared reputation and the party's");

    // ---------------------------------------------------------------------------------
    // F. Table sidebar tab: the DM ticks an objective, the player sees it done.
    await setRole("dm");
    await page.goto(base + "#table");
    await page.locator(".table-layout").waitFor();
    await openTablePanel(page, "quests-tracker"); // B62: Journal › Quests
    await page.locator(".jp-tracker", { hasText: "La lanterna riaccesa" }).waitFor();
    await page.locator('.jp-tracker [data-q-toggle="l1a"]').check();
    await page.waitForFunction(
      (k) =>
        JSON.parse(localStorage.getItem(k))
          .ext.quests.campaigns.lanterns.pages.find((p) => p.id === "quest-lantern")
          .objectives.find((o) => o.id === "l1a").done === true,
      key,
    );
    await shot("b43-13-table-quests-tab-dm-it.png");
    await setRole("player");
    await openTablePanel(page, "quests-tracker");
    await page
      .locator(".jp-tracker .jp-objective.is-done", { hasText: "Trovare la chiave della torre" })
      .waitFor();
    check(
      (await page.locator(".jp-tracker [data-q-toggle]").count()) === 0,
      "Player can toggle at the Table",
    );
    passed.push(
      "F Table sidebar tab «Missioni»: the DM ticks «Trovare la chiave della torre», the player sees it done, read only",
    );

    // ---------------------------------------------------------------------------------
    // G. Offline: a shared DM change is refused; a personal note is kept.
    const setOffline = async (value, p = page, tap = false) => {
      const open = p.locator('.service-nav [data-service="preferences"]');
      await (tap ? open.tap() : open.click());
      const box = p.locator('#dialog [name="offline"]');
      await (value ? box.check() : box.uncheck());
      const save = p.locator('#dialog button[type="submit"]');
      await (tap ? save.tap() : save.click());
      await p.waitForFunction(() => !document.querySelector("#dialog").open);
    };
    await setRole("dm");
    await page.goto(base + "#campaign?tab=quests&id=q:quest-lantern");
    await page.locator("#q-title", { hasText: "La lanterna riaccesa" }).waitFor();
    await setOffline(true);
    await page.locator('[data-q-status="failed"]').click();
    check(
      /senza rete|offline/i.test(await toast()),
      "Offline refusal not shown: " + (await toast()),
    );
    check((await pageOf("quest-lantern")).status === "active", "Offline shared change applied");
    await page.locator('[data-jp-note="quest-lantern"]').fill("Portare olio di scorta.");
    await page.locator('[data-jp-note-save="quest-lantern"]').click();
    check(
      (await data()).notes.dm["quest-lantern"].text === "Portare olio di scorta.",
      "Offline note not kept",
    );
    await setOffline(false);
    passed.push(
      "G Offline: «Segna fallita» refused with a message, the DM's own note saved locally",
    );

    // ---------------------------------------------------------------------------------
    // H. Reload keeps everything; the DM sees no player note and vice versa.
    await page.reload();
    await page.locator("#content").waitFor();
    if ((await page.locator("#demo-role").inputValue()) !== "dm") await setRole("dm");
    await page.locator("#q-title", { hasText: "La lanterna riaccesa" }).waitFor();
    const after = await data();
    check(after.pages.find((p) => p.id === "quest-seal").status === "completed", "Status lost");
    check(
      after.pages.some((p) => p.title === "Taverna del Gufo Stanco"),
      "Tavern lost",
    );
    check(!(await content()).includes("Chiedere a Mira"), "DM reads the player note after reload");
    const desktopSmall = await smallTargets();
    check(!desktopSmall.length, "Small targets: " + JSON.stringify(desktopSmall));
    check(await noOverflow(), "Desktop overflow");
    passed.push(
      "H Reload keeps statuses, pages, reputation and notes; area targets ≥ 40 px; no overflow at 1440",
    );
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);

    // ---------------------------------------------------------------------------------
    // I. EN phone 390x844, touch, player.
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await phone.addInitScript(
      ([k, value]) => {
        if (!sessionStorage.getItem("b43-seeded")) {
          localStorage.setItem(k, value);
          sessionStorage.setItem("b43-seeded", "1");
        }
      },
      [key, snapshot],
    );
    mobile = await phone.newPage();
    mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
    await mobile.goto(base + "#campaign?tab=quests");
    await mobile.locator("#content").waitFor();
    await setRole("player", mobile);
    await mobile.locator('[data-service="preferences"]').first().tap();
    await mobile.locator('#dialog [name="lang"]').selectOption("en");
    await mobile.locator("#dialog button[type=submit]").tap();
    await mobile.getByRole("heading", { name: "Quests", level: 1 }).waitFor();
    await styled(mobile);
    check(await noOverflow(mobile), "Phone quest log overflows");
    await mobile.locator('[data-q-tab="completed"]').tap();
    await mobile.locator('[data-q-open="quest-seal"]').tap();
    await mobile.locator("#q-title").waitFor();
    text = await content(mobile);
    check(text.includes("Rewards") && text.includes("Objectives"), "English quest labels missing");
    check(!text.includes("Chiave d’ottone"), "Secret reward on the phone");
    check(await noOverflow(mobile), "Phone quest detail overflows");
    await shot("b43-14-phone-quest-en.png", mobile, true);
    await openCampaignSection(mobile, "quests-archive", true);
    await mobile.getByRole("heading", { name: "Archive", level: 1 }).waitFor();
    if (!(await mobile.locator("[data-jp-directory]").evaluate((el) => el.open)))
      await mobile.locator("[data-jp-directory] > summary").tap();
    await mobile.locator('.jp-dir-item[data-jp-open="page-tessa"]').tap();
    await mobile.locator("#jp-page-title", { hasText: "Tessa Varro" }).waitFor();
    text = await content(mobile);
    check(
      !text.includes("Important NPC") && text.includes("Secret connection revealed"),
      "English archive labels missing",
    );
    check(await noOverflow(mobile), "Phone archive overflows");
    const phoneSmall = await smallTargets(mobile);
    check(!phoneSmall.length, "Small phone targets: " + JSON.stringify(phoneSmall));
    await shot("b43-15-phone-archive-en.png", mobile, true);
    await mobile.locator('[data-jp-sub="reputation"]').tap();
    await mobile.locator(".jp-reputation").waitFor();
    check(await noOverflow(mobile), "Phone reputation overflows (table must scroll inside)");
    passed.push(
      "I EN phone 390 (touch): quest log, completed quest, archive page and reputation in English, no overflow, targets ≥ 40 px, secrets absent",
    );
  } catch (error) {
    await page
      .screenshot({ path: shots + "b43-failure-desktop.png", fullPage: true })
      .catch(() => {});
    if (mobile)
      await mobile
        .screenshot({ path: shots + "b43-failure-phone.png", fullPage: true })
        .catch(() => {});
    return JSON.stringify({ ok: false, error: error.message, passed, errors, findings }, null, 2);
  }
  return JSON.stringify({ ok: errors.length === 0, passed, errors, findings }, null, 2);
};
