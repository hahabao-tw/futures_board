import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { BROKERS } from './sources/index.mjs';
import { closeBrowser } from './lib/browser.mjs';
import { dedupe, itemId, normaliseTag, sortByDateDesc } from './lib/util.mjs';

const OUT_FILE = new URL('../site/data.json', import.meta.url);
const MAX_ITEMS = 20;
const TODAY = new Date().toISOString().slice(0, 10);

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const previous = await readPrevious();

const results = [];
for (const broker of BROKERS) {
  if (only.length && !only.includes(broker.id)) {
    const kept = previous.get(broker.id);
    if (kept) results.push(kept);
    continue;
  }

  const started = Date.now();
  try {
    const raw = await broker.fetch();
    const items = sortByDateDesc(
      dedupe(
        raw
          .filter((it) => it.title && it.title.length > 3)
          .map((it) => ({
            id: itemId(broker.id, it.title, it.url),
            title: it.title,
            url: it.url ?? broker.board,
            date: it.date ?? null,
            category: it.category || null,
            tag: normaliseTag(it.category, it.title),
            pinned: Boolean(it.date && it.date > TODAY),
          }))
      )
    ).slice(0, MAX_ITEMS);

    if (items.length === 0) throw new Error('解析到 0 筆，選擇器可能已失效');

    results.push({ ...describe(broker), ok: true, error: null, items });
    console.log(`✓ ${broker.name}\t${items.length} 筆\t${Date.now() - started}ms`);
  } catch (err) {
    // Keep the last good snapshot so one broker's outage doesn't blank its card.
    const stale = previous.get(broker.id);
    results.push({
      ...describe(broker),
      ok: false,
      error: String(err.message ?? err).slice(0, 200),
      items: stale?.items ?? [],
      staleSince: stale?.fetchedAt ?? null,
    });
    console.log(`✗ ${broker.name}\t${err.message}`);
  }
}

await closeBrowser();

const payload = {
  generatedAt: new Date().toISOString(),
  brokers: results.map((r) => ({ ...r, fetchedAt: r.ok ? new Date().toISOString() : r.fetchedAt })),
};

await mkdir(new URL('../site/', import.meta.url), { recursive: true });
await writeFile(OUT_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf8');

const failed = results.filter((r) => !r.ok);
const total = results.reduce((n, r) => n + r.items.length, 0);
console.log(`\n完成：${results.length - failed.length}/${results.length} 家成功，共 ${total} 筆`);
if (failed.length) console.log(`失敗：${failed.map((f) => f.name).join('、')}`);

function describe(broker) {
  return {
    id: broker.id,
    name: broker.name,
    site: broker.site,
    board: broker.board,
    mode: broker.mode,
    fetchedAt: new Date().toISOString(),
  };
}

async function readPrevious() {
  try {
    const json = JSON.parse(await readFile(OUT_FILE, 'utf8'));
    return new Map(json.brokers.map((b) => [b.id, b]));
  } catch {
    return new Map();
  }
}
