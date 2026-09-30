async (page) => {
  const errors = [];
  const passed = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const saved = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("d20-studio-blueprint-v1")));
  const clickMap = async (x, y) => {
    const map = page.locator("[data-prep-interactive]");
    await map.scrollIntoViewIfNeeded();
    const box = await map.boundingBox();
    await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
  };
  const goPreparation = async () => {
    await page.getByRole("button", { name: "Torna alla campagna", exact: true }).click();
    await page.getByRole("button", { name: "Preparazione", exact: true }).click();
    await page.getByRole("heading", { name: "Preparazione", exact: true }).waitFor();
  };
  await page.goto("http://127.0.0.1:8879/#home");
  await page.reload();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Ripristina esempio", exact: true }).click();
  await page.getByRole("button", { name: "Ripristina", exact: true }).click();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  await page.getByRole("button", { name: "Apri campagna", exact: true }).click();
  await page.getByRole("button", { name: "Preparazione", exact: true }).click();
  await page.getByRole("button", { name: "Nuova scena", exact: true }).click();
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Prova dei custodi");
  await page.getByRole("button", { name: "Crea bozza", exact: true }).click();
  await page.getByRole("button", { name: "Salva preparazione", exact: true }).click();
  let data = await saved();
  const sceneId = data.scenes.find((scene) => scene.name === "Prova dei custodi").id;
  const initialSceneId = data.activeSceneId;
  const scene = (value) => value.scenes.find((item) => item.id === sceneId);
  check(
    !scene(data).revealed && data.activeSceneId !== sceneId && !data.combat.active,
    "Creating preparation changed the live scene",
  );
  await page
    .getByRole("combobox", { name: "Personaggio o creatura", exact: true })
    .selectOption("livia");
  await page.getByRole("button", { name: "Posiziona sulla mappa", exact: true }).click();
  await clickMap(0.24, 0.45);
  await page.getByRole("button", { name: "Crea PNG…", exact: true }).click();
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Custode di prova");
  await page.getByRole("spinbutton", { name: "Punti ferita", exact: true }).fill("14");
  await page.getByRole("spinbutton", { name: "Classe Armatura", exact: true }).fill("13");
  await page.getByRole("spinbutton", { name: "Velocità (m)", exact: true }).fill("6");
  await page.getByRole("button", { name: "Crea e posiziona", exact: true }).click();
  await clickMap(0.62, 0.38);
  await page.getByRole("button", { name: "Duplica PNG…", exact: true }).click();
  await page.getByRole("textbox", { name: "Nome", exact: true }).fill("Custode gemello");
  await page.getByRole("button", { name: "Crea e posiziona", exact: true }).click();
  await clickMap(0.74, 0.65);
  data = await saved();
  check(
    !Object.values(data.actors).some((actor) => actor.name === "Custode di prova"),
    "Unsaved custom NPC escaped the draft",
  );
  check(scene(data).tokens.length === 0, "Unsaved token placement reached the live scene");
  await page.getByRole("button", { name: "Salva preparazione", exact: true }).click();
  data = await saved();
  const original = Object.values(data.actors).find((actor) => actor.name === "Custode di prova");
  const clone = Object.values(data.actors).find((actor) => actor.name === "Custode gemello");
  check(
    original && clone && original.id !== clone.id && original.hp === 14 && clone.hp === 14,
    "NPC copy did not preserve independent identities and configured stats",
  );
  check(
    scene(data).tokens.length === 3 && data.activeSceneId === initialSceneId && !data.combat.active,
    "Saving tokens changed activation or combat",
  );
  passed.push(
    "free placement and staged NPC creation",
    "independent clone identity",
    "saving does not activate or start",
  );
  await page.getByRole("button", { name: "Custode gemello", exact: true }).click();
  await page.getByRole("button", { name: "Rimuovi pedina", exact: true }).click();
  await page.getByRole("button", { name: "Salva preparazione", exact: true }).click();
  data = await saved();
  check(
    !scene(data).tokens.some((token) => token.actorId === clone.id) &&
      data.actors[clone.id].hp === 14,
    "Removing token deleted the actor",
  );
  passed.push("token removal retains actor");
  // TV-45/PR-32: initiative is prepared in the Table's start dialog (Foundry Combat Tracker);
  // the scene editor's old list is now the encounter builder. The ledger's guarantees are
  // the same: a digital roll is recorded at once and privately, a reroll appends, Undo marks
  // the reversal and keeps the faces, offline makes no die, physical values are recorded.
  const rollOne = async (id) => {
    await page.locator('[data-ct-start-roll-one="' + id + '"]').click();
    const layer = page.locator("[data-dice3d-layer]:not([hidden])");
    await layer.waitFor({ timeout: 600 }).catch(() => {});
    for (let i = 0; i < 6 && (await layer.count()); i++) await page.keyboard.press("Escape");
  };
  const include = async (ids) => {
    const all = await page
      .locator("[data-ct-start-include]")
      .evaluateAll((els) => els.map((el) => el.dataset.ctStartInclude));
    for (const id of all) {
      const box = page.locator('[data-ct-start-include="' + id + '"]');
      if ((await box.isChecked()) !== ids.includes(id)) await box.click();
    }
  };
  const openStart = async () => {
    await page.getByRole("button", { name: "Avvia incontro salvato…", exact: true }).click();
    await page.locator("[data-ct-start-dialog]").waitFor();
  };
  await openStart();
  await include([original.id]);
  await rollOne(original.id);
  data = await saved();
  const first = data.initiativeRolls.at(-1);
  check(
    first.mode === "digital" &&
      first.actorId === original.id &&
      first.total === first.natural + first.bonus &&
      first.visibility === "private",
    "Digital initiative trace missing",
  );
  check(
    scene(data).encounter?.participants?.[0]?.rollId === first.id,
    "The start dialog did not save the roll at once",
  );
  await rollOne(original.id);
  data = await saved();
  const second = data.initiativeRolls.at(-1);
  check(
    data.initiativeRolls.length === 2 && second.replacesId === first.id && second.id !== first.id,
    "Reroll replaced the first result",
  );
  await page.getByRole("button", { name: "Torna al Tavolo", exact: true }).click();
  passed.push("digital roll is immediate and private", "reroll appends evidence");
  await page
    .getByRole("button", { name: "Entra al Tavolo", exact: true })
    .click()
    .catch(() => {});
  await page.goto("http://127.0.0.1:8879/#table");
  await page.getByRole("button", { name: "Annulla ultima modifica", exact: true }).click();
  data = await saved();
  check(
    data.initiativeRolls.length === 2 &&
      data.initiativeRolls.find((roll) => roll.id === second.id).status === "reversed",
    "Undo erased evidence or failed to mark reversal",
  );
  check(
    data.initiativeRolls.find((roll) => roll.id === first.id).status !== "reversed",
    "Undo reversed the earlier result too",
  );
  await page.goto("http://127.0.0.1:8879/#preparation");
  await page.locator(".prep-roll-history summary").click();
  check(
    await page.locator('[data-prep-roll-id="' + first.id + '"]').isVisible(),
    "First roll missing from retained history",
  );
  check(
    (await page.locator('[data-prep-roll-id="' + second.id + '"]').innerText()).includes(
      "Annullato",
    ),
    "Reversal missing from visible history",
  );
  await page.screenshot({
    path: "/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/encounter-history-desktop.png",
    fullPage: true,
  });
  passed.push("undo keeps faces with visible reversal");
  await page
    .locator('[data-prep-open="' + sceneId + '"]')
    .first()
    .click();
  await page.getByRole("button", { name: "Preferenze", exact: true }).click();
  await page.locator('[name="offline"]').check();
  await page.getByRole("button", { name: "Salva preferenze", exact: true }).click();
  await openStart();
  await include([original.id]);
  await rollOne(original.id);
  data = await saved();
  check(data.initiativeRolls.length === 2, "Offline attempt generated an initiative result");
  check(
    (await page.locator("#toast").innerText()).includes("senza rete"),
    "Offline initiative rejection not explained",
  );
  await page.getByRole("button", { name: "Torna al Tavolo", exact: true }).click();
  await page.getByRole("button", { name: "Preferenze", exact: true }).click();
  await page.locator('[name="offline"]').uncheck();
  await page.getByRole("button", { name: "Salva preferenze", exact: true }).click();
  passed.push("offline attempt produces no die");
  await openStart();
  await include([original.id, "livia"]);
  for (const [id, value] of [
    [original.id, 11],
    ["livia", 12],
  ]) {
    const d20 = page.locator('[data-ct-start-natural="' + id + '"]');
    await d20.fill(String(value));
    await d20.dispatchEvent("change");
  }
  await page.getByRole("button", { name: "Attiva e avvia", exact: true }).click();
  await page.getByRole("heading", { name: "Prova dei custodi", exact: true }).waitFor();
  data = await saved();
  check(
    data.initiativeRolls.slice(-2).every((roll) => roll.mode === "physical") &&
      data.initiativeRolls.length === 4,
    "Physical values did not become traceable at the start",
  );
  check(
    data.activeSceneId === sceneId &&
      data.combat.active &&
      data.combat.order[0] === "livia" &&
      data.combat.order[1] === original.id,
    "Prepared encounter did not start with its explicit roster/order",
  );
  check(
    data.combat.order.length === 2 && !data.combat.order.includes(clone.id),
    "Removed token entered combat",
  );
  passed.push(
    "physical values traced at the start",
    "saved roster drives activation and initiative",
  );
  check(errors.length === 0, errors.join("; "));
  return {
    passed,
    errors,
    sceneId,
    originalNpcId: original.id,
    cloneNpcId: clone.id,
    retainedRollIds: [first.id, second.id],
  };
}
