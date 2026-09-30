async (rootPage) => {
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const context = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const check = (v, m) => {
    if (!v) throw Error(m);
  };
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  await page.route("**/*.mjs", (route) => route.continue());
  await page.goto("http://127.0.0.1:8879/#characters?id=livia");
  await page.locator("#demo-role").selectOption("dm");
  await page.locator("[data-character-action=rest]").click();
  await page.locator("[data-rest-preview-start]").click();
  await page.locator("[data-rest-start]").click();
  await page.locator("[data-rest-time]").click();
  await page.locator("[data-rest-time-value]").fill("60");
  await page.locator("[data-rest-preview-time]").click();
  await page.locator("[data-rest-apply]").click();
  await page.locator("#dialog [data-close]").first().click();
  await page.locator("[data-character-action=rest]").click();
  await page.locator("[data-rest-complete=livia]").click();
  await page.locator("[data-rest-apply]").click();
  await page.locator("[data-rest-dice-mode=livia]").selectOption("physical");
  await page.locator("[data-rest-hit-die=livia]").click();
  await page.locator("[data-rest-face]").fill("3");
  await page.locator("[data-rest-resolve]").click();
  for (let i = 0; i < 5; i++) await page.locator("[data-rest-undo]").click();
  let s = await saved();
  check(
    s.restTime.rests.length === 0 &&
      s.restTime.rolls[0].status === "reversed" &&
      s.restTime.rolls[0].acceptedFace === 3,
    "Five Undo operations lost known result",
  );
  await page.locator("#dialog [data-close]").first().click();
  await page.reload();
  await page.locator("#demo-role").selectOption("dm");
  await page.locator("[data-character-action=rest]").click();
  const text = await page.locator("#dialog").innerText();
  check(
    text.includes("Spesa annullata") && text.includes("3"),
    "Reopened setup hides orphan reversed evidence",
  );
  check(
    (await page.locator("[data-rest-resolve]").count()) === 0,
    "Reversed roll can be applied from history",
  );
  check(errors.length === 0, errors.join("; "));
  await context.close();
  return {
    passed: [
      "Five real Undo actions remove rest but preserve and expose reversed die after reload without an apply command",
    ],
    errors,
  };
}
