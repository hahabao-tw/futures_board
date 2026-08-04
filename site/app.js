const SEEN_KEY = 'futures-board.seen';
const TAGS = ['保證金', '假期', '系統', '商品', '防詐', '活動', '其他'];
const CARD_PREVIEW = 40; // 每張卡先顯示幾則，其餘按「顯示全部」再展開
const TIMELINE_CHUNK = 300;

const el = {
  updated: document.getElementById('updated'),
  search: document.getElementById('search'),
  clearSearch: document.getElementById('clear-search'),
  viewBoard: document.getElementById('view-board'),
  viewTimeline: document.getElementById('view-timeline'),
  tagFilters: document.getElementById('tag-filters'),
  onlyNew: document.getElementById('only-new'),
  markAll: document.getElementById('mark-all'),
  board: document.getElementById('board'),
  timeline: document.getElementById('timeline'),
  empty: document.getElementById('empty'),
  errors: document.getElementById('broker-errors'),
};

const state = {
  data: { brokers: [], generatedAt: null, since: null },
  seen: loadSeen(),
  query: '',
  tags: new Set(),
  onlyNew: false,
  view: 'board',
  expanded: new Set(), // 哪些卡片已按下「顯示全部」
  timelineLimit: TIMELINE_CHUNK,
};

init();

async function init() {
  renderTagFilters();
  bindEvents();

  try {
    const res = await fetch(`data.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();
  } catch (err) {
    el.empty.hidden = false;
    el.empty.textContent = `讀取資料失敗：${err.message}`;
    return;
  }

  // First visit: treat everything as already read, so the board doesn't open
  // with thousands of unread markers on day one.
  if (state.seen === null) {
    state.seen = new Set(allItems().map((it) => it.id));
    saveSeen();
  }

  renderMeta();
  render();
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

  el.onlyNew.addEventListener('change', () => {
    state.onlyNew = el.onlyNew.checked;
    render();
  });

  el.markAll.addEventListener('click', () => {
    allItems().forEach((it) => state.seen.add(it.id));
    saveSeen();
    render();
  });
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
  const when = state.data.generatedAt ? new Date(state.data.generatedAt) : null;
  const total = allItems().length;
  const parts = [];
  if (when)
    parts.push(`更新於 ${when.toLocaleString('zh-TW', { dateStyle: 'medium', timeStyle: 'short' })}`);
  parts.push(`收錄 ${state.data.since ?? ''} 起共 ${total.toLocaleString('zh-TW')} 則`);
  el.updated.textContent = parts.join('｜');

  const broken = state.data.brokers.filter((b) => !b.ok);
  el.errors.textContent = broken.length
    ? `｜本次抓取失敗：${broken.map((b) => b.name).join('、')}（顯示上次成功的內容）`
    : '';
}

function render() {
  const brokers = state.data.brokers.map((broker) => ({
    ...broker,
    visible: broker.items.filter(matches),
  }));
  const total = brokers.reduce((n, b) => n + b.visible.length, 0);

  el.empty.hidden = total > 0;
  el.board.hidden = state.view !== 'board';
  el.timeline.hidden = state.view !== 'timeline';

  if (state.view === 'board') el.board.replaceChildren(...brokers.map(renderCard));
  else renderTimeline(brokers);
}

function renderCard(broker) {
  const card = document.createElement('article');
  card.className = 'card';

  const head = document.createElement('div');
  head.className = 'card__head';

  const title = document.createElement('h2');
  title.textContent = broker.name;
  head.append(title);

  const link = document.createElement('a');
  link.href = broker.board;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = '官網公告 ↗';
  link.title = broker.feeds ? `來源：${broker.feeds}` : '';
  head.append(link);

  const unread = broker.visible.filter((it) => !state.seen.has(it.id)).length;
  const count = document.createElement('span');
  count.className = 'count';
  count.textContent = `${broker.visible.length} 則`;
  if (unread > 0) {
    const badge = document.createElement('span');
    badge.className = 'badge-new';
    badge.textContent = String(unread);
    badge.title = `${unread} 則未讀`;
    count.prepend(badge);
  }
  head.append(count);

  if (!broker.ok) {
    const warn = document.createElement('span');
    warn.className = 'warn';
    warn.textContent = '⚠';
    warn.title = `抓取失敗：${broker.error ?? '未知錯誤'}`;
    head.append(warn);
  }

  card.append(head);

  const expanded = state.expanded.has(broker.id);
  const shown = expanded ? broker.visible : broker.visible.slice(0, CARD_PREVIEW);

  const list = document.createElement('ul');
  list.className = 'items';
  list.append(...shown.map((item) => renderItem(item)));
  card.append(list);

  if (broker.visible.length > CARD_PREVIEW) {
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'card__more';
    more.textContent = expanded
      ? '收合'
      : `顯示全部 ${broker.visible.length.toLocaleString('zh-TW')} 則`;
    more.addEventListener('click', () => {
      expanded ? state.expanded.delete(broker.id) : state.expanded.add(broker.id);
      render();
    });
    card.append(more);
  }
  return card;
}

function renderTimeline(brokers) {
  const items = brokers
    .flatMap((b) => b.visible.map((it) => ({ ...it, broker: b.name })))
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
    list.append(...rows.map((item) => renderItem(item, { showBroker: true })));
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

function renderItem(item, { showBroker = false } = {}) {
  const li = document.createElement('li');
  const isNew = !state.seen.has(item.id);

  const anchor = document.createElement('a');
  anchor.className = `item${isNew ? ' is-new' : ''}`;
  anchor.href = item.url;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  anchor.addEventListener('click', () => {
    if (!state.seen.has(item.id)) {
      state.seen.add(item.id);
      saveSeen();
      anchor.classList.remove('is-new');
      anchor.querySelector('.dot')?.classList.add('is-hidden');
    }
  });

  const meta = document.createElement('span');
  meta.className = 'item__meta';

  const dot = document.createElement('span');
  dot.className = `dot${isNew ? '' : ' is-hidden'}`;
  dot.title = '未讀';
  meta.append(dot);

  const date = document.createElement('span');
  date.textContent = item.pinned ? '置頂' : (item.date ?? '—');
  meta.append(date);

  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.dataset.tag = item.tag;
  tag.textContent = item.tag;
  tag.title = item.category ?? '';
  meta.append(tag);

  if (showBroker) {
    const broker = document.createElement('span');
    broker.className = 'broker-name';
    broker.textContent = item.broker;
    meta.append(broker);
  }

  const title = document.createElement('span');
  title.className = 'item__title';
  highlight(title, item.title, state.query);

  anchor.append(meta, title);
  li.append(anchor);
  return li;
}

/* ----------------------------------------------------------------- helpers */
function matches(item) {
  if (state.onlyNew && state.seen.has(item.id)) return false;
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

function allItems() {
  return state.data.brokers.flatMap((b) => b.items);
}

function loadSeen() {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw === null ? null : new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveSeen() {
  // Cap the stored set so it can't grow without bound as items age out.
  const ids = [...state.seen].slice(-8000);
  state.seen = new Set(ids);
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
  } catch {
    /* storage full or blocked — unread state is a nicety, not critical */
  }
}
