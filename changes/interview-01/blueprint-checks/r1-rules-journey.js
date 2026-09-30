async (rootPage) => {
  // R1 fix package (round 2), H-01 / C7 (BG3 Custom Mode, Solasta presets the engine computes):
  // the DM picks the «Tattico» preset in the campaign's rules; with the Sentinella between
  // Livia and Doran, Livia's quarterstaff detail names «Vantaggio: Fiancheggiamento (regola
  // della campagna)» and rolls with Advantage; EN reads «Flanking (campaign rule)»; with Doran
  // moved off the opposite side the reason disappears. Token positions are set in the saved
  // example (setup only). IT/EN desktop 1440 × 900. Synthetic demo data only.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const base = "http://127.0.0.1:8879/";
  const key = "d20-studio-blueprint-v1";
  const shots =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R1/images/";
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const browser = rootPage.context().browser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept().catch(() => {}));
  const stored = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const button = (name) => page.getByRole("button", { name, exact: true });
  const setRole = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await page.waitForTimeout(150);
  };
  const table = async () => {
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.waitForTimeout(300);
  };
  // Setup only: places tokens in the saved example and reloads (no UI claim).
  const place = async (points) => {
    await page.evaluate(
      ({ k, points }) => {
        const data = JSON.parse(localStorage.getItem(k));
        const scene = data.scenes.find((s) => s.id === data.activeSceneId);
        for (const [id, p] of Object.entries(points))
          Object.assign(
            scene.tokens.find((t) => t.actorId === id),
            p,
          );
        localStorage.setItem(k, JSON.stringify(data));
      },
      { k: key, points },
    );
    await page.reload();
    await page.locator("#demo-role").waitFor();
  };
  const preview = async (shot = "") => {
    await table();
    await page.locator('.map-token[data-actor="livia"]').click();
    const staff = page.locator('[data-combat-action="quarterstaff"]');
    const blocked = await staff.getAttribute("data-combat-blocked");
    check(!blocked, "the quarterstaff is greyed: " + blocked);
    await staff.click();
    await page.locator("#combat-detail").waitFor();
    // Point at the Sentinella: the preview names the reasons of this attack.
    await page.locator('.map-token[data-actor="goblin-1"]').hover();
    await page.waitForTimeout(250);
    const text = await page.locator("#combat-detail").innerText();
    if (shot) {
      await page
        .locator("#combat-detail [data-roll-mode]")
        .scrollIntoViewIfNeeded()
        .catch(() => {});
      await page.screenshot({ path: shots + shot });
    }
    // Close the preview: an open attack preview would take the next click on a token.
    await page.locator("#combat-detail [data-combat-cancel]").click();
    return text;
  };
  let step = "setup";
  try {
    await table();
    await button("Ripristina esempio").click();
    await button("Ripristina").click();
    await page.locator("#battle-map").waitFor();
    await setRole("dm");

    // ------------------------------------------------------------------ 1. the preset
    step = "preset";
    await page.goto(base + "#campaign?tab=settings&id=rules");
    await page.locator('[data-cs-tab="rules"][aria-current="page"]').waitFor();
    await page.locator('[data-cs-preset-pick][value="tactical"]').check();
    const dialog = await page.locator("#dialog").innerText();
    check(/Fiancheggiamento/.test(dialog), "preset dialog: " + dialog);
    await page.locator("#dialog button[type=submit]").click();
    await page.waitForTimeout(300);
    const policy = (await stored()).ext["campaign-settings"].campaigns.lanterns.policy;
    check(policy.flanking === "advantage", "flanking rule: " + policy.flanking);
    passed.push(
      "1. DM: Regole › preset «Tattico» (the dialog lists Fiancheggiamento): flanking = advantage",
    );

    // ------------------------------------------------------------------ 2. flanked Sentinella
    step = "flanking";
    const livia = (await stored()).scenes
      .find((s) => s.id === "old-watch")
      .tokens.find((t) => t.actorId === "livia");
    await place({
      "goblin-1": { x: livia.x + 50, y: livia.y },
      doran: { x: livia.x + 100, y: livia.y },
    });
    await setRole("player");
    let text = await preview("r1-11-flanking-it-1440.png");
    check(
      /Vantaggio: Fiancheggiamento \(regola della campagna\)/.test(text),
      "flanking reason: " + text,
    );
    check(/Tiro con vantaggio/.test(text), "roll mode: " + text);

    passed.push(
      "2. Player, Sentinella between Livia and Doran: the quarterstaff detail reads «Vantaggio: Fiancheggiamento (regola della campagna)» and «Tiro con vantaggio»",
    );
    await page.locator('[data-service="preferences"]').first().click();
    await page.locator('#dialog [name="lang"]').selectOption("en");
    await page.locator('#dialog button[type="submit"]').click();
    await page.waitForTimeout(300);
    text = await preview();
    check(/Advantage: Flanking \(campaign rule\)/.test(text), "EN flanking: " + text);
    passed.push("3. EN: «Advantage: Flanking (campaign rule)»");

    // ------------------------------------------------------------------ 3. not opposite
    step = "not opposite";
    await page.locator('[data-service="preferences"]').first().click();
    await page.locator('#dialog [name="lang"]').selectOption("it");
    await page.locator('#dialog button[type="submit"]').click();
    await place({ doran: { x: livia.x + 50, y: livia.y + 50 } });
    text = await preview();
    check(!/Fiancheggiamento/.test(text), "Doran beside, not opposite: " + text);
    passed.push("4. Doran moved beside the Sentinella (not opposite): no flanking reason");
  } catch (error) {
    await page.screenshot({ path: shots + "r1-rules-failure.png" }).catch(() => {});
    await context.close();
    return JSON.stringify({ failedAt: step, error: error.message, passed, errors });
  }
  await context.close();
  return JSON.stringify({ passed, errors });
}
