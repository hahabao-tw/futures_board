import { fetchHTML } from '../lib/http.mjs';
import { absolute, clean, toISODate } from '../lib/util.mjs';

/**
 * 臺灣期貨交易所 — 三個區塊版型相同：一張 table.table_c，每列是「日期｜標題」，
 * 標題帶連結（內文頁或 PDF）。單頁列完，不需要分頁。
 */
export function taifexFeed(path) {
  const url = `https://www.taifex.com.tw/cht/11/${path}`;
  return async () => {
    const $ = await fetchHTML(url);
    return $('table.table_c tr')
      .map((_, tr) => {
        const cells = $(tr).find('td');
        if (cells.length < 2) return null; // 表頭
        const link = $(cells[1]).find('a').first();
        return {
          title: clean(link.text() || $(cells[1]).text()),
          url: absolute(link.attr('href'), url) ?? url,
          date: toISODate($(cells[0]).text()),
        };
      })
      .get()
      .filter((row) => row && row.title);
  };
}
