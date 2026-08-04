# 期貨商公告看板

把 13 家台灣期貨商官網的公告區抓下來，彙整成一頁。GitHub Actions 定時抓取，GitHub Pages 靜態託管。

## 收錄的期貨商

| 期貨商 | 抓取方式 | 公告來源 |
| --- | --- | --- |
| 台新期貨 | 瀏覽器 | 期貨／國內交易／國外交易／假期公告 4 個分頁 |
| 國票期貨 | HTTP | 國票訊息、交易訊息、反詐訊息 |
| 大昌期貨 | HTTP | 交易公佈欄、重大訊息、國外交易所訊息 |
| 富邦期貨 | 瀏覽器 | 最新消息與公告 |
| 康和期貨 | 瀏覽器 | 最新／國內外交易／保證金／假期／系統 6 個分類 |
| 兆豐期貨 | 瀏覽器 | 最新消息 |
| 永豐期貨 | HTTP | 交易公告、最新訊息 |
| 凱基期貨 | HTTP | 最新公告 |
| 華南期貨 | HTTP | 交易公告 |
| 國泰期貨 | HTTP（JSON） | 最新消息 |
| 群益期貨 | HTTP | 最新消息 |
| 統一期貨 | HTTP | 最新消息（日期需另抓內頁） |
| 元大期貨 | 瀏覽器 | 期權市場最新消息 |

「瀏覽器」代表該站公告由前端 JS 產生，必須用 Playwright 渲染後才讀得到。

## 功能

- **看板**：一家一張卡片，對應各自的公告區
- **時間軸**：13 家合併，依日期排序
- **搜尋**：跨全站比對標題，命中處會標色
- **未讀標記**：新公告標紅點，點開即已讀，狀態存在瀏覽器 localStorage
- **分類篩選**：保證金／假期／系統／商品／防詐／活動／其他

## 本機使用

```bash
npm install
npx playwright install chromium
npm run scrape      # 抓取，寫入 site/data.json
npm run serve       # http://localhost:4321
```

只抓特定幾家（除錯時很有用）：

```bash
node scripts/scrape.mjs kgi entrust
```

## 部署設定

推上 GitHub 後，到 repo 的 **Settings → Pages**，把 Source 設成 **GitHub Actions**。之後
`.github/workflows/scrape.yml` 會在台灣時間週一至週五 08:00–22:00 每小時抓一次，把
`site/data.json` 回寫進 repo 並重新部署。也可以在 Actions 頁面手動觸發。

> 注意：GitHub Pages 上的內容是公開的。這裡只有各期貨商官網本來就公開的公告標題與連結。

## 專案結構

```
scripts/
  scrape.mjs          抓取流程主控，含失敗時沿用上次資料的邏輯
  serve.mjs           本機預覽用的靜態伺服器
  lib/http.mjs        fetch 包裝：重試、逾時、Big5 解碼
  lib/browser.mjs     Playwright 包裝與列表擷取
  lib/util.mjs        日期正規化、分類標籤、NFKC 清理
  sources/static.mjs  8 家純 HTTP 抓取
  sources/rendered.mjs 5 家需瀏覽器渲染
  sources/index.mjs   期貨商清單與順序
site/
  index.html app.js style.css
  data.json           抓取結果（由 CI 回寫）
```

## 維護

期貨商改版時，該家會抓到 0 筆而標記失敗，看板上的卡片會顯示 ⚠ 並沿用上次成功的內容，
其餘 12 家不受影響。修的時候先單獨跑那一家看錯誤訊息，再調整對應 source 的選擇器。
