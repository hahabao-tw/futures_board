# 期貨商公告看板

把 13 家台灣期貨商官網的公告區抓下來，彙整成一頁。GitHub Actions 定時抓取，GitHub Pages 靜態託管。

**收錄範圍：2025-01-01 起的公告，目前約 2,900 則。**

## 收錄的期貨商

| 期貨商 | 取得方式 | 涵蓋範圍 |
| --- | --- | --- |
| 台新期貨 | JSON API（逐頁） | 8 個分類，共 21 頁 |
| 國票期貨 | HTML（逐頁） | 國票訊息／交易訊息／其他金融消費／反詐訊息 |
| 大昌期貨 | HTML | 市場快訊／交易公佈欄／重大訊息／國外交易所訊息 |
| 富邦期貨 | JSON API（一次全取） | 最新消息與公告（前台 97 頁） |
| 康和期貨 | JSON API | 8 個分類 |
| 兆豐期貨 | POST 表單（逐頁） | 最新消息全部分類 |
| 永豐期貨 | HTML（依年度） | 交易公告／最新訊息／假期公告 |
| 凱基期貨 | HTML（逐頁） | 最新公告，涵蓋 7 個分類，共 17 頁 |
| 華南期貨 | POST 表單（逐頁） | 交易公告 + 最新消息 |
| 國泰期貨 | JSON API（逐頁） | 最新消息，共 17 頁 |
| 群益期貨 | HTML | 最新消息（單頁列完） |
| 統一期貨 | HTML + 內頁 | 最新消息（日期只在內頁，需逐則補抓） |
| 元大期貨 | JSON API（一次全取） | 3 個分類（前台 28 頁） |

全部走 HTTP，不需要瀏覽器，整輪抓取約 35 秒。

### 幾個踩過的坑

- **台新**：API 名稱和前台路由不一致（`news-domestic-trade` 的 API 叫 `news-dom`）。`linktype` 決定連結型態：0 內文頁、1 附件頁、2 外部連結。
- **富邦／元大**：前台看起來要翻幾十頁，其實 API 一次就回全部。元大的端點少了 `X-Requested-With: XMLHttpRequest` 會回 HTML 首頁。
- **凱基**：頁碼超過最後一頁不會回空，而是繞回第 1 頁，得靠去重收尾。
- **國票**：`xy=1` 和 `xy=2` 內容大量重疊，靠去重收斂；`default2.aspx?xy=5` 是交易所官網連結目錄，不是公告，不收。
- **大昌**：公告有三種版型（連結標題／純文字標題／整則塞在 `<p>`），只抓 `h3 a` 會漏掉一半。
- **期交所轉發的公告**標題含相容表意字（「金」是 U+F90A），看起來一樣但字串比對全失敗，全站統一做 NFKC 正規化。

## 功能

- **看板**：一家一張卡片，預設顯示 40 則，可展開全部
- **時間軸**：13 家合併依日期排序，每次載入 300 則
- **搜尋**：跨全站比對標題，命中處標色
- **未讀標記**：新公告標紅點，點開即已讀，狀態存在瀏覽器 localStorage
- **分類篩選**：保證金／假期／系統／商品／防詐／活動／其他

## 本機使用

```bash
npm install
npm run scrape      # 抓取，寫入 site/data.json
npm run serve       # http://localhost:4321
```

只抓特定幾家（除錯時很有用）：

```bash
node scripts/scrape.mjs kgi entrust
```

## 調整收錄範圍

改 `scripts/config.mjs`：

- `SINCE`：起始日期，目前 `2025-01-01`
- `EDGE_KEYWORDS`：不收的邊緣分類關鍵字（樂齡、永續、公平待客、金融友善、徵才、ESG、公益、內控聲明、MultiCharts、顧問講座、熱門、洗錢防制專區）
- `MAX_ITEMS_PER_BROKER`：單一期貨商筆數上限，防爆用

## 部署設定

推上 GitHub 後，到 repo 的 **Settings → Pages**，把 Source 設成 **GitHub Actions**。之後
`.github/workflows/scrape.yml` 會在台灣時間週一至週五 08:00–22:00 每小時抓一次，把
`site/data.json` 回寫進 repo 並重新部署。也可以在 Actions 頁面手動觸發。

> 注意：GitHub Pages 上的內容是公開的。這裡只有各期貨商官網本來就公開的公告標題與連結。

## 專案結構

```
scripts/
  config.mjs          收錄起始日、邊緣分類、筆數上限
  scrape.mjs          抓取流程主控，含失敗時沿用上次資料的邏輯
  serve.mjs           本機預覽用的靜態伺服器
  lib/http.mjs        fetch 包裝：重試、逾時、Big5 解碼、表單 POST、分頁走訪
  lib/util.mjs        日期正規化、分類標籤、NFKC 清理
  sources/*.mjs       一家一個檔案，index.mjs 是清單與排序
site/
  index.html app.js style.css
  data.json           抓取結果（由 CI 回寫，約 0.8 MB）
```

## 維護

期貨商改版時，該家會抓到 0 筆而標記失敗，卡片顯示 ⚠ 並沿用上次成功的內容，其餘 12 家不受影響。
修的時候先單獨跑那一家看錯誤訊息，再調整 `scripts/sources/<該家>.mjs`。
