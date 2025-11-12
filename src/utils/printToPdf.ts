import { Page } from "playwright";

/**
 * Print ScholarVox page to PDF using browser's native print function
 * This preserves text selectability and uses vector fonts
 * @param page - The Playwright page
 * @param getIframeUrl - Function to extract the iframe URL from the page
 * @param scale - PDF scale factor (0.5-1.0). Lower = zoom out more. Default 0.4
 * @param pageNumber - The specific page number to extract (1-indexed). If provided, will scroll to and isolate that page.
 */
export async function printScholarVoxPageToPDF(
  page: Page,
  getIframeUrl: (page: Page) => Promise<string | null>,
  scale: number = 0.4,
  pageNumber?: number
): Promise<Buffer | null> {
  try {
    // Get the iframe URL from the main page
    const iframeUrl = await getIframeUrl(page);

    if (!iframeUrl) {
      console.log("❌ No iframe URL found");
      return null;
    }

    console.log(`📄 Printing iframe content: ${iframeUrl.substring(0, 80)}...`);

    // Create a new page to load the iframe content directly
    const context = page.context();
    const iframePage = await context.newPage();

    try {
      // --- IMPORTANT: shim for SWC/TSX helper leaking into evaluate() ---
      await iframePage.addInitScript(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__name = (f: any) => f;
      });
      // -------------------------------------------------------------------

      // Set viewport size that balances content capture and layout
      await iframePage.setViewportSize({
        width: 2800,
        height: 2100,
      });

      // Navigate to the iframe URL
      await iframePage.goto(iframeUrl, {
        timeout: 15000,
        waitUntil: "networkidle",
      });

      // If a specific page number is requested, scroll to it and isolate it
      if (pageNumber !== undefined) {
        console.log(`   🎯 Isolating page ${pageNumber}...`);

        // Scroll to the target page to trigger lazy loading
        await iframePage.evaluate(targetPage => {
          const container = document.getElementById("page-container");
          if (!container) return;

          const children = Array.from(container.children);
          const pageIndex = targetPage - 1;
          const targetElement = children[pageIndex] as HTMLElement;

          if (targetElement) {
            targetElement.scrollIntoView({ behavior: "auto", block: "start" });
          }
        }, pageNumber);

        // Wait for lazy-loaded content
        await iframePage.waitForTimeout(3000);

        // Hide all pages except the target one
        await iframePage.evaluate(targetPage => {
          const container = document.getElementById("page-container");
          if (!container) return;

          const children = Array.from(container.children);
          const targetIndex = targetPage - 1;

          // Hide all pages except the target
          children.forEach((child, index) => {
            const el = child as HTMLElement;
            if (index === targetIndex) {
              el.style.display = "block";
              el.style.visibility = "visible";
            } else {
              el.style.display = "none";
            }
          });

          // Hide sidebar
          const sidebar = document.getElementById("sidebar");
          if (sidebar) sidebar.style.display = "none";
        }, pageNumber);

        await iframePage.waitForTimeout(500);
      }

      // Wait for fonts to load - ScholarVox uses custom WOFF fonts with special character mappings
      // These fonts need time to download and be applied to the DOM
      console.log("   ⏳ Waiting for custom fonts to load...");

      // Use a string to avoid transform wrappers in the browser context
      await iframePage.evaluate(`(async () => {
        const fonts = Array.from(document.fonts);
        await Promise.all(fonts.map(f => f.load().catch(() => {})));
        await document.fonts.ready;
      })()`);

      // Log font information for debugging
      const fontInfo = await iframePage.evaluate(() => {
        const fonts = Array.from(document.fonts);
        return {
          totalFonts: fonts.length,
          loadedFonts: fonts.filter(f => f.status === "loaded").length,
          fontFamilies: [...new Set(fonts.map(f => f.family))],
        };
      });

      console.log(
        `   📝 Fonts: ${fontInfo.loadedFonts}/${fontInfo.totalFonts} loaded`
      );
      if (
        fontInfo.fontFamilies.length > 0 &&
        fontInfo.fontFamilies.length < 10
      ) {
        console.log(`   Font families: ${fontInfo.fontFamilies.join(", ")}`);
      } else if (fontInfo.fontFamilies.length >= 10) {
        console.log(
          `   Font families: ${
            fontInfo.fontFamilies.length
          } custom fonts (ff1-ff${fontInfo.fontFamilies.length.toString(16)})`
        );
      }

      // Additional wait to ensure font rendering is complete
      await iframePage.waitForTimeout(2000);

      // ---- Lazy render fix ----
      const renderInfo = await iframePage.evaluate(async () => {
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

        // Decode all images (helps with lazy decoders)
        const decodeAllImages = async () => {
          const imgs = Array.from(document.images) as HTMLImageElement[];
          await Promise.all(
            imgs.map(async img => {
              try {
                await img.decode();
              } catch {
                // ignore decode failures (cross-origin/data-uri oddities)
              }
            })
          );
        };

        // Pick a large candidate element for the "page" (image or canvas or big BG div)
        const pickLargeCandidate = () => {
          const candidates: Array<{
            el: Element;
            area: number;
            kind: "img" | "canvas" | "div";
          }> = [];

          // Images
          (Array.from(document.images) as HTMLImageElement[]).forEach(img => {
            const area = img.naturalWidth * img.naturalHeight;
            if (area > 1500 * 1500)
              candidates.push({ el: img, area, kind: "img" });
          });

          // Canvases
          (
            Array.from(
              document.querySelectorAll("canvas")
            ) as HTMLCanvasElement[]
          ).forEach(cv => {
            const area = cv.width * cv.height;
            if (area > 1500 * 1500)
              candidates.push({ el: cv, area, kind: "canvas" });
          });

          // Large div with background image as last resort
          (
            Array.from(document.querySelectorAll("div")) as HTMLDivElement[]
          ).forEach(div => {
            const r = div.getBoundingClientRect();
            const area = r.width * r.height;
            const cs = getComputedStyle(div);
            if (
              area > 1500 * 1500 &&
              cs.backgroundImage &&
              cs.backgroundImage !== "none"
            ) {
              candidates.push({ el: div, area, kind: "div" });
            }
          });

          candidates.sort((a, b) => b.area - a.area);
          return candidates[0] || null;
        };

        // Sample a few pixels to ensure canvas isn’t an all-white placeholder
        const canvasHasNonWhitePixel = (cv: HTMLCanvasElement) => {
          const ctx = cv.getContext("2d");
          if (!ctx || cv.width < 10 || cv.height < 10) return false;
          const w = cv.width,
            h = cv.height;
          const samples: Array<[number, number]> = [
            [Math.floor(w * 0.25), Math.floor(h * 0.25)],
            [Math.floor(w * 0.5), Math.floor(h * 0.5)],
            [Math.floor(w * 0.75), Math.floor(h * 0.75)],
          ];
          let colored = 0;
          for (const [sx, sy] of samples) {
            const d = ctx.getImageData(
              Math.min(w - 1, sx),
              Math.min(h - 1, sy),
              1,
              1
            ).data;
            if (d[3] > 0 && (d[0] < 250 || d[1] < 250 || d[2] < 250)) {
              colored++;
            }
          }
          return colored > 0;
        };

        // Try up to ~6s (30 × 200ms), nudging scroll to trigger lazy loaders
        let attempts = 30;
        while (attempts-- > 0) {
          // Gentle nudge
          window.scrollBy(0, 80);

          await decodeAllImages();

          const cand = pickLargeCandidate();
          if (cand) {
            const el = cand.el as HTMLElement;
            el.scrollIntoView({ block: "center" });

            if (cand.kind === "img") {
              const img = el as HTMLImageElement;
              if (
                img.complete &&
                img.naturalWidth > 10 &&
                img.naturalHeight > 10
              ) {
                return {
                  ok: true,
                  kind: "img",
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                  source: "image natural dimensions",
                };
              }
            } else if (cand.kind === "canvas") {
              const cv = el as HTMLCanvasElement;
              if (
                cv.width > 10 &&
                cv.height > 10 &&
                canvasHasNonWhitePixel(cv)
              ) {
                return {
                  ok: true,
                  kind: "canvas",
                  width: cv.width,
                  height: cv.height,
                  source: "canvas pixels",
                };
              }
            } else {
              const r = el.getBoundingClientRect();
              if (r.width > 10 && r.height > 10) {
                return {
                  ok: true,
                  kind: "div",
                  width: Math.round(r.width),
                  height: Math.round(r.height),
                  source: "div background",
                };
              }
            }
          }

          await sleep(200);
        }

        return { ok: false, reason: "timed out waiting for rendered page" };
      });

      if (!(renderInfo as any).ok) {
        console.log(
          "   ⚠️  Page content did not fully render (lazy loader timeout); PDF may be blank."
        );
      } else {
        console.log(
          `   🔍 Rendered via ${(renderInfo as any).kind as string} (${
            (renderInfo as any).width
          }x${(renderInfo as any).height})`
        );
      }
      // ---- End lazy render fix ----

      // Check for authentication message
      const authMessage = await iframePage.evaluate(() => {
        const text = document.body.innerText;
        return text.includes(
          "Pour consulter cet ouvrage dans son intégralité, veuillez vous authentifier"
        );
      });

      if (authMessage) {
        console.log(
          "⚠️  WARNING: Authentication required! Please log in to access the full content."
        );
        console.log(
          '   Message detected: "Pour consulter cet ouvrage dans son intégralité, veuillez vous authentifier"'
        );
      }

      // Reset any CSS that might affect printing and remove clipping/overflow constraints
      await iframePage.evaluate(() => {
        // Don't modify transforms - leave them as they are!
        // Just reset zoom
        (document.body as HTMLElement).style.zoom = "1";
        (document.documentElement as HTMLElement).style.zoom = "1";

        // Remove all overflow/clipping constraints
        document.body.style.overflow = "visible";
        document.body.style.overflowX = "visible";
        document.body.style.overflowY = "visible";
        document.documentElement.style.overflow = "visible";

        // Remove width/height constraints
        document.body.style.width = "auto";
        document.body.style.height = "auto";
        document.body.style.maxWidth = "none";
        document.body.style.maxHeight = "none";
        document.body.style.minWidth = "0";
        document.body.style.minHeight = "0";

        // Check for any container divs that might be clipping
        const allDivs = document.querySelectorAll("div");
        allDivs.forEach(div => {
          const computedStyle = window.getComputedStyle(div);
          if (computedStyle.overflow !== "visible") {
            (div as HTMLElement).style.overflow = "visible";
            (div as HTMLElement).style.overflowX = "visible";
            (div as HTMLElement).style.overflowY = "visible";
          }
          // Remove fixed dimensions that might clip content
          if (
            computedStyle.maxWidth !== "none" &&
            computedStyle.maxWidth !== ""
          ) {
            (div as HTMLElement).style.maxWidth = "none";
          }
          if (
            computedStyle.maxHeight !== "none" &&
            computedStyle.maxHeight !== ""
          ) {
            (div as HTMLElement).style.maxHeight = "none";
          }
          // Remove clip-path
          if (computedStyle.clipPath !== "none") {
            (div as HTMLElement).style.clipPath = "none";
          }
        });

        // Handle canvas elements - expand their dimensions
        const canvases = document.querySelectorAll("canvas");
        canvases.forEach(canvas => {
          canvas.style.maxWidth = "none";
          canvas.style.maxHeight = "none";
        });

        // Handle SVG elements - expand their viewBox if needed
        const svgs = document.querySelectorAll("svg");
        svgs.forEach(svg => {
          (svg as SVGElement).style.maxWidth = "none";
          (svg as SVGElement).style.maxHeight = "none";
          (svg as SVGElement).style.overflow = "visible";
        });
      });

      // Detect actual page dimensions from the content
      const pageDimensions = await iframePage.evaluate(() => {
        // Look for image elements (the first page content is often an image)
        const images = document.querySelectorAll("img");
        if (images.length > 0) {
          // Find the largest image (likely the page content)
          let largestImage: Element | null = null;
          let maxArea = 0;

          images.forEach(img => {
            const imgEl = img as HTMLImageElement;
            // Use naturalWidth/naturalHeight for intrinsic image dimensions
            const area = imgEl.naturalWidth * imgEl.naturalHeight;
            if (area > maxArea) {
              maxArea = area;
              largestImage = imgEl;
            }
          });

          if (largestImage) {
            const imgEl = largestImage as HTMLImageElement;
            // Use natural dimensions (intrinsic size) not rendered size
            if (imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
              return {
                width: imgEl.naturalWidth,
                height: imgEl.naturalHeight,
                source: "image natural dimensions",
              };
            }
          }
        }

        // Fallback: look for the main content container
        const pageElement =
          document.querySelector('[class*="page"]') ||
          document.querySelector('[id*="page"]') ||
          document.querySelector("body > div:first-child");

        if (pageElement) {
          const rect = pageElement.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            source: "page element",
          };
        }

        // Final fallback: use window dimensions (this will probably fuck up the aspect ratio)
        return {
          width: window.innerWidth,
          height: window.innerHeight,
          source: "window",
        };
      });

      // Check actual content dimensions for debugging
      const dimensions = await iframePage.evaluate(() => {
        return {
          scrollWidth: document.body.scrollWidth,
          scrollHeight: document.body.scrollHeight,
          clientWidth: document.body.clientWidth,
          clientHeight: document.body.clientHeight,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        };
      });

      // The printed dimensions may not be accurate, this is more for debugging
      console.log(
        `   Viewport: ${dimensions.viewportWidth}x${dimensions.viewportHeight}`
      );
      console.log(
        `   Body: ${dimensions.scrollWidth}x${dimensions.scrollHeight}`
      );
      console.log(
        `   Detected page size: ${pageDimensions.width}x${pageDimensions.height} px (from ${pageDimensions.source})`
      );

      // Convert pixel dimensions to inches (96 DPI)
      const pageWidthInches = pageDimensions.width / 96;
      const pageHeightInches = pageDimensions.height / 96;

      // Calculate optimal scale based on page dimensions
      // Most tested books (1080×1332) work well with scale 0.4
      // For larger pages, we need proportionally LARGER scale to zoom in
      // Formula: scale = 0.4 * (actualWidth / referenceWidth)
      const referenceWidth = 1080;
      const referenceScale = 0.4;
      const autoScale =
        referenceScale * (pageDimensions.width / referenceWidth);

      // Use provided scale if given, otherwise use auto-calculated scale
      const finalScale = scale !== 0.4 ? scale : autoScale;

      console.log(
        `   PDF page size: ${pageWidthInches.toFixed(
          2
        )}" x ${pageHeightInches.toFixed(2)}"`
      );
      console.log(`   Auto-calculated scale: ${autoScale.toFixed(3)}`);
      console.log(`   Using scale: ${finalScale.toFixed(3)}`);

      const pdfBuffer = await iframePage.pdf({
        width: `${pageWidthInches}in`,
        height: `${pageHeightInches}in`,
        printBackground: true,
        margin: {
          top: "0mm",
          right: "0mm",
          bottom: "0mm",
          left: "0mm",
        },
        scale: finalScale,
        preferCSSPageSize: false,
      });

      console.log(`   ✅ Generated PDF from HTML page!`);
      return Buffer.from(pdfBuffer);
    } finally {
      await iframePage.close();
    }
  } catch (err) {
    console.error("Print to PDF failed:", err);
    return null;
  }
}
