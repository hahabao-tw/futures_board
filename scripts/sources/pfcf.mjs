import { fetchHTML, paginate } from '../lib/http.mjs';
import { absolute, clean, toISODate } from '../lib/util.mjs';

/**
 * 統一期貨 — 列表只有標題，日期只印在內頁，所以每則都得再抓一次內頁。
 * 六頁共約 60 則，用小量並行跑完。
 */
const LIST = 'https://www.pfcf.com.tw/news';
const CONCURRENCY = 6;

export default async function pfcf() {
  const rows = await paginate(
    async (page) => {
      const url = `${LIST}?page=${page}`;
      const $ = await fetchHTML(url);
      return $('ul.loadlist > li')
        .map((_, el) => {
          const link = $(el).find('h2 a').first();
          return { title: clean(link.text()), url: absolute(link.attr('href'), url) };
        })
        .get()
        .filter((row) => row.title);
    },
    // No dates on the list, so paginate can't stop early — walk all six pages.
    { maxPages: 8 }
  );

  const dated = [];
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = await Promise.all(
      rows.slice(i, i + CONCURRENCY).map(async (row) => ({
        ...row,
        date: await dateOf(row.url),
        category: /^【(.+?)】/.exec(row.title)?.[1] ?? '',
      }))
    );
    dated.push(...batch);
  }
  return dated;
}

async function dateOf(url) {
  try {
    const $ = await fetchHTML(url, { retries: 1 });
    return toISODate($('time.article-time').first().text());
  } catch {
    return null;
  }
}
