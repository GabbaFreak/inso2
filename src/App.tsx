import { useState, useEffect } from "react";
import LukasAssistant from "./components/LukasAssistant";
import PKontoCalculator from "./components/PKontoCalculator";
import DeadlineChecker from "./components/DeadlineChecker";
import LetterGenerator from "./components/LetterGenerator";
import DebtListAssistant from "./components/DebtListAssistant";
import CreditorComparer from "./components/CreditorComparer";
import SenateInvoicer from "./components/SenateInvoicer";
import Scheiternsbescheinigung from "./components/Scheiternsbescheinigung";
import VollmachtGenerator from "./components/VollmachtGenerator";
import Schuldenbereinigungsplan from "./components/Schuldenbereinigungsplan";
import { ActivityLog } from "./lib/history";
import { 
  Building, 
  CheckCircle, 
  ShieldCheck, 
  Coins, 
  Landmark, 
  Scale, 
  Users,
  MessageSquare,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRightLeft,
  Building2,
  FileText,
  ClipboardList
} from "lucide-react";

type ActiveTab = "pkonto" | "fristen" | "briefe" | "schulden" | "vergleich" | "rechnung" | "scheitern" | "vollmacht" | "bereinigung";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("schulden");
  const [hasImminentDeadline, setHasImminentDeadline] = useState<boolean>(false);
  const [imminentCount, setImminentCount] = useState<number>(0);
  const [activityHistory, setActivityHistory] = useState<ActivityLog[]>([]);

  // Determine active phase based on current tab automatically, but allow mechanical overrides
  const getPhaseForTab = (tab: ActiveTab): 1 | 2 | 3 => {
    if (tab === "schulden" || tab === "pkonto" || tab === "fristen") return 1;
    if (tab === "bereinigung" || tab === "vergleich" || tab === "briefe" || tab === "vollmacht") return 2;
    return 3;
  };

  const [activePhase, setActivePhase] = useState<1 | 2 | 3>(1);

  // Sync active phase state when activeTab changes
  useEffect(() => {
    setActivePhase(getPhaseForTab(activeTab));
  }, [activeTab]);

  const checkDeadlinesAndHistory = () => {
    // 1. Check deadlines
    const storedDeadlines = localStorage.getItem("gesetzeslotse_recorded_deadlines");
    if (storedDeadlines) {
      try {
        const list = JSON.parse(storedDeadlines);
        const imminent = list.filter((item: any) => {
          const deadDate = new Date(item.receivedDate);
          deadDate.setDate(deadDate.getDate() + (item.docType === "mahnbescheid" || item.docType === "vollstreckungsbescheid" ? 14 : item.docType === "gerichtsvollzieher" ? 7 : 10));
          const today = new Date();
          today.setHours(0,0,0,0);
          deadDate.setHours(0,0,0,0);
          const diffTime = deadDate.getTime() - today.getTime();
          const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return days >= 0 && days <= 7;
        });
        setHasImminentDeadline(imminent.length > 0);
        setImminentCount(imminent.length);
      } catch (e) {
        console.error(e);
      }
    } else {
      setHasImminentDeadline(false);
      setImminentCount(0);
    }

    // 2. Load last 3 activities
    const storedHistory = localStorage.getItem("gesetzeslotse_activity_history");
    if (storedHistory) {
      try {
        const list = JSON.parse(storedHistory);
        setActivityHistory(list.slice(0, 3));
      } catch (e) {
        console.error(e);
      }
    } else {
      setActivityHistory([]);
    }
  };

  useEffect(() => {
    checkDeadlinesAndHistory();
    window.addEventListener("gesetzeslotse_deadline_updated", checkDeadlinesAndHistory);
    window.addEventListener("gesetzeslotse_activity_logged", checkDeadlinesAndHistory);
    window.addEventListener("gesetzeslotse_profile_changed", checkDeadlinesAndHistory);
    return () => {
      window.removeEventListener("gesetzeslotse_deadline_updated", checkDeadlinesAndHistory);
      window.removeEventListener("gesetzeslotse_activity_logged", checkDeadlinesAndHistory);
      window.removeEventListener("gesetzeslotse_profile_changed", checkDeadlinesAndHistory);
    };
  }, []);

  useEffect(() => {
    const handleSetActiveTab = (e: any) => {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener("set_active_tab", handleSetActiveTab);
    return () => {
      window.removeEventListener("set_active_tab", handleSetActiveTab);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-850 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans selection:bg-slate-800 selection:text-white" id="applet-viewport">
      {/* Visual Identity Header */}
      <header className="border-b border-slate-205 bg-white py-6 dark:border-slate-850 dark:bg-slate-900 shadow-sm" id="main-header">
        <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-wider uppercase text-slate-900 dark:text-white">
                  Gesetzeslotse <span className="text-slate-500 font-normal">BERLIN</span>
                </h1>
                <span className="text-[10px] bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-extrabold tracking-widest px-1.5 py-0.5 rounded uppercase">
                  Berater-Cockpit
                </span>
              </div>
              <p className="text-xs text-slate-450 dark:text-slate-450">Kanzlei-Workspace zur professionellen Aufarbeitung von Mandanten-Forderungen gemaß § 305 insO</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasImminentDeadline && (
              <button 
                onClick={() => {
                  setActiveTab("fristen");
                  setActivePhase(1);
                }}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-755 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer shadow-sm animate-pulse shrink-0 border border-rose-700 transition-colors"
                title="Dringende Fristen vorhanden! Hier klicken zum Prüfen."
              >
                <AlertTriangle className="h-4 w-4 text-white" />
                <span>{imminentCount} Frist{imminentCount === 1 ? "" : "en"} läuft bald ab!</span>
              </button>
            )}
            <div className="text-right hidden md:block">
              <span className="text-xs text-slate-400 block font-medium">Büroschnittstelle für anerkannte Stellen</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Kanzlei-Verfahrensport / Berlin-Brandenburg</span>
            </div>
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" title="System betriebsbereit" />
          </div>
        </div>
      </header>

      {/* Main Panel Frame */}
      <main className="flex-1 mx-auto w-full max-w-[1440px] px-4 md:px-6 py-8" id="dashboard-body">
        
        {/* Intro Notification Banner */}
        <div className="mb-8 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4.5 text-xs text-slate-650 dark:border-blue-500/20 dark:bg-blue-500/10 flex items-start gap-3" id="intro-alert-strip">
          <AlertTriangle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5 dark:text-blue-400" />
          <div>
            <p className="font-bold text-slate-850 dark:text-blue-300 mb-0.5">Mandantenakte & Forderungsmanagement gemaß § 305 insO</p>
            Stellen Sie sicher, dass insolvenzrechtliche und gerichtliche Fristen (z.B. Widerspruch binnen 14 Tagen) fur das insolvenzrechtliche Vorverfahren lückenlos erfasst, berechnet und gepflegt werden. Nutzen Sie den Kanzlei-Copiloten Lukas für rechtliche Fragen und zur Analyse komplexer Mahnbescheide.
          </div>
        </div>

        {/* Procedural Case Progress Tracker */}
        <div className="mb-8 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-2xl p-5 shadow-sm" id="case-progress-tracker">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4.5">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                <ClipboardList className="h-4.5 w-4.5 text-slate-650 dark:text-slate-350" />
                Aktueller Verfahrensstand d. Mandantenakte (§ 305 Abs. 1 InsO)
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5">
                Strukturierte Visualisierung des Fortschritts im gesetzlichen Verbraucherinsolvenzverfahren
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold">Status d. Einigungsversuchs:</span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Außergerichtliche Regulierung läuft</span>
            </div>
          </div>

          {/* Stepper Timeline UI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 relative">
            
            {/* Step 1: Ersterfassung */}
            <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
              activeTab === "schulden"
                ? "border-slate-900 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20"
            }`}>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider opacity-60">Schritt 1</span>
                  <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center text-[10px] font-black">✓</span>
                </div>
                <h4 className="text-xs font-bold">Ersterfassung</h4>
                <p className="text-[9.5px] opacity-75 mt-1 leading-normal">
                  Gläubiger & Forderungen lückenlos eingepflegt.
                </p>
              </div>
              <button 
                onClick={() => { setActivePhase(1); setActiveTab("schulden"); }}
                className={`mt-2.5 text-left text-[10px] font-extrabold hover:underline flex items-center gap-1 cursor-pointer ${
                  activeTab === "schulden" ? "text-indigo-300 dark:text-indigo-600" : "text-indigo-600 dark:text-indigo-405"
                }`}
              >
                <span>Verzeichnis</span>
                <ArrowRightLeft className="h-3 w-3" />
              </button>
            </div>

            {/* Step 2: Sofortschutz */}
            <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
              activeTab === "pkonto"
                ? "border-slate-900 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20"
            }`}>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider opacity-60">Schritt 2</span>
                  <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center text-[10px] font-black">✓</span>
                </div>
                <h4 className="text-xs font-bold">P-Konto Schutz</h4>
                <p className="text-[9.5px] opacity-75 mt-1 leading-normal">
                  Pfändungsfreibetrag berechnet & Bescheinigung bereit.
                </p>
              </div>
              <button 
                onClick={() => { setActivePhase(1); setActiveTab("pkonto"); }}
                className={`mt-2.5 text-left text-[10px] font-extrabold hover:underline flex items-center gap-1 cursor-pointer ${
                  activeTab === "pkonto" ? "text-indigo-300 dark:text-indigo-600" : "text-indigo-600 dark:text-indigo-405"
                }`}
              >
                <span>P-Konto Rechner</span>
                <ArrowRightLeft className="h-3 w-3" />
              </button>
            </div>

            {/* Step 3: Vorbereitung */}
            <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
              activeTab === "vollmacht" || activeTab === "briefe"
                ? "border-slate-900 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                : "border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20"
            }`}>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider opacity-60">Schritt 3</span>
                  <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black">3</span>
                </div>
                <h4 className="text-xs font-bold">Vollmacht & Briefe</h4>
                <p className="text-[9.5px] opacity-75 mt-1 leading-normal">
                  Vertretung & Korrespondenzbriefe an Gläubiger.
                </p>
              </div>
              <button 
                onClick={() => { setActivePhase(2); setActiveTab("vollmacht"); }}
                className={`mt-2.5 text-left text-[10px] font-extrabold hover:underline flex items-center gap-1 cursor-pointer ${
                  activeTab === "vollmacht" || activeTab === "briefe" ? "text-indigo-300 dark:text-indigo-600" : "text-indigo-600 dark:text-indigo-405"
                }`}
              >
                <span>Vollmacht erstellen</span>
                <ArrowRightLeft className="h-3 w-3" />
              </button>
            </div>

            {/* Step 4: Bereinigung */}
            <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
              activeTab === "bereinigung"
                ? "border-slate-900 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                : "border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20"
            }`}>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider opacity-60">Schritt 4</span>
                  <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black">4</span>
                </div>
                <h4 className="text-xs font-bold">Bereinigungsplan</h4>
                <p className="text-[9.5px] opacity-75 mt-1 leading-normal">
                  Pro-Rata Quote & Tilgungsvereinbarung berechnen.
                </p>
              </div>
              <button 
                onClick={() => { setActivePhase(2); setActiveTab("bereinigung"); }}
                className={`mt-2.5 text-left text-[10px] font-extrabold hover:underline flex items-center gap-1 cursor-pointer ${
                  activeTab === "bereinigung" ? "text-indigo-300 dark:text-indigo-600" : "text-indigo-600 dark:text-indigo-405"
                }`}
              >
                <span>Plan aufsetzen</span>
                <ArrowRightLeft className="h-3 w-3" />
              </button>
            </div>

            {/* Step 5: Abschluss */}
            <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
              activeTab === "scheitern" || activeTab === "rechnung"
                ? "border-slate-900 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                : "border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20"
            }`}>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider opacity-60">Schritt 5</span>
                  <span className="h-5 w-5 rounded-full bg-slate-105 text-slate-600 dark:bg-slate-800 dark:text-slate-400 flex items-center justify-center text-[10px] font-black">5</span>
                </div>
                <h4 className="text-xs font-bold">Insolvenz / Honorar</h4>
                <p className="text-[9.5px] opacity-75 mt-1 leading-normal">
                  Einigung oder Bescheinigung nach § 305 InsO.
                </p>
              </div>
              <button 
                onClick={() => { setActivePhase(3); setActiveTab("scheitern"); }}
                className={`mt-2.5 text-left text-[10px] font-extrabold hover:underline flex items-center gap-1 cursor-pointer ${
                  activeTab === "scheitern" || activeTab === "rechnung" ? "text-indigo-300 dark:text-indigo-600" : "text-indigo-600 dark:text-indigo-405"
                }`}
              >
                <span>Ergebnis</span>
                <ArrowRightLeft className="h-3 w-3" />
              </button>
            </div>

          </div>
        </div>

        {/* Historien-Ansicht (Last 3 calculations or letters) */}
        <div className="mb-8 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-2xl p-5 shadow-sm animate-fadeIn" id="activity-history-panel">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
                <FileText className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                Letzte Aktivitäten d. Mandantenakte (Kanzlei-Protokoll)
              </h3>
              <p className="text-[10px] text-slate-550 dark:text-slate-455 mt-0.5 font-medium">
                Automatische Aufzeichnung von Berechnungen, PDF-Exporten, Brief-Erstellungen und Vollmachten
              </p>
            </div>
            <span className="text-[9px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-350 font-black px-2 py-0.5 rounded uppercase tracking-wide">
              Die letzten 3 Einträge
            </span>
          </div>

          {activityHistory.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              Es liegen noch keine Kanzlei-Aktivitäten vor. Starten Sie eine Berechnung, kopieren Sie einen Musterbrief oder laden Sie eine Vollmacht herunter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activityHistory.map((item) => {
                let badgeBg = "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400";
                if (item.type === "calculation") badgeBg = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
                if (item.type === "frist") badgeBg = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400";
                if (item.type === "vollmacht") badgeBg = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";

                return (
                  <div 
                    key={item.id} 
                    className="p-3.5 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeBg}`}>
                          {item.type === "calculation" ? "Kalkulation" : item.type === "letter" ? "Brief" : item.type === "vollmacht" ? "Vollmacht" : item.type === "frist" ? "Frist" : "Aktivität"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-medium">{item.timestamp}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{item.action}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-normal line-clamp-2">{item.details}</p>
                    </div>
                    <div className="mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono font-medium">
                      <span>Mandant:</span>
                      <span className="font-bold text-slate-650 dark:text-slate-300">{item.debtorName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bento Board: AI Assistant (Left) vs. Dynamic Workplaces (Right) */}
        <div className="grid gap-8 xl:grid-cols-12" id="dashboard-grid">
          
          {/* Column A: Voice Assistant Lukas */}
          <div className="order-2 xl:order-1 xl:col-span-3 flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Sprechen Sie mit Lukas
              </h2>
              <span className="text-xs text-emerald-500 font-semibold">• Mikrofon ist bereit</span>
            </div>
            <LukasAssistant />

            {/* Quick-Pick prompt templates for Lukas */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-850 dark:bg-slate-900/60" id="conversation-starters">
              <h3 className="text-xs font-semibold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">Häufige Fragen an Lukas</h3>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => {
                    const input = document.getElementById("chat-text-input") as HTMLInputElement;
                    if (input) {
                      input.value = "Mein Konto wurde gesperrt. Was soll ich jetzt tun?";
                      input.focus();
                    }
                  }}
                  className="w-full text-left bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs text-slate-700 rounded-lg border border-slate-150 transition-colors truncate dark:bg-slate-800 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                >
                  "Konto wurde gesperrt – Was soll ich sofort tun?"
                </button>
                <button 
                  onClick={() => {
                    const input = document.getElementById("chat-text-input") as HTMLInputElement;
                    if (input) {
                      input.value = "Wie funktioniert ein Pfändungsschutzkonto (P-Konto)?";
                      input.focus();
                    }
                  }}
                  className="w-full text-left bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs text-slate-700 rounded-lg border border-slate-150 transition-colors truncate dark:bg-slate-800 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                >
                  "Wie funktioniert ein Pfändungsschutzkonto (P-Konto)?"
                </button>
                <button 
                  onClick={() => {
                    const input = document.getElementById("chat-text-input") as HTMLInputElement;
                    if (input) {
                      input.value = "Der Gerichtsvollzieher hat mir angekündigt, vorbei zu kommen.";
                      input.focus();
                    }
                  }}
                  className="w-full text-left bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs text-slate-700 rounded-lg border border-slate-150 transition-colors truncate dark:bg-slate-800 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                >
                  "Ankündigung vom Gerichtsvollzieher erhalten – Hilfe!"
                </button>
              </div>
            </div>
          </div>

          {/* Column B: Interactive Tool Box */}
          <div className="order-1 xl:order-2 xl:col-span-9 flex flex-col space-y-6" id="interactive-tool-box">
            
            {/* Top Workspace Tab list styled with elegant grouping */}
            <div className="bg-white rounded-2xl border border-slate-205 p-5 dark:border-slate-850 dark:bg-slate-900 shadow-sm" id="organized-tools-panel">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-905 dark:text-white flex items-center gap-1.5 font-sans">
                    <FileSpreadsheet className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-450" />
                    Kanzlei-Kockpit nach § 305 InsO
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Wegleitung durch die gesetzlich vorgeschriebenen Stufen der Verbraucher-Schuldbereinigung:
                  </p>
                </div>
              </div>

              {/* Phase progress navigation bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 p-1.5 rounded-xl bg-slate-50 border border-slate-150 dark:bg-slate-950/40 dark:border-slate-800" id="phase-navigation-bar">
                
                {/* Phase 1 */}
                <button
                  type="button"
                  onClick={() => {
                    setActivePhase(1);
                    setActiveTab("schulden");
                  }}
                  className={`p-3.5 rounded-lg text-left transition-all cursor-pointer flex flex-col ${
                    activePhase === 1
                      ? "bg-white text-slate-900 border border-slate-200 shadow-sm dark:bg-slate-850 dark:text-white dark:border-slate-750"
                      : "text-slate-500 hover:text-slate-805 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-1">
                    Phase I: Ersterfassung
                  </span>
                  <span className="text-xs font-bold block leading-tight">
                    Bestandsaufnahme & Schutz
                  </span>
                  <span className="text-[9px] opacity-70 mt-1 block leading-normal md:hidden lg:block">
                    Gläubigerliste, P-Konto & Fristencheck
                  </span>
                </button>

                {/* Phase 2 */}
                <button
                  type="button"
                  onClick={() => {
                    setActivePhase(2);
                    setActiveTab("bereinigung");
                  }}
                  className={`p-3.5 rounded-lg text-left transition-all cursor-pointer flex flex-col ${
                    activePhase === 2
                      ? "bg-white text-slate-900 border border-slate-200 shadow-sm dark:bg-slate-850 dark:text-white dark:border-slate-750"
                      : "text-slate-500 hover:text-slate-805 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-550 mb-1">
                    Phase II: Regulierung
                  </span>
                  <span className="text-xs font-bold block leading-tight">
                    Einigung & Vergleich plan
                  </span>
                  <span className="text-[9px] opacity-70 mt-1 block leading-normal md:hidden lg:block">
                    Schuldenbereinigungsplan, Briefe & Vollmachten
                  </span>
                </button>

                {/* Phase 3 */}
                <button
                  type="button"
                  onClick={() => {
                    setActivePhase(3);
                    setActiveTab("scheitern");
                  }}
                  className={`p-3.5 rounded-lg text-left transition-all cursor-pointer flex flex-col ${
                    activePhase === 3
                      ? "bg-white text-slate-900 border border-slate-200 shadow-sm dark:bg-slate-850 dark:text-white dark:border-slate-750"
                      : "text-slate-500 hover:text-slate-805 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">
                    Phase III: Abschluss
                  </span>
                  <span className="text-xs font-bold block leading-tight">
                    Bescheinigung & Erstattung
                  </span>
                  <span className="text-[9px] opacity-70 mt-1 block leading-normal md:hidden lg:block">
                    § 305 Scheiternsbescheid & Senats-Abrechnung
                  </span>
                </button>

              </div>

              {/* Sub-Tabs of the Active Phase */}
              <div className="grid gap-2 grid-cols-2 md:grid-cols-4" id="tab-controls-container">
                
                {/* Phase 1 Tools */}
                {activePhase === 1 && (
                  <>
                    {/* Step 1: Gläubigerverzeichnis */}
                    <button
                      onClick={() => setActiveTab("schulden")}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer group h-[88px] ${
                        activeTab === "schulden"
                          ? "bg-slate-950 text-white border-transparent shadow-sm dark:bg-white dark:text-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                      id="tab-schulden"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[8px] font-bold tracking-wider uppercase opacity-60">1. Portfolio</span>
                        <Coins className={`h-4 w-4 ${activeTab === 'schulden' ? 'text-white dark:text-slate-900' : 'text-amber-500'}`} />
                      </div>
                      <div>
                        <h3 className="text-[11px] font-black leading-tight">Gläubigerverzeichnis</h3>
                        <span className="text-[8px] opacity-75 mt-0.5 block leading-none">Forderungsaufstellung</span>
                      </div>
                    </button>

                    {/* Step 2: P-Konto */}
                    <button
                      onClick={() => setActiveTab("pkonto")}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer group h-[88px] ${
                        activeTab === "pkonto"
                          ? "bg-slate-950 text-white border-transparent shadow-sm dark:bg-white dark:text-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                      id="tab-pkonto"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[8px] font-bold tracking-wider uppercase opacity-60">2. Banken</span>
                        <Landmark className={`h-4 w-4 ${activeTab === 'pkonto' ? 'text-white dark:text-slate-900' : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <h3 className="text-[11px] font-black leading-tight">P-Konto Rechner</h3>
                        <span className="text-[8px] opacity-75 mt-0.5 block leading-none">Limit nach § 899 ZPO</span>
                      </div>
                    </button>

                    {/* Step 3: Fristen */}
                    <button
                      onClick={() => setActiveTab("fristen")}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer group h-[88px] ${
                        activeTab === "fristen"
                          ? "bg-slate-950 text-white border-transparent shadow-sm dark:bg-white dark:text-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                      id="tab-fristen"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[8px] font-bold tracking-wider uppercase opacity-60">3. Rechtspflege</span>
                        <Scale className={`h-4 w-4 ${activeTab === 'fristen' ? 'text-white dark:text-slate-900' : 'text-rose-500'}`} />
                      </div>
                      <div>
                        <h3 className="text-[11px] font-black leading-tight">Fristen-Check</h3>
                        <span className="text-[8px] opacity-75 mt-0.5 block leading-none">Gerichtliche Notfristen</span>
                      </div>
                    </button>
                  </>
                )}

                {/* Phase 2 Tools */}
                {activePhase === 2 && (
                  <>
                    {/* Step 4: Schuldenbereinigungsplan */}
                    <button
                      onClick={() => setActiveTab("bereinigung")}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer group h-[88px] ${
                        activeTab === "bereinigung"
                          ? "bg-slate-950 text-white border-transparent shadow-sm dark:bg-white dark:text-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                      id="tab-bereinigung"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[8px] font-bold tracking-wider uppercase opacity-60">4. Tilgung</span>
                        <ClipboardList className={`h-4 w-4 ${activeTab === 'bereinigung' ? 'text-white dark:text-slate-900' : 'text-indigo-505'}`} />
                      </div>
                      <div>
                        <h3 className="text-[11px] font-black leading-tight">Bereinigungsplan</h3>
                        <span className="text-[8px] opacity-75 mt-0.5 block leading-none">Einigungsplan § 305</span>
                      </div>
                    </button>

                    {/* Step 5: Inkasso-Vergleich */}
                    <button
                      onClick={() => setActiveTab("vergleich")}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer group h-[88px] ${
                        activeTab === "vergleich"
                          ? "bg-slate-950 text-white border-transparent shadow-sm dark:bg-white dark:text-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                      id="tab-vergleich"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[8px] font-bold tracking-wider uppercase opacity-60">5. Vergleich</span>
                        <ArrowRightLeft className={`h-4 w-4 ${activeTab === 'vergleich' ? 'text-white dark:text-slate-900' : 'text-emerald-500'}`} />
                      </div>
                      <div>
                        <h3 className="text-[11px] font-black leading-tight">Inkasso-Vergleich</h3>
                        <span className="text-[8px] opacity-75 mt-0.5 block leading-none">Vergleichsbereitschaft</span>
                      </div>
                    </button>

                    {/* Step 6: Briefe */}
                    <button
                      onClick={() => setActiveTab("briefe")}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer group h-[88px] ${
                        activeTab === "briefe"
                          ? "bg-slate-950 text-white border-transparent shadow-sm dark:bg-white dark:text-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                      id="tab-briefe"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[8px] font-bold tracking-wider uppercase opacity-60">6. Briefe</span>
                        <Building className={`h-4 w-4 ${activeTab === 'briefe' ? 'text-white dark:text-slate-900' : 'text-indigo-400'}`} />
                      </div>
                      <div>
                        <h3 className="text-[11px] font-black leading-tight">Brief-Generator</h3>
                        <span className="text-[8px] opacity-75 mt-0.5 block leading-none">Schreiben & Vorlagen</span>
                      </div>
                    </button>

                    {/* Step 7: Vollmacht */}
                    <button
                      onClick={() => setActiveTab("vollmacht")}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer group h-[88px] ${
                        activeTab === "vollmacht"
                          ? "bg-slate-950 text-white border-transparent shadow-sm dark:bg-white dark:text-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                      id="tab-vollmacht"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[8px] font-bold tracking-wider uppercase opacity-60">7. Vollmacht</span>
                        <FileText className={`h-4 w-4 ${activeTab === 'vollmacht' ? 'text-white dark:text-slate-900' : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <h3 className="text-[11px] font-black leading-tight">Anwaltsvollmacht</h3>
                        <span className="text-[8px] opacity-75 mt-0.5 block leading-none">Vertretungserklärung</span>
                      </div>
                    </button>
                  </>
                )}

                {/* Phase 3 Tools */}
                {activePhase === 3 && (
                  <>
                    {/* Step 8: Scheiternsbescheinigung */}
                    <button
                      onClick={() => setActiveTab("scheitern")}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer group h-[88px] ${
                        activeTab === "scheitern"
                          ? "bg-slate-950 text-white border-transparent shadow-sm dark:bg-white dark:text-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                      id="tab-scheitern"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[8px] font-bold tracking-wider uppercase opacity-60">8. Insolvenz</span>
                        <Scale className={`h-4 w-4 ${activeTab === 'scheitern' ? 'text-white dark:text-slate-900' : 'text-red-550'}`} />
                      </div>
                      <div>
                        <h3 className="text-[11px] font-black leading-tight">§ 305 Bescheinigung</h3>
                        <span className="text-[8px] opacity-75 mt-0.5 block leading-none">Gerichtliches Scheitern</span>
                      </div>
                    </button>

                    {/* Step 9: Senats-Rechnung */}
                    <button
                      onClick={() => setActiveTab("rechnung")}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer group h-[88px] ${
                        activeTab === "rechnung"
                          ? "bg-slate-950 text-white border-transparent shadow-sm dark:bg-white dark:text-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-855 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                      id="tab-rechnung"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[8px] font-bold tracking-wider uppercase opacity-60">9. Honorar</span>
                        <Building2 className={`h-4 w-4 ${activeTab === 'rechnung' ? 'text-white dark:text-slate-900' : 'text-indigo-550'}`} />
                      </div>
                      <div>
                        <h3 className="text-[11px] font-black leading-tight">Senat-Rechnung</h3>
                        <span className="text-[8px] opacity-75 mt-0.5 block leading-none">Beratungsfonds Berlin</span>
                      </div>
                    </button>
                  </>
                )}

              </div>
            </div>

            {/* Dynamic Rendering Pane */}
            <div className="transition-all duration-300" id="active-tab-content-renderer">
              {activeTab === "pkonto" && <PKontoCalculator />}
              {activeTab === "fristen" && <DeadlineChecker />}
              {activeTab === "briefe" && <LetterGenerator />}
              {activeTab === "schulden" && <DebtListAssistant />}
              {activeTab === "vergleich" && <CreditorComparer />}
              {activeTab === "rechnung" && <SenateInvoicer />}
              {activeTab === "scheitern" && <Scheiternsbescheinigung />}
              {activeTab === "vollmacht" && <VollmachtGenerator />}
              {activeTab === "bereinigung" && <Schuldenbereinigungsplan />}
            </div>

            {/* Paid Services & Objection Management info area */}
            <div className="rounded-2xl border border-slate-205 bg-white p-6 dark:border-slate-850 dark:bg-slate-900" id="paid-services-and-objections">
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-slate-500" />
                Interne Kanzlei-Richtlinien & § 305 InsO Pflichtenblatt
              </h3>
              <p className="text-xs text-slate-550 leading-relaxed mb-4">
                Als staatlich anerkannte Stelle sind wir bei der Schuldenbereinigung zur Einhaltung der gesetzlichen Abläufe verpflichtet. Vor jedem Verbraucherinsolvenzantrag muss ein ernsthafter außergerichtlicher Einigungsversuch unternommen werden. Dieses Cockpit dient als zentrales Instrument der fachgerechten Case-Analyse und dem Nachweis ordnungsmäßiger Regulierungsschritte.
              </p>
 
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/20">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    Gesetzliche Kernvorgaben:
                  </h4>
                  <ul className="text-[11px] text-slate-550 space-y-1 bg-white p-2.5 rounded-lg border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                    <li>• **Gläubigerverzeichnis:** Lückenlose Erfassung aller offenen Posten inklusive Zinsen und Beitreibungskosten.</li>
                    <li>• **Planerstellung:** Entwurf eines flexiblen Tilgungsplans auf Basis des unpfändbaren Arbeitseinkommens.</li>
                    <li>• **Bescheinigungspflicht:** Ausstellung der Scheiternsbescheinigung nach § 305 InsO erst nach expliziter Ablehnung durch Gläubiger.</li>
                  </ul>
                </div>
 
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/20">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
                    <Coins className="h-4 w-4 text-emerald-600" />
                    Kostenabwicklung & Beratungshilfe:
                  </h4>
                  <ul className="text-[11px] text-slate-550 space-y-1 bg-white p-2.5 rounded-lg border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
                    <li>• **Beratungshilfeschein:** Vorlage des Amtsgerichts-Gutscheins sichert die kostenfreie Aufarbeitung für den Mandanten.</li>
                    <li>• **Satzungsabrechnung:** Direktabrechnung des außergerichtlichen Einigungsversuchs mit der Landeskasse Berlin.</li>
                    <li>• **Zusatzvereinbarung:** Optionale Service-Pakete bei gewerblichen Mandaten oder komplexen Fremdgläubiger-Strukturen.</li>
                  </ul>
                </div>
              </div>
 
              {/* Action Hook button to request personal help */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 font-medium">Haben Sie Fragen zur Gebührenordnung der Kanzlei für Einigungsversuche?</span>
                <button 
                  onClick={() => {
                    const customEvent = new CustomEvent("ask-lukas", {
                      detail: {
                        text: "Welche gesetzliche Gebührenordnung gilt für staatlich anerkannte Stellen und wie rechnen wir den außergerichtlichen Einigungsversuch ab?",
                        autoSend: true
                      }
                    });
                    window.dispatchEvent(customEvent);
                    
                    const chatEl = document.getElementById("lukas-chat-assistant");
                    if (chatEl) {
                      chatEl.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="py-2 px-4 border border-transparent rounded-lg text-white bg-slate-900 hover:bg-slate-800 font-semibold transition-all cursor-pointer dark:bg-white dark:text-slate-900"
                  id="consultation-hook-button"
                >
                  Gebühren-Verordnung abfragen
                </button>
              </div>
 
            </div>
          </div>
 
        </div>
 
      </main>

      {/* Footer Branding Area */}
      <footer className="mt-auto border-t border-slate-205 bg-white py-6 dark:border-slate-850 dark:bg-slate-900" id="main-footer">
        <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-450 dark:text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <span>© {new Date().getFullYear()} Gesetzeslotse BERLIN. Staatlich anerkannte Beratungsstelle gemäß § 305 insO.</span>
          </div>
          <div className="flex gap-4">
            <a href="#datenschutz" className="hover:text-slate-800 dark:hover:text-slate-200">Datenschutz</a>
            <a href="#impressum" className="hover:text-slate-800 dark:hover:text-slate-200">Impressum</a>
            <a href="#haftungsausschluss" className="hover:text-slate-800 dark:hover:text-slate-200">Haftungsausschluss</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
