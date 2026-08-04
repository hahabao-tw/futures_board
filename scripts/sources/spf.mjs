import { fetchHTML } from '../lib/http.mjs';
import { clean, toISODate, absolute } from '../lib/util.mjs';

/**
 * 永豐期貨 — 每個清單一頁列完整年度（MORE 只是前端展開被藏起來的 <li>），
 * 所以抓 2025、2026 兩個年度頁就涵蓋截止日之後的全部公告。
 * 年度頁網址格式：list{id}_{年}.html，當年度則是 list{id}.html。
 */
const BASE = 'https://www.spf.com.tw/spfBulletin';

const LISTS = [
  ['15c3486648f00000b9bdb734bebce404', '交易公告'],
  ['15c3486d4b2000000d7352af8ffdf569', '最新訊息'],
  ['186c516cf6a00000db29035f112d49a7', '假期公告'],
];

const YEARS = [new Date().getFullYear(), 2025];

export default async function spf() {
  const out = [];
  for (const [id, category] of LISTS) {
    for (const year of [...new Set(YEARS)]) {
      const url =
        year === new Date().getFullYear()
          ? `${BASE}/list${id}.html`
          : `${BASE}/list${id}_${year}.html`;
      let $;
      try {
        $ = await fetchHTML(url, { retries: 1 });
      } catch {
        continue; // 某些清單沒有該年度的頁面
      }
      $('#dataUl > li').each((_, el) => {
        const $el = $(el);
        const link = $el.find('a').first();
        out.push({
          title: clean(link.text()),
          url: absolute(link.attr('href'), url),
          date: toISODate($el.find('span').first().text()),
          category,
        });
      });
    }
  }
  return out;
}
