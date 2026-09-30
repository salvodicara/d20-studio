async (rootPage) => {
  // R7 — campaign governance, party and the DM hand-off, as a first-time user (real clicks,
  // keys and touch). A IT 1440: Gruppo «Aggiungi un mio personaggio» (player) and «Assegna PE
  // e monete» (DM), Livia's saves equal to her sheet; Impostazioni › Integrazioni › Discord in
  // one click; «Cosa vedono i giocatori» DC switch, the grouping permission and the legacy
  // source switch with History; the creature's «Copia in un’altra campagna…» with one campaign
  // (Crea una campagna, back to the copy); joining by link with Iria lists «Contenuti
  // richiesti» and «Chiedi al DM» reaches the DM's «Abilita»; the Table presence list hands
  // the DM role to the player and takes it back. B EN 390 touch: the same hand-off from the
  // phone. Fixtures through the areas' own domain APIs are named where used.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R7/images/";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const watch = (page) => page.on("pageerror", (error) => errors.push(error.message));
  const flat = (text) =>
    String(text ?? "")
      .replace(/\s+/g, " ")
      .trim();

  // ---------------------------------------------------------------- A: IT 1440
  const context = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  watch(page);
  // Visual pass 2 (30/09/2026): whoever runs the session finds Party (and Pause, Hide
  // scene…) in the map's one «Sessione» menu (Owlbear keeps one row of controls); open it.
  const sessionMenu = async (p = page) => {
    const menu = p.locator(".session-view-hud [data-session-menu]");
    if ((await menu.count()) && (await menu.getAttribute("aria-expanded")) !== "true")
      await menu.click();
  };
  page.on("dialog", (d) => d.accept().catch(() => {}));
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const role = async (value) => {
    await page.getByRole("combobox", { name: /Visita come|Visit as/ }).selectOption(value);
    await page.waitForTimeout(120);
  };
  const dialog = page.locator("#dialog");
  const rail = (name) =>
    page.locator(".campaign-sidebar").getByRole("button", { name, exact: true }).first();
  const openRail = async (name) => {
    if (!(await rail(name).isVisible())) {
      // Kanka groups: open the group holding it («Gestione DM», «Campagna»…).
      for (const group of await page.locator("[data-campaign-group-toggle]").all())
        if ((await group.getAttribute("aria-expanded")) === "false") await group.click();
    }
    await rail(name).click();
  };

  await page.goto(base);
  await page.evaluate((k) => localStorage.removeItem(k), key);
  await page.reload();
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  // A1 — player: «Aggiungi un mio personaggio» on the Gruppo page (DDB Join with this character).
  await role("player");
  await page.goto(base + "#campaign");
  await openRail("Gruppo");
  await page.getByRole("heading", { name: "Gruppo", level: 1 }).waitFor();
  const add = page.getByRole("button", { name: "Aggiungi un mio personaggio" });
  check(await add.isVisible(), "player: no «Aggiungi un mio personaggio»");
  check(
    !(await page.getByRole("button", { name: "Assegna PE e monete" }).count()),
    "player sees the DM's award button",
  );
  await add.click();
  await dialog
    .getByRole("heading", { name: /Aggiungi un mio personaggio a Le lanterne di Bruma/ })
    .waitFor();
  const options = await dialog.locator("select[name=actor] option").allTextContents();
  check(
    options.some((text) => text.startsWith("Iria")),
    "Iria not offered: " + options.join(", "),
  );
  await page.screenshot({ path: shots + "r7-01-gruppo-add-character-1440.png" });
  await dialog
    .getByRole("button", { name: /Annulla|Chiudi/ })
    .first()
    .click();
  passed.push("Player: Gruppo shows «Aggiungi un mio personaggio», which offers Iria (C13)");

  // A2 — DM: «Assegna PE e monete» and Livia's saves as on her sheet (C12, C14).
  await role("dm");
  await page.goto(base + "#campaign");
  await openRail("Gruppo");
  await page.getByRole("heading", { name: "Gruppo", level: 1 }).waitFor();
  const liviaRow = flat(await page.locator('[data-party-row="livia"]').innerText());
  check(/INT \+6/.test(liviaRow) && /DES \+3/.test(liviaRow), "Gruppo saves: " + liviaRow);
  await page.getByRole("button", { name: "Assegna PE e monete" }).click();
  await dialog.getByRole("heading", { name: "Assegna PE e monete al gruppo" }).waitFor();
  await page.screenshot({ path: shots + "r7-02-gruppo-award-1440.png" });
  await dialog.locator("input[name=xp]").fill("300");
  await dialog.getByRole("button", { name: "Assegna", exact: true }).click();
  await page.waitForTimeout(200);
  await page.goto(base + "#characters?id=livia");
  await page.locator('[data-shp-save="int"]').first().waitFor();
  const sheetInt = flat(await page.locator('[data-shp-save="int"]').first().innerText());
  const sheetDex = flat(await page.locator('[data-shp-save="dex"]').first().innerText());
  check(/\+6/.test(sheetInt) && /\+3/.test(sheetDex), `Sheet saves ${sheetInt} / ${sheetDex}`);
  passed.push(
    "DM: Gruppo shows «Assegna PE e monete» (loot's award dialog, 300 XP given); Livia's saves read INT +6, DES +3 on the Gruppo and on her sheet (one number)",
  );

  // A3 — Impostazioni › Integrazioni › Discord in one click (Foundry to Discord).
  await page.goto(base + "#campaign");
  await openRail("Impostazioni");
  await page.getByRole("heading", { name: "Impostazioni della campagna", level: 1 }).waitFor();
  await page.locator('[data-cs-tab="integrations"]').click();
  const discord = page.getByRole("button", { name: "Apri Integrazioni › Discord" });
  await discord.waitFor();
  check(
    flat(await page.locator('[data-cs-integration="discord"]').innerText()).includes(
      "Discord: inoltra tiri e avvisi a un canale",
    ),
    "Discord row label",
  );
  await page.screenshot({ path: shots + "r7-03-settings-integrations-1440.png" });
  await discord.click();
  await page.waitForURL(/tab=integrations/);
  check(/id=discord/.test(page.url()), "Discord tab not opened: " + page.url());
  await page.getByRole("heading", { name: /Integrazioni/, level: 1 }).waitFor();
  passed.push(
    "Impostazioni › Integrazioni: «Discord: inoltra tiri e avvisi a un canale» opens Integrazioni › Discord in one click",
  );

  // A4 — What players see (C1), grouping permission (C2), legacy 2014 beside 2024 (C4).
  await page.goto(base + "#campaign?tab=settings&id=disclosure");
  await page.locator('[data-cs-disclosure="dc"]').waitFor();
  await page.locator('[data-cs-disclosure-input="dc"][value="hidden"]').check();
  await page.waitForTimeout(150);
  check(
    (await stored()).ext["campaign-settings"].campaigns.lanterns.policy.dc === "hidden",
    "dc not hidden",
  );
  await page.screenshot({ path: shots + "r7-04-disclosure-dc-1440.png" });
  await page.locator('[data-cs-tab="permissions"]').click();
  await page.locator('[data-cs-permission="playerGroup"]').check();
  await page.waitForTimeout(150);
  check(
    (await stored()).ext["campaign-settings"].campaigns.lanterns.policy.playerGroup === true,
    "playerGroup not on",
  );
  await page.locator('[data-cs-tab="sources"]').click();
  await page.locator("[data-cs-legacy]").check();
  await page.waitForTimeout(150);
  check(
    flat(await page.locator('[data-cs-source="legacy-2014"]').innerText()).includes("Disponibile"),
    "legacy row not available",
  );
  await page.screenshot({ path: shots + "r7-05-sources-legacy-1440.png" });
  await page.locator('[data-cs-tab="history"]').click();
  const history = flat(await page.locator(".cs-history").innerText());
  for (const text of [
    "CD dei tiri",
    "Gruppi di pedine dei giocatori",
    "Fonte · Versioni legacy 2014",
  ])
    check(history.includes(text), "History lacks " + text);
  passed.push(
    "Settings: «CD dei tiri» Nascoste, «I giocatori possono raggruppare le proprie pedine» on, «Versioni legacy 2014 (SRD 5.1) accanto alle 2024» on (Fonti reads Disponibile); all three in History",
  );

  // A5 — the creature's copy with one campaign (Roll20 Transmogrifier, C5).
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  const goblin = page.locator('[data-actor="goblin-1"]').first();
  await goblin.click({ button: "right" });
  const menu = page.locator("body > .token-menu");
  await menu.locator("[data-nav]").first().waitFor();
  const copyItem = () => menu.getByRole("menuitem", { name: "Copia in un’altra campagna…" });
  if (!(await copyItem().count())) await menu.locator('[data-token-menu-category="dm"]').click();
  await copyItem().click();
  await dialog.getByRole("heading", { name: "Copia in un’altra campagna" }).waitFor();
  check(
    flat(await dialog.innerText()).includes("Serve un’altra campagna attiva"),
    "no explanation",
  );
  await page.screenshot({ path: shots + "r7-06-copy-no-campaign-1440.png" });
  await dialog.getByRole("button", { name: "Crea una campagna" }).click();
  await dialog.getByRole("heading", { name: "Crea campagna" }).waitFor();
  await dialog.locator("input[name=name]").fill("Rovine di Vetro");
  await dialog.getByRole("button", { name: "Crea campagna" }).click();
  await dialog.getByRole("heading", { name: "Copia in un’altra campagna" }).waitFor();
  check(flat(await dialog.innerText()).includes("«Rovine di Vetro»"), "not back to the copy");
  await dialog.getByRole("button", { name: "Copia", exact: true }).click();
  await page.waitForTimeout(200);
  check(
    Object.values((await stored()).actors).some((a) => a.dataCopy?.from === "goblin-1"),
    "creature not copied",
  );
  passed.push(
    "Token menu › DM: «Copia in un’altra campagna…» with one campaign explains, «Crea una campagna» creates «Rovine di Vetro» and comes back to the copy, which lands",
  );

  // A6 — joining by link with Iria (BG3 mod verification). Fixture through the Library's and
  // B13's own domain APIs: the player's «Lama di brina» on Iria, the DM's «Raggio di
  // lanterna» enabled in «Rovine di Vetro», and a player link to it.
  const code = await page.evaluate(async (k) => {
    const hb = await import("/homebrew.mjs");
    const cm = await import("/campaign-members.mjs");
    const s = JSON.parse(localStorage.getItem(k));
    const make = (who, id, it, en) => {
      hb.createHomebrewDraft(s, { id, kind: "create", type: "feature" }, who);
      const d = hb.getHomebrewDraft(s, id, who);
      hb.saveHomebrewDraft(
        s,
        id,
        {
          expectedRevision: d.revision,
          data: {
            ...d.data,
            name: { it, en },
            description: { it: "Contenuto originale", en: "Original content" },
            source: {
              kind: "authored",
              edition: "2024",
              label: "Synthetic original",
              reference: "",
              rights: { modify: true, share: true, export: true },
            },
          },
        },
        who,
      );
      const p = hb.previewHomebrewDraft(s, id, who);
      return hb.applyHomebrewDraft(s, id, { reviewKey: p.reviewKey }, who).ref;
    };
    const beam = make("dm", "r7-beam", "Raggio di lanterna", "Lantern beam");
    const frost = make("player", "r7-frost", "Lama di brina", "Frost blade");
    const ruins = cm.listCampaigns(s, "dm").find((row) => row.name === "Rovine di Vetro").id;
    s.ext["campaign-members"].parked[ruins].campaign.enabledContent = [beam];
    s.actors.iria.features = [
      ...(s.actors.iria.features ?? []),
      { id: "iria-frost", name: { it: "Lama di brina", en: "Frost blade" }, homebrewRef: frost },
    ];
    const link = cm.createInviteLink(s, ruins, { role: "player", hours: 48, uses: 5 }, "dm");
    localStorage.setItem(k, JSON.stringify(s));
    return link.code;
  }, key);
  await page.reload();
  await role("player");
  await page.goto(base + `#campaigns?tab=join&id=${code}`);
  await page.getByRole("heading", { name: "Come vuoi entrare?" }).waitFor();
  await page.getByRole("button", { name: /Entra con un tuo personaggio/ }).click();
  await page.locator('input[name=actorId][value="iria"]').check();
  await page.getByRole("button", { name: "Controlla chi vedrà la scheda" }).click();
  await dialog.getByRole("heading", { name: "Prima di entrare" }).waitFor();
  const preview = flat(await dialog.innerText());
  for (const text of [
    "Contenuti richiesti",
    "Arriva con la campagna",
    "Lama di brina",
    "La campagna non la usa ancora",
    "Chiedi al DM",
  ])
    check(preview.includes(text), "join preview lacks " + text + ": " + preview);
  check(
    !preview.includes("Raggio di lanterna"),
    "the DM's unshared content is named to the player",
  );
  await page.screenshot({ path: shots + "r7-07-join-required-content-1440.png" });
  await dialog.getByRole("button", { name: "Chiedi al DM" }).click();
  await dialog.getByRole("button", { name: "Chiesto al DM" }).waitFor();
  await dialog
    .getByRole("button", { name: /Annulla|Chiudi/ })
    .first()
    .click();
  await role("dm");
  await page.goto(base + "#campaigns");
  const ask = page.locator(".cm-inbox-row", { hasText: "Lama di brina" });
  await ask.waitFor();
  await ask.getByRole("button", { name: "Abilita" }).click();
  await page.waitForTimeout(200);
  const ruinsCore = Object.values((await stored()).ext["campaign-members"].parked).find(
    (row) => row.campaign.name === "Rovine di Vetro",
  );
  check(
    ruinsCore.campaign.enabledContent.some((ref) => ref.contentId.includes("r7-frost")),
    "«Abilita» did not enable Iria's content",
  );
  passed.push(
    "Join by link with Iria: «Contenuti richiesti» lists what arrives with the campaign (unnamed DM content), and Iria's «Lama di brina» the campaign does not use; «Chiedi al DM» turns into «Chiesto al DM»; the DM's «Abilita» enables it in «Rovine di Vetro»",
  );

  // A7 — the DM hands the role over from the Table presence list (Owlbear), then takes it back.
  await page.goto(base + "#table");
  await page.locator("#battle-map").waitFor();
  await sessionMenu();
  await page.locator('.session-view-hud [data-sv="group"]').click();
  await dialog.getByRole("heading", { name: "Il gruppo" }).waitFor();
  const cede = dialog.locator('[data-sv-member="player"] [data-sv-handover="player"]');
  check(await cede.isVisible(), "no «Cedi il ruolo di DM…» on the player's row");
  check(
    !(await dialog.locator('[data-sv-member="dm"] [data-sv-handover]').count()),
    "hand-off offered on the DM's own row",
  );
  await page.screenshot({ path: shots + "r7-08-presence-handover-1440.png" });
  await cede.click();
  await dialog.getByRole("heading", { name: "Cedi il ruolo di DM per la sessione" }).waitFor();
  const cedeText = flat(await dialog.innerText());
  check(cedeText.includes("guida tutta la sessione"), "dialog: whole session");
  check(cedeText.includes("mai i tuoi appunti privati"), "dialog: privacy sentence");
  check(!cedeText.includes("restano a te in questa versione"), "old limitation line still there");
  await page.screenshot({ path: shots + "r7-09-handover-dialog-1440.png" });
  await dialog.getByRole("button", { name: "Cedi il ruolo" }).click();
  await page.waitForTimeout(200);
  check(
    (await stored()).ext["campaign-members"].campaigns.lanterns.handover?.to === "player",
    "hand-off not started",
  );
  await sessionMenu();
  await page.locator('.session-view-hud [data-sv="group"]').click();
  const back = dialog.locator('[data-sv-member="player"] [data-sv-handover-end]');
  await back.waitFor();
  check(
    flat(await dialog.locator('[data-sv-member="player"]').innerText()).includes(
      "DM per la sessione",
    ),
    "runner badge",
  );
  await back.click();
  await page.waitForTimeout(200);
  check(
    !(await stored()).ext["campaign-members"].campaigns.lanterns.handover,
    "role not taken back",
  );
  passed.push(
    "Table presence list: «Cedi il ruolo di DM…» on the player's row opens the hand-off with the member chosen, the whole-session text and the privacy sentence; the row then reads «DM per la sessione» with «Riprendi il ruolo di DM», which ends it",
  );
  await context.close();

  // ---------------------------------------------------------------- B: EN 390 touch
  const phone = await rootPage
    .context()
    .browser()
    .newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
  const mobile = await phone.newPage();
  watch(mobile);
  mobile.on("dialog", (d) => d.accept().catch(() => {}));
  const mstored = () => mobile.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const mdialog = mobile.locator("#dialog");
  await mobile.goto(base);
  await mobile.evaluate((k) => localStorage.removeItem(k), key);
  await mobile.reload();
  // Italian first: the same entry on the phone's presence list.
  await mobile.getByRole("combobox", { name: "Visita come" }).selectOption("dm");
  await mobile.goto(base + "#table");
  await mobile.locator("#battle-map").waitFor();
  await sessionMenu(mobile);
  await mobile.locator('.session-view-hud [data-sv="group"]').tap();
  await mdialog.getByRole("heading", { name: "Il gruppo" }).waitFor();
  check(
    flat(
      await mdialog.locator('[data-sv-member="player"] [data-sv-handover="player"]').innerText(),
    ) === "Cedi il ruolo di DM…",
    "IT label on the phone",
  );
  await mobile.screenshot({ path: shots + "r7-10a-presence-handover-390-it.png" });
  await mdialog.getByRole("button", { name: "Chiudi" }).last().tap();
  await mobile.goto(base);
  await mobile.locator('.service-nav [data-service="preferences"]').tap();
  await mobile.locator("#dialog select[name=lang]").selectOption("en");
  await mobile.getByRole("button", { name: /Salva preferenze|Save preferences/ }).tap();
  await mobile.getByRole("combobox", { name: "Visit as" }).selectOption("dm");
  await mobile.goto(base + "#table");
  await mobile.locator("#battle-map").waitFor();
  await sessionMenu(mobile);
  await mobile.locator('.session-view-hud [data-sv="group"]').tap();
  await mdialog.getByRole("heading", { name: "The party" }).waitFor();
  const mcede = mdialog.locator('[data-sv-member="player"] [data-sv-handover="player"]');
  check(flat(await mcede.innerText()) === "Hand over the DM role…", "EN label");
  const box = await mcede.boundingBox();
  check(box && box.height >= 40, "touch target under 40 px: " + JSON.stringify(box));
  check(
    await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    "phone page overflows",
  );
  await mobile.screenshot({ path: shots + "r7-10-presence-handover-390-en.png" });
  await mcede.tap();
  await mdialog.getByRole("heading", { name: "Hand over the DM role for the session" }).waitFor();
  check(
    flat(await mdialog.innerText()).includes("never your private notes"),
    "EN privacy sentence",
  );
  await mdialog.getByRole("button", { name: "Hand over", exact: true }).tap();
  await mobile.waitForTimeout(200);
  check(
    (await mstored()).ext["campaign-members"].campaigns.lanterns.handover?.to === "player",
    "phone hand-off not started",
  );
  await sessionMenu(mobile);
  await mobile.locator('.session-view-hud [data-sv="group"]').tap();
  await mdialog.locator('[data-sv-member="player"] [data-sv-handover-end]').tap();
  await mobile.waitForTimeout(200);
  check(
    !(await mstored()).ext["campaign-members"].campaigns.lanterns.handover,
    "phone: not taken back",
  );
  // The Gruppo page commands on the phone, in English.
  await mobile.goto(base + "#campaign?tab=group");
  await mobile.getByRole("button", { name: "Award XP and coins" }).waitFor();
  check(
    await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    "Gruppo overflows at 390",
  );
  await mobile.screenshot({ path: shots + "r7-11-gruppo-390-en.png" });
  passed.push(
    "390 touch: «Cedi il ruolo di DM…» in Italian, then in English «Hand over the DM role…» (≥40 px) on the player's row, the English dialog with the privacy sentence, «Hand over» then «Take the DM role back» by tap; the Gruppo page shows «Award XP and coins» without overflow",
  );
  await phone.close();
  check(!errors.length, "Page errors: " + errors.join(" / "));
  return passed.map((line, i) => `${i + 1}. ${line}`).join("\n");
}
