async (rootPage) => {
  // R8 H-05 (BG3 content toggles): a World entry the DM marks with «Ragni» (R7's «Marca una
  // voce») is veiled with «Mostra» for a player whose personal filter blurs spiders; the DM
  // and an unfiltered viewer read it as it is; «Mostra» reveals it for this visit. IT and EN,
  // desktop 1440 and phone 390 by touch. Synthetic data; resets this browser's demo state.
  const base = "http://127.0.0.1:8879/";
  const shots =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R8/images/";
  const browser = rootPage.context().browser();
  const passed = [];
  const errors = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "it-IT",
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const role = async (value, p = page) => {
    await p.locator("#demo-role").selectOption(value);
    await p.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await p.waitForTimeout(150);
  };
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await role("dm");
  // The DM writes a World entry for the whole group.
  await page.goto(base + "#campaign?tab=world");
  await page.getByRole("button", { name: "Nuova voce del mondo", exact: true }).click();
  await page.locator('[data-campaign-path="data.title"]').fill("Il nido sotto il ponte");
  await page
    .locator('[data-campaign-path="data.body"]')
    .fill("Ragni grandi come cani tessono tra le travi del ponte.");
  const audience = page.locator("[data-campaign-access-mode=access]");
  if (await audience.count()) await audience.selectOption("campaign");
  await page.locator("[data-campaign-apply]").click();
  await page.getByRole("button", { name: "Modifica", exact: true }).waitFor();
  const entryUrl = page.url();
  // The DM marks its topic in Safety (R7's «Marca una voce»).
  await page.goto(base + "#campaign?tab=safety");
  await page.locator('[data-safety-dialog="mark-entry"]').first().click();
  await page
    .locator("#dialog[open] select[name=target]")
    .selectOption({ label: "Il nido sotto il ponte" });
  await page.locator('#dialog[open] input[name=topics][value="spiders"]').check();
  await page.locator('#dialog[open] button[type="submit"]').click();
  await page.waitForFunction(() => !document.querySelector("#dialog")?.open);
  passed.push("DM: new World entry for the group, marked «Ragni» from Sicurezza › Marca una voce");
  // The DM (no filter) reads it as it is.
  await page.goto(entryUrl);
  await page.locator(".campaign-prose").first().waitFor();
  check(
    !(await page.locator(".safety-content.is-veiled").count()),
    "the DM sees a veil without a filter",
  );
  // The player turns on the filter for spiders.
  await role("player");
  await page.goto(base + "#safety-profile");
  await page.locator('[data-safety-filter="enabled"]').check();
  await page.waitForTimeout(200);
  await page.locator('[data-safety-filter="extra"][value="spiders"]').check();
  await page.waitForTimeout(200);
  await page.goto(entryUrl);
  const veil = page.locator(".safety-content.is-veiled");
  await veil.waitFor();
  const cover = await page.locator(".safety-content-cover").innerText();
  check(/Sfumata dal tuo filtro/.test(cover) && /Ragni/.test(cover), "cover text: " + cover);
  check(
    !(await page.locator(".safety-content-body").isVisible()) ||
      (await page.locator(".safety-content-body").getAttribute("aria-hidden")) === "true",
    "the body is not hidden",
  );
  await page.screenshot({ path: shots + "r8-filter-veiled-it.png" });
  // The World list does not give the text away either.
  await page.goto(base + "#campaign?tab=world");
  const list = await page.locator("#content").innerText();
  check(/Sfumata dal tuo filtro · Ragni/.test(list), "list excerpt is not veiled");
  check(!/tessono tra le travi/.test(list), "list excerpt leaks the text");
  // «Mostra» reveals it for this visit.
  await page.goto(entryUrl);
  await page.getByRole("button", { name: "Mostra", exact: true }).click();
  await page.waitForTimeout(200);
  check(!(await page.locator(".safety-content.is-veiled").count()), "Mostra did not reveal");
  check(
    /tessono tra le travi/.test(await page.locator("#content").innerText()),
    "text not shown after Mostra",
  );
  passed.push(
    "Player with «Ragni» filtered: the entry and its list excerpt are blurred with «Mostra»; Mostra reveals it; the DM reads it as it is",
  );
  // EN phone 390 by touch: a fresh visit veils it again.
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const mobile = await phone.newPage();
  mobile.on("pageerror", (error) => errors.push("phone: " + error.message));
  const stored = await page.evaluate(() =>
    JSON.stringify(Object.fromEntries(Object.entries(localStorage))),
  );
  await mobile.goto(base);
  await mobile.evaluate((values) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(JSON.parse(values))) localStorage.setItem(k, v);
  }, stored);
  await mobile.reload();
  await role("player", mobile);
  await mobile
    .locator('.service-nav [data-service="preferences"], [data-service="preferences"]')
    .first()
    .evaluate((el) => el.click());
  await mobile.locator("#dialog [name=lang]").selectOption("en");
  await mobile
    .locator("#dialog")
    .getByRole("button", { name: "Salva preferenze", exact: true })
    .tap();
  await mobile.waitForTimeout(250);
  await mobile.goto(entryUrl);
  await mobile.locator(".safety-content.is-veiled").waitFor();
  const coverEn = await mobile.locator(".safety-content-cover").innerText();
  check(/Blurred by your filter/.test(coverEn) && /Spiders/.test(coverEn), "EN cover: " + coverEn);
  check(
    await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    "phone overflow",
  );
  const show = mobile.getByRole("button", { name: "Show", exact: true });
  check((await show.boundingBox()).height >= 40, "Show is smaller than 40 px");
  await mobile.screenshot({ path: shots + "r8-filter-veiled-en-phone.png" });
  await show.tap();
  await mobile.waitForTimeout(200);
  check(
    !(await mobile.locator(".safety-content.is-veiled").count()),
    "Show did not reveal on the phone",
  );
  passed.push(
    "EN phone 390 by touch: «Blurred by your filter · Spiders», «Show» ≥ 40 px reveals it",
  );
  await phone.close();
  await context.close();
  check(!errors.length, "page errors: " + errors.join(" | "));
  return JSON.stringify({ passed });
}
