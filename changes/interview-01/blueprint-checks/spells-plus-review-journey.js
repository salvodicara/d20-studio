async (rootPage) => {
  // B38 independent review (B38-rf): regressions of the review findings, with real clicks,
  // keys and taps against the running blueprint (synthetic data; resets this browser's demo
  // state). Run: playwright-cli -s=d20-b38-rf --raw run-code --filename=<this file> from
  // /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B38-rf/.
  // R1 keyboard focus after Prepara/Togli, Conferma and Aggiungi al libro; R2 no inert source
  // picker, comparison cap announced; R3 a real Long Rest (rest UI) reopens preparation and the
  // lineage casting; R4 the DM's component rule from Preferences applies on the sheet; R5 the
  // player's Ritual log follows the DM's answer; R6 a non-caster's recorded spell keeps the
  // core «Registra preparazione»; R7 the material choice can be cleared; R8 offline: personal
  // cast allowed, campaign cast refused in the dialog; R9 light theme contrast; R10 IT phone.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B38-rf/";
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
  const dialog = (p = page) => p.locator("#dialog[open]");
  const submit = (p = page) => p.locator("#dialog[open] button[type=submit]");
  const toast = (p = page) =>
    p
      .locator("#toast")
      .innerText()
      .catch(() => "");
  const active = (p = page) =>
    p.evaluate(() => {
      const a = document.activeElement;
      return {
        spl: a?.dataset?.spl ?? null,
        key: a?.dataset?.key ?? null,
        text: (a?.innerText ?? "").trim().slice(0, 40),
        tag: a?.tagName,
      };
    });
  const setRole = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForTimeout(250);
  };
  const dismissTips = async (p = page) => {
    for (const name of ["Non mostrare suggerimenti", "Don’t show tips", "Ho capito", "Got it"]) {
      const b = p.getByRole("button", { name, exact: true });
      if (await b.count())
        await b
          .first()
          .click()
          .catch(() => {});
    }
  };
  const openSpells = async (id, p = page) => {
    await p.goto(base + `#characters?id=${id}&tab=spells`);
    await p.locator(".spl-panel").waitFor();
    await p.waitForTimeout(150);
  };
  const preferences = async (apply) => {
    await page.locator('.service-nav [data-service="preferences"]').click();
    await dialog().waitFor();
    await apply();
    await submit().click();
    await page.waitForTimeout(300);
  };

  let phoneContext = null;
  try {
    await page.goto(base);
    await page.evaluate((k) => localStorage.removeItem(k), key);
    await page.reload();
    await page.locator("#content").waitFor();
    await dismissTips();
    await openSpells("iria");
    await dismissTips();

    // R1. Keyboard focus stays on the control that was used (the commit re-renders).
    await page.locator('.spl-heading [data-spl="manage"]').click();
    await page.locator("#spl-manage").waitFor();
    const unprepare = page.locator('#spl-manage [data-spl="toggle"][data-key="iria-mage-armor"]');
    await unprepare.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    let a = await active();
    check(
      a.spl === "toggle" && a.key === "iria-mage-armor" && a.text === "Prepara",
      "focus lost after Togli: " + JSON.stringify(a),
    );
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    a = await active();
    check(
      a.spl === "toggle" && a.key === "iria-mage-armor" && a.text === "Togli",
      "focus lost after Prepara: " + JSON.stringify(a),
    );
    check(!(await page.locator("[data-spl-draft]").count()), "a no-op draft remained");
    await page.locator('[data-spl-tab="class"]').click();
    await page.waitForTimeout(150);
    await page.locator('[data-spl-class-row="sleep"] [data-spl="add-book"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    a = await active();
    check(
      a.spl === "toggle" && a.text === "Prepara",
      "focus after Aggiungi al libro: " + JSON.stringify(a),
    );
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    await page.locator('[data-spl="confirm"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    a = await active();
    check(a.spl === "manage", "focus after Conferma preparazione: " + JSON.stringify(a));
    check((await toast()).includes("Preparazione confermata: +1"), "confirm toast missing");
    ok(
      "R1. Keyboard: Enter on «Togli» keeps focus on the same toggle (now «Prepara»), Enter again restores it with no leftover draft; «Aggiungi al libro» on Sonno moves focus to its new «Prepara»; «Conferma preparazione» returns focus to «Gestisci magie»",
    );

    // R2. The class list shows its only source as text; the fifth comparison is announced.
    check(!(await page.locator("[data-spl-source]").count()), "inert source select still shown");
    check(
      (await page.locator(".spl-manage-filters").innerText()).includes("Fonte: SRD 5.2.1 · 2024"),
      "source text missing",
    );
    for (let i = 0; i < 5; i++) {
      await page.locator('#spl-manage [data-spl="compare"][aria-pressed="false"]').first().click();
      await page.waitForTimeout(120);
    }
    check(
      (await page.locator(".spl-compare-tray strong").innerText()).includes("(4)"),
      "compare cap",
    );
    const capToast = await toast();
    check(/massimo 4 magie, tolta «.+»/.test(capToast), "cap not announced: " + capToast);
    await page.locator('[data-spl="compare-clear"]').click();
    await page.locator('[data-spl="manage-close"]').click();
    ok(
      "R2. «Fonte: SRD 5.2.1 · 2024» is text (no one-option select); a fifth «Confronta» keeps four and says «" +
        capToast +
        "»",
    );

    // R3. The lineage casting, then a real Long Rest through the rest UI (Trance 4 h).
    await page.locator('[data-spl-row="iria-misty-step"] [data-spl="variants"]').click();
    await page.locator('#spl-var-iria-misty-step [data-via="free"]').click();
    await dialog().waitFor();
    await submit().click();
    await page.waitForTimeout(250);
    check(
      (await page.locator('[data-spl-row="iria-misty-step"]').innerText()).includes(
        "lancio gratis usato",
      ),
      "free casting not used",
    );
    check(
      (await page.locator(".spl-window").getAttribute("data-spl-window")) === "closed",
      "window open",
    );
    await page.locator('[data-character-action="rest"]').click();
    await dialog().waitFor();
    await page.locator("#dialog [data-rest-kind]").selectOption("long");
    await page.waitForTimeout(150);
    await page.locator('#dialog [data-rest-start-activity="iria"]').selectOption("trance");
    await page.locator("#dialog [data-rest-preview-start]").click();
    await page.locator("#dialog [data-rest-start]").click();
    await page.waitForTimeout(250);
    await page.locator('#dialog [data-rest-elapsed="iria"]').fill("240");
    await page.locator('#dialog [data-rest-record-time="iria"]').click();
    await page.waitForTimeout(250);
    await page.locator('#dialog [data-rest-complete="iria"]').click();
    await page.waitForTimeout(250);
    await page.locator("#dialog [data-rest-apply]").click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await openSpells("iria");
    check(
      (await page.locator(".spl-window").innerText()).includes(
        "Riposo lungo concluso: puoi cambiare le magie preparate",
      ),
      "the Long Rest did not reopen preparation",
    );
    check(
      (await page.locator('[data-spl-row="iria-misty-step"]').innerText()).includes(
        "1 lancio gratis disponibile",
      ),
      "the Long Rest did not return the lineage casting",
    );
    await page.screenshot({ path: shots + "rf-10-long-rest-reopens-1440.png" });
    ok(
      "R3. Passo velato cast free (lineage) → «lancio gratis usato»; Riposa → Riposo lungo · Trance → 240 min → Applica (rest UI): Magie shows «Riposo lungo concluso: puoi cambiare le magie preparate» and «1 lancio gratis disponibile»",
    );

    // R4. The DM's component rule in Preferences applies on the sheet.
    await page.locator('[data-spl="hold"][data-item="iria-focus"]').click();
    await page.waitForTimeout(200);
    await page.locator('[data-spl-row="iria-fly"] [data-spl="cast"]').click();
    await dialog().waitFor();
    check(await submit().isDisabled(), "Volare castable without a focus");
    await page.keyboard.press("Escape");
    await setRole("dm");
    await preferences(() =>
      page
        .getByRole("combobox", { name: "Componenti", exact: true })
        .selectOption({ label: "Non verificare" }),
    );
    await setRole("player");
    await openSpells("iria");
    check(
      (await page.locator(".spl-components").innerText()).includes("componenti non verificate"),
      "table rule not shown",
    );
    await page.locator('[data-spl-row="iria-fly"] [data-spl="cast"]').click();
    await dialog().waitFor();
    check(
      (await dialog().innerText()).includes("Il DM ha disattivato la verifica delle componenti"),
      "rule off not in the dialog",
    );
    check(!(await submit().isDisabled()), "rule off still blocks");
    await page.keyboard.press("Escape");
    await setRole("dm");
    await preferences(() =>
      page
        .getByRole("combobox", { name: "Componenti", exact: true })
        .selectOption({ label: "Verifica prima del lancio" }),
    );
    await setRole("player");
    ok(
      "R4. Crystal put away → Volare blocked; DM Preferences › Componenti «Non verificare» → the player's sheet reads «componenti non verificate» and Volare's dialog allows the cast; set back to «Verifica prima del lancio»",
    );

    // R5. The player's Ritual log follows the DM's answer.
    await setRole("dm");
    await openSpells("livia");
    await page.locator('[data-spl="exception"]').click();
    await page.locator("#dialog input[name=reason]").fill("Riposo lungo di ieri non registrato");
    await submit().click();
    await page.locator('.spl-window[data-spl-window="open"]').waitFor();
    await page.locator('.spl-heading [data-spl="manage"]').click();
    await page.locator('[data-spl-tab="class"]').click();
    await page.locator('[data-spl-class-row="detect-magic"] [data-spl="add-book"]').click();
    await page.waitForTimeout(200);
    await page.locator('[data-spl-tab="prepare"]').click();
    await page
      .locator('[data-spl-manage-row]:has-text("Individuazione del magico") [data-spl="toggle"]')
      .click();
    await page.locator('[data-spl="confirm"]').click();
    await page.waitForTimeout(250);
    await setRole("player");
    await openSpells("livia");
    check(
      (await page.locator(".spl-window").innerText()).includes("chiedi al DM"),
      "the player is not told who can grant an exception",
    );
    const ritual = page.locator(
      '.spl-row:has-text("Individuazione del magico") [data-spl="cast"][data-via="ritual"]',
    );
    await ritual.click();
    await dialog().waitFor();
    await submit().click();
    await page.waitForTimeout(250);
    check((await page.locator(".spl-log").innerText()).includes("richiesti al DM"), "pending line");
    await setRole("dm");
    await openSpells("livia");
    await page.locator('[data-spl="time-apply"]').click();
    await page.waitForTimeout(250);
    await setRole("player");
    await openSpells("livia");
    let log = await page.locator(".spl-log").innerText();
    check(
      log.includes("applicati dal DM") && !log.includes("richiesti al DM"),
      "stale log: " + log,
    );
    await ritual.click();
    await dialog().waitFor();
    await submit().click();
    await page.waitForTimeout(250);
    await setRole("dm");
    await openSpells("livia");
    await page.locator('[data-spl="time-dismiss"]').click();
    await page.locator("#dialog input[name=reason]").fill("Il tempo è già contato nella scena");
    await submit().click();
    await page.waitForTimeout(250);
    await setRole("player");
    await openSpells("livia");
    log = await page.locator(".spl-log").innerText();
    check(
      log.includes("rifiutati dal DM: Il tempo è già contato nella scena"),
      "declined not shown: " + log,
    );
    await page.locator(".spl-log").scrollIntoViewIfNeeded();
    await page.screenshot({ path: shots + "rf-11-ritual-log-dm-answer-1440.png" });
    ok(
      "R5. Livia (campaign): the player reads «chiedi al DM» under the closed banner; the player's Ritual logs «+10 min richiesti al DM» → DM «Avanza di 10 min» → the player's log reads «applicati dal DM (… → …)»; a second request declined with a reason reads «rifiutati dal DM: Il tempo è già contato nella scena»",
    );

    // R6. A non-caster's recorded spell keeps the core preparation correction.
    await setRole("dm");
    await openSpells("doran");
    await page.locator('[data-character-action="add-spell"]').click();
    await dialog().waitFor();
    await page.locator("#dialog [name=name]").fill("Benedizione");
    await page.locator("#dialog [name=level]").fill("1");
    await page.locator("#dialog [name=source]").fill("Talento Iniziato alla magia");
    await submit().click();
    await page.waitForTimeout(250);
    const doranRow = page.locator(".spl-row", { hasText: "Benedizione" });
    check((await doranRow.innerText()).includes("Non preparata"), "Doran row state");
    await doranRow.locator('[data-character-action="prepare-spell"]').click();
    await dialog().waitFor();
    await page.locator("#dialog select[name=prepared]").selectOption("yes");
    await submit().click();
    await page.waitForTimeout(250);
    check(
      (await page.locator(".spl-row", { hasText: "Benedizione" }).innerText()).includes(
        "Preparata",
      ),
      "core correction not applied",
    );
    ok(
      "R6. Doran (fighter, no spellcasting class): «Annota magia concessa» Benedizione 1° → «Non preparata» with the core «Registra preparazione» → Preparata",
    );
    await setRole("player");

    // R7. The costly material choice can be cleared again in the usage dialog.
    await openSpells("iria");
    await page.locator('[data-spl="material"]').click();
    await dialog().waitFor();
    await page.locator("#dialog [name=name]").fill("Incenso per Trova Famiglio");
    await page.locator("#dialog [name=value]").fill("10");
    await page.locator("#dialog [name=origin]").fill("Comprato a Bruma");
    await submit().click();
    await page.waitForTimeout(250);
    await page
      .locator('[data-spl-row="iria-find-familiar"] [data-spl="cast"][data-via="ritual"]')
      .click();
    await dialog().waitFor();
    const material = page.locator("#dialog select[name=materialItemId]");
    const incense = await material.locator("option").nth(1).getAttribute("value");
    await material.selectOption(incense);
    await page.locator("#dialog input[name=materialConfirmed]").check();
    await page.waitForTimeout(200);
    check(
      !(await dialog().innerText()).includes("Manca il componente materiale"),
      "chosen material",
    );
    await page.locator("#dialog select[name=materialItemId]").selectOption("");
    await page.waitForTimeout(200);
    check(
      (await page.locator("#dialog select[name=materialItemId]").inputValue()) === "",
      "material choice cannot be cleared",
    );
    check(
      (await dialog().innerText()).includes("Manca il componente materiale"),
      "cleared material",
    );
    await page.keyboard.press("Escape");
    ok(
      "R7. Trova famiglio: incense chosen and confirmed → no missing material; «Scegli l'oggetto» again clears it and the missing material returns",
    );

    // R8. Offline: the personal sheet casts locally, the campaign sheet refuses in the dialog.
    await preferences(() => page.getByLabel("Simula assenza di rete (solo dimostrazione)").check());
    await openSpells("iria");
    await page
      .locator('[data-spl-row="iria-detect-magic"] [data-spl="cast"][data-via="ritual"]')
      .click();
    await dialog().waitFor();
    await submit().click();
    await page.waitForTimeout(250);
    check(!(await dialog().count()), "offline personal ritual refused");
    await openSpells("livia");
    await page.locator('[data-spl-row="sample-fire-bolt"] [data-spl="cast"]').click();
    await dialog().waitFor();
    await submit().click();
    await page.waitForTimeout(200);
    const offlineError = await page.locator("#dialog .dialog-error").innerText();
    check(offlineError.includes("Sei senza rete"), "offline campaign cast: " + offlineError);
    await page.keyboard.press("Escape");
    await preferences(() =>
      page.getByLabel("Simula assenza di rete (solo dimostrazione)").uncheck(),
    );
    ok(
      "R8. Offline: Iria's Ritual (personal) is recorded; Livia's Dardo di fuoco (campaign) stays in the dialog with «" +
        offlineError +
        "»",
    );

    // R9. Light theme (Preferences › Aspetto › Tema): readable B38 surfaces.
    await preferences(() =>
      page.getByRole("combobox", { name: "Tema", exact: true }).selectOption({ label: "Chiaro" }),
    );
    await openSpells("iria");
    await page.locator('.spl-heading [data-spl="manage"]').click();
    await page.locator('#spl-manage [data-spl="toggle"]').first().click();
    await page.waitForTimeout(200);
    const contrast = await page.evaluate(() => {
      // Computed colours come as rgb(0–255) or, after color-mix, as color(srgb 0–1).
      const lum = (c) => {
        const scale = c.startsWith("color(") ? 1 : 255;
        const m = c
          .match(/\d+(\.\d+)?/g)
          .slice(0, 3)
          .map(Number)
          .map((v) => {
            v /= scale;
            return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          });
        return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
      };
      const ratio = (x, y) => {
        const [h, l] = [lum(x), lum(y)].sort((p, q) => q - p);
        return +((h + 0.05) / (l + 0.05)).toFixed(2);
      };
      return [
        ".spl-stat dd",
        "#spl-manage h3",
        ".spl-draft h3",
        ".spl-state.is-book",
        ".spl-badge.is-conc",
        ".spl-warning, .spl-window p",
      ].map((sel) => {
        const el = document.querySelector(sel);
        if (!el) return [sel, null];
        // Visual pass (30/09/2026): the open preparation window is now a translucent tint
        // (rgba(47, 107, 51, 0.12) over the cream panel, BG3/DDB callout). Blend each
        // translucent background over the ones beneath it instead of reading the first
        // non-transparent one as opaque (that read the pale tint as dark green, 2.39:1).
        const layers = [];
        for (let bgEl = el; bgEl; bgEl = bgEl.parentElement) {
          const bg = getComputedStyle(bgEl).backgroundColor;
          const n = (bg.match(/\d*\.?\d+(e-?\d+)?/g) || []).map(Number);
          const scale = bg.startsWith("color(") ? 255 : 1;
          const alpha = n.length < 3 ? 0 : n.length > 3 ? n[3] : 1;
          if (alpha > 0) layers.push([n[0] * scale, n[1] * scale, n[2] * scale, alpha]);
          if (alpha >= 1) break;
        }
        let rgb = [255, 255, 255];
        for (const [r, g, b, a] of layers.reverse())
          rgb = [r * a + rgb[0] * (1 - a), g * a + rgb[1] * (1 - a), b * a + rgb[2] * (1 - a)];
        return [sel, ratio(getComputedStyle(el).color, `rgb(${rgb.join(", ")})`)];
      });
    });
    const low = contrast.filter(([, r]) => r !== null && r < 4.5);
    check(!low.length, "light theme contrast: " + JSON.stringify(contrast));
    await page.screenshot({ path: shots + "rf-12-light-theme-1440.png" });
    await preferences(() =>
      page.getByRole("combobox", { name: "Tema", exact: true }).selectOption({ label: "Scuro" }),
    );
    ok(
      "R9. Tema «Chiaro»: stats, manage panel, draft, book chip and Concentration badge ≥ 4.5:1 (" +
        contrast.map(([s, r]) => s + " " + r).join(", ") +
        ")",
    );

    // R10. IT phone 390: new text and the core correction without horizontal overflow.
    phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const phone = await phoneContext.newPage();
    phone.on("pageerror", (error) => errors.push("phone: " + error.message));
    // The same demo data as the desktop run (what the clicks above produced), on a phone.
    const produced = await page.evaluate((k) => localStorage.getItem(k), key);
    await phone.goto(base);
    await phone.evaluate(([k, v]) => localStorage.setItem(k, v), [key, produced]);
    await phone.reload();
    await phone.locator("#content").waitFor();
    await dismissTips(phone);
    await setRole("dm", phone);
    await openSpells("doran", phone);
    check(
      await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      "phone overflow on Doran",
    );
    const box = await phone
      .locator('[data-character-action="prepare-spell"]')
      .first()
      .evaluate((el) => el.getBoundingClientRect().toJSON());
    check(box.height >= 40 && box.right <= 390, "core correction target: " + JSON.stringify(box));
    await setRole("player", phone);
    await openSpells("livia", phone);
    check(
      await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      "phone overflow on Livia",
    );
    await phone.locator(".spl-log").scrollIntoViewIfNeeded();
    await phone.screenshot({ path: shots + "rf-13-phone-it-390.png" });
    ok(
      "R10. IT 390 touch: Doran's «Registra preparazione» ≥ 40 px inside the screen; Livia's banner hint and DM answers in the log, no horizontal overflow",
    );
  } catch (error) {
    await page.screenshot({ path: shots + "rf-failure.png" }).catch(() => {});
    return JSON.stringify({ result: "FAIL", error: String(error), passed, errors }, null, 2);
  } finally {
    await phoneContext?.close();
    await context.close();
  }
  if (errors.length) return JSON.stringify({ result: "FAIL", passed, errors }, null, 2);
  return JSON.stringify({ result: "PASS", passed, errors }, null, 2);
}
