# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

專案文件與程式註解一律使用繁體中文，請沿用。

## 指令

```bash
npm install
npm run scrape          # 抓取全部 16 個來源，視情況改寫 site/data.json
npm run serve           # 本機預覽 http://localhost:4321
```

抓單一來源（除錯時最常用，等同「跑單一測試」）：

```bash
node scripts/scrape.mjs kgi entrust          # 只重抓這兩個
node scripts/scrape.mjs taifex-announcement  # 期交所單一區塊
```

未列出的來源會沿用 `site/data.json` 裡上一次的結果，所以可以安全地只重跑一家。
來源 id 定義在 `scripts/sources/index.mjs`。

**本專案沒有測試框架、沒有 linter、沒有建置步驟。** 驗證方式是實際跑一次抓取，
再用 `npm run serve` 開頁面確認。不要杜撰 `npm test`。

## 架構

兩段式，中間以 `site/data.json` 為介面：

```
scripts/  →  site/data.json  →  site/（純靜態，無框架、無打包）
```

### 來源轉接器

`scripts/sources/<id>.mjs` 每支預設匯出一個 async 函式，回傳
`{ title, url, date, category }[]`。轉接器**只負責取得原始資料**，不做正規化——
過濾、標籤、去重、排序全部在 `scripts/scrape.mjs` 統一處理。

`scripts/sources/index.mjs` 匯出 `EXCHANGES`（期交所 3 個區塊）與 `BROKERS`
（13 家期貨商）。期貨商依 `strokes` 欄位（前兩字筆劃）在該檔尾端**程式排序**，
新增時只要填筆劃，不必自己排位置。

各家取得方式差異很大（JSON API、HTML、表單 POST），細節寫在各檔開頭的註解裡。
**全部走 HTTP，不需要瀏覽器**——若考慮引入 Playwright，先確認該站真的沒有可用的
底層 API，多數站台其實有。

### scrape.mjs 的處理鏈

```
fetch → 濾掉邊緣分類與截止日之前 → itemId → normaliseTag → dedupe → 排序 → 上限
      → 與上次比對指紋 → 只在有變動時改寫 data.json
```

幾個容易踩到的點：

- **`itemId` = sha1(`sourceId|title|url`)**，所以**網址必須穩定**。凱基的附件連結
  帶有每次都變動的 Sitecore 參數（`h`/`w`/`hash`），`sources/kgi.mjs` 會把它們濾掉；
  沒有這層處理，同一則公告每次都會算出新 id 而被誤判成新公告。
- **指紋比對**（`signatureOf`）涵蓋來源 id、名稱、`board` 網址與排序後的 item id。
  改了來源名稱卻沒有新公告時，若不納入名稱，`data.json` 不會被改寫、畫面也不會更新。
- **不變動就完全不寫檔**。CI 靠 `git status --porcelain site/data.json` 判斷要不要
  部署，若每次都寫入新時間戳，就會天天產生無意義的 commit 與部署。
- 某來源失敗時會**沿用上一次成功的內容**並標記 `ok: false`，其餘來源不受影響。

### lib

- `lib/http.mjs`：`fetchHTML` / `fetchJSON` / `postForm` / `paginate`。含重試、逾時、
  Big5 解碼。`paginate` 在整頁都早於截止日、或該頁沒有新項目時停止——**凱基的頁碼
  超過最後一頁會繞回第 1 頁而不是回空**，靠去重收尾。
- `lib/util.mjs`：`clean` 會做 **NFKC 正規化**。期交所轉發的公告把「金」寫成相容
  表意字 U+F90A，看起來一樣但字串比對全失敗；少了這步，「保證金」公告會被分到
  「其他」。`TAG_RULES` 依序比對、第一條命中就定案，順序即優先權。
- `config.mjs`：`SINCE`（收錄起始日）、`EDGE_KEYWORDS`（不收的分類，會寫進
  data.json 顯示在頁面最上方）、`MAX_ITEMS_PER_BROKER`。

### 前端

`site/` 是原生 HTML/CSS/JS，無框架、無建置。`app.js` 讀 `data.json`（`exchanges`
與 `brokers` 兩組）後直接操作 DOM。

- 字級調整靠改寫 `--ui-size`，**版面尺寸全部用 rem**，所以放大時整體等比縮放。
  新增樣式請沿用 rem，不要寫死 px。
- `BROKER_HUE` 的鍵必須對應來源 id；新增來源時要一併加色相。
- 圖示一律用 `index.html` 裡的 SVG sprite（`svgIcon()` 取用），**介面不使用 emoji**。
- **台股慣例紅漲綠跌**：紅綠保留給行情語意，介面強調色用中性的琥珀色。
- 只做深色主題，不跟隨系統淺色。文字對比實測維持在 4.5:1 以上。

## 部署

`.github/workflows/scrape.yml` 在台灣時間每天 08/11/15/19/23 各跑一次
（cron 用 UTC，往前推 8 小時），**只有真的出現新公告才回寫並重新部署**。

同時部署到兩處：

| 目標 | 說明 |
| --- | --- |
| GitHub Pages | workflow 上傳 `site/` 目錄 |
| Cloudflare Pages | 直接匯入 repo，**組建輸出目錄必須設為 `site`** |

workflow 的 `actions/checkout` 帶 `ref: ${{ github.ref_name }}`——預設會抓觸發事件
當下的 commit，重跑（re-run）時會退回舊 SHA，回寫階段就會被遠端拒絕。回寫前也會
重新對齊遠端並最多重試三次。

## 修東西時

某來源改版會抓到 0 筆而標記失敗，卡片顯示警告並沿用上次內容。先單獨跑那一家看
錯誤訊息，再調整對應的 `scripts/sources/<id>.mjs`。
