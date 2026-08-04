import { paginate, postForm } from '../lib/http.mjs';
import { SINCE, isEdgeCategory } from '../config.mjs';
import { absolute, clean, toISODate } from '../lib/util.mjs';

/**
 * 兆豐期貨 — bulletinList.do 用 POST 分頁：pN 是頁碼，tag 是分類代碼。
 * 抓 tag 空值（全部）再濾掉邊緣分類，比逐一分類抓省下十幾次請求。
 */
const URL = 'https://www.megafutures.com.tw/emegaFutures/bulletinList.do';

export default async function mega() {
  return paginate(
    async (page) => {
      const $ = await postForm(URL, { pN: String(page), tag: '' });
      return $('ul.newsList > li')
        .map((_, el) => {
          const $el = $(el);
          const link = $el.find('a').first();
          return {
            title: clean($el.find('span.text').text()),
            url: absolute(link.attr('href'), URL),
            date: toISODate($el.find('span.date').text()),
            category: clean($el.find('span.chip').text()),
          };
        })
        .get()
        .filter((row) => row.title && !isEdgeCategory(row.category));
    },
    { maxPages: 10, since: SINCE }
  );
}
