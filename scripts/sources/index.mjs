import { taifexFeed } from './taifex.mjs';
import tsfutures from './tsfutures.mjs';
import ibff from './ibff.mjs';
import dcnf from './dcnf.mjs';
import fubon from './fubon.mjs';
import concord from './concord.mjs';
import mega from './mega.mjs';
import spf from './spf.mjs';
import kgi from './kgi.mjs';
import entrust from './entrust.mjs';
import cathay from './cathay.mjs';
import capital from './capital.mjs';
import pfcf from './pfcf.mjs';
import yuanta from './yuanta.mjs';

/** 期交所三個區塊，各自獨立呈現在看板第一排。 */
export const EXCHANGES = [
  {
    id: 'taifex-announcement',
    name: '期交所公告',
    board: 'https://www.taifex.com.tw/cht/11/announcement',
    feeds: '臺灣期貨交易所 最新消息／公告',
    fetch: taifexFeed('announcement'),
  },
  {
    id: 'taifex-press',
    name: '期交所新聞稿',
    board: 'https://www.taifex.com.tw/cht/11/pressRelease',
    feeds: '臺灣期貨交易所 最新消息／新聞稿',
    fetch: taifexFeed('pressRelease'),
  },
  {
    id: 'taifex-adjust',
    name: '期交所 股票期貨/選擇權契約調整',
    board: 'https://www.taifex.com.tw/cht/11/adjustContract',
    feeds: '臺灣期貨交易所 最新消息／契約調整',
    fetch: taifexFeed('adjustContract'),
  },
];

/**
 * 期貨商依名稱筆劃排序：先比第一個字，相同再比第二個字。
 * `strokes` 就是前兩個字的筆劃數，排序由下方的 sort 實際執行，
 * 這樣新增期貨商時只要填筆劃、不必自己算好位置。
 */
export const BROKERS = [
  {
    id: 'dcnf',
    name: '大昌期貨',
    strokes: [3, 8], // 大 昌
    board: 'https://www.dcnf.com.tw/news_02.htm',
    feeds: '4 個分類',
    fetch: dcnf,
  },
  {
    id: 'yuanta',
    name: '元大期貨',
    strokes: [4, 3], // 元 大
    board: 'https://www.yuantafutures.com.tw/marketinfo_02',
    feeds: '3 個分類',
    fetch: yuanta,
  },
  {
    id: 'tsfutures',
    name: '台新期貨',
    strokes: [5, 13], // 台 新
    board: 'https://www.tsfutures.com.tw/news-futures',
    feeds: '8 個分類',
    fetch: tsfutures,
  },
  {
    id: 'spf',
    name: '永豐期貨',
    strokes: [5, 18], // 永 豐
    board: 'https://www.spf.com.tw/spfBulletin/list15c3486648f00000b9bdb734bebce404.html',
    feeds: '3 個清單',
    fetch: spf,
  },
  {
    id: 'mega',
    name: '兆豐期貨',
    strokes: [6, 18], // 兆 豐
    board: 'https://www.megafutures.com.tw/emegaFutures/bulletinList.do',
    feeds: '最新消息',
    fetch: mega,
  },
  {
    id: 'concord',
    name: '康和期貨',
    strokes: [11, 8], // 康 和
    board: 'https://www.concordfutures.com.tw/ConcordFutures/Bulletin/List/New/1',
    feeds: '8 個分類',
    fetch: concord,
  },
  {
    id: 'cathay',
    name: '國泰期貨',
    strokes: [11, 10], // 國 泰
    board: 'https://www.cathayfut.com.tw/F_news.aspx?Fcode=NewPost_more&page=1',
    feeds: '最新消息',
    fetch: cathay,
  },
  {
    id: 'ibff',
    name: '國票期貨',
    strokes: [11, 11], // 國 票
    board: 'https://www.ibff.com.tw/news/default.aspx?xy=1&xt=1',
    feeds: '4 個分類',
    fetch: ibff,
  },
  {
    id: 'pfcf',
    name: '統一期貨',
    strokes: [12, 1], // 統 一
    board: 'https://www.pfcf.com.tw/news',
    feeds: '最新消息',
    fetch: pfcf,
  },
  {
    id: 'fubon',
    name: '富邦期貨',
    strokes: [12, 7], // 富 邦
    board: 'https://www.fubon.com/futures/home/tradeinfo/news',
    feeds: '最新消息與公告',
    fetch: fubon,
  },
  {
    id: 'entrust',
    name: '華南期貨',
    strokes: [12, 9], // 華 南
    board: 'https://ft.entrust.com.tw/entrustFutures/announcement/bulletin.do',
    feeds: '交易公告 + 最新消息',
    fetch: entrust,
  },
  {
    id: 'kgi',
    name: '凱基期貨',
    strokes: [12, 11], // 凱 基
    board: 'https://www.kgif.com.tw/zh-tw/stock-market-overview/market-news',
    feeds: '最新公告（含 7 個分類）',
    fetch: kgi,
  },
  {
    id: 'capital',
    name: '群益期貨',
    strokes: [13, 10], // 群 益
    board: 'https://www.capitalfutures.com.tw/zh-tw/news/latest',
    feeds: '最新消息',
    fetch: capital,
  },
].sort((a, b) => a.strokes[0] - b.strokes[0] || a.strokes[1] - b.strokes[1]);

/** 抓取流程要跑的全部來源。 */
export const ALL_SOURCES = [...EXCHANGES, ...BROKERS];
