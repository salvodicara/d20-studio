async (rootPage) => {
  // Increment 10, journey (e): isolated 390x844 English touch context. Conditions summary on
  // sheet and Table, dialog add/preview/apply, Exhaustion stepper, Close without applying,
  // death-save pips at 0 HP; tap targets, no horizontal overflow, no page/window errors.
  for (const prior of rootPage.context().browser().contexts())
    if (prior !== rootPage.context()) await prior.close();
  const context = await rootPage
    .context()
    .browser()
    .newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(),
    passed = [],
    findings = [],
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.testWindowErrors = [];
    addEventListener("error", (e) => window.testWindowErrors.push(e.message));
  });
  const dir =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/inc10-closure/";
  const check = (c, m) => {
    if (!c) throw Error(m);
  };
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const field = (k) => page.locator("#dialog [data-conditions-field=" + k + "]");
  const close = () => page.locator("#dialog footer [data-close]").tap();
  const overflow = () =>
    page.evaluate(() => {
      const d = document.querySelector("#dialog");
      return {
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        dialog: d.open ? d.scrollWidth - d.clientWidth : 0,
        wide: [...document.querySelectorAll("#dialog[open] *")]
          .filter((n) => n.getBoundingClientRect().right > innerWidth + 1)
          .map((n) => n.tagName + "." + n.className)
          .slice(0, 5),
      };
    });
  const small = (sel) =>
    page.locator(sel).evaluateAll((n) =>
      n
        .filter((b) => b.offsetParent)
        .map((b) => [
          b.textContent.trim() || b.getAttribute("aria-label"),
          Math.round(b.getBoundingClientRect().height),
          Math.round(b.getBoundingClientRect().width),
        ])
        .filter(([, h, w]) => h < 44 || w < 44),
    );
  await page.goto("http://127.0.0.1:8879/#characters?id=livia");
  await page.locator('[data-service="reset"]').tap();
  await page.locator('#dialog button[type="submit"]').tap();
  await page.locator('[data-service="preferences"]').tap();
  await page.locator('#dialog [name="lang"]').selectOption("en");
  await page.locator('#dialog button[type="submit"]').tap();
  await page.goto("http://127.0.0.1:8879/#characters?id=livia");
  const summary = page.locator("#content [data-conditions-summary=livia]");
  await summary.waitFor();
  check(
    (await summary.innerText()).includes("No conditions") &&
      (await summary.innerText()).includes("Conscious"),
    "English summary missing",
  );
  // Open the dialog by touch; add Poisoned with a turn-end term.
  await summary.locator("[data-conditions-entry=livia]").tap();
  await page
    .getByRole("dialog")
    .getByRole("heading", { name: "Conditions and status", exact: true })
    .waitFor();
  let o = await overflow();
  check(o.page <= 1 && o.dialog <= 1, "overflow on open: " + JSON.stringify(o));
  const cmdSmall = await small("#dialog [data-conditions-command]");
  check(
    cmdSmall.every(([, h, w]) => h >= 40 && w >= 40),
    "command targets below 40 px: " + JSON.stringify(cmdSmall),
  );
  if (cmdSmall.length) findings.push("command targets under 44 px: " + JSON.stringify(cmdSmall));
  await page.locator("[data-conditions-command=add]").tap();
  await field("search").fill("pois");
  await page.locator("[data-conditions-definition=poisoned]").tap();
  await field("originLabel").fill("Poisoned blade");
  await field("termKind").selectOption("turn");
  await field("termPhase").selectOption("end");
  const before = JSON.stringify(await saved());
  await page.locator("[data-conditions-preview]").tap();
  check(JSON.stringify(await saved()) === before, "preview mutated state");
  check(
    (await page.locator("#dialog").innerText()).includes("Not active → Active"),
    "English preview rows missing",
  );
  o = await overflow();
  check(o.page <= 1 && o.dialog <= 1, "overflow with preview: " + JSON.stringify(o));
  const applyBox = await page.locator("[data-conditions-apply]").boundingBox();
  check(applyBox && applyBox.height >= 40, "Apply target too small");
  await page.locator("[data-conditions-apply]").scrollIntoViewIfNeeded();
  await page.screenshot({ path: dir + "conditions-e-mobile-preview.png" });
  await page.locator("[data-conditions-apply]").tap();
  let a = (await saved()).actors.livia;
  check(
    a.conditions.some(
      (c) => c.id === "poisoned" && c.origin.label === "Poisoned blade" && c.term.phase === "end",
    ),
    "touch Apply did not add Poisoned",
  );
  check(
    (await page.locator("#dialog").innerText()).includes("End of Livia’s next turn") ||
      (await page.locator("#dialog").innerText()).includes("next turn"),
    "English term text missing",
  );
  passed.push(
    "390 px EN: tap entry → add Poisoned with end-of-turn term, preview without mutation, Apply; no overflow",
  );
  // Exhaustion by touch, then Close with an unsaved draft changes nothing.
  await page.locator("[data-conditions-command=exhaustion]").tap();
  await page.locator('[data-conditions-step="1"]').tap();
  check((await field("level").inputValue()) === "1", "touch stepper did not reach 1");
  const stepSmall = await small("#dialog [data-conditions-step]");
  check(
    stepSmall.every(([, h, w]) => h >= 40 && w >= 40),
    "stepper targets below 40 px: " + JSON.stringify(stepSmall),
  );
  await field("reason").fill("Forced march");
  await page.locator("[data-conditions-preview]").tap();
  await page.locator("[data-conditions-apply]").tap();
  check((await saved()).actors.livia.exhaustion === 1, "touch Exhaustion not applied");
  await page.locator("[data-conditions-command=add]").tap();
  await page.locator("[data-conditions-definition=prone]").tap();
  await field("originLabel").fill("Draft to discard");
  const stable = JSON.stringify(await saved());
  await close();
  check(JSON.stringify(await saved()) === stable, "Close applied a draft");
  check(
    (await summary.locator("[data-conditions-chip=poisoned]").count()) === 1 &&
      (await summary.locator("[data-conditions-chip=exhaustion]").innerText()).includes("1"),
    "sheet chips missing after touch commands",
  );
  o = await overflow();
  check(o.page <= 1, "sheet overflow: " + JSON.stringify(o));
  await page.screenshot({ path: dir + "conditions-e-mobile-sheet.png" });
  passed.push(
    "touch stepper Exhaustion 1 applied; Close with a Prone draft changes nothing; chips Poisoned and Exhaustion 1 on the sheet",
  );
  // Table on the phone: same chips; damage to 0 HP shows death-save pips in the summary.
  await page.goto("http://127.0.0.1:8879/#table");
  const inspector = page.locator("#content [data-conditions-summary=livia]");
  await inspector.scrollIntoViewIfNeeded();
  check(
    (await inspector.locator("[data-conditions-chip=poisoned]").count()) === 1,
    "Table inspector lacks the chip on phone",
  );
  await inspector.locator("[data-conditions-entry=livia]").tap();
  // Refreshed by the hand-off writer (29/09/2026): P3 PG-22 (Roll20 / D&D Beyond, one HP
  // control): the panel's «Hit points…» opens the HP widget (cause, amount, «Damage» at once);
  // the panel reopens on the dying creature's death saves.
  await page.locator("[data-conditions-command=hp]").tap();
  await page.locator("#dialog [data-dt-amount]").waitFor();
  await page.locator("#dialog [data-dt-note]").fill("Mace blow");
  await page.locator("#dialog [data-dt-amount]").fill("18");
  o = await overflow();
  check(o.page <= 1 && o.dialog <= 1, "overflow in the HP widget: " + JSON.stringify(o));
  await page.locator("#dialog [data-dt-damage]").tap();
  await page.waitForTimeout(200);
  check((await saved()).actors.livia.hp === 0, "touch damage not applied");
  await close();
  await inspector.locator("[data-conditions-entry=livia]").tap();
  await page.locator("#dialog [data-conditions-panel]").waitFor();
  const dialogText = await page.locator("#dialog").innerText();
  check(
    /Successes 0\/3/.test(dialogText) && /Failures 0\/3/.test(dialogText),
    "death save counts missing in dialog",
  );
  await page
    .locator("#dialog [data-conditions-panel]")
    .screenshot({ path: dir + "conditions-e-mobile-dying.png" });
  await close();
  check((await inspector.innerText()).includes("Dying"), "Table summary not Dying");
  o = await overflow();
  check(o.page <= 1, "Table overflow: " + JSON.stringify(o));
  await inspector.screenshot({ path: dir + "conditions-e-mobile-table-summary.png" });
  passed.push(
    "Table on phone: inspector chip, touch damage 18 → 0 HP, Dying with 0/3 pips, no overflow",
  );
  const windowErrors = await page.evaluate(() => window.testWindowErrors);
  check(
    errors.length === 0 && windowErrors.length === 0,
    "errors: " + errors.concat(windowErrors).join("; "),
  );
  await context.close();
  return { passed, findings, errors };
}
