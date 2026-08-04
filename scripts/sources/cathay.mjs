import { fetchJSON, paginate } from '../lib/http.mjs';
import { SINCE } from '../config.mjs';
import { clean, toISODate } from '../lib/util.mjs';

/**
 * 國泰期貨 — 頁面本身只是殼，資料來自這支 JSON 端點，每頁 15 筆，
 * 回應裡自帶 maxpage（目前 17）。
 */
const API = 'https://www.cathayfut.com.tw/Service/SF_Query.aspx?Fcode=NewPost&Value=more';

export default async function cathay() {
  return paginate(
    async (page) => {
      const rows = await fetchJSON(`${API}&page=${page}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: '',
      });
      return rows.map((row) => {
        const title = clean(row.title);
        return {
          title,
          url: `https://www.cathayfut.com.tw/F_news.aspx?Fcode=NewPost&i_index=${row.i_index}`,
          date: toISODate(row.postdate),
          category: /^【(.+?)】/.exec(title)?.[1] ?? '',
        };
      });
    },
    { maxPages: 25, since: SINCE }
  );
}
