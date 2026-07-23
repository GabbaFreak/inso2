import { useState, useEffect } from "react";
import { 
  Briefcase, 
  Coins, 
  Scale, 
  Percent, 
  Printer, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Grid,
  FileCheck,
  Lock,
  ChevronRight,
  TrendingDown,
  Building,
  User,
  Activity,
  Layers,
  X
} from "lucide-react";
import { DebtItem } from "../types";
import { createDocxLogoHeader } from "../lib/logoData";
import { exportElementToPdf } from "../lib/pdfExport";
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

export default function Schuldenbereinigungsplan() {
  const [activeProfile, setActiveProfile] = useState<string>(() => {
    return localStorage.getItem("gesetzeslotse_active_profile") || "schmidt";
  });

  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [debtorName, setDebtorName] = useState("Maximilian Schmidt");
  const [debtorDob, setDebtorDob] = useState("");
  const [debtorAddress, setDebtorAddress] = useState("");
  const [competentCourt, setCompetentCourt] = useState("");

  // Plan configuration states
  const [planType, setPlanType] = useState<"nullplan" | "rate" | "einmal">("rate");
  const [monthlyInstallment, setMonthlyInstallment] = useState<number>(100);
  const [planDurationMonths, setPlanDurationMonths] = useState<number>(36);
  const [oneTimeFund, setOneTimeFund] = useState<number>(2500);
  const [planSentDate, setPlanSentDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Creditor feedback states: Map debtor ID to response type: "offen" | "zustimmung" | "ablehnung"
  const [feedback, setFeedback] = useState<Record<string, "offen" | "zustimmung" | "ablehnung">>({});

  const [notification, setNotification] = useState("");
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  const handleExportPdf = async () => {
    await exportElementToPdf("printable-schuldenbereinigungsplan-container", `Schuldenbereinigungsplan_305_InsO_${debtorName.replace(/\s+/g, "_")}`);
  };

  const loadProfileAndDebts = () => {
    const profile = localStorage.getItem("gesetzeslotse_active_profile") || "schmidt";
    setActiveProfile(profile);

    const storedDebtsKey = `gesetzeslotse_debts_portfolio_${profile}`;
    const storedDebts = localStorage.getItem(storedDebtsKey);
    if (storedDebts) {
      try {
        const parsed = JSON.parse(storedDebts) as DebtItem[];
        setDebts(parsed);
        
        // Load existing feedback if stored, or initialize
        const feedbackKey = `gesetzeslotse_feedback_${profile}`;
        const storedFeedback = localStorage.getItem(feedbackKey);
        if (storedFeedback) {
          setFeedback(JSON.parse(storedFeedback));
        } else {
          // Initialize from debt item statuses or defaut "offen"
          const initialFeedback: Record<string, "offen" | "zustimmung" | "ablehnung"> = {};
          parsed.forEach(d => {
            if (d.status === "gescheitert") {
              initialFeedback[d.id] = "ablehnung";
            } else if (d.status === "ratenzahlung" || d.status === "verhandlung") {
              initialFeedback[d.id] = "zustimmung";
            } else {
              initialFeedback[d.id] = "offen";
            }
          });
          setFeedback(initialFeedback);
        }
      } catch (e) {
        console.error("Failed to parse debts", e);
      }
    } else {
      setDebts([]);
      setFeedback({});
    }

    const storedName = localStorage.getItem("gesetzeslotse_active_debtor_name");
    const storedDob = localStorage.getItem("gesetzeslotse_active_debtor_dob");
    const storedAddress = localStorage.getItem("gesetzeslotse_active_debtor_address");
    const storedCourt = localStorage.getItem("gesetzeslotse_active_debtor_court");

    if (storedName) {
      setDebtorName(storedName);
      setDebtorDob(storedDob || "");
      setDebtorAddress(storedAddress || "");
      setCompetentCourt(storedCourt || "Amtsgericht Wedding");
    } else {
      if (profile === "schmidt") {
        setDebtorName("Maximilian Schmidt");
        setDebtorDob("15.03.1985");
        setDebtorAddress("Heidestraße 48, 10557 Berlin");
        setCompetentCourt("Amtsgericht Wedding - Insolvenzgericht -");
      } else {
        setDebtorName("Gabriele Weber");
        setDebtorDob("28.11.1972");
        setDebtorAddress("Karl-Marx-Str. 12, 12043 Berlin");
        setCompetentCourt("Amtsgericht Tempelhof-Kreuzberg - Insolvenzgericht -");
      }
    }
  };

  useEffect(() => {
    loadProfileAndDebts();
    window.addEventListener("gesetzeslotse_profile_changed", loadProfileAndDebts);
    window.addEventListener("gesetzeslotse_debts_updated", loadProfileAndDebts);
    return () => {
      window.removeEventListener("gesetzeslotse_profile_changed", loadProfileAndDebts);
      window.removeEventListener("gesetzeslotse_debts_updated", loadProfileAndDebts);
    };
  }, []);

  // Save changes to feedback
  const updateFeedback = (debtId: string, status: "offen" | "zustimmung" | "ablehnung") => {
    const nextFeedback = { ...feedback, [debtId]: status };
    setFeedback(nextFeedback);
    localStorage.setItem(`gesetzeslotse_feedback_${activeProfile}`, JSON.stringify(nextFeedback));

    // Also sync back to the underlying debt statuses in local storage so other tabs reflect failure/agreement!
    const key = `gesetzeslotse_debts_portfolio_${activeProfile}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DebtItem[];
        const updated = parsed.map(d => {
          if (d.id === debtId) {
            let nextStatus = d.status;
            if (status === "ablehnung") nextStatus = "gescheitert";
            else if (status === "zustimmung") nextStatus = "ratenzahlung";
            else nextStatus = "offen";
            return { ...d, status: nextStatus };
          }
          return d;
        });
        localStorage.setItem(key, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("gesetzeslotse_debts_updated"));
      } catch (err) {
        console.error("Error syncing debt status", err);
      }
    }
  };

  // Bulk set feedback states
  const bulkSetFeedback = (status: "offen" | "zustimmung" | "ablehnung") => {
    const nextFeedback: Record<string, "offen" | "zustimmung" | "ablehnung"> = {};
    debts.forEach(d => {
      nextFeedback[d.id] = status;
    });
    setFeedback(nextFeedback);
    localStorage.setItem(`gesetzeslotse_feedback_${activeProfile}`, JSON.stringify(nextFeedback));

    // Sync to actual list
    const key = `gesetzeslotse_debts_portfolio_${activeProfile}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DebtItem[];
        const updated = parsed.map(d => {
          let nextStatus = d.status;
          if (status === "ablehnung") nextStatus = "gescheitert";
          else if (status === "zustimmung") nextStatus = "ratenzahlung";
          else nextStatus = "offen";
          return { ...d, status: nextStatus };
        });
        localStorage.setItem(key, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("gesetzeslotse_debts_updated"));
        setNotification("Status aller Gläubigerergebnisse erfolgreich angepasst.");
        setTimeout(() => setNotification(""), 4000);
      } catch (err) {
        console.error("Error bulk setting", err);
      }
    }
  };

  // Sync from identified collection offers (where offers is defined)
  const syncFromOffers = () => {
    const nextFeedback = { ...feedback };
    let matchingOffersCount = 0;

    debts.forEach(d => {
      if (d.offers && d.offers.length > 0) {
        // Creditor has an offer, set status to approved ("zustimmung")
        nextFeedback[d.id] = "zustimmung";
        matchingOffersCount++;
      }
    });

    if (matchingOffersCount === 0) {
      setNotification("Lukas-Abgleich: Keine gütlichen Inkasso-Angebote oder Rabattzusagen im Bestand vorhanden.");
      setTimeout(() => setNotification(""), 5000);
      return;
    }

    setFeedback(nextFeedback);
    localStorage.setItem(`gesetzeslotse_feedback_${activeProfile}`, JSON.stringify(nextFeedback));

    // Sync to debt entities
    const key = `gesetzeslotse_debts_portfolio_${activeProfile}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DebtItem[];
        const updated = parsed.map(d => {
          if (d.offers && d.offers.length > 0) {
            return { ...d, status: "ratenzahlung" as const };
          }
          return d;
        });
        localStorage.setItem(key, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("gesetzeslotse_debts_updated"));
        setNotification(`Abgleich erfolgreich! ${matchingOffersCount} gütliche Rabattangebote wurden im Tilgungsplan als zugestimmt hinterlegt.`);
        setTimeout(() => setNotification(""), 6000);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Calculations
  const activeDebtsCount = debts.length;
  const totalDebtSum = debts.reduce((sum, item) => sum + item.amount, 0);

  // Group debts by unique creditor name for distribution analysis
  const creditorGroups = debts.reduce((acc, debt) => {
    const name = debt.creditorName ? debt.creditorName.trim() : "Unbekannter Gläubiger";
    if (!acc[name]) {
      acc[name] = { name, total: 0, itemsCount: 0 };
    }
    acc[name].total += debt.amount;
    acc[name].itemsCount += 1;
    return acc;
  }, {} as Record<string, { name: string; total: number; itemsCount: number }>);

  const creditorDistribution = (Object.values(creditorGroups) as Array<{ name: string; total: number; itemsCount: number }>)
    .sort((a, b) => b.total - a.total);

  const largestCreditor = creditorDistribution[0] || null;

  // Total funds to distribute
  const planTotalProposedBudget = planType === "nullplan" 
    ? 0 
    : planType === "rate" 
      ? monthlyInstallment * planDurationMonths 
      : oneTimeFund;

  const averageReductionPercentage = totalDebtSum > 0 
    ? 100 - (planTotalProposedBudget / totalDebtSum) * 100 
    : 100;

  const averageQuotaPercent = totalDebtSum > 0 
    ? (planTotalProposedBudget / totalDebtSum) * 100 
    : 0;

  const proRataDetails = debts.map(d => {
    const quota = totalDebtSum > 0 ? (d.amount / totalDebtSum) * 100 : 0;
    const proposedTotal = (quota / 100) * planTotalProposedBudget;
    const monthlyRate = planType === "rate" && planDurationMonths > 0 ? proposedTotal / planDurationMonths : 0;
    return {
      id: d.id,
      name: d.creditorName || "Gläubiger",
      amount: d.amount,
      quota,
      proposedTotal,
      monthlyRate,
    };
  });

  // Plan overall status
  const rejectedCount = debts.filter(d => feedback[d.id] === "ablehnung").length;
  const approvedCount = debts.filter(d => feedback[d.id] === "zustimmung").length;
  const openCount = debts.filter(d => !feedback[d.id] || feedback[d.id] === "offen").length;

  let overallPlanState: "pre" | "failed" | "success" = "pre";
  if (rejectedCount > 0) {
    overallPlanState = "failed";
  } else if (approvedCount === activeDebtsCount && activeDebtsCount > 0) {
    overallPlanState = "success";
  }

  // Generate clean, highly structured DOCX Schuldenbereinigungsplan
  const handleGenerateDocxReport = async () => {
    try {
      if (debts.length === 0) {
        alert("Fügen Sie zuerst Gläubiger hinzu, um einen Bereinigungsplan zu entwerfen.");
        return;
      }

      const docChildren: any[] = [];

      // 1. Logo Header
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

      // Kanzleireferenz & Date Header Line
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: `Referenz: GLB-305-${activeProfile.toUpperCase()}   |   Datum: ${new Date(planSentDate).toLocaleDateString("de-DE")}`,
              bold: true,
              size: 18,
              color: "475569",
            })
          ],
          alignment: DocxAlignmentType.RIGHT,
          spacing: { after: 150 }
        })
      );

      // Document Title Header
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "AUßERGERICHTLICHER SCHULDENBEREINIGUNGSPLAN",
              bold: true,
              size: 28,
              color: "0F172A",
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
              text: "gemäß § 305 Abs. 1 Nr. 1 Insolvenzordnung (InsO) zur außergerichtlichen gütlichen Schuldenbereinigung",
              italics: true,
              size: 20,
              color: "475569",
            })
          ],
          alignment: DocxAlignmentType.CENTER,
          spacing: { after: 300 }
        })
      );

      // Table 1: Stammdaten Schuldner & Beratungsstelle
      const borderThin = { style: DocxBorderStyle.SINGLE, size: 4, color: "CBD5E1" };
      const tableBordersLight = {
        top: borderThin,
        bottom: borderThin,
        left: borderThin,
        right: borderThin,
        insideHorizontal: borderThin,
        insideVertical: borderThin,
      };

      docChildren.push(
        new DocxTable({
          width: { size: 100, type: DocxWidthType.PERCENTAGE },
          borders: tableBordersLight,
          rows: [
            // Category Header 1
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
                          text: "1. ANGABEN ZUM SCHULDNER (MANDANT)",
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
            // Row 1.1
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 35, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Vollständiger Name:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 65, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: debtorName, bold: true, size: 18, color: "0F172A" })] })]
                }),
              ]
            }),
            // Row 1.2
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 35, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Geburtsdatum:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 65, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: debtorDob || "Unbekannt", size: 18, color: "334155" })] })]
                }),
              ]
            }),
            // Row 1.3
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
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: debtorAddress || "Heidestraße 48, Berlin", size: 18, color: "334155" })] })]
                }),
              ]
            }),
            // Row 1.4
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 35, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Zuständiges Gericht:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 65, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: competentCourt || "Amtsgericht Wedding (Insolvenzgericht)", size: 18, color: "334155" })] })]
                }),
              ]
            }),

            // Category Header 2
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
                          text: "2. ZERTIFIZIERTE BERATERSTELLE / AUSSTELLER",
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
            // Row 2.1
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 35, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Name der Stelle:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 65, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Gesetzeslotse BERLIN Kanzlei-Gemeinschaft", bold: true, size: 18, color: "0F172A" })] })]
                }),
              ]
            }),
            // Row 2.2
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
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Staatlich anerkannt nach § 305 Abs. 1 Nr. 1 InsO (Senatsverwaltung Berlin)", size: 18, color: "334155" })] })]
                }),
              ]
            }),
            // Row 2.3
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 35, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Anschrift d. Kanzlei:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 65, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Alt-Moabit 90 D, 10559 Berlin", size: 18, color: "334155" })] })]
                }),
              ]
            }),
          ]
        })
      );

      docChildren.push(new DocxParagraph({ text: "", spacing: { after: 140 } }));

      // Table 2: Financial Summary Card
      let modeText = "Einmalzahlungsvergleich (feste Summe außerger.)";
      if (planType === "nullplan") modeText = "Nullplan (keine Zahlungen mangels pfändbarem Vermögen)";
      else if (planType === "rate") modeText = `Ratenplan über ${planDurationMonths} Monate mit mtl. EUR ${monthlyInstallment.toFixed(2)}`;

      docChildren.push(
        new DocxTable({
          width: { size: 100, type: DocxWidthType.PERCENTAGE },
          borders: tableBordersLight,
          rows: [
            // Header
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
                          text: "3. ECKDATEN & KENNZAHLEN DES SCHULDENBEREINIGUNGSPLANS",
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
                  width: { size: 45, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Forderungs-Gesamthöhe:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 55, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: `EUR ${totalDebtSum.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`, bold: true, size: 18, color: "991B1B" })] })]
                }),
              ]
            }),
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 45, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Erfasste Gläubiger-Positionen:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 55, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: `${activeDebtsCount} Gläubiger-Positionen`, size: 18, color: "334155" })] })]
                }),
              ]
            }),
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 45, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Gewählter Einigungsmodus:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 55, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: modeText, size: 18, color: "334155" })] })]
                }),
              ]
            }),
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 45, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Gesamter Tilgungsbetrag:", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 55, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: `EUR ${planTotalProposedBudget.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`, bold: true, size: 18, color: "15803D" })] })]
                }),
              ]
            }),
            new DocxTableRow({
              children: [
                new DocxTableCell({
                  width: { size: 45, type: DocxWidthType.PERCENTAGE },
                  shading: { fill: "F8FAFC" },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Gesamte Erlassquote (Ersparnis):", bold: true, size: 18, color: "334155" })] })]
                }),
                new DocxTableCell({
                  width: { size: 55, type: DocxWidthType.PERCENTAGE },
                  margins: { top: 80, bottom: 80, left: 140, right: 140 },
                  children: [new DocxParagraph({ children: [new DocxTextRun({ text: `${averageReductionPercentage.toFixed(1)}% Erlass auf das Gesamtportfolio`, bold: true, size: 18, color: "15803D" })] })]
                }),
              ]
            }),
          ]
        })
      );

      docChildren.push(new DocxParagraph({ text: "", spacing: { after: 180 } }));

      // Section 3: Table Appendix (Anlage A)
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "Anlage A: Detaillierter Pro-Rata Quoten- & Tilgungsplan",
              bold: true,
              size: 22,
              color: "0F172A",
            })
          ],
          spacing: { before: 60, after: 40 }
        })
      );

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: `Proportionalitätsberechnung für Schuldner: ${debtorName} • Stand d. Forderungen: ${new Date(planSentDate).toLocaleDateString("de-DE")}`,
              italics: true,
              size: 17,
              color: "475569",
            })
          ],
          spacing: { after: 120 }
        })
      );

      // Table Appendix Headers
      const tableRows: any[] = [];
      tableRows.push(
        new DocxTableRow({
          children: [
            new DocxTableCell({
              width: { size: 6, type: DocxWidthType.PERCENTAGE },
              shading: { fill: "0F172A" },
              margins: { top: 100, bottom: 100, left: 80, right: 80 },
              children: [new DocxParagraph({ alignment: DocxAlignmentType.CENTER, children: [new DocxTextRun({ text: "Pos.", bold: true, size: 17, color: "FFFFFF" })] })]
            }),
            new DocxTableCell({
              width: { size: 36, type: DocxWidthType.PERCENTAGE },
              shading: { fill: "0F172A" },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: [new DocxParagraph({ children: [new DocxTextRun({ text: "Gläubiger / Vertreter (AZ)", bold: true, size: 17, color: "FFFFFF" })] })]
            }),
            new DocxTableCell({
              width: { size: 18, type: DocxWidthType.PERCENTAGE },
              shading: { fill: "0F172A" },
              margins: { top: 100, bottom: 100, left: 80, right: 80 },
              children: [new DocxParagraph({ alignment: DocxAlignmentType.RIGHT, children: [new DocxTextRun({ text: "Forderung", bold: true, size: 17, color: "FFFFFF" })] })]
            }),
            new DocxTableCell({
              width: { size: 10, type: DocxWidthType.PERCENTAGE },
              shading: { fill: "0F172A" },
              margins: { top: 100, bottom: 100, left: 80, right: 80 },
              children: [new DocxParagraph({ alignment: DocxAlignmentType.RIGHT, children: [new DocxTextRun({ text: "Quote", bold: true, size: 17, color: "FFFFFF" })] })]
            }),
            new DocxTableCell({
              width: { size: 16, type: DocxWidthType.PERCENTAGE },
              shading: { fill: "0F172A" },
              margins: { top: 100, bottom: 100, left: 80, right: 80 },
              children: [new DocxParagraph({ alignment: DocxAlignmentType.RIGHT, children: [new DocxTextRun({ text: "Gütl. Angebot", bold: true, size: 17, color: "FFFFFF" })] })]
            }),
            new DocxTableCell({
              width: { size: 14, type: DocxWidthType.PERCENTAGE },
              shading: { fill: "0F172A" },
              margins: { top: 100, bottom: 100, left: 80, right: 80 },
              children: [new DocxParagraph({ alignment: DocxAlignmentType.RIGHT, children: [new DocxTextRun({ text: "Mtl. Rate", bold: true, size: 17, color: "FFFFFF" })] })]
            }),
          ]
        })
      );

      // Data Rows
      debts.forEach((d, idx) => {
        const quote = totalDebtSum > 0 ? (d.amount / totalDebtSum) * 100 : 0;
        const proposedTotal = d.amount * (1 - averageReductionPercentage / 100);
        const proposedRate = planType === "rate" && planDurationMonths > 0 ? (proposedTotal / planDurationMonths) : 0;
        const isAltRow = idx % 2 === 1;

        tableRows.push(
          new DocxTableRow({
            children: [
              new DocxTableCell({
                width: { size: 6, type: DocxWidthType.PERCENTAGE },
                shading: isAltRow ? { fill: "F1F5F9" } : undefined,
                margins: { top: 80, bottom: 80, left: 60, right: 60 },
                children: [new DocxParagraph({ alignment: DocxAlignmentType.CENTER, children: [new DocxTextRun({ text: `${idx + 1}`, size: 17, color: "334155" })] })]
              }),
              new DocxTableCell({
                width: { size: 36, type: DocxWidthType.PERCENTAGE },
                shading: isAltRow ? { fill: "F1F5F9" } : undefined,
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
                children: [
                  new DocxParagraph({ children: [new DocxTextRun({ text: d.creditorName, bold: true, size: 17, color: "0F172A" })] }),
                  d.fileReference ? new DocxParagraph({ children: [new DocxTextRun({ text: `AZ: ${d.fileReference}`, size: 15, color: "64748B" })] }) : new DocxParagraph({ children: [] })
                ]
              }),
              new DocxTableCell({
                width: { size: 18, type: DocxWidthType.PERCENTAGE },
                shading: isAltRow ? { fill: "F1F5F9" } : undefined,
                margins: { top: 80, bottom: 80, left: 80, right: 80 },
                children: [new DocxParagraph({ alignment: DocxAlignmentType.RIGHT, children: [new DocxTextRun({ text: `EUR ${d.amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, size: 17, color: "334155" })] })]
              }),
              new DocxTableCell({
                width: { size: 10, type: DocxWidthType.PERCENTAGE },
                shading: isAltRow ? { fill: "F1F5F9" } : undefined,
                margins: { top: 80, bottom: 80, left: 80, right: 80 },
                children: [new DocxParagraph({ alignment: DocxAlignmentType.RIGHT, children: [new DocxTextRun({ text: `${quote.toFixed(2)}%`, size: 17, color: "475569" })] })]
              }),
              new DocxTableCell({
                width: { size: 16, type: DocxWidthType.PERCENTAGE },
                shading: isAltRow ? { fill: "F1F5F9" } : undefined,
                margins: { top: 80, bottom: 80, left: 80, right: 80 },
                children: [new DocxParagraph({ alignment: DocxAlignmentType.RIGHT, children: [new DocxTextRun({ text: `EUR ${proposedTotal.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, bold: true, size: 17, color: "15803D" })] })]
              }),
              new DocxTableCell({
                width: { size: 14, type: DocxWidthType.PERCENTAGE },
                shading: isAltRow ? { fill: "F1F5F9" } : undefined,
                margins: { top: 80, bottom: 80, left: 80, right: 80 },
                children: [new DocxParagraph({ alignment: DocxAlignmentType.RIGHT, children: [new DocxTextRun({ text: planType === "rate" ? `EUR ${proposedRate.toFixed(2)}` : "-", bold: true, size: 17, color: "0F172A" })] })]
              }),
            ]
          })
        );
      });

      // Total Row
      tableRows.push(
        new DocxTableRow({
          children: [
            new DocxTableCell({
              width: { size: 42, type: DocxWidthType.PERCENTAGE },
              columnSpan: 2,
              shading: { fill: "E2E8F0" },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: [new DocxParagraph({ children: [new DocxTextRun({ text: "GESAMTSUMME / PRO-RATA BILANZ", bold: true, size: 18, color: "0F172A" })] })]
            }),
            new DocxTableCell({
              width: { size: 18, type: DocxWidthType.PERCENTAGE },
              shading: { fill: "E2E8F0" },
              margins: { top: 100, bottom: 100, left: 80, right: 80 },
              children: [new DocxParagraph({ alignment: DocxAlignmentType.RIGHT, children: [new DocxTextRun({ text: `EUR ${totalDebtSum.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, bold: true, size: 18, color: "991B1B" })] })]
            }),
            new DocxTableCell({
              width: { size: 10, type: DocxWidthType.PERCENTAGE },
              shading: { fill: "E2E8F0" },
              margins: { top: 100, bottom: 100, left: 80, right: 80 },
              children: [new DocxParagraph({ alignment: DocxAlignmentType.RIGHT, children: [new DocxTextRun({ text: "100.00%", bold: true, size: 18, color: "0F172A" })] })]
            }),
            new DocxTableCell({
              width: { size: 16, type: DocxWidthType.PERCENTAGE },
              shading: { fill: "E2E8F0" },
              margins: { top: 100, bottom: 100, left: 80, right: 80 },
              children: [new DocxParagraph({ alignment: DocxAlignmentType.RIGHT, children: [new DocxTextRun({ text: `EUR ${planTotalProposedBudget.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, bold: true, size: 18, color: "15803D" })] })]
            }),
            new DocxTableCell({
              width: { size: 14, type: DocxWidthType.PERCENTAGE },
              shading: { fill: "E2E8F0" },
              margins: { top: 100, bottom: 100, left: 80, right: 80 },
              children: [new DocxParagraph({ alignment: DocxAlignmentType.RIGHT, children: [new DocxTextRun({ text: planType === "rate" ? `EUR ${monthlyInstallment.toFixed(2)}` : "-", bold: true, size: 18, color: "0F172A" })] })]
            }),
          ]
        })
      );

      docChildren.push(
        new DocxTable({
          width: { size: 100, type: DocxWidthType.PERCENTAGE },
          borders: tableBordersLight,
          rows: tableRows
        })
      );

      docChildren.push(new DocxParagraph({ text: "", spacing: { after: 300 } }));

      // Section 4: Rechtliche Bestimmungen & Signatures
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "ERKLÄRUNG UND BESTÄTIGUNG DER BERATERSTELLE:",
              bold: true,
              size: 20,
              color: "0F172A",
            })
          ],
          spacing: { before: 100, after: 60 }
        })
      );

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "Mit Übersendung dieses außergerichtlichen Schuldenbereinigungsplans bescheinigt die bevollmächtigte Beraterstelle die Richtigkeit und rechtliche Aufarbeitung der eingetragenen Forderungen anhand des geprüften Belegbestands gemäß § 305 Abs. 1 Nr. 1 Insolvenzordnung (InsO).",
              size: 18,
              color: "475569",
            })
          ],
          spacing: { after: 250 }
        })
      );

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
                    new DocxParagraph({ children: [new DocxTextRun({ text: "Stempel & Unterschrift Beraterstelle", bold: true, size: 18, color: "0F172A" })] }),
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
      link.download = `Paragraph_305_Schuldenbereinigungsplan_${debtorName.replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Fehler beim DOCX-Export des Schuldenbereinigungsplans.");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-205 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900" id="schuldenbereinigungsplan-dashboard">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-950/65 dark:text-indigo-400 flex items-center justify-center">
              <Coins className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Außergerichtlicher Schuldenbereinigungsplan
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kalkulieren Sie pro-rata Tilgungsquoten gemäß § 305 Abs. 1 Nr. 1 InsO für den lückenlosen gütlichen Einigungsversuch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={syncFromOffers}
            className="p-2 bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Nutzt gelesene Belege und bereits extrahierte Vergleichsangebote"
          >
            <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>Gütliche Angebote einspielen</span>
          </button>

          <button
            onClick={handleGenerateDocxReport}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            <span>Word (DOCX)</span>
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>Drucken / PDF Export</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2">
          ✓ {notification}
        </div>
      )}

      {/* Grid: Configurations vs. Pro-Rata overview */}
      <div className="grid gap-6 lg:grid-cols-12 mb-6">
        
        {/* Left Side: Parameters Form */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/20 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-slate-500" />
              1. Planziel & Parameter
            </h3>

            {/* Plan selector type */}
            <div>
              <label className="text-[10px] text-slate-450 uppercase block mb-1.5 font-bold">MODELL / VERFAHRENSART:</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPlanType("rate")}
                  className={`py-2 px-1 text-center rounded-lg text-[10px] font-extrabold cursor-pointer transition-colors border leading-tight ${
                    planType === "rate"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-750 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  Ratenplan
                  <span className="block text-[8px] opacity-70 font-normal mt-0.5">Teilsatzerlass</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlanType("einmal")}
                  className={`py-2 px-1 text-center rounded-lg text-[10px] font-extrabold cursor-pointer transition-colors border leading-tight ${
                    planType === "einmal"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-750 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  Einmalvergleich
                  <span className="block text-[8px] opacity-70 font-normal mt-0.5">Lump-sum</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlanType("nullplan")}
                  className={`py-2 px-1 text-center rounded-lg text-[10px] font-extrabold cursor-pointer transition-colors border leading-tight ${
                    planType === "nullplan"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-750 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  Nullplan
                  <span className="block text-[8px] opacity-70 font-normal mt-0.5">Keine Quote</span>
                </button>
              </div>
            </div>

            {/* Inputs based on type */}
            {planType === "rate" && (
              <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="text-[10px] text-slate-450 uppercase block mb-1">MONATLICHE RATENSUMME (GESAMT):</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">EUR</span>
                    <input
                      type="number"
                      value={monthlyInstallment}
                      onChange={(e) => setMonthlyInstallment(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-205 pl-11 pr-3 py-1.5 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-slate-900 dark:border-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 italic">
                    Wird verhältnismäßig auf alle Gläubiger aufgeteilt.
                  </p>
                </div>

                <div>
                  <label className="text-[10px] text-slate-450 uppercase block mb-1">PLAN-LAUFZEIT (MONATE):</label>
                  <select
                    value={planDurationMonths}
                    onChange={(e) => setPlanDurationMonths(parseInt(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-205 px-3 py-1.5 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-slate-900 dark:border-slate-800 dark:text-slate-200"
                  >
                    <option value={12}>12 Monate (1 Jahr Shortterm)</option>
                    <option value={24}>24 Monate (2 Jahre)</option>
                    <option value={36}>36 Monate (3 Jahre Regelinsolvenz-Gleichauf)</option>
                    <option value={48}>48 Monate (4 Jahre)</option>
                    <option value={60}>60 Monate (5 Jahre Absicherung)</option>
                  </select>
                </div>
              </div>
            )}

            {planType === "einmal" && (
              <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="text-[10px] text-slate-450 uppercase block mb-1">EINMAL-SETTLEMENTTOPF (GESAMT):</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">EUR</span>
                    <input
                      type="number"
                      value={oneTimeFund}
                      onChange={(e) => setOneTimeFund(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-205 pl-11 pr-3 py-1.5 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-slate-900 dark:border-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 italic">
                    Unterstützungsgelder von Angehörigen sind meist insolvenz-pfändungsgeschützt.
                  </p>
                </div>
              </div>
            )}

            {planType === "nullplan" && (
              <div className="p-3 bg-red-105/5 border border-red-500/10 rounded-lg text-[10px] text-slate-500 leading-normal space-y-1 dark:bg-red-950/10">
                <span className="font-bold text-red-700 dark:text-red-400 block">Wichtig beim Nullplan:</span>
                <span>
                  Ein Nullplan wird angeboten, wenn das pfändbare Arbeitseinkommen des Mandanten unter der Pfändungsfreigrenze (§ 850c ZPO) liegt und kein sonstiges Vermögen existiert. Stimmen die Gläubiger zu, sind die Schulden getilgt. Weigern Sie sich, kann sofort das Insolvenzverfahren eröffnet werden.
                </span>
              </div>
            )}

            <div>
              <label className="text-[10px] text-slate-450 uppercase block mb-1">PLAN-VERSAND / BEGINN:</label>
              <input
                type="date"
                value={planSentDate}
                onChange={(e) => setPlanSentDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-205 px-3 py-1.5 rounded-lg text-xs focus:outline-none dark:border-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Quick Stats Metrics */}
          <div className="p-4 bg-slate-950 text-white rounded-xl space-y-3 shadow-sm dark:bg-slate-900/60 dark:border dark:border-slate-800 dark:text-slate-100">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1 pb-1.5 border-b border-slate-800">
              <Activity className="h-3.5 w-3.5 text-indigo-400" />
              Vergleichs-Prognose
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-center">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Plan-Summe</span>
                <span className="text-sm font-black font-mono">EUR {planTotalProposedBudget.toLocaleString("de-DE")}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-center font-mono">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Portofolio</span>
                <span className="text-sm font-black">EUR {totalDebtSum.toLocaleString("de-DE")}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Ersparnis-Grad:</span>
              <span className="text-xs font-extrabold text-emerald-400">
                {averageReductionPercentage > 0 ? `-${averageReductionPercentage.toFixed(1)}%` : "0.0%"} Rabatt
              </span>
            </div>

            {/* Quick Bulk Tool actions */}
            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => bulkSetFeedback("zustimmung")}
                className="flex-1 bg-emerald-950 border border-emerald-900/50 hover:bg-emerald-900 text-emerald-300 text-[10px] font-bold py-1 px-1.5 rounded transition-all cursor-pointer text-center"
              >
                Bulk ✓ Zustimmen
              </button>
              <button
                type="button"
                onClick={() => bulkSetFeedback("ablehnung")}
                className="flex-1 bg-rose-950 border border-rose-900/50 hover:bg-rose-900 text-rose-300 text-[10px] font-bold py-1 px-1.5 rounded transition-all cursor-pointer text-center"
              >
                Bulk ✗ Ablehnen
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Pro-Rata Table */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Visuelle Gläubiger-Verteilung */}
          {debts.length > 0 && (() => {
            const approvedDebtSum = debts.filter(d => feedback[d.id] === "zustimmung").reduce((sum, d) => sum + d.amount, 0);
            const approvedDebtPercentage = totalDebtSum > 0 ? (approvedDebtSum / totalDebtSum) * 100 : 0;
            const approvedHeadsPercentage = activeDebtsCount > 0 ? (approvedCount / activeDebtsCount) * 100 : 0;

            const hasKopfmehrheit = approvedCount > activeDebtsCount / 2;
            const hasSummenmehrheit = approvedDebtSum > totalDebtSum / 2;

            // Check if any single rejecting creditor has > 50%
            const vetoCreditor = creditorDistribution.find(g => {
              // Find if any debt of this creditor has been rejected and if their total share is > 50%
              const hasRejections = debts.some(d => d.creditorName === g.name && feedback[d.id] === "ablehnung");
              return hasRejections && (g.total / totalDebtSum) > 0.5;
            });

            const canReplaceObjections = hasKopfmehrheit && hasSummenmehrheit && !vetoCreditor;

            return (
              <div className="p-5 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl space-y-4 shadow-sm animate-fadeIn" id="creditor-distribution-card">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-indigo-500" />
                      Gläubiger-Verteilung & Forderungsanteile
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Visualisierung der Schuldenverteilung zur Identifikation der Hauptgläubiger (Kopf- und Summenmehrheit)
                    </p>
                  </div>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 px-2 py-0.5 rounded font-mono">
                    Gesamt: EUR {totalDebtSum.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Distribution List */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Einzelanteile pro Gläubiger</span>
                    <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                      {creditorDistribution.map((group, index) => {
                        const share = totalDebtSum > 0 ? (group.total / totalDebtSum) * 100 : 0;
                        const barColors = [
                          "bg-indigo-600",
                          "bg-violet-600",
                          "bg-purple-600",
                          "bg-pink-600",
                          "bg-rose-600",
                          "bg-amber-600",
                          "bg-slate-600"
                        ];
                        const colorClass = barColors[index % barColors.length];

                        return (
                          <div key={group.name} className="space-y-1" id={`distribution-item-${index}`}>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate max-w-[180px]">
                                <span className={`h-2 w-2 rounded-full shrink-0 ${colorClass}`} />
                                <span className="truncate" title={group.name}>{group.name}</span>
                                <span className="text-[9px] text-slate-400 font-normal shrink-0">
                                  ({group.itemsCount}x)
                                </span>
                              </span>
                              <div className="space-x-2 font-mono shrink-0">
                                <span className="text-slate-500">EUR {group.total.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className="font-black text-slate-900 dark:text-slate-100">{share.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                                style={{ width: `${share}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Insolvenzrechtlicher Quorum-Check (§ 309 InsO) */}
                  <div className="bg-slate-50/75 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-850 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-550 dark:text-slate-350 uppercase tracking-wider flex items-center gap-1">
                        <span>⚖️</span> Mehrheits- & Quorumsprüfung (§ 309 InsO)
                      </span>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Simuliert, ob widersprechende Gläubiger im gerichtlichen Verfahren durch das Insolvenzgericht ersetzt werden können (§ 309 InsO).
                      </p>

                      <div className="space-y-3.5 mt-4">
                        {/* 1. Kopfmehrheit */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">1. Kopfmehrheit (Mehrheit der Gläubigerköpfe)</span>
                            <span className={`font-mono font-bold ${hasKopfmehrheit ? "text-emerald-650" : "text-amber-600"}`}>
                              {approvedCount} von {activeDebtsCount} ({approvedHeadsPercentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${hasKopfmehrheit ? "bg-emerald-500" : "bg-amber-500"}`}
                              style={{ width: `${Math.min(approvedHeadsPercentage, 100)}%` }}
                            />
                          </div>
                          <p className="text-[8.5px] text-slate-450">Erforderlich: &gt; 50% der Köpfe ({Math.ceil((activeDebtsCount + 1) / 2)} Zustimmungen)</p>
                        </div>

                        {/* 2. Summenmehrheit */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">2. Summenmehrheit (Mehrheit der Forderungssumme)</span>
                            <span className={`font-mono font-bold ${hasSummenmehrheit ? "text-emerald-650" : "text-amber-600"}`}>
                              EUR {approvedDebtSum.toLocaleString("de-DE", { maximumFractionDigits: 0 })} ({approvedDebtPercentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${hasSummenmehrheit ? "bg-emerald-500" : "bg-amber-500"}`}
                              style={{ width: `${Math.min(approvedDebtPercentage, 100)}%` }}
                            />
                          </div>
                          <p className="text-[8.5px] text-slate-450">Erforderlich: &gt; 50% des Gesamtbetrags (&gt; EUR {(totalDebtSum / 2).toLocaleString("de-DE", { maximumFractionDigits: 0 })})</p>
                        </div>
                      </div>
                    </div>

                    {/* Result Notice */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800">
                      {canReplaceObjections ? (
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/25 text-emerald-800 dark:text-emerald-350 border border-emerald-100 dark:border-emerald-900 rounded-lg text-[9px] font-semibold space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span>✅</span>
                            <span>Zustimmungsersetzung möglich!</span>
                          </div>
                          <span className="font-normal text-slate-500 dark:text-slate-400 block leading-tight">Beide Mehrheiten sind gegeben. Das Gericht kann unkooperative Gläubiger überstimmen. Planerfolg ist sehr wahrscheinlich!</span>
                        </div>
                      ) : (
                        <div className="p-2 bg-amber-50 dark:bg-amber-950/25 text-amber-800 dark:text-amber-350 border border-amber-100 dark:border-amber-900 rounded-lg text-[9px] font-semibold space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span>⚠️</span>
                            <span>Gerichtliche Ersetzung blockiert</span>
                          </div>
                          <span className="font-normal text-slate-500 dark:text-slate-400 block leading-tight">
                            {vetoCreditor 
                              ? `Veto-Sperre: Gläubiger "${vetoCreditor.name}" hält über 50% der Gesamtsumme (${((vetoCreditor.total / totalDebtSum)*100).toFixed(0)}%) und hat abgelehnt.` 
                              : "Die gesetzlichen Quoren (Kopf- oder Summenmehrheit) sind noch nicht erreicht. Holen Sie weitere Zustimmungen ein!"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {largestCreditor && (
                  <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 dark:bg-indigo-950/10 dark:border-indigo-900 text-[10px] text-indigo-800 dark:text-indigo-300 rounded-lg flex items-center justify-between" id="largest-creditor-notice">
                    <span>
                      💡 Größter Gläubigeranteil: <b>{largestCreditor.name}</b> mit <b>EUR {largestCreditor.total.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>. Stimmt dieser Gläubiger nicht zu, gilt das außergerichtliche Verfahren als gescheitert.
                    </span>
                    <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100 font-bold px-2 py-0.5 rounded-md uppercase shrink-0">
                      {((largestCreditor.total / totalDebtSum) * 100).toFixed(1)}% Anteil
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="p-5 bg-slate-50 border border-slate-205 dark:bg-slate-950/20 dark:border-slate-850 rounded-xl space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Grid className="h-4 w-4 text-emerald-505" />
                  2. Gläubiger-Stellschrauben & Quotenaufteilung
                </h3>
                <p className="text-[10px] text-slate-550 dark:text-slate-450 mt-0.5">
                  Schnittstelle zur Einordnung des Beteiligungsergebnisses nach § 305 f. InsO
                </p>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 select-none">
                {overallPlanState === "pre" && (
                  <span className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-955/50 dark:text-amber-300 px-2.5 py-1 rounded-full font-bold uppercase animate-pulse">
                    ● In Vorbereitung ({openCount} offen)
                  </span>
                )}
                {overallPlanState === "success" && (
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-955/50 dark:text-emerald-300 px-2.5 py-1 rounded-full font-extrabold uppercase">
                    ✔ Einigung angenommen!
                  </span>
                )}
                {overallPlanState === "failed" && (
                  <span className="text-[9px] bg-rose-100 text-rose-800 dark:bg-rose-955/50 dark:text-rose-300 px-2.5 py-1 rounded-full font-black uppercase">
                    ✗ Einigung gescheitert (Vollstreckung droht)
                  </span>
                )}
              </div>
            </div>

            {debts.length === 0 ? (
              <div className="text-center py-12 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto animate-bounce" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Keine Gläubiger erfasst. Wechseln Sie zum ersten Tab <b>1. Gläubigerverzeichnis</b>, um erste Forderungen manuell zu erfassen, CSVs hochzuladen oder Aktenbelege einzuscannen.
                </p>
              </div>
            ) : (
              <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-850 text-[11px] font-sans">
                    <thead className="bg-slate-50/50 dark:bg-slate-950/40 text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-450 text-left">
                      <tr>
                        <th className="px-3.5 py-3">Gläubiger / Vertreter</th>
                        <th className="px-3.5 py-3 text-right">Forderung</th>
                        <th className="px-3.5 py-3 text-center">Quote</th>
                        <th className="px-3.5 py-3 text-right">Angebot (Gesamt)</th>
                        {planType === "rate" && <th className="px-3.5 py-3 text-right">Mtl. Rate</th>}
                        <th className="px-3.5 py-3 text-center">Verhandlungsergebnis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850/60 leading-normal">
                      {debts.map((item) => {
                        // Safe math quotient
                        const percentage = totalDebtSum > 0 ? (item.amount / totalDebtSum) * 100 : 0;
                        const proposedAmount = item.amount * (1 - averageReductionPercentage / 100);
                        const proposedRate = planType === "rate" && planDurationMonths > 0 ? (proposedAmount / planDurationMonths) : 0;
                        const currentStatus = feedback[item.id] || "offen";

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/10">
                            
                            <td className="px-3.5 py-3 max-w-[190px]">
                              <span className="font-extrabold text-slate-900 dark:text-slate-200 block truncate leading-tight">
                                {item.creditorName}
                              </span>
                              <span className="text-[9px] text-slate-400 mt-0.5 block font-mono tracking-tighter">
                                {item.fileReference || "unbekannt"} {item.originalCreditor ? `(AG: ${item.originalCreditor})` : ""}
                              </span>
                            </td>

                            <td className="px-3.5 py-3 text-right font-semibold font-mono">
                              EUR {item.amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            <td className="px-3.5 py-3 text-center font-mono text-slate-500 font-medium">
                              {percentage.toFixed(2)}%
                            </td>

                            <td className="px-3.5 py-3 text-right font-extrabold text-slate-900 dark:text-indigo-300 font-mono">
                              EUR {proposedAmount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            {planType === "rate" && (
                              <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                EUR {proposedRate.toFixed(2)}
                              </td>
                            )}

                            {/* Response / Feedback Column */}
                            <td className="px-3.5 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => updateFeedback(item.id, "zustimmung")}
                                  className={`p-1 px-1.5 rounded text-[10px] font-black cursor-pointer transition flex items-center gap-0.5 border ${
                                    currentStatus === "zustimmung"
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-900 dark:text-emerald-300"
                                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
                                  }`}
                                  title="Zustimmung verbuchen"
                                >
                                  Zustimmung
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateFeedback(item.id, "ablehnung")}
                                  className={`p-1 px-1.5 rounded text-[10px] font-black cursor-pointer transition flex items-center gap-0.5 border ${
                                    currentStatus === "ablehnung"
                                      ? "bg-rose-50 border-rose-250 text-rose-700 dark:bg-rose-950/60 dark:border-rose-900 dark:text-rose-300"
                                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
                                  }`}
                                  title="Ablehnung / Widerspruch verbuchen"
                                >
                                  Ablehnung
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateFeedback(item.id, "offen")}
                                  className={`p-1 px-1.5 rounded text-[10px] font-medium cursor-pointer transition flex items-center gap-0.5 border ${
                                    currentStatus === "offen"
                                      ? "bg-slate-200 border-slate-300 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                                      : "bg-slate-5 border-slate-200 text-slate-400 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800"
                                  }`}
                                  title="Rückmeldung steht noch aus"
                                >
                                  Offen
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Warnings & Legal hints linking to the failure certificate */}
            {overallPlanState === "failed" && (
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/10 dark:border-rose-900 flex items-start gap-3 text-xs text-rose-800 dark:text-rose-300 animate-pulse">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="font-extrabold text-sm block">Rechtswirkung nach § 305 Abs. 1 Nr. 1 InsO eingetreten:</p>
                  <p className="leading-relaxed">
                    Da mindestens ein Gläubiger den außergerichtlichen Schuldenbereinigungsplan ausdrücklich oder durch aktive Gegenmaßnahmen <b>abgelehnt</b> hat, gilt der Einigungsversuch rechtlich als <b>endgültig gescheitert</b>.
                  </p>
                  <div>
                    <button
                      onClick={() => {
                        // Switch active tab programmatically using the set_active_tab event
                        const event = new CustomEvent("set_active_tab", { detail: "scheitern" });
                        window.dispatchEvent(event);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      <span>In Tab "§ 305 Bescheinigung" wechseln</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {overallPlanState === "success" && (
              <div className="p-4 rounded-xl border border-emerald-250 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900 flex items-start gap-3 text-xs text-emerald-850 dark:text-emerald-300">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-extrabold text-sm block">Gläubigerbestätigung erfolgreich abgeschlossen!</p>
                  <p className="leading-relaxed">
                    Alle erfassten Gläubigerpositionen haben dem Schuldenbereinigungsplan zugestimmt. Sie können die Ratenvereinbarungen jetzt dauerhaft festschreiben und den Erlass erwirken. Ein Insolvenzantrag ist nicht mehr notwendig.
                  </p>
                </div>
              </div>
            )}

            {overallPlanState === "pre" && (
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/20 dark:bg-slate-900/40 dark:border-slate-800 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
                <Info className="h-5 w-5 text-indigo-505 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-850 dark:text-slate-205">Verfahrensschritte:</p>
                  <p className="leading-relaxed">
                    Setzen Sie die Feedback-Antworten der Gläubiger per Klick, sobald Briefe oder Mahnbeschnitt-Rückmeldungen eingehen. Sobald ein Status auf <b>Ablehnung</b> rutscht, schlägt das System das Scheitern vor, für das Sie die gerichtliche Bescheinigung downloaden können.
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Print Preview Modal for Schuldenbereinigungsplan */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 no-print">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Druck- & PDF-Ansicht (§ 305 InsO Schuldenbereinigungsplan)
                </h3>
              </div>
              <div className="flex items-center gap-2">
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
                  onClick={handleExportPdf}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>PDF herunterladen</span>
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

            {/* Printable Container */}
            <div className="p-8 overflow-y-auto bg-slate-200 dark:bg-slate-950 flex justify-center py-10">
              <div
                id="printable-schuldenbereinigungsplan-container"
                className="printable-area bg-white text-slate-900 p-8 shadow-2xl rounded border border-slate-300 w-full max-w-[210mm] font-sans leading-relaxed text-xs space-y-5 relative"
              >
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-300 pb-3">
                  <div>
                    <h1 className="font-extrabold text-sm uppercase text-slate-900 tracking-wide">
                      Gesetzeslotse BERLIN e.V.
                    </h1>
                    <p className="text-[10px] text-slate-500">
                      Anerkannte Stelle nach § 305 Abs. 1 Nr. 1 InsO • Alt-Moabit 90 D • 10559 Berlin
                    </p>
                  </div>
                  <div className="text-right text-[10px] font-mono text-slate-600">
                    <p className="font-bold">Datum: {planSentDate}</p>
                    <p>Referenz: GLB-305-{activeProfile.toUpperCase()}</p>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center pt-2 pb-1 border-b border-slate-200">
                  <h2 className="font-black text-sm uppercase text-slate-900">
                    Außergerichtlicher Schuldenbereinigungsplan (§ 305 Abs. 1 Nr. 1 InsO)
                  </h2>
                  <p className="text-[10px] text-slate-600 italic mt-0.5">
                    Planvorschlag zur gütlichen Einigung mit allen Gläubigern
                  </p>
                </div>

                {/* Debtor details */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] space-y-1" data-break-avoid="true">
                  <p className="font-bold text-slate-900">Mandanten-Informationen:</p>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <p>Name: <b className="text-slate-900">{debtorName}</b></p>
                    <p>Geburtsdatum: <b>{debtorDob || "-"}</b></p>
                    <p>Anschrift: <b>{debtorAddress || "-"}</b></p>
                    <p>Zuständiges Gericht: <b>{competentCourt || "Amtsgericht Wedding"}</b></p>
                  </div>
                </div>

                {/* Summary boxes */}
                <div className="grid grid-cols-3 gap-3 text-center" data-break-avoid="true">
                  <div className="p-2.5 border border-slate-200 rounded bg-slate-50">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Gesamtschuld</span>
                    <span className="text-xs font-black text-slate-900 font-mono">
                      € {totalDebtSum.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-2.5 border border-slate-200 rounded bg-slate-50">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Tilgungsangebot</span>
                    <span className="text-xs font-black text-emerald-700 font-mono">
                      € {planTotalProposedBudget.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-2.5 border border-slate-200 rounded bg-slate-50">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Plan-Quote</span>
                    <span className="text-xs font-black text-indigo-700 font-mono">
                      {averageQuotaPercent.toFixed(1)} %
                    </span>
                  </div>
                </div>

                {/* Plan details table */}
                <div className="space-y-2">
                  <h3 className="font-bold text-xs uppercase text-slate-900 border-b pb-1">
                    Pro-Rata Verteilungsplan
                  </h3>
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-700 text-[10px] uppercase font-bold">
                        <th className="p-1.5">Gläubiger</th>
                        <th className="p-1.5 text-right">Forderung (€)</th>
                        <th className="p-1.5 text-right">Quote (%)</th>
                        <th className="p-1.5 text-right">Gütliche Summe (€)</th>
                        <th className="p-1.5 text-right">Mtl. Rate (€)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {proRataDetails.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-1.5 font-medium text-slate-900">{item.name}</td>
                          <td className="p-1.5 text-right font-mono text-slate-700">{item.amount.toFixed(2)}</td>
                          <td className="p-1.5 text-right font-mono text-indigo-700 font-bold">{item.quota.toFixed(1)}%</td>
                          <td className="p-1.5 text-right font-mono text-emerald-700 font-bold">{item.proposedTotal.toFixed(2)}</td>
                          <td className="p-1.5 text-right font-mono text-slate-900 font-bold">{item.monthlyRate.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footnote and signoff */}
                <div className="pt-4 border-t border-slate-300 space-y-4" data-break-avoid="true">
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    Mit Übersendung dieses außergerichtlichen Schuldenbereinigungsplans bescheinigt die bevollmächtigte Beraterstelle die Richtigkeit und rechtliche Aufarbeitung der eingetragenen Forderungen anhand des Belegbestands.
                  </p>
                  <div className="flex justify-between items-end pt-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-700">Ort, Datum:</p>
                      <p className="text-xs font-mono">Berlin, den {new Date().toLocaleDateString("de-DE")}</p>
                    </div>
                    <div className="text-right">
                      <div className="border-b border-slate-900 w-48 mb-1"></div>
                      <p className="text-[10px] font-bold text-slate-900">Unterschrift / Stempel Kanzlei</p>
                      <p className="text-[9px] text-slate-500">Gesetzeslotse BERLIN e.V.</p>
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
