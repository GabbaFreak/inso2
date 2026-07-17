import React, { useState, useEffect, useRef } from "react";
import { Send, Mic, MicOff, Volume2, VolumeX, MessageSquare, ShieldCheck, Sparkles, AlertCircle, FileText, Download, Check, Copy, Paperclip } from "lucide-react";
import { Message } from "../types";
import { Document as DocxDocument, Packer as DocxPacker, Paragraph as DocxParagraph, TextRun as DocxTextRun } from "docx";

const generateAndDownloadDocx = async (filename: string, textContent: string) => {
  try {
    const lines = textContent.split("\n");
    const docChildren: any[] = [];

    // Header styling
    docChildren.push(
      new DocxParagraph({
        children: [
          new DocxTextRun({
            text: "GESETZESLOTSE BERLIN",
            bold: true,
            size: 20,
            color: "00573D", // Beautiful brand green
          }),
        ],
        spacing: { after: 120 },
      })
    );

    // Border line equivalent
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

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === "") {
        // Empty paragraph for spacing
        docChildren.push(
          new DocxParagraph({
            spacing: { before: 100, after: 100 }
          })
        );
        continue;
      }

      // Check formatting or markdown headers
      if (trimmed.startsWith("# ")) {
        docChildren.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({
                text: trimmed.substring(2),
                bold: true,
                size: 28,
                color: "0F172A",
              }),
            ],
            spacing: { before: 240, after: 120 }
          })
        );
      } else if (trimmed.startsWith("## ")) {
        docChildren.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({
                text: trimmed.substring(3),
                bold: true,
                size: 24,
                color: "1E293B",
              }),
            ],
            spacing: { before: 180, after: 80 }
          })
        );
      } else if (trimmed.startsWith("### ")) {
        docChildren.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({
                text: trimmed.substring(4),
                bold: true,
                size: 20,
                color: "334155",
              }),
            ],
            spacing: { before: 120, after: 60 }
          })
        );
      } else if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
        const text = trimmed.replace(/^[\*\-\•]\s+/, "");
        docChildren.push(
          new DocxParagraph({
            children: [
              new DocxTextRun({
                text: text,
                size: 22,
                color: "334155",
              })
            ],
            bullet: {
              level: 0
            },
            spacing: { after: 60 }
          })
        );
      } else {
        // Ordinary paragraph lines. Let's parse bold markers **text** nicely
        const parts: any[] = [];
        const regex = /(\*\*|__)(.*?)\1/g;
        let lastIdx = 0;
        let match;

        while ((match = regex.exec(trimmed)) !== null) {
          const matchIdx = match.index;
          if (matchIdx > lastIdx) {
            parts.push(
              new DocxTextRun({
                text: trimmed.substring(lastIdx, matchIdx),
                size: 22,
                color: "334155",
              })
            );
          }

          parts.push(
            new DocxTextRun({
              text: match[2],
              bold: true,
              size: 22,
              color: "0F172A",
            })
          );

          lastIdx = regex.lastIndex;
        }

        if (lastIdx < trimmed.length) {
          parts.push(
            new DocxTextRun({
              text: trimmed.substring(lastIdx),
              size: 22,
              color: "334155",
            })
          );
        }

        if (parts.length === 0) {
          parts.push(
            new DocxTextRun({
              text: trimmed,
              size: 22,
              color: "334155",
            })
          );
        }

        docChildren.push(
          new DocxParagraph({
            children: parts,
            spacing: { after: 120 }
          })
        );
      }
    }

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
    
    // Convert filename extension structure to .docx
    let docxFilename = filename;
    if (docxFilename.endsWith(".txt")) {
      docxFilename = docxFilename.substring(0, docxFilename.length - 4) + ".docx";
    } else if (!docxFilename.endsWith(".docx")) {
      docxFilename = docxFilename + ".docx";
    }

    link.href = url;
    link.download = docxFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to generate and download DOCX", error);
  }
};

function GeneratedFileCard({ filename, content }: { filename: string; content: string; key?: any }) {
  const [copied, setCopied] = useState(false);

  const downloadTextFile = () => {
    try {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename.endsWith(".docx") ? filename.substring(0, filename.length - 5) + ".txt" : filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Plain-Text download failed", err);
    }
  };

  const downloadDocxFile = () => {
    generateAndDownloadDocx(filename, content);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dynamically determine names and badges
  const docxName = filename.endsWith(".txt") ? filename.substring(0, filename.length - 4) + ".docx" : filename.endsWith(".docx") ? filename : filename + ".docx";

  return (
    <div className="my-3.5 p-4 rounded-xl border border-blue-200 bg-blue-50/30 dark:border-blue-900/40 dark:bg-blue-950/20 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
          <FileText className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Generiertes Kanzleicheck-Dokument</p>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-250 truncate mt-1">{docxName}</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">Automatisches Microsoft Word Format (.docx bereit)</p>
        </div>
      </div>
      
      {/* Visual Preview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-3 rounded-lg text-[11px] font-mono text-slate-700 dark:text-slate-300 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed border-dashed text-left">
        {content}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {/* Native MS Word download key option */}
          <button 
            onClick={downloadDocxFile}
            className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="h-4 w-4" />
            Als Word (.docx) herunterladen
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={downloadTextFile}
            className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1 cursor-pointer"
          >
            Als Text (.txt)
          </button>
          
          <button 
            onClick={handleCopy}
            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Kopiert
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Kopieren
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const renderMessageWithFiles = (text: string) => {
  const fileRegex = /<LUKAS_FILE\s+name="([^"]+)">([\s\S]*?)<\/LUKAS_FILE>/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let elementKey = 0;

  const regex = new RegExp(fileRegex);
  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    
    // Add text segment before matched group
    if (matchIndex > lastIndex) {
      parts.push(
        <span key={`text-${elementKey++}`}>
          {text.substring(lastIndex, matchIndex)}
        </span>
      );
    }
    
    const filename = match[1];
    const content = match[2];
    
    parts.push(
      <GeneratedFileCard 
        key={`file-${elementKey++}`} 
        filename={filename} 
        content={content} 
      />
    );
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${elementKey++}`}>
        {text.substring(lastIndex)}
      </span>
    );
  }
  
  return parts.length > 0 ? parts : text;
};

export default function LukasAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Guten Tag. Ich bin Lukas, Ihr digitaler Kanzlei-Copilot für Gesetzeslotse BERLIN. Ich unterstütze Sie bei der rechtlichen Fallaufarbeitung, Ermittlung der pfändungsfreien Beträge nach § 850c ZPO oder Formulierung von Gläubigervereinbarungen nach § 305 InsO. Welchen Mandantenfall oder welchen Mahnbescheid analysieren wir heute?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generateAudio, setGenerateAudio] = useState<boolean>(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isLukasSpeaking, setIsLukasSpeaking] = useState<boolean>(false);
  
  // Speech Recognition (Speech-to-Text) State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognitionSupported, setRecognitionSupported] = useState<boolean>(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64String = (reader.result as string).split(",")[1];
        const mimeType = file.type;

        // Custom analytical indicator message
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: "user",
            text: `[Schuhkarton-Upload] ${file.name} (${(file.size / 1024).toFixed(0)} KB) zur automatischen OCR / KI-Erfassung eingereicht.`,
            timestamp: new Date()
          }
        ]);

        const res = await fetch("/api/parse-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: base64String,
            fileName: file.name,
            mimeType: mimeType
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Fehler beim Analysieren des Dokuments.");
        }

        const parsedDebt = await res.json();

        // Dispatch Custom Event to append this debt directly to the current portfolio in DebtListAssistant!
        window.dispatchEvent(
          new CustomEvent("gesetzeslotse_add_debt", {
            detail: parsedDebt
          })
        );

        const claimsList = parsedDebt.claims && Array.isArray(parsedDebt.claims) ? parsedDebt.claims : [parsedDebt];

        // Lukas speaks back to the user celebrating the automatic addition of the debt:
        setTimeout(() => {
          let claimsSummary = "";
          for (const c of claimsList) {
            const pageInfo = c.mostRecentPageNumber ? `\n  • **Aktuellste Seite im Schreiben:** Seite ${c.mostRecentPageNumber}` : "";
            claimsSummary += `• **Gläubiger:** ${c.creditorName || "Unbekannt"}
  • **Forderungshöhe:** € ${(c.amount || 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  • **Aktenzeichen:** ${c.fileReference || "Nicht ausgewiesen"}
  • **Kategorie:** ${c.category || "Konsum"}${pageInfo}\n\n`;
          }

          const autoReplyText = `Ich habe Ihr Dokument **${file.name}** erfolgreich analysiert und alle Details extrahiert! 

Folgende Forderung(en) im Gläubigerverzeichnis wurde(n) **direkt und lückenlos erfasst**:
${claimsSummary}Der Fall wurde dem aktiven Mandanten zugeordnet. Sie müssen nichts weiter tun!`;

          setMessages((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              sender: "assistant",
              text: autoReplyText,
              timestamp: new Date()
            }
          ]);
          setIsLoading(false);

          if (generateAudio) {
            playSpeechSynthesisFallback(autoReplyText.replace(/\*+/g, ""));
          }
        }, 1200);

      } catch (err: any) {
        console.error(err);
        setMessages((prev) => [
          ...prev,
          {
            id: "err-" + Math.random(),
            sender: "assistant",
            text: `Fehler beim Analysieren des hochgeladenen Dokuments: ${err.message || "Unbekannter Fehler."} Bitte vergewissern Sie sich, dass Ihr GEMINI_API_KEY in Secrets eingepflegt ist.`,
            timestamp: new Date()
          }
        ]);
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Use a ref to resolve closure issues with handleSendMessage in the event listener
  const handleSendMessageRef = useRef<any>(null);
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [messages, isLoading, generateAudio]);

  useEffect(() => {
    // Check Speech Recognition support in client browser
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setRecognitionSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "de-DE";

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          setInputValue(text);
          // Auto send after speech is captured
          if (handleSendMessageRef.current) {
            handleSendMessageRef.current(text, true);
          }
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error:", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    // Capture automated prompt actions
    const handleAskLukas = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string; autoSend?: boolean }>;
      if (customEvent.detail && customEvent.detail.text) {
        setInputValue(customEvent.detail.text);
        if (customEvent.detail.autoSend) {
          // Send immediately
          handleSendMessageRef.current(customEvent.detail.text);
        }
      }
    };

    window.addEventListener("ask-lukas" as any, handleAskLukas);
    return () => {
      window.removeEventListener("ask-lukas" as any, handleAskLukas);
    };
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isLukasSpeaking]);

  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      alert("Sprachsteuerung wird in diesem Browser leider nicht direkt unterstützt. Nutzen Sie bitte die Tastatureingabe oder öffnen Sie die App in einem neuen Tab!");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Stop currently playing audio before listening
      stopCurrentAudio();
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start voice recognition:", err);
      }
    }
  };

  const stopCurrentAudio = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    // Stop computer speech synthesis if playing
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsLukasSpeaking(false);
    setIsPlayingAudio(false);
  };

  // Convert base64 audio and play
  const playServerAudio = (base64String: string, fallbackText: string, mimeType = "audio/wav") => {
    try {
      stopCurrentAudio();
      
      const audioUrl = `data:${mimeType};base64,${base64String}`;
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      
      setIsLukasSpeaking(true);
      setIsPlayingAudio(true);

      audio.onplay = () => {
        setIsLukasSpeaking(true);
      };

      audio.onended = () => {
        setIsLukasSpeaking(false);
        setIsPlayingAudio(false);
      };

      audio.onerror = (err) => {
        console.error("Audio playback error, falling back to local SpeechSynthesis:", err);
        playSpeechSynthesisFallback(fallbackText);
      };

      audio.play().catch((playErr) => {
        console.error("Audio play failed, falling back to local SpeechSynthesis:", playErr);
        playSpeechSynthesisFallback(fallbackText);
      });
    } catch (e) {
      console.error("Playback error:", e);
      playSpeechSynthesisFallback(fallbackText);
    }
  };

  // Client-side local SpeechSynthesis fallback (guarantees voice output even under limits/errors)
  const playSpeechSynthesisFallback = (textToSpeak: string) => {
    if (!window.speechSynthesis) return;
    
    stopCurrentAudio();
    setIsLukasSpeaking(true);
    setIsPlayingAudio(true);

    // Clean file blocks from narrated text and markdown remnants
    let cleanText = textToSpeak.replace(/<LUKAS_FILE\s+name="[^"]+">[\s\S]*?<\/LUKAS_FILE>/g, " (Ich habe die gewünschte Datei für Sie generiert.) ");
    cleanText = cleanText.replace(/[*#>>>]/g, ""); 
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "de-DE";
    
    // Choose a warm German voice if available
    const voices = window.speechSynthesis.getVoices();
    const germanVoice = voices.find(v => v.lang.startsWith("de") && v.name.includes("Google")) || 
                       voices.find(v => v.lang.startsWith("de"));
    if (germanVoice) {
      utterance.voice = germanVoice;
    }

    utterance.onend = () => {
      setIsLukasSpeaking(false);
      setIsPlayingAudio(false);
    };

    utterance.onerror = () => {
      setIsLukasSpeaking(false);
      setIsPlayingAudio(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (textToSend?: string, wasTalkInput = false) => {
    const rawText = textToSend || inputValue;
    if (!rawText.trim() || isLoading) return;

    // Stop current audio before sending new message
    stopCurrentAudio();

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: rawText,
      timestamp: new Date(),
      isVoiceInput: wasTalkInput
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Map current messages to payload history (excluding the one just added)
      const chatHistory = messages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: rawText,
          history: chatHistory,
          generateAudio: generateAudio
        })
      });

      if (!res.ok) {
        throw new Error("Fehler beim Abrufen der Antwort.");
      }

      const data = await res.json();

      const assistantMsg: Message = {
        id: Math.random().toString(),
        sender: "assistant",
        text: data.text,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);

      // Play audio response if turned on
      if (generateAudio) {
        if (data.audio) {
          playServerAudio(data.audio, data.text, data.mimeType || "audio/wav");
        } else {
          // Fall back to client-side SpeechSynthesis if server-TTS failed or wasn't generated
          playSpeechSynthesisFallback(data.text);
        }
      }

    } catch (err: any) {
      console.error(err);
      const errMsg: Message = {
        id: "err-" + Math.random(),
        sender: "assistant",
        text: "Verbindungsschwierigkeiten beim Gesetzeslotsen-Server. Bitte prüfen Sie, ob Ihr API-Schlüssel in Secrets eingepflegt wurde.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errMsg]);
      setIsLoading(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden h-[540px] dark:border-slate-800 dark:bg-slate-900" id="lukas-chat-assistant">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-white font-serif font-bold text-lg dark:bg-slate-100 dark:text-slate-900 shadow-sm">
              L
            </span>
            {isLukasSpeaking && (
              <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-white font-bold animate-pulse ring-2 ring-white dark:ring-slate-900">
                🎙️
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Lukas</h3>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Online
              </span>
            </div>
            <p className="text-[11px] text-slate-450 dark:text-slate-400">KI-Begleiter & Zwangsvollstreckungs-Nothelfer</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio generation toggle (WLAN speaker graphic style) */}
          <button
            onClick={() => {
              if (generateAudio) {
                stopCurrentAudio();
              }
              setGenerateAudio(!generateAudio);
            }}
            title={generateAudio ? "Sprachausgabe stummschalten" : "Sprachausgabe aktivieren"}
            className={`p-2 rounded-lg border transition-all duration-200 cursor-pointer ${
              generateAudio
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-55 shadow-sm dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                : "border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-850 dark:bg-slate-950 dark:text-slate-600"
            }`}
            id="audio-toggle-btn"
          >
            {generateAudio ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Messages Canvas */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/10" id="chat-messages-container">
        {messages.map((msg) => {
          const isLukas = msg.sender === "assistant";
          return (
            <div
              key={msg.id}
              className={`flex ${isLukas ? "justify-start" : "justify-end animate-fade-in"}`}
              id={`message-bubble-${msg.id}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed ${
                  isLukas
                    ? "bg-white text-slate-850 border border-slate-100 dark:bg-slate-950/40 dark:text-slate-100 dark:border-slate-850"
                    : "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium"
                }`}
              >
                {isLukas ? renderMessageWithFiles(msg.text) : msg.text}
                <div className={`mt-1.5 flex items-center justify-between text-[10px] ${isLukas ? "text-slate-400" : "text-slate-350 dark:text-slate-500"}`}>
                  <span>
                    {msg.timestamp.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {isLukas && generateAudio && (
                    <button
                      onClick={() => playSpeechSynthesisFallback(msg.text)}
                      className="ml-2 hover:text-slate-600 dark:hover:text-slate-200 text-slate-400 flex items-center gap-0.5 cursor-pointer"
                      title="Nochmal vorlesen"
                    >
                      <Volume2 className="h-3 w-3" />
                      Anhören
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start items-center gap-2 text-slate-400 text-xs py-2 font-medium" id="chat-loading-indicator">
            <span className="flex h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="flex h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="flex h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            <span className="ml-1 text-xs">Lukas überlegt...</span>
          </div>
        )}

        {/* Dynamic visual wave that blooms when voice output is active */}
        {isLukasSpeaking && (
          <div className="flex flex-col items-center justify-center p-3.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-pulse text-xs max-w-sm mx-auto" id="speaking-wave-box">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="h-2 w-1.5 bg-emerald-500 rounded-full animate-[bounce_0.8s_infinite]" style={{ animationDelay: "100ms" }}></span>
              <span className="h-4.5 w-1.5 bg-emerald-500 rounded-full animate-[bounce_0.8s_infinite]" style={{ animationDelay: "200ms" }}></span>
              <span className="h-3 w-1.5 bg-emerald-500 rounded-full animate-[bounce_0.8s_infinite]" style={{ animationDelay: "300ms" }}></span>
              <span className="h-5.5 w-1.5 bg-emerald-500 rounded-full animate-[bounce_0.8s_infinite]" style={{ animationDelay: "400ms" }}></span>
              <span className="h-2.5 w-1.5 bg-emerald-500 rounded-full animate-[bounce_0.8s_infinite]" style={{ animationDelay: "500ms" }}></span>
            </div>
            <span className="font-semibold text-center leading-tight">Lukas spricht zu Ihnen...</span>
          </div>
        )}

        {isListening && (
          <div className="flex flex-col items-center justify-center p-4 bg-red-500/5 rounded-xl border border-red-500/10 text-red-600 dark:text-red-400 animate-pulse text-xs max-w-sm mx-auto" id="listening-wave-box">
            <div className="flex items-center gap-1 mb-1.5">
              <span className="h-2 w-1.5 bg-red-500 rounded-full animate-pulse"></span>
              <span className="h-4 w-1.5 bg-red-500 rounded-full animate-bounce"></span>
              <span className="h-5 w-1.5 bg-red-500 rounded-full animate-pulse"></span>
              <span className="h-3 w-1.5 bg-red-500 rounded-full animate-bounce"></span>
            </div>
            <span className="font-semibold tracking-wide uppercase text-[10px]">Ich höre zu... Bitte sprechen Sie klar.</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input panel with Microphone button */}
      <div className="p-4 border-t border-slate-100 bg-white flex gap-2 items-center dark:border-slate-800 dark:bg-slate-900" id="input-controls-area">
        <button
          onClick={handleToggleListening}
          title={isListening ? "Spracherkennung stoppen" : "Über Sprache antworten"}
          className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
            isListening
              ? "bg-red-500 text-white border-red-600 shadow-md scale-105 active:scale-95"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-350 dark:hover:bg-slate-800"
          }`}
          id="mic-assist-btn"
        >
          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={() => chatFileInputRef.current?.click()}
          title="Schuhkarton-PDF hochladen & automatisch erfassen"
          className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-350 dark:hover:bg-slate-800 transition-all cursor-pointer relative"
          disabled={isLoading}
          id="chat-upload-doc-btn"
        >
          <Paperclip className="h-5 w-5" />
          <input
            type="file"
            ref={chatFileInputRef}
            onChange={handleChatFileUpload}
            accept=".pdf, .png, .jpg, .jpeg"
            className="hidden"
          />
        </button>

        <input
          type="text"
          value={inputValue}
          disabled={isLoading}
          onKeyDown={handleInputKeyDown}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Nachricht eingeben oder links auf das Mikrofon tippen..."
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none disabled:opacity-40 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200 dark:focus:border-slate-100"
          id="chat-text-input"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputValue.trim() || isLoading}
          className="py-3 px-4.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          id="send-msg-btn"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom Legal Disclaimer banner */}
      <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 flex items-center gap-1.5 dark:bg-slate-950/40 dark:border-slate-850" id="legal-disclaimer">
        <Sparkles className="h-3 w-3 shrink-0 text-slate-455" />
        <span>Die Antworten spiegeln den behördlichen Ablauf wider und ersetzen keine individuelle Rechtsberatung durch einen Anwalt.</span>
      </div>
    </div>
  );
}
