import { fetchHTML, paginate } from '../lib/http.mjs';
import { SINCE } from '../config.mjs';
import { absolute, clean, toISODate } from '../lib/util.mjs';

/**
 * 國票期貨 — ASP.NET，各分類自行分頁：?xy=N&PageChange=M。
 * xy=1 與 xy=2 內容大量重疊，靠 scrape 的去重收斂。
 * 不收 default2.aspx?xy=5：那頁是各國交易所官網的連結目錄，不是公告。
 */
const FEEDS = [
  { page: 'default.aspx', xy: 1, category: '國票訊息', maxPages: 10 },
  { page: 'default.aspx', xy: 2, category: '交易訊息', maxPages: 10 },
  { page: 'default.aspx', xy: 6, category: '其他金融消費訊息', maxPages: 3 },
  { page: 'default.aspx', xy: 7, category: '反詐訊息', maxPages: 3 },
];

export default async function ibff() {
  const out = [];
  for (const feed of FEEDS) {
    const rows = await paginate(
      async (page) => {
        const url = `https://www.ibff.com.tw/news/${feed.page}?PageChange=${page}&xy=${feed.xy}&xt=1`;
        const $ = await fetchHTML(url);
        return $('.detail_list6')
          .map((_, el) => {
            const $el = $(el);
            const link = $el.find('.detail_list6_title a');
            return {
              title: clean(link.text()),
              url: absolute(link.attr('href'), url),
              date: toISODate($el.find('.detail_list6_data').text()),
              category: feed.category,
            };
          })
          .get();
      },
      { maxPages: feed.maxPages, since: SINCE }
    );
    out.push(...rows);
  }
  return out;
}
