const plans = new Map();
const key = (ctx, id) => [ctx.role, ctx.state.activeSceneId, id].join(":");
export const pathDraft = (ctx, id) => plans.get(key(ctx, id)) || [];
export function setPathDraft(ctx, id, points) {
  plans.set(
    key(ctx, id),
    points.map((p) => ({ x: p.x, y: p.y })),
  );
}
export function clearPathDraft(ctx, id) {
  plans.delete(key(ctx, id));
}
export function resetPathDrafts() {
  plans.clear();
}
// Segment cost is drawn by its multiplier: ×1 normal, ×2 (difficult terrain or crawling)
// warmer and thicker, ×3 (crawling over difficult terrain) its own darker, dotted stroke.
function segmentStyle(v, s) {
  if (v.blocked || !s.reachable)
    return { stroke: "#f29b99", width: 4, dash: "9 7", cost: "blocked" };
  if (s.multiplier >= 3) return { stroke: "#d9773f", width: 7, dash: "2 5", cost: "x3" };
  if (s.multiplier >= 2) return { stroke: "#ecad72", width: 6, dash: "", cost: "x2" };
  return { stroke: "#e2c17b", width: 4, dash: "", cost: "x1" };
}
export function renderMovementPath(v) {
  if (!v) return "";
  return (
    (v.segments || [])
      .map((s) => {
        const style = segmentStyle(v, s);
        return `<path d="M${s.from.x} ${s.from.y} L${s.to.x} ${s.to.y}" data-path-cost="${style.cost}" stroke="${style.stroke}" stroke-width="${style.width}" ${style.dash ? `stroke-dasharray="${style.dash}" stroke-linecap="round"` : ""} fill="none"/>`;
      })
      .join("") +
    (!v.blocked
      ? `<circle cx="${v.end.x}" cy="${v.end.y}" r="23" fill="#e2c17b" fill-opacity=".15" stroke="#e2c17b" stroke-width="2" stroke-dasharray="4 4"/>`
      : "")
  );
}
export function renderPathMarkers(points) {
  return points
    .map(
      (p, i) =>
        `<g transform="translate(${p.x} ${p.y})"><circle r="11" fill="#142733" stroke="#e2c17b" stroke-width="2"/><text y="4" text-anchor="middle" fill="#f4e4bf" font-size="12">${i + 1}</text></g>`,
    )
    .join("");
}
export function renderPathControls(ctx, actorId, active) {
  if (!active) return "";
  const { t } = ctx,
    points = pathDraft(ctx, actorId);
  return `<section class="path-planner" aria-label="${t("Percorso privato", "Private path")}"><strong>${t("Pianifica percorso", "Plan path")}</strong><p>${t("Clicca i punti intermedi e la destinazione. Frecce e Invio aggiungono un punto. Nessun movimento finché non esegui.", "Click waypoints and the destination. Arrow keys and Enter add a point. No movement until you execute.")}</p><ol>${points.map((p, i) => `<li><button class="text-button" data-path-edit="${i}">${t("Punto", "Point")} ${i + 1} · ${Math.round(p.x)}, ${Math.round(p.y)}</button><button class="text-button" data-path-remove="${i}" aria-label="${t("Elimina punto", "Delete point")} ${i + 1}">×</button></li>`).join("")}</ol><div class="toolbar"><button class="button primary" data-path-execute ${points.length ? "" : 'disabled aria-describedby="path-execute-why"'}>${t("Esegui percorso", "Execute path")}</button><button class="button" data-path-cancel>${t("Annulla percorso", "Cancel path")}</button></div>${points.length ? "" : `<p class="muted" id="path-execute-why">${t("Nessun punto ancora: clicca sulla mappa la destinazione, poi Esegui.", "No point yet: click the destination on the map, then Execute.")}</p>`}</section>`;
}
/**
 * P6 TV-77: a warning mark where the path leaves an enemy's reach (BG3 path warning): crossed
 * swords in a red ring, with the enemy's name for assistive technology and the hover tooltip.
 */
export function renderOpportunityMarks(marks, ctx) {
  return (marks ?? [])
    .map(
      (mark) =>
        `<g class="path-oa-mark" data-path-oa="${ctx.esc(mark.actorId)}" transform="translate(${mark.x} ${mark.y})"><title>${ctx.esc(ctx.t("Attacco di opportunità: ", "Opportunity attack: ") + mark.name)}</title><circle r="13" fill="#5b1f22" stroke="#f29b99" stroke-width="2"/><path d="M-6 -6 L6 6 M6 -6 L-6 6 M-7 2 L-2 7 M7 2 L2 7" stroke="#f4e4bf" stroke-width="2" stroke-linecap="round" fill="none"/></g>`,
    )
    .join("");
}
