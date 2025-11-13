#!/usr/bin/env node
import { chromium } from "playwright";
import readline from "node:readline";
import fs from "node:fs/promises";
import path from "node:path";
import { checkBookStatus } from "./helpers/bookCheck.js";
import { getCredentials } from "./utils/credentials.js";
import { loginCESI } from "./utils/auth.js";

const DEBUG = process.argv.includes("--debug") || process.argv.includes("-d");

function log(msg: string) {
  if (DEBUG) console.log(msg);
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function progressBar(current: number, total: number): string {
  const pct = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * 40);
  const bar = "█".repeat(filled) + "░".repeat(40 - filled);
  return `   [${bar}] ${pct}% (${current}/${total})`;
}

class Spinner {
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private frame = 0;
  private timer: NodeJS.Timeout | null = null;
  private msg = "";

  start(message: string) {
    this.msg = message;
    this.frame = 0;
    this.timer = setInterval(() => {
      process.stdout.write(`\r${this.frames[this.frame]} ${this.msg}`);
      this.frame = (this.frame + 1) % this.frames.length;
    }, 80);
  }

  stop(final?: string) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    process.stdout.write("\r" + " ".repeat(100) + "\r");
    if (final) process.stdout.write(`${final}\n`);
  }
}

async function validateBook(docid: string): Promise<boolean> {
  const spinner = new Spinner();
  spinner.start("Validating book ID...");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const status = await checkBookStatus(page, docid);
    await browser.close();

    switch (status) {
      case "FOUND":
        spinner.stop("Book ID is valid.\n");
        return true;
      case "REMOVED":
        spinner.stop(
          "Error: This book has been removed or is no longer available.\n"
        );
        return false;
      case "AVAILABLE_SOON":
        spinner.stop(
          "Error: This book will be available soon but is not currently accessible.\n"
        );
        return false;
      case "NOT_FOUND":
        spinner.stop(
          "Error: Book ID not found. Please check the ID and try again.\n"
        );
        return false;
      default:
        spinner.stop("Error: Unknown book status.\n");
        return false;
    }
  } catch (err: any) {
    await browser.close();
    spinner.stop();
    log(`Validation error: ${err.message}\n`);
    return false;
  }
}

async function downloadBook(docid: string, outputPath: string) {
  log(`\nBook ID: ${docid}`);
  log(`Output: ${outputPath}\n`);

  const creds = await getCredentials();
  const browser = await chromium.launch({ 
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-features=site-per-process",
      "--disable-site-isolation-trials",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    const loginSpinner = new Spinner();
    loginSpinner.start("Logging in to CESI...");
    log(`Email: ${creds.email}`);
    await loginCESI(page, creds.email, creds.password, DEBUG);
    loginSpinner.stop("Login successful!");

    const loader = new Spinner();
    loader.start("Loading book reader...");
    log("\nOpening book...");
    await page.goto(
      `https://univ.scholarvox.com/reader/docid/${docid}/page/1`,
      {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      }
    );

    await page.waitForTimeout(2000);

    const iframeUrl = await page.evaluate(() => {
      const iframe = document.querySelector("iframe");
      return iframe?.src || null;
    });

    if (!iframeUrl) {
      loader.stop();
      throw new Error("No iframe found!");
    }

    log("Loading content...");
    log("Viewport: 2800x2100");
    
    let iframePage = await context.newPage();
    await iframePage.setViewportSize({ width: 2800, height: 2100 });

    await iframePage.goto(iframeUrl, {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    await iframePage.waitForTimeout(3000);

    let totalPages = await iframePage.evaluate(() => {
      const container = document.getElementById("page-container");
      return container ? container.children.length : 0;
    });

    // Verify that we got pages - if 0, try reloading
    if (totalPages === 0) {
      loader.stop();
      console.log("\nWarning: Book appears to have 0 pages. Retrying...");
      
      const retrySpinner = new Spinner();
      retrySpinner.start("Reloading book...");
      
      await iframePage.close();
      iframePage = await context.newPage();
      await iframePage.setViewportSize({ width: 2800, height: 2100 });
      
      await iframePage.goto(iframeUrl, {
        waitUntil: "networkidle",
        timeout: 15000,
      });
      
      await iframePage.waitForTimeout(3000);
      
      totalPages = await iframePage.evaluate(() => {
        const container = document.getElementById("page-container");
        return container ? container.children.length : 0;
      });
      
      retrySpinner.stop();
      
      if (totalPages === 0) {
        throw new Error("Book still has 0 pages after retry. The book might be unavailable or there's an access issue.");
      }
      
      console.log("Retry successful!");
    }

    loader.stop("Book reader loaded successfully.");

    console.log(`\nBook contains ${totalPages} pages.`);
    console.log("Loading all pages...");

    // scroll through pages to trigger lazy loading
    for (let i = 0; i < totalPages; i++) {
      const bar = progressBar(i + 1, totalPages);
      process.stdout.write(`\r${bar}`);
      // Clear any remaining characters from previous line
      process.stdout.clearLine(1);

      await iframePage.evaluate(pageIdx => {
        const container = document.getElementById("page-container");
        if (!container) return;
        const el = container.children[pageIdx] as HTMLElement;
        if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
      }, i);

      await iframePage.waitForTimeout(200);
    }

    console.log("\nAll pages loaded.\n");

    const spinner = new Spinner();
    if (DEBUG) spinner.start("Loading fonts...");

    // wait for fonts
    await iframePage.evaluate(`(async () => {
      const fonts = Array.from(document.fonts);
      await Promise.all(fonts.map(f => f.load().catch(() => {})));
      await document.fonts.ready;
    })()`);

    if (DEBUG) {
      spinner.stop("Fonts loaded");
      spinner.start("Optimizing layout...");
    }

    // reset CSS for printing
    await iframePage.evaluate(() => {
      document.body.style.zoom = "1";
      document.documentElement.style.zoom = "1";
      document.body.style.overflow = "visible";
      document.body.style.overflowX = "visible";
      document.body.style.overflowY = "visible";
      document.documentElement.style.overflow = "visible";
      document.body.style.width = "auto";
      document.body.style.height = "auto";
      document.body.style.maxWidth = "none";
      document.body.style.maxHeight = "none";
      document.body.style.minWidth = "0";
      document.body.style.minHeight = "0";

      const allDivs = document.querySelectorAll("div");
      allDivs.forEach(div => {
        const style = window.getComputedStyle(div);
        if (style.overflow !== "visible") {
          (div as HTMLElement).style.overflow = "visible";
          (div as HTMLElement).style.overflowX = "visible";
          (div as HTMLElement).style.overflowY = "visible";
        }
        if (style.maxWidth !== "none" && style.maxWidth !== "") {
          (div as HTMLElement).style.maxWidth = "none";
        }
        if (style.maxHeight !== "none" && style.maxHeight !== "") {
          (div as HTMLElement).style.maxHeight = "none";
        }
        if (style.clipPath !== "none") {
          (div as HTMLElement).style.clipPath = "none";
        }
      });

      const canvases = document.querySelectorAll("canvas");
      canvases.forEach(canvas => {
        canvas.style.maxWidth = "none";
        canvas.style.maxHeight = "none";
      });

      const svgs = document.querySelectorAll("svg");
      svgs.forEach(svg => {
        (svg as SVGElement).style.maxWidth = "none";
        (svg as SVGElement).style.maxHeight = "none";
        (svg as SVGElement).style.overflow = "visible";
      });
    });

    if (DEBUG) spinner.stop("Layout optimized");

    const dims = await iframePage.evaluate(() => {
      const images = document.querySelectorAll("img");
      if (images.length > 0) {
        let largest: Element | null = null;
        let maxArea = 0;

        images.forEach(img => {
          const imgEl = img as HTMLImageElement;
          const area = imgEl.naturalWidth * imgEl.naturalHeight;
          if (area > maxArea) {
            maxArea = area;
            largest = imgEl;
          }
        });

        if (largest) {
          const imgEl = largest as HTMLImageElement;
          if (imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
            return { width: imgEl.naturalWidth, height: imgEl.naturalHeight };
          }
        }
      }
      return { width: 1080, height: 1332 };
    });

    const widthInches = dims.width / 96;
    const heightInches = dims.height / 96;
    const scale = 0.4 * (dims.width / 1080);

    if (DEBUG) {
      log(`Page size: ${dims.width}x${dims.height}px`);
      log(`PDF size: ${widthInches.toFixed(2)}" x ${heightInches.toFixed(2)}"`);
      log(`Scale: ${scale.toFixed(3)}\n`);
    }

    spinner.start(`Generating PDF (${totalPages} pages)...`);

    const pdfBuffer = await iframePage.pdf({
      width: `${widthInches}in`,
      height: `${heightInches}in`,
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      scale: scale,
      preferCSSPageSize: false,
    });

    spinner.stop();
    if (DEBUG) log("PDF generated");

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, pdfBuffer);

    const stats = await fs.stat(outputPath);

    console.log("\nDownload complete!");
    console.log(`  Pages: ${totalPages}`);
    console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Location: ${outputPath}\n`);
  } catch (err: any) {
    console.error(`\nError: ${err.message}`);
    if (DEBUG) console.error(err.stack);
    throw err;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("  VOXFETCH-CESI");
  console.log("  ScholarVox Book Downloader for CESI Students");
  console.log("=".repeat(70));
  if (DEBUG) console.log("  Debug mode enabled");
  console.log("");

  const docid = await ask("Enter book ID: ");

  if (!docid) {
    console.log("Error: Book ID is required.\n");
    process.exit(1);
  }

  const isValid = await validateBook(docid);
  if (!isValid) process.exit(1);

  const defaultOutput = `output/${docid}.pdf`;
  const outputAnswer = await ask(`Output file (default: ${defaultOutput}): `);
  const outputPath = outputAnswer || defaultOutput;

  console.log("");
  await downloadBook(docid, outputPath);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
