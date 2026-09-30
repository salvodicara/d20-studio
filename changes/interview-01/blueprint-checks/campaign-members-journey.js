async (rootPage) => {
  // B13 — Campaigns: creation, invitations, joining and members. Real clicks, keys and
  // touch against the one app: IT desktop 1440 (DM and player identities), then EN phone
  // 390 with touch. Synthetic data only; resets this browser's demo state. Screenshots of
  // the main states go to the B13 evidence folder, never into the checkout.
  const browser = rootPage.context().browser();
  for (const prior of browser.contexts()) if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B13/";
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const members = async () => (await stored()).ext["campaign-members"];
  const as = (role) => page.locator("#demo-role").selectOption(role);
  const button = (name, root = page) => root.getByRole("button", { name, exact: true });
  const card = (name) => page.locator(".cm-card", { hasText: name });
  const content = () => page.locator("#content").innerText();
  const toast = (text) => page.locator("#toast.shown", { hasText: text }).waitFor();
  const dialog = page.locator("#dialog[open]");
  const submit = () => page.locator("#dialog[open] button[type=submit]").click();
  const shot = (name) => page.screenshot({ path: dir + name });
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  const moveGoblinLeft = async () => {
    await page.locator("#battle-map").waitFor();
    const goblin = page.locator('#battle-map [data-actor="goblin-1"]');
    const before = await goblin.getAttribute("transform");
    await goblin.focus();
    await page.keyboard.press("Enter");
    await page.locator("#battle-map").focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    return {
      before,
      after: await page.locator('#battle-map [data-actor="goblin-1"]').getAttribute("transform"),
    };
  };
  const nextWeek = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10) + "T20:30";

  // 1. Reset. DM: keyboard opens and Escape closes the Create dialog without saving.
  await page.goto(base + "#campaigns");
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await page.getByRole("heading", { name: "Campagne", level: 1 }).waitFor();
  await as("dm");
  const createButton = page.locator('.page-heading [data-cm="create"]');
  await createButton.focus();
  await page.keyboard.press("Enter");
  await dialog.waitFor();
  check(
    (await page.locator("#dialog h2").innerText()) === "Crea campagna",
    "Create dialog not opened by keyboard",
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  check(!(await dialog.count()), "Escape did not close the Create dialog");
  check(Object.keys((await members()).campaigns).length === 1, "Escape saved a campaign");
  passed.push("Keyboard: Enter opens Crea campagna, Escape discards it");

  // 2. Create World (FVT-001): invalid image refused, then image, description, tags, next date.
  await createButton.click();
  await page.locator("#dialog [name=name]").fill("Rovine di Vetro");
  await page.locator("#dialog [data-cm-image]").setInputFiles(dir + "not-an-image.txt");
  await page.locator("#dialog [data-cm-image-status]", { hasText: "PNG, JPG o WebP" }).waitFor();
  await page.locator("#dialog [data-cm-image]").setInputFiles(dir + "glass-ruins-cover.png");
  await page.locator("#dialog [data-cm-image-status]", { hasText: "Immagine pronta" }).waitFor();
  await page
    .locator("#dialog [name=description]")
    .fill(
      "Una città di vetro nero riemerge dalla palude: il gruppo segue la mappa della cartografa.",
    );
  await page.locator("#dialog [name=tags]").fill("vetro, 2024, esplorazione");
  await page.locator("#dialog [name=nextLocal]").fill(nextWeek);
  check(
    (await page.locator("#dialog .cm-rules").innerText()).includes("D&D 2024 · SRD 5.2.1"),
    "Fixed rules not shown",
  );
  await shot("01-create-dialog.png");
  await submit();
  await page.waitForURL(/#campaigns\?id=campaign-[a-z0-9-]+&tab=invites/);
  const id = page.url().match(/id=(campaign-[a-z0-9-]+)/)[1];
  let data = await stored();
  const parked = data.ext["campaign-members"].parked[id];
  check(
    parked.campaign.name === "Rovine di Vetro" && parked.scenes.length === 1,
    "Second campaign not parked with its scene",
  );
  check(
    /^data:image\/png;base64,/.test(data.ext["campaign-members"].campaigns[id].image),
    "Image not stored",
  );
  check(
    parked.campaign.sessions[0].localTime === nextWeek,
    "Next session not stored as a real session",
  );
  check(
    data.campaign.id === "lanterns" && data.scenes[0].tokens.length === 5,
    "Lanterns changed by creation",
  );
  passed.push(
    `Created ${id}: image, tags, next session ${nextWeek}; lanterns still current with 5 tokens`,
  );

  // 3. Player link 48 h, one use (SVC-038) with copy button beside it.
  await page.locator("[data-cm-form=link] [name=role]").selectOption("player");
  await page.locator("[data-cm-form=link] [name=hours]").selectOption("48");
  await page.locator("[data-cm-form=link] [name=uses]").selectOption("1");
  await button("Crea link").click();
  await toast("Link creato");
  const linkOne = await page.locator(".cm-link:not(.is-closed) [data-cm-url]").first().inputValue();
  check(
    /#campaigns\?tab=join&id=[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(linkOne),
    "Invite URL shape: " + linkOne,
  );
  check((await page.locator(".cm-link").first().innerText()).includes("usi 0/1"), "Uses not shown");
  await button("Copia").first().click();
  await page.locator("#toast.shown", { hasText: /Link copiato|Copia manuale/ }).waitFor();
  await shot("02-details-invites-link.png");
  passed.push("Link Giocatore 48 h / 1 uso created, copy button answers");

  // 4. My Games: two cards, status and tag filters, search, last access.
  await page.locator('[data-cm="back"]').first().click();
  await page.locator(".cm-card").nth(1).waitFor();
  check((await page.locator(".cm-card").count()) === 2, "List does not show two campaigns");
  check(
    (await page.locator('[data-cm="status"][data-status="active"]').innerText()).includes("2"),
    "Active count",
  );
  check(
    (await card("Rovine di Vetro").innerText()).includes("questo minuto"),
    "Last access not shown",
  );
  await page.locator('[data-cm="tag"][data-tag="vetro"]').click();
  check((await page.locator(".cm-card").count()) === 1, "Tag filter did not filter");
  await page.locator('[data-cm="tag"][data-tag="vetro"]').click();
  await page.locator("[data-cm-search]").fill("lanterne");
  check(await card("Rovine di Vetro").isHidden(), "Search did not hide the other card");
  await page.locator("[data-cm-search]").fill("");
  await page.locator('[data-cm="status"][data-status="archived"]').click();
  check((await content()).includes("Nessuna campagna archiviata"), "Archived filter");
  await page.locator('[data-cm="status"][data-status="active"]').click();
  await shot("03-my-games-list.png");
  passed.push("My Games: 2 cards, Attive/Archiviate, #vetro tag, search, ultimo accesso");

  // 5. Player opens the link: four DDB paths, keyboard choice of Mira, recipient preview.
  await as("player");
  await page.goto(linkOne);
  await page.locator(".cm-path").nth(3).waitFor();
  const paths = await page.locator(".cm-path strong").allInnerTexts();
  check(
    paths.join("|") ===
      "Crea un personaggio|Da un personaggio pronto|Reclama un personaggio|Entra con un tuo personaggio",
    "Paths: " + paths.join("|"),
  );
  await shot("04-join-four-paths.png");
  await page.locator('[data-path="own"]').click();
  await page.locator("input[name=actorId]").first().focus();
  await page.keyboard.press("ArrowDown");
  check(
    (await page.locator("input[name=actorId]:checked").inputValue()) === "mira",
    "Arrow key did not choose Mira",
  );
  await button("Controlla chi vedrà la scheda").click();
  await dialog.waitFor();
  const preview = await page.locator("#dialog").innerText();
  check(
    preview.includes("Chi potrà vedere la scheda") &&
      preview.includes("DM") &&
      preview.includes("Le lanterne di Bruma") &&
      preview.includes("Solo io"),
    "Recipient preview: " + preview,
  );
  await shot("05-join-recipient-preview.png");
  await submit();
  await page.locator(".cm-seat", { hasText: "Giocato da Giocatore" }).waitFor();
  check(
    (await page.locator(".cm-seat").innerText()).includes("Mira"),
    "Mira not seated for the player",
  );
  data = await stored();
  check(
    data.actors.mira.campaignIds.includes(id) && data.actors.mira.campaignIds.includes("lanterns"),
    "Mira not connected to both campaigns",
  );
  passed.push(
    "Player joined Rovine di Vetro with Mira after the recipient preview (keyboard radio choice)",
  );

  // 6. The second use of the one-use link is refused with its reason.
  await page.goto(linkOne);
  await page.locator(".cm-problem").waitFor();
  check((await content()).includes("già stato usato 1 volta su 1"), "Second use not refused");
  check(!(await page.locator(".cm-path").count()), "Paths offered on a used-up link");
  await shot("06-second-use-refused.png");
  await page.reload();
  await button("Le tue campagne").click();
  await card("Rovine di Vetro").waitFor();
  check(
    (await card("Rovine di Vetro").innerText()).includes("Giocatore"),
    "Player role lost after reload",
  );
  passed.push("Second use refused with reason; reload keeps the membership");

  // 7. Usable across Campaigns, Table and Home: the DM launches Rovine di Vetro, then back.
  await as("dm");
  await card("Rovine di Vetro").getByRole("button", { name: "Avvia" }).click();
  await page.locator("#battle-map").waitFor();
  check(
    (await page.locator(".table-topline h1").innerText()) === "Scena iniziale",
    "Table not on the new campaign",
  );
  await page.goto(base + "#home");
  await page.locator(".resume-scene h2", { hasText: "Rovine di Vetro" }).waitFor();
  check(
    (await page.locator(".campaign-entry").first().innerText()).includes("20:30"),
    "Home appointment not the created next session",
  );
  check(
    (await page.locator(".cm-home").innerText()).includes("Le lanterne di Bruma"),
    "Home box does not list the other campaign",
  );
  await shot("07-home-rovine-current.png");
  await as("player");
  await page.locator(".resume-scene h2", { hasText: "Rovine di Vetro" }).waitFor();
  await page.goto(base + "#campaign?tab=campaign-members");
  await page.locator(".campaign-sidebar .nav-link.active", { hasText: "Membri" }).waitFor();
  check(
    (await content()).includes("Gioca: Mira"),
    "Members section does not show Mira for the player",
  );
  await as("dm");
  await page.goto(base + "#home");
  await page.locator(".cm-home").getByRole("button", { name: "Avvia" }).click();
  await page.locator(".table-topline h1", { hasText: "Il cortile dell’osservatorio" }).waitFor();
  check(
    (await page.locator("#battle-map [data-actor]").count()) === 5,
    "Lanterns tokens changed after the round trip",
  );
  passed.push(
    'Launch: Table "Scena iniziale", Home resume + 20:30 appointment, Members section; back to lanterns with 5 tokens',
  );

  // 8. Approval (VTL-036): the join waits; the DM declines with a message.
  await page.goto(base + `#campaigns?id=${id}&tab=invites`);
  await page.locator("[data-cm-approval]").check();
  await toast("Approvazione degli ingressi attivata");
  await page.locator("[data-cm-form=link] [name=hours]").selectOption("24");
  await page.locator("[data-cm-form=link] [name=uses]").selectOption("5");
  await button("Crea link").click();
  await toast("Link creato");
  const linkTwo = await page.locator(".cm-link:not(.is-closed) [data-cm-url]").first().inputValue();
  await as("player");
  await page.goto(linkTwo);
  await page.locator('[data-path="own"]').click();
  check(
    (await page.locator("input[name=actorId]:checked").inputValue()) === "livia",
    "Livia not offered",
  );
  await button("Controlla chi vedrà la scheda").click();
  check(
    (await page.locator("#dialog").innerText()).includes("Il DM deve approvare"),
    "Approval not announced",
  );
  await button("Invia richiesta").click();
  await page.locator(".cm-problem", { hasText: "In attesa del DM" }).waitFor();
  check(!(await stored()).actors.livia.campaignIds.includes(id), "Livia joined before approval");
  await as("dm");
  await page.locator('.service-nav [data-service="requests"]').click();
  await page.getByText("Richiesta d’ingresso · Rovine di Vetro").first().waitFor();
  await page.keyboard.press("Escape");
  await page.goto(base + `#campaigns?id=${id}&tab=invites`);
  await button("Rifiuta…").click();
  await page.locator("#dialog [name=message]").fill("Siamo al completo per ora.");
  await submit();
  await toast("rifiutata");
  await as("player");
  await page.goto(base + "#campaigns");
  const inbox = page.locator(".cm-inbox-row", { hasText: "rifiutata" });
  check(
    (await inbox.innerText()).includes("Siamo al completo per ora."),
    "Refusal message not shown to the player",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await shot("08-request-denied-inbox.png");
  await inbox.getByRole("button", { name: "Segna come letto" }).click();
  check(
    !(await page.locator(".cm-inbox-row", { hasText: "rifiutata" }).count()),
    "Notice not dismissed",
  );
  passed.push(
    "Approval: request waits (Livia untouched), bell shows it to the DM, refusal message reaches the player",
  );

  // 9. Undo keeps membership: DM moves a goblin, promotes the player to co-DM, then Undo.
  await as("dm");
  await page.goto(base + "#table");
  const move = await moveGoblinLeft();
  check(move.after !== move.before, "DM goblin keyboard move failed");
  await page.goto(base + `#campaigns?id=${id}`);
  await page
    .locator(".cm-member", { hasText: "Giocatore" })
    .getByRole("button", { name: "Promuovi a co-DM" })
    .click();
  await dialog.waitFor();
  const powers = await page.locator("#dialog").innerText();
  check(
    powers.includes("Un co-DM può") &&
      powers.includes("Solo il proprietario può") &&
      powers.includes("Trasferire la proprietà"),
    "Power list missing",
  );
  await shot("09-promote-co-dm-powers.png");
  await button("Conferma ruolo").click();
  await page.locator(".cm-member", { hasText: "Co-DM" }).waitFor();
  await page.goto(base + "#table");
  await button("Annulla ultima modifica").click();
  await toast("Modifica annullata");
  data = await stored();
  check(
    (await page.locator('#battle-map [data-actor="goblin-1"]').getAttribute("transform")) ===
      move.before,
    "Undo did not restore the goblin",
  );
  check(
    data.ext["campaign-members"].parked[id].campaign.members.find((m) => m.id === "player").role ===
      "co-dm",
    "Undo reverted the promotion",
  );
  passed.push(
    "Undo restored the goblin move and kept the co-DM promotion (membership is not gameplay)",
  );

  // 10. Co-DM view: Invitations tab, but no Transfer, Archive or Delete; cannot remove the owner.
  await as("player");
  await page.goto(base + `#campaigns?id=${id}`);
  await page.locator(".cm-hero-title").waitFor();
  check(await page.locator('[data-tab="invites"]').count(), "Co-DM lacks the Invitations tab");
  check(
    !(await page
      .locator(".cm-member", { hasText: "proprietario" })
      .getByRole("button", { name: "Espelli…" })
      .count()),
    "Co-DM can remove the owner",
  );
  await page.locator('[data-tab="manage"]').click();
  await page.locator(".cm-block h2", { hasText: "Proprietà" }).waitFor();
  const manage = await content();
  check(
    !manage.includes("Trasferisci la proprietà") &&
      !manage.includes("Elimina…") &&
      !manage.includes("Archivia"),
    "Owner powers shown to the co-DM",
  );
  passed.push(
    "Co-DM: Invitations visible; Transfer, Archive, Delete and removing the owner are not",
  );

  // 11. Remove (SVC-028/031): links rotate, old link fails, Mira unassigned, reassign, claim.
  await as("dm");
  await page.goto(base + `#campaigns?id=${id}`);
  await page
    .locator(".cm-member", { hasText: "Giocatore" })
    .getByRole("button", { name: "Espelli…" })
    .click();
  await page.locator("#dialog [name=reason]").fill("Cambio di gruppo");
  await submit();
  await toast("Link sostituiti: 1");
  await page.locator('[data-tab="invites"]').click();
  await page.locator(".cm-details summary", { hasText: "Link non più validi" }).click();
  check((await content()).includes("Sostituito dopo un’espulsione"), "Rotation not shown");
  const linkThree = await page
    .locator(".cm-link:not(.is-closed) [data-cm-url]")
    .first()
    .inputValue();
  check(linkThree !== linkTwo, "Link did not change");
  await page.locator('[data-tab="characters"]').click();
  const seat = page.locator(".cm-seat", { hasText: "Mira" });
  check(
    (await seat.innerText()).includes("Non assegnato") &&
      (await seat.innerText()).includes("prima: Giocatore"),
    "Mira not unassigned",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await shot("10-removed-unassigned.png");
  await as("player");
  await page.goto(linkTwo);
  await page.locator(".cm-problem", { hasText: "Non puoi usare questo invito" }).waitFor();
  check(
    (await content()).includes("è stato sostituito dopo una rimozione"),
    "Old link still works",
  );
  await page.goto(base + "#campaigns");
  check(
    (await page.locator(".cm-inbox-row", { hasText: "ti ha rimosso" }).innerText()).includes(
      "Cambio di gruppo",
    ),
    "Removal notice missing",
  );
  check(!(await card("Rovine di Vetro").count()), "Removed player still lists the campaign");
  await as("dm");
  await page.goto(base + `#campaigns?id=${id}&tab=characters`);
  await page
    .locator(".cm-seat", { hasText: "Mira" })
    .locator("select[name=member]")
    .selectOption("dm");
  await page
    .locator(".cm-seat", { hasText: "Mira" })
    .getByRole("button", { name: "Riassegna" })
    .click();
  await page.locator(".cm-seat", { hasText: "Giocato da DM" }).waitFor();
  await page
    .locator(".cm-seat", { hasText: "Mira" })
    .getByRole("button", { name: "Rendi non assegnato" })
    .click();
  await page.locator(".cm-seat", { hasText: "Non assegnato" }).waitFor();
  await as("player");
  await page.goto(linkThree);
  await page.locator('[data-path="claim"]').click();
  check(
    (await page.locator("input[name=actorId]:checked").inputValue()) === "mira",
    "Mira not claimable",
  );
  await button("Controlla chi vedrà la scheda").click();
  await button("Invia richiesta").click();
  await as("dm");
  await page.goto(base + `#campaigns?id=${id}&tab=invites`);
  await button("Approva").click();
  await page.locator('[data-tab="characters"]').click();
  await page.locator(".cm-seat", { hasText: "Giocato da Giocatore" }).waitFor();
  passed.push(
    "Remove: 1 link rotated, old link refused, Mira unassigned → reassigned to DM → released → claimed by the player (approved)",
  );

  // 12. Ownership transfer (VTL-040): pending, revoke, again, accepted from the invitations.
  await page.locator('[data-tab="manage"]').click();
  await button("Trasferisci la proprietà…").click();
  await page.locator("#dialog [name=to]").selectOption("player");
  await submit();
  await page.getByText("in attesa di risposta").waitFor();
  await button("Revoca il trasferimento").click();
  await button("Trasferisci la proprietà…").click();
  await submit();
  await as("player");
  await page.goto(base + "#campaigns");
  const offer = page.locator(".cm-inbox-row", { hasText: "ti propone la proprietà" });
  await offer.waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await shot("11-transfer-incoming.png");
  await offer.getByRole("button", { name: "Accetta" }).click();
  await card("Rovine di Vetro").locator(".cm-role", { hasText: "DM · proprietario" }).waitFor();
  await as("dm");
  check((await card("Rovine di Vetro").innerText()).includes("Co-DM"), "Former owner is not co-DM");
  passed.push(
    "Transfer: proposed, revoked, proposed again, accepted by the player; DM became co-DM",
  );

  // 13. Creatures entrusted for the session (part of SVC-036): real control at the Table.
  await page.goto(base + "#campaigns?id=lanterns&tab=manage");
  await button("Cedi il ruolo di DM per la sessione…").click();
  await page.locator("#dialog [name=to]").selectOption("player");
  await submit();
  await page.locator(".cm-banner", { hasText: "ha ceduto il ruolo di DM" }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await shot("12-handover-banner.png");
  await as("player");
  await page.goto(base + "#table");
  const handed = await moveGoblinLeft();
  check(handed.after !== handed.before, "Entrusted player cannot move the goblin");
  await as("dm");
  await page.goto(base + "#campaigns?id=lanterns&tab=manage");
  await button("Riprendi il ruolo di DM").click();
  check(!(await page.locator(".cm-banner").count()), "Handover banner still shown");
  await as("player");
  await page.goto(base + "#table");
  const back = await moveGoblinLeft();
  check(back.after === back.before, "Player still controls the goblin after take-back");
  await toast("Non controlli questa creatura");
  passed.push(
    "Creatures entrusted: the player moved the goblin; after «Riprendi le creature» the move is refused",
  );

  // 14. Archive and restore as the new owner; persistence after reload.
  await page.goto(base + `#campaigns?id=${id}&tab=manage`);
  await button("Archivia").click();
  await page.goto(base + "#campaigns");
  await page.locator('[data-cm="status"][data-status="archived"]').click();
  await card("Rovine di Vetro").getByRole("button", { name: "Ripristina" }).click();
  await page.locator('[data-cm="status"][data-status="active"]').click();
  await card("Rovine di Vetro").waitFor();
  await page.reload();
  data = await stored();
  const meta = data.ext["campaign-members"].campaigns[id];
  check(
    meta.ownerId === "player" && meta.status === "active" && meta.approval === true,
    "Reload lost ownership/status/approval",
  );
  check(
    meta.audit.some((row) => row.kind === "archived") &&
      meta.audit.some((row) => row.kind === "restored"),
    "Audit incomplete",
  );
  for (const hash of [
    "campaigns",
    `campaigns?id=${id}`,
    `campaigns?id=${id}&tab=invites`,
    "campaign?tab=campaign-members",
    "home",
  ]) {
    await page.goto(base + "#" + hash);
    await page.waitForTimeout(120);
    check(await noOverflow(), "Overflow at 1440 on #" + hash);
  }
  passed.push(
    "Archive → Archiviate → Ripristina; reload keeps owner, status, approval and audit; no overflow at 1440",
  );

  // 15. EN phone 390 with touch: same local data, English, delete with typed name, restore,
  // new link, DM joins with Doran through the English join page.
  const saved = await page.evaluate((k) => localStorage.getItem(k), key);
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const mobile = await phone.newPage();
  mobile.on("pageerror", (error) => errors.push("390: " + error.message));
  await mobile.goto(base + "#home");
  await mobile.evaluate(([k, v]) => localStorage.setItem(k, v), [key, saved]);
  await mobile.reload();
  await mobile.locator("#demo-role").selectOption("player");
  await mobile.locator('.service-nav [data-service="preferences"]').tap();
  await mobile.locator("#dialog select[name=lang]").selectOption("en");
  await mobile.locator("#dialog button[type=submit]").tap();
  await mobile.locator('.app-header nav [data-nav="campaigns"]').tap();
  await mobile.getByRole("heading", { name: "Campaigns", level: 1 }).waitFor();
  check(await noOverflow(mobile), "Overflow on EN campaigns list at 390");
  await mobile.screenshot({ path: dir + "13-phone-en-list.png", fullPage: true });
  await mobile
    .locator(".cm-card", { hasText: "Rovine di Vetro" })
    .getByRole("button", { name: "Details and members" })
    .tap();
  await mobile.locator('[data-tab="manage"]').tap();
  await mobile.getByRole("button", { name: "Delete…", exact: true }).tap();
  await mobile.locator("#dialog [name=confirmName]").fill("rovine");
  await mobile.locator("#dialog button[type=submit]").tap();
  await mobile
    .locator("#dialog .dialog-error", { hasText: "Type the campaign name exactly" })
    .waitFor();
  await mobile.locator("#dialog [name=confirmName]").fill("Rovine di Vetro");
  await mobile.locator("#dialog button[type=submit]").tap();
  await mobile.locator('[data-cm="back"]').first().tap();
  await mobile.locator('[data-cm="status"][data-status="deleted"]').tap();
  await mobile
    .locator(".cm-card", { hasText: "Rovine di Vetro" })
    .getByRole("button", { name: "Restore" })
    .tap();
  await mobile.locator('[data-cm="status"][data-status="active"]').tap();
  await mobile
    .locator(".cm-card", { hasText: "Rovine di Vetro" })
    .getByRole("button", { name: "Details and members" })
    .tap();
  await mobile.locator('[data-tab="invites"]').tap();
  await mobile.getByRole("button", { name: "Create link", exact: true }).tap();
  await mobile.locator("#toast.shown", { hasText: "Link created" }).waitFor();
  check(await noOverflow(mobile), "Overflow on EN invitations at 390");
  await mobile.screenshot({ path: dir + "14-phone-en-invites.png", fullPage: true });
  const linkFour = await mobile
    .locator(".cm-link:not(.is-closed) [data-cm-url]")
    .first()
    .inputValue();
  await mobile.locator("#demo-role").selectOption("dm");
  await mobile.goto(linkFour);
  await mobile.getByRole("heading", { name: "How do you want to join?" }).waitFor();
  check(await noOverflow(mobile), "Overflow on EN join page at 390");
  await mobile.locator('[data-path="own"]').tap();
  check(
    (await mobile.locator("input[name=actorId]:checked").inputValue()) === "doran",
    "Doran not offered to the DM",
  );
  await mobile.screenshot({ path: dir + "15-phone-en-join.png", fullPage: true });
  await mobile.getByRole("button", { name: "Check who will see the sheet" }).tap();
  check(
    (await mobile.locator("#dialog").innerText()).includes("Who will see the sheet"),
    "EN preview",
  );
  await mobile.locator("#dialog button[type=submit]").tap();
  await mobile.locator(".cm-seat", { hasText: "Played by DM" }).waitFor();
  const small = await mobile.evaluate(() =>
    [
      ...document.querySelectorAll(
        "#content [data-cm], #content .cm-seg, #content .cm-chip, #content .cm-path, #content .cm-page .button",
      ),
    ]
      .filter((el) => el.offsetParent !== null)
      .map((el) => [
        el.textContent.trim().slice(0, 30),
        Math.round(el.getBoundingClientRect().height),
      ])
      .filter(([, h]) => h < 40),
  );
  check(!small.length, "Targets under 40 px at 390: " + JSON.stringify(small));
  check(await noOverflow(mobile), "Overflow on EN characters tab at 390");
  await mobile.screenshot({ path: dir + "16-phone-en-characters.png", fullPage: true });
  passed.push(
    "EN 390 touch: list, typed-name delete refused then accepted, Deleted → Restore, link created, DM joined with Doran; targets ≥ 40 px; no overflow",
  );
  await phone.close();

  check(!errors.length, "Page errors: " + errors.join(" | "));
  await context.close();
  return passed;
};
