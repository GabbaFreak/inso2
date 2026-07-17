import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy-loaded Gemini AI client to handle keys gracefully without crashing on server startup
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in your Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

const LUKAS_SYSTEM_INSTRUCTION = `
Sie sind "Lukas", der hochkompetente, empathische KI-Fach- und Kanzlei-Assistent für die "Gesetzeslotse BERLIN" Schuldnerberatung.
Ihr Ziel ist es, den Schuldnerberater / die Kanzlei-Mitarbeiter bei der professionellen Fallaufarbeitung, Gläubiger-Interaktion und Schulden-Auditierung gem. § 305 InsO und ZPO (§ 850c, § 802b etc.) zu unterstützen.

Ihre Tone-of-Voice und Sprachregeln (STRIKT EINHALTEN):
- Seien Sie hochpräzise, lösungsorientiert und fachlich prägnant. Geben Sie fundierte, strukturierte Hilfestellung für den Arbeitsalltag eines Kanzlei-Mitarbeiters.
- Sprechen Sie mit professioneller Wärme und Berliner Souveränität (verbindlich, kompetent, nahbar aber geschäftlich distanziert).
- Nutzen Sie stets die Höflichkeitsform "Sie" im kollegialen Sinne des Kanzleiteams.
- Formulieren Sie klar und praxistauglich (z.B. relevante Paragraphen kurz nennen, Handlungsoptionen gliedern).
- HINWEIS: Wir geben keine unzulässige Rechtsberatung außerhalb des rechtlich gesteckten Rahmens für staatlich anerkannte Stellen (§ 305 InsO).

Inhaltliche Leitlinien:
1. Mandanten-Freibetragshilfe (P-Konto): Unterstützen Sie bei der Berechnung von Pfändungsfreibeträgen. Geben Sie Auskunft zu den Pfändungstabellen und den Erhöhungsberechtigungen nach § 902 SGB III (Kinder, Ehegatten, Unterhaltsleistungen).
2. Verfahrensberatung zur außergerichtlichen Regulierung: Unterstützen Sie beim Entwurf von Schuldenbereinigungsplänen und bei Verhandlungen zwecks Stundung oder Einmalvergleich. Know-how: Kooperation mit Inkassos und Gerichtsvollziehern (§ 802b ZPO Ratenvereinbarungen).
3. Gerichtsfristen: Fristen bei Mahnbescheiden (2 Wochen Widerspruch) und Vollstreckungsbescheiden (2 Wochen Einspruch) zur Sorge tragen.
4. Professionalität & Effizienz: "Wir unterstützen den Kanzlei-Büroalltag, um maximale Quoten für Mandanten-Vergleiche herauszuholen und teure Insolvenzverfahren abzuwenden."

// KONVERSATIONS- UND DOKUMENTEN-REGELN (ESSENTIELL FÜR DAS ANWENDERGEFÜHL):
// - Hinterfragen Sie den Anwender nicht unnötig oder übermäßig, insbesondere wenn klare Anweisungen gegeben werden.
// - Wenn Sie gebeten werden, ein Dokument, einen Brief, einen Antrag, eine Vereinbarung oder eine andere Datei zu erstellen:
//   - Wenn Sie alle notwendigen Daten haben (z. B. Name, Anschrift etc.), MÜSSEN Sie diese Datei erstellen und deren exakten Inhalt exakt im folgenden XML-Format einbetten, damit der Anwender sie direkt herunterladen kann. Sie können sie .txt oder .docx nennen, das System ermöglicht für beide Endungen sowohl den direkten Word- (.docx) als auch Text-Download (.txt) mit sauberer Formatierung:
//     <LUKAS_FILE name="Dateiname_des_Schreibens.docx">
//     [Der vollständige, formelle und fertige Inhalt des Dokuments ohne Platzhalter]
//     </LUKAS_FILE>
//     Sagen Sie dem Anwender stolz, dass die fertige Datei erstellt und für Microsoft Word optimiert wurde und über die Schaltfläche heruntergeladen werden kann.
//   - Wenn es Ihnen NICHT möglich ist, die Datei zu erstellen (z.B. weil essenzielle Angaben fehlen, die Sie nicht wissen können, oder aufgrund anderer technischer Hinderungsgründe), sagen Sie dies absolut ehrlich ("Ich kann diese Datei zurzeit leider nicht direkt als fertigen Download für Sie erstellen...") und geben Sie erst DANN eine nackte, kopierbare Textvorlage aus, damit der Anwender sie manuell kopieren kann.
// - Normale administrative Antworten sollten kurz und prägnant sein (unter 4 Sätzen). AUSNAHME: Die Ausgabe eines fertigen Schriftstücks/Schreibens (ob in der Download-Datei oder als kopierbarer Text) soll die volle, formgerechte Länge haben, damit es sofort verwendet werden kann.
// - Stellen Sie Rückfragen nur dann, wenn Ihnen absolut essenzielle Informationen fehlen, um das gewünschte Schreiben überhaupt zu erstellen.
`;

// API routes FIRST
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, generateAudio } = req.body;
    
    let ai;
    try {
      ai = getAi();
    } catch (keyError: any) {
      // Return beautiful response inviting them to add the secret in setting
      return res.json({
        text: "Hallo! Ich bin Lukas von Gesetzeslotse BERLIN. Um mit mir zu sprechen, hinterlegen Sie bitte Ihren GEMINI_API_KEY in den Einstellungen unter 'Secrets'. Sobald das erledigt ist, bin ich voll und ganz für Sie da!",
        audio: null,
        noApiKey: true
      });
    }

    // Prepare contents history for chat
    const chatContents: any[] = [];
    if (history && Array.isArray(history)) {
      // Limit context height to prevent token exhaustion
      const recentHistory = history.slice(-6);
      for (const msg of recentHistory) {
        chatContents.push({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }]
        });
      }
    }
    chatContents.push({ role: "user", parts: [{ text: message }] });

    // 1. Generate text response using gemini-3.5-flash
    const textResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: chatContents,
      config: {
        systemInstruction: LUKAS_SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const replyText = textResponse.text || "Ich bin im Moment leider abgelenkt. Wie kann ich Ihnen helfen?";
    let base64Audio: string | null = null;
    let audioMimeType: string | null = null;

    // 2. Generate natural speech using gemini-3.1-flash-tts-preview if requested
    if (generateAudio) {
      try {
        // Strip out large downloadable file blocks prior to narration to keep speech brief and conversational
        const cleanNarrationText = replyText.replace(/<LUKAS_FILE\s+name="[^"]+">[\s\S]*?<\/LUKAS_FILE>/g, " (Ich habe das gewünschte Dokument für Sie generiert. Sie können es direkt über die Schaltfläche herunterladen.) ");
        const ttsResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: `Spreche folgenden Text beruhigend, professionell und warm aus: ${cleanNarrationText}` }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Kore" }, // warm female/neutral voice suited for German
              },
            },
          },
        });

        const inlineData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (inlineData && inlineData.data) {
          base64Audio = inlineData.data;
          audioMimeType = inlineData.mimeType || "audio/wav";
        }
      } catch (audioError) {
        console.error("TTS generation failed, falling back to text client synthesis:", audioError);
      }
    }

    res.json({
      text: replyText,
      audio: base64Audio,
      mimeType: audioMimeType,
    });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "Ein interner Fehler ist aufgetreten." });
  }
});

app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text ist erforderlich." });
    }
    let ai;
    try {
      ai = getAi();
    } catch {
      return res.status(400).json({ error: "Gemini API key is not configured." });
    }

    const ttsResponse = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Spreche folgenden Text beruhigend, professionell und warm aus: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ audio: base64Audio });
    } else {
      res.status(500).json({ error: "Keine Audio-Daten generiert." });
    }
  } catch (error: any) {
    console.error("Error in /api/tts:", error);
    res.status(500).json({ error: error.message || "Fehler bei der Audio-Generierung." });
  }
});

app.post("/api/parse-document", async (req, res) => {
  try {
    const { fileBase64, fileName, mimeType } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: "Keine Datei-Daten empfangen." });
    }

    let ai;
    try {
      ai = getAi();
    } catch {
      return res.status(400).json({ error: "Lukas ist zurzeit offline, da der GEMINI_API_KEY nicht in den Einstellungen unter 'Secrets' hinterlegt ist." });
    }

    const documentPart = {
      inlineData: {
        data: fileBase64,
        mimeType: mimeType || "application/pdf"
      }
    };

    const promptText = `
Sie sind ein hochpräziser KI-Schschnittstellenassistent für die Schuldnerberatungsstelle Gesetzeslotse BERLIN.
Ihre Aufgabe ist es, das beigefügte Dokument (z.B. einen gescannten Schuhkarton-Inhalt mit mehreren Briefen, Mahnbescheiden, Vollstreckungskopien, Ratenvereinbarungen, Gläubigerschreiben) gründlich und vollständig zu analysieren.
Oftmals hat ein Mandant einen riesigen Papierstapel unsortiert abfotografiert oder als einzelne PDF hochgeladen ("Schuhkarton-Prinzip").

**SCHUHKARTON-AUSWERTUNGS-REGELN (ESSENTIELL):**
1. **Mehrere Forderungen trennen:** Gehen Sie das Dokument Seite für Seite durch. Jede separate rechtliche Angelegenheit (erkennbar an einem eigenen Aktenzeichen/Geschäftszeichen des Inkassos oder des Gläubigers, einem eigenen Anschreiben, einem anderen Erstellungsdatum oder einem anderen Ursprungsgläubiger) MUSS als separates Element im Array 'claims' zurückgegeben werden. Mehrere Anschreiben dürfen NIEMALS in einer einzigen Forderung zusammengefasst werden, nur weil sie im selben PDF enthalten sind!
2. **Klares Aktenzeichen-Grouping:** Jede Forderungsangelegenheit hat normalerweise ihr eigenes Aktenzeichen (z.B. "LT0823937H", "YY0920037", "8770880102-0", "9579051468-0", "ZO1814976"). Wenn im Stapel Briefe mit unterschiedlichen Aktenzeichen liegen, erstellen Sie dafür zwingend SEPARATE Posten, selbst wenn der Sender derselbe ist (z.B. coeo Inkasso mit zwei verschiedenen Aktenzeichen sind zwei separate Claims!).
3. **Gläubiger-Rollen-Präzision:**
   - **originalCreditor (Auftraggeber / Ursprünglicher Gläubiger):** Das Unternehmen, bei dem die ursprüngliche Schuld entstand (z.B. "Drillisch Logistik GmbH", "Vodafone GmbH", "eBay GmbH", "Telekom"). Steht im Brief oft als "Forderung der Firma...", "unsere Mandantin...", "Auftraggeber:".
   - **debtCollector (Inkassounternehmen / Bevollmächtigter Vertreter / Kanzlei):** Die Stelle, die den Brief verfasst hat und das Geld eintreibt (z.B. "HFG Inkasso GmbH", "coeo Inkasso GmbH", "KSP Kanzlei Dr. Seegers, Dr. Frankenheim", "Lowell", "EOS", "Korn Kanzlei").
   - **creditorName:** Dies ist der primäre Kommunikations- und Verhandlungspartner für das Gläubigerverzeichnis. Dies MUSS immer der 'debtCollector' (das Inkassounternehmen oder die Kanzlei) sein, da die Schuldnerberatung mit diesen verhandelt. Falls kein Inkasso/Vertreter eingeschaltet ist und der Gläubiger selbst mahnt, tragen Sie den Ursprungsgläubiger hier ein (z.B. "Vodafone GmbH").
4. **Anschriften auslesen:** Extrahieren Sie die vollständige Postanschrift (Straße, PLZ, Ort) des Inkassounternehmens / Vertreters (bzw. des Gläubigers, falls kein Inkassodienst existiert). Diese steht meist im Briefkopf oder der Fußzeile (z.B. "Zirkusweg 1, 20359 Hamburg" oder "Kieler Straße 16, 41540 Dormagen").
5. **Summen tages- und cent-genau bestimmen:**
   - Suchen Sie das tagesaktuelle Saldo oder die Gesamtforderungssumme (amount) der jeweiligen Forderung im jeweiligen Schreiben (z.B. "Gesamtforderung in Höhe von EUR 1.970,04", "Gesamtforderung von EUR 7.628,23", "Gesamtbetrag in Höhe von 173,00 EUR", "Gesamtforderung EUR 557,01", "Summe 588,69").
   - Wenn eine detaillierte Forderungsaufstellung (Tabelle) vorliegt, analysieren Sie diese genau:
     - **principalAmount (Reine Hauptforderung):** Der ursprüngliche Rechnungsbetrag ("Hauptsache", "Hauptforderung", z.B. 165,21 EUR).
     - **interestAmount (Zinsen):** Die Summe aller Verzugszinsen, Zinsrückstände oder laufenden Zinsen ("Zinsen auf Hauptsache", z.B. 55,12 EUR + 27,35 EUR = 82,47 EUR).
     - **feesAmount (Kosten und Gebühren):** Alle sonstigen Inkassokosten, Mahnkosten, Einigungsgebühren, Adressermittlungskosten, Pfändungskosten, Gerichts- und Vertretungskosten ("Gebühr", "Auslagen", z.B. 58,50 + 11,70 + 20,00 ...).
6. **Mahn- & Vollstreckungs-Status:**
   - Wenn ein Schreiben gerichtliche Schritte androht ("Vollstreckungsbescheid", "Mahnbescheid", "Zwangsvollstreckung", "Pfändung", "Gerichtsvollzieher") oder es sich um einen echten Titel handelt, setzen Sie den Status auf 'tituliert'. Sonst setzen Sie ihn auf 'offen'.
   - Falls ein Mahnbescheid oder Vollstreckungsbescheid vorliegt, versuchen Sie die gerichtlichen Posten (mbPrincipal, mbInterestArrears, mbCourtCosts etc.) exakt zuzuordnen.
7. **Dokumenten-Datum:**
   - Bestimmen Sie das genaue Erstellungsdatum des jeweiligen Briefes im Format YYYY-MM-DD (z.B. "02.12.2024", "25.04.2025", "07.11.2025", "16.07.2024", "01.09.2023"). Dieses Datum dient als Stand der Abrechnung für diese Forderung (titledDate).

8. **WICHTIG: Umgang mit Vergleichsangeboten / Ratenzahlungsangeboten (Duplicate-Prevention):**
   - Wenn ein Schreiben ein Ratenzahlungsangebot oder einen Vergleichsrabatt enthält (z.B. "Zahlen Sie einmalig 173,00 EUR statt 264,88 EUR bis zum 28.11.2025 zur gütlichen Einigung"), darf dieses Schreiben NICHT als separate neue Forderung (Claim) mit dem reduzierten Betrag (173 EUR) angelegt werden. Das würde das Gesamtergebnis verdoppeln und verfälschen!
   - Die primäre Forderung (Claim) entspricht immer dem tatsächlichen, unreduzierten Gesamtbetrag (z.B. amount = 264.88).
   - Das Vergleichsangebot selbst (z.B. die angebotenen 173,00 EUR) wird im Array 'offers' der jeweiligen Forderung erfasst.
   - Wenn Sie einen Stapel haben, der z.B. einen Mahnbescheid und später ein günstiges Vergleichsangebot zu demselben Aktenzeichen enthält, fassen Sie diese im selben Claim zusammen und tragen das Angebot im Array 'offers' ein.

9. **Seitennummer des aktuellsten Forderungsschreibens (Umgang mit mehrseitigen Dokumenten):**
   - Bestimmen Sie genau, auf welcher Seite (1-basierte Seitennummer des gesamten übermittelten PDF-Dokuments) sich das aktuellste, rechtlich gültige/jüngste Forderungsschreiben für diese Angelegenheit befindet. 
   - Falls z.B. coeo Inkasso zu einem Aktenzeichen Dokumente auf Seite 5, 12 und 18 vorlegt, wovon der Brief auf Seite 18 das aktuellste Datum trägt, legen Sie 18 als 'mostRecentPageNumber' fest.
   - Jedes extrahierte 'claim'-Objekt MUSS dieses Feld 'mostRecentPageNumber' (als numerischen Wert) enthalten. Wenn das übertragene Dokument nur eine Seite besitzt, ist der Wert 1.

Geben Sie ein valides JSON-Objekt zurück mit dem einzigen Wurzel-Schlüssel 'claims', welcher ein Array von strukturierten Forderungsobjekten enthält. Tragen Sie Beträge immer als numerische Zahlen und niemals als Text (Strings mit € oder EUR) ein. Sorgen Sie für eine lückenlose und hochpräzise Erfassung aller im Schuhkarton-Stapel befindlichen Dokumente!
`;

    const chatResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [documentPart, { text: promptText }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            claims: {
              type: Type.ARRAY,
              description: "Liste aller im Dokument identifizierten separaten Forderungen.",
              items: {
                type: Type.OBJECT,
                properties: {
                  creditorName: {
                    type: Type.STRING,
                    description: "Der Name des Haupt-Ansprechpartners (in der Regel das Inkassounternehmen, z.B. HFG Inkasso GmbH, coeo Inkasso GmbH, KSP Kanzlei, Lowell) oder der direkte Gläubiger."
                  },
                  originalCreditor: {
                    type: Type.STRING,
                    description: "Der ursprüngliche Auftraggeber bzw. Vertragspartner (z.B. Drillisch Logistik GmbH, Vodafone GmbH, eBay GmbH)."
                  },
                  debtCollector: {
                    type: Type.STRING,
                    description: "Das beauftragte Inkassounternehmen oder die Vertretungs-Kanzlei (z.B. HFG Inkasso GmbH, coeo Inkasso, KSP Rechtsanwälte)."
                  },
                  street: {
                    type: Type.STRING,
                    description: "Straße und Hausnummer des Vertreters oder Gläubigers."
                  },
                  city: {
                    type: Type.STRING,
                    description: "PLZ und Ort des Vertreters oder Gläubigers."
                  },
                  fileReference: {
                    type: Type.STRING,
                    description: "Aktenzeichen, Geschäftszeichen oder Unser Zeichen."
                  },
                  amount: {
                    type: Type.NUMBER,
                    description: "Gesamtforderungsbetrag in Euro."
                  },
                  category: {
                    type: Type.STRING,
                    description: "Kategorie der Schuld, z.B. 'Konsum', 'Bank', 'Energie', 'Telekommunikation', 'Miete', 'Sonstiges'."
                  },
                  status: {
                    type: Type.STRING,
                    description: "Status der Forderung ('offen' oder 'tituliert')."
                  },
                  principalAmount: {
                    type: Type.NUMBER,
                    description: "Reine Hauptforderung (Hauptsache-Betrag) (EUR)."
                  },
                  interestAmount: {
                    type: Type.NUMBER,
                    description: "Summe aller Zinsen (EUR)."
                  },
                  feesAmount: {
                    type: Type.NUMBER,
                    description: "Summe aller Kosten und Gebühren (EUR)."
                  },
                  titledWith: {
                    type: Type.STRING,
                    description: "Art des Titels ('Vollstreckungsbescheid' oder 'Mahnbescheid' oder 'Titel / Vollstreckungsandrohung')."
                  },
                  titledDate: {
                    type: Type.STRING,
                    description: "Datum des Titels oder Schreibens im Format YYYY-MM-DD."
                  },
                  mbPrincipal: {
                    type: Type.STRING,
                    description: "I. 1. Darlehensrückzahlung / Hauptforderung Betrag."
                  },
                  mbInterestArrears: {
                    type: Type.STRING,
                    description: "I. 2. Zinsrückstände / Verzugszinsen gem. Rechnung Betrag."
                  },
                  mbCourtCosts: {
                    type: Type.STRING,
                    description: "II. 1. Gerichtskosten / Gebühr Betrag."
                  },
                  mbClaimantExpenses: {
                    type: Type.STRING,
                    description: "II. 2. Auslagen / Vertretungskosten des Antragstellers Betrag."
                  },
                  mbExtraFees: {
                    type: Type.STRING,
                    description: "III. Inkassokosten / Vorgerichtliche Mahn-Auslagen Betrag."
                  },
                  mbCalculatedInterest: {
                    type: Type.STRING,
                    description: "IV. 1. Vom Antragsteller ausgerechnete Zinsen Betrag."
                  },
                  mbCurrentInterest: {
                    type: Type.STRING,
                    description: "IV. 2. laufende vom Gericht ausgerechnete Zinsen Betrag."
                  },
                  mostRecentPageNumber: {
                    type: Type.INTEGER,
                    description: "Die exakte, 1-basierte Seitennummer der PDF/des Dokuments, auf der das neueste, d.h. aktuellste Schreiben/Dokument dieser Angelegenheit abgedruckt ist."
                  },
                  offers: {
                    type: Type.ARRAY,
                    description: "Eventuelle gütliche Einigungsangebote, Rabatte oder Ratenzahlungsangebote, die in diesem Schreiben genannt werden.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        amount: {
                          type: Type.NUMBER,
                          description: "Angebotener ermäßigter Einzahlungs-Vergleichsbetrag oder Ratenhöhe."
                        },
                        originalAmount: {
                          type: Type.NUMBER,
                          description: "Die im Angebotsschreiben genannte unreduzierte Gesamtschuld."
                        },
                        date: {
                          type: Type.STRING,
                          description: "Erstellungsdatum des Angebotsbriefes im Format YYYY-MM-DD."
                        },
                        deadline: {
                          type: Type.STRING,
                          description: "Frist zur Annahme / Zahlung des Vergleichs im Format YYYY-MM-DD."
                        },
                        type: {
                          type: Type.STRING,
                          description: "Typ des Angebots ('settlement' für Vergleich/Rabatt bei Einmalzahlung, 'installment' für Ratenzahlungsangebot)."
                        },
                        details: {
                          type: Type.STRING,
                          description: "Kurze Ausführung des Angebots, z.B. 'Einmalvergleich 173 € statt 264,88 €'."
                        }
                      },
                      required: ["amount", "type"]
                    }
                  }
                },
                required: ["creditorName", "amount"]
              }
            }
          },
          required: ["claims"]
        }
      }
    });

    const textOutput = chatResponse.text;
    if (!textOutput) {
      throw new Error("Gemini hat keine Antwort zurückgegeben.");
    }

    const parsedData = JSON.parse(textOutput.trim());
    res.json(parsedData);
  } catch (error: any) {
    console.error("Fehler bei Dokumenten-Parsing API:", error);
    res.status(500).json({ error: error.message || "Ein Fehler ist bei der automatischen Auswertung aufgetreten." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
