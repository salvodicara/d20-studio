async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:8879/#preparation");
  await page.evaluate(() => localStorage.removeItem("d20-studio-blueprint-v1"));
  await page.reload();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  await page.getByRole("button", { name: "Nuova scena", exact: true }).click();
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Campo sul lago");
  await page.getByRole("radio", { name: "Accampamento: base geometrica", exact: true }).check();
  await page.getByRole("button", { name: "Crea bozza", exact: true }).click();
  await page.getByRole("textbox", { name: "Nome della scena", exact: true }).waitFor();
  await page
    .getByRole("textbox", { name: "Descrizione per il gruppo", exact: true })
    .fill("Tre tende accanto all’acqua.");
  await page
    .getByRole("textbox", { name: "Note riservate ai DM", exact: true })
    .fill("Il mercante nasconde un anello.");
  await page.getByRole("spinbutton", { name: "Metri per cella", exact: true }).fill("3");
  await page.getByRole("button", { name: "Salva preparazione", exact: true }).click();
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  let data = await saved();
  const created = data.scenes.find((s) => s.name === "Campo sul lago");
  if (!created || created.revealed || data.activeSceneId === created.id)
    throw Error("Save revealed/activated scene");
  await page.getByRole("button", { name: "Rivela contenuto…", exact: true }).click();
  await page.getByRole("radio", { name: "Tutto il gruppo", exact: true }).check();
  await page.getByRole("button", { name: "Salva visibilità", exact: true }).click();
  data = await saved();
  if (!data.scenes.find((s) => s.id === created.id).revealed || data.activeSceneId === created.id)
    throw Error("Reveal changed active scene");
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("player");
  await page.getByRole("heading", { name: "Panoramica", exact: true }).waitFor();
  const row = page.locator(".campaign-row").filter({ hasText: "Campo sul lago" });
  await row.getByRole("button", { name: "Consulta mappa", exact: true }).click();
  const publicContent = await page.locator("#dialog").innerText();
  if (!publicContent.includes("Tre tende") || publicContent.includes("mercante"))
    throw Error("Public preview privacy mismatch");
  await page.keyboard.press("Escape");
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  await page.getByRole("button", { name: "Preparazione", exact: true }).click();
  await page.getByRole("button", { name: "Campo sul lago", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Nome della scena", exact: true })
    .fill("Bozza da non perdere");
  await page.getByRole("button", { name: "Personaggi", exact: true }).click();
  await page.getByRole("dialog", { name: "Scartare le modifiche?", exact: true }).waitFor();
  await page.getByRole("button", { name: "Annulla", exact: true }).click();
  if (
    (await page.getByRole("textbox", { name: "Nome della scena", exact: true }).inputValue()) !==
    "Bozza da non perdere"
  )
    throw Error("Cancel lost draft");
  await page.getByRole("button", { name: "Personaggi", exact: true }).click();
  await page.getByRole("button", { name: "Scarta modifiche", exact: true }).click();
  await page.getByRole("heading", { name: "Personaggi", exact: true }).waitFor();
  await page.goto("http://127.0.0.1:8879/#preparation?id=" + created.id);
  await page.getByRole("textbox", { name: "Nome della scena", exact: true }).waitFor();
  if (
    (await page.getByRole("textbox", { name: "Nome della scena", exact: true }).inputValue()) !==
    "Campo sul lago"
  )
    throw Error("Discard changed saved scene");
  await page
    .locator("[data-prep-upload]")
    .setInputFiles(
      "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/invalid-map.txt",
    );
  if (!(await page.locator("[data-prep-global-error]").isVisible()))
    throw Error("Invalid upload did not explain error");
  await page.getByRole("textbox", { name: "Nome della scena", exact: true }).fill("Campo sul lago");
  await page.locator("#toast").waitFor({ state: "hidden" });
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/maint/preparation-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Attiva al Tavolo…", exact: true }).click();
  await page.getByRole("button", { name: "Attiva per il gruppo", exact: true }).click();
  await page.getByRole("heading", { name: "Campo sul lago", exact: true }).waitFor();
  data = await saved();
  if (data.activeSceneId !== created.id || data.combat.active) throw Error("Activation mismatch");
  await page.locator("#battle-map").focus();
  await page.keyboard.press("ArrowRight");
  if (
    !(await page
      .locator("#map-message")
      .textContent()
      .then((s) => s.includes("non è sulla scena")))
  )
    throw Error("Empty scene keyboard not handled");
  if (errors.length) throw Error(errors.join(";"));
  return {
    passed: [
      "private new scene",
      "save preserves active scene",
      "reveal separate",
      "public view no DM note",
      "draft cancel preserves input",
      "discard preserves saved",
      "invalid image input",
      "activate without combat",
      "empty scene keyboard",
    ],
    errors,
  };
}
