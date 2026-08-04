import { extractRows, withPage } from '../lib/browser.mjs';
import { clean, toISODate } from '../lib/util.mjs';

/**
 * These five brokers render their announcement lists client-side, so each one
 * needs a real browser rather than a plain fetch.
 */
async function scrape(url, { waitFor, selectors, fallbackCategory = '' }) {
  const rows = await withPage(url, { waitFor, extract: extractRows(selectors) });
  return rows
    .map((row) => ({
      title: clean(row.title),
      url: row.url,
      date: toISODate(row.rawDate),
      category: clean(row.category) || fallbackCategory,
    }))
    .filter((row) => row.title.length > 3);
}

/* ------------------------------------------------------------------ 台新期貨 */
const TSFUTURES_FEEDS = [
  ['news-futures', '期貨公告'],
  ['news-domestic-trade', '國內交易公告'],
  ['news-foreign-trade', '國外交易公告'],
  ['news-holiday', '假期公告'],
];

export async function tsfutures() {
  const out = [];
  for (const [path, category] of TSFUTURES_FEEDS) {
    const rows = await scrape(`https://www.tsfutures.com.tw/${path}`, {
      waitFor: 'table tbody tr',
      fallbackCategory: category,
      selectors: {
        row: 'table tbody tr',
        title: 'a.tablemain, .widthctr a',
        date: 'td[data-th="時間"]',
        link: 'a[href]',
      },
    });
    out.push(...rows);
  }
  return out;
}

/* ------------------------------------------------------------------ 富邦期貨 */
export const fubon = () =>
  scrape('https://www.fubon.com/futures/home/tradeinfo/news', {
    waitFor: 'a.m-list-anchor',
    selectors: {
      row: 'li:has(> a.m-list-anchor)',
      title: 'p b, p',
      date: 'time',
      category: 'span.m-tag',
      link: 'a.m-list-anchor',
    },
  });

/* ------------------------------------------------------------------ 康和期貨 */
const CONCORD_FEEDS = [
  ['New/1', '最新消息'],
  ['Trade/1', '國內交易公告'],
  ['Trade/2', '國外交易公告'],
  ['Trade/3', '保證金公告'],
  ['Trade/4', '假期公告'],
  ['System/1', '系統公告'],
];

export async function concord() {
  const out = [];
  for (const [path, category] of CONCORD_FEEDS) {
    const rows = await scrape(
      `https://www.concordfutures.com.tw/ConcordFutures/Bulletin/List/${path}`,
      {
        waitFor: 'h3 time',
        fallbackCategory: category,
        selectors: { row: 'li:has(h3 time)', title: 'h3 a', date: 'h3 time', link: 'h3 a' },
      }
    );
    out.push(...rows);
  }
  return out;
}

/* ------------------------------------------------------------------ 兆豐期貨 */
export const mega = () =>
  scrape('https://www.megafutures.com.tw/emegaFutures/bulletinList.do', {
    waitFor: 'ul.newsList li',
    selectors: {
      row: 'ul.newsList > li',
      title: 'span.text',
      date: 'span.date',
      category: 'span.chip',
      link: 'a[href]',
    },
  });

/* ------------------------------------------------------------------ 元大期貨 */
export const yuanta = () =>
  scrape('https://www.yuantafutures.com.tw/marketinfo_02', {
    waitFor: '.trade_item',
    selectors: {
      row: '.trade_news .trade_item',
      title: 'a.title01',
      date: '.date',
      category: '.category',
      link: 'a[href]',
    },
  });
