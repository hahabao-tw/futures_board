import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { ALL_SOURCES, BROKERS, EXCHANGES } from './sources/index.mjs';
import { EDGE_KEYWORDS, MAX_ITEMS_PER_BROKER, SINCE, isEdgeCategory } from './config.mjs';
import { dedupe, itemId, normaliseTag, sortByDateDesc } from './lib/util.mjs';

const OUT_FILE = new URL('../site/data.json', import.meta.url);
const TODAY = new Date().toISOString().slice(0, 10);

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const previous = await readPrevious();
const previousSignature = signatureOf([...previous.values()]);

const results = [];
for (const source of ALL_SOURCES) {
  if (only.length && !only.includes(source.id)) {
    const kept = previous.get(source.id);
    if (kept) results.push(kept);
    continue;
  }

  const started = Date.now();
  try {
    const raw = await source.fetch();
    const shaped = raw
      .filter((it) => it.title && it.title.length > 3)
      .filter((it) => !isEdgeCategory(it.category))
      // Anything without a date is kept: it is usually a standing notice, and
      // dropping it would silently hide announcements the source still shows.
      .filter((it) => !it.date || it.date >= SINCE)
      .map((it) => ({
        id: itemId(source.id, it.title, it.url),
        title: it.title,
        url: it.url ?? source.board,
        date: it.date ?? null,
        category: it.category || null,
        tag: normaliseTag(it.category, it.title),
        pinned: Boolean(it.date && it.date > TODAY),
      }));

    const items = sortByDateDesc(dedupe(shaped)).slice(0, MAX_ITEMS_PER_BROKER);
    if (items.length === 0) throw new Error('解析到 0 筆，選擇器或 API 可能已失效');

    results.push({ ...describe(source), ok: true, error: null, items });
    console.log(
      `✓ ${source.name.padEnd(12)}${String(items.length).padStart(5)} 筆\t${Date.now() - started}ms`
    );
  } catch (err) {
    // Keep the last good snapshot so one source's outage doesn't blank its card.
    const stale = previous.get(source.id);
    results.push({
      ...describe(source),
      ok: false,
      error: String(err.message ?? err).slice(0, 200),
      items: stale?.items ?? [],
      fetchedAt: stale?.fetchedAt ?? null,
    });
    console.log(`✗ ${source.name}\t${err.message}`);
  }
}

const failed = results.filter((r) => !r.ok);
const total = results.reduce((n, r) => n + r.items.length, 0);
console.log(`\n完成：${results.length - failed.length}/${results.length} 個來源成功，共 ${total} 筆`);
if (failed.length) console.log(`失敗：${failed.map((f) => f.name).join('、')}`);

// 沒有新公告就完全不動 data.json：時間戳每次都變的話，CI 會誤判成有更新而
// 天天產生 commit 並重新部署。所以先比對內容，一樣就跳過。
if (signatureOf(results) === previousSignature) {
  console.log('公告內容與上次相同，data.json 不變更。');
} else {
  const byId = new Map(results.map((r) => [r.id, r]));
  const payload = {
    generatedAt: new Date().toISOString(),
    since: SINCE,
    excludedKeywords: EDGE_KEYWORDS,
    exchanges: EXCHANGES.map((s) => byId.get(s.id)).filter(Boolean),
    brokers: BROKERS.map((s) => byId.get(s.id)).filter(Boolean),
  };
  await mkdir(new URL('../site/', import.meta.url), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(payload) + '\n', 'utf8');
  console.log('偵測到新公告，已更新 data.json。');
}

/**
 * 「這次抓到的公告集合」的指紋。刻意排序後再比對，這樣即使來源回傳順序有
 * 些微差異，只要公告本身沒變就不算更新。
 */
function signatureOf(sources) {
  return JSON.stringify(
    sources
      .map((s) => [s.id, s.items.map((it) => it.id).sort()])
      .sort((a, b) => a[0].localeCompare(b[0]))
  );
}

function describe(source) {
  return {
    id: source.id,
    name: source.name,
    board: source.board,
    feeds: source.feeds,
    fetchedAt: new Date().toISOString(),
  };
}

async function readPrevious() {
  try {
    const json = JSON.parse(await readFile(OUT_FILE, 'utf8'));
    const all = [...(json.exchanges ?? []), ...(json.brokers ?? [])];
    return new Map(all.map((s) => [s.id, s]));
  } catch {
    return new Map();
  }
}
