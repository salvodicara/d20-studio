async (page) => {
  await page.goto("http://127.0.0.1:8879/#table");
  await page.reload();
  // B61: Measure stands in the "Misura e sagome" toolbar group.
  if (!(await page.getByRole("button", { name: "Misura", exact: true }).isVisible()))
    await page.locator('[data-tool-group="measure"]').click();
  await page.getByRole("button", { name: "Misura", exact: true }).click();
  const before = await page.evaluate(() => localStorage.getItem("d20-studio-blueprint-v1"));
  const map = page.locator("#battle-map");
  const box = await map.boundingBox();
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.3);
  const line = page.locator("#preview-layer");
  if (await line.locator("[stroke-dasharray]").count())
    throw Error("Measure incorrectly draws movement budget or reachable ghost");
  if (
    !(await page
      .locator("#map-message")
      .textContent()
      .then((s) => s.startsWith("Misura diretta:")))
  )
    throw Error("Measure label missing");
  await page.mouse.click(box.x + box.width * 0.9, box.y + box.height * 0.3);
  if (before !== (await page.evaluate(() => localStorage.getItem("d20-studio-blueprint-v1"))))
    throw Error("Measure mutated shared state");
  return { passed: ["measure independent of remaining movement", "measurement cannot move actor"] };
}
