const PREFS_KEY = 'futures-board.prefs';
const TAGS = ['保證金', '假期', '系統', '商品', '防詐', '活動', '其他'];
const CARD_PREVIEW = 40; // 每張卡先顯示幾則，其餘按「顯示全部」再展開
const TIMELINE_CHUNK = 300;
/** 台灣時間的自動更新時刻，與 .github/workflows/scrape.yml 的 cron 一致。 */
const UPDATE_HOURS = [8, 11, 15, 19, 23];

/** 字級可選的基準值（px）。 */
const FONT_STEPS = [13.5, 15, 16.5, 18, 20, 22];
const DEFAULT_FONT_STEP = 1; // 介面上顯示為「字級 2/6」

/** 期交所三塊共用金色；期貨商各自一個色相，卡片一眼分得出來。 */
const EXCHANGE_HUE = 42;
const BROKER_HUE = {
  dcnf: 40, // 大昌 琥珀
  yuanta: 8, // 元大 朱紅
  tsfutures: 350, // 台新 紅
  spf: 218, // 永豐 藍
  mega: 196, // 兆豐 天藍
  concord: 172, // 康和 青
  cathay: 300, // 國泰 洋紅
  ibff: 18, // 國票 橙
  pfcf: 95, // 統一 黃綠
  fubon: 145, // 富邦 綠
  entrust: 275, // 華南 紫
  kgi: 250, // 凱基 靛
  capital: 325, // 群益 桃
};

const el = {
  excludedNotice: document.getElementById('excluded-notice'),
  scope: document.getElementById('scope'),
  search: document.getElementById('search'),
  clearSearch: document.getElementById('clear-search'),
  viewBoard: document.getElementById('view-board'),
  viewTimeline: document.getElementById('view-timeline'),
  tagFilters: document.getElementById('tag-filters'),
  showMargin: document.getElementById('show-margin'),
  showMarginLabel: document.getElementById('show-margin-label'),
  fontUp: document.getElementById('font-up'),
  fontDown: document.getElementById('font-down'),
  fontLevel: document.getElementById('font-level'),
  lens: document.getElementById('lens'),
  boardWrap: document.getElementById('board-wrap'),
  exchange: document.getElementById('exchange'),
  board: document.getElementById('board'),
  timeline: document.getElementById('timeline'),
  empty: document.getElementById('empty'),
  updateInfo: document.getElementById('update-info'),
  scheduleInfo: document.getElementById('schedule-info'),
  errors: document.getElementById('broker-errors'),
};

const prefs = loadPrefs();

const state = {
  data: { exchanges: [], brokers: [], generatedAt: null, since: null, excludedKeywords: [] },
  query: '',
  tags: new Set(),
  showMargin: prefs.showMargin ?? false, // 保證金公告量最大，預設收合
  fontStep: clampStep(prefs.fontStep ?? DEFAULT_FONT_STEP),
  view: 'board',
  expanded: new Set(), // 哪些卡片已按下「顯示全部」
  timelineLimit: TIMELINE_CHUNK,
};

init();

async function init() {
  lockContextMenu();
  applyFontStep();
  renderTagFilters();
  bindEvents();
  bindLens();
  el.showMargin.checked = state.showMargin;

  try {
    const res = await fetch(`data.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();
  } catch (err) {
    el.empty.hidden = false;
    el.empty.textContent = `讀取資料失敗：${err.message}`;
    return;
  }

  renderMeta();
  render();
}

/** 鎖右鍵。純前端的嚇阻，開發者工具與檢視原始碼仍然繞得過去。 */
function lockContextMenu() {
  document.addEventListener('contextmenu', (event) => event.preventDefault());
}

/* ------------------------------------------------------------------ events */
function bindEvents() {
  el.search.addEventListener('input', () => {
    state.query = el.search.value.trim();
    el.clearSearch.hidden = state.query === '';
    state.timelineLimit = TIMELINE_CHUNK;
    render();
  });

  el.clearSearch.addEventListener('click', () => {
    el.search.value = '';
    state.query = '';
    el.clearSearch.hidden = true;
    el.search.focus();
    render();
  });

  el.viewBoard.addEventListener('click', () => setView('board'));
  el.viewTimeline.addEventListener('click', () => setView('timeline'));

  el.showMargin.addEventListener('change', () => {
    state.showMargin = el.showMargin.checked;
    savePrefs();
    state.timelineLimit = TIMELINE_CHUNK;
    render();
  });

  el.fontUp.addEventListener('click', () => setFontStep(state.fontStep + 1));
  el.fontDown.addEventListener('click', () => setFontStep(state.fontStep - 1));
}

/* -------------------------------------------------------------- 字級調整 */
function setFontStep(step) {
  state.fontStep = clampStep(step);
  applyFontStep();
  savePrefs();
}

function applyFontStep() {
  document.documentElement.style.setProperty('--ui-size', `${FONT_STEPS[state.fontStep]}px`);
  el.fontLevel.textContent = `字級 ${state.fontStep + 1}/${FONT_STEPS.length}`;
  el.fontDown.disabled = state.fontStep === 0;
  el.fontUp.disabled = state.fontStep === FONT_STEPS.length - 1;
}

function clampStep(step) {
  return Math.min(Math.max(Number(step) || 0, 0), FONT_STEPS.length - 1);
}

/* ---------------------------------------------------------------- 放大鏡 */
/**
 * 滑鼠移到公告標題時，跟著游標顯示一個放大的鏡片。標題常被卡片寬度截斷，
 * 放大鏡順便把完整內容攤開。用事件委派 + 單一鏡片元素，不隨公告數量增加成本。
 */
function bindLens() {
  const OFFSET = 18;

  document.addEventListener('mouseover', (event) => {
    const title = event.target.closest?.('.item__title');
    if (!title) return;
    const meta = title.parentElement?.querySelector('.item__meta');
    const body = document.createElement('span');
    body.textContent = title.textContent;
    if (meta) {
      const note = document.createElement('span');
      note.className = 'lens__meta';
      note.textContent = meta.textContent.replace(/\s+/g, ' ').trim();
      body.append(note);
    }
    el.lens.replaceChildren(svgIcon('i-search'), body);
    el.lens.classList.add('is-on');
    positionLens(event);
  });

  document.addEventListener('mouseout', (event) => {
    if (event.target.closest?.('.item__title')) el.lens.classList.remove('is-on');
  });

  document.addEventListener('mousemove', (event) => {
    if (el.lens.classList.contains('is-on')) positionLens(event);
  });

  // 捲動時游標下的元素會變，直接收掉比較不會殘留。
  window.addEventListener('scroll', () => el.lens.classList.remove('is-on'), { passive: true });

  function positionLens(event) {
    const rect = el.lens.getBoundingClientRect();
    const left = Math.min(event.clientX + OFFSET, window.innerWidth - rect.width - 8);
    const top =
      event.clientY + OFFSET + rect.height > window.innerHeight
        ? event.clientY - rect.height - OFFSET
        : event.clientY + OFFSET;
    el.lens.style.left = `${Math.max(8, left)}px`;
    el.lens.style.top = `${Math.max(8, top)}px`;
  }
}

function setView(view) {
  state.view = view;
  state.timelineLimit = TIMELINE_CHUNK;
  el.viewBoard.classList.toggle('is-on', view === 'board');
  el.viewTimeline.classList.toggle('is-on', view === 'timeline');
  el.viewBoard.setAttribute('aria-selected', String(view === 'board'));
  el.viewTimeline.setAttribute('aria-selected', String(view === 'timeline'));
  render();
}

function renderTagFilters() {
  el.tagFilters.replaceChildren(
    ...TAGS.map((tag) => {
      const button = document.createElement('button');
      button.className = 'chip';
      button.textContent = tag;
      button.type = 'button';
      button.addEventListener('click', () => {
        state.tags.has(tag) ? state.tags.delete(tag) : state.tags.add(tag);
        button.classList.toggle('is-on', state.tags.has(tag));
        state.timelineLimit = TIMELINE_CHUNK;
        render();
      });
      return button;
    })
  );
}

/* ------------------------------------------------------------------ render */
function renderMeta() {
  const excluded = state.data.excludedKeywords ?? [];
  el.excludedNotice.textContent = excluded.length
    ? `本看板不收錄以下類別的公告：${excluded.join('、')}。這些請直接到各來源官網查看。`
    : '';

  const total = allItems().length;
  const margin = allItems().filter((it) => it.tag === '保證金').length;
  el.scope.textContent = `收錄 ${state.data.since ?? ''} 起共 ${total.toLocaleString('zh-TW')} 則`;
  el.showMarginLabel.textContent = `顯示保證金公告（${margin.toLocaleString('zh-TW')} 則）`;

  const when = state.data.generatedAt ? new Date(state.data.generatedAt) : null;
  el.updateInfo.textContent = when
    ? `資料更新時間：${when.toLocaleString('zh-TW', { dateStyle: 'full', timeStyle: 'short' })}`
    : '資料更新時間：未知';
  el.scheduleInfo.textContent =
    `自動更新時刻（台灣時間）：${UPDATE_HOURS.map((h) => `${String(h).padStart(2, '0')}:00`).join('、')}` +
    `，有新公告才會更新。`;

  const broken = allSources().filter((s) => !s.ok);
  el.errors.textContent = broken.length
    ? `本次抓取失敗：${broken.map((s) => s.name).join('、')}（顯示上次成功的內容）`
    : '';
}

function render() {
  const exchanges = withVisible(state.data.exchanges);
  const brokers = withVisible(state.data.brokers);
  const total = [...exchanges, ...brokers].reduce((n, s) => n + s.visible.length, 0);

  el.empty.hidden = total > 0;
  el.boardWrap.hidden = state.view !== 'board';
  el.timeline.hidden = state.view !== 'timeline';

  if (state.view === 'board') {
    el.exchange.replaceChildren(...exchanges.map((s) => renderCard(s, EXCHANGE_HUE)));
    el.board.replaceChildren(...brokers.map((s) => renderCard(s, BROKER_HUE[s.id] ?? 210)));
  } else {
    renderTimeline([...exchanges, ...brokers]);
  }
}

function withVisible(sources) {
  return (sources ?? []).map((source) => ({ ...source, visible: source.items.filter(matches) }));
}

function renderCard(source, hue) {
  const card = document.createElement('article');
  card.className = 'card';
  card.style.setProperty('--hue', String(hue));

  const head = document.createElement('div');
  head.className = 'card__head';

  const title = document.createElement('h2');
  title.textContent = source.name;
  head.append(title);

  const link = document.createElement('a');
  link.href = source.board;
  link.target = '_blank';
  link.rel = 'noopener';
  link.append('原站', svgIcon('i-external'));
  link.title = source.feeds ? `來源：${source.feeds}` : '';
  head.append(link);

  const count = document.createElement('span');
  count.className = 'count';
  count.textContent = `${source.visible.length} 則`;
  head.append(count);

  if (!source.ok) {
    const warn = document.createElement('span');
    warn.className = 'warn';
    warn.append(svgIcon('i-warn'));
    warn.title = `抓取失敗：${source.error ?? '未知錯誤'}`;
    head.append(warn);
  }

  card.append(head);

  const expanded = state.expanded.has(source.id);
  const shown = expanded ? source.visible : source.visible.slice(0, CARD_PREVIEW);

  const list = document.createElement('ul');
  list.className = 'items';
  list.append(...shown.map((item) => renderItem(item)));
  card.append(list);

  if (source.visible.length > CARD_PREVIEW) {
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'card__more';
    more.textContent = expanded
      ? '收合'
      : `顯示全部 ${source.visible.length.toLocaleString('zh-TW')} 則`;
    more.addEventListener('click', () => {
      expanded ? state.expanded.delete(source.id) : state.expanded.add(source.id);
      render();
    });
    card.append(more);
  }
  return card;
}

function renderTimeline(sources) {
  const items = sources
    .flatMap((s) => s.visible.map((it) => ({ ...it, source: s.name, sourceId: s.id })))
    .sort(
      (a, b) =>
        Number(a.pinned ?? false) - Number(b.pinned ?? false) ||
        (b.date ?? '').localeCompare(a.date ?? '')
    );

  const slice = items.slice(0, state.timelineLimit);
  const groups = new Map();
  for (const item of slice) {
    const key = item.date ?? '日期不詳';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const nodes = [];
  for (const [day, rows] of groups) {
    const heading = document.createElement('div');
    heading.className = 'day';
    heading.textContent = `${formatDay(day)}　${rows.length} 則`;
    nodes.push(heading);

    const list = document.createElement('ul');
    list.append(...rows.map((item) => renderItem(item, { showSource: true })));
    nodes.push(list);
  }

  if (items.length > slice.length) {
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'card__more';
    more.textContent = `載入更多（還有 ${(items.length - slice.length).toLocaleString('zh-TW')} 則）`;
    more.addEventListener('click', () => {
      state.timelineLimit += TIMELINE_CHUNK;
      render();
    });
    nodes.push(more);
  }
  el.timeline.replaceChildren(...nodes);
}

function renderItem(item, { showSource = false } = {}) {
  const li = document.createElement('li');

  const anchor = document.createElement('a');
  anchor.className = 'item';
  anchor.href = item.url;
  anchor.target = '_blank';
  anchor.rel = 'noopener';

  const meta = document.createElement('span');
  meta.className = 'item__meta';

  const date = document.createElement('span');
  date.textContent = item.pinned ? '置頂' : (item.date ?? '—');
  meta.append(date);

  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.dataset.tag = item.tag;
  tag.textContent = item.tag;
  tag.title = item.category ?? '';
  meta.append(tag);

  if (showSource) {
    const source = document.createElement('span');
    source.className = 'broker-name';
    source.textContent = item.source;
    // 時間軸上各來源混在一起，用同一組色相標出來源。
    const hue = BROKER_HUE[item.sourceId] ?? EXCHANGE_HUE;
    source.style.color = `hsl(${hue} 75% 72%)`;
    anchor.style.setProperty('--hue', String(hue));
    anchor.classList.add('item--sourced');
    meta.append(source);
  }

  const title = document.createElement('span');
  title.className = 'item__title';
  highlight(title, item.title, state.query);

  anchor.append(meta, title);
  li.append(anchor);
  return li;
}

/* ----------------------------------------------------------------- helpers */
/** 取用 index.html 裡的 SVG 圖示庫，介面不用 emoji 當圖示。 */
function svgIcon(id) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}

function matches(item) {
  // 保證金量最大，預設收起來；但使用者若主動點選「保證金」分類，就以分類篩選為準。
  if (!state.showMargin && item.tag === '保證金' && !state.tags.has('保證金')) return false;
  if (state.tags.size > 0 && !state.tags.has(item.tag)) return false;
  if (state.query && !item.title.toLowerCase().includes(state.query.toLowerCase())) return false;
  return true;
}

/** Fills `node` with `text`, wrapping occurrences of `query` in <mark>. */
function highlight(node, text, query) {
  if (!query) {
    node.textContent = text;
    return;
  }
  const lower = text.toLowerCase();
  const needle = query.toLowerCase();
  let from = 0;
  let at = lower.indexOf(needle);
  while (at !== -1) {
    node.append(text.slice(from, at));
    const mark = document.createElement('mark');
    mark.textContent = text.slice(at, at + needle.length);
    node.append(mark);
    from = at + needle.length;
    at = lower.indexOf(needle, from);
  }
  node.append(text.slice(from));
}

function formatDay(day) {
  if (day === '日期不詳') return day;
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
  return `${day}（週${weekday}）`;
}

function allSources() {
  return [...(state.data.exchanges ?? []), ...(state.data.brokers ?? [])];
}

function allItems() {
  return allSources().flatMap((s) => s.items);
}

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function savePrefs() {
  try {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ showMargin: state.showMargin, fontStep: state.fontStep })
    );
  } catch {
    /* 存不了就算了，下次重新載入回到預設值 */
  }
}
