async (page) => {
  // B62: the log is the first sub-tab of the sidebar's «Chat» tab; the core's toggle
  // (data-table="log") is a hidden handle. As the old Registro tab: an open log closes with
  // its own ✕, otherwise the log opens (the Chat tab, then its Registro sub-tab if needed).
  const toggleLog = async (p, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const close = p.locator("#content [data-chat-close]");
    if (await close.count()) return press(close.first());
    if ((await p.locator("#table-sidebar-panel").getAttribute("data-table-panel")) === "log")
      return press(p.locator('.table-tabs [data-table-section="chat"]'));
    if (!(await p.locator('.table-subtabs [data-table-subtab="log"]').count())) {
      const chat = p.locator('.table-tabs [data-table-section="chat"]');
      if ((await chat.getAttribute("aria-selected")) !== "true") await press(chat);
    }
    if ((await p.locator("#table-sidebar-panel").getAttribute("data-table-panel")) !== "log")
      await press(p.locator('.table-subtabs [data-table-subtab="log"]'));
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
  // B62: area sheet tabs are sub-sections of D&D Beyond's sheet categories; the category
  // opens first, then the sub-section.
  const SHEET_CATEGORY = {
    projects: "extras",
    "party-bastion": "extras",
    "projects-track": "features",
    "home-levelup": "features",
    media: "story",
    "character-library-log": "notes",
    "character-library-revisions": "notes",
  };
  const openSheetTab = async (page, id, tap = false) => {
    const press = (l) => (tap ? l.tap() : l.click());
    const handle = () => page.locator(`[data-character-tab="${id}"]`).first();
    if (!(await handle().count()) && SHEET_CATEGORY[id])
      await press(page.locator(`.character-tabs [data-character-tab="${SHEET_CATEGORY[id]}"]`));
    await handle().waitFor();
    await press(handle());
  };
  // B30 — Home, first steps, help and what's new. Real clicks, keys and touch on the
  // integrated app; synthetic data only. Opens its own contexts (IT desktop 1440 with
  // Europe/Rome, EN phone 390 touch) and closes them. Group 9 uses an explicit,
  // labelled fixture (a person with nothing of their own); every other state comes from
  // visible UI commands. localStorage reads only assert consequences.
  const EVID = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B30/";
  const BASE = "http://127.0.0.1:8879/";
  const KEY = "d20-studio-blueprint-v1";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const browser = page.context().browser();
  const desk = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    timezoneId: "Europe/Rome",
    locale: "it-IT",
  });
  const p = await desk.newPage();
  p.on("pageerror", (e) => errors.push("desktop: " + e.message));
  const button = (name, root = p) => root.getByRole("button", { name, exact: true });
  const stored = (q = p) => q.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  // Personal bookkeeping (news read, tips, tours, first steps, reports): device book.
  const book = (q = p) =>
    q.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-home:v1") ?? "{}"));
  const inView = (locator, q = p) =>
    locator.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
    });
  const shot = (name, q = p, full = false) => q.screenshot({ path: EVID + name, fullPage: full });
  const as = async (role) => {
    await p.locator("#demo-role").selectOption(role);
    await p.waitForTimeout(150);
  };
  // The brand leads Home from every page, the Table included (its header has no nav).
  // P1 IN-07: for someone who already has a character and a campaign the first steps are a
  // folded line at the end of Home; open it before using a path or the example.
  const openStart = async (page = p, tap = false) => {
    const fold = page.locator("[data-home-start-folded]");
    if ((await fold.count()) && !(await fold.evaluate((d) => d.open))) {
      const summary = fold.locator("[data-home-start-summary]");
      await (tap ? summary.tap() : summary.click());
    }
  };
  const sample = async (status) => {
    await p.locator(`[data-home-sample="${status}"]`).waitFor({ state: "attached" });
    await openStart();
    await p.locator(`[data-home-sample="${status}"]`).waitFor();
  };
  const goHome = async () => {
    await p.locator(".app-header .brand").click();
    await p.locator("[data-home-page]").waitFor();
    await openStart();
  };
  const tab = async (name) => {
    await p.locator(`[data-home-tab="${name}"]`).click();
    await p.locator(`[data-home-panel="${name}"]:not([hidden])`).waitFor();
  };
  const romeDay = (days) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(Date.now() + days * 864e5));
  const nyDay = (days) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(Date.now() + days * 864e5));
  const waitRing = (selector) =>
    p.waitForFunction((sel) => {
      const ring = document.querySelector(".home-tour-ring");
      const target = [...document.querySelectorAll(sel)].find((el) => el.getClientRects().length);
      if (!ring || ring.hidden || !target) return false;
      const a = ring.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      return Math.abs(a.left - (b.left - 6)) < 2 && Math.abs(a.top - (b.top - 6)) < 2;
    }, selector);

  try {
    // ---------------------------------------------------------------- 1. first steps + Start here
    await p.goto(BASE + "#home");
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.getByRole("heading", { name: "La prossima avventura", level: 1 }).waitFor();
    check(
      !(await p.evaluate(() => document.querySelector("#dialog")?.open)),
      "A pop-up opened on arrival",
    );
    const start = p.locator("[data-home-start]");
    // P1 IN-07: a known player (a character and a campaign) finds the first steps folded
    // into one line at the end of the page; opening the line shows the three paths.
    await start
      .locator("[data-home-start-summary]", { hasText: "Da dove vuoi iniziare?" })
      .waitFor();
    check(
      await p.evaluate(() =>
        document.querySelector("[data-home-start]").hasAttribute("data-home-start-folded"),
      ),
      "First steps not folded for a known player",
    );
    await start.locator("[data-home-start-summary]").click();
    for (const name of ["Crea un personaggio", "Prova l’esempio"])
      await button(name, start).waitFor();
    // Review P3: the campaign path points to "Le tue campagne" (B13), which already shows
    // "Crea campagna" and "Ho un link d’invito" on this Home, instead of repeating them.
    await start.locator('[data-home-campaign-path="above"]').waitFor();
    check(
      (await p
        .locator("[data-home-page]")
        .getByRole("button", { name: /^Crea (una )?campagna$/ })
        .count()) === 1 &&
        (await p
          .locator("[data-home-page]")
          .getByRole("button", { name: /Ho un link d’invito|Entra con un invito/ })
          .count()) === 1,
      "Campaign creation or invite link repeated on Home",
    );
    check((await button("Entra al Tavolo").count()) === 1, "Core resume block lost or duplicated");
    // start.md / review: someone with a game finds it first; the three paths follow.
    const order = await p.evaluate(() => [
      document.querySelector(".resume-scene").getBoundingClientRect().top,
      document.querySelector(".home-bottom").getBoundingClientRect().top,
      document.querySelector("[data-home-start]").getBoundingClientRect().top,
    ]);
    check(order[0] < order[2] && order[1] < order[2], "First steps above the game: " + order);
    check(
      (await p.locator(".resume-scene").count()) === 1 &&
        (await p.locator(".home-bottom").count()) === 1,
      "Core home blocks lost",
    );
    await shot("01-home-first-steps.png");
    // Keyboard: focus the third path and press Enter.
    await button("Prova l’esempio").focus();
    await p.keyboard.press("Enter");
    await sample("ready");
    let state = await stored();
    const starter = state.ext.home.identities.player.starter;
    const note = state.campaignContent.entries.find((e) => e.id === starter.noteId);
    const tessa = state.actors[starter.actorId];
    check(
      note.ownerId === "player" && note.access.mode === "private" && !note.campaignId,
      "Note not private: " + JSON.stringify(note.access),
    );
    check(
      tessa.name === "Tessa (esempio)" &&
        tessa.visibility === "private" &&
        tessa.campaignIds.length === 0,
      "Practice sheet not private",
    );
    check(state.log.at(-1).visibility === "private", "Example audit entry is shared");
    await shot("02-start-here-ready.png");
    await button("Apri la nota «Inizia qui»").click();
    await p.getByRole("heading", { name: "Inizia qui", level: 1 }).waitFor();
    check(p.url().includes("#notes?tab=entry&id=" + starter.noteId), "Note route " + p.url());
    const noteText = await p.locator("#content").innerText();
    check(
      noteText.includes("Solo io") &&
        noteText.includes("Guida rapida") &&
        noteText.includes("Modello: appunti di sessione"),
      "Note content",
    );
    // Editable: the ordinary notes editor, one new revision, still private.
    await p.locator("[data-campaign-edit]").click();
    await p
      .locator('[data-campaign-path="data.body"]')
      .fill("La mia guida: prima la scheda di prova, poi il Tavolo.");
    await p.locator("[data-campaign-save]").click();
    await p.locator("[data-campaign-apply]").click();
    await p.getByRole("heading", { name: "Inizia qui", level: 1 }).waitFor();
    state = await stored();
    const edited = state.campaignContent.entries.find((e) => e.id === starter.noteId);
    check(
      edited.revisions.length === 2 && edited.access.mode === "private",
      "Edit did not add a private revision",
    );
    passed.push(
      "First steps: three paths (the campaign path points to 'Le tue campagne', no repeated buttons); keyboard 'Prova l’esempio' creates a private note (edited, 2 revisions) and a private authored practice sheet (level 1, Private in the library)",
    );
    await goHome();
    await openStart();
    await button("Apri la scheda di prova: Tessa (esempio)").click();
    await p.getByRole("heading", { name: "Tessa (esempio)", level: 1 }).waitFor();
    // Review P1/P2: an authored level 1 premade (never a copy of another identity's sheet),
    // Private in the Characters library, like the seed Iria (never "Solo campagna").
    state = await stored();
    const tessaSheet = state.actors[starter.actorId];
    check(
      tessaSheet.source?.kind === "authored-demo" &&
        tessaSheet.level === 1 &&
        tessaSheet.maxHp === 12 &&
        !tessaSheet.copiedFrom,
      "Practice sheet is not the authored premade: " + JSON.stringify(tessaSheet.source),
    );
    check(
      state.ext["character-library"]?.entries?.[starter.actorId]?.privacy === "private",
      "Practice sheet not Private in the library",
    );
    check(
      !(await p.locator("#content").innerText()).slice(0, 800).includes("Solo campagna"),
      "Practice sheet badge says Campaign only",
    );
    // Never shared: the DM finds neither the note nor the sheet.
    await as("dm");
    await p.goto(BASE + "#notes");
    await p.waitForTimeout(250);
    check(
      !(await p.locator("#content").innerText()).includes("Inizia qui"),
      "DM reads the player's Start here note",
    );
    await p.goto(BASE + "#characters");
    await p.waitForTimeout(250);
    check(
      !(await p.locator("#content").innerText()).includes("Tessa"),
      "DM sees the private practice sheet",
    );
    await goHome();
    check(
      (await p.locator("[data-home-sample]").getAttribute("data-home-sample")) === "new",
      "DM inherited the player's example",
    );
    await shot("03-dm-home.png");
    // DM example (Owlbear "Start Here" for GMs): a hidden practice scene, never shown to players.
    await openStart();
    await button("Prova l’esempio").click();
    await sample("ready");
    state = await stored();
    const dmStarter = state.ext.home.identities.dm.starter;
    const practice = state.scenes.find((s) => s.id === dmStarter.sceneId);
    check(
      practice?.name === "Inizia qui · scena di prova" &&
        practice.revealed === false &&
        state.activeSceneId === "old-watch",
      "DM practice scene",
    );
    // Owlbear GM Vault (VTL-003): a sample enemy on a token and a sample handout, not shown.
    const enemy = state.actors[dmStarter.npcId];
    check(
      enemy?.kind === "npc" &&
        enemy.name === "Goblin (esempio)" &&
        practice.tokens.length === 1 &&
        practice.tokens[0].actorId === dmStarter.npcId,
      "Sample enemy on a token: " + JSON.stringify(practice.tokens),
    );
    const handout = state.ext.handouts.materials.find((m) => m.id === dmStarter.handoutId);
    check(
      handout?.title === "Inizia qui · handout di prova" &&
        handout.access.mode === "none" &&
        handout.shows.length === 0,
      "Sample handout not private",
    );
    await button("Apri l’handout di prova a tutto schermo").click();
    await p.locator("#dialog [data-hs-viewer]").waitFor();
    check(
      (await p.locator("#dialog-title").innerText()) === "Inizia qui · handout di prova",
      "Handout viewer title",
    );
    await shot("03b-dm-sample-handout.png");
    await p.keyboard.press("Escape");
    await goHome();
    await button("Apri il nemico d’esempio: Goblin (esempio)").click();
    await p.getByRole("heading", { name: "Goblin (esempio)", level: 1 }).waitFor();
    await goHome();
    await button("Apri la scena di prova").click();
    await p.waitForURL(new RegExp("#preparation\\?id=" + dmStarter.sceneId));
    await as("player");
    await p.goto(BASE + "#campaign");
    await p.waitForTimeout(250);
    check(
      !(await p.locator("#content").innerText()).includes("scena di prova"),
      "Player sees the hidden practice scene",
    );
    await as("dm");
    await goHome();
    await button("Rimuovi l’esempio").click();
    await p.locator("#dialog").getByText("La scena di prova — verrà rimossa").waitFor();
    await p
      .locator("#dialog")
      .getByText("Il nemico d’esempio Goblin (esempio) — verrà rimosso")
      .waitFor();
    await p.locator("#dialog").getByText("L’handout di prova — verrà rimosso").waitFor();
    await p.locator("#dialog button[type=submit]").click();
    await sample("new");
    state = await stored();
    check(
      !state.scenes.some((s) => s.id === dmStarter.sceneId) &&
        !state.actors[dmStarter.npcId] &&
        !state.ext.handouts.materials.some((m) => m.id === dmStarter.handoutId),
      "Practice scene, enemy or handout not removed",
    );
    await as("player");
    await p.reload();
    await sample("ready");
    // Correction: remove the example with the consequences listed first. The note was
    // edited (revision 2): it is the player's own now and stays; the unused sheet goes.
    await button("Rimuovi l’esempio").click();
    await p
      .locator("#dialog")
      .getByText("La nota «Inizia qui» — resta: l’hai modificata tu")
      .waitFor();
    await p
      .locator("#dialog")
      .getByText("La scheda di prova Tessa (esempio) — verrà rimossa")
      .waitFor();
    await shot("03c-remove-keeps-edited.png");
    await p.locator("#dialog button[type=submit]").click();
    await sample("new");
    state = await stored();
    check(
      !state.actors[starter.actorId] &&
        state.campaignContent.entries.some((e) => e.id === starter.noteId),
      "Edited note deleted or sheet kept",
    );
    // Explicit close, reopened from Guides.
    await button("Nascondi i primi passi").click();
    await p.locator("[data-home-start]").waitFor({ state: "detached" });
    await p.reload();
    check(
      !(await p.locator("[data-home-start]").count()),
      "Hidden first steps came back on reload",
    );
    await tab("guides");
    await button("Mostra di nuovo i primi passi").click();
    await p.locator("[data-home-start]").waitFor();
    check(
      (await book()).identities?.player?.welcome === "open",
      "First steps not stored on the device book",
    );
    passed.push(
      "DM cannot read the note or sheet; the DM's example is a hidden practice scene with a sample goblin on a token and a private handout (viewer opens), removed again; 'Rimuovi l’esempio' keeps the edited note and removes the unused sheet; hide/reopen first steps survives reload",
    );

    // ---------------------------------------------------------------- 1b. gameplay Undo keeps the example (review P1)
    const liviaX = async () =>
      (await stored()).scenes
        .find((s) => s.id === "old-watch")
        .tokens.find((t) => t.actorId === "livia").x;
    const moveOnTable = async (actorId) => {
      await button("Entra al Tavolo").click();
      await p.locator("#battle-map").waitFor();
      if (actorId) await p.locator(`[data-actor="${actorId}"]`).click();
      await p.locator("#battle-map").focus();
      await p.keyboard.press("ArrowRight");
      await p.keyboard.press("Enter");
      await p.waitForTimeout(200);
    };
    const undoOnTable = async (actorId) => {
      await button("Entra al Tavolo").click();
      await p.locator("#battle-map").waitFor();
      if (actorId) await p.locator(`[data-actor="${actorId}"]`).click();
      await p.locator('[data-table="undo"]').click();
      await p.waitForTimeout(200);
    };
    // B62 (owner direction I-236): first-occurrence tips are off by default and help stays on
    // request. This journey checks the tips themselves, so each identity turns them on in
    // Aiuto › Tour e suggerimenti (the setting is personal).
    for (const who of ["dm", "player"]) {
      await as(who);
      await goHome();
      await tab("guides");
      const tipsBox = p.locator('[data-home-panel="guides"] [data-home-tips-enabled]');
      check(!(await tipsBox.isChecked()), `${who}: tips on by default`);
      await tipsBox.check();
      await p.waitForFunction(
        () =>
          document.querySelector('[data-home-panel="guides"] [data-home-tips-enabled]')?.checked,
      );
    }
    await goHome();
    const x0 = await liviaX();
    await moveOnTable();
    check((await liviaX()) !== x0, "Livia did not move");
    // First Table visit: the BG3 tip pops up beside the map tools, in view, and is archived.
    const tablePop = p.locator('.home-pop[data-home-pop="tip"][data-home-pop-id="table"]');
    await tablePop.locator("h2").waitFor();
    check(await inView(tablePop), "Table tip out of view");
    // Review P3 (BG3 card at the edge): a corner of the map that hides no token or control.
    await p.waitForTimeout(150);
    const covered = await tablePop.evaluate((pop) => {
      const r = pop.getBoundingClientRect();
      return [...document.querySelectorAll(".table-stage .map-token, .table-stage button")]
        .filter((el) => el.getClientRects().length)
        .filter((el) => {
          const b = el.getBoundingClientRect();
          return !(
            b.right <= r.left ||
            b.left >= r.right ||
            b.bottom <= r.top ||
            b.top >= r.bottom
          );
        })
        .map((el) => el.dataset.actor || el.textContent.trim().slice(0, 20));
    });
    check(!covered.length, "Table tip covers: " + covered.join(", "));
    check((await book()).identities.player.tips.table?.archivedAt, "Tip not archived when shown");
    await shot("08-table-tip.png");
    await button("Ho capito").click();
    await tablePop.waitFor({ state: "detached" });
    await goHome();
    await openStart();
    await button("Prova l’esempio").click();
    await sample("ready");
    const u1 = (await stored()).ext.home.identities.player.starter;
    await undoOnTable();
    state = await stored();
    check((await liviaX()) === x0, "Undo did not revert the move");
    check(
      state.actors[u1.actorId] &&
        state.ext.home.identities.player.starter?.actorId === u1.actorId &&
        state.campaignContent.entries.some((e) => e.id === u1.noteId),
      "Undo of an earlier action deleted the practice sheet",
    );
    await goHome();
    await button("Apri la scheda di prova: Tessa (esempio)").waitFor();
    // Reverse: move, remove the example, Undo → no orphan sheet, one example only.
    await moveOnTable();
    await goHome();
    await button("Rimuovi l’esempio").click();
    await p.locator("#dialog button[type=submit]").click();
    await sample("new");
    await undoOnTable();
    state = await stored();
    check((await liviaX()) === x0, "Second Undo did not revert the move");
    check(
      !state.actors[u1.actorId] && !state.ext.home.identities.player.starter,
      "Undo brought back a removed practice sheet",
    );
    await goHome();
    await sample("new");
    await p.locator("[data-nav=characters]").first().click();
    await p.waitForTimeout(250);
    check(!(await p.locator("#content").innerText()).includes("Tessa"), "Orphan Tessa listed");
    // DM: move a goblin, try the example (scene, enemy, handout), Undo → all stay.
    await as("dm");
    const goblinX = async () =>
      (await stored()).scenes
        .find((s) => s.id === "old-watch")
        .tokens.find((t) => t.actorId === "goblin-1").x;
    await goHome();
    const g0 = await goblinX();
    await moveOnTable("goblin-1");
    check((await goblinX()) !== g0, "Goblin did not move");
    await goHome();
    await openStart();
    await button("Prova l’esempio").click();
    await sample("ready");
    const u3 = (await stored()).ext.home.identities.dm.starter;
    await undoOnTable("goblin-1");
    state = await stored();
    check((await goblinX()) === g0, "DM Undo did not revert the goblin");
    check(
      state.scenes.some((s) => s.id === u3.sceneId) &&
        state.actors[u3.npcId] &&
        state.ext.handouts.materials.some((m) => m.id === u3.handoutId) &&
        state.ext.home.identities.dm.starter?.sceneId === u3.sceneId,
      "DM Undo dropped the practice scene, enemy or handout",
    );
    await goHome();
    await button("Rimuovi l’esempio").click();
    await p.locator("#dialog button[type=submit]").click();
    await sample("new");
    await as("player");
    passed.push(
      "Review P1: player move → example → Undo keeps Tessa, note and record; move → remove → Undo brings no orphan back; DM goblin move → example → Undo keeps scene, enemy and handout; Table tip pops up in a free corner of the map (no token or control covered), in view, archived when shown",
    );

    // ---------------------------------------------------------------- 1c. personal bookkeeping stays out of the game log (review P2)
    await goHome();
    const log0 = (await stored()).log.length;
    // Read three news items and mark them unread again (group 4 checks "mark all").
    for (let i = 0; i < 3; i++) {
      await p.locator(".home-news-item.is-unread [data-home-news-read]").first().click();
      await p.waitForTimeout(80);
    }
    for (let i = 0; i < 3; i++) {
      await p.locator(".home-news-item:not(.is-unread) [data-home-news-read]").first().click();
      await p.waitForTimeout(80);
    }
    await button("Nascondi i primi passi").click();
    await tab("guides");
    await button("Mostra di nuovo i primi passi").click();
    await button("Ripristina suggerimenti").click();
    await button("Ripristina tutti i tour").click();
    state = await stored();
    check(
      state.log.length === log0,
      "Personal bookkeeping wrote to the game log: " +
        state.log
          .slice(log0)
          .map((e) => e.label)
          .join(" | "),
    );
    await button("Entra al Tavolo").click();
    await p.locator("#battle-map").waitFor();
    await tablePop
      .locator("h2")
      .waitFor({ timeout: 3000 })
      .then(() => button("Ho capito").click())
      .catch(() => {});
    await toggleLog(p);
    await p.waitForTimeout(300);
    const logText = await p.locator(".table-log, .table-drawer").first().innerText();
    check(
      !/Novità letta|Novità da rileggere|Primi passi nascosti|Primi passi mostrati|Suggerimenti ripristinati|Tour ripristinati/.test(
        logText,
      ),
      "Bookkeeping lines in the session log: " + logText.slice(0, 300),
    );
    await toggleLog(p);
    await goHome();
    passed.push(
      "Review P2: news read ×3 and unread ×3, hide/show first steps, reset tips and tours → no new state.log line and nothing in the Table log",
    );

    // ---------------------------------------------------------------- 2. two campaigns, countdown
    await as("dm");
    await p.goto(BASE + "#campaign?tab=sessions");
    await p.getByRole("heading", { name: "Sessioni", exact: true, level: 1 }).waitFor();
    // Refreshed by the hand-off writer (29/09/2026): the example always has «Il sigillo della
    // torre» on the coming Thursday (sample-clock.mjs); it is cancelled so the session created
    // here is the next one.
    await p.locator('[data-campaign-cancel-session="session-sample-13"]').click();
    await p.locator('[data-campaign-path="data.reason"]').fill("Spostata al pozzo della torre");
    await p.locator("[data-campaign-save]").click();
    await p.locator("[data-campaign-apply]").click();
    await p.getByRole("heading", { name: "Sessioni", exact: true, level: 1 }).waitFor();
    await p.locator('[data-campaign-new-session="direct"]').click();
    await p.locator('[data-campaign-path="data.title"]').fill("Il pozzo della torre");
    await p.locator('[data-campaign-path="data.localTime"]').fill(romeDay(2) + "T21:00");
    await p.locator('[data-campaign-path="data.timeZone"]').fill("Europe/Rome");
    await p.locator("[data-campaign-save]").click();
    await p.locator("[data-campaign-apply]").click();
    await p.getByRole("heading", { name: "Sessioni", exact: true, level: 1 }).waitFor();
    await goHome();
    // One "create campaign" on Home: B13's in "Le tue campagne" (the first steps point there).
    await p
      .locator("[data-home-page]")
      .getByRole("button", { name: /^Crea (una )?campagna$/ })
      .click();
    await p.locator("#dialog [name=name]").waitFor();
    await p.locator("#dialog [name=name]").fill("Rovine di Vetro");
    await p.locator("#dialog [name=nextLocal]").fill(nyDay(5) + "T19:00");
    await p.locator("#dialog [name=timeZone]").fill("America/New_York");
    await p.locator("#dialog button[type=submit]").click();
    await p.waitForURL(/#campaigns/);
    await goHome();
    const appt = p.locator("[data-home-appointment]");
    const apptText = await appt.innerText();
    check(
      apptText.includes("Prossimo appuntamento") &&
        apptText.includes("Le lanterne di Bruma") &&
        apptText.includes("Il pozzo della torre"),
      "Next session: " + apptText,
    );
    check(/tra (1|2) giorn/.test(apptText), "Countdown missing: " + apptText);
    check(
      apptText.includes("21:00") &&
        apptText.includes("Europe/Rome") &&
        apptText.includes("(la tua ora)"),
      "Local time missing",
    );
    check(
      apptText.includes("Ora concordata nel tuo stesso fuso orario (Europe/Rome)"),
      "Agreed same-zone text missing",
    );
    const other = await appt.locator(".home-other-sessions li").innerText();
    check(
      other.includes("Rovine di Vetro") &&
        /tra (4|5) giorn/.test(other) &&
        other.includes("01:00") &&
        other.includes("concordata") &&
        other.includes("19:00") &&
        other.includes("America/New_York"),
      "Second campaign: " + other,
    );
    check(
      (await p.locator(".campaign-entry").first().innerText()).includes("21:00"),
      "First .campaign-entry is not the appointment",
    );
    await appt.scrollIntoViewIfNeeded();
    await shot("04-next-sessions-two-campaigns.png");
    await as("player");
    const playerAppt = await p.locator("[data-home-appointment]").innerText();
    check(
      playerAppt.includes("Le lanterne di Bruma") && !playerAppt.includes("Rovine di Vetro"),
      "Player sees a campaign they are not in",
    );
    passed.push(
      "Two campaigns: soonest session with countdown in local time (21:00 Europe/Rome) and the other campaign's 19:00 New York agreed time shown as 01:00 local; player sees only their campaign",
    );

    // ---------------------------------------------------------------- 3. level up + resume
    await as("dm");
    await button("Entra al Tavolo").click();
    await p.locator("#battle-map").waitFor();
    await openTablePanel(p, "loot"); // B62: Items › Loot
    await button("Assegna PE e monete").click();
    await p.locator("#dialog [name=xp]").fill("1800");
    await p.locator("#dialog input[name=mode][value=each]").check();
    await p.locator("#dialog input[name=recipient][value=doran]").uncheck();
    await p.locator("#dialog [name=reason]").fill("Goblin dell’osservatorio sconfitti");
    await p.locator("#dialog button[type=submit]").click();
    await p.waitForTimeout(250);
    await as("player");
    await goHome();
    const levelup = p.locator("[data-home-levelup]");
    const lvText = await levelup.innerText();
    check(
      lvText.includes("Mira può salire al livello 4") &&
        lvText.includes("Livia può salire al livello 4") &&
        lvText.includes("In coda"),
      "Level-up queue: " + lvText,
    );
    await levelup.scrollIntoViewIfNeeded();
    await shot("05-levelup-queue.png");
    await button("Avanza Mira al livello 4").click();
    await p.getByRole("heading", { name: "Avanza personaggio", level: 1 }).waitFor();
    await p.locator('[data-builder-section="class"]').first().click();
    await p.waitForURL(/tab=class/);
    await goHome();
    const work = p.locator("[data-home-work]");
    const workText = await work.innerText();
    check(
      workText.includes("Avanzamento di livello · Mira") &&
        workText.includes("Sezione: Classi e punti ferita"),
      "Work: " + workText,
    );
    check(
      (await levelup.innerText()).includes("avanzamento già in bozza"),
      "Queue does not show the draft",
    );
    await p.reload();
    await work.waitFor();
    await work.scrollIntoViewIfNeeded();
    await shot("06-resume-work.png");
    await button("Riprendi Avanzamento di livello · Mira").click();
    await p.waitForURL(/#builder\?id=.+&tab=class/);
    check(
      (await p.locator("[data-builder-section-title]").innerText()) === "Classi e punti ferita",
      "Resume opened another section",
    );
    await goHome();
    await button("Riprendi l’avanzamento di Mira").click();
    await p.waitForURL(/#builder\?id=.+&tab=class/);
    state = await stored();
    check(
      state.characterDrafts.filter((d) => d.actorId === "mira" && d.status === "active").length ===
        1,
      "Duplicate advance draft",
    );
    // BG3 Level Up for the whole queue (review P2): one entry, then the next is offered.
    await goHome();
    check((await levelup.innerText()).includes("Avanza tutti (2)"), "No 'Avanza tutti' entry");
    // The sheet keeps a persistent signal: a "Sali di livello" tab while the XP is there.
    await p.goto(BASE + "#characters?id=livia&tab=actions");
    await p.getByRole("heading", { name: "Livia", level: 1 }).waitFor();
    // B62: «Sali di livello» is a sub-section of Features & Traits (D&D Beyond's sheet).
    await openSheetTab(p, "home-levelup");
    await p.locator("[data-home-level-tab]").waitFor();
    check(
      (await p.locator("[data-home-level-tab]").innerText()).includes("Pronto per il livello 4"),
      "Sheet level tab",
    );
    await shot("05b-sheet-level-tab.png");
    await goHome();
    await button("Avanza tutti: 2 personaggi, uno dopo l’altro").click();
    await p.getByRole("heading", { name: "Avanza personaggio", level: 1 }).waitFor();
    const field = (path) => p.locator(`[data-builder-path="${path}"]`);
    await p.locator('.builder-sections [data-builder-section="class"]').click();
    await field("classes.0.level").fill("4");
    await button("Salva bozza").click();
    await field("hp.perLevel.4.method").selectOption("fixed");
    await button("Salva bozza").click();
    // SRD 5.2.1: level 4 grants a feat (Wizard table): Alert.
    await p.locator('.builder-sections [data-builder-section="features"]').click();
    await p.waitForURL(/tab=features/);
    await p.getByRole("checkbox", { name: "Allerta", exact: true }).check();
    await button("Salva bozza").click();
    await p.locator('.builder-sections [data-builder-section="review"]').click();
    await p.waitForURL(/tab=review/);
    await p.locator("[data-builder-apply]").waitFor();
    if (await p.locator("[data-builder-accept-incomplete]").count())
      await p.locator("[data-builder-accept-incomplete]").check();
    await button("Applica alla scheda").click();
    await p.getByRole("heading", { name: "Livia", level: 1 }).waitFor();
    state = await stored();
    check(state.actors.livia.level === 4, "Livia's advance not applied");
    const offer = p.locator('.home-pop[data-home-pop="levelup"]');
    await offer.locator("h2").waitFor();
    check(
      (await offer.innerText()).includes("Livia è al livello 4") && (await inView(offer)),
      "Next-in-queue offer: " + (await offer.innerText()),
    );
    // B62: the level-up entry is a sub-section of Features & Traits. Checked in a second tab
    // of the same browser (same stored data), so the queue's offer here stays open.
    const who = await p.locator("#demo-role").inputValue();
    const q = await p.context().newPage();
    await q.goto(BASE + "#characters?id=livia&tab=features");
    await q.locator("#demo-role").selectOption(who);
    await q.waitForFunction((v) => document.querySelector("#demo-role").value === v, who);
    await q
      .locator('.character-tabs [data-character-tab="features"][aria-current="page"]')
      .waitFor();
    const levelTab = q.locator('[data-character-tab="home-levelup"]');
    check(!(await levelTab.count()), "Level tab still shown after the advance");
    await q.close();
    await shot("05c-level-walk-next.png");
    await button("Avanza Mira").click();
    await p.waitForURL(/#builder\?id=.+&tab=class/);
    state = await stored();
    check(
      state.characterDrafts.filter((d) => d.actorId === "mira" && d.status === "active").length ===
        1,
      "The walk duplicated Mira's draft",
    );
    passed.push(
      "DM awards 1800 XP each (loot): 'Mira può salire al livello 4' queued with Livia → Avanza opens the private advance draft; Riprendi returns to 'Classi e punti ferita' after reload, no duplicate draft; sheet tab 'Sali di livello'; 'Avanza tutti' → Livia applied → pop-up offers Mira → her existing draft opens",
    );

    // ---------------------------------------------------------------- 3b. recent sheets (DDB widget)
    await p.goto(BASE + "#characters?id=mira&tab=actions");
    await p.getByRole("heading", { name: "Mira", level: 1 }).waitFor();
    await goHome();
    const recent = p.locator("[data-home-recent]");
    check((await recent.innerText()).includes("Mira"), "Recent sheet missing");
    check(!(await recent.innerText()).includes("Tessa"), "A removed sheet stays in recents");
    await button("Apri la scheda di Mira").click();
    await p.getByRole("heading", { name: "Mira", level: 1 }).waitFor();
    await as("dm");
    await goHome();
    check(
      !(await p.locator("[data-home-recent]").count()),
      "The DM sees the player's recent sheets",
    );
    await as("player");
    passed.push(
      "Quick access: a sheet opened on this device appears in 'Accesso rapido' and opens again; removed sheets drop out; the DM has its own list",
    );

    // ---------------------------------------------------------------- 4. what's new
    await goHome();
    const unread = async () =>
      Number(await p.locator("[data-home-unread]").getAttribute("data-home-unread"));
    const total = await unread();
    check(total >= 5, "Too few news: " + total);
    await p.locator(".home-aside").scrollIntoViewIfNeeded();
    await shot("07-whats-new.png");
    await button("Segna come letta: Inizio rinnovato").click();
    check((await unread()) === total - 1, "Mark as read did not count");
    check(
      (await p.locator('[data-home-tab="news"] .home-count').innerText()) === String(total - 1),
      "Tab count",
    );
    await button("Segna come non letta: Inizio rinnovato").click();
    check((await unread()) === total, "Correction to unread failed");
    const logBefore = (await stored()).log.length;
    await button("Segna tutte come lette").click();
    check((await unread()) === 0, "Mark all failed");
    check((await stored()).log.length === logBefore, "Mark all wrote to the game log");
    await p.reload();
    await p.locator("[data-home-unread]").waitFor();
    check((await unread()) === 0, "Read state lost on reload");
    // Keyboard tabs (WAI-ARIA): arrows and End.
    await p.locator('[data-home-tab="news"]').focus();
    await p.keyboard.press("ArrowRight");
    check(
      (await p.locator('[data-home-tab="guides"]').getAttribute("aria-selected")) === "true",
      "ArrowRight did not select Guide",
    );
    check(await p.locator('[data-home-panel="guides"]').isVisible(), "Guide panel hidden");
    await p.keyboard.press("End");
    check(
      (await p.evaluate(() => document.activeElement?.dataset.homeTab)) === "support",
      "End did not move focus",
    );
    await as("dm");
    check((await unread()) === total, "The DM's news were marked by the player");
    await as("player");
    passed.push(
      `What's new in a panel (no pop-up): ${total} unread → read/unread correction → all read, kept after reload; per identity; arrow keys between tabs`,
    );

    // ---------------------------------------------------------------- 5. help, tips, tours
    // BG3 tip: archived when it first appeared (group 1b), listed in Guides; reset brings it
    // back at the next occasion.
    await goHome();
    await tab("guides");
    check(
      (await p.locator('[data-home-tip-row="table"]').innerText()).includes("incontrato"),
      "Tip not in the Guides archive",
    );
    await button("Ripristina suggerimenti").click();
    await button("Entra al Tavolo").click();
    await p.locator("#battle-map").waitFor();
    const tableUrl = p.url();
    await tablePop.locator("h2").waitFor();
    check(await inView(tablePop), "Tip out of view after reset");
    await p.locator(".service-nav [data-service=home-help]").click();
    await p.locator("#dialog [data-home-help=table]").waitFor();
    check((await p.locator("#dialog-title").innerText()) === "Aiuto · Tavolo", "Help title");
    await shot("09-help-table.png");
    await button("Torna alla pagina").click();
    check(!(await p.evaluate(() => document.querySelector("#dialog").open)), "Help did not close");
    check(p.url() === tableUrl, "Help left the page");
    check(
      (await p.evaluate(() => document.activeElement?.dataset.service)) === "home-help",
      "Focus did not return to ?",
    );
    await p.locator("#content").focus();
    await p.keyboard.press("F1");
    await p.locator("#dialog [data-home-help=table]").waitFor();
    await p.keyboard.press("Escape");
    // Non-blocking: the map under the card still takes a keyboard move.
    await button("Ho capito").click();
    await tablePop.waitFor({ state: "detached" });
    // Sheet tip (was at the bottom of Actions, y≈1452): now beside the sheet header, in view.
    await p.goto(BASE + "#characters?id=livia&tab=actions");
    await p.getByRole("heading", { name: "Livia", level: 1 }).waitFor();
    const sheetPop = p.locator('.home-pop[data-home-pop="tip"][data-home-pop-id="sheet"]');
    await sheetPop.locator("h2").waitFor();
    check(await inView(sheetPop), "Sheet tip out of view");
    await shot("08b-sheet-tip.png");
    await button("Ho capito").click();
    await sheetPop.waitFor({ state: "detached" });
    // Area page help (review P2): built from what the area registers.
    await p.goto(BASE + "#community");
    await p.waitForTimeout(300);
    await p.locator(".service-nav [data-service=home-help]").click();
    await p.locator("#dialog [data-home-help=area]").waitFor();
    const areaHelp = await p.locator("#dialog [data-home-help]").innerText();
    check(
      !areaHelp.includes("descritti sui pulsanti stessi") &&
        /Comandi di quest’area|La trovi anche in|non aggiunge comandi/.test(areaHelp),
      "Area help: " + areaHelp.slice(0, 200),
    );
    await shot("09b-help-area.png");
    await p.keyboard.press("Escape");
    await goHome();
    await button("Entra al Tavolo").click();
    await p.locator("#battle-map").waitFor();
    passed.push(
      "'?' opens 'Aiuto · Tavolo' and returns to the same page with focus on '?'; F1 opens it; tips: archived in Guides at first sight, back after 'Ripristina suggerimenti' in view in a free corner of the map, 'Ho capito' closes; sheet tip in view beside the header; community help lists the area's commands/places",
    );
    // Foundry tour: real controls highlighted, progress kept on close, resumed, completed, reset.
    await p.locator(".service-nav [data-service=home-help]").click();
    await button("Avvia il tour «Il Tavolo»").click();
    await p.locator('.home-tour[data-step="0"]').waitFor();
    await waitRing("#battle-map");
    check(
      (await p.locator(".home-tour-count").innerText()).includes("Passo 1 di 6"),
      "Step counter",
    );
    await button("Avanti").click();
    await p.locator('.home-tour[data-step="1"]').waitFor();
    await waitRing(".map-toolbar");
    await shot("10-tour-table.png");
    await p.keyboard.press("Escape");
    await p.locator(".home-tour").waitFor({ state: "detached" });
    await p.locator("#toast", { hasText: "Tour in pausa al passo 2" }).waitFor();
    // Review P3: the keyboard goes back to "?", where this tour was started.
    check(
      (await p.evaluate(() => document.activeElement?.dataset.service)) === "home-help",
      "Focus after Escape: " +
        (await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 80))),
    );
    await goHome();
    await tab("guides");
    check(
      (await p.locator('[data-home-tour-row="table"]').innerText()).includes(
        "In pausa al passo 2 di 6",
      ),
      "Paused progress not shown",
    );
    await button("Riprendi il tour Il Tavolo").click();
    await p.locator('.home-tour[data-step="1"]').waitFor();
    check(p.url().includes("#table"), "Resume did not go to the Table");
    for (const step of [2, 3, 4, 5]) {
      await button("Avanti").click();
      await p.locator(`.home-tour[data-step="${step}"]`).waitFor();
    }
    await waitRing('.table-tabs [data-table-section="chat"]'); // B62: the Chat tab
    await button("Fine del tour").click();
    await p.locator(".home-tour").waitFor({ state: "detached" });
    check(
      (await p.evaluate(() => document.activeElement?.tagName)) !== "BODY",
      "Focus fell to the page body after 'Fine del tour'",
    );
    check((await book()).identities.player.tours.table.status === "done", "Tour not completed");
    await goHome();
    await tab("guides");
    check(
      (await p.locator('[data-home-tour-row="table"]').innerText()).includes("Completato"),
      "Completed not shown",
    );
    await button("Ripristina tutti i tour").click();
    await tab("guides");
    check(
      (await p.locator('[data-home-tour-row="table"]').innerText()).includes("6 passi"),
      "Tours not reset",
    );
    await p.locator(".home-aside").scrollIntoViewIfNeeded();
    await shot("10b-guides-panel.png");
    passed.push(
      "Tour 'Il Tavolo': ring on #battle-map then .map-toolbar, Escape pauses at step 2 with focus back on '?', Guides resumes at step 2, finish (focus kept on a control) → Completato, 'Ripristina tutti i tour'",
    );

    // ---------------------------------------------------------------- 6. support
    await tab("support");
    check(await p.locator('[data-home-status="ok"]').isVisible(), "Status not ok online");
    await shot("10c-support-panel.png");
    await p.locator('.service-nav [data-service="preferences"]').click();
    await p.locator("#dialog [name=offline]").check();
    await button("Salva preferenze").click();
    await tab("support");
    await p.locator('[data-home-status="warn"]').waitFor();
    check(
      (await p.locator('[data-home-status-row="sync"]').innerText()).includes("Senza rete"),
      "Offline not reflected",
    );
    await button("Diagnostica").click();
    await p.locator("#dialog [data-home-diagnostics]").waitFor();
    check(
      (await p.locator('#dialog [data-home-fact="network"]').innerText()) === "Senza rete",
      "Diagnostics network",
    );
    check(
      (await p.locator('#dialog [data-home-fact="storage"]').innerText()).includes("byte usati"),
      "Diagnostics storage",
    );
    check(
      /^1 · \d+ sezioni delle aree$/.test(
        await p.locator('#dialog [data-home-fact="data"]').innerText(),
      ),
      "Diagnostics data version",
    );
    await shot("11-diagnostics.png");
    await button("Segnala un problema", p.locator("#dialog")).click();
    await p.locator("#dialog [data-home-report-form]").waitFor();
    check(
      (await p.locator("#dialog [data-home-report-form] p").first().innerText()).startsWith(
        "Pagina: Inizio.",
      ),
      "Report intro shows the page id",
    );
    await p
      .locator("#dialog [name=what]")
      .fill(
        "Scrivimi a giocatore@example.test o al +39 333 123 4567: il tour non trova il registro dal 2026-09-24, PF 12 18 22 30",
      );
    const preview = p.locator("#dialog [data-home-report-preview]");
    await p.waitForFunction(() =>
      document
        .querySelector("#dialog [data-home-report-preview]")
        ?.textContent.includes("[email rimossa]"),
    );
    const previewText = await preview.innerText();
    check(
      previewText.includes("[numero rimosso]") &&
        previewText.includes("network (simulated): offline") &&
        !previewText.includes("giocatore@example.test") &&
        previewText.includes("dal 2026-09-24, PF 12 18 22 30"),
      "Preview: " + previewText,
    );
    await shot("12-report-preview.png");
    await p.locator("#dialog button[type=submit]").click();
    await p.locator("#toast", { hasText: "Segnalazione pronta" }).waitFor();
    await p.goto(BASE + "#home?tab=support");
    await p.reload();
    await p.locator("[data-home-report]").waitFor();
    check((await p.locator("[data-home-report]").count()) === 1, "Report not kept");
    await p.locator("[data-home-report-delete]").click();
    await p.locator("[data-home-report]").waitFor({ state: "detached" });
    await p.locator('.service-nav [data-service="preferences"]').click();
    await p.locator("#dialog [name=offline]").uncheck();
    await button("Salva preferenze").click();
    await tab("support");
    await button("Android").click();
    check(
      (await p.locator(".home-steps").innerText()).includes("⋮") &&
        (await button("Android").getAttribute("aria-pressed")) === "true",
      "Android steps",
    );
    await button("iPhone e iPad").click();
    check(
      (await p.locator(".home-steps").innerText()).includes("Aggiungi alla schermata Home"),
      "iOS steps",
    );
    await button("Computer").click();
    // P1 (installable app): the app now ships a manifest and a service worker, so the
    // Computer steps name the real install command and the note says what installing gives.
    check(
      (await p.locator(".home-steps").innerText()).includes("Installa l’app") &&
        (await p.locator("[data-home-install-note]").innerText()).includes(
          "si installa come un’app",
        ) &&
        (await p.evaluate(() => Boolean(document.querySelector('link[rel="manifest"]')))),
      "Install steps do not match the installable app",
    );
    // Feature previews (opt-in): news in the bell, compact Home.
    await tab("news");
    await button("Segna come non letta: Inizio rinnovato").click();
    const bell = async () =>
      Number(
        (
          (await p.locator('.service-nav [data-service="requests"]').getAttribute("aria-label")) ??
          ""
        ).match(/(\d+) notific/)?.[1] ?? 0,
      );
    const before = await bell();
    await tab("support");
    await p.locator('[data-home-preview="news-bell"]').check();
    await p.waitForTimeout(200);
    check(
      (await bell()) === before + 1,
      `Preview did not add the unread news to the bell (${before} → ${await bell()})`,
    );
    // One read state (review P3): opening the news from the bell reads it on Home too.
    await p.locator('.service-nav [data-service="requests"]').click();
    await p.locator('#dialog [data-notifications-open$="news:2026-09-24-home"]').click();
    await p.waitForURL(/#home\?tab=news/);
    await p.locator('[data-home-news="2026-09-24-home"]').waitFor();
    check(
      !(await p.locator('[data-home-news="2026-09-24-home"]').getAttribute("class")).includes(
        "is-unread",
      ) && (await bell()) === before,
      "News opened from the bell is still unread on Home",
    );
    // Review P2: a route naming a panel wins over a panel clicked earlier (Home → Home).
    await tab("support");
    await p.locator(".service-nav [data-service=home-help]").click();
    await button("Tour e suggerimenti", p.locator("#dialog")).click();
    await p.locator('[data-home-panel="guides"]:not([hidden])').waitFor();
    // Review P2: an older news item from the bell opens "Novità precedenti" and takes focus.
    await tab("news");
    await p.locator("[data-home-news-older]").click();
    await button("Segna come non letta: Il Tavolo: movimento, attacchi e reazioni").click();
    await p.locator("[data-home-news-older]").click();
    await p.goto(BASE + "#characters");
    await p.waitForTimeout(200);
    await p.locator('.service-nav [data-service="requests"]').click();
    await p.locator('#dialog [data-notifications-open$="news:2026-09-20-table"]').click();
    const olderItem = p.locator('[data-home-news="2026-09-20-table"]');
    await olderItem.waitFor({ state: "visible" });
    const olderFocus = await p.evaluate(() => ({
      active: document.activeElement?.outerHTML.slice(0, 90),
      rect: document
        .querySelector('[data-home-news="2026-09-20-table"]')
        ?.getBoundingClientRect()
        .toJSON(),
      y: scrollY,
    }));
    check(
      (await inView(olderItem)) && /data-home-news="2026-09-20-table"/.test(olderFocus.active),
      "Older news item not revealed and focused: " + JSON.stringify(olderFocus),
    );
    await tab("support");
    await p.locator('[data-home-preview="compact"]').check();
    await p.locator(".home-compact").waitFor();
    await tab("support");
    await p.locator('[data-home-preview="compact"]').uncheck();
    await tab("support");
    await p.locator('[data-home-preview="news-bell"]').uncheck();
    await p.waitForTimeout(150);
    check((await bell()) === before, "Preview off did not restore the bell");
    passed.push(
      "Support: status ok → offline warn; diagnostics (storage bytes, simulated network, data version); report intro names the page, works offline, scrubs e-mail/phone but keeps dates and game numbers, kept after reload, deleted; install steps match the installable app (manifest, «Installa l’app»); opt-in previews change the bell and the layout; a news item opened from the bell is read on Home, also from Home › Supporto; an older one opens 'Novità precedenti' focused; '?' › 'Tour e suggerimenti' from Home › Supporto shows Guide",
    );

    // ---------------------------------------------------------------- 7. EN phone 390, touch
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      timezoneId: "Europe/Rome",
      locale: "en-GB",
    });
    const m = await phone.newPage();
    m.on("pageerror", (e) => errors.push("phone: " + e.message));
    const mb = (name) => m.getByRole("button", { name, exact: true });
    await m.goto(BASE + "#home");
    await m.locator("[data-home-page]").waitFor();
    await m.locator('.service-nav [data-service="preferences"]').tap();
    await m.locator("#dialog select[name=lang]").selectOption("en");
    await mb("Salva preferenze").tap();
    await m.getByRole("heading", { name: "Your next adventure", level: 1 }).waitFor();
    // Review P2: on a phone the game comes first ("Enter table" in the first screen).
    const enterBox = await mb("Enter table").boundingBox();
    check(enterBox && enterBox.y + enterBox.height <= 844, "Enter table below the first screen");
    await openStart(m, true);
    await mb("Try the example").tap();
    await m.locator('[data-home-sample="ready"]').waitFor();
    check(
      (await m.locator('[data-home-sample="ready"] h3').innerText()) === "“Start here” is ready",
      "EN ready title",
    );
    const phoneState = await stored(m);
    const phoneNote = phoneState.campaignContent.entries.find(
      (e) => e.id === phoneState.ext.home.identities.player.starter.noteId,
    );
    check(phoneNote.revisions[0].data.title === "Start here", "EN note title");
    await shot("13-phone-en-home.png", m, true);
    await m.locator('[data-home-tab="guides"]').tap();
    // B62: tips are off by default; the phone identity turns them on for the Table tip below.
    const phoneTips = m.locator('[data-home-panel="guides"] [data-home-tips-enabled]');
    check(!(await phoneTips.isChecked()), "phone: tips on by default");
    await phoneTips.tap();
    await m.waitForFunction(
      () => document.querySelector('[data-home-panel="guides"] [data-home-tips-enabled]')?.checked,
    );
    await mb("Start the Home tour").tap();
    await m.locator(".home-tour.is-docked").waitFor();
    const dock = await m.locator(".home-tour").boundingBox();
    check(
      dock.x >= 11 && dock.x + dock.width <= 379 && dock.y + dock.height <= 844,
      "Docked tour off screen: " + JSON.stringify(dock),
    );
    await shot("14-phone-en-tour.png", m);
    await mb("Next").tap();
    await m.locator('.home-tour[data-step="1"]').waitFor();
    await m.getByRole("button", { name: "Close the tour" }).tap();
    await m.locator(".home-tour").waitFor({ state: "detached" });
    await m.locator('.service-nav [data-service="home-help"]').tap();
    check((await m.locator("#dialog-title").innerText()) === "Help · Home", "EN help title");
    await mb("Back to the page").tap();
    const layout = await m.evaluate(() => {
      const small = [
        ...document.querySelectorAll(
          "[data-home-page] button, [data-home-page] label.check-field, .service-nav button",
        ),
      ]
        .filter((el) => el.getClientRects().length && !el.closest("[hidden]"))
        .map((el) => [
          el.textContent.trim().slice(0, 30),
          Math.round(el.getBoundingClientRect().width),
          Math.round(el.getBoundingClientRect().height),
        ])
        .filter(([, w, h]) => w < 40 || h < 40);
      return { overflow: document.documentElement.scrollWidth - innerWidth, small };
    });
    check(layout.overflow <= 0, "Horizontal overflow at 390: " + layout.overflow);
    check(!layout.small.length, "Targets under 40 px: " + JSON.stringify(layout.small));
    // The Table tip on a phone: docked at the bottom, in view, 40 px buttons, no overflow.
    await mb("Enter table").tap();
    await m.locator("#battle-map").waitFor();
    const phonePop = m.locator('.home-pop[data-home-pop="tip"]');
    await phonePop.locator("h2").waitFor();
    // B61: at the Table the phone tip is a one-row bar docked above the action bar that
    // leaves the map uncovered; its other actions show after "Read" (hidden ones are not
    // targets, so only visible buttons are measured).
    await m.waitForTimeout(150);
    const popLayout = await phonePop.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const map = document.querySelector("#battle-map").getBoundingClientRect();
      return {
        docked: el.classList.contains("is-docked"),
        inView: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && r.top >= 0,
        small: [...el.querySelectorAll("button")]
          .filter((b) => b.getClientRects().length)
          .filter((b) => b.getBoundingClientRect().height < 40).length,
        overMap: Math.max(0, Math.min(r.bottom, map.bottom) - Math.max(r.top, map.top)),
        overflow: document.documentElement.scrollWidth - innerWidth,
        title: el.querySelector("h2").textContent,
      };
    });
    check(
      popLayout.docked &&
        popLayout.inView &&
        !popLayout.small &&
        popLayout.overMap === 0 &&
        popLayout.overflow <= 0 &&
        popLayout.title === "The Table",
      "Phone tip: " + JSON.stringify(popLayout),
    );
    await shot("14b-phone-en-table-tip.png", m);
    await mb("Got it").tap();
    await phonePop.waitFor({ state: "detached" });
    await phone.close();
    passed.push(
      "EN phone 390 touch: 'Enter table' in the first screen; English Home, 'Try the example', Guides tab, docked tour Next/Close, Help · Home; no overflow, all targets ≥ 40 px; Table tip docked in view, 'Got it' closes it",
    );

    // ---------------------------------------------------------------- 8. reload + role isolation
    await p.goto(BASE + "#home");
    await p.reload();
    await p.locator("[data-home-page]").waitFor();
    state = await stored();
    const deviceBook = await book();
    check(
      deviceBook.identities.player.welcome === "open" && !state.ext.home.identities.player.starter,
      "Player record changed unexpectedly",
    );
    check(!deviceBook.identities.dm?.reports?.length, "DM record holds player data");
    check(
      Object.keys(state.ext.home.identities.player).sort().join() === "removed,starter",
      "Personal bookkeeping in the game state",
    );

    // ---------------------------------------------------------------- 9. new identity (explicit fixture)
    // From a clean example (review P2): earlier groups leave the player notes and drafts.
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.locator("[data-home-page]").waitFor();
    await p.evaluate((k) => {
      // Explicit fixture, not a product path: the player owns nothing and is in no campaign.
      const s = JSON.parse(localStorage.getItem(k));
      for (const a of Object.values(s.actors)) if (a.owner === "player") a.owner = "dm";
      s.campaign.members = [{ id: "dm", name: "DM", role: "dm", canOrganize: true }];
      for (const d of s.characterDrafts ?? []) if (d.owner === "player") d.status = "discarded";
      localStorage.setItem(k, JSON.stringify(s));
    }, KEY);
    await p.reload();
    await p.locator('[data-home-page][data-fresh="true"]').waitFor();
    await p.getByRole("heading", { name: "Benvenuto in d20 Studio" }).waitFor();
    check(
      !(await button("Nascondi i primi passi").count()),
      "A new identity can hide its only paths",
    );
    check(
      (await p.locator("#content").innerText()).includes("Nessuna campagna accessibile"),
      "Core empty state lost",
    );
    check(
      await p.evaluate(
        () =>
          document.querySelector("[data-home-start]").getBoundingClientRect().top <
          document.querySelector(".home-layout").getBoundingClientRect().top,
      ),
      "A new identity's three paths are not first",
    );
    await shot("15-new-identity.png");
    await button("Prova l’esempio").click();
    await sample("ready");
    await button("Personaggi").first().click();
    await p.waitForTimeout(250);
    check(
      (await p.locator("#content").innerText()).includes("Tessa (esempio)"),
      "Practice sheet not in Characters",
    );
    passed.push(
      "New identity (explicit fixture): 'Benvenuto in d20 Studio' with three paths and no close; the example gives a private sheet listed in Characters",
    );
  } catch (error) {
    await shot("zz-failure.png").catch(() => {});
    throw Error(
      `${error.message}\nat ${p.url()}\npassed: ${passed.length}\nerrors: ${errors.join(" | ")}`,
    );
  } finally {
    await p.evaluate((k) => localStorage.removeItem(k), KEY).catch(() => {});
    await desk.close();
  }
  return { passed, errors };
};
