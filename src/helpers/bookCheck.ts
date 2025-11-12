import type { Page } from "playwright";

export type BookStatus = "FOUND" | "REMOVED" | "NOT_FOUND" | "AVAILABLE_SOON";

/**
 * Check availability on the catalog page:
 *   https://univ.scholarvox.com/catalog/book/docid/<docid>
 *
 * Signals:
 *  - REMOVED: presence of .removedFlag or "Cet ouvrage n'est plus disponible".
 *  - AVAILABLE_SOON: presence of "Cet ouvrage sera bientôt disponible".
 *  - FOUND: a non-empty visible title exists (e.g., .item.book .title h2).
 *  - NOT_FOUND: HTTP not OK, obvious error routes, or no valid title.
 */
export async function checkBookStatus(
  page: Page,
  docid: string,
  timeoutMs = 15000
): Promise<BookStatus> {
  const catalogUrl = `https://univ.scholarvox.com/catalog/book/docid/${encodeURIComponent(
    docid
  )}`;

  const resp = await page
    .goto(catalogUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs })
    .catch(() => null);

  // If the request itself failed or is not OK, treat as NOT_FOUND.
  if (!resp || !resp.ok()) return "NOT_FOUND";

  const finalUrl = page.url();
  if (/404|not[-_ ]found|error/i.test(finalUrl)) return "NOT_FOUND";

  // Explicit “removed/unavailable” cues
  const removedFlag = page.locator(".removedFlag");
  const removedVisible = await removedFlag
    .first()
    .isVisible()
    .catch(() => false);
  if (removedVisible) return "REMOVED";

  const removedText = removedVisible
    ? (await removedFlag.innerText().catch(() => "")).toLowerCase()
    : "";
  if (removedText.includes("cet ouvrage n'est plus disponible"))
    return "REMOVED";

  const notAvailVisible = await page
    .locator("#pnl-notavail, .notAvailableBox")
    .first()
    .isVisible()
    .catch(() => false);
  if (notAvailVisible) return "REMOVED";

  // Check for "available soon" status
  const pageContent = await page.content();
  if (pageContent.toLowerCase().includes("cet ouvrage sera bientôt disponible")) {
    return "AVAILABLE_SOON";
  }

  // A valid book page should expose a non-empty title
  const titleLocator = page
    .locator(".item.book .title h2, .book-title, h1, h2")
    .first();

  // Wait briefly for UI to populate
  await titleLocator
    .waitFor({ state: "visible", timeout: 5000 })
    .catch(() => {});

  const titleText =
    (await titleLocator.textContent().catch(() => ""))?.trim() ?? "";
  if (titleText.length > 0) return "FOUND";

  // No title => not a valid book page
  return "NOT_FOUND";
}
