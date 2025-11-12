// src/helpers/bookMeta.ts
import { Page } from "playwright";

export async function getBookTotalPages(
  page: Page,
  docid: string
): Promise<number | null> {
  const url = `https://univ.scholarvox.com/catalog/book/docid/${encodeURIComponent(
    docid
  )}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  // Try specific DOM locations first
  const fromDom = await page.evaluate(() => {
    // Look near labels like "pages:" or "Pages :" in book detail columns
    const candidates = Array.from(
      document.querySelectorAll(
        "div.leftColumn p, div.rightColumn p, .showRoom p"
      )
    );
    for (const p of candidates) {
      const txt = p.textContent?.replace(/\s+/g, " ").trim() ?? "";
      // e.g., "pages: 30" or "Pages : 30"
      const m = txt.match(/\bpages?\b\s*[:\-–]\s*(\d{1,5})\b/i);
      if (m && m[1]) return parseInt(m[1], 10);
    }
    return null;
  });
  if (fromDom && Number.isFinite(fromDom) && fromDom > 0) return fromDom;

  // Fallback: text-only match but bounded by a "pages" label (avoid years etc.)
  const text = await page.evaluate(() =>
    document.body.innerText.replace(/\s+/g, " ")
  );
  const m = text.match(
    /\b(?:nombre\s+de\s+pages|pages?)\b\s*[:\-–]\s*(\d{1,5})\b/i
  );
  if (m && m[1]) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}
