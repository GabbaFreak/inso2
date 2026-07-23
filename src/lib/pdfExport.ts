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

      // 3. Sanitize all <style> tags and inline styles in clonedDoc to convert oklch/oklab/color-mix to valid rgb/rgba/hex
      const styleElements = Array.from(clonedDoc.querySelectorAll("style"));
      styleElements.forEach((styleTag) => {
        if (styleTag.textContent) {
          styleTag.textContent = replaceModernCssColors(styleTag.textContent);
        }
      });

      const allNodes = [clonedElement, ...Array.from(clonedElement.querySelectorAll<HTMLElement>("*"))];
      allNodes.forEach((node) => {
        if (node.style && node.style.cssText) {
          node.style.cssText = replaceModernCssColors(node.style.cssText);
        }
      });
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
    });
  }
}

function replaceModernCssColors(cssText: string): string {
  if (!cssText) return cssText;

  const targetPrefixes = ["oklch(", "oklab(", "color-mix(", "light-dark(", "lab(", "hwb("];

  let result = cssText;
  let guard = 0;

  while (guard < 10000) {
    guard++;
    let earliestIdx = -1;
    let foundPrefix = "";

    for (const prefix of targetPrefixes) {
      const idx = result.indexOf(prefix);
      if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
        earliestIdx = idx;
        foundPrefix = prefix;
      }
    }

    if (earliestIdx === -1) break;

    let openCount = 0;
    let endIdx = -1;
    for (let i = earliestIdx; i < result.length; i++) {
      if (result[i] === "(") {
        openCount++;
      } else if (result[i] === ")") {
        openCount--;
        if (openCount === 0) {
          endIdx = i;
          break;
        }
      }
    }

    if (endIdx === -1) {
      break;
    }

    const matchedExpr = result.substring(earliestIdx, endIdx + 1);
    let fallback = "#0f172a";

    if (foundPrefix === "oklch(") {
      fallback = oklchToRgba(matchedExpr);
    } else if (foundPrefix === "color-mix(") {
      fallback = "rgba(15, 23, 42, 0.1)";
    } else if (foundPrefix === "light-dark(") {
      fallback = "#0f172a";
    }

    result = result.substring(0, earliestIdx) + fallback + result.substring(endIdx + 1);
  }

  return result.replace(/oklch\s*\(?/gi, "#0f172a").replace(/oklab\s*\(?/gi, "#0f172a");
}

function oklchToRgba(str: string): string {
  const m = str.match(/oklch\(\s*([\d.%]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)/i);
  if (!m) {
    return "#0f172a";
  }

  let L = m[1].endsWith("%") ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
  let C = parseFloat(m[2]);
  let H = parseFloat(m[3]);
  let alpha = 1;
  if (m[4]) {
    alpha = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  }

  if (isNaN(L)) L = 0.5;
  if (isNaN(C)) C = 0;
  if (isNaN(H)) H = 0;
  if (isNaN(alpha)) alpha = 1;

  const hRad = (H * Math.PI) / 180;
  const labA = C * Math.cos(hRad);
  const labB = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * labA + 0.2158037573 * labB;
  const m_ = L - 0.1055613458 * labA - 0.0638541728 * labB;
  const s_ = L - 0.0894841775 * labA - 1.2914855480 * labB;

  const l = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r_lin = +4.0767416621 * l - 3.3077115913 * m3 + 0.2309699294 * s;
  const g_lin = -1.2684380046 * l + 2.6097574011 * m3 - 0.3413193965 * s;
  const b_lin = -0.0041960863 * l - 0.7034186147 * m3 + 1.7076147010 * s;

  const gamma = (c: number) =>
    c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055;

  const r = Math.min(255, Math.max(0, Math.round(gamma(r_lin) * 255)));
  const g = Math.min(255, Math.max(0, Math.round(gamma(g_lin) * 255)));
  const b = Math.min(255, Math.max(0, Math.round(gamma(b_lin) * 255)));

  if (alpha < 1) {
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

