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

/** 這裡的順序就是看板上卡片的順序。 */
export const BROKERS = [
  {
    id: 'tsfutures',
    name: '台新期貨',
    board: 'https://www.tsfutures.com.tw/news-futures',
    feeds: '8 個分類',
    fetch: tsfutures,
  },
  {
    id: 'ibff',
    name: '國票期貨',
    board: 'https://www.ibff.com.tw/news/default.aspx?xy=1&xt=1',
    feeds: '5 個分類',
    fetch: ibff,
  },
  {
    id: 'dcnf',
    name: '大昌期貨',
    board: 'https://www.dcnf.com.tw/news_02.htm',
    feeds: '4 個分類',
    fetch: dcnf,
  },
  {
    id: 'fubon',
    name: '富邦期貨',
    board: 'https://www.fubon.com/futures/home/tradeinfo/news',
    feeds: '最新消息與公告',
    fetch: fubon,
  },
  {
    id: 'concord',
    name: '康和期貨',
    board: 'https://www.concordfutures.com.tw/ConcordFutures/Bulletin/List/New/1',
    feeds: '8 個分類',
    fetch: concord,
  },
  {
    id: 'mega',
    name: '兆豐期貨',
    board: 'https://www.megafutures.com.tw/emegaFutures/bulletinList.do',
    feeds: '最新消息',
    fetch: mega,
  },
  {
    id: 'spf',
    name: '永豐期貨',
    board: 'https://www.spf.com.tw/spfBulletin/list15c3486648f00000b9bdb734bebce404.html',
    feeds: '3 個清單',
    fetch: spf,
  },
  {
    id: 'kgi',
    name: '凱基期貨',
    board: 'https://www.kgif.com.tw/zh-tw/stock-market-overview/market-news',
    feeds: '最新公告（含 7 個分類）',
    fetch: kgi,
  },
  {
    id: 'entrust',
    name: '華南期貨',
    board: 'https://ft.entrust.com.tw/entrustFutures/announcement/bulletin.do',
    feeds: '交易公告 + 最新消息',
    fetch: entrust,
  },
  {
    id: 'cathay',
    name: '國泰期貨',
    board: 'https://www.cathayfut.com.tw/F_news.aspx?Fcode=NewPost_more&page=1',
    feeds: '最新消息',
    fetch: cathay,
  },
  {
    id: 'capital',
    name: '群益期貨',
    board: 'https://www.capitalfutures.com.tw/zh-tw/news/latest',
    feeds: '最新消息',
    fetch: capital,
  },
  {
    id: 'pfcf',
    name: '統一期貨',
    board: 'https://www.pfcf.com.tw/news',
    feeds: '最新消息',
    fetch: pfcf,
  },
  {
    id: 'yuanta',
    name: '元大期貨',
    board: 'https://www.yuantafutures.com.tw/marketinfo_02',
    feeds: '3 個分類',
    fetch: yuanta,
  },
];
