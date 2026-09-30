async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:8879/#preparation");
  await page.reload();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  const active = page.locator(".campaign-sidebar nav .active");
  if ((await active.count()) !== 1 || (await active.innerText()) !== "Preparazione")
    throw Error("Multiple active campaign sections");
  await page.getByRole("button", { name: "Il cortile dell’osservatorio", exact: true }).click();
  await page.getByRole("textbox", { name: "Nome della scena", exact: true }).waitFor();
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/preparation-desktop.png",
    fullPage: true,
  });
  const mobile = await page
    .context()
    .browser()
    .newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    });
  const phone = await mobile.newPage();
  phone.on("pageerror", (e) => errors.push(e.message));
  await phone.goto("http://127.0.0.1:8879/#table");
  const circle = phone.locator("[data-actor=livia] circle").first();
  const size = await circle.boundingBox();
  if (size.width < 44 || size.height < 44) throw Error("Token touch size below 44px");
  const nameStyle = await phone
    .locator("[data-actor=livia] .token-name")
    .evaluate((e) => getComputedStyle(e).fontSize);
  if (nameStyle !== "13px") throw Error("Token name inherited portrait type size");
  // B61: tools of a toolbar group not in use are hidden (not a target); every visible map
  // control, the zoom group included, keeps 40 px.
  const tools = await phone.locator(".map-tool").evaluateAll((buttons) =>
    buttons
      .filter((b) => b.getClientRects().length)
      .map((b) => ({
        w: b.getBoundingClientRect().width,
        h: b.getBoundingClientRect().height,
      })),
  );
  if (tools.some((b) => b.w < 40 || b.h < 40)) throw Error("Map control below 40px");
  await phone.locator("[data-actor=doran]").tap();
  if (
    !(await phone
      .locator(".table-inspector h2")
      .textContent()
      .then((s) => s === "Doran"))
  )
    throw Error("Touch token selection failed");
  await phone.locator("[data-actor=livia]").tap();
  if (await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    throw Error("Mobile overflow");
  await phone.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/table-mobile.png",
    fullPage: true,
  });
  await mobile.close();
  if (errors.length) throw Error(errors.join(";"));
  return {
    passed: [
      "one current preparation section",
      "mobile tokens at least 44px",
      "map controls at least 40px",
      "touch selection reads correct actor",
      "no mobile overflow",
    ],
    errors,
  };
}
