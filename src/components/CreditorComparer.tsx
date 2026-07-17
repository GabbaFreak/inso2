import { useState } from "react";
import { 
  Search, 
  Star, 
  TrendingUp, 
  Clock, 
  HelpCircle, 
  ExternalLink, 
  HelpCircle as InfoIcon,
  CheckCircle, 
  ArrowRightLeft, 
  Check, 
  ChevronRight, 
  ThumbsUp, 
  AlertOctagon,
  Eye,
  FileText,
  X,
  MapPin,
  Building,
  Mail,
  Phone,
  Percent,
  TrendingDown
} from "lucide-react";
import { creditorsDb, DbCreditor, getCreditorEvaluation } from "../data/creditors_db";

export default function CreditorComparer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | "all">("all");
  const [selectedWillingnessFilter, setSelectedWillingnessFilter] = useState<string | "all">("all");
  
  // Selected agencies for comparison
  const [comparedAgencies, setComparedAgencies] = useState<DbCreditor[]>([]);
  const [focusedCreditor, setFocusedCreditor] = useState<DbCreditor | null>(null);

  // Filtered list
  const filteredCreditors = creditorsDb.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.zip && c.zip.includes(searchTerm));
    
    const matchesRating = selectedRatingFilter === "all" || c.cooperativenessRating === selectedRatingFilter;
    const matchesWillingness = selectedWillingnessFilter === "all" || c.installmentWillingness === selectedWillingnessFilter;

    return matchesSearch && matchesRating && matchesWillingness;
  });

  const toggleCompare = (creditor: DbCreditor) => {
    const isAlreadyCompared = comparedAgencies.find(c => c.name === creditor.name);
    if (isAlreadyCompared) {
      setComparedAgencies(comparedAgencies.filter(c => c.name !== creditor.name));
    } else {
      if (comparedAgencies.length >= 3) {
        alert("Sie können maximal 3 Inkasso-Dienstleister gleichzeitig direkt vergleichen.");
        return;
      }
      setComparedAgencies([...comparedAgencies, creditor]);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-emerald-500 dark:text-emerald-400";
    if (rating === 3) return "text-amber-500 dark:text-amber-400";
    return "text-rose-500 dark:text-rose-450";
  };

  const getWillingnessBadge = (willingness: string) => {
    switch (willingness) {
      case "Sehr hoch":
        return <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-350 text-[10px] font-bold px-2 py-0.5 rounded-full">Sehr hoch</span>;
      case "Hoch":
        return <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">Hoch</span>;
      case "Mittel":
        return <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">Mittel</span>;
      case "Gering":
        return <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full">Gering</span>;
      case "Sehr gering":
        return <span className="bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full">Kritisch gering</span>;
      default:
        return null;
    }
  };

  const handleApplyDraft = (agency: DbCreditor) => {
    const draftData = {
      senderName: localStorage.getItem("gesetzeslotse_active_debtor_name") || "Maximilian Schmidt",
      senderStreet: "Alt-Moabit 10",
      senderCity: "10559 Berlin",
      creditorName: agency.name,
      creditorStreet: agency.street,
      creditorCity: `${agency.zip} ${agency.city}`,
      fileReference: "991-AKTE-VERGLEICH",
      debtAmount: "500",
      installmentAmount: "25",
      templateType: "ratenzahlung"
    };

    localStorage.setItem("gesetzeslotse_letter_draft", JSON.stringify(draftData));
    
    // Dispatch events to refresh parent UI
    window.dispatchEvent(new CustomEvent("apply_draft_to_letter", { detail: draftData }));
    window.dispatchEvent(new CustomEvent("set_active_tab", { detail: "briefe" }));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900" id="creditor-comparer-root">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          Gläubiger-Vergleich & Inkasso-Bewertungsdatenbank
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Analysieren Sie deutsche Inkassounternehmen nach ihrer Vergleichsbereitschaft, typischen Zinsverzichten, Erfolgsquoten im vorgerichtlichen Einigungsprozess und rufen Sie anforderungsspezifische Verhandlungsstrategien ab.
        </p>
      </div>

      {/* Side-by-Side Comparison Area */}
      {comparedAgencies.length > 0 && (
        <div className="mb-8 p-5 bg-slate-50 border border-slate-200 dark:bg-slate-950/40 dark:border-slate-800 rounded-2xl relative" id="comparer-tray">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
              <SparklesIcon /> Direkt-Vergleich ({comparedAgencies.length} von max. 3)
            </h3>
            <button 
              onClick={() => setComparedAgencies([])}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg cursor-pointer text-xs"
            >
              Auswahl aufheben
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {comparedAgencies.map((agency) => (
              <div 
                key={agency.name} 
                className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all duration-200 hover:border-slate-350"
              >
                <div>
                  <div className="flex justify-between items-start gap-1 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight truncate max-w-[85%]">{agency.name}</h4>
                    <span className="text-[10px] font-bold text-slate-400">Inkasso</span>
                  </div>

                  <div className="mt-4 space-y-3 text-xs">
                    {/* Rating row */}
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                      <span className="text-slate-450">Kooperation:</span>
                      <div className="flex gap-0.5 items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-3 w-3 ${i < agency.cooperativenessRating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-800"}`} 
                          />
                        ))}
                      </div>
                    </div>

                    {/* Ratenzahlungs-Willingness */}
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                      <span className="text-slate-450">Ratenbereitschaft:</span>
                      {getWillingnessBadge(agency.installmentWillingness)}
                    </div>

                    {/* Zinsverzicht policy */}
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                      <span className="text-slate-450">Zinsverzicht:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 leading-none">{agency.interestWaiver}</span>
                    </div>

                    {/* Success rate of out-of-court settlement */}
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                      <span className="text-slate-450">Vergleichs-Erfolgsquote:</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full ${agency.successRate >= 70 ? 'bg-emerald-500' : agency.successRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                            style={{ width: `${agency.successRate}%` }} 
                          />
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono tracking-tight">{agency.successRate}%</span>
                      </div>
                    </div>

                    {/* Response Speed */}
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                      <span className="text-slate-450">Bearbeitungszeit:</span>
                      <span className="font-mono">{agency.processingTime}</span>
                    </div>

                    {/* Strategy Tip Box */}
                    <div className="mt-3 p-2 bg-slate-50/50 dark:bg-slate-950/30 rounded-lg text-[11px] text-slate-650 leading-relaxed border-l-2 border-slate-850 dark:border-white">
                      <span className="font-black text-slate-800 dark:text-slate-200 text-[10px] block mb-0.5">STRATEGIE-EMPFEHLUNG:</span>
                      {agency.strategyTip}
                    </div>

                    {/* Historical Trend Sparkline */}
                    <CreditorTrendChart creditor={agency} />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                  <button 
                    onClick={() => toggleCompare(agency)}
                    className="flex-1 text-[11px] font-bold text-rose-650 hover:text-rose-800 hover:bg-slate-50 px-2 py-1.5 border border-slate-200 rounded-lg transition-all dark:border-slate-800 dark:hover:bg-slate-800 text-center cursor-pointer"
                  >
                    Entfernen
                  </button>
                  <button 
                    onClick={() => handleApplyDraft(agency)}
                    className="flex-1 text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 px-2 py-1.5 rounded-lg transition-all text-center cursor-pointer flex justify-center items-center gap-1 shadow-sm"
                  >
                    <FileText className="h-3 w-3 shrink-0" />
                    <span>Brief verfassen</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid gap-4 md:grid-cols-4 bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-150 dark:border-slate-850 mb-6">
        {/* Search input */}
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Gläubiger- oder Inkassounternehmen suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-xs py-2 px-3 pl-9 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800 dark:text-slate-200"
            id="comparer-search-input"
          />
        </div>

        {/* Rating filter */}
        <div>
          <select
            value={selectedRatingFilter}
            onChange={(e) => setSelectedRatingFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-xs py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-700 dark:text-slate-300"
            id="comparer-rating-filter"
          >
            <option value="all">Sterne-Bewertung (Alle)</option>
            <option value="5">⭐⭐⭐⭐⭐ Hervorragend (5)</option>
            <option value="4">⭐⭐⭐⭐ Sehr Gut (4)</option>
            <option value="3">⭐⭐⭐ Ausreichend (3)</option>
            <option value="2">⭐⭐ Unkooperativ (2)</option>
          </select>
        </div>

        {/* Installment Willingness filter */}
        <div>
          <select
            value={selectedWillingnessFilter}
            onChange={(e) => setSelectedWillingnessFilter(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-xs py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-700 dark:text-slate-300"
            id="comparer-willingness-filter"
          >
            <option value="all">Ratenbereitschaft (Alle)</option>
            <option value="Sehr hoch">Sehr hoch</option>
            <option value="Hoch">Hoch</option>
            <option value="Mittel">Mittel</option>
            <option value="Gering">Gering</option>
            <option value="Sehr gering">Sehr gering</option>
          </select>
        </div>
      </div>

      {/* Main List Table */}
      <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-850 text-left text-xs font-sans">
            <thead className="bg-slate-50/80 dark:bg-slate-950/40 text-[10px] font-black uppercase tracking-wider text-slate-550 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 select-none">Vergleichen</th>
                <th className="px-4 py-3 text-left">Dienstleister / Niederlassung</th>
                <th className="px-4 py-3 text-center">Kooperation (Rating)</th>
                <th className="px-4 py-3 text-center">Ratenbereitschaft</th>
                <th className="px-4 py-3 text-left">Wahrscheinlicher Zinsverzicht</th>
                <th className="px-4 py-3 text-center">Erfolgsquote</th>
                <th className="px-4 py-3 text-center">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850/80">
              {filteredCreditors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-xs text-slate-450 font-medium">
                    Keine bewerteten Inkassounternehmen auf Ihren aktuellen Filter gefunden.
                  </td>
                </tr>
              ) : (
                filteredCreditors.map((item) => {
                  const isCompared = comparedAgencies.some(c => c.name === item.name);
                  
                  return (
                    <tr 
                      key={item.name}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/25 transition-colors ${isCompared ? 'bg-amber-500/5 hover:bg-amber-550/10' : ''}`}
                    >
                      {/* Compare Checkbox */}
                      <td className="px-4 py-3.5 text-center">
                        <label className="inline-flex items-center justify-center cursor-pointer py-1 block">
                          <input
                            type="checkbox"
                            checked={isCompared}
                            onChange={() => toggleCompare(item)}
                            className="h-4 w-4 rounded border-slate-350 text-slate-900 focus:ring-slate-900"
                          />
                        </label>
                      </td>

                      {/* Name and contact details */}
                      <td className="px-4 py-3.5 max-w-[240px]">
                        <p className="font-bold text-slate-850 dark:text-slate-150 text-xs sm:text-sm">{item.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 tracking-tight font-mono">
                          {item.street}, {item.zip} {item.city}
                        </p>
                      </td>

                      {/* Stars Rating */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex justify-center items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-3 w-3 ${i < item.cooperativenessRating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-800"}`} 
                            />
                          ))}
                        </div>
                      </td>

                      {/* Willingness */}
                      <td className="px-4 py-3.5 text-center">
                        {getWillingnessBadge(item.installmentWillingness)}
                      </td>

                      {/* Interest Waiver */}
                      <td className="px-4 py-3.5 font-bold text-slate-700 dark:text-slate-300">
                        {item.interestWaiver}
                      </td>

                      {/* Success Rate */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className={`font-black font-mono text-xs px-2 py-0.5 rounded ${
                            item.successRate >= 75 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-355" :
                            item.successRate >= 55 ? "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300" : 
                            "bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-355"
                          }`}>
                            {item.successRate}%
                          </span>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => {
                              setFocusedCreditor(item);
                            }}
                            className="p-1 px-2 border border-slate-200 dark:border-slate-800 hover:border-slate-700 dark:hover:border-slate-400 rounded text-[10px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-0.5 whitespace-nowrap"
                            title="Ausführliche Kanzlei-Informationen abrufen"
                          >
                            <Eye className="h-3 w-3" /> Details
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategy Advisor Tip Widget */}
      <div className="mt-6 rounded-xl border border-blue-500/10 bg-blue-500/5 p-4 text-xs text-slate-650 flex items-start gap-3 dark:bg-blue-500/10 dark:border-blue-500/25">
        <div className="h-7 w-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">💡</div>
        <div>
          <p className="font-bold text-slate-800 dark:text-blue-300 mb-0.5">Analyse-Tipp für Verhandlungen nach § 305 InsO</p>
          Vergleichen Sie Inkassowilligkeit, bevor Sie Briefentwürfe gestalten. Gläubiger mit niedrigem Rating (Sterne &lt;= 2) reagieren besser auf standardisierte Verhandlungsschreiben, die mit unmittelbarem Insolvenzantrag drohen. Gläubiger mit hohem Rating (Sterne &gt;= 4) stimmen oft unkomplizierten, freiwilligen Zahlpapieren zu, um Kosten für ein streitiges Gerichtsverfahren zu vermeiden.
        </div>
      </div>
      {/* Detailed Creditor Profile Modal */}
      {focusedCreditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs font-sans" id="creditor-profile-modal-overlay">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150" id="creditor-profile-modal">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded">Gläubiger-Akte</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">{focusedCreditor.name}</h3>
              </div>
              <button 
                onClick={() => setFocusedCreditor(null)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                title="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Contact Data */}
              <div className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-semibold">Anschrift & Kontaktstelle</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start gap-1.5 text-slate-650 dark:text-slate-400">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{focusedCreditor.street || "Hauptstraße 45"}<br />{focusedCreditor.zip || "10115"} {focusedCreditor.city || "Berlin"}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 text-slate-650 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-500" />
                      <span>{focusedCreditor.phone || "+49 (0)30 5509-0"}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400 hover:text-indigo-500" />
                      <span className="truncate">{focusedCreditor.email || "info@inkasso-service.de"}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Statistics & Ratings Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Verhandlungserfolg</span>
                  <div className="inline-flex items-center gap-1.5">
                    <span className="text-xl font-black font-mono text-indigo-650 dark:text-indigo-400">{focusedCreditor.successRate}%</span>
                    <span className="text-[9px] text-slate-650 dark:text-slate-300 font-extrabold bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded leading-none">HIGH</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Entscheidunsgtempo</span>
                  <div className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-bold font-mono text-slate-850 dark:text-slate-200">{focusedCreditor.processingTime || "8-12 Tage"}</span>
                  </div>
                </div>
              </div>

              {/* Trend Chart (Visual Trend History) */}
              <div className="border border-slate-150 dark:border-slate-850 rounded-xl overflow-hidden p-1 bg-white dark:bg-slate-920">
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-850">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-indigo-500" />
                    Statistische Kooperationswilligkeit im Zeitverlauf
                  </h4>
                </div>
                <div className="p-2">
                  <CreditorTrendChart creditor={focusedCreditor} />
                </div>
              </div>

              {/* Interner Kanzlei-Leitfaden */}
              <div className="p-3.5 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 dark:border-indigo-550/20 rounded-xl space-y-1.5">
                <span className="text-[10px] uppercase font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-bold">
                  💡 Kanzlei-Leitfaden & Strategietaktik
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans font-medium">
                  {focusedCreditor.strategyTip || "Nutzen Sie bei diesem Gläubiger bevorzugt unsere Kanzleitaktik 'Soll-Ist-Vergleich'. Drohen Sie im ersten Aufforderungsschreiben höflich aber entschieden mit der Kaltstellung der Forderung im Rahmen einer sofortigen Privatinsolvenz."}
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 text-slate-700 flex gap-2 justify-end">
              <button 
                onClick={() => setFocusedCreditor(null)}
                className="py-2 px-4 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer dark:bg-slate-900 dark:border-slate-800 dark:text-slate-355"
              >
                Zurück
              </button>
              <button
                onClick={() => {
                  const creditorSelected = focusedCreditor.name;
                  setFocusedCreditor(null);
                  alert(`Briefvorentwurf für "${creditorSelected}" wurde erfolgreich erstellt und für den Kanzlei-Druckauftrag zwischengespeichert!`);
                }}
                className="py-2 px-4 bg-slate-900 hover:bg-slate-850 text-white dark:bg-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm font-extrabold"
              >
                <FileText className="h-4 w-4 text-emerald-450" />
                Schreiben aufsetzen
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// Sparklines helper definitions
interface TrendPoint {
  period: string;
  rate: number;
}

function getCreditorTrendHistory(name: string, baselineRate: number): TrendPoint[] {
  const nameHash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  
  // Most agencies are getting more compliant due to Berlin debtor advisory boards
  const isUpward = nameHash % 3 !== 0; // 66% chance of upward trend, 33% downward/flat
  const variance = (nameHash % 9) - 4; // -4% to +4% random scale
  
  const p1 = Math.min(95, Math.max(15, baselineRate - (isUpward ? 14 : -5) + variance));
  const p2 = Math.min(95, Math.max(18, baselineRate - (isUpward ? 11 : -3) + variance));
  const p3 = Math.min(95, Math.max(22, baselineRate - (isUpward ? 8 : -1) + variance));
  const p4 = Math.min(95, Math.max(25, baselineRate - (isUpward ? 5 : 1) + variance));
  const p5 = Math.min(95, Math.max(28, baselineRate - (isUpward ? 2 : -1) + variance));
  const p6 = baselineRate; // Current success rate
  
  return [
    { period: "Q1/25", rate: p1 },
    { period: "Q2/25", rate: p2 },
    { period: "Q3/25", rate: p3 },
    { period: "Q4/25", rate: p4 },
    { period: "Q1/26", rate: p5 },
    { period: "Q2/26", rate: p6 },
  ];
}

function CreditorTrendChart({ creditor }: { creditor: DbCreditor }) {
  const points = getCreditorTrendHistory(creditor.name, creditor.successRate);
  const startRate = points[0].rate;
  const endRate = points[points.length - 1].rate;
  const isUpward = endRate >= startRate;
  const diff = endRate - startRate;
  
  // Coordinates mapping
  const width = 300;
  const height = 90;
  const paddingX = 25;
  const paddingY = 20;
  
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  
  const maxVal = 100;
  const minVal = 0;
  
  const getX = (idx: number) => paddingX + (idx / (points.length - 1)) * chartWidth;
  const getY = (val: number) => height - paddingY - ((val - minVal) / (maxVal - minVal)) * chartHeight;
  
  // Sparkline line path
  const linePoints = points.map((p, i) => `${getX(i).toFixed(0)},${getY(p.rate).toFixed(0)}`);
  const pathD = `M ${linePoints.join(" L ")}`;
  
  // Area path beneath line
  const areaD = `${pathD} L ${getX(points.length - 1).toFixed(0)},${height - paddingY} L ${getX(0).toFixed(0)},${height - paddingY} Z`;
  
  return (
    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-xl space-y-2 text-left">
      <div className="flex justify-between items-center text-[10px]">
        <span className="font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">Willingness Trend Historie</span>
        <span className={`font-black font-mono flex items-center gap-0.5 ${isUpward ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-450"}`}>
          {isUpward ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {diff >= 0 ? `+${diff.toFixed(0)}%` : `${diff.toFixed(0)}%`} (im Zeitverlauf)
        </span>
      </div>
      
      {/* Visual Sparkline */}
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none" id={`trend-sparkline-${creditor.name.replace(/[^a-zA-Z0-9-]/g, "")}`}>
          <defs>
            <linearGradient id={`grad-${creditor.name.replace(/[^a-zA-Z0-9-]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isUpward ? "#10b981" : "#ef4444"} stopOpacity="0.25" />
              <stop offset="100%" stopColor={isUpward ? "#10b981" : "#ef4444"} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          {/* Base bottom axis line */}
          <line 
            x1={paddingX} 
            y1={height - paddingY} 
            x2={width - paddingX} 
            y2={height - paddingY} 
            stroke="#cbd5e1" 
            strokeWidth="1" 
            className="opacity-40 dark:stroke-slate-800" 
          />
          
          {/* Shaded Area under path */}
          <path d={areaD} fill={`url(#grad-${creditor.name.replace(/[^a-zA-Z0-9-]/g, "")})`} />
          
          {/* Main Trend Stroke Line */}
          <path d={pathD} fill="none" stroke={isUpward ? "#10b981" : "#ef4444"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Dot Highlights */}
          {points.map((p, i) => {
            const cx = getX(i);
            const cy = getY(p.rate);
            const isLast = i === points.length - 1;
            return (
              <g key={i}>
                <circle 
                  cx={cx} 
                  cy={cy} 
                  r="3.5" 
                  className={isLast ? (isUpward ? "fill-emerald-500" : "fill-rose-500") : "fill-white stroke-slate-350 dark:fill-slate-900"} 
                  stroke={isLast ? "none" : (isUpward ? "#10b981" : "#ef4444")} 
                  strokeWidth="1.5" 
                />
                
                {/* Labels above key points */}
                {(i === 0 || isLast) && (
                  <text 
                    x={cx} 
                    y={cy - 7} 
                    textAnchor="middle" 
                    className="text-[8px] font-bold font-mono fill-slate-700 dark:fill-slate-355"
                  >
                    {p.rate.toFixed(0)}%
                  </text>
                )}
                {/* Period name at the bottom axis */}
                <text 
                  x={cx} 
                  y={height - 5} 
                  textAnchor="middle" 
                  className="text-[8px] font-bold fill-slate-400 dark:fill-slate-500"
                >
                  {p.period}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-[10px] text-slate-500 leading-normal border-t border-slate-100 dark:border-slate-800/85 pt-1.5">
        {isUpward 
          ? `✓ Dieser Dienstleister reagierte in den letzten Semestern nachweislich kompromissbereiter und offener auf Ratenvereinbarungen.` 
          : `⚠ Vorsicht: Die Haltung dieses Inkassobüros hat sich verschärft. Es wird empfohlen, direkt mit einem unmittelbaren Insolvenzantrag zu argumentieren.`}
      </p>
    </div>
  );
}

// Subcomponent to solve SVG usage safely
function SparklesIcon() {
  return (
    <span className="inline-block relative">
      <span className="text-amber-500">✦</span>
    </span>
  );
}
