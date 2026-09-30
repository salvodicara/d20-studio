async (page) => {
  // P1 first use: IN-10 «Prova senza account» (DDB Quickbuilder, Forge sandbox) on its own
  // copy; IN-07 «Primi passi» folded with «Unisciti con un invito»; SV-48 tips (off by default,
  // I-236) turned on from the Table help, with «Non mostrare più» and «Ripristina
  // suggerimenti»; SV-34 the real network drives the header; IN-11 Home install card on
  // iPhone. IT, then EN.
  const out = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P1/";
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const result = {};
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:8879/#home");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("[data-home-page]").waitFor();
  // IN-07: the seeded player has a character and a campaign: first steps fold into one line.
  const fold = page.locator("[data-home-start-folded]");
  check(await fold.count(), "first steps not folded for a known player");
  await fold.locator("summary").click();
  check(
    await fold.getByRole("button", { name: "Unisciti con un invito" }).isVisible(),
    "no join-with-invite action",
  );
  // Owner decision I-236 (3), reconciled 27/09: tips stay off by default and the help is on
  // request; SV-48 keeps them one press away in the help of every page, with «Non mostrare
  // più», the archive and the reset.
  await page.locator('header nav [data-nav="home"]').click();
  await page.goto("http://127.0.0.1:8879/#table");
  await page.locator("#battle-map").waitFor();
  await page.waitForTimeout(400);
  check(
    !(await page.locator(".home-pop, [data-home-pop]").count()),
    "a tip appeared although tips are off by default",
  );
  await page.keyboard.press("F1");
  await page
    .locator("#dialog [data-home-help-tips]")
    .getByRole("button", { name: "Mostra i suggerimenti" })
    .click();
  // Closing the help, the Table's first-occurrence tip appears at once.
  await page.keyboard.press("Escape");
  const tip = page.locator(".home-pop, [data-home-pop]").first();
  await tip.waitFor({ timeout: 5000 });
  result.tip = (await tip.innerText()).slice(0, 80);
  // At the Table the tip is a one-row bar; «Leggi» opens it with all its actions.
  if (await tip.locator("[data-home-pop-more]").isVisible())
    await tip.locator("[data-home-pop-more]").click();
  check(
    await tip.getByRole("button", { name: "Non mostrare più" }).isVisible(),
    "no «Non mostrare più»",
  );
  await page.screenshot({ path: out + "SV-48-table-tip.png" });
  await tip.getByRole("button", { name: "Ho capito" }).click();
  // The Table help keeps the tips' switch, archive and reset.
  await page.keyboard.press("F1");
  const tips = page.locator("#dialog [data-home-help-tips]");
  await tips.waitFor();
  check(
    await tips.getByRole("button", { name: "Ripristina suggerimenti" }).isEnabled(),
    "reset not available",
  );
  await tips.getByRole("button", { name: "Ripristina suggerimenti" }).click();
  check(
    await tips.getByRole("button", { name: "Archivio dei suggerimenti" }).count(),
    "no archive link",
  );
  await page.keyboard.press("Escape");
  // SV-34: the real network.
  const label = () =>
    page
      .locator("header .service-nav button")
      .evaluateAll((buttons) =>
        buttons
          .map((b) => b.getAttribute("aria-label") || "")
          .find((t) => /linea|rete|Riconn/.test(t)),
      );
  await page.context().setOffline(true);
  await page.waitForTimeout(300);
  result.offline = await label();
  check(/Senza rete/.test(result.offline), "offline header: " + result.offline);
  await page.context().setOffline(false);
  await page.waitForTimeout(2200);
  result.online = await label();
  check(/In linea/.test(result.online), "back online header: " + result.online);
  // IN-10: sign out, then try without an account in one click.
  await page.goto("http://127.0.0.1:8879/#account");
  await page.getByRole("button", { name: "Esci", exact: true }).first().click();
  await page.getByRole("heading", { name: "Accedi a d20 Studio" }).waitFor();
  const before = await page.evaluate(() => localStorage.getItem("d20-studio-blueprint-v1"));
  await page.getByRole("button", { name: "Prova senza account" }).click();
  await page.waitForURL(/#campaign/);
  await page.locator("[data-sandbox-banner]").waitFor();
  result.banner = await page.locator("[data-sandbox-banner]").innerText();
  check(
    /Sandbox/.test(result.banner) && /Crea un account per salvare/.test(result.banner),
    "banner",
  );
  check(
    /Le lanterne di Bruma/.test(await page.locator(".campaign-sidebar").innerText()),
    "sample campaign",
  );
  await page.screenshot({ path: out + "IN-10-sandbox-campaign.png" });
  const after = await page.evaluate(() => localStorage.getItem("d20-studio-blueprint-v1"));
  check(before === after, "the signed-out account's data changed");
  await page.getByRole("button", { name: "Chiudi la prova" }).click();
  await page.locator("#dialog").getByRole("button", { name: "Chiudi la prova" }).click();
  await page.waitForURL(/#(home|account)/);
  await page.getByRole("heading", { name: "Accedi a d20 Studio" }).waitFor();
  // Back in: sign in again for the next journeys.
  await page.locator('[data-account-signin="email"]').click();
  // EN: the same controls in English.
  await page.locator("[data-service=preferences]").click();
  await page.locator("#dialog select[name=lang]").selectOption("en");
  await page.locator("#dialog button[type=submit]").click();
  await page.goto("http://127.0.0.1:8879/#home");
  await page.locator("[data-home-page]").waitFor();
  const foldEn = page.locator("[data-home-start-folded]");
  await foldEn.locator("summary").click();
  check(await foldEn.getByRole("button", { name: "Join with an invite" }).count(), "EN join");
  await page.locator("[data-service=preferences]").click();
  await page.locator("#dialog select[name=lang]").selectOption("it");
  await page.locator("#dialog button[type=submit]").click();
  // IN-11 on an iPhone: the Home card shows «Aggiungi a Home» with the steps.
  const phone = await page
    .context()
    .browser()
    .newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
  const mobile = await phone.newPage();
  await mobile.goto("http://127.0.0.1:8879/#home");
  const card = mobile.locator("[data-home-install-card]");
  await card.waitFor();
  await card.getByRole("button", { name: "Aggiungi a Home" }).tap();
  result.iosSteps = (await mobile.locator("#dialog .home-steps").innerText()).slice(0, 120);
  await mobile.screenshot({ path: out + "IN-11-ios-steps.png" });
  const overflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth > innerWidth + 1,
  );
  check(!overflow, "phone Home scrolls sideways");
  await phone.close();
  return JSON.stringify(result);
}
