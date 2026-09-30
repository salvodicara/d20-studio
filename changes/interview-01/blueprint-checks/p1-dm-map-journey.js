async (page) => {
  // P1 IN-07 DM path (Roll20 Quick Start: upload a map, then play): Home › Primi passi ›
  // «Prepara una mappa» uploads the image into a new scene open in Preparazione; saved,
  // it is one «Attiva al Tavolo…» away.
  const out = "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P1/";
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:8879/#home");
  // Round-2 regression (29/09/2026): starts from the sample, like the other P1 journeys that
  // reset, so it does not depend on what the previous journey left in this browser.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("#demo-role").selectOption("dm");
  await page.locator("[data-home-page]").waitFor();
  const start = page.locator("[data-home-start]");
  if (await page.locator("[data-home-start-folded]").count())
    await page.locator("[data-home-start-folded] summary").click();
  await start.getByRole("button", { name: "Prepara una mappa" }).click();
  await page.locator("#dialog input[name=name]").fill("Mappa di prova");
  await page
    .locator("#dialog [data-home-map-file]")
    .setInputFiles(
      "/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/design/blueprint/icons/app-512.png",
    );
  await page.locator("#dialog button[type=submit]").click();
  await page.waitForURL(/#preparation\?id=.*tab=edit/);
  await page.waitForTimeout(300);
  const background = await page.evaluate(
    () =>
      !!document.querySelector(
        "#content image, #content [data-prep-background], #content svg image",
      ),
  );
  check(background, "the uploaded map is not in the scene editor");
  await page.screenshot({ path: out + "IN-07-dm-map-scene.png" });
  // Round-2 regression (29/09/2026): the header's «saved, it is one «Attiva al Tavolo…» away»
  // is checked too. Saving also leaves no unsaved draft behind, whose leave-page prompt
  // stopped the next journey in a shared browser (p1-cross-tab in the README order).
  const sceneId = decodeURIComponent(page.url().match(/[?&]id=([^&]+)/)[1]);
  await page.locator("[data-prep-save]").click();
  await page.locator(`[data-prep-activate="${sceneId}"]`).waitFor();
  check(
    (await page.locator(".prep-live-actions").innerText()).includes(
      "Salvare, condividere e attivare sono azioni separate.",
    ),
    "the scene still has unsaved changes after «Salva preparazione»",
  );
  const saved = await page.evaluate(
    (id) =>
      JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")).scenes.find((s) => s.id === id),
    sceneId,
  );
  check(saved?.name === "Mappa di prova" && !!saved.background, "the saved scene lacks its map");
  await page.locator("#demo-role").selectOption("player");
  return JSON.stringify({ url: page.url().split("#")[1], background });
}
