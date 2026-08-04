import { chromium } from 'playwright';
import { UA } from './util.mjs';

let browserPromise = null;

export function getBrowser() {
  browserPromise ??= chromium.launch({ args: ['--disable-dev-shm-usage'] });
  return browserPromise;
}

export async function closeBrowser() {
  if (!browserPromise) return;
  const browser = await browserPromise;
  await browser.close();
  browserPromise = null;
}

/**
 * Opens `url`, waits for `waitFor` (a selector or a text pattern), then runs
 * `extract` inside the page. Returns whatever `extract` returns.
 */
export async function withPage(url, { waitFor, timeout = 45_000, extract }) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: UA,
    locale: 'zh-TW',
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  // Images and fonts are dead weight for scraping.
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (type === 'image' || type === 'font' || type === 'media') return route.abort();
    return route.continue();
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    if (waitFor) {
      await page.waitForSelector(waitFor, { timeout, state: 'attached' }).catch(() => {});
    }
    await page.waitForTimeout(1500);
    return await extract(page);
  } finally {
    await context.close();
  }
}

/**
 * Reads announcement rows out of a rendered page using per-site selectors.
 * `row` selects each announcement; the rest select fields within it. Anything
 * missing simply comes back empty rather than throwing, so a partial markup
 * change degrades one field instead of killing the whole broker.
 */
export function extractRows({ row, title, date, category, link }) {
  return (page) =>
    page.$$eval(
      row,
      (nodes, sel) => {
        const text = (el, selector) => {
          if (!selector) return '';
          const found = el.querySelector(selector);
          return found ? (found.textContent ?? '').trim() : '';
        };
        // Rows often hold several anchors — a titled one with no href, a
        // "javascript:void(0)" download trigger, and the real link. Take the
        // first that actually navigates somewhere.
        const usableLink = (node) =>
          [...node.querySelectorAll(sel.link || 'a[href]')].find((a) => {
            const href = a.getAttribute('href') ?? '';
            return href && !href.startsWith('javascript:') && href !== '#';
          }) ?? null;

        return nodes.map((node) => {
          const anchor = usableLink(node);
          const dateEl = sel.date ? node.querySelector(sel.date) : null;
          return {
            title: text(node, sel.title) || anchor?.textContent?.trim() || '',
            rawDate: dateEl?.getAttribute('datetime') || (dateEl?.textContent ?? '').trim(),
            category: text(node, sel.category),
            url: anchor?.href ?? null,
          };
        });
      },
      { title, date, category, link }
    );
}
