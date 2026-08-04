import { paginate, postForm } from '../lib/http.mjs';
import { SINCE, isEdgeCategory } from '../config.mjs';
import { absolute, clean, toISODate } from '../lib/util.mjs';

/**
 * 華南期貨 — 兩個獨立 feed（交易公告、最新消息），各自用 POST 分頁（欄位 pN）。
 */
const FEEDS = [
  ['https://ft.entrust.com.tw/entrustFutures/announcement/bulletin.do', '交易公告'],
  ['https://ft.entrust.com.tw/entrustFutures/announcement/news.do', '最新消息'],
];

export default async function entrust() {
  const out = [];
  for (const [url, fallback] of FEEDS) {
    const rows = await paginate(
      async (page) => {
        const $ = await postForm(url, { pN: String(page), pA: '', iA: '' });
        return $('ul.linkList > li > a')
          .map((_, el) => {
            const $el = $(el);
            const pdf = $el.attr('data-pdf');
            const usePdf = pdf && !pdf.endsWith('/null');
            const href = usePdf ? pdf : ($el.attr('data-other-link') || $el.attr('data-link'));
            return {
              title: clean($el.find('p.text').text()),
              url: absolute(href, url) ?? url,
              date: toISODate($el.find('p.time').text()),
              category: clean($el.find('.chip').text()) || fallback,
            };
          })
          .get()
          .filter((row) => row.title && !isEdgeCategory(row.category));
      },
      { maxPages: 8, since: SINCE }
    );
    out.push(...rows);
  }
  return out;
}
