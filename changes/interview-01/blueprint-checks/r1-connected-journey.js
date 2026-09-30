async (rootPage) => {
  // R1 fix package (round 2), TV-95 part (C6, Foundry roll resolver with Pixels): the player
  // pairs the simulated Pixels d20 (R2's delegated simulation, I-233), attacks the Sentinella
  // with physical dice, and the attack's «Risolvi tiro» offers «Dado connesso»: the dialog
  // waits for the die, «Simula il lancio» brings the face and the card records it as a
  // physical die. IT desktop 1440 × 900. Synthetic demo data only; clears this example.
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
  const settleDice = async () => {
    const layer = page.locator("[data-dice3d-layer]:not([hidden])");
    await layer.waitFor({ timeout: 800 }).catch(() => {});
    for (let i = 0; i < 8 && (await layer.count()); i++) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);
    }
    await layer.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  };
  let step = "setup";
  try {
    await page.goto(base + "#table");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator("#battle-map").waitFor();

    // ------------------------------------------------------------------ 1. pair the d20
    step = "pair";
    await page.keyboard.press("Meta+K");
    await page.locator("[data-cmdk-input]").fill("pixels");
    await page.waitForTimeout(250);
    await page.keyboard.press("Enter");
    await page.locator("[data-dtray-devices]").waitFor();
    await page.getByRole("button", { name: "Cerca dadi vicini" }).click();
    await page.locator('[data-dtray-connect="px-d20-onyx"]').click();
    await page.locator("[data-dtray-paired]").waitFor();
    passed.push("1. Palette «pixels» › Cerca dadi vicini › Collega Pixels d20 Onice");

    // ------------------------------------------------------------------ 2. physical attack
    step = "attack";
    await page
      .locator("[data-combat-mode]")
      .first()
      .selectOption("physical")
      .catch(() => {});
    await page.locator('.map-token[data-actor="livia"]').click();
    await page.locator("[data-combat-mode]").first().selectOption("physical");
    await page.locator('[data-combat-action="fire-bolt"]').click();
    await page.locator('.map-token[data-actor="goblin-1"]').click();
    await page.locator("#dialog[open]").waitFor();
    await page.locator('#dialog[open] button[type="submit"]').click(); // «Ho lanciato i dadi»
    await page.locator("#dialog[open] [data-request-open]").first().waitFor();
    await page.locator("#dialog[open] [data-request-open]").first().click();
    const modes = await page
      .locator('#dialog[open] [name="diceMode"] option')
      .evaluateAll((options) => options.map((o) => o.value + ":" + o.textContent));
    check(modes.includes("connected:Dado connesso"), "dice options: " + modes.join(" | "));
    await page.locator('#dialog[open] [name="diceMode"]').selectOption("connected");
    await page.screenshot({ path: shots + "r1-13-connected-option-it-1440.png" });
    await page.locator('#dialog[open] button[type="submit"]').click();
    const simulate = page.locator("[data-dtray-connected-roll]").first();
    await simulate.waitFor();
    await page.screenshot({ path: shots + "r1-14-connected-waiting-it-1440.png" });
    await simulate.click();
    await settleDice();
    await page.locator("#dialog[open] .attempt-result").first().waitFor();
    const attack = (await stored()).combatAttempts.at(-1).requests[0];
    check(attack.status === "resolved", "the attack is recorded: " + attack.status);
    check(attack.mode === "physical", "a connected die is a physical die: " + attack.mode);
    check(
      attack.faceModes?.[0] === "connected",
      "face origin: " + JSON.stringify(attack.faceModes),
    );
    const first = attack.devices?.[0];
    const device = typeof first === "object" && first ? first.it : String(first ?? "");
    check(/Onice/.test(device), "the die names itself: " + JSON.stringify(attack.devices));
    const card = await page.locator("#dialog[open] .attempt-result").first().innerText();
    check(new RegExp(`${attack.values[0]} \\+ 5 = ${attack.total}`).test(card), "card: " + card);
    await page.screenshot({ path: shots + "r1-15-connected-recorded-it-1440.png" });
    passed.push(
      `2. Fire Bolt with physical dice: «Risolvi tiro» offers «Dado connesso»; the die reported ${attack.values[0]}; card «${attack.values[0]} + 5 = ${attack.total}», mode physical, face origin connected (${JSON.stringify(device)})`,
    );
  } catch (error) {
    await page.screenshot({ path: shots + "r1-connected-failure.png" }).catch(() => {});
    await context.close();
    return JSON.stringify({ failedAt: step, error: error.message, passed, errors });
  }
  await context.close();
  return JSON.stringify({ passed, errors });
}
