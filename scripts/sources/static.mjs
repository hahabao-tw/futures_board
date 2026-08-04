import { fetchHTML, fetchJSON } from '../lib/http.mjs';
import { absolute, clean, toISODate } from '../lib/util.mjs';

/* ------------------------------------------------------------------ 國票期貨 */
export async function ibff() {
  const feeds = [
    ['https://www.ibff.com.tw/news/default.aspx?xy=1&xt=1', '國票訊息'],
    ['https://www.ibff.com.tw/news/default.aspx?xy=2&xt=1', '交易訊息'],
    ['https://www.ibff.com.tw/news/default.aspx?xy=7&xt=1', '反詐訊息'],
  ];
  const out = [];
  for (const [url, category] of feeds) {
    const $ = await fetchHTML(url);
    $('.detail_list6').each((_, el) => {
      const $el = $(el);
      const link = $el.find('.detail_list6_title a');
      out.push({
        title: clean(link.text()),
        url: absolute(link.attr('href'), url),
        date: toISODate($el.find('.detail_list6_data').text()),
        category,
      });
    });
  }
  return out;
}

/* ------------------------------------------------------------------ 大昌期貨 */
export async function dcnf() {
  const feeds = [
    ['https://www.dcnf.com.tw/news_02.htm', '交易公佈欄'],
    ['https://www.dcnf.com.tw/news_03.htm', '重大訊息'],
    ['https://www.dcnf.com.tw/news_05.htm', '國外交易所訊息'],
  ];
  const out = [];
  for (const [url, fallbackCategory] of feeds) {
    const $ = await fetchHTML(url);
    $('ul.newsList > li').each((_, el) => {
      const $el = $(el);
      const link = $el.find('h3 a').first();
      out.push({
        title: clean(link.text()),
        url: absolute(link.attr('href'), url),
        date: toISODate($el.find('.newsDate b').text()),
        category: clean($el.find('.newIcon').text()) || fallbackCategory,
      });
    });
  }
  return out;
}

/* ------------------------------------------------------------------ 永豐期貨 */
export async function spf() {
  const feeds = [
    ['https://www.spf.com.tw/spfBulletin/list15c3486648f00000b9bdb734bebce404.html', '交易公告'],
    ['https://www.spf.com.tw/spfBulletin/list15c3486d4b2000000d7352af8ffdf569.html', '最新訊息'],
  ];
  const out = [];
  for (const [url, category] of feeds) {
    const $ = await fetchHTML(url);
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
  return out;
}

/* ------------------------------------------------------------------ 凱基期貨 */
export async function kgi() {
  const url = 'https://www.kgif.com.tw/zh-tw/stock-market-overview/market-news';
  const $ = await fetchHTML(url);
  const out = [];
  $('a.link__item').each((_, el) => {
    const $el = $(el);
    const title = clean($el.find('.kgisStatic027__item-title').text());
    if (!title) return;
    out.push({
      title,
      url: absolute($el.attr('href'), url),
      date: toISODate($el.find('span.color-grey').first().text()),
      category: clean($el.find('span[role="kgisStatic027-tag"]').first().text()),
    });
  });
  return out;
}

/* ------------------------------------------------------------------ 華南期貨 */
export async function entrust() {
  const url = 'https://ft.entrust.com.tw/entrustFutures/announcement/bulletin.do';
  const $ = await fetchHTML(url);
  const out = [];
  $('ul.linkList > li > a').each((_, el) => {
    const $el = $(el);
    const title = clean($el.find('p.text').text());
    if (!title) return;
    const href = $el.attr('data-other-link') || $el.attr('data-link') || $el.attr('href');
    const pdf = $el.attr('data-pdf');
    const usePdf = pdf && !pdf.endsWith('/null');
    out.push({
      title,
      url: absolute(usePdf ? pdf : href, url),
      date: toISODate($el.find('p.time').text()),
      category: clean($el.find('.chip').text()),
    });
  });
  return out;
}

/* ------------------------------------------------------------------ 國泰期貨 */
export async function cathay() {
  // The page renders from this endpoint; hitting it directly avoids a browser.
  const rows = await fetchJSON(
    'https://www.cathayfut.com.tw/Service/SF_Query.aspx?Fcode=NewPost&Value=more&page=1',
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: '' }
  );
  return rows.map((row) => {
    const title = clean(row.title);
    return {
      title,
      url: `https://www.cathayfut.com.tw/F_news.aspx?Fcode=NewPost&i_index=${row.i_index}`,
      date: toISODate(row.postdate),
      category: /^【(.+?)】/.exec(title)?.[1] ?? '',
    };
  });
}

/* ------------------------------------------------------------------ 群益期貨 */
export async function capital() {
  const url = 'https://www.capitalfutures.com.tw/zh-tw/news/latest';
  const $ = await fetchHTML(url);
  const out = [];
  $('.inner').each((_, el) => {
    const $el = $(el);
    const link = $el.find('.item.title a').first();
    const title = clean(link.text());
    if (!title) return;
    out.push({
      title,
      url: absolute(link.attr('href'), url),
      date: toISODate($el.find('.item.time').first().text()),
      category: clean($el.find('.item.cate .tag p').first().text()),
    });
  });
  return out;
}

/* ------------------------------------------------------------------ 統一期貨 */
export async function pfcf() {
  const url = 'https://www.pfcf.com.tw/news';
  const $ = await fetchHTML(url);
  const rows = [];
  $('ul.loadlist > li').each((_, el) => {
    const link = $(el).find('h2 a').first();
    const title = clean(link.text());
    if (!title) return;
    rows.push({ title, url: absolute(link.attr('href'), url) });
  });

  // The list page carries no dates — they only exist on the detail pages.
  const top = rows.slice(0, 20);
  const dated = await Promise.all(
    top.map(async (row) => {
      try {
        const $detail = await fetchHTML(row.url, { retries: 1 });
        return { ...row, date: toISODate($detail('time.article-time').first().text()) };
      } catch {
        return { ...row, date: null };
      }
    })
  );
  return dated.map((row) => ({ ...row, category: /^【(.+?)】/.exec(row.title)?.[1] ?? '' }));
}
