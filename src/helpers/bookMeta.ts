// src/helpers/bookMeta.ts
import { Page } from "playwright";

export async function getBookTitle(
  page: Page,
  docid: string
): Promise<string | null> {
  const url = `https://univ.scholarvox.com/catalog/book/docid/${encodeURIComponent(
    docid
  )}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  // Try to get the title from the most specific selector first
  const titleText = await page.evaluate(() => {
    // Priority 1: Look for .title h2 (this contains the actual book title)
    const titleH2 = document.querySelector(".title h2");
    if (titleH2?.textContent?.trim()) {
      return titleH2.textContent.trim();
    }

    // Priority 2: Try .book-title class
    const bookTitleClass = document.querySelector(".book-title");
    if (bookTitleClass?.textContent?.trim()) {
      return bookTitleClass.textContent.trim();
    }

    // Priority 3: Try h1 in the main content area
    const h1 = document.querySelector("main h1, .content h1, .book-info h1");
    if (h1?.textContent?.trim()) {
      return h1.textContent.trim();
    }

    return null;
  });
  
  if (titleText && titleText.length > 0) {
    // Sanitize the title for use as a filename
    return titleText
      .replace(/[<>:"/\\|?*]/g, "") // Remove invalid filename characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
      .substring(0, 100); // Limit length
  }
  
  return null;
}

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
