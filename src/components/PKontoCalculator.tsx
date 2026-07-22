import { useState, useEffect } from "react";
import { Scale, Landmark, ShieldCheck, Download, AlertCircle, RefreshCw, Printer, CheckCircle, Flame, Check, HelpCircle } from "lucide-react";
import { Document as DocxDocument, Packer as DocxPacker, Paragraph as DocxParagraph, TextRun as DocxTextRun } from "docx";
import { jsPDF } from "jspdf";
import { getLimitsForDate } from "../data/pKontoLimits";
import { logGesetzeslotseActivity } from "../lib/history";

export default function PKontoCalculator() {
  const [ownerName, setOwnerName] = useState("Maximilian Schmidt");
  const [birthDate, setBirthDate] = useState("15.03.1985");
  const [addressLine, setAddressLine] = useState("Heidestraße 48, 10557 Berlin");
  const [bankName, setBankName] = useState("Berliner Sparkasse");
  const [ibanValue, setIbanValue] = useState("DE89 1005 0000 1234 5678 90");

  const [agencyName, setAgencyName] = useState("Gesetzeslotse BERLIN Schuldnerberatung c/o Kanzlei-Workspace");
  const [agencyStreet, setAgencyStreet] = useState("Alt-Moabit 90 D");
  const [agencyCity, setAgencyCity] = useState("10559 Berlin");
  const [agencyContact, setAgencyContact] = useState("Ref. Schuldnerverfahren & Insolvenzschutz");
  
  const [isGeeigneteStelle, setIsGeeigneteStelle] = useState(true);
  const [isGeeignetePerson, setIsGeeignetePerson] = useState(false);
  const [bescheidDatum, setBescheidDatum] = useState("15.11.2009");
  const [bescheidAktenzeichen, setBescheidAktenzeichen] = useState("IV B 3-345/09");

  const [isArbeitgeber, setIsArbeitgeber] = useState(false);
  const [isSozialleistungstraeger, setIsSozialleistungstraeger] = useState(false);
  const [isSonstigerLeistungstraeger, setIsSonstigerLeistungstraeger] = useState(true);
  const [isFamilienkasse, setIsFamilienkasse] = useState(false);

  const [calculationDate, setCalculationDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [isEmployed, setIsEmployed] = useState<boolean>(() => {
    const stored = localStorage.getItem("gesetzeslotse_active_debtor_is_employed");
    // Default to true if not specified, since Maximilian Schmidt (the default client) is working
    return stored === "true" || stored === null;
  });

  const [employerName, setEmployerName] = useState<string>(() => {
    return localStorage.getItem("gesetzeslotse_active_debtor_employer") || "Acme Logistik GmbH";
  });

  const [debtorNetIncome, setDebtorNetIncome] = useState<number>(() => {
    const activeIsEmployed = localStorage.getItem("gesetzeslotse_active_debtor_is_employed");
    if (activeIsEmployed === "false") return 0;
    const stored = localStorage.getItem("gesetzeslotse_active_debtor_net_income");
    if (stored !== null) {
      return parseFloat(stored) || 0;
    }
    return 1850.00;
  });

  const limits = getLimitsForDate(new Date(calculationDate));
  const baseAllowance = limits.baseAllowance;
  const firstPersonAllowance = limits.firstPersonAllowance;
  const additionalPersonAllowance = limits.additionalPersonAllowance;

  // SECTION III Free freibetrag
  const [hasFirstPerson, setHasFirstPerson] = useState(false);
  const [firstPersonReason, setFirstPersonReason] = useState<"a" | "b" | "c">("a"); // a) Unterhalt b) SGB II/XII c) AsylbLG

  const [additionalPersonsCount, setAdditionalPersonsCount] = useState<number>(0); // 0 to 4 subsequent dependents
  const [additionalPersonsReason, setAdditionalPersonsReason] = useState<"a" | "b" | "c">("a");

  // SECTION IV (running monthly allowances)
  const [hasLaufendeSGB, setHasLaufendeSGB] = useState(false);
  const [laufendeSGBAmount, setLaufendeSGBAmount] = useState<number>(140.50);
  
  const [hasLaufendeMehraufwand, setHasLaufendeMehraufwand] = useState(false);
  const [laufendeMehraufwandAmount, setLaufendeMehraufwandAmount] = useState<number>(85.00);

  const [hasLaufendeUnpfaendbar, setHasLaufendeUnpfaendbar] = useState(false);
  const [laufendeUnpfaendbarAmount, setLaufendeUnpfaendbarAmount] = useState<number>(0.00);

  // Kindergeld detail lines
  const [hasKindergeld, setHasKindergeld] = useState(false);
  const [kind1Born, setKind1Born] = useState("04.2018");
  const [kind1Amount, setKind1Amount] = useState<number>(250.00);
  const [hasKind2, setHasKind2] = useState(false);
  const [kind2Born, setKind2Born] = useState("11.2021");
  const [kind2Amount, setKind2Amount] = useState<number>(250.00);
  const [hasKind3, setHasKind3] = useState(false);
  const [kind3Born, setKind3Born] = useState("");
  const [kind3Amount, setKind3Amount] = useState<number>(250.00);
  const [hasKind4, setHasKind4] = useState(false);
  const [kind4Born, setKind4Born] = useState("");
  const [kind4Amount, setKind4Amount] = useState<number>(250.00);
  const [hasKind5, setHasKind5] = useState(false);
  const [kind5Born, setKind5Born] = useState("");
  const [kind5Amount, setKind5Amount] = useState<number>(250.00);
  
  const [hasFurtherKids, setHasFurtherKids] = useState(false);
  const [furtherKidsCount, setFurtherKidsCount] = useState<number>(1);
  const [furtherKidsAmount, setFurtherKidsAmount] = useState<number>(250.00);

  const [hasAndereGeldleistungKinder, setHasAndereGeldleistungKinder] = useState(false);
  const [andereGeldleistungKinderAmount, setAndereGeldleistungKinderAmount] = useState<number>(0.00);

  // SECTION V (one-time allowances)
  const [hasEinmaligeSozialleist, setHasEinmaligeSozialleist] = useState(false);
  const [einmaligeSozialleistAmount, setEinmaligeSozialleistAmount] = useState<number>(0.00);

  const [hasEinmaligeGeldleist, setHasEinmaligeGeldleist] = useState(false);
  const [einmaligeGeldleistAmount, setEinmaligeGeldleistAmount] = useState<number>(0.00);

  const [hasNachzahlungLaufend, setHasNachzahlungLaufend] = useState(false);
  const [nachzahlungLaufendAmount, setNachzahlungLaufendAmount] = useState<number>(0.00);

  const [hasNachzahlungSonst, setHasNachzahlungSonst] = useState(false);
  const [nachzahlungSonstAmount, setNachzahlungSonstAmount] = useState<number>(0.00);

  const [hasMutterKind, setHasMutterKind] = useState(false);
  const [mutterKindAmount, setMutterKindAmount] = useState<number>(0.00);

  // Load profile data on mount
  useEffect(() => {
    const updateDebtorName = () => {
      const activeName = localStorage.getItem("gesetzeslotse_active_debtor_name");
      if (activeName) {
        setOwnerName(activeName);
      }
      const activeDob = localStorage.getItem("gesetzeslotse_active_debtor_dob");
      if (activeDob) {
        setBirthDate(activeDob);
      }
      const activeAddress = localStorage.getItem("gesetzeslotse_active_debtor_address");
      if (activeAddress) {
        setAddressLine(activeAddress);
      }

      // Sync employment info
      const activeIsEmployed = localStorage.getItem("gesetzeslotse_active_debtor_is_employed");
      const isEmp = activeIsEmployed === "true" || activeIsEmployed === null;
      setIsEmployed(isEmp);

      const activeEmployer = localStorage.getItem("gesetzeslotse_active_debtor_employer");
      setEmployerName(activeEmployer || (isEmp ? "Acme Logistik GmbH" : ""));

      const activeNetIncome = localStorage.getItem("gesetzeslotse_active_debtor_net_income");
      if (activeNetIncome !== null) {
        setDebtorNetIncome(parseFloat(activeNetIncome) || 0);
      } else {
        setDebtorNetIncome(isEmp ? 1850.00 : 0);
      }
    };
    updateDebtorName();
    window.addEventListener("gesetzeslotse_debts_updated", updateDebtorName);
    window.addEventListener("gesetzeslotse_profile_changed" as any, updateDebtorName);
    return () => {
      window.removeEventListener("gesetzeslotse_debts_updated", updateDebtorName);
      window.removeEventListener("gesetzeslotse_profile_changed" as any, updateDebtorName);
    };
  }, []);

  // Preset configuration helper
  const applyPreset = (preset: "allein" | "partner" | "alleinKind" | "familie") => {
    let label = "";
    if (preset === "allein") {
      setHasFirstPerson(false);
      setAdditionalPersonsCount(0);
      setHasKindergeld(false);
      setHasKind2(false);
      setHasKind3(false);
      setHasKind4(false);
      setHasKind5(false);
      setHasFurtherKids(false);
      setFurtherKidsCount(0);
      setHasLaufendeSGB(false);
      setHasLaufendeMehraufwand(false);
      label = "Alleinstehend (Grundbetrag)";
    } else if (preset === "partner") {
      setHasFirstPerson(true);
      setFirstPersonReason("a"); // gesetzliche Unterhaltspflicht
      setAdditionalPersonsCount(0);
      setHasKindergeld(false);
      setHasKind2(false);
      label = "Ehegatten/Unterhalt";
    } else if (preset === "alleinKind") {
      setHasFirstPerson(true);
      setFirstPersonReason("a"); // Unterhalt first child
      setAdditionalPersonsCount(0);
      setHasKindergeld(true);
      setKind1Born("10.2018");
      setKind1Amount(250.00);
      setHasKind2(false);
      setHasKind3(false);
      setHasKind4(false);
      setHasKind5(false);
      setHasFurtherKids(false);
      label = "Alleinstehend mit 1 Kind";
    } else if (preset === "familie") {
      setHasFirstPerson(true);
      setFirstPersonReason("a"); // Partner (Unterhalt)
      setAdditionalPersonsCount(2); // 2 subsequent children
      setAdditionalPersonsReason("a"); // gesetzlich
      setHasKindergeld(true);
      setKind1Born("04.2015");
      setKind1Amount(250.00);
      setHasKind2(true);
      setKind2Born("08.2019");
      setKind2Amount(250.00);
      setHasKind3(false);
      setHasKind4(false);
      setHasKind5(false);
      setHasFurtherKids(false);
      label = "Familie (Partner, 2 Kinder)";
    }

    logGesetzeslotseActivity(
      "calculation",
      "P-Konto Berechnung durchgeführt",
      `Vorlage geladen: ${label}. Neuer Freibetrag wird berechnet.`
    );
  };

  // Calculations
  const iiiTotal = baseAllowance + (hasFirstPerson ? firstPersonAllowance : 0) + (additionalPersonsCount > 0 ? (additionalPersonsCount * additionalPersonAllowance) : 0);

  const kindergeldSum = hasKindergeld ? (
    kind1Amount + 
    (hasKind2 ? kind2Amount : 0) + 
    (hasKind3 ? kind3Amount : 0) + 
    (hasKind4 ? kind4Amount : 0) + 
    (hasKind5 ? kind5Amount : 0) + 
    (hasFurtherKids ? furtherKidsAmount : 0)
  ) : 0;

  const ivTotal = (hasLaufendeSGB ? laufendeSGBAmount : 0) + 
                  (hasLaufendeMehraufwand ? laufendeMehraufwandAmount : 0) + 
                  (hasLaufendeUnpfaendbar ? laufendeUnpfaendbarAmount : 0) + 
                  kindergeldSum + 
                  (hasAndereGeldleistungKinder ? andereGeldleistungKinderAmount : 0);

  const totalMonthlyAllowance = iiiTotal + ivTotal;

  const vTotal = (hasEinmaligeSozialleist ? einmaligeSozialleistAmount : 0) + 
                 (hasEinmaligeGeldleist ? einmaligeGeldleistAmount : 0) + 
                 (hasNachzahlungLaufend ? nachzahlungLaufendAmount : 0) + 
                 (hasNachzahlungSonst ? nachzahlungSonstAmount : 0) + 
                 (hasMutterKind ? mutterKindAmount : 0);

  const handleReset = () => {
    applyPreset("allein");
  };

  // Word (DOCX) P-Konto Bescheinigung Export
  const downloadCertificateDocx = async () => {
    try {
      const docChildren: any[] = [];

      // Header title
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "BESCHEINIGUNG NACH § 903 ABS. 1 ZPO",
              bold: true,
              size: 24,
              color: "1e293b",
            })
          ],
          spacing: { before: 200, after: 100 }
        })
      );

      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "PFÄNDUNGSSCHUTZ-BESCHEINIGUNG FÜR P-KONTO",
              bold: true,
              size: 30,
              color: "0f172a",
            })
          ],
          spacing: { after: 200 }
        })
      );

      // Section A: Kreditinstitut und Kontoinhaber
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "1. Kreditinstitut & Kontoinhaber:",
              bold: true,
              size: 22,
              color: "0f172a",
            })
          ],
          spacing: { after: 80 }
        })
      );

      const bankLines = [
        `Kreditinstitut:  ${bankName}`,
        `IBAN:            ${ibanValue}`,
        `Kontoinhaber:    ${ownerName}`,
        `Geburtsdatum:    ${birthDate}`,
        `Anschrift:       ${addressLine}`,
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

      // Section B: Bescheinigende Stelle
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "2. Bescheinigende Stelle / Person:",
              bold: true,
              size: 22,
              color: "0f172a",
            })
          ],
          spacing: { after: 80 }
        })
      );

      const agencyLines = [
        `Bezeichnung:  ${agencyName}`,
        `Anschrift:    ${agencyStreet}, ${agencyCity}`,
        `Bereich:      ${agencyContact}`,
        `Staatlich anerkannte geeignete Stelle gem. § 305 InsO`,
      ];

      agencyLines.forEach(line => {
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

      // Section C: Freibeträge
      docChildren.push(
        new DocxParagraph({
          children: [
            new DocxTextRun({
              text: "3. Bescheinigte monatliche Freibeträge (Stand 2026):",
              bold: true,
              size: 22,
              color: "0f172a",
            })
          ],
          spacing: { after: 80 }
        })
      );

      const dependentsCount = (hasFirstPerson ? 1 : 0) + additionalPersonsCount;
      const dependentsAllowance = (hasFirstPerson ? firstPersonAllowance : 0) + (additionalPersonsCount * additionalPersonAllowance);
      const otherAllowances = ivTotal;

      const freibetragLines = [
        `• Grundfreibetrag (§ 902 ZPO): EUR ${baseAllowance.toFixed(2)}`,
        `• Erhöhungsbetrag (Unterhaltspflichten): EUR ${dependentsAllowance.toFixed(2)} (für ${dependentsCount} Personen)`,
        `• Sonstige addierte Leistungen (SGB II, AsylbLG, Kindergeld etc.): EUR ${otherAllowances.toFixed(2)}`,
        `• INSGESAMT BESCHEINIGTER FREIBETRAG: EUR ${totalMonthlyAllowance.toFixed(2)}`,
      ];

      freibetragLines.forEach((line, idx) => {
        docChildren.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({
                text: line,
                bold: idx === 3,
                size: idx === 3 ? 22 : 20,
                color: idx === 3 ? "1e3a8a" : "1e293b",
              })
            ],
            spacing: { after: 50 }
          })
        );
      });

      docChildren.push(new DocxParagraph({ text: "", spacing: { after: 250 } }));

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
              text: "Ort, Datum & Unterschrift Kontoinhaber              Stempel & amtliche Unterschrift der Stelle",
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
      link.download = `Amtliche_P_Konto_Bescheinigung_903_ZPO_${ownerName.replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Fehler beim Erzeugen der P-Konto-Bescheinigung als Word-Dokument.");
    }
  };

  const downloadCertificatePdf = () => {
    downloadCertificateDocx();
    return;
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      doc.setFont("helvetica", "normal");
      
      // TITLE HEADER
      doc.setFont("helvetica", "bold");
      doc.setFontSize(21);
      doc.text("B e s c h e i n i g u n g", 105, 16, { align: "center" });
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("nach § 903 Abs. 1 ZPO über die gemäß §§ 902 und 904 ZPO", 105, 21, { align: "center" });
      doc.text("von der Pfändung nicht erfassten Beträge auf einem Pfändungsschutzkonto", 105, 25, { align: "center" });
      
      // Header subtitle info
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text("Arbeitsgemeinschaft Schuldnerberatung der Verbände (AG SBV) vom 21.09.2021", 15, 30);
      doc.text(`in Absprache mit der Deutschen Kreditwirtschaft (DK) – Stand: ${limits.standLabel}`, 195, 30, { align: "right" });
      
      doc.setLineWidth(0.3);
      doc.setDrawColor(0);

      // SECTION I BOX
      doc.setFillColor(242, 243, 245);
      doc.rect(15, 32, 180, 36, "F");
      doc.rect(15, 32, 180, 36);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(0);
      doc.text("I. Bezeichnung der bescheinigenden Person oder Stelle nach § 903 Abs. 1 Satz 2 ZPO", 17, 36.5);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(`Name: ${agencyName}`, 17, 41.5);
      doc.text(`Straße: ${agencyStreet}  |   Ort: ${agencyCity}`, 17, 45.5);
      doc.text(`Anerkennende Stelle / Ansprechpartner:in: ${agencyContact}`, 17, 49.5);
      doc.text(`Akkreditiert von Senat: Datum ${bescheidDatum}   |   Aktenzeichen: ${bescheidAktenzeichen}`, 17, 53.5);

      // Section I Checkboxes
      const stellenString = `Erteilt als: [${isGeeigneteStelle ? "X" : " "}] geeignete Stelle gem. § 305 Abs. 1 Nr. 1 InsO           [${isGeeignetePerson ? "X" : " "}] geeignete Person`;
      doc.text(stellenString, 17, 58);
      const typenString = `Rolle: [${isArbeitgeber ? "X" : " "}] Arbeitgeber      [${isSozialleistungstraeger ? "X" : " "}] Sozialleistungsträger      [${isSonstigerLeistungstraeger ? "X" : " "}] sonstiger Leistungsträger      [${isFamilienkasse ? "X" : " "}] Familienkasse`;
      doc.text(typenString, 17, 62.5);

      // SECTION II BOX
      doc.rect(15, 71, 180, 24);
      doc.setFont("helvetica", "bold");
      doc.text("II. Angaben zum Kontoinhaber und Pfändungsschutzkonto", 17, 75.5);
      
      doc.setFont("helvetica", "normal");
      doc.text(`Kontoinhaber:in: ${ownerName}    |   Geburtsdatum: ${birthDate}`, 17, 80.5);
      doc.text(`Anschrift: ${addressLine}`, 17, 85);
      doc.text(`Kreditinstitut: ${bankName}    |   Kontonummer oder IBAN: ${ibanValue}`, 17, 89.5);

      // SECTION III TABLE
      doc.rect(15, 98, 180, 40);
      doc.setFont("helvetica", "bold");
      doc.text("III. Ermittlung des pfändungsfreien Betrages nach der gesetzlichen Pfändungstabelle", 17, 102);

      doc.setFont("helvetica", "normal");
      doc.text("[X] Grundfreibetrag des Schuldners (= Kontoinhaber) derzeit (§ 899 Abs. 1 ZPO i.V.m. § 850c)", 17, 107.5);
      doc.setFont("helvetica", "bold");
      doc.text(`in Höhe von ${baseAllowance.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`, 192, 107.5, { align: "right" });

      // First person
      doc.setFont("helvetica", "normal");
      doc.text(`[${hasFirstPerson ? "X" : " "}] Erhöhungsbetrag für die erste Person derzeit (a: ${firstPersonReason === "a" ? "Ja" : "Nein"}, b: ${firstPersonReason === "b" ? "Ja" : "Nein"}, c: ${firstPersonReason === "c" ? "Ja" : "Nein"})`, 17, 114.5);
      doc.text("   a) gesetzlicher Unterhalt, b) SGB II/XII Geldleistungen, c) AsylbLG Gelder", 17, 118);
      doc.setFont("helvetica", "bold");
      doc.text(`in Höhe von ${hasFirstPerson ? firstPersonAllowance.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"} EUR`, 192, 114.5, { align: "right" });

      // Subsequent dependents
      doc.setFont("helvetica", "normal");
      const otherDeps = additionalPersonsCount;
      doc.text(`[${otherDeps > 0 ? "X" : " "}] Erhöhungsbetrag für ${otherDeps} weitere Person(en) derzeit i.H.v. je ${additionalPersonAllowance.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`, 17, 125);
      doc.text(`   Unterhalt gewährt nach: Grd. [${additionalPersonsReason === "a" ? "X" : " "}] gesetzlich Unterhalt / [${additionalPersonsReason === "b" ? "X" : " "}] SGB / [${additionalPersonsReason === "c" ? "X" : " "}] Asyl`, 17, 128.5);
      doc.setFont("helvetica", "bold");
      doc.text(`in Höhe von ${(otherDeps * additionalPersonAllowance).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`, 192, 125, { align: "right" });

      // SECTION IV TABLE (laufende)
      doc.setFillColor(248, 249, 250);
      doc.rect(15, 141, 180, 56);
      doc.setFont("helvetica", "bold");
      doc.text("IV. weitere laufende monatliche Geldleistungen", 17, 145);

      doc.setFont("helvetica", "normal");
      doc.text(`[${hasLaufendeSGB ? "X" : " "}] Laufende Leistungen SGB II, SGB XII, Asyl die den Freibetrag übersteigen (§ 902 S.1 Nr.4)`, 17, 150);
      doc.text(`in Höhe von ${hasLaufendeSGB ? laufendeSGBAmount.toFixed(2) : "0,00"} EUR`, 192, 150, { align: "right" });

      doc.text(`[${hasLaufendeMehraufwand ? "X" : " "}] Geldleistungen zum Ausgleich gesundheitlicher/Körper-Mehraufwendungen (§ 902 S.1 Nr.2)`, 17, 156);
      doc.text(`in Höhe von ${hasLaufendeMehraufwand ? laufendeMehraufwandAmount.toFixed(2) : "0,00"} EUR`, 192, 156, { align: "right" });

      doc.text(`[${hasLaufendeUnpfaendbar ? "X" : " "}] Laufende Bezüge für Schuldner selbst, landes-/bundesrechtlich unpfändbar (§ 902 S.1 Nr.6)`, 17, 162);
      doc.text(`in Höhe von ${hasLaufendeUnpfaendbar ? laufendeUnpfaendbarAmount.toFixed(2) : "0,00"} EUR`, 192, 162, { align: "right" });

      // Kindergeld section details
      doc.text(`[${hasKindergeld ? "X" : " "}] Kindergeld für (§ 902 Satz 1 Nr. 5 ZPO) gesetzlicher Kindergeldempfänger:`, 17, 168);
      const kgA = hasKindergeld && kind1Born ? `${kind1Born}: ${kind1Amount.toFixed(2)} EUR` : " - ";
      const kgB = hasKindergeld && hasKind2 ? `, Kind 2 (${kind2Born}): ${kind2Amount.toFixed(2)} EUR` : "";
      const kgC = hasKindergeld && hasKind3 ? `, Kind 3 (${kind3Born}): ${kind3Amount.toFixed(2)} EUR` : "";
      doc.text(`   Kind 1 (geb. ${kgA})${kgB}${kgC}`, 17, 172.5);
      doc.setFont("helvetica", "bold");
      doc.text(`in Höhe von ${kindergeldSum.toFixed(2)} EUR`, 192, 168, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.text(`[${hasAndereGeldleistungKinder ? "X" : " "}] Andere gesetzliche Geldleistungen für Kinder (Zuschlag, Kinderrente) (§ 902 S.1 Nr.5)`, 17, 178);
      doc.setFont("helvetica", "bold");
      doc.text(`in Höhe von ${hasAndereGeldleistungKinder ? andereGeldleistungKinderAmount.toFixed(2) : "0,00"} EUR`, 192, 178, { align: "right" });

      // SECTION IV Summary Row
      doc.setFillColor(235, 238, 242);
      doc.rect(15, 184, 180, 10, "F");
      doc.rect(15, 184, 180, 10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Monatlicher Gesamtfreibetrag (amtlich bescheinigt):", 17, 190.5);
      doc.setFontSize(10.5);
      doc.setTextColor(200, 30, 30);
      doc.text(`${totalMonthlyAllowance.toLocaleString("de-DE", { minimumFractionDigits: 2 })} EUR`, 192, 191, { align: "right" });
      doc.setTextColor(0);

      // SECTION V BOX (Einmalige Freibeträge)
      doc.setFontSize(7.5);
      doc.rect(15, 197, 180, 35);
      doc.text("V. Ermittlung des einmaligen Freibetrags (besondere Freigaben)", 17, 201);
      
      doc.setFont("helvetica", "normal");
      doc.text(`[${hasEinmaligeSozialleist ? "X" : " "}] Einmalige Sozialleistungen (§ 902 S.1 Nr.2 i.V.m. § 54 SGB I)  |  i.H.v. ${hasEinmaligeSozialleist ? einmaligeSozialleistAmount.toFixed(2) : "0,00"} EUR`, 17, 206);
      doc.text(`[${hasEinmaligeGeldleist ? "X" : " "}] Einmalige Bundes- / Landesleistungen unpfändbar (§ 902 S.1 Nr.6)  |  i.H.v. ${hasEinmaligeGeldleist ? einmaligeGeldleistAmount.toFixed(2) : "0,00"} EUR`, 17, 211);
      doc.text(`[${hasNachzahlungLaufend ? "X" : " "}] Nachzahlungen laufender Bezüge (SGB II, Kindergeld, etc. § 904 Abs.4) | i.H.v. ${hasNachzahlungLaufend ? nachzahlungLaufendAmount.toFixed(2) : "0,00"} EUR`, 17, 216);
      doc.text(`[${hasMutterKind ? "X" : " "}] Geldleistungen Stiftung 'Mutter und Kind - Schutz des ungeborenen Lebens' | i.H.v. ${hasMutterKind ? mutterKindAmount.toFixed(2) : "0,00"} EUR`, 17, 221);
      doc.text(`[${hasNachzahlungSonst ? "X" : " "}] Nachzahlung sonstiger laufender Leistungen bis 500 EUR Einmalbetrag | i.H.v. ${hasNachzahlungSonst ? nachzahlungSonstAmount.toFixed(2) : "0,00"} EUR`, 17, 226);

      // SIGNATURE BLOCK
      doc.line(15, 248, 85, 248);
      doc.line(125, 248, 195, 248);
      
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(`Berlin, den ${new Date().toLocaleDateString("de-DE")}`, 17, 246);
      doc.text("(Ort, Datum)", 17, 252);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("Gesetzeslotse BERLIN e.V.", 125, 245);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("(Unterschrift / Stempel der bescheinigenden Person oder Stelle)", 125, 252);

      // Footnotes
      doc.setFontSize(6);
      doc.setTextColor(140);
      doc.text("1 Die Freibeträge werden jährlich zum 01.07. angepasst. Pfändungsfreibeträge basierend auf der aktuellen Gesetzestabelle von 2025/2026.", 15, 264);
      doc.text("2 Bei jedem Kind ist der Geburtsmonat und das Geburtsjahr in das Formular einzutragen.", 15, 268);
      doc.text("3 Ab dem 6. Kind sind alle weiteren Kinder auf einem getrennten Zusatzblatt detailliert aufzulisten und beizulegen.", 15, 272);
      
      doc.setFont("helvetica", "bold");
      doc.text("UrhG-Muster: Das Amtliche Dokument steht unter einer Creative Commons Namensnennung-Keine Bearbeitung 3.0 Deutschland Lizenz.", 15, 278);

      doc.save(`Amtliche_P_Konto_Bescheinigung_903_ZPO_${ownerName.replace(/\s+/g, "_")}.pdf`);
      logGesetzeslotseActivity(
        "calculation",
        "Bescheinigung als PDF exportiert",
        `Amtliche P-Konto-Bescheinigung (§ 903 ZPO) für ${ownerName} generiert. Freibetrag: € ${totalMonthlyAllowance.toLocaleString("de-DE", { minimumFractionDigits: 2 })}.`
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" id="pkonto-calculator-root">
      
      {/* Introduction */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-450 font-bold px-2.5 py-1 rounded tracking-wide uppercase">
            § 903 Abs. 1 ZPO Schutzformular
          </span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2 flex items-center gap-2">
            <Landmark className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            Interaktiver Vordruck: Pfändungsschutzkonto-Bescheinigung
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 max-w-3xl">
            Passen Sie das offizielle, vom Senat Berlin empfohlene AG SBV-Formular (Tabelle Stand: {limits.standLabel}) direkt über die inline Eingabefelder und Checkboxen an. Die Summen und Zuweisungen kalkulieren vollautomatisch.
          </p>
        </div>
        
        {/* Quick exports */}
        <div className="flex gap-2 shrink-0 items-center">
          <button
            onClick={() => {
              logGesetzeslotseActivity(
                "calculation", 
                "Druckansicht geöffnet", 
                `Druckvorschau für P-Konto-Bescheinigung (§ 903 ZPO) geöffnet. Freibetrag: € ${totalMonthlyAllowance.toLocaleString("de-DE", { minimumFractionDigits: 2 })}.`
              );
              window.print();
            }}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:border-slate-700 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Drucken über die Druckvorschau des Browsers"
          >
            <Printer className="h-4 w-4" />
            Vorschau drucken
          </button>
          
          <button
            onClick={downloadCertificatePdf}
            className="p-2 bg-slate-950 hover:bg-slate-850 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Sichert die Bescheinigung als amtliches Word (DOCX) Dokument"
          >
            <Download className="h-4 w-4 text-amber-400" />
            Als AG SBV Word (DOCX) sichern
          </button>
        </div>
      </div>

      {/* Preset selector bar */}
      <div className="bg-slate-50 dark:bg-slate-950/35 p-3 rounded-xl border border-slate-150 dark:border-slate-850 mb-5 text-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-3">
            <span className="font-bold text-slate-750 dark:text-slate-300">Stichtag der Pfändungstabelle:</span>
            <input
              type="date"
              value={calculationDate}
              onChange={(e) => setCalculationDate(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 font-bold text-slate-800 dark:text-slate-300 text-[11px] focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-transparent cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-750 dark:text-slate-300">Vorlage laden:</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => applyPreset("allein")}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
          >
            Alleinstehend (Grundbetrag)
          </button>
          <button
            onClick={() => applyPreset("partner")}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
          >
            Ehegatten/Unterhalt
          </button>
          <button
            onClick={() => applyPreset("alleinKind")}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
          >
            Alleinstehend mit 1 Kind
          </button>
          <button
            onClick={() => applyPreset("familie")}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
          >
            Familie (Partner, 2 Kinder)
          </button>
        </div>
      </div>

      {/* Main Interactive Paper Mockup */}
      <div className="border-4 border-double border-slate-350 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 font-sans space-y-6 shadow-md rounded-2xl selection:bg-slate-200 text-slate-950 dark:text-slate-100 transition-colors leading-relaxed leading-normal select-all">
        
        {/* Double-bordered header */}
        <div className="text-center font-sans">
          <h1 className="text-2xl font-black uppercase tracking-widest text-slate-950 dark:text-white block">B e s c h e i n i g u n g</h1>
          <h2 className="text-[12px] font-bold text-slate-900 dark:text-slate-200 mt-1 uppercase">nach § 903 Abs. 1 ZPO über die gemäß §§ 902 und 904 ZPO</h2>
          <h3 className="text-[12px] font-semibold text-slate-855 dark:text-slate-300 -mt-0.5">von der Pfändung nicht erfassten Beträge auf einem Pfändungsschutzkonto</h3>
          
          <div className="border-t border-b border-slate-955 dark:border-slate-805 py-1.5 px-3 text-[9px] flex justify-between mt-3 text-slate-600 dark:text-slate-400">
            <span>Arbeitsgemeinschaft Schuldnerberatung der Verbände (AG SBV) vom 21.09.2021</span>
            <span className="font-bold dark:text-emerald-450">Stand: {limits.standLabel}</span>
            <span>In Absprache mit der Deutschen Kreditwirtschaft (DK)</span>
          </div>
        </div>

        {/* Section I Column Box */}
        <div className="border border-slate-950 dark:border-slate-800 text-[11px] rounded overflow-hidden">
          <div className="bg-slate-105 dark:bg-slate-900 p-2 font-extrabold border-b border-slate-950 dark:border-slate-800 text-[10px] tracking-wide uppercase text-slate-850 dark:text-slate-200">
            I. Bezeichnung der bescheinigenden Person oder Stelle nach § 903 Abs. 1 Satz 2 ZPO
          </div>
          <div className="p-3.5 grid grid-cols-1 md:grid-cols-12 gap-3.5">
            <div className="md:col-span-8 space-y-2">
              <div>
                <label className="text-[9px] text-slate-400 font-bold block">NAME DER BESCHEINIGENDEN STELLE</label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/60 font-mono border-b border-slate-300 focus:border-slate-900 dark:border-slate-800 dark:focus:border-white focus:outline-none py-0.5 text-xs text-slate-850 dark:text-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-slate-400 font-bold block">STRASSE HAUSNUMMER</label>
                  <input
                    type="text"
                    value={agencyStreet}
                    onChange={(e) => setAgencyStreet(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 font-mono border-b border-slate-300 focus:border-slate-900 dark:border-slate-800 focus:outline-none py-0.5 text-xs text-slate-850 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 font-bold block">PLZ / ORT</label>
                  <input
                    type="text"
                    value={agencyCity}
                    onChange={(e) => setAgencyCity(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/60 font-mono border-b border-slate-300 focus:border-slate-900 dark:border-slate-800 focus:outline-none py-0.5 text-xs text-slate-850 dark:text-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] text-slate-400 font-bold block">ANSPRECHPARTNER:IN</label>
                <input
                  type="text"
                  value={agencyContact}
                  onChange={(e) => setAgencyContact(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/60 font-mono border-b border-slate-300 focus:border-slate-900 dark:border-slate-800 focus:outline-none py-0.5 text-xs text-slate-850 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-slate-300 dark:border-slate-800 pt-3 md:pt-0 md:pl-4 space-y-2.5">
              <span className="font-semibold block uppercase text-[10px] text-slate-450">Rechtlich-Zertifiziert</span>
              <div className="space-y-1.5">
                <label className="flex items-start gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isGeeigneteStelle}
                    onChange={(e) => setIsGeeigneteStelle(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900"
                  />
                  <span>Geeignete Stelle § 305 InsO</span>
                </label>
                <label className="flex items-start gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isGeeignetePerson}
                    onChange={(e) => setIsGeeignetePerson(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900"
                  />
                  <span>Geeignete Person § 305 InsO</span>
                </label>
              </div>

              <div className="space-y-1">
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    <span className="text-[8px] text-slate-400 font-bold block">DAT. BESCHEID</span>
                    <input
                      type="text"
                      value={bescheidDatum}
                      onChange={(e) => setBescheidDatum(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/60 border-b border-slate-300 focus:outline-none text-[10px]"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[8px] text-slate-400 font-bold block">AKTENZEICHEN</span>
                    <input
                      type="text"
                      value={bescheidAktenzeichen}
                      onChange={(e) => setBescheidAktenzeichen(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/60 border-b border-slate-300 focus:outline-none text-[10px]"
                    />
                  </div>
                </div>
              </div>

              {/* Certification Origin Roles */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1 text-[9px]">
                <span className="font-bold text-slate-450 block">BESCHEINIGUNGSBERECHTIGTER:</span>
                <div className="grid grid-cols-2 gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={isArbeitgeber} onChange={(e) => setIsArbeitgeber(e.target.checked)} className="h-3 w-3 rounded" />
                    <span>Arbeitgeber</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={isSozialleistungstraeger} onChange={(e) => setIsSozialleistungstraeger(e.target.checked)} className="h-3 w-3 rounded" />
                    <span>Sozialleiststr.</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={isSonstigerLeistungstraeger} onChange={(e) => setIsSonstigerLeistungstraeger(e.target.checked)} className="h-3 w-3 rounded" />
                    <span>Sonst. Träger</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={isFamilienkasse} onChange={(e) => setIsFamilienkasse(e.target.checked)} className="h-3 w-3 rounded" />
                    <span>Familienkasse</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section II Column Box */}
        <div className="border border-slate-950 dark:border-slate-800 text-[11px] rounded overflow-hidden">
          <div className="bg-slate-105 dark:bg-slate-900 p-2 font-extrabold border-b border-slate-950 dark:border-slate-800 text-[10px] tracking-wide uppercase text-slate-850 dark:text-slate-200">
            II. Angaben zum Kontoinhaber und Pfändungsschutzkonto
          </div>
          <div className="p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="text-[9px] text-slate-400 font-bold block">NAME DES KONTOINHABERS</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/60 font-mono font-bold border-b border-slate-300 focus:border-slate-900 dark:border-slate-800 dark:focus:border-white focus:outline-none py-0.5 text-xs text-slate-850 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-400 font-bold block">GEBURTSDATUM DER PERSON</label>
              <input
                type="text"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/60 font-mono border-b border-slate-300 focus:outline-none py-0.5 text-xs text-slate-850 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-400 font-bold block">KREDITINSTITUT (BANK)</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/60 font-bold border-b border-slate-300 focus:outline-none py-0.5 text-xs text-slate-850 dark:text-slate-200"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[9px] text-slate-400 font-bold block">ANSCHRIFT DES SCHULDNERS</label>
              <input
                type="text"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/60 border-b border-slate-300 focus:outline-none py-0.5 text-xs text-slate-850 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-400 font-bold block">KONTONUMMER ODER IBAN</label>
              <input
                type="text"
                value={ibanValue}
                onChange={(e) => setIbanValue(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/60 font-mono font-semibold border-b border-slate-300 focus:outline-none py-0.5 text-xs text-slate-850 dark:text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Section III Column Box */}
        <div className="border border-slate-950 dark:border-slate-800 text-[11px] rounded overflow-hidden">
          <div className="bg-slate-105 dark:bg-slate-900 p-2 font-extrabold border-b border-slate-950 dark:border-slate-800 text-[10px] tracking-wide uppercase text-slate-850 dark:text-slate-200">
            III. Ermittlung des pfändungsfreien Betrages nach der gesetzlichen Pfändungstabelle
          </div>
          <div className="p-3.5 space-y-3">
            
            {/* 1. Grundfreibetrag (Standard) */}
            <div className="flex items-center justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-start gap-2 max-w-lg">
                <span className="font-bold border px-1 bg-slate-50 dark:bg-slate-900">X</span>
                <div>
                  <span className="font-bold block">Grundfreibetrag des Schuldners: {baseAllowance.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                  <span className="text-[10px] text-slate-450 block">Gesetzlicher Sockelfreibetrag gem. §§ 899 Abs. 1 i.V.m. 850c ZPO</span>
                </div>
              </div>
              <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">{baseAllowance.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
            </div>

            {/* 2. Erhöhung 1. Person */}
            <div className="flex items-start justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-2 gap-4">
              <div className="flex items-start gap-2 max-w-xl">
                <input
                  type="checkbox"
                  checked={hasFirstPerson}
                  onChange={(e) => setHasFirstPerson(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
                />
                <div>
                  <span className="font-bold block text-slate-850 dark:text-slate-100">
                    Erhöhungsbetrag für die erste Person derzeit: {firstPersonAllowance.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                  <p className="text-[10px] text-slate-450">
                    Wird gewährt für Ehepartner, erste(s) leibliches Kind oder Lebenspartner auf Grundlage von:
                  </p>
                  
                  {hasFirstPerson && (
                    <div className="flex gap-3 text-[10px] mt-1 text-slate-700 dark:text-slate-300 font-semibold">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="firstPersonReason"
                          checked={firstPersonReason === "a"}
                          onChange={() => setFirstPersonReason("a")}
                        />
                        <span>a) gesetzl. Unterhaltspflicht</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="firstPersonReason"
                          checked={firstPersonReason === "b"}
                          onChange={() => setFirstPersonReason("b")}
                        />
                        <span>b) SGB II / XII Bezüge</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="firstPersonReason"
                          checked={firstPersonReason === "c"}
                          onChange={() => setFirstPersonReason("c")}
                        />
                        <span>c) AsylbLG Gelder</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
              <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">
                {hasFirstPerson ? `${firstPersonAllowance.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : "0,00 €"}
              </span>
            </div>

            {/* 3. Erhöhung für weitere Personen */}
            <div className="flex items-start justify-between pb-1 gap-4">
              <div className="flex items-start gap-2 max-w-xl">
                <input
                  type="checkbox"
                  checked={additionalPersonsCount > 0}
                  onChange={(e) => setAdditionalPersonsCount(e.target.checked ? 1 : 0)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
                />
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-850 dark:text-slate-100">
                      Erhöhungsbetrag für weitere Personen:
                    </span>
                    
                    <select
                      value={additionalPersonsCount}
                      onChange={(e) => setAdditionalPersonsCount(parseInt(e.target.value) || 0)}
                      className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 font-bold text-slate-800 dark:text-slate-300 text-[10px]"
                    >
                      <option value={0}>0 Personen</option>
                      <option value={1}>1 weitere Person ({additionalPersonAllowance.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)</option>
                      <option value={2}>2 weitere Personen ({(additionalPersonAllowance * 2).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)</option>
                      <option value={3}>3 weitere Personen ({(additionalPersonAllowance * 3).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)</option>
                      <option value={4}>4+ weitere Personen ({(additionalPersonAllowance * 4).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-slate-450 mt-1">
                    Wird gewährt für jedes weitere leibliche, Stief- oder Pflegekind, dem Sie aktiv Sorge tragen:
                  </p>
                  
                  {additionalPersonsCount > 0 && (
                    <div className="flex gap-3 text-[10px] mt-1 text-slate-700 dark:text-slate-300 font-semibold">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="addPersonsReason"
                          checked={additionalPersonsReason === "a"}
                          onChange={() => setAdditionalPersonsReason("a")}
                        />
                        <span>a) gesetzl. Sorge</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="addPersonsReason"
                          checked={additionalPersonsReason === "b"}
                          onChange={() => setAdditionalPersonsReason("b")}
                        />
                        <span>b) SGB Bezüge für Kinder</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="addPersonsReason"
                          checked={additionalPersonsReason === "c"}
                          onChange={() => setAdditionalPersonsReason("c")}
                        />
                        <span>c) AsylbLG</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
              <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">
                {(additionalPersonsCount * additionalPersonAllowance).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>

          </div>
        </div>

        {/* Section IV Column Box */}
        <div className="border border-slate-950 dark:border-slate-800 text-[11px] rounded overflow-hidden">
          <div className="bg-slate-105 dark:bg-slate-900 p-2 font-extrabold border-b border-slate-950 dark:border-slate-800 text-[10px] tracking-wide uppercase text-slate-850 dark:text-slate-200">
            IV. weitere laufende monatliche Geldleistungen (Abschnitt B / Sonderfreibeträge)
          </div>
          <div className="p-3.5 space-y-3.5">
            
            {/* 1. Laufende SGB II / XII */}
            <div className="flex items-center justify-between border-b border-dashed border-slate-150 dark:border-slate-870 pb-2">
              <div className="flex items-start gap-2 max-w-xl">
                <input
                  type="checkbox"
                  checked={hasLaufendeSGB}
                  onChange={(e) => setHasLaufendeSGB(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
                />
                <div>
                  <span className="font-bold block text-slate-800 dark:text-slate-200">
                    Laufende Bezüge SGB / Asyl die den Freibetrag übersteigen (§ 902 S.1 Nr.4)
                  </span>
                  <span className="text-[10px] text-slate-450 block">Zusatzbedarf für Miete, Heizen oder barer Unterhalt</span>
                </div>
              </div>
              
              {hasLaufendeSGB ? (
                <div className="flex items-center gap-1">
                  <span>EUR</span>
                  <input
                    type="number"
                    value={laufendeSGBAmount || ""}
                    onChange={(e) => setLaufendeSGBAmount(parseFloat(e.target.value) || 0)}
                    className="w-16 text-right font-mono font-bold bg-slate-50 dark:bg-slate-900/60 border rounded px-1"
                  />
                </div>
              ) : (
                <span className="font-mono text-slate-400">0,00 €</span>
              )}
            </div>

            {/* 2. Gesundheit / Mehraufwand */}
            <div className="flex items-center justify-between border-b border-dashed border-slate-150 dark:border-slate-870 pb-2">
              <div className="flex items-start gap-2 max-w-xl">
                <input
                  type="checkbox"
                  checked={hasLaufendeMehraufwand}
                  onChange={(e) => setHasLaufendeMehraufwand(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
                />
                <div>
                  <span className="font-bold block text-slate-800 dark:text-slate-200">
                    Leistungen zum Ausgleich gesundheitspflegerischer Mehraufwände (§ 902 S.1 Nr.2)
                  </span>
                  <span className="text-[10px] text-slate-450 block">Blindengeld, Gehörlosigkeit, Pflegegrade, Heilmittelkostenerstattung</span>
                </div>
              </div>
              
              {hasLaufendeMehraufwand ? (
                <div className="flex items-center gap-1">
                  <span>EUR</span>
                  <input
                    type="number"
                    value={laufendeMehraufwandAmount || ""}
                    onChange={(e) => setLaufendeMehraufwandAmount(parseFloat(e.target.value) || 0)}
                    className="w-16 text-right font-mono font-bold bg-slate-50 dark:bg-slate-900/60 border rounded px-1"
                  />
                </div>
              ) : (
                <span className="font-mono text-slate-400">0,00 €</span>
              )}
            </div>

            {/* 3. Unpfändbar */}
            <div className="flex items-center justify-between border-b border-dashed border-slate-150 dark:border-slate-870 pb-2">
              <div className="flex items-start gap-2 max-w-xl">
                <input
                  type="checkbox"
                  checked={hasLaufendeUnpfaendbar}
                  onChange={(e) => setHasLaufendeUnpfaendbar(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
                />
                <div>
                  <span className="font-bold block text-slate-800 dark:text-slate-200">
                    Sonstige landes- / bundesrechtlich unpfändbare Bezüge (§ 902 S.1 Nr.6)
                  </span>
                  <span className="text-[10px] text-slate-450 block">Teilentschädigungen, Ehrensold, Erziehungsgelder</span>
                </div>
              </div>
              
              {hasLaufendeUnpfaendbar ? (
                <div className="flex items-center gap-1">
                  <span>EUR</span>
                  <input
                    type="number"
                    value={laufendeUnpfaendbarAmount || ""}
                    onChange={(e) => setLaufendeUnpfaendbarAmount(parseFloat(e.target.value) || 0)}
                    className="w-16 text-right font-mono font-bold bg-slate-50 dark:bg-slate-900/60 border rounded px-1"
                  />
                </div>
              ) : (
                <span className="font-mono text-slate-400">0,00 €</span>
              )}
            </div>

            {/* 4. Kindergeld */}
            <div className="space-y-2 border-b border-dashed border-slate-150 dark:border-slate-870 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-2 max-w-xl">
                  <input
                    type="checkbox"
                    checked={hasKindergeld}
                    onChange={(e) => setHasKindergeld(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
                  />
                  <div>
                    <span className="font-bold block text-slate-850 dark:text-slate-100">
                      Kindergeld nach § 902 Satz 1 Nr. 5 ZPO (Zusatzfreigaben)
                    </span>
                    <p className="text-[10px] text-slate-450">
                      Zugelassene Kindergeldfortzahlungen für berechtigte Kinder. Tragen Sie Geburtsmonat/Jahr ein:
                    </p>
                  </div>
                </div>
                <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">
                  {kindergeldSum.toFixed(2)} €
                </span>
              </div>

              {hasKindergeld && (
                <div className="pl-6 pt-1 space-y-2 max-w-2xl bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-150 dark:border-slate-850">
                  
                  {/* Kind 1 */}
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="font-bold w-12 text-slate-700 dark:text-slate-350">Kind 1:</span>
                    <span className="text-[10px] text-slate-400">Geboren (MM.JJJJ):</span>
                    <input
                      type="text"
                      placeholder="04.2018"
                      value={kind1Born}
                      onChange={(e) => setKind1Born(e.target.value)}
                      className="border-b focus:border-slate-900 dark:focus:border-white focus:outline-none w-14 text-center text-[11px] font-mono bg-transparent"
                    />
                    <span className="text-[10px] text-slate-400 ml-4">Betrag (€):</span>
                    <input
                      type="number"
                      value={kind1Amount}
                      onChange={(e) => setKind1Amount(parseFloat(e.target.value) || 0)}
                      className="border-b focus:outline-none w-14 text-center font-mono font-bold bg-transparent"
                    />
                  </div>

                  {/* Kind 2 */}
                  <div className="flex items-center gap-2 text-xs flex-wrap border-t border-slate-200 dark:border-slate-800 pt-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer w-16">
                      <input type="checkbox" checked={hasKind2} onChange={(e) => setHasKind2(e.target.checked)} className="h-3 w-3 rounded" />
                      <span className="font-semibold text-slate-700 dark:text-slate-350">Kind 2:</span>
                    </label>
                    {hasKind2 && (
                      <>
                        <span className="text-[10px] text-slate-400">Geboren:</span>
                        <input
                          type="text"
                          placeholder="11.2021"
                          value={kind2Born}
                          onChange={(e) => setKind2Born(e.target.value)}
                          className="border-b focus:outline-none w-14 text-center text-[11px] font-mono bg-transparent"
                        />
                        <span className="text-[10px] text-slate-400 ml-4">Betrag:</span>
                        <input
                          type="number"
                          value={kind2Amount}
                          onChange={(e) => setKind2Amount(parseFloat(e.target.value) || 0)}
                          className="border-b focus:outline-none w-14 text-center font-mono font-bold bg-transparent"
                        />
                      </>
                    )}
                  </div>

                  {/* Kind 3 */}
                  <div className="flex items-center gap-2 text-xs flex-wrap border-t border-slate-200 dark:border-slate-800 pt-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer w-16">
                      <input type="checkbox" checked={hasKind3} onChange={(e) => setHasKind3(e.target.checked)} className="h-3 w-3 rounded" />
                      <span className="font-semibold text-slate-700 dark:text-slate-350">Kind 3:</span>
                    </label>
                    {hasKind3 && (
                      <>
                        <span className="text-[10px] text-slate-400">Geboren:</span>
                        <input
                          type="text"
                          placeholder="01.2023"
                          value={kind3Born}
                          onChange={(e) => setKind3Born(e.target.value)}
                          className="border-b focus:outline-none w-14 text-center text-[11px] font-mono bg-transparent"
                        />
                        <span className="text-[10px] text-slate-400 ml-4">Betrag:</span>
                        <input
                          type="number"
                          value={kind3Amount}
                          onChange={(e) => setKind3Amount(parseFloat(e.target.value) || 0)}
                          className="border-b focus:outline-none w-14 text-center font-mono font-bold bg-transparent"
                        />
                      </>
                    )}
                  </div>

                  {/* Kind 4 */}
                  <div className="flex items-center gap-2 text-xs flex-wrap border-t border-slate-200 dark:border-slate-800 pt-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer w-16">
                      <input type="checkbox" checked={hasKind4} onChange={(e) => setHasKind4(e.target.checked)} className="h-3 w-3 rounded" />
                      <span className="font-semibold text-slate-700 dark:text-slate-350">Kind 4:</span>
                    </label>
                    {hasKind4 && (
                      <>
                        <span className="text-[10px] text-slate-400">Geboren:</span>
                        <input
                          type="text"
                          placeholder="02.2024"
                          value={kind4Born}
                          onChange={(e) => setKind4Born(e.target.value)}
                          className="border-b focus:outline-none w-14 text-center text-[11px] font-mono bg-transparent"
                        />
                        <span className="text-[10px] text-slate-400 ml-4">Betrag:</span>
                        <input
                          type="number"
                          value={kind4Amount}
                          onChange={(e) => setKind4Amount(parseFloat(e.target.value) || 0)}
                          className="border-b focus:outline-none w-14 text-center font-mono font-bold bg-transparent"
                        />
                      </>
                    )}
                  </div>

                  {/* Kind 5 */}
                  <div className="flex items-center gap-2 text-xs flex-wrap border-t border-slate-200 dark:border-slate-800 pt-1.5 font-sans">
                    <label className="flex items-center gap-1.5 cursor-pointer w-16">
                      <input type="checkbox" checked={hasKind5} onChange={(e) => setHasKind5(e.target.checked)} className="h-3 w-3 rounded" />
                      <span className="font-semibold text-slate-700 dark:text-slate-350">Kind 5:</span>
                    </label>
                    {hasKind5 && (
                      <>
                        <span className="text-[10px] text-slate-400">Geboren:</span>
                        <input
                          type="text"
                          value={kind5Born}
                          onChange={(e) => setKind5Born(e.target.value)}
                          className="border-b focus:outline-none w-14 text-center text-[11px] font-mono bg-transparent"
                        />
                        <span className="text-[10px] text-slate-400 ml-4">Betrag:</span>
                        <input
                          type="number"
                          value={kind5Amount}
                          onChange={(e) => setKind5Amount(parseFloat(e.target.value) || 0)}
                          className="border-b focus:outline-none w-14 text-center font-mono font-bold bg-transparent"
                        />
                      </>
                    )}
                  </div>

                  {/* Weitere Kinder */}
                  <div className="flex items-center gap-2 text-xs flex-wrap border-t border-slate-200 dark:border-slate-800 pt-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={hasFurtherKids} onChange={(e) => setHasFurtherKids(e.target.checked)} className="h-3 w-3 rounded" />
                      <span className="font-semibold text-slate-700 dark:text-slate-350">weitere Kinder (Footnote 3):</span>
                    </label>
                    {hasFurtherKids && (
                      <>
                        <span className="text-[10px] text-slate-400">Anzahl:</span>
                        <input
                          type="number"
                          value={furtherKidsCount}
                          onChange={(e) => setFurtherKidsCount(parseInt(e.target.value) || 1)}
                          className="border-b focus:outline-none w-10 text-center font-mono"
                        />
                        <span className="text-[10px] text-slate-400">Gemeinsamer Betrag:</span>
                        <input
                          type="number"
                          value={furtherKidsAmount}
                          onChange={(e) => setFurtherKidsAmount(parseFloat(e.target.value) || 0)}
                          className="border-b focus:outline-none w-16 text-center font-mono font-bold bg-transparent"
                        />
                      </>
                    )}
                  </div>

                </div>
              )}
            </div>

            {/* 5. Andere Geldleistung für Kinder */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2 max-w-xl">
                <input
                  type="checkbox"
                  checked={hasAndereGeldleistungKinder}
                  onChange={(e) => setHasAndereGeldleistungKinder(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
                />
                <div>
                  <span className="font-bold block text-slate-800 dark:text-slate-200">
                    Andere gesetzliche Geldleistung(en) für Kinder (Renten, Zuschlag, § 902 S.1 Nr.5)
                  </span>
                  <span className="text-[10px] text-slate-450 block">Zusatzförderungsrenten für Verwaiste oder Pflegekinder</span>
                </div>
              </div>
              
              {hasAndereGeldleistungKinder ? (
                <div className="flex items-center gap-1">
                  <span>EUR</span>
                  <input
                    type="number"
                    value={andereGeldleistungKinderAmount || ""}
                    onChange={(e) => setAndereGeldleistungKinderAmount(parseFloat(e.target.value) || 0)}
                    className="w-16 text-right font-mono font-bold bg-slate-50 dark:bg-slate-900/60 border rounded px-1"
                  />
                </div>
              ) : (
                <span className="font-mono text-slate-400">0,00 €</span>
              )}
            </div>

            {/* SECTION III + IV MONATLICH TOTAL HEADER SUMMARY */}
            <div className="flex justify-between items-center p-3 bg-emerald-500/10 dark:bg-emerald-950/20 border-2 border-dashed border-emerald-500 rounded mt-3 text-slate-950 dark:text-slate-100">
              <span className="uppercase text-[9.5px] font-black tracking-widest text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                Monatlicher Gesamtfreibetrag (Kalkuliert):
              </span>
              <span className="font-mono text-lg font-black text-emerald-700 dark:text-emerald-450 animate-fadeIn">
                EUR {totalMonthlyAllowance.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* COMPARISON AND GARNISHABLE ALERT WIDGET */}
            <div className={`mt-4 p-4 rounded-xl border space-y-3 transition-all duration-300 ${
              debtorNetIncome > totalMonthlyAllowance
                ? "border-red-500/30 bg-red-500/[0.02] dark:border-red-900/40 dark:bg-red-950/[0.02] animate-garnish-alert"
                : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20"
            }`} id="garnishable-check-widget">
              
              {/* Employment Synchronization Banner */}
              {isEmployed && employerName ? (
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-lg text-[10.5px] transition-all border gap-1.5 ${
                  debtorNetIncome > totalMonthlyAllowance
                    ? "bg-red-500/5 border-red-200/40 text-red-800 dark:text-red-300"
                    : "bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-100/50 dark:border-indigo-900/30 text-indigo-800 dark:text-indigo-300"
                }`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block h-2 w-2 rounded-full ${
                      debtorNetIncome > totalMonthlyAllowance ? "bg-red-500 animate-pulse" : "bg-indigo-500"
                    }`}></span>
                    <span className="font-medium">Abgeglichen mit Bestandsaufnahme (Arbeitnehmer):</span>
                  </div>
                  <span className="font-bold truncate">{employerName}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/[0.04] dark:bg-amber-950/10 border border-amber-500/10 text-[10.5px] text-amber-800 dark:text-amber-400">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-500"></span>
                    <span className="font-medium">Abgeglichen mit Bestandsaufnahme:</span>
                  </div>
                  <span className="font-bold">Erwerbslos / Sonstiges</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                  <span className="font-bold text-slate-850 dark:text-slate-100 block text-xs">
                    Tatsächliches Nettoeinkommen des Schuldners
                  </span>
                  <span className="text-[10px] text-slate-450 block">
                    Geben Sie das monatliche Einkommen zur Überprüfung der Pfändbarkeit ein
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-500">EUR</span>
                  <input
                    type="number"
                    value={debtorNetIncome || ""}
                    onChange={(e) => setDebtorNetIncome(parseFloat(e.target.value) || 0)}
                    className="w-28 text-right font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-transparent text-slate-850 dark:text-slate-250"
                    placeholder="z.B. 1850"
                  />
                </div>
              </div>

              {debtorNetIncome > totalMonthlyAllowance ? (
                <div className="p-3.5 rounded-lg border border-red-200 dark:border-red-950 bg-red-500/10 dark:bg-red-950/25 text-slate-950 dark:text-slate-100">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-black text-xs text-red-700 dark:text-red-400 uppercase tracking-wide">
                          Achtung: Pfändungsfreigrenze überschritten!
                        </span>
                        <span className="font-mono text-xs font-black bg-red-600 text-white dark:bg-red-550 px-2 py-0.5 rounded animate-pulse animate-duration-1000">
                          +{ (debtorNetIncome - totalMonthlyAllowance).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) } EUR
                        </span>
                      </div>
                      <p className="text-[10px] text-red-650 dark:text-red-350 mt-1.5 leading-normal">
                        Das eingegebene Nettoeinkommen liegt über dem monatlichen Gesamtfreibetrag von <strong className="font-bold">{totalMonthlyAllowance.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR</strong>.
                      </p>
                      <div className="mt-2.5 border-t border-red-200/50 dark:border-red-900/50 pt-2 flex justify-between items-center text-[10.5px]">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Potenziell pfändbarer Betrag:</span>
                        <span className="font-mono font-black text-sm text-red-700 dark:text-red-400">
                          EUR { (debtorNetIncome - totalMonthlyAllowance).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : debtorNetIncome > 0 ? (
                <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-950 bg-emerald-500/5 dark:bg-emerald-950/15 text-slate-950 dark:text-slate-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-450 shrink-0" />
                    <div>
                      <span className="font-bold text-xs text-emerald-800 dark:text-emerald-400">
                        Einkommen geschützt
                      </span>
                      <p className="text-[10px] text-emerald-650 dark:text-emerald-350 mt-0.5 leading-none">
                        Das monatliche Nettoeinkommen liegt vollständig innerhalb des Freibetrags. Es ist kein pfändbarer Betrag vorhanden.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

          </div>
        </div>

        {/* Section V Column Box */}
        <div className="border border-slate-950 dark:border-slate-800 text-[11px] rounded overflow-hidden">
          <div className="bg-slate-105 dark:bg-slate-900 p-2 font-extrabold border-b border-slate-950 dark:border-slate-800 text-[10px] tracking-wide uppercase text-slate-850 dark:text-slate-200">
            V. Ermittlung des einmaligen Freibetrags (Gesondert anzupassen)
          </div>
          <div className="p-3.5 space-y-2.5">
            <p className="text-[10px] text-slate-500 pb-1 leading-normal">
              Zusätzliche einmalige Gutschriften auf dem Pfändungsschutzkonto, die durch Bescheinigung gesichert werden können:
            </p>

            {/* V.1 Einmalige Sozialleistungen */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-755 dark:text-slate-300">
                <input type="checkbox" checked={hasEinmaligeSozialleist} onChange={(e) => setHasEinmaligeSozialleist(e.target.checked)} className="h-3.5 w-3.5 rounded" />
                <span>Einmalige Sozialleistungen (§ 902 Satz 1 Nr. 2 ZPO i.V.m. § 54 SGB I)</span>
              </label>
              {hasEinmaligeSozialleist ? (
                <input type="number" value={einmaligeSozialleistAmount || ""} onChange={(e) => setEinmaligeSozialleistAmount(parseFloat(e.target.value) || 0)} className="w-16 text-right font-mono text-[11px] bg-slate-50 border rounded" />
              ) : (
                <span className="font-mono text-slate-400">0,00 €</span>
              )}
            </div>

            {/* V.2 Einmalige Geldleistungen */}
            <div className="flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-850 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-755 dark:text-slate-300">
                <input type="checkbox" checked={hasEinmaligeGeldleist} onChange={(e) => setHasEinmaligeGeldleist(e.target.checked)} className="h-3.5 w-3.5 rounded" />
                <span>Einmalige Geldleistungen unpfändbar nach landes-/bundesrechtl. Vorschriften (§ 902 S.1 Nr.6)</span>
              </label>
              {hasEinmaligeGeldleist ? (
                <input type="number" value={einmaligeGeldleistAmount || ""} onChange={(e) => setEinmaligeGeldleistAmount(parseFloat(e.target.value) || 0)} className="w-16 text-right font-mono text-[11px] bg-slate-50 border rounded" />
              ) : (
                <span className="font-mono text-slate-400">0,00 €</span>
              )}
            </div>

            {/* V.3 Nachzahlung laufender Leistungen */}
            <div className="flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-850 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-755 dark:text-slate-300">
                <input type="checkbox" checked={hasNachzahlungLaufend} onChange={(e) => setHasNachzahlungLaufend(e.target.checked)} className="h-3.5 w-3.5 rounded" />
                <span>Nachzahlung laufender Bezüge (z.B. SGB II/XII Nachzahlungen, Kindergeldrückstände, § 904 Abs.4)</span>
              </label>
              {hasNachzahlungLaufend ? (
                <input type="number" value={nachzahlungLaufendAmount || ""} onChange={(e) => setNachzahlungLaufendAmount(parseFloat(e.target.value) || 0)} className="w-16 text-right font-mono text-[11px] bg-slate-50 border rounded" />
              ) : (
                <span className="font-mono text-slate-400">0,00 €</span>
              )}
            </div>

            {/* V.4 Nachzahlung sonstiger laufender Leistungen bis 500 € */}
            <div className="flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-850 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-755 dark:text-slate-300">
                <input type="checkbox" checked={hasNachzahlungSonst} onChange={(e) => setHasNachzahlungSonst(e.target.checked)} className="h-3.5 w-3.5 rounded" />
                <span>Nachzahlung sonstiger Leistungen nach SGB oder Arbeitseinkommen bis 500 € Nachzahlbetrag</span>
              </label>
              {hasNachzahlungSonst ? (
                <input type="number" value={nachzahlungSonstAmount || ""} onChange={(e) => setNachzahlungSonstAmount(parseFloat(e.target.value) || 0)} className="w-16 text-right font-mono text-[11px] bg-slate-50 border rounded" />
              ) : (
                <span className="font-mono text-slate-400">0,00 €</span>
              )}
            </div>

            {/* V.5 Stiftung Mutter und Kind */}
            <div className="flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-850 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-755 dark:text-slate-300">
                <input type="checkbox" checked={hasMutterKind} onChange={(e) => setHasMutterKind(e.target.checked)} className="h-3.5 w-3.5 rounded" />
                <span>Geldleistungen der Stiftung „Mutter und Kind – Schutz des ungeborenen Lebens“ (§ 902 S.1 Nr.3)</span>
              </label>
              {hasMutterKind ? (
                <input type="number" value={mutterKindAmount || ""} onChange={(e) => setMutterKindAmount(parseFloat(e.target.value) || 0)} className="w-16 text-right font-mono text-[11px] bg-slate-50 border rounded" />
              ) : (
                <span className="font-mono text-slate-400">0,00 €</span>
              )}
            </div>

          </div>
        </div>

        {/* Footnotes and signature lines (like a real document) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-5 border-t border-slate-300 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400 whitespace-normal">
          <div className="md:col-span-5">
            <span className="font-bold underline text-slate-750 dark:text-slate-350 block">Ort & Datum des Ausstellers</span>
            <div className="border-b border-slate-950 dark:border-slate-700 h-6 mt-1 flex items-end">
              <span className="font-mono text-slate-800 dark:text-slate-200">Berlin, den {new Date().toLocaleDateString("de-DE")}</span>
            </div>
            <p className="mt-1.5 text-[8.5px] italic">Wegweisend abgestempelt vom Gesetzeslotsen</p>
          </div>

          <div className="md:col-span-2 flex items-center justify-center">
            <div className="border-4 border-double border-slate-400 dark:border-slate-750 p-2 text-center text-slate-500 font-serif font-black text-xs leading-tight tracking-widest uppercase rounded">
              Zertifiziert<br />
              <span className="text-[8px] tracking-normal font-sans font-normal opacity-75">Gesetzeslotse</span>
            </div>
          </div>

          <div className="md:col-span-5 text-right">
            <span className="font-bold underline text-slate-750 dark:text-slate-350 block">Dienstliche Unterschrift & Stempel</span>
            <div className="border-b border-slate-950 dark:border-slate-700 h-6 mt-1 flex justify-end items-end">
              <span className="font-bold text-slate-800 dark:text-slate-200 text-[10px]">Gesetzeslotse BERLIN e.V.</span>
            </div>
            <p className="mt-1.5 text-[8.5px] italic">Akkreditierte Schuldnerberatung gem. § 305 Abs. 1 Nr. 1 InsO</p>
          </div>
        </div>

        {/* Lower guidelines */}
        <div className="text-[7.5px] text-slate-450 dark:text-slate-500 pt-3 border-t border-slate-150 dark:border-slate-805 space-y-1 select-none leading-relaxed">
          <p>
            1 Die Freibeträge werden jährlich zum 01.07. angepasst. ({limits.footnoteLabel}).
          </p>
          <p>
            2 Bei jedem Kind ist der Geburtsmonat und das Geburtsjahr in das Vordruckblatt einzutragen, um unrechtmäßige Bezüge auszuschließen.
          </p>
          <p>
            3 Ab dem 6. Kind sind alle weiteren Kinder auf einem Zusatzblatt gesondert aufzulisten.
          </p>
          <p>
            Lizenznehmer: Schuldnerberatung der Verbände (AG SBV) in Berlin & Brandenburg. CC-BY-ND 3.0 Deutschland.
          </p>
        </div>

      </div>

    </div>
  );
}
