import React, { useState, useEffect } from "react";
import { 
  Building2, 
  FileCheck, 
  Download, 
  Printer, 
  Coins, 
  Calculator, 
  User, 
  Calendar, 
  AlertCircle,
  FileText,
  CreditCard,
  TrendingUp,
  Plus,
  Trash2,
  CheckCircle,
  BarChart3,
  AlertTriangle
} from "lucide-react";
import { Document as DocxDocument, Packer as DocxPacker, Paragraph as DocxParagraph, TextRun as DocxTextRun } from "docx";
import { DebtItem } from "../types";
import { exportElementToPdf } from "../lib/pdfExport";
import { LOGO_DATA_URL } from "../lib/logoData";

export default function SenateInvoicer() {
  const [activeProfile, setActiveProfile] = useState<string>("schmidt");
  const [debtorName, setDebtorName] = useState<string>("Maximilian Schmidt");
  const [creditorsCount, setCreditorsCount] = useState<number>(2);
  const [fileReference, setFileReference] = useState<string>("GLB-2026-3920");
  const [shReference, setShReference] = useState<string>("50 II 1042 / 26"); // Beratungshilfe Aktenzeichen
  const [billingDate, setBillingDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState<string>(`RE-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  
  // Billing model
  const [modelType, setModelType] = useState<"senat_flat" | "rvg_itemized">("senat_flat");
  
  // VAT support
  const [withVat, setWithVat] = useState<boolean>(false);
  
  // Fees (Flat rate checkboxes)
  const [flatBasis, setFlatBasis] = useState<boolean>(true);
  const [flatScanner, setFlatScanner] = useState<boolean>(true);
  const [additionalBonus, setAdditionalBonus] = useState<boolean>(false); // Complex case bonus

  // Fees (RVG individual checkboxes)
  const [rvg2503, setRvg2503] = useState<boolean>(true); // Geschäftsgebühr (85€)
  const [rvg2508, setRvg2508] = useState<boolean>(true); // Erhöhung/Einigungsgebühr (150€)
  const [rvg7002, setRvg7002] = useState<boolean>(true); // Auslagenpauschale (20€)
  const [rvg7000, setRvg7000] = useState<boolean>(false); // Kopien (15€)

  // Bank Info
  const [iban, setIban] = useState<string>("DE89 1005 0000 9876 5432 10");
  const [bic, setBic] = useState<string>("WELADED1BER");
  const [bankName, setBankName] = useState<string>("Landesbank Berlin AG");
  const [recipient, setRecipient] = useState<string>("Gesetzeslotse BERLIN e.V.");

  // Sub Tab selection (invoice generator vs stats)
  const [subTab, setSubTab] = useState<"invoice" | "stats">("invoice");

  // Historical senate payments list
  const [historicalInvoices, setHistoricalInvoices] = useState([
    { id: "RE-2026-1025", month: "Januar", debtor: "Anna Bergmann", amount: 475.00, status: "Ausgezahlt" },
    { id: "RE-2026-1184", month: "Januar", debtor: "Christian Müller", amount: 675.00, status: "Ausgezahlt" },
    { id: "RE-2026-1402", month: "Februar", debtor: "Sarah König", amount: 675.00, status: "Ausgezahlt" },
    { id: "RE-2026-1940", month: "Februar", debtor: "Dennis Krause", amount: 925.00, status: "Ausgezahlt" },
    { id: "RE-2026-2241", month: "März", debtor: "Eleni Geller", amount: 475.00, status: "Ausgezahlt" },
    { id: "RE-2026-2591", month: "März", debtor: "Jonas Beck", amount: 675.00, status: "Ausgezahlt" },
    { id: "RE-2026-3042", month: "April", debtor: "Melanie Vogt", amount: 475.00, status: "Prüfung" },
    { id: "RE-2026-3501", month: "April", debtor: "Tariq Mansoor", amount: 925.00, status: "Prüfung" },
    { id: "RE-2026-4100", month: "Mai", debtor: "Karin Schulz", amount: 675.00, status: "Eingereicht" },
    { id: "RE-2026-4819", month: "Mai", debtor: "Lars Winters", amount: 675.00, status: "Eingereicht" },
  ]);

  // For adding custom simulated records
  const [newDebtorText, setNewDebtorText] = useState("");
  const [newDebtorAmount, setNewDebtorAmount] = useState<number>(675);
  const [newDebtorMonth, setNewDebtorMonth] = useState("Juni");
  const [newDebtorStatus, setNewDebtorStatus] = useState("Eingereicht");

  // Profile comparison variables for Plausibilitätsprüfung
  const [profileName, setProfileName] = useState<string>("Maximilian Schmidt");
  const [profileDebtsCount, setProfileDebtsCount] = useState<number>(2);
  const [profileNetIncome, setProfileNetIncome] = useState<number>(1850);
  const [profileIsEmployed, setProfileIsEmployed] = useState<boolean>(true);

  // Sync with localStorage debts portfolio
  useEffect(() => {
    const handleSync = () => {
      const profile = localStorage.getItem("gesetzeslotse_active_profile") || "schmidt";
      setActiveProfile(profile);

      const name = localStorage.getItem("gesetzeslotse_active_debtor_name") || "Maximilian Schmidt";
      setDebtorName(name);
      setProfileName(name);

      const storedNetIncome = parseFloat(localStorage.getItem("gesetzeslotse_active_debtor_net_income") || "0");
      setProfileNetIncome(storedNetIncome);

      const storedIsEmployed = localStorage.getItem("gesetzeslotse_active_debtor_is_employed") === "true";
      setProfileIsEmployed(storedIsEmployed);

      const portfolioKey = `gesetzeslotse_debts_portfolio_${profile}`;
      const stored = localStorage.getItem(portfolioKey);
      if (stored) {
        try {
          const debts: DebtItem[] = JSON.parse(stored);
          setCreditorsCount(debts.length);
          setProfileDebtsCount(debts.length);
          // Set appropriate file references
          setFileReference(`GLB-2026-${profile === "schmidt" ? "3920" : "5512"}`);
        } catch (e) {
          console.error(e);
        }
      } else {
        setProfileDebtsCount(0);
        setCreditorsCount(0);
      }
    };

    handleSync();
    window.addEventListener("gesetzeslotse_profile_changed", handleSync);
    window.addEventListener("gesetzeslotse_debts_updated", handleSync);
    return () => {
      window.removeEventListener("gesetzeslotse_profile_changed", handleSync);
      window.removeEventListener("gesetzeslotse_debts_updated", handleSync);
    };
  }, []);

  // Determine the flat reward base regarding creditor count
  const getFlatRateReward = () => {
    if (creditorsCount <= 5) return 450.00;
    if (creditorsCount <= 10) return 650.00;
    return 850.00;
  };

  const getSubtotal = () => {
    let sub = 0;
    if (modelType === "senat_flat") {
      if (flatBasis) sub += getFlatRateReward();
      if (flatScanner) sub += 25.00; // Scanzuschlag
      if (additionalBonus) sub += 75.00; // Case complexity
    } else {
      if (rvg2503) sub += 85.00;
      if (rvg2508) sub += 150.00;
      if (rvg7002) sub += 20.00;
      if (rvg7000) sub += 15.00;
    }
    return sub;
  };

  const getVatAmount = () => {
    if (!withVat) return 0;
    return getSubtotal() * 0.19;
  };

  const getTotalPrice = () => {
    return getSubtotal() + getVatAmount();
  };

  // Word (DOCX) Export
  const downloadInvoiceDocx = async () => {
    try {
      const docChildren: any[] = [];

      // Header sender
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "Gesetzeslotse BERLIN e.V. • Alt-Moabit 90 D • 10559 Berlin",
              size: 16,
              color: "64748b",
            })
          ],
          spacing: { after: 200 }
        })
      );

      // Recipient addresses
      const recipientLines = modelType === "senat_flat" 
        ? [
            "Senatsverwaltung für Justiz, Vielfalt und Antidiskriminierung",
            "Referat II D - Schuldnerberatungsstelle-Erstattung",
            "Salzburger Str. 21-25",
            "10825 Berlin (Schöneberg)"
          ]
        : [
            "Amtsgericht Wedding",
            "– Zentrale Erstellungsstelle für Beratungshilfe –",
            "Brunnenplatz 1",
            "13357 Berlin"
          ];

      recipientLines.forEach((line, idx) => {
        docChildren.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({
                text: line,
                bold: idx === 0,
                size: 20,
                color: "0f172a",
              })
            ],
            spacing: { after: 40 }
          })
        );
      });

      docChildren.push(new DocxParagraph({ text: "", spacing: { after: 200 } }));

      // Invoice info block
      const invoiceInfo = [
        `Rechnungs-Nr:  ${invoiceNumber}`,
        `Datum:          ${new Date(billingDate).toLocaleDateString("de-DE")}`,
        `Kanzlei-Kürzel:  GLB-305/BE`,
        `Verfahrenspfleg:  Lukas AI`,
      ];

      invoiceInfo.forEach(line => {
        docChildren.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({
                text: line,
                size: 18,
                bold: line.startsWith("Rechnungs-Nr"),
                color: "334155",
              })
            ],
            spacing: { after: 40 }
          })
        );
      });

      docChildren.push(new DocxParagraph({ text: "", spacing: { after: 200 } }));

      // Title
      const titleText = modelType === "senat_flat"
        ? "ABRECHNUNGS-ANTRAG nach Berliner Kassen-Satzung"
        : "Festsetzungsantrag gem. § 55 RVG (Beratungshilfe)";

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: titleText,
              bold: true,
              size: 24,
              color: "0f172a",
            })
          ],
          spacing: { after: 100 }
        })
      );

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "Hiermit rechnen wir die Aufwendungen für die Unterstützung bei der außergerichtlichen Einigung ab:",
              size: 20,
              color: "475569",
            })
          ],
          spacing: { after: 200 }
        })
      );

      // Metadata debtor info
      const metadataLines = [
        `Mandant / Schuldner:  ${debtorName}`,
        `Aktenzeichen:         ${fileReference}`,
        `Gerichts-Geschäftsnummer (BH): ${shReference}`,
        `Gläubiger im Verzeichnis: ${creditorsCount} erfasste Parteien`,
      ];

      metadataLines.forEach(line => {
        docChildren.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({
                text: line,
                size: 20,
                color: "1e293b",
              })
            ],
            spacing: { after: 40 }
          })
        );
      });

      docChildren.push(new DocxParagraph({ text: "", spacing: { after: 200 } }));

      // Positions Table Title
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "Abrechnungsposten:",
              bold: true,
              size: 22,
              color: "0f172a",
            })
          ],
          spacing: { after: 100 }
        })
      );

      // Add active positions
      if (modelType === "senat_flat") {
        if (flatBasis) {
          docChildren.push(
            new DocxParagraph({
              children: [
                new DocxTextRun({
                  text: `• Senats-Grundförderung für anerkannte Stellen (${creditorsCount} Gläubiger): EUR ${getFlatRateReward().toFixed(2)} (Pauschal)`,
                  size: 20,
                })
              ],
              spacing: { after: 60 }
            })
          );
        }
        if (flatScanner) {
          docChildren.push(
            new DocxParagraph({
              children: [
                new DocxTextRun({
                  text: `• IT-Pauschale / Digitalisierungs-Zuschlag: EUR 25.00 (Sondertatbest.)`,
                  size: 20,
                })
              ],
              spacing: { after: 60 }
            })
          );
        }
        if (additionalBonus) {
          docChildren.push(
            new DocxParagraph({
              children: [
                new DocxTextRun({
                  text: `• Erhöhter Beratungsaufwand (Erschwerte Struktur): EUR 75.00 (Vergleich)`,
                  size: 20,
                })
              ],
              spacing: { after: 60 }
            })
          );
        }
      } else {
        if (rvg2503) {
          docChildren.push(
            new DocxParagraph({
              children: [
                new DocxTextRun({
                  text: `• Geschäftsgebühr (außergerichtliches Verfahren) VV 2503: EUR 85.00`,
                  size: 20,
                })
              ],
              spacing: { after: 60 }
            })
          );
        }
        if (rvg2508) {
          docChildren.push(
            new DocxParagraph({
              children: [
                new DocxTextRun({
                  text: `• Einigungsgebühr / Einigungszuschlag VV 2508: EUR 150.00`,
                  size: 20,
                })
              ],
              spacing: { after: 60 }
            })
          );
        }
        if (rvg7002) {
          docChildren.push(
            new DocxParagraph({
              children: [
                new DocxTextRun({
                  text: `• Pauschale für Entgelte Post & Telekommunikation VV 7002: EUR 20.00`,
                  size: 20,
                })
              ],
              spacing: { after: 60 }
            })
          );
        }
        if (rvg7000) {
          docChildren.push(
            new DocxParagraph({
              children: [
                new DocxTextRun({
                  text: `• Ablichtungs- & Scannerpauschale VV 7000: EUR 15.00`,
                  size: 20,
                })
              ],
              spacing: { after: 60 }
            })
          );
        }
      }

      docChildren.push(new DocxParagraph({ text: "", spacing: { after: 150 } }));

      // Calculations block
      const calcLines = [
        `Zwischensumme (Netto):     EUR ${getSubtotal().toFixed(2)}`,
        `Umsatzsteuer (19%):        EUR ${getVatAmount().toFixed(2)}`,
        `Auszuzahlender Erstattungsbetrag: EUR ${getTotalPrice().toFixed(2)}`,
      ];

      calcLines.forEach((line, idx) => {
        docChildren.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({
                text: line,
                bold: idx === 2,
                size: idx === 2 ? 22 : 20,
                color: idx === 2 ? "1e3a8a" : "334155",
              })
            ],
            spacing: { after: 60 }
          })
        );
      });

      docChildren.push(new DocxParagraph({ text: "", spacing: { after: 200 } }));

      // Bankverbindung
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "BANKVERBINDUNG FÜR DIE ERSTATTUNG:",
              bold: true,
              size: 20,
              color: "0f172a",
            })
          ],
          spacing: { after: 80 }
        })
      );

      const bankLines = [
        `Zahlungsempfänger:  ${recipient}`,
        `IBAN Kontonr:       ${iban}`,
        `Institut/BIC:       ${bankName} / ${bic}`,
      ];

      bankLines.forEach(line => {
        docChildren.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({
                text: line,
                size: 20,
                color: "475569",
              })
            ],
            spacing: { after: 40 }
          })
        );
      });

      docChildren.push(new DocxParagraph({ text: "", spacing: { after: 200 } }));

      // Guidelines stamp note
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "Geprüft nach den Leitlinien für die Gewährung von Kanzlei-Erstattungen im Land Berlin (Stand 2026).\nMit Übersendung dieser Urkunde wird die ordnungsgemäße Durchführung des außergerichtlichen Vergleichsversuchs gem. § 305 Abs. 1 Nr. 1 InsO versichert.",
              italics: true,
              size: 16,
              color: "64748b",
            })
          ],
          spacing: { after: 250 }
        })
      );

      // Signatures
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "____________________________                      ____________________________",
              size: 18,
            })
          ]
        })
      );

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "Kanzleimanagement / Sachbearbeiter                  Stempel & amtliche Signatur",
              size: 18,
              color: "64748b",
            })
          ]
        })
      );

      const doc = new DocxDocument({
        sections: [
          {
            properties: {},
            children: docChildren,
          }
        ]
      });

      const blob = await DocxPacker.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Rechnung_Senat_${invoiceNumber}_${debtorName.replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Fehler beim Erzeugen der Senats-Abrechnung als Word-Dokument.");
    }
  };

  // Summing up values for the dashboard
  const currentInvoiceAmount = getTotalPrice();

  // We group all records by month including the live invoice
  const allInvoices = [
    ...historicalInvoices,
    { id: invoiceNumber, month: "Juni", debtor: debtorName + " (Aktiver Mandant)", amount: currentInvoiceAmount, status: "Eingereicht" }
  ];

  const paidAmount = allInvoices.filter(i => i.status === "Ausgezahlt").reduce((acc, idx) => acc + idx.amount, 0);
  const pendingAmount = allInvoices.filter(i => i.status === "Prüfung").reduce((acc, idx) => acc + idx.amount, 0);
  const submittedAmount = allInvoices.filter(i => i.status === "Eingereicht").reduce((acc, idx) => acc + idx.amount, 0);
  const totalAmount = allInvoices.reduce((acc, idx) => acc + idx.amount, 0);

  // Months order for sorting & cumulative graphing
  const monthsOrdered = ["Januar", "Februar", "März", "April", "Mai", "Juni"];
  
  // Calculate raw monthly sums
  const monthlySums: { [key: string]: number } = {};
  monthsOrdered.forEach(m => { monthlySums[m] = 0; });
  allInvoices.forEach(i => {
    if (monthlySums[i.month] !== undefined) {
      monthlySums[i.month] += i.amount;
    } else {
      monthlySums[i.month] = i.amount;
    }
  });

  // Calculate cumulative trajectory
  let cumulativeTracker = 0;
  const cumulativeData = monthsOrdered.map(m => {
    cumulativeTracker += monthlySums[m];
    return {
      month: m,
      monthly: monthlySums[m],
      cumulative: cumulativeTracker
    };
  });

  const maxCumulative = Math.max(...cumulativeData.map(d => d.cumulative), 1000);
  const chartCeiling = Math.ceil(maxCumulative / 1000) * 1000;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Ausgezahlt":
        return <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">Ausgezahlt</span>;
      case "Prüfung":
        return <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">Prüfung</span>;
      case "Eingereicht":
        return <span className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full">Eingereicht</span>;
      default:
        return null;
    }
  };

  const handleAddSimulatedInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebtorText.trim()) return;
    const newInv = {
      id: `RE-2026-${Math.floor(5000 + Math.random() * 4000)}`,
      month: newDebtorMonth,
      debtor: newDebtorText.trim(),
      amount: newDebtorAmount,
      status: newDebtorStatus
    };
    setHistoricalInvoices([...historicalInvoices, newInv]);
    setNewDebtorText("");
  };

  const handleDeleteSimulatedInvoice = (id: string) => {
    setHistoricalInvoices(historicalInvoices.filter(i => i.id !== id));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900" id="senate-invoicer-root">
      {/* Module Title */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
          Berliner Senat Abrechnungs- & Rechnungsmodul
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Rechnen Sie die außergerichtliche Schuldenbereinigung (§ 305 Abs. 1 Nr. 1 InsO) direkt mit der Kasse der Senatsverwaltung (Berlin-Pauschalen) oder über reguläre Beratungshilfe des Amtsgerichts (RVG) ab.
        </p>
      </div>

      {/* Tab Navigation inside senate invoicer */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-2">
        <button
          onClick={() => setSubTab("invoice")}
          className={`pb-3 px-4 text-xs font-bold transition-all relative border-b-2 hover:text-slate-900 dark:hover:text-white cursor-pointer ${
            subTab === "invoice"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold"
              : "border-transparent text-slate-400 dark:text-slate-500"
          }`}
          id="senat-tab-invoice"
        >
          <span className="flex items-center gap-1.5">
            <Calculator className="h-4 w-4" />
            Amtlicher Abrechnungs-Antrag
          </span>
        </button>
        <button
          onClick={() => setSubTab("stats")}
          className={`pb-3 px-4 text-xs font-bold transition-all relative border-b-2 hover:text-slate-900 dark:hover:text-white cursor-pointer ${
            subTab === "stats"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold"
              : "border-transparent text-slate-400 dark:text-slate-500"
          }`}
          id="senat-tab-stats"
        >
          <span className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Erstattungen & Senatstracker
            <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 text-[9px] px-1.5 py-0.5 rounded-full font-black leading-none">
              Live-Statistik
            </span>
          </span>
        </button>
      </div>

      {subTab === "invoice" && (
        <div className="space-y-4" id="invoice-subtab-container">
          
          {/* Plausibilitätsprüfung & Warnungen */}
          {(() => {
            const warnings: string[] = [];
            
            // 1. Name Check
            if (debtorName.trim().toLowerCase() !== profileName.trim().toLowerCase()) {
              warnings.push(
                `Abweichender Name: Rechnungs-Empfänger lautet "${debtorName}", die Kanzleiakte verzeichnet jedoch "${profileName}".`
              );
            }

            // 2. Creditor Count Check
            if (creditorsCount !== profileDebtsCount) {
              warnings.push(
                `Abweichende Gläubiger-Anzahl: Der Abrechnung liegen ${creditorsCount} Gläubiger zugrunde, in der Kanzleiakte sind jedoch ${profileDebtsCount} erfasst.`
              );
            }

            // 3. RVG Beratungshilfe/Income Check
            if (modelType === "rvg_itemized" && profileNetIncome > 1400) {
              warnings.push(
                `Beratungshilfe-Prüfung (RVG): Mandant hat mtl. Nettoeinkommen von EUR ${profileNetIncome.toLocaleString("de-DE", { minimumFractionDigits: 2 })}. Beratungshilfe wird bei Einkommen über ca. 1.400 EUR vom Amtsgericht i.d.R. abgelehnt.`
              );
            }

            // 4. Senat Flat/Income Check
            if (modelType === "senat_flat" && profileNetIncome > 2000) {
              warnings.push(
                `Senats-Prüfung: Mandant hat mtl. Nettoeinkommen von EUR ${profileNetIncome.toLocaleString("de-DE", { minimumFractionDigits: 2 })}. Gemäß Berliner AV-InsO sind Gutverdiener ggf. eigenanteilspflichtig.`
              );
            }

            if (warnings.length > 0) {
              return (
                <div className="p-4 bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900 rounded-xl space-y-2 text-xs text-amber-850 dark:text-amber-300 shadow-sm animate-fadeIn" id="plausibility-check-panel">
                  <div className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Automatische Plausibilitätsprüfung d. Abrechnung (§ 305 f. InsO / AV-InsO)</span>
                    <span className="ml-auto bg-amber-105 text-amber-900 dark:bg-amber-900 dark:text-amber-100 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide">
                      {warnings.length} Hinweis{warnings.length > 1 ? "e" : ""}
                    </span>
                  </div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400">
                    Die Kanzleisoftware hat die Abrechnungs-Eckdaten mit den im <b>Mandantenprofil</b> hinterlegten Realdaten abgeglichen:
                  </div>
                  <ul className="space-y-1 pl-4 list-disc text-[11px] font-semibold text-amber-900 dark:text-amber-300">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                  <div className="text-[9px] text-amber-550 dark:text-amber-500 italic pt-1 border-t border-amber-150 dark:border-amber-900/40">
                    ⚠️ Wichtig: Bitte korrigieren Sie die Rechnungsdaten oder aktualisieren Sie das Mandantenprofil, um Abrechnungs-Konflikte mit der Justizkasse oder dem Gericht zu vermeiden.
                  </div>
                </div>
              );
            } else {
              return (
                <div className="p-4 bg-emerald-55/50 border border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900 rounded-xl flex items-center gap-2.5 text-xs text-emerald-850 dark:text-emerald-450 shadow-sm animate-fadeIn" id="plausibility-check-success">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span className="font-extrabold text-emerald-900 dark:text-emerald-300">Plausibilitätsprüfung bestanden:</span>
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-400">Sämtliche Rechnungsdaten stimmen exakt mit dem Mandantenprofil überein. Abrechnung ist fehlerfrei.</span>
                </div>
              );
            }
          })()}

          <div className="grid gap-6 grid-cols-1 xl:grid-cols-12">
        {/* Left column: Controls */}
        <div className="col-span-1 xl:col-span-5 space-y-4">
          
          {/* Section: Client Details */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-150 dark:border-slate-850 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> Mandant & Verfahren
            </h3>
            
            <div className="grid gap-3 grid-cols-2">
              <div className="col-span-2">
                <label className="text-[10px] text-slate-450 dark:text-slate-500 font-bold block mb-1">MANDANT (AUS AKTE SYNCHRONISIERT)</label>
                <input 
                  type="text" 
                  value={debtorName} 
                  onChange={(e) => setDebtorName(e.target.value)}
                  className="w-full rounded-lg border border-slate-250 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 font-bold block mb-1">RECHNUNGSNUMMER</label>
                <input 
                  type="text" 
                  value={invoiceNumber} 
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-250 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 font-bold block mb-1">GLÄUBIGER-ANZAHL</label>
                <input 
                  type="number" 
                  value={creditorsCount} 
                  onChange={(e) => setCreditorsCount(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-250 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 font-bold block mb-1">BERATUNGSHILFE AZ</label>
                <input 
                  type="text" 
                  value={shReference} 
                  onChange={(e) => setShReference(e.target.value)}
                  className="w-full rounded-lg border border-slate-250 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  placeholder="50 II 123/26"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 font-bold block mb-1">RECHNUNGSDATUM</label>
                <input 
                  type="date" 
                  value={billingDate} 
                  onChange={(e) => setBillingDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-250 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Section: Model selection */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-150 dark:border-slate-850 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-550 dark:text-slate-400 flex items-center gap-1">
              <Calculator className="h-3.5 w-3.5" /> Gebühren-Abrechnungsmodell
            </h3>
            
            <div className="flex gap-2">
              <button
                onClick={() => setModelType("senat_flat")}
                className={`flex-1 py-2 text-center rounded-lg border font-bold text-xs transition-colors cursor-pointer ${
                  modelType === "senat_flat"
                    ? "bg-slate-900 text-white border-transparent dark:bg-white dark:text-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-805 dark:border-slate-800 dark:text-slate-300"
                }`}
              >
                Senats-Flat (Berlin e.V.)
              </button>
              <button
                onClick={() => setModelType("rvg_itemized")}
                className={`flex-1 py-2 text-center rounded-lg border font-bold text-xs transition-colors cursor-pointer ${
                  modelType === "rvg_itemized"
                    ? "bg-slate-900 text-white border-transparent dark:bg-white dark:text-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300"
                }`}
              >
                RVG Amtsgericht (VV)
              </button>
            </div>

            {/* Model specific checkboxes */}
            {modelType === "senat_flat" ? (
              <div className="space-y-2 pt-2 text-xs border-t border-slate-201 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-350">
                  <input 
                    type="checkbox" 
                    checked={flatBasis} 
                    onChange={(e) => setFlatBasis(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  />
                  <span>
                    Berliner Grundpauschale (<b>€ {getFlatRateReward().toFixed(2)}</b>)
                    <span className="text-[10px] text-slate-400 block -mt-0.5 font-medium">Basiert dynamisch auf {creditorsCount} Gläubigern</span>
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-355 pt-1">
                  <input 
                    type="checkbox" 
                    checked={flatScanner} 
                    onChange={(e) => setFlatScanner(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  />
                  <span>Scanner- & IT-Aktenzuschlag (<b>€ 25,00</b>)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-355 pt-1">
                  <input 
                    type="checkbox" 
                    checked={additionalBonus} 
                    onChange={(e) => setAdditionalBonus(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  />
                  <span>Sonderaufwand bei Altschulden (<b>€ 75,00</b>)</span>
                </label>
              </div>
            ) : (
              <div className="space-y-2 pt-2 text-xs border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input 
                    type="checkbox" 
                    checked={rvg2503} 
                    onChange={(e) => setRvg2503(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  />
                  <span>VV 2503: Geschäftsgebühr (<b>€ 85,00</b>)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 pt-1">
                  <input 
                    type="checkbox" 
                    checked={rvg2508} 
                    onChange={(e) => setRvg2508(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  />
                  <span>VV 2508: Einigungsgebühr (<b>€ 150,00</b>)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 pt-1">
                  <input 
                    type="checkbox" 
                    checked={rvg7002} 
                    onChange={(e) => setRvg7002(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  />
                  <span>VV 7002: Auslagenpauschale (<b>€ 20,00</b>)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 pt-1">
                  <input 
                    type="checkbox" 
                    checked={rvg7000} 
                    onChange={(e) => setRvg7000(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  />
                  <span>VV 7000: Scanner / Kopien (<b>€ 15,00</b>)</span>
                </label>
              </div>
            )}

            {/* Tax Settings */}
            <div className="pt-3 border-t border-slate-150 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-350">
                <input 
                  type="checkbox" 
                  checked={withVat} 
                  onChange={(e) => setWithVat(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-350 text-slate-900"
                />
                <span>Zuzüglich 19% Umsatzsteuer ausweisen (Kanzlei-Option)</span>
              </label>
            </div>
          </div>

          {/* Section: Bank Settings */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-150 dark:border-slate-850 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" /> Erstattungs-Bankkonto
            </h3>
            
            <div className="space-y-2.5">
              <div>
                <label className="text-[9px] text-slate-400 font-bold block mb-0.5">ZAHLUNGSEMPFÄNGER</label>
                <input 
                  type="text" 
                  value={recipient} 
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full rounded-lg border border-slate-205 bg-white px-2 py-1 text-xs text-slate-850 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-400 font-bold block mb-0.5">IBAN</label>
                <input 
                  type="text" 
                  value={iban} 
                  onChange={(e) => setIban(e.target.value)}
                  className="w-full rounded-lg border border-slate-205 bg-white px-2 py-1 text-xs font-mono text-slate-850 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right column: Document Live Preview */}
        <div className="col-span-1 xl:col-span-7 flex flex-col space-y-4">
          
          <div className="border border-slate-200 dark:border-slate-800 shadow-inner bg-white text-slate-900 rounded-2xl overflow-hidden flex-1 flex flex-col justify-between min-h-[480px]">
            {/* Live preview header */}
            <div className="bg-slate-50 p-3 pt-3.5 border-b border-slate-150 text-[10px] font-mono font-bold text-slate-550 flex justify-between items-center dark:bg-slate-950/40 dark:border-slate-850">
              <span>ABRECHNUNGS-LIVEVORSCHAU (ERSTATTUNGS-ANTRAG)</span>
              <span className="text-[9px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded font-black uppercase tracking-wider">
                {modelType === "senat_flat" ? "Senats-Pauschale" : "RVG Abrechnung"}
              </span>
            </div>

            {/* Document body preview */}
            <div className="printable-area p-8 bg-white text-slate-800 max-h-[520px] overflow-y-auto font-sans leading-relaxed text-xs space-y-5" id="senate-invoice-dina4-prev">
              
              {/* Header Letterhead with Official Logo */}
              <div className="flex justify-between items-start gap-4 border-b border-slate-300 pb-4">
                <div className="flex items-center gap-3">
                  <img 
                    src={LOGO_DATA_URL} 
                    alt="Gesetzeslotse BERLIN e.V. Logo" 
                    className="h-12 w-auto object-contain shrink-0" 
                  />
                  <div>
                    <h1 className="font-extrabold text-sm uppercase text-slate-900 tracking-wide">
                      Gesetzeslotse BERLIN e.V.
                    </h1>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Anerkannte Stelle nach § 305 Abs. 1 Nr. 1 InsO • Alt-Moabit 90 D • 10559 Berlin
                    </p>
                    <p className="text-[9px] text-slate-400">
                      Zulassungs-ID: SenJustVaD-BE-305-1998 • Tel: (030) 9876-5432
                    </p>
                  </div>
                </div>
                <div className="text-right text-[10px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200 shrink-0">
                  <p className="font-bold text-slate-900">Rechnungs-Nr.: {invoiceNumber}</p>
                  <p>Datum: {new Date(billingDate).toLocaleDateString("de-DE")}</p>
                  <p>Kanzlei-AZ: {fileReference}</p>
                </div>
              </div>

              {/* Recipient Window & Metadata */}
              <div className="grid grid-cols-12 gap-4 items-start pt-1">
                {/* Empfängerfenster DIN 5008 */}
                <div className="col-span-7 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-[11px] leading-relaxed">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Empfänger (Kostenträger):</span>
                  {modelType === "senat_flat" ? (
                    <div>
                      <p className="font-extrabold text-slate-900">Senatsverwaltung für Justiz, Vielfalt und Antidiskriminierung</p>
                      <p>Referat II D - Schuldnerberatungsstellen-Erstattung</p>
                      <p>Salzburger Str. 21-25</p>
                      <p className="font-semibold">10825 Berlin (Schöneberg)</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-extrabold text-slate-900">Amtsgericht Wedding</p>
                      <p>Zentrale Festsetzungsstelle für Beratungshilfe</p>
                      <p>Brunnenplatz 1</p>
                      <p className="font-semibold">13357 Berlin</p>
                    </div>
                  )}
                </div>

                {/* Verfahrens-Referenz-Box */}
                <div className="col-span-5 p-3 border border-slate-200 rounded-lg text-[10px] space-y-1 text-slate-700 bg-slate-50">
                  <p className="font-bold text-slate-900 uppercase text-[9px] tracking-wide border-b border-slate-200 pb-0.5">Verfahrensdaten</p>
                  <p>Beratungshilfe-AZ: <b className="text-slate-900 font-mono">{shReference}</b></p>
                  <p>Schuldner/Mandant: <b className="text-slate-900">{debtorName}</b></p>
                  <p>Erfasste Gläubiger: <b className="text-indigo-700">{creditorsCount} Parteien</b></p>
                </div>
              </div>

              {/* Document Title */}
              <div className="pt-2 border-b-2 border-slate-900 pb-2">
                <h2 className="font-black text-sm uppercase text-slate-900 tracking-wide">
                  {modelType === "senat_flat" 
                    ? "Kostenrechnung / Erstattungsantrag nach Berliner Förderrichtlinie (§ 305 InsO)" 
                    : "Antrag auf Vergütungsfestsetzung für Beratungshilfe (§ 45 RVG / VV 2503 ff.)"}
                </h2>
                <p className="text-[10px] text-slate-600 italic mt-0.5">
                  Abrechnung der Aufwendungen für die Durchführung des außergerichtlichen Einigungsversuchs
                </p>
              </div>

              {/* Klare Tabellarische Gebührenaufstellung */}
              <div className="space-y-2">
                <h3 className="font-bold text-xs uppercase text-slate-900 tracking-wider">
                  Gebührenaufstellung & Erstattungspositionen
                </h3>
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-800 text-[10px] uppercase font-bold">
                      <th className="p-2 w-10 text-center">Pos.</th>
                      <th className="p-2">Gebührentatbestand / Gegenstand</th>
                      <th className="p-2 text-center w-28">Grundlage</th>
                      <th className="p-2 text-right w-24">Betrag (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {modelType === "senat_flat" ? (
                      <>
                        {flatBasis && (
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 text-center font-mono font-bold text-slate-500">1</td>
                            <td className="p-2 font-medium">
                              Landes-Basispauschale Berlin für anerkannte Schuldnerberatungsstellen
                              <span className="block text-[9px] text-slate-500 font-normal">
                                Pauschale Erstattung für Schuldenbereinigungsverfahren ({creditorsCount} Gläubiger)
                              </span>
                            </td>
                            <td className="p-2 text-center text-slate-600 font-mono text-[10px]">§ 305 InsO / Senat</td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">
                              {getFlatRateReward().toFixed(2)} €
                            </td>
                          </tr>
                        )}
                        {flatScanner && (
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 text-center font-mono font-bold text-slate-500">2</td>
                            <td className="p-2 font-medium">
                              IT-Aufwand & Digitale Koordination (Digitalisierungs- & Scanzuschlag)
                            </td>
                            <td className="p-2 text-center text-slate-600 font-mono text-[10px]">Zuschlag IT</td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">25,00 €</td>
                          </tr>
                        )}
                        {additionalBonus && (
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 text-center font-mono font-bold text-slate-500">3</td>
                            <td className="p-2 font-medium">
                              Erhöhter Integrationsaufwand (Komplexförderungs-Bonus)
                            </td>
                            <td className="p-2 text-center text-slate-600 font-mono text-[10px]">Sonderzuschlag</td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">75,00 €</td>
                          </tr>
                        )}
                      </>
                    ) : (
                      <>
                        {rvg2503 && (
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 text-center font-mono font-bold text-slate-500">1</td>
                            <td className="p-2 font-medium">Geschäftsgebühr (außergerichtliches Vertretungsverfahren)</td>
                            <td className="p-2 text-center text-slate-700 font-mono text-[10px]">VV 2503 RVG</td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">85,00 €</td>
                          </tr>
                        )}
                        {rvg2508 && (
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 text-center font-mono font-bold text-slate-500">2</td>
                            <td className="p-2 font-medium">Einigungsgebühr (Erfolgreiche oder gütliche Gläubigereinigung)</td>
                            <td className="p-2 text-center text-slate-700 font-mono text-[10px]">VV 2508 RVG</td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">150,00 €</td>
                          </tr>
                        )}
                        {rvg7002 && (
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 text-center font-mono font-bold text-slate-500">3</td>
                            <td className="p-2 font-medium">Pauschale für Entgelte für Postdienstleistungen & Telekommunikation</td>
                            <td className="p-2 text-center text-slate-700 font-mono text-[10px]">VV 7002 RVG</td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">20,00 €</td>
                          </tr>
                        )}
                        {rvg7000 && (
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 text-center font-mono font-bold text-slate-500">4</td>
                            <td className="p-2 font-medium">Dokumentenpauschale & Kopierauslagen für Gläubigeranschreiben</td>
                            <td className="p-2 text-center text-slate-700 font-mono text-[10px]">VV 7000 RVG</td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">15,00 €</td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary Card */}
              <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-[11px] space-y-1.5 font-sans">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Zwischensumme (Netto Erstattungsbetrag):</span>
                  <span className="font-mono font-bold text-slate-900">{getSubtotal().toFixed(2)} €</span>
                </div>
                {withVat ? (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Umsatzsteuer (19% gesetzlich):</span>
                    <span className="font-mono font-bold text-slate-900">{getVatAmount().toFixed(2)} €</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-slate-500 text-[10px]">
                    <span>Umsatzsteuer (19%):</span>
                    <span>0,00 € (Steuerfreie Gemeinnützigkeit gem. § 4 Nr. 26 UStG)</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-300 font-black text-xs text-indigo-900">
                  <span className="uppercase tracking-wide">Auszuzahlender Erstattungsbetrag (GESAMT):</span>
                  <span className="font-mono text-sm text-indigo-800 font-extrabold">{getTotalPrice().toFixed(2)} €</span>
                </div>
              </div>

              {/* Bank Transfer Block */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-700 space-y-1">
                <span className="font-bold text-slate-900 uppercase text-[9px] tracking-wider block">
                  Bankverbindung für die Erstattung
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <p>Zahlungsempfänger: <b className="font-sans text-slate-900">{recipient}</b></p>
                  <p>Kreditinstitut: <b className="font-sans text-slate-900">{bankName}</b></p>
                  <p>IBAN: <b className="text-slate-900 font-bold">{iban}</b></p>
                  <p>BIC: <b className="text-slate-900 font-bold">{bic}</b></p>
                </div>
                <p className="text-[9px] text-slate-500 italic mt-1 pt-1 border-t border-slate-200">
                  Verwendungszweck bei Anweisung: <b>{invoiceNumber} / {fileReference} / {debtorName}</b>
                </p>
              </div>

              {/* Legal Confirmation and Signoff */}
              <div className="pt-2 text-[9px] text-slate-500 leading-relaxed border-t border-slate-200 space-y-3" data-break-avoid="true">
                <p>
                  Geprüft nach den Leitlinien für die Gewährung von Kanzlei-Erstattungen im Land Berlin (Stand 2026). Mit Übersendung dieser Urkunde wird die ordnungsgemäße Durchführung des außergerichtlichen Vergleichsversuchs gem. § 305 Abs. 1 Nr. 1 InsO versichert.
                </p>

                <div className="flex justify-between items-end pt-3">
                  <div>
                    <p className="font-bold text-slate-700">Ort, Datum:</p>
                    <p className="font-mono text-slate-900">Berlin, den {new Date(billingDate).toLocaleDateString("de-DE")}</p>
                  </div>
                  <div className="text-right">
                    <div className="border-b border-slate-900 w-48 mb-1"></div>
                    <p className="font-bold text-slate-900">Gesetzeslotse BERLIN e.V.</p>
                    <p className="text-slate-500">Stempel & amtliche Signatur</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Document Actions Footer inside CARD */}
            <div className="border-t border-slate-150 p-4 bg-slate-50 text-slate-700 flex gap-2 justify-end dark:bg-slate-950/20 dark:border-slate-850">
              <button
                onClick={() => window.print()}
                className="py-2 px-3 border border-slate-350 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Printer className="h-4 w-4" />
                Drucken
              </button>

              <button
                onClick={() => exportElementToPdf("senate-invoice-dina4-prev", `Senatsabrechnung_${invoiceNumber}`)}
                className="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>

              <button
                onClick={downloadInvoiceDocx}
                className="py-2 px-3 bg-slate-900 hover:bg-slate-850 text-white dark:bg-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Download className="h-4 w-4 text-amber-400" />
                Word (DOCX)
              </button>
            </div>

          </div>

          {/* Quick Notice */}
          <div className="p-3.5 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-[11px] text-slate-700 leading-relaxed flex items-start gap-2.5 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-slate-300">
            <AlertCircle className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">Berliner Unterstützungskasse Info</span>
              Sämtliche Anträge auf Erstattungszahlungen des außergerichtlichen Einigungsversuches müssen laut Amtsgerichtsordnung Berlin binnen <b>12 Monaten</b> nach Erklärung des Scheiterns bzw. Abschlusses des Plans eingereicht werden. Spätere Einreichungen verfallen ohne Anspruch auf Entschädigung.
            </div>
          </div>

        </div>
      </div>
    </div>
      )}

      {subTab === "stats" && (
        <div className="space-y-6" id="senate-tracker-stats-view">
          {/* Stats Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-5 bg-indigo-50/60 border border-slate-150 rounded-2xl dark:bg-indigo-950/20 dark:border-slate-800 flex items-center gap-4 shadow-sm" id="stats-total">
              <div className="p-3 bg-indigo-500 rounded-xl text-white">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black text-slate-450 dark:text-slate-500 tracking-wider block">Bisher abgerechnet</span>
                <span className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">€ {totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-5 bg-emerald-50/50 border border-emerald-150 rounded-2xl dark:bg-emerald-950/10 dark:border-emerald-950/30 flex items-center gap-4 shadow-sm" id="stats-paid">
              <div className="p-3 bg-emerald-500 rounded-xl text-white">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black text-slate-450 dark:text-slate-500 tracking-wider block">Bereits ausgezahlt</span>
                <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">€ {paidAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-5 bg-amber-50/50 border border-amber-150 rounded-2xl dark:bg-amber-950/10 dark:border-amber-950/30 flex items-center gap-4 shadow-sm" id="stats-pending">
              <div className="p-3 bg-amber-500 rounded-xl text-white">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black text-slate-450 dark:text-slate-500 tracking-wider block">In Prüfung (Senat)</span>
                <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">€ {pendingAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-5 bg-blue-50/50 border border-blue-150 rounded-2xl dark:bg-blue-950/10 dark:border-blue-950/30 flex items-center gap-4 shadow-sm" id="stats-submitted">
              <div className="p-3 bg-blue-500 rounded-xl text-white">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black text-slate-450 dark:text-slate-500 tracking-wider block">Eingereichte Anträge</span>
                <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">€ {submittedAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 grid-cols-1 xl:grid-cols-12">
            
            {/* Chart Area */}
            <div className="col-span-1 xl:col-span-8 p-6 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-4" id="stats-chart-card">
              <div className="flex justify-between items-center pb-2 border-b border-slate-150 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <TrendingUp className="h-4.5 w-4.5 text-indigo-505 text-indigo-500" />
                    Kumulierter Erstattungs-Fortschritt
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Aufsummierte monatliche Erstattungssummen der Kanzlei gegenüber dem Berliner Senat</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono">
                    Zielerreichung: {totalAmount > 0 ? (paidAmount / totalAmount * 100).toFixed(0) : "0"}% ausgezahlt
                  </span>
                </div>
              </div>

              {/* Graphic container with inline SVG */}
              <div className="relative w-full pt-4 pb-2" id="cumulative-chart-container">
                <svg viewBox="0 0 600 260" className="w-full h-auto overflow-visible" id="cumulative-chart-grid-svg">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const value = (chartCeiling / 4) * idx;
                    const y = 220 - (value / chartCeiling) * 200;
                    return (
                      <g key={idx}>
                        <line 
                          x1="60" 
                          y1={y} 
                          x2="560" 
                          y2={y} 
                          stroke="#cbd5e1" 
                          strokeWidth="1" 
                          strokeDasharray="4,4" 
                          className="opacity-40 dark:stroke-slate-800" 
                        />
                        <text 
                          x="50" 
                          y={y + 3} 
                          textAnchor="end" 
                          className="text-[9px] font-mono font-bold fill-slate-400 dark:fill-slate-500"
                        >
                          €{value.toFixed(0)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area fill path under curve */}
                  <path
                    d={`
                      M 60,220
                      L 60,${220 - (cumulativeData[0].cumulative / chartCeiling) * 200}
                      L 160,${220 - (cumulativeData[1].cumulative / chartCeiling) * 200}
                      L 260,${220 - (cumulativeData[2].cumulative / chartCeiling) * 200}
                      L 360,${220 - (cumulativeData[3].cumulative / chartCeiling) * 200}
                      L 460,${220 - (cumulativeData[4].cumulative / chartCeiling) * 200}
                      L 560,${220 - (cumulativeData[5].cumulative / chartCeiling) * 200}
                      L 560,220
                      Z
                    `}
                    fill="url(#chartGrad)"
                  />

                  {/* Connecting Line stroke */}
                  <path
                    d={`
                      M 60,${220 - (cumulativeData[0].cumulative / chartCeiling) * 200}
                      L 160,${220 - (cumulativeData[1].cumulative / chartCeiling) * 200}
                      L 260,${220 - (cumulativeData[2].cumulative / chartCeiling) * 200}
                      L 360,${220 - (cumulativeData[3].cumulative / chartCeiling) * 200}
                      L 460,${220 - (cumulativeData[4].cumulative / chartCeiling) * 200}
                      L 560,${220 - (cumulativeData[5].cumulative / chartCeiling) * 200}
                    `}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data Points (circle and tags) */}
                  {cumulativeData.map((d, idx) => {
                    const x = 60 + idx * 100;
                    const y = 220 - (d.cumulative / chartCeiling) * 200;
                    return (
                      <g key={idx} className="group cursor-pointer">
                        <circle 
                          cx={x} 
                          cy={y} 
                          r="10" 
                          className="fill-transparent hover:fill-indigo-500/10 transition-all duration-150" 
                        />
                        
                        <circle 
                          cx={x} 
                          cy={y} 
                          r="5" 
                          className="fill-white stroke-indigo-600 stroke-2 dark:fill-slate-900 dark:stroke-indigo-400" 
                        />

                        {/* Text Value Label directly on top */}
                        <g transform={`translate(${x}, ${y - 12})`}>
                          <rect 
                            x="-28" 
                            y="-13" 
                            width="56" 
                            height="16" 
                            rx="4" 
                            className="fill-slate-850 dark:fill-slate-700 text-white" 
                          />
                          <text 
                            y="-2" 
                            textAnchor="middle" 
                            className="text-[9px] font-bold font-mono fill-white text-white"
                          >
                            €{d.cumulative.toFixed(0)}
                          </text>
                        </g>

                        {/* Month name at bottom */}
                        <text
                          x={x}
                          y="240"
                          textAnchor="middle"
                          className="text-[10px] font-bold fill-slate-500 dark:fill-slate-400"
                        >
                          {d.month}
                        </text>

                        {/* Month raw billing summary underneath month name */}
                        <text
                          x={x}
                          y="252"
                          textAnchor="middle"
                          className="text-[8px] font-mono font-bold fill-indigo-600 dark:fill-indigo-400"
                        >
                          (+€{d.monthly.toFixed(0)})
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Progress info explanation */}
              <div className="p-3.5 bg-indigo-50 dark:bg-slate-950/40 rounded-xl border border-indigo-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed flex items-center gap-2">
                <span className="text-base select-none">📊</span>
                <span>
                  <b>Interaktiver Tracker:</b> Der Juni-Wert schließt Ihre aktuelle, im vorigen Reiter bearbeitete Akte (<b>€ {currentInvoiceAmount.toFixed(2)}</b>) live in die Berechnung ein. Verändern Sie die Gläubigeranzahl oder Flat-Pauschalen dort, um die Simulation anzupassen.
                </span>
              </div>
            </div>

            {/* Simulated Data Management Form */}
            <div className="col-span-1 xl:col-span-4 p-5 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl flex flex-col justify-between" id="stats-form-card">
              <div className="space-y-4">
                <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 flex items-center gap-1.5 font-bold">
                    <Plus className="h-4 w-4 text-emerald-500" />
                    Manuell Abrechnung Buchen
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Erweiteren Sie fiktive oder historische Erstattungen, um den kumulativen Jahresfortgang zu simulieren.</p>
                </div>

                <form onSubmit={handleAddSimulatedInvoice} className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Name des Mandanten</label>
                    <input 
                      type="text" 
                      placeholder="z.B. Frank Herberg" 
                      value={newDebtorText}
                      onChange={(e) => setNewDebtorText(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-250"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Monat</label>
                      <select
                        value={newDebtorMonth}
                        onChange={(e) => setNewDebtorMonth(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-250"
                      >
                        {monthsOrdered.map(mo => (
                          <option key={mo} value={mo}>{mo}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Erstattungsbetrag (€)</label>
                      <input 
                        type="number" 
                        value={newDebtorAmount}
                        onChange={(e) => setNewDebtorAmount(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-250 font-bold font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Bearbeitungsstatus des Senats</label>
                    <div className="flex gap-1.5">
                      {["Eingereicht", "Prüfung", "Ausgezahlt"].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setNewDebtorStatus(st)}
                          className={`flex-1 py-1 text-[10px] rounded border font-semibold transition-all cursor-pointer ${
                            newDebtorStatus === st
                              ? "bg-indigo-600 text-white border-transparent"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {st === "Ausgezahlt" ? "Ausbezahlt" : st === "Prüfung" ? "In Prüfung" : "Eingereicht"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-850 rounded-xl text-xs font-bold transition-all mt-2.5 flex items-center justify-center gap-1 cursor-pointer font-extrabold"
                  >
                    <Plus className="h-4 w-4" />
                    Erstattung buchen
                  </button>
                </form>
              </div>

              <div className="mt-4 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl dark:bg-slate-950/40 dark:border-slate-800 text-[10px] text-slate-400 uppercase font-mono tracking-wider flex items-center justify-between">
                <span>Zahlungs-Schnittstelle:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">BERLIN KASSE</span>
              </div>
            </div>

          </div>

          {/* Historical Billing listings */}
          <div className="p-6 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-805 rounded-2xl space-y-4" id="stats-list-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Einzelaufstellung aller Rechnungsanträge
                </h3>
                <p className="text-[11px] text-slate-450 mt-0.5">Offizielles Erstattungsverzeichnis zur Kassenprüfung nach § 305 InsO</p>
              </div>
              <span className="text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-3 py-1 rounded-lg">
                Insgesamt {allInvoices.length} Forderungen
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left divide-y divide-slate-150 dark:divide-slate-850">
                <thead className="bg-slate-50/80 dark:bg-slate-950/40 text-[10px] font-black uppercase tracking-wider text-slate-450">
                  <tr>
                    <th className="px-4 py-2.5">Rechnungs-Nr.</th>
                    <th className="px-4 py-2.5">Abrechnungsmonat</th>
                    <th className="px-4 py-2.5">Gegenstand (Mandant)</th>
                    <th className="px-4 py-2.5">Vergütungshöhe</th>
                    <th className="px-4 py-2.5 text-center">Prüfstatus</th>
                    <th className="px-4 py-2.5 text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850/80">
                  {allInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-500 dark:text-slate-450">{inv.id}</td>
                      <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-350">{inv.month}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-205">{inv.debtor}</td>
                      <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400 font-mono">€ {inv.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(inv.status)}</td>
                      <td className="px-4 py-3 text-right">
                        {inv.id !== invoiceNumber ? (
                          <button
                            onClick={() => handleDeleteSimulatedInvoice(inv.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Abrechnungseintrag löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-450 italic block pr-2">Aktive Akte</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
