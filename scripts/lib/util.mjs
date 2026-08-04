import { createHash } from 'node:crypto';

export const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/** Stable id for an announcement, so "已讀" survives across runs. */
export function itemId(brokerId, title, url) {
  return createHash('sha1')
    .update(`${brokerId}|${title}|${url ?? ''}`)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Several of these feeds carry text lifted from 期交所 PDFs, which encodes some
 * glyphs as CJK compatibility ideographs (金 as U+F90A, for example). Those look
 * identical on screen but fail every string match, so normalise to NFKC before
 * anything else touches the text.
 */
export function clean(text) {
  return decodeEntities(text ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export function absolute(href, base) {
  // Some rows are plain notices whose "link" is a javascript: stub or an anchor
  // placeholder; callers fall back to the broker's board URL for those.
  if (!href || /^(javascript:|#|mailto:)/i.test(href.trim())) return null;
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

/**
 * Normalises the many date shapes these sites use into YYYY-MM-DD.
 * Handles ROC years (115/8/4), 2026.08.04, 2026/8/4, [2026-08-04], 08/03 (bare MM/DD).
 */
export function toISODate(raw, { fallbackYear = new Date().getFullYear() } = {}) {
  const s = clean(raw).replace(/[[\]（）()]/g, ' ');
  let m;

  if ((m = s.match(/(20\d{2})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})/))) {
    return pad(m[1], m[2], m[3]);
  }
  // ROC calendar: 115/8/4 or 115.08.04
  if ((m = s.match(/\b(1\d{2})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})/))) {
    return pad(String(Number(m[1]) + 1911), m[2], m[3]);
  }
  // Compact: 20260804
  if ((m = s.match(/\b(20\d{2})(\d{2})(\d{2})\b/))) {
    return pad(m[1], m[2], m[3]);
  }
  // Bare MM/DD — assume current year, but if that lands in the future, use last year.
  if ((m = s.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/))) {
    const guess = pad(String(fallbackYear), m[1], m[2]);
    const today = new Date().toISOString().slice(0, 10);
    return guess > today ? pad(String(fallbackYear - 1), m[1], m[2]) : guess;
  }
  return null;
}

function pad(y, mo, d) {
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Collapses each broker's own category vocabulary into a shared tag set. */
const TAG_RULES = [
  [/保證金|margin/i, '保證金'],
  [/假期|休市|holiday|交易時間|時段/, '假期'],
  [/詐|反詐|防詐/, '防詐'],
  [/系統|平台|維護|異常|網路|降速|入金|出金/, '系統'],
  [/新商品|上市|新增|契約|上架|商品/, '商品'],
  [/活動|講座|課程|優惠|開戶/, '活動'],
];

export function normaliseTag(rawCategory, title = '') {
  const hay = `${rawCategory ?? ''} ${title}`;
  for (const [re, tag] of TAG_RULES) if (re.test(hay)) return tag;
  return '其他';
}

export function dedupe(items) {
  const seen = new Set();
  return items.filter((it) => {
    // Key on the stable id (title + url) rather than title + date: the same
    // announcement can be listed under several of a broker's categories.
    const key = it.id ?? `${it.title}|${it.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Newest first, but future-dated entries sink to the bottom: a few brokers park
 * standing notices on a far-future date so they stay pinned on their own site,
 * and those would otherwise permanently occupy the top of every view here.
 */
export function sortByDateDesc(items) {
  return items.sort(
    (a, b) =>
      Number(a.pinned ?? false) - Number(b.pinned ?? false) ||
      (b.date ?? '').localeCompare(a.date ?? '') ||
      // Same-day announcements are common; break the tie on id so the written
      // order is reproducible and unchanged runs really do produce no diff.
      (a.id ?? '').localeCompare(b.id ?? '')
  );
}
