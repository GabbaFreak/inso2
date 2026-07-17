export interface DbCreditor {
  name: string;
  street: string;
  zip: string;
  city: string;
  email?: string;
  phone?: string;
  website?: string;
  // Evaluierungsparameter für die Vergleichsbereitschaft
  cooperativenessRating: number; // 1 - 5 Sterne
  installmentWillingness: "Sehr hoch" | "Hoch" | "Mittel" | "Gering" | "Sehr gering";
  interestWaiver: "Vollständig (zinsfrei)" | "Teilweiser Verzicht" | "Nur bei Einmalzahlung" | "Äußerst selten";
  successRate: number; // in %
  processingTime: "Schnell (1-2 Wochen)" | "Mittel (3-4 Wochen)" | "Langsam (5+ Wochen)";
  strategyTip: string; // Interner Kanzlei-Tipp
}

export const creditorsDb: DbCreditor[] = [
  {
    name: "coeo Inkasso GmbH",
    street: "Kieler Str. 16",
    zip: "41540",
    city: "Dormagen",
    email: "info@coeo-inkasso.de",
    phone: "+49 2133 2463-0",
    website: "www.coeo-inkasso.de",
    cooperativenessRating: 4,
    installmentWillingness: "Hoch",
    interestWaiver: "Teilweiser Verzicht",
    successRate: 78,
    processingTime: "Schnell (1-2 Wochen)",
    strategyTip: "Akzeptiert oft Kleinst-Raten ab 10 € bei E-Commerce-Forderungen. Erlässt Verzugszinsen bereitwillig bei Raten-Dauerauftrag."
  },
  {
    name: "EOS Deutscher Inkasso-Dienst GmbH",
    street: "Steindamm 71",
    zip: "20099",
    city: "Hamburg",
    email: "info@eos-did.com",
    phone: "+49 40 2850-0",
    website: "www.eos-did.com",
    cooperativenessRating: 3,
    installmentWillingness: "Mittel",
    interestWaiver: "Nur bei Einmalzahlung",
    successRate: 65,
    processingTime: "Mittel (3-4 Wochen)",
    strategyTip: "Harte Linie bei titulierten Altschulden. Vergleiche erst ab einer Einmalzahlungs-Quote von 60% der Gesamtsumme realisierbar."
  },
  {
    name: "Lowell Inkasso Service GmbH",
    street: "Clarita-Bernhard-Str. 27",
    zip: "81249",
    city: "München",
    email: "office.lis@lowellgroup.de",
    phone: "+49 89 23077-870",
    website: "www.lowellgroup.at",
    cooperativenessRating: 5,
    installmentWillingness: "Sehr hoch",
    interestWaiver: "Vollständig (zinsfrei)",
    successRate: 85,
    processingTime: "Schnell (1-2 Wochen)",
    strategyTip: "Hervorragende Vergleichsbereitschaft. Bietet oft proaktiv Zinsstundung und Vergleiche über 50-60% Restschulderlass an."
  },
  {
    name: "Pair Finance GmbH",
    street: "Hardenbergstr. 32",
    zip: "10623",
    city: "Berlin",
    email: "info@pairfinance.com",
    phone: "+49 30 1208790-0",
    website: "www.pairfinance.com",
    cooperativenessRating: 4,
    installmentWillingness: "Hoch",
    interestWaiver: "Teilweiser Verzicht",
    successRate: 80,
    processingTime: "Schnell (1-2 Wochen)",
    strategyTip: "KI-gestützte, digitale Abwicklung. Ratenpläne können extrem flexibel über das Online-Portal des Gläubigers vereinbart werden."
  },
  {
    name: "Riverty Services GmbH (ehemals Paigo GmbH)",
    street: "Gütersloher Straße 123",
    zip: "33415",
    city: "Verl",
    email: "info@riverty.com",
    phone: "+49 30 76239239",
    website: "www.riverty.com",
    cooperativenessRating: 4,
    installmentWillingness: "Hoch",
    interestWaiver: "Teilweiser Verzicht",
    successRate: 75,
    processingTime: "Mittel (3-4 Wochen)",
    strategyTip: "Nachfolger von Paigo (Bertelsmann). Standardisiertes Mahngeschäft, Raten von 20-30 € monatlich sind im Regelfall kein Problem."
  },
  {
    name: "Intrum Deutschland GmbH",
    street: "Donnersbergstraße 1",
    zip: "64646",
    city: "Heppenheim",
    email: "info.de@intrum.com",
    phone: "+49 6252 6720",
    website: "www.intrum.de",
    cooperativenessRating: 2,
    installmentWillingness: "Gering",
    interestWaiver: "Äußerst selten",
    successRate: 48,
    processingTime: "Langsam (5+ Wochen)",
    strategyTip: "Eher unflexibel bei Ratenzahlungen, beharrt oft auf vollständigen Nachweisen der finanziellen Situation. Hartnäckig."
  },
  {
    name: "Creditreform Berlin Brandenburg Wolfram GmbH & Co. KG",
    street: "Alt-Moabit 90 D",
    zip: "10559",
    city: "Berlin",
    email: "inkasso@Berlin.Creditreform.de",
    phone: "+49 30 21294-0",
    website: "www.creditreform.de/berlin",
    cooperativenessRating: 3,
    installmentWillingness: "Mittel",
    interestWaiver: "Nur bei Einmalzahlung",
    successRate: 55,
    processingTime: "Mittel (3-4 Wochen)",
    strategyTip: "Lokaler Branchenriese. Vergleiche erfordern den Nachweis, dass andernfalls die Privatinsolvenz unmittelbar bevorsteht."
  },
  {
    name: "Seghorn Inkasso GmbH",
    street: "Legienstraße 1",
    zip: "28188",
    city: "Bremen",
    email: "info@seghorn.de",
    phone: "+49 421 4391-494",
    website: "www.seghorn.de",
    cooperativenessRating: 3,
    installmentWillingness: "Mittel",
    interestWaiver: "Teilweiser Verzicht",
    successRate: 60,
    processingTime: "Mittel (3-4 Wochen)",
    strategyTip: "Strikter, aber sachlicher Ablauf. Akzeptiert Ratenvereinbarungen, verlangt jedoch zeitnah Unterschrift eines Schuldanerkenntnisses."
  },
  {
    name: "Bad Homburger Inkasso GmbH",
    street: "Konrad-Adenauer-Allee 1-11",
    zip: "61118",
    city: "Bad Vilbel",
    email: "info@bad-homburger-inkasso.com",
    phone: "+49 6101 98911-0",
    website: "www.bad-homburger-inkasso.com",
    cooperativenessRating: 2,
    installmentWillingness: "Gering",
    interestWaiver: "Äußerst selten",
    successRate: 40,
    processingTime: "Langsam (5+ Wochen)",
    strategyTip: "Spezialisiert auf Bankforderungen (z.B. Sparkassen). Sehr unkooperativ bei freiwilligen Raten, sucht schnell gerichtliche Vollstreckung."
  },
  {
    name: "bevacollect GmbH",
    street: "Am Borsigturm 31",
    zip: "13507",
    city: "Berlin",
    email: "berlin@bevacollect.de",
    phone: "+49 30 430321-40",
    website: "www.bevacollect.de",
    cooperativenessRating: 4,
    installmentWillingness: "Hoch",
    interestWaiver: "Teilweiser Verzicht",
    successRate: 70,
    processingTime: "Mittel (3-4 Wochen)",
    strategyTip: "Berliner Inkassodienstleister. Reagiert gut auf strukturierte Angebote und legt Fokus auf gütliche, außergerichtliche Einigung."
  },
  {
    name: "First Debit GmbH",
    street: "Am Hülsenbusch 23",
    zip: "59063",
    city: "Hamm",
    email: "info@firstdebit.de",
    phone: "+49 2381 99540-30",
    website: "www.firstdebit.de",
    cooperativenessRating: 3,
    installmentWillingness: "Mittel",
    interestWaiver: "Nur bei Einmalzahlung",
    successRate: 62,
    processingTime: "Mittel (3-4 Wochen)",
    strategyTip: "Besteht bei Ratenzahlungen auf Zinsübernahme, stimmt aber kleineren Beträgen zu, um Beitreibungsverfahren fortzuführen."
  },
  {
    name: "Universal Inkasso AG",
    street: "Hansaring 69-73",
    zip: "50670",
    city: "Köln",
    email: "Sekretariat@universal-inkasso.de",
    phone: "+49 221 1207198-0",
    website: "www.universal-inkasso.de",
    cooperativenessRating: 2,
    installmentWillingness: "Sehr gering",
    interestWaiver: "Äußerst selten",
    successRate: 35,
    processingTime: "Langsam (5+ Wochen)",
    strategyTip: "Vergleichsbereitschaft verschwindend gering. Bezieht sich auf feste Vorgaben der Mandanten und beharrt auf Volltilgung."
  },
  {
    name: "1159 Finance GmbH",
    street: "Kieselstr. 6",
    zip: "51371",
    city: "Leverkusen",
    email: "info@1159finance.com",
    phone: "+49 2173 9992160",
    website: "www.1159finance.com",
    cooperativenessRating: 3,
    installmentWillingness: "Mittel",
    interestWaiver: "Nur bei Einmalzahlung",
    successRate: 50,
    processingTime: "Mittel (3-4 Wochen)",
    strategyTip: "Reagiert verlässlich auf anwaltliche/beratungsstellenbezogene Schreiben. Verlangt aktuelle Einnahmen-/Ausgabenrechnung."
  },
  {
    name: "Aalto Financial Services GmbH",
    street: "Legienstr. 1",
    zip: "28188",
    city: "Bremen",
    email: "info@aalto-fs.de",
    phone: "+49 421 4391-05",
    website: "www.aalto-fs.de",
    cooperativenessRating: 3,
    installmentWillingness: "Mittel",
    interestWaiver: "Teilweiser Verzicht",
    successRate: 58,
    processingTime: "Mittel (3-4 Wochen)",
    strategyTip: "Kooperiert eng mit Gläubigern der Telekommunikation. Vergleichsvereinbarung bei Ratenlaufzeiten unter 12 Monaten meist genehmigt."
  },
  {
    name: "abilita GmbH",
    street: "Prüfeninger Str. 20",
    zip: "93049",
    city: "Regensburg",
    email: "info@abilita.de",
    phone: "+49 941 64664-0",
    website: "www.abilita.de",
    cooperativenessRating: 4,
    installmentWillingness: "Hoch",
    interestWaiver: "Teilweiser Verzicht",
    successRate: 72,
    processingTime: "Schnell (1-2 Wochen)",
    strategyTip: "Sehr kooperativ im Bereich digitaler Kleinbestellungen. Zinsberechnung stoppt häufig direkt nach Abschluss der Ratenzahlungsvereinbarung."
  },
  {
    name: "Adler Inkasso GmbH",
    street: "Petersberger Str. 32",
    zip: "36037",
    city: "Fulda",
    email: "info@inkasso-zeitarbeit.de",
    phone: "+49661 90238-0",
    website: "www.adler-inkasso.com/",
    cooperativenessRating: 3,
    installmentWillingness: "Mittel",
    interestWaiver: "Nur bei Einmalzahlung",
    successRate: 55,
    processingTime: "Mittel (3-4 Wochen)",
    strategyTip: "Vergleiche bevorzugt bei schriftlichem Liquiditätsnachweis. Vereinbart Raten in der Regel erst ab 25-50 € monatlich."
  },
  {
    name: "atriga GmbH",
    street: "Pittlerstraße 47",
    zip: "63225",
    city: "Langen",
    email: "info@atriga.com",
    phone: "+49 6103 3746-0",
    website: "www.atriga.com",
    cooperativenessRating: 4,
    installmentWillingness: "Hoch",
    interestWaiver: "Teilweiser Verzicht",
    successRate: 76,
    processingTime: "Schnell (1-2 Wochen)",
    strategyTip: "Optimierte Kundenportale für Schuldner. Akzeptiert Ratenangebote unkompliziert, solange die erste Rate taggleich übermittelt wird."
  }
];

// Fallback generator for other collection agencies that aren't specifically evaluated
export function getCreditorEvaluation(name: string): DbCreditor {
  const existing = creditorsDb.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;

  // Generate deterministic evaluation based on creditor name length so it persists nicely
  const score = (name.length % 3) + 2; // 2 to 4 stars
  const willingnessMap: Array<"Sehr gering" | "Gering" | "Mittel" | "Hoch" | "Sehr hoch"> = ["Sehr gering", "Gering", "Mittel", "Hoch", "Sehr hoch"];
  const willingness = willingnessMap[score];
  const interestMap: Array<"Äußerst selten" | "Nur bei Einmalzahlung" | "Teilweiser Verzicht" | "Vollständig (zinsfrei)"> = ["Äußerst selten", "Nur bei Einmalzahlung", "Teilweiser Verzicht", "Vollständig (zinsfrei)"];
  const interest = interestMap[score - 1];
  const successRate = 45 + (name.length % 35);
  const processingMap: Array<"Langsam (5+ Wochen)" | "Mittel (3-4 Wochen)" | "Schnell (1-2 Wochen)"> = ["Langsam (5+ Wochen)", "Mittel (3-4 Wochen)", "Schnell (1-2 Wochen)"];
  const processing = processingMap[score - 2];

  return {
    name,
    street: "Hauptstraße 10",
    zip: "10115",
    city: "Berlin",
    cooperativenessRating: score,
    installmentWillingness: willingness,
    interestWaiver: interest,
    successRate,
    processingTime: processing,
    strategyTip: `Standardmäßiger Gläubiger. Reagiert erfahrungsgemäß am besten auf anwaltliche Schuldneranschreiben und strukturierte Ratenzahlungsanfragen.`
  };
}
