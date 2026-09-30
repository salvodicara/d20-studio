async (rootPage) => {
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
  // B21 — Characters: list, privacy, copy, export and sharing. Real clicks, keys and taps on
  // the one app: IT desktop 1440 (player and DM), EN phone 390 with touch, reload
  // persistence, Undo and corrections, DM vs player views. Synthetic data only; resets this
  // browser's demo state. Fixture files are written into the evidence directory.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B21/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  const notes = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const lib = async () => (await stored()).ext["character-library"];
  const actorNamed = async (name) =>
    Object.values((await stored()).actors).find((actor) => actor.name === name);
  const button = (name) => page.getByRole("button", { name, exact: true });
  const dialog = page.locator("#dialog");
  const submit = () => dialog.locator('button[type="submit"]').click();
  const card = (id) => page.locator(`[data-clib-card="${id}"]`);
  const cardNamed = (name) =>
    page
      .locator("[data-clib-card]")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
  const visibleCards = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("[data-clib-card]")]
        .filter((el) => !el.hidden)
        .map((el) => el.querySelector("h3").textContent),
    );
  const noOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const shot = async (name, target = page) => {
    await target.evaluate(() => document.querySelector("#toast")?.classList.remove("shown"));
    await target.screenshot({ path: dir + name + ".png" });
  };
  const toast = async (pattern, target = page) => {
    await target.waitForFunction(
      (source) => new RegExp(source).test(document.querySelector("#toast")?.textContent ?? ""),
      pattern.source,
    );
    return target.locator("#toast").innerText();
  };
  const role = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForTimeout(80);
  };
  const openLibrary = async () => {
    await page.locator('.app-header nav [data-nav="characters"]').click();
    await page.locator("[data-clib-page]").waitFor();
  };
  const manage = async (name) => {
    await page.getByRole("button", { name: `Gestisci ${name}`, exact: true }).click();
    await dialog.locator("[data-clib-manage]").waitFor();
  };
  // The run-code sandbox has no Buffer or fs: bytes are read as a latin1 string and
  // fixture files are written through a real browser download (saveAs).
  const readDownload = async (download) => {
    const stream = await download.createReadStream();
    let latin1 = "";
    for await (const chunk of stream)
      for (let i = 0; i < chunk.length; i += 1) latin1 += String.fromCharCode(chunk[i]);
    return { latin1, utf8: () => decodeURIComponent(escape(latin1)) };
  };
  const writeFixture = async (name, text) => {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.evaluate(
        ([fileName, content]) => {
          const anchor = document.createElement("a");
          anchor.href = URL.createObjectURL(new Blob([content], { type: "application/json" }));
          anchor.download = fileName;
          document.body.append(anchor);
          anchor.click();
          anchor.remove();
        },
        [name, text],
      ),
    ]);
    await download.saveAs(dir + name);
    return dir + name;
  };

  try {
    // 0. Reset through the visible control; Characters is one click from Home.
    await page.goto(base);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("heading", { name: "La prossima avventura", level: 1 }).waitFor();
    await button("Ripristina esempio").click();
    await button("Ripristina").click();
    await openLibrary();
    check(
      JSON.stringify(await visibleCards()) === JSON.stringify(["Iria", "Mira", "Livia", "Doran"]),
      "initial order (created, newest first): " + (await visibleCards()),
    );
    check(
      (await card("iria").innerText()).includes("Solo nella libreria"),
      "Iria is a library-only sheet",
    );
    passed.push("Personaggi reached from the main navigation; Iria is in the library only");

    // 1a. Real-time search "mago", then sort by level, persisted per device across reload.
    const search = page.locator("[data-clib-search]");
    await search.click();
    await page.keyboard.type("mago");
    check(
      JSON.stringify(await visibleCards()) === JSON.stringify(["Iria", "Livia"]),
      "search mago: " + (await visibleCards()),
    );
    check(
      (await page.locator("[data-clib-count]").innerText()) === "2 di 4 schede",
      "count after search",
    );
    await shot("list-search-mago-it-1440");
    await search.fill("");
    await search.press("Enter");
    const sort = page.locator("[data-clib-sort]");
    await sort.selectOption("level-desc");
    await page.waitForFunction(() => document.activeElement?.matches("[data-clib-sort]"));
    check((await visibleCards())[0] === "Iria", "level sort puts Iria (5) first");
    await page.reload();
    await page.locator("[data-clib-page]").waitFor();
    check((await sort.inputValue()) === "level-desc", "sort kept after reload");
    check(
      JSON.stringify(await visibleCards()) === JSON.stringify(["Iria", "Livia", "Mira", "Doran"]),
      "level order after reload: " + (await visibleCards()),
    );
    await shot("list-sorted-by-level-it-1440");
    passed.push(
      'Search "mago" finds Iria and Livia (class name); sort "Livello" keeps focus and survives reload',
    );

    // 1b. Copy Iria: independent sheet; Undo from the notice; copy again.
    await page.getByRole("button", { name: "Copia Iria", exact: true }).click();
    await dialog.getByRole("heading", { name: "Copia Iria" }).waitFor();
    check((await dialog.locator("[name=name]").inputValue()) === "Iria (copia)", "copy name");
    await submit();
    await page.locator("[data-clib-notice]").getByText("Copia creata").waitFor();
    check(await cardNamed("Iria (copia)").count(), "copy card listed");
    await page.locator("[data-clib-notice]").getByRole("button", { name: "Annulla" }).click();
    await toast(/Modifica annullata/);
    check(!(await cardNamed("Iria (copia)").count()), "Undo removed the copy");
    await page.getByRole("button", { name: "Copia Iria", exact: true }).click();
    await submit();
    await page.locator("[data-clib-notice]").getByText("Copia creata").waitFor();
    await shot("copy-created-notice-it-1440");
    const copy = await actorNamed("Iria (copia)");
    check(copy && copy.id !== "iria" && copy.copiedFrom?.actorId === "iria", "independent copy");
    check(copy.visibility === "private" && copy.campaignIds.length === 0, "copy is personal");
    // Independence: a log entry on the copy never reaches Iria.
    await page
      .locator("[data-clib-notice]")
      .getByRole("button", { name: "Apri la scheda" })
      .click();
    await page.getByRole("heading", { name: "Iria (copia)", level: 1 }).waitFor();
    await openSheetTab(page, "character-library-log"); // B62: Notes › Log
    await page.locator("[data-clib-log]").waitFor();
    await page.locator("[data-clib-log-add]").click();
    await dialog.locator("[name=title]").fill("Solo sulla copia");
    await dialog.locator("[name=gold]").fill("12");
    await submit();
    await page.locator("[data-clib-tab-notice]").getByText("Voce aggiunta").waitFor();
    check((await lib()).logs[copy.id].length === 2, "copy log has its own entry");
    check((await lib()).logs.iria.length === 1, "Iria's log untouched");
    passed.push(
      "Copy of Iria is an independent personal sheet; Undo from the notice; log proves independence",
    );

    // 1c. Delete with confirmation → trash → reload → restore from the trash.
    await page.locator(".character-breadcrumb [data-character-action=collection]").click();
    await page.locator("[data-clib-page]").waitFor();
    await page.getByRole("button", { name: "Elimina Iria (copia)", exact: true }).click();
    await dialog.getByRole("heading", { name: "Eliminare Iria (copia)?" }).waitFor();
    check((await dialog.innerText()).includes("Cestino"), "confirmation explains the trash");
    await shot("delete-confirm-it-1440");
    await submit();
    await page.locator("[data-clib-notice]").getByText("è nel cestino").waitFor();
    check(!(await cardNamed("Iria (copia)").count()), "deleted card removed");
    await page.reload();
    await page.locator("[data-clib-trash]").waitFor();
    await page.locator("[data-clib-trash] summary").click();
    check(
      (await page.locator("[data-clib-trash]").innerText()).includes("Iria (copia)"),
      "trash lists the sheet after reload",
    );
    await shot("trash-open-it-1440");
    await page.locator("[data-clib-trash]").getByRole("button", { name: "Ripristina" }).click();
    await toast(/Scheda ripristinata/);
    check(await cardNamed("Iria (copia)").count(), "restored card back");
    check((await lib()).logs[copy.id].length === 2, "restored with its log");
    passed.push(
      "Delete asks confirmation, moves to the trash (kept on reload), restore brings it back",
    );

    // 2. Privacy: Livia "player and DM only" — other players see only a summary (proved with
    // roles swapped in character-library-review-journey.js); the DM still reads the sheet.
    // A private plan first (Extra), to prove it never leaves the owner.
    await card("livia").getByRole("button", { name: "Apri scheda", exact: true }).click();
    await page.getByRole("heading", { name: "Livia", level: 1 }).waitFor();
    await page.locator('[data-character-tab="extras"]').click();
    await page.getByRole("button", { name: "Modifica piano" }).click();
    await dialog.locator("textarea[name=text]").fill("Piano segreto: tradire la gilda");
    await submit();
    await page.waitForFunction(() => !document.querySelector("#dialog").open);
    check(
      (await stored()).actors.livia.personalPlans?.player?.startsWith("Piano segreto"),
      "private plan saved",
    );
    await page.getByRole("button", { name: "Gestisci personaggio" }).click();
    await dialog.locator('[data-clib-act="privacy"]').click();
    await dialog.locator("[data-clib-audience]").waitFor();
    await dialog.getByText("Solo giocatore e DM", { exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector('#dialog [data-audience="players"]')?.dataset.access === "summary",
    );
    const preview = await dialog.locator("[data-clib-audience-preview]").innerText();
    check(preview.includes("Livia") && !/PF|\d+\s*\/\s*\d+/.test(preview), "summary preview only");
    check(
      (await dialog.locator('[data-audience="players"]').innerText()).includes("Doran"),
      "audience names Doran's player",
    );
    await shot("privacy-private-audience-it-1440");
    await submit();
    await toast(/Privacy aggiornata/);
    check(
      (await page.locator(".clib-sheet-bar").innerText()).includes("Solo giocatore e DM"),
      "badge on sheet",
    );
    check((await lib()).entries.livia.privacy === "private", "stored privacy");
    await role("dm");
    await openLibrary();
    check(await card("livia").count(), "DM still lists private Livia (DM always sees)");
    check(!(await card("iria").count()), "DM never lists the personal Iria");
    await card("livia").getByRole("button", { name: "Apri scheda", exact: true }).click();
    await page.getByRole("heading", { name: "Livia", level: 1 }).waitFor();
    check(
      !(await page.getByRole("button", { name: "Gestisci personaggio" }).count()),
      "Manage (privacy, files, copy) is the owner's (DDB Manage)",
    );
    check(
      (await page.locator(".clib-sheet-bar").innerText()).includes("Solo giocatore e DM"),
      "the DM sees the level on the sheet",
    );
    await shot("dm-sheet-private-livia-it-1440");
    await role("player");
    passed.push(
      "Livia 'Solo giocatore e DM': other players get a summary (preview); the DM reads the sheet without Manage",
    );

    // 2b. Public: link and QR open a read-only sheet without commands or private data.
    await openLibrary();
    await manage("Livia");
    await dialog.locator('[data-clib-act="privacy"]').click();
    await dialog.getByText("Pubblica con link", { exact: true }).click();
    await submit();
    await dialog.locator("[data-clib-share]").waitFor();
    const firstLink = await dialog.locator("[data-clib-link-url]").inputValue();
    const decodeQr = () =>
      page.evaluate(async () => {
        const svg = document.querySelector("#dialog .clib-qr svg").outerHTML;
        const img = new Image();
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 400;
        canvas.getContext("2d").drawImage(img, 0, 0, 400, 400);
        const codes = await new BarcodeDetector({ formats: ["qr_code"] }).detect(canvas);
        return codes[0]?.rawValue ?? null;
      });
    const decoded = await decodeQr();
    check(decoded === firstLink, `QR decodes to the link: ${decoded} vs ${firstLink}`);
    await shot("share-link-qr-it-1440");
    await dialog.getByRole("button", { name: "Genera un nuovo link" }).click();
    await toast(/Nuovo link attivo/);
    const liveLink = await dialog.locator("[data-clib-link-url]").inputValue();
    check(liveLink !== firstLink, "a new link");
    const liveQr = await decodeQr();
    check(liveQr === liveLink, "the new QR decodes to the new link");
    await dialog.getByRole("button", { name: "Apri il link" }).click();
    await page.locator('[data-clib-link="ok"]').waitFor();
    const linkText = await page.locator(".clib-link-page").innerText();
    check(
      linkText.includes("Sola lettura") && linkText.includes("Trova Famiglio"),
      "read-only sheet",
    );
    check(!linkText.includes("Piano segreto"), "private plan never shown");
    check(
      !(await page.locator(".clib-link-page button, .clib-link-page input").count()),
      "no commands",
    );
    await shot("public-link-readonly-it-1440");
    await page.goto(firstLink);
    await page.locator('[data-clib-link="revoked"]').waitFor();
    passed.push(
      "Public: QR decodes to the link; the link shows a read-only sheet with no commands; a new link revokes the old one",
    );

    // 3a. Export JSON (real download) and re-import with preview; malformed files change nothing.
    await page.goto(base + "#characters");
    await page.locator("[data-clib-page]").waitFor();
    await manage("Livia");
    const [jsonDownload] = await Promise.all([
      page.waitForEvent("download"),
      dialog.locator('[data-clib-act="export"]').click(),
    ]);
    check(jsonDownload.suggestedFilename() === "d20-studio-livia.json", "file name");
    const exported = JSON.parse((await readDownload(jsonDownload)).utf8());
    await jsonDownload.saveAs(dir + "d20-studio-livia.json");
    check(exported.format === "d20-studio.character" && exported.formatVersion === 1, "format");
    check(!JSON.stringify(exported).includes("Piano segreto"), "no private plan in the file");
    await dialog.getByRole("button", { name: "Chiudi", exact: true }).first().click();
    const brokenFile = await writeFixture(
      "broken-character.json",
      '{ "format": "d20-studio.character", ',
    );
    const foundryFile = await writeFixture(
      "foundry-actor.json",
      JSON.stringify({ name: "Livia", type: "character", system: { attributes: {} } }),
    );
    const before = Object.keys((await stored()).actors).length;
    await page.locator("[data-clib-import]").setInputFiles(brokenFile);
    await page.locator("[data-clib-import-error]").waitFor();
    check(
      (await page.locator("[data-clib-import-error]").innerText()).includes(
        "non è un JSON leggibile",
      ),
      "malformed message",
    );
    check(Object.keys((await stored()).actors).length === before, "malformed file: no change");
    await shot("import-malformed-it-1440");
    await page.locator("[data-clib-import]").setInputFiles(foundryFile);
    await page.waitForFunction(() =>
      document.querySelector("[data-clib-import-error]")?.textContent.includes("Foundry VTT"),
    );
    check(Object.keys((await stored()).actors).length === before, "other format: no change");
    await page.locator("[data-clib-import]").setInputFiles(dir + "d20-studio-livia.json");
    await dialog.locator("[data-clib-import-preview]").waitFor();
    const previewText = await dialog.innerText();
    check(previewText.includes("Riconosciuti") && previewText.includes("Da completare"), "preview");
    check((await dialog.locator("[name=name]").inputValue()) === "Livia (importata)", "name");
    await shot("import-preview-it-1440");
    await submit();
    await page.locator("[data-clib-notice]").getByText("Personaggio importato").waitFor();
    const imported = await actorNamed("Livia (importata)");
    check(imported && imported.visibility === "private" && imported.imported, "imported sheet");
    check((await stored()).actors.livia.name === "Livia", "original untouched");
    await page.reload();
    await page.locator("[data-clib-page]").waitFor();
    check(await cardNamed("Livia (importata)").count(), "imported sheet persists");
    passed.push(
      "Export JSON downloads; malformed/Foundry files are refused with distinct messages and no change; re-import previews then creates a new sheet",
    );

    // 3b. Printable view with concentration and ritual; Print control; fillable PDF download.
    await manage("Iria");
    await dialog.locator('[data-clib-act="print"]').click();
    await page.locator("[data-clib-print]").waitFor();
    const detect = page.locator(".clib-spells tr").filter({ hasText: "Individuazione del magico" });
    check((await detect.locator(".clib-flag").allInnerTexts()).join("") === "CR", "C and R flags");
    const fly = page.locator(".clib-spells tr").filter({ hasText: "Volare" });
    check((await fly.locator(".clib-flag").allInnerTexts()).join("") === "C", "Fly: C only");
    await page.evaluate(() => {
      window.__printed = 0;
      window.print = () => (window.__printed += 1);
    });
    await page.getByRole("button", { name: "Stampa", exact: true }).click();
    check((await page.evaluate(() => window.__printed)) === 1, "Print control calls print");
    await shot("print-view-it-1440");
    await page.emulateMedia({ media: "print" });
    check(!(await page.locator(".app-header").isVisible()), "print hides the shell");
    await page.screenshot({ path: dir + "print-media-it-1440.png", fullPage: true });
    await page.emulateMedia({ media: "screen" });
    const [pdfDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Scarica PDF compilabile" }).click(),
    ]);
    const pdf = await readDownload(pdfDownload);
    await pdfDownload.saveAs(dir + "d20-studio-iria.pdf");
    const pdfText = pdf.latin1;
    check(pdfText.startsWith("%PDF-1.4") && pdfText.includes("/AcroForm"), "fillable PDF");
    check(pdfText.includes("(C) Tj") && pdfText.includes("(R) Tj"), "C/R flags in the PDF");
    passed.push(
      "Printable view flags Concentration/Ritual from SRD 5.2.1; Stampa prints; the PDF download is fillable with C/R columns",
    );

    // 4a. Bring a copy vs link to the campaign (Roll20 Import vs Add to Game).
    await page.goto(base + "#characters");
    await page.locator("[data-clib-page]").waitFor();
    await manage("Iria");
    await dialog.locator('[data-clib-act="bring-copy"]').click();
    check(
      (await dialog.locator("[name=name]").inputValue()) === "Iria (Le lanterne di Bruma)",
      "campaign copy name",
    );
    await submit();
    await page.locator("[data-clib-notice]").getByText("Copia creata").waitFor();
    const snapshot = await actorNamed("Iria (Le lanterne di Bruma)");
    check(snapshot.campaignIds.includes("lanterns"), "copy joins the campaign");
    check((await stored()).actors.iria.visibility === "private", "original stays in the library");
    check((await card("iria").innerText()).includes("Solo nella libreria"), "Iria card unchanged");
    await manage("Iria");
    await dialog.locator('[data-clib-act="link"]').click();
    check((await dialog.innerText()).includes("Collegamento vivo"), "live link explained");
    await submit();
    await toast(/Iria ora è nella campagna/);
    check(
      (await card("iria").innerText()).includes("Campagna: Le lanterne di Bruma"),
      "linked card shows the campaign",
    );
    await shot("link-vs-copy-it-1440");
    passed.push(
      '"Porta una copia" adds an independent snapshot to the campaign; "Collega" brings the same Iria in',
    );

    // 4b. Release the snapshot: the campaign keeps it unassigned; the player keeps a copy.
    await manage("Iria (Le lanterne di Bruma)");
    await dialog.locator('[data-clib-act="release"]').click();
    check(await dialog.locator("[name=keep]").isChecked(), "keep a copy by default");
    await submit();
    await toast(/rilasciata alla campagna/);
    const afterRelease = await stored();
    const released = afterRelease.actors[snapshot.id];
    check(
      released.owner === "dm" && released.released?.by === "player",
      "released to the campaign",
    );
    check(
      afterRelease.ext["campaign-members"].campaigns.lanterns.seats[snapshot.id]?.memberId === null,
      "seat unassigned (claimable)",
    );
    const othersText = await page.locator('[data-clib-group="others"]').innerText();
    check(othersText.includes("Rilasciata da Giocatore"), "released sheet in the campaign group");
    const keptCopies = Object.values(afterRelease.actors).filter(
      (a) => a.copiedFrom?.actorId === snapshot.id && a.owner === "player",
    );
    check(keptCopies.length === 1 && keptCopies[0].visibility === "private", "kept copy");
    passed.push(
      "Release: the campaign sheet becomes unassigned (B13 seat), the library keeps an independent copy",
    );

    // 4c. Transfer with acceptance. Fixture: a second campaign through B13's own domain API
    // (the subject here is the transfer, not campaign creation).
    await page.evaluate(async (k) => {
      const m = await import("/campaign-members.mjs");
      const s = JSON.parse(localStorage.getItem(k));
      const ruins = m.createCampaign(s, { name: "Rovine di Vetro" }, "dm");
      const invite = m.inviteIdentity(s, ruins, { to: "player", role: "player" }, "dm");
      m.joinCampaign(
        s,
        { code: invite.code, path: "premade", premadeId: "premade-fighter", name: "Brenna" },
        "player",
      );
      localStorage.setItem(k, JSON.stringify(s));
    }, key);
    await page.reload();
    await page.locator("[data-clib-page]").waitFor();
    await manage("Iria");
    await dialog.locator('[data-clib-act="transfer"]').click();
    await dialog.locator("select[name=to]").selectOption({ label: "Rovine di Vetro" });
    await submit();
    await toast(/Richiesta inviata/);
    check(
      (await card("iria").innerText()).includes("In attesa di Rovine di Vetro"),
      "pending badge",
    );
    check(
      (await stored()).actors.iria.campaignIds.includes("lanterns"),
      "nothing moves before acceptance",
    );
    await role("dm");
    const bell = page.locator('.service-nav [data-service="requests"]');
    if (await bell.count()) {
      await bell.click();
      const centre = dialog.locator("[data-notifications-centre]");
      if (await centre.count()) {
        const row = dialog
          .locator(".notifications-item")
          .filter({ hasText: "Trasferimento · Iria" });
        check(await row.count(), "DM notified of the transfer request");
        await row.locator("[data-notifications-open]").click();
        notes.push("Transfer request reached the DM through the B24 notification centre");
      } else await page.keyboard.press("Escape");
    }
    await page.locator(".clib-transfers").waitFor();
    await shot("dm-transfer-request-it-1440");
    await page.locator(".clib-transfers").getByRole("button", { name: "Accetta" }).click();
    await toast(/Iria ora è in Rovine di Vetro/);
    const moved = (await stored()).actors.iria;
    check(!moved.campaignIds.includes("lanterns") && moved.campaignIds.length === 1, "moved");
    check(
      !(await stored()).scenes.some((scene) => scene.tokens.some((t) => t.actorId === "iria")),
      "no token left in the old campaign",
    );
    await role("player");
    await openLibrary();
    check(
      (await card("iria").innerText()).includes("Campagna: Rovine di Vetro"),
      "player sees the new campaign",
    );
    passed.push(
      "Transfer waits for the destination DM (notification + list), accept moves Iria to Rovine di Vetro",
    );

    // 6. Revisions: compare, restore as a new revision, Undo, then correct by restoring again.
    await card("livia").getByRole("button", { name: "Apri scheda", exact: true }).click();
    await page.getByRole("heading", { name: "Livia", level: 1 }).waitFor();
    await openSheetTab(page, "character-library-revisions"); // B62: Notes › Revisions
    await page.locator("[data-clib-revisions]").waitFor();
    const revisions = (await lib()).revisions.livia;
    await page.locator("[data-clib-compare] [name=from]").selectOption(revisions[0].id);
    await page.waitForFunction(() =>
      document.querySelector("[data-clib-diff]")?.textContent.includes("Livello"),
    );
    const diffText = await page.locator("[data-clib-diff]").innerText();
    check(/Livello\s+2\s+3/.test(diffText) && diffText.includes("Corda"), "diff rev 1 → current");
    await page.locator("[data-clib-compare]").scrollIntoViewIfNeeded();
    await page.evaluate(() =>
      document.querySelector("[data-clib-compare]").scrollIntoView({ block: "start" }),
    );
    await shot("revisions-compare-it-1440");
    await page.locator(`[data-clib-rev-restore="${revisions[0].id}"]`).click();
    await dialog.getByText("Cosa cambia").waitFor();
    await shot("revision-restore-confirm-it-1440");
    await submit();
    await page
      .locator("[data-clib-tab-notice]")
      .getByText("ripristinata come nuova revisione")
      .waitFor();
    check((await stored()).actors.livia.level === 2, "restored level 2");
    check((await lib()).revisions.livia.length === revisions.length + 2, "two new revisions");
    await page.locator("[data-clib-tab-notice]").getByRole("button", { name: "Annulla" }).click();
    await toast(/Modifica annullata/);
    check((await stored()).actors.livia.level === 3, "Undo back to level 3");
    await page.locator(`[data-clib-rev-restore="${revisions[0].id}"]`).click();
    await submit();
    await page.locator("[data-clib-tab-notice]").waitFor();
    const autoRev = (await lib()).revisions.livia.find((row) => row.kind === "auto");
    await page.locator(`[data-clib-rev-restore="${autoRev.id}"]`).click();
    await submit();
    await page.locator("[data-clib-tab-notice]").getByText("ripristinata").waitFor();
    check((await stored()).actors.livia.level === 3, "correction by restoring the saved revision");
    await page.reload();
    await page.locator("[data-clib-revisions]").waitFor();
    check(
      (await page.locator("[data-clib-rev]").count()) === (await lib()).revisions.livia.length &&
        (await lib()).revisions.livia.length === revisions.length + 4,
      "all revisions kept after reload",
    );
    passed.push(
      "Revisions: compare rev 1 vs current, restore as new revision, Undo, correction by restoring the auto revision; reload keeps history",
    );

    // Adventure log (FG Log tab): add, delete, Undo from the notice; the DM reads only.
    await openSheetTab(page, "character-library-log"); // B62: Notes › Log
    await page.locator("[data-clib-log]").waitFor();
    await page.locator("[data-clib-log-add]").click();
    await dialog.locator("[name=title]").fill("Le lanterne di Bruma · Sessione 13");
    await dialog.locator("[name=levels]").fill("0");
    await dialog.locator("[name=gold]").fill("30");
    await dialog.locator("[name=downtime]").fill("1");
    await dialog.locator("[name=items]").fill("Anello di protezione");
    await submit();
    await page.locator("[data-clib-tab-notice]").getByText("Voce aggiunta").waitFor();
    check(
      (await page.locator("[data-clib-log-totals]").innerText()).includes("+95"),
      "gold totals updated",
    );
    await shot("adventure-log-it-1440");
    const newRow = (await lib()).logs.livia.at(-1);
    await page.locator(`[data-clib-log-delete="${newRow.id}"]`).click();
    await submit();
    await page.locator("[data-clib-tab-notice]").getByText("Voce eliminata").waitFor();
    check((await lib()).logs.livia.length === 2, "entry deleted");
    await page.locator("[data-clib-tab-notice]").getByRole("button", { name: "Annulla" }).click();
    await toast(/Modifica annullata/);
    check((await lib()).logs.livia.length === 3, "Undo restored the entry");
    await role("dm");
    await page.goto(base + "#characters?id=livia&tab=character-library-log");
    await page.locator("[data-clib-log]").waitFor();
    check(!(await page.locator("[data-clib-log-add]").count()), "DM reads the log without editing");
    await role("player");
    passed.push("Adventure log: add with totals, delete, Undo from the notice; DM read-only");

    // Leave campaign (DDB-063) for Mira; the DM stops seeing her; Undo from the notice.
    await page.goto(base + "#characters");
    await page.locator("[data-clib-page]").waitFor();
    await manage("Mira");
    await dialog.locator('[data-clib-act="leave"]').click();
    // W2a1: B35 seeds a second campaign scene (the Lantern tower) with Mira on it, so the
    // count is read from the stored scenes instead of a fixed 1.
    const miraTokens = (await stored()).scenes
      .flatMap((scene) => scene.tokens ?? [])
      .filter((token) => token.actorId === "mira").length;
    check(miraTokens >= 1, "Mira has no token on the campaign maps");
    check(
      (await dialog.innerText()).includes(`Pedine tolte dalle mappe della campagna: ${miraTokens}`),
      "token count",
    );
    await submit();
    await page
      .locator("[data-clib-notice]")
      .getByText("ha lasciato Le lanterne di Bruma")
      .waitFor();
    check(
      (await card("mira").innerText()).includes("Solo nella libreria"),
      "Mira in the library only",
    );
    const left = await stored();
    check(left.actors.mira.visibility === "private", "Mira personal");
    check(!left.scenes[0].tokens.some((t) => t.actorId === "mira"), "Mira's token left the map");
    await shot("leave-campaign-notice-it-1440");
    await page.locator("[data-clib-notice]").getByRole("button", { name: "Annulla" }).click();
    await toast(/Modifica annullata/);
    const back = await stored();
    check(back.actors.mira.campaignIds.includes("lanterns"), "Undo: Mira back in the campaign");
    check(
      back.scenes[0].tokens.some((t) => t.actorId === "mira"),
      "Undo: token back",
    );
    passed.push(
      "Leave campaign keeps Mira in the library and removes her token; Undo from the notice brings both back",
    );

    // Keyboard and targets: Manage opens with Enter, Escape closes; 40px targets; no overflow.
    await page.goto(base + "#characters");
    await page.locator("[data-clib-page]").waitFor();
    const manageMira = page.getByRole("button", { name: "Gestisci Mira", exact: true });
    await manageMira.focus();
    await page.keyboard.press("Enter");
    await dialog.locator("[data-clib-manage]").waitFor();
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("[data-clib-page] button, #dialog .clib-manage button")]
        .filter((b) => b.offsetParent)
        .map((b) => [b.textContent.trim(), Math.round(b.getBoundingClientRect().height)])
        .filter(([, h]) => h < 40),
    );
    check(!small.length, "targets under 40px: " + JSON.stringify(small));
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("#dialog").open);
    const refocused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    if (refocused === "Gestisci Mira") passed.push("Focus returns to “Gestisci Mira” after Escape");
    else notes.push("Focus after Escape: " + refocused);
    check(await noOverflow(), "desktop overflow");
    passed.push(
      "Keyboard: Enter opens Manage, Escape closes; every control ≥ 40px; no horizontal overflow at 1440",
    );

    // 5. EN phone 390 with touch: the QR/link opens a read-only sheet; the library in English.
    const snapshotStorage = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    // The local simulation of the service: the phone receives the same stored demo data.
    await phone.addInitScript((data) => {
      if (sessionStorage.getItem("b21-seeded")) return;
      for (const [k, v] of Object.entries(JSON.parse(data))) localStorage.setItem(k, v);
      sessionStorage.setItem("b21-seeded", "1");
    }, snapshotStorage);
    const mobile = await phone.newPage();
    mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
    await mobile.goto(base);
    await mobile.getByRole("heading", { level: 1 }).first().waitFor();
    await mobile.getByRole("button", { name: "Preferenze" }).tap();
    await mobile.locator("#dialog select[name=lang]").selectOption("en");
    await mobile.getByRole("button", { name: "Salva preferenze" }).tap();
    await mobile.getByRole("heading", { name: "Your next adventure", level: 1 }).waitFor();
    await mobile.goto(liveQr);
    await mobile.locator('[data-clib-link="ok"]').waitFor();
    const phoneText = await mobile.locator(".clib-link-page").innerText();
    check(phoneText.includes("Read only") && phoneText.includes("Spells"), "EN read-only sheet");
    check(
      !(await mobile.locator(".clib-link-page button, .clib-link-page input").count()),
      "no commands on phone",
    );
    check(
      await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      "phone link overflow",
    );
    await mobile.screenshot({ path: dir + "phone-link-readonly-en-390.png", fullPage: true });
    await mobile.locator('.app-header nav [data-nav="characters"]').tap();
    await mobile.locator("[data-clib-page]").waitFor();
    await mobile.locator("[data-clib-search]").tap();
    await mobile.keyboard.type("wizard");
    const phoneCards = await mobile.evaluate(() =>
      [...document.querySelectorAll("[data-clib-card]")]
        .filter((el) => !el.hidden)
        .map((el) => el.querySelector("h3").textContent),
    );
    check(phoneCards.includes("Livia") && phoneCards.includes("Iria"), "EN search: " + phoneCards);
    await mobile.getByRole("button", { name: "Manage Livia", exact: true }).tap();
    await mobile.locator("#dialog [data-clib-manage]").waitFor();
    check(
      (await mobile.locator("#dialog").innerText()).includes("Privacy and sharing"),
      "EN manage",
    );
    check(
      await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      "phone manage overflow",
    );
    await mobile.screenshot({ path: dir + "phone-manage-en-390.png" });
    await mobile
      .locator("#dialog")
      .getByRole("button", { name: "Close", exact: true })
      .first()
      .tap();
    await mobile.locator("[data-clib-search]").fill("");
    await mobile.locator("[data-clib-search]").dispatchEvent("input");
    check(
      await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      "phone list overflow",
    );
    await mobile.screenshot({ path: dir + "phone-library-en-390.png", fullPage: true });
    await phone.close();
    passed.push(
      "EN phone 390 (touch): the shared link opens the read-only sheet; library search and Manage in English; no overflow",
    );

    // Final list state for the evidence.
    await page.goto(base + "#characters");
    await page.locator("[data-clib-page]").waitFor();
    await page.screenshot({ path: dir + "library-final-it-1440.png", fullPage: true });
    await context.close();
  } catch (error) {
    throw Error(`after ${passed.length} passed checks (last: ${passed.at(-1)}): ${error.message}`);
  }
  check(!errors.length, "page errors: " + errors.join(" | "));
  return { passed: passed.length, checks: passed, notes, errors };
};
