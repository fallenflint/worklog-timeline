/* Worklog Timeline: date bands, card creation stamps, project labels, an open-branch counter,
 * a "done / cancelled / pause" card menu, auto-layout of new cards and a projects panel.
 * No build step: plain CommonJS. Parts of the Canvas API are undocumented, so every call
 * into it is guarded. */
const obsidian = require("obsidian");
const { Plugin, Notice, PluginSettingTab, Setting, ItemView, Modal, setIcon } = obsidian;

/* ---------- i18n ----------
 * English is the base. Add a language by adding a table with the same keys;
 * missing keys fall back to English. */
const STRINGS = {
  en: {
    cmdBand: "Add a date band at screen center",
    bandTitle: "Date band",
    bandDate: "Date",
    bandDateDesc: "Past and future dates work too. If this date already has a band, it moves here.",
    bandOk: "Place",
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
    secArchived: "Archive",
    menuArchive: "Archive project “{name}”",
    menuUnarchive: "Unarchive “{name}”",
    btnArchive: "Archive: hide from the panel once it has no open tasks",
    btnUnarchive: "Unarchive",
    archived: "“{name}” goes to the archive once it has no open tasks",
    unarchived: "“{name}” is back in the list",
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
    setAutoBand: "Automatic date band",
    setAutoBandDesc: "When a new card starts a new session, a band with the date goes under all cards and the new card goes below it.",
    autoOff: "Off",
    autoBreak: "After a break",
    autoCalendar: "Each calendar day",
    setBreak: "Break length, hours",
    setBreakDesc: "A new card after this many hours without new cards starts a session; the band gets the date it started. A night session past midnight stays one session.",
    setDayStart: "Day starts at, hour",
    setDayStartDesc: "Cards made before this hour count toward the previous day.",
  },
  ru: {
    cmdBand: "Рубеж даты в центре экрана",
    bandTitle: "Рубеж даты",
    bandDate: "Дата",
    bandDateDesc: "Можно задним числом и на будущее. Если у этой даты уже есть рубеж, он переедет сюда.",
    bandOk: "Поставить",
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
    secArchived: "Архив",
    menuArchive: "В архив: «{name}»",
    menuUnarchive: "Достать из архива «{name}»",
    btnArchive: "В архив: прятать из панели, когда нет открытых задач",
    btnUnarchive: "Достать из архива",
    archived: "«{name}» уйдёт в архив, когда закроются все задачи",
    unarchived: "«{name}» снова в списке",
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
    setAutoBand: "Рубеж даты автоматически",
    setAutoBandDesc: "Когда новая карточка начинает новую сессию, под всеми карточками встаёт рубеж с датой, а новая карточка — под ним.",
    autoOff: "Выключено",
    autoBreak: "После перерыва",
    autoCalendar: "Каждый календарный день",
    setBreak: "Перерыв, часов",
    setBreakDesc: "Новая карточка после стольких часов без новых карточек начинает сессию, на рубеже — дата её начала. Ночная сессия через полночь остаётся одной.",
    setDayStart: "День начинается в, час",
    setDayStartDesc: "Карточки до этого часа считаются предыдущим днём.",
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
/* Dates follow Obsidian's UI language, not the system locale. */
const DATE_LOCALE = LANG;

function t(key, vars) {
  let s = DICT[key] != null ? DICT[key] : STRINGS.en[key];
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

const BAND_PREFIX = "wl-band-";
const PANEL_TYPE = "worklog-projects";
const DEFAULTS = {
  limit: 5, showAllStamps: false, projects: true, aliases: "", autoLayout: true,
  autoBand: "break", breakHours: 6, dayStart: 4, stamps: {},
  archived: {}, // canvas path -> [root card ids] of archived projects
};
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

/* The band's date lives in its id (wl-band-YYYY-MM-DD-xxxxxx); its text is free to edit. */
function bandDate(n) {
  const m = isBand(n) && /^wl-band-(\d{4}-\d{2}-\d{2})/.exec(n.id);
  return m ? m[1] : null;
}

function parseYmd(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

/* The day a moment belongs to, when the day starts at `dayStart` o'clock. */
function logicalDay(ts, dayStart) {
  const d = new Date(ts - (dayStart || 0) * 3600e3);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function makeBand(day, geo, y) {
  return {
    id: BAND_PREFIX + ymd(day) + "-" + Math.random().toString(36).slice(2, 8),
    type: "text",
    text: bandLabel(day),
    x: geo.x,
    y: Math.round(y),
    width: geo.width,
    height: BAND_H,
  };
}

/* Where the card was dropped decides: the front row stays below the lowest band whose line
 * is above the card's middle. Dropped above a band, the row doesn't get pushed under it. */
function bandFloor(nodes, card, gap) {
  const mid = card.y + card.height / 2;
  let floor = -Infinity;
  for (const n of nodes) {
    if (isBand(n) && n.y < mid) floor = Math.max(floor, n.y + n.height + gap);
  }
  return floor;
}

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
 * Invariants (tests/layout.test.js checks them):
 * 1. Only the front moves: active branch ends and the new card. Done history, inner cards,
 *    roots, paused cards and other projects' cards are obstacles and never move.
 * 2. A card that moves never lands on an obstacle.
 * 3. The new card's arrow from its parent doesn't run through an obstacle, so it can't look
 *    attached to someone else's card. If its column under the parent is taken, the card goes
 *    to the nearest free spot beside it (either side) instead of pushing anything away.
 * The gap matches the built-in "Arrange" commands (canvas grid spacing). */

const hitBox = (x, y, w, h, o, pad) =>
  x < o.x + o.width + pad && x + w + pad > o.x && y < o.y + o.height + pad && y + h + pad > o.y;

/* Obsidian draws a bottom→top arrow as a cubic curve with vertical tangents. Sample it and
 * report whether it passes through any obstacle. */
function arrowHits(from, to, obstacles, pad) {
  const x0 = from.x + from.width / 2, y0 = from.y + from.height;
  const x3 = to.x + to.width / 2, y3 = to.y;
  const k = Math.max(Math.abs(y3 - y0) / 2, 30);
  const y1 = y0 + k, y2 = y3 - k;
  for (let i = 1; i < 32; i++) {
    const t = i / 32, u = 1 - t;
    const x = u * u * u * x0 + 3 * u * u * t * x0 + 3 * u * t * t * x3 + t * t * t * x3;
    const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
    for (const o of obstacles) {
      if (x > o.x - pad && x < o.x + o.width + pad && y > o.y - pad && y < o.y + o.height + pad) return true;
    }
  }
  return false;
}

/* The first obstacle a box at (x, y) runs into, or null. Cards keep at least half a gap apart. */
function blocker(x, y, w, h, obstacles, gap) {
  for (const o of obstacles) if (hitBox(x, y, w, h, o, gap / 2 - 0.5)) return o;
  return null;
}

/* Nearest free x for a w×h block at height y, starting from x0. Candidates are x0 and the
 * spots right beside each obstacle; the closest one that is free and whose arrows are clear
 * wins (ties go right). If no spot has clear arrows, the closest free one. */
function findSlot(x0, y, w, h, obstacles, gap, arrowsOk) {
  const cands = [x0];
  for (const o of obstacles) cands.push(o.x + o.width + gap, o.x - gap - w);
  cands.sort((p, q) => Math.abs(p - x0) - Math.abs(q - x0) || q - p);
  let free = null;
  for (const x of cands) {
    if (blocker(x, y, w, h, obstacles, gap)) continue;
    if (!arrowsOk || arrowsOk(x)) return Math.round(x);
    if (free == null) free = x;
  }
  return Math.round(free == null ? x0 : free);
}

/* Slide a card along its row (dir +1 right, -1 left) until it clears every obstacle. */
function slide(x, y, w, h, dir, obstacles, gap) {
  for (let i = 0; i < 500; i++) {
    const o = blocker(x, y, w, h, obstacles, gap);
    if (!o) break;
    x = dir > 0 ? o.x + o.width + gap : o.x - gap - w;
  }
  return Math.round(x);
}

/* Shared by layout and realign: the row of anchors sits at [L, R]; the other front cards go to
 * the row height and are pushed outward off the anchors and off every obstacle. */
function lineUpMates(mates, at, set, L, R, rowY, obstacles, gap) {
  const mid = (L + R) / 2;
  const right = mates.filter((n) => at(n).x + n.width / 2 >= mid).sort((p, q) => at(p).x - at(q).x);
  const left = mates.filter((n) => at(n).x + n.width / 2 < mid).sort((p, q) => at(q).x - at(p).x);
  let cur = R + gap;
  for (const n of right) {
    const x = slide(Math.max(at(n).x, cur), rowY, n.width, n.height, 1, obstacles, gap);
    set(n, { x, y: rowY });
    cur = x + n.width + gap;
  }
  cur = L - gap;
  for (const n of left) {
    const x = slide(Math.min(at(n).x, cur - n.width), rowY, n.width, n.height, -1, obstacles, gap);
    set(n, { x, y: rowY });
    cur = x - gap;
  }
}

function collectMoves(a, pos) {
  const moves = {};
  for (const [id, p] of pos) {
    const n = a.byId.get(id);
    if (Math.abs(n.x - p.x) > 0.5 || Math.abs(n.y - p.y) > 0.5) moves[id] = p;
  }
  return moves;
}

/* The front = active branch ends (lone project cards with no parent aren't branches). */
const frontOf = (a) => a.active.filter((n) => (a.parents.get(n.id) || []).length);

/* A new card goes under its parent: centered when it is the only child, centered in a row with
 * its siblings when they are all open branches, otherwise to the right of the rightmost
 * sibling. If that spot is taken or its arrow would cross a card, the nearest free spot.
 * Then every active branch lines up in that row, and row neighbors are pushed aside.
 * Returns {id: {x, y}} for the cards that move. */
function planLayout(a, childId, parentId, gap, minY) {
  const GAP = gap || 20;
  const parent = a.byId.get(parentId);
  const child = a.byId.get(childId);
  if (!parent || !child) return {};
  const pos = new Map(); // id -> {x, y}
  const at = (n) => pos.get(n.id) || { x: n.x, y: n.y };
  const set = (n, p) => pos.set(n.id, Object.assign({}, at(n), p));

  const front = frontOf(a);
  const frontIds = new Set(front.map((n) => n.id));
  const sibs = (a.children.get(parentId) || []).map((id) => a.byId.get(id)).filter(Boolean);
  const others = sibs.filter((n) => n.id !== childId);
  // Siblings line up with the new card only if they are all open branches themselves.
  const leafRow = others.length > 0 && others.every((n) => frontIds.has(n.id));
  const row = leafRow ? others.slice().sort((p, q) => p.x - q.x).concat([child]) : [child];
  const anchors = new Set(row.map((n) => n.id));
  const mates = front.filter((n) => !anchors.has(n.id));
  const movable = new Set([...frontIds, ...anchors]);
  const obstacles = [...a.byId.values()].filter((n) => !movable.has(n.id));

  // The row sits under the parent, or lower if other branch ends already are lower:
  // front cards only ever move down, never up onto their own ancestors.
  const frontY = Math.round(Math.max(parent.y + parent.height + GAP, minY == null ? -Infinity : minY,
    ...mates.map((n) => n.y)));

  const total = row.reduce((s, n) => s + n.width, 0) + GAP * (row.length - 1);
  const h = Math.max(...row.map((n) => n.height));
  const pcx = parent.x + parent.width / 2;
  const x0 = others.length && !leafRow
    ? Math.max(...others.map((n) => n.x + n.width)) + GAP
    : pcx - total / 2;
  const xsFrom = (L) => { const xs = []; let x = L; for (const n of row) { xs.push(x); x += n.width + GAP; } return xs; };
  // The new card's own arrow must stay clear; the parent itself is not in its way.
  const clear = obstacles.filter((n) => n.id !== parentId);
  const arrowsOk = (L) => {
    const xs = xsFrom(L);
    return row.every((n, i) => !arrowHits(parent, { x: xs[i], y: frontY, width: n.width, height: n.height }, clear, GAP / 2));
  };
  const L = findSlot(x0, frontY, total, h, obstacles, GAP, arrowsOk);
  xsFrom(L).forEach((x, i) => set(row[i], { x: Math.round(x), y: frontY }));

  lineUpMates(mates, at, set, L, L + total, frontY, obstacles, GAP);
  return collectMoves(a, pos);
}

/* Lay out only a card that was just pulled out of an existing card: the target appeared
 * moments ago and the source is older. An arrow drawn between two old cards, a pasted pair
 * and a pair that came in by sync (both ends new at once) move nothing. */
function isNewChild(e, a, stamps, now) {
  if (!a.byId.has(e.fromNode) || !a.byId.has(e.toNode)) return false;
  if (a.children.has(e.toNode) || (a.parents.get(e.toNode) || []).length !== 1) return false;
  const born = stamps[e.toNode];
  if (!born || now - born > 15000) return false;
  return (stamps[e.fromNode] || 0) < born;
}

/* A current card was dragged: the whole front row lines up at its new height.
 * The dragged card keeps its x unless it now sits on a card; row neighbors get pushed aside.
 * The row never goes above any front card's parent, nor above the band it was dropped under. */
function planRealign(a, id, gap, minY) {
  const GAP = gap || 20;
  const card = a.byId.get(id);
  const front = frontOf(a);
  if (!card || !front.some((n) => n.id === id)) return {};
  const frontIds = new Set(front.map((n) => n.id));
  const obstacles = [...a.byId.values()].filter((n) => !frontIds.has(n.id));
  const parentsOf = (n) => (a.parents.get(n.id) || []).map((p) => a.byId.get(p)).filter(Boolean);
  const parentBottom = (n) => Math.max(...parentsOf(n).map((p) => p.y + p.height));
  const rowY = Math.round(Math.max(card.y, minY == null ? -Infinity : minY,
    ...front.map((n) => parentBottom(n) + GAP)));

  const pos = new Map();
  const at = (n) => pos.get(n.id) || { x: n.x, y: n.y };
  const set = (n, p) => pos.set(n.id, Object.assign({}, at(n), p));

  let x = card.x;
  if (blocker(x, rowY, card.width, card.height, obstacles, GAP)) {
    const ps = parentsOf(card);
    const clear = obstacles.filter((n) => !ps.includes(n));
    x = findSlot(x, rowY, card.width, card.height, obstacles, GAP,
      (cx) => ps.every((p) => !arrowHits(p, { x: cx, y: rowY, width: card.width, height: card.height }, clear, GAP / 2)));
  }
  set(card, { x, y: rowY });
  lineUpMates(front.filter((n) => n.id !== id), at, set, x, x + card.width, rowY, obstacles, GAP);
  return collectMoves(a, pos);
}

/* After a layout: a band never cuts a laid-out card. If one of `ids` starts above a band
 * and runs into it, the band and everything below it move down by the same amount, so
 * the layout below (more cards, more bands) stays as it was. Bands only move down. */
function planBandPush(nodes, ids, gap) {
  const GAP = gap || 20;
  const pos = new Map(nodes.map((n) => [n.id, n.y]));
  const watch = nodes.filter((n) => ids.has(n.id) && !isBand(n));
  const bands = nodes.filter(isBand).sort((p, q) => p.y - q.y);
  for (const band of bands) {
    const by = pos.get(band.id);
    let need = 0;
    for (const n of watch) {
      const y = pos.get(n.id);
      if (y < by && y + n.height + GAP > by) need = Math.max(need, y + n.height + GAP - by);
    }
    if (need <= 0) continue;
    for (const n of nodes) if (pos.get(n.id) >= by) pos.set(n.id, pos.get(n.id) + Math.round(need));
  }
  const moves = {};
  for (const n of nodes) if (pos.get(n.id) !== n.y) moves[n.id] = { x: n.x, y: pos.get(n.id) };
  return moves;
}

/* ---------- plugin ---------- */
module.exports = class WorklogTimeline extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULTS, await this.loadData());
    this.settings.stamps = Object.assign({}, this.settings.stamps);
    this.settings.archived = Object.assign({}, this.settings.archived);
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

    this.addRibbonIcon("calendar-plus", t("cmdBand"), () => this.askBand());
    this.addRibbonIcon("layers", t("cmdPanel"), () => this.openPanel());

    const onCanvas = (fn) => (checking) => {
      if (!this.activeCanvas()) return false;
      if (!checking) fn();
      return true;
    };
    this.addCommand({ id: "band-here", name: t("cmdBand"), checkCallback: onCanvas(() => this.askBand()) });
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
      const ar = this.settings.archived;
      if (ar[oldPath]) { ar[file.path] = ar[oldPath]; delete ar[oldPath]; this.dirty = true; }
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (this.settings.stamps[file.path]) { delete this.settings.stamps[file.path]; this.dirty = true; }
    }));

    // The panel follows selection changes right away instead of waiting for the 1s tick.
    const quick = () => window.setTimeout(() => {
      try { if (this.activeCanvas()) this.refreshPanels(); } catch (e) { console.error("worklog-timeline", e); }
    }, 30);
    this.registerDomEvent(document, "pointerup", quick);

    // Dragging a current card lines the front row up again. Snapshot the current cards on
    // pointer down; on pointer up, if exactly one of them moved (and wasn't resized), realign.
    this.registerDomEvent(document, "pointerdown", () => {
      try { this.dragSnap = this.snapFront(); } catch (e) { this.dragSnap = null; }
    });
    this.registerDomEvent(document, "pointerup", () => {
      const snap = this.dragSnap;
      this.dragSnap = null;
      if (snap) window.setTimeout(() => {
        try { this.realignAfterDrag(snap); } catch (e) { console.error("worklog-timeline", e); }
      }, 50);
    });
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
    let lastWork = 0; // newest stamp among cards on the canvas before this tick
    const freshCards = [];
    for (const id of nodes.keys()) {
      const band = id.startsWith(BAND_PREFIX);
      if (!(id in stamps)) {
        stamps[id] = first ? 0 : now;
        this.dirty = true;
        if (!first && !band) freshCards.push(id);
      } else if (!band && stamps[id] > lastWork) lastWork = stamps[id];
    }

    let data = canvas.getData();
    // A couple of new cards may start a new session (a sync bringing many doesn't count).
    if (freshCards.length && freshCards.length <= 3 && this.autoBand(canvas, data, freshCards, lastWork, now)) {
      data = canvas.getData();
    }
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
      const fresh = added.filter((e) => isNewChild(e, a, stamps, now));
      if (this.settings.autoLayout && fresh.length && added.length <= 2) {
        const e = fresh[fresh.length - 1];
        const floor = this.floorFor(canvas, data, e.toNode);
        if (this.applyMoves(canvas, planLayout(a, e.toNode, e.fromNode, canvas.gridSpacing, floor), true, e.toNode)) {
          data = canvas.getData();
          a = analyze(data, aliases, stamps);
        }
      }
    }

    const archived = new Set(this.settings.archived[path] || []);
    for (const c of a.catalog.values()) c.archived = c.headers.some((h) => archived.has(h.id));
    this.analysis.set(view, a);
    if (!dragging) this.dropBandEdges(canvas, data);
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

  applyMoves(canvas, moves, merge, anchorId) {
    let moved = false;
    const move = (ms) => {
      for (const [id, p] of Object.entries(ms)) {
        const node = canvas.nodes.get(id);
        if (!node || typeof node.moveAndResize !== "function") continue;
        node.moveAndResize({ x: p.x, y: p.y, width: node.width, height: node.height });
        moved = true;
      }
    };
    move(moves);
    if (moved || anchorId) {
      // Laid-out cards that now run into a band push it (and everything under it) down.
      const ids = new Set(Object.keys(moves));
      if (anchorId) ids.add(anchorId);
      move(planBandPush(canvas.getData().nodes || [], ids, canvas.gridSpacing));
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

  snapFront() {
    if (this.settings.autoLayout === false) return null;
    const view = this.activeCanvas();
    const a = view && this.analysis.get(view);
    if (!a) return null;
    const pos = new Map();
    for (const n of a.active) {
      const node = view.canvas.nodes.get(n.id);
      if (node) pos.set(n.id, { x: node.x, y: node.y, w: node.width, h: node.height });
    }
    return { view, pos };
  }

  realignAfterDrag(snap) {
    const { view, pos } = snap;
    const canvas = view.canvas;
    if (!this.canvasViews().includes(view)) return;
    if (canvas.canvasEl && canvas.canvasEl.classList.contains("is-connecting")) return;
    const moved = [];
    for (const [id, p] of pos) {
      const node = canvas.nodes.get(id);
      if (!node) continue;
      const shifted = Math.abs(node.x - p.x) > 0.5 || Math.abs(node.y - p.y) > 0.5;
      const resized = Math.abs(node.width - p.w) > 0.5 || Math.abs(node.height - p.h) > 0.5;
      if (resized) return;
      if (shifted) moved.push(id);
    }
    if (moved.length !== 1) return; // a group drag is left as is
    const data = canvas.getData();
    const stamps = this.settings.stamps[view.file.path] || {};
    const a = analyze(data, parseAliases(this.settings.aliases), stamps);
    const id = moved[0];
    // Merge into the drag's history step: one ctrl+z undoes the drag and the realign.
    if (this.applyMoves(canvas, planRealign(a, id, canvas.gridSpacing, this.floorFor(canvas, data, id)), true, id)) this.tick();
  }

  /* Manual layout: the card moves under its parent, the front lines up in a row. */
  layoutNode(canvas, id) {
    const view = this.viewOf(canvas);
    const a = view && this.analysis.get(view);
    const parent = a && (a.parents.get(id) || [])[0];
    if (!parent) { new Notice(t("noParent")); return; }
    this.applyMoves(canvas, planLayout(a, id, parent, canvas.gridSpacing, this.floorFor(canvas, canvas.getData(), id)), false, id);
    this.tick();
  }

  /* Bands take no arrows. CSS already hides their handles and lets a dragged arrow pass
   * through them; this removes any arrow that still got attached to a band. */
  dropBandEdges(canvas, data) {
    if (!canvas.edges || typeof canvas.removeEdge !== "function") return;
    const bad = (data.edges || []).filter((e) =>
      String(e.fromNode).startsWith(BAND_PREFIX) || String(e.toNode).startsWith(BAND_PREFIX));
    let removed = false;
    for (const e of bad) {
      const edge = canvas.edges.get(e.id);
      if (edge) { canvas.removeEdge(edge); removed = true; }
    }
    if (!removed) return;
    if (typeof canvas.overrideHistory === "function") canvas.overrideHistory();
    else if (typeof canvas.requestSave === "function") canvas.requestSave(false);
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

  /* The y new work must stay below: under today's (and earlier) bands. */
  floorFor(canvas, data, cardId) {
    const card = (data.nodes || []).find((n) => n.id === cardId);
    if (!card) return null;
    const f = bandFloor(data.nodes, card, canvas.gridSpacing || 20);
    return Number.isFinite(f) ? f : null;
  }

  dayStart() {
    const h = parseInt(this.settings.dayStart, 10);
    return h >= 0 && h < 24 ? h : 4;
  }

  /* Auto band: a new card that starts a session puts a dated band under all the older cards
   * and drops the new cards below it. A session starts after a break (the band gets the real
   * date it started, so a night past midnight stays one session) or on a new day counted from
   * the "day starts at" hour. A canvas with no bands yet gets one on its first new card.
   * One band per date. */
  autoBand(canvas, data, freshIds, lastWork, now) {
    const mode = this.settings.autoBand;
    if (mode !== "break" && mode !== "calendar") return false;
    const ds = this.dayStart();
    const day = mode === "calendar" ? logicalDay(now, ds) : logicalDay(now, 0);
    const key = ymd(day);
    if (data.nodes.some((n) => bandDate(n) === key)) return false;
    const hasBands = data.nodes.some(isBand);
    if (hasBands && lastWork) {
      const hours = parseFloat(this.settings.breakHours);
      if (mode === "break" && now - lastWork < (hours > 0 ? hours : 6) * 3600e3) return false;
      if (mode === "calendar" && ymd(logicalDay(lastWork, ds)) === key) return false;
    }
    const fresh = new Set(freshIds);
    const real = data.nodes.filter((n) => !isBand(n));
    const old = real.filter((n) => !fresh.has(n.id) && n.type !== "group");
    const news = real.filter((n) => fresh.has(n.id));
    if (!news.length) return false;
    const gap = canvas.gridSpacing || 20;
    // Under all the older cards; on an empty canvas, just above the first card.
    const y = old.length ? Math.max(...old.map((n) => n.y + n.height)) + gap
      : Math.min(...news.map((n) => n.y)) - gap - BAND_H;
    const band = makeBand(day, bandGeometry(real), y);
    let added = false;
    if (typeof canvas.importData === "function") {
      // Adds the band without rebuilding the canvas, so a card being typed in keeps focus.
      try { canvas.importData({ nodes: [band], edges: [] }); added = canvas.nodes.has(band.id); } catch (e) { console.error("worklog-timeline", e); }
    }
    if (!added) {
      data.nodes.unshift(band);
      canvas.setData(data);
    }
    const floor = band.y + BAND_H + gap;
    for (const id of freshIds) {
      const node = canvas.nodes.get(id);
      if (node && node.y < floor && typeof node.moveAndResize === "function") {
        node.moveAndResize({ x: node.x, y: floor, width: node.width, height: node.height });
      }
    }
    // Merge into the card-creation step: one ctrl+z removes the card and its band.
    if (typeof canvas.overrideHistory === "function") canvas.overrideHistory();
    else if (typeof canvas.requestSave === "function") canvas.requestSave();
    return true;
  }

  askBand() {
    const view = this.activeCanvas();
    if (!view) { new Notice(t("openCanvas")); return; }
    new BandModal(this.app, ymd(new Date()), (d) => this.placeBand(d)).open();
  }

  /* Put the band for `day` at the center of the screen. If that date has a band, move it
   * there and keep its text (it may have been renamed, e.g. to a stage). */
  placeBand(day) {
    const view = this.activeCanvas();
    if (!view) { new Notice(t("openCanvas")); return; }
    const canvas = view.canvas;
    const data = canvas.getData();
    const real = data.nodes.filter((n) => !isBand(n));
    if (real.length === 0) { new Notice(t("emptyCanvas")); return; }
    const geo = bandGeometry(real);
    const maxY = Math.max(...real.map((n) => n.y + n.height));
    const cy = Number.isFinite(canvas.y) ? canvas.y : maxY + 100;
    const band = makeBand(day, geo, cy - BAND_H / 2);
    const existing = data.nodes.find((n) => bandDate(n) === ymd(day));
    if (existing) Object.assign(existing, { x: band.x, y: band.y, width: band.width, height: BAND_H });
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
    for (const name of names) {
      const c = a.catalog.get(name);
      if (!c) continue;
      menu.addItem((item) => item
        .setTitle(t(c.archived ? "menuUnarchive" : "menuArchive", { name: short(name) }))
        .setIcon(c.archived ? "archive-restore" : "archive")
        .onClick(() => this.toggleArchive(view, name)));
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

  /* Archive: a one-off project hides from the panel once it has no open tasks, and shows
   * again under "Archive" on request. Kept per canvas by root card ids, so the card text stays
   * clean and a renamed root keeps its flag. */
  toggleArchive(view, name) {
    const a = view && this.analysis.get(view);
    const c = a && a.catalog.get(name);
    if (!c) return;
    const path = view.file.path;
    const ids = new Set(this.settings.archived[path] || []);
    const roots = c.headers.map((h) => h.id);
    if (c.archived) for (const id of roots) ids.delete(id);
    else for (const id of roots) ids.add(id);
    // Forget roots that are gone from the canvas.
    for (const id of [...ids]) if (!view.canvas.nodes.has(id)) ids.delete(id);
    if (ids.size) this.settings.archived[path] = [...ids]; else delete this.settings.archived[path];
    void this.save();
    new Notice(t(c.archived ? "unarchived" : "archived", { name }));
    this.tick();
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
      .map((c) => `${c.name}:${c.open}:${c.paused}:${c.archived}:${c.headers.map((h) => h.id + h.sub).join(",")}:${c.last && c.last.id}:${[...c.openTasks, ...c.pausedTasks].map((n) => n.id + cleanName(n.text)).join(",")}`).join(";");
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
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; this.openSections = new Set(); this.openLists = new Set(); }
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
    // An archived project hides once it has no open tasks; while it has some, it shows as usual.
    const hidden = (c) => c.archived && c.open === 0;
    const shown = all.filter((c) => !hidden(c));
    const working = shown.filter((c) => !c.paused && c.open > 0).sort((p, q) => q.open - p.open || byName(p, q));
    const paused = shown.filter((c) => c.paused).sort(byName);
    const sleeping = shown.filter((c) => !c.paused && c.open === 0).sort(byName);
    const archive = all.filter(hidden).sort(byName);

    const section = (title, list, collapsible) => {
      if (!list.length) return;
      let body = root;
      if (collapsible) {
        const det = root.createEl("details", { cls: "wl-p-section" });
        det.open = this.openSections.has(collapsible) || list.some((c) => this.sel.names.has(c.name));
        det.addEventListener("toggle", () => {
          if (det.open) this.openSections.add(collapsible); else this.openSections.delete(collapsible);
        });
        det.createEl("summary", { text: `${title} · ${list.length}` });
        body = det;
      } else {
        root.createDiv({ cls: "wl-p-title", text: `${title} · ${list.length}` });
      }
      for (const c of list) this.row(body, view, c);
    };
    section(t("secWorking"), working, false);
    section(t("secPaused"), paused, false);
    section(t("secSleeping"), sleeping, "sleeping");
    section(t("secArchived"), archive, "archive");
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
    const arc = head.createSpan({ cls: "wl-p-btn wl-p-archive" + (c.archived ? " is-on" : "") });
    if (typeof setIcon === "function") setIcon(arc, c.archived ? "archive-restore" : "archive"); else arc.setText("🗄");
    arc.setAttr("aria-label", t(c.archived ? "btnUnarchive" : "btnArchive"));
    arc.addEventListener("click", () => this.plugin.toggleArchive(view, c.name));

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

class BandModal extends Modal {
  constructor(app, value, onPick) { super(app); this.value = value; this.onPick = onPick; }
  onOpen() {
    this.titleEl.setText(t("bandTitle"));
    let input;
    const submit = () => {
      const d = parseYmd(input.value);
      if (!d) return;
      this.close();
      this.onPick(d);
    };
    new Setting(this.contentEl)
      .setName(t("bandDate"))
      .setDesc(t("bandDateDesc"))
      .addText((c) => {
        input = c.inputEl;
        input.type = "date";
        c.setValue(this.value);
        input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } });
      });
    new Setting(this.contentEl)
      .addButton((b) => b.setButtonText(t("bandOk")).setCta().onClick(submit));
    window.setTimeout(() => input && input.focus(), 0);
  }
  onClose() { this.contentEl.empty(); }
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
    const mode = ["off", "break", "calendar"].includes(p.settings.autoBand) ? p.settings.autoBand : "break";
    new Setting(containerEl)
      .setName(t("setAutoBand"))
      .setDesc(t("setAutoBandDesc"))
      .addDropdown((c) => c
        .addOption("break", t("autoBreak"))
        .addOption("calendar", t("autoCalendar"))
        .addOption("off", t("autoOff"))
        .setValue(mode)
        .onChange(async (v) => { p.settings.autoBand = v; await p.save(); this.display(); }));
    if (mode === "break") {
      new Setting(containerEl)
        .setName(t("setBreak"))
        .setDesc(t("setBreakDesc"))
        .addText((c) => c.setValue(String(p.settings.breakHours)).onChange(async (v) => {
          const n = parseFloat(v);
          if (n > 0) { p.settings.breakHours = n; await p.save(); }
        }).inputEl.type = "number");
    }
    if (mode === "calendar") {
      new Setting(containerEl)
        .setName(t("setDayStart"))
        .setDesc(t("setDayStartDesc"))
        .addText((c) => c.setValue(String(p.dayStart())).onChange(async (v) => {
          const n = parseInt(v, 10);
          if (n >= 0 && n < 24) { p.settings.dayStart = n; await p.save(); }
        }).inputEl.type = "number");
    }
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

/* Pure functions, for tests (tests/*.test.js). Obsidian only uses the class itself. */
module.exports.core = {
  analyze, isDone, parseRoot, cleanName, planLayout, planRealign, planBandPush, bandFloor,
  isNewChild, arrowHits, findSlot,
};
