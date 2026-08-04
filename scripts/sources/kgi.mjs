import { fetchHTML, paginate } from '../lib/http.mjs';
import { SINCE } from '../config.mjs';
import { clean, toISODate } from '../lib/util.mjs';

/**
 * 凱基期貨 — category=all 已涵蓋全部七個分類，逐頁 p=1..17。
 * 注意：p 超過最後一頁不會回空，而是繞回第 1 頁，所以靠 paginate 的去重來收尾。
 */
const URL = 'https://www.kgif.com.tw/zh-tw/stock-market-overview/market-news';

/**
 * 附件網址帶著 Sitecore 的縮圖參數（h/w/hash），每次回應都不一樣，
 * 會讓同一則公告每次算出不同的 id 而被誤判成新公告。這些參數對 PDF 沒有
 * 作用，拿掉後仍正常下載。
 */
const VOLATILE_PARAMS = ['h', 'w', 'hash'];

function stableUrl(href, base) {
  const absolute = href ? new global.URL(href, base).href : null;
  if (!absolute) return null;
  const parsed = new global.URL(absolute);
  VOLATILE_PARAMS.forEach((param) => parsed.searchParams.delete(param));
  return parsed.href;
}

export default async function kgi() {
  return paginate(
    async (page) => {
      const url = `${URL}?category=all&p=${page}`;
      const $ = await fetchHTML(url);
      return $('a.link__item')
        .map((_, el) => {
          const $el = $(el);
          return {
            title: clean($el.find('.kgisStatic027__item-title').text()),
            url: stableUrl($el.attr('href'), url),
            date: toISODate($el.find('span.color-grey').first().text()),
            category: clean($el.find('span[role="kgisStatic027-tag"]').first().text()),
          };
        })
        .get()
        .filter((row) => row.title);
    },
    { maxPages: 20, since: SINCE }
  );
}
