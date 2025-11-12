import { Page } from "playwright";

/**
 * Build ScholarVox reader URL for a specific document and page
 */
export function makeScholarvoxUrl(docid: string, page: number): string {
  return `https://univ.scholarvox.com/reader/docid/${encodeURIComponent(
    docid
  )}/page/${page}`;
}

/**
 * Extract the iframe URL from a ScholarVox page
 */
export async function getScholarVoxIframeUrl(
  page: Page
): Promise<string | null> {
  try {
    await page.waitForSelector("iframe", { timeout: 10000 });
    const iframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector("iframe");
      return iframe?.src || null;
    });
    return iframeSrc;
  } catch (err) {
    console.error("Failed to get iframe URL:", err);
    return null;
  }
}
