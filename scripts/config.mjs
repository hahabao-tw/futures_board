/** 只收 2025-01-01（含）以後發布的公告。 */
export const SINCE = '2025-01-01';

/**
 * 邊緣分類：這些不是交易人日常要看的公告，收進來只會稀釋看板。
 * 比對方式是「分類名稱包含以下任一關鍵字」。
 * 這份清單會寫進 data.json，由網頁最上方顯示，讓看的人知道少了什麼。
 */
export const EDGE_KEYWORDS = [
  '樂齡',
  '永續',
  '公平待客',
  '金融友善',
  '徵才',
  'ESG',
  '公益',
  '內控聲明',
  'MultiCharts',
  '顧問講座',
  '熱門',
  '洗錢防制專區',
];

export function isEdgeCategory(name) {
  if (!name) return false;
  return EDGE_KEYWORDS.some((keyword) => name.includes(keyword));
}

/** 安全上限：單一期貨商真的爆量時避免 data.json 失控。 */
export const MAX_ITEMS_PER_BROKER = 1200;
