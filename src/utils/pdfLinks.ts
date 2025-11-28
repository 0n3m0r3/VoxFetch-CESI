import { PDFDocument, PDFPage } from "pdf-lib";

/**
 * Link data extracted from HTML page
 */
export interface LinkData {
  /** 0-based index of the page containing this link */
  pageIndex: number;
  /** Link rectangle in HTML coordinates (origin bottom-left, like PDF) */
  rect: {
    x: number;
    y: number; // bottom position
    width: number;
    height: number;
  };
  /** Page dimensions in HTML coordinates */
  pageBounds: {
    width: number;
    height: number;
  };
  /** Full href (may include hash for internal links) */
  href: string;
  /** For internal links: 0-based target page index */
  hashTargetPageIndex?: number;
}

/**
 * Add link annotations to a PDF document
 * @param pdfDoc - The PDF document to annotate
 * @param links - Array of link data extracted from HTML
 * @param showBorders - If true, draw visible borders around links for debugging
 */
export async function addLinksToPdf(
  pdfDoc: PDFDocument,
  links: LinkData[],
  showBorders: boolean = false
): Promise<void> {
  const pages = pdfDoc.getPages();
  
  // Debug: log first link's coordinate transformation
  let debugLogged = false;

  for (const link of links) {
    // Skip if page doesn't exist
    if (link.pageIndex < 0 || link.pageIndex >= pages.length) {
      continue;
    }

    const page = pages[link.pageIndex];
    const { width: pdfWidth, height: pdfHeight } = page.getSize();

    // Calculate scale factors from HTML container to PDF coordinates
    // HTML uses CSS pixels, PDF uses points (72 per inch)
    // The pageBounds should be the .pf container dimensions (e.g., 730x945)
    const scaleX = pdfWidth / link.pageBounds.width;
    const scaleY = pdfHeight / link.pageBounds.height;

    // Convert HTML rect to PDF rect
    // HTML 'bottom' is distance from bottom of container - same as PDF Y coordinate
    const pdfRect = {
      x: link.rect.x * scaleX,
      y: link.rect.y * scaleY,
      width: link.rect.width * scaleX,
      height: link.rect.height * scaleY,
    };
    
    // Debug log for first link (only when showBorders/debug is enabled)
    if (!debugLogged && showBorders) {
      console.log(`   [Link Debug] Page bounds: ${link.pageBounds.width}x${link.pageBounds.height}px -> ${pdfWidth.toFixed(0)}x${pdfHeight.toFixed(0)}pt (scale: ${scaleX.toFixed(3)})`);
      debugLogged = true;
    }

    // Determine if this is an internal or external link
    const isInternalLink = link.hashTargetPageIndex !== undefined;

    if (isInternalLink) {
      // Internal link - go to target page
      const targetPageIndex = link.hashTargetPageIndex!;
      if (targetPageIndex >= 0 && targetPageIndex < pages.length) {
        const targetPage = pages[targetPageIndex];
        addGoToPageLink(page, pdfRect, targetPage, showBorders);
      }
    } else {
      // External link - open URL
      // Extract clean URL (remove any hash fragments for external links)
      let url = link.href;
      // If href starts with http/https/mailto, use it directly
      if (
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("mailto:")
      ) {
        addUriLink(page, pdfRect, url, showBorders);
      }
    }
  }
}

/**
 * Add an internal link annotation that navigates to another page
 */
function addGoToPageLink(
  page: PDFPage,
  rect: { x: number; y: number; width: number; height: number },
  targetPage: PDFPage,
  showBorder: boolean
): void {
  // pdf-lib doesn't have a direct API for link annotations with GoTo actions,
  // so we need to create the annotation dictionary manually
  const pdfDoc = page.doc;

  // Create destination array: [pageRef, /XYZ, left, top, zoom]
  // null values mean "unchanged" - we go to page top
  const destArray = pdfDoc.context.obj([
    targetPage.ref,
    "XYZ",
    0,
    targetPage.getHeight(),
    null,
  ]);

  // Create the link annotation dictionary
  const linkAnnotation = pdfDoc.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
    Border: showBorder ? [0, 0, 1] : [0, 0, 0],
    C: showBorder ? [1, 0, 0] : [], // Red border if showing
    Dest: destArray,
  });

  // Add annotation to page
  const linkRef = pdfDoc.context.register(linkAnnotation);
  addAnnotationToPage(page, linkRef);
}

/**
 * Add an external link annotation that opens a URL
 */
function addUriLink(
  page: PDFPage,
  rect: { x: number; y: number; width: number; height: number },
  uri: string,
  showBorder: boolean
): void {
  const pdfDoc = page.doc;

  // Create URI action
  const uriAction = pdfDoc.context.obj({
    Type: "Action",
    S: "URI",
    URI: pdfDoc.context.obj(uri),
  });

  // Create the link annotation dictionary
  const linkAnnotation = pdfDoc.context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
    Border: showBorder ? [0, 0, 1] : [0, 0, 0],
    C: showBorder ? [0, 0, 1] : [], // Blue border for external links if showing
    A: uriAction,
  });

  // Add annotation to page
  const linkRef = pdfDoc.context.register(linkAnnotation);
  addAnnotationToPage(page, linkRef);
}

/**
 * Helper to add an annotation reference to a page's Annots array
 */
function addAnnotationToPage(page: PDFPage, annotRef: any): void {
  const pdfDoc = page.doc;

  // Get existing annotations array or create new one
  const pageDict = page.node;
  let annotsArray = pageDict.get(pdfDoc.context.obj("Annots"));

  if (!annotsArray) {
    // Create new annotations array
    annotsArray = pdfDoc.context.obj([]);
    pageDict.set(pdfDoc.context.obj("Annots"), annotsArray);
  }

  // Get the actual array (it might be a reference)
  const annots = pdfDoc.context.lookup(annotsArray);
  if (annots && typeof (annots as any).push === "function") {
    (annots as any).push(annotRef);
  }
}
