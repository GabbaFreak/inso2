import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export async function exportElementToPdf(elementOrId: HTMLElement | string, filename: string) {
  let element = typeof elementOrId === "string" ? document.getElementById(elementOrId) : elementOrId;
  
  if (!element) {
    // Retry shortly in case modal/element was just toggled
    await new Promise((resolve) => setTimeout(resolve, 200));
    element = typeof elementOrId === "string" ? document.getElementById(elementOrId) : elementOrId;
  }

  if (!element) {
    console.error("Element not found for PDF export:", elementOrId);
    alert("Fehler: Druckansicht konnte nicht für den PDF-Export gefunden werden.");
    return;
  }

  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 10; // 10mm margin on each side
    const contentWidth = pageWidth - 2 * margin; // 190mm
    const contentHeight = pageHeight - 2 * margin; // 277mm

    // 1. Check if element contains explicit page sheets (.pdf-page or [data-pdf-page])
    const pageSheets = Array.from(element.querySelectorAll<HTMLElement>(".pdf-page, [data-pdf-page]"));

    if (pageSheets.length > 0) {
      for (let i = 0; i < pageSheets.length; i++) {
        const sheet = pageSheets[i];
        const canvas = await captureCanvas(sheet);
        if (i > 0) pdf.addPage();
        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", margin, margin, contentWidth, contentHeight, undefined, "FAST");
      }
      pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
      return;
    }

    // 2. Render main container
    const canvas = await captureCanvas(element);
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    // Single page document check
    if (imgHeight <= contentHeight) {
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight, undefined, "FAST");
      pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
      return;
    }

    // Multi-page document: Slice at smart element boundaries
    const elementRect = element.getBoundingClientRect();
    const pxPerMm = canvas.width / contentWidth;
    const pageHeightPx = contentHeight * pxPerMm;

    // Find all block elements to locate safe gap boundaries
    const children = Array.from(
      element.querySelectorAll<HTMLElement>(
        "p, tr, h1, h2, h3, h4, h5, h6, section, article, table, .border, [data-break-avoid], .keep-together, .signature-block"
      )
    );

    const safeGapsPx: number[] = [];
    children.forEach((child) => {
      const rect = child.getBoundingClientRect();
      const bottomPx = (rect.bottom - elementRect.top) * (canvas.height / elementRect.height);
      safeGapsPx.push(bottomPx + 1);
    });

    safeGapsPx.sort((a, b) => a - b);

    let currentYPx = 0;
    let pageCount = 0;

    while (currentYPx < canvas.height - 10) {
      pageCount++;
      if (pageCount > 1) pdf.addPage();

      const targetYPx = currentYPx + pageHeightPx;
      let sliceYPx = targetYPx;

      if (targetYPx < canvas.height) {
        // Look for element boundaries near the bottom 25% of the page
        const minGap = currentYPx + pageHeightPx * 0.75;
        const validGaps = safeGapsPx.filter((y) => y <= targetYPx && y >= minGap);

        if (validGaps.length > 0) {
          sliceYPx = validGaps[validGaps.length - 1];
        }
      } else {
        sliceYPx = canvas.height;
      }

      const sliceHeightPx = Math.max(10, sliceYPx - currentYPx);

      // Create temporary canvas for this page slice
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = sliceHeightPx;
      const ctx = tempCanvas.getContext("2d");

      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          currentYPx,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          tempCanvas.width,
          sliceHeightPx
        );

        const pageImgData = tempCanvas.toDataURL("image/png");
        const sliceHeightMm = (sliceHeightPx * contentWidth) / canvas.width;
        pdf.addImage(
          pageImgData,
          "PNG",
          margin,
          margin,
          contentWidth,
          Math.min(sliceHeightMm, contentHeight),
          undefined,
          "FAST"
        );
      }

      currentYPx = sliceYPx;
    }

    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  } catch (err) {
    console.error("PDF generation failed:", err);
    alert("Fehler bei der PDF-Erstellung. Bitte nutzen Sie alternativ die Drucken-Funktion (PDF speichern).");
  }
}

async function captureCanvas(el: HTMLElement): Promise<HTMLCanvasElement> {
  const options = {
    scale: 1.5,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: "#ffffff",
    windowWidth: 1200,
    imageTimeout: 15000,
    onclone: (clonedDoc: Document, clonedElement: HTMLElement) => {
      // 1. Force light mode on cloned document and cloned element
      if (clonedDoc.documentElement) {
        clonedDoc.documentElement.classList.remove("dark");
        clonedDoc.documentElement.style.backgroundColor = "#ffffff";
        clonedDoc.documentElement.style.color = "#0f172a";
      }
      if (clonedDoc.body) {
        clonedDoc.body.classList.remove("dark");
        clonedDoc.body.style.backgroundColor = "#ffffff";
        clonedDoc.body.style.color = "#0f172a";
      }

      clonedElement.classList.remove("dark");
      clonedElement.style.backgroundColor = "#ffffff";
      clonedElement.style.color = "#0f172a";
      clonedElement.style.height = "auto";
      clonedElement.style.maxHeight = "none";
      clonedElement.style.overflow = "visible";
      clonedElement.style.paddingBottom = "24px";

      // 2. Lock exact pixel sizes for images so logos do not expand or distort
      const origImgs = Array.from(el.querySelectorAll<HTMLImageElement>("img"));
      const cloneImgs = Array.from(clonedElement.querySelectorAll<HTMLImageElement>("img"));
      const imgLen = Math.min(origImgs.length, cloneImgs.length);
      for (let i = 0; i < imgLen; i++) {
        const orig = origImgs[i];
        const clone = cloneImgs[i];
        const rect = orig.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          clone.style.width = `${rect.width}px`;
          clone.style.height = `${rect.height}px`;
          clone.style.maxWidth = `${rect.width}px`;
          clone.style.maxHeight = `${rect.height}px`;
          clone.style.objectFit = "contain";
        }
      }

      // 3. Sanitize all <style> tags, live styleSheets, and inline styles in clonedDoc
      const styleElements = Array.from(clonedDoc.querySelectorAll("style"));
      styleElements.forEach((styleTag) => {
        if (styleTag.textContent) {
          styleTag.textContent = replaceModernCssColors(styleTag.textContent);
        }
      });

      try {
        const sheets = Array.from(clonedDoc.styleSheets || []);
        sheets.forEach((sheet) => {
          try {
            const rules = Array.from(sheet.cssRules || []);
            rules.forEach((rule) => {
              if (
                rule.cssText &&
                (rule.cssText.includes("oklch") ||
                  rule.cssText.includes("color-mix") ||
                  rule.cssText.includes("oklab") ||
                  rule.cssText.includes("light-dark") ||
                  rule.cssText.includes("lab(") ||
                  rule.cssText.includes("hwb("))
              ) {
                const styleRule = rule as CSSStyleRule;
                if (styleRule.style && styleRule.style.cssText) {
                  styleRule.style.cssText = replaceModernCssColors(styleRule.style.cssText);
                }
              }
            });
          } catch {
            // ignore CORS or sheet read errors
          }
        });
      } catch {
        // ignore sheet read errors
      }

      const allNodes = [clonedElement, ...Array.from(clonedElement.querySelectorAll<HTMLElement>("*"))];
      allNodes.forEach((node) => {
        if (node.style && node.style.cssText) {
          node.style.cssText = replaceModernCssColors(node.style.cssText);
        }
        const attrStyle = node.getAttribute("style");
        if (
          attrStyle &&
          (attrStyle.includes("oklch") ||
            attrStyle.includes("color-mix") ||
            attrStyle.includes("oklab") ||
            attrStyle.includes("light-dark"))
        ) {
          node.setAttribute("style", replaceModernCssColors(attrStyle));
        }
      });

      // 4. Safely patch getPropertyValue on CSSStyleDeclaration prototype on clonedDoc.defaultView
      if (clonedDoc.defaultView && clonedDoc.defaultView.CSSStyleDeclaration) {
        const origGetPropertyValue = clonedDoc.defaultView.CSSStyleDeclaration.prototype.getPropertyValue;
        clonedDoc.defaultView.CSSStyleDeclaration.prototype.getPropertyValue = function (prop: string) {
          const val = origGetPropertyValue.call(this, prop);
          return replaceModernCssColors(val);
        };
      }
    },
  };

  try {
    return await html2canvas(el, options);
  } catch (err) {
    console.warn("Primary html2canvas capture failed, trying simplified capture:", err);
    return await html2canvas(el, {
      scale: 1,
      backgroundColor: "#ffffff",
      logging: false,
      allowTaint: true,
      useCORS: false,
      onclone: options.onclone,
    });
  }
}

let colorCanvas: HTMLCanvasElement | null = null;
let colorCtx: CanvasRenderingContext2D | null = null;

export function colorToRgb(cssColor: string): string {
  if (!cssColor || cssColor === "transparent") return "rgba(0, 0, 0, 0)";
  try {
    if (!colorCanvas) {
      colorCanvas = document.createElement("canvas");
      colorCanvas.width = 1;
      colorCanvas.height = 1;
      colorCtx = colorCanvas.getContext("2d", { willReadFrequently: true });
    }
    if (!colorCtx) return "#0f172a";

    colorCtx.clearRect(0, 0, 1, 1);
    colorCtx.fillStyle = "#0f172a";
    colorCtx.fillStyle = cssColor;
    colorCtx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = colorCtx.getImageData(0, 0, 1, 1).data;
    const alpha = Number((a / 255).toFixed(3));
    if (alpha === 1) {
      return `rgb(${r}, ${g}, ${b})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return "#0f172a";
  }
}

export function replaceModernCssColors(cssText: string): string {
  if (!cssText || typeof cssText !== "string") return cssText;

  let result = cssText;
  let iterations = 0;

  while (
    iterations < 10 &&
    (result.includes("oklch") ||
      result.includes("oklab") ||
      result.includes("color-mix") ||
      result.includes("light-dark") ||
      result.includes("lab(") ||
      result.includes("hwb("))
  ) {
    iterations++;
    const prev = result;
    result = result.replace(
      /(oklch|oklab|color-mix|light-dark|lab|hwb)\s*\((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*\)/gi,
      (match) => colorToRgb(match)
    );
    if (result === prev) {
      result = result
        .replace(/oklch\([^)]*\)/gi, "#0f172a")
        .replace(/oklab\([^)]*\)/gi, "#0f172a")
        .replace(/color-mix\([^)]*\)/gi, "rgba(15, 23, 42, 0.1)")
        .replace(/light-dark\([^)]*\)/gi, "#0f172a")
        .replace(/lab\([^)]*\)/gi, "#0f172a")
        .replace(/hwb\([^)]*\)/gi, "#0f172a");
      break;
    }
  }

  return result;
}

