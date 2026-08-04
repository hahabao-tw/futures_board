import { fetchHTML } from '../lib/http.mjs';
import { absolute, clean, toISODate } from '../lib/util.mjs';

/**
 * 群益期貨 — 沒有分頁，單頁就列出全部（約 70 筆，回溯到 2016）。
 * 頁面上的分類（交易公告／系統公告／防詐公告／其他）是前端篩選，同一份資料。
 */
const URL = 'https://www.capitalfutures.com.tw/zh-tw/news/latest';

export default async function capital() {
  const $ = await fetchHTML(URL);
  return $('.inner')
    .map((_, el) => {
      const $el = $(el);
      const link = $el.find('.item.title a').first();
      return {
        title: clean(link.text()),
        url: absolute(link.attr('href'), URL),
        date: toISODate($el.find('.item.time').first().text()),
        category: clean($el.find('.item.cate .tag p').first().text()),
      };
    })
    .get()
    .filter((row) => row.title);
}
