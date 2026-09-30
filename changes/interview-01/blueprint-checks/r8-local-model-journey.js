async (rootPage) => {
  // R8 SV-46 (delegated simulation; GAP-18 stays open): the assistant's «Modello locale», as
  // Foundry's LLM modules and SillyTavern's API connection: address, model name and «Prova
  // la connessione». A public address is refused with the reason; a LAN address is saved;
  // the test and the answer are simulated and labelled; not one request leaves the local
  // server. IT desktop 1440 and EN phone 390 by touch. Synthetic data; resets demo state.
  const base = "http://127.0.0.1:8879/";
  const shots =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R8/images/";
  const browser = rootPage.context().browser();
  const passed = [];
  const errors = [];
  const outside = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  // Round-2 regression (29/09/2026): the app's pass-through service worker (P1 IN-11) would
  // answer fetches before context.route sees them; blocked so the guard below is whole.
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "it-IT",
    serviceWorkers: "block",
  });
  // Every request outside the local server is recorded and refused.
  await context.route(
    (url) => !url.href.startsWith(base) && !/^(blob|data):/.test(url.href),
    (route) => {
      outside.push(route.request().url());
      return route.abort();
    },
  );
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const role = async (value) => {
    await page.locator("#demo-role").selectOption(value);
    await page.waitForFunction((v) => document.querySelector("#demo-role").value === v, value);
    await page.waitForTimeout(150);
  };
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await role("dm");
  // The DM turns the assistant on (its own consent flow).
  await page.goto(base + "#campaign?tab=assistant&id=consent");
  const enable = page.locator(
    '[data-assistant-act="enable"], [data-assistant-act="enable-confirm"]',
  );
  if (await enable.count()) {
    await enable.first().click();
    const confirm = page.locator('#dialog[open] button[type="submit"]');
    if (await confirm.count()) await confirm.click();
  }
  await page.waitForTimeout(200);
  // The palette finds the panel by «ollama».
  const mod = await page.evaluate(() => (/Mac/.test(navigator.platform) ? "Meta" : "Control"));
  await page.keyboard.press(`${mod}+k`);
  await page.locator("#dialog [data-cmdk-input]").fill("ollama");
  await page.waitForTimeout(150);
  check(
    /Collega un modello locale/.test(await page.locator("#dialog [data-cmdk-list]").innerText()),
    "palette does not find the local model",
  );
  await page.keyboard.press("Enter");
  await page.locator('[data-assistant-engine][value="local"]').check();
  await page.locator("[data-assistant-local]").waitFor();
  const testButton = page.locator('[data-assistant-act="test-local"]');
  check(await testButton.isDisabled(), "test enabled before saving");
  check(
    /Serve un indirizzo salvato/.test(await page.locator("#assistant-local-why").innerText()),
    "no reason next to the disabled test",
  );
  // A public address: refused with the reason, nothing saved.
  await page.locator("[data-assistant-local-endpoint]").fill("https://api.example.com/v1");
  await page.locator("[data-assistant-local-model]").fill("llama3.1");
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await page.waitForTimeout(200);
  check(
    /non è un indirizzo di questo computer/.test(await page.locator("#content").innerText()),
    "public address not refused",
  );
  check(
    (await page.locator("[data-assistant-local-endpoint]").inputValue()) ===
      "https://api.example.com/v1",
    "typed address lost",
  );
  await page.screenshot({ path: shots + "r8-local-model-refused-it.png" });
  // A home-network address is saved and «tested» without any request.
  await page.locator("[data-assistant-local-endpoint]").fill("http://192.168.1.20:11434");
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await page.waitForTimeout(200);
  await page.locator('[data-assistant-act="test-local"]').click();
  await page
    .locator("[data-assistant-local-test]", { hasText: "Prova simulata riuscita" })
    .waitFor();
  await page.screenshot({ path: shots + "r8-local-model-tested-it.png" });
  passed.push(
    "«ollama» in the palette opens the panel; a public address is refused with its reason; 192.168.1.20:11434 is saved and the simulated test says no request left the browser",
  );
  // Ask: the answer is labelled as the local model's simulated answer.
  await page.goto(base + "#campaign?tab=assistant");
  await page.locator("[data-assistant-question]").fill("Chi è Oben?");
  await page.locator('[data-assistant-form="ask"] button[type="submit"]').click();
  await page.locator("[data-assistant-local-label]").first().waitFor();
  check(
    /Risposta simulata del modello locale «llama3\.1»/.test(
      await page.locator("[data-assistant-local-label]").first().innerText(),
    ),
    "answer not labelled",
  );
  await page.screenshot({ path: shots + "r8-local-model-answer-it.png" });
  passed.push("The answer carries «Risposta simulata del modello locale «llama3.1»»");
  // EN phone 390 by touch.
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator('.service-nav [data-service="preferences"], [data-service="preferences"]')
    .first()
    .evaluate((el) => el.click());
  await page.locator("#dialog [name=lang]").selectOption("en");
  await page
    .locator("#dialog")
    .getByRole("button", { name: "Salva preferenze", exact: true })
    .click();
  await page.waitForTimeout(250);
  await page.goto(base + "#campaign?tab=assistant&id=consent");
  await page.locator("[data-assistant-local]").waitFor();
  check(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    "phone overflow on the local model panel",
  );
  const box = await page.locator('[data-assistant-act="test-local"]').boundingBox();
  check(box.height >= 40, "test button smaller than 40 px");
  await page
    .locator("[data-assistant-local]")
    .screenshot({ path: shots + "r8-local-model-phone-en.png" });
  passed.push("EN phone 390: the panel fits, «Test the connection» ≥ 40 px");
  await context.close();
  check(!outside.length, "requests left the local server: " + outside.join(", "));
  check(!errors.length, "page errors: " + errors.join(" | "));
  return JSON.stringify({ passed, outside: outside.length });
}
