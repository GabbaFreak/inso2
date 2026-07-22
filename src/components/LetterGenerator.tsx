import React, { useState, useRef, useEffect } from "react";
import { FileDown, Copy, Check, FileText, Send, User, MapPin, Plus, Trash2, Bookmark, Save, Sparkles, FolderHeart, Eye, Search, X, RotateCcw, Download, Printer } from "lucide-react";
import { LetterData, LetterTemplateType, Creditor } from "../types";
import { logGesetzeslotseActivity } from "../lib/history";
import { exportElementToPdf } from "../lib/pdfExport";
import { Document as DocxDocument, Packer as DocxPacker, Paragraph as DocxParagraph, TextRun as DocxTextRun } from "docx";
import { jsPDF } from "jspdf";

export default function LetterGenerator() {
  const [templateType, setTemplateType] = useState<LetterTemplateType>("ratenzahlung");
  const [copied, setCopied] = useState<boolean>(false);
  const [formData, setFormData] = useState<LetterData>({
    senderName: "Max Mustermann (Mandant)",
    senderStreet: "Musterstraße 12",
    senderCity: "10115 Berlin",
    creditorName: "Inkasso Berlin GmbH",
    creditorStreet: "Friedrichstraße 200",
    creditorCity: "10117 Berlin",
    fileReference: "ABS-2024-99812",
    debtAmount: "1250.00",
    installmentAmount: "50.00",
    date: new Date().toLocaleDateString("de-DE")
  });

  const [creditors, setCreditors] = useState<Creditor[]>([]);
  const [showSaveSuccess, setShowSaveSuccess] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [previewTab, setPreviewTab] = useState<"editor" | "din5008">("din5008");
  const [editedLetterText, setEditedLetterText] = useState<string>("");
  const [isEdited, setIsEdited] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx">("pdf");
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  const formatAmount = (amt?: string) => {
    if (!amt) return "-";
    const parsed = parseFloat(amt);
    return isNaN(parsed) ? amt : `€ ${parsed.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`;
  };

  const filteredCreditors = creditors.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.street.toLowerCase().includes(term) ||
      c.city.toLowerCase().includes(term) ||
      (c.fileReference && c.fileReference.toLowerCase().includes(term))
    );
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen]);

  useEffect(() => {
    const stored = localStorage.getItem("gesetzeslotse_creditors");
    if (stored) {
      try {
        setCreditors(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse creditors", e);
      }
    } else {
      const defaults: Creditor[] = [
        {
          id: "def-1",
          name: "Inkasso Berlin GmbH",
          street: "Friedrichstraße 200",
          city: "10117 Berlin",
          fileReference: "ABS-2024-99812",
          debtAmount: "1250.00"
        },
        {
          id: "def-2",
          name: "Stromversorgung Spandau AG",
          street: "Neuendorfer Str. 39",
          city: "13585 Berlin",
          fileReference: "SV-38827-X",
          debtAmount: "480.50"
        }
      ];
      setCreditors(defaults);
      localStorage.setItem("gesetzeslotse_creditors", JSON.stringify(defaults));
    }
  }, []);

  useEffect(() => {
    const handleApplyDraft = (e: any) => {
      const data = e.detail;
      if (data) {
        setFormData(prev => ({
          ...prev,
          creditorName: data.creditorName || prev.creditorName,
          creditorStreet: data.creditorStreet || prev.creditorStreet,
          creditorCity: data.creditorCity || prev.creditorCity,
          fileReference: data.fileReference || prev.fileReference,
          debtAmount: data.debtAmount || prev.debtAmount
        }));
        if (data.templateType) {
          setTemplateType(data.templateType);
        }
      }
    };

    window.addEventListener("apply_draft_to_letter", handleApplyDraft);

    // Initial check for any transfers on mount
    const checkDraft = localStorage.getItem("gesetzeslotse_letter_draft");
    if (checkDraft) {
      try {
        const parsed = JSON.parse(checkDraft);
        setFormData(prev => ({
          ...prev,
          creditorName: parsed.creditorName || prev.creditorName,
          creditorStreet: parsed.creditorStreet || prev.creditorStreet,
          creditorCity: parsed.creditorCity || prev.creditorCity,
          fileReference: parsed.fileReference || prev.fileReference,
          debtAmount: parsed.debtAmount || prev.debtAmount
        }));
        if (parsed.templateType) {
          setTemplateType(parsed.templateType);
        }
        localStorage.removeItem("gesetzeslotse_letter_draft");
      } catch (e) {
        console.error(e);
      }
    }

    return () => {
      window.removeEventListener("apply_draft_to_letter", handleApplyDraft);
    };
  }, []);

  const saveCurrentCreditor = () => {
    if (!formData.creditorName.trim()) {
      alert("Bitte tragen Sie zuerst einen Gläubigernamen ein.");
      return;
    }
    
    const newCreditor: Creditor = {
      id: Math.random().toString(),
      name: formData.creditorName,
      street: formData.creditorStreet,
      city: formData.creditorCity,
      fileReference: formData.fileReference,
      debtAmount: formData.debtAmount
    };

    // Filter duplicates to replace
    const updated = [newCreditor, ...creditors.filter(c => c.name.toLowerCase() !== newCreditor.name.toLowerCase())];
    setCreditors(updated);
    localStorage.setItem("gesetzeslotse_creditors", JSON.stringify(updated));
    
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  };

  const selectCreditor = (cred: Creditor) => {
    setFormData(prev => ({
      ...prev,
      creditorName: cred.name,
      creditorStreet: cred.street,
      creditorCity: cred.city,
      fileReference: cred.fileReference || prev.fileReference,
      debtAmount: cred.debtAmount || prev.debtAmount
    }));
  };

  const deleteCreditor = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = creditors.filter(c => c.id !== id);
    setCreditors(updated);
    localStorage.setItem("gesetzeslotse_creditors", JSON.stringify(updated));
  };

  const letterRef = useRef<HTMLDivElement>(null);

  const getLetterContent = (): string => {
    switch (templateType) {
      case "ratenzahlung":
        return `Gesetzeslotse BERLIN Schuldnerberatung
Kanzlei Berlin-Mitte
Littenstraße 10, 10179 Berlin

An:
${formData.creditorName}
${formData.creditorStreet}
${formData.creditorCity}

Datum: ${formData.date}

Betreff: Außergerichtlicher Einigungsversuch (§ 305 InsO) / gütliche Ratenzahlung
In Vertretung für / Mandant: ${formData.senderName}
Ihr Zeichen / Aktenzeichen: ${formData.fileReference}

Sehr geehrte Damen und Herren,

in vorbezeichneter Angelegenheit vertreten wir die rechtlichen Interessen des oben genannten Mandanten. Bezug nehmend auf Ihre ausstehende Restforderung in Höhe von insgesamt € ${Number(formData.debtAmount).toLocaleString("de-DE", { minimumFractionDigits: 2 })} überreichen wir beigefügte Vertretungsvollmacht.

Aufgrund der angespannten persönlichen und wirtschaftlichen Verhältnisse unseres Mandanten ist ein Einmalausgleich der Forderung unmöglich. Zur gütlichen Regulierung und der Abwendung kostenintensiver Zwangsvollstreckungsmaßnahmen schlagen wir hiermit im gesetzlichen Rahmen folgenden Tilgungsplan vor:

Wir bieten an, die offene Gesamtforderung ab dem kommenden Ersten des Monats in monatlichen Raten in Höhe von:

>>> € ${Number(formData.installmentAmount).toLocaleString("de-DE", { minimumFractionDigits: 2 })} <<<

zu tilgen, bis die anerkannte Hauptforderung vollständig ausgeglichen ist. Dieses Angebot versteht sich unter der Prämisse, dass Sie ab sofort auf weitere Zinsansprüche und zusätzliche Säumniszuschläge/Beitreibungsgebühren verzichten und eventuell bereits eingeleitete Vollstreckungsmaßnahmen einstweilen ruhen lassen.

Wir bitten um Prüfung unseres Vergleichsangebots und um schriftliche Bestätigung innerhalb von 14 Tagen, sowie um Bekanntgabe der entsprechenden Empfängerkontonummer.

Mit freundlichen Grüßen,
Gesetzeslotse BERLIN Schuldnerberatung
(Als Bevollmächtigter i.A.)`;

      case "pkonto_conversion":
        return `Gesetzeslotse BERLIN Schuldnerberatung
Kanzlei Berlin-Mitte
Littenstraße 10, 10179 Berlin

An die:
${formData.creditorName} (Kreditinstitut des Mandanten)
${formData.creditorStreet}
${formData.creditorCity}

Datum: ${formData.date}

Betreff: Antrag auf Umwandlung des Girokontos in ein Pfändungsschutzkonto (P-Konto)
Konto- / IBAN-Nummer: ${formData.fileReference}
Verfahrensbeteiligter / Mandant: ${formData.senderName}

Sehr geehrte Damen und Herren,

als bevollmächtigte Schuldnerberatung vertreten wir die Interessen des oben genannten Kontoinhabers. Namens und in Vollmacht unseres Mandanten beantragen wir hiermit mit sofortiger Wirkung die Umwandlung des bei Ihnen geführten Girokontos mit der genannten IBAN/Kontonummer in ein Pfändungsschutzkonto (P-Konto) gemäß § 850k Abs. 7 ZPO in Verbindung mit § 902 SGB III.

Wir weisen vorsorglich darauf hin, dass Sie gesetzlich verpflichtet sind, diese Umwandlung innerhalb von 4 Geschäftstagen ab Antragstellung kostenfrei durchzuführen. Zudem fordern wir Sie auf, die dem Mandanten zustehenden gesetzlichen Freibeträge ab dem Tag der Umwandlung auf dem Konto zu sichern.

Eine formelle Erhöhungsbescheinigung über die erweiterten Freibeträge für berechtigte Unterhaltspersonen liegt diesem Schreiben anbei / verbleibt bei unseren Akten und wird demnächst nachgereicht.

Bitte bestätigen Sie uns die erfolgreiche Erledigung dieses Auftrags und das Datum der P-Konto-Aktivierung schriftlich.

Mit freundlichen Grüßen,
Gesetzeslotse BERLIN Schuldnerberatung
(Als Bevollmächtigter i.A.)`;

      case "brief_gerichtsvollzieher":
        return `Gesetzeslotse BERLIN Schuldnerberatung
Kanzlei Berlin-Mitte
Littenstraße 10, 10179 Berlin

An den/die zuständige/n Gerichtsvollzieher/in:
Gerichtsvollzieher-Verteilungsstelle
Amtsgericht Mitte Berlin
Littenstraße 12-17
10179 Berlin

Datum: ${formData.date}

Betreff: Aktenzeichen des Gerichtsvollziehers: ${formData.fileReference}
Gläubiger: ${formData.creditorName}
Schuldner / Mandant: ${formData.senderName}

Sehr geehrte Damen und Herren,
sehr geehrte/r Gerichtsvollzieher/in,

in vorbezeichneter Angelegenheit vertreten wir die Interessen von Herrn/Frau ${formData.senderName}. Namens und in Vollmacht des Schuldners teilen wir höflichst mit, dass dieser grundsätzlich zahlungswillig ist, die ausstehende Gesamtforderung jedoch aufgrund seiner gegenwärtigen finanziellen Engpässe nicht auf einmal begleichen kann.

Wir beantragen hiermit im Namen des Schuldners die Einräumung einer Ratenzahlung gemäß § 802b ZPO. Als Nachweis schlagen wir eine monatliche Rate in Höhe von € ${Number(formData.installmentAmount).toLocaleString("de-DE", { minimumFractionDigits: 2 })} vor. Die erste Rate wird zum nächsten Ersten unmittelbar angewiesen werden.

Gleichzeitig bitten wir höflich darum, den anberaumten Vorladungs- bzw. Abgabetermin im Einvernehmen einstweilen zu verschieben und uns die Zustimmung zu diesem Ratenplan unter Mitteilung Ihrer Dienstkontoverbindung schriftlich zu bestätigen.

Mit freundlichen Grüßen,
Gesetzeslotse BERLIN Schuldnerberatung
(Als Bevollmächtigter i.A.)`;
      default:
        return "";
    }
  };

  const handleCopy = () => {
    const textToCopy = editedLetterText || getLetterContent();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    let templateLabel = "";
    if (templateType === "ratenzahlung") templateLabel = "Vorschlag Ratenzahlung";
    else if (templateType === "pkonto_conversion") templateLabel = "Antrag P-Konto Umwandlung";
    else if (templateType === "brief_gerichtsvollzieher") templateLabel = "Ratenzahlungsangebot an GV";

    logGesetzeslotseActivity(
      "letter",
      "Kanzlei-Briefkopie erstellt",
      `Schreiben "${templateLabel}" für ${formData.senderName} an ${formData.creditorName} in die Zwischenablage kopiert.`
    );
  };

  // Sync edited text with form data unless customized
  useEffect(() => {
    setEditedLetterText(getLetterContent());
    setIsEdited(false);
  }, [
    templateType, 
    formData.senderName, 
    formData.senderStreet, 
    formData.senderCity, 
    formData.creditorName, 
    formData.creditorStreet, 
    formData.creditorCity, 
    formData.fileReference, 
    formData.debtAmount, 
    formData.installmentAmount, 
    formData.date
  ]);

  const handleExportDocx = async () => {
    try {
      const docChildren: any[] = [];
      const lines = editedLetterText.split("\n");
      
      lines.forEach((line) => {
        const trimmed = line.trim();
        const isBold = trimmed.startsWith("Betreff:") || 
                        trimmed.startsWith("An:") || 
                        trimmed.startsWith("An die:") || 
                        trimmed.startsWith("An den/die") || 
                        trimmed.startsWith("Datum:") || 
                        trimmed.startsWith("Sehr geehrte") || 
                        trimmed.startsWith("Mit freundlichen") || 
                        trimmed.startsWith("Gesetzeslotse") ||
                        trimmed.startsWith("In Vertretung") ||
                        trimmed.startsWith("Betreff: Außergerichtlicher");
        
        docChildren.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({
                text: line,
                size: 22, // 11pt
                bold: isBold,
                color: "1e293b", // slate 800
              })
            ],
            spacing: { after: 120 }
          })
        );
      });

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
      const normalizedName = formData.creditorName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      link.href = url;
      link.download = `Kanzlei_Schreiben_${templateType}_${normalizedName}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      logGesetzeslotseActivity(
        "letter",
        "Schreiben als DOCX exportiert",
        `Kanzleischreiben für ${formData.senderName} an ${formData.creditorName} als Word-Dokument (.docx) exportiert.`
      );
    } catch (error) {
      console.error("DOCX generation of letter failed", error);
      alert("Fehler beim Erstellen der Word-Datei.");
    }
  };

  const handleExportPdf = async () => {
    try {
      if (!showPrintModal) {
        setShowPrintModal(true);
        await new Promise((r) => setTimeout(r, 150));
      }

      const normalizedName = formData.creditorName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      await exportElementToPdf("printable-letter-container", `Kanzlei_Schreiben_${templateType}_${normalizedName}.pdf`);

      logGesetzeslotseActivity(
        "letter",
        "Schreiben als PDF exportiert",
        `Kanzleischreiben für ${formData.senderName} an ${formData.creditorName} als PDF exportiert.`
      );
    } catch (err) {
      console.error(err);
      alert("Fehler beim Erstellen der PDF-Datei.");
    }
  };

  const handleExportMain = () => {
    if (exportFormat === "pdf") {
      handleExportPdf();
    } else {
      handleExportDocx();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900" id="letter-generator-root">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          Musterbriefe & Vorlagen-Generator
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Erstellen Sie in wenigen Schritten ein rechtlich stichhaltiges Schreiben. füllen Sie das Formular aus, kopieren Sie den Text und senden Sie ihn per Einschreiben ab.
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-12">
        {/* Form Controls */}
        <div className="space-y-4 col-span-1 xl:col-span-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Vorlagentyp wählen</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setTemplateType("ratenzahlung")}
                className={`py-2 px-1 text-center rounded-lg border font-semibold text-xs transition-all duration-200 ${
                  templateType === "ratenzahlung"
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
                id="template-btn-raten"
              >
                Ratenzahlung
              </button>
              <button
                onClick={() => setTemplateType("pkonto_conversion")}
                className={`py-2 px-1 text-center rounded-lg border font-semibold text-xs transition-all duration-200 ${
                  templateType === "pkonto_conversion"
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
                id="template-btn-pkonto"
              >
                P-Konto Antrag
              </button>
              <button
                onClick={() => setTemplateType("brief_gerichtsvollzieher")}
                className={`py-2 px-1 text-center rounded-lg border font-semibold text-xs transition-all duration-200 ${
                  templateType === "brief_gerichtsvollzieher"
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
                id="template-btn-gv"
              >
                An GV schreiben
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5 dark:border-slate-800">
              Mandantendaten (Absender)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Mandanten-Name</label>
                <input
                  type="text"
                  value={formData.senderName}
                  onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                  id="sender-name"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Straße, Hausnr.</label>
                <input
                  type="text"
                  value={formData.senderStreet}
                  onChange={(e) => setFormData({ ...formData, senderStreet: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                  id="sender-street"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">PLZ, Ort</label>
              <input
                type="text"
                value={formData.senderCity}
                onChange={(e) => setFormData({ ...formData, senderCity: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                id="sender-city"
              />
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pt-2 pb-1.5 dark:border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Gegner / Empfänger (Bank / Gläubiger / Gerichtsvollzieher)
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsModalOpen(true)}
                  type="button"
                  className="flex items-center gap-1 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/50 font-bold cursor-pointer transition-colors"
                  title="Alle gespeicherten Gläubiger als Tabelle anzeigen"
                  id="open-creditors-table-btn"
                >
                  <Eye className="h-3 w-3 text-indigo-500" /> Tabelle anzeigen ({creditors.length})
                </button>
                <button
                  onClick={saveCurrentCreditor}
                  type="button"
                  className="text-[11px] font-bold text-slate-800 hover:text-slate-900 flex items-center gap-1 cursor-pointer dark:text-slate-200"
                  title="Aktuelle Daten als neuen Gläubiger für die Schnellauswahl sichern"
                  id="save-creditor-pills-btn"
                >
                  {showSaveSuccess ? (
                    <span className="text-emerald-500 font-semibold flex items-center gap-0.5 animate-pulse">
                      <Check className="h-3 w-3" /> Gesichert!
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition-colors">
                      <Save className="h-3 w-3 text-slate-500" /> Als Vorlage sichern
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Creditor Pills Select List */}
            {creditors.length > 0 && (
              <div className="bg-slate-50/50 p-2 text-xs rounded-xl border border-slate-100 dark:bg-slate-950/20 dark:border-slate-850">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 px-1">
                  Gläubiger-Vorlagen Schnellauswahl:
                </span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                  {creditors.map((cred) => {
                    const isSelected = formData.creditorName.toLowerCase() === cred.name.toLowerCase();
                    return (
                      <div
                        key={cred.id}
                        onClick={() => selectCreditor(cred)}
                        className={`group relative flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? "bg-slate-900 border-transparent text-white dark:bg-white dark:text-slate-900 shadow-sm"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-850 dark:text-slate-300 dark:hover:bg-slate-800/80"
                        }`}
                        id={`creditor-pill-${cred.id}`}
                      >
                        <Bookmark className={`h-3 w-3 ${isSelected ? "text-slate-200 dark:text-slate-600" : "text-slate-400"}`} />
                        <span className="truncate max-w-[105px] font-sans">{cred.name}</span>
                        <button
                          onClick={(e) => deleteCreditor(cred.id, e)}
                          title="Gläubiger löschen"
                          className="p-0.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-500/10 active:scale-90 transition-all cursor-pointer"
                          id={`delete-creditor-${cred.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Name / Institut</label>
                <input
                  type="text"
                  value={formData.creditorName}
                  onChange={(e) => setFormData({ ...formData, creditorName: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                  id="creditor-name"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Straße, Hausnr.</label>
                <input
                  type="text"
                  value={formData.creditorStreet}
                  onChange={(e) => setFormData({ ...formData, creditorStreet: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                  id="creditor-street"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">PLZ, Ort</label>
              <input
                type="text"
                value={formData.creditorCity}
                onChange={(e) => setFormData({...formData, creditorCity: e.target.value})}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                id="creditor-city"
              />
            </div>

            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 pt-2 pb-1.5 dark:border-slate-800">
              Falldetails (Aktenzeichen & Summen)
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Aktenzeichen / IBAN</label>
                <input
                  type="text"
                  value={formData.fileReference}
                  onChange={(e) => setFormData({ ...formData, fileReference: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                  id="file-ref"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Gesamtschuld (€)</label>
                <input
                  type="number"
                  value={formData.debtAmount}
                  onChange={(e) => setFormData({ ...formData, debtAmount: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                  id="debt-amount"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Monatsrate (€)</label>
                <input
                  type="number"
                  disabled={templateType === "pkonto_conversion"}
                  value={formData.installmentAmount}
                  onChange={(e) => setFormData({ ...formData, installmentAmount: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:outline-none disabled:opacity-40 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
                  id="ins-amount"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Letter Preview Canvas */}
        <div className="col-span-1 xl:col-span-7 flex flex-col justify-between">
          <div className="border border-slate-200 rounded-xl bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50 flex-1 flex flex-col p-4 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-4 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewTab("din5008")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    previewTab === "din5008"
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-900 dark:text-slate-150"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                  id="preview-tab-din"
                >
                  Druck-Vorschau (DIN 5008)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("editor")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    previewTab === "editor"
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-900 dark:text-slate-150"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                  id="preview-tab-edit"
                >
                  Direkt-Editor {isEdited && <span className="inline-block h-2 w-2 rounded-full bg-amber-500 ml-1 animate-pulse" />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {isEdited && (
                  <button
                    onClick={() => {
                      setEditedLetterText(getLetterContent());
                      setIsEdited(false);
                    }}
                    className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 rounded-lg text-[11px] font-semibold text-slate-650 hover:text-slate-800 dark:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Änderungen verwerfen"
                    id="reset-letter-button"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Verwerfen</span>
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="py-1.5 px-2.5 border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                  id="copy-letter-button"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Kopiert!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      <span>Kopieren</span>
                    </>
                  )}
                </button>

                {/* Format Switcher */}
                <div className="inline-flex p-0.5 bg-slate-200 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setExportFormat("pdf")}
                    className={`px-2 py-1 text-[10px] font-extrabold rounded transition-all cursor-pointer ${
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
                    className={`px-2 py-1 text-[10px] font-extrabold rounded transition-all cursor-pointer ${
                      exportFormat === "docx"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    DOCX
                  </button>
                </div>

                {/* Preview & Print Button */}
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border border-slate-700"
                  title="Druckansicht anzeigen"
                >
                  <Eye className="h-3.5 w-3.5 text-slate-300" />
                  <span>Vorschau & Drucken</span>
                </button>

                {/* Export Button */}
                <button
                  type="button"
                  onClick={handleExportMain}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  id="export-letter-main"
                  title={`Brief als ${exportFormat.toUpperCase()} exportieren`}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Speichern ({exportFormat.toUpperCase()})</span>
                </button>
              </div>
            </div>

            {previewTab === "editor" ? (
              <div className="flex-1 flex flex-col">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 uppercase font-semibold tracking-wider">
                  Text im Vorschaufenster anpassen (Änderungen werden beim Export/Kopieren beibehalten):
                </p>
                <textarea
                  value={editedLetterText}
                  onChange={(e) => {
                    setEditedLetterText(e.target.value);
                    setIsEdited(true);
                  }}
                  className="w-full flex-1 min-h-[350px] p-4 bg-white border border-slate-200 rounded-lg font-mono text-[11px] leading-relaxed text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 shadow-sm"
                  id="letter-textarea-editor"
                  placeholder="Inhalt des Briefes..."
                />
              </div>
            ) : (
              <div 
                ref={letterRef}
                className="bg-white border border-slate-200 p-8 shadow-md font-sans text-xs text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 overflow-y-auto max-h-[460px] rounded-lg relative selection:bg-indigo-100"
                id="rendered-letter-box"
              >
                {/* Letter Header/Sender Info DIN 5008 */}
                <div className="text-[9px] text-slate-400 border-b border-slate-100 pb-1 mb-8 dark:border-slate-800 select-none">
                  <span className="underline">Gesetzeslotse BERLIN Schuldnerberatung • Littenstraße 10 • 10179 Berlin</span>
                </div>

                {/* Recipient area */}
                <div className="mb-10 text-xs">
                  <p 
                    className="font-semibold text-slate-900 dark:text-slate-100 hover:bg-indigo-50/50 p-0.5 rounded cursor-text focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:bg-white inline-block min-w-[150px]"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => {
                      setFormData(prev => ({ ...prev, creditorName: e.currentTarget.innerText }));
                    }}
                  >
                    {formData.creditorName}
                  </p>
                  <p 
                    className="hover:bg-indigo-50/50 p-0.5 rounded cursor-text focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:bg-white block"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => {
                      setFormData(prev => ({ ...prev, creditorStreet: e.currentTarget.innerText }));
                    }}
                  >
                    {formData.creditorStreet}
                  </p>
                  <p 
                    className="hover:bg-indigo-50/50 p-0.5 rounded cursor-text focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:bg-white block"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => {
                      setFormData(prev => ({ ...prev, creditorCity: e.currentTarget.innerText }));
                    }}
                  >
                    {formData.creditorCity}
                  </p>
                </div>

                {/* Date Area */}
                <div className="text-right text-xs mb-8">
                  <p>
                    Berlin, den{" "}
                    <span
                      className="hover:bg-indigo-50/50 p-0.5 rounded cursor-text focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:bg-white inline-block"
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      onBlur={(e) => {
                        setFormData(prev => ({ ...prev, date: e.currentTarget.innerText }));
                      }}
                    >
                      {formData.date}
                    </span>
                  </p>
                </div>

                {/* Content Render */}
                <div className="space-y-4 text-xs leading-relaxed font-sans">
                  {editedLetterText.split("\n\n").map((para, pIdx) => {
                    // Check if it's the sender block (we already showed it at the top)
                    if (pIdx === 0 && (para.includes("Gesetzeslotse BERLIN") || para.includes("Littenstraße 10"))) {
                      return null; 
                    }
                    // Check if it is the recipient address block
                    if (para.startsWith("An:") || para.startsWith("An die:")) {
                      return null;
                    }
                    if (para.startsWith("Datum:")) {
                      return null;
                    }

                    const trimmedPara = para.trim();
                    const isBetreff = trimmedPara.startsWith("Betreff:") || trimmedPara.startsWith("Konto-");
                    const isMandant = trimmedPara.startsWith("In Vertretung") || trimmedPara.startsWith("Ihr Zeichen") || trimmedPara.startsWith("Verfahrensbeteiligter") || trimmedPara.startsWith("Gläubiger:") || trimmedPara.startsWith("Schuldner");

                    if (isBetreff) {
                      return (
                        <h3 
                          key={pIdx} 
                          className="font-bold text-slate-900 dark:text-white text-sm pt-2 pb-1 uppercase tracking-tight hover:bg-indigo-50/50 p-1 rounded transition-colors cursor-text focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:bg-white"
                          contentEditable={true}
                          suppressContentEditableWarning={true}
                          onBlur={(e) => {
                            const newText = e.currentTarget.innerText;
                            const paragraphs = editedLetterText.split("\n\n");
                            paragraphs[pIdx] = newText;
                            setEditedLetterText(paragraphs.join("\n\n"));
                            setIsEdited(true);
                          }}
                        >
                          {trimmedPara}
                        </h3>
                      );
                    }

                    if (isMandant) {
                      return (
                        <div key={pIdx} className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 p-2.5 rounded-lg font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {trimmedPara.split("\n").map((line, lIdx) => (
                            <div key={lIdx}>{line}</div>
                          ))}
                        </div>
                      );
                    }

                    return (
                      <p 
                        key={pIdx} 
                        className="whitespace-pre-wrap hover:bg-indigo-50/50 p-1 rounded transition-colors cursor-text focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:bg-white"
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => {
                          const newText = e.currentTarget.innerText;
                          const paragraphs = editedLetterText.split("\n\n");
                          paragraphs[pIdx] = newText;
                          setEditedLetterText(paragraphs.join("\n\n"));
                          setIsEdited(true);
                        }}
                      >
                        {trimmedPara}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex gap-2.5 items-start text-xs text-slate-650 dark:text-slate-350">
            <Send className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">Bearbeitungshinweis für Kanzlei-Sachbearbeiter:</p>
              1. Kopieren Sie den generierten Entwurf in Ihre Kanzlei-Schriftverkehrssoftware.<br />
              2. Versehen Sie das Dokument mit dem offiziellen Kanzlei-Kopf und fügen Sie ggf. gesondert erteilte Vollmachten oder Gerichtshilfegutscheine als Anlage bei.<br />
              3. Senden Sie das Schreiben taggenau ab und taggen Sie den Status in der Mandantenbilanz unter 'Verhandlung' bzw. 'Ratenzahlung'.
            </div>
          </div>
        </div>
      </div>

      {/* Modal for creditors table layout */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 animate-in fade-in"
          onClick={() => setIsModalOpen(false)}
          id="creditors-overview-modal-overlay"
        >
          <div 
            className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            id="creditors-overview-modal-content"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderHeart className="h-5 w-5 text-indigo-500" />
                  Gespeicherte Gläubiger-Tabelle
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Schneller Überblick, Filterung und Verwaltung all Ihrer hinterlegten Gläubigerdaten ({creditors.length} Vorlagen).
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Search Section */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-3">
              <div className="relative w-full md:flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Suche nach Name, Ort, Aktenzeichen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  id="modal-creditor-search"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-2 px-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
                    title="Zurücksetzen"
                  >
                    Leeren
                  </button>
                )}
              </div>
              <div className="text-xs font-mono text-slate-400 dark:text-slate-500 shrink-0 self-start md:self-auto">
                {filteredCreditors.length} von {creditors.length} angezeigt
              </div>
            </div>

            {/* Table wrapper */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {filteredCreditors.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="mx-auto h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                    <Search className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Keine Gläubiger gefunden</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    {searchTerm 
                      ? "Verfeinern Sie Ihren Suchbegriff oder leeren Sie den Filter, um wieder alle Einträge zu sehen." 
                      : "Es sind noch keine Gläubiger gespeichert. Tragen Sie Empfängerdaten im Formular ein und klicken Sie auf 'Als Vorlage sichern'."}
                  </p>
                </div>
              ) : (
                <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-800 text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-500 dark:text-slate-400 select-none uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-3">Gläubiger / Name</th>
                          <th className="px-4 py-3">Adresse</th>
                          <th className="px-4 py-3">Aktenzeichen</th>
                          <th className="px-4 py-3 text-right">Schuldenhöhe</th>
                          <th className="px-4 py-3 text-center">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900/40 font-sans">
                        {filteredCreditors.map((cred) => {
                          const isCurrentlySelected = formData.creditorName.toLowerCase() === cred.name.toLowerCase();
                          return (
                            <tr 
                              key={cred.id}
                              className={`group hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors ${
                                isCurrentlySelected ? "bg-amber-500/5 dark:bg-amber-500/5" : ""
                              }`}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Bookmark className={`h-3.5 w-3.5 shrink-0 ${isCurrentlySelected ? "text-amber-500" : "text-slate-300 dark:text-slate-700"}`} />
                                  <div>
                                    <div className="font-semibold text-slate-900 dark:text-slate-100">{cred.name}</div>
                                    {isCurrentlySelected && (
                                      <span className="inline-block mt-0.5 text-[9px] bg-amber-500/10 text-amber-800 dark:text-amber-400 font-bold tracking-wider px-1.5 py-0.5 rounded uppercase">
                                        Ausgewählt
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                <div>{cred.street}</div>
                                <div className="text-[10px] text-slate-400">{cred.city}</div>
                              </td>
                              <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                {cred.fileReference || <span className="text-slate-400 italic">Keines</span>}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-300">
                                {formatAmount(cred.debtAmount)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      selectCreditor(cred);
                                      setIsModalOpen(false);
                                    }}
                                    className="px-2.5 py-1 text-[10px] bg-slate-900 text-white rounded hover:bg-slate-850 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-150 transition-all font-semibold flex items-center gap-1 cursor-pointer"
                                    title="Daten in Generator einsetzen"
                                  >
                                    Auswählen
                                  </button>
                                  <button
                                    onClick={(e) => deleteCreditor(cred.id, e)}
                                    className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-500/10 active:scale-95 transition-all cursor-pointer"
                                    title="Diesen Gläubiger löschen"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
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
            </div>

            {/* Footer info/controls */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2 items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                Auswählen übernimmt Empfängerdaten sofort im Musterbrief-Generator.
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-850 dark:bg-slate-950 font-bold rounded-lg text-xs transition-all text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal for Letter */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 no-print">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Druckansicht (DIN 5008) — Gläubiger-Schreiben
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

            {/* Modal Body / Printable Letter DIN 5008 Container */}
            <div className="p-8 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex justify-center">
              <div id="printable-letter-container" className="printable-area bg-white text-slate-900 p-12 shadow-lg border border-slate-200 w-full max-w-[210mm] min-h-[297mm] font-serif leading-relaxed text-xs space-y-6 relative">
                
                {/* Print Running Header */}
                <div className="hidden print-page-header text-[9px] font-sans text-slate-600">
                  <div className="flex items-center gap-2">
                    <img src="/logo.svg" alt="Gesetzeslotse Berlin" className="h-5 w-auto object-contain shrink-0" />
                    <span className="font-bold text-slate-900 uppercase">Kanzleischreiben — Gläubigerkorrespondenz</span>
                  </div>
                  <div className="font-mono text-slate-500">
                    Datum: {formData.date}
                  </div>
                </div>

                {/* Print Running Footer */}
                <div className="hidden print-page-footer text-[9px] font-sans text-slate-500">
                  <span>GESETZESLOTSE BERLIN e.V. • Gläubiger-Korrespondenz</span>
                  <span className="print-page-number"></span>
                </div>

                {/* Document Header with Logo */}
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <img src="/logo.svg" alt="Gesetzeslotse Berlin Logo" className="h-10 sm:h-12 w-auto object-contain shrink-0 max-w-none" />
                  <div className="text-right text-[10px] font-sans text-slate-500">
                    <p className="font-bold text-slate-800">Gesetzeslotse BERLIN e.V.</p>
                    <p>Littenstraße 10 • 10179 Berlin</p>
                  </div>
                </div>

                {/* DIN 5008 Sender Line */}
                <div className="text-[9px] text-slate-500 border-b border-slate-300 pb-1 font-sans">
                  Gesetzeslotse BERLIN Schuldnerberatung • Littenstraße 10 • 10179 Berlin
                </div>

                {/* Recipient Box */}
                <div className="pt-2 font-sans space-y-0.5 text-xs">
                  <p className="font-bold">{formData.creditorName}</p>
                  <p>{formData.creditorStreet}</p>
                  <p>{formData.creditorCity}</p>
                </div>

                {/* Date line */}
                <div className="text-right text-xs font-sans text-slate-700 pt-2">
                  Berlin, den {formData.date}
                </div>

                {/* Letter Body */}
                <div className="pt-4 space-y-4 whitespace-pre-wrap text-xs text-slate-900 font-serif leading-relaxed">
                  {editedLetterText}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
