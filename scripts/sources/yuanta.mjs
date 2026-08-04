import { fetchJSON } from '../lib/http.mjs';
import { isEdgeCategory } from '../config.mjs';
import { clean, toISODate } from '../lib/util.mjs';

/**
 * 元大期貨 — 前台 28 頁分頁，但 API 一次回傳全部 272 筆。
 * 端點只認 XHR 標頭，少了它會回 HTML 首頁。
 */
const API =
  'https://www.yuantafutures.com.tw/api/Front?m=04697fed-9075-2b2e-cf58-d2193ec75ee7';
const PAGE = 'https://www.yuantafutures.com.tw/marketinfo_02';

export default async function yuanta() {
  const { result = [] } = await fetchJSON(`${API}&_=${Date.now()}`, {
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      Referer: PAGE,
    },
  });

  return result
    .filter((row) => !isEdgeCategory(row.cName))
    .map((row) => ({
      title: clean(row.title),
      url: row.url || `${PAGE}?n=1&o=${row.cGuid}&q=${row.id}&s=`,
      date: toISODate((row.postTime ?? row.startTime ?? '').slice(0, 10)),
      category: clean(row.cName),
    }))
    .filter((row) => row.title);
}
