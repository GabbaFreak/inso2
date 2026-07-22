import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export async function exportElementToPdf(elementOrId: HTMLElement | string, filename: string) {
  const element = typeof elementOrId === "string" ? document.getElementById(elementOrId) : elementOrId;
  if (!element) {
    console.error("Element not found for PDF export:", elementOrId);
    alert("Fehler: Druckansicht konnte nicht für den PDF-Export gefunden werden.");
    return;
  }

  try {
    // Render element at high resolution with html2canvas
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution for crisp rendering
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 1200,
      onclone: (clonedDoc, clonedElement) => {
        // 1. Remove or replace oklch declarations from all <style> tags in cloned document
        const styleElements = Array.from(clonedDoc.querySelectorAll("style"));
        styleElements.forEach((styleEl) => {
          if (styleEl.innerHTML && styleEl.innerHTML.includes("oklch")) {
            styleEl.innerHTML = styleEl.innerHTML.replace(/oklch\([^)]+\)/g, "#475569");
          }
        });

        // 2. Also check inline style attributes on all elements in clonedDoc
        const allCloned = Array.from(clonedDoc.querySelectorAll<HTMLElement>("*"));
        allCloned.forEach((el) => {
          const styleAttr = el.getAttribute("style");
          if (styleAttr && styleAttr.includes("oklch")) {
            el.setAttribute("style", styleAttr.replace(/oklch\([^)]+\)/g, "#475569"));
          }
        });

        // 3. Convert computed styles from original DOM (where browser resolves oklch to rgb) onto cloned elements
        const origElements = Array.from(element.querySelectorAll<HTMLElement>("*"));
        const clonedElements = Array.from(clonedElement.querySelectorAll<HTMLElement>("*"));

        origElements.forEach((origEl, i) => {
          const targetCloned = clonedElements[i];
          if (!targetCloned) return;

          try {
            const cs = window.getComputedStyle(origEl);
            if (cs.color && !cs.color.includes("oklch")) targetCloned.style.color = cs.color;
            if (cs.backgroundColor && !cs.backgroundColor.includes("oklch")) targetCloned.style.backgroundColor = cs.backgroundColor;
            if (cs.borderColor && !cs.borderColor.includes("oklch")) targetCloned.style.borderColor = cs.borderColor;
          } catch (e) {
            // Ignore cross-origin stylesheet compute errors if any
          }
        });
      },
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // Page 1
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pageHeight;

    // Additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
    }

    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  } catch (err) {
    console.error("PDF generation failed:", err);
    alert("Fehler bei der PDF-Erstellung. Bitte nutzen Sie alternativ die Drucken-Funktion (PDF speichern).");
  }
}
