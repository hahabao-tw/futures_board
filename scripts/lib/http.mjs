import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import { UA } from './util.mjs';

const TIMEOUT_MS = 30_000;

export async function fetchBuffer(url, { method = 'GET', headers = {}, body, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        method,
        body,
        headers: {
          'User-Agent': UA,
          'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
          Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
          ...headers,
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return {
        buffer: Buffer.from(await res.arrayBuffer()),
        contentType: res.headers.get('content-type') ?? '',
      };
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    }
  }
  throw lastErr;
}

/** Decodes using the charset the server declares, falling back to UTF-8. */
export function decode(buffer, contentType, html = null) {
  const declared =
    /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ??
    (html ? /charset=["']?([\w-]+)/i.exec(html)?.[1] : null);
  const enc = (declared ?? 'utf-8').toLowerCase();
  if (enc === 'big5' || enc === 'big5-hkscs' || enc === 'cp950') {
    return iconv.decode(buffer, 'big5');
  }
  return buffer.toString('utf8');
}

export async function fetchHTML(url, options) {
  const { buffer, contentType } = await fetchBuffer(url, options);
  const head = buffer.subarray(0, 2048).toString('latin1');
  return cheerio.load(decode(buffer, contentType, head));
}

export async function fetchJSON(url, options) {
  const { buffer } = await fetchBuffer(url, options);
  return JSON.parse(buffer.toString('utf8'));
}

/** POST an `application/x-www-form-urlencoded` body and parse the HTML back. */
export function postForm(url, fields, options = {}) {
  return fetchHTML(url, {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...options.headers },
    body: new URLSearchParams(fields).toString(),
  });
}

/**
 * Walks paginated feeds one page at a time, stopping as soon as a page yields
 * nothing new or every row on it predates the cutoff. Feeds are date-descending,
 * so the first fully-stale page means the rest are stale too.
 */
export async function paginate(loadPage, { maxPages, since, onPage } = {}) {
  const all = [];
  const seen = new Set();
  for (let page = 1; page <= maxPages; page += 1) {
    let rows;
    try {
      rows = await loadPage(page);
    } catch (err) {
      if (page === 1) throw err;
      break; // A mid-run failure still leaves the earlier pages usable.
    }
    if (!rows || rows.length === 0) break;

    const fresh = rows.filter((row) => {
      const key = `${row.title}|${row.date ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (fresh.length === 0) break; // Out-of-range pages often loop back to page 1.

    all.push(...fresh);
    onPage?.(page, fresh.length);

    const dated = fresh.filter((row) => row.date);
    if (since && dated.length > 0 && dated.every((row) => row.date < since)) break;
  }
  return all;
}
