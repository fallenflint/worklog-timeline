/* Auto-layout tests. Run: node --test tests/
 * No dependencies: a tiny stub stands in for the "obsidian" module. */
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const realLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === "obsidian") {
    class Base {}
    return { Plugin: Base, Notice: Base, PluginSettingTab: Base, Setting: Base, ItemView: Base, Modal: Base, getLanguage: () => "en" };
  }
  return realLoad.call(this, request, ...rest);
};
globalThis.window = { localStorage: { getItem: () => null } };
const { core } = require("../main.js");
const { analyze, planLayout, planRealign, isNewChild, arrowHits } = core;

const GAP = 20;

/* ---------- canvas builder ---------- */
function canvas() {
  const nodes = [], edges = [];
  const api = {
    card(id, x, y, opts = {}) {
      nodes.push({ id, type: "text", text: opts.text || id, x, y, width: opts.w || 250, height: opts.h || 60, color: opts.done ? "4" : undefined });
      return api;
    },
    arrow(from, to) { edges.push({ id: from + ">" + to, fromNode: from, toNode: to }); return api; },
    band(id, y) { nodes.push({ id: "wl-band-" + id, type: "text", text: id, x: -5000, y, width: 10000, height: 60 }); return api; },
    data: () => ({ nodes, edges }),
  };
  return api;
}

const analyzeOf = (data) => analyze(data, new Map(), {});

/* Apply moves and check the invariants. Returns the moved canvas nodes by id. */
function check(data, moves, { newId, parentId } = {}) {
  const a = analyzeOf(data);
  const front = new Set(a.active.filter((n) => (a.parents.get(n.id) || []).length).map((n) => n.id));
  if (newId) front.add(newId);
  const after = new Map(data.nodes.map((n) => [n.id, Object.assign({}, n, moves[n.id] || {})]));
  const real = [...after.values()].filter((n) => !n.id.startsWith("wl-band-") && n.type !== "group");

  // 1. Only front cards (and the new card) move.
  for (const id of Object.keys(moves)) assert.ok(front.has(id), `non-front card moved: ${id}`);

  // 2. A moved card never overlaps another card.
  const overlap = (p, q) => p.x < q.x + q.width && p.x + p.width > q.x && p.y < q.y + q.height && p.y + p.height > q.y;
  for (const id of Object.keys(moves)) {
    const m = after.get(id);
    for (const o of real) if (o.id !== id) assert.ok(!overlap(m, o), `${id} overlaps ${o.id}`);
  }

  // 3. The new card's arrow doesn't run through a card that isn't front.
  if (newId && parentId) {
    const obstacles = real.filter((n) => !front.has(n.id) && n.id !== parentId);
    assert.ok(!arrowHits(after.get(parentId), after.get(newId), obstacles, 0), `arrow ${parentId}→${newId} crosses a card`);
  }
  return after;
}

/* ---------- reported bugs ---------- */
test("new card under a finished project doesn't land in a foreign project's column", () => {
  // Project A ends with done "phase0". Next day an unrelated project "win" sits right under it.
  const c = canvas()
    .card("A", -3005, 6120).card("design", -3005, 6200).card("phase0", -3005, 6440, { done: true })
    .arrow("A", "design").arrow("design", "phase0")
    .band("2026-11-16", 6740)
    .card("win", -3005, 6880, { h: 191 }).card("healed", -3005, 7091, { done: true }).arrow("win", "healed")
    .card("W", -2705, 6880).card("edits", -2435, 7181, { h: 201 }).arrow("W", "edits")
    // the new card, dropped somewhere below
    .card("review", -3005, 7300).arrow("phase0", "review");
  const data = c.data();
  const moves = planLayout(analyzeOf(data), "review", "phase0", GAP, 6820);
  const after = check(data, moves, { newId: "review", parentId: "phase0" });
  const r = after.get("review");
  assert.equal(r.y, 7181, "joins the front row");
  assert.ok(r.x + r.width <= -3005 || r.x >= -2755, "not in the column of win/healed");
});

test("new card skips a foreign root sitting under its parent, foreign root stays put", () => {
  const c = canvas()
    .card("P", -2705, 6340).card("release", -2705, 6440, { done: true }).arrow("P", "release")
    .card("win", -3005, 6880, { h: 191 }).card("healed", -3005, 7091, { done: true }).arrow("win", "healed")
    .card("W", -2705, 6880).card("edits", -2435, 7181, { h: 201 }).arrow("W", "edits")
    .card("new", -2705, 7181).arrow("release", "new");
  const data = c.data();
  const moves = planLayout(analyzeOf(data), "new", "release", GAP, 6820);
  assert.equal(moves.W, undefined, "foreign root is never moved");
  check(data, moves, { newId: "new", parentId: "release" });
});

/* ---------- regular behavior ---------- */
test("an only child is centered under its parent at the front row", () => {
  const c = canvas().card("R", 0, 0).card("c", 300, 400).arrow("R", "c");
  const data = c.data();
  const moves = planLayout(analyzeOf(data), "c", "R", GAP);
  const after = check(data, moves, { newId: "c", parentId: "R" });
  assert.deepEqual([after.get("c").x, after.get("c").y], [0, 80]);
});

test("open sibling leaves line up centered with the new card", () => {
  const c = canvas().card("R", 0, 0).card("s1", -400, 80).card("s2", 400, 80).card("c", 0, 300)
    .arrow("R", "s1").arrow("R", "s2").arrow("R", "c");
  const data = c.data();
  const moves = planLayout(analyzeOf(data), "c", "R", GAP);
  const after = check(data, moves, { newId: "c", parentId: "R" });
  const xs = ["s1", "s2", "c"].map((id) => after.get(id).x);
  assert.deepEqual(xs, [-270, 0, 270]);
});

test("a done sibling is not dragged into the row", () => {
  const c = canvas().card("R", 0, 0).card("d", 0, 80, { done: true }).card("c", 0, 300)
    .arrow("R", "d").arrow("R", "c");
  const data = c.data();
  const moves = planLayout(analyzeOf(data), "c", "R", GAP);
  assert.equal(moves.d, undefined);
  check(data, moves, { newId: "c", parentId: "R" });
});

test("a front card brought down to the row slides off a card it would land on", () => {
  // Project X has a leaf at y=80; project Y's leaf is deeper (y=400). A new X card pulls the
  // row to 400, where a done card of project Z already sits under X's leaf.
  const c = canvas()
    .card("X", 0, 0).card("x1", 0, 80).arrow("X", "x1")
    .card("Y", 1000, 0).card("y1", 1000, 80, { done: true }).card("y2", 1000, 400).arrow("Y", "y1").arrow("y1", "y2")
    .card("Z", 0, 300, { done: true, text: "✅ Z" }).card("z1", 0, 400, { done: true }).arrow("Z", "z1")
    .card("x2", 300, 500).arrow("x1", "x2");
  const data = c.data();
  const moves = planLayout(analyzeOf(data), "x2", "x1", GAP);
  check(data, moves, { newId: "x2", parentId: "x1" });
});

test("dragging a front card lines up the row without landing on other cards", () => {
  const c = canvas()
    .card("A", 0, 0).card("a1", 0, 300).arrow("A", "a1")
    .card("B", 300, 0).card("b1", 300, 80).arrow("B", "b1")
    .card("C", 570, 0).card("c1", 570, 80, { done: true }).card("c2", 570, 160, { done: true }).card("c3", 570, 300, { done: true })
    .arrow("C", "c1").arrow("c1", "c2").arrow("c2", "c3");
  const data = c.data();
  const moves = planRealign(analyzeOf(data), "a1", GAP);
  const after = check(data, moves);
  assert.equal(after.get("b1").y, 300);
});

/* ---------- when layout runs at all ---------- */
test("layout runs only for a card just pulled out of an older card", () => {
  const c = canvas().card("p", 0, 0).card("q", 0, 300).arrow("p", "q");
  const a = analyzeOf(c.data());
  const e = c.data().edges[0];
  const now = 1e12;
  assert.equal(isNewChild(e, a, { p: now - 60000, q: now }, now), true, "drag-out");
  assert.equal(isNewChild(e, a, { p: now, q: now }, now), false, "pasted or synced pair");
  assert.equal(isNewChild(e, a, { p: 0, q: now - 600000 }, now), false, "arrow between two old cards");
  assert.equal(isNewChild(e, a, { p: 0, q: 0 }, now), false, "cards from before the plugin");
});

/* ---------- random canvases: invariants 1 and 2 always hold ---------- */
test("random canvases keep the invariants", () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let round = 0; round < 300; round++) {
    const c = canvas();
    const ids = [];
    const nCards = 6 + Math.floor(rnd() * 14);
    for (let i = 0; i < nCards; i++) {
      // a loose grid of cards, mostly not overlapping
      const id = "n" + i;
      c.card(id, Math.round(rnd() * 8) * 270 - 1000, Math.round(rnd() * 10) * 100, { done: rnd() < 0.3, h: rnd() < 0.2 ? 160 : 60 });
      ids.push(id);
    }
    for (let i = 1; i < nCards; i++) if (rnd() < 0.7) c.arrow(ids[Math.floor(rnd() * i)], ids[i]);
    const data = c.data();
    // drop overlapping starts: the invariant is about what layout does, not the input
    const clash = (p, q) => p.x < q.x + q.width && p.x + p.width > q.x && p.y < q.y + q.height && p.y + p.height > q.y;
    data.nodes = data.nodes.filter((n, i) => !data.nodes.slice(0, i).some((m) => clash(m, n)));
    const keep = new Set(data.nodes.map((n) => n.id));
    data.edges = data.edges.filter((e) => keep.has(e.fromNode) && keep.has(e.toNode));
    const a = analyzeOf(data);
    for (const e of data.edges) {
      if (a.children.has(e.toNode) || a.parents.get(e.toNode).length !== 1 || !a.activeIds.has(e.toNode)) continue;
      check(data, planLayout(a, e.toNode, e.fromNode, GAP), { newId: e.toNode }); // a dense random canvas may have no clear path for the arrow
    }
    for (const n of a.active) check(data, planRealign(a, n.id, GAP));
  }
});
