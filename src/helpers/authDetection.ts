import type { Page, Cookie } from "playwright";
import { makeScholarvoxUrl, getScholarVoxIframeUrl } from "./scholarVox.js";

export type AuthCheck = {
  authenticated: boolean;
  note: string;
  matched?: string[];
};

function normalizeDomain(d: string): string {
  return d.startsWith(".") ? d.slice(1) : d;
}

function detectAuthFromCookies(all: Cookie[], debug = false): AuthCheck {
  const svx = all.filter(c =>
    normalizeDomain(c.domain).includes("scholarvox.com")
  );
  const matched: string[] = [];

  const hasSession = svx.some(c => /^sfsessid/i.test(c.name));
  if (hasSession) {
    for (const c of svx)
      if (/^sfsessid/i.test(c.name))
        matched.push(`${c.name}@${normalizeDomain(c.domain)}`);
    if (debug) console.log(`\n🔎 SFSESSID found → AUTHENTICATED`);
    return {
      authenticated: true,
      note: `Authenticated (SFSESSID on scholarvox).`,
      matched,
    };
  }

  const hasXpriv = svx.some(c => /^_xpriv/i.test(c.name));
  const hasPosthog = svx.some(c => /posthog/i.test(c.name));
  const hasVisitor = svx.some(c => /visitor_unique/i.test(c.name));

  const authenticated = hasSession && (hasXpriv || hasPosthog || hasVisitor);
  if (debug) {
    console.log(
      `\n🔎 hasSession=${hasSession}, hasXpriv=${hasXpriv}, hasPosthog=${hasPosthog}, hasVisitor=${hasVisitor} → ${
        authenticated ? "AUTHENTICATED" : "NOT AUTHENTICATED"
      }`
    );
  }
  return {
    authenticated,
    note: authenticated
      ? `Authenticated via SFSESSID + signal.`
      : `Not authenticated: missing SFSESSID on scholarvox.com.`,
    matched,
  };
}

export type WaitDetectOptions = {
  docid?: string;
  waitForIframe?: boolean;
  timeoutMs?: number;
  debug?: boolean;
};

export async function waitAndDetectAuth(
  page: Page,
  opts: WaitDetectOptions = {}
): Promise<AuthCheck> {
  const {
    docid,
    waitForIframe = false,
    timeoutMs = 10_000,
    debug = false,
  } = opts;
  const start = Date.now();

  if (docid) {
    const readerUrl = makeScholarvoxUrl(docid, 1);
    await page
      .goto(readerUrl, { waitUntil: "domcontentloaded", timeout: 30_000 })
      .catch(() => {});
    if (waitForIframe) await getScholarVoxIframeUrl(page).catch(() => null);
  }

  while (Date.now() - start < timeoutMs) {
    const cookies = await page.context().cookies();
    if (debug) {
      console.log("\n🍪 Cookies:");
      for (const c of cookies)
        console.log(` - ${c.name} (${normalizeDomain(c.domain)})`);
    }
    const res = detectAuthFromCookies(cookies, debug);
    if (res.authenticated) return res;
    await page.waitForTimeout(800).catch(() => {});
  }

  const finalCookies = await page.context().cookies();
  if (debug) {
    console.log("\n🍪 Final cookies:");
    for (const c of finalCookies)
      console.log(` - ${c.name} (${normalizeDomain(c.domain)})`);
  }
  return detectAuthFromCookies(finalCookies, debug);
}
