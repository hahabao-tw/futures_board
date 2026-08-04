import { fetchJSON } from '../lib/http.mjs';
import { isEdgeCategory } from '../config.mjs';
import { clean, toISODate } from '../lib/util.mjs';

/**
 * 富邦期貨 — 前台是 97 頁分頁，但底層 API 一次就回傳全部（近千筆），
 * 所以不必逐頁抓。分類（最新公告／反詐宣導／開戶文件契約修訂／ESG專區）
 * 只是前端篩選，同一份資料。
 */
const FEED = 'https://www.fubon.com/futures/home/api/front?u=76d2d5e7-12aa-4a5a-8a49-546b8bccf4e9';
const ARTICLE = 'https://www.fubon.com/futures/home/tradeinfo/news';

export default async function fubon() {
  const { result = [] } = await fetchJSON(FEED);
  return result
    .filter((row) => !isEdgeCategory(row.articleCategoryName))
    .map((row) => ({
      title: clean(row.articleName ?? row.name),
      // `url` is set when the announcement is just a link to a PDF or another site.
      url: row.url || `${ARTICLE}/${row.articleGuid ?? row.guid}`,
      date: toISODate((row.postTime ?? row.startTime ?? '').slice(0, 10)),
      category: clean(row.articleCategoryName),
    }));
}
