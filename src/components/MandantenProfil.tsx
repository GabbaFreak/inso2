import React, { useState, useEffect } from "react";
import { User, Briefcase, Landmark, MapPin, Calendar, Plus, Trash2, Edit2, Check, CheckCircle, RefreshCw, DollarSign } from "lucide-react";
import { DebtorProfile } from "./DebtListAssistant";
import { logGesetzeslotseActivity } from "../lib/history";

export default function MandantenProfil() {
  const [profiles, setProfiles] = useState<DebtorProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>("schmidt");
  
  // Edit mode states
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  
  // Form fields
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [pob, setPob] = useState("");
  const [address, setAddress] = useState("");
  const [court, setCourt] = useState("");
  const [isEmployed, setIsEmployed] = useState<boolean>(false);
  const [employer, setEmployer] = useState("");
  const [netIncome, setNetIncome] = useState<number>(0);

  const [notification, setNotification] = useState<string | null>(null);

  // Load profiles and active ID from localStorage
  const loadProfiles = () => {
    const storedActive = localStorage.getItem("gesetzeslotse_active_profile") || "schmidt";
    setActiveProfileId(storedActive);

    const storedProfiles = localStorage.getItem("gesetzeslotse_profiles");
    if (storedProfiles) {
      try {
        setProfiles(JSON.parse(storedProfiles));
      } catch (e) {
        console.error("Failed to parse profiles in MandantenProfil", e);
      }
    } else {
      // Default fallback matching DebtListAssistant
      const defaultList: DebtorProfile[] = [
        {
          id: "schmidt",
          name: "Maximilian Schmidt",
          dob: "15.03.1985",
          pob: "Berlin",
          address: "Heidestraße 48, 10557 Berlin",
          competentCourt: "Amtsgericht Wedding - Insolvenzgericht -",
          isEmployed: true,
          employer: "Acme Logistik GmbH",
          netIncome: 1850.00
        },
        {
          id: "weber",
          name: "Gabriele Weber",
          dob: "28.11.1972",
          pob: "Potsdam",
          address: "Karl-Marx-Str. 12, 12043 Berlin",
          competentCourt: "Amtsgericht Tempelhof-Kreuzberg - Insolvenzgericht -",
          isEmployed: false,
          employer: "",
          netIncome: 0
        }
      ];
      setProfiles(defaultList);
      localStorage.setItem("gesetzeslotse_profiles", JSON.stringify(defaultList));
    }
  };

  useEffect(() => {
    loadProfiles();
    window.addEventListener("gesetzeslotse_profile_changed", loadProfiles);
    return () => {
      window.removeEventListener("gesetzeslotse_profile_changed", loadProfiles);
    };
  }, []);

  const triggerProfileChangedEvent = (activeId: string, updatedProfiles: DebtorProfile[]) => {
    const found = updatedProfiles.find(p => p.id === activeId) || updatedProfiles[0];
    if (found) {
      localStorage.setItem("gesetzeslotse_active_profile", found.id);
      localStorage.setItem("gesetzeslotse_active_debtor_name", found.name);
      localStorage.setItem("gesetzeslotse_active_debtor_dob", found.dob);
      localStorage.setItem("gesetzeslotse_active_debtor_pob", found.pob);
      localStorage.setItem("gesetzeslotse_active_debtor_address", found.address);
      localStorage.setItem("gesetzeslotse_active_debtor_court", found.competentCourt);
      localStorage.setItem("gesetzeslotse_active_debtor_is_employed", found.isEmployed ? "true" : "false");
      localStorage.setItem("gesetzeslotse_active_debtor_employer", found.employer || "");
      localStorage.setItem("gesetzeslotse_active_debtor_net_income", String(found.netIncome || 0));
    }
    localStorage.setItem("gesetzeslotse_profiles", JSON.stringify(updatedProfiles));
    setProfiles(updatedProfiles);
    if (found) {
      setActiveProfileId(found.id);
    }
    
    // Dispatch events to trigger recalculations/syncs across other panels
    window.dispatchEvent(new CustomEvent("gesetzeslotse_profile_changed"));
  };

  const handleSelectActive = (profile: DebtorProfile) => {
    triggerProfileChangedEvent(profile.id, profiles);
    
    logGesetzeslotseActivity(
      "schulden",
      "Mandanten-Profil gewechselt",
      `Mandant gewechselt zu ${profile.name}. Daten stehen nun allen Tools zur Verfügung.`
    );

    showNotification(`Mandant "${profile.name}" ist nun als aktives Kanzlei-Profil ausgewählt!`);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingProfileId(null);
    setName("");
    setDob("");
    setPob("Berlin");
    setAddress("");
    setCourt("Amtsgericht Wedding - Insolvenzgericht -");
    setIsEmployed(false);
    setEmployer("");
    setNetIncome(0);
  };

  const handleStartEdit = (p: DebtorProfile) => {
    setEditingProfileId(p.id);
    setIsCreating(false);
    setName(p.name);
    setDob(p.dob);
    setPob(p.pob);
    setAddress(p.address);
    setCourt(p.competentCourt);
    setIsEmployed(!!p.isEmployed);
    setEmployer(p.employer || "");
    setNetIncome(p.netIncome || 0);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Name ist ein Pflichtfeld.");
      return;
    }

    let updatedProfiles = [...profiles];

    if (isCreating) {
      const newId = "custom_" + Date.now();
      const newProfile: DebtorProfile = {
        id: newId,
        name: name.trim(),
        dob: dob.trim() || "01.01.1980",
        pob: pob.trim() || "Berlin",
        address: address.trim() || "Musterstraße 1, 10115 Berlin",
        competentCourt: court.trim() || "Amtsgericht Wedding - Insolvenzgericht -",
        isEmployed,
        employer: isEmployed ? employer.trim() : "",
        netIncome: isEmployed ? Number(netIncome) || 0 : 0
      };
      updatedProfiles.push(newProfile);
      
      logGesetzeslotseActivity(
        "schulden",
        "Mandanten-Profil erstellt",
        `Neues Profil für ${newProfile.name} angelegt.`
      );

      triggerProfileChangedEvent(newId, updatedProfiles);
      setIsCreating(false);
      showNotification(`Mandanten-Profil für "${newProfile.name}" erfolgreich erstellt.`);
    } else if (editingProfileId) {
      updatedProfiles = updatedProfiles.map(p => {
        if (p.id === editingProfileId) {
          return {
            ...p,
            name: name.trim(),
            dob: dob.trim(),
            pob: pob.trim(),
            address: address.trim(),
            competentCourt: court.trim(),
            isEmployed,
            employer: isEmployed ? employer.trim() : "",
            netIncome: isEmployed ? Number(netIncome) || 0 : 0
          };
        }
        return p;
      });

      logGesetzeslotseActivity(
        "schulden",
        "Mandanten-Profil aktualisiert",
        `Daten von Mandant ${name} wurden zentral aktualisiert.`
      );

      triggerProfileChangedEvent(activeProfileId, updatedProfiles);
      setEditingProfileId(null);
      showNotification(`Profil von "${name}" erfolgreich aktualisiert.`);
    }
  };

  const handleDelete = (id: string, nameToDelete: string) => {
    if (id === "schmidt" || id === "weber") {
      alert("Die Standard-Mandanten Maximilian Schmidt und Gabriele Weber können nicht gelöscht werden.");
      return;
    }
    if (!confirm(`Soll das Profil für "${nameToDelete}" wirklich unwiderruflich gelöscht werden?`)) {
      return;
    }

    const updated = profiles.filter(p => p.id !== id);
    let nextActiveId = activeProfileId;
    if (activeProfileId === id) {
      nextActiveId = "schmidt";
    }

    logGesetzeslotseActivity(
      "schulden",
      "Mandanten-Profil gelöscht",
      `Mandant ${nameToDelete} gelöscht.`
    );

    triggerProfileChangedEvent(nextActiveId, updated);
    showNotification(`Mandanten-Profil "${nameToDelete}" gelöscht.`);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-2xl p-6 shadow-sm animate-fadeIn" id="mandanten-profil-panel">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5 font-sans">
            <User className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            Zentrales Mandanten-Profil
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Zentrale Erfassung und Pflege aller persönlichen Daten. Einmal eingeben, automatisch in allen Rechnern und Briefvorlagen nutzen.
          </p>
        </div>
        {!isCreating && !editingProfileId && (
          <button
            onClick={handleStartCreate}
            className="self-start sm:self-center py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Neuer Mandant
          </button>
        )}
      </div>

      {notification && (
        <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5 animate-fadeIn">
          <CheckCircle className="h-4 w-4" />
          {notification}
        </div>
      )}

      {/* Profile Form (Create or Edit) */}
      {(isCreating || editingProfileId) && (
        <form onSubmit={handleSave} className="bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-slate-150 dark:border-slate-800 p-5 mb-8 animate-fadeIn">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-100 flex items-center gap-1.5 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
            {isCreating ? "Neuen Mandanten anlegen" : "Mandanten-Profil bearbeiten"}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Row 1: Name & DOB */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Vollständiger Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="z.B. Maximilian Schmidt"
                required
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-550"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Geburtsdatum</label>
              <input
                type="text"
                value={dob}
                onChange={e => setDob(e.target.value)}
                placeholder="z.B. 15.03.1985"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-550"
              />
            </div>

            {/* Row 2: Birthplace & Address */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Geburtsort</label>
              <input
                type="text"
                value={pob}
                onChange={e => setPob(e.target.value)}
                placeholder="z.B. Berlin"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-550"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Anschrift (Straße, Hausnr., PLZ, Ort)</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="z.B. Heidestraße 48, 10557 Berlin"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-550"
              />
            </div>

            {/* Row 3: Competent Court */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Zuständiges Insolvenzgericht</label>
              <input
                type="text"
                value={court}
                onChange={e => setCourt(e.target.value)}
                placeholder="z.B. Amtsgericht Wedding - Insolvenzgericht -"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-550"
              />
            </div>

            {/* Row 4: Employment Status checkbox */}
            <div className="md:col-span-2 flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="isEmployedCheckbox"
                checked={isEmployed}
                onChange={e => setIsEmployed(e.target.checked)}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor="isEmployedCheckbox" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                In aktivem Beschäftigungsverhältnis (Arbeitnehmer)
              </label>
            </div>

            {/* Conditional Employment inputs */}
            {isEmployed && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Arbeitgeber Name</label>
                  <input
                    type="text"
                    value={employer}
                    onChange={e => setEmployer(e.target.value)}
                    placeholder="z.B. Acme Logistik GmbH"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-550"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Nettoeinkommen (monatlich in €)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">€</span>
                    <input
                      type="number"
                      step="0.01"
                      value={netIncome || ""}
                      onChange={e => setNetIncome(parseFloat(e.target.value) || 0)}
                      placeholder="1850.00"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-550"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-5 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingProfileId(null);
              }}
              className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
            >
              Speichern & Aktivieren
            </button>
          </div>
        </form>
      )}

      {/* Grid of existing profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {profiles.map(p => {
          const isActive = p.id === activeProfileId;
          return (
            <div
              key={p.id}
              className={`rounded-2xl border p-5 transition-all flex flex-col justify-between relative ${
                isActive
                  ? "border-indigo-600 bg-indigo-50/10 dark:border-indigo-500/30 dark:bg-indigo-950/10 shadow-md ring-1 ring-indigo-605/20"
                  : "border-slate-200 bg-slate-50/20 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-50/40"
              }`}
            >
              {/* Badge for Active Status */}
              {isActive && (
                <span className="absolute top-4 right-4 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 animate-fadeIn">
                  <Check className="h-3 w-3 stroke-[3]" />
                  Aktiviert
                </span>
              )}

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2.5 rounded-xl ${isActive ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      {p.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">Geburtsdatum: {p.dob || "Unbekannt"}</p>
                  </div>
                </div>

                <div className="space-y-2 mt-4 text-[11px] text-slate-600 dark:text-slate-350">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span className="leading-tight">
                      <strong>Anschrift:</strong> {p.address || "-"} <span className="opacity-60">({p.pob ? `geb. in ${p.pob}` : ""})</span>
                    </span>
                  </div>

                  <div className="flex items-start gap-1.5">
                    <Landmark className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span className="leading-tight">
                      <strong>Gericht:</strong> {p.competentCourt || "-"}
                    </span>
                  </div>

                  <div className="flex items-start gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span className="leading-tight">
                      <strong>Arbeit:</strong> {p.isEmployed ? `Angestellt bei ${p.employer || "Unbekannt"}` : "Keine Beschäftigung"}
                    </span>
                  </div>

                  <div className="flex items-start gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span className="leading-tight">
                      <strong>Nettoeinkommen:</strong> {p.isEmployed ? `€ ${(p.netIncome || 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })} / Monat` : "€ 0,00"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(p)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-605 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                    title="Profil bearbeiten"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Bearbeiten</span>
                  </button>

                  {p.id !== "schmidt" && p.id !== "weber" && (
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id, p.name)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-650 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 dark:border-rose-900/40 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center"
                      title="Profil löschen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {!isActive && (
                  <button
                    type="button"
                    onClick={() => handleSelectActive(p)}
                    className="py-1.5 px-3 bg-indigo-605 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Als aktiv auswählen</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
