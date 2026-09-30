async (page) => {
  // P1 CA-10 (Foundry / LegendKeeper conflict detection, DDB editing lock): two tabs on the
  // same campaign entry. Tab 2 saves «VERSIONE B»; tab 1, still editing, is told at once and
  // its save opens compare and resume instead of overwriting; Cronologia keeps both.
  // R8 refresh (27/09): «Nuova voce del mondo» (P9 CA-19) and the one-save flow («Salva»
  // saves and applies, SV-05); R8 CA-10: «Modifica» with a pending draft of the same person
  // asks «Riprendi la bozza» / «Nuova bozza» (Google Docs / Notion draft resume): tab 2 picks
  // «Nuova bozza», and a draft left unapplied is resumed with its text.
  const out =
    "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/fix2-R8/images/";
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const base = "http://127.0.0.1:8879/";
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base + "#home");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("[data-home-page]").waitFor();
  const asDm = async (p) => {
    await p.locator("#demo-role").selectOption("dm");
    await p.waitForTimeout(200);
  };
  await asDm(page);
  // A world entry shared with the DMs.
  await page.goto(base + "#campaign?tab=world");
  await page.getByRole("button", { name: "Nuova voce del mondo", exact: true }).click();
  await page.locator('[data-campaign-path="data.title"]').fill("Porto vecchio");
  await page.locator('[data-campaign-path="data.body"]').fill("ORIGINALE");
  await page.locator("[data-campaign-access-mode=access]").selectOption("dms");
  await page.locator("[data-campaign-apply]").click();
  await page.getByRole("button", { name: "Modifica" }).waitFor();
  const entryUrl = page.url();
  // Tab 1 starts editing.
  await page.getByRole("button", { name: "Modifica" }).click();
  await page.locator('[data-campaign-path="data.body"]').fill("VERSIONE A");
  // Tab 2 edits the same entry and saves first.
  const tab2 = await page.context().newPage();
  await tab2.setViewportSize({ width: 1440, height: 900 });
  await tab2.goto(entryUrl);
  await tab2.locator("#demo-role").waitFor();
  await asDm(tab2);
  await tab2.goto(entryUrl);
  await tab2.getByRole("button", { name: "Modifica", exact: true }).click();
  // CA-10: tab 1's draft is this person's pending draft: tab 2 is asked, and starts its own.
  await tab2.locator("#dialog[open]").getByRole("button", { name: "Riprendi la bozza" }).waitFor();
  check(
    /Hai già una bozza di questa voce/.test(await tab2.locator("#dialog[open]").innerText()),
    "no resume question in tab 2",
  );
  await tab2.screenshot({ path: out + "CA-10-resume-or-new.png" });
  await tab2.locator("#dialog[open] [data-campaign-new-draft]").click();
  await tab2.locator('[data-campaign-path="data.body"]').fill("VERSIONE B");
  await tab2.locator("[data-campaign-apply]").click();
  await tab2.getByRole("button", { name: "Modifica" }).waitFor();
  // Tab 1 hears about it and keeps its text.
  await page.bringToFront();
  await page.waitForTimeout(400);
  const kept = await page.locator('[data-campaign-path="data.body"]').inputValue();
  check(kept === "VERSIONE A", "tab 1 lost its typed text: " + kept);
  // One save: if the autosave already met B, «Salva» is disabled with the conflict reason;
  // otherwise pressing it meets B now. Either way nothing overwrites B.
  // Visual regression (30/09/2026): under load tab 1 can hear about B between this check and
  // the click, and «Salva» turns disabled (the intended conflict): the click then gives up
  // after 2 s instead of waiting 30 s for a button that stays disabled (1 run in 9).
  if (await page.locator("[data-campaign-apply]").isEnabled())
    await page
      .locator("[data-campaign-apply]")
      .click({ timeout: 2000 })
      .catch(() => {});
  await page.waitForTimeout(300);
  const text = await page.locator("#content").innerText();
  // P9 SV-37 words the same conflict as cause and remedy next to «Salva».
  check(
    /confronta e riprendi|Qualcuno ha cambiato la voce mentre scrivevi/i.test(text),
    "no compare/rebase alert: " + text.slice(0, 400),
  );
  check(await page.locator("[data-campaign-apply]").isDisabled(), "a stale save could overwrite B");
  await page.screenshot({ path: out + "CA-10-conflict-alert.png" });
  const rebase = page.getByRole("button", { name: /Ho confrontato/ });
  if (await rebase.count()) {
    await rebase.click();
    await page.locator("[data-campaign-apply]").click();
    await page.getByRole("button", { name: "Modifica", exact: true }).waitFor();
  }
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")),
  );
  const entry = state.campaignContent.entries.find(
    (row) =>
      row.data?.title === "Porto vecchio" ||
      row.revisions?.some((r) => r.data?.title === "Porto vecchio"),
  );
  const bodies = (entry?.revisions ?? []).map((r) => r.data?.body);
  check(bodies.includes("VERSIONE B"), "Cronologia lost B: " + JSON.stringify(bodies));
  check(bodies.includes("VERSIONE A"), "A not saved after compare: " + JSON.stringify(bodies));
  // CA-10 resume: a draft left unapplied comes back with its text, where it was.
  await page.goto(entryUrl);
  await page.getByRole("button", { name: "Modifica", exact: true }).click();
  const direct = await page.locator("#dialog[open]").count();
  check(!direct, "asked about a draft although every draft was applied");
  await page.locator('[data-campaign-path="data.body"]').fill("VERSIONE C, non ancora applicata");
  await page.locator('[data-campaign-path="data.body"]').blur();
  await page.waitForTimeout(1500);
  await page.goto(entryUrl);
  const leave = page.locator("#dialog[open]");
  if (await leave.count())
    await leave.getByRole("button", { name: "Salva bozza e continua" }).click();
  await page.getByRole("button", { name: "Modifica", exact: true }).click();
  await page.locator("#dialog[open]").getByRole("button", { name: "Riprendi la bozza" }).click();
  const resumed = await page.locator('[data-campaign-path="data.body"]').inputValue();
  check(resumed === "VERSIONE C, non ancora applicata", "resume lost the text: " + resumed);
  await tab2.close();
  return JSON.stringify({ bodies, resumed });
}
