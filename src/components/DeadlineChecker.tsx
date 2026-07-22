import { useState, useEffect } from "react";
import { Hourglass, Calendar, CheckSquare, AlertTriangle, ArrowRight, ShieldCheck, Trash2, Users, Clock, Filter, CalendarDays } from "lucide-react";
import { logGesetzeslotseActivity } from "../lib/history";

type DocType = "mahnbescheid" | "vollstreckungsbescheid" | "gerichtsvollzieher" | "vermoegensauskunft";

interface DocConfig {
  label: string;
  daysLimit: number;
  advice: string;
  actionText: string;
}

export default function DeadlineChecker() {
  const [docType, setDocType] = useState<DocType>("mahnbescheid");
  const [receivedDate, setReceivedDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [deadlineDate, setDeadlineDate] = useState<string>("");
  const [isOverdue, setIsOverdue] = useState<boolean>(false);

  const [activeDebtorName, setActiveDebtorName] = useState<string>("Maximilian Schmidt");
  const [recordedDeadlines, setRecordedDeadlines] = useState<any[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Weekly planning calendar states
  const [filterActiveOnly, setFilterActiveOnly] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const docs: Record<DocType, DocConfig> = {
    mahnbescheid: {
      label: "Mahnbescheid (Gelber Umschlag)",
      daysLimit: 14,
      advice: "Es ist kritisch, fristgerecht für den Mandanten zu reagieren. Legen Sie im Namen des Mandanten Widerspruch gegen unberechtigte Forderungen ein. Bereiten Sie parallel einen gütlichen Einigungsplan vor, um den Erlass eines Vollstreckungsbescheids abzuwenden.",
      actionText: "Formular ausfüllen und per Einschreiben/Fax an das ausstellende Amtsgericht senden."
    },
    vollstreckungsbescheid: {
      label: "Vollstreckungsbescheid (Gelber Umschlag)",
      daysLimit: 14,
      advice: "Das ist die letzte gerichtliche Instanz vor der unmittelbaren Pfändung! Ein Einspruch hält die Vollstreckung grundsätzlich nicht auf, verschafft dem Beraterteam jedoch Verhandlungszeit. Sofortige Einleitung eines vorläufigen Zahlungsverbots oder gütliche Stundungsverhandlungen erforderlich.",
      actionText: "Sofortigen Einspruch vorbereiten und gütliche Ratenabsprachen einleiten."
    },
    gerichtsvollzieher: {
      label: "Ankündigung Gerichtsvollzieher (GV)",
      daysLimit: 7,
      advice: "Der Gerichtsvollzieher setzt meist eine einwöchige Frist vor seinem Beisein oder bittet um Kontaktaufnahme zur Vereinbarung von Raten (§ 802b ZPO). Kooperation anstreben zur Vermeidung einer Sachpfändung oder Aufenthaltsermittlung.",
      actionText: "Verbindung mit Gerichtsvollzieher aufnehmen und tragfähigen Ratenzahlungsplan vorschlagen."
    },
    vermoegensauskunft: {
      label: "Verschuldungs- / Vermögensauskunftstermine",
      daysLimit: 10,
      advice: "Meist wird ein fester Vorladungstermin genannt (oft binnen 10-14 Tagen nach Postzustellung). Sichern Sie diesen Termin unbedingt ab, da ansonsten Haftbefehlsgefahr droht (§ 802g ZPO). Bereiten Sie das Vermögensverzeichnis sorgfältig mit dem Mandanten vor.",
      actionText: "Finanzunterlagen (Bankkonten, Bezüge) ordnen, Mandanten-Vollmachten an GV übermitteln."
    }
  };

  const loadActiveDebtorAndDeadlines = () => {
    const activeName = localStorage.getItem("gesetzeslotse_active_debtor_name") || "Maximilian Schmidt";
    setActiveDebtorName(activeName);

    const stored = localStorage.getItem("gesetzeslotse_recorded_deadlines");
    if (stored) {
      try {
        setRecordedDeadlines(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse recorded deadlines", e);
      }
    } else {
      setRecordedDeadlines([]);
    }
  };

  useEffect(() => {
    loadActiveDebtorAndDeadlines();
    window.addEventListener("gesetzeslotse_profile_changed", loadActiveDebtorAndDeadlines);
    window.addEventListener("gesetzeslotse_deadline_updated", loadActiveDebtorAndDeadlines);
    return () => {
      window.removeEventListener("gesetzeslotse_profile_changed", loadActiveDebtorAndDeadlines);
      window.removeEventListener("gesetzeslotse_deadline_updated", loadActiveDebtorAndDeadlines);
    };
  }, []);

  const handleRecordDeadline = () => {
    const currentName = activeDebtorName;
    const stored = localStorage.getItem("gesetzeslotse_recorded_deadlines");
    let list: any[] = [];
    if (stored) {
      try {
        list = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }

    const newDeadline = {
      id: "deadline_" + Date.now(),
      debtorName: currentName,
      docType: docType,
      docLabel: docs[docType].label,
      receivedDate: receivedDate,
      deadlineDate: deadlineDate,
      daysRemaining: daysRemaining || 0,
      isOverdue: isOverdue
    };

    // Replace if same document type exists for the same debtor
    list = list.filter((item: any) => !(item.debtorName === currentName && item.docType === docType));
    list.unshift(newDeadline);

    localStorage.setItem("gesetzeslotse_recorded_deadlines", JSON.stringify(list));
    
    logGesetzeslotseActivity(
      "frist",
      "Frist zur Überwachung erfasst",
      `Fristüberwachung für ${docs[docType].label} (${daysRemaining} Tage verbleibend) für ${currentName} aktiviert.`
    );

    window.dispatchEvent(new CustomEvent("gesetzeslotse_deadline_updated"));

    setSuccessMsg("Frist erfolgreich erfasst und zur Überwachung vorgemerkt!");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDeleteDeadline = (id: string) => {
    const stored = localStorage.getItem("gesetzeslotse_recorded_deadlines");
    if (!stored) return;
    try {
      let list = JSON.parse(stored);
      const itemToDelete = list.find((item: any) => item.id === id);
      list = list.filter((item: any) => item.id !== id);
      localStorage.setItem("gesetzeslotse_recorded_deadlines", JSON.stringify(list));
      
      if (itemToDelete) {
        logGesetzeslotseActivity(
          "frist",
          "Fristenüberwachung beendet",
          `Überwachung der Frist für ${itemToDelete.docLabel} (${itemToDelete.debtorName}) aufgehoben.`
        );
      }
      
      window.dispatchEvent(new CustomEvent("gesetzeslotse_deadline_updated"));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!receivedDate) return;
    const received = new Date(receivedDate);
    const limitDays = docs[docType].daysLimit;
    
    const deadline = new Date(received);
    deadline.setDate(deadline.getDate() + limitDays);
    
    setDeadlineDate(deadline.toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }));

    const today = new Date();
    // Set hours to 0 to compare exact dates
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    setDaysRemaining(diffDays);
    setIsOverdue(diffDays < 0);
  }, [docType, receivedDate]);

  const getWochenAnsichtData = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find the Monday of the current week
    const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, etc.
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    
    const weeks: {
      weekNum: number;
      startDate: Date;
      endDate: Date;
      days: { date: Date; isToday: boolean; deadlines: any[] }[];
    }[] = [];
    
    for (let w = 0; w < 5; w++) {
      const weekStartDate = new Date(monday);
      weekStartDate.setDate(monday.getDate() + w * 7);
      
      const days: { date: Date; isToday: boolean; deadlines: any[] }[] = [];
      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(weekStartDate);
        dayDate.setDate(weekStartDate.getDate() + d);
        
        const isDayToday = dayDate.getTime() === today.getTime();
        
        const dayDeadlines = recordedDeadlines.filter(item => {
          if (filterActiveOnly && item.debtorName !== activeDebtorName) return false;
          
          const deadDate = new Date(item.receivedDate);
          deadDate.setDate(deadDate.getDate() + (item.docType === "mahnbescheid" || item.docType === "vollstreckungsbescheid" ? 14 : item.docType === "gerichtsvollzieher" ? 7 : 10));
          deadDate.setHours(0,0,0,0);
          
          return deadDate.getTime() === dayDate.getTime();
        });
        
        days.push({
          date: dayDate,
          isToday: isDayToday,
          deadlines: dayDeadlines
        });
      }
      
      weeks.push({
        weekNum: w + 1,
        startDate: weekStartDate,
        endDate: new Date(days[6].date),
        days
      });
    }
    
    return weeks;
  };

  const wochenData = getWochenAnsichtData();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900" id="deadline-checker-root">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Hourglass className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          Fristen-Check & Notfrist-Überwachung
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Rechtliche Fristen bei einer Zwangsvollstreckung sind kurz. Ermitteln Sie die Fristen für die erhaltenen gerichtlichen Poststücke des Mandanten:
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Erhaltenes Dokument</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-slate-900 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200 dark:focus:border-slate-100"
              id="doc-selector"
            >
              {Object.entries(docs).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Zustellungsdatum (Poststempel/Einwurf)</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-800 focus:border-slate-900 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200 dark:focus:border-slate-100"
                id="received-date-input"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">Das Fristdatum berechnet sich nach dem gesetzlich dokumentierten Tag der Zustellung (meist auf dem gelben Briefkuvert notiert).</p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl bg-slate-50/50 p-5 border border-slate-100 dark:bg-slate-950/20 dark:border-slate-800" id="deadline-visualizer">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3 text-center">Verbleibende Reaktionszeit</h3>
            
            {daysRemaining !== null && (
              <div className="text-center mb-4">
                {isOverdue ? (
                  <div className="inline-flex flex-col items-center">
                    <span className="text-5xl font-extrabold text-red-600 dark:text-red-400">ÜBERFÄLLIG</span>
                    <span className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Die gerichtliche Frist ist verstrichen!
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex flex-col items-center">
                    <span className={`text-6xl font-extrabold tracking-tight ${daysRemaining <= 3 ? "text-red-500" : daysRemaining <= 7 ? "text-amber-500" : "text-slate-800 dark:text-slate-200"}`}>
                      {daysRemaining}
                    </span>
                    <span className="text-sm font-semibold uppercase text-slate-500 mt-1">
                      Tag{daysRemaining === 1 ? "" : "e"} übrig
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-slate-200/50 pt-3 text-xs space-y-2 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Letzter Fristtag:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{deadlineDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gesetzlicher Zeitraum:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{docs[docType].daysLimit} Tage ab Zustellung</span>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-semibold text-center animate-fadeIn">
                {successMsg}
              </div>
            )}

            <button
              onClick={handleRecordDeadline}
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              id="record-deadline-btn"
            >
              <CheckSquare className="h-4 w-4" />
              Frist offiziell erfassen & überwachen
            </button>

            <div className="p-3 bg-white rounded-lg border border-slate-150 text-xs dark:bg-slate-900 dark:border-slate-800 leading-relaxed text-slate-600 dark:text-slate-350">
              <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                Handlungsempfehlung:
              </p>
              {docs[docType].advice}
            </div>

            <div className="p-3 bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center justify-between dark:bg-white dark:text-slate-900">
              <span className="truncate">{docs[docType].actionText}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* List of active tracked deadlines */}
      {recordedDeadlines.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-850 animate-fadeIn" id="recorded-deadlines-section">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-100 flex items-center gap-1.5 mb-4">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
            Aktive Fristenüberwachung für {activeDebtorName}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-450 dark:text-slate-400 font-mono text-[9px] uppercase font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">Dokument</th>
                  <th className="p-3">Zustellungsdatum</th>
                  <th className="p-3">Fristende (Notfrist)</th>
                  <th className="p-3">Verbleibende Zeit</th>
                  <th className="p-3 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recordedDeadlines.map((item) => {
                  // Recompute exact days remaining to avoid stale cache
                  const deadDate = new Date(item.receivedDate);
                  deadDate.setDate(deadDate.getDate() + (item.docType === "mahnbescheid" || item.docType === "vollstreckungsbescheid" ? 14 : item.docType === "gerichtsvollzieher" ? 7 : 10));
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  deadDate.setHours(0,0,0,0);
                  const diffTime = deadDate.getTime() - today.getTime();
                  const curDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const curOverdue = curDaysRemaining < 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/25">
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-250">{item.docLabel}</td>
                      <td className="p-3 font-mono text-slate-500">{new Date(item.receivedDate).toLocaleDateString("de-DE")}</td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        {deadDate.toLocaleDateString("de-DE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                      </td>
                      <td className="p-3">
                        {curOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 font-bold text-[10px]">
                            ÜBERFÄLLIG ({Math.abs(curDaysRemaining)} Tage)
                          </span>
                        ) : curDaysRemaining <= 7 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 font-bold text-[10px] animate-pulse">
                            Dringend ({curDaysRemaining} Tage)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium text-[10px]">
                            {curDaysRemaining} Tage verbleibend
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteDeadline(item.id)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors cursor-pointer"
                          title="Überwachung beenden"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 30-Tage Kanzlei-Fristenkalender (Weekly Calendar Timeline) */}
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-850 animate-fadeIn" id="kanzlei-planungskalender-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
              <CalendarDays className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
              Kanzlei-Planungskalender (Wochenansicht – 30 Tage)
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Kalendarischer Zeitstrahl aller anstehenden gerichtlichen Notfristen zur Ressourcenplanung.
            </p>
          </div>

          {/* Quick-Filter Buttons */}
          <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 shrink-0">
            <button
              onClick={() => setFilterActiveOnly(false)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                !filterActiveOnly
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-850 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              <Users className="h-3 w-3" />
              Alle Mandanten
            </button>
            <button
              onClick={() => setFilterActiveOnly(true)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterActiveOnly
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-850 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              <Filter className="h-3 w-3" />
              Aktiv ({activeDebtorName.split(" ")[0]})
            </button>
          </div>
        </div>

        {/* Calendar Matrix Grid Container */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/5 p-4 min-w-[760px]">
          {/* Weekdays header row */}
          <div className="grid grid-cols-12 gap-2 mb-2 pb-2 border-b border-slate-150 dark:border-slate-800/60 font-mono text-[9px] uppercase font-bold text-slate-400">
            <div className="col-span-2 text-left pl-2">Kanzlei-Woche</div>
            <div className="col-span-10 grid grid-cols-7 gap-2">
              <div className="text-center">Mo</div>
              <div className="text-center">Di</div>
              <div className="text-center">Mi</div>
              <div className="text-center">Do</div>
              <div className="text-center">Fr</div>
              <div className="text-center text-rose-500/80">Sa</div>
              <div className="text-center text-rose-500/80">So</div>
            </div>
          </div>

          {/* Weeks Rows */}
          <div className="space-y-3">
            {wochenData.map((week) => (
              <div 
                key={week.weekNum} 
                className="grid grid-cols-12 gap-2 items-stretch"
              >
                {/* Week Label Card */}
                <div className="col-span-2 flex flex-col justify-center p-2.5 bg-slate-100/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-xl">
                  <span className="text-[10px] font-black text-slate-800 dark:text-slate-350">Woche {week.weekNum}</span>
                  <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                    {week.startDate.getDate().toString().padStart(2, "0")}.{(week.startDate.getMonth() + 1).toString().padStart(2, "0")}.
                  </span>
                </div>

                {/* 7 Days of current week */}
                <div className="col-span-10 grid grid-cols-7 gap-2">
                  {week.days.map((day, dIdx) => {
                    const isSelected = selectedDay && selectedDay.getTime() === day.date.getTime();
                    const hasDeadlines = day.deadlines.length > 0;
                    
                    return (
                      <div
                        key={dIdx}
                        onClick={() => setSelectedDay(day.date)}
                        className={`min-h-[74px] p-1.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer group relative ${
                          day.isToday
                            ? "bg-indigo-600/5 dark:bg-indigo-500/5 border-indigo-600 dark:border-indigo-500 ring-1 ring-indigo-550/25"
                            : isSelected
                            ? "bg-slate-200/30 dark:bg-slate-800/30 border-slate-400 dark:border-slate-600"
                            : "bg-white dark:bg-slate-900 border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-755"
                        }`}
                      >
                        {/* Day indicator & date */}
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-mono font-bold ${day.isToday ? "text-indigo-650 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-605"}`}>
                            {day.date.getDate().toString().padStart(2, "0")}.{(day.date.getMonth() + 1).toString().padStart(2, "0")}
                          </span>
                          {day.isToday && (
                            <span className="text-[8px] font-black bg-indigo-600 text-white dark:bg-indigo-500/20 dark:text-indigo-400 px-1 rounded uppercase tracking-wider scale-90">
                              Heute
                            </span>
                          )}
                        </div>

                        {/* Deadlines area in cell */}
                        <div className="mt-1 space-y-1">
                          {day.deadlines.slice(0, 2).map((item, itemIdx) => {
                            let badgeColor = "bg-rose-50 text-rose-700 border-rose-150 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/30";
                            if (item.docType === "gerichtsvollzieher" || item.docType === "vermoegensauskunft") {
                              badgeColor = "bg-amber-50 text-amber-700 border-amber-150 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30";
                            }
                            return (
                              <div
                                key={itemIdx}
                                className={`text-[8px] font-black tracking-tight px-1 py-0.5 rounded border leading-tight truncate ${badgeColor}`}
                                title={`${item.debtorName}: ${item.docLabel}`}
                              >
                                {item.debtorName.split(" ")[0].substring(0, 8)}: {item.docType === "mahnbescheid" ? "Mahn" : item.docType === "vollstreckungsbescheid" ? "Vollst" : item.docType === "gerichtsvollzieher" ? "GV" : "Ausk"}
                              </div>
                            );
                          })}
                          
                          {day.deadlines.length > 2 && (
                            <div className="text-[7px] font-bold text-indigo-600 dark:text-indigo-400 text-center">
                              + {day.deadlines.length - 2} weitere
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Day Details Panel */}
        {selectedDay && (() => {
          const matchingDay = wochenData
            .flatMap(w => w.days)
            .find(d => d.date.getTime() === selectedDay.getTime());
          
          if (!matchingDay) return null;
          
          return (
            <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/20 animate-fadeIn">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/60 dark:border-slate-800/50">
                <h4 className="text-xs font-bold text-slate-805 dark:text-slate-100 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  Detail-Ansicht für {selectedDay.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  Schließen
                </button>
              </div>

              {matchingDay.deadlines.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2 italic">
                  An diesem Tag stehen keine gerichtlichen Fristen für die Kanzlei an.
                </p>
              ) : (
                <div className="space-y-3">
                  {matchingDay.deadlines.map((item, idx) => {
                    const received = new Date(item.receivedDate);
                    const daysRemainingComputed = Math.ceil((selectedDay.getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                    const isOverdueComputed = daysRemainingComputed < 0;

                    return (
                      <div 
                        key={idx}
                        className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded uppercase">
                              {item.debtorName}
                            </span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-155">
                              {item.docLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-normal">
                            <strong>Zustellung:</strong> {received.toLocaleDateString("de-DE")} | <strong>Notfrist:</strong> {docs[item.docType as DocType]?.daysLimit} Tage
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {isOverdueComputed ? (
                            <span className="text-[10px] font-bold bg-red-105 text-red-800 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 rounded-md">
                              Frist abgelaufen!
                            </span>
                          ) : (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${daysRemainingComputed <= 3 ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-450" : daysRemainingComputed <= 7 ? "bg-amber-100 text-amber-800 dark:bg-amber-955/20 dark:text-amber-400" : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400"}`}>
                              Noch {daysRemainingComputed} Tag{daysRemainingComputed === 1 ? "" : "e"}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteDeadline(item.id)}
                            className="p-1.5 hover:bg-rose-50 hover:text-red-500 text-slate-400 rounded-lg transition-colors cursor-pointer"
                            title="Aus Überwachung entfernen"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
