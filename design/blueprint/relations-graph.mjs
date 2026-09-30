// Area B58 — relationship graph of the campaign (Campagna, S). Entry module loaded by
// extensions.mjs through the B11 registry. The graph is a second way to read the B43
// relations, in addition to their list, not instead of it (delegated inclusion 23/09/2026,
// conflict C11 reopened; F-014 keeps the list as the default).
//
// Where it lives: Campagna → Archivio → Relazioni, a switch «Elenco | Grafo» (Kanka's
// Connections subpage: table view or Connection Map); on a World/Journal entry page, a
// small local graph of that entry ("Nel grafo delle relazioni"); the palette command
// «Apri il grafo delle relazioni».
//
// Adopted patterns (census IDs): Kanka relations explorer (CMP-29): "View web" graph of the
// relations, three explorer modes «Relations», «Relations + related», «Relations + related
// + mentions» (Kanka 1.12), click a line to see and edit the relation, preview an entry in
// place, "+" to add a relation; Obsidian graph view (CMP-89): nodes sized by their links,
// hover highlights the connections, click opens the note, local graph with a depth
// slider, filters (types, orphans) and search-coloured groups, zoom and pan; LegendKeeper
// boards (CMP-72) and Obsidian Canvas (CMP-90): entries arranged by hand on a board that
// keeps its arrangement. Secret connections follow Scabard (CMP-83) through B43: visible to
// the DM until revealed, then only to the recipients.
//
// Rules: only what this identity may read is drawn (unreadable pages, sheets, entries and
// unrevealed secret connections are absent, not masked); no relation is inferred from
// text: the only text-derived lines are [[links]] the author wrote, in the third mode, and
// a plain mention of a name never draws a line. Arranging is personal (a local change of
// this identity, undoable); relations are changed by the DM with the B43 commands.

import {
  ARCHIVE,
  LINK_RE,
  attempt,
  change,
  deviceStorage,
  fail,
  isDM,
  isMember,
  listPages,
  openPage,
  readRecipients,
  recipientsFields,
  refInfo,
  resolveTitle,
} from "./journal-plus.mjs";
import {
  addRelation,
  hideRelation,
  listRelations,
  removeRelation,
  revealRelation,
} from "./factions.mjs";
import { listCampaignEntries } from "./campaign-content.mjs";
import { canViewActor } from "./character-access.mjs";
import { LOG } from "./quests.mjs";

export const ID = "relations-graph";
export const VERSION = 1;
const L = (it, en) => Object.freeze({ it, en });
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const str = (value) => (typeof value === "string" ? value : "");
const textOf = (value, lang) =>
  typeof value === "string" ? value : (value?.[lang] ?? value?.it ?? "");

// ---------------------------------------------------------------------------------------
// Vocabulary

// Node types: the archive's own page types, the party's characters, other creatures, core
// Journal entries and scenes. A World entry takes the type of its kind (person, place,
// faction → organization). Colour, shape and name together: never colour alone.
export const NODE_TYPES = Object.freeze([
  { id: "quest", label: L("Missioni", "Quests"), one: L("Missione", "Quest"), shape: "diamond" },
  { id: "person", label: L("Persone", "People"), one: L("Persona", "Person") },
  {
    id: "organization",
    label: L("Organizzazioni e fazioni", "Organizations and factions"),
    one: L("Organizzazione", "Organization"),
  },
  { id: "place", label: L("Luoghi", "Places"), one: L("Luogo", "Place") },
  { id: "shop", label: L("Negozi", "Shops"), one: L("Negozio", "Shop") },
  { id: "event", label: L("Eventi", "Events"), one: L("Evento", "Event") },
  { id: "checklist", label: L("Elenchi", "Checklists"), one: L("Elenco", "Checklist") },
  { id: "page", label: L("Altre pagine", "Other pages"), one: L("Pagina", "Page") },
  {
    id: "character",
    label: L("Personaggi", "Characters"),
    one: L("Personaggio", "Character"),
    shape: "square",
  },
  {
    id: "creature",
    label: L("Creature e PNG in gioco", "Creatures and NPCs in play"),
    one: L("Creatura", "Creature"),
    shape: "square",
  },
  { id: "journal", label: L("Diario", "Journal"), one: L("Voce del Diario", "Journal entry") },
  { id: "scene", label: L("Scene", "Scenes"), one: L("Scena", "Scene"), shape: "triangle" },
]);
const TYPE_IDS = NODE_TYPES.map((type) => type.id);
const typeOf = (id) => NODE_TYPES.find((type) => type.id === id) ?? NODE_TYPES[7];
const WORLD_TYPE = { person: "person", place: "place", faction: "organization", other: "page" };
const ENTRY_KINDS = {
  note: L("Appunto", "Note"),
  world: L("Voce del mondo", "World entry"),
  quest: L("Obiettivo", "Objective"),
  recap: L("Resoconto", "Recap"),
};

// Kanka 1.12 relation explorer modes (CMP-29).
export const MODES = Object.freeze([
  { id: "relations", label: L("Solo relazioni", "Relations only") },
  { id: "related", label: L("Relazioni e voci collegate", "Relations and related entries") },
  {
    id: "mentions",
    label: L(
      "Relazioni, voci collegate e collegamenti [[ ]]",
      "Relations, related entries and [[ ]] links",
    ),
  },
]);
const MODE_IDS = MODES.map((mode) => mode.id);
// Lines that come from a field of an entry (Kanka "related elements") or from a [[link]].
export const RELATED = Object.freeze({
  giver: L("committente di", "quest giver of"),
  parent: L("sotto-pagina di", "subpage of"),
  element: L("elemento", "element"),
  link: L("collegata a", "linked to"),
  mention: L("cita", "links to"),
});
const RELATED_KIND = {
  giver: L("Committente della missione", "Quest giver"),
  parent: L("Pagina annidata", "Nested page"),
  element: L("Elemento della voce", "Element of the entry"),
  link: L("Collegamento della voce", "Link of the entry"),
};

// ---------------------------------------------------------------------------------------
// Graph projection (pure): what this identity may read, as nodes and edges.

export const nodeKey = (ref) => `${ref.kind}:${ref.id}`;
const NODE_RE = /^(page|actor|entry|scene):[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/;

function describeNode(state, role, ref, pages, entries) {
  if (!ref || typeof ref.id !== "string") return null;
  const id = nodeKey(ref);
  if (ref.kind === "page") {
    const page = pages.get(ref.id);
    if (!page) return null;
    return {
      id,
      ref: { kind: "page", id: page.id },
      type: TYPE_IDS.includes(page.type) ? page.type : "page",
      label: page.title,
      ...(page.type === "quest" ? { status: page.status } : {}),
      open:
        page.type === "quest"
          ? { page: "campaign", tab: LOG, id: "q:" + page.id }
          : { archive: page.id },
    };
  }
  if (ref.kind === "actor") {
    const actor = state.actors?.[ref.id];
    if (!actor || !canViewActor(actor, role, state)) return null;
    return {
      id,
      ref: { kind: "actor", id: actor.id },
      type: actor.kind === "character" ? "character" : "creature",
      label: textOf(actor.name, "it") || actor.id,
      open: { page: "characters", id: actor.id },
    };
  }
  if (ref.kind === "entry" || ref.kind === "scene") {
    const info = refInfo(state, { kind: ref.kind, id: ref.id }, role);
    if (!info) return null;
    const entry = entries.get(ref.id);
    const type =
      ref.kind === "scene"
        ? "scene"
        : entry?.kind === "world"
          ? (WORLD_TYPE[entry.data.worldType] ?? "page")
          : entry?.kind === "quest"
            ? "quest"
            : "journal";
    // An untitled Journal entry is named by its kind, like the Journal list does.
    const title = str(entry?.data?.title).trim();
    const kindName = ENTRY_KINDS[entry?.kind];
    return {
      id,
      ref: { kind: ref.kind, id: ref.id },
      type,
      label: title || (kindName ? kindName.it : textOf(info.label, "it") || ref.id),
      ...(!title && kindName ? { labelEn: kindName.en } : {}),
      ...(entry?.kind === "world" ? { world: true } : {}),
      open: { ...info.route },
    };
  }
  return null;
}

/**
 * The relationship graph this identity may read: `{nodes, edges}`. Nodes are every readable
 * archive page and World entry (orphans included) plus the sheets, scenes and entries an
 * edge reaches. Modes: "relations" (B43 relations only), "related" (+ quest giver, nested
 * page, elements, entry links) and "mentions" (+ [[links]] written in readable text).
 */
export function collectGraph(state, role, { mode = "related" } = {}) {
  if (!state?.campaign?.id || !isMember(state, role)) return { nodes: [], edges: [] };
  const wanted = MODE_IDS.includes(mode) ? mode : "related";
  const dm = isDM(state, role);
  const pageRows = listPages(state, role);
  const pages = new Map(pageRows.map((page) => [page.id, page]));
  const entryRows = listCampaignEntries(state, { campaignId: state.campaign.id }, role);
  const entries = new Map(entryRows.map((entry) => [entry.id, entry]));
  const nodes = new Map();
  const edges = [];
  const node = (ref) => {
    if (!ref) return null;
    const id = nodeKey(ref);
    if (!nodes.has(id)) {
      const described = describeNode(state, role, ref, pages, entries);
      if (!described) return null;
      nodes.set(id, described);
    }
    return id;
  };
  const edge = (fromRef, toRef, row) => {
    const from = node(fromRef);
    const to = node(toRef);
    if (!from || !to || from === to) return;
    if (edges.some((e) => e.id === row.id)) return;
    edges.push({ secret: false, revealed: false, ...row, from, to });
  };
  for (const page of pageRows) node({ kind: "page", id: page.id });
  for (const entry of entryRows) if (entry.kind === "world") node({ kind: "entry", id: entry.id });
  // B43 relations: already filtered by who can read them (Scabard secret connections).
  for (const row of listRelations(state, role))
    edge(
      { kind: row.from.kind, id: row.from.id },
      { kind: row.to.kind, id: row.to.id },
      {
        id: "rel:" + row.id,
        kind: "relation",
        relationId: row.id,
        label: row.label,
        secret: row.secret,
        revealed: row.revealed,
        ...(dm && row.reveal ? { reveal: row.reveal } : {}),
      },
    );
  if (wanted !== "relations") {
    for (const page of pageRows) {
      const self = { kind: "page", id: page.id };
      if (page.type === "quest" && page.giver)
        edge(page.giver, self, {
          id: "giver:" + page.id,
          kind: "related",
          sub: "giver",
          label: RELATED.giver,
        });
      if (page.parentId)
        edge(
          self,
          { kind: "page", id: page.parentId },
          { id: "parent:" + page.id, kind: "related", sub: "parent", label: RELATED.parent },
        );
      for (const ref of page.elements ?? [])
        edge(self, ref, {
          id: `element:${page.id}:${ref.kind}:${ref.id}`,
          kind: "related",
          sub: "element",
          label: RELATED.element,
        });
    }
    // Core Journal/World entries: their explicit links (campaign-content.mjs), already
    // projected to what this identity may read. Library content stays out of the graph.
    for (const entry of entryRows)
      for (const link of entry.data.links ?? [])
        if (["entry", "actor", "scene"].includes(link.kind))
          edge({ kind: "entry", id: entry.id }, link, {
            id: `link:${entry.id}:${link.kind}:${link.id}`,
            kind: "related",
            sub: "link",
            label: RELATED.link,
          });
  }
  if (wanted === "mentions") {
    // Only [[links]] the author wrote, in the text this identity may read (projected pages
    // carry no unrevealed secret block or secret property for a player). An unlinked
    // mention of a title is never a line (census S3: no automatic extraction from prose).
    for (const page of pageRows) {
      const found = new Map();
      const scan = (text, secret) => {
        for (const match of str(text).matchAll(LINK_RE)) {
          const target = resolveTitle(state, match[1], role);
          if (!target || target.id === page.id) continue;
          found.set(target.id, (found.get(target.id) ?? true) && secret);
        }
      };
      for (const block of page.blocks ?? [])
        scan(block.text, dm && block.kind === "secret" && block.reveal?.mode !== "all");
      for (const property of page.properties ?? []) scan(property.value, dm && property.secret);
      for (const item of page.items ?? []) scan(item.text, false);
      for (const [targetId, secret] of found)
        edge(
          { kind: "page", id: page.id },
          { kind: "page", id: targetId },
          {
            id: `mention:${page.id}:${targetId}`,
            kind: "mention",
            sub: "mention",
            label: RELATED.mention,
            secret,
          },
        );
    }
  }
  return { nodes: [...nodes.values()], edges };
}

/**
 * Filters a graph for display (Obsidian filters and local graph): hidden types, orphans,
 * and a focus with its neighbourhood up to `depth` links. Adds each node's degree and each
 * edge's lane among parallel lines. The focus stays visible whatever its type.
 */
export function viewGraph(graph, { hidden = [], orphans = true, focus = "", depth = 1 } = {}) {
  const hide = new Set(hidden);
  const center = graph.nodes.some((n) => n.id === focus) ? focus : "";
  let nodes = graph.nodes.filter((n) => n.id === center || !hide.has(n.type));
  let keep = new Set(nodes.map((n) => n.id));
  let edges = graph.edges.filter((e) => keep.has(e.from) && keep.has(e.to));
  if (center) {
    const reached = new Set([center]);
    let frontier = [center];
    for (let level = 0; level < Math.max(1, Math.min(3, depth)); level++) {
      const next = [];
      for (const e of edges)
        for (const [a, b] of [
          [e.from, e.to],
          [e.to, e.from],
        ])
          if (frontier.includes(a) && !reached.has(b)) {
            reached.add(b);
            next.push(b);
          }
      frontier = next;
    }
    nodes = nodes.filter((n) => reached.has(n.id));
    keep = reached;
    edges = edges.filter((e) => keep.has(e.from) && keep.has(e.to));
  }
  const degree = new Map();
  for (const e of edges) for (const id of [e.from, e.to]) degree.set(id, (degree.get(id) ?? 0) + 1);
  if (!orphans) nodes = nodes.filter((n) => n.id === center || degree.get(n.id));
  const pairs = new Map();
  for (const e of edges) {
    const pair = [e.from, e.to].sort().join("|");
    pairs.set(pair, [...(pairs.get(pair) ?? []), e.id]);
  }
  return {
    focus: center,
    nodes: nodes
      .map((n) => ({ ...n, degree: degree.get(n.id) ?? 0 }))
      .sort((a, b) => a.label.localeCompare(b.label, "it") || a.id.localeCompare(b.id)),
    edges: edges.map((e) => {
      const group = pairs.get([e.from, e.to].sort().join("|"));
      const lane = group.indexOf(e.id) - (group.length - 1) / 2;
      // Lanes are measured on the pair's sorted direction, so opposite lines never overlap.
      return { ...e, lane: e.from < e.to ? lane : -lane };
    }),
  };
}

// ---------------------------------------------------------------------------------------
// Layout (pure, deterministic): force-directed placement (Fruchterman–Reingold, the physics
// behind Obsidian's graph), with the entries arranged by hand kept where they were put.

// Horizontal room for a centred name under the node; vertical room for node and name.
const MARGIN_X = 92;
const MARGIN_Y = 34;
const LABEL_MAX = 24;
export const nodeRadius = (degree = 0) => 11 + Math.min(9, degree * 1.5);
const typeRank = (type) => TYPE_IDS.indexOf(type);
const round = (value) => Math.round(value * 10) / 10;
const clampTo = (value, min, max) => Math.min(max, Math.max(min, value));
export function toBox(point, { width, height }) {
  return {
    x: round(MARGIN_X + clampTo(point.x, 0, 1) * (width - 2 * MARGIN_X)),
    y: round(MARGIN_Y + clampTo(point.y, 0, 1) * (height - 2 * MARGIN_Y - 16)),
  };
}
export function toFraction(point, { width, height }) {
  const fraction = (value) => Math.round(clampTo(value, 0, 1) * 10000) / 10000;
  return {
    x: fraction((point.x - MARGIN_X) / (width - 2 * MARGIN_X)),
    y: fraction((point.y - MARGIN_Y) / (height - 2 * MARGIN_Y - 16)),
  };
}
// The board area a node and its name take (name centred under the node).
function footprint(node) {
  const r = nodeRadius(node.degree);
  const half = Math.max(r + 4, Math.min(LABEL_MAX, str(node.label).length) * 3.7 + 6);
  return { left: half, right: half, top: r + 6, bottom: r + 22 };
}
/**
 * Positions by node id inside a `width × height` box; `pinned` holds 0–1 fractions of the
 * inner board (kept exactly). Deterministic: the same entries give the same board.
 */
export function layoutGraph(nodes, edges, { width = 860, height = 600, pinned = {} } = {}) {
  const box = { width, height };
  const positions = new Map();
  const n = nodes.length;
  if (!n) return positions;
  const minX = MARGIN_X;
  const maxX = width - MARGIN_X;
  const minY = MARGIN_Y;
  const maxY = height - MARGIN_Y - 16;
  const cx = width / 2;
  const cy = (minY + maxY) / 2;
  const ordered = [...nodes].sort(
    (a, b) => typeRank(a.type) - typeRank(b.type) || a.id.localeCompare(b.id),
  );
  const rx = (maxX - minX) * 0.36;
  const ry = (maxY - minY) * 0.36;
  ordered.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / n - Math.PI / 2;
    positions.set(node.id, { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) });
  });
  const fixed = new Set();
  for (const node of nodes) {
    const pin = pinned[node.id];
    if (pin && Number.isFinite(pin.x) && Number.isFinite(pin.y)) {
      positions.set(node.id, toBox(pin, box));
      fixed.add(node.id);
    }
  }
  if (n === 1 && !fixed.size) positions.set(nodes[0].id, { x: cx, y: cy });
  const free = ordered.filter((node) => !fixed.has(node.id));
  const place = (p, x, y) => {
    p.x = clampTo(x, minX, maxX);
    p.y = clampTo(y, minY, maxY);
  };
  if (n > 1 && free.length) {
    const k = 0.62 * Math.sqrt(((maxX - minX) * (maxY - minY)) / n);
    const links = [
      ...new Set(
        edges
          .filter((e) => positions.has(e.from) && positions.has(e.to))
          .map((e) => [e.from, e.to].sort().join("|")),
      ),
    ].map((pair) => pair.split("|"));
    const iterations = 260;
    for (let step = 0; step < iterations; step++) {
      const temperature = (width / 10) * (1 - step / iterations) + 0.5;
      const shift = new Map(ordered.map((node) => [node.id, { x: 0, y: 0 }]));
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          const a = positions.get(ordered[i].id);
          const b = positions.get(ordered[j].id);
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          if (Math.abs(dx) + Math.abs(dy) < 0.01) {
            dx = ((i % 3) - 1) * 0.5 + 0.1;
            dy = ((j % 3) - 1) * 0.5 + 0.1;
          }
          // Names are wide: horizontal neighbours need more room than vertical ones.
          const dist = Math.max(0.01, Math.hypot(dx / 1.6, dy));
          const force = (k * k) / dist;
          const sa = shift.get(ordered[i].id);
          const sb = shift.get(ordered[j].id);
          sa.x += (dx / dist) * force;
          sa.y += (dy / dist) * force;
          sb.x -= (dx / dist) * force;
          sb.y -= (dy / dist) * force;
        }
      for (const [from, to] of links) {
        const a = positions.get(from);
        const b = positions.get(to);
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.max(0.01, Math.hypot(dx, dy));
        const force = (dist * dist) / k;
        shift.get(from).x -= (dx / dist) * force;
        shift.get(from).y -= (dy / dist) * force;
        shift.get(to).x += (dx / dist) * force;
        shift.get(to).y += (dy / dist) * force;
      }
      for (const node of free) {
        const p = positions.get(node.id);
        const s = shift.get(node.id);
        // Gravity toward the centre keeps unlinked entries off the edges of the board.
        s.x += (cx - p.x) * 0.9;
        s.y += (cy - p.y) * 1.4;
        const length = Math.max(0.01, Math.hypot(s.x, s.y));
        const move = Math.min(length, temperature);
        place(p, p.x + (s.x / length) * move, p.y + (s.y / length) * move);
      }
    }
    // Separation: no node or name covers another (pinned entries stay where they are).
    const boxes = new Map(ordered.map((node) => [node.id, footprint(node)]));
    for (let pass = 0; pass < 80; pass++) {
      let moved = false;
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          const [na, nb] = [ordered[i], ordered[j]];
          const a = positions.get(na.id);
          const b = positions.get(nb.id);
          const fa = boxes.get(na.id);
          const fb = boxes.get(nb.id);
          const ox =
            Math.min(a.x + fa.right, b.x + fb.right) - Math.max(a.x - fa.left, b.x - fb.left);
          const oy =
            Math.min(a.y + fa.bottom, b.y + fb.bottom) - Math.max(a.y - fa.top, b.y - fb.top);
          if (ox <= 0 || oy <= 0) continue;
          const aFree = !fixed.has(na.id);
          const bFree = !fixed.has(nb.id);
          if (!aFree && !bFree) continue;
          const share = aFree && bFree ? 0.5 : 1;
          const vertical = oy * 1.6 < ox;
          const gap = (vertical ? oy : ox) + 2;
          const sign = vertical ? (a.y <= b.y ? -1 : 1) : a.x <= b.x ? -1 : 1;
          if (aFree)
            place(
              a,
              a.x + (vertical ? 0 : sign * gap * share),
              a.y + (vertical ? sign * gap * share : 0),
            );
          if (bFree)
            place(
              b,
              b.x - (vertical ? 0 : sign * gap * share),
              b.y - (vertical ? sign * gap * share : 0),
            );
          moved = true;
        }
      if (!moved) break;
    }
  }
  for (const [id, p] of positions) positions.set(id, { x: round(p.x), y: round(p.y) });
  return positions;
}

/** SVG path of a line from `a` to `b` (curved on its lane) ending before the target. */
export function edgeGeometry(a, b, lane = 0, targetRadius = 12) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.max(0.01, Math.hypot(dx, dy));
  const nx = -dy / length;
  const ny = dx / length;
  const offset = lane * 30;
  const cx = (a.x + b.x) / 2 + nx * offset;
  const cy = (a.y + b.y) / 2 + ny * offset;
  const ex = b.x - (lane ? cx : a.x);
  const ey = b.y - (lane ? cy : a.y);
  const el = Math.max(0.01, Math.hypot(ex, ey));
  const tx = round(b.x - (ex / el) * (targetRadius + 4));
  const ty = round(b.y - (ey / el) * (targetRadius + 4));
  return lane
    ? {
        d: `M${round(a.x)} ${round(a.y)} Q${round(cx)} ${round(cy)} ${tx} ${ty}`,
        lx: round(0.25 * a.x + 0.5 * cx + 0.25 * b.x),
        ly: round(0.25 * a.y + 0.5 * cy + 0.25 * b.y),
      }
    : {
        d: `M${round(a.x)} ${round(a.y)} L${tx} ${ty}`,
        lx: round((a.x + b.x) / 2),
        ly: round((a.y + b.y) / 2),
      };
}

// ---------------------------------------------------------------------------------------
// State slice: each identity's own arrangement of the board, per campaign and per board
// format (LegendKeeper boards CMP-72): "wide" (computer) and "narrow" (phone), since a board
// arranged on a wide screen cannot be read squeezed into a phone. Snapshot Undo:
// "Annulla ultima modifica" puts an entry back.

export const FORMATS = Object.freeze(["wide", "narrow"]);
export const seedGraphState = () => ({ layouts: {} });
const validPositions = (positions) =>
  isObject(positions)
    ? Object.entries(positions).filter(
        ([id, p]) =>
          NODE_RE.test(id) &&
          isObject(p) &&
          [p.x, p.y].every((v) => Number.isFinite(v) && v >= 0 && v <= 1),
      )
    : [];
export function normalizeGraphState(slice, fromVersion) {
  if (fromVersion > VERSION) throw Error("Saved relationship graph comes from a newer version");
  const out = { layouts: {} };
  const layouts = isObject(slice?.layouts) ? slice.layouts : {};
  for (const [campaignId, byIdentity] of Object.entries(layouts)) {
    if (!isObject(byIdentity)) continue;
    for (const [who, byFormat] of Object.entries(byIdentity)) {
      if (!isObject(byFormat)) continue;
      for (const format of FORMATS) {
        const valid = validPositions(byFormat[format]);
        if (!valid.length) continue;
        out.layouts[campaignId] ??= {};
        out.layouts[campaignId][who] ??= {};
        out.layouts[campaignId][who][format] = Object.fromEntries(
          valid.map(([id, p]) => [id, { x: p.x, y: p.y }]),
        );
      }
    }
  }
  return out;
}
const sliceOf = (state) => state?.ext?.[ID];
const formatOf = (format) => (FORMATS.includes(format) ? format : "wide");
/** This identity's arrangement in the campaign in play (0–1 fractions by node id). */
export function layoutOf(state, role, format = "wide") {
  return structuredClone(
    sliceOf(state)?.layouts?.[state?.campaign?.id]?.[role]?.[formatOf(format)] ?? {},
  );
}
function requireMember(state, role) {
  if (!state?.campaign?.id || !isMember(state, role))
    fail(
      "Il grafo è dei membri della campagna in gioco.",
      "The graph belongs to the members of the campaign in play.",
    );
}
/** Puts entries where this identity arranged them; only entries it can read. */
export function placeNodes(state, role, positions, format = "wide") {
  requireMember(state, role);
  if (!FORMATS.includes(format)) fail("Formato del grafo non valido.", "Invalid graph format.");
  const entries = isObject(positions) ? Object.entries(positions) : [];
  if (!entries.length || entries.length > 300)
    fail("Scegli dove mettere la voce.", "Choose where to put the entry.");
  const readable = new Set(collectGraph(state, role, { mode: "mentions" }).nodes.map((n) => n.id));
  for (const [id, p] of entries) {
    if (!readable.has(id))
      fail("Questa voce non è nel tuo grafo.", "This entry is not in your graph.");
    if (!isObject(p) || !Number.isFinite(p.x) || !Number.isFinite(p.y))
      fail("Posizione non valida.", "Invalid position.");
  }
  const slice = (state.ext[ID] ??= seedGraphState());
  const campaign = (slice.layouts[state.campaign.id] ??= {});
  const mine = ((campaign[role] ??= {})[format] ??= {});
  const clamp = (value) => Math.round(Math.min(1, Math.max(0, value)) * 10000) / 10000;
  for (const [id, p] of entries) mine[id] = { x: clamp(p.x), y: clamp(p.y) };
}
/** Forgets this identity's arrangement of one format: the graph lays itself out again. */
export function resetLayout(state, role, format = "wide") {
  requireMember(state, role);
  const mine = sliceOf(state)?.layouts?.[state.campaign.id]?.[role];
  if (!mine?.[format] || !Object.keys(mine[format]).length)
    fail("Il grafo è già disposto in automatico.", "The graph is already laid out automatically.");
  delete mine[format];
  if (!Object.keys(mine).length) delete sliceOf(state).layouts[state.campaign.id][role];
}

// ---------------------------------------------------------------------------------------
// Viewer preferences (this device, per identity and campaign): list or graph, mode,
// hidden types, orphans, line names, focus and depth. Conveniences, not shared data.

const PREFS_KEY = "d20-studio-relations-graph-v1";
export const DEFAULT_PREFS = Object.freeze({
  view: "list",
  mode: "related",
  hidden: [],
  orphans: true,
  labels: true,
  focus: "",
  depth: 1,
});
export function normalizePrefs(raw) {
  const value = isObject(raw) ? raw : {};
  return {
    view: value.view === "graph" ? "graph" : "list",
    mode: MODE_IDS.includes(value.mode) ? value.mode : DEFAULT_PREFS.mode,
    hidden: Array.isArray(value.hidden) ? value.hidden.filter((t) => TYPE_IDS.includes(t)) : [],
    orphans: value.orphans !== false,
    labels: value.labels !== false,
    focus: typeof value.focus === "string" && NODE_RE.test(value.focus) ? value.focus : "",
    depth: [1, 2, 3].includes(value.depth) ? value.depth : 1,
  };
}
function readAll(storage) {
  try {
    const value = JSON.parse(storage?.getItem?.(PREFS_KEY) ?? "{}");
    return isObject(value) ? value : {};
  } catch {
    return {};
  }
}
export function readPrefs(storage, campaignId, role) {
  return normalizePrefs(readAll(storage)?.[campaignId]?.[role]);
}
export function writePrefs(storage, campaignId, role, prefs) {
  const all = readAll(storage);
  all[campaignId] = { ...(isObject(all[campaignId]) ? all[campaignId] : {}) };
  all[campaignId][role] = normalizePrefs(prefs);
  try {
    storage?.setItem?.(PREFS_KEY, JSON.stringify(all));
  } catch {
    /* Blocked storage: the choice lasts until the page closes. */
  }
  return all[campaignId][role];
}
export function clearPrefs(storage) {
  try {
    storage?.removeItem?.(PREFS_KEY);
  } catch {
    /* Nothing to clear. */
  }
}

// =======================================================================================
// UI
// =======================================================================================

const ui = {
  active: new Map(),
  viewport: new Map(),
  models: new Map(),
  focus: null,
  ctx: null,
};
// Hover intent before a resting pointer previews an entry (the compendium tooltips wait
// 250 ms, CRP-172); highlighting the links stays immediate (Obsidian).
export const PREVIEW_DELAY = 300;
const campaignOf = (ctx) => ctx.state.campaign?.id ?? "";
export const prefsFor = (ctx) => readPrefs(deviceStorage(), campaignOf(ctx), ctx.role);
export function updatePrefs(ctx, patch) {
  return writePrefs(deviceStorage(), campaignOf(ctx), ctx.role, { ...prefsFor(ctx), ...patch });
}
const phone = () => globalThis.matchMedia?.("(max-width: 720px)")?.matches === true;
const boxFor = (compact) =>
  compact
    ? phone()
      ? { width: 360, height: 360, format: "narrow" }
      : { width: 680, height: 300, format: "wide" }
    : phone()
      ? { width: 360, height: 640, format: "narrow" }
      : { width: 860, height: 600, format: "wide" };
// Pointer capture throws for a pointer the browser no longer tracks: capture is a nicety.
const capture = (el, id, on = true) => {
  try {
    if (on) el.setPointerCapture?.(id);
    else el.releasePointerCapture?.(id);
  } catch {
    /* The drag still works while the pointer stays over the element. */
  }
};
const nodeName = (ctx, node) => (ctx.lang === "en" && node?.labelEn) || node?.label || "";
const typeName = (ctx, node) =>
  node.world
    ? `${ctx.t("Mondo", "World")} · ${ctx.label(typeOf(node.type).one)}`
    : ctx.label(typeOf(node.type).one);
const edgeLabel = (ctx, edge) => textOf(edge.label, ctx.lang);
const COUNTS = {
  entries: [L("voce", "entry"), L("voci", "entries")],
  links: [L("collegamento", "link"), L("collegamenti", "links")],
};
const counted = (ctx, n, what) => `${n} ${ctx.label(COUNTS[what][n === 1 ? 0 : 1])}`;

/** Everything a render and its bind share: the full graph, the filtered view and layout. */
export function buildModel(ctx, prefs, { compact = false, key = "main" } = {}) {
  const graph = collectGraph(ctx.state, ctx.role, { mode: prefs.mode });
  const view = viewGraph(graph, prefs);
  const box = boxFor(compact);
  // The hand-made arrangement belongs to the whole graph; a local graph lays itself out.
  const pinned = view.focus || compact ? {} : layoutOf(ctx.state, ctx.role, box.format);
  const positions = layoutGraph(view.nodes, view.edges, { ...box, pinned });
  const model = {
    graph,
    view,
    box,
    positions,
    pinned,
    prefs,
    compact,
    editable: !compact && !view.focus,
    key: `${key}:${ctx.role}`,
  };
  ui.models.set(model.key, model);
  return model;
}
const shapeMarkup = (node, r) => {
  const shape = typeOf(node.type).shape;
  if (shape === "diamond") {
    const s = r * 1.25;
    return `<path class="rg-shape" d="M0 ${-s} L${s} 0 L0 ${s} L${-s} 0 Z"/>`;
  }
  if (shape === "square")
    return `<rect class="rg-shape" x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" rx="5"/>`;
  if (shape === "triangle") {
    const s = r * 1.2;
    return `<path class="rg-shape" d="M0 ${-s} L${s} ${s * 0.8} L${-s} ${s * 0.8} Z"/>`;
  }
  return `<circle class="rg-shape" r="${r}"/>`;
};
const short = (text, max = 24) => (text.length > max ? text.slice(0, max - 1) + "…" : text);
function edgeClass(edge) {
  return [
    "rg-edge",
    `rg-edge-${edge.kind}`,
    edge.secret ? (edge.revealed ? "is-revealed" : "is-secret") : "",
  ]
    .filter(Boolean)
    .join(" ");
}
function markerFor(edge) {
  if (edge.secret) return "secret";
  return edge.kind === "relation" ? "relation" : "related";
}
function edgeMarkup(ctx, model, edge, prefix) {
  const a = model.positions.get(edge.from);
  const b = model.positions.get(edge.to);
  if (!a || !b) return "";
  const target = model.view.nodes.find((n) => n.id === edge.to);
  const g = edgeGeometry(a, b, edge.lane, nodeRadius(target?.degree));
  const secretNote = edge.secret
    ? edge.revealed
      ? ctx.t(" · rivelata", " · revealed")
      : isDM(ctx.state, ctx.role)
        ? ctx.t(" · segreta", " · secret")
        : ""
    : "";
  // A short line's name would cover the entries' names: it shows while highlighted.
  const shortLine = Math.hypot(b.x - a.x, b.y - a.y) < 160;
  const label = model.prefs.labels
    ? `<text class="rg-edge-label${shortLine ? " is-short" : ""}" x="${g.lx}" y="${g.ly}" text-anchor="middle" dy="-4">${ctx.esc(short(edgeLabel(ctx, edge), 30) + secretNote)}</text>`
    : "";
  return `<g class="${edgeClass(edge)}" data-rg-edge="${ctx.esc(edge.id)}" data-from="${ctx.esc(edge.from)}" data-to="${ctx.esc(edge.to)}" data-lane="${edge.lane}"><path class="rg-edge-line" d="${g.d}" marker-end="url(#${prefix}-${markerFor(edge)})"/><path class="rg-edge-hit" d="${g.d}"/>${label}</g>`;
}
function nodeMarkup(ctx, model, node) {
  const p = model.positions.get(node.id);
  const r = nodeRadius(node.degree);
  const hidden =
    node.status === "hidden" ? ctx.t(" · nascosta ai giocatori", " · hidden from players") : "";
  const aria = `${nodeName(ctx, node)} · ${typeName(ctx, node)}${hidden} · ${node.degree} ${node.degree === 1 ? ctx.t("collegamento", "link") : ctx.t("collegamenti", "links")}`;
  return `<g class="rg-node rg-type-${node.type} ${node.id === model.view.focus ? "is-focus" : ""} ${model.pinned[node.id] ? "is-pinned" : ""}" data-rg-node="${ctx.esc(node.id)}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-label="${ctx.esc(aria)}"><circle class="rg-node-hit" r="22"/>${shapeMarkup(node, r)}<text class="rg-node-label" y="${r + 15}" text-anchor="middle">${ctx.esc(short(nodeName(ctx, node)))}</text></g>`;
}
function markers(prefix) {
  const marker = (name) =>
    `<marker id="${prefix}-${name}" class="rg-marker rg-marker-${name}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z"/></marker>`;
  return `<defs>${["relation", "related", "secret"].map(marker).join("")}</defs>`;
}
function graphSVG(ctx, model, prefix) {
  const { view, box } = model;
  const summary = ctx.t(
    `Grafo delle relazioni: ${counted(ctx, view.nodes.length, "entries")} e ${counted(ctx, view.edges.length, "links")}`,
    `Relationship graph: ${counted(ctx, view.nodes.length, "entries")} and ${counted(ctx, view.edges.length, "links")}`,
  );
  return `<svg class="rg-svg" data-rg-svg viewBox="0 0 ${box.width} ${box.height}" data-width="${box.width}" data-height="${box.height}" role="group" aria-label="${ctx.esc(summary)}" style="aspect-ratio:${box.width} / ${box.height}">${markers(prefix)}<g class="rg-edges" aria-hidden="true">${view.edges.map((edge) => edgeMarkup(ctx, model, edge, prefix)).join("")}</g><g class="rg-nodes">${view.nodes.map((node) => nodeMarkup(ctx, model, node)).join("")}</g></svg>`;
}

// ---- Details panel: the summary, a node preview (Kanka "preview in place") or a line.

function recipientsText(ctx, reveal) {
  if (!reveal || reveal.mode === "none") return ctx.t("Solo DM", "DM only");
  if (reveal.mode === "all") return ctx.t("Tutto il gruppo", "The whole party");
  return reveal.actorIds.map((id) => ctx.state.actors?.[id]?.name ?? id).join(", ");
}
function summaryHTML(ctx, model) {
  const dm = isDM(ctx.state, ctx.role);
  const { view } = model;
  return `<h3 tabindex="-1" data-rg-details-title>${counted(ctx, view.nodes.length, "entries")} · ${counted(ctx, view.edges.length, "links")}</h3><p class="campaign-meta">${ctx.t("Fermati sopra una voce, raggiungila con Tab o, al tocco, tienila premuta per vederne i collegamenti. Clic, Invio o un tocco la aprono. Clic o tocco su una linea mostra la relazione.", "Rest the pointer on an entry, reach it with Tab or, on a touch screen, press and hold it to see its links. Click, Enter or a tap opens it. Click or tap a line to see the relation.")}</p><p class="campaign-meta">${model.editable ? ctx.t("Trascina una voce (o usa le frecce) per sistemarla: la disposizione è solo tua e «Annulla ultima modifica» la rimette dov’era.", "Drag an entry (or use the arrow keys) to arrange it: the arrangement is yours only and “Undo last change” puts it back.") : ctx.t("Grafo locale: le voci si dispongono da sole attorno a quella centrale.", "Local graph: entries arrange themselves around the central one.")}</p>${dm ? `<p class="campaign-meta">${ctx.t("Le linee tratteggiate dorate sono connessioni segrete: le vedi solo tu finché non le riveli.", "Dashed golden lines are secret connections: only you see them until you reveal them.")}</p>` : ""}`;
}
function connectionRow(ctx, model, edge, nodeId) {
  const outgoing = edge.from === nodeId;
  const other = model.view.nodes.find((n) => n.id === (outgoing ? edge.to : edge.from));
  const secret = edge.secret
    ? ` <span class="badge rg-secret-badge">${edge.revealed ? ctx.t("rivelata", "revealed") : ctx.t("segreta", "secret")}</span>`
    : "";
  return `<li><button type="button" class="rg-conn" data-rg-select-edge="${ctx.esc(edge.id)}"><span class="rg-dir" aria-hidden="true">${outgoing ? "→" : "←"}</span><span><em>${ctx.esc(edgeLabel(ctx, edge))}</em> · ${ctx.esc(nodeName(ctx, other))}<span class="jp-sr">${outgoing ? ctx.t(" (in uscita)", " (outgoing)") : ctx.t(" (in entrata)", " (incoming)")}</span>${secret}</span></button></li>`;
}
function nodeHTML(ctx, model, node) {
  const dm = isDM(ctx.state, ctx.role);
  const edges = model.view.edges.filter((e) => e.from === node.id || e.to === node.id);
  const hidden =
    node.status === "hidden"
      ? ` <span class="badge">${ctx.t("Nascosta ai giocatori", "Hidden from players")}</span>`
      : "";
  return `<p class="rg-kicker"><span class="rg-swatch rg-type-${node.type}" aria-hidden="true"></span>${ctx.esc(typeName(ctx, node))}${hidden}</p><h3 tabindex="-1" data-rg-details-title>${ctx.esc(nodeName(ctx, node))}</h3><p class="campaign-meta">${edges.length} ${edges.length === 1 ? ctx.t("collegamento visibile", "visible link") : ctx.t("collegamenti visibili", "visible links")}</p>${edges.length ? `<ul class="rg-conn-list">${edges.map((edge) => connectionRow(ctx, model, edge, node.id)).join("")}</ul>` : ""}<div class="rg-detail-actions"><button type="button" class="button primary" data-rg-open="${ctx.esc(node.id)}">${ctx.t("Apri la voce", "Open the entry")}</button>${model.compact ? "" : `<button type="button" class="button" data-rg-center="${ctx.esc(node.id)}">${ctx.t("Solo i suoi collegamenti", "Only its links")}</button>`}${dm && !model.compact && ["page", "actor"].includes(node.ref.kind) ? `<button type="button" class="button quiet" data-rg-add-from="${ctx.esc(node.id)}">${ctx.icon("plus")}<span>${ctx.t("Relazione da qui", "Relation from here")}</span></button>` : ""}</div>`;
}
function edgeHTML(ctx, model, edge) {
  const dm = isDM(ctx.state, ctx.role);
  const from = model.graph.nodes.find((n) => n.id === edge.from);
  const to = model.graph.nodes.find((n) => n.id === edge.to);
  const kind =
    edge.kind === "relation"
      ? ctx.t("Relazione", "Relation")
      : edge.kind === "mention"
        ? ctx.t("Collegamento [[ ]] scritto nel testo", "[[ ]] link written in the text")
        : ctx.label(RELATED_KIND[edge.sub]);
  let status = "";
  if (edge.secret && edge.kind === "relation")
    status = dm
      ? edge.revealed
        ? `<p><span class="badge rg-secret-badge">${ctx.t("Connessione segreta · rivelata a", "Secret connection · revealed to")}: ${ctx.esc(recipientsText(ctx, edge.reveal))}</span></p>`
        : `<p><span class="badge rg-secret-badge">${ctx.t("Connessione segreta · solo DM", "Secret connection · DM only")}</span></p>`
      : `<p><span class="badge rg-secret-badge">${ctx.t("Connessione segreta rivelata", "Secret connection revealed")}</span></p>`;
  if (edge.secret && edge.kind === "mention")
    status = `<p><span class="badge rg-secret-badge">${ctx.t("Scritto in un segreto non rivelato a tutti", "Written in a secret not revealed to everyone")}</span></p>`;
  const origin =
    edge.kind === "relation"
      ? ""
      : edge.kind === "mention"
        ? `<p class="campaign-meta">${ctx.esc(ctx.t(`Viene da un collegamento [[${nodeName(ctx, to)}]] scritto nel testo di «${nodeName(ctx, from)}». Il nome scritto senza [[ ]] non crea linee.`, `It comes from a [[${nodeName(ctx, to)}]] link written in the text of “${nodeName(ctx, from)}”. A name written without [[ ]] draws no line.`))}</p>`
        : `<p class="campaign-meta">${ctx.t("Viene da un campo della voce: si cambia modificando la voce.", "It comes from a field of the entry: change it by editing the entry.")}</p>`;
  const manage =
    dm && edge.kind === "relation"
      ? `${edge.secret ? `<button type="button" class="button" data-rg-reveal="${ctx.esc(edge.relationId)}">${edge.revealed ? ctx.t("Cambia a chi è rivelata", "Change who knows") : ctx.t("Rivela…", "Reveal…")}</button>${edge.revealed ? `<button type="button" class="button quiet" data-rg-hide="${ctx.esc(edge.relationId)}">${ctx.t("Nascondi di nuovo", "Hide again")}</button>` : ""}` : ""}<button type="button" class="button quiet" data-rg-remove="${ctx.esc(edge.relationId)}">${ctx.t("Rimuovi relazione", "Remove relation")}</button>`
      : "";
  const openButton = (node) => {
    const name = ctx.esc(short(nodeName(ctx, node), 28));
    return `<button type="button" class="button" data-rg-open="${ctx.esc(node.id)}">${ctx.t(`Apri «${name}»`, `Open “${name}”`)}</button>`;
  };
  return `<p class="rg-kicker">${ctx.esc(kind)}</p><h3 tabindex="-1" data-rg-details-title>${ctx.esc(nodeName(ctx, from))} <em>${ctx.esc(edgeLabel(ctx, edge))}</em> ${ctx.esc(nodeName(ctx, to))}</h3>${status}${origin}<div class="rg-detail-actions">${from ? openButton(from) : ""}${to ? openButton(to) : ""}${manage}</div>`;
}
export function detailsHTML(ctx, model, active = ui.active.get(model.key)) {
  if (active?.kind === "node") {
    const node = model.view.nodes.find((n) => n.id === active.id);
    if (node) return nodeHTML(ctx, model, node);
  }
  if (active?.kind === "edge") {
    const edge = model.view.edges.find((e) => e.id === active.id);
    if (edge) return edgeHTML(ctx, model, edge);
  }
  return summaryHTML(ctx, model);
}

// ---- The Relations part of the Archive: «Elenco | Grafo».

function switchHTML(ctx, prefs) {
  const button = (id, icon, it, en) =>
    `<button type="button" class="rg-switch-button ${prefs.view === id ? "active" : ""}" data-rg-view="${id}" aria-pressed="${prefs.view === id}">${ctx.icon(icon)}<span>${ctx.t(it, en)}</span></button>`;
  return `<div class="rg-switch" role="group" aria-label="${ctx.t("Mostra le relazioni come", "Show the relations as")}">${button("list", "menu", "Elenco", "List")}${button("graph", "grid", "Grafo", "Graph")}</div>`;
}
function controlsHTML(ctx, model) {
  const { prefs, graph, view } = model;
  const dm = isDM(ctx.state, ctx.role);
  const counts = new Map();
  for (const node of graph.nodes) counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
  const present = NODE_TYPES.filter((type) => counts.has(type.id));
  const focusOptions = [...graph.nodes]
    .sort((a, b) => nodeName(ctx, a).localeCompare(nodeName(ctx, b), ctx.lang))
    .map(
      (node) =>
        `<option value="${ctx.esc(node.id)}" ${node.id === view.focus ? "selected" : ""}>${ctx.esc(nodeName(ctx, node))} · ${ctx.esc(typeName(ctx, node))}</option>`,
    )
    .join("");
  const pinnedCount = Object.keys(model.pinned).length;
  return `<div class="rg-toolbar"><label class="field rg-field">${ctx.t("Mostra", "Show")}<select data-rg-mode>${MODES.map((mode) => `<option value="${mode.id}" ${mode.id === prefs.mode ? "selected" : ""}>${ctx.esc(ctx.label(mode.label))}</option>`).join("")}</select></label><label class="field rg-field">${ctx.t("Centra su", "Center on")}<select data-rg-focus><option value="">${ctx.t("Tutto il grafo", "The whole graph")}</option>${focusOptions}</select></label>${view.focus ? `<label class="field rg-field rg-depth"><span>${ctx.t("Profondità", "Depth")}: <output data-rg-depth-value>${prefs.depth}</output></span><input type="range" min="1" max="3" step="1" value="${prefs.depth}" data-rg-depth aria-valuetext="${prefs.depth}"></label>` : ""}<label class="field rg-field">${ctx.t("Evidenzia", "Highlight")}<input type="search" data-rg-query placeholder="${ctx.esc(ctx.t("Nome di una voce", "Name of an entry"))}" autocomplete="off"></label>${dm ? `<button type="button" class="button primary rg-add" data-rg-add>${ctx.icon("plus")}<span>${ctx.t("Aggiungi relazione", "Add relation")}</span></button>` : ""}</div><div class="rg-types" role="group" aria-label="${ctx.t("Tipi di voce: premi per nascondere o mostrare", "Entry types: press to hide or show")}">${present.map((type) => `<button type="button" class="rg-type" data-rg-type="${type.id}" aria-pressed="${!prefs.hidden.includes(type.id)}"><span class="rg-swatch rg-type-${type.id}" aria-hidden="true"></span>${ctx.esc(ctx.label(type.label))} <span class="rg-count">${counts.get(type.id)}</span></button>`).join("")}${prefs.hidden.length ? `<button type="button" class="button quiet" data-rg-types-all>${ctx.t("Mostra tutti i tipi", "Show every type")}</button>` : ""}</div><div class="rg-options"><label class="campaign-check"><input type="checkbox" data-rg-orphans ${prefs.orphans ? "checked" : ""}>${ctx.t("Voci senza collegamenti", "Entries without links")}</label><label class="campaign-check"><input type="checkbox" data-rg-labels ${prefs.labels ? "checked" : ""}>${ctx.t("Nomi delle relazioni sulle linee", "Relation names on the lines")}</label>${pinnedCount && model.editable ? `<button type="button" class="button quiet" data-rg-relayout>${ctx.t("Riordina automaticamente", "Arrange automatically")}</button>` : ""}${view.focus ? `<button type="button" class="button quiet" data-rg-unfocus>${ctx.t("Torna al grafo intero", "Back to the whole graph")}</button>` : ""}</div>`;
}
const legendHTML = (ctx, dm) =>
  `<ul class="rg-legend" aria-label="${ctx.t("Legenda delle linee", "Line legend")}"><li><span class="rg-line rg-line-relation" aria-hidden="true"></span>${ctx.t("Relazione", "Relation")}</li><li><span class="rg-line rg-line-related" aria-hidden="true"></span>${ctx.t("Voce collegata (committente, pagina superiore, elemento, collegamento)", "Related entry (quest giver, parent page, element, link)")}</li><li><span class="rg-line rg-line-mention" aria-hidden="true"></span>${ctx.t("Collegamento [[ ]] nel testo", "[[ ]] link in the text")}</li><li><span class="rg-line rg-line-secret" aria-hidden="true"></span>${dm ? ctx.t("Connessione segreta (solo DM finché non la riveli)", "Secret connection (DM only until revealed)") : ctx.t("Connessione segreta rivelata a te", "Secret connection revealed to you")}</li></ul>`;
function graphHTML(ctx, prefs) {
  const model = buildModel(ctx, prefs);
  const dm = isDM(ctx.state, ctx.role);
  const empty = !model.view.nodes.length;
  return `<div class="rg-graph" data-rg-graph><p class="campaign-meta rg-intro">${ctx.t("Le stesse relazioni dell’elenco, come grafo (Kanka, Obsidian). Vedi solo ciò che puoi leggere; nessuna linea viene dedotta dal testo.", "The same relations as the list, as a graph (Kanka, Obsidian). You only see what you can read; no line is inferred from text.")}</p>${controlsHTML(ctx, model)}${empty ? `<div class="campaign-empty rg-empty"><p>${ctx.t("Nessuna voce corrisponde ai filtri.", "No entry matches the filters.")}</p><button type="button" class="button" data-rg-reset-filters>${ctx.t("Azzera i filtri", "Clear the filters")}</button></div>` : `<div class="rg-stage"><div class="rg-board"><div class="rg-canvas">${graphSVG(ctx, model, "rg-main")}</div><div class="rg-canvas-bar"><p class="rg-hint">${ctx.t("Trascina lo sfondo per spostarti; per lo zoom usa i pulsanti + e − oppure Ctrl o Cmd e la rotella.", "Drag the background to move around; zoom with the + and − buttons, or Ctrl or Cmd and the wheel.")}</p><div class="rg-zoom" role="group" aria-label="${ctx.t("Zoom del grafo", "Graph zoom")}"><button type="button" class="rg-zoom-button" data-rg-zoom="in" aria-label="${ctx.t("Ingrandisci", "Zoom in")}" title="${ctx.t("Ingrandisci", "Zoom in")}">+</button><button type="button" class="rg-zoom-button" data-rg-zoom="out" aria-label="${ctx.t("Riduci", "Zoom out")}" title="${ctx.t("Riduci", "Zoom out")}">−</button><button type="button" class="rg-zoom-button rg-zoom-fit" data-rg-zoom="fit" aria-label="${ctx.t("Adatta alla vista", "Fit to view")}" title="${ctx.t("Adatta alla vista", "Fit to view")}">${ctx.icon("grid")}</button></div></div></div><aside class="rg-details" data-rg-details aria-label="${ctx.t("Dettagli del grafo", "Graph details")}">${detailsHTML(ctx, model)}</aside></div>`}${legendHTML(ctx, dm)}</div>`;
}
export function renderRelationsPart(ctx, arg) {
  const prefs = prefsFor(ctx);
  return `<div class="rg" data-rg-part>${switchHTML(ctx, prefs)}${prefs.view === "graph" ? graphHTML(ctx, prefs) : str(arg?.list)}</div>`;
}

// ---- Commands used by the handlers (exported for tests).

/** Opens the entry a node stands for: archive page, quest, sheet, Journal entry or scene. */
export function openNode(ctx, node) {
  if (!node?.open) return;
  if (node.open.archive) return openPage(ctx, node.open.archive);
  const { page, ...params } = node.open;
  ctx.navigate(page, params);
}
export function setView(ctx, view) {
  updatePrefs(ctx, { view: view === "graph" ? "graph" : "list" });
  ctx.render();
}
export function toggleType(ctx, type) {
  const prefs = prefsFor(ctx);
  const hidden = prefs.hidden.includes(type)
    ? prefs.hidden.filter((t) => t !== type)
    : [...prefs.hidden, type];
  updatePrefs(ctx, { hidden });
  ctx.render();
}
export function focusOn(ctx, nodeId, depth) {
  updatePrefs(ctx, { focus: nodeId || "", ...(depth ? { depth } : {}) });
  ui.active.delete(`main:${ctx.role}`);
  ctx.render();
}
/** Drops an entry at a board point: the whole visible board keeps its arrangement. */
export function dropNode(ctx, model, nodeId, point) {
  if (!model.editable) return false;
  const positions = {};
  for (const node of model.view.nodes) {
    const p = node.id === nodeId ? point : model.positions.get(node.id);
    if (p) positions[node.id] = toFraction(p, model.box);
  }
  change(
    ctx,
    ctx.t("Grafo: voce spostata", "Graph: entry moved"),
    (draft) => placeNodes(draft, ctx.role, positions, model.box.format),
    { local: true, visibility: "private" },
  );
  return true;
}
export function relayout(ctx, format = boxFor(false).format) {
  change(
    ctx,
    ctx.t("Grafo: riordinato automaticamente", "Graph: arranged automatically"),
    (draft) => resetLayout(draft, ctx.role, format),
    { local: true, visibility: "private" },
  );
}
// The endpoints a B43 relation accepts: readable archive pages and sheets. The list opens on
// an empty «Scegli una voce» (Kanka's relation form), so nothing is chosen silently.
const targetOptions = (ctx, selected) => {
  const rows = [
    ...listPages(ctx.state, ctx.role).map((page) => [`page:${page.id}`, page.title]),
    ...Object.values(ctx.state.actors ?? {})
      .filter((actor) => canViewActor(actor, ctx.role, ctx.state))
      .map((actor) => [
        `actor:${actor.id}`,
        `${textOf(actor.name, ctx.lang)} · ${ctx.t("scheda", "sheet")}`,
      ]),
  ];
  const chosen = rows.some(([value]) => value === selected);
  return `<option value=""${chosen ? "" : " selected"}>${ctx.t("Scegli una voce", "Choose an entry")}</option>${rows
    .map(
      ([value, label]) =>
        `<option value="${ctx.esc(value)}" ${value === selected ? "selected" : ""}>${ctx.esc(label)}</option>`,
    )
    .join("")}`;
};
/** The body of the DM's "+" dialog, starting from `from` when it is a valid endpoint. */
export function addDialogBody(ctx, from = "") {
  return `<label class="field">${ctx.t("Da", "From")}<select name="from" required>${targetOptions(ctx, from)}</select></label><label class="field">${ctx.t("Relazione", "Relation")}<input name="label" required maxlength="80" placeholder="${ctx.esc(ctx.t("es. deve un favore a", "e.g. owes a favour to"))}"></label><label class="field">${ctx.t("Con", "With")}<select name="to" required>${targetOptions(ctx, "")}</select></label><label class="campaign-check"><input type="checkbox" name="secret">${ctx.t("Connessione segreta (solo DM finché non la riveli)", "Secret connection (DM only until you reveal it)")}</label>`;
}
const parseRef = (value) => {
  const text = String(value ?? "");
  const split = text.indexOf(":");
  return split > 0 ? { kind: text.slice(0, split), id: text.slice(split + 1) } : null;
};
/** The DM's "+" (Kanka): a new relation between two readable entries, optionally secret. */
export function submitNewRelation(ctx, formData) {
  const id = change(ctx, ctx.t("Relazione aggiunta", "Relation added"), (draft) =>
    addRelation(draft, ctx.role, {
      from: parseRef(formData.get("from")),
      to: parseRef(formData.get("to")),
      label: String(formData.get("label") ?? ""),
      secret: formData.get("secret") === "on",
    }),
  );
  ui.active.set(`main:${ctx.role}`, { kind: "edge", id: "rel:" + id });
  ctx.render();
  return id;
}
function openAddDialog(ctx, from = "") {
  ctx.dialog(ctx.t("Aggiungi una relazione", "Add a relation"), addDialogBody(ctx, from), {
    submitLabel: ctx.t("Aggiungi relazione", "Add relation"),
    onSubmit: (formData) => {
      submitNewRelation(ctx, formData);
    },
  });
}
export function submitReveal(ctx, relationId, formData) {
  change(ctx, ctx.t("Connessione rivelata", "Connection revealed"), (draft) =>
    revealRelation(draft, ctx.role, relationId, readRecipients(formData)),
  );
}
function openRevealDialog(ctx, relationId) {
  const edge = collectGraph(ctx.state, ctx.role, { mode: "relations" }).edges.find(
    (e) => e.relationId === relationId,
  );
  if (!edge) return;
  const current =
    edge.reveal?.mode && edge.reveal.mode !== "none" ? edge.reveal : { mode: "all", actorIds: [] };
  ctx.dialog(
    ctx.t("Rivela la connessione segreta", "Reveal the secret connection"),
    recipientsFields(ctx, current, {
      allowNone: false,
      legend: ctx.t("A chi rivelarla", "Reveal it to"),
    }),
    {
      submitLabel: ctx.t("Rivela", "Reveal"),
      onSubmit: (formData) => submitReveal(ctx, relationId, formData),
    },
  );
}
export function hideConnection(ctx, relationId) {
  return attempt(ctx, () =>
    change(ctx, ctx.t("Connessione nascosta", "Connection hidden"), (draft) =>
      hideRelation(draft, ctx.role, relationId),
    ),
  );
}
export function removeConnection(ctx, relationId) {
  return attempt(ctx, () => {
    change(ctx, ctx.t("Relazione rimossa", "Relation removed"), (draft) =>
      removeRelation(draft, ctx.role, relationId),
    );
    ui.active.delete(`main:${ctx.role}`);
    ctx.toast(
      ctx.t(
        "Relazione rimossa. «Annulla ultima modifica» la rimette.",
        "Relation removed. “Undo last change” puts it back.",
      ),
    );
    ctx.render();
  });
}
/** Opens the Archive's Relations part as a graph, optionally centred on one entry. */
export function openGraph(ctx, focus = null) {
  updatePrefs(ctx, { view: "graph", ...(focus ? { focus, depth: 1 } : {}) });
  ui.active.delete(`main:${ctx.role}`);
  ctx.navigate("campaign", { tab: ARCHIVE, id: "relations" });
}

// ---- Binding

function bindCanvas(root, ctx, model) {
  const svg = root.querySelector("[data-rg-svg]");
  if (!svg || typeof svg.getBoundingClientRect !== "function") return;
  const { box } = model;
  const positions = new Map([...model.positions].map(([id, p]) => [id, { ...p }]));
  const view = ui.viewport.get(model.key) ?? { z: 1, cx: box.width / 2, cy: box.height / 2 };
  const details = root.querySelector("[data-rg-details]");
  const escape = globalThis.CSS?.escape ?? ((value) => String(value).replace(/["\\]/g, "\\$&"));
  const nodeEl = (id) => svg.querySelector(`[data-rg-node="${escape(id)}"]`);
  const setViewBox = () => {
    const w = box.width / view.z;
    const h = box.height / view.z;
    svg.setAttribute("viewBox", `${view.cx - w / 2} ${view.cy - h / 2} ${w} ${h}`);
    ui.viewport.set(model.key, { ...view });
    // Every node keeps a pointer target of at least 44 CSS pixels at any zoom (WCAG 2.5.8).
    const scale = (svg.getBoundingClientRect().width || box.width) / w;
    const r = Math.max(22, 22 / Math.max(0.01, scale));
    svg.querySelectorAll(".rg-node-hit").forEach((hit) => hit.setAttribute("r", String(r)));
  };
  const unitsPerPixel = () =>
    box.width / view.z / Math.max(1, svg.getBoundingClientRect().width || box.width);
  setViewBox();
  const redrawEdges = (id) => {
    svg.querySelectorAll(".rg-edge").forEach((g) => {
      if (id && g.dataset.from !== id && g.dataset.to !== id) return;
      const a = positions.get(g.dataset.from);
      const b = positions.get(g.dataset.to);
      const target = model.view.nodes.find((n) => n.id === g.dataset.to);
      const geo = edgeGeometry(a, b, Number(g.dataset.lane), nodeRadius(target?.degree));
      g.querySelectorAll("path").forEach((path) => path.setAttribute("d", geo.d));
      const text = g.querySelector("text");
      if (text) {
        text.setAttribute("x", String(geo.lx));
        text.setAttribute("y", String(geo.ly));
        text.classList.toggle("is-short", Math.hypot(b.x - a.x, b.y - a.y) < 160);
      }
    });
  };
  const light = (ids, edgeIds = null) => {
    svg.classList.toggle("is-dim", Boolean(ids));
    svg
      .querySelectorAll(".rg-node")
      .forEach((g) => g.classList.toggle("is-lit", Boolean(ids?.has(g.dataset.rgNode))));
    svg
      .querySelectorAll(".rg-edge")
      .forEach((g) =>
        g.classList.toggle(
          "is-lit",
          Boolean(
            edgeIds
              ? edgeIds.has(g.dataset.rgEdge)
              : ids?.has(g.dataset.from) && ids?.has(g.dataset.to),
          ),
        ),
      );
  };
  const neighbours = (id) => {
    const ids = new Set([id]);
    const edgeIds = new Set();
    for (const e of model.view.edges)
      if (e.from === id || e.to === id) {
        ids.add(e.from);
        ids.add(e.to);
        edgeIds.add(e.id);
      }
    return [ids, edgeIds];
  };
  const showDetails = (active, { focusTitle = false } = {}) => {
    if (active) ui.active.set(model.key, active);
    if (!details) return;
    details.innerHTML = detailsHTML(ctx, model);
    bindDetails(details, ctx, model);
    if (focusTitle) details.querySelector("[data-rg-details-title]")?.focus();
  };
  const preview = (id, options) => {
    const [ids, edgeIds] = neighbours(id);
    light(ids, edgeIds);
    if (!model.compact) showDetails({ kind: "node", id }, options);
  };
  // Hover intent: a passing pointer only highlights; the details change once it rests on the
  // entry, so crossing entries on the way to the details keeps what was selected there.
  let hoverTimer = null;
  const hoverPreview = (id) => {
    clearTimeout(hoverTimer);
    hoverTimer = null;
    const [ids, edgeIds] = neighbours(id);
    light(ids, edgeIds);
    if (model.compact) return;
    hoverTimer = setTimeout(() => {
      hoverTimer = null;
      if (svg.isConnected) showDetails({ kind: "node", id });
    }, PREVIEW_DELAY);
  };
  const cancelHover = () => {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  };
  const lightActive = () => {
    const active = ui.active.get(model.key);
    if (active?.kind === "edge") {
      const edge = model.view.edges.find((e) => e.id === active.id);
      if (edge) return light(new Set([edge.from, edge.to]), new Set([edge.id]));
    }
    light(null);
  };
  lightActive();
  const open = (id) =>
    openNode(
      ctx,
      model.view.nodes.find((n) => n.id === id),
    );
  let press = null;
  let moveTimer = null;
  // The commit re-renders at once: the entry to focus afterwards is set before it.
  const commitMove = (id, focusAfter = id) => {
    clearTimeout(moveTimer);
    moveTimer = null;
    ui.focus = focusAfter;
    attempt(ctx, () => dropNode(ctx, model, id, positions.get(id)));
  };
  const moveTo = (id, x, y) => {
    const p = {
      x: clampTo(x, MARGIN_X, box.width - MARGIN_X),
      y: clampTo(y, MARGIN_Y, box.height - MARGIN_Y - 16),
    };
    positions.set(id, p);
    nodeEl(id)?.setAttribute("transform", `translate(${p.x} ${p.y})`);
    redrawEdges(id);
  };
  svg.querySelectorAll("[data-rg-node]").forEach((g) => {
    const id = g.dataset.rgNode;
    g.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse" && !press) hoverPreview(id);
    });
    g.addEventListener("pointerleave", (event) => {
      if (event.pointerType !== "mouse" || press) return;
      cancelHover();
      lightActive();
    });
    g.addEventListener("focus", () => preview(id));
    g.addEventListener("blur", (event) => {
      if (moveTimer) {
        // The arrangement is saved when the entry loses the focus; the focus then goes on
        // to where it was heading (another entry) after the re-render.
        commitMove(id, event.relatedTarget?.dataset?.rgNode ?? null);
        return;
      }
      lightActive();
    });
    g.addEventListener("contextmenu", (event) => event.preventDefault());
    // Browsers apply touch-action only to the board: while an entry is pressed its finger
    // moves it instead of scrolling the page (the board background still scrolls).
    g.addEventListener(
      "touchmove",
      (event) => {
        if (press?.id === id && event.cancelable) event.preventDefault();
      },
      { passive: false },
    );
    g.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      const start = positions.get(id);
      press = {
        id,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        start: { ...start },
        dragged: false,
        long: false,
        timer:
          event.pointerType === "mouse"
            ? null
            : setTimeout(() => {
                if (press && !press.dragged) {
                  press.long = true;
                  preview(id);
                }
              }, 500),
      };
      capture(g, event.pointerId);
    });
    g.addEventListener("pointermove", (event) => {
      if (!press || press.id !== id || press.pointerId !== event.pointerId) return;
      const dx = event.clientX - press.x;
      const dy = event.clientY - press.y;
      if (!press.dragged && Math.hypot(dx, dy) < 6) return;
      if (!press.dragged) {
        press.dragged = true;
        clearTimeout(press.timer);
        if (!model.editable) return;
        g.classList.add("is-dragging");
      }
      if (!model.editable) return;
      const unit = unitsPerPixel();
      moveTo(id, press.start.x + dx * unit, press.start.y + dy * unit);
    });
    const finish = (event, cancelled) => {
      if (!press || press.id !== id) return;
      clearTimeout(press.timer);
      capture(g, event.pointerId, false);
      g.classList.remove("is-dragging");
      const done = press;
      press = null;
      g.dataset.rgSuppress = done.dragged || done.long ? "1" : "";
      if (cancelled && done.dragged) moveTo(id, done.start.x, done.start.y);
      else if (done.dragged && model.editable) commitMove(id);
      // A long press shows the preview where it can be read: on a phone the details sit
      // below the board, so the focus moves to them (as a tapped line does) once the finger
      // is lifted and the browser's compatibility click has passed.
      else if (done.long && !cancelled && !model.compact)
        setTimeout(() => {
          if (svg.isConnected) showDetails({ kind: "node", id }, { focusTitle: true });
        }, 0);
    };
    g.addEventListener("pointerup", (event) => finish(event, false));
    g.addEventListener("pointercancel", (event) => finish(event, true));
    g.addEventListener("click", (event) => {
      event.stopPropagation();
      if (g.dataset.rgSuppress === "1") {
        g.dataset.rgSuppress = "";
        return;
      }
      open(id);
    });
    g.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (moveTimer) commitMove(id);
        else open(id);
        return;
      }
      const step = event.shiftKey ? 40 : 10;
      const delta = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      }[event.key];
      if (!delta || !model.editable || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const p = positions.get(id);
      moveTo(id, p.x + delta[0], p.y + delta[1]);
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => commitMove(id), 700);
    });
  });
  svg.querySelectorAll("[data-rg-edge]").forEach((g) => {
    g.querySelector(".rg-edge-hit")?.addEventListener("click", (event) => {
      event.stopPropagation();
      if (model.compact) return;
      const id = g.dataset.rgEdge;
      showDetails({ kind: "edge", id }, { focusTitle: true });
      lightActive();
    });
  });
  // Pan by dragging the background (Obsidian); Ctrl/Cmd + wheel or pinch zooms.
  let pan = null;
  svg.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest?.("[data-rg-node], .rg-edge-hit")) return;
    pan = { x: event.clientX, y: event.clientY, cx: view.cx, cy: view.cy, id: event.pointerId };
    capture(svg, event.pointerId);
    svg.classList.add("is-panning");
  });
  svg.addEventListener("pointermove", (event) => {
    if (!pan || pan.id !== event.pointerId) return;
    const unit = unitsPerPixel();
    view.cx = pan.cx - (event.clientX - pan.x) * unit;
    view.cy = pan.cy - (event.clientY - pan.y) * unit;
    setViewBox();
  });
  const endPan = (event) => {
    if (!pan || pan.id !== event.pointerId) return;
    pan = null;
    capture(svg, event.pointerId, false);
    svg.classList.remove("is-panning");
  };
  svg.addEventListener("pointerup", endPan);
  svg.addEventListener("pointercancel", endPan);
  const zoom = (factor) => {
    view.z = Math.min(4, Math.max(0.5, view.z * factor));
    setViewBox();
  };
  svg.addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15);
    },
    { passive: false },
  );
  root.querySelectorAll("[data-rg-zoom]").forEach((button) => {
    button.onclick = () => {
      const how = button.dataset.rgZoom;
      if (how === "fit") {
        Object.assign(view, { z: 1, cx: box.width / 2, cy: box.height / 2 });
        setViewBox();
      } else zoom(how === "in" ? 1.25 : 0.8);
    };
  });
  // Highlight by name (Obsidian groups coloured by a search): nothing is filtered away.
  root.querySelectorAll("[data-rg-query]").forEach((input) => {
    input.oninput = () => {
      const query = input.value.trim().toLocaleLowerCase("it");
      svg.classList.toggle("is-searching", Boolean(query));
      model.view.nodes.forEach((node) =>
        nodeEl(node.id)?.classList.toggle(
          "is-match",
          Boolean(query) && nodeName(ctx, node).toLocaleLowerCase("it").includes(query),
        ),
      );
    };
  });
  if (details) bindDetails(details, ctx, model);
  if (ui.focus) {
    const target = nodeEl(ui.focus);
    ui.focus = null;
    target?.focus({ preventScroll: true });
  }
}
function bindDetails(el, ctx, model) {
  el.querySelectorAll("[data-rg-open]").forEach((button) => {
    button.onclick = () =>
      openNode(
        ctx,
        model.graph.nodes.find((n) => n.id === button.dataset.rgOpen),
      );
  });
  el.querySelectorAll("[data-rg-center]").forEach((button) => {
    button.onclick = () => focusOn(ctx, button.dataset.rgCenter, 1);
  });
  el.querySelectorAll("[data-rg-select-edge]").forEach((button) => {
    button.onclick = () => {
      ui.active.set(model.key, { kind: "edge", id: button.dataset.rgSelectEdge });
      el.innerHTML = detailsHTML(ctx, model);
      bindDetails(el, ctx, model);
      el.querySelector("[data-rg-details-title]")?.focus();
    };
  });
  el.querySelectorAll("[data-rg-add-from]").forEach((button) => {
    button.onclick = () => openAddDialog(ctx, button.dataset.rgAddFrom);
  });
  el.querySelectorAll("[data-rg-reveal]").forEach((button) => {
    button.onclick = () => openRevealDialog(ctx, button.dataset.rgReveal);
  });
  el.querySelectorAll("[data-rg-hide]").forEach((button) => {
    button.onclick = () => hideConnection(ctx, button.dataset.rgHide);
  });
  el.querySelectorAll("[data-rg-remove]").forEach((button) => {
    button.onclick = () => removeConnection(ctx, button.dataset.rgRemove);
  });
}
let phoneQuery = null;
export function bindRelationsPart(el, ctx) {
  ui.ctx = ctx;
  el.querySelectorAll("[data-rg-view]").forEach((button) => {
    button.onclick = () => setView(ctx, button.dataset.rgView);
  });
  const graph = el.querySelector("[data-rg-graph]");
  if (!graph) return;
  const model = ui.models.get(`main:${ctx.role}`) ?? buildModel(ctx, prefsFor(ctx));
  graph.querySelectorAll("[data-rg-mode]").forEach((select) => {
    select.onchange = () => {
      updatePrefs(ctx, { mode: select.value });
      ctx.render();
    };
  });
  graph.querySelectorAll("[data-rg-focus]").forEach((select) => {
    select.onchange = () => focusOn(ctx, select.value);
  });
  graph.querySelectorAll("[data-rg-depth]").forEach((input) => {
    input.oninput = () => {
      const out = graph.querySelector("[data-rg-depth-value]");
      if (out) out.textContent = input.value;
    };
    input.onchange = () => {
      updatePrefs(ctx, { depth: Number(input.value) });
      ctx.render();
    };
  });
  graph.querySelectorAll("[data-rg-type]").forEach((button) => {
    button.onclick = () => toggleType(ctx, button.dataset.rgType);
  });
  graph.querySelectorAll("[data-rg-types-all]").forEach((button) => {
    button.onclick = () => {
      updatePrefs(ctx, { hidden: [] });
      ctx.render();
    };
  });
  graph.querySelectorAll("[data-rg-reset-filters]").forEach((button) => {
    button.onclick = () => {
      updatePrefs(ctx, { hidden: [], orphans: true, focus: "" });
      ctx.render();
    };
  });
  graph.querySelectorAll("[data-rg-orphans]").forEach((input) => {
    input.onchange = () => {
      updatePrefs(ctx, { orphans: input.checked });
      ctx.render();
    };
  });
  graph.querySelectorAll("[data-rg-labels]").forEach((input) => {
    input.onchange = () => {
      updatePrefs(ctx, { labels: input.checked });
      ctx.render();
    };
  });
  graph.querySelectorAll("[data-rg-unfocus]").forEach((button) => {
    button.onclick = () => focusOn(ctx, "");
  });
  graph.querySelectorAll("[data-rg-relayout]").forEach((button) => {
    button.onclick = () => attempt(ctx, () => relayout(ctx));
  });
  graph.querySelectorAll("[data-rg-add]").forEach((button) => {
    button.onclick = () => {
      const active = ui.active.get(model.key);
      openAddDialog(ctx, active?.kind === "node" ? active.id : "");
    };
  });
  bindCanvas(graph, ctx, model);
  // Crossing the phone width lays the board out again for the new box.
  if (!phoneQuery && globalThis.matchMedia) {
    phoneQuery = globalThis.matchMedia("(max-width: 720px)");
    phoneQuery.addEventListener?.("change", () => {
      if (globalThis.document?.querySelector("[data-rg-graph], [data-rg-local]")) ui.ctx?.render();
    });
  }
}

// ---- Local graph panel of one entry (Kanka "View web" of an entity, Obsidian local graph):
// on a Journal/World entry page and on an archive page (person, organization, quest…).

const LOCAL_PREFS = { mode: "mentions", hidden: [], orphans: true, labels: true, depth: 1 };
/** The readable neighbourhood (depth 1) of one node, or null when it has no readable link. */
export function localGraph(ctx, focus) {
  const view = viewGraph(collectGraph(ctx.state, ctx.role, { mode: "mentions" }), {
    ...LOCAL_PREFS,
    focus,
  });
  return view.focus && view.edges.length ? view : null;
}
export function entryGraph(ctx, entry) {
  if (!entry?.id || typeof entry.kind !== "string") return null;
  return localGraph(ctx, `entry:${entry.id}`);
}
function localPanel(ctx, focus, { tag, sectionClass, anchor }) {
  const model = buildModel(
    ctx,
    { ...DEFAULT_PREFS, ...LOCAL_PREFS, focus },
    { compact: true, key: `local:${focus}` },
  );
  return `<section class="${sectionClass} rg-entry" ${anchor} data-rg-local="${ctx.esc(focus)}"><${tag}>${ctx.t("Nel grafo delle relazioni", "In the relationship graph")}</${tag}><p class="campaign-meta">${ctx.t("Le voci collegate a questa che puoi leggere. Clic su una voce per aprirla.", "The entries linked to this one that you can read. Click an entry to open it.")}</p><div class="rg-canvas rg-canvas-compact">${graphSVG(ctx, model, "rg-entry")}</div><div class="campaign-toolbar"><button type="button" class="button" data-rg-open-graph="${ctx.esc(focus)}">${ctx.icon("grid")}<span>${ctx.t("Apri nel grafo delle relazioni", "Open in the relationship graph")}</span></button></div></section>`;
}
export function renderEntryPanel(ctx, entry) {
  return localPanel(ctx, `entry:${entry.id}`, {
    tag: "h2",
    sectionClass: "campaign-links",
    anchor: `data-rg-entry="${ctx.esc(entry.id)}"`,
  });
}
/** An archive page's panel, after its B43 Relations panel (hook ".archive-page"). */
export function renderPagePanel(ctx, page) {
  return localPanel(ctx, `page:${page.id}`, {
    tag: "h3",
    sectionClass: "jp-panel",
    anchor: `data-rg-page="${ctx.esc(page.id)}"`,
  });
}
export function bindEntryPanel(el, ctx) {
  ui.ctx = ctx;
  const box = el.querySelector("[data-rg-local]");
  if (!box) return;
  const model = ui.models.get(`local:${box.dataset.rgLocal}:${ctx.role}`);
  if (model) bindCanvas(box, ctx, model);
  box.querySelectorAll("[data-rg-open-graph]").forEach((button) => {
    button.onclick = () => openGraph(ctx, button.dataset.rgOpenGraph);
  });
}

// ---------------------------------------------------------------------------------------
// Registration

export function register(registry) {
  const member = (ctx) => Boolean(ctx?.state?.campaign?.id) && isMember(ctx.state, ctx.role);
  registry.registerStateSlice(ID, {
    version: VERSION,
    // Snapshot Undo: "Annulla ultima modifica" puts a moved entry back.
    seed: seedGraphState,
    normalize: normalizeGraphState,
  });
  registry.registerStyles(new URL("./relations-graph.css", import.meta.url));
  // The Relations part of the B43 Archive (".relations" block): «Elenco | Grafo». Hidden
  // from the campaign sidebar, which lists sections without an argument.
  registry.add("campaign-section", {
    id: `${ID}.relations`,
    label: L("Grafo delle relazioni", "Relationship graph"),
    when: (ctx, arg) => arg?.kind === "relations" && member(ctx),
    render: (ctx, arg) => renderRelationsPart(ctx, arg),
    bind: (el, ctx) => bindRelationsPart(el, ctx),
  });
  // A World/Journal entry page: its local graph, when it has at least one readable link.
  registry.add("campaign-section", {
    id: `${ID}.entry`,
    label: L("Nel grafo delle relazioni", "In the relationship graph"),
    when: (ctx, entry) =>
      Boolean(entry?.id) &&
      typeof entry.kind === "string" &&
      Boolean(entry.data) &&
      member(ctx) &&
      Boolean(entryGraph(ctx, entry)),
    render: (ctx, entry) => renderEntryPanel(ctx, entry),
    bind: (el, ctx) => bindEntryPanel(el, ctx),
  });
  // An archive page (B43): its local graph after its Relations panel, when it has a
  // readable link (".archive-page" block of journal-plus.mjs).
  registry.add("campaign-section", {
    id: `${ID}.archive-page`,
    label: L("Nel grafo delle relazioni", "In the relationship graph"),
    when: (ctx, arg) =>
      arg?.kind === "archive-page" &&
      typeof arg.page?.id === "string" &&
      member(ctx) &&
      Boolean(localGraph(ctx, `page:${arg.page.id}`)),
    render: (ctx, arg) => renderPagePanel(ctx, arg.page),
    bind: (el, ctx) => bindEntryPanel(el, ctx),
  });
  registry.add("command", {
    id: `${ID}.open`,
    label: L("Apri il grafo delle relazioni", "Open the relationship graph"),
    context: "global",
    when: (ctx) => member(ctx) && Boolean(registry.get("campaign-section", ARCHIVE, ctx)),
    run: (ctx) => openGraph(ctx),
  });
  registry.on("reset", () => {
    clearPrefs(deviceStorage());
    ui.active.clear();
    ui.viewport.clear();
    ui.models.clear();
  });
}
