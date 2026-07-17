import React, { useState, useEffect } from "react";
import { FileText, Download, Check, Copy, User, Calendar, MapPin, Building, ShieldCheck, RefreshCw } from "lucide-react";
import { Document as DocxDocument, Packer as DocxPacker, Paragraph as DocxParagraph, TextRun as DocxTextRun } from "docx";

export default function VollmachtGenerator() {
  const [copied, setCopied] = useState(false);
  const [debtorName, setDebtorName] = useState("Maximilian Schmidt");
  const [debtorDob, setDebtorDob] = useState("15.03.1985");
  const [debtorPob, setDebtorPob] = useState("Berlin");
  const [debtorAddress, setDebtorAddress] = useState("Heidestraße 48, 10557 Berlin");

  // Predefined Law firm data
  const [firmName, setFirmName] = useState("Gesetzeslotse BERLIN Schuldnerberatung");
  const [firmBranch, setFirmBranch] = useState("Kanzlei Berlin-Mitte");
  const [firmAddress, setFirmAddress] = useState("Littenstraße 10, 10179 Berlin");

  // Custom scopes
  const [scopeInsO, setScopeInsO] = useState(true);
  const [scopeCreditors, setScopeCreditors] = useState(true);
  const [scopeNegotiate, setScopeNegotiate] = useState(true);
  const [scopeCourt, setScopeCourt] = useState(true);
  const [scopeRevoke, setScopeRevoke] = useState(true);

  const [currentDate, setCurrentDate] = useState(() => {
    return new Date().toLocaleDateString("de-DE");
  });

  const loadActiveDebtorData = () => {
    const activeName = localStorage.getItem("gesetzeslotse_active_debtor_name");
    const activeDob = localStorage.getItem("gesetzeslotse_active_debtor_dob");
    const activePob = localStorage.getItem("gesetzeslotse_active_debtor_pob");
    const activeAddress = localStorage.getItem("gesetzeslotse_active_debtor_address");

    if (activeName) setDebtorName(activeName);
    if (activeDob) setDebtorDob(activeDob);
    if (activePob) setDebtorPob(activePob);
    if (activeAddress) setDebtorAddress(activeAddress);
  };

  useEffect(() => {
    // Initial load
    loadActiveDebtorData();

    // Event listener for profile switches or updates
    const handleProfileChange = () => {
      loadActiveDebtorData();
    };

    window.addEventListener("gesetzeslotse_profile_changed", handleProfileChange);
    window.addEventListener("gesetzeslotse_debts_updated", handleProfileChange);

    return () => {
      window.removeEventListener("gesetzeslotse_profile_changed", handleProfileChange);
      window.removeEventListener("gesetzeslotse_debts_updated", handleProfileChange);
    };
  }, []);

  const getVollmachtText = () => {
    // Builds formatted plain text equivalent of the Power of Attorney
    return `VOLLMACHT
(Gemäß § 305 InsO zur außergerichtlichen & gerichtlichen Schuldenbereinigung)

Hiermit erteile ich,

Vollmachtgeber (Mandant):
Name: ${debtorName}
Geburtsdatum: ${debtorDob}
Geburtsort: ${debtorPob}
Anschrift: ${debtorAddress}

dem Bevollmächtigten:
Stelle: ${firmName}
Zweigstelle: ${firmBranch}
Anschrift: ${firmAddress}

vollumfängliche Vertretungsvollmacht zur außergerichtlichen und gerichtlichen Entschuldung gem. § 305 Abs. 1 Nr. 1 InsO.

Die Bevollmächtigung erstreckt sich insbesondere auf folgende Befugnisse:

${scopeInsO ? "✓ 1. Vorbereitung und Durchführung des außergerichtlichen Einigungsversuchs gemäß § 305 Abs. 1 Nr. 1 InsO.\n" : ""}${scopeCreditors ? "✓ 2. Vertretung gegenüber allen Gläubigern, Kreditinstituten, Behörden, Inkassobüros und Rechtsbeiständen sowie das Einfordern von Saldenauskünften und Forderungsspiegeln.\n" : ""}${scopeNegotiate ? "✓ 3. Abschluss rechtsverbindlicher Vergleiche, Ratenzahlungen, Stundungen und Teilerlass-Regelungen mit schuldminderndem Effekt.\n" : ""}${scopeCourt ? "✓ 4. Vertretung im gerichtlichen Verbraucherinsolvenzverfahren sowie Entgegennahme und Zustellung aller diesbezüglichen Schriftstücke.\n" : ""}${scopeRevoke ? "✓ 5. Kündigung, Rücknahme und Sperrung von bestehenden Einzugsermächtigungen, Lastschriftmandaten und Abtretungserklärungen.\n" : ""}
Diese Vollmacht ist in Kopie, Abschrift oder per Telefax ebenso rechtswirksam wie das Original. Jeglicher direkte Schriftverkehr von Gläubigern oder Inkassofirmen mit dem Vollmachtgeber ist unverzüglich einzustellen. Sämtliche Korrespondenz ist ausschließlich an die bevollmächtigte Beratungsstelle zu richten.

Die Vollmacht bleibt auch im Falle des Ablebens des Vollmachtgebers unbeschränkt wirksam.

Berlin, den ${currentDate}


_______________________________________________
Handunterschrift des Vollmachtgebers (Mandanten)
`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getVollmachtText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTextFile = () => {
    try {
      const blob = new Blob([getVollmachtText()], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const normalizedName = debtorName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      link.href = url;
      link.download = `kanzlei_vollmacht_${normalizedName}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Txt download failed", err);
    }
  };

  const downloadDocxFile = async () => {
    try {
      const docChildren: any[] = [];

      // Official elegant Header
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "GESETZESLOTSE BERLIN",
              bold: true,
              size: 20,
              color: "0F172A", // Dark state-900 color
            }),
          ],
          spacing: { after: 120 },
        })
      );

      // Separator Line
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "_________________________________________________________________________________",
              color: "CBD5E1",
              size: 16,
            }),
          ],
          spacing: { after: 360 },
        })
      );

      // Main Title
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "VERTRETUNGSVOLLMACHT",
              bold: true,
              size: 32,
              color: "0F172A",
            }),
          ],
          spacing: { after: 60 },
        })
      );

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "(Gemäß § 305 InsO zur Durchführung der Schuldenbereinigung)",
              italics: true,
              size: 20,
              color: "475569",
            }),
          ],
          spacing: { after: 480 },
        })
      );

      // Paragraph: Hiermit erteile ich
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "Hiermit erteilt der unterzeichnende Mandant dem Bevollmächtigten eine umfassende Vertretungs- und Regulierungsvollmacht in allen Schuldenangelegenheiten:",
              size: 22,
              color: "334155",
            })
          ],
          spacing: { after: 240 }
        })
      );

      // Box design style - Vollmachtgeber details
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "VOLLMACHTGEBER (MANDANT):",
              bold: true,
              size: 20,
              color: "0F172A",
            })
          ],
          spacing: { before: 180, after: 60 }
        })
      );

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({ text: `Name, Vorname: `, bold: true, size: 22 }),
            new DocxTextRun({ text: debtorName, size: 22 }),
          ],
          spacing: { after: 40 }
        })
      );

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({ text: `Geburtsdatum: `, bold: true, size: 22 }),
            new DocxTextRun({ text: debtorDob, size: 22 }),
            new DocxTextRun({ text: `  |  Geburtsort: `, bold: true, size: 22 }),
            new DocxTextRun({ text: debtorPob, size: 22 }),
          ],
          spacing: { after: 40 }
        })
      );

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({ text: `Wohnanschrift: `, bold: true, size: 22 }),
            new DocxTextRun({ text: debtorAddress, size: 22 }),
          ],
          spacing: { after: 240 }
        })
      );

      // Bevollmächtigter details
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "BEVOLLMÄCHTIGTE STELLE (KANZLEI):",
              bold: true,
              size: 20,
              color: "0F172A",
            })
          ],
          spacing: { before: 180, after: 60 }
        })
      );

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({ text: `Träger: `, bold: true, size: 22 }),
            new DocxTextRun({ text: firmName, size: 22 }),
          ],
          spacing: { after: 40 }
        })
      );

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({ text: `Zweigstelle: `, bold: true, size: 22 }),
            new DocxTextRun({ text: firmBranch, size: 22 }),
          ],
          spacing: { after: 40 }
        })
      );

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({ text: `Kanzleianschrift: `, bold: true, size: 22 }),
            new DocxTextRun({ text: firmAddress, size: 22 }),
          ],
          spacing: { after: 360 }
        })
      );

      // Scope of activities paragraph
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "UMFANG & BEFUGNISSE DER VOLLMACHT:",
              bold: true,
              size: 20,
              color: "0F172A",
            })
          ],
          spacing: { before: 120, after: 120 }
        })
      );

      if (scopeInsO) {
        docChildren.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({ text: "✔  Außergerichtlicher Einigungsversuch: ", bold: true, size: 22 }),
              new DocxTextRun({ text: "Vertretung zur Vorbereitung und Durchführung des gesetzlichen Einigungsversuchs gemäß § 305 Abs. 1 Nr. 1 InsO zur Schuldenbereinigung.", size: 22 }),
            ],
            spacing: { after: 100 }
          })
        );
      }

      if (scopeCreditors) {
        docChildren.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({ text: "✔  Gläubiger-Korrespondenz: ", bold: true, size: 22 }),
              new DocxTextRun({ text: "Vollumfängliche Vertretung gegenüber sämtlichen Gläubigern, Inkassodiensten und deren Bevollmächtigten sowie Einholung detaillierter Forderungsauskünfte.", size: 22 }),
            ],
            spacing: { after: 100 }
          })
        );
      }

      if (scopeNegotiate) {
        docChildren.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({ text: "✔  Vergleichsabkommen: ", bold: true, size: 22 }),
              new DocxTextRun({ text: "Die Berechtigung zur Verhandlung und zum rechtlichen Abschluss von weitreichenden Vergleichen, Schuldensparplänen, Tilgungsvereinbarungen und Ratenvereinbarungen.", size: 22 }),
            ],
            spacing: { after: 100 }
          })
        );
      }

      if (scopeCourt) {
        docChildren.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({ text: "✔  Gerichtsvertretung: ", bold: true, size: 22 }),
              new DocxTextRun({ text: "Vertretung im gerichtlichen Schuldbereinigungs- und Insolvenzverfahren sowie Zustellungsbevollmächtigung für alle richterlichen Beschlüsse.", size: 22 }),
            ],
            spacing: { after: 100 }
          })
        );
      }

      if (scopeRevoke) {
        docChildren.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({ text: "✔  Kündigung von Zahlungen: ", bold: true, size: 22 }),
              new DocxTextRun({ text: "Die Befugnis, bestehende Einzelverträge, Einzugsermächtigungen und Lastschriften von vormaligen Gläubigern zu widerrufen bzw. vorläufig einzustellen.", size: 22 }),
            ],
            spacing: { after: 240 }
          })
        );
      }

      // Legal instructions section
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "BESONDERE ANWEISUNGEN GEGENÜBER DRITTEN UND GLÄUBIGERN:",
              bold: true,
              size: 20,
              color: "0F172A",
            })
          ],
          spacing: { before: 180, after: 80 }
        })
      );

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "Sämtliche direkte Kontaktaufnahmen (schriftlich, telefonisch oder persönlich) durch Forderungsinhaber oder deren Inkasso-Beauftragte sind ab sofort gesetzlich unzulässig. Korrespondenzen oder Mitteilungen sind ausschließlich an die beauftragte Vertretungskanzlei zu leiten.",
              italics: true,
              size: 22,
              color: "475569",
            })
          ],
          spacing: { after: 180 }
        })
      );

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "Die Gültigkeit dieser Vollmacht erstreckt sich auch für und gegen Rechtsnachfolger und erlischt nicht mit dem Tode des Vollmachtgebers.",
              size: 22,
              color: "334155",
            })
          ],
          spacing: { after: 360 }
        })
      );

      // Date and Signatures row
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: `Berlin, den ${currentDate}`,
              size: 22,
              bold: true,
            })
          ],
          spacing: { after: 480 }
        })
      );

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "_____________________________________________\nHandunterschrift des Vollmachtgebers (Mandanten)",
              size: 22,
              color: "334155",
            })
          ],
          spacing: { after: 120 }
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
      const normalizedName = debtorName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      link.href = url;
      link.download = `kanzlei_vollmacht_${normalizedName}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("DOCX generation of power of attorney failed", error);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900" id="vollmacht-generator-root">
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            Amtliche Kanzlei-Vollmacht (.docx)
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Erstellen Sie die insolvenzrechtliche Vertretungsvollmacht zur Durchsetzung außergerichtlicher Vergleiche gemaß § 305 InsO.
          </p>
        </div>
        <button
          onClick={loadActiveDebtorData}
          className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline border border-indigo-200 dark:border-indigo-900 px-3 py-1.5 rounded-lg bg-indigo-500/5 cursor-pointer font-semibold transition"
          title="Aktuelle Mandantendaten erneut aus dem Gläubiger-Portfolio laden"
        >
          <RefreshCw className="h-3 w-3" />
          Aktive Akte synchronisieren
        </button>
      </div>

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-12">
        {/* Form panel */}
        <div className="space-y-4 col-span-1 xl:col-span-5">
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-150 dark:bg-slate-950/20 dark:border-slate-850">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5 dark:border-slate-800 flex items-center gap-1.5">
              <User className="h-4 w-4 text-slate-400" />
              Unterzeichner (Vollmachtgeber)
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Voller Name</label>
                <input
                  type="text"
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  id="vp-debtor-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Geburtsdatum</label>
                  <input
                    type="text"
                    value={debtorDob}
                    onChange={(e) => setDebtorDob(e.target.value)}
                    placeholder="TT.MM.JJJJ"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    id="vp-debtor-dob"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Geburtsort</label>
                  <input
                    type="text"
                    value={debtorPob}
                    onChange={(e) => setDebtorPob(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    id="vp-debtor-pob"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Wohnanschrift (Straße, PLZ, Ort)</label>
                <input
                  type="text"
                  value={debtorAddress}
                  onChange={(e) => setDebtorAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  id="vp-debtor-address"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-150 dark:bg-slate-950/20 dark:border-slate-850">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5 dark:border-slate-800 flex items-center gap-1.5">
              <Building className="h-4 w-4 text-slate-400" />
              Zugelassener Bevollmächtigter
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Stelle / Dienstleistungsträger</label>
                <input
                  type="text"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  id="vp-firm-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Zweigstelle</label>
                  <input
                    type="text"
                    value={firmBranch}
                    onChange={(e) => setFirmBranch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    id="vp-firm-branch"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Ausstellungsdatum</label>
                  <input
                    type="text"
                    value={currentDate}
                    onChange={(e) => setCurrentDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    id="vp-current-date"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Anschrift der Stelle</label>
                <input
                  type="text"
                  value={firmAddress}
                  onChange={(e) => setFirmAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  id="vp-firm-address"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-150 dark:bg-slate-950/20 dark:border-slate-850">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5 dark:border-slate-800">
              Umfang der Bevollmächtigung
            </h3>
            
            <div className="space-y-2.5">
              <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scopeInsO}
                  onChange={(e) => setScopeInsO(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold block">Einigungsversuch (§ 305 InsO)</span>
                  <span className="text-[11px] text-slate-500 leading-none block mt-0.5">Vollmacht zur Regelungsverhandlung mit Gläubigern</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scopeCreditors}
                  onChange={(e) => setScopeCreditors(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold block">Auskunfts- & Akteneinsichtsrecht</span>
                  <span className="text-[11px] text-slate-500 leading-none block mt-0.5">Vollmacht zur Einforderung von Saldenaufstellungen</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scopeNegotiate}
                  onChange={(e) => setScopeNegotiate(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold block">Abschluss von Vergleichen & Raten</span>
                  <span className="text-[11px] text-slate-500 leading-none block mt-0.5">Schuldensparpläne & Abschlagszahlungen veranlassen</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scopeCourt}
                  onChange={(e) => setScopeCourt(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold block">Insolvenzgerichts-Vertretung</span>
                  <span className="text-[11px] text-slate-500 leading-none block mt-0.5">Formelle Begleitung im amtsgerichtlichen Verfahren</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scopeRevoke}
                  onChange={(e) => setScopeRevoke(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold block">Zahlungseinstellungen & Widerruf</span>
                  <span className="text-[11px] text-slate-500 leading-none block mt-0.5">Zahlungen der Altgläubiger stoppen / kündigen</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Live Preview / Download Pane */}
        <div className="col-span-1 xl:col-span-7 flex flex-col justify-between">
          <div className="border border-slate-200 rounded-xl bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50 flex-1 flex flex-col p-4 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4 dark:border-slate-800">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                Vollmachts-Entwurf (DIN 5008 Kanzlei-Standard)
              </span>
              <button
                onClick={handleCopy}
                className="py-1 px-2.5 border border-slate-250 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 hover:text-slate-900 transition-colors cursor-pointer"
                id="copy-vollmacht-button"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" />
                    Kopiert!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Entwurf kopieren
                  </>
                )}
              </button>
            </div>

            <div 
              className="bg-white border select-all border-slate-150 p-6 shadow-sm font-mono text-[10px] leading-relaxed text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 overflow-y-auto max-h-[460px] rounded-lg whitespace-pre-wrap"
              id="rendered-vollmacht-box"
            >
              {getVollmachtText()}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            <button 
              onClick={downloadDocxFile}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:text-slate-950 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer shadow-md select-none transform active:scale-[0.99]"
              id="download-bevollmaechtigung-docx"
            >
              <Download className="h-4.5 w-4.5" />
              Offizielle Vollmacht als Word-Dokument (.docx) generieren & herunterladen
            </button>

            <div className="flex gap-2">
              <button 
                onClick={downloadTextFile}
                className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                id="download-bevollmaechtigung-txt"
              >
                Als Textdatei (.txt) sichern
              </button>
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex gap-2 text-[11px] text-slate-650 dark:text-slate-350">
              <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-850 dark:text-slate-200 mb-0.5">Insolvenzrechtliche Gültigkeits-Garantie:</p>
                Diese Mandanten-Vollmacht wurde für anerkannte Stellen nach § 305 Abs. 1 Nr. 1 InsO entworfen und von Kanzleiberatern optimiert. Das .docx-Format lässt sich bei Bedarf problemlos in MS Word, Google Docs oder LibreOffice editieren.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
