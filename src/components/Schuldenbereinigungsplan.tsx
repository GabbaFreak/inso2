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
  Layers
} from "lucide-react";
import { DebtItem } from "../types";
import { jsPDF } from "jspdf";

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

  // Total funds to distribute
  const planTotalProposedBudget = planType === "nullplan" 
    ? 0 
    : planType === "rate" 
      ? monthlyInstallment * planDurationMonths 
      : oneTimeFund;

  const averageReductionPercentage = totalDebtSum > 0 
    ? 100 - (planTotalProposedBudget / totalDebtSum) * 100 
    : 100;

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

  // Generate clean PDF Schuldenbereinigungsplan
  const handleGeneratePdfReport = () => {
    try {
      if (debts.length === 0) {
        alert("Fügen Sie zuerst Gläubiger hinzu, um einen Bereinigungsplan zu entwerfen.");
        return;
      }

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Cover / Page 1
      doc.setFont("helvetica", "normal");
      doc.setFillColor(245, 247, 250);
      doc.rect(12, 12, 186, 273, "F");

      // Outer golden/slate border
      doc.setDrawColor(33, 41, 54);
      doc.setLineWidth(0.5);
      doc.rect(14, 14, 182, 269);

      // Title Block
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); // slate 900
      doc.text("ENTWURF & RECHTLICHER VORSCHLAG", 105, 45, { align: "center" });
      doc.setFontSize(22);
      doc.text("SCHULDENBEREINIGUNGSPLAN", 105, 55, { align: "center" });
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("gemäß § 305 Abs. 1 Nr. 1 d. Insolvenzordnung (InsO)", 105, 62, { align: "center" });

      doc.setLineWidth(0.3);
      doc.line(30, 68, 180, 68);

      // Debtor Metadata Box
      doc.setFillColor(255, 255, 255);
      doc.rect(20, 78, 170, 48, "F");
      doc.rect(20, 78, 170, 48);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("1. Angaben zum Schuldner (Mandant):", 25, 84);
      doc.setFont("helvetica", "normal");
      doc.text(`Vollständiger Name:  ${debtorName}`, 25, 91);
      doc.text(`Geburtsdatum:        ${debtorDob || "Unbekannt"}`, 25, 97);
      doc.text(`Gemeldete Anschrift:  ${debtorAddress || "Heidestraße, Berlin"}`, 25, 103);
      doc.text(`Zuständiges Gericht:  ${competentCourt || "Amtsgericht (Insolvenzgericht)"}`, 25, 109);
      doc.text(`Aktenzeichen d. St.:   GL-PLAN-${activeProfile.toUpperCase()}`, 25, 115);

      // Advisory Center Metadata Box
      doc.setFillColor(255, 255, 255);
      doc.rect(20, 134, 170, 42, "F");
      doc.rect(20, 134, 170, 42);

      doc.setFont("helvetica", "bold");
      doc.text("2. Zertifizierte Beratungsstelle / Aussteller:", 25, 140);
      doc.setFont("helvetica", "normal");
      doc.text("Name der Stelle:      Gesetzeslotse BERLIN Kanzlei-Gemeinschaft", 25, 147);
      doc.text("Akkreditierung:       Staatlich anerkannt nach § 305 Abs. 1 Nr. 1 InsO", 25, 153);
      doc.text("Anregender Beirat:    Senatsverwaltung für Justiz und Verbraucherschutz", 25, 159);
      doc.text("Anschrift d. Kanzlei:  Alt-Moabit 90 D, 10559 Berlin", 25, 165);

      // Plan Details Box
      doc.setFillColor(255, 255, 255);
      doc.rect(20, 184, 170, 44, "F");
      doc.rect(20, 184, 170, 44);

      doc.setFont("helvetica", "bold");
      doc.text("3. Allgemeine Zusammenfassung des Bereinigungsverfahrens:", 25, 190);
      doc.setFont("helvetica", "normal");
      doc.text(`Forderungs-Gesamthöhe: EUR ${totalDebtSum.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`, 25, 197);
      doc.text(`Anzahl erfasster Gläubiger: ${activeDebtsCount} Gläubiger-Positionen`, 25, 203);
      
      let modeText = "Einmalzahlungsvergleich (feste Summe außerger.)";
      if (planType === "nullplan") modeText = "Nullplan (keine Zahlungen mangels pfändbarem Vermögen)";
      else if (planType === "rate") modeText = `Ratenplan über ${planDurationMonths} Monate mit mtl. EUR ${monthlyInstallment}`;
      
      doc.text(`Gewählter Einigungsmodus:  ${modeText}`, 25, 209);
      doc.text(`Gesamter Tilgungsbetrag:   EUR ${planTotalProposedBudget.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`, 25, 215);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(`Gesamte Erlassquote:      ${averageReductionPercentage.toFixed(1)}% Rabatt auf das Gesamtportfolio`, 25, 221);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");

      // Bottom statement
      doc.setFontSize(8.5);
      doc.setTextColor(100, 110, 120);
      const notice = "WICHTIGER HINWEIS: Dieser Entwurf dient als Schuldenbereinigungsplan für den außergerichtlichen beizulegenden Einigungsversuch gemäß § 305 Abs. 1 Nr. 1 InsO. Stimmen nicht alle Gläubiger zu, gilt der Plan rechtlich als gescheitert. Der Berater stellt im Anschluss die gerichtliche Scheiternsbescheinigung aus.";
      doc.text(doc.splitTextToSize(notice, 162), 24, 240);

      // Footer Cover
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`Berlin Ost-West Kanzleiverfahren • Datum d. Erstellung: ${new Date().toLocaleDateString("de-DE")}`, 105, 272, { align: "center" });

      // PAGE 2: TABLE
      doc.addPage();
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("A n l a g e  A: Detaillierter Tilgungs- und Quotenverteilungsplan", 15, 16);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text(`Einigungsverfahren Schuldner: ${debtorName} • Stand d. Forderungen: ${new Date(planSentDate).toLocaleDateString("de-DE")}`, 15, 22);

      doc.setLineWidth(0.4);
      doc.line(15, 25, 195, 25);

      // Table Headers
      let tableY = 30;
      doc.setFillColor(240, 243, 246);
      doc.rect(15, tableY, 180, 8, "F");
      doc.rect(15, tableY, 180, 8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text("Nr.", 17, tableY + 5.5);
      doc.text("Gläubiger / Vertreter (AZ)", 24, tableY + 5.5);
      doc.text("Forderung (EUR)", 92, tableY + 5.5);
      doc.text("Quote (%)", 120, tableY + 5.5);
      doc.text("Angebot Summe (EUR)", 140, tableY + 5.5);
      doc.text("Mtl. Rate (EUR)", 173, tableY + 5.5);

      doc.setFont("helvetica", "normal");
      tableY += 8;

      debts.forEach((d, idx) => {
        // Safe math quotient
        const quote = totalDebtSum > 0 ? (d.amount / totalDebtSum) * 100 : 0;
        const proposedTotal = d.amount * (1 - averageReductionPercentage / 100);
        const proposedRate = planType === "rate" ? (proposedTotal / planDurationMonths) : 0;

        doc.rect(15, tableY, 180, 10);
        doc.text((idx + 1).toString(), 17, tableY + 6.5);
        
        const namePart = `${d.creditorName} ${d.fileReference ? `(${d.fileReference})` : ""}`;
        doc.text(namePart.substring(0, 42), 24, tableY + 6.5);

        // Bold figures
        doc.text(`EUR ${d.amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 92, tableY + 6.5);
        doc.text(`${quote.toFixed(2)}%`, 120, tableY + 6.5);
        
        doc.setFont("helvetica", "bold");
        doc.text(`EUR ${proposedTotal.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 140, tableY + 6.5);
        doc.text(planType === "rate" ? `EUR ${proposedRate.toFixed(2)}` : "-", 173, tableY + 6.5);
        doc.setFont("helvetica", "normal");

        tableY += 10;
      });

      // Bottom Row Total Summary
      doc.setFillColor(245, 247, 250);
      doc.rect(15, tableY, 180, 10, "F");
      doc.rect(15, tableY, 180, 10);

      doc.setFont("helvetica", "bold");
      doc.text("GESAMTPOSTEN:", 24, tableY + 6.5);
      doc.text(`EUR ${totalDebtSum.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 92, tableY + 6.5);
      doc.text("100.00%", 120, tableY + 6.5);
      doc.text(`EUR ${planTotalProposedBudget.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`, 140, tableY + 6.5);
      doc.text(planType === "rate" ? `EUR ${monthlyInstallment.toFixed(2)}` : "-", 173, tableY + 6.5);

      // Signatures
      let sigY = tableY + 22;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("ERKLÄRUNG UND ZUSTIMMUNG DER KANZLEI:", 15, sigY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text("Mit Übersendung dieses außergerichtlichen Schuldenbereinigungsplans bescheinigt die bevollmächtigte Beraterstelle", 15, sigY + 5);
      doc.text("die Richtigkeit und rechtliche Aufarbeitung der eingetragenen Forderungen anhand des Belegbestands.", 15, sigY + 9);

      sigY += 20;
      doc.line(15, sigY + 12, 85, sigY + 12);
      doc.line(125, sigY + 12, 195, sigY + 12);

      doc.text(`Berlin, den ${new Date().toLocaleDateString("de-DE")}`, 18, sigY + 9);
      doc.text("Ort, Datum der Einreichung", 18, sigY + 16);
      doc.text("Unterschrift und Siegel (Kanzlei Gesetzeslotse)", 125, sigY + 16);

      doc.save(`Paragraph_305_Schuldenbereinigungsplan_${debtorName.replace(/\s+/g, "_")}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Fehler beim pdf generation.");
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
            onClick={handleGeneratePdfReport}
            className="p-2 bg-slate-950 hover:bg-slate-850 text-white dark:bg-white dark:text-slate-950 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Plan-PDF exportieren</span>
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
                                  className={`p-1 px-1.5 rounded text-[10px] font-black cursor-pointer过渡 flex items-center gap-0.5 border ${
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

    </div>
  );
}
