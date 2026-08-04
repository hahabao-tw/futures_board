import { fetchBuffer, fetchJSON } from '../lib/http.mjs';
import { clean, toISODate } from '../lib/util.mjs';

/**
 * 台新期貨 — 官網是 Angular，但底層有公開 JSON API：
 *   GET  /api/{feed}-totalpage  →  {"totalpage":N}
 *   POST /api/{feed}            →  body 是 0-based 頁碼純文字，回 {"newslist":[...]}
 * 注意 API 名稱和前台路由不一致（news-domestic-trade 的 API 叫 news-dom）。
 */
const BASE = 'https://www.tsfutures.com.tw';

const FEEDS = [
  { api: 'news-futures', route: 'news-futures', category: '期貨公告' },
  { api: 'news-event', route: 'news-event', category: '活動消息' },
  { api: 'news-dom', route: 'news-domestic-trade', category: '國內交易公告' },
  { api: 'news-foreign', route: 'news-foreign-trade', category: '國外交易公告' },
  { api: 'news-margin', route: 'news-margin-change', category: '保證金調整通知' },
  { api: 'news-holiday', route: 'news-holiday', category: '假期公告' },
  { api: 'news-rules', route: 'news-rules', category: '國外交易所特別規則' },
  { api: 'news-anti-fraud', route: 'news-anti-fraud', category: '反詐騙宣導公告' },
];

export default async function tsfutures() {
  const out = [];
  for (const feed of FEEDS) {
    const { totalpage } = await fetchJSON(`${BASE}/api/${feed.api}-totalpage`);
    for (let page = 0; page < totalpage; page += 1) {
      const { buffer } = await fetchBuffer(`${BASE}/api/${feed.api}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: String(page),
      });
      const { newslist = [] } = JSON.parse(buffer.toString('utf8'));
      for (const row of newslist) {
        out.push({
          title: clean(row.title),
          url: linkFor(row, feed.route),
          date: toISODate(row.startdateStr),
          category: feed.category,
        });
      }
    }
  }
  return out;
}

/** linktype: 0 = 內文頁、1 = 附件檔案頁（共用 news-event-file 路由）、2 = 外部連結。 */
function linkFor(row, route) {
  const no = row.bulletininfono;
  if (row.linktype === '2' && row.titlelink) return row.titlelink;
  if (row.linktype === '1') return `${BASE}/news-event-file?no=${no}`;
  return `${BASE}/${route}-content?no=${no}`;
}
