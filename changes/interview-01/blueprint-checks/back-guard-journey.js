async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:8879/#preparation");
  await page.reload();
  await page.getByRole("combobox", { name: "Visita come", exact: true }).selectOption("dm");
  await page.getByRole("button", { name: "Il cortile dell’osservatorio", exact: true }).click();
  const name = page.getByRole("textbox", { name: "Nome della scena", exact: true });
  await name.fill("Bozza da proteggere");
  await page.goBack();
  await page.getByRole("dialog", { name: "Scartare le modifiche?", exact: true }).waitFor();
  await page.getByRole("button", { name: "Annulla", exact: true }).click();
  if ((await name.inputValue()) !== "Bozza da proteggere")
    throw Error("Browser Back cancel lost draft");
  await page.getByRole("button", { name: "Personaggi", exact: true }).click();
  await page.getByRole("button", { name: "Scarta modifiche", exact: true }).click();
  await page.getByRole("heading", { name: "Personaggi", exact: true }).waitFor();
  await page.goto("http://127.0.0.1:8879/#preparation?id=old-watch");
  await name.waitFor();
  if ((await name.inputValue()) === "Bozza da proteggere")
    throw Error("Discard persisted unsaved data");
  await name.fill("Seconda bozza");
  await page.goBack();
  await page.getByRole("dialog", { name: "Scartare le modifiche?", exact: true }).waitFor();
  await page.getByRole("button", { name: "Scarta modifiche", exact: true }).click();
  await page.getByRole("heading", { name: "Personaggi", exact: true }).waitFor();
  if (errors.length) throw Error(errors.join(";"));
  return {
    passed: [
      "browser Back guards dirty editor",
      "cancel preserves draft",
      "discard preserves saved scene",
      "browser Back accepted departure",
    ],
    errors,
  };
}
