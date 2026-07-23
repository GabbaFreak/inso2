import { useState, useEffect } from "react";
import { 
  Scale, 
  Landmark, 
  ShieldCheck, 
  Download, 
  AlertCircle, 
  Printer, 
  CheckCircle, 
  FileText, 
  Building, 
  MapPin, 
  Calendar,
  AlertTriangle,
  Info,
  Eye,
  X 
} from "lucide-react";
import { DebtItem } from "../types";
import { exportElementToPdf } from "../lib/pdfExport";
import { createDocxLogoHeader } from "../lib/logoData";
import { 
  Document as DocxDocument, 
  Packer as DocxPacker, 
  Paragraph as DocxParagraph, 
  TextRun as DocxTextRun, 
  Table as DocxTable, 
  TableRow as DocxTableRow, 
  TableCell as DocxTableCell, 
  WidthType as DocxWidthType,
  BorderStyle as DocxBorderStyle,
  ShadingType as DocxShadingType,
  AlignmentType as DocxAlignmentType
} from "docx";
import { jsPDF } from "jspdf";

export default function Scheiternsbescheinigung() {
  const [activeProfile, setActiveProfile] = useState<string>(() => {
    return localStorage.getItem("gesetzeslotse_active_profile") || "schmidt";
  });

  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [debtorName, setDebtorName] = useState("Maximilian Schmidt");
  const [debtorDob, setDebtorDob] = useState("15.03.1985");
  const [debtorPob, setDebtorPob] = useState("Berlin");
  const [debtorAddress, setDebtorAddress] = useState("Heidestraße 48, 10557 Berlin");

  // Certificate Parameters
  const [planSentDate, setPlanSentDate] = useState(() => {
    // Default to 1 month ago
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [failureDate, setFailureDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [failureReason, setFailureReason] = useState(
    "Der Schuldenbereinigungsplan wurde von mindestens einem Gläubiger ausdrücklich abgelehnt und/oder es wurden aktive Vollstreckungsmaßnahmen fortgeführt."
  );

  // Court & Internal Placeholders
  const [competentCourt, setCompetentCourt] = useState("Amtsgericht Wedding - Insolvenzgericht -");
  const [courtFileNumber, setCourtFileNumber] = useState(""); // Placeholder for court's Aktenzeichen
  const [advisorFileNumber, setAdvisorFileNumber] = useState("GL-2026-0815"); // Kanzlei AZ
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx">("pdf");
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  const handleExportMain = () => {
    if (exportFormat === "pdf") {
      handleDownloadPdf();
    } else {
      handleDownloadDocx();
    }
  };

  // Loader and Syncing
  const loadDebtsAndProfile = () => {
    const profile = localStorage.getItem("gesetzeslotse_active_profile") || "schmidt";
    setActiveProfile(profile);

    const storedDebtsKey = `gesetzeslotse_debts_portfolio_${profile}`;
    const storedDebts = localStorage.getItem(storedDebtsKey);
    if (storedDebts) {
      try {
        setDebts(JSON.parse(storedDebts));
      } catch (e) {
        console.error("Failed to parse debts", e);
      }
    } else {
      setDebts([]);
    }

    const storedName = localStorage.getItem("gesetzeslotse_active_debtor_name");
    const storedDob = localStorage.getItem("gesetzeslotse_active_debtor_dob");
    const storedPob = localStorage.getItem("gesetzeslotse_active_debtor_pob");
    const storedAddress = localStorage.getItem("gesetzeslotse_active_debtor_address");
    const storedCourt = localStorage.getItem("gesetzeslotse_active_debtor_court");

    if (storedName) {
      setDebtorName(storedName);
      setDebtorDob(storedDob || "");
      setDebtorPob(storedPob || "Berlin");
      setDebtorAddress(storedAddress || "");
      setCompetentCourt(storedCourt || "Amtsgericht Wedding - Insolvenzgericht -");
    } else {
      if (profile === "schmidt") {
        setDebtorName("Maximilian Schmidt");
        setDebtorDob("15.03.1985");
        setDebtorPob("Berlin");
        setDebtorAddress("Heidestraße 48, 10557 Berlin");
        setCompetentCourt("Amtsgericht Wedding - Insolvenzgericht -");
      } else {
        setDebtorName("Gabriele Weber");
        setDebtorDob("28.11.1972");
        setDebtorPob("Potsdam");
        setDebtorAddress("Karl-Marx-Str. 12, 12043 Berlin");
        setCompetentCourt("Amtsgericht Tempelhof-Kreuzberg - Insolvenzgericht -");
      }
    }
  };

  useEffect(() => {
    loadDebtsAndProfile();
    window.addEventListener("gesetzeslotse_profile_changed", loadDebtsAndProfile);
    window.addEventListener("gesetzeslotse_debts_updated", loadDebtsAndProfile);
    return () => {
      window.removeEventListener("gesetzeslotse_profile_changed", loadDebtsAndProfile);
      window.removeEventListener("gesetzeslotse_debts_updated", loadDebtsAndProfile);
    };
  }, []);

  const totalAmount = debts.reduce((sum, item) => sum + item.amount, 0);
  const failedDebts = debts.filter(d => d.status === "gescheitert");
  const failedCount = failedDebts.length;
  const isReadyToCertify = failedCount > 0;

  // Master data validation (Stammdaten-Validierung)
  const validationIssues: { field: string; message: string; severity: "error" | "warning" }[] = [];
  
  if (!debtorName || debtorName.trim() === "" || debtorName === "Unbeschrieben" || debtorName.toLowerCase().includes("neuer schuldner")) {
    validationIssues.push({
      field: "Schuldner-Name",
      message: "Der Name des Schuldners fehlt oder ist unvollständig.",
      severity: "error"
    });
  }
  
  if (!debtorDob || debtorDob.trim() === "" || debtorDob === "-" || debtorDob.length < 5) {
    validationIssues.push({
      field: "Geburtsdatum",
      message: "Das Geburtsdatum des Schuldners fehlt oder ist ungültig.",
      severity: "error"
    });
  } else if (debtorDob === "01.01.1980") {
    validationIssues.push({
      field: "Geburtsdatum",
      message: "Geburtsdatum hat den voreingestellten Standardwert (01.01.1980). Bitte prüfen Sie die Richtigkeit.",
      severity: "warning"
    });
  }
  
  if (!competentCourt || competentCourt.trim() === "" || competentCourt === "-") {
    validationIssues.push({
      field: "Insolvenzgericht",
      message: "Es wurde kein zuständiges Insolvenzgericht (Amtsgericht) ausgewählt.",
      severity: "error"
    });
  }

  if (!debtorAddress || debtorAddress.trim() === "" || debtorAddress.length < 8) {
    validationIssues.push({
      field: "Schuldner-Anschrift",
      message: "Die Anschrift des/der Schuldners/Schuldnerin ist unvollständig.",
      severity: "warning"
    });
  }

  // Render Competent Courts of Berlin list
  const berlinCourts = [
    "Amtsgericht Wedding - Insolvenzgericht -",
    "Amtsgericht Tempelhof-Kreuzberg - Insolvenzgericht -",
    "Amtsgericht Charlottenburg - Insolvenzgericht -",
    "Amtsgericht Schöneberg - Insolvenzgericht -",
    "Amtsgericht Lichtenberg - Insolvenzgericht -",
    "Amtsgericht Neukölln - Insolvenzgericht -",
    "Amtsgericht Spandau - Insolvenzgericht -",
    "Amtsgericht Köpenick - Insolvenzgericht -"
  ];

  // Word (DOCX) Scheiternsbescheinigung Export
  const handleDownloadDocx = async () => {
    try {
      const docChildren: any[] = [];
      
      // Logo Header
      docChildren.push(createDocxLogoHeader(220, 48));

      // Letterhead Metadata line
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "Gesetzeslotse BERLIN Kanzlei-Gemeinschaft • Staatlich anerkannte Stelle nach § 305 Abs. 1 Nr. 1 InsO • Alt-Moabit 90 D, 10559 Berlin",
              size: 16,
              color: "64748B",
            })
          ],
          alignment: DocxAlignmentType.CENTER,
          spacing: { after: 200 }
        })
      );

      // Kanzleireferenz Header Line
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: `Referenz: GLB-305/BE-${debtorName.substring(0,3).toUpperCase()}   |   Datum: ${new Date().toLocaleDateString("de-DE")}`,
              bold: true,
              size: 18,
              color: "475569",
            })
          ],
          alignment: DocxAlignmentType.RIGHT,
          spacing: { after: 150 }
        })
      );

      // Title headers
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "AMTLICHE BESCHEINIGUNG GEMÄSS § 305 ABS. 1 NR. 1 Inso",
              bold: true,
              size: 22,
              color: "991B1B",
            })
          ],
          alignment: DocxAlignmentType.CENTER,
          spacing: { before: 100, after: 60 }
        })
      );

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "BESCHEINIGUNG ÜBER DAS SCHEITERN DES AUSSERGERICHTLICHEN EINIGUNGSVERSUCHS",
              bold: true,
              size: 26,
              color: "0F172A",
            })
          ],
          alignment: DocxAlignmentType.CENTER,
          spacing: { after: 300 }
        })
      );

      // Common Table Borders
      const borderThin = { style: DocxBorderStyle.SINGLE, size: 4, color: "CBD5E1" };
      const tableBordersLight = {
        top: borderThin,
        bottom: borderThin,
        left: borderThin,
        right: borderThin,
        insideHorizontal: borderThin,
        insideVertical: borderThin,
      };

      // Court info & Parties Table
      docChildren.push(
        new DocxTable({
          width: { size: 100, type: DocxWidthType.PERCENTAGE },
          borders: tableBordersLight,
          rows: [
            // Header Row
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 100, type: DocxWidthType.PERCENTAGE },
                  columnSpan: 2,
                  shading: { fill: "1E293B" },
                  margins: { top: 100, bottom: 100, left: 140, right: 140 },
                  children: [
                    new DocxParagraph({
                      children: [
                        new DocxTextRun({
                          text: "1. ZUSTÄNDIGES INSOLVENZGERICHT & AKTENZEICHEN",
                          bold: true,
                          size: 19,
                          color: "FFFFFF",
                        })
                      ]
                    })
                  ]
                })
              ]
            }),
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 35, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Insolvenzgericht:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 65, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: competentCourt, bold: true, size: 18, color: "0F172A" })] })]
                }),
              ]
            }),
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 35, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Gerichts-Gst. / AZ:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 65, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: courtFileNumber || "Nicht angegeben (Erst-Insolvenzantrag)", size: 18, color: "334155" })] })]
                }),
              ]
            }),

            // Section 2 Header
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 100, type: DocxWidthType.PERCENTAGE },
                  columnSpan: 2,
                  shading: { fill: "1E293B" },
                  margins: { top: 100, bottom: 100, left: 140, right: 140 },
                  children: [
                    new DocxParagraph({
                      children: [
                        new DocxTextRun({
                          text: "2. PERSONALANGABEN ZUM SCHULDNER (MANDANT)",
                          bold: true,
                          size: 19,
                          color: "FFFFFF",
                        })
                      ]
                    })
                  ]
                })
              ]
            }),
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 35, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Name, Vorname:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 65, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: debtorName, bold: true, size: 18, color: "0F172A" })] })]
                }),
              ]
            }),
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 35, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Geburtsdatum / Ort:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 65, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: `${debtorDob} in ${debtorPob}`, size: 18, color: "334155" })] })]
                }),
              ]
            }),
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 35, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Gemeldete Anschrift:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 65, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: debtorAddress, size: 18, color: "334155" })] })]
                }),
              ]
            }),

            // Section 3 Header
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 100, type: DocxWidthType.PERCENTAGE },
                  columnSpan: 2,
                  shading: { fill: "1E293B" },
                  margins: { top: 100, bottom: 100, left: 140, right: 140 },
                  children: [
                    new DocxParagraph({
                      children: [
                        new DocxTextRun({
                          text: "3. BESCHEINIGENDE STELLE (NACH § 305 ABS. 1 NR. 1 InsO)",
                          bold: true,
                          size: 19,
                          color: "FFFFFF",
                        })
                      ]
                    })
                  ]
                })
              ]
            }),
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 35, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Anerkannte Stelle:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 65, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Gesetzeslotse BERLIN Kanzlei-Gemeinschaft", bold: true, size: 18, color: "0F172A" })] })]
                }),
              ]
            }),
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 35, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Akkreditierung:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 65, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Geeignete Stelle zur Insolvenzberatung gem. § 305 Abs. 1 Nr. 1 InsO", size: 18, color: "334155" })] })]
                }),
              ]
            }),
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 35, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Kanzlei-Aktenzeichen:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 65, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: `GLB-305/BE-${debtorName.substring(0,3).toUpperCase()}`, size: 18, color: "334155" })] })]
                }),
              ]
            }),
          ]
        })
      );

      docChildren.push(new DocxParagraph({ text: "", spacing: { after: 180 } }));

      // Section C: Official Statement box
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "4. ERKLÄRUNG ÜBER DAS SCHEITERN DES AUSSERGERICHTLICHEN EINIGUNGSVERSUCHS:",
              bold: true,
              size: 19,
              color: "0F172A",
            })
          ],
          spacing: { after: 60 }
        })
      );

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: `Es wird hiermit nach § 305 Abs. 1 Nr. 1 Insolvenzordnung (InsO) bescheinigt, dass auf der Grundlage persönlicher Beratung und eingehender Prüfung der Einkommens- und Vermögensverhältnisse des Schuldners ein außergerichtlicher Einigungsversuch zur Schuldenbereinigung mit allen bekannten Gläubigern auf Basis eines ausgearbeiteten Schuldenbereinigungsplans durchgeführt worden ist.\n\n` +
                `Dieser außergerichtliche Einigungsversuch ist endgültig gescheitert am: ${new Date(failureDate).toLocaleDateString("de-DE")}.\n\n` +
                `Wesentlicher Grund für das Scheitern des Schuldenbereinigungsplans:\n` +
                `• ${failureReason}`,
              size: 18,
              color: "1E293B",
            })
          ],
          spacing: { after: 160 }
        })
      );

      // Section D: Creditor stats card
      docChildren.push(
        new DocxTable({
          width: { size: 100, type: DocxWidthType.PERCENTAGE },
          borders: tableBordersLight,
          rows: [
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 100, type: DocxWidthType.PERCENTAGE },
                  columnSpan: 2,
                  shading: { fill: "1E293B" },
                  margins: { top: 100, bottom: 100, left: 140, right: 140 },
                  children: [
                    new DocxParagraph({
                      children: [
                        new DocxTextRun({
                          text: "5. STATISTIK DER BETEILIGTEN GLÄUBIGER & FORDERUNGEN",
                          bold: true,
                          size: 19,
                          color: "FFFFFF",
                        })
                      ]
                    })
                  ]
                })
              ]
            }),
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 50, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Anzahl einbezogener Gläubiger:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 50, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: `${debts.length} Gläubiger-Positionen`, size: 18, color: "0F172A" })] })]
                }),
              ]
            }),
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 50, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Gesamte geprüfte Forderungssumme:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 50, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: `EUR ${totalAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`, bold: true, size: 18, color: "991B1B" })] })]
                }),
              ]
            }),
          ]
        })
      );

      docChildren.push(new DocxParagraph({ text: "", spacing: { after: 300 } }));

      // Signatures 2-column table
      const borderNone = { style: DocxBorderStyle.NONE };
      const tableBordersNone = {
        top: borderNone,
        bottom: borderNone,
        left: borderNone,
        right: borderNone,
        insideHorizontal: borderNone,
        insideVertical: borderNone,
      };

      docChildren.push(
        new DocxTable({
          width: { size: 100, type: DocxWidthType.PERCENTAGE },
          borders: tableBordersNone,
          rows: [
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 50, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 100, bottom: 100, left: 100, right: 100 },
                  children: [
                    new DocxParagraph({ children: [new DocxTextRun({ text: `Berlin, den ${new Date().toLocaleDateString("de-DE")}`, size: 18, color: "475569" })] }),
                    new DocxParagraph({ text: "", spacing: { after: 200 } }),
                    new DocxParagraph({ children: [new DocxTextRun({ text: "_______________________________________", color: "CBD5E1" })] }),
                    new DocxParagraph({ children: [new DocxTextRun({ text: `Unterschrift des Schuldners (${debtorName})`, bold: true, size: 18, color: "0F172A" })] })
                  ]
                }),
                new DocxTableCell({
                  width: { size: 50, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 100, bottom: 100, left: 100, right: 100 },
                  children: [
                    new DocxParagraph({ children: [new DocxTextRun({ text: `Berlin, den ${new Date().toLocaleDateString("de-DE")}`, size: 18, color: "475569" })] }),
                    new DocxParagraph({ text: "", spacing: { after: 200 } }),
                    new DocxParagraph({ children: [new DocxTextRun({ text: "_______________________________________", color: "CBD5E1" })] }),
                    new DocxParagraph({ children: [new DocxTextRun({ text: "Stempel & amtliche Unterschrift der Stelle", bold: true, size: 18, color: "0F172A" })] }),
                    new DocxParagraph({ children: [new DocxTextRun({ text: "Gesetzeslotse BERLIN Kanzlei-Gemeinschaft", size: 16, color: "64748B" })] })
                  ]
                }),
              ]
            })
          ]
        })
      );

      const doc = new DocxDocument({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1000,
                  bottom: 1000,
                  left: 1000,
                  right: 1000,
                }
              }
            },
            children: docChildren,
          }
        ]
      });

      const blob = await DocxPacker.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Paragraph_305_Scheiternsbescheinigung_${debtorName.replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Fehler beim Erzeugen der Scheiternsbescheinigung als Word-Dokument.");
    }
  };

  const handleDownloadPdf = async () => {
    try {
      if (!showPrintModal) {
        setShowPrintModal(true);
        await new Promise((r) => setTimeout(r, 150));
      }

      const fileName = `Paragraph_305_Scheiternsbescheinigung_${debtorName.replace(/\s+/g, "_")}.pdf`;
      await exportElementToPdf("printable-scheiternsbescheinigung-container", fileName);
    } catch (e) {
      console.error(e);
      alert("Fehler beim Exportieren der Scheiternsbescheinigung als PDF.");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-205 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900" id="scheiternsbescheinigung-root">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="h-7 w-7 rounded-lg bg-red-100 text-red-800 dark:bg-red-950/65 dark:text-red-400 flex items-center justify-center">
            <Scale className="h-4 w-4" />
          </div>
          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
            Automatische § 305 Abs. 1 Nr. 1 InsO Scheiternsbescheinigung
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Dieses Kanzlei-Modul prüft die eingetragenen Verhandlungsergebnisse im Gläubigerverzeichnis und erstellt daraus vollautomatisch die rechtssichere Scheiternsbescheinigung für den Insolvenzantrag Ihres Mandanten beim Amtsgericht.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Left column: Parameters & controls */}
        <div className="md:col-span-5 space-y-4">
          
          <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/20 space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
              <Building className="h-4 w-4 text-slate-500" />
              1. Insolvenzgericht & Platzhalter
            </h3>

            <div>
              <label className="text-[10px] text-slate-450 uppercase block mb-1">ZUSTÄNDIGES AMTSGERICHT (BERLIN)</label>
              <select
                value={competentCourt}
                onChange={(e) => setCompetentCourt(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                {berlinCourts.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[10px] text-slate-450 uppercase block mb-1">GERICHTS-GESCHÄFTSNUMMER</label>
                <input
                  type="text"
                  value={courtFileNumber}
                  onChange={(e) => setCourtFileNumber(e.target.value)}
                  placeholder="ZPO / Gst. Leerstelle"
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-450 uppercase block mb-1">AKTENZEICHEN BERATER</label>
                <input
                  type="text"
                  value={advisorFileNumber}
                  onChange={(e) => setAdvisorFileNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/20 space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
              <Calendar className="h-4 w-4 text-slate-500" />
              2. Verfahrensverlauf & Stichtage
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[10px] text-slate-450 uppercase block mb-1">BEGINN EINIGUNGSVERSUCH</label>
                <input
                  type="date"
                  value={planSentDate}
                  onChange={(e) => setPlanSentDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-450 uppercase block mb-1">STICHTAG DES SCHEITERNS</label>
                <input
                  type="date"
                  value={failureDate}
                  onChange={(e) => setFailureDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-450 uppercase block mb-1">HAUPTGRUND DES SCHEITERNS</label>
              <textarea
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 leading-normal"
              />
            </div>
          </div>

          {/* Master-Data Stammdaten-Validierung (Pflichtangaben) */}
          <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/20 space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-slate-500" />
                3. Stammdaten-Validierung
              </span>
              {validationIssues.length === 0 ? (
                <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">Korrekt</span>
              ) : validationIssues.some(i => i.severity === "error") ? (
                <span className="text-[9px] bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">Unvollständig</span>
              ) : (
                <span className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">Hinweis</span>
              )}
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold select-none">
              <div className={`p-2 rounded-lg border ${
                !debtorName || debtorName.trim() === "" || debtorName === "Unbeschrieben" || debtorName.toLowerCase().includes("neuer schuldner")
                  ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400" 
                  : "bg-emerald-50 border-emerald-250 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400"
              }`}>
                Name: {` `}
                {!debtorName || debtorName.trim() === "" || debtorName === "Unbeschrieben" || debtorName.toLowerCase().includes("neuer schuldner")
                  ? "❌ Fehlt"
                  : "✅ OK"
                }
              </div>
              <div className={`p-2 rounded-lg border ${
                !debtorDob || debtorDob.trim() === "" || debtorDob === "-" || debtorDob.length < 5
                  ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400"
                  : debtorDob === "01.01.1980"
                  ? "bg-amber-50 border-amber-250 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400"
                  : "bg-emerald-50 border-emerald-250 text-emerald-705 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400"
              }`}>
                Geburtsdatum: {` `}
                {!debtorDob || debtorDob.trim() === "" || debtorDob === "-" || debtorDob.length < 5
                  ? "❌ Fehlt"
                  : debtorDob === "01.01.1980"
                  ? "⚠️ Standard"
                  : "✅ OK"
                }
              </div>
              <div className={`p-2 rounded-lg border ${
                !competentCourt || competentCourt.trim() === "" || competentCourt === "-"
                  ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400"
                  : "bg-emerald-50 border-emerald-250 text-emerald-705 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400"
              }`}>
                Gericht: {` `}
                {!competentCourt || competentCourt.trim() === "" || competentCourt === "-"
                  ? "❌ Fehlt"
                  : "✅ OK"
                }
              </div>
            </div>

            {validationIssues.length > 0 && (
              <div className="space-y-1.5 text-xs bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Erkannte Unstimmigkeiten:</span>
                {validationIssues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[11px] leading-relaxed">
                    {issue.severity === "error" ? (
                      <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{issue.field}:</span>{" "}
                      <span className="text-slate-600 dark:text-slate-350">{issue.message}</span>
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-slate-400 dark:text-slate-550 italic pt-2 text-center border-t border-slate-50 dark:border-slate-800/60 mt-1 select-none">
                  💡 Tipp: Stammdaten können in Schritt 1 (Mandanten-Profil) abgeändert werden.
                </p>
              </div>
            )}
          </div>

          {/* Validation indicators */}
          <div className="p-4 rounded-xl border bg-slate-50/20 dark:bg-slate-950/10 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest block">Insolvenzrechtliche Prüfung:</h4>
            
            <div className="flex items-start gap-2 text-xs text-slate-650 dark:text-slate-350 bg-white p-3 rounded-xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
              {isReadyToCertify ? (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">Teilscheitern dokumentiert</span>
                    Es sind bereits <b>{failedCount} von {debts.length} Gläubigern</b> lückenlos als "Gescheitert" im Gläubigerverzeichnis hinterlegt. Die Bescheinigung kann gemäß § 305 InsO rechtskräftig ausgestellt werden.
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="font-bold text-amber-700 dark:text-amber-400 block mb-0.5">Keine gescheiterten Versuche dokumentiert</span>
                    Um eine Bescheinigung ausstellen zu können, muss im <b>Gläubigerverzeichnis (Step 1)</b> mindestens ein Gläubiger den Status <b>"Gescheitert"</b> besitzen. Bitte markieren Sie unkooperative oder ablehnende Gläubiger mit dem neuen Filter!
                  </div>
                </>
              )}
            </div>

            {/* Format selection & Export controls */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Exportformat wählen:</span>
                <div className="inline-flex p-1 bg-slate-200 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setExportFormat("pdf")}
                    className={`px-3 py-1 text-xs font-black rounded transition-all cursor-pointer ${
                      exportFormat === "pdf"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat("docx")}
                    className={`px-3 py-1 text-xs font-black rounded transition-all cursor-pointer ${
                      exportFormat === "docx"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    DOCX
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  disabled={!isReadyToCertify}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                    isReadyToCertify 
                      ? "bg-slate-800 hover:bg-slate-900 text-white border border-slate-700" 
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  <Eye className="h-4 w-4 text-amber-400" />
                  <span>Vorschau & Drucken</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportMain}
                  disabled={!isReadyToCertify}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                    isReadyToCertify 
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700" 
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  <Download className="h-4 w-4 text-amber-300" />
                  <span>Bescheinigung ({exportFormat.toUpperCase()})</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right column: Form live-preview on screen */}
        <div className="md:col-span-7">
          <div className="sticky top-4">
            <span className="text-[10px] text-slate-450 uppercase tracking-widest font-bold block mb-2 text-center select-none">Live-Entwurf: Amtliche Bescheinigung (§ 305 InsO)</span>
            
            <div className="border-2 border-slate-350 bg-white text-slate-950 p-6 font-sans space-y-4 rounded-xl shadow-md leading-relaxed text-[10px] selection:bg-slate-300">
              
              {/* Header Box */}
              <div className="text-center font-sans">
                <span className="text-lg font-black uppercase tracking-widest text-slate-950 block">B E S C H E I N I G U N G</span>
                <span className="text-[10px] font-bold block mt-1">nach § 305 Abs. 1 Nr. 1 InsO über das erfolglose Scheitern des außergerichtlichen Einigungsversuchs</span>
                
                <div className="border border-slate-950 mt-3 grid grid-cols-12 text-left">
                  <div className="col-span-7 p-2 border-r border-slate-950 space-y-1">
                    <p className="font-extrabold uppercase text-[7.5px] text-slate-600 block mb-1">Zuständiges Insolvenzgericht (Amtsgericht):</p>
                    <p className="font-bold underline">{competentCourt}</p>
                    <p className="text-[7.5px] opacity-65 pt-2">Schuldnerberater AZ: {advisorFileNumber}</p>
                  </div>
                  <div className="col-span-5 p-2 space-y-1">
                    <p className="font-extrabold uppercase text-[7.5px] text-slate-600 block mb-1">Geschäftszeichen Amtsgericht:</p>
                    <p className="font-mono text-slate-400 italic">
                      {courtFileNumber ? courtFileNumber : "(wird vom Gericht vergeben)"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Schuldner Person */}
              <div className="border border-slate-950">
                <div className="bg-slate-100 p-1.5 font-bold border-b border-slate-950 text-[9px]">
                  I. Angaben zum Schuldner / zur Schuldnerin (§ 305 InsO)
                </div>
                <div className="p-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  <p><b>Name, Vorname:</b> <span className="underline">{debtorName}</span></p>
                  <p><b>Geburtsdatum:</b> <span className="underline">{debtorDob}</span></p>
                  <p><b>Geburtsort:</b> <span className="underline">{debtorPob}</span></p>
                  <p className="col-span-2"><b>Aktuelle Anschrift des Schuldners:</b> <span className="underline">{debtorAddress}</span></p>
                </div>
              </div>

              {/* Bescheinigende Stelle */}
              <div className="border border-slate-950">
                <div className="bg-slate-100 p-1.5 font-bold border-b border-slate-950 text-[9px]">
                  II. Angaben zum anerkannten Aussteller
                </div>
                <div className="p-2 space-y-1">
                  <p><b>Stelle:</b> Gesetzeslotse BERLIN Schuldnerberatung c/o Kanzlei</p>
                  <p><b>Anerkennung:</b> Staatlich akkreditiert gemäß § 305 Abs. 1 Nr. 1 InsO (Senatsverwaltung Justiz u. VbSchutz Berlin, AZ: IV B 3-345/09)</p>
                  <p><b>Anschrift:</b> Alt-Moabit 90 D, 10559 Berlin</p>
                </div>
              </div>

              {/* Scheitern Statement */}
              <div className="border border-slate-950">
                <div className="bg-slate-100 p-1.5 font-bold border-b border-slate-950 text-[9px]">
                  III. Formelle Bestätigung des Scheiterns gemäß § 305 Abs. 1 Nr. 1 InsO
                </div>
                <div className="p-2.5 space-y-1.5 leading-relaxed text-[9px]">
                  <p>
                    Hiermit wird durch den bevollmächtigten Aussteller amtlich bestätigt, dass am <b>{new Date(planSentDate).toLocaleDateString("de-DE")}</b> ein schriftlicher Schuldenbereinigungsplan unterbreitet wurde, welcher alle fälligen Ansprüche aller Gläubiger berücksichtigte.
                  </p>
                  <p>
                    Dieser Einigungsversuch ist mit Ablauf des <b>{new Date(failureDate).toLocaleDateString("de-DE")}</b> endgültig gescheitert.
                  </p>
                  <p className="font-extrabold pb-0.5">Maßgeblicher Grund des Scheiterns:</p>
                  <p className="p-2 bg-slate-50 border border-slate-300 rounded italic font-mono text-[8px] text-slate-800">
                    "{failureReason}"
                  </p>
                  <p className="pt-1.5">
                    <b>Beteiligte Gläubiger:</b> Insgesamt wurden {debts.length} Gläubiger mit einer Gesamtforderungshöhe von <b>{totalAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR</b> in den Prozess einbezogen. Eine detaillierte Übersicht aller Posten und Einzelstatus ist als <b>Anlage 1</b> lückenlos angefügt.
                  </p>
                </div>
              </div>

              {/* Signatures preview block */}
              <div className="grid grid-cols-2 gap-4 pt-4 text-[8.5px] text-slate-600 border-t border-slate-300">
                <div>
                  <p className="font-mono"><b>Berlin, den {new Date().toLocaleDateString("de-DE")}</b></p>
                  <div className="border-b border-slate-950 h-5 mt-1"></div>
                  <p className="mt-1 text-[7px]">Ort, Datum der Kanzleiausstellung</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">Gesetzeslotse BERLIN e.V.</p>
                  <div className="border-b border-slate-950 h-5 mt-1"></div>
                  <p className="mt-1 text-[7px]">Unterschrift & Siegel des Schuldnerberaters</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Print Preview Modal for Scheiternsbescheinigung */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 no-print">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Druckansicht — Bescheinigung über das Scheitern (§ 305 InsO)
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="inline-flex p-1 bg-slate-800 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setExportFormat("pdf")}
                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded ${
                      exportFormat === "pdf" ? "bg-rose-600 text-white" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat("docx")}
                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded ${
                      exportFormat === "docx" ? "bg-blue-600 text-white" : "text-slate-300 hover:text-white"
                    }`}
                  >
                    DOCX
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Drucken</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportMain}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Speichern ({exportFormat.toUpperCase()})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Printable § 305 Bescheinigung Document */}
            <div className="p-8 overflow-y-auto bg-slate-200 dark:bg-slate-950 flex justify-center py-10">
              <div id="printable-scheiternsbescheinigung-container" className="printable-area bg-white text-slate-900 p-8 sm:p-10 shadow-2xl rounded border border-slate-300 w-full max-w-[210mm] font-serif leading-relaxed text-xs space-y-3.5 relative pb-10">
                
                {/* Print Running Header */}
                <div className="hidden print-page-header text-[9px] font-sans text-slate-600">
                  <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="Gesetzeslotse Berlin" className="h-5 w-auto object-contain shrink-0" />
                    <span className="font-bold text-slate-900 uppercase">§ 305 Abs. 1 Nr. 1 InsO Bescheinigung</span>
                  </div>
                  <div className="font-mono text-slate-500">
                    Kanzlei-AZ: {advisorFileNumber}
                  </div>
                </div>

                {/* Print Running Footer */}
                <div className="hidden print-page-footer text-[9px] font-sans text-slate-500">
                  <span>GESETZESLOTSE BERLIN e.V. • Amtliche Bescheinigung (§ 305 InsO)</span>
                  <span className="print-page-number"></span>
                </div>

                {/* Document Header with Logo & Court Info */}
                <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-center font-sans">
                  <div className="flex items-center gap-4">
                    <img src="/logo.png" alt="Gesetzeslotse Berlin Logo" className="h-10 sm:h-12 w-auto object-contain shrink-0 max-w-none" />
                  </div>
                  <div className="text-right text-[10px] text-slate-700">
                    <p className="font-bold uppercase text-slate-900">{competentCourt}</p>
                    <p className="text-slate-500 font-mono">
                      Gerichts-Gst.: {courtFileNumber || "Unbekannt"} • Kanzlei-AZ: {advisorFileNumber}
                    </p>
                  </div>
                </div>

                <div className="text-center py-2 font-sans">
                  <h1 className="text-base font-black uppercase tracking-tight text-slate-900">
                    BESCHEINIGUNG GEMÄSS § 305 ABS. 1 NR. 1 Inso
                  </h1>
                  <p className="text-[11px] font-bold text-slate-700">über das Erfolglosbleiben des außergerichtlichen Einigungsversuchs</p>
                </div>

                {/* Section 1: Anerkannte Stelle */}
                <div className="space-y-1 font-sans border-t border-slate-200 pt-3">
                  <h3 className="font-bold text-xs uppercase text-slate-900">1. Ausstellende geeignete Stelle (§ 305 Abs. 1 Nr. 1 InsO)</h3>
                  <p className="text-xs"><b>Gesetzeslotse BERLIN e.V.</b> — Anerkannte Schuldner- und Verbraucherinsolvenzberatung (Alt-Moabit 90 D, 10559 Berlin)</p>
                </div>

                {/* Section 2: Schuldner */}
                <div className="space-y-1 font-sans border-t border-slate-200 pt-3">
                  <h3 className="font-bold text-xs uppercase text-slate-900">2. Angaben zum Schuldner / Mandanten</h3>
                  <div className="grid grid-cols-2 gap-x-4 text-xs">
                    <p><b>Name, Vorname:</b> {debtorName}</p>
                    <p><b>Geburtsdatum:</b> {debtorDob}</p>
                    <p className="col-span-2"><b>Anschrift:</b> {debtorAddress}</p>
                  </div>
                </div>

                {/* Section 3: Erfolgloser Einigungsversuch */}
                <div className="space-y-2 font-sans border-t border-slate-200 pt-3">
                  <h3 className="font-bold text-xs uppercase text-slate-900">3. Feststellung des Scheiterns</h3>
                  <p className="text-xs leading-relaxed">
                    Es wird hiermit amtlich bescheinigt, dass ein auf der Grundlage persönlicher Beratung und eingehender Prüfung der Vermögensverhältnisse des Schuldners durchgeführter außergerichtlicher Einigungsversuch zur Bereinigung der Schulden auf Basis eines Schuldenbereinigungsplans (Paragraph 305 Absatz 1 Nummer 1 InsO) erfolglos geblieben ist.
                  </p>
                  <p className="text-xs"><b>Datum des Scheiterns:</b> {new Date(failureDate).toLocaleDateString("de-DE")}</p>
                  <div className="p-3 bg-slate-50 border border-slate-300 rounded text-xs space-y-1">
                    <p className="font-bold">Grund des Scheiterns:</p>
                    <p className="italic">{failureReason}</p>
                  </div>
                </div>

                {/* Section 4: Parteien */}
                <div className="space-y-1 font-sans border-t border-slate-200 pt-3">
                  <h3 className="font-bold text-xs uppercase text-slate-900">4. Einbezogene Gläubiger</h3>
                  <p className="text-xs">Insgesamt wurden <b>{debts.length} Gläubiger</b> mit einer Gesamtforderungssumme von <b>EUR {totalAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })}</b> in den Prozess einbezogen. Gescheiterte Dokumentationen: <b>{failedCount} Gläubigerpositionen</b>.</p>
                </div>

                {/* Signatures */}
                <div className="pt-4 border-t border-slate-300 font-sans">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs font-bold">Berlin, den {new Date().toLocaleDateString("de-DE")}</p>
                      <div className="border-b border-slate-900 w-52 h-6"></div>
                      <p className="text-[10px] text-slate-500 pt-1">Ort, Datum der Kanzleiausstellung</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold">Gesetzeslotse BERLIN e.V.</p>
                      <div className="border-b border-slate-900 w-52 h-6"></div>
                      <p className="text-[10px] text-slate-500 pt-1">Unterschrift & Siegel der anerkannten Stelle</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
