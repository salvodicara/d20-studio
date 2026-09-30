async (page) => {
  // P9 services and writing tools (SV-22, SV-38, SV-41, SV-04, CA-16, CA-17): tooltip
  // delay and touch tooltips, Discord and API token reachable in few steps without census
  // IDs, quick create of Library content, cut-to-new-entry and templates.
  const shots = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P9/";
  const passed = [], errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = (value, message) => { if (!value) throw Error(message); };
  const button = (name, root = page) => root.getByRole("button", { name, exact: true });
  const field = (path) => page.locator('#content [data-campaign-path="' + path + '"]');
  const heading = (name) => page.getByRole("heading", { name, exact: true, level: 1 }).waitFor();
  const as = async (role) => { await page.locator("#demo-role").selectOption(role); await page.waitForTimeout(150); };
  const mod = await page.evaluate(() => (/Mac|iPhone|iPad/.test(navigator.platform) ? "Meta" : "Control"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:8879/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // SV-22: a tooltip delay in Preferences; a styled tooltip after that delay.
  await page.locator('.service-nav [data-service="preferences"]').click();
  const delay = page.locator('#dialog [name="setting:preferences-access.tooltip-delay"]');
  check(await delay.count(), "Tooltip delay preference missing");
  await delay.selectOption({ label: "Subito" });
  await page.locator("#dialog").getByRole("button", { name: "Salva preferenze", exact: true }).click();
  await page.waitForTimeout(200);
  await page.locator('.service-nav [data-service="requests"]').hover();
  await page.waitForTimeout(120);
  const tip = page.locator(".ui-tip");
  check(await tip.isVisible(), "No styled tooltip on hover");
  check((await tip.innerText()).length > 3, "Empty tooltip");
  await page.mouse.move(700, 600);
  await page.waitForTimeout(100);
  check(!(await tip.isVisible()), "Tooltip did not hide");
  check(await page.locator('.service-nav [data-service="requests"]').getAttribute("title"), "Title not given back");
  passed.push("Preferences › «Ritardo dei suggerimenti»; the styled tooltip follows it and gives the title back");

  // SV-38 and SV-41 as the DM: Discord from the palette; no census IDs; token in two steps.
  await as("dm");
  await page.goto("http://127.0.0.1:8879/#campaign?tab=overview");
  await page.keyboard.press(`${mod}+k`);
  await page.locator("#dialog [data-cmdk-input]").fill("discord");
  await page.waitForTimeout(150);
  await page.locator("#dialog [data-cmdk-option]").filter({ hasText: "Discord: inoltra tiri" }).first().click();
  await heading("Integrazioni");
  const pageText = await page.locator("#content").innerText();
  check(!/\b(?:SVC|VTL|FVT|GAP|CMP|DDB)-\d/.test(pageText), "Census IDs still visible: " + pageText.match(/\b(?:SVC|VTL|FVT|GAP|CMP|DDB)-\d+/)?.[0]);
  check(pageText.includes("Inoltro a Discord"), "Palette did not open the Discord part");
  await button("API e webhook").click();
  await button("Crea token").click();
  await page.locator("#dialog").getByRole("button", { name: "Accendi e crea il token", exact: true }).click();
  await page.locator("#dialog [data-int-secret]").waitFor();
  check((await page.locator("#dialog [data-int-secret]").inputValue()).startsWith("d20_pat_"), "Token not shown");
  await page.locator("#dialog").screenshot({ path: shots + "v01-api-token.png" });
  await page.keyboard.press("Escape");
  passed.push("Discord opens from the palette; no census IDs; an API token in two steps (tab, «Crea token») plus the module confirm");

  // SV-04: quick create of Library content opens its editor with the title.
  await page.goto("http://127.0.0.1:8879/#campaign?tab=overview");
  await page.keyboard.press("n");
  await page.locator("#dialog [data-cmdk-create-form]").getByText("Oggetto", { exact: true }).click();
  await page.locator("#dialog [name=title]").fill("Lanterna del faro");
  await page.locator("#dialog").getByRole("button", { name: "Crea", exact: true }).click();
  await page.waitForFunction(() => location.hash.startsWith("#homebrew-editor"));
  await page.waitForTimeout(300);
  const nameValue = await page.evaluate(() => [...document.querySelectorAll("#content input")].map((i) => i.value).join(" | "));
  check(nameValue.includes("Lanterna del faro"), "Homebrew editor lacks the title: " + nameValue.slice(0, 200));
  passed.push("Quick create «Oggetto» opens the homebrew editor with the name written");

  // CA-16: move the selection to a new entry.
  await page.goto("http://127.0.0.1:8879/#campaign?tab=world");
  await button("Nuova voce del mondo").click();
  await field("data.title").fill("Porto di Bruma");
  await field("data.body").fill("Il porto è affollato.\nLa taverna del Gabbiano serve zuppa di pesce.");
  await field("data.body").evaluate((el) => { const at = el.value.indexOf("La taverna"); el.setSelectionRange(at, el.value.length); });
  await button("Sposta la selezione in una nuova voce").first().click();
  await page.locator("#dialog [name=title]").fill("Taverna del Gabbiano");
  await page.locator("#dialog [name=worldType]").selectOption("place");
  await page.locator("#dialog").getByRole("button", { name: "Crea e collega", exact: true }).click();
  await page.waitForTimeout(200);
  check((await field("data.body").inputValue()).includes("[[Taverna del Gabbiano]]"), "Selection not replaced by a link: " + (await field("data.body").inputValue()));
  passed.push("«Sposta la selezione in una nuova voce» creates the entry and leaves [[Taverna del Gabbiano]]");

  // CA-17: a kit's fields, then «Salva come modello» and «Da un modello…».
  await page.locator("#content [data-campaign-template-choice]").selectOption({ label: "Taverna · kit" });
  await button("Aggiungi i suoi campi").click();
  await page.waitForTimeout(150);
  check((await field("data.body").inputValue()).includes("Oste: "), "Kit fields not added");
  await page.locator('#content [data-campaign-access-mode="access"]').selectOption("campaign");
  await button("Salva contenuto per questi destinatari").click();
  await heading("Porto di Bruma");
  await page.locator("#content .campaign-more > summary").click();
  await button("Salva come modello").click();
  await page.locator("#dialog [name=name]").fill("Porto con taverna");
  await page.locator("#dialog").getByRole("button", { name: "Salva modello", exact: true }).click();
  await page.goto("http://127.0.0.1:8879/#campaign?tab=world");
  await page.getByText("Scegli il tipo…", { exact: true }).click();
  await button("Da un modello o kit…").click();
  await page.locator("#dialog [name=template]").selectOption({ label: "Porto con taverna" });
  await page.locator("#dialog").getByRole("button", { name: "Usa il modello", exact: true }).click();
  await page.waitForTimeout(200);
  check((await field("data.body").inputValue()).includes("Oste: "), "Template fields missing in the new entry");
  check((await page.locator("#content").innerText()).includes("Segreti"), "Kit's DM-only fields did not become a secret section");
  passed.push("Kits in Mondo; «Salva come modello»; «Da un modello o kit…» starts an entry with its fields and secret section");

  // Phone: the tooltip shows by long press.
  const context = await page.context().browser().newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phone = await context.newPage();
  await phone.goto("http://127.0.0.1:8879/#home");
  await phone.locator('.service-nav [data-service="requests"]').waitFor();
  const box = await phone.locator('.service-nav [data-service="requests"]').boundingBox();
  const cdp = await context.newCDPSession(phone);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
  await phone.waitForTimeout(700);
  const shown = await phone.locator(".ui-tip").isVisible();
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  check(shown, "No tooltip on long press");
  await phone.screenshot({ path: shots + "v02-tooltip-long-press.png" });
  await context.close();
  passed.push("By touch a long press shows the tooltip");
  check(errors.length === 0, "Runtime errors: " + errors.join("; "));
  return { passed, errors };
}
