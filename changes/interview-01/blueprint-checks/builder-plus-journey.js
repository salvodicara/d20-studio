async (rootPage) => {
  // B39 Creation: quick paths, ready-made characters and checks. Real clicks, keys and taps
  // against the running blueprint (synthetic data; resets this browser's demo state).
  // Acceptance (CAPABILITY_CENSUS B39): (1) level-1 quick path with detail pages, suggested
  // name and portrait, ends on the sheet and stays editable; (2) ready-made: preview, Claim,
  // personal copy; (3) feat with a missing prerequisite blocked with its reason, "allow
  // exception" leaves a permanent warning; (4) duplicate proficiency released with a notice;
  // (5) packages or rolled gold, reopenable; (6) legacy sources off: "3 options hidden";
  // (7) fighter 2 / wizard 1 with prerequisites, level down with a preview of removed grants,
  // full rebuild; (8) DM and player on the same draft with explicit conflicts.
  // IT desktop 1440x900, then an EN 390x844 touch context. Reload persistence, Undo/correction,
  // DM vs player. Run: playwright-cli -s=d20-b39 --raw run-code --filename=<this file> from
  // /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B39/.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B39/";
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push("desktop: " + error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const ok = (message) => passed.push(message);
  const saved = (p = page) => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const actorNamed = async (name, p = page) =>
    Object.values((await saved(p)).actors).find((a) => a.name === name && a.kind === "character");
  const button = (name, p = page) => p.getByRole("button", { name, exact: true });
  const dialog = (p = page) => p.locator("#dialog");
  const inDialog = (name, p = page) => dialog(p).getByRole("button", { name, exact: true });
  const setRole = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForTimeout(250);
  };
  const noOverflow = (p = page) =>
    p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const smallTargets = (selector, p = page) =>
    p.evaluate(
      (sel) =>
        [...document.querySelectorAll(sel)]
          .filter((el) => el.getBoundingClientRect().height > 0 && el.offsetParent !== null)
          .map((el) => ({
            text: (el.innerText || el.getAttribute("aria-label") || el.value || "")
              .trim()
              .slice(0, 30),
            h: Math.round(el.getBoundingClientRect().height),
            w: Math.round(el.getBoundingClientRect().width),
          }))
          .filter((box) => box.h < 40 || box.w < 40),
      selector,
    );
  const styled = (p = page) =>
    p.waitForFunction(() =>
      [...document.styleSheets].some(
        (s) => s.href?.endsWith("/builder-plus.css") && s.cssRules.length,
      ),
    );
  const openTab = async (tab, p = page) => {
    await p.goto(p.url().replace(/([?&])tab=[a-z-]+/, "$1tab=" + tab));
    await p
      .locator(`[data-character-tab="${tab}"][aria-current], [data-character-tab="${tab}"].active`)
      .first()
      .waitFor({ timeout: 4000 })
      .catch(() => {});
    await p.waitForTimeout(150);
  };
  const builderSection = async (id, p = page) => {
    await p.locator(`.builder-sections [data-builder-section="${id}"]`).click();
    await p
      .locator(`.builder-sections [data-builder-section="${id}"][aria-current="step"]`)
      .waitFor();
  };

  let phoneContext = null;
  try {
    // -----------------------------------------------------------------------------------
    // A. (1) Quick path: Home → Personaggi → Crea personaggio → Percorso rapido (3 clicks).
    await page.goto(base);
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await page.locator("#content").waitFor();
    await styled();
    let clicks = 0;
    await page.locator('.app-header [data-nav="characters"]').click();
    clicks++;
    await button("Crea personaggio").first().click();
    clicks++;
    await page.getByRole("heading", { name: "Come vuoi creare il personaggio?" }).waitFor();
    await page.screenshot({ path: shots + "01-methods-it.png" });
    await button("Percorso rapido").click();
    clicks++;
    await page.getByRole("heading", { name: "Scegli una classe" }).waitFor();
    check(clicks <= 3, "quick path needs more than 3 clicks");
    const draftId = page.url().match(/id=([^&]+)/)[1];
    check(
      (await saved()).characterDrafts.some((d) => d.id === draftId && d.status === "active"),
      "no draft behind the quick path",
    );
    ok(
      "Quick path reached in 3 clicks from Home (Personaggi → Crea personaggio → Percorso rapido) on the draft Create made (DDB-009/011)",
    );
    await page.screenshot({ path: shots + "02-quick-classes-it.png" });
    // Class detail page, then choose.
    await button("Guerriero").click();
    await page.getByRole("heading", { name: "Guerriero", level: 2 }).waitFor();
    const detail = await page.locator(".bp-detail").innerText();
    check(/Dado Vita\s+d10/.test(detail), "class page has no hit die");
    check(
      /Serie standard consigliata/.test(detail) && /EN 21 \/ IT 23/.test(detail),
      "class page misses the SRD standard array",
    );
    check(
      /Stile di combattimento: Difesa/.test(detail),
      "class page misses the SRD recommendation",
    );
    check(/\(C\) 155 mo/.test(detail), "class page misses the starting equipment");
    await page.screenshot({ path: shots + "03-quick-class-detail-it.png" });
    // Keyboard: back to the grid with Enter on the focused back link, then reopen.
    await page.locator("[data-bp-detail-close]").focus();
    await page.keyboard.press("Enter");
    await page.getByRole("heading", { name: "Scegli una classe" }).waitFor();
    await button("Guerriero").click();
    await page.getByRole("button", { name: "Scegli Guerriero" }).click();
    await page.getByRole("heading", { name: "Scegli un background" }).waitFor();
    await button("Soldato").click();
    await page.getByRole("button", { name: "Scegli Soldato" }).click();
    await page.getByRole("heading", { name: "Scegli una specie" }).waitFor();
    check(
      /2 opzioni nascoste/.test(await page.locator(".bp-quick-body").innerText()),
      "species grid does not say legacy options are hidden",
    );
    await button("Nano").click();
    await page.getByRole("button", { name: "Scegli Nano" }).click();
    await page.getByRole("heading", { name: "Nome e ritratto" }).waitFor();
    const firstNames = await page.locator("[data-bp-name-pick]").allInnerTexts();
    await button("Suggerisci altri").click();
    await page.waitForTimeout(150);
    const nextNames = await page.locator("[data-bp-name-pick]").allInnerTexts();
    check(firstNames.join() !== nextNames.join(), "Suggest more did not change the list");
    check(
      (await page.locator("[data-bp-name]").inputValue()) === "",
      "suggestions replaced the name before a pick",
    );
    const picked = nextNames[0];
    await page.locator(`[data-bp-name-pick="${picked}"]`).click();
    await page.waitForTimeout(150);
    check(
      (await page.locator("[data-bp-name]").inputValue()) === picked,
      "clicked name not applied",
    );
    await page.locator('input[name="bp-portrait"][value="emblem:emblem-steel"]').check();
    await page.waitForTimeout(250);
    check(
      await page.locator(".bp-portrait.is-selected").filter({ hasText: "Acciaio" }).count(),
      "portrait not selected",
    );
    await page.screenshot({ path: shots + "04-quick-name-portrait-it.png" });
    ok(
      `Detail pages (hit die, SRD standard array EN 21/IT 23, SRD recommendation, packages) and name suggestions: "Suggerisci altri" changes the list, a name applies only when clicked (${picked}) (DDB-010/021)`,
    );
    // Review fix (B39-rf): typing and then pressing a control straight away (no Tab) must not
    // lose the click; Tab out of the field saves it and moves on (focus not lost).
    const quickRow = async () =>
      Object.values((await saved()).ext["builder-plus"].quick).find((r) => r.status === "active");
    const pageBefore = (await quickRow()).namePage;
    const namesBefore = await page.locator("[data-bp-name-pick]").allInnerTexts();
    await page.locator("[data-bp-name]").fill(picked + " Due");
    await button("Suggerisci altri").click();
    await page.waitForTimeout(150);
    const afterPress = await quickRow();
    check(
      afterPress.namePage === pageBefore + 1 && afterPress.name === picked + " Due",
      `typed name + one click: page ${afterPress.namePage}, name ${afterPress.name}`,
    );
    check(
      namesBefore.join() !== (await page.locator("[data-bp-name-pick]").allInnerTexts()).join(),
      "the click after typing was lost",
    );
    await page.locator("[data-bp-name]").fill(picked);
    await page.locator("[data-bp-name]").press("Tab");
    await page.waitForTimeout(150);
    check((await quickRow()).name === picked, "Tab did not save the name");
    check(
      await page.evaluate(() => document.activeElement?.matches?.("[data-bp-name-pick]")),
      "focus lost after Tab out of the name",
    );
    ok(
      "Typed name then one click on «Suggerisci altri»: both applied (no lost click); Tab saves the name and moves focus to the next control",
    );
    // Reload: the quick path keeps step and choices (DDB "saves choices across refresh").
    await page.reload();
    await page.getByRole("heading", { name: "Nome e ritratto" }).waitFor();
    check((await page.locator("[data-bp-name]").inputValue()) === picked, "name lost on reload");
    check(
      await page.locator('input[name="bp-portrait"][value="emblem:emblem-steel"]').isChecked(),
      "portrait lost on reload",
    );
    ok("Reload keeps the quick path's step, name and portrait");
    await button("Continua al riepilogo").click();
    await page.getByRole("heading", { name: "Riepilogo", level: 2 }).waitFor();
    const review = await page.locator(".bp-quick-body").innerText();
    check(
      /Nessun oggetto viene equipaggiato/.test(review),
      "review does not say nothing is equipped",
    );
    check(/17 \(\+3\)/.test(review), "review abilities do not include the background increase");
    await page.screenshot({ path: shots + "05-quick-review-it.png", fullPage: true });
    await button("Crea personaggio").click();
    await page.waitForURL(/#characters\?id=/);
    const sigraId = page.url().match(/id=([^&]+)/)[1];
    const sigra = (await saved()).actors[sigraId];
    check(
      sigra.name === picked && sigra.level === 1 && sigra.visibility === "private",
      "created sheet is wrong",
    );
    check(sigra.characterBuild?.data?.origin?.speciesId === "dwarf", "sheet has no builder record");
    check(
      sigra.inventory.every((item) => !item.equipped),
      "an item was auto-equipped",
    );
    const portraitId = (await saved()).ext.media?.looks?.[sigraId]?.portrait;
    check(portraitId, "portrait not stored in the image library");
    await button("Rivedi scelte").waitFor();
    ok(
      `Created ${picked} (Guerriero 1, Nano, Soldato): private sheet with a builder record, portrait in the media library, nothing equipped; the sheet offers "Rivedi scelte" (editable)`,
    );
    await page.locator('.app-header [data-nav="characters"]').click();
    const card = page.locator(`[data-clib-card="${sigraId}"]`);
    await card.waitFor();
    check(await card.locator("img").count(), "character list shows no portrait");
    ok("The chosen portrait shows on the Characters list card");
    await card.locator('[data-character-action="open"]').click();
    await page.waitForURL(/#characters\?id=/);

    // -----------------------------------------------------------------------------------
    // B. (5) Starting equipment reopened: package → gold, Undo; (7) multiclass blocked.
    await openTab("inventory");
    await page.locator("[data-bp-reopen]").click();
    await dialog().locator("[data-bp-chooser]").waitFor();
    await dialog().locator('input[name="classOption"][value="C"]').check();
    await page.waitForTimeout(150);
    const preview = await dialog().locator("[data-bp-chooser-preview]").innerText();
    check(/Oro: 18 → 169/.test(preview), "chooser preview gold: " + preview);
    check(
      /Rimuove:.*Cotta di maglia/.test(preview),
      "chooser preview does not list removed package items",
    );
    await page.screenshot({ path: shots + "06-starting-equipment-chooser-it.png" });
    await inDialog("Applica dotazione").click();
    await page.locator(".bp-notice").waitFor();
    check((await actorNamed(picked)).currency.gp === 169, "gold not applied");
    check(
      !(await actorNamed(picked)).inventory.some((i) => i.id.includes(":chain-mail")),
      "package items not removed",
    );
    await page.locator(".bp-notice [data-bp-undo]").click();
    await page.waitForTimeout(250);
    check((await actorNamed(picked)).currency.gp === 18, "Undo did not restore the gold");
    check(
      (await actorNamed(picked)).inventory.some((i) => i.id.includes(":chain-mail")),
      "Undo did not restore the package",
    );
    ok(
      "Starting equipment reopened from the Inventory tab: class (C) 155 gp instead of package (A) with a preview (removes chain mail…, gold 18 → 169), applied, then Undo restored it (DDB-019)",
    );
    // Multiclass prerequisite: fighter with Int 8 cannot add wizard.
    await page.goto(base + `#characters?id=${sigraId}&tab=actions`);
    await button("Avanza di livello").click();
    await page.waitForURL(/#builder\?id=/);
    await builderSection("class");
    await page.locator("[data-builder-add-class]").click();
    await page.locator('[data-builder-path="classes.1.classId"]').selectOption("wizard");
    await page.locator(".bp-multiclass").waitFor();
    const mc = await page.locator(".bp-multiclass").innerText();
    check(
      /Mago 1[\s\S]*Intelligenza 13[\s\S]*Intelligenza 8[\s\S]*Bloccato/.test(mc),
      "multiclass block not explained: " + mc,
    );
    await page.locator(".bp-multiclass").scrollIntoViewIfNeeded();
    await page.screenshot({ path: shots + "07-multiclass-blocked-it.png" });
    await page.locator("[data-builder-discard]").click();
    await inDialog("Scarta bozza").click();
    await page.waitForURL(/#characters/);
    ok(
      "Level-up draft Guerriero 1 → + Mago: prerequisites table shows Mago needs Intelligenza 13, current 8, Bloccato (SRD EN 24 / IT 27); draft discarded",
    );

    // -----------------------------------------------------------------------------------
    // C. (6) Sources and (4) duplicate proficiency, in the standard builder.
    await page.locator('.app-header [data-nav="characters"]').click();
    await button("Crea personaggio").first().click();
    await page.getByRole("heading", { name: "Come vuoi creare il personaggio?" }).waitFor();
    await builderSection("sources");
    const hidden = page.locator("[data-bp-hidden-count]");
    check(
      (await hidden.innerText()).includes("3 opzioni nascoste"),
      "sources do not say 3 options hidden",
    );
    await page.screenshot({ path: shots + "08-sources-hidden-it.png" });
    // Keyboard: focus the Legacy switch and press Space.
    await page.locator("[data-bp-legacy]").focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(250);
    check(
      (await page.locator("[data-bp-hidden-count]").count()) === 0,
      "legacy on still hides options",
    );
    check(await page.locator("[data-bp-legacy]").isChecked(), "legacy switch not on");
    ok(
      'Fonti: categories with descriptions; Legacy 2014 off shows "3 opzioni nascoste"; Space on the switch turns it on and the count disappears (DDB-015/165)',
    );
    await builderSection("class");
    await page.locator('[data-builder-path="classes.0.classId"]').selectOption("fighter");
    await page.waitForTimeout(200);
    await builderSection("skills");
    await page.locator('[data-builder-list="skills.selected"][value="athletics"]').check();
    await page.locator('[data-builder-list="skills.selected"][value="perception"]').check();
    await builderSection("origin");
    check(await page.locator(".bp-legacy").count(), "legacy species not listed with legacy on");
    await page.locator('[data-bp-legacy-add="legacy-2014:half-elf"]').click();
    await page.locator(".bp-legacy .badge", { hasText: "Registrata" }).waitFor();
    await page.locator('[data-builder-path="origin.backgroundId"]').selectOption("soldier");
    await page.locator(".bp-dupes li").first().waitFor();
    const dupes = await page.locator(".bp-dupes").innerText();
    check(/Atletica ora è concessa da Soldato/.test(dupes), "no release notice: " + dupes);
    const draftData = (await saved()).characterDrafts
      .filter((d) => d.status === "active")
      .at(-1).data;
    check(
      !draftData.skills.selected.includes("athletics") &&
        draftData.skills.selected.includes("perception"),
      "duplicate not released",
    );
    await page.screenshot({ path: shots + "09-duplicate-released-it.png" });
    await page.locator("[data-bp-dupes-ok]").click();
    await page.waitForTimeout(250);
    check((await page.locator(".bp-dupes").count()) === 0, "notice not dismissed");
    check(
      draftData.features.custom.some((f) => f.source?.edition === "2014"),
      "legacy option not recorded as a manual feature",
    );
    ok(
      "Legacy Mezzelfo (2014) recorded as a manual feature with SRD 5.1 provenance; choosing Soldato released the class choice Atletica with a notice, Percezione kept, notice dismissed (DDB-017, I-062)",
    );
    await page.locator("[data-builder-discard]").click();
    await inDialog("Scarta bozza").click();
    await page.waitForURL(/#characters/);

    // -----------------------------------------------------------------------------------
    // D. (2) Ready-made Kessa (fighter 2 / wizard 1): preview, Claim; (7) level down, Undo,
    // full rebuild.
    await button("Crea personaggio").first().click();
    await button("Personaggi pronti").click();
    await page.getByRole("heading", { name: "Personaggi pronti", level: 1 }).waitFor();
    check((await page.locator(".bp-premade").count()) === 4, "four ready-made characters expected");
    await page.screenshot({ path: shots + "10-premades-it.png" });
    await page.locator('[data-bp-premade="kessa"]').click();
    await page.getByRole("heading", { name: "Kessa", level: 1 }).waitFor();
    const kessaPreview = await page.locator(".bp-premade-page").innerText();
    check(/Guerriero 2 \/ Mago 1/.test(kessaPreview), "preview class line");
    check(
      /Guerriero 2\s+Forza o Destrezza 13[\s\S]*Soddisfatto[\s\S]*Mago 1\s+Intelligenza 13[\s\S]*Soddisfatto/.test(
        kessaPreview,
      ),
      "multiclass prerequisites not shown as met",
    );
    await page.screenshot({ path: shots + "11-premade-preview-it.png", fullPage: true });
    await button("Reclama personaggio").first().click();
    // Refreshed by the round-2 regression (29/09/2026): since P1 the class tables cover Kessa
    // (Fighter 2 / Wizard 1) completely, so her claim lists no «aspects to verify» and asks no
    // confirmation; the confirmation gate is checked on Oren below (Druid 5, whose Circle of the
    // Land features stay named only), as tests/builder-plus.test.mjs does.
    await dialog().getByRole("heading", { name: "Reclamare Kessa?" }).waitFor();
    check(
      !(await dialog().locator('input[name="confirm"], .bp-warnings').count()),
      "Kessa's claim still lists aspects to verify",
    );
    await inDialog("Reclama personaggio").click();
    await page.waitForURL(/#characters\?id=/);
    const kessaId = page.url().match(/id=([^&]+)/)[1];
    let kessa = (await saved()).actors[kessaId];
    check(
      kessa.visibility === "private" && kessa.premade?.id === "kessa" && kessa.level === 3,
      "claim is not a private copy with provenance",
    );
    check(
      !(await saved()).characterDrafts.some(
        (d) => d.status === "active" && d.revision === 0 && !d.actorId,
      ),
      "the empty create draft was left behind",
    );
    // Oren's claim lists the aspects to verify and is refused until they are confirmed.
    await page.goto(base + "#builder-plus?tab=premade&id=oren");
    await page.getByRole("heading", { name: "Oren", level: 1 }).waitFor();
    await button("Reclama personaggio").first().click();
    await dialog().locator(".bp-warnings li").first().waitFor();
    const orenConfirm = dialog().locator('input[name="confirm"]');
    check(
      (await orenConfirm.count()) === 1 && (await orenConfirm.evaluate((el) => el.required)),
      "Oren's claim does not ask to confirm the aspects to verify",
    );
    const actorsBefore = Object.keys((await saved()).actors).length;
    await inDialog("Reclama personaggio").click();
    await page.waitForTimeout(200);
    check(
      (await page.locator("#dialog[open]").count()) === 1 &&
        Object.keys((await saved()).actors).length === actorsBefore,
      "Oren was claimed without confirming the aspects to verify",
    );
    await inDialog("Annulla").click();
    await page.goto(base + "#characters?id=" + kessaId + "&tab=actions");
    ok(
      "Ready-made Kessa: preview with multiclass prerequisites met (Forza 17, Intelligenza 13), Claim with nothing left to verify → private personal copy with provenance, the empty Create draft discarded; Oren's claim is refused until its aspects to verify are confirmed (DDB-004/009, R20-020)",
    );
    await openTab("features");
    const buildBox = page.locator(".bp-sheet").filter({ hasText: "Livelli e rifacimento" });
    await buildBox.scrollIntoViewIfNeeded();
    check(/Personaggio pronto «Kessa»/.test(await buildBox.innerText()), "no provenance line");
    await page.locator('[data-bp-level-down="wizard"]').click();
    await dialog().getByRole("heading", { name: "Scendere di livello: Mago" }).waitFor();
    const down = await dialog().innerText();
    check(/Livello totale 3 → 2/.test(down), "level down total");
    check(
      // Refreshed by the residuals writer (29/09/2026): X-A2, the Italian SRD feature names.
      /Incantesimi[\s\S]*Adepto dei rituali[\s\S]*Recupero arcano/.test(down),
      "removed features not listed",
    );
    check(
      /Dardo incantato/.test(down) &&
        /Slot di 1° livello: 2 → 0/.test(down) &&
        /d6: 1 → 0/.test(down),
      "removed spells/resources not listed",
    );
    check(/PF massimi: 26 → 20/.test(down), "HP preview");
    await page.screenshot({ path: shots + "12-level-down-preview-it.png" });
    // Refreshed by the round-2 regression (29/09/2026): as for the claim, Kessa's level down
    // has no «aspects to verify» left (P1 class tables), so there is nothing to confirm.
    check(
      !(await dialog().locator('input[name="confirm"], .bp-warnings').count()),
      "Kessa's level down still lists aspects to verify",
    );
    await inDialog("Scendi di livello").click();
    await page.locator(".bp-notice").waitFor();
    kessa = (await saved()).actors[kessaId];
    check(
      kessa.level === 2 && kessa.maxHp === 20 && !(kessa.spells ?? []).some((s) => s.buildManaged),
      "level down not applied",
    );
    await page.locator(".bp-notice [data-bp-undo]").click();
    await page.waitForTimeout(300);
    kessa = (await saved()).actors[kessaId];
    check(kessa.level === 3 && kessa.maxHp === 26, "Undo did not restore the wizard level");
    ok(
      "Level down Mago 1 (dnd5e FVT-012): preview listed Incantesimi, Adepto dei rituali, Recupero arcano, 9 spells, 1st-level slots 2 → 0, d6 1 → 0, HP 26 → 20; applied (level 2, HP 20), then Undo restored level 3 / HP 26",
    );
    await page.locator("[data-bp-respec]").click();
    await inDialog("Inizia il rifacimento").click();
    await page.waitForURL(/#builder\?id=.*tab=class/);
    const banner = await page.locator(".bp-respec").innerText();
    check(
      /Rifacimento completo di Kessa/.test(banner) && /0\/3/.test(banner),
      "respec banner missing",
    );
    await page.screenshot({ path: shots + "13-respec-builder-it.png" });
    await builderSection("origin");
    check(
      (await page.locator('[data-builder-path="origin.speciesId"]').inputValue()) === "orc",
      "species not kept in the rebuild",
    );
    check(
      (await page.locator('[data-builder-path="origin.backgroundId"]').inputValue()) === "soldier",
      "background not kept in the rebuild",
    );
    await page.locator("[data-builder-discard]").click();
    await inDialog("Scarta bozza").click();
    await page.waitForURL(/#characters/);
    check((await saved()).actors[kessaId].level === 3, "discarding the rebuild changed the sheet");
    ok(
      "Full rebuild (BG3 CRP-014): a revise draft opens on Classi with 'livelli scelti 0/3'; Orco and Soldato kept; discarding it leaves the sheet unchanged (a complete rebuild is applied in the Node test)",
    );

    // -----------------------------------------------------------------------------------
    // E. (3) Oren (druid 5): Grappler blocked with its reason, exception with a reason stays
    // on the sheet; (5) rolled gold at starting level 5, physical die.
    await page.goto(base + "#builder-plus?tab=premade&id=oren");
    await page.getByRole("heading", { name: "Oren", level: 1 }).waitFor();
    await button("Reclama personaggio").first().click();
    await dialog().locator('input[name="confirm"]').check();
    await inDialog("Reclama personaggio").click();
    await page.waitForURL(/#characters\?id=/);
    const orenId = page.url().match(/id=([^&]+)/)[1];
    await button("Rivedi scelte").click();
    await page.waitForURL(/#builder\?id=/);
    await builderSection("features");
    const blocked = page.locator('[data-bp-blocked="grappler"]');
    await blocked.waitFor();
    const reason = await blocked.innerText();
    check(
      /Bloccato/.test(reason) &&
        /Forza o Destrezza 13 o superiore/.test(reason) &&
        /Forza 8 · Destrezza 12/.test(reason),
      "block reason: " + reason,
    );
    await page.screenshot({ path: shots + "14-feat-blocked-it.png" });
    await page.locator('[data-bp-exc-allow="grappler"]').click();
    await inDialog("Consenti eccezione").click();
    await page.waitForTimeout(150);
    check(await page.locator("#dialog[open]").count(), "empty reason closed the dialog");
    check(
      !(await saved()).characterDrafts
        .at(-1)
        .data.features.selected.some((s) => s.id === "grappler"),
      "empty reason accepted",
    );
    await dialog()
      .locator('input[name="reason"]')
      .fill("Accordo con il DM: allenamento con i lottatori del porto");
    await inDialog("Consenti eccezione").click();
    await page.locator(".bp-feats .badge", { hasText: "Eccezione consentita" }).waitFor();
    await builderSection("review");
    const accept = page.locator("[data-builder-accept-incomplete]");
    if (await accept.count()) await accept.check();
    await page.locator("[data-builder-apply]").click();
    await page.waitForURL(/#characters\?id=/);
    await openTab("features");
    const exception = page.locator('[data-bp-exception="grappler"]');
    await exception.waitFor();
    check(
      /Accordo con il DM/.test(await exception.innerText()),
      "exception reason not on the sheet",
    );
    await page.reload();
    await exception.waitFor();
    await exception.scrollIntoViewIfNeeded();
    await page.screenshot({ path: shots + "15-exception-on-sheet-it.png" });
    ok(
      "Grappler (level-4 feat) blocked with its reason and values (Forza 8 · Destrezza 12, SRD EN 87); 'Consenti eccezione' refused without a reason, then applied with one; after 'Applica alla scheda' the Features tab shows the permanent exception, also after reload (DDB-016, I-060)",
    );
    await openTab("inventory");
    await page.locator("[data-bp-reopen]").click();
    await dialog().locator("[data-bp-chooser]").waitFor();
    check(/500 mo più 1d10 × 25 mo/.test(await dialog().innerText()), "no higher-level gold band");
    await dialog().locator("[data-bp-roll='physical']").click();
    check(
      await dialog().locator(".dialog-error:not([hidden])").count(),
      "empty physical face accepted",
    );
    await dialog().locator("[data-bp-face]").fill("7");
    await dialog().locator("[data-bp-roll='physical']").click();
    await dialog().locator("[data-bp-roll-result]").waitFor();
    check(
      /d10 = 7 → 500 \+ 7 × 25 = 675 mo · dado fisico/.test(
        await dialog().locator("[data-bp-roll-result]").innerText(),
      ),
      "roll result text",
    );
    await page.screenshot({ path: shots + "16-rolled-gold-it.png" });
    const goldBefore = (await saved()).actors[orenId].currency.gp;
    await inDialog("Applica dotazione").click();
    await page.locator(".bp-notice").waitFor();
    await page.reload();
    await page.locator("[data-bp-reopen]").waitFor();
    const oren = (await saved()).actors[orenId];
    check(oren.currency.gp === goldBefore + 675, `gold ${oren.currency.gp} vs ${goldBefore}+675`);
    const logRoll = (await saved()).log
      .flatMap((e) => e.rolls ?? [])
      .find((r) => r.source === "builder-plus");
    check(logRoll?.mode === "physical" && logRoll.values[0] === 7, "roll evidence not in the log");
    ok(
      `Starting level 5 (SRD EN 24 / IT 27): empty physical face refused, d10 = 7 recorded → 675 gp added (${goldBefore} → ${oren.currency.gp}), roll evidence in the log, kept after reload`,
    );

    // -----------------------------------------------------------------------------------
    // F. (8) Player and DM on the same draft: presence, publish, explicit conflict.
    await page.locator('.app-header [data-nav="characters"]').click();
    await button("Crea personaggio").first().click();
    await page.locator("[data-bp-cobuild-start]").click();
    await inDialog("Condividi con il DM").click();
    await page.waitForURL(/#builder-plus\?.*tab=cobuild/);
    const cobuildUrl = page.url();
    await page.locator("#bp-f-name").fill("Brann");
    // Review fix (B39-rf): a click into another field keeps the focus there (it used to be
    // sent back to the field just left, so the typing landed in the wrong field).
    await page.locator("#bp-f-concept").click();
    await page.keyboard.type("Guardia del faro");
    await page.waitForTimeout(150);
    check(
      (await page.evaluate(() => document.activeElement?.id)) === "bp-f-concept" &&
        (await page.locator("#bp-f-name").inputValue()) === "Brann" &&
        (await page.locator("#bp-f-concept").inputValue()) === "Guardia del faro",
      "typing after a click into another field went to the wrong field",
    );
    await page.locator("#bp-f-concept").press("Tab");
    await page.waitForTimeout(200);
    // The next control after the concept ("Scarta" of its now-saved edit, or Appearance).
    check(
      await page.evaluate(
        () =>
          document.activeElement?.id !== "bp-f-concept" &&
          Boolean(
            document.activeElement?.closest?.(
              '[data-bp-cofield="concept"] .bp-cofield-meta, [data-bp-cofield="description"]',
            ),
          ),
      ),
      "Tab out of an edited field did not move on",
    );
    const mine = Object.values((await saved()).ext["builder-plus-cobuild"].sessions).at(-1).local
      .player;
    check(
      mine.name?.value === "Brann" && mine.concept?.value === "Guardia del faro",
      "unpublished edits not saved on leaving the fields",
    );
    await page.locator("#bp-f-classId").selectOption("fighter");
    await page.waitForTimeout(200);
    await setRole("dm");
    await page.locator(".bp-cobuild").waitFor();
    const presence = await page.locator('[data-bp-cofield="name"] .bp-presence').innerText();
    check(/Il giocatore sta modificando qui/.test(presence), "DM sees no presence");
    check(
      (await page.locator("#bp-f-name").inputValue()) === "",
      "DM sees the player's unpublished text",
    );
    await page.screenshot({ path: shots + "17-cobuild-dm-presence-it.png" });
    // Typed, then Publish at once (no Tab): one click publishes the text (it used to be lost).
    await page.locator("#bp-f-name").fill("Brannoc");
    await page.locator("[data-bp-publish]").click();
    await page.waitForTimeout(250);
    check(
      Object.values((await saved()).ext["builder-plus-cobuild"].sessions).at(-1).fields.name
        .value === "Brannoc",
      "Publish right after typing did not publish the text",
    );
    await setRole("player");
    await page.locator(".bp-cobuild").waitFor();
    check(
      /cambiato dal DM dopo la tua modifica/.test(
        await page.locator('[data-bp-cofield="name"]').innerText(),
      ),
      "player not told the DM changed the field",
    );
    await page.locator("[data-bp-publish]").click();
    await page.locator('[data-bp-conflict="name"]').waitFor();
    const conflict = await page.locator('[data-bp-conflict="name"]').innerText();
    check(
      /Brann/.test(conflict) &&
        /Brannoc/.test(conflict) &&
        /Versione del DM · rev 1/.test(conflict),
      "conflict content: " + conflict,
    );
    await page.screenshot({ path: shots + "18-cobuild-conflict-it.png" });
    await page.locator('[data-bp-resolve="mine"][data-field="name"]').click();
    await page.waitForTimeout(250);
    check(
      (await page.locator("#bp-f-name").inputValue()) === "Brann",
      "conflict resolution not applied",
    );
    const session = Object.values((await saved()).ext["builder-plus-cobuild"].sessions)[0];
    check(
      session.fields.name.value === "Brann" &&
        session.fields.name.rev === 2 &&
        session.fields.classId.value === "fighter",
      "shared fields wrong",
    );
    // The DM learns about it through the notification centre.
    // (Leave the shared draft first: opening it as the DM would mark the change as seen.)
    await page.goto(base + "#home");
    await page.locator("#content").waitFor();
    await setRole("dm");
    await page.locator('.service-nav [data-service="requests"]').click();
    const row = page.locator("#dialog .notifications-item").filter({ hasText: "Bozza condivisa" });
    await row.first().waitFor();
    await row.first().locator("[data-notifications-open]").click();
    await page.waitForURL(/tab=cobuild/);
    check(
      (await page.locator("#bp-f-name").inputValue()) === "Brann",
      "DM does not see the resolved value",
    );
    await setRole("player");
    await page.goto(cobuildUrl);
    await page.locator("[data-bp-transfer]").click();
    await page.waitForURL(/#builder\?id=/);
    check(
      (await page.locator('[data-builder-path="identity.name"]').inputValue()) === "Brann",
      "transfer did not bring the name",
    );
    ok(
      "Co-building (Quest Portal VTL-022): a click into another field keeps the typing there and Tab moves on (B39-rf); the DM sees 'Il giocatore sta modificando qui' but not the text, publishes 'Brannoc' with one click right after typing; the player is told and gets an explicit conflict (mine 'Brann' vs DM rev 1), keeps their own version (rev 2); the DM opens it from the notification centre; the owner brings it into the private builder draft",
    );
    // DM privacy: the DM never sees the player's private claimed sheets.
    await setRole("dm");
    await page.goto(base + "#characters");
    await page.locator("[data-clib-page]").waitFor();
    check(
      !(await page.locator(`[data-clib-card="${kessaId}"]`).count()),
      "DM sees the player's private claimed sheet",
    );
    await setRole("player");
    ok("DM view: the player's private claimed characters stay out of the DM's Characters page");
    check(await noOverflow(), "desktop overflow");

    // -----------------------------------------------------------------------------------
    // G. EN phone 390x844, touch: quick path grid/detail, ready-made claim, chooser, co-build.
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), key);
    phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    await phoneContext.addInitScript(
      ([k, value]) => {
        if (!sessionStorage.getItem("b39-seeded")) {
          localStorage.setItem(k, value);
          sessionStorage.setItem("b39-seeded", "1");
        }
      },
      [key, snapshot],
    );
    const phone = await phoneContext.newPage();
    phone.on("pageerror", (error) => errors.push("phone: " + error.message));
    await phone.goto(base + "#characters");
    await styled(phone);
    await phone.locator('[data-service="preferences"]').tap();
    await phone.locator('#dialog [name="lang"]').selectOption("en");
    await phone.locator("#dialog button[type=submit]").tap();
    await phone.getByRole("heading", { name: "Characters", level: 1 }).waitFor();
    await button("Create character", phone).first().tap();
    await phone
      .getByRole("heading", { name: "How do you want to create the character?" })
      .waitFor();
    check(await noOverflow(phone), "phone overflow: methods");
    await button("Quick path", phone).tap();
    await phone.getByRole("heading", { name: "Choose a class" }).waitFor();
    check(await noOverflow(phone), "phone overflow: class grid");
    await phone.screenshot({ path: shots + "19-phone-quick-classes-en.png" });
    await button("Wizard", phone).tap();
    await phone.getByRole("heading", { name: "Wizard", level: 2 }).waitFor();
    check(await noOverflow(phone), "phone overflow: class page");
    const detailText = await phone.locator(".bp-detail").innerText();
    check(/Light, Mage Hand, Ray of Frost/.test(detailText), "EN SRD recommendation missing");
    await phone.getByRole("button", { name: "Choose Wizard" }).tap();
    await button("Sage", phone).tap();
    await phone.getByRole("button", { name: "Choose Sage" }).tap();
    await button("Elf", phone).tap();
    await phone.locator('[data-bp-species-choice="lineage"]').selectOption("wood");
    await phone.getByRole("button", { name: "Choose Elf" }).tap();
    await phone.getByRole("heading", { name: "Name and portrait" }).waitFor();
    await phone.locator("[data-bp-name-pick]").nth(1).tap();
    await phone.waitForTimeout(150);
    // Review fix (B39-rf): typed on the phone, then one tap on Continue (no lost tap).
    await phone.locator("[data-bp-name]").tap();
    await phone.locator("[data-bp-name]").fill("Tamsin");
    await button("Continue to review", phone).tap();
    await phone.getByRole("heading", { name: "Review", level: 2 }).waitFor();
    check(
      (await phone.locator(".bp-review-head h3").innerText()) === "Tamsin",
      "typed name lost on the tap to the review",
    );
    check(await noOverflow(phone), "phone overflow: review");
    const phoneReview = await phone.locator(".bp-quick-body").innerText();
    // Refreshed by the round-2 regression (29/09/2026): P1 PG-05 applies the Elf lineage's
    // grants, so this level-1 Wood Elf wizard has no «Aspects to verify» left and «Create
    // character» asks no confirmation (the confirmation gate is checked on Oren above).
    check(
      !/Aspects to verify/.test(phoneReview) &&
        !(await phone.locator('[data-bp-create] input[name="confirm"]').count()),
      "a complete level-1 elf still asks to confirm aspects to verify",
    );
    check(
      /10\.5 m|35 ft/.test(phoneReview),
      "Wood Elf speed not in the review: " + phoneReview.slice(0, 200),
    );
    await phone.screenshot({ path: shots + "20-phone-review-en.png", fullPage: true });
    await button("Create character", phone).last().tap();
    await phone.waitForURL(/#characters\?id=/);
    ok(
      "EN phone (touch): quick path Wizard → Sage → Elf (Wood lineage chosen on the species page) → suggested name → review with nothing left to verify → sheet",
    );
    const controls = (scope) =>
      `${scope} button, ${scope} select, ${scope} input:not([type=radio]):not([type=checkbox])`;
    const small = await smallTargets(controls(".bp-page"), phone);
    await phone.goto(base + "#builder-plus?tab=premade");
    await phone.getByRole("heading", { name: "Ready-made characters", level: 1 }).waitFor();
    check(await noOverflow(phone), "phone overflow: ready-made list");
    const smallPremade = await smallTargets(controls(".bp-page"), phone);
    await phone.screenshot({ path: shots + "21-phone-premades-en.png", fullPage: true });
    await phone.locator('[data-bp-claim="brann"]').tap();
    await inDialog("Claim character", phone).tap();
    await phone.waitForURL(/#characters\?id=/);
    const brannEn = (await saved(phone)).actors[phone.url().match(/id=([^&]+)/)[1]];
    check(/border guard/.test(brannEn.backstory), "claimed in English, story still Italian");
    await openTab("inventory", phone);
    await phone.locator("[data-bp-reopen]").tap();
    await dialog(phone).locator("[data-bp-chooser]").waitFor();
    check(await noOverflow(phone), "phone overflow: chooser");
    await phone.screenshot({ path: shots + "22-phone-chooser-en.png" });
    await dialog(phone).locator("[data-close]").first().tap();
    await phone.goto(cobuildUrl);
    await phone.locator(".bp-cobuild").waitFor();
    check(await noOverflow(phone), "phone overflow: shared draft");
    const smallCobuild = await smallTargets(controls(".bp-cobuild"), phone);
    await phone.screenshot({ path: shots + "23-phone-cobuild-en.png", fullPage: true });
    // Review fix (B39-rf): a closed shared draft stays listed and opens read-only.
    await phone.locator("[data-bp-close]").tap();
    await dialog(phone).locator("button[type=submit]").tap();
    await phone.locator(".bp-cobuild .bp-hidden-note").waitFor();
    check(
      await phone.evaluate(() =>
        [...document.querySelectorAll("[data-bp-field]")].every((f) => f.disabled),
      ),
      "closed shared draft still editable",
    );
    check(
      /Guardia del faro/.test(await phone.locator("#bp-f-concept").inputValue()),
      "closed draft lost its concept",
    );
    await phone.goto(base + "#builder-plus?tab=cobuild");
    await phone.locator("[data-bp-cobuild-open]").first().waitFor();
    check(
      /Closed/.test(await phone.locator(".bp-sessions").innerText()),
      "closed draft not listed",
    );
    ok(
      "EN phone: typed name + one tap on Continue kept; Brann claimed in English has an English story; the closed shared draft stays listed (Closed) and opens read-only with its concept (B39-rf)",
    );
    const tooSmall = [...small, ...smallPremade, ...smallCobuild];
    check(!tooSmall.length, "targets under 40px: " + JSON.stringify(tooSmall.slice(0, 6)));
    ok(
      "EN phone 390: ready-made list, Claim of Brann by tap, reopenable chooser and shared draft without horizontal overflow; every B39 control is at least 40px",
    );
  } catch (error) {
    await page.screenshot({ path: shots + "zz-failure-desktop.png" }).catch(() => {});
    return JSON.stringify({ result: "FAIL", error: error.message, passed, errors }, null, 2);
  } finally {
    if (phoneContext) await phoneContext.close().catch(() => {});
    await context.close().catch(() => {});
  }
  return JSON.stringify(
    { result: errors.length ? "FAIL (page errors)" : "PASS", passed, errors },
    null,
    2,
  );
}
