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
  Info 
} from "lucide-react";
import { DebtItem } from "../types";
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

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // --- PAGE 1: OFFICIAL BESCHEINIGUNG ---
      doc.setFont("helvetica", "normal");
      doc.setFillColor(242, 244, 247);

      // Section A: Amtsgericht Placeholders Header
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(15, 12, 180, 24);
      doc.line(110, 12, 110, 36);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Zuständiges Insolvenzgericht (Amtsgericht):", 18, 17);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(competentCourt, 18, 23);
      doc.setFontSize(8);
      doc.text("Geschäftsstelle / Geschäftszeichen (Gericht):", 113, 17);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 110, 120);
      doc.text(courtFileNumber ? courtFileNumber : "________________________ (wird vom Gericht ausgefüllt)", 113, 23);
      doc.setTextColor(0, 0, 0);

      doc.setFontSize(7.5);
      doc.text(`Aktenzeichen der Kanzlei:  ${advisorFileNumber}`, 18, 32);
      doc.text("Bescheinigende Stelle: Gesetzeslotse BERLIN / Az. 345/09", 113, 32);

      // Main Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("B E S C H E I N I G U N G", 105, 47, { align: "center" });
      doc.setFontSize(10);
      doc.text("über das Scheitern des außergerichtlichen Einigungsversuchs", 105, 52, { align: "center" });
      doc.text("gemäß § 305 Abs. 1 Nr. 1 InsO", 105, 57, { align: "center" });

      doc.setLineWidth(0.4);
      doc.line(15, 61, 195, 61);

      // Debtor Box / II.
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("1. Angaben zum Schuldner oder zur Schuldnerin:", 15, 67);
      
      doc.setFont("helvetica", "normal");
      doc.rect(15, 70, 180, 24);
      doc.text(`Name, Vorname:     ${debtorName}`, 18, 75);
      doc.text(`Geburtsdatum:      ${debtorDob}                 Geburtsort:  ${debtorPob}`, 18, 81);
      doc.text(`Anschrift:          ${debtorAddress}`, 18, 87);

      // III. Certified Body / 2.
      doc.setFont("helvetica", "bold");
      doc.text("2. Angaben zur bescheinigenden geeigneten Person oder Stelle (§ 305 Abs. 1 Nr. 1 InsO):", 15, 101);
      doc.setFont("helvetica", "normal");
      doc.rect(15, 104, 180, 24);
      doc.text("Name der Stelle:    Gesetzeslotse BERLIN Schuldnerberatung (staatlich anerkannt gem. § 305 InsO)", 18, 109);
      doc.text("Anschrift:          Alt-Moabit 90 D, 10559 Berlin", 18, 115);
      doc.text("Akkreditierung:     Senatsverwaltung für Justiz und Verbraucherschutz Berlin (Geschäftszeichen: IV B 3-345/09)", 18, 121);

      // IV. Certifying Text / 3.
      doc.setFont("helvetica", "bold");
      doc.text("3. Bescheinigung des Scheiterns (§ 305 Abs. 1 Nr. 1 InsO):", 15, 135);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      
      // Paragraphs
      const p1 = "Als anerkannte Beratungsstelle bescheinigen wir hiermit, dass innerhalb der letzten sechs Monate vor dem beantragten Eröffnungsverfahren ein ernsthafter Versuch unternommen wurde, eine außergerichtliche Einigung mit den Gläubigern auf der Grundlage eines Plans über die Schulbereinigung herbeizuführen.";
      const p2 = `Der außergerichtliche Einigungsprozess wurde am ${new Date(planSentDate).toLocaleDateString("de-DE")} mit der Versendung des detaillierten Plans begonnen und ist nunmehr am ${new Date(failureDate).toLocaleDateString("de-DE")} endgültig und vollumfänglich gescheitert.`;
      const p3 = "Das Scheitern ist eingetreten, da:";
      
      const splitP1 = doc.splitTextToSize(p1, 178);
      const splitP2 = doc.splitTextToSize(p2, 178);

      let curY = 140;
      doc.text(splitP1, 15, curY);
      curY += splitP2.length * 4.5 + 10;
      doc.text(splitP2, 15, curY);
      curY += 12;
      doc.text(p3, 15, curY);

      curY += 5;
      doc.setFont("helvetica", "bold");
      const splitReason = doc.splitTextToSize(failureReason, 170);
      doc.rect(15, curY, 180, splitReason.length * 4 + 6);
      doc.text(splitReason, 18, curY + 5);

      curY += splitReason.length * 4 + 12;
      doc.setFont("helvetica", "normal");
      doc.text(`Eine spezifizierte Liste aller Gläubiger und Forderungen, die dem Einigungsplan zugrunde lagen, ist als Anlage 1 beigefügt und bildet einen untrennbaren Bestandteil dieser Bescheinigung. Das Verzeichnis weist insgesamt ${debts.length} Gläubiger mit einer Gesamtforderungshöhe von EUR ${totalAmount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} aus.`, 15, curY, { maxWidth: 180 });

      // Signatures
      curY += 24;
      doc.line(15, curY + 12, 85, curY + 12);
      doc.line(125, curY + 12, 195, curY + 12);
      
      doc.setFontSize(7.5);
      doc.setTextColor(115, 115, 115);
      doc.text(`Berlin, den ${new Date().toLocaleDateString("de-DE")}`, 18, curY + 9);
      doc.text("Ort, Datum der Ausstellung", 18, curY + 16);
      doc.text("Rechtsgültige Unterschrift & Kanzleistempel", 125, curY + 16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Gesetzeslotse BERLIN e.V.", 125, curY + 8);

      // --- PAGE 2: ANLAGE 1 ---
      doc.addPage();
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("A n l a g e   1  zur Scheiternsbescheinigung nach § 305 Abs. 1 Nr. 1 InsO", 15, 15);
      doc.setFontSize(13);
      doc.text("Gläubiger- und Forderungsverzeichnis (Einigungsplan-Bestandteil)", 15, 21);
      
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text(`Schuldner: ${debtorName}, geb. am ${debtorDob} • Aktenzeichen: ${advisorFileNumber}`, 15, 27);
      
      doc.setLineWidth(0.4);
      doc.line(15, 30, 195, 30);

      // Render Table Headers
      let tableY = 36;
      doc.setFillColor(240, 242, 245);
      doc.rect(15, tableY, 180, 8, "F");
      doc.rect(15, tableY, 180, 8);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text("Nr.", 17, tableY + 5.5);
      doc.text("Gläubiger Bezeichnung & Anschrift", 24, tableY + 5.5);
      doc.text("Aktenzeichen / Ref.", 110, tableY + 5.5);
      doc.text("Vollstreckungsstatus", 145, tableY + 5.5);
      doc.text("Betrag (EUR)", 191, tableY + 5.5, { align: "right" });

      doc.setFont("helvetica", "normal");
      tableY += 8;

      debts.forEach((debt, index) => {
        // Row box
        doc.rect(15, tableY, 180, 12);
        
        doc.text((index + 1).toString(), 17, tableY + 7.5);
        
        // Name & city
        doc.setFont("helvetica", "bold");
        doc.text(debt.creditorName.substring(0, 42), 24, tableY + 5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 100, 100);
        doc.text(`${debt.street || ""}, ${debt.city || ""}`, 24, tableY + 9.5);
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);

        doc.text(debt.fileReference || "Unbekannt", 110, tableY + 7);
        
        // Status Badge text
        let statusTxt = "Teilnehmend";
        if (debt.status === "gescheitert") {
          statusTxt = "GESCHEITERT (AG)";
          doc.setFont("helvetica", "bold");
          doc.setTextColor(220, 38, 38); // Red
        } else if (debt.status === "tituliert") {
          statusTxt = "Tituliert";
          doc.setTextColor(190, 24, 74);
        } else if (debt.status === "verhandlung") {
          statusTxt = "In Verhandlung";
          doc.setTextColor(79, 70, 229);
        } else if (debt.status === "ratenzahlung") {
          statusTxt = "Ratenzahlung";
          doc.setTextColor(5, 150, 105);
        } else {
          doc.setTextColor(70, 80, 90);
        }
        doc.text(statusTxt, 145, tableY + 7);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");

        doc.setFont("helvetica", "bold");
        doc.text(`EUR ${debt.amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 191, tableY + 7, { align: "right" });
        doc.setFont("helvetica", "normal");

        tableY += 12;
      });

      // Total Summaries
      doc.setFillColor(245, 247, 250);
      doc.rect(15, tableY, 180, 10, "F");
      doc.rect(15, tableY, 180, 10);
      doc.setFont("helvetica", "bold");
      doc.text("GESAMTE REINIGUNGSSUMME (ALLE GLÄUBIGER):", 24, tableY + 6.5);
      doc.setTextColor(220, 38, 38);
      doc.setFontSize(9);
      doc.text(`EUR ${totalAmount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 191, tableY + 6.5, { align: "right" });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(`Davon dokumentiert gescheiterte Beteiligungen: ${failedCount} von ${debts.length} Gläubigerpositionen.`, 15, tableY + 16);

      // Save PDF
      doc.save(`Paragraph_305_Scheiternsbescheinigung_${debtorName.replace(/\s+/g, "_")}.pdf`);
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

            <button
              onClick={handleDownloadPdf}
              disabled={!isReadyToCertify}
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                isReadyToCertify 
                  ? "bg-slate-950 hover:bg-slate-850 text-white dark:bg-white dark:text-slate-950" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60"
              }`}
            >
              <Download className="h-4 w-4" />
              Rechtssichere § 305 Bescheinigung (PDF) generieren
            </button>
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
                  <p className="p-2 bg-slate-50 border border-slate-350 rounded italic font-mono text-[8px] text-slate-805">
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
    </div>
  );
}
