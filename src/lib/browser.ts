import { chromium, Browser, BrowserContext, LaunchOptions } from "playwright";

/**
 * Wrapper for browser lifecycle management
 * Handles both persistent context (with userDataDir) and regular browser launch
 * Ensures proper cleanup of browser resources
 */
export async function withBrowser<T>(opts: {
  headful?: boolean;
  userDataDir?: string;
  launch?: LaunchOptions;
  run: (context: BrowserContext, browser: Browser | null) => Promise<T>;
}): Promise<T> {
  const { headful, userDataDir, launch, run } = opts;
  const launchOptions: LaunchOptions = {
    headless: !headful,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-features=site-per-process",
      "--disable-site-isolation-trials",
    ],
    ...launch,
  };

  let browser: Browser | null = null;
  let context: BrowserContext | undefined;
  try {
    if (userDataDir) {
      // Persistent context: saves cookies/session for authentication
      context = await chromium.launchPersistentContext(
        userDataDir,
        launchOptions
      );
      browser = context.browser();
      if (context.pages().length === 0) await context.newPage();
    } else {
      // Regular browser: no session persistence
      browser = await chromium.launch(launchOptions);
      context = await browser.newContext();
    }
    return await run(context, browser);
  } finally {
    try {
      if (context) await context.close();
    } catch {}
    try {
      if (browser && "isConnected" in browser && browser.isConnected())
        await browser.close();
    } catch {}
  }
}
