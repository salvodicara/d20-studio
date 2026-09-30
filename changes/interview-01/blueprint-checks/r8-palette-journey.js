async (page) => {
  // R8 H-07 (part): the palette matcher. «costruttore di incontri» finds «Apri il costruttore
  // d’incontri» (elided preposition ↔ full form); «invita» shows «Invita giocatori» first and
  // a typo match («Invia Stop anonimo») only in a last «Forse cercavi» group (Google «Did you
  // mean», Algolia typo ranking). IT and EN, desktop and phone 390 (opened with the shortcut).
  const base = "http://127.0.0.1:8879/";
  const shots =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R8/images/";
  const passed = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const mod = await page.evaluate(() => (/Mac/.test(navigator.platform) ? "Meta" : "Control"));
  const open = async () => {
    await page.keyboard.press(`${mod}+k`);
    await page.locator("#dialog [data-cmdk-input]").waitFor();
  };
  const search = async (text) => {
    await page.locator("#dialog [data-cmdk-input]").fill(text);
    await page.waitForTimeout(150);
    return page.locator("#dialog [data-cmdk-list] [data-cmdk-option]").allInnerTexts();
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("#demo-role").selectOption("dm");
  await page.waitForTimeout(150);
  await page.goto(base + "#campaign?tab=overview");
  await open();
  const builder = await search("costruttore di incontri");
  check(
    /costruttore d’incontri/i.test(builder[0] ?? ""),
    "first result is not the builder: " + builder.slice(0, 3).join(" | "),
  );
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  check(page.url().includes("preparation"), "Enter did not open the builder: " + page.url());
  passed.push("«costruttore di incontri» → «Apri il costruttore d’incontri» first; Enter opens it");
  await open();
  const invite = await search("invita");
  check(
    /Invita giocatori/.test(invite[0] ?? ""),
    "first result is not «Invita giocatori»: " + invite.slice(0, 3).join(" | "),
  );
  check(
    !/Invia Stop anonimo/.test(invite[1] ?? ""),
    "the typo sits right after «Invita giocatori»",
  );
  const groups = await page.locator("#dialog .cmdk-group").allInnerTexts();
  if (invite.some((row) => /Invia Stop anonimo/.test(row)))
    check(
      groups.at(-1).toLowerCase() === "forse cercavi",
      "the typo is not in the last «Forse cercavi» group: " + groups.join(", "),
    );
  await page.locator("#dialog").screenshot({ path: shots + "r8-palette-invita-it.png" });
  passed.push(
    "«invita» → «Invita giocatori» first; «Invia Stop anonimo» only under «Forse cercavi»: " +
      groups.join(" / "),
  );
  await page.keyboard.press("Escape");
  // EN.
  await page.locator('.service-nav [data-service="preferences"]').click();
  await page.locator("#dialog [name=lang]").selectOption("en");
  await page
    .locator("#dialog")
    .getByRole("button", { name: "Salva preferenze", exact: true })
    .click();
  await page.waitForTimeout(250);
  await open();
  const en = await search("encounter builder");
  check(
    /encounter builder/i.test(en[0] ?? ""),
    "EN builder not first: " + en.slice(0, 3).join(" | "),
  );
  await page.keyboard.press("Escape");
  passed.push("EN: «encounter builder» first");
  // Phone 390: the same order and no overflow.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "#campaign?tab=overview");
  await page.waitForTimeout(200);
  await open();
  const phone = await search("invita");
  check(
    /Invite players|Invita giocatori/.test(phone[0] ?? ""),
    "phone: first result wrong: " + phone[0],
  );
  check(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    "phone overflow",
  );
  await page.screenshot({ path: shots + "r8-palette-phone.png" });
  await page.keyboard.press("Escape");
  passed.push("Phone 390: same order, no overflow");
  await page.setViewportSize({ width: 1440, height: 900 });
  check(!errors.length, "page errors: " + errors.join(" | "));
  return JSON.stringify({ passed });
}
