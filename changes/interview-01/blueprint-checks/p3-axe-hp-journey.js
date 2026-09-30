async (page) => {
  // SV-24: axe-core on the Table inspector's HP widget (DM on Livia, player proposing on the
  // Sentinel) and the combat tracker's HP dialog is the same dialog as the token menu's.
  const axePath = "/Users/salvatoredicara/Workspace/press-on-please/node_modules/axe-core/axe.min.js";
  const out = [];
  const run = async (selector, label) => {
    if (!(await page.evaluate(() => Boolean(globalThis.axe)))) await page.addScriptTag({ path: axePath });
    const v = await page.evaluate(async (sel) => {
      const r = await globalThis.axe.run(sel, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
        rules: { "color-contrast": { enabled: false } },
      });
      return r.violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(" ")).join(", ")}`);
    }, selector);
    out.push(`${label}: ${v.length ? v.join(" | ") : "no violations"}`);
  };
  await page.goto("http://127.0.0.1:8879/#table");
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  await page.locator('.map-token[data-actor="livia"]').click();
  const tab = page.locator('.table-tabs [data-table-tab="creature"]');
  if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
  await page.locator('#table-sidebar-panel [data-dt-hp="livia"]').waitFor();
  for (const d of await page.locator('#table-sidebar-panel [data-dt-hp="livia"] details').all())
    await d.evaluate((el) => (el.open = true));
  await run('#table-sidebar-panel [data-dt-hp="livia"]', "DM inspector HP widget (all sections open)");
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("player");
  await page.locator('.map-token[data-actor="goblin-1"]').click();
  if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
  await page.locator('#table-sidebar-panel [data-dt-hp="goblin-1"]').waitFor();
  await run('#table-sidebar-panel [data-dt-hp="goblin-1"]', "player inspector «Proponi al DM»");
  return out;
}
