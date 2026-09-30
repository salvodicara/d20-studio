// Test extension for the B11 shell hooks: it registers correctly, but every contribution
// fails when the host calls it. Each failure must stay circumscribed to that contribution
// (an in-place warning, a hidden item or a toast) while the rest of the app keeps working.
// Loaded in the browser with ?fixture=failing-extension. Synthetic data only.

const ID = "failing-extension";
const L = (it, en) => ({ it, en });
const boom = (where) => {
  throw Error(`${where} failed on purpose (test fixture)`);
};

export function register(registry) {
  // Seeding fails: the slice is not created, saved data would stay untouched.
  registry.registerStateSlice(ID, {
    version: 1,
    seed: () => boom("seed"),
    normalize: () => boom("normalize"),
  });
  registry.add("route", {
    id: ID,
    label: L("Area guasta", "Broken area"),
    icon: "flag",
    nav: true,
    order: 35,
    render: () => boom("page render"),
  });
  registry.add("service", {
    id: ID + "-service",
    label: L("Servizio guasto", "Broken service"),
    icon: "flag",
    header: true,
    run: () => boom("service"),
  });
  registry.add("home-widget", {
    id: ID + "-widget",
    label: L("Riquadro guasto", "Broken box"),
    order: 12,
    render: () => boom("home render"),
  });
  registry.add("campaign-section", {
    id: ID + "-section",
    label: L("Sezione guasta", "Broken section"),
    order: 46,
    render: (ctx) =>
      `<p data-failing-section>${ctx.t("Contenuto della sezione", "Section content")}</p>`,
    bind: () => boom("section bind"),
  });
  registry.add("sheet-tab", {
    id: ID + "-tab",
    label: L("Scheda guasta", "Broken tab"),
    when: () => boom("tab visibility"),
    render: () => "",
  });
  registry.add("sheet-section", {
    id: ID + "-box",
    tab: "actions",
    label: L("Riquadro della scheda guasto", "Broken sheet box"),
    render: () => boom("sheet box render"),
  });
  registry.add("preparation-section", {
    id: ID + "-prep",
    label: L("Preparazione guasta", "Broken preparation"),
    roles: ["dm"],
    render: () => boom("preparation render"),
  });
  registry.add("library-section", {
    id: ID + "-library",
    label: L("Raccolta guasta", "Broken collection"),
    render: () => boom("library render"),
  });
  registry.add("table-tool", {
    id: ID + "-tool",
    label: L("Strumento guasto", "Broken tool"),
    order: 56,
    activate: () => boom("tool activate"),
    onClick: () => boom("tool click"),
  });
  registry.add("table-panel", {
    id: ID + "-panel",
    label: L("Pannello guasto", "Broken panel"),
    render: () => boom("panel render"),
  });
  registry.add("map-layer", {
    id: ID + "-layer",
    label: L("Livello guasto", "Broken layer"),
    order: 20,
    svg: () => boom("layer svg"),
  });
  registry.add("token-menu", {
    id: ID + "-menu",
    label: L("Voce guasta", "Broken item"),
    run: () => boom("menu item"),
  });
  registry.add("search", {
    id: ID + "-search",
    label: L("Ricerca guasta", "Broken search"),
    search: () => boom("search"),
  });
  registry.add("notifications", {
    id: ID + "-alerts",
    label: L("Avvisi guasti", "Broken alerts"),
    collect: () => boom("notifications"),
  });
  registry.add("draft-guard", {
    id: ID + "-guard",
    label: L("Bozza guasta", "Broken draft"),
    hasDraft: () => boom("draft check"),
    confirm: () => boom("draft confirm"),
  });
  registry.add("command", {
    id: ID + ".explode",
    label: L("Comando guasto", "Broken command"),
    shortcut: "Mod+Shift+E",
    run: () => boom("command"),
  });
  registry.on("commit", () => boom("commit handler"));
  registry.on("navigate", () => boom("navigate handler"));
}
