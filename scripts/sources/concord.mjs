import { fetchJSON } from '../lib/http.mjs';
import { clean, toISODate } from '../lib/util.mjs';

/**
 * 康和期貨 — 官網是 Angular，但 API 一次回傳該分類全部公告（前端才做分頁）。
 * Company/3（交易所公告）、Consultant/*（活動講座）、FundsAdviser/*（MultiCharts）
 * 屬邊緣分類不收。
 */
const API =
  'https://www.concordfutures.com.tw/ConcordsAPI/FC_API/api/F_ConcordFutures/F_GetBulletin';
const PAGE = 'https://www.concordfutures.com.tw/ConcordFutures/Bulletin/Content';

const FEEDS = [
  ['New', 1, '最新消息'],
  ['Trade', 1, '國內交易公告'],
  ['Trade', 2, '國外交易公告'],
  ['Trade', 3, '保證金公告'],
  ['Trade', 4, '假期公告'],
  ['System', 1, '系統公告'],
  ['Company', 1, '公司公告'],
  ['Company', 2, '防制洗錢暨反詐騙公告'],
];

export default async function concord() {
  const out = [];
  for (const [kind, category, label] of FEEDS) {
    const json = await fetchJSON(
      `${API}?Type=AllBulletin&BulletinKindValue=${kind}&Category=${category}`
    );
    // The payload nests one level per kind and one per category.
    const rows = json.content?.[0]?.BulletinCategoryDetail?.[0]?.BulletinDetail ?? [];
    for (const row of rows) {
      out.push({
        title: clean(row.Title),
        url: `${PAGE}/${kind}/${category}/${row.ID}`,
        date: toISODate(row.BeginDate),
        category: clean(row.CategoryName) || label,
      });
    }
  }
  return out;
}
