async (rootPage) => {
  // Final review fixes (30/09/2026), IT 1440, real clicks and keys, from a clean state:
  // F3 «Sessione» menu above the turn order; F4 a new page from the top, Back restores the
  // position; F5/TV-53 the hotbar follows the turn to Mira; Surprise (SRD 5.2.1) rolls with
  // Disadvantage; X-09 HP arithmetic on the sheet; X-06 a spell row's context menu (Shift+F10);
  // X-07 a creature dragged from the Table's compendium onto the map; X-10 a panel popped out
  // into its own window; X-05 Esc on a confirmation returns to Preferences; F15 a prone
  // attacker's target chip reads «Svantaggio: Prono». Synthetic demo data only.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-10-01/fix/images/";
  const browser = rootPage.context().browser();
  const passed = [],
    errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await context.newPage();
  p.on("pageerror", (e) => errors.push(e.message.split("\n")[0]));
  const wait = (ms) => p.waitForTimeout(ms);
  const stored = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const txt = async (sel) =>
    (
      await p
        .locator(sel)
        .first()
        .innerText()
        .catch(() => "")
    )
      .replace(/\s+/g, " ")
      .trim();
  const fresh = async (role = "player") => {
    await p.goto(base + "#home");
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.locator("#demo-role").waitFor();
    if (role !== "player") {
      await p.locator("#demo-role").selectOption(role);
      await wait(400);
    }
  };
  const go = async (hash, ms = 900) => {
    await p.goto(base + hash);
    await wait(ms);
  };
  const startCombat = async (mark = []) => {
    await go("#table", 1400);
    await p
      .getByRole("button", { name: /Avvia combattimento/ })
      .first()
      .click();
    await wait(700);
    for (const id of mark) {
      await p.locator(`#dialog [data-ct-start-surprise="${id}"]`).check();
      await wait(300);
    }
    await p
      .locator("#dialog")
      .getByRole("button", { name: /Tira tutti/ })
      .click();
    await wait(700);
    await p
      .locator("#dialog")
      .getByRole("button", { name: /Inizia combattimento/ })
      .click();
    await wait(1200);
  };
  let step = "start";
  try {
    // ------------------------------------------------ Surprise + F3 session menu + F5 turn follow
    step = "surprise";
    await fresh("dm");
    await startCombat(["livia", "mira"]);
    const rolls = (await stored()).initiativeRolls.filter((r) =>
      ["livia", "mira", "doran"].includes(r.actorId),
    );
    const of = (id) => rolls.filter((r) => r.actorId === id).at(-1);
    for (const id of ["livia", "mira"]) {
      const r = of(id);
      check(
        r?.rollMode === "disadvantage" &&
          r.faces?.length === 2 &&
          r.natural === Math.min(...r.faces),
        `${id} surprised: ${JSON.stringify(r)}`,
      );
    }
    check(of("doran")?.rollMode !== "disadvantage", "Doran is not surprised");
    passed.push(
      "Surprise: Livia and Mira marked «Sorpreso» roll two d20 and keep the lower (record: disadvantage, faces); Doran rolls one",
    );

    step = "session menu";
    await p.locator(".session-view-menu-button").first().click();
    await wait(500);
    const items = await p
      .locator(".session-view-menu [role=menuitem], .session-view-menu button")
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return [el.innerText.trim().slice(0, 30), !!t && (t === el || el.contains(t))];
        }),
      );
    check(
      items.length >= 5 && items.every(([, self]) => self),
      "menu covered: " + JSON.stringify(items),
    );
    await p.screenshot({ path: dir + "final-fixes-01-session-menu.png" });
    await p.keyboard.press("Escape");
    await wait(300);
    passed.push(
      `F3: the «Sessione» menu is above the turn order (${items.length} rows, each hit itself)`,
    );

    step = "turn follow";
    const current = async () => {
      const s = await stored();
      return s.combat.order[s.combat.turn];
    };
    for (let i = 0; i < 8 && (await current()) !== "mira"; i++) {
      await p
        .getByRole("button", { name: /Termina turno|Turno successivo/ })
        .first()
        .click();
      await wait(900);
      const dlg = p.locator("#dialog[open]");
      if (await dlg.count()) {
        const b = dlg.getByRole("button", { name: /Termina|Conferma|Passa|Continua/ }).first();
        if (await b.count()) await b.click();
        else await p.keyboard.press("Escape");
        await wait(600);
      }
    }
    check((await current()) === "mira", "Mira's turn not reached");
    await p.locator("#demo-role").selectOption("player");
    await wait(1200);
    check(
      (await txt(".hotbar-name strong")) === "Mira",
      "hotbar: " + (await txt(".hotbar-name strong")),
    );
    await p.screenshot({ path: dir + "final-fixes-02-mira-turn.png" });
    passed.push("F5/TV-53: at Mira's turn the player's hotbar shows Mira");

    // ------------------------------------------------ F4 scroll memory
    step = "scroll";
    await fresh("player");
    await wait(800);
    await p.evaluate(() => window.scrollTo(0, 400));
    await wait(300);
    await p
      .locator('#content [href*="characters?id=livia"], #content [data-open-sheet="livia"]')
      .first()
      .click();
    await wait(1000);
    const sheet = await p.evaluate(() => ({
      y: Math.round(scrollY),
      focus: document.activeElement?.tagName,
    }));
    check(sheet.y === 0, "the sheet opens scrolled: " + JSON.stringify(sheet));
    await p.goBack();
    await wait(900);
    const back = await p.evaluate(() => ({ hash: location.hash, y: Math.round(scrollY) }));
    check(back.hash === "#home" && Math.abs(back.y - 400) <= 2, "Back: " + JSON.stringify(back));
    passed.push(
      `F4: Home at 400 px → Livia's sheet at 0 (focus ${sheet.focus}) → Back to Home at ${back.y} px`,
    );

    // ------------------------------------------------ X-09 HP arithmetic
    step = "hp";
    await go("#characters?id=livia", 1200);
    const hp = async () => (await stored()).actors.livia.hp;
    const field = () => p.locator('[data-dt-amount="livia"]').first();
    for (const [value, how, want] of [
      ["=15", "Enter", 15],
      ["-2", "Enter", 13],
      ["+1", "Enter", 14],
      ["2+3", "Danno", 9],
      ["abc", "Enter", 9],
    ]) {
      await field().fill(value);
      if (how === "Enter") await field().press("Enter");
      else await p.locator("[data-dt-damage]").first().click();
      await wait(600);
      check((await hp()) === want, `${value}: HP ${await hp()} ≠ ${want}`);
    }
    check(/non è un valore valido/.test(await txt("[data-dt-status]")), "abc explained");
    await p.screenshot({
      path: dir + "final-fixes-03-hp.png",
      clip: { x: 0, y: 100, width: 1440, height: 400 },
    });
    passed.push(
      "X-09: the sheet's HP field takes =15, -2, +1 (Enter) and 2+3 (Danno): 18 → 15 → 13 → 14 → 9; «abc» explained",
    );

    // ------------------------------------------------ X-06 context menu (keyboard)
    step = "context menu";
    await go("#characters?id=livia&tab=spells", 1400);
    const cast = p.locator("[data-spl-row] button").first();
    await cast.focus();
    await p.keyboard.press("Shift+F10");
    await wait(400);
    const menu = await txt(".context-menu");
    check(/Lancia/.test(menu), "spell menu: " + menu);
    check(
      (await p.evaluate(() => document.activeElement?.getAttribute("role"))) === "menuitem",
      "focus in the menu",
    );
    await p.screenshot({ path: dir + "final-fixes-04-spell-menu.png" });
    await p.keyboard.press("Escape");
    await wait(300);
    check(!(await p.locator(".context-menu").count()), "Esc closes the menu");
    check(
      await p.evaluate(() => !!document.activeElement?.closest("[data-spl-row]")),
      "focus back on the row",
    );
    passed.push(
      `X-06: Shift+F10 on a spell row opens «${menu}»; Esc closes it and the focus returns`,
    );

    // ------------------------------------------------ X-05 cancel returns to its origin
    step = "preferences";
    await p.locator('.service-nav [data-service="preferences"]').click();
    await wait(600);
    await p
      .locator("#dialog")
      .getByRole("button", { name: /Ripristina predefiniti/ })
      .first()
      .click();
    await wait(500);
    const confirm = await txt("#dialog-title");
    await p.keyboard.press("Escape");
    await wait(700);
    check(
      (await txt("#dialog-title")) === "Preferenze",
      "after Esc: " + (await txt("#dialog-title")),
    );
    check(await p.evaluate(() => document.querySelector("#dialog").open), "Preferences open again");
    await p.keyboard.press("Escape");
    await wait(300);
    passed.push(`X-05: «${confirm}» → Esc returns to «Preferenze»`);

    // ------------------------------------------------ F15 target chip
    step = "target chip";
    await go("#characters?id=livia", 1200);
    await p
      .getByRole("button", { name: /\+ Condizione/ })
      .first()
      .click();
    await wait(600);
    await p
      .locator("#dialog")
      .getByText(/^Prono$/)
      .first()
      .click()
      .catch(async () => {
        await p.locator("#dialog label", { hasText: "Prono" }).first().click();
      });
    await wait(300);
    const submit = p.locator("#dialog button[type=submit]").first();
    if (await submit.count()) await submit.click();
    await wait(700);
    await go("#table", 1400);
    await p.locator('[data-combat-action="fire-bolt"]').first().click();
    await wait(600);
    const g = await p
      .locator('#battle-map [data-actor="goblin-1"] .token-hit')
      .first()
      .boundingBox();
    await p.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await wait(700);
    const chip = (await p.locator("[data-knowledge-target-chip]").first().textContent()).trim();
    check(/Svantaggio: Prono/.test(chip), "chip: " + chip);
    await p.screenshot({ path: dir + "final-fixes-05-aim-prone.png" });
    await p.keyboard.press("Escape");
    passed.push(`F15: prone Livia aims Fire Bolt at the goblin, chip «${chip}»`);

    // ------------------------------------------------ X-07 drag from the compendium
    step = "drag";
    await fresh("dm");
    await go("#table", 1400);
    await p.locator('[data-table-tab="reference"]').first().click();
    await wait(500);
    await p
      .locator('[data-table-subtab="compendium-browse"], [data-table-drawer="compendium-browse"]')
      .first()
      .click()
      .catch(() => {});
    await wait(700);
    await p.locator('#table-drawer [data-category="creatures"]').first().click();
    await wait(500);
    const tokens = async () =>
      (await stored()).scenes.find((s) => s.id === "old-watch").tokens.length;
    const before = await tokens();
    const row = p.locator("#table-drawer [data-compendium-drag]").first();
    await row.scrollIntoViewIfNeeded();
    const rb = await row.boundingBox();
    const map = await p.locator("#battle-map").boundingBox();
    await p.mouse.move(rb.x + 40, rb.y + 15);
    await p.mouse.down();
    await p.mouse.move(rb.x + 20, rb.y + 25, { steps: 3 });
    await p.mouse.move(map.x + 300, map.y + 420, { steps: 8 });
    await p.mouse.up();
    await wait(1200);
    check((await tokens()) === before + 1, `tokens ${before} → ${await tokens()}`);
    await p.screenshot({ path: dir + "final-fixes-06-drag-creature.png" });
    passed.push(
      `X-07: a creature dragged from «Consultazione › Compendio» onto the map: ${before} → ${before + 1} tokens`,
    );

    // ------------------------------------------------ X-10 pop-out
    step = "pop-out";
    await p.locator("[data-table-panels]").first().click();
    await wait(500);
    const [popup] = await Promise.all([
      p.waitForEvent("popup"),
      p.locator('#dialog [data-table-panel-popout="dice-tray"]').click(),
    ]);
    await popup.waitForLoadState();
    await popup.waitForTimeout(1500);
    check(/#table\?tab=window:dice-tray$/.test(popup.url()), "popup url " + popup.url());
    check(
      (await popup.evaluate(() => document.querySelector("#demo-role")?.value)) === "dm",
      "the window keeps the DM identity",
    );
    await popup.setViewportSize({ width: 440, height: 780 });
    await popup.locator("[data-dtray-roll-button]").click();
    await popup.waitForTimeout(1200);
    await popup.screenshot({ path: dir + "final-fixes-07-popout.png" });
    await popup.close();
    await wait(800);
    const last = await p.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("d20-studio-blueprint-v1"));
      return String(s.log.at(-1)?.label ?? "");
    });
    check(/1d20/.test(last), "the main tab reads the window's roll: " + last);
    passed.push(
      `X-10: «Stacca» opens the dice tray alone (#table?tab=window:dice-tray, DM); its roll reaches the main tab («${last}»)`,
    );
  } catch (e) {
    await context.close();
    throw Error(`${step}: ${e.message.split("\n")[0]} | passed so far: ${passed.length}`);
  }
  await context.close();
  check(!errors.length, "page errors: " + errors.join("; "));
  return JSON.stringify({ passed, errors });
};
