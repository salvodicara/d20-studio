async (rootPage) => {
  // R1 fix package (round 2), acceptance with real clicks, IT desktop 1440 × 900, player:
  // Bless switched on in Livia's sheet; Livia's Fire Bolt on the Sentinella at the Table rolls
  // the d4 with the d20 and the card shows «+ [n] (Benedizione)» inside the total (PG-47);
  // with Heroic Inspiration the attack stops after the d20 and «Usa Ispirazione eroica:
  // ritira il d20» rerolls it, spending the inspiration (TV-83); Livia's actions keep two
  // rows at 1440 × 900 and 1366 × 768, IT and EN. Synthetic demo data only; this resets this
  // browser's example state (fresh context).
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
  };
  const settleDice = async () => {
    const layer = page.locator("[data-dice3d-layer]:not([hidden])");
    await layer.waitFor({ timeout: 800 }).catch(() => {});
    for (let i = 0; i < 8 && (await layer.count()); i++) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);
    }
    await layer.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  };
  const closeDialog = async () => {
    if (await page.locator("#dialog[open]").count()) await page.keyboard.press("Escape");
    await page
      .locator("#dialog[open]")
      .waitFor({ state: "detached", timeout: 3000 })
      .catch(() => {});
  };
  const table = async () => {
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await page.waitForTimeout(300);
  };
  // The Sentinella's pending damage (assisted automation) is applied by the DM, as at the table.
  const settleAttempts = async () => {
    const data = await stored();
    if (!(data.combatAttempts ?? []).some((a) => a.status === "pending")) return;
    await setRole("dm");
    await table();
    await page
      .locator("[data-combat-requests]")
      .first()
      .click()
      .catch(() => {});
    for (let i = 0; i < 4 && (await page.locator("#dialog [data-apply-outcome]").count()); i++) {
      await page.locator("#dialog [data-apply-outcome]").first().click();
      await page.waitForTimeout(200);
    }
    await closeDialog();
    await setRole("player");
  };
  const attackSentinella = async () => {
    await table();
    await page.locator('.map-token[data-actor="livia"]').click();
    await page.locator('[data-combat-action="fire-bolt"]').click();
    await page.locator("#combat-detail").waitFor();
    const detail = await page.locator("#combat-detail").innerText();
    await page.locator('.map-token[data-actor="goblin-1"]').click();
    await settleDice();
    await page.waitForTimeout(200);
    const opened = (await page.locator("#dialog[open] .attempt-result").count()) > 0;
    if (!opened) {
      await closeDialog();
      await page.locator("[data-combat-requests]").first().click();
    }
    await page.locator("#dialog[open] .attempt-result").first().waitFor();
    return { detail, opened };
  };
  // Distinct rows of the action bar's actions (BG3 hotbar: at most two).
  const actionRows = () =>
    page.evaluate(() => {
      const tops = [...document.querySelectorAll(".combat-actions .combat-action")]
        .filter((b) => b.offsetParent)
        .map((b) => Math.round(b.getBoundingClientRect().top));
      return [...new Set(tops)].length;
    });
  let step = "setup";
  try {
    await page.goto(base + "#table");
    await page.locator("#battle-map").waitFor();
    await button("Ripristina esempio").click();
    await button("Ripristina").click();
    await page.locator("#battle-map").waitFor();
    await setRole("player");

    // ------------------------------------------------------------------ 1. Bless in the roll
    step = "bless";
    await page.goto(base + "#characters?id=livia");
    const bless = page.locator('[data-shp="effect"][data-effect="bless"]');
    await bless.click();
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-shp="effect"][data-effect="bless"]')
          ?.getAttribute("aria-checked") === "true",
    );
    const { detail } = await attackSentinella();
    check(/Tiro per colpire: d20 \+ 1d4 \(Benedizione\)/.test(detail), "formula: " + detail);
    const card = await page.locator("#dialog[open] .attempt-result").first().innerText();
    const match = /(\d+) \+ \[(\d)\] \(Benedizione\) ([+−]) (\d+) = (\d+)/.exec(card);
    check(match, "card without the Bless die: " + card);
    const [, d20, d4, sign, mod, total] = match.map((v, i) => (i === 3 ? v : Number(v)));
    check(d20 + d4 + (sign === "−" ? -mod : mod) === total, "total " + match[0]);
    await page.screenshot({ path: shots + "r1-01-bless-card-it-1440.png" });
    const attempt = (await stored()).combatAttempts.at(-1);
    check(attempt.requests[0].dice[1]?.sides === 4, "the attack request rolls a d4");
    passed.push(
      `1. PG-47: Bless on in the sheet; Fire Bolt on the Sentinella: detail «Tiro per colpire: d20 + 1d4 (Benedizione)», card «${match[0]}»`,
    );
    await closeDialog();
    await settleAttempts();

    // ------------------------------------------------------------------ 2. rows 1440/1366
    step = "rows";
    const rows = {};
    for (const [w, h] of [
      [1440, 900],
      [1366, 768],
    ]) {
      await page.setViewportSize({ width: w, height: h });
      await table();
      await page.locator('.map-token[data-actor="livia"]').click();
      await page.waitForTimeout(200);
      rows[`it-${w}`] = await actionRows();
    }
    await page.locator('[data-service="preferences"]').first().click();
    await page.locator('#dialog [name="lang"]').selectOption("en");
    await page.locator('#dialog button[type="submit"]').click();
    await page.waitForTimeout(300);
    for (const [w, h] of [
      [1440, 900],
      [1366, 768],
    ]) {
      await page.setViewportSize({ width: w, height: h });
      await table();
      await page.locator('.map-token[data-actor="livia"]').click();
      await page.waitForTimeout(200);
      rows[`en-${w}`] = await actionRows();
      if (w === 1366) await page.screenshot({ path: shots + "r1-02-actions-en-1366.png" });
    }
    check(
      Object.values(rows).every((n) => n <= 2),
      "action rows: " + JSON.stringify(rows),
    );
    passed.push(`2. Livia's actions in rows: ${JSON.stringify(rows)} (at most two)`);
    await page.locator('[data-service="preferences"]').first().click();
    await page.locator('#dialog [name="lang"]').selectOption("it");
    await page.locator('#dialog button[type="submit"]').click();
    await page.setViewportSize({ width: 1440, height: 900 });

    // ------------------------------------------------------------------ 3. inspiration hold
    step = "inspiration";
    await page.goto(base + "#characters?id=livia");
    // The switch sits under the sheet's sticky tabs once scrolled: press it by its label.
    const inspiration = page.locator('[data-dtray-inspiration="livia"]').first();
    await inspiration.evaluate((input) => input.click());
    await page.waitForFunction(
      (k) => JSON.parse(localStorage.getItem(k)).ext["dice-tray"].inspiration.livia?.active,
      key,
    );
    const { opened } = await attackSentinella();
    check(opened, "the held attack opens its card by itself");
    const held = page.locator("#dialog[open] [data-inspiration-reroll]");
    await held.waitFor();
    const heldCard = await page.locator("#dialog[open] .attempt-result").first().innerText();
    check(/Scegli: ritira o continua/.test(heldCard), "hold badge: " + heldCard);
    let data = await stored();
    const heldAttempt = data.combatAttempts.at(-1);
    check(heldAttempt.requests[0].hold === "inspiration", "the d20 is held");
    check(heldAttempt.outcomes[0].hit === undefined, "nothing hit before the choice");
    check(!heldAttempt.requests.some((r) => r.kind === "damage"), "no damage before the choice");
    await page.screenshot({ path: shots + "r1-03-inspiration-hold-it-1440.png" });
    const before = heldAttempt.requests[0].values;
    await held.click();
    await settleDice();
    await page.locator("#dialog[open] .attempt-result").first().waitFor();
    const after = await page.locator("#dialog[open] .attempt-result").first().innerText();
    check(/ritirato con Ispirazione eroica: \d+ → \d+/.test(after), "reroll note: " + after);
    data = await stored();
    const rerolled = data.combatAttempts.at(-1).requests[0];
    check(data.ext["dice-tray"].inspiration.livia.active === false, "inspiration spent");
    check(rerolled.inspirationReroll?.from !== undefined, "reroll recorded");
    const logged = data.log
      .flatMap((e) => e.rolls ?? [])
      .filter((r) => r.requestId === rerolled.id)
      .map((r) => r.values.join("+"));
    check(logged.length === 2, "both faces in the log: " + logged.join(" | "));
    await page.screenshot({ path: shots + "r1-04-inspiration-rerolled-it-1440.png" });
    passed.push(
      `3. TV-83: with Heroic Inspiration the attack stopped after the d20 (${before.join("+")}; no hit, no damage) and its card opened by itself with «Usa Ispirazione eroica: ritira il d20» and «Continua»; the reroll kept ${rerolled.values.join("+")}, spent the inspiration, log ${logged.join(" → ")}`,
    );
    await closeDialog();
  } catch (error) {
    await page.screenshot({ path: shots + "r1-attack-failure.png" }).catch(() => {});
    await context.close();
    return JSON.stringify({ failedAt: step, error: error.message, passed, errors });
  }
  await context.close();
  return JSON.stringify({ passed, errors });
}
