/* Worklog Timeline: date bands, card creation stamps, project labels, an open-branch counter,
 * a "done / cancelled / pause" card menu, auto-layout of new cards and a projects panel.
 * No build step: plain CommonJS. Parts of the Canvas API are undocumented, so every call
 * into it is guarded. */
const obsidian = require("obsidian");
const { Plugin, Notice, PluginSettingTab, Setting, ItemView } = obsidian;

/* ---------- i18n ----------
 * English is the base. Add a language by adding a table with the same keys;
 * missing keys fall back to English. */
const STRINGS = {
  en: {
    cmdBand: "Add today's date band at screen center",
    cmdHighlight: "Highlight open branches",
    cmdPanel: "Open projects panel",
    cmdStamps: "Toggle creation dates on all cards",
    openCanvas: "Open a canvas first.",
    emptyCanvas: "The canvas is empty.",
    noProject: "no project",
    noParent: "This card has no parent to lay out under.",
    status: "In progress: {count} / {limit}",
    statusPaused: "In paused projects: {n}",
    statusHint: "The second number is your comfort limit.\nClick to highlight open branches.",
    highlighted: "Open branches highlighted: {n}. Click again to clear.",
    menuDone: "Done ✅",
    menuCancel: "Cancelled ❌",
    menuPause: "Pause project “{name}”",
    menuResume: "Resume project “{name}”",
    menuLayout: "Lay out under parent",
    menuPauseTask: "Pause task",
    menuResumeTask: "Resume task",
    tasksPaused: "Tasks paused: {n}",
    tasksResumed: "Tasks resumed: {n}",
    pausedTasks: "paused · {n}",
    openTasks: "open · {n}",
    btnPauseTask: "Pause task",
    resumed: "“{name}” is back in progress",
    paused: "“{name}” paused",
    cardNotFound: "Card not found.",
    panelTitle: "Projects",
    panelEmpty: "Open a canvas to see its projects here.",
    secWorking: "In progress",
    secPaused: "Paused",
    secSleeping: "Dormant",
    toLast: "Go to the latest card",
    btnResume: "Resume",
    btnPause: "Pause",
    root: "root:",
    roots: "roots:",
    rootN: "root {n}",
    setLimit: "Open branch comfort limit",
    setLimitDesc: "The second number in the counter. Above it, the counter turns orange with ⚠.",
    setLayout: "Auto-layout new cards",
    setLayoutDesc: "A new card moves under its parent and all open branches line up in one row.",
    setStamps: "Show creation dates on all cards",
    setStampsDesc: "Otherwise a date shows only on hover.",
    setProjects: "Project labels",
    setProjectsDesc: "A colored stripe left of each card and a project tag under open branches.",
    setAliases: "Project aliases",
    setAliasesDesc: "One rule per line: “Eve6 Demo = Eve6”. Left: a root's name. Right: the project it counts as.",
  },
  ru: {
    cmdBand: "Рубеж «сегодня» в центре экрана",
    cmdHighlight: "Подсветить открытые ветки",
    cmdPanel: "Панель проектов",
    cmdStamps: "Показывать даты всех карточек",
    openCanvas: "Открой канвас.",
    emptyCanvas: "На канвасе пока пусто.",
    noProject: "без проекта",
    noParent: "У карточки нет родителя — раскладывать не от чего.",
    status: "В работе: {count} / {limit}",
    statusPaused: "В отложенных проектах: {n}",
    statusHint: "Второе число — твой комфортный предел.\nКлик — подсветить открытые ветки.",
    highlighted: "Подсвечено открытых веток: {n}. Повторный клик — снять.",
    menuDone: "Закрыть ✅",
    menuCancel: "Отменено ❌",
    menuPause: "Отложить проект «{name}»",
    menuResume: "Вернуть «{name}» в работу",
    menuLayout: "Разложить под родителем",
    menuPauseTask: "Отложить задачу",
    menuResumeTask: "Вернуть задачу в работу",
    tasksPaused: "Отложено задач: {n}",
    tasksResumed: "Вернул в работу задач: {n}",
    pausedTasks: "отложено · {n}",
    openTasks: "в работе · {n}",
    btnPauseTask: "Отложить задачу",
    resumed: "«{name}» снова в работе",
    paused: "«{name}» отложен",
    cardNotFound: "Карточка не найдена.",
    panelTitle: "Проекты",
    panelEmpty: "Открой канвас — тут появятся проекты.",
    secWorking: "В работе",
    secPaused: "Отложены",
    secSleeping: "Спят",
    toLast: "К последней карточке проекта",
    btnResume: "Вернуть в работу",
    btnPause: "Отложить",
    root: "корень:",
    roots: "корни:",
    rootN: "корень {n}",
    setLimit: "Комфортный предел открытых веток",
    setLimitDesc: "Второе число в счётчике. Если открытых веток больше, счётчик станет оранжевым с ⚠.",
    setLayout: "Авторасклад новых карточек",
    setLayoutDesc: "Новая карточка встаёт под родителя, все открытые ветки выравниваются в одну строку.",
    setStamps: "Показывать даты всех карточек",
    setStampsDesc: "Иначе дата видна только при наведении.",
    setProjects: "Метки проектов",
    setProjectsDesc: "Цветная полоска слева у карточек и ярлычок проекта под открытыми ветками.",
    setAliases: "Склейка проектов",
    setAliasesDesc: "По строке на правило: «Eve6 Demo = Eve6». Слева — как называется корень, справа — каким проектом считать.",
  },
};

function detectLanguage() {
  try {
    if (typeof obsidian.getLanguage === "function") return obsidian.getLanguage();
  } catch (e) { /* older Obsidian */ }
  return window.localStorage.getItem("language") || "en";
}
const LANG = detectLanguage();
const DICT = STRINGS[LANG] || STRINGS[LANG.split("-")[0]] || STRINGS.en;
/* Date formatting follows the UI language; "en" uses the system locale. */
const DATE_LOCALE = DICT === STRINGS.en ? undefined : LANG;

function t(key, vars) {
  let s = DICT[key] != null ? DICT[key] : STRINGS.en[key];
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

const BAND_PREFIX = "wl-band-";
const PANEL_TYPE = "worklog-projects";
const DEFAULTS = { limit: 5, showAllStamps: false, projects: true, aliases: "", autoLayout: true, stamps: {} };
const BAND_H = 60;

/* ---------- dates and bands ---------- */
function ymd(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function bandLabel(d) {
  return "📅 " + d.toLocaleDateString(DATE_LOCALE, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

function stampLabel(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(DATE_LOCALE, { day: "2-digit", month: "2-digit", year: "2-digit" }) +
    " " + d.toLocaleTimeString(DATE_LOCALE, { hour: "2-digit", minute: "2-digit" });
}

const isBand = (n) => typeof n.id === "string" && n.id.startsWith(BAND_PREFIX);

/* A band spans all cards plus 200px on each side. */
function bandGeometry(real) {
  const minX = Math.min(...real.map((n) => n.x));
  const maxX = Math.max(...real.map((n) => n.x + n.width));
  return { x: Math.round(minX - 200), width: Math.round(maxX - minX + 400) };
}

/* ---------- done / open ----------
 * A card is done if it is green (color 4), starts with ❌, or its first line is marked
 * ✅ / ☑ / ~~ / - [x] and there is no unchecked - [ ] anywhere. */
function isDone(n) {
  if (String(n.color) === "4") return true;
  const text = n.text || "";
  const first = ((text.split("\n").map((s) => s.trim()).find(Boolean)) || "").replace(/^⏸️?\s*/, "");
  if (first.startsWith("❌")) return true;
  const firstDone = /^(✅|☑|~~|[-*+]\s+\[[^ \]]\])/.test(first);
  const unchecked = /^\s*[-*+]\s+\[ \]/m.test(text);
  return firstDone && !unchecked;
}

/* ---------- projects ----------
 * A card's project is the nearest "header" above it along the arrows.
 * A header is a root (no incoming arrows, has outgoing ones) or a one-line card whose text
 * matches the name of some root. */
function cleanName(text) {
  const line = (text || "").split("\n").map((s) => s.trim()).find(Boolean) || "";
  return line
    .replace(/^[-*+]\s+\[.\]\s*/, "")
    .replace(/^(✅|❌|☑|⏸️?)\s*/, "")
    .replace(/^#+\s*/, "")
    .replace(/\*\*|__/g, "")
    .replace(/[:：]\s*$/, "")
    .trim();
}

/* Root "Alice / Meeting" → project "Alice", subsection "Meeting". */
function parseRoot(text) {
  const line = cleanName(text);
  const i = line.indexOf(" / ");
  if (i > 0) return { name: line.slice(0, i).trim(), sub: line.slice(i + 3).trim() };
  return { name: line, sub: "" };
}

const PAUSE_MARK = "⏸ ";
const isPausedText = (text) => /^\s*⏸/.test(text || "");
const setPauseMark = (text, on) => {
  text = text || "";
  if (!on) return text.replace(/^(\s*)⏸️?\s*/, "$1");
  return isPausedText(text) ? text : PAUSE_MARK + text;
};

const short = (s) => (s.length > 24 ? s.slice(0, 22) + "…" : s);

function parseAliases(raw) {
  const m = new Map();
  for (const line of (raw || "").split("\n")) {
    const [from, to] = line.split("=").map((s) => (s || "").trim());
    if (from && to) m.set(from.toLowerCase(), to);
  }
  return m;
}

function projectColor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return `hsl(${h % 360}, 70%, 50%)`;
}

/* Full canvas analysis: projects, open branches, project catalog. */
function analyze(data, aliases, stamps) {
  const paused = new Set();
  const nodes = (data.nodes || []).filter((n) => n.type !== "group" && !isBand(n));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const parents = new Map();
  const children = new Map();
  for (const e of data.edges || []) {
    if (!byId.has(e.fromNode) || !byId.has(e.toNode)) continue;
    if (!children.has(e.fromNode)) children.set(e.fromNode, []);
    children.get(e.fromNode).push(e.toNode);
    if (!parents.has(e.toNode)) parents.set(e.toNode, []);
    parents.get(e.toNode).push(e.fromNode);
  }
  const canon = (name) => aliases.get(name.toLowerCase()) || name;

  const header = new Map(); // id -> project name
  const headerSub = new Map(); // id -> subsection
  const known = new Map(); // lowercase -> project name
  for (const n of nodes) {
    if (!parents.has(n.id) && children.has(n.id)) {
      const r = parseRoot(n.text || n.file || "");
      const name = canon(r.name);
      if (name) {
        header.set(n.id, name); headerSub.set(n.id, r.sub); known.set(name.toLowerCase(), name);
        if (isPausedText(n.text)) paused.add(name);
      }
    }
  }
  for (const n of nodes) {
    if (header.has(n.id)) continue;
    const lines = (n.text || "").split("\n").filter((s) => s.trim());
    if (lines.length !== 1) continue;
    const r = parseRoot(n.text);
    const name = known.get(canon(r.name).toLowerCase());
    if (name) { header.set(n.id, name); headerSub.set(n.id, r.sub); }
  }

  // Nearest headers above a card (their ids).
  const memo = new Map();
  const visiting = new Set();
  const hdrsOf = (id) => {
    if (memo.has(id)) return memo.get(id);
    if (header.has(id)) { const r = [id]; memo.set(id, r); return r; }
    if (visiting.has(id)) return [];
    visiting.add(id);
    const set = new Set();
    for (const p of parents.get(id) || []) for (const h of hdrsOf(p)) set.add(h);
    visiting.delete(id);
    const r = [...set];
    memo.set(id, r);
    return r;
  };
  const hdrs = new Map(nodes.map((n) => [n.id, hdrsOf(n.id)]));
  const projects = new Map(nodes.map((n) => [n.id, [...new Set(hdrs.get(n.id).map((h) => header.get(h)))]]));

  // ⏸ on a root pauses the whole project; ⏸ on any other card pauses that task
  // and everything below it (a card whose every parent is paused is paused too).
  const rootIds = new Set([...header.keys()].filter((id) => !parents.has(id)));
  const marked = new Set(nodes.filter((n) => !rootIds.has(n.id) && isPausedText(n.text)).map((n) => n.id));
  const tpMemo = new Map();
  const tpVisiting = new Set();
  const taskPaused = (id) => {
    if (tpMemo.has(id)) return tpMemo.get(id);
    if (marked.has(id)) { tpMemo.set(id, true); return true; }
    const ps = parents.get(id) || [];
    if (!ps.length || tpVisiting.has(id)) return false;
    tpVisiting.add(id);
    const r = ps.every(taskPaused);
    tpVisiting.delete(id);
    tpMemo.set(id, r);
    return r;
  };
  const taskPausedIds = new Set(nodes.filter((n) => taskPaused(n.id)).map((n) => n.id));

  // A card is paused if its task is paused or all of its projects are paused.
  const pausedIds = new Set(nodes.filter((n) => {
    if (taskPausedIds.has(n.id)) return true;
    const names = projects.get(n.id);
    return names.length && names.every((x) => paused.has(x));
  }).map((n) => n.id));

  const open = nodes.filter((n) => !children.has(n.id) && !isDone(n));
  const openIds = new Set(open.map((n) => n.id));
  const active = open.filter((n) => !pausedIds.has(n.id));
  const activeIds = new Set(active.map((n) => n.id));

  const perProject = new Map();
  for (const n of active) {
    const names = projects.get(n.id).filter((x) => !paused.has(x));
    for (const name of names.length ? names : [t("noProject")]) perProject.set(name, (perProject.get(name) || 0) + 1);
  }

  // Catalog per project: roots (top to bottom), open branch count and the latest card.
  const catalog = new Map();
  const entry = (name) => {
    if (!catalog.has(name)) catalog.set(name, { name, headers: [], cards: [], open: 0, openTasks: [], pausedTasks: [], last: null, paused: paused.has(name) });
    return catalog.get(name);
  };
  for (const [id, name] of header) entry(name).headers.push(Object.assign({}, byId.get(id), { sub: headerSub.get(id) }));
  for (const n of nodes) for (const name of projects.get(n.id)) {
    const c = entry(name);
    c.cards.push(n);
    if (openIds.has(n.id) && !taskPausedIds.has(n.id)) { c.open++; c.openTasks.push(n); }
    if (marked.has(n.id) && !isDone(n)) c.pausedTasks.push(n);
  }
  for (const c of catalog.values()) {
    c.headers.sort((p, q) => p.y - q.y);
    const newest = (p, q) => (stamps[q.id] || 0) - (stamps[p.id] || 0) || q.y - p.y;
    c.openTasks.sort(newest);
    c.pausedTasks.sort(newest);
    // Jump target = the work front: active open branches first, then any open card, then any card.
    // Within that pool, the newest by creation stamp; ties and unstamped cards go to the lowest one.
    const activeCards = c.cards.filter((n) => activeIds.has(n.id));
    const openCards = c.cards.filter((n) => openIds.has(n.id));
    const pool = activeCards.length ? activeCards : (openCards.length ? openCards : c.cards);
    const ts = (n) => stamps[n.id] || 0;
    c.last = pool.reduce((best, n) => (!best || ts(n) > ts(best) || (ts(n) === ts(best) && n.y > best.y) ? n : best), null);
  }

  return { byId, parents, children, hdrs, projects, open, active, activeIds, pausedIds, rootIds, marked, perProject, catalog };
}

/* ---------- auto-layout ----------
 * A new card goes under its parent: centered when it is the only child, centered in a row with
 * its siblings when they are all leaves, otherwise to the right of the rightmost sibling.
 * Then every active branch lines up in that row, and row neighbors are pushed aside.
 * The gap matches the built-in "Arrange" commands (canvas grid spacing).
 * Returns {id: {x, y}} for the cards that move. */
function planLayout(a, childId, parentId, gap) {
  const GAP = gap || 20;
  const parent = a.byId.get(parentId);
  const child = a.byId.get(childId);
  if (!parent || !child) return {};
  const pos = new Map(); // id -> {x, y}
  const at = (n) => pos.get(n.id) || { x: n.x, y: n.y };
  const set = (n, p) => pos.set(n.id, Object.assign({}, at(n), p));

  const pcx = parent.x + parent.width / 2;

  const sibs = (a.children.get(parentId) || []).map((id) => a.byId.get(id)).filter(Boolean);
  const leafRow = sibs.length > 1 && sibs.every((n) => !a.children.has(n.id));
  const anchors = new Set([childId]);
  if (leafRow) for (const n of sibs) anchors.add(n.id);

  // The front = active branch ends (lone project cards with no parent aren't branches).
  // It sits under the parent, or lower if other branch ends already are lower:
  // front cards only ever move down, never up onto their own ancestors.
  const front = a.active.filter((n) => (a.parents.get(n.id) || []).length);
  const mates = front.filter((n) => !anchors.has(n.id));
  const frontY = Math.round(Math.max(parent.y + parent.height + GAP, ...mates.map((n) => n.y)));
  if (sibs.length <= 1) {
    set(child, { x: Math.round(pcx - child.width / 2) });
  } else if (leafRow) {
    const row = sibs.filter((n) => n.id !== childId).sort((p, q) => p.x - q.x).concat([child]);
    const total = row.reduce((s, n) => s + n.width, 0) + GAP * (row.length - 1);
    let x = pcx - total / 2;
    for (const n of row) { set(n, { x: Math.round(x) }); x += n.width + GAP; }
  } else {
    const right = Math.max(...sibs.filter((n) => n.id !== childId).map((n) => n.x + n.width));
    set(child, { x: Math.round(right + GAP) });
  }

  for (const n of front) set(n, { y: frontY });
  set(child, { y: frontY });

  // The new card (and its leaf siblings) stay under the parent; push row neighbors outward.
  const anchorNodes = [...anchors].map((id) => a.byId.get(id));
  const L = Math.min(...anchorNodes.map((n) => at(n).x));
  const R = Math.max(...anchorNodes.map((n) => at(n).x + n.width));
  const mid = (L + R) / 2;
  const right = mates.filter((n) => at(n).x + n.width / 2 >= mid).sort((p, q) => at(p).x - at(q).x);
  const left = mates.filter((n) => at(n).x + n.width / 2 < mid).sort((p, q) => at(q).x - at(p).x);
  let cur = R + GAP;
  for (const n of right) { if (at(n).x < cur) set(n, { x: Math.round(cur) }); cur = at(n).x + n.width + GAP; }
  cur = L - GAP;
  for (const n of left) { if (at(n).x + n.width > cur) set(n, { x: Math.round(cur - n.width) }); cur = at(n).x - GAP; }

  const moves = {};
  for (const [id, p] of pos) {
    const n = a.byId.get(id);
    if (Math.abs(n.x - p.x) > 0.5 || Math.abs(n.y - p.y) > 0.5) moves[id] = p;
  }
  return moves;
}

/* ---------- plugin ---------- */
module.exports = class WorklogTimeline extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.settings.stamps = Object.assign({}, this.settings.stamps);
    this.highlight = false;
    this.dirty = false;
    this.analysis = new WeakMap(); // view -> analyze() result
    this.seenEdges = new WeakMap(); // view -> Set(edge id)
    this.emptySince = new WeakMap(); // view -> time it was first seen empty
    this.lastView = null;
    this.panelKey = "";

    this.statusEl = this.addStatusBarItem();
    this.statusEl.addClass("wl-status");
    this.registerDomEvent(this.statusEl, "click", () => this.toggleHighlight());

    this.registerView(PANEL_TYPE, (leaf) => new ProjectsView(leaf, this));

    this.addRibbonIcon("calendar-plus", t("cmdBand"), () => this.placeBand());
    this.addRibbonIcon("layers", t("cmdPanel"), () => this.openPanel());

    const onCanvas = (fn) => (checking) => {
      if (!this.activeCanvas()) return false;
      if (!checking) fn();
      return true;
    };
    this.addCommand({ id: "band-here", name: t("cmdBand"), checkCallback: onCanvas(() => this.placeBand()) });
    this.addCommand({ id: "toggle-open", name: t("cmdHighlight"), checkCallback: onCanvas(() => this.toggleHighlight()) });
    this.addCommand({ id: "open-panel", name: t("cmdPanel"), callback: () => this.openPanel() });
    this.addCommand({
      id: "toggle-stamps",
      name: t("cmdStamps"),
      callback: async () => {
        this.settings.showAllStamps = !this.settings.showAllStamps;
        this.applyStampVisibility();
        await this.save();
      },
    });

    // Right-click menu on a card and on a selection.
    this.registerEvent(this.app.workspace.on("canvas:node-menu", (menu, node) => {
      try { this.fillMenu(menu, node.canvas, this.targetsFor(node)); } catch (e) { console.error("worklog-timeline", e); }
    }));
    this.registerEvent(this.app.workspace.on("canvas:selection-menu", (menu, canvas) => {
      try { this.fillMenu(menu, canvas, [...(canvas.selection || [])]); } catch (e) { console.error("worklog-timeline", e); }
    }));

    this.addSettingTab(new WorklogSettings(this.app, this));
    this.applyStampVisibility();

    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      const s = this.settings.stamps;
      if (s[oldPath]) { s[file.path] = s[oldPath]; delete s[oldPath]; this.dirty = true; }
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (this.settings.stamps[file.path]) { delete this.settings.stamps[file.path]; this.dirty = true; }
    }));

    // The panel follows selection changes right away instead of waiting for the 1s tick.
    const quick = () => window.setTimeout(() => {
      try { if (this.activeCanvas()) this.refreshPanels(); } catch (e) { console.error("worklog-timeline", e); }
    }, 30);
    this.registerDomEvent(document, "pointerup", quick);
    this.registerDomEvent(document, "keyup", quick);

    this.registerInterval(window.setInterval(() => this.tick(), 1000));
    this.registerInterval(window.setInterval(() => this.flush(), 5000));
    this.app.workspace.onLayoutReady(() => this.tick());
  }

  onunload() {
    if (this.flight) cancelAnimationFrame(this.flight);
    // Clean up through each canvas view, so pop-out windows are covered too.
    for (const view of this.canvasViews()) {
      view.containerEl.removeClass("wl-show-stamps");
      view.containerEl.querySelectorAll(".wl-stamp, .wl-stripe, .wl-chip").forEach((el) => el.remove());
      view.containerEl.querySelectorAll(".wl-band, .wl-open, .wl-paused")
        .forEach((el) => el.removeClass("wl-band", "wl-open", "wl-paused"));
    }
    void this.flush(); // Obsidian doesn't await onunload; start the save anyway
  }

  async flush() {
    if (!this.dirty) return;
    this.dirty = false;
    await this.save();
  }

  async save() { await this.saveData(this.settings); }

  applyStampVisibility() {
    for (const view of this.canvasViews()) view.containerEl.toggleClass("wl-show-stamps", !!this.settings.showAllStamps);
  }

  activeCanvas() {
    const view = this.app.workspace.getActiveViewOfType(ItemView);
    if (!view || view.getViewType() !== "canvas" || !view.canvas) return null;
    return view;
  }

  canvasViews() {
    return this.app.workspace.getLeavesOfType("canvas")
      .map((l) => l.view)
      .filter((v) => v && v.canvas && v.file);
  }

  viewOf(canvas) {
    return this.canvasViews().find((v) => v.canvas === canvas);
  }

  /* Canvas for the panel: the active one, else the last active one if still open. */
  panelCanvas() {
    const views = this.canvasViews();
    if (this.lastView && views.includes(this.lastView)) return this.lastView;
    return views[0] || null;
  }

  tick() {
    const act = this.activeCanvas();
    if (act) this.lastView = act;
    for (const view of this.canvasViews()) {
      try { this.decorate(view); } catch (e) { console.error("worklog-timeline", e); }
    }
    this.updateStatus();
    this.refreshPanels();
  }

  decorate(view) {
    const canvas = view.canvas;
    const nodes = canvas.nodes;
    const path = view.file.path;
    const s = this.settings.stamps;
    view.containerEl.toggleClass("wl-show-stamps", !!this.settings.showAllStamps);
    if (!nodes || nodes.size === 0) {
      // Empty: either still loading or a new canvas. Empty for 3s+ counts as a new canvas,
      // so its first cards get real dates.
      if (!this.emptySince.has(view)) this.emptySince.set(view, Date.now());
      else if (!s[path] && Date.now() - this.emptySince.get(view) > 3000) { s[path] = {}; this.dirty = true; }
      return;
    }
    const first = !s[path];
    if (first) s[path] = {};
    const stamps = s[path];
    const now = Date.now();

    // 1. Stamp new cards. On first sight of a canvas, existing cards get no date (0).
    for (const id of nodes.keys()) {
      if (!(id in stamps)) { stamps[id] = first ? 0 : now; this.dirty = true; }
    }

    let data = canvas.getData();
    const aliases = parseAliases(this.settings.aliases);
    let a = analyze(data, aliases, stamps);

    // 2. Auto-layout: a new arrow to a card that has no children and this as its only parent.
    //    Arrows seen before (ctrl+z brings them back) don't count.
    const seen = this.seenEdges.get(view);
    const edges = data.edges || [];
    const dragging = canvas.canvasEl && canvas.canvasEl.classList.contains("is-connecting");
    if (!seen) {
      this.seenEdges.set(view, new Set(edges.map((e) => e.id)));
    } else if (!dragging) {
      // While dragging, the arrow points at a temporary node, not a card. Remember it only once
      // both ends are real cards (Obsidian keeps the arrow id on drop).
      const added = edges.filter((e) => !seen.has(e.id) && nodes.has(e.fromNode) && nodes.has(e.toNode));
      for (const e of added) seen.add(e.id);
      const fresh = added.filter((e) => a.byId.has(e.fromNode) && a.byId.has(e.toNode)
        && !a.children.has(e.toNode) && (a.parents.get(e.toNode) || []).length === 1);
      if (this.settings.autoLayout && fresh.length && added.length <= 2) {
        const e = fresh[fresh.length - 1];
        if (this.applyMoves(canvas, planLayout(a, e.toNode, e.fromNode, canvas.gridSpacing), true)) {
          data = canvas.getData();
          a = analyze(data, aliases, stamps);
        }
      }
    }

    this.analysis.set(view, a);
    this.fitBands(canvas, data);

    // 3. Card decorations.
    const highlight = this.highlight ? a.activeIds : null;
    const showProjects = this.settings.projects !== false;
    for (const [id, node] of nodes) {
      const el = node.nodeEl;
      if (!el) continue;
      const band = id.startsWith(BAND_PREFIX);
      el.toggleClass("wl-band", band);
      el.toggleClass("wl-open", !!highlight && highlight.has(id));
      el.toggleClass("wl-paused", a.pausedIds.has(id));

      let badge = el.querySelector(":scope > .wl-stamp");
      const ts = stamps[id];
      if (ts && !band) {
        if (!badge) badge = el.createDiv({ cls: "wl-stamp" });
        const label = stampLabel(ts);
        if (badge.textContent !== label) badge.textContent = label;
      } else if (badge) {
        badge.remove();
      }

      const names = (showProjects && !band && a.projects.get(id)) || [];
      const key = names.join("|");
      let stripe = el.querySelector(":scope > .wl-stripe");
      if (names.length) {
        if (!stripe) stripe = el.createDiv({ cls: "wl-stripe" });
        if (stripe.dataset.key !== key) {
          const cs = names.map(projectColor);
          const step = 100 / cs.length;
          stripe.setCssProps({ "--wl-color": cs.length === 1 ? cs[0]
            : `linear-gradient(to bottom, ${cs.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(", ")})` });
          stripe.dataset.key = key;
        }
      } else if (stripe) stripe.remove();

      let chip = el.querySelector(":scope > .wl-chip");
      if (names.length && a.activeIds.has(id)) {
        if (!chip) chip = el.createDiv({ cls: "wl-chip" });
        if (chip.dataset.key !== key) {
          chip.empty();
          for (const name of names) {
            const item = chip.createSpan({ cls: "wl-chip-item" });
            item.createSpan({ cls: "wl-dot" }).setCssProps({ "--wl-color": projectColor(name) });
            item.appendText(short(name));
          }
          chip.dataset.key = key;
        }
      } else if (chip) chip.remove();
    }
  }

  applyMoves(canvas, moves, merge) {
    let moved = false;
    for (const [id, p] of Object.entries(moves)) {
      const node = canvas.nodes.get(id);
      if (!node || typeof node.moveAndResize !== "function") continue;
      node.moveAndResize({ x: p.x, y: p.y, width: node.width, height: node.height });
      moved = true;
    }
    if (moved) {
      if (merge && typeof canvas.overrideHistory === "function") {
        // Merge auto-layout into the card-creation history step: one ctrl+z undoes both.
        canvas.overrideHistory();
      } else if (typeof canvas.requestSave === "function") {
        // requestSave() pushes one history step, so a manual layout is one ctrl+z.
        canvas.requestSave();
      }
    }
    return moved;
  }

  /* Manual layout: the card moves under its parent, the front lines up in a row. */
  layoutNode(canvas, id) {
    const view = this.viewOf(canvas);
    const a = view && this.analysis.get(view);
    const parent = a && (a.parents.get(id) || [])[0];
    if (!parent) { new Notice(t("noParent")); return; }
    this.applyMoves(canvas, planLayout(a, id, parent, canvas.gridSpacing));
    this.tick();
  }

  /* Bands can't be resized: keep height BAND_H and full canvas width. */
  fitBands(canvas, data) {
    const real = data.nodes.filter((n) => !isBand(n));
    if (real.length === 0) return;
    const geo = bandGeometry(real);
    let changed = false;
    for (const n of data.nodes) {
      if (!isBand(n)) continue;
      const node = canvas.nodes.get(n.id);
      if (!node || typeof node.moveAndResize !== "function") continue;
      if (Math.abs(n.x - geo.x) > 1 || Math.abs(n.width - geo.width) > 1 || Math.abs(n.height - BAND_H) > 1) {
        node.moveAndResize({ x: geo.x, y: n.y, width: geo.width, height: BAND_H });
        changed = true;
      }
    }
    // requestSave(false) saves without a history step, so band fitting adds no extra ctrl+z.
    if (changed && typeof canvas.requestSave === "function") canvas.requestSave(false);
  }

  updateStatus() {
    const view = this.activeCanvas();
    const a = view && this.analysis.get(view);
    if (!a) { this.statusEl.hide(); return; }
    const count = a.active.length;
    const limit = this.settings.limit;
    const over = count > limit;
    const per = [...a.perProject.entries()].sort((x, y) => y[1] - x[1]);
    const top = this.settings.projects !== false && per.length
      ? " · " + per.slice(0, 3).map(([n, c]) => `${short(n)} ${c}`).join(" · ") + (per.length > 3 ? " · …" : "")
      : "";
    const pausedOpen = a.open.length - a.active.length;
    this.statusEl.show();
    this.statusEl.setText(`${over ? "⚠ " : ""}${t("status", { count, limit })}${top}`);
    this.statusEl.setAttr("aria-label",
      per.map(([n, c]) => `${n}: ${c}`).join("\n") +
      (pausedOpen ? "\n" + t("statusPaused", { n: pausedOpen }) : "") +
      "\n\n" + t("statusHint"));
    this.statusEl.toggleClass("wl-over", over);
  }

  toggleHighlight() {
    this.highlight = !this.highlight;
    this.tick(); // decorate() adds or clears .wl-open on every canvas
    if (this.highlight) {
      const view = this.activeCanvas();
      const a = view && this.analysis.get(view);
      new Notice(t("highlighted", { n: a ? a.active.length : 0 }));
    }
  }

  /* Put today's band at the center of the screen (moves it if today's band already exists). */
  placeBand() {
    const view = this.activeCanvas();
    if (!view) { new Notice(t("openCanvas")); return; }
    const canvas = view.canvas;
    const data = canvas.getData();
    const real = data.nodes.filter((n) => !isBand(n));
    if (real.length === 0) { new Notice(t("emptyCanvas")); return; }
    const geo = bandGeometry(real);
    const maxY = Math.max(...real.map((n) => n.y + n.height));
    const cy = Number.isFinite(canvas.y) ? canvas.y : maxY + 100;
    const today = new Date();
    const prefix = BAND_PREFIX + ymd(today);
    const band = {
      id: prefix + "-" + Math.random().toString(36).slice(2, 8),
      type: "text",
      text: bandLabel(today),
      x: geo.x,
      y: Math.round(cy - BAND_H / 2),
      width: geo.width,
      height: BAND_H,
    };
    const existing = data.nodes.find((n) => typeof n.id === "string" && n.id.startsWith(prefix));
    if (existing) Object.assign(existing, { x: band.x, y: band.y, width: band.width, text: band.text });
    else data.nodes.unshift(band); // first, so it renders below the cards
    canvas.setData(data);
    canvas.requestSave();
    this.tick();
  }

  /* ---------- card menu ---------- */
  targetsFor(node) {
    const sel = node.canvas && node.canvas.selection;
    if (sel && sel.size > 1 && sel.has(node)) return [...sel];
    return [node];
  }

  fillMenu(menu, canvas, targets) {
    targets = targets.filter((n) => n && canvas && canvas.nodes.get(n.id) === n && !String(n.id).startsWith(BAND_PREFIX));
    if (!canvas || !targets.length) return;
    const many = targets.length > 1 ? ` (${targets.length})` : "";

    menu.addItem((item) => item.setTitle(t("menuDone") + many).setIcon("check-circle")
      .onClick(() => this.updateNodes(canvas, targets, (d) => Object.assign(d, { color: "4" }))));
    menu.addItem((item) => item.setTitle(t("menuCancel") + many).setIcon("x-circle")
      .onClick(() => this.updateNodes(canvas, targets, (d) => {
        if (d.type === "text" && !(d.text || "").trimStart().startsWith("❌")) d.text = "❌ " + (d.text || "");
        else if (d.type !== "text") d.color = "4";
        return d;
      })));

    const view = this.viewOf(canvas);
    const a = view && this.analysis.get(view);
    if (!a) return;
    // Pause / resume the selected tasks themselves (roots stand for the whole project).
    const tasks = targets.filter((n) => !a.rootIds.has(n.id));
    if (tasks.length) {
      const resume = tasks.every((n) => a.marked.has(n.id));
      const taskCount = tasks.length > 1 ? ` (${tasks.length})` : "";
      menu.addItem((item) => item.setTitle(t(resume ? "menuResumeTask" : "menuPauseTask") + taskCount)
        .setIcon(resume ? "play" : "pause")
        .onClick(() => this.pauseTasks(canvas, tasks, !resume)));
    }

    const names = new Set();
    for (const n of targets) for (const name of a.projects.get(n.id) || []) names.add(name);
    for (const name of names) {
      const c = a.catalog.get(name);
      const isPaused = !!(c && c.paused);
      menu.addItem((item) => item
        .setTitle(t(isPaused ? "menuResume" : "menuPause", { name: short(name) }))
        .setIcon(isPaused ? "play" : "pause")
        .onClick(() => this.togglePause(view, name)));
    }
    if (targets.length === 1 && (a.parents.get(targets[0].id) || []).length) {
      menu.addItem((item) => item.setTitle(t("menuLayout")).setIcon("layout-grid")
        .onClick(() => this.layoutNode(canvas, targets[0].id)));
    }
  }

  updateNodes(canvas, targets, fn) {
    const ok = targets.every((n) => typeof n.getData === "function" && typeof n.setData === "function");
    if (ok) {
      for (const n of targets) n.setData(fn(Object.assign({}, n.getData())));
    } else {
      const ids = new Set(targets.map((n) => n.id));
      const data = canvas.getData();
      data.nodes = data.nodes.map((d) => (ids.has(d.id) ? fn(Object.assign({}, d)) : d));
      canvas.setData(data);
    }
    if (typeof canvas.requestSave === "function") canvas.requestSave();
    this.tick();
  }

  /* Pause lives in the canvas itself: ⏸ at the start of the project's roots.
   * That keeps it visible and undoable with ctrl+z. */
  togglePause(view, name) {
    const a = view && this.analysis.get(view);
    const c = a && a.catalog.get(name);
    if (!c) return;
    const resume = c.paused;
    const ids = new Set(c.headers.filter((h) => !a.parents.has(h.id)).map((h) => h.id));
    if (!ids.size) for (const h of c.headers) ids.add(h.id);
    const targets = [...ids].map((id) => view.canvas.nodes.get(id)).filter(Boolean);
    this.updateNodes(view.canvas, targets, (d) => {
      if (d.type === "text") d.text = setPauseMark(d.text, !resume);
      return d;
    });
    new Notice(t(resume ? "resumed" : "paused", { name }));
  }

  /* Pause or resume single tasks: ⏸ at the start of the card's own text. */
  pauseTasks(canvas, targets, on) {
    const nodes = targets.filter((n) => n && canvas.nodes.get(n.id) === n);
    const text = nodes.filter((n) => typeof n.getData !== "function" || n.getData().type === "text");
    if (!text.length) return;
    this.updateNodes(canvas, text, (d) => {
      if (d.type === "text") d.text = setPauseMark(d.text, on);
      return d;
    });
    new Notice(t(on ? "tasksPaused" : "tasksResumed", { n: text.length }));
  }

  /* ---------- projects panel ---------- */
  async openPanel() {
    let leaf = this.app.workspace.getLeavesOfType(PANEL_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false) || this.app.workspace.getLeaf("split");
      await leaf.setViewState({ type: PANEL_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
    this.panelKey = "";
    this.refreshPanels();
  }

  refreshPanels() {
    const leaves = this.app.workspace.getLeavesOfType(PANEL_TYPE);
    if (!leaves.length) return;
    const view = this.panelCanvas();
    const a = view && this.analysis.get(view);
    // What is selected on the canvas: highlight its project and root.
    const sel = { names: new Set(), hdrs: new Set(), ids: new Set() };
    if (a && view.canvas.selection) {
      for (const n of view.canvas.selection) {
        sel.ids.add(n.id);
        for (const h of a.hdrs.get(n.id) || []) sel.hdrs.add(h);
        for (const name of a.projects.get(n.id) || []) sel.names.add(name);
      }
    }
    const key = !a ? "none" : view.file.path + "|" + [...sel.ids].join(",") + "|" + [...a.catalog.values()]
      .map((c) => `${c.name}:${c.open}:${c.paused}:${c.headers.map((h) => h.id + h.sub).join(",")}:${c.last && c.last.id}:${[...c.openTasks, ...c.pausedTasks].map((n) => n.id + cleanName(n.text)).join(",")}`).join(";");
    if (key === this.panelKey) return;
    this.panelKey = key;
    for (const leaf of leaves) if (leaf.view instanceof ProjectsView) leaf.view.render(view, a, sel);
  }

  /* Smooth flight. zoomToBbox only sets the target (tx, ty, tZoom); we drive the camera:
   * ease in and out, and on long jumps zoom out slightly mid-way so the picture doesn't smear
   * (less motion sickness). With "reduce motion" the jump is instant. */
  fly(canvas) {
    if (typeof canvas.setViewport !== "function") return; // built-in animation stays
    const x0 = canvas.x, y0 = canvas.y, z0 = canvas.zoom;
    const x1 = canvas.tx, y1 = canvas.ty, z1 = canvas.tZoom;
    if (this.flight) cancelAnimationFrame(this.flight);
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      canvas.setViewport(x1, y1, z1); return;
    }
    canvas.setViewport(x0, y0, z0); // cancel the built-in animation
    const rect = canvas.canvasRect || { width: 1000, height: 800 };
    const screen = Math.hypot(x1 - x0, y1 - y0) * Math.pow(2, Math.max(z0, z1));
    const viewSize = Math.max(rect.width, rect.height) || 1000;
    const dip = Math.min(2, Math.max(0, Math.log2(screen / viewSize)));
    const dur = Math.min(1000, Math.max(400, 350 + screen * 0.08));
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const e = ease(p);
      const z = z0 + (z1 - z0) * e - dip * Math.sin(Math.PI * p);
      canvas.setViewport(x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, z);
      this.flight = p < 1 ? requestAnimationFrame(step) : 0;
    };
    this.flight = requestAnimationFrame(step);
  }

  /* Jump to a card: focus the canvas, center the card, select it. */
  jumpTo(view, id) {
    if (!view) return;
    const canvas = view.canvas;
    const n = canvas.getData().nodes.find((d) => d.id === id);
    if (!n) { new Notice(t("cardNotFound")); return; }
    this.app.workspace.setActiveLeaf(view.leaf, { focus: true });
    const pad = 400;
    if (typeof canvas.zoomToBbox === "function") {
      canvas.zoomToBbox({ minX: n.x - pad, minY: n.y - pad, maxX: n.x + n.width + pad, maxY: n.y + n.height + pad });
      this.fly(canvas);
    }
    const node = canvas.nodes.get(id);
    if (node && typeof canvas.selectOnly === "function") canvas.selectOnly(node);
  }
};

class ProjectsView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; this.openSleeping = false; this.openLists = new Set(); }
  getViewType() { return PANEL_TYPE; }
  getDisplayText() { return t("panelTitle"); }
  getIcon() { return "layers"; }
  async onOpen() { this.plugin.panelKey = ""; this.plugin.refreshPanels(); }

  render(view, a, sel) {
    this.sel = sel || { names: new Set(), hdrs: new Set(), ids: new Set() };
    const root = this.contentEl;
    root.empty();
    root.addClass("wl-panel");
    if (!a) { root.createDiv({ cls: "wl-p-empty", text: t("panelEmpty") }); return; }

    const all = [...a.catalog.values()];
    const byName = (p, q) => p.name.localeCompare(q.name);
    const working = all.filter((c) => !c.paused && c.open > 0).sort((p, q) => q.open - p.open || byName(p, q));
    const paused = all.filter((c) => c.paused).sort(byName);
    const sleeping = all.filter((c) => !c.paused && c.open === 0).sort(byName);

    const section = (title, list, collapsible) => {
      if (!list.length) return;
      let body = root;
      if (collapsible) {
        const det = root.createEl("details", { cls: "wl-p-section" });
        det.open = this.openSleeping || list.some((c) => this.sel.names.has(c.name));
        det.addEventListener("toggle", () => { this.openSleeping = det.open; });
        det.createEl("summary", { text: `${title} · ${list.length}` });
        body = det;
      } else {
        root.createDiv({ cls: "wl-p-title", text: `${title} · ${list.length}` });
      }
      for (const c of list) this.row(body, view, c);
    };
    section(t("secWorking"), working, false);
    section(t("secPaused"), paused, false);
    section(t("secSleeping"), sleeping, true);
  }

  row(parent, view, c) {
    const row = parent.createDiv({ cls: "wl-p-row" });
    row.toggleClass("is-paused", c.paused);
    row.toggleClass("is-active", this.sel.names.has(c.name));
    const head = row.createDiv({ cls: "wl-p-head" });
    head.createSpan({ cls: "wl-dot" }).setCssProps({ "--wl-color": projectColor(c.name) });
    const name = head.createSpan({ cls: "wl-p-name", text: c.name });
    name.setAttr("aria-label", t("toLast"));
    name.addEventListener("click", () => c.last && this.plugin.jumpTo(view, c.last.id));
    if (c.open) head.createSpan({ cls: "wl-p-count", text: String(c.open) });
    const btn = head.createSpan({ cls: "wl-p-btn", text: c.paused ? "▶" : "⏸" });
    btn.setAttr("aria-label", t(c.paused ? "btnResume" : "btnPause"));
    btn.addEventListener("click", () => this.plugin.togglePause(view, c.name));

    if (c.headers.length) {
      const roots = row.createDiv({ cls: "wl-p-roots" });
      roots.createSpan({ text: t(c.headers.length === 1 ? "root" : "roots") });
      c.headers.forEach((h, i) => {
        const link = roots.createSpan({ cls: "wl-p-root", text: h.sub ? short(h.sub) : String(i + 1) });
        link.toggleClass("is-active", this.sel.hdrs.has(h.id));
        link.setAttr("aria-label", cleanName(h.text || "") || t("rootN", { n: i + 1 }));
        link.addEventListener("click", () => this.plugin.jumpTo(view, h.id));
      });
    }

    // Open and paused tasks of this project: accordions under the row.
    this.taskList(row, view, c, "open", c.openTasks);
    this.taskList(row, view, c, "paused", c.pausedTasks);
  }

  taskList(row, view, c, kind, list) {
    if (!list.length) return;
    const paused = kind === "paused";
    const key = kind + ":" + c.name;
    const det = row.createEl("details", { cls: "wl-p-tasks" });
    det.open = this.openLists.has(key);
    det.addEventListener("toggle", () => {
      if (det.open) this.openLists.add(key); else this.openLists.delete(key);
    });
    det.createEl("summary", { text: t(paused ? "pausedTasks" : "openTasks", { n: list.length }) });
    for (const n of list) {
      const item = det.createDiv({ cls: "wl-p-task" });
      item.toggleClass("is-active", this.sel.ids.has(n.id));
      const label = item.createSpan({ cls: "wl-p-task-name", text: cleanName(n.text || n.file || "") || "…" });
      label.addEventListener("click", () => this.plugin.jumpTo(view, n.id));
      const btn = item.createSpan({ cls: "wl-p-btn", text: paused ? "▶" : "⏸" });
      btn.setAttr("aria-label", t(paused ? "btnResume" : "btnPauseTask"));
      btn.addEventListener("click", () => {
        const node = view.canvas.nodes.get(n.id);
        if (node) this.plugin.pauseTasks(view.canvas, [node], !paused);
      });
    }
  }
}

class WorklogSettings extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const { containerEl } = this;
    const p = this.plugin;
    containerEl.empty();
    new Setting(containerEl)
      .setName(t("setLimit"))
      .setDesc(t("setLimitDesc"))
      .addText((c) => c.setValue(String(p.settings.limit)).onChange(async (v) => {
        const n = parseInt(v, 10);
        if (n > 0) { p.settings.limit = n; await p.save(); p.updateStatus(); }
      }).inputEl.type = "number");
    new Setting(containerEl)
      .setName(t("setLayout"))
      .setDesc(t("setLayoutDesc"))
      .addToggle((c) => c.setValue(p.settings.autoLayout !== false).onChange(async (v) => {
        p.settings.autoLayout = v; await p.save();
      }));
    new Setting(containerEl)
      .setName(t("setStamps"))
      .setDesc(t("setStampsDesc"))
      .addToggle((c) => c.setValue(!!p.settings.showAllStamps).onChange(async (v) => {
        p.settings.showAllStamps = v; p.applyStampVisibility(); await p.save();
      }));
    new Setting(containerEl)
      .setName(t("setProjects"))
      .setDesc(t("setProjectsDesc"))
      .addToggle((c) => c.setValue(p.settings.projects !== false).onChange(async (v) => {
        p.settings.projects = v; await p.save(); p.tick();
      }));
    new Setting(containerEl)
      .setName(t("setAliases"))
      .setDesc(t("setAliasesDesc"))
      .addTextArea((c) => {
        c.setValue(p.settings.aliases || "").onChange(async (v) => {
          p.settings.aliases = v; await p.save(); p.tick();
        });
        c.inputEl.rows = 4;
      });
  }
}
