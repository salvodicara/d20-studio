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
  // B59 — Public tables, group finder and moderation (delegated SIMULATION). Real clicks,
  // keys and touch against the one app: IT desktop 1440x900 in Europe/Rome (player and DM
  // identities), then an EN 390x844 touch phone in Europe/London. Proves: Join a Game
  // search with filters and 18+ opt-in (Roll20 R20-004/SVC-004), Warhorn waitlist, Kanka
  // application with edit/withdraw and the DM's reply as a notification, Roll20 listing
  // status box / Disable-Enable / auto-off when full, report and block/unblock, player
  // directory invitation, Kanka public page warning + fix + visitor view, B13 coherence
  // (accepted people in Members, invitation in Campaigns), reload persistence, player vs
  // DM visibility and the offline refusal. Review fixes (R): typed keywords kept across a
  // filter change, block keeps listings visible (SVC-149), FIFO ahead of later arrivals,
  // B13 join date for accepted people, the listing preview, Fix links to the form field,
  // «Trova un tavolo» on Campagne, directory Report/Block, the declined-invite state, and
  // the phone checklist layout. Second review (R2): report screenshot (DDB-157), public
  // page prose with a compendium @Embed, no invitation to apply for an accepted player,
  // the "seat free again" badge, an archived campaign's queue reachable from the bell,
  // and the EN waitlist position. Synthetic data only; resets this browser's demo state.
  // Run: playwright-cli -s=d20-b59 run-code --filename=<this file>
  const browser = rootPage.context().browser();
  for (const prior of browser.contexts()) if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B59/";
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    timezoneId: "Europe/Rome",
    locale: "it-IT",
  });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  const findings = [];
  page.on("pageerror", (error) => errors.push("desktop: " + error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const slice = async (p = page) => (await stored(p)).ext.community;
  const app = async (id, p = page) => (await slice(p)).applications.find((row) => row.id === id);
  const as = (role, p = page) => p.locator("#demo-role").selectOption(role);
  const button = (name, p = page) => p.getByRole("button", { name, exact: true });
  const dialog = (p = page) => p.locator("#dialog[open]");
  const submit = (p = page) => p.locator("#dialog[open] button[type=submit]").click();
  const toast = (text, p = page) => p.locator("#toast.shown", { hasText: text }).waitFor();
  const content = (p = page) => p.locator("#content").innerText();
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const styled = (p = page) =>
    p.waitForFunction(() =>
      [...document.styleSheets].some(
        (sheet) => sheet.href?.endsWith("/community.css") && sheet.cssRules.length,
      ),
    );
  const shot = async (name, options = {}, p = page) => {
    await styled(p);
    await p.screenshot({ path: shots + name, ...options });
  };
  const results = (p = page) => p.locator(".community-card").count();
  const card = (title, p = page) => p.locator(".community-card", { hasText: title });
  const openListing = async (title, p = page) => {
    await card(title, p).locator(".community-card-side [data-community-open]").click();
    await p.locator("#community-detail-title", { hasText: title }).waitFor();
  };
  const smallTargets = (selector, p = page) =>
    p.evaluate(
      (sel) =>
        [...document.querySelectorAll(sel)]
          .filter((el) => el.getBoundingClientRect().height > 0)
          .map((el) => ({
            text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 40),
            h: Math.round(el.getBoundingClientRect().height),
            w: Math.round(el.getBoundingClientRect().width),
          }))
          .filter((box) => box.h < 40 || box.w < 40),
      selector,
    );
  // B24 pop-up notices can cover the top-right corner: close any that are open.
  const closeNotices = async (p = page) => {
    for (const close of await p.locator("[data-notifications-toast-close]").all())
      await close.click().catch(() => {});
  };
  const nextWeek = new Date(Date.now() + 8 * 864e5).toISOString().slice(0, 10) + "T21:00";

  let phone = null;
  let mobile = null;
  try {
    // ---------------------------------------------------------------------------------
    // A. Player: Home → Join a Game in one click; Roll20 filters; 18+ opt-in; keyword.
    await page.goto(base);
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await page.locator("#content").waitFor();
    await as("player");
    const widget = page.locator(".community-home");
    await widget.waitFor();
    check(
      // Refreshed by the hand-off writer (29/09/2026): the example's own listing is live with its
      // «Il sigillo della torre» on the coming Thursday (sample-clock.mjs): five tables.
      (await widget.innerText()).includes("5 tavoli pubblici cercano giocatori"),
      "Home widget count wrong: " + (await widget.innerText()),
    );
    await widget.getByRole("button", { name: "Cerca un tavolo" }).click();
    await page.getByRole("heading", { name: "Tavoli pubblici", level: 1 }).waitFor();
    check(page.url().endsWith("#community"), "Join a Game route not reached: " + page.url());
    check((await results()) === 5, "Expected 5 public tables, got " + (await results()));
    check(
      (await content()).includes("1 annuncio per adulti nascosto"),
      "Mature listing not hidden by default",
    );
    check(
      (await card("Salt Road Watch").innerText()).includes("20:30 ora tua · 19:30 a Europe/London"),
      "Salt Road not shown in the viewer's time zone: " +
        (await card("Salt Road Watch").innerText()),
    );
    await page.locator('.community-filters [name="language"]').selectOption("en");
    await page.waitForFunction(() => document.querySelectorAll(".community-card").length === 1);
    check(
      await page
        .waitForFunction(() => document.activeElement?.name === "language", null, { timeout: 2000 })
        .then(
          () => true,
          () => false,
        ),
      "Focus lost after the language filter",
    );
    await page.getByLabel("Mostra annunci per adulti (18+)").check();
    await page.waitForFunction(() => document.querySelectorAll(".community-card").length === 2);
    check((await card("Midnight Hymns").count()) === 1, "18+ box did not reveal Midnight Hymns");
    // R: keywords typed without Search stay in the box when another filter re-renders.
    await page.locator('.community-filters [name="q"]').fill("cripta");
    await page.locator('.community-filters [name="format"]').selectOption("one-shot");
    await page.waitForFunction(() => document.activeElement?.name === "format");
    check(
      (await page.locator('.community-filters [name="q"]').inputValue()) === "cripta",
      "Typed keyword erased by the format filter",
    );
    await button("Azzera filtri").first().click();
    await page.waitForFunction(
      () => document.querySelector('.community-filters [name="q"]')?.value === "",
    );
    await page.waitForFunction(() => document.querySelectorAll(".community-card").length === 5);
    const keyword = page.locator('.community-filters [name="q"]');
    await keyword.fill("nebbia");
    await keyword.press("Enter");
    await page.waitForFunction(() => document.querySelectorAll(".community-card").length === 1);
    check((await card("Nebbiafonda").count()) === 1, "Keyword search did not find Nebbiafonda");
    await page.locator('.community-filters [name="day"]').selectOption("0");
    await page.locator(".community .empty-state", { hasText: "Nessun tavolo" }).waitFor();
    await page
      .locator(".community .empty-state")
      .getByRole("button", { name: "Azzera filtri" })
      .click();
    await page.waitForFunction(() => document.querySelectorAll(".community-card").length === 5);
    await shot("b59-01-find-it.png");
    passed.push(
      "Player Home → «Cerca un tavolo» (1 click): 5 tables (the example's own is live with its next session), 18+ hidden until ticked, language/day filters apply at once with focus kept, keyword on Enter, times in the viewer's zone (20:30 Rome for 19:30 London), empty state + clear",
    );

    // ---------------------------------------------------------------------------------
    // B. Warhorn waitlist on a full table: position 3 in arrival order, reload, leave.
    await openListing("Salt Road Watch");
    check(
      (await content()).includes("Completo · 2 in lista d’attesa"),
      "Full table not shown as full with its waitlist",
    );
    await button("Mettiti in lista d’attesa").click();
    await dialog().waitFor();
    await page
      .locator('#dialog [name="message"]')
      .fill("Libera ogni mercoledì, gioco volentieri un chierico.");
    await page.locator('#dialog [name="conduct"]').check();
    await submit();
    await toast("3° posto");
    await page.locator(".community-mine", { hasText: "In lista d’attesa · 3°" }).waitFor();
    let data = await slice();
    const waiting = data.applications.find(
      (row) => row.who === "player" && row.listingId === "listing-salt",
    );
    check(waiting?.status === "waitlisted", "Waitlisted application not stored");
    await page.reload();
    await page.locator(".community-mine", { hasText: "In lista d’attesa · 3°" }).waitFor();
    await shot("b59-02-listing-waitlist.png");
    await button("Esci dalla lista d’attesa").click();
    await dialog().waitFor();
    await submit();
    await toast("Sei uscito dalla lista d’attesa");
    await button("Mettiti in lista d’attesa").waitFor();
    check((await app(waiting.id)).status === "withdrawn", "Leaving the waitlist not stored");
    passed.push(
      "Warhorn waitlist: full table offers «Mettiti in lista d’attesa», position 3° after the two simulated people, survives reload, «Esci dalla lista d’attesa» is the correction (withdrawn)",
    );

    // ---------------------------------------------------------------------------------
    // C. Kanka application by keyboard: Enter opens, Space ticks, Enter sends; Escape
    // discards an edit; edit with the dialog.
    await button("Torna ai risultati").click();
    await openListing("Le Paludi di Nebbiafonda");
    const applyButton = button("Candidati");
    await applyButton.focus();
    await page.keyboard.press("Enter");
    await dialog().waitFor();
    await page.locator('#dialog [name="message"]').focus();
    await page.keyboard.type("Ho giocato due campagne 2014, tengo volentieri un diario.");
    const conductBox = page.locator('#dialog [name="conduct"]');
    // Accepted with the waitlist application: pre-ticked; Space toggles it off and on.
    check(await conductBox.isChecked(), "Code of conduct accepted earlier is not pre-ticked");
    await conductBox.focus();
    await page.keyboard.press("Space");
    check(!(await conductBox.isChecked()), "Space did not untick the conduct box");
    await page.keyboard.press("Space");
    check(await conductBox.isChecked(), "Space did not tick the conduct box");
    await shot("b59-03-apply-dialog.png");
    await page.locator("#dialog button[type=submit]").focus();
    await page.keyboard.press("Enter");
    await toast("Candidatura inviata");
    await page.locator(".community-mine", { hasText: "In attesa del DM" }).waitFor();
    check(
      await page
        .waitForFunction(
          () => document.activeElement?.hasAttribute("data-community-application-state"),
          null,
          { timeout: 2000 },
        )
        .then(
          () => true,
          () => false,
        ),
      "Focus did not move to the application state after sending",
    );
    data = await stored();
    const paludi = data.ext.community.applications.find(
      (row) => row.who === "player" && row.listingId === "listing-paludi",
    );
    check(paludi?.status === "pending", "Pending application not stored");
    check(data.log.at(-1).visibility === "private", "Application audit label is not private");
    await button("Modifica messaggio").click();
    await page.locator('#dialog [name="message"]').fill("Messaggio da scartare");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(150);
    check((await app(paludi.id)).message.startsWith("Ho giocato"), "Escape saved the edit");
    await button("Modifica messaggio").click();
    await page
      .locator('#dialog [name="message"]')
      .fill("Ho giocato due campagne; il martedì sera sono sempre libera.");
    await submit();
    await toast("Messaggio aggiornato");
    await page
      .locator(".community-quote", { hasText: "il martedì sera sono sempre libera" })
      .waitFor();
    passed.push(
      "Kanka application by keyboard (Enter/Space/Enter), private audit label, focus on the new state; Escape discards an edit; «Modifica messaggio» saves",
    );

    // ---------------------------------------------------------------------------------
    // D. 18+ declaration, report and block/unblock (Roll20 SVC-148/149, DDB-157).
    await button("Torna ai risultati").click();
    await page.getByLabel("Mostra annunci per adulti (18+)").check();
    await page.waitForFunction(() => document.querySelectorAll(".community-card").length === 6);
    await openListing("Midnight Hymns");
    await button("Candidati").click();
    await page.locator('#dialog [name="message"]').fill("Horror fan.");
    await page.locator('#dialog [name="conduct"]').check();
    check((await page.locator('#dialog [name="adult"]').count()) === 1, "18+ declaration missing");
    await page.keyboard.press("Escape");
    await button("Segnala annuncio").click();
    await dialog().waitFor();
    check(
      (await dialog().innerText()).includes("parlane prima con il DM"),
      "Report guidance (DDB-157) missing",
    );
    await page.locator('#dialog [name="reason"]').selectOption("other");
    await submit();
    await page.locator("#dialog .dialog-error", { hasText: "Descrivi il problema" }).waitFor();
    await page
      .locator('#dialog [name="details"]')
      .fill("Il link a una chat esterna compare nei commenti.");
    // R2: DDB-157 screenshot, checked like a media upload (B28): a text file named .png is
    // refused in the dialog; a real screenshot of the listing is attached.
    const shotInput = page.locator('#dialog input[name="screenshot"]');
    const shotStatus = page.locator("#dialog [data-community-shot-status]");
    const listingShot = await page.screenshot({ clip: { x: 0, y: 0, width: 480, height: 300 } });
    // run-code has no global Buffer: the screenshot's own class builds the fake file.
    await shotInput.setInputFiles({
      name: "finto.png",
      mimeType: "image/png",
      buffer: listingShot.constructor.from("questo non è un PNG"),
    });
    await shotStatus.filter({ hasText: "non corrisponde" }).waitFor();
    await shotInput.setInputFiles({
      name: "annuncio-midnight.png",
      mimeType: "image/png",
      buffer: listingShot,
    });
    await shotStatus.filter({ hasText: "Immagine pronta: annuncio-midnight.png" }).waitFor();
    await submit();
    await toast("Segnalazione ricevuta");
    await button("Blocca Sam Keller").click();
    await dialog().waitFor();
    check(
      (await dialog().innerText()).includes("restano visibili"),
      "Block dialog does not say listings stay visible",
    );
    await submit();
    await toast("Sam Keller bloccato");
    // Roll20 SVC-149: the listing stays; only private contact (applying) stops.
    await page
      .locator("[data-community-application-state]", { hasText: "sbloccalo per candidarti" })
      .waitFor();
    await button("Sblocca Sam Keller").waitFor();
    check((await button("Candidati").count()) === 0, "Apply still offered after the block");
    await button("Torna ai risultati").click();
    await card("Midnight Hymns").waitFor();
    check(
      (await card("Midnight Hymns").innerText()).includes("Hai bloccato chi l’ha pubblicato"),
      "Blocked author's card not marked",
    );
    check(
      !(await content()).includes("nascost") || (await content()).includes("per adulti"),
      "A block still hides listings",
    );
    await page.locator('.community-tabs [data-community-tab="conduct"]').click();
    await page.getByRole("heading", { name: "Persone bloccate" }).waitFor();
    check((await content()).includes("Il link a una chat esterna"), "My report not listed");
    const reportImage = page.locator(
      '.community-shot img[alt="Screenshot allegato: annuncio-midnight.png"]',
    );
    await reportImage.waitFor();
    check(
      await reportImage.evaluate((img) => img.complete && img.naturalWidth > 0),
      "Report screenshot not shown",
    );
    await shot("b59-11-conduct-reports-blocks.png", { fullPage: true });
    await button("Sblocca Sam Keller").click();
    await toast("Sam Keller sbloccato");
    await page
      .locator("[data-community-blocks]", { hasText: "Nessuna persona bloccata" })
      .waitFor();
    check(
      await page
        .waitForFunction(
          () => document.activeElement?.hasAttribute("data-community-blocks"),
          null,
          { timeout: 2000 },
        )
        .then(
          () => true,
          () => false,
        ),
      "Focus not on the blocks list after Unblock",
    );
    data = await slice();
    check(
      !(data.blocks.player ?? []).length &&
        data.reports.length === 1 &&
        data.reports[0].screenshot?.src.startsWith("data:image/png;base64,"),
      "Block/report state wrong",
    );
    passed.push(
      "18+ listing asks for a declaration; report with DDB guidance, «Altro» needs a description (inline error), stored for the author only; R: Block (SVC-149) keeps the listing visible and marked, stops applying with «sbloccalo per candidarti» and «Sblocca» in place; Unblock in Condotta e segnalazioni",
    );
    passed.push(
      "R2: report screenshot (DDB-157): a text file named .png is refused in the dialog («non corrisponde»), a real PNG screenshot is attached, stored with the report and shown in Le mie segnalazioni",
    );

    // ---------------------------------------------------------------------------------
    // E. My applications and the opt-in directory profile (Roll20 R20-006).
    await page.locator('.community-tabs [data-community-tab="mine"]').click();
    await page.getByRole("heading", { name: "Le mie candidature" }).waitFor();
    const mine = await content();
    check(mine.includes("Risposta di Luca Dini"), "Declined application reply missing");
    check(mine.includes("il martedì sera sono sempre libera"), "Edited application missing");
    await page
      .locator('[data-community-form="directory"] [name="availability"]')
      .fill("Venerdì e sabato sera");
    await page
      .locator('[data-community-form="directory"] [name="intro"]')
      .fill("Maga di 3° livello, cerco anche one-shot.");
    await button("Mettimi nell’elenco").click();
    await toast("Sei nell’elenco");
    await page.locator(".community-block", { hasText: "Sei nell’elenco" }).waitFor();
    await shot("b59-04-mine.png", { fullPage: true });
    passed.push(
      "Le mie candidature: pending (edited), withdrawn waitlist and the seeded declined application with Luca Dini's reply; «Cerco un gruppo» opt-in stored",
    );

    // ---------------------------------------------------------------------------------
    // F. DM: Home → Apri campagna → Reclutamento (2 clicks); status box; Fix link;
    // accept Tomas (joins Members, B13), decline Greta with a reply.
    await as("dm");
    await page.locator(".app-header .brand").click();
    await page.locator(".resume-scene").getByRole("button", { name: "Apri campagna" }).click();
    await openCampaignSection(page, "community");
    await page.getByRole("heading", { name: "Reclutamento", level: 1 }).waitFor();
    const status = page.locator("[data-community-status]");
    // Refreshed by the hand-off writer (29/09/2026): with «Il sigillo della torre» on the
    // coming Thursday (sample-clock.mjs) the listing is live; the DM cancels that session so
    // the status box shows the missing requirement and its Risolvi link.
    check(
      (await status.innerText()).includes("Pubblicato · visibile nella ricerca"),
      "Status box does not say the listing is live: " + (await status.innerText()),
    );
    await openCampaignSection(page, "sessions");
    await page.locator('[data-campaign-cancel-session="session-sample-13"]').click();
    await page.locator('[data-campaign-path="data.reason"]').fill("Spostata");
    await page.locator("[data-campaign-save]").click();
    await page.locator("[data-campaign-apply]").click();
    await page.locator('[data-campaign-cancel-session="session-sample-13"]').waitFor({
      state: "detached",
    });
    await openCampaignSection(page, "community");
    await page.getByRole("heading", { name: "Reclutamento", level: 1 }).waitFor();
    check(
      (await status.innerText()).includes("Pubblicato · non visibile: manca un requisito"),
      "Status box does not say the listing is hidden",
    );
    check(
      (await status.locator(".is-missing").innerText()).includes("Prossima sessione in programma"),
      "Status box does not name the missing session",
    );
    await shot("b59-05-recruiting-status-dm.png", { fullPage: true });
    await status.getByRole("button", { name: "Risolvi" }).click();
    await page.getByRole("heading", { name: "Sessioni", level: 1 }).waitFor();
    check(page.url().includes("tab=sessions"), "Fix link did not open Sessions");
    await openCampaignSection(page, "community");
    // R: Marta joined the waitlist before Tomas and Greta applied (stored, then reloaded).
    await page.evaluate((k) => {
      const saved = JSON.parse(localStorage.getItem(k));
      saved.ext.community.applications.push({
        id: "app-marta",
        listingId: "listing-lanterns",
        who: "sim-marta",
        message: "Aspetto un posto dal 7 settembre.",
        status: "waitlisted",
        reply: "",
        conduct: true,
        adult: false,
        createdAt: "2026-09-07T10:00:00.000Z",
        updatedAt: "2026-09-07T10:00:00.000Z",
        decidedAt: null,
        decidedBy: null,
      });
      localStorage.setItem(k, JSON.stringify(saved));
    }, key);
    await page.reload();
    // The demo identity is not stored: back to the DM, then Reclutamento again.
    await as("dm");
    await openCampaignSection(page, "community");
    const tomas = page.locator('[data-community-queue-row="app-tomas"]');
    await tomas.waitFor();
    check(
      (await tomas.getByRole("button", { name: "Accetta…" }).count()) === 0 &&
        (await tomas.innerText()).includes("Marta Riva aspetta in lista da prima"),
      "A later applicant can still be accepted ahead of the waitlist",
    );
    const marta = page.locator('[data-community-queue-row="app-marta"]');
    await marta.getByRole("button", { name: "Accetta…" }).click();
    await submit();
    await toast("Marta Riva accettato");
    await tomas.getByRole("button", { name: "Accetta…" }).click();
    await page.locator('#dialog [name="reply"]').fill("Benvenuto! Venerdì ti presento il gruppo.");
    await shot("b59-06-decision-dialog.png");
    await submit();
    await toast("Tomas Ferri accettato");
    const greta = page.locator('[data-community-queue-row="app-greta"]');
    await greta.getByRole("button", { name: "Non accettare…" }).click();
    await page
      .locator('#dialog [name="reply"]')
      .fill("Per ora cerchiamo chi conosce già le regole 2024.");
    await submit();
    await toast("Risposta inviata a Greta Lind");
    await page
      .locator("[data-community-queue]", { hasText: "Nessuna candidatura in attesa" })
      .waitFor();
    data = await stored();
    check(
      data.campaign.members.some((m) => m.id === "sim-tomas" && m.role === "player"),
      "Accepted Tomas is not a campaign member",
    );
    await openCampaignSection(page, "campaign-members");
    await page.locator(".cm-member", { hasText: "Tomas Ferri" }).waitFor();
    // R: B13 records the join (date, history) for accepted simulated people.
    for (const person of ["Tomas Ferri", "Marta Riva"])
      check(
        !(await page.locator(".cm-member", { hasText: person }).innerText()).includes(
          "data non registrata",
        ),
        person + ": join date not recorded in B13",
      );
    data = await stored();
    check(
      data.ext["campaign-members"].campaigns.lanterns.joined["sim-tomas"]?.via === "app-tomas",
      "B13 join record missing for Tomas",
    );
    await shot("b59-07-members-b13.png");
    passed.push(
      "DM Home → Apri campagna → Reclutamento (2 clicks): live with the example session; once it is cancelled the Roll20 status box names «Prossima sessione in programma» with Risolvi → Sessioni; R: with Marta waiting since before them, Tomas has no «Accetta…» and the reason names her (Warhorn FIFO); Marta then Tomas accepted, both in B13 Members with a join date (no «data non registrata»); Greta declined with a reply; queue empty",
    );

    // ---------------------------------------------------------------------------------
    // G. Kanka public page: warning when it would show nothing, Correggi, visitor view.
    await openCampaignSection(page, "community");
    // Listing form: «Copia dalle aspettative» restores the B27 warning in the form only;
    // leaving with typed changes asks first (keep editing, then discard).
    await page.locator('[data-community-sub="listing"]').click();
    const lanternsForm = page.locator('[data-community-form="listing"]');
    const spiders = lanternsForm.locator('[name="warnings"][value="spiders"]');
    await spiders.uncheck();
    await button("Copia dalle aspettative").click();
    await toast("Strumenti e avvisi copiati");
    check(await spiders.isChecked(), "Copy from the expectations did not tick Ragni");
    await page.locator('[data-community-sub="public"]').click();
    await page.locator("#dialog[open] h2", { hasText: "Modifiche non salvate" }).waitFor();
    await button("Continua a modificare").click();
    await page.locator('[data-community-sub="listing"][aria-current="page"]').waitFor();
    await page.locator('[data-community-sub="public"]').click();
    await page.locator("#dialog[open] h2", { hasText: "Modifiche non salvate" }).waitFor();
    await button("Scarta le modifiche").click();
    await page.locator('[data-community-sub="public"][aria-current="page"]').waitFor();
    passed.push(
      "Listing form: «Copia dalle aspettative» copies the B27 warnings into the form; leaving with typed changes asks («Continua a modificare» keeps the form, «Scarta le modifiche» leaves)",
    );
    await page.getByLabel("Pagina pubblica attiva").check();
    await button("Salva pagina pubblica").click();
    await toast("Pagina pubblica salvata");
    const warning = page.locator("[data-community-public-warning]");
    await warning.waitFor();
    check(
      (await warning.innerText()).includes("non mostrerebbe nulla"),
      "Kanka warning text missing",
    );
    await shot("b59-08-public-warning.png");
    await button("Correggi").click();
    check(
      (await page.evaluate(() => document.activeElement?.name)) === "entries",
      "Correggi did not move focus to the entries",
    );
    await page.keyboard.press("Space");
    await button("Salva pagina pubblica").click();
    await toast("Pagina pubblica salvata");
    await warning.waitFor({ state: "detached" });
    const link = await page.locator("[data-community-link]").inputValue();
    check(link.endsWith("#community?tab=public&id=lanterns"), "Public link wrong: " + link);
    await button("Vedi come visitatore").click();
    await page.locator(".community-preview", { hasText: "Anteprima come visitatore" }).waitFor();
    const visitor = await page.locator(".community-public").innerText();
    check(visitor.includes("vecchio osservatorio"), "Visitor view lacks the chosen recap");
    check(visitor.includes("D&D 2024 · SRD 5.2.1"), "Visitor view lacks the rules line");
    await shot("b59-09-public-visitor.png");
    await button("Torna alla gestione").click();
    await page.locator('[data-community-sub="public"][aria-current="page"]').waitFor();
    // R2: the public page renders the recap as the campaign page does: line breaks kept
    // and a compendium @Embed (B16, FVT-175) as a block, never the raw marker.
    await page.goto(base + "#library?tab=compendium&revision=srd2024:creature:wolf");
    await button("Incorpora nel diario…").click();
    await page.locator('#dialog select[name="target"]').selectOption("legacy-recap-summary");
    await submit();
    await page.locator("[data-campaign-form]").waitFor();
    await page.locator("[data-campaign-apply]").click();
    if (await page.locator("[data-campaign-apply]").count())
      await page.locator("[data-campaign-apply]").click();
    await page.waitForURL(/tab=entry&id=legacy-recap-summary/);
    await page.goto(base + "#community?tab=public&id=lanterns");
    const publicPage = page.locator(".community-public");
    await publicPage.locator(".campaign-prose .text-embed .compendium-statblock").waitFor();
    check(
      !(await publicPage.innerText()).includes("@Embed["),
      "Raw embed marker on the public page",
    );
    check(
      (await publicPage
        .locator(".campaign-prose")
        .first()
        .evaluate((el) => getComputedStyle(el).whiteSpace)) === "pre-wrap",
      "Public prose does not keep line breaks",
    );
    check(await noOverflow(), "Public page with an embed overflows");
    await shot("b59-17-public-embed.png", { fullPage: true });
    // The embed is bound: «Apri nel compendio» leads to the entry.
    await publicPage.getByRole("button", { name: "Apri nel compendio" }).click();
    await page.waitForFunction(() => location.hash.startsWith("#library"));
    passed.push(
      "R2: public page prose like the campaign page: the recap with a compendium @Embed (added with «Incorpora nel diario…») shows the wolf's stat block in a pre-wrap campaign-prose container, no raw «@Embed[», bound «Apri nel compendio»",
    );
    await page.goto(base + "#campaign?tab=community&id=public");
    await page.locator('[data-community-sub="public"][aria-current="page"]').waitFor();
    // R: «Vedi come lo vedono gli altri» shows the visitor's box (Kanka View as, SVC-040).
    await page.locator('[data-community-sub="status"]').click();
    await button("Vedi come lo vedono gli altri").click();
    await page.locator(".community-preview", { hasText: "Anteprima come visitatore" }).waitFor();
    const previewSide = page.locator(".community-detail-side");
    check(
      !(await previewSide.innerText()).includes("È il tuo annuncio") &&
        // Full after Marta and Tomas: the visitor's button is the waitlist one.
        (await previewSide
          .getByRole("button", { name: "Mettiti in lista d’attesa" })
          .isDisabled()) &&
        (await previewSide.getByRole("button", { name: "Segnala annuncio" }).isDisabled()),
      "Listing preview does not show the visitor's box",
    );
    await shot("b59-14-listing-preview.png");
    await button("Torna alla gestione").click();
    await page.locator("[data-community-status]").waitFor();
    passed.push(
      "R: «Vedi come lo vedono gli altri» opens the visitor's view of the listing (inactive «Mettiti in lista d’attesa» on the full table, Segnala, Blocca) with «Torna alla gestione» back to Reclutamento",
    );
    passed.push(
      "Kanka public page: enabled with nothing chosen shows «non mostrerebbe nulla» + Correggi (focus to the entries, Space ticks), save removes the warning; LegendKeeper-style link; visitor preview shows only the chosen campaign-wide recap; «Torna alla gestione»",
    );

    // ---------------------------------------------------------------------------------
    // H. DM: a second campaign (B13) gets a listing: draft → prerequisites → publish with
    // the code of conduct; the player from the directory is invited to apply.
    await page.locator('.app-header nav [data-nav="campaigns"]').click();
    await page.getByRole("heading", { name: "Campagne", level: 1 }).waitFor();
    await page.locator('.page-heading [data-cm="create"]').click();
    await page.locator("#dialog [name=name]").fill("Una notte a Bruma");
    await page
      .locator("#dialog [name=description]")
      .fill("One-shot al porto di Bruma: una notte di contrabbando e lanterne spente.");
    await page.locator("#dialog [name=nextLocal]").fill(nextWeek);
    await page.locator("#dialog [name=timeZone]").fill("Europe/Rome");
    await submit();
    await toast("Campagna creata");
    // R: Roll20 SVC-003 «Join a Game» on My Games: Campagne → «Trova un tavolo».
    await page.locator('.app-header nav [data-nav="campaigns"]').click();
    await page.getByRole("heading", { name: "Campagne", level: 1 }).waitFor();
    await page.locator('.page-heading [data-nav="community"]').click();
    await page.getByRole("heading", { name: "Tavoli pubblici", level: 1 }).waitFor();
    await page.locator('.community-tabs [data-community-tab="manage"]').click();
    await page.locator("[data-community-campaign]").selectOption({ label: "Una notte a Bruma" });
    await button("Crea annuncio").click();
    await toast("Bozza creata");
    const draftStatus = page.locator("[data-community-status]");
    check(
      (await draftStatus.innerText()).includes("Bozza · non pubblicato"),
      "New listing is not a draft",
    );
    check(
      (await draftStatus.locator(".is-missing").allInnerTexts()).some((t) =>
        t.includes("strumento di sicurezza"),
      ),
      "Missing safety tool not named",
    );
    // R: «Risolvi» on the safety-tool requirement opens the form on that field.
    await draftStatus
      .locator("li", { hasText: "strumento di sicurezza" })
      .getByRole("button", { name: "Risolvi" })
      .click();
    const listingForm = page.locator('[data-community-form="listing"]');
    await listingForm.waitFor();
    check(
      await page
        .waitForFunction(() => document.activeElement?.name === "tools", null, { timeout: 2000 })
        .then(
          () => true,
          () => false,
        ),
      "Fix link did not focus the safety tools",
    );
    check(
      (await listingForm.locator('[name="pitch"]').inputValue()).startsWith("One-shot al porto"),
      "Listing not prefilled from the B13 description",
    );
    await listingForm
      .locator('[name="pitch"]')
      .fill(
        "Una sera sola al porto di Bruma: contrabbandieri, lanterne e un faro da riaccendere. Venite su discord.gg/bruma",
      );
    await listingForm.locator('[name="format"]').selectOption("one-shot");
    await listingForm.locator('[name="frequency"]').selectOption("once");
    await listingForm.locator('[name="seats"]').fill("1");
    await listingForm.locator('[name="tools"][value="stop"]').check();
    await listingForm.locator('[name="tools"][value="lines"]').check();
    await listingForm.locator('[name="warnings"][value="drowning"]').check();
    await listingForm.locator('[name="waitlist"]').uncheck();
    await button("Salva annuncio").click();
    await page.locator("#toast.shown.error", { hasText: "Niente link esterni" }).waitFor();
    await listingForm
      .locator('[name="pitch"]')
      .fill("Una sera sola al porto di Bruma: contrabbandieri, lanterne e un faro da riaccendere.");
    await button("Salva annuncio").click();
    await toast("Annuncio salvato");
    await shot("b59-10-listing-form.png", { fullPage: true });
    await page.locator('[data-community-sub="status"]').click();
    await button("Pubblica").click();
    await dialog().waitFor();
    await submit();
    await page.waitForTimeout(150);
    check(
      (await dialog().count()) === 1 &&
        !(await page.locator('#dialog [name="conduct"]').evaluate((box) => box.checkValidity())),
      "Publish went ahead without accepting the code of conduct",
    );
    await page.locator('#dialog [name="conduct"]').check();
    await submit();
    await toast("Annuncio pubblicato");
    await page
      .locator("[data-community-status] .community-listing-state", {
        hasText: "visibile nella ricerca",
      })
      .waitFor();
    await button("Disattiva").click();
    await toast("Annuncio disattivato");
    await page
      .locator("[data-community-status] .community-listing-state", { hasText: "Disattivato" })
      .waitFor();
    await button("Riattiva").click();
    await toast("Annuncio pubblicato");
    await page.locator('[data-community-sub="players"]').click();
    const seeker = page.locator(".community-row", { hasText: "Venerdì e sabato sera" });
    await seeker.waitFor();
    await seeker.getByRole("button", { name: "Invita a candidarsi" }).click();
    await toast("Invito a candidarsi inviato");
    await seeker.locator(".badge", { hasText: "Invitato a candidarsi" }).waitFor();
    // R: every directory row has Report and Block (Roll20 SVC-148/149); a blocked person
    // stays listed and cannot be invited; Unblock in place.
    const priya = page.locator('[data-community-directory-row="sim-priya"]');
    await priya.getByRole("button", { name: "Blocca Priya Shah" }).click();
    await submit();
    await toast("Priya Shah bloccato");
    await priya.locator("text=Bloccata da te: sbloccala per invitarla").waitFor();
    check(
      (await priya.getByRole("button", { name: "Invita a candidarsi" }).count()) === 0,
      "A blocked person can still be invited",
    );
    await priya.getByRole("button", { name: "Segnala" }).click();
    await page.locator('#dialog [name="reason"]').selectOption("spam");
    await submit();
    await toast("Segnalazione ricevuta");
    await priya.getByRole("button", { name: "Sblocca Priya Shah" }).click();
    await toast("Priya Shah sbloccato");
    await priya.getByRole("button", { name: "Invita a candidarsi" }).waitFor();
    passed.push(
      "Second campaign created in B13, then R: Campagne → «Trova un tavolo» (SVC-003) → I miei annunci → Crea annuncio (draft prefilled from B13); status names the missing safety tool and R: its «Risolvi» opens the form focused on the tools; off-site link refused (Roll20 SVC-069); publish refused without the code of conduct, then published; Disattiva/Riattiva; the player's directory entry invited to apply; R: Priya blocked (stays listed, not invitable), reported, unblocked in place",
    );

    // ---------------------------------------------------------------------------------
    // I–K. Two-identity loop: invitation → application → notification to the DM →
    // acceptance with a reply → B13 invitation → the player's notice and next step.
    await as("player");
    await page.goto(base + "#community?tab=mine");
    await page.getByRole("heading", { name: "Inviti a candidarti" }).waitFor();
    await page
      .locator(".community-row", { hasText: "Una notte a Bruma" })
      .getByRole("button", { name: "Apri annuncio" })
      .click();
    await page.locator(".community-callout", { hasText: "ti invita a candidarti" }).waitFor();
    check(
      (await content()).includes("Avvisi di contenuto") &&
        (await content()).includes("Annegamento"),
      "Content warnings not shown before applying",
    );
    await button("Candidati").click();
    await page.locator('#dialog [name="message"]').fill("Ci sono! Porto Livia, se va bene.");
    await page.locator('#dialog [name="conduct"]').check();
    await submit();
    await toast("Candidatura inviata");
    await as("dm");
    await closeNotices();
    await page.locator('[data-service="requests"]').click();
    const notice = page.locator(".notifications-item", {
      hasText: "Nuova candidatura · Una notte a Bruma",
    });
    await notice.waitFor();
    await notice.locator("[data-notifications-open]").click();
    await page.locator("[data-community-queue]").waitFor();
    check(
      page.url().includes("#community?tab=manage"),
      "DM notice did not open the manage tab: " + page.url(),
    );
    const loop = page.locator("[data-community-queue] .community-row", {
      hasText: "Ci sono! Porto Livia",
    });
    await loop.getByRole("button", { name: "Accetta…" }).click();
    await page.locator('#dialog [name="reply"]').fill("Ti aspetto venerdì al porto.");
    await submit();
    await toast("accettato");
    await page
      .locator("[data-community-status] .community-listing-state", {
        hasText: "Disattivato da solo: tavolo completo",
      })
      .waitFor();
    // R2: the accepted player (B13 invitation pending) is not invited to apply again.
    await page.locator('[data-community-sub="players"]').click();
    const acceptedSeeker = page.locator('[data-community-directory-row="player"]');
    await acceptedSeeker.locator("text=Già accettato: invito alla campagna in attesa").waitFor();
    check(
      (await acceptedSeeker.getByRole("button", { name: "Invita a candidarsi" }).count()) === 0,
      "An accepted player can still be invited to apply",
    );
    passed.push(
      "R2: Giocatori in cerca: the player accepted with the B13 invitation pending shows «Già accettato: invito alla campagna in attesa», no «Invita a candidarsi»",
    );
    data = await stored();
    const second = Object.values(data.ext.community.listings).find(
      (row) => row.title === "Una notte a Bruma",
    );
    const loopApp = data.ext.community.applications.find(
      (row) => row.listingId === second.id && row.who === "player",
    );
    const invite = data.ext["campaign-members"].campaigns[second.campaignId].directInvites.find(
      (row) => row.id === loopApp.inviteId,
    );
    check(
      invite?.to === "player" && invite.status === "pending",
      "B13 invitation not created: " + JSON.stringify(invite),
    );
    await as("player");
    await closeNotices();
    await page.locator('[data-service="requests"]').click();
    const accepted = page.locator(".notifications-item", {
      hasText: "Candidatura accettata · Una notte a Bruma",
    });
    await accepted.waitFor();
    check(
      (await accepted.innerText()).includes("Ti aspetto venerdì al porto."),
      "Reply not in the notice",
    );
    check(
      (await page
        .locator(".notifications-item", { hasText: "Invito · Una notte a Bruma" })
        .count()) === 1,
      "B13 invitation notice missing",
    );
    await accepted.locator("[data-notifications-open]").click();
    await page.getByRole("heading", { name: "Le mie candidature" }).waitFor();
    const acceptedRow = page.locator(".community-row", { hasText: "Una notte a Bruma" }).first();
    await acceptedRow.getByRole("button", { name: "Apri l’invito" }).click();
    await page.waitForFunction(() => location.hash.startsWith("#campaigns?tab=join"));
    await page.locator("#content", { hasText: "Una notte a Bruma" }).waitFor();
    // R: declining the B13 invitation is shown on the listing instead of «Accettata».
    await page.locator('.app-header nav [data-nav="campaigns"]').click();
    await page
      .locator(".cm-inbox-row", { hasText: "Una notte a Bruma" })
      .getByRole("button", { name: "Rifiuta" })
      .click();
    await toast("Invito rifiutato");
    await page.goto(base + "#community?tab=listing&id=" + second.id);
    await page
      .locator(".community-mine", { hasText: "Hai rifiutato l’invito alla campagna" })
      .waitFor();
    check((await button("Apri l’invito").count()) === 0, "Stale «Apri l’invito» after declining");
    passed.push(
      "R: after declining the B13 invitation the listing shows «Hai rifiutato l’invito alla campagna» under the last application, no stale «Apri l’invito»",
    );
    // R2: the declined invitation frees the reserved seat: the badge no longer says full.
    await as("dm");
    await page.goto(base + "#community?tab=manage&id=" + second.campaignId);
    const brumaState = page.locator("[data-community-status] .community-listing-state");
    await brumaState.filter({ hasText: "si è liberato un posto: riattivalo" }).waitFor();
    check(
      (await page.locator("[data-community-status]").innerText()).includes("1 posto libero su 1"),
      "Seats line does not show the free seat",
    );
    await button("Riattiva").click();
    await toast("Annuncio pubblicato");
    await brumaState.filter({ hasText: "visibile nella ricerca" }).waitFor();
    passed.push(
      "R2: after the seat frees (B13 invitation declined) the badge says «si è liberato un posto: riattivalo» instead of «tavolo completo»; Riattiva makes it visible again",
    );
    // R2: archiving the campaign in B13 keeps its queue reachable until answered.
    await as("player");
    await page.goto(base + "#community?tab=listing&id=" + second.id);
    await button("Candidati di nuovo").click();
    await page.locator('#dialog [name="message"]').fill("Riprovo: posso venire venerdì?");
    await submit();
    await toast("Candidatura inviata");
    await as("dm");
    await page.goto(base + "#campaigns?id=" + second.campaignId + "&tab=manage");
    await button("Archivia").click();
    await toast("Campagna archiviata");
    await closeNotices();
    await page.locator('[data-service="requests"]').click();
    const archivedNotice = page.locator(".notifications-item", {
      hasText: "Nuova candidatura · Una notte a Bruma",
    });
    await archivedNotice.waitFor();
    await archivedNotice.locator("[data-notifications-open]").click();
    await page.locator("[data-community-queue]").waitFor();
    check(
      page.url().includes("tab=manage&id=" + second.campaignId),
      "Bell did not open the archived campaign's queue: " + page.url(),
    );
    const archivedStatus = page.locator("[data-community-status]");
    check(
      (await archivedStatus.innerText()).includes("Una notte a Bruma"),
      "Another campaign's status is shown",
    );
    check(
      (await page.locator("[data-community-campaign] option:checked").innerText()).includes(
        "Una notte a Bruma (archiviata)",
      ),
      "Archived campaign not named in the selector",
    );
    const campaignRow = archivedStatus.locator("li.is-missing", { hasText: "Campagna attiva" });
    await campaignRow.waitFor();
    const retry = page.locator("[data-community-queue] .community-row", {
      hasText: "Riprovo: posso venire",
    });
    check(
      (await retry.getByRole("button", { name: "Accetta…" }).count()) === 0 &&
        (await retry.innerText()).includes("ripristinala in Campagne per accettare"),
      "Accept offered for an archived campaign",
    );
    await shot("b59-18-archived-queue.png", { fullPage: true });
    await campaignRow.getByRole("button", { name: "Risolvi" }).click();
    await page.waitForFunction(
      (cid) => location.hash.includes("campaigns?id=" + cid),
      second.campaignId,
    );
    await button("Ripristina").waitFor();
    await page.goBack();
    await retry.getByRole("button", { name: "Non accettare…" }).click();
    await page
      .locator('#dialog [name="reply"]')
      .fill("La campagna è in pausa: ti scrivo quando riparte.");
    await submit();
    await toast("Risposta inviata");
    await page.goto(base + "#community?tab=manage");
    await page.locator("[data-community-status]").waitFor();
    check(
      !(await page.locator("#content").innerText()).includes("Una notte a Bruma (archiviata)"),
      "Answered archived campaign still listed in I miei annunci",
    );
    await as("player");
    await closeNotices();
    await page.locator('[data-service="requests"]').click();
    await page
      .locator(".notifications-item", {
        hasText: "Candidatura non accettata · Una notte a Bruma",
      })
      .filter({ hasText: "ti scrivo quando riparte" })
      .waitFor();
    await page.keyboard.press("Escape");
    passed.push(
      "R2: campaign archived in B13 with an application waiting: the DM's bell opens that campaign's own queue («Una notte a Bruma (archiviata)»), the status box names «Campagna attiva» with Risolvi → Campagne (Ripristina), no «Accetta…» with the reason; «Non accettare…» with a reply reaches the player's bell; answered, the campaign leaves I miei annunci",
    );
    passed.push(
      "Two identities: the player applies from the directory invitation (warnings seen first); the DM's bell (B24) opens the queue; acceptance with a reply creates the B13 invitation, the listing turns off by itself when full (Roll20 SVC-067); the player's bell shows the reply and the B13 invitation; «Apri l’invito» opens the B13 join page",
    );

    // ---------------------------------------------------------------------------------
    // L–M. Player vs DM, reload persistence.
    await page.goto(base + "#campaign?tab=community");
    await page.waitForTimeout(200);
    check(!(await content()).includes("Tomas Ferri"), "Player can read the DM's queue");
    check(
      (await page.locator('.campaign-sidebar [data-campaign-tab="community"]').count()) === 0,
      "Player sees Reclutamento",
    );
    await page.goto(base + "#community");
    check(
      (await page.locator('.community-tabs [data-community-tab="manage"]').count()) === 0,
      "Player sees I miei annunci",
    );
    await page.reload();
    await page.getByRole("heading", { name: "Tavoli pubblici", level: 1 }).waitFor();
    await page.locator('.community-tabs [data-community-tab="mine"]').click();
    await page.getByRole("heading", { name: "Le mie candidature" }).waitFor();
    const afterReload = await content();
    check(
      afterReload.includes("il martedì sera sono sempre libera") &&
        afterReload.includes("Ti aspetto venerdì al porto."),
      "Applications not kept after reload",
    );
    passed.push(
      "Player sees no Reclutamento section, no manage tab and no queue messages; reload keeps applications and replies",
    );

    // ---------------------------------------------------------------------------------
    // N. EN phone 390 with touch in Europe/London: search, listing, apply; offline refusal.
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      timezoneId: "Europe/London",
      locale: "en-GB",
    });
    await phone.addInitScript(
      ([k, value]) => {
        if (!sessionStorage.getItem("b59-seeded")) {
          localStorage.setItem(k, value);
          sessionStorage.setItem("b59-seeded", "1");
        }
      },
      [key, snapshot],
    );
    mobile = await phone.newPage();
    mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
    await mobile.goto(base);
    await mobile.locator("#demo-role").selectOption("player");
    await mobile.locator('[data-service="preferences"]').tap();
    await mobile.locator('#dialog [name="lang"]').selectOption("en");
    await mobile.locator("#dialog button[type=submit]").tap();
    const phoneWidget = mobile.locator(".community-home");
    await phoneWidget.scrollIntoViewIfNeeded();
    await phoneWidget.getByRole("button", { name: "Find a table" }).tap();
    await mobile.getByRole("heading", { name: "Public tables", level: 1 }).waitFor();
    check(await noOverflow(mobile), "Phone search overflows");
    check(
      (await card("Il Faro Spento", mobile).innerText()).includes(
        "your time · 20:30 in Europe/Rome",
      ),
      "Phone not in the viewer's zone (London)",
    );
    await mobile.getByLabel("Show adult listings (18+)").tap();
    await mobile.waitForFunction(() => document.querySelectorAll(".community-card").length >= 4);
    await shot("b59-12-phone-find-en.png", {}, mobile);
    await card("La Cripta di Vetro", mobile)
      .locator(".community-card-side [data-community-open]")
      .tap();
    await mobile.locator("#community-detail-title", { hasText: "La Cripta di Vetro" }).waitFor();
    check(await noOverflow(mobile), "Phone listing overflows");
    await button("Apply", mobile).tap();
    await mobile
      .locator('#dialog [name="message"]')
      .fill("First time with the 2024 rules, happy to learn!");
    const phoneConduct = mobile.locator('#dialog [name="conduct"]');
    check(await phoneConduct.isChecked(), "Accepted code of conduct not pre-ticked on the phone");
    await phoneConduct.tap();
    check(!(await phoneConduct.isChecked()), "Tap did not untick the conduct box");
    await phoneConduct.tap();
    await mobile.locator("#dialog button[type=submit]").tap();
    await toast("Application sent", mobile);
    await mobile.locator(".community-mine", { hasText: "Waiting for the DM" }).waitFor();
    const phoneSmall = await smallTargets(
      ".community button, .community select, .community input:not([type=checkbox])",
      mobile,
    );
    check(!phoneSmall.length, "Small phone targets: " + JSON.stringify(phoneSmall));
    await shot("b59-13-phone-listing-en.png", { fullPage: true }, mobile);
    const setOffline = async (value) => {
      await mobile.locator('[data-service="preferences"]').tap();
      const box = mobile.locator('#dialog [name="offline"]');
      if (value) await box.check();
      else await box.uncheck();
      await mobile.locator("#dialog button[type=submit]").tap();
    };
    await setOffline(true);
    await mobile.locator(".community-offline").waitFor();
    await button("Withdraw application", mobile).tap();
    await mobile.locator("#dialog button[type=submit]").tap();
    await mobile.locator("#dialog .dialog-error", { hasText: "offline" }).waitFor();
    await mobile.locator("#dialog [data-close]").first().tap();
    const phoneData = await slice(mobile);
    const cripta = phoneData.applications.find(
      (row) => row.who === "player" && row.listingId === "listing-cripta",
    );
    check(cripta.status === "pending", "Offline withdraw changed the application");
    await setOffline(false);
    await button("Withdraw application", mobile).tap();
    await mobile.locator("#dialog button[type=submit]").tap();
    await toast("Application withdrawn", mobile);
    check(
      (await slice(mobile)).applications.find((row) => row.id === cripta.id).status === "withdrawn",
      "Online withdraw not stored",
    );
    passed.push(
      "EN phone 390 (touch, London): Find a table from Home, times in the viewer's zone, 18+ box, listing and Apply by tap; ≥ 40 px targets and no overflow; offline Withdraw refused in the dialog with the shell's message and nothing changed; online Withdraw works",
    );
    // R2: the waitlist position in English is «#3», never the Italian «3°».
    await mobile.goto(base + "#community?tab=listing&id=listing-salt");
    await mobile.locator("#community-detail-title", { hasText: "Salt Road Watch" }).waitFor();
    await button("Join the waitlist", mobile).tap();
    await mobile.locator('#dialog [name="message"]').fill("Happy to wait for a seat.");
    await mobile.locator("#dialog button[type=submit]").tap();
    await toast("You are on the waitlist, position 3", mobile);
    const phoneWaiting = mobile.locator(".community-mine", { hasText: "On the waitlist · #3" });
    await phoneWaiting.waitFor();
    check(!/\d°/.test(await phoneWaiting.innerText()), "Italian ordinal in the English UI");
    await mobile.goto(base + "#community?tab=mine");
    await mobile.locator(".community-row", { hasText: "On the waitlist · #3" }).first().waitFor();
    check(
      !/\d°/.test(await mobile.locator("#content").innerText()),
      "Italian ordinal in My applications",
    );
    check(await noOverflow(mobile), "Phone My applications overflows");
    passed.push(
      "R2: EN phone: joining the full Salt Road Watch shows «On the waitlist · #3» on the listing and in My applications, no «3°»",
    );
    // R: the DM's status checklist at 390 px: each label beside its mark, never below.
    await mobile.locator("#demo-role").selectOption("dm");
    await mobile.goto(base + "#campaign?tab=community");
    await mobile.locator("[data-community-status]").waitFor();
    const wrapped = await mobile.evaluate(() =>
      [...document.querySelectorAll(".community-checks li")]
        .map((li) => {
          const mark = li.children[0].getBoundingClientRect();
          const label = li.children[1].getBoundingClientRect();
          return { text: li.children[1].innerText.slice(0, 40), ok: label.left >= mark.right };
        })
        .filter((row) => !row.ok),
    );
    check(!wrapped.length, "Phone checklist labels under the mark: " + JSON.stringify(wrapped));
    check(await noOverflow(mobile), "Phone recruiting section overflows");
    await shot("b59-15-phone-status-en.png", { fullPage: true }, mobile);
    passed.push(
      "R: EN phone 390, DM Recruiting status box: every checklist label stays beside its mark (grid), no overflow",
    );

    // Desktop widths: no overflow on the main community pages.
    for (const hash of [
      "#community",
      "#community?tab=conduct",
      "#community?tab=listing&id=listing-salt",
    ]) {
      await page.goto(base + hash);
      await page.waitForTimeout(150);
      check(await noOverflow(), "Desktop overflow on " + hash);
    }
    // "Ripristina esempio" reseeds the area: seeded applications back, new ones gone.
    await page.bringToFront();
    await button("Ripristina esempio").click();
    await button("Ripristina").click();
    await page.waitForTimeout(300);
    const reseeded = await slice();
    check(
      reseeded.applications.length === 5 &&
        reseeded.applications.find((row) => row.id === "app-tomas").status === "pending" &&
        !reseeded.reports.length,
      "Reset did not reseed the community slice",
    );
    passed.push(
      "«Ripristina esempio» reseeds the community slice (seeded applications pending again, reports gone)",
    );
    const desktopSmall = await smallTargets(".community button", page);
    if (desktopSmall.length)
      findings.push("Desktop small targets: " + JSON.stringify(desktopSmall));
    check(errors.length === 0, "Page errors: " + errors.join("; "));
    await phone.close();
    await context.close();
    return { passed, findings, errors };
  } catch (error) {
    await page.screenshot({ path: shots + "b59-failure-desktop.png" }).catch(() => {});
    if (mobile) await mobile.screenshot({ path: shots + "b59-failure-phone.png" }).catch(() => {});
    throw Error(error.message + " | passed so far: " + passed.join(" / "));
  }
};
