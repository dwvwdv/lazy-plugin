// Injected into target page via chrome.scripting.executeScript
// selector and baseUrl are passed as args
export function extractorFn(selector, baseUrl) {
  const items = document.querySelectorAll(selector);
  const result = [];
  const seen = new Set();

  items.forEach((el) => {
    const anchor = el.closest('a[href]') || el;
    const title = el.textContent?.trim();
    const href = anchor.getAttribute('href');
    if (!title || !href) return;

    const url = href.startsWith('http') ? href : baseUrl + href;
    if (seen.has(url)) return;
    seen.add(url);
    result.push({ title, url });
  });

  return result;
}

export async function extractFromTab(tabId, selector, baseUrl) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: (sel, base) => {
      const items = document.querySelectorAll(sel);
      const out = [];
      const seen = new Set();
      items.forEach((el) => {
        const anchor = el.closest('a[href]') || el;
        const title = el.textContent?.trim();
        const href = anchor.getAttribute('href');
        if (!title || !href) return;
        const url = href.startsWith('http') ? href : base + href;
        if (seen.has(url)) return;
        seen.add(url);
        out.push({ title, url });
      });
      return out;
    },
    args: [selector, baseUrl],
  });
  return result || [];
}
