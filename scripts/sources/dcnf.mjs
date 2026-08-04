import { fetchHTML } from '../lib/http.mjs';
import { absolute, clean, toISODate } from '../lib/util.mjs';

/**
 * 大昌期貨 — 靜態頁，沒有分頁，一頁列完整個分類。
 * news_04（內控聲明書）屬邊緣分類不收；news_05 是表格版型，欄位和其他三頁不同。
 */
const LIST_FEEDS = [
  ['https://www.dcnf.com.tw/news_01.htm', '市場快訊'],
  ['https://www.dcnf.com.tw/news_02.htm', '交易公佈欄'],
  ['https://www.dcnf.com.tw/news_03.htm', '重大訊息'],
];

const TABLE_FEED = ['https://www.dcnf.com.tw/news_05.htm', '國外交易所訊息'];

export default async function dcnf() {
  const out = [];

  for (const [url, fallback] of LIST_FEEDS) {
    const $ = await fetchHTML(url);
    $('ul.newsList > li').each((_, el) => {
      const $el = $(el);
      const link = $el.find('h3 a').first();
      // Rows come in three shapes: a linked heading, a plain-text heading, or no
      // heading at all with the whole notice sitting in <p>.
      const heading = clean($el.find('h3').first().text());
      const body = clean($el.find('p').first().text());
      const title = heading || body.slice(0, 60);
      if (!title) return;
      out.push({
        title,
        url: absolute(link.attr('href'), url) ?? url,
        date: toISODate($el.find('.newsDate b').text()),
        category: clean($el.find('.newIcon').text()) || fallback,
      });
    });
  }

  const [tableUrl, tableCategory] = TABLE_FEED;
  const $table = await fetchHTML(tableUrl);
  $table('table tr').each((_, tr) => {
    const cells = $table(tr).find('td');
    if (cells.length < 4) return;
    const date = toISODate($table(cells[1]).text());
    const exchange = clean($table(cells[2]).text());
    const title = clean($table(cells[3]).text());
    if (!date || !title) return;
    const link = $table(cells[4] ?? cells[3]).find('a').attr('href');
    out.push({
      title: exchange ? `${exchange}｜${title}` : title,
      url: absolute(link, tableUrl) ?? tableUrl,
      date,
      category: tableCategory,
    });
  });

  return out;
}
