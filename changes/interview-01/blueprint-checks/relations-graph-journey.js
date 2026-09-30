async (rootPage) => {
  // B58 relationship graph (Kanka relations explorer CMP-29, Obsidian graph view CMP-89,
  // LegendKeeper boards CMP-72) in the one app, with real clicks, keys and touch.
  // IT desktop 1440x900 (player and DM in the same browser), then an EN 390x844 touch
  // context with the same synthetic state.
  // A. Player: Campagna → Archivio → Relazioni → Grafo in 3 clicks; the B43 list stays as
  //    «Elenco»; no secret connection, hidden quest or DM sheet in the player's graph.
  // B. Click a node opens the entry; keyboard: Tab-focus preview, arrows arrange, Enter opens.
  // C. Mouse drag arranges the board; reload keeps it; «Annulla ultima modifica» puts it back.
  // D. Type filter (mouse and keyboard); Kanka modes: [[links]] only in the third mode, a
  //    plain mention never draws a line; local graph with depth.
  // E. DM: secret connection drawn only for the DM; click the line → reveal to Livia → the
  //    player sees it → hide again. DM "+" adds a relation; remove → Undo puts it back.
  // F. Offline: a shared relation is refused, an arrangement is kept. G. Entry page local
  //    graph and «Apri nel grafo». H. Reload persistence, targets ≥ 40 px, no overflow.
  // I. EN phone 390 (touch): tap Graph, tap a type, long-press preview, touch drag, tap opens.
  // J. Independent review fixes: hover intent keeps a clicked line while the pointer crosses
  //    entries; the add dialog starts on «Scegli una voce»; an archive page's local graph.
  // Run with: playwright-cli -s=d20-b58 --raw run-code --filename=<this file>
  // from /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B58/.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const prefsKey = "d20-studio-relations-graph-v1";
  const tabsKey = "d20-studio-quests-tabs-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B58/";
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
  const layout = async (role, p = page, format = "wide") =>
    (await stored(p)).ext["relations-graph"]?.layouts?.lanterns?.[role]?.[format] ?? {};
  const relations = async (p = page) => (await stored(p)).ext.quests.campaigns.lanterns.relations;
  const setRole = async (value, p = page) => {
    if ((await p.locator("#demo-role").inputValue()) === value) return;
    await p.locator("#demo-role").selectOption(value);
    await p.waitForTimeout(250);
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const content = (p = page) => p.locator("#content").innerText();
  const toast = (p = page) => p.locator("#toast").innerText();
  const node = (id, p = page) => p.locator(`[data-rg-node="${id}"]`);
  const edge = (id, p = page) => p.locator(`[data-rg-edge="${id}"]`);
  const transform = (id, p = page) => node(id, p).getAttribute("transform");
  const graphOn = (p = page) => p.locator("[data-rg-svg]").waitFor();
  const openGraph = async (p = page, tap = false) => {
    await p.goto(base + "#campaign?tab=quests-archive&id=relations");
    await p.locator("[data-rg-part]").waitFor();
    if (!(await p.locator("[data-rg-svg]").count())) {
      const button = p.locator('[data-rg-view="graph"]');
      await (tap ? button.tap() : button.click());
    }
    await graphOn(p);
  };
  const submit = async (p = page) => {
    await p.locator("#dialog[open] button[type=submit]").click();
    await p.waitForFunction(() => !document.querySelector("#dialog").open);
  };
  const styled = (p = page) =>
    p.waitForFunction(() =>
      [...document.styleSheets].some(
        (sheet) => sheet.href?.endsWith("/relations-graph.css") && sheet.cssRules.length,
      ),
    );
  // Centre the target in the viewport: the host toast at the bottom must not catch the press.
  const center = async (locator) => {
    await locator.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
    const box = await locator.boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  // Controls of the area under 40 px (checkboxes count through their 44 px label).
  const smallTargets = (p = page) =>
    p.evaluate(() =>
      [
        ...document.querySelectorAll(
          ".rg button, .rg select, .rg input:not([type=checkbox]), .rg label.campaign-check, .rg-entry button, .rg-node-hit",
        ),
      ]
        .filter((el) => el.getBoundingClientRect().height > 0)
        .map((el) => ({
          text: (
            el.innerText ||
            el.getAttribute("aria-label") ||
            el.closest("[data-rg-node]")?.dataset.rgNode ||
            el.className?.baseVal ||
            ""
          )
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
    // A. Player: three clicks from the campaign page; the list stays; no DM secret.
    await page.goto(base);
    await page.evaluate(
      (keys) => keys.forEach((k) => localStorage.removeItem(k)),
      [key, prefsKey, tabsKey],
    );
    await page.reload();
    await page.locator("#content").waitFor();
    await setRole("player");
    await page.goto(base + "#campaign?tab=overview");
    await page.locator(".campaign-sidebar").waitFor();
    let clicks = 0;
    await page.locator('[data-campaign-tab="quests-archive"]').first().click();
    clicks++;
    await page.getByRole("heading", { name: "Archivio", level: 1 }).waitFor();
    await page.locator('[data-jp-sub="relations"]').click();
    clicks++;
    await page.locator(".jp-relations-screen").waitFor();
    await styled();
    check(
      (await page.locator('[data-rg-view="list"]').getAttribute("aria-pressed")) === "true",
      "The list is not the default view",
    );
    const listRows = await page.locator(".jp-relations-screen .jp-relation").count();
    await page.locator('[data-rg-view="graph"]').click();
    clicks++;
    await graphOn();
    check(clicks <= 3, "Graph needs more than 3 clicks: " + clicks);
    check(
      (await page.locator(".jp-relations-screen").count()) === 0,
      "The list is still on screen in graph mode",
    );
    let text = await content();
    for (const secret of ["paga in segreto", "debiti", "Il forziere che morde"])
      check(!text.includes(secret), "Player sees a DM secret: " + secret);
    check((await edge("rel:rel-tessa-goblins").count()) === 0, "Secret line drawn for the player");
    check((await node("actor:goblin-1").count()) === 0, "Player reads the goblin sheet");
    check((await node("page:page-tessa").count()) === 1, "Tessa missing");
    check((await edge("rel:rel-oben-doran").count()) === 1, "Public relation missing");
    await page.locator("[data-rg-svg]").scrollIntoViewIfNeeded();
    await shot("b58-01-player-graph-it.png");
    passed.push(
      `A Player: Campagna → Archivio → Relazioni → Grafo in ${clicks} clicks; the B43 list (${listRows} relations) stays as «Elenco»; no secret connection, hidden quest or DM sheet drawn`,
    );

    // ---------------------------------------------------------------------------------
    // B. Click opens the entry; keyboard preview, arrange and open.
    await node("page:page-tessa").click();
    await page.locator("#jp-page-title", { hasText: "Tessa Varro" }).waitFor();
    await page.goBack();
    await graphOn();
    check(
      (await page.locator('[data-rg-view="graph"]').getAttribute("aria-pressed")) === "true",
      "Back did not return to the graph",
    );
    await node("page:page-varro").focus();
    await page.locator("[data-rg-details] h3", { hasText: "Casa Varro" }).waitFor();
    const details = await page.locator("[data-rg-details]").innerText();
    check(
      details.includes("fa parte di") && details.includes("Tessa Varro"),
      "Preview lacks links",
    );
    const beforeKeys = await transform("page:page-varro");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Shift+ArrowDown");
    await page.waitForFunction(
      (k) =>
        Boolean(
          JSON.parse(localStorage.getItem(k)).ext["relations-graph"]?.layouts?.lanterns?.player
            ?.wide?.["page:page-varro"],
        ),
      key,
    );
    await page.waitForFunction(() => document.activeElement?.dataset?.rgNode === "page:page-varro");
    const afterKeys = await transform("page:page-varro");
    check(afterKeys !== beforeKeys, "Arrow keys did not move Casa Varro");
    await page.keyboard.press("Enter");
    await page.locator("#jp-page-title", { hasText: "Casa Varro" }).waitFor();
    await page.goBack();
    await graphOn();
    check((await transform("page:page-varro")) === afterKeys, "Keyboard arrangement lost");
    // Arrow then Tab at once: the move is saved on leaving and the focus goes on to the next
    // entry after the re-render.
    const guildBefore = await transform("page:page-guild");
    await node("page:page-guild").focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Tab");
    await page.waitForFunction(
      (before) =>
        document.querySelector('[data-rg-node="page:page-guild"]')?.getAttribute("transform") !==
        before,
      guildBefore,
    );
    const nextFocus = await page.evaluate(() => document.activeElement?.dataset?.rgNode ?? null);
    check(
      nextFocus && nextFocus !== "page:page-guild",
      "Tab after an arrow move did not reach the next entry: " + nextFocus,
    );
    passed.push(
      "B Click on Tessa opens her archive page, Back returns to the graph; Tab-focus previews Casa Varro's links, arrows arrange it (kept, focus stays), Enter opens it; an arrow then Tab saves the move and the focus reaches the next entry",
    );

    // ---------------------------------------------------------------------------------
    // C. Mouse drag; reload keeps it; Undo puts it back.
    const beforeDrag = await transform("page:page-oben");
    const drag = async (id, dx, dy) => {
      const from = await center(node(id).locator(".rg-shape"));
      const before = await transform(id);
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 5 });
      await page.mouse.move(from.x + dx, from.y + dy, { steps: 5 });
      await page.mouse.up();
      await page.waitForFunction(
        ([nodeId, previous]) =>
          document.querySelector(`[data-rg-node="${nodeId}"]`)?.getAttribute("transform") !==
          previous,
        [id, before],
      );
      return transform(id);
    };
    const dragged = await drag("page:page-oben", 40, -170);
    check(
      (await page.locator("#jp-page-title").count()) === 0,
      "A drag opened the entry instead of moving it",
    );
    const board = await layout("player");
    check(Object.keys(board).length > 5, "The board was not kept as a whole");
    check(
      JSON.stringify(board["page:page-oben"]) !== "{}" && !Object.keys(await layout("dm")).length,
      "Arrangement not personal",
    );
    await shot("b58-02-player-arranged-it.png");
    // «Annulla ultima modifica» (the Archive heading) puts Oben back; the undo stack is
    // session-local by design, so Undo is checked before the reload.
    await page.locator("[data-jp-undo]").first().click();
    await page.waitForFunction(
      (after) =>
        document.querySelector('[data-rg-node="page:page-oben"]')?.getAttribute("transform") !==
        after,
      dragged,
    );
    check((await transform("page:page-oben")) === beforeDrag, "Undo did not put Oben back");
    check((await transform("page:page-varro")) === afterKeys, "Undo also undid the earlier move");
    const draggedAgain = await drag("page:page-oben", 40, -170);
    await page.reload();
    await graphOn();
    check((await transform("page:page-oben")) === draggedAgain, "Reload lost the arrangement");
    check((await transform("page:page-varro")) === afterKeys, "Reload lost the keyboard move");
    await page.locator("[data-rg-relayout]").click();
    await page.waitForFunction(
      (k) =>
        !JSON.parse(localStorage.getItem(k)).ext["relations-graph"]?.layouts?.lanterns?.player
          ?.wide,
      key,
    );
    check((await transform("page:page-oben")) !== draggedAgain, "«Riordina» kept the drag");
    await page.locator("[data-jp-undo]").first().click();
    await page.waitForFunction(
      (after) =>
        document.querySelector('[data-rg-node="page:page-oben"]')?.getAttribute("transform") ===
        after,
      draggedAgain,
    );
    passed.push(
      "C Mouse drag of Maestro Oben arranges the board (whole board kept, only for the player); «Annulla ultima modifica» puts Oben back and keeps the earlier keyboard move; dragged again, a reload keeps it; «Riordina automaticamente» lays it out again and Undo restores the arrangement",
    );

    // ---------------------------------------------------------------------------------
    // D. Type filter, Kanka modes, no inference, local graph.
    await page.locator('[data-rg-type="quest"]').click();
    await page.waitForFunction(() => !document.querySelector('[data-rg-node^="page:quest"]'));
    check(
      (await page.locator('[data-rg-type="quest"]').getAttribute("aria-pressed")) === "false",
      "Quest chip not pressed off",
    );
    check((await edge("giver:quest-seal").count()) === 0, "Line of a hidden type still drawn");
    await page.locator('[data-rg-type="quest"]').focus();
    await page.keyboard.press("Enter");
    await node("page:quest-seal").waitFor();
    check(
      (await page.locator('[data-rg-type="quest"]').getAttribute("aria-pressed")) === "true",
      "Quest chip not back on with the keyboard",
    );
    // Highlight by name (Obsidian search groups) and zoom (buttons, fit).
    await page.locator("[data-rg-query]").fill("varro");
    const matches = await page.locator(".rg-node.is-match").count();
    check(matches === 2, "Highlight «varro» should mark Casa Varro and Tessa Varro: " + matches);
    check(
      await page.locator("[data-rg-query]").evaluate((el) => el === document.activeElement),
      "The highlight field lost the focus",
    );
    await page.locator("[data-rg-query]").fill("");
    const viewBox = () => page.locator("[data-rg-svg]").getAttribute("viewBox");
    const fitBox = await viewBox();
    await page.locator('[data-rg-zoom="in"]').click();
    check((await viewBox()) !== fitBox, "Zoom in did not change the view");
    await page.locator('[data-rg-zoom="fit"]').click();
    check((await viewBox()) === fitBox, "Fit did not return to the whole board");
    await node("page:page-oben").hover();
    await page.locator('[data-rg-center="page:page-oben"]').click();
    check(
      (await page.locator("[data-rg-focus]").inputValue()) === "page:page-oben",
      "«Solo i suoi collegamenti» did not center Oben",
    );
    await page.locator("[data-rg-unfocus]").click();
    await page.locator("[data-rg-depth]").waitFor({ state: "detached" });
    await page.locator("[data-rg-mode]").selectOption("relations");
    await graphOn();
    check((await edge("giver:quest-seal").count()) === 0, "Relations-only mode draws a giver");
    await page.locator("[data-rg-mode]").selectOption("mentions");
    await edge("mention:page-guild:page-oben").waitFor({ state: "attached" });
    const inferred = await page.evaluate(() =>
      [...document.querySelectorAll("[data-rg-edge]")].some(
        (g) =>
          [g.dataset.from, g.dataset.to].includes("page:page-observatory") &&
          [g.dataset.from, g.dataset.to].includes("page:page-varro"),
      ),
    );
    check(!inferred, "The plain mention «Casa Varro» in the observatory text became a line");
    check(
      (await edge("mention:quest-seal:page-tessa").count()) === 0,
      "A [[link]] from an unrevealed secret block is drawn for the player",
    );
    await page.locator("[data-rg-focus]").selectOption("page:page-tessa");
    await page.locator("[data-rg-depth]").waitFor();
    const local1 = await page.locator("[data-rg-node]").count();
    await page.locator("[data-rg-depth]").focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(
      (n) => document.querySelectorAll("[data-rg-node]").length > n,
      local1,
    );
    const local2 = await page.locator("[data-rg-node]").count();
    await page.locator("[data-rg-svg]").scrollIntoViewIfNeeded();
    await shot("b58-03-player-local-graph-it.png");
    await page.locator("[data-rg-unfocus]").click();
    await page.locator("[data-rg-depth]").waitFor({ state: "detached" });
    await page.locator("[data-rg-mode]").selectOption("related");
    await graphOn();
    passed.push(
      `D Highlight «varro» marks 2 entries with the focus kept; zoom in and fit; «Solo i suoi collegamenti» centers Oben. Type chip «Missioni» hides quests and their lines (mouse), back on with Enter; «Solo relazioni» drops field lines; third mode draws [[Maestro Oben]] but never the plain «Casa Varro» mention; local graph of Tessa: ${local1} entries at depth 1, ${local2} at depth 2 (keyboard slider)`,
    );

    // ---------------------------------------------------------------------------------
    // E. DM: secret line, reveal to Livia from the line, hide again; add, remove, Undo.
    await setRole("dm");
    await openGraph();
    check(
      (await edge("rel:rel-tessa-goblins").getAttribute("class")).includes("is-secret"),
      "DM secret line missing or not marked",
    );
    check((await node("page:quest-mimic").count()) === 1, "DM does not see the hidden quest");
    check((await node("actor:goblin-1").count()) === 1, "DM does not see the goblin sheet");
    check(
      !Object.keys(await layout("dm")).length && (await transform("page:page-varro")) !== afterKeys,
      "The DM got the player's arrangement",
    );
    await page.locator("[data-rg-svg]").scrollIntoViewIfNeeded();
    await shot("b58-04-dm-graph-it.png");
    await edge("rel:rel-tessa-goblins").locator(".rg-edge-hit").click();
    await page.locator("[data-rg-details] h3", { hasText: "paga in segreto" }).waitFor();
    check(
      (await page.locator("[data-rg-details]").innerText()).includes("solo DM"),
      "Line details lack the secret status",
    );
    await page.locator("[data-rg-reveal]").click();
    await page.locator('#dialog [name="mode"][value="some"]').check();
    await page.locator('#dialog [name="actor"][value="livia"]').check();
    await submit();
    await page.locator("[data-rg-details]", { hasText: "Livia" }).waitFor();
    await shot("b58-05-dm-revealed-line-it.png");
    check(
      (await relations()).find((r) => r.id === "rel-tessa-goblins").reveal.actorIds.join() ===
        "livia",
      "Reveal not stored",
    );
    await setRole("player");
    await graphOn();
    await edge("rel:rel-tessa-goblins").waitFor({ state: "attached" });
    check(
      (await edge("rel:rel-tessa-goblins").getAttribute("class")).includes("is-revealed"),
      "Revealed line not marked for the player",
    );
    await edge("rel:rel-tessa-goblins").locator(".rg-edge-hit").click();
    text = await page.locator("[data-rg-details]").innerText();
    check(
      text.includes("rivelata") && !text.includes("Rivela…") && !text.includes("Rimuovi"),
      "Player line details wrong: " + text,
    );
    await page.locator("[data-rg-svg]").scrollIntoViewIfNeeded();
    await shot("b58-06-player-revealed-it.png");
    await setRole("dm");
    await graphOn();
    await edge("rel:rel-tessa-goblins").locator(".rg-edge-hit").click();
    await page.locator("[data-rg-hide]").click();
    await page.locator("[data-rg-details]", { hasText: "solo DM" }).waitFor();
    await setRole("player");
    await graphOn();
    check((await edge("rel:rel-tessa-goblins").count()) === 0, "Hidden again, still drawn");
    passed.push(
      "E1 DM: secret line «paga in segreto» dashed and marked; clicking the line shows «solo DM», «Rivela…» to Livia; her player sees it marked revealed, read only; «Nascondi di nuovo» removes it from the player's graph",
    );
    await setRole("dm");
    await graphOn();
    await node("page:page-oben").hover();
    // Hover intent (review): the preview comes once the pointer rests on the entry.
    await page.locator("[data-rg-details] h3", { hasText: "Maestro Oben" }).waitFor();
    await page.locator("[data-rg-add]").click();
    check(
      (await page.locator('#dialog [name="from"]').inputValue()) === "page:page-oben",
      "«Aggiungi relazione» did not start from the previewed entry",
    );
    await page.locator('#dialog [name="label"]').fill("ha addestrato");
    await page.locator('#dialog [name="to"]').selectOption("actor:livia");
    await page.locator('#dialog [name="label"]').press("Enter");
    await page.waitForFunction(() => !document.querySelector("#dialog").open);
    const added = (await relations()).find((r) => r.label === "ha addestrato");
    check(added, "Relation not stored");
    await edge("rel:" + added.id).waitFor({ state: "attached" });
    await page.locator("[data-rg-details] h3", { hasText: "ha addestrato" }).waitFor();
    await page.locator(`[data-rg-remove="${added.id}"]`).click();
    await edge("rel:" + added.id).waitFor({ state: "detached" });
    check((await toast()).includes("Annulla ultima modifica"), "Removal toast missing");
    await page.locator("[data-jp-undo]").first().click();
    await edge("rel:" + added.id).waitFor({ state: "attached" });
    await page.locator('[data-rg-view="list"]').click();
    await page.locator(".jp-relation", { hasText: "ha addestrato" }).waitFor();
    await page.locator('[data-rg-view="graph"]').click();
    await graphOn();
    passed.push(
      "E2 DM «Aggiungi relazione» starts from the previewed Maestro Oben, adds «ha addestrato» Livia with Enter; «Rimuovi relazione» from the line → toast → «Annulla ultima modifica» restores it; the same relation is in the B43 list",
    );

    // ---------------------------------------------------------------------------------
    // F. Offline: shared relation refused, arrangement kept locally.
    const setOffline = async (value, p = page, tap = false) => {
      const open = p.locator('.service-nav [data-service="preferences"]');
      await (tap ? open.tap() : open.click());
      const box = p.locator('#dialog [name="offline"]');
      await (value ? box.check() : box.uncheck());
      const save = p.locator('#dialog button[type="submit"]');
      await (tap ? save.tap() : save.click());
      await p.waitForFunction(() => !document.querySelector("#dialog").open);
    };
    await setOffline(true);
    await graphOn();
    const count = (await relations()).length;
    await page.locator("[data-rg-add]").click();
    // The dialog opens on «Scegli una voce» (review): both ends are chosen explicitly.
    await page.locator('#dialog [name="from"]').selectOption("page:page-oben");
    await page.locator('#dialog [name="to"]').selectOption("actor:doran");
    await page.locator('#dialog [name="label"]').fill("senza rete");
    await page.locator("#dialog button[type=submit]").click();
    await page.locator("#dialog .dialog-error:not([hidden])").waitFor();
    check(
      /rete|offline/i.test(await page.locator("#dialog .dialog-error").innerText()),
      "Offline refusal not shown in the dialog",
    );
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("#dialog").open);
    check((await relations()).length === count, "Offline shared relation applied");
    await drag("actor:doran", -40, -50);
    await page.waitForFunction(
      (k) =>
        Boolean(
          JSON.parse(localStorage.getItem(k)).ext["relations-graph"]?.layouts?.lanterns?.dm?.wide?.[
            "actor:doran"
          ],
        ),
      key,
    );
    await setOffline(false);
    passed.push(
      "F Offline: a new relation is refused inside the dialog (nothing stored); the DM's own arrangement (drag of Doran) is kept as a local change",
    );

    // ---------------------------------------------------------------------------------
    // G. Journal entry page: its local graph, click opens, «Apri nel grafo».
    await page.goto(base + "#campaign?tab=entry&id=legacy-recap-summary");
    await page.locator("[data-rg-entry]").waitFor();
    await page.locator("[data-rg-entry]").scrollIntoViewIfNeeded();
    await shot("b58-07-entry-local-graph-it.png");
    await page.locator('[data-rg-entry] [data-rg-node="page:quest-lantern"]').click();
    await page.locator("#q-title", { hasText: "La lanterna riaccesa" }).waitFor();
    await page.goBack();
    await page.locator("[data-rg-open-graph]").click();
    await graphOn();
    check(
      (await page.locator("[data-rg-focus]").inputValue()) === "entry:legacy-recap-summary",
      "«Apri nel grafo» did not center the entry",
    );
    await page.locator("[data-rg-unfocus]").click();
    await page.locator("[data-rg-depth]").waitFor({ state: "detached" });
    passed.push(
      "G Journal entry page: local graph «Nel grafo delle relazioni» with «La lanterna riaccesa»; click opens the quest; «Apri nel grafo delle relazioni» opens the Archive graph centred on the entry",
    );

    // ---------------------------------------------------------------------------------
    // H. Reload, targets and overflow at 1440.
    await page.reload();
    await graphOn();
    check((await edge("rel:" + added.id).count()) === 1, "Relation lost on reload");
    const desktopSmall = await smallTargets();
    check(!desktopSmall.length, "Small targets: " + JSON.stringify(desktopSmall));
    check(await noOverflow(), "Desktop overflow");
    passed.push(
      "H Reload keeps graph view, relation and arrangements; targets ≥ 40 px; no overflow at 1440",
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
        if (!sessionStorage.getItem("b58-seeded")) {
          localStorage.setItem(k, value);
          sessionStorage.setItem("b58-seeded", "1");
        }
      },
      [key, snapshot],
    );
    mobile = await phone.newPage();
    mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
    await mobile.goto(base + "#campaign?tab=quests-archive&id=relations");
    await mobile.locator("#content").waitFor();
    await setRole("player", mobile);
    await mobile.locator('[data-service="preferences"]').first().tap();
    await mobile.locator('#dialog [name="lang"]').selectOption("en");
    await mobile.locator("#dialog button[type=submit]").tap();
    await mobile.getByRole("heading", { name: "Archive", level: 1 }).waitFor();
    await styled(mobile);
    await mobile.locator('[data-rg-view="graph"]').tap();
    await graphOn(mobile);
    text = await content(mobile);
    check(
      text.includes("Relations and related entries") && text.includes("Entries without links"),
      "English graph labels missing",
    );
    check(!text.includes("paga in segreto"), "Secret on the phone");
    check(await noOverflow(mobile), "Phone graph overflows");
    const phoneSmall = await smallTargets(mobile);
    check(!phoneSmall.length, "Small phone targets: " + JSON.stringify(phoneSmall));
    await mobile.locator('[data-rg-type="character"]').tap();
    await mobile.waitForFunction(() => !document.querySelector('[data-rg-node^="actor:"]'));
    await mobile.locator('[data-rg-type="character"]').tap();
    await node("actor:doran", mobile).waitFor();
    const cdp = await phone.newCDPSession(mobile);
    const touch = async (type, point) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x: point.x, y: point.y }],
      });
    await mobile.locator("[data-rg-svg]").scrollIntoViewIfNeeded();
    await shot("b58-08-phone-graph-en.png", mobile);
    const guild = await center(node("page:page-guild", mobile).locator(".rg-shape"));
    await touch("touchStart", guild);
    await mobile.waitForTimeout(700);
    await touch("touchEnd", guild);
    await mobile.locator("[data-rg-details] h3", { hasText: "Gilda delle lanterne" }).waitFor();
    await mobile.waitForTimeout(300);
    check(
      (await mobile.locator("#jp-page-title").count()) === 0,
      "Long press opened the entry instead of previewing it",
    );
    // Review: the preview is brought where it can be read (below the board on a phone).
    const previewBox = await mobile.locator("[data-rg-details] h3").boundingBox();
    check(
      previewBox && previewBox.y >= 0 && previewBox.y + previewBox.height <= 844,
      "The long-press preview stays off screen: " + JSON.stringify(previewBox),
    );
    await shot("b58-rf-04-phone-longpress-preview-en.png", mobile);
    const guildAgain = await center(node("page:page-guild", mobile).locator(".rg-shape"));
    Object.assign(guild, guildAgain);
    const beforeTouch = await transform("page:page-guild", mobile);
    await touch("touchStart", guild);
    // Down into the free lower-left corner of the board.
    for (let i = 1; i <= 6; i++)
      await touch("touchMove", { x: guild.x - i * 4, y: guild.y + i * 52 });
    await touch("touchEnd", guild);
    await mobile.waitForFunction(
      (k) =>
        Boolean(
          JSON.parse(localStorage.getItem(k)).ext["relations-graph"]?.layouts?.lanterns?.player
            ?.narrow?.["page:page-guild"],
        ),
      key,
    );
    check((await transform("page:page-guild", mobile)) !== beforeTouch, "Touch drag did not move");
    await mobile.locator("[data-rg-svg]").scrollIntoViewIfNeeded();
    await shot("b58-09-phone-arranged-en.png", mobile);
    await shot("b58-10-phone-graph-en-full.png", mobile, true);
    await node("page:page-tessa", mobile).tap();
    await mobile.locator("#jp-page-title", { hasText: "Tessa Varro" }).waitFor();
    check(await noOverflow(mobile), "Phone archive page overflows");
    // Review: her archive page carries her local graph, readable at 390 px.
    await mobile.locator('[data-rg-page="page-tessa"]').scrollIntoViewIfNeeded();
    check(
      (await mobile
        .locator('[data-rg-page="page-tessa"] [data-rg-edge="rel:rel-tessa-goblins"]')
        .count()) === 0,
      "Secret line in the player's page graph",
    );
    const pagePanelSmall = await smallTargets(mobile);
    check(
      !pagePanelSmall.length,
      "Small targets on the page panel: " + JSON.stringify(pagePanelSmall),
    );
    await shot("b58-rf-05-phone-page-local-graph-en.png", mobile);
    passed.push(
      "I EN phone 390 (touch): «Graph» tapped, English labels, no overflow, targets ≥ 40 px, no secret; type chip tapped off/on; long press previews the guild without opening and brings the preview on screen; touch drag arranges it (stored); tap on Tessa opens her page with her local graph (no secret)",
    );

    // ---------------------------------------------------------------------------------
    // J. Review fixes on the desktop (IT, DM then player).
    await page.goto(base + "#campaign?tab=quests-archive&id=relations");
    await setRole("dm");
    await graphOn();
    await styled();
    // J1. Hover intent: a line clicked stays selected while the pointer crosses entries on
    // its way to «Rivela…»; resting on an entry previews it.
    const lineHit = page.locator('[data-rg-edge="rel:rel-tessa-goblins"] .rg-edge-hit');
    const lineMid = await lineHit.evaluate((path) => {
      path.scrollIntoView({ block: "center" });
      const point = path.getPointAtLength(path.getTotalLength() / 2);
      const m = path.getScreenCTM();
      return { x: point.x * m.a + m.e, y: point.y * m.d + m.f };
    });
    await page.mouse.move(lineMid.x, lineMid.y);
    await page.mouse.click(lineMid.x, lineMid.y);
    await page.locator("[data-rg-details] h3", { hasText: "paga in segreto" }).waitFor();
    const revealBox = await page.locator("[data-rg-reveal]").boundingBox();
    const crossed = [];
    await page.evaluate(() => {
      window.__rgCrossed = [];
      document
        .querySelectorAll("[data-rg-node]")
        .forEach((g) =>
          g.addEventListener("pointerenter", () => window.__rgCrossed.push(g.dataset.rgNode)),
        );
    });
    await page.mouse.move(revealBox.x + revealBox.width / 2, revealBox.y + revealBox.height / 2, {
      steps: 40,
    });
    crossed.push(...(await page.evaluate(() => window.__rgCrossed)));
    check(crossed.length > 0, "The path to «Rivela…» crosses no entry: the check proves nothing");
    check(
      (await page.locator("[data-rg-details] h3").innerText()).includes("paga in segreto") &&
        (await page.locator("[data-rg-reveal]").count()) === 1,
      "Crossing entries replaced the selected line (crossed " + crossed.join(", ") + ")",
    );
    await node("page:page-oben").hover();
    await page.locator("[data-rg-details] h3", { hasText: "Maestro Oben" }).waitFor();
    // J2. «Aggiungi relazione» without a valid preview starts on «Scegli una voce».
    await node("entry:legacy-recap-summary").hover();
    await page.locator("[data-rg-details] h3", { hasText: "Resoconto" }).waitFor();
    await page.locator("[data-rg-add]").click();
    check(
      (await page.locator('#dialog [name="from"]').inputValue()) === "" &&
        (await page.locator('#dialog [name="to"]').inputValue()) === "",
      "The add dialog preselected an entry",
    );
    const beforeBlank = (await relations()).length;
    await page.locator('#dialog [name="label"]').fill("vuota");
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForTimeout(200);
    check(
      (await page.locator("#dialog").evaluate((d) => d.open)) &&
        (await relations()).length === beforeBlank,
      "An empty endpoint was accepted",
    );
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("#dialog").open);
    // J3. An archive page carries its local graph: the DM sees the secret line there.
    await node("page:page-tessa").click();
    await page.locator("#jp-page-title", { hasText: "Tessa Varro" }).waitFor();
    const panel = page.locator('[data-rg-page="page-tessa"]');
    await panel.scrollIntoViewIfNeeded();
    check(
      (await panel.locator('[data-rg-edge="rel:rel-tessa-goblins"]').count()) === 1,
      "The DM's page graph lacks the secret line",
    );
    await shot("b58-rf-01-page-local-graph-dm-it.png");
    await panel.locator('[data-rg-node="page:page-varro"]').click();
    await page.locator("#jp-page-title", { hasText: "Casa Varro" }).waitFor();
    await page.goBack();
    await page.locator('[data-rg-page="page-tessa"] [data-rg-open-graph]').click();
    await graphOn();
    check(
      (await page.locator("[data-rg-focus]").inputValue()) === "page:page-tessa",
      "«Apri nel grafo» from the page did not centre Tessa",
    );
    await page.locator("[data-rg-unfocus]").click();
    await page.locator("[data-rg-depth]").waitFor({ state: "detached" });
    check(await noOverflow(), "Desktop overflow after the review checks");
    passed.push(
      `J Review: a clicked line stays selected while the pointer crosses ${crossed.length} entries on its way to «Rivela…», resting previews; «Aggiungi relazione» without a valid preview starts on «Scegli una voce» and refuses an empty end; Tessa's archive page shows her local graph (secret line for the DM), a click opens Casa Varro, «Apri nel grafo delle relazioni» centres her`,
    );
  } catch (error) {
    await page
      .screenshot({ path: shots + "b58-failure-desktop.png", fullPage: true })
      .catch(() => {});
    if (mobile)
      await mobile
        .screenshot({ path: shots + "b58-failure-phone.png", fullPage: true })
        .catch(() => {});
    return JSON.stringify({ ok: false, error: error.message, passed, errors, findings }, null, 2);
  }
  return JSON.stringify({ ok: errors.length === 0, passed, errors, findings }, null, 2);
}
