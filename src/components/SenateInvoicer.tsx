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
  BarChart3
} from "lucide-react";
import { jsPDF } from "jspdf";
import { DebtItem } from "../types";

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

  // Sync with localStorage debts portfolio
  useEffect(() => {
    const handleSync = () => {
      const profile = localStorage.getItem("gesetzeslotse_active_profile") || "schmidt";
      setActiveProfile(profile);

      const name = localStorage.getItem("gesetzeslotse_active_debtor_name") || "Maximilian Schmidt";
      setDebtorName(name);

      const portfolioKey = `gesetzeslotse_debts_portfolio_${profile}`;
      const stored = localStorage.getItem(portfolioKey);
      if (stored) {
        try {
          const debts: DebtItem[] = JSON.parse(stored);
          setCreditorsCount(debts.length);
          // Set appropriate file references
          setFileReference(`GLB-2026-${profile === "schmidt" ? "3920" : "5512"}`);
        } catch (e) {
          console.error(e);
        }
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

  // PDF Export
  const downloadInvoicePdf = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      doc.setFont("helvetica", "normal");
      
      // Sender area
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Gesetzeslotse BERLIN e.V. • Alt-Moabit 90 D • 10559 Berlin", 20, 20);

      // Recipient addresses regarding billing model
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      if (modelType === "senat_flat") {
        doc.setFont("helvetica", "bold");
        doc.text("Senatsverwaltung für Justiz, Vielfalt und Antidiskriminierung", 20, 30);
        doc.setFont("helvetica", "normal");
        doc.text("Referat II D - Schuldnerberatungsstelle-Erstattung", 20, 34);
        doc.text("Salzburger Str. 21-25", 20, 38);
        doc.text("10825 Berlin (Schöneberg)", 20, 42);
      } else {
        doc.setFont("helvetica", "bold");
        doc.text("Amtsgericht Wedding", 20, 30);
        doc.setFont("helvetica", "normal");
        doc.text("– Zentrale Erstellungsstelle für Beratungshilfe –", 20, 34);
        doc.text("Brunnenplatz 1", 20, 38);
        doc.text("13357 Berlin", 20, 42);
      }

      // Metadata box right side
      const rightX = 140;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`Rechnungs-Nr:  ${invoiceNumber}`, rightX, 30);
      doc.setFont("helvetica", "normal");
      doc.text(`Datum:          ${new Date(billingDate).toLocaleDateString("de-DE")}`, rightX, 35);
      doc.text(`Kanzlei-Kürzel:  GLB-305/BE`, rightX, 40);
      doc.text(`Verfahrenspfleg:  Lukas AI`, rightX, 45);

      // Separation Line
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(20, 52, 190, 52);

      // Title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      if (modelType === "senat_flat") {
        doc.text("ABRECHNUNGS-ANTRAG nach Berliner Kassen-Satzung", 20, 62);
      } else {
        doc.text("Festsetzungsantrag gem. § 55 RVG (Beratungshilfe)", 20, 62);
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Hiermit rechnen wir die Aufwendungen für die Unterstützung bei der außergerichtlichen Einigung ab:", 20, 68);

      // Client specifications block
      doc.setFillColor(248, 250, 252);
      doc.rect(20, 73, 170, 24, "F");
      doc.rect(20, 73, 170, 24);
      
      doc.setFont("helvetica", "bold");
      doc.text(`MANDANT: ${debtorName}`, 25, 79);
      doc.setFont("helvetica", "normal");
      doc.text(`Aktenzeichen:      ${fileReference}`, 25, 84);
      doc.text(`Gerichts-Geschäftsnummer (BH):   ${shReference}`, 25, 89);
      doc.text(`Gläubiger im Verzeichnis:          ${creditorsCount} erfasste Parteien`, 25 + 90, 84);

      // Table layout for Invoice Positions
      let y = 108;
      doc.setFont("helvetica", "bold");
      doc.text("Position / Abrechnungsposten", 25, y);
      doc.text("Satz / RVG VV", 130, y);
      doc.text("Netto-Betrag", 170, y, { align: "right" });

      doc.line(20, y + 2, 190, y + 2);
      y += 8;

      doc.setFont("helvetica", "normal");
      if (modelType === "senat_flat") {
        if (flatBasis) {
          doc.text(`Senats-Grundförderung für anerkannte Stellen (${creditorsCount} Gläubiger)`, 25, y);
          doc.text("Pauschal", 130, y);
          doc.text(`EUR ${getFlatRateReward().toFixed(2)}`, 170, y, { align: "right" });
          y += 8;
        }
        if (flatScanner) {
          doc.text("IT-Pauschale / Digitalisierungs-Zuschlag", 25, y);
          doc.text("Sondertatbest.", 130, y);
          doc.text("EUR 25.00", 170, y, { align: "right" });
          y += 8;
        }
        if (additionalBonus) {
          doc.text("Erhöhter Beratungsaufwand (Erschwerte Struktur)", 25, y);
          doc.text("Vergleich", 130, y);
          doc.text("EUR 75.00", 170, y, { align: "right" });
          y += 8;
        }
      } else {
        if (rvg2503) {
          doc.text("Geschäftsgebühr (außergerichtliches Verfahren)", 25, y);
          doc.text("VV 2503", 130, y);
          doc.text("EUR 85.00", 170, y, { align: "right" });
          y += 8;
        }
        if (rvg2508) {
          doc.text("Einigungsgebühr / Einigungszuschlag", 25, y);
          doc.text("VV 2508", 130, y);
          doc.text("EUR 150.00", 170, y, { align: "right" });
          y += 8;
        }
        if (rvg7002) {
          doc.text("Pauschale für Entgelte Post & Telekommunikation", 25, y);
          doc.text("VV 7002", 130, y);
          doc.text("EUR 20.00", 170, y, { align: "right" });
          y += 8;
        }
        if (rvg7000) {
          doc.text("Ablichtungs- & Scannerpauschale", 25, y);
          doc.text("VV 7000", 130, y);
          doc.text("EUR 15.00", 170, y, { align: "right" });
          y += 8;
        }
      }

      doc.line(20, y - 2, 190, y - 2);

      // Calculations block
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.text("Zwischensumme (Netto):", 120, y);
      doc.text(`EUR ${getSubtotal().toFixed(2)}`, 170, y, { align: "right" });
      y += 6;

      doc.text("Umsatzsteuer (19%):", 120, y);
      doc.text(`EUR ${getVatAmount().toFixed(2)}`, 170, y, { align: "right" });
      y += 8;

      doc.line(115, y - 4, 190, y - 4);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text("Auszuzahlender Erstattungsbetrag:", 120, y);
      doc.text(`EUR ${getTotalPrice().toFixed(2)}`, 170, y, { align: "right" });

      // Invoicing instructions and banking
      y += 24;
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("BANKVERBINDUNG FÜR DIE ERSTATTUNG:", 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(`Zahlungsempfänger:  ${recipient}`, 20, y + 5);
      doc.text(`IBAN Kontonr:       ${iban}`, 20, y + 10);
      doc.text(`Institut/BIC:       ${bankName} / ${bic}`, 20, y + 15);

      // Senate rules stamp note
      y += 26;
      doc.setFillColor(241, 245, 249);
      doc.rect(20, y, 170, 15, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(7.5);
      doc.text("Geprüft nach den Leitlinien für die Gewährung von Kanzlei-Erstattungen im Land Berlin (Stand 2026).", 23, y + 5);
      doc.setFont("helvetica", "normal");
      doc.text("Mit Übersendung dieser Urkunde wird die ordnungsgemäße Durchführung des außergerichtlichen Vergleichsversuchs gem. § 305 Abs. 1 Nr. 1 InsO versichert.", 23, y + 10);

      // Signatures base
      y += 28;
      doc.setDrawColor(203, 213, 225);
      doc.line(20, y + 10, 80, y + 10);
      doc.line(130, y + 10, 190, y + 10);
      
      doc.setTextColor(100, 116, 139);
      doc.text("Kanzleimanagement / Sachbearbeiter", 20, y + 13.5);
      doc.text("Stempel & amtliche Signatur der Stelle", 130, y + 13.5);

      doc.save(`Rechnung_Senat_${invoiceNumber}_${debtorName.replace(/\s+/g, "_")}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Fehler beim Erzeugen der Senats-Abrechnung.");
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
            <div className="p-6 text-slate-850 max-h-[440px] overflow-y-auto font-sans leading-normal text-xs space-y-4" id="senate-invoice-dina4-prev">
              
              {/* Header Letterhead */}
              <div className="flex justify-between items-start gap-4">
                <div className="text-[10px] text-slate-400">
                  <p className="font-bold text-slate-650 uppercase">Gesetzeslotse BERLIN e.V.</p>
                  <p>Alt-Moabit 90 D • 10559 Berlin</p>
                </div>
                <div className="text-right text-[10px] font-mono text-slate-500">
                  <p className="font-bold">Rech-Nr: {invoiceNumber}</p>
                  <p>Datum: {new Date(billingDate).toLocaleDateString("de-DE")}</p>
                </div>
              </div>

              {/* Recipient Address */}
              <div className="border-l border-slate-300 pl-3">
                {modelType === "senat_flat" ? (
                  <div className="text-slate-700 leading-normal">
                    <p className="font-extrabold text-[11px] text-slate-900">Senatsverwaltung für Justiz, Vielfalt und Antidiskriminierung</p>
                    <p>Referat II D - Schuldnerberatungsstellen</p>
                    <p>Salzburger Str. 21-25</p>
                    <p className="font-semibold">10825 Berlin (Schöneberg)</p>
                  </div>
                ) : (
                  <div className="text-slate-700 leading-normal">
                    <p className="font-extrabold text-[11px] text-slate-900">Amtsgericht Wedding</p>
                    <p>Zentrale Erstellungsstelle für Beratungshilfe</p>
                    <p>Brunnenplatz 1</p>
                    <p className="font-semibold">13357 Berlin</p>
                  </div>
                )}
              </div>

              {/* Title Header */}
              <div className="pt-2">
                <h3 className="font-black text-slate-900 border-b-2 border-slate-850 pb-1.5 uppercase text-xs md:text-sm tracking-wide">
                  {modelType === "senat_flat" 
                    ? "Abrechnungsantrag für außergerichtliche Beratungshilfe" 
                    : "Antrag auf Festsetzung der Vergütung für Beratungshilfe"}
                </h3>
              </div>

              {/* Client Specification Panel */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 leading-relaxed relative">
                <p className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <User className="h-4.5 w-4.5 text-slate-500" />
                  Gegenstand der Beratung: {debtorName}
                </p>
                <div className="grid grid-cols-2 gap-x-4 text-[11px] text-slate-600">
                  <p>Aktenzeichen: <span className="font-mono text-slate-950 font-bold">{fileReference}</span></p>
                  <p>Beratungshilfe-AZ: <span className="text-slate-950 font-bold">{shReference}</span></p>
                  <p>Erfasste Gläubiger: <span className="text-slate-950 font-bold">{creditorsCount}</span></p>
                </div>
              </div>

              {/* Table of items */}
              <div className="space-y-1 text-[11px]">
                <div className="grid grid-cols-12 font-bold uppercase text-slate-400 pb-1 border-b border-slate-100">
                  <div className="col-span-8">Gegenstand / Gebührentatbestand</div>
                  <div className="col-span-2 text-center">VV RVG</div>
                  <div className="col-span-2 text-right">Summe</div>
                </div>

                <div className="divide-y divide-slate-100 max-h-[140px] overflow-y-auto">
                  {modelType === "senat_flat" ? (
                    <>
                      {flatBasis && (
                        <div className="grid grid-cols-12 py-1.5 text-slate-700">
                          <div className="col-span-8">Mittel-Basispauschale Land Berlin für anerkannte Schuldnerberatungsstellen ({creditorsCount} Gläubiger)</div>
                          <div className="col-span-2 text-center text-slate-400">-</div>
                          <div className="col-span-2 text-right font-bold text-slate-950">€ {getFlatRateReward().toFixed(2)}</div>
                        </div>
                      )}
                      {flatScanner && (
                        <div className="grid grid-cols-12 py-1.5 text-slate-700">
                          <div className="col-span-8">IT-Aufwand & Digitale Koordination (Scanzuschlag)</div>
                          <div className="col-span-2 text-center text-slate-400">-</div>
                          <div className="col-span-2 text-right font-bold text-slate-950">€ 25,00</div>
                        </div>
                      )}
                      {additionalBonus && (
                        <div className="grid grid-cols-12 py-1.5 text-slate-700">
                          <div className="col-span-8">Erhöhter Integrationsaufwand (Komplexförderung)</div>
                          <div className="col-span-2 text-center text-slate-400">-</div>
                          <div className="col-span-2 text-right font-bold text-slate-950">€ 75,00</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {rvg2503 && (
                        <div className="grid grid-cols-12 py-1.5 text-slate-700">
                          <div className="col-span-8">Geschäftsgebühr (außergerichtliches Verfahren)</div>
                          <div className="col-span-2 text-center text-slate-500 font-mono">2503</div>
                          <div className="col-span-2 text-right font-bold text-slate-950">€ 85,00</div>
                        </div>
                      )}
                      {rvg2508 && (
                        <div className="grid grid-cols-12 py-1.5 text-slate-700">
                          <div className="col-span-8">Einigungsgebühr (Einigung mit Gläubigern)</div>
                          <div className="col-span-2 text-center text-slate-500 font-mono">2508</div>
                          <div className="col-span-2 text-right font-bold text-slate-950">€ 150,00</div>
                        </div>
                      )}
                      {rvg7002 && (
                        <div className="grid grid-cols-12 py-1.5 text-slate-700">
                          <div className="col-span-8">Entgelte für Postdienstleistungen & Telekommunikation</div>
                          <div className="col-span-2 text-center text-slate-500 font-mono">7002</div>
                          <div className="col-span-2 text-right font-bold text-slate-950">€ 20,00</div>
                        </div>
                      )}
                      {rvg7000 && (
                        <div className="grid grid-cols-12 py-1.5 text-slate-700">
                          <div className="col-span-8">Kopierauslagen & Scan-Bereitstellung</div>
                          <div className="col-span-2 text-center text-slate-500 font-mono">7000</div>
                          <div className="col-span-2 text-right font-bold text-slate-950">€ 15,00</div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Subsumptions details */}
                <div className="border-t border-slate-200 pt-2 space-y-1 font-semibold text-right">
                  <div className="flex justify-end gap-12 text-slate-550 text-[10px]">
                    <span>Zwischensumme Netto:</span>
                    <span className="font-mono text-slate-900">€ {getSubtotal().toFixed(2)}</span>
                  </div>
                  {withVat && (
                    <div className="flex justify-end gap-12 text-slate-550 text-[10px]">
                      <span>Umsatzsteuer (19%):</span>
                      <span className="font-mono text-slate-900">€ {getVatAmount().toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-end gap-12 text-[11px] font-black font-sans text-rose-650 pt-1.5 border-t border-slate-100">
                    <span>Erstattungsbetrag (GESAMT):</span>
                    <span className="font-mono text-rose-650">€ {getTotalPrice().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Bank Transfer Instructions */}
              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 leading-normal">
                <span className="font-black text-slate-750 block uppercase text-[8px] tracking-wider mb-1">Empfänger-Bankverbindung der anerkannten Stelle:</span>
                <p>Begünstigter: <b className="text-slate-800">{recipient}</b> • Bank: <b>{bankName}</b></p>
                <p>IBAN: <b className="text-slate-800 font-mono">{iban}</b> • BIC: <b className="font-mono">{bic}</b></p>
              </div>

            </div>

            {/* Document Actions Footer inside CARD */}
            <div className="border-t border-slate-150 p-4 bg-slate-50 text-slate-700 flex gap-3 justify-end dark:bg-slate-950/20 dark:border-slate-850">
              <button
                onClick={() => window.print()}
                className="py-2 px-3 border border-slate-350 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Printer className="h-4 w-4" />
                Drucken
              </button>

              <button
                onClick={downloadInvoicePdf}
                className="py-2.5 px-4 bg-slate-900 hover:bg-slate-850 text-white dark:bg-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Download className="h-4 w-4 text-amber-400" />
                Gebührenbescheid als PDF sichern
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
