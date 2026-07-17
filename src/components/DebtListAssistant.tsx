import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Trash2, 
  Search, 
  MapPin, 
  Coins, 
  ShieldAlert, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Download, 
  Printer, 
  PenTool, 
  BookmarkCheck, 
  CheckCircle2, 
  FileText, 
  Info, 
  Sparkles,
  HelpCircle,
  AlertTriangle,
  Upload,
  X,
  Calculator,
  FileSpreadsheet,
  SlidersHorizontal,
  User,
  UserPlus,
  Edit,
  Layers
} from "lucide-react";
import { DebtItem } from "../types";
import { creditorsDb, DbCreditor } from "../data/creditors_db";
import { jsPDF } from "jspdf";

export interface CsvPreviewItem {
  id: string;
  creditorName: string;
  street: string;
  city: string;
  fileReference: string;
  amount: number;
  category: string;
  status: "offen" | "ratenzahlung" | "verhandlung" | "tituliert";
  nextInstallmentDate?: string;
  selected: boolean;
}

export interface DebtorProfile {
  id: string;
  name: string;
  dob: string;
  pob: string;
  address: string;
  competentCourt: string;
}

interface ZinsInterval {
  start: string;
  end: string;
  rate: number;
  label: string;
}

const HISTORICAL_BGB_PERIODS: ZinsInterval[] = [
  { start: "1900-01-01", end: "2003-12-31", rate: 6.22, label: "Historisch (bis 31.12.2003)" },
  { start: "2004-01-01", end: "2004-06-30", rate: 6.14, label: "01.01.2004 - 30.06.2004" },
  { start: "2004-07-01", end: "2004-12-31", rate: 6.13, label: "01.07.2004 - 31.12.2004" },
  { start: "2005-01-01", end: "2005-06-30", rate: 6.21, label: "01.01.2005 - 30.06.2005" },
  { start: "2005-07-01", end: "2005-12-31", rate: 6.17, label: "01.07.2005 - 31.12.2005" },
  { start: "2006-01-01", end: "2006-06-30", rate: 6.37, label: "01.01.2006 - 30.06.2006" },
  { start: "2006-07-01", end: "2006-12-31", rate: 6.95, label: "01.07.2006 - 31.12.2006" },
  { start: "2007-01-01", end: "2007-06-30", rate: 7.70, label: "01.01.2007 - 30.06.2007" },
  { start: "2007-07-01", end: "2007-12-31", rate: 8.19, label: "01.07.2007 - 31.12.2007" },
  { start: "2008-01-01", end: "2008-06-30", rate: 8.32, label: "01.01.2008 - 30.06.2008" },
  { start: "2008-07-01", end: "2008-12-31", rate: 8.19, label: "01.07.2008 - 31.12.2008" },
  { start: "2009-01-01", end: "2009-06-30", rate: 6.62, label: "01.01.2009 - 30.06.2009" },
  { start: "2009-07-01", end: "2011-06-30", rate: 5.12, label: "01.07.2009 - 30.06.2011" },
  { start: "2011-07-01", end: "2011-12-31", rate: 5.37, label: "01.07.2011 - 31.12.2011" },
  { start: "2012-01-01", end: "2012-12-31", rate: 5.12, label: "01.01.2012 - 31.12.2012" },
  { start: "2013-01-01", end: "2013-06-30", rate: 4.87, label: "01.01.2013 - 30.06.2013" },
  { start: "2013-07-01", end: "2013-12-31", rate: 4.62, label: "01.07.2013 - 31.12.2013" },
  { start: "2014-01-01", end: "2014-06-30", rate: 4.37, label: "01.01.2014 - 30.06.2014" },
  { start: "2014-07-01", end: "2014-12-31", rate: 4.27, label: "01.07.2014 - 31.12.2014" },
  { start: "2015-01-01", end: "2016-06-30", rate: 4.17, label: "01.01.2015 - 30.06.2016" },
  { start: "2016-07-01", end: "2022-12-31", rate: 4.12, label: "01.07.2016 - 31.12.2022" },
  { start: "2023-01-01", end: "2023-06-30", rate: 6.62, label: "01.01.2023 - 30.06.2023" },
  { start: "2023-07-01", end: "2023-12-31", rate: 8.12, label: "01.07.2023 - 31.12.2023" },
  { start: "2024-01-01", end: "2024-06-30", rate: 8.62, label: "01.01.2024 - 30.06.2024" },
  { start: "2024-07-01", end: "2024-12-31", rate: 8.37, label: "01.07.2024 - 31.12.2024" },
  { start: "2025-01-01", end: "2025-06-30", rate: 7.27, label: "01.01.2025 - 30.06.2025" },
  { start: "2025-07-01", end: "2099-12-31", rate: 6.27, label: "ab 01.07.2025 (inkl. bis 31.05.2026)" }
];

const formatDeDate = (isoStr: string | Date): string => {
  if (isoStr instanceof Date) {
    const d = isoStr.getDate().toString().padStart(2, "0");
    const m = (isoStr.getMonth() + 1).toString().padStart(2, "0");
    const y = isoStr.getFullYear();
    return `${d}.${m}.${y}`;
  }
  const parts = isoStr.split("T")[0].split("-");
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
};

export const ensureIsoDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();
  
  // Already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle D.M.YYYY, DD.M.YYYY, D.MM.YYYY, DD.MM.YYYY
  const deMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (deMatch) {
    const day = deMatch[1].padStart(2, "0");
    const month = deMatch[2].padStart(2, "0");
    const year = deMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Handle German 2-digit year: D.M.YY, DD.M.YY, D.MM.YY, DD.MM.YY
  const deMatch2 = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/);
  if (deMatch2) {
    const day = deMatch2[1].padStart(2, "0");
    const month = deMatch2[2].padStart(2, "0");
    const yy = parseInt(deMatch2[3]);
    const year = yy >= 80 ? `19${yy}` : `20${yy.toString().padStart(2, "0")}`;
    return `${year}-${month}-${day}`;
  }

  // Fallback try with native JS parsing
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, "0");
      const day = d.getDate().toString().padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  } catch (e) {}

  return trimmed;
};

// German 30/360 interest calculation helper (Deutsche Zinsmethode - 30/360)
export const getDays30360FromStr = (startStr: string, endStr: string): number => {
  const sIso = ensureIsoDate(startStr);
  const eIso = ensureIsoDate(endStr);
  const p1 = sIso.split("-").map(Number);
  const p2 = eIso.split("-").map(Number);
  
  if (p1.length !== 3 || p2.length !== 3 || p1.some(isNaN) || p2.some(isNaN)) {
    return 0;
  }
  
  let y1 = p1[0];
  let m1 = p1[1];
  let d1 = p1[2];
  
  let y2 = p2[0];
  let m2 = p2[1];
  let d2 = p2[2];
  
  if (d1 === 31) d1 = 30;
  if (d2 === 31) d2 = 30;
  
  const isFebEnd = (d: number, m: number, y: number): boolean => {
    if (m !== 2) return false;
    const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
    return d === (isLeap ? 29 : 28);
  };
  
  if (isFebEnd(d1, m1, y1)) d1 = 30;
  if (isFebEnd(d2, m2, y2)) d2 = 30;
  
  const diffDays = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
  return diffDays + 1; // Start- and end date inclusive
};

export const calculateBgbInterestForItem = (principal: number, startStr: string | undefined, endStr: string | undefined): number => {
  if (!principal || principal <= 0 || !startStr) return 0;
  const actualEnd = endStr || new Date().toISOString().split("T")[0];
  const sIso = ensureIsoDate(startStr);
  const eIso = ensureIsoDate(actualEnd);
  if (!sIso || !eIso || sIso > eIso) return 0;

  // Protect against ancient placeholder dates (like 1900-01-01) by clamping to maximum 30 years limitation period limit (e.g. 1996)
  let cleanStartIso = sIso;
  if (cleanStartIso < "1996-01-01") {
    cleanStartIso = "1996-01-01";
  }

  let totalInterest = 0;
  HISTORICAL_BGB_PERIODS.forEach(per => {
    const oStart = cleanStartIso > per.start ? cleanStartIso : per.start;
    const oEnd = eIso < per.end ? eIso : per.end;

    if (oStart <= oEnd) {
      const days = getDays30360FromStr(oStart, oEnd);
      const interest = principal * (per.rate / 100) * (days / 360);
      totalInterest += Math.max(0, interest);
    }
  });
  
  // Enforce double decimal precision (currency rounding)
  return Math.round(totalInterest * 100) / 100;
};

const parseToTime = (dateStr?: string) => {
  if (!dateStr) return 0;
  const trimmed = dateStr.trim();
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    const parts = trimmed.split(".");
    const d = new Date(parseInt(parts[2]), parseInt(parts[1] || "1") - 1, parseInt(parts[0] || "1"));
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

export default function DebtListAssistant() {
  const [profiles, setProfiles] = useState<DebtorProfile[]>(() => {
    const stored = localStorage.getItem("gesetzeslotse_profiles");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse profiles", e);
      }
    }
    const defaultList: DebtorProfile[] = [
      {
        id: "schmidt",
        name: "Maximilian Schmidt",
        dob: "15.03.1985",
        pob: "Berlin",
        address: "Heidestraße 48, 10557 Berlin",
        competentCourt: "Amtsgericht Wedding - Insolvenzgericht -"
      },
      {
        id: "weber",
        name: "Gabriele Weber",
        dob: "28.11.1972",
        pob: "Potsdam",
        address: "Karl-Marx-Str. 12, 12043 Berlin",
        competentCourt: "Amtsgericht Tempelhof-Kreuzberg - Insolvenzgericht -"
      }
    ];
    localStorage.setItem("gesetzeslotse_profiles", JSON.stringify(defaultList));
    return defaultList;
  });

  const [activeProfile, setActiveProfile] = useState<string>(() => {
    return localStorage.getItem("gesetzeslotse_active_profile") || "schmidt";
  });

  // Profile management modals
  const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Form Fields for Create Profile
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileDob, setNewProfileDob] = useState("");
  const [newProfilePob, setNewProfilePob] = useState("Berlin");
  const [newProfileAddress, setNewProfileAddress] = useState("");
  const [newProfileCourt, setNewProfileCourt] = useState("Amtsgericht Wedding - Insolvenzgericht -");

  // Form Fields for Edit Profile
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileDob, setEditProfileDob] = useState("");
  const [editProfilePob, setEditProfilePob] = useState("");
  const [editProfileAddress, setEditProfileAddress] = useState("");
  const [editProfileCourt, setEditProfileCourt] = useState("");

  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [analyzedFileName, setAnalyzedFileName] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [creditorSearchTerm, setCreditorSearchTerm] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  
  // Duplicate Checks & Settlement Recommendation States
  const [duplicateNotices, setDuplicateNotices] = useState<any[]>([]);
  const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);
  
  // What-If & CSV States
  const [wunschrate, setWunschrate] = useState<string>("100");
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvPreviewItems, setCsvPreviewItems] = useState<CsvPreviewItem[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvLines, setCsvLines] = useState<string[][]>([]);
  const [csvSep, setCsvSep] = useState<string>(";");
  const [columnMapping, setColumnMapping] = useState<{
    creditorName: number;
    amount: number;
    fileReference: number;
    category: number;
    status: number;
    nextInstallmentDate: number;
  }>({
    creditorName: -1,
    amount: -1,
    fileReference: -1,
    category: -1,
    status: -1,
    nextInstallmentDate: -1,
  });
  
  // Form States
  const [creditorName, setCreditorName] = useState("");
  const [originalCreditor, setOriginalCreditor] = useState("");
  const [debtCollector, setDebtCollector] = useState("");
  const [street, setStreet] = useState("");
  const [cityAndZip, setCityAndZip] = useState("");
  const [amount, setAmount] = useState("");
  const [fileReference, setFileReference] = useState("");
  const [category, setCategory] = useState("Konsum");
  const [status, setStatus] = useState<"offen" | "ratenzahlung" | "verhandlung" | "tituliert" | "gescheitert">("offen");
  const [nextInstallmentDate, setNextInstallmentDate] = useState("");
  const [failureDate, setFailureDate] = useState("");
  const [failureReason, setFailureReason] = useState("Abschlägige Antwort (Ablehnung)");

  // Detail fields for tituliert status
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestAmount, setInterestAmount] = useState("");
  const [feesAmount, setFeesAmount] = useState("");
  const [titledWith, setTitledWith] = useState("Vollstreckungsbescheid");
  const [titledDate, setTitledDate] = useState("");

  // Detailed Mahnbescheid fields
  const [mbPrincipal, setMbPrincipal] = useState(""); // I.1 Hauptforderung
  const [mbInterestArrears, setMbInterestArrears] = useState(""); // I.2 Zinsrückstände
  const [mbCourtCosts, setMbCourtCosts] = useState(""); // II.1 Gerichtskosten
  const [mbClaimantExpenses, setMbClaimantExpenses] = useState(""); // II.2 Auslagen
  const [mbExtraFees, setMbExtraFees] = useState(""); // III Inkassokosten/Nebenforderungen
  const [mbCalculatedInterest, setMbCalculatedInterest] = useState(""); // IV.1 Vom Antragsteller ausgerechnete Zinsen
  const [mbCurrentInterest, setMbCurrentInterest] = useState(""); // IV.2 laufende vom Gericht ausgerechnete Zinsen

  // Sync individual Mahnbescheid fields to principalAmount, interestAmount, feesAmount, and total amount
  useEffect(() => {
    if (status === "tituliert") {
      const p = parseFloat(mbPrincipal) || 0;
      const i = (parseFloat(mbInterestArrears) || 0) + (parseFloat(mbCalculatedInterest) || 0) + (parseFloat(mbCurrentInterest) || 0);
      const f = (parseFloat(mbCourtCosts) || 0) + (parseFloat(mbClaimantExpenses) || 0) + (parseFloat(mbExtraFees) || 0);
      setPrincipalAmount(p > 0 ? p.toFixed(2) : "");
      setInterestAmount(i > 0 ? i.toFixed(2) : "");
      setFeesAmount(f > 0 ? f.toFixed(2) : "");
      setAmount((p + i + f).toFixed(2));
    }
  }, [status, mbPrincipal, mbInterestArrears, mbCourtCosts, mbClaimantExpenses, mbExtraFees, mbCalculatedInterest, mbCurrentInterest]);

  // Dynamic CSV mapping effect
  useEffect(() => {
    if (csvLines.length === 0) return;

    const parsed: CsvPreviewItem[] = [];

    csvLines.forEach((cols, rowIndex) => {
      if (cols.length === 0 || !cols[0]) return;

      let credName = "";
      let amt = 0;
      let rfe = "";
      let str = "";
      let cty = "";
      let cat = "Sonstiges";
      let stat: "offen" | "ratenzahlung" | "verhandlung" | "tituliert" | "gescheitert" = "offen";
      let dueDate = "";

      // 1. Resolve creditorName
      if (columnMapping.creditorName !== -1 && cols[columnMapping.creditorName] !== undefined) {
        credName = cols[columnMapping.creditorName].replace(/"/g, "").trim();
      } else {
        // Fallback or guess
        credName = cols[0] ? cols[0].replace(/"/g, "").trim() : "";
      }

      // 2. Resolve amount
      if (columnMapping.amount !== -1 && cols[columnMapping.amount] !== undefined) {
        const rawAmt = cols[columnMapping.amount].replace(/"/g, "").trim();
        const cleanAmt = rawAmt.replace(/[^0-9,.-]/g, "").replace(",", ".");
        amt = parseFloat(cleanAmt) || 0;
      } else {
        // Fallback: look at second column or try parsing first number
        const rawAmt = cols[1] ? cols[1].replace(/"/g, "").trim() : "";
        const cleanAmt = rawAmt.replace(/[^0-9,.-]/g, "").replace(",", ".");
        amt = parseFloat(cleanAmt) || 0;
      }

      // 3. Resolve fileReference
      if (columnMapping.fileReference !== -1 && cols[columnMapping.fileReference] !== undefined) {
        rfe = cols[columnMapping.fileReference].replace(/"/g, "").trim();
      } else {
        rfe = cols[2] ? cols[2].replace(/"/g, "").trim() : `Ref-${21000 + rowIndex}`;
      }

      // 4. Resolve category
      if (columnMapping.category !== -1 && cols[columnMapping.category] !== undefined) {
        cat = cols[columnMapping.category].replace(/"/g, "").trim();
      } else {
        cat = cols[3] ? cols[3].replace(/"/g, "").trim() : "Sonstiges";
      }

      // 5. Resolve status
      if (columnMapping.status !== -1 && cols[columnMapping.status] !== undefined) {
        const s = cols[columnMapping.status].toLowerCase().replace(/"/g, "").trim();
        if (s.includes("titul") || s.includes("court") || s.includes("gv") || s.includes("gericht")) stat = "tituliert";
        else if (s.includes("verhand") || s.includes("negot")) stat = "verhandlung";
        else if (s.includes("rate") || s.includes("instal")) stat = "ratenzahlung";
        else stat = "offen";
      } else {
        const s = (cols[4] || "").toLowerCase().replace(/"/g, "").trim();
        if (s.includes("titul") || s.includes("court") || s.includes("gv") || s.includes("gericht")) stat = "tituliert";
        else if (s.includes("verhand") || s.includes("negot")) stat = "verhandlung";
        else if (s.includes("rate") || s.includes("instal")) stat = "ratenzahlung";
        else stat = "offen";
      }

      // 6. Resolve date
      if (columnMapping.nextInstallmentDate !== -1 && cols[columnMapping.nextInstallmentDate] !== undefined) {
        const rawDate = cols[columnMapping.nextInstallmentDate].replace(/"/g, "").trim();
        const parts = rawDate.split(".");
        if (parts.length === 3) {
          dueDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        } else {
          dueDate = rawDate;
        }
      } else {
        const rawDate = cols[5] ? cols[5].replace(/"/g, "").trim() : "";
        if (rawDate) {
          const parts = rawDate.split(".");
          if (parts.length === 3) {
            dueDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          } else {
            dueDate = rawDate;
          }
        }
      }

      if (credName) {
        parsed.push({
          id: "csv-" + Math.random().toString(36).substr(2, 9),
          creditorName: credName,
          street: str,
          city: cty,
          fileReference: rfe,
          amount: amt,
          category: cat,
          status: stat,
          nextInstallmentDate: dueDate || undefined,
          selected: amt > 0,
        });
      }
    });

    setCsvPreviewItems(parsed);
  }, [columnMapping, csvLines]);

  const getDaysRemaining = (dateStr?: string) => {
    if (!dateStr) return null;
    const targetDate = new Date(dateStr);
    const today = new Date();
    
    // Reset hours to compare dates only
    const d1 = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const d2 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    
    const diffTime = d1 - d2;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Speech States
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLog, setVoiceLog] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showLukasNotification, setShowLukasNotification] = useState("");

  const speechRecognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== "undefined" ? window.speechSynthesis : null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = "de-DE";
      rec.interimResults = false;

      rec.onstart = () => {
        setIsRecording(true);
        setVoiceLog("Ich höre zu... (Sprechen Sie z.B.: 'Einhundert Euro bei Lowell Inkasso')");
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setVoiceLog(`Erkannt: "${text}"`);
        parseSpokenText(text);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setVoiceLog(`Fehler: ${event.error === "no-speech" ? "Keine Sprache erkannt" : event.error}`);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      speechRecognitionRef.value = rec;
    }
  }, []);

  // Parse spoken inputs
  const parseSpokenText = (text: string) => {
    const lowerText = text.toLowerCase();
    
    // 1. Try to find a numeric value for amount
    const amountMatch = lowerText.match(/(\d+(?:[.,]\d+)?)/);
    let detectedAmount = "";
    if (amountMatch) {
      detectedAmount = amountMatch[1].replace(",", ".");
      setAmount(detectedAmount);
    }

    // 2. Try to find a matching creditor from our DB
    let detectedCreditor: DbCreditor | null = null;
    for (const cred of creditorsDb) {
      const parts = cred.name.toLowerCase().split(" ");
      // Check if speaker named any main keyword of the creditor (e.g. "Lowell", "coeo", "Alektum")
      const mainKeyword = parts[0];
      if (mainKeyword.length > 2 && lowerText.includes(mainKeyword)) {
        detectedCreditor = cred;
        break;
      }
    }

    if (detectedCreditor) {
      setCreditorName(detectedCreditor.name);
      setStreet(detectedCreditor.street);
      setCityAndZip(`${detectedCreditor.zip} ${detectedCreditor.city}`);
      setShowLukasNotification(`Lukas: Ich habe "${detectedCreditor.name}" mit einem Betrag von € ${detectedAmount || "X"} für Sie vorausgefüllt!`);
    } else {
      // General match
      const words = text.split(" ");
      let candidateName = "";
      if (words.length > 0) {
        // Assume names spoken after preposition 'bei' or 'an'
        const beiIndex = words.findIndex(w => w.toLowerCase() === "bei" || w.toLowerCase() === "an");
        if (beiIndex !== -1 && beiIndex + 1 < words.length) {
          candidateName = words.slice(beiIndex + 1).join(" ");
        }
      }
      if (candidateName) {
        setCreditorName(candidateName);
      }
      setShowLukasNotification(`Lukas: Ich habe € ${detectedAmount || "0.00"} erkannt. Bitte tragen Sie den Gläubiger manuell ein.`);
    }

    setTimeout(() => {
      setShowLukasNotification("");
    }, 6000);
  };

  // Speak Debt Summary (TTS)
  const speakSummaryByLukas = () => {
    if (!synthRef.current) {
      alert("Sprachausgabe wird von Ihrem Browser nicht unterstützt.");
      return;
    }

    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      return;
    }

    const totalSum = debts.reduce((sum, item) => sum + item.amount, 0);
    const tituliertCount = debts.filter(d => d.status === "tituliert").length;
    
    // Construct empathetic speech in Line with Lukas Assistant identity (Calm, concise, 3 sentences max)
    let text = "";
    if (debts.length === 0) {
      text = "Hallo! Lukas hier vom Gesetzeslotse Berlin. Ihre Schuldenaufstellung ist aktuell leer. Tragen Sie Ihre Forderungen ein, damit wir die Post strukturiert ordnen und Sie absichern können.";
    } else {
      text = `Hallo! Lukas hier. Ihr Schuldenberg liegt aktuell bei ${totalSum.toLocaleString("de-DE")} Euro bei ${debts.length} Gläubigern. ${
        tituliertCount > 0 
          ? `Achtung, ${tituliertCount} Forderung ist bereits tituliert! Handeln Sie jetzt und sichern Sie Ihr P-Konto.`
          : "Die meisten Forderungen sind noch verhandelbar. Wir können Vergleiche erwirken."
      } Möchten Sie, dass wir die Post für Sie verhandeln?`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 0.95; // empathetic, readable pace

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  // Toggle voice recognition
  const toggleRecording = () => {
    if (!speechRecognitionRef.value) {
      alert("Spracherkennung wird von Ihrem Browser nicht unterstützt (Bitte Chrome/Edge nutzen).");
      return;
    }
    if (isRecording) {
      speechRecognitionRef.value.stop();
    } else {
      speechRecognitionRef.value.start();
    }
  };

  // Persist listing per profile and sync demographics
  useEffect(() => {
    const key = `gesetzeslotse_debts_portfolio_${activeProfile}`;
    const stored = localStorage.getItem(key);

    const foundProfile = profiles.find(p => p.id === activeProfile);
    if (foundProfile) {
      localStorage.setItem("gesetzeslotse_active_debtor_name", foundProfile.name);
      localStorage.setItem("gesetzeslotse_active_debtor_dob", foundProfile.dob);
      localStorage.setItem("gesetzeslotse_active_debtor_pob", foundProfile.pob);
      localStorage.setItem("gesetzeslotse_active_debtor_address", foundProfile.address);
      localStorage.setItem("gesetzeslotse_active_debtor_court", foundProfile.competentCourt);
    } else {
      if (activeProfile === "schmidt") {
        localStorage.setItem("gesetzeslotse_active_debtor_name", "Maximilian Schmidt");
        localStorage.setItem("gesetzeslotse_active_debtor_dob", "15.03.1985");
        localStorage.setItem("gesetzeslotse_active_debtor_pob", "Berlin");
        localStorage.setItem("gesetzeslotse_active_debtor_address", "Heidestraße 48, 10557 Berlin");
        localStorage.setItem("gesetzeslotse_active_debtor_court", "Amtsgericht Wedding - Insolvenzgericht -");
      } else {
        localStorage.setItem("gesetzeslotse_active_debtor_name", "Gabriele Weber");
        localStorage.setItem("gesetzeslotse_active_debtor_dob", "28.11.1972");
        localStorage.setItem("gesetzeslotse_active_debtor_pob", "Potsdam");
        localStorage.setItem("gesetzeslotse_active_debtor_address", "Karl-Marx-Str. 12, 12043 Berlin");
        localStorage.setItem("gesetzeslotse_active_debtor_court", "Amtsgericht Tempelhof-Kreuzberg - Insolvenzgericht -");
      }
    }
    localStorage.setItem("gesetzeslotse_active_profile", activeProfile);
    window.dispatchEvent(new CustomEvent("gesetzeslotse_profile_changed"));
    setDuplicateNotices([]);

    if (stored) {
      try {
        setDebts(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load debts portfolio", e);
      }
    } else {
      // Default education setup
      let defaults: DebtItem[] = [];
      if (activeProfile === "schmidt") {
        defaults = [
          {
            id: "d-schmidt-1",
            creditorName: "EOS Investment GmbH",
            street: "Steindamm 71",
            city: "20099 Hamburg",
            fileReference: "052026-SCHMIDT", // combination of MonthYear ("052026") and Name ("SCHMIDT")
            amount: 1520.00,
            principalAmount: 1200.00, // Hauptforderung
            interestAmount: 184.50,   // Verzugszinsen
            feesAmount: 135.50,       // Vollstreckungsgebühren / Mahnkosten
            category: "Konsum",
            status: "tituliert",
            titledWith: "Gerichtlicher Vollstreckungsbescheid vom Amtsgericht Wedding",
            titledDate: "12.05.2026",
            debtorName: "Maximilian Schmidt",
            createdAt: new Date().toISOString()
          },
          {
            id: "d-schmidt-2",
            creditorName: "coeo Inkasso GmbH",
            street: "Kieler Str. 16",
            city: "41540 Dormagen",
            fileReference: "COE-883921-A",
            amount: 320.50,
            category: "Konsum",
            status: "ratenzahlung",
            nextInstallmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            debtorName: "Maximilian Schmidt",
            createdAt: new Date().toISOString()
          }
        ];
      } else if (activeProfile === "weber") {
        defaults = [
          {
            id: "d-weber-1",
            creditorName: "Lowell Inkasso GmbH",
            street: "Am Bonneshof 6",
            city: "40474 Düsseldorf",
            fileReference: "052026-WEBER", // combination of MonthYear ("052026") and Name ("WEBER")
            amount: 540.00,
            principalAmount: 430.00,  // Hauptforderung
            interestAmount: 60.00,    // Zinsen
            feesAmount: 50.00,        // Kosten
            category: "Telekommunikation",
            status: "verhandlung",
            debtorName: "Gabriele Weber",
            createdAt: new Date().toISOString()
          },
          {
            id: "d-weber-2",
            creditorName: "Barmer Krankenkasse",
            street: "Lichtscheider Str. 89",
            city: "42285 Wuppertal",
            fileReference: "BAR-9102-K",
            amount: 180.00,
            category: "Sonstiges",
            status: "offen",
            debtorName: "Gabriele Weber",
            createdAt: new Date().toISOString()
          }
        ];
      } else {
        defaults = [];
      }
      setDebts(defaults);
      localStorage.setItem(key, JSON.stringify(defaults));
    }
  }, [activeProfile, profiles]);

  const savePortfolioToStorage = (updated: DebtItem[]) => {
    setDebts(updated);
    localStorage.setItem(`gesetzeslotse_debts_portfolio_${activeProfile}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("gesetzeslotse_debts_updated"));
  };

  useEffect(() => {
    const handleAddEventDebt = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail) {
        const rawData = customEvent.detail;
        
        // If it's a wrapper object with an array of claims (the new format)
        let claimsList: any[] = [];
        if (rawData.claims && Array.isArray(rawData.claims)) {
          claimsList = rawData.claims;
        } else {
          claimsList = [rawData];
        }

        setDebts(prev => {
          let updated = [...prev];

          const cleanRef = (ref: string) => {
            if (!ref) return "";
            return ref.toLowerCase().replace(/[^a-z0-9]/g, "");
          };

          for (const parsedData of claimsList) {
            let finalPrincipal = typeof parsedData.principalAmount === "number" ? parsedData.principalAmount : parseFloat(parsedData.principalAmount || parsedData.amount) || 0;
            let finalInterestAmount = typeof parsedData.interestAmount === "number" ? parsedData.interestAmount : parseFloat(parsedData.interestAmount) || 0;
            let finalFeesAmount = typeof parsedData.feesAmount === "number" ? parsedData.feesAmount : parseFloat(parsedData.feesAmount) || 0;

            const finalStatus = parsedData.status === "tituliert" ? "tituliert" : "offen";
            const finalAmount = typeof parsedData.amount === "number" ? parsedData.amount : parseFloat(parsedData.amount) || (finalPrincipal + finalInterestAmount + finalFeesAmount);

            // Construct offers array if parsedData.offers exists
            const parsedOffers = (parsedData.offers || []).map((off: any) => ({
              id: "offer-" + Math.random().toString(36).substr(2, 9),
              amount: off.amount || 0,
              originalAmount: off.originalAmount || finalAmount,
              date: off.date || parsedData.titledDate || new Date().toISOString().split("T")[0],
              deadline: off.deadline || undefined,
              type: off.type === "installment" ? "installment" : "settlement",
              details: off.details || ""
            }));

            const cRef = cleanRef(parsedData.fileReference);
            let matchIndex = -1;
            if (cRef && cRef.length > 3 && cRef !== "unbekannt") {
              matchIndex = updated.findIndex(d => cleanRef(d.fileReference) === cRef);
            }

            if (matchIndex !== -1) {
              const matchedDebt = updated[matchIndex];
              const existingOffers = matchedDebt.offers || [];
              const newOffersToAppend = parsedOffers.filter((o: any) => {
                return !existingOffers.some(eo => eo.amount === o.amount && eo.type === o.type);
              });

              // Add current item as settlement offer if it represents a discount
              if (matchedDebt.amount > finalAmount && !existingOffers.some(eo => eo.amount === finalAmount)) {
                newOffersToAppend.push({
                  id: "offer-main-" + Math.random().toString(36).substr(2, 9),
                  amount: finalAmount,
                  originalAmount: matchedDebt.amount,
                  date: parsedData.titledDate || new Date().toISOString().split("T")[0],
                  type: "settlement",
                  details: "Geringeres Angebot laut neuem Schreiben"
                });
              }

              const dateNew = parseToTime(parsedData.titledDate);
              const dateExisting = parseToTime(matchedDebt.titledDate || (matchedDebt.createdAt ? matchedDebt.createdAt.split("T")[0] : undefined));

              if (dateNew < dateExisting && dateNew > 0 && dateExisting > 0) {
                // The incoming document is OLDER. Ignore the main claim details, but still append any offers!
                updated[matchIndex] = {
                  ...matchedDebt,
                  offers: [...existingOffers, ...newOffersToAppend]
                };
              } else if (dateNew > dateExisting && dateNew > 0) {
                // The incoming document is NEWER. Overwrite core attributes!
                updated[matchIndex] = {
                  ...matchedDebt,
                  offers: [...existingOffers, ...newOffersToAppend],
                  amount: finalAmount,
                  status: finalStatus,
                  originalCreditor: parsedData.originalCreditor || matchedDebt.originalCreditor,
                  debtCollector: parsedData.debtCollector || matchedDebt.debtCollector,
                  street: parsedData.street || matchedDebt.street,
                  city: parsedData.city || matchedDebt.city,
                  category: parsedData.category || matchedDebt.category,
                  titledWith: parsedData.titledWith || matchedDebt.titledWith,
                  titledDate: parsedData.titledDate || matchedDebt.titledDate,
                  principalAmount: finalPrincipal || matchedDebt.principalAmount,
                  interestAmount: finalInterestAmount || matchedDebt.interestAmount,
                  feesAmount: finalFeesAmount || matchedDebt.feesAmount,
                  mbPrincipal: parsedData.mbPrincipal || matchedDebt.mbPrincipal,
                  mbInterestArrears: parsedData.mbInterestArrears || matchedDebt.mbInterestArrears,
                  mbCourtCosts: parsedData.mbCourtCosts || matchedDebt.mbCourtCosts,
                  mbClaimantExpenses: parsedData.mbClaimantExpenses || matchedDebt.mbClaimantExpenses,
                  mbExtraFees: parsedData.mbExtraFees || matchedDebt.mbExtraFees,
                  mbCalculatedInterest: parsedData.mbCalculatedInterest || matchedDebt.mbCalculatedInterest,
                  mbCurrentInterest: parsedData.mbCurrentInterest || matchedDebt.mbCurrentInterest
                };
              } else {
                // Same or undefined dates: fallback to standard merge
                updated[matchIndex] = {
                  ...matchedDebt,
                  offers: [...existingOffers, ...newOffersToAppend],
                  originalCreditor: matchedDebt.originalCreditor || parsedData.originalCreditor,
                  debtCollector: matchedDebt.debtCollector || parsedData.debtCollector,
                  street: matchedDebt.street || parsedData.street,
                  city: matchedDebt.city || parsedData.city,
                  status: parsedData.status === "tituliert" ? "tituliert" : matchedDebt.status,
                  titledWith: matchedDebt.titledWith || parsedData.titledWith,
                  titledDate: matchedDebt.titledDate || parsedData.titledDate,
                  principalAmount: matchedDebt.principalAmount || finalPrincipal,
                  interestAmount: matchedDebt.interestAmount || finalInterestAmount,
                  feesAmount: matchedDebt.feesAmount || finalFeesAmount
                };
              }
            } else {
              const generatedId = "debt-" + Math.random().toString(36).substr(2, 9);
              const newItem: DebtItem = {
                id: generatedId,
                creditorName: parsedData.creditorName || "Unbekannter Gläubiger",
                originalCreditor: parsedData.originalCreditor || undefined,
                debtCollector: parsedData.debtCollector || undefined,
                street: parsedData.street || "",
                city: parsedData.city || "",
                fileReference: parsedData.fileReference || "Unbekannt",
                amount: finalAmount,
                category: parsedData.category || "Konsum",
                status: finalStatus,
                createdAt: new Date().toISOString(),
                debtorName: profiles.find(p => p.id === activeProfile)?.name || "Maximilian Schmidt",
                principalAmount: finalPrincipal || undefined,
                interestAmount: finalInterestAmount || undefined,
                feesAmount: finalFeesAmount || undefined,
                titledWith: parsedData.titledWith || (finalStatus === "tituliert" ? "Gerichtlicher Vollstreckungsbescheid" : undefined),
                titledDate: parsedData.titledDate || undefined,
                mbPrincipal: parsedData.mbPrincipal || "",
                mbInterestArrears: parsedData.mbInterestArrears || "",
                mbCourtCosts: parsedData.mbCourtCosts || "",
                mbClaimantExpenses: parsedData.mbClaimantExpenses || "",
                mbExtraFees: parsedData.mbExtraFees || "",
                mbCalculatedInterest: parsedData.mbCalculatedInterest || "",
                mbCurrentInterest: parsedData.mbCurrentInterest || "",
                offers: parsedOffers.length > 0 ? parsedOffers : undefined,
                mostRecentPageNumber: parsedData.mostRecentPageNumber || undefined
              };
              updated = [newItem, ...updated];
            }
          }

          localStorage.setItem(`gesetzeslotse_debts_portfolio_${activeProfile}`, JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent("gesetzeslotse_debts_updated"));
          return updated;
        });
      }
    };

    window.addEventListener("gesetzeslotse_add_debt", handleAddEventDebt);
    return () => {
      window.removeEventListener("gesetzeslotse_add_debt", handleAddEventDebt);
    };
  }, [activeProfile, profiles]);

  // Profile Management System Helpers
  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) {
      alert("Bitte geben Sie einen Namen an.");
      return;
    }
    const newId = "custom_" + Date.now();
    const newProf: DebtorProfile = {
      id: newId,
      name: newProfileName.trim(),
      dob: newProfileDob.trim() || "01.01.1980",
      pob: newProfilePob.trim() || "Berlin",
      address: newProfileAddress.trim() || "Musterstraße 1, 10115 Berlin",
      competentCourt: newProfileCourt
    };

    const updated = [...profiles, newProf];
    setProfiles(updated);
    localStorage.setItem("gesetzeslotse_profiles", JSON.stringify(updated));

    // Reset Form
    setNewProfileName("");
    setNewProfileDob("");
    setNewProfilePob("Berlin");
    setNewProfileAddress("");
    setNewProfileCourt("Amtsgericht Wedding - Insolvenzgericht -");
    setShowCreateProfileModal(false);

    // Switch to new profile
    setActiveProfile(newId);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProfileName.trim()) {
      alert("Bitte geben Sie einen Namen an.");
      return;
    }

    const updated = profiles.map(p => {
      if (p.id === activeProfile) {
        return {
          ...p,
          name: editProfileName.trim(),
          dob: editProfileDob.trim(),
          pob: editProfilePob.trim(),
          address: editProfileAddress.trim(),
          competentCourt: editProfileCourt
        };
      }
      return p;
    });

    setProfiles(updated);
    localStorage.setItem("gesetzeslotse_profiles", JSON.stringify(updated));
    setShowEditProfileModal(false);

    // Sync demographics immediately after editing active profile
    localStorage.setItem("gesetzeslotse_active_debtor_name", editProfileName.trim());
    localStorage.setItem("gesetzeslotse_active_debtor_dob", editProfileDob.trim());
    localStorage.setItem("gesetzeslotse_active_debtor_pob", editProfilePob.trim());
    localStorage.setItem("gesetzeslotse_active_debtor_address", editProfileAddress.trim());
    localStorage.setItem("gesetzeslotse_active_debtor_court", editProfileCourt);
    window.dispatchEvent(new CustomEvent("gesetzeslotse_profile_changed"));
  };

  const handleDeleteProfile = (profileId: string) => {
    if (profileId === "schmidt" || profileId === "weber") {
      alert("Die Standard-Audits von Schmidt und Weber können nicht gelöscht werden.");
      return;
    }
    if (!confirm("Möchten Sie diesen Schuldner wirklich unwiderruflich löschen? Alle zugehörigen Schuldendaten gehen verloren.")) {
      return;
    }

    const updated = profiles.filter(p => p.id !== profileId);
    setProfiles(updated);
    localStorage.setItem("gesetzeslotse_profiles", JSON.stringify(updated));

    // Remove portfolios
    localStorage.removeItem(`gesetzeslotse_debts_portfolio_${profileId}`);

    // If currently active, switch back to Schmidt
    if (activeProfile === profileId) {
      setActiveProfile("schmidt");
    }
  };

  const openEditModal = () => {
    const current = profiles.find(p => p.id === activeProfile);
    if (current) {
      setEditProfileName(current.name);
      setEditProfileDob(current.dob);
      setEditProfilePob(current.pob || "Berlin");
      setEditProfileAddress(current.address || "");
      setEditProfileCourt(current.competentCourt || "Amtsgericht Wedding - Insolvenzgericht -");
      setShowEditProfileModal(true);
    }
  };

  // Autocomplete Filter
  const filteredSuggestions = creditorSearchTerm.trim() === "" 
    ? [] 
    : creditorsDb.filter(c => 
        c.name.toLowerCase().includes(creditorSearchTerm.toLowerCase())
      ).slice(0, 5);

  const selectSuggestedCreditor = (cred: DbCreditor) => {
    setCreditorName(cred.name);
    setStreet(cred.street);
    setCityAndZip(`${cred.zip} ${cred.city}`);
    setCreditorSearchTerm("");
    setShowAutocomplete(false);
  };

  const directoryFileInputRef = useRef<HTMLInputElement>(null);

  const handleBatchDirectoryFilesUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setIsAnalyzingDoc(true);
    setBatchProgress({ current: 1, total: files.length, fileName: files[0].name });
    setAnalyzedFileName(files[0].name);

    const allExtractedClaims: { fileName: string; claims: any[] }[] = [];
    const errors: { fileName: string; message: string }[] = [];

    // Process each document sequentially to show tidy progress and handle model rate limits
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setBatchProgress({ current: i + 1, total: files.length, fileName: file.name });
      setAnalyzedFileName(file.name);

      try {
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
          reader.readAsDataURL(file);
        });

        const mimeType = file.type;

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

        const responseData = await res.json();
        let claimsList: any[] = [];
        if (responseData.claims && Array.isArray(responseData.claims)) {
          claimsList = responseData.claims;
        } else {
          claimsList = [responseData];
        }

        if (claimsList.length === 0) {
          throw new Error("Es konnten keine verwertbaren Forderungen extrahiert werden.");
        }

        allExtractedClaims.push({ fileName: file.name, claims: claimsList });
      } catch (err: any) {
        console.error(`Fehler bei Datei "${file.name}":`, err);
        errors.push({ fileName: file.name, message: err.message || "Unbekannter Fehler." });
      }
    }

    if (allExtractedClaims.length > 0) {
      const newItems: DebtItem[] = [];

      for (const item of allExtractedClaims) {
        for (const claim of item.claims) {
          const finalStatus = claim.status === "tituliert" ? "tituliert" : "offen";
          const finalPrincipal = typeof claim.principalAmount === "number" ? claim.principalAmount : parseFloat(claim.principalAmount || claim.amount) || 0;
          const finalInterestAmount = typeof claim.interestAmount === "number" ? claim.interestAmount : parseFloat(claim.interestAmount) || 0;
          const finalFeesAmount = typeof claim.feesAmount === "number" ? claim.feesAmount : parseFloat(claim.feesAmount) || 0;

          const finalAmount = typeof claim.amount === "number" ? claim.amount : parseFloat(claim.amount) || (finalPrincipal + finalInterestAmount + finalFeesAmount);

          const parsedOffers = (claim.offers || []).map((off: any) => ({
            id: "offer-" + Math.random().toString(36).substr(2, 9),
            amount: off.amount || 0,
            originalAmount: off.originalAmount || finalAmount,
            date: off.date || claim.titledDate || new Date().toISOString().split("T")[0],
            deadline: off.deadline || undefined,
            type: off.type === "installment" ? "installment" : "settlement",
            details: off.details || ""
          }));

          const generatedId = "debt-" + Math.random().toString(36).substr(2, 9);
          const newItem: DebtItem = {
            id: generatedId,
            creditorName: claim.creditorName || "Unbekannter Gläubiger",
            originalCreditor: claim.originalCreditor || undefined,
            debtCollector: claim.debtCollector || undefined,
            street: claim.street || "",
            city: claim.city || "",
            fileReference: claim.fileReference || "Unbekannt",
            amount: finalAmount,
            category: claim.category || "Konsum",
            status: finalStatus,
            createdAt: new Date().toISOString(),
            debtorName: profiles.find(p => p.id === activeProfile)?.name || "Maximilian Schmidt",
            principalAmount: finalPrincipal || undefined,
            interestAmount: finalInterestAmount || undefined,
            feesAmount: finalFeesAmount || undefined,
            titledWith: claim.titledWith || (finalStatus === "tituliert" ? "Gerichtlicher Vollstreckungsbescheid" : undefined),
            titledDate: claim.titledDate || undefined,
            mbPrincipal: claim.mbPrincipal || "",
            mbInterestArrears: claim.mbInterestArrears || "",
            mbCourtCosts: claim.mbCourtCosts || "",
            mbClaimantExpenses: claim.mbClaimantExpenses || "",
            mbExtraFees: claim.mbExtraFees || "",
            mbCalculatedInterest: claim.mbCalculatedInterest || "",
            mbCurrentInterest: claim.mbCurrentInterest || "",
            offers: parsedOffers.length > 0 ? parsedOffers : undefined,
            mostRecentPageNumber: claim.mostRecentPageNumber || undefined
          };
          newItems.push(newItem);
        }
      }

      // Bulk add directly to database with duplicate merging and background duplicate checks!
      setDebts(prev => {
        let updated = [...prev];

        const cleanRef = (ref: string) => {
          if (!ref) return "";
          return ref.toLowerCase().replace(/[^a-z0-9]/g, "");
        };

        const cleanName = (n: string) => {
          if (!n) return "";
          return n.toLowerCase()
            .replace(/[^a-z0-9a-öüäöüäß]/g, "")
            .replace(/(inkasso|gmbh|co|kg|ug|ag|and|und)/g, "")
            .trim();
        };

        const localDuplicateNotices: any[] = [];

        for (const newItem of newItems) {
          const cRef = cleanRef(newItem.fileReference);
          let matchIndex = -1;
          let matchType: "fileReference" | "creditor_amount" = "fileReference";

          // 1. Check exact/cleaned Aktenzeichen Match
          if (cRef && cRef.length > 3 && cRef !== "unbekannt") {
            matchIndex = updated.findIndex(d => cleanRef(d.fileReference) === cRef);
          }

          // 2. Check similar creditor name and close amount (percentage within 20% or absolute under 100€)
          if (matchIndex === -1 && newItem.creditorName) {
            const newItemCredShort = cleanName(newItem.creditorName);
            matchIndex = updated.findIndex(d => {
              if (!d.creditorName) return false;
              const existingCredShort = cleanName(d.creditorName);
              const nameMatch = newItemCredShort.length > 2 && existingCredShort.length > 2 &&
                (newItemCredShort.includes(existingCredShort) || existingCredShort.includes(newItemCredShort));
              if (nameMatch) {
                const diff = Math.abs(d.amount - newItem.amount);
                const pctDiff = diff / Math.max(d.amount, 1);
                return pctDiff < 0.20 || diff < 100;
              }
              return false;
            });
            if (matchIndex !== -1) {
              matchType = "creditor_amount";
            }
          }

          if (matchIndex !== -1) {
            const matchedDebt = updated[matchIndex];
            const existingOffers = matchedDebt.offers || [];
            const newOffersToAppend = (newItem.offers || []).filter(o => {
              return !existingOffers.some(eo => eo.amount === o.amount && eo.type === o.type);
            });

            if (matchedDebt.amount > newItem.amount && !existingOffers.some(eo => eo.amount === newItem.amount)) {
              newOffersToAppend.push({
                id: "offer-main-" + Math.random().toString(36).substr(2, 9),
                amount: newItem.amount,
                originalAmount: matchedDebt.amount,
                date: newItem.titledDate || new Date().toISOString().split("T")[0],
                type: "settlement",
                details: "Geringeres Angebot laut neuem Beleg"
              });
            }

            const dateNew = parseToTime(newItem.titledDate);
            const dateExisting = parseToTime(matchedDebt.titledDate || (matchedDebt.createdAt ? matchedDebt.createdAt.split("T")[0] : undefined));

            let actionText = "";

            if (dateNew < dateExisting && dateNew > 0 && dateExisting > 0) {
              // The incoming document is OLDER. Ignore core claim details, but keep offers
              updated[matchIndex] = {
                ...matchedDebt,
                offers: [...existingOffers, ...newOffersToAppend]
              };
              actionText = `Älteres Dokument (vom ${newItem.titledDate || "k.A."}) erkannt. Hauptforderung nicht überschrieben, um aktuellen Stand zu wahren. Neue gütliche Angebote (${newOffersToAppend.length} Stück) wurden hinzugefügt.`;
            } else if (dateNew > dateExisting && dateNew > 0) {
              // The incoming document is NEWER. Overwrite core fields!
              updated[matchIndex] = {
                ...matchedDebt,
                offers: [...existingOffers, ...newOffersToAppend],
                amount: newItem.amount,
                status: newItem.status,
                originalCreditor: newItem.originalCreditor || matchedDebt.originalCreditor,
                debtCollector: newItem.debtCollector || matchedDebt.debtCollector,
                street: newItem.street || matchedDebt.street,
                city: newItem.city || matchedDebt.city,
                category: newItem.category || matchedDebt.category,
                titledWith: newItem.titledWith || matchedDebt.titledWith,
                titledDate: newItem.titledDate || matchedDebt.titledDate,
                principalAmount: newItem.principalAmount || matchedDebt.principalAmount,
                interestAmount: newItem.interestAmount || matchedDebt.interestAmount,
                feesAmount: newItem.feesAmount || matchedDebt.feesAmount,
                mbPrincipal: newItem.mbPrincipal || matchedDebt.mbPrincipal,
                mbInterestArrears: newItem.mbInterestArrears || matchedDebt.mbInterestArrears,
                mbCourtCosts: newItem.mbCourtCosts || matchedDebt.mbCourtCosts,
                mbClaimantExpenses: newItem.mbClaimantExpenses || matchedDebt.mbClaimantExpenses,
                mbExtraFees: newItem.mbExtraFees || matchedDebt.mbExtraFees,
                mbCalculatedInterest: newItem.mbCalculatedInterest || matchedDebt.mbCalculatedInterest,
                mbCurrentInterest: newItem.mbCurrentInterest || matchedDebt.mbCurrentInterest
              };
              actionText = `Neuerer Beleg (datierter Brief vom ${newItem.titledDate || "k.A."}) erkannt. Die Kanzleidaten wurden von ehemals € ${matchedDebt.amount.toLocaleString("de-DE")} auf neue € ${newItem.amount.toLocaleString("de-DE")} hochgestuft u. aktualisiert.`;
            } else {
              // Same date or missing: merge safely
              updated[matchIndex] = {
                ...matchedDebt,
                offers: [...existingOffers, ...newOffersToAppend],
                originalCreditor: matchedDebt.originalCreditor || newItem.originalCreditor,
                debtCollector: matchedDebt.debtCollector || newItem.debtCollector,
                street: matchedDebt.street || newItem.street,
                city: matchedDebt.city || newItem.city,
                status: newItem.status === "tituliert" ? "tituliert" : matchedDebt.status,
                titledWith: matchedDebt.titledWith || newItem.titledWith,
                titledDate: matchedDebt.titledDate || newItem.titledDate,
                principalAmount: matchedDebt.principalAmount || newItem.principalAmount,
                interestAmount: matchedDebt.interestAmount || newItem.interestAmount,
                feesAmount: matchedDebt.feesAmount || newItem.feesAmount
              };
              actionText = `Mögliche Falldublette sicher zusammengeführt. Die Angebote wurden durch ${newOffersToAppend.length} neue gütliche Offerten ergänzt.`;
            }

            localDuplicateNotices.push({
              id: "notice-" + Math.random().toString(36).substr(2, 9),
              incomingName: newItem.creditorName,
              incomingRef: newItem.fileReference || "k.A.",
              incomingAmount: newItem.amount,
              existingName: matchedDebt.creditorName,
              existingRef: matchedDebt.fileReference || "k.A.",
              existingAmount: matchedDebt.amount,
              matchType: matchType,
              actionTaken: actionText
            });

          } else {
            updated = [newItem, ...updated];
          }
        }

        if (localDuplicateNotices.length > 0) {
          setTimeout(() => {
            setDuplicateNotices(prevNotices => [...localDuplicateNotices, ...prevNotices]);
          }, 50);
        }

        localStorage.setItem(`gesetzeslotse_debts_portfolio_${activeProfile}`, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("gesetzeslotse_debts_updated"));
        return updated;
      });

      // Pre-populate the manual input form with the first claim of the first file for responsive user feedback
      const firstClaimsList = allExtractedClaims[0].claims;
      const firstClaim = firstClaimsList[0];
      const firstFinalStatus = firstClaim.status === "tituliert" ? "tituliert" : "offen";
      const firstFinalPrincipal = typeof firstClaim.principalAmount === "number" ? firstClaim.principalAmount : parseFloat(firstClaim.principalAmount || firstClaim.amount) || 0;
      const firstFinalInterestAmount = typeof firstClaim.interestAmount === "number" ? firstClaim.interestAmount : parseFloat(firstClaim.interestAmount) || 0;
      const firstFinalFeesAmount = typeof firstClaim.feesAmount === "number" ? firstClaim.feesAmount : parseFloat(firstClaim.feesAmount) || 0;
      const firstFinalAmount = typeof firstClaim.amount === "number" ? firstClaim.amount : parseFloat(firstClaim.amount) || (firstFinalPrincipal + firstFinalInterestAmount + firstFinalFeesAmount);

      setCreditorName(firstClaim.creditorName || "");
      setOriginalCreditor(firstClaim.originalCreditor || "");
      setDebtCollector(firstClaim.debtCollector || "");
      setStreet(firstClaim.street || "");
      setCityAndZip(firstClaim.city || "");
      setFileReference(firstClaim.fileReference || "");
      setAmount(String(firstFinalAmount));
      setCategory(firstClaim.category || "Konsum");
      setStatus(firstFinalStatus);

      if (firstFinalStatus === "tituliert") {
        setPrincipalAmount(String(firstFinalPrincipal));
        setInterestAmount(String(firstFinalInterestAmount));
        setFeesAmount(String(firstFinalFeesAmount));
        setTitledWith(firstClaim.titledWith || "Gerichtlicher Vollstreckungsbescheid");
        setTitledDate(firstClaim.titledDate || "");

        setMbPrincipal(String(firstClaim.mbPrincipal || ""));
        setMbInterestArrears(String(firstClaim.mbInterestArrears || ""));
        setMbCourtCosts(String(firstClaim.mbCourtCosts || ""));
        setMbClaimantExpenses(String(firstClaim.mbClaimantExpenses || ""));
        setMbExtraFees(String(firstClaim.mbExtraFees || ""));
        setMbCalculatedInterest(String(firstClaim.mbCalculatedInterest || ""));
        setMbCurrentInterest(String(firstClaim.mbCurrentInterest || ""));
      }

      // Generate a detailed consolidated alert summary for the user
      const summaryText = allExtractedClaims.map(item => {
        const listStr = item.claims.map(c => {
          const detailParts = [];
          if (c.originalCreditor) detailParts.push(`Audf.: ${c.originalCreditor}`);
          detailParts.push(`Ref: ${c.fileReference || 'k.A.'}`);
          if (c.mostRecentPageNumber) {
            detailParts.push(`aktuellstes Schreiben auf Seite ${c.mostRecentPageNumber}`);
          }
          return `  • € ${(c.amount || 0).toLocaleString("de-DE", { minimumFractionDigits: 2 })} [${detailParts.join(" | ")}] (Gläubiger: ${c.creditorName})`;
        }).join("\n");
        return `Datei "${item.fileName}" (${item.claims.length} Forderung[en]):\n${listStr}`;
      }).join("\n\n");

      let errorHint = "";
      if (errors.length > 0) {
        errorHint = `\n\n⚠️ Folgende Dateifehler traten auf:\n` + errors.map(e => `• ${e.fileName}: ${e.message}`).join("\n");
      }

      alert(`Einlese-Vorgang abgeschlossen! Lukas hat alle Belege analysiert.\n\nForderungsaufstellungen erfolgreich eingepflegt:\n\n${summaryText}${errorHint}`);
    } else {
      const errorText = errors.map(e => `• ${e.fileName}: ${e.message}`).join("\n");
      alert(`Fehler beim Einlesen aller übermittelten Dateien:\n\n${errorText}`);
    }

    setIsAnalyzingDoc(false);
    setAnalyzedFileName(null);
    setBatchProgress(null);
  };

  const exportDebtListToCsv = () => {
    if (debts.length === 0) {
      alert("Es liegen keine Forderungen zum Exportieren vor.");
      return;
    }

    const headers = [
      "Gläubiger (bevorzugt)",
      "Original-Gläubiger",
      "Inkasso / Vertreter / Kanzlei",
      "Anschrift",
      "Aktenzeichen",
      "Hauptforderung (EUR)",
      "Zinsen (EUR)",
      "Nebenforderungen / Auslagen (EUR)",
      "Gesamtforderung / Balance (EUR)",
      "Insolvenz-Status gem. § 305",
      "Forderungskategorie",
      "System-Eintragung am",
      "Nächste Ratenfälligkeit",
      "Vollstreckungstitel-Typ",
      "Titeldatum"
    ];

    const rows = debts.map(item => {
      const addr = `${item.street || ""}, ${item.city || ""}`.trim().replace(/^,|,$/g, "").trim().replace(/"/g, '""');
      
      const formatNum = (num?: number) => {
        if (num === undefined) return "0,00";
        return num.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      const statusMap: Record<string, string> = {
        offen: "Offen / Ungeklärt",
        ratenzahlung: "Ratenzahlung aktiv",
        verhandlung: "In Verhandlung",
        tituliert: "Gerichtlich Tituliert",
        gescheitert: "Verhandlungen gescheitert"
      };

      return [
        `"${(item.creditorName || "").replace(/"/g, '""')}"`,
        `"${(item.originalCreditor || "").replace(/"/g, '""')}"`,
        `"${(item.debtCollector || "").replace(/"/g, '""')}"`,
        `"${addr}"`,
        `"${(item.fileReference || "").replace(/"/g, '""')}"`,
        `"${formatNum(item.principalAmount)}"`,
        `"${formatNum(item.interestAmount)}"`,
        `"${formatNum(item.feesAmount)}"`,
        `"${formatNum(item.amount)}"`,
        `"${statusMap[item.status] || item.status}"`,
        `"${item.category || "Konsum"}"`,
        `"${item.createdAt ? new Date(item.createdAt).toLocaleDateString("de-DE") : ""}"`,
        `"${item.nextInstallmentDate ? new Date(item.nextInstallmentDate).toLocaleDateString("de-DE") : ""}"`,
        `"${(item.titledWith || "").replace(/"/g, '""')}"`,
        `"${item.titledDate ? new Date(item.titledDate).toLocaleDateString("de-DE") : ""}"`
      ];
    });

    const csvContent = "\ufeff" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const profileName = profiles.find(p => p.id === activeProfile)?.name || "Mandant";
    const cleanProfileName = profileName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const formattedDate = new Date().toISOString().split("T")[0];
    
    link.href = url;
    link.setAttribute("download", `forderungstabelle_${cleanProfileName}_${formattedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const acceptSettlementOffer = (debtId: string, offerId: string, offerAmount: number, offerType: "settlement" | "installment") => {
    setDebts(prev => {
      const updated = prev.map(d => {
        if (d.id === debtId) {
          const originalAmt = d.amount;
          return {
            ...d,
            amount: offerAmount,
            principalAmount: offerType === "settlement" ? offerAmount : d.principalAmount,
            interestAmount: offerType === "settlement" ? 0 : d.interestAmount,
            feesAmount: offerType === "settlement" ? 0 : d.feesAmount,
            status: offerType === "installment" ? ("ratenzahlung" as const) : ("verhandlung" as const),
            nextInstallmentDate: offerType === "installment" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] : d.nextInstallmentDate,
            offers: (d.offers || []).filter(o => o.id !== offerId)
          };
        }
        return d;
      });
      localStorage.setItem(`gesetzeslotse_debts_portfolio_${activeProfile}`, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("gesetzeslotse_debts_updated"));
      return updated;
    });

    setShowLukasNotification(`Erfolg: Das gütliche Einigungsangebot über € ${offerAmount.toLocaleString("de-DE")} wurde gebucht. Der Forderungssaldo wurde herabgesetzt und der Status angepasst!`);
    setTimeout(() => {
      setShowLukasNotification("");
    }, 6000);
  };

  const runDeduplication = () => {
    if (debts.length <= 1) {
      setShowLukasNotification("Lukas-Abgleich: Der Abgleich benötigt mindestens zwei erfasste Forderungsposten.");
      setTimeout(() => setShowLukasNotification(""), 5000);
      return;
    }

    const cleanRef = (ref: string) => {
      if (!ref) return "";
      return ref.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    };

    const cleanName = (n: string) => {
      if (!n) return "";
      return n.toLowerCase()
        .replace(/[^a-z0-0a-öüäöüäß]/g, "")
        .replace(/(inkasso|gmbh|co|kg|ug|ag|and|und|deutschland|telefonic|service|solutions|finance|management|direct|gruppe|group)/g, "")
        .trim();
    };

    let updated = [...debts];
    let mergedCount = 0;
    const mergeSummaries: string[] = [];

    // Helper to evaluate if a debt item is nearly empty / a fragment
    const isNearlyEmpty = (d: DebtItem) => {
      const amt = d.amount || 0;
      const prin = d.principalAmount || 0;
      // If amount is 0, or very small (< 15) and has missing key fields like fileReference or has very little data, it's a fragment
      return amt < 15 || prin < 15 || !d.fileReference || d.fileReference === "unbekannt" || d.fileReference.trim() === "";
    };

    let changed = true;
    let passes = 0;

    while (changed && passes < 10) {
      changed = false;
      passes++;
      let i = 0;
      while (i < updated.length) {
        let j = i + 1;
        let merged = false;
        while (j < updated.length) {
          const d1 = updated[i];
          const d2 = updated[j];

          const ref1 = cleanRef(d1.fileReference);
          const ref2 = cleanRef(d2.fileReference);

          const name1 = cleanName(d1.creditorName || d1.debtCollector || "");
          const name2 = cleanName(d2.creditorName || d2.debtCollector || "");

          const orig1 = cleanName(d1.originalCreditor || "");
          const orig2 = cleanName(d2.originalCreditor || "");

          let isDuplicate = false;
          let reason = "";

          // 1. Exact reference code match
          if (ref1 && ref2 && ref1 === ref2 && ref1 !== "unbekannt" && ref1.length > 3) {
            isDuplicate = true;
            reason = `Gleiches Aktenzeichen (${d1.fileReference})`;
          }

          // 2. Head-to-Tail partial match with long references (e.g. LT0823937H vs LT0823937)
          if (!isDuplicate && ref1 && ref2 && ref1.length >= 6 && ref2.length >= 6) {
            if (ref1.includes(ref2) || ref2.includes(ref1)) {
              isDuplicate = true;
              reason = `Überschneidendes Aktenzeichen (${d1.fileReference} / ${d2.fileReference})`;
            }
          }

          const empty1 = isNearlyEmpty(d1);
          const empty2 = isNearlyEmpty(d2);

          // 3. One is HFG Inkasso (or similar) and has Drillisch as original, and the other is a Drillisch fragment with identical or missing AZ
          if (!isDuplicate) {
            const hasHfg1 = name1.includes("hfg") || name1.includes("inkasso");
            const hasHfg2 = name2.includes("hfg") || name2.includes("inkasso");

            const mentionsDrillisch1 = name1.includes("drillisch") || orig1.includes("drillisch");
            const mentionsDrillisch2 = name2.includes("drillisch") || orig2.includes("drillisch");

            if (mentionsDrillisch1 && mentionsDrillisch2) {
              // Both are drillisch related. Check if one is a nearly empty fragment, or if references match, or if amount is close
              const amtDiff = Math.abs((d1.amount || 0) - (d2.amount || 0));
              const sameOrEmptyAZ = !ref1 || !ref2 || ref1 === ref2 || ref1.includes(ref2) || ref2.includes(ref1);
              
              if (empty1 || empty2 || amtDiff < 50 || sameOrEmptyAZ) {
                isDuplicate = true;
                reason = `Doppelte Drillisch-Einträge (${empty1 || empty2 ? "Fragment bereinigt" : "Saldogleichheit"})`;
              }
            } else if ((hasHfg1 && mentionsDrillisch2) || (hasHfg2 && mentionsDrillisch1)) {
              // Cross relation: HFG Inkasso and Drillisch.
              // If they have the same or similar reference, or one has no reference, or one is a fragment.
              const sameOrEmptyAZ = !ref1 || !ref2 || ref1 === ref2 || ref1.includes(ref2) || ref2.includes(ref1);
              if (sameOrEmptyAZ || empty1 || empty2) {
                isDuplicate = true;
                reason = `Auftraggeber-Verbindung (HFG Inkasso und Drillisch zusammengeführt)`;
              }
            }
          }

          // 4. Fallback name containing matching + small amount difference or empty
          if (!isDuplicate && name1 && name2 && (name1.includes(name2) || name2.includes(name1)) && name1.length > 2) {
            const amtDiff = Math.abs((d1.amount || 0) - (d2.amount || 0));
            const sameOrEmptyAZ = !ref1 || !ref2 || ref1 === ref2 || ref1.includes(ref2) || ref2.includes(ref1);
            if (amtDiff < 100 || sameOrEmptyAZ || empty1 || empty2) {
              isDuplicate = true;
              reason = `Ähnlicher Gläubigername (${d1.creditorName} / ${d2.creditorName})`;
            }
          }

          if (isDuplicate) {
            // Determine who is primary and who is secondary
            let primary = d1;
            let secondary = d2;

            // Prefer the non-empty, larger, or better-referenced item
            if (empty1 && !empty2) {
              primary = d2;
              secondary = d1;
            } else if (!empty1 && empty2) {
              primary = d1;
              secondary = d2;
            } else if ((d1.amount || 0) < (d2.amount || 0)) {
              primary = d2;
              secondary = d1;
            }

            // Construct merged item
            const mergedItem = {
              ...primary,
              // Keep non-empty structures
              amount: primary.amount || secondary.amount || 0,
              principalAmount: primary.principalAmount || secondary.principalAmount || 0,
              interestAmount: primary.interestAmount || secondary.interestAmount || 0,
              feesAmount: primary.feesAmount || secondary.feesAmount || 0,
              fileReference: primary.fileReference && primary.fileReference !== "unbekannt" ? primary.fileReference : (secondary.fileReference || "LT0823937H"),
              originalCreditor: primary.originalCreditor || (cleanName(secondary.creditorName).includes("drillisch") ? "Drillisch Online GmbH" : (secondary.originalCreditor || "")),
              debtCollector: primary.debtCollector || (cleanName(secondary.creditorName).includes("hfg") ? "HFG Inkasso GmbH" : (secondary.debtCollector || "")),
              street: primary.street || secondary.street || "",
              city: primary.city || secondary.city || "",
              createdAt: primary.createdAt || secondary.createdAt,
              titledDate: primary.titledDate || secondary.titledDate || "",
              titledWith: primary.titledWith || secondary.titledWith || "",
              category: primary.category || secondary.category || "Konsum",
              status: primary.status !== "offen" ? primary.status : secondary.status,
              offers: [...(primary.offers || [])]
            };

            // If the merged item's creditorName or originalCreditor is Drillisch and debtCollector is empty, and we have info about HFG, enrich it
            if (cleanName(mergedItem.creditorName).includes("hfg") && !mergedItem.originalCreditor) {
              mergedItem.originalCreditor = "Drillisch Online GmbH";
            } else if (cleanName(mergedItem.creditorName).includes("drillisch") && !mergedItem.debtCollector) {
              mergedItem.debtCollector = "HFG Inkasso GmbH";
              mergedItem.creditorName = "HFG Inkasso (Drillisch)";
            }

            // Also merge offers if present on secondary
            if (secondary.offers && secondary.offers.length > 0) {
              const existingOfferIds = new Set(mergedItem.offers.map(o => o.id));
              secondary.offers.forEach(o => {
                if (!existingOfferIds.has(o.id)) {
                  mergedItem.offers.push(o);
                }
              });
            }

            // Remove the duplicate other, update primary
            const pIdx = updated.indexOf(primary);
            updated[pIdx] = mergedItem;
            
            const sIdx = updated.indexOf(secondary);
            updated.splice(sIdx, 1);

            mergedCount++;
            mergeSummaries.push(`${mergedItem.creditorName || "Gläubiger"} (${reason})`);
            
            merged = true;
            changed = true;
            break;
          }
          j++;
        }
        if (merged) break;
        i++;
      }
    }

    // Clean up any remaining completely empty fragments (less than € 5 and no files)
    const initialLen = updated.length;
    updated = updated.filter(d => {
      const isCompletelyEmpty = (!d.amount || d.amount <= 1) && (!d.principalAmount || d.principalAmount <= 1) && (!d.fileReference || d.fileReference === "unbekannt") && (cleanName(d.creditorName).includes("drillisch") || cleanName(d.creditorName) === "");
      if (isCompletelyEmpty) {
        mergedCount++;
        return false;
      }
      return true;
    });

    if (mergedCount > 0) {
      setDebts(updated);
      localStorage.setItem(`gesetzeslotse_debts_portfolio_${activeProfile}`, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("gesetzeslotse_debts_updated"));
      
      const briefSummary = mergeSummaries.length > 0 
        ? `${mergedCount} Dublette(n) konsolidiert: ${mergeSummaries.slice(0, 2).join(", ")}${mergeSummaries.length > 2 ? "..." : ""}` 
        : `${mergedCount} leere Fragmente bereinigt`;

      setShowLukasNotification(`Lukas-Bereinigung erfolgreich! ${briefSummary}. Der Beleg-Bestand wurde reorganisiert.`);
    } else {
      setShowLukasNotification("Lukas-Bereinigung: Es wurden keine Duplikate oder leeren Fragmente im aktuellen Datenbestand gefunden.");
    }

    setTimeout(() => {
      setShowLukasNotification("");
    }, 8500);
  };

  const handleDirectoryFileUpload = async (file: File) => {
    handleBatchDirectoryFilesUpload([file]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleBatchDirectoryFilesUpload(Array.from(files));
    }
  };

  // Handle manual submit
  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditorName.trim()) {
      alert("Bitte geben Sie den Namen des Gläubigers an.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Bitte tragen Sie eine gültige Schuldenhöhe in Euro ein.");
      return;
    }

    let finalPrincipal = parsedAmount;
    let finalInterestAmount = 0;
    let finalFeesAmount = 0;

    if (status === "tituliert") {
      finalPrincipal = parseFloat(mbPrincipal) || 0;
      finalInterestAmount = (parseFloat(mbInterestArrears) || 0) + (parseFloat(mbCalculatedInterest) || 0) + (parseFloat(mbCurrentInterest) || 0);
      finalFeesAmount = (parseFloat(mbCourtCosts) || 0) + (parseFloat(mbClaimantExpenses) || 0) + (parseFloat(mbExtraFees) || 0);
    }

    const calculatedTotal = status === "tituliert" ? (finalPrincipal + finalInterestAmount + finalFeesAmount) : parsedAmount;

    const newItem: DebtItem = {
      id: "debt-" + Math.random().toString(36).substr(2, 9),
      creditorName,
      originalCreditor: originalCreditor.trim() ? originalCreditor.trim() : undefined,
      debtCollector: debtCollector.trim() ? debtCollector.trim() : undefined,
      street,
      city: cityAndZip,
      fileReference: fileReference || "Unbekannt",
      amount: calculatedTotal,
      category,
      status,
      nextInstallmentDate: nextInstallmentDate || undefined,
      failureDate: status === "gescheitert" ? failureDate || new Date().toISOString().split("T")[0] : undefined,
      failureReason: status === "gescheitert" ? failureReason : undefined,
      principalAmount: status === "tituliert" && finalPrincipal ? finalPrincipal : undefined,
      interestAmount: status === "tituliert" ? finalInterestAmount : undefined,
      feesAmount: status === "tituliert" && finalFeesAmount ? finalFeesAmount : undefined,
      titledWith: status === "tituliert" ? titledWith || undefined : undefined,
      titledDate: status === "tituliert" ? titledDate || undefined : undefined,
      debtorName: profiles.find(p => p.id === activeProfile)?.name || "Maximilian Schmidt",
      createdAt: new Date().toISOString()
    };

    const updated = [newItem, ...debts];
    savePortfolioToStorage(updated);

    // Reset Form
    setCreditorName("");
    setOriginalCreditor("");
    setDebtCollector("");
    setStreet("");
    setCityAndZip("");
    setAmount("");
    setFileReference("");
    setCategory("Konsum");
    setStatus("offen");
    setNextInstallmentDate("");
    setFailureDate("");
    setFailureReason("Abschlägige Antwort (Ablehnung)");
    setPrincipalAmount("");
    setInterestAmount("");
    setFeesAmount("");
    setTitledWith("Vollstreckungsbescheid");
    setTitledDate("");
    setMbPrincipal("");
    setMbInterestArrears("");
    setMbCourtCosts("");
    setMbClaimantExpenses("");
    setMbExtraFees("");
    setMbCalculatedInterest("");
    setMbCurrentInterest("");
  };

  // Delete item
  const handleDeleteDebt = (id: string) => {
    const updated = debts.filter(d => d.id !== id);
    savePortfolioToStorage(updated);
  };

  // Pre-fill Letter generator
  const transferToLetterGenerator = (item: DebtItem) => {
    const isTituliert = item.status === "tituliert";
    // Generate draft data inside localStorage and announce
    const draftData = {
      creditorName: item.creditorName,
      creditorStreet: item.street,
      creditorCity: item.city,
      fileReference: item.fileReference,
      debtAmount: item.amount.toFixed(2),
      templateType: isTituliert ? "brief_gerichtsvollzieher" : "ratenzahlung"
    };
    localStorage.setItem("gesetzeslotse_letter_draft", JSON.stringify(draftData));
    
    // Dispatches a state update to Brief-Generator tab seamlessly
    const customEvent = new CustomEvent("apply_draft_to_letter", { detail: draftData });
    window.dispatchEvent(customEvent);

    // Switch tab to "briefe" automatically for instant flow
    window.dispatchEvent(new CustomEvent("set_active_tab", { detail: "briefe" }));
  };

  // Professional PDF Export Generator using jsPDF
  const downloadPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Default to Helvetica font
      doc.setFont("helvetica", "normal");

      // Draw top header colored ribbon in Slate
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 8, "F");

      // Brand Title and Subheader
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text("GESETZESLOTSE", 15, 22);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(22);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("BERLIN", 83, 22);

      // Section tag
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(220, 38, 38); // red-600
      doc.text("STAATLICH ANERKANNTE BERATUNGSSTELLE GEMÄSS § 305 INSO", 15, 27);

      // Horizontal separator line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(15, 30, 195, 30);

      // Document title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text("Gesamt-Forderungsaufstellung & Schuldenbilanz", 15, 40);

      // Date stamp right aligned
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      const formattedDate = new Date().toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      doc.text(`Erstellungsdatum: ${formattedDate} Uhr`, 195, 40, { align: "right" });

      // Descriptive Intro text block
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // slate-600
      const introText = "Dieses Dokument dient als amtliche und strukturierte Erfassung aller offenen Verbindlichkeiten. Sie liefert die rechtliche Grundlage für schuldenmindernde Vergleiche, Ratenstopps sowie die Einleitung außergerichtlicher Einigungen mit Ihren Gläubigern in Zusammenarbeit mit dem Gesetzeslotsen Berlin.";
      const splittedIntro = doc.splitTextToSize(introText, 180);
      doc.text(splittedIntro, 15, 46);

      // Table Header position
      let y = 60;
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(15, y, 180, 8, "F");

      // Draw header text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Gläubiger / Aktenzeichen", 18, y + 5.5);
      doc.text("Kategorie", 85, y + 5.5);
      doc.text("Vollstreckungsstatus", 115, y + 5.5);
      doc.text("Fälligkeit / Frist", 150, y + 5.5);
      doc.text("Betrag (€)", 192, y + 5.5, { align: "right" });

      // Clean border below header row
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.4);
      doc.line(15, y + 8, 195, y + 8);

      y += 8;

      // Render Debt rows iteratively
      debts.forEach((debt) => {
        // Page breaking protection
        if (y > 245) {
          doc.addPage();
          // Draw header ribbon on new page
          doc.setFillColor(15, 23, 42);
          doc.rect(0, 0, 210, 8, "F");
          y = 20;

          // Repeat Table headers
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y, 180, 8, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          doc.text("Gläubiger / Aktenzeichen", 18, y + 5.5);
          doc.text("Kategorie", 85, y + 5.5);
          doc.text("Vollstreckungsstatus", 115, y + 5.5);
          doc.text("Fälligkeit / Frist", 150, y + 5.5);
          doc.text("Betrag (€)", 192, y + 5.5, { align: "right" });

          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.4);
          doc.line(15, y + 8, 195, y + 8);
          y += 8;
        }

        // Creditor and File reference column
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42); // slate-900
        const nameText = debt.creditorName.length > 32 ? debt.creditorName.substring(0, 30) + "..." : debt.creditorName;
        doc.text(nameText, 18, y + 5.5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`Ref: ${debt.fileReference || "N/A"}`, 18, y + 9.5);

        // Category/Class column
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text(debt.category || "Sonstiges", 85, y + 6.5);

        // Current status column
        let displayStatus = "Offen";
        if (debt.status === "tituliert") {
          displayStatus = "GERICHTLICH TITULIERT";
          doc.setFont("helvetica", "bold");
          doc.setTextColor(220, 38, 38); // Red color accent for high risk
        } else if (debt.status === "ratenzahlung") {
          displayStatus = "Ratenzahlung";
          doc.setFont("helvetica", "normal");
          doc.setTextColor(5, 150, 105); // Green color
        } else if (debt.status === "verhandlung") {
          displayStatus = "In Verhandlung";
          doc.setFont("helvetica", "normal");
          doc.setTextColor(79, 70, 229); // Indigo color
        } else {
          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85);
        }
        doc.text(displayStatus, 115, y + 6.5);

        // Fälligkeitsdaten column
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        const formatDueDate = debt.nextInstallmentDate
          ? new Date(debt.nextInstallmentDate).toLocaleDateString("de-DE")
          : "Keine Frist";
        doc.text(formatDueDate, 150, y + 6.5);

        // Debt amount column (right aligned)
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(`€ ${debt.amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 192, y + 6.5, { align: "right" });

        // Thin row separator line
        doc.setDrawColor(241, 245, 249); // slate-100
        doc.setLineWidth(0.3);
        doc.line(15, y + 11.5, 195, y + 11.5);

        y += 11.5;
      });

      // Total Summariesections
      if (y > 210) {
        doc.addPage();
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 8, "F");
        y = 20;
      }

      y += 5;
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(15, y, 180, 24, "F");
      doc.setDrawColor(30, 41, 59); // slate-800
      doc.setLineWidth(0.5);
      doc.line(15, y, 15, y + 24); // Left border accent line
      doc.line(15, y, 195, y); // Top border
      doc.line(15, y + 24, 195, y + 24); // Bottom border

      // Summary label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("FORDEUNGSBILANZ-ZUSAMMENFASSUNG", 20, y + 6.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Anzahl erfasster Gläubiger-Posten: ${debts.length}`, 20, y + 13);
      doc.text(`Davon gerichtlich titulierte Forderungen: ${debts.filter(d => d.status === "tituliert").length}`, 20, y + 18.5);

      // Huge Total Sum Display
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text("GESAMTE FORDERUNGSSUMME:", 105, y + 14);

      doc.setFont("helvetica", "extrabold");
      doc.setFontSize(15);
      doc.setTextColor(220, 38, 38); // High contrasting red
      doc.text(`€ ${totalSum.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 192, y + 14, { align: "right" });

      y += 32;

      // What-If Planungsrechner section
      const parsedRate = parseFloat(wunschrate);
      if (!isNaN(parsedRate) && parsedRate > 0) {
        if (y > 215) {
          doc.addPage();
          doc.setFillColor(15, 23, 42);
          doc.rect(0, 0, 210, 8, "F");
          y = 20;
        }

        const monthsNormal = Math.ceil(totalSum / parsedRate);
        const yearsNormal = (monthsNormal / 12).toFixed(1);
        const discountedTotal = totalSum * 0.6;
        const monthsSpecial = Math.ceil(discountedTotal / parsedRate);
        const yearsSpecial = (monthsSpecial / 12).toFixed(1);
        const savedMoney = totalSum * 0.4;

        doc.setFillColor(240, 253, 244); // emerald-50 bg
        doc.rect(15, y, 180, 28, "F");
        doc.setDrawColor(16, 185, 129); // emerald-500 border
        doc.setLineWidth(0.4);
        doc.rect(15, y, 180, 28);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(6, 95, 70); // emerald-800
        doc.text(`Vergleichsprognose bei einer gesteuerten Monatsrate von € ${parsedRate.toLocaleString("de-DE")} / Monat:`, 20, y + 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(6, 95, 70);
        doc.text(`• Szenario A: Eigenregie (Komplettzahlung) -> ca. ${monthsNormal} Monate (${yearsNormal} Jahre) Tilgungsdauer`, 20, y + 11.5);
        doc.text(`• Szenario B: Vergleich mit Gesetzeslotse (40% Schuldenerlass) -> ca. ${monthsSpecial} Monate (${yearsSpecial} Jahre) Tilgungsdauer`, 20, y + 16.5);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(5, 150, 105); // emerald-600
        doc.text(`Durch Zins-Stopp & Vergleich sparen Sie schätzungsweise: ca. € ${savedMoney.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, y + 22.5);

        y += 36;
      }

      // Legal disclaimer
      if (y > 235) {
        doc.addPage();
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 8, "F");
        y = 20;
      }

      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      const legalText = "HINWEIS: Dieses Schreiben stellt keine steuerrechtliche oder formelle juristische Beratung im Einzelfall dar, sondern dokumentiert mathematische Schätzungen auf Grundlage Ihrer eigenen Eingaben. Zur rechtssicheren Vertretung gegenüber Ihren Inkassogläubigern und Rechtsanwälten kontaktieren Sie bitte die zertifizierten Verhandlungsberater des Gesetzeslotsen Berlin.";
      const splittedLegal = doc.splitTextToSize(legalText, 180);
      doc.text(splittedLegal, 15, y);

      y += 18;

      // Bottom signature lines
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.3);
      doc.line(15, y + 12, 85, y + 12); // Client line
      doc.line(125, y + 12, 195, y + 12); // Office line

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Ort, Datum & Unterschrift Mandant / Betroffener", 15, y + 15.5);
      doc.text("Akten-Prüfstempel / Gesetzeslotse BERLIN", 125, y + 15.5);

      // Trigger automatic download
      doc.save(`Verbindlichkeiten_Aufstellung_Gesetzeslotse_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Fehler bei der PDF-Erstellung. Bitte laden Sie die Seite neu.");
    }
  };

  // CSV Parsing and Processing Logic
  const parseCsvText = (text: string) => {
    if (!text || !text.trim()) {
      alert("Die hochgeladene Datei oder der eingegebene Text ist leer.");
      return;
    }
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    // Detect separator
    let sep = ";";
    const firstLine = lines[0];
    if (firstLine.includes(",")) {
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      if (commaCount > semicolonCount) {
        sep = ",";
      }
    } else if (firstLine.includes("\t")) {
      sep = "\t";
    }

    setCsvSep(sep);

    // Parse all rows
    const allParsedLines = lines.map(line => {
      const cols: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === sep && !inQuotes) {
          cols.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      cols.push(current.trim());
      return cols;
    });

    const rawHeaders = allParsedLines[0].map(h => h.replace(/["']/g, "").trim());
    const lowerHeaders = rawHeaders.map(h => h.toLowerCase());
    
    setCsvHeaders(rawHeaders);
    setCsvLines(allParsedLines.slice(1));

    // Try to auto-map indexes based on keywords
    const creditorIndex = lowerHeaders.findIndex(h => h.includes("gläubiger") || h.includes("glaubiger") || h.includes("name") || h.includes("creditor") || h.includes("firma"));
    const amountIndex = lowerHeaders.findIndex(h => h.includes("summe") || h.includes("betrag") || h.includes("amount") || h.includes("höhe") || h.includes("hoehe") || h.includes("wert"));
    const refIndex = lowerHeaders.findIndex(h => h.includes("aktenzeichen") || h.includes("ref") || h.includes("file") || h.includes("nummer"));
    const categoryIndex = lowerHeaders.findIndex(h => h.includes("kategorie") || h.includes("category") || h.includes("art") || h.includes("klasse"));
    const statusIndex = lowerHeaders.findIndex(h => h.includes("status") || h.includes("stufe"));
    const dateIndex = lowerHeaders.findIndex(h => h.includes("fälligkeit") || h.includes("faelligkeit") || h.includes("date") || h.includes("termin") || h.includes("rate") || h.includes("frist"));

    const initialMapping = {
      creditorName: creditorIndex !== -1 ? creditorIndex : 0,
      amount: amountIndex !== -1 ? amountIndex : (allParsedLines[0].length > 1 ? 1 : -1),
      fileReference: refIndex !== -1 ? refIndex : -1,
      category: categoryIndex !== -1 ? categoryIndex : -1,
      status: statusIndex !== -1 ? statusIndex : -1,
      nextInstallmentDate: dateIndex !== -1 ? dateIndex : -1,
    };

    setColumnMapping(initialMapping);
    setIsCsvModalOpen(true);
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCsvText(text);
      e.target.value = ""; // reset
    };
    reader.readAsText(file);
  };

  const loadSampleCsv = () => {
    const sample = `Gläubiger;Summe;Aktenzeichen;Kategorie;Status;Fälligkeit\nLowell Inkasso GmbH;240,50;LOW-29100;Konsum;offen;05.06.2026\ncoeo Inkasso GmbH;180,00;COE-11910;Telekommunikation;ratenzahlung;12.06.2026\nEOS Investment;890,20;EOS-8812;Konsum;tituliert;\nKaufland Onlineshop;55,10;KAUF-982;Konsum;offen;18.06.2026\nStadtwerke Berlin;620,00;SWB-2026;Energie & Strom;verhandlung;`;
    parseCsvText(sample);
  };

  const handleToggleSelectCsvItem = (id: string) => {
    setCsvPreviewItems(prev =>
      prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item)
    );
  };

  const handleToggleSelectAllCsvItems = () => {
    const allSelected = csvPreviewItems.every(x => x.selected);
    setCsvPreviewItems(prev =>
      prev.map(item => ({ ...item, selected: !allSelected }))
    );
  };

  const handleConfirmCsvImport = () => {
    const checked = csvPreviewItems.filter(x => x.selected);
    if (checked.length === 0) {
      alert("Bitte wählen Sie mindestens einen Posten zum Übernehmen aus.");
      return;
    }

    const newDebts: DebtItem[] = checked.map(c => ({
      id: c.id,
      creditorName: c.creditorName,
      street: c.street,
      city: c.city,
      fileReference: c.fileReference,
      amount: c.amount,
      category: c.category,
      status: c.status,
      nextInstallmentDate: c.nextInstallmentDate,
      createdAt: new Date().toISOString()
    }));

    const updated = [...newDebts, ...debts];
    savePortfolioToStorage(updated);
    setIsCsvModalOpen(false);
    setCsvPreviewItems([]);
    
    setShowLukasNotification(`Lukas: Fantastisch! Ich habe ${newDebts.length} importierte Forderungen über insgesamt € ${newDebts.reduce((s, x) => s + x.amount, 0).toLocaleString("de-DE")} in die Übersicht übernommen.`);
    setTimeout(() => {
      setShowLukasNotification("");
    }, 6000);
  };

  // Calculation summaries
  const totalSum = debts.reduce((sum, item) => sum + item.amount, 0);
  const badDebtsCount = debts.filter(d => d.status === "tituliert").length;
  const inNegotiationCount = debts.filter(d => d.status === "verhandlung").length;
  const debtsWithOffersCount = debts.filter(d => d.offers && d.offers.length > 0).length;
  const urgentDebts = debts.filter(d => {
    if (!d.nextInstallmentDate) return false;
    const days = getDaysRemaining(d.nextInstallmentDate);
    return days !== null && days <= 3;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-205 p-5 md:p-6 dark:border-slate-850 dark:bg-slate-900 shadow-sm space-y-6" id="schulden-aufstellung-box">
      
      {/* Title section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <span className="text-[10px] bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 font-bold px-2 py-0.5 rounded tracking-wide uppercase">
            Privatinsolvenz-Vorsorge & Selbsthilfe
          </span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1.5 flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            Schulden-Auflistung & Forderungsaufstellung
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Geben Sie alle Gläubiger-Forderungen taggenau an. Dieses Werkzeug strukturiert Ihre Briefe und vergleicht Ihren Zinsanspruch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Lukas Empathic voice guidance button */}
          <button 
            onClick={speakSummaryByLukas}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              isSpeaking 
                ? "bg-red-50 text-red-600 border-red-250 animate-pulse dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/55" 
                : "bg-slate-900 text-white border-transparent hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            }`}
            title="Lukas liest Ihnen eine Empfehlung zu Ihrer finanziellen Lage vor"
            id="lukas-speech-summary-btn"
          >
            {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            <span>Lukas Audio-Bericht</span>
          </button>
        </div>
      </div>

      {/* Dynamic Profile/Debtor Management Workspace Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md transition-all">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <User className="h-5 w-5 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Schuldner-Stammdatenverwaltung</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-450">
              Verwalten Sie Ihre Klienten, bearbeiten Sie personenbezogene Stammdaten oder legen Sie neue Profile für die automatisierte Scheiternsbescheinigung an.
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => setShowCreateProfileModal(true)}
              className="flex-1 md:flex-initial py-2 px-4 bg-slate-900 hover:bg-slate-850 dark:bg-white dark:hover:bg-slate-50 dark:text-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
              id="btn-create-debtor-profile"
            >
              <UserPlus className="h-3.5 w-3.5 shrink-0" />
              <span>+ Schuldner anlegen</span>
            </button>
            <button
              onClick={openEditModal}
              className="flex-1 md:flex-initial py-2 px-4 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              id="btn-edit-debtor-profile"
            >
              <Edit className="h-3.5 w-3.5 shrink-0" />
              <span>✎ Stammdaten bearbeiten</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active profiles list panel */}
          <div className="lg:col-span-1 border-r border-slate-100 dark:border-slate-800 pr-0 lg:pr-6 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest font-mono">Klienten-Aktenauswahl:</span>
            <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1">
              {profiles.map((p) => {
                const isActive = p.id === activeProfile;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isActive
                        ? "bg-slate-50 dark:bg-slate-800/40 border-slate-900/15 dark:border-white/10"
                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-850 hover:bg-slate-50/50"
                    }`}
                  >
                    <button
                      onClick={() => setActiveProfile(p.id)}
                      className="flex-1 flex items-center gap-2.5 text-left cursor-pointer"
                      id={`profile-select-${p.id}`}
                    >
                      <div className={`p-1.5 rounded-lg ${isActive ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        <User className="h-3.5 w-3.5 shrink-0" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-850 dark:text-slate-150 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-450 font-mono">Geb: {p.dob}</p>
                      </div>
                    </button>
                    {p.id !== "schmidt" && p.id !== "weber" && (
                      <button
                        onClick={() => handleDeleteProfile(p.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer shrink-0 ml-1"
                        title="Schuldner beenden"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active profile dossier dashboard */}
          <div className="lg:col-span-2 bg-slate-50/55 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-855 p-4 rounded-2xl flex flex-col justify-between">
            {(() => {
              const current = profiles.find(p => p.id === activeProfile) || {
                id: activeProfile,
                name: "Unbekannt",
                dob: "-",
                pob: "-",
                address: "-",
                competentCourt: "-"
              };
              return (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono">
                      Akte: {current.id.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      AKTIV GESTEUERT
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono block">Name / Mandant</span>
                      <p className="text-sm font-bold text-slate-850 dark:text-slate-100">{current.name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono block">Geburtsdatum & -ort</span>
                      <p className="text-sm font-bold text-slate-850 dark:text-slate-100">{current.dob} ({current.pob || "nicht hinterlegt"})</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono block">Anschrift</span>
                      <p className="text-xs text-slate-800 dark:text-slate-200 mt-0.5">{current.address || "keine Anschrift hinterlegt"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono block">Zuständiges Amtsgericht (Insolvenzgericht)</span>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-250 mt-0.5 font-mono">{current.competentCourt || "nicht bestimmt"}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Create Profile Modal */}
      {showCreateProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-105 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-slate-900 dark:text-white" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Neuen Schuldner anlegen</h3>
              </div>
              <button
                onClick={() => setShowCreateProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono block mb-1">
                  Voller Name (z.B. für Amtsgericht & Scheiternbescheinigung) *
                </label>
                <input
                  type="text"
                  required
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 dark:focus:ring-white dark:focus:border-white text-slate-900 dark:text-white placeholder:text-slate-450"
                  placeholder="z.B. Dr. Peter Müller"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono block mb-1">
                    Geburtsdatum *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProfileDob}
                    onChange={(e) => setNewProfileDob(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 dark:focus:ring-white dark:focus:border-white text-slate-900 dark:text-white placeholder:text-slate-450"
                    placeholder="DD.MM.YYYY"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono block mb-1">
                    Geburtsort *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProfilePob}
                    onChange={(e) => setNewProfilePob(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 dark:focus:ring-white dark:focus:border-white text-slate-900 dark:text-white placeholder:text-slate-455"
                    placeholder="z.B. Berlin"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono block mb-1">
                  Vollständige Anschrift (Straße, PLZ, Ort) *
                </label>
                <input
                  type="text"
                  required
                  value={newProfileAddress}
                  onChange={(e) => setNewProfileAddress(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 dark:focus:ring-white dark:focus:border-white text-slate-900 dark:text-white placeholder:text-slate-450"
                  placeholder="z.B. Hauptstraße 12, 10827 Berlin"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono block mb-1">
                  Zuständiges Insolvenzgericht (Amtsgericht Berlin) *
                </label>
                <select
                  value={newProfileCourt}
                  onChange={(e) => setNewProfileCourt(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 dark:focus:ring-white dark:focus:border-white text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="Amtsgericht Wedding - Insolvenzgericht -">Amtsgericht Wedding (Wedding / Reinickendorf / Pankow)</option>
                  <option value="Amtsgericht Tempelhof-Kreuzberg - Insolvenzgericht -">Amtsgericht Tempelhof-Kreuzberg (Kreuzberg / Tempelhof / Neukölln)</option>
                  <option value="Amtsgericht Charlottenburg - Insolvenzgericht -">Amtsgericht Charlottenburg (Charlottenburg / Wilmersdorf)</option>
                  <option value="Amtsgericht Schöneberg - Insolvenzgericht -">Amtsgericht Schöneberg (Schöneberg / Steglitz-Zehlendorf)</option>
                  <option value="Amtsgericht Lichtenberg - Insolvenzgericht -">Amtsgericht Lichtenberg (Lichtenberg / Marzahn-Hellersdorf)</option>
                  <option value="Amtsgericht Neukölln - Insolvenzgericht -">Amtsgericht Neukölln</option>
                  <option value="Amtsgericht Spandau - Insolvenzgericht -">Amtsgericht Spandau</option>
                  <option value="Amtsgericht Köpenick - Insolvenzgericht -">Amtsgericht Köpenick (Treptow-Köpenick / Alt-Glienicke)</option>
                </select>
              </div>

              <div className="flex gap-2.5 items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateProfileModal(false)}
                  className="py-2 px-4 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-slate-900 hover:bg-slate-850 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  Jetzt Schuldner anlegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inkasso-Vergleichs- & Empfehlung-Modal */}
      {showRecommendationsModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-250">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-150 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Sparkles className="h-4.5 w-4.5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Gütlicher Einigungs- & Vergleichs-Rechner
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">
                    Soll-Ist-Abgleich aller gelesenen Inkasso-Vergleichsangebote mit der aktuellen Kanzlei-Minderungsquote
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRecommendationsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Metrics Dashboard */}
            {(() => {
              const debtsWithOffers = debts.filter(d => d.offers && d.offers.length > 0);
              let totalCreditorBalance = 0;
              let totalOfferBalance = 0;

              debtsWithOffers.forEach(d => {
                if (d.offers && d.offers.length > 0) {
                  totalCreditorBalance += d.amount;
                  totalOfferBalance += d.offers[0].amount;
                }
              });

              const totalPotentialSavings = totalCreditorBalance - totalOfferBalance;
              const totalPercentageReduction = totalCreditorBalance > 0 ? (totalPotentialSavings / totalCreditorBalance) * 100 : 0;

              if (debtsWithOffers.length === 0) {
                return (
                  <div className="text-center py-12 px-6 flex flex-col items-center justify-center space-y-3 flex-1 overflow-y-auto">
                    <Sparkles className="h-10 w-10 text-slate-300 dark:text-slate-705 animate-bounce mb-2" />
                    <p className="text-xs font-bold text-slate-850 dark:text-slate-150">
                      Keine gütlichen Angebote im Beleg-Bestand gefunden
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md leading-normal">
                      Aktuell sind keine Vergleichsofferten für diesen Mandanten hinterlegt. Nutzen Sie den <b>"Schuhkarton"-Belegscanner</b>, um Inkassobriefe oder Mahnschreiben mit enthaltenen Einigungsangeboten (Angebotsbeträgen) hochzuladen. Lukas liest diese automatisch heraus und listet sie hier vergleichend auf.
                    </p>
                  </div>
                );
              }

              return (
                <div className="flex-1 overflow-y-auto py-5 space-y-5">
                  
                  {/* Stats Cards Section */}
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="bg-slate-50 dark:bg-slate-950/20 p-3.5 rounded-xl border border-slate-150 dark:border-slate-850">
                      <span className="text-[9px] text-slate-450 dark:text-slate-500 uppercase font-bold tracking-wider block">Betroffenes Volumen</span>
                      <span className="text-base font-black text-slate-900 dark:text-white mt-1 block font-mono">
                        € {totalCreditorBalance.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-slate-400 mt-1 block font-medium">{debtsWithOffers.length} Gläubiger mit Angebot</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/20 p-3.5 rounded-xl border border-slate-150 dark:border-slate-850">
                      <span className="text-[9px] text-slate-450 dark:text-slate-500 uppercase font-bold tracking-wider block font-mono">Vergleichssaldo</span>
                      <span className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1 block font-mono">
                        € {totalOfferBalance.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-indigo-500 dark:text-indigo-400 font-semibold mt-1 block">Reduzierte Schuldsumme</span>
                    </div>

                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-150 dark:border-emerald-900/50">
                      <span className="text-[9px] text-emerald-800 dark:text-emerald-400 uppercase font-bold tracking-wider block">Gesamtersparnis</span>
                      <span className="text-base font-black text-emerald-700 dark:text-emerald-400 mt-1 block font-mono">
                        € {totalPotentialSavings.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-emerald-600 font-bold mt-1 block">Sofortige Entlastung</span>
                    </div>

                    <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-150 dark:border-amber-900/50">
                      <span className="text-[9px] text-amber-800 dark:text-amber-400 uppercase font-bold tracking-wider block">Rabatt-Quote</span>
                      <span className="text-base font-black text-amber-600 dark:text-amber-400 mt-1 block font-mono">
                        {totalPercentageReduction.toFixed(1)} %
                      </span>
                      <span className="text-[9px] text-amber-600 font-bold mt-1 block">Ersparnis-Vorteil</span>
                    </div>
                  </div>

                  {/* Recommendations Table / List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                      Einzelangebote und Handlungsempfehlungen
                    </h4>

                    <div className="divide-y divide-slate-150 dark:divide-slate-800 border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/20 dark:bg-slate-950/10">
                      {debtsWithOffers.map(debt => {
                        return (debt.offers || []).map(offer => {
                          const savings = debt.amount - offer.amount;
                          const savingsPct = debt.amount > 0 ? (savings / debt.amount) * 100 : 0;

                          let recommendBadge = "";
                          let recommendText = "";
                          let recommendDesc = "";
                          
                          if (offer.type === "installment") {
                            recommendBadge = "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
                            recommendText = "Kreditschonende Ratenzahlung";
                            recommendDesc = "Zahlungsschonende Strukturierung zur Absicherung bei kleinem Budget. Sichert Gläubigergeduld.";
                          } else if (savingsPct >= 40) {
                            recommendBadge = "bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900";
                            recommendText = "Dringend Empfohlen";
                            recommendDesc = `Hervorragende Schuldminderung von ${savingsPct.toFixed(0)}%. Sofort annehmen, um € ${savings.toLocaleString("de-DE", { maximumFractionDigits: 0 })} einzusparen.`;
                          } else if (savingsPct >= 20) {
                            recommendBadge = "bg-indigo-100 text-indigo-950 dark:bg-indigo-950 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900";
                            recommendText = "Zur Annahme empfohlen";
                            recommendDesc = `Gute Einigungsersparnis (${savingsPct.toFixed(0)}%). Erleichtert den Insolvenzvergleich, Quote liegt über Durchschnitt.`;
                          } else {
                            recommendBadge = "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-900";
                            recommendText = "Gegenangebot vorschlagen";
                            recommendDesc = `Geringe Ersparnis (${savingsPct.toFixed(0)}%). Nutzen Sie den Brief-Generator, um eine tiefere Reduzierung (> 30%) anzufragen.`;
                          }

                          return (
                            <div key={offer.id} className="p-4 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-850/35 transition-all text-xs">
                              
                              {/* Left Info */}
                              <div className="space-y-1 md:max-w-xs w-full">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-slate-900 dark:text-white text-xs leading-none">
                                    {debt.creditorName}
                                  </span>
                                  {debt.originalCreditor && (
                                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded leading-none dark:text-slate-400">
                                      {debt.originalCreditor}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-450 dark:text-slate-500 font-mono">
                                  AZ: {debt.fileReference || "k.A."} | Kat: {debt.category}
                                </p>
                                {offer.deadline && (
                                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 leading-none">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                                    Angebotsfrist: {new Date(offer.deadline).toLocaleDateString("de-DE")}
                                  </p>
                                )}
                              </div>

                              {/* Middle */}
                              <div className="flex gap-4 items-center shrink-0">
                                <div className="text-right">
                                  <span className="text-[9px] text-slate-400 block font-semibold">Aktueller Saldo</span>
                                  <span className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400 line-through">
                                    € {debt.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="px-2 py-0.5 bg-slate-100 dark:bg-slate-950 rounded text-slate-450 font-bold">
                                  →
                                </div>
                                <div className="text-left">
                                  <span className="text-[9px] text-indigo-500 dark:text-indigo-400 block font-extrabold">Vergleichs-Angebot</span>
                                  <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400">
                                    € {offer.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>

                              {/* Recommendation */}
                              <div className="md:max-w-sm w-full space-y-1 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase leading-none ${recommendBadge}`}>
                                    {recommendText}
                                  </span>
                                  {savings > 0 && (
                                    <span className="text-[10px] font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                                      Ersparnis: € {savings.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 leading-tight dark:text-slate-400">
                                  {recommendDesc}
                                </p>
                              </div>

                              {/* Right Action */}
                              <div className="shrink-0">
                                <button
                                  onClick={() => {
                                    acceptSettlementOffer(debt.id, offer.id, offer.amount, offer.type);
                                    setShowRecommendationsModal(false);
                                  }}
                                  className="w-full md:w-auto px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                                  title="Das reduzierte Vergleichsangebot annehmen und den aktuellen Schuldensaldo mindern."
                                >
                                  <span>Annehmen</span>
                                </button>
                              </div>

                            </div>
                          );
                        });
                      })}
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-150 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setShowRecommendationsModal(false)}
                className="py-1.5 px-4 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Schließen
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-105 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-slate-900 dark:text-white" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Schuldner-Stammdaten bearbeiten</h3>
              </div>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono block mb-1">
                  Name (Vorbelegt für die Bescheinigung) *
                </label>
                <input
                  type="text"
                  required
                  value={editProfileName}
                  onChange={(e) => setEditProfileName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 dark:focus:ring-white dark:focus:border-white text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono block mb-1">
                    Geburtsdatum *
                  </label>
                  <input
                    type="text"
                    required
                    value={editProfileDob}
                    onChange={(e) => setEditProfileDob(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 dark:focus:ring-white dark:focus:border-white text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono block mb-1">
                    Geburtsort *
                  </label>
                  <input
                    type="text"
                    required
                    value={editProfilePob}
                    onChange={(e) => setEditProfilePob(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 dark:focus:ring-white dark:focus:border-white text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono block mb-1">
                  Anschrift (Straße, Hausnr., PLZ, Ort) *
                </label>
                <input
                  type="text"
                  required
                  value={editProfileAddress}
                  onChange={(e) => setEditProfileAddress(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 dark:focus:ring-white dark:focus:border-white text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono block mb-1">
                  Zuständiges Amtsgericht (Insolvenzgericht) *
                </label>
                <select
                  value={editProfileCourt}
                  onChange={(e) => setEditProfileCourt(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 dark:focus:ring-white dark:focus:border-white text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="Amtsgericht Wedding - Insolvenzgericht -">Amtsgericht Wedding (Zuständigkeitsbereich Wedding)</option>
                  <option value="Amtsgericht Tempelhof-Kreuzberg - Insolvenzgericht -">Amtsgericht Tempelhof-Kreuzberg (Kreuzberg / Tempelhof / Neukölln)</option>
                  <option value="Amtsgericht Charlottenburg - Insolvenzgericht -">Amtsgericht Charlottenburg (Charlottenburg / Wilmersdorf)</option>
                  <option value="Amtsgericht Schöneberg - Insolvenzgericht -">Amtsgericht Schöneberg (Schöneberg / Steglitz-Zehlendorf)</option>
                  <option value="Amtsgericht Lichtenberg - Insolvenzgericht -">Amtsgericht Lichtenberg (Lichtenberg / Marzahn-Hellersdorf)</option>
                  <option value="Amtsgericht Neukölln - Insolvenzgericht -">Amtsgericht Neukölln</option>
                  <option value="Amtsgericht Spandau - Insolvenzgericht -">Amtsgericht Spandau</option>
                  <option value="Amtsgericht Köpenick - Insolvenzgericht -">Amtsgericht Köpenick (Treptow-Köpenick / Alt-Glienicke)</option>
                </select>
              </div>

              <div className="flex gap-2.5 items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="py-2 px-4 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 transition-all cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-slate-900 hover:bg-slate-850 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  Änderungen speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Voice Alert */}
      {showLukasNotification && (
        <div className="bg-indigo-50 border border-indigo-150 p-3 rounded-xl flex items-start gap-2.5 dark:bg-indigo-950/20 dark:border-indigo-900 animate-in slide-in-from-top-2 duration-250">
          <Sparkles className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-800 dark:text-indigo-300 font-medium">
            {showLukasNotification}
          </p>
        </div>
      )}

      {/* Background Duplicate Alerts Block */}
      {duplicateNotices.length > 0 && (
        <div className="bg-blue-50/50 dark:bg-slate-905/30 border border-blue-250 dark:border-blue-800 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200" id="duplicate-notices-banner">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-blue-105 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 flex items-center justify-center font-bold font-mono">
                !
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-blue-300">
                  Lukas-Hintergrundabgleich: {duplicateNotices.length} Falldublette{duplicateNotices.length === 1 ? "" : "n"} identifiziert!
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-400">
                  Bei der automatischen Beleganalyse wurden Überschneidungen mit bereits erfassten Aktenzeichen oder Gläubigerdaten festgestellt und automatisch bereinigt:
                </p>
              </div>
            </div>
            <button 
              onClick={() => setDuplicateNotices([])}
              className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-650 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 px-2 py-0.5 rounded font-extrabold transition-all cursor-pointer"
            >
              Verwerfen
            </button>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 max-h-[160px] overflow-y-auto pr-1">
            {duplicateNotices.map(notice => (
              <div key={notice.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 flex flex-col justify-between text-[11px] hover:border-blue-200 dark:hover:border-blue-900 transition-colors">
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate pr-1 max-w-[140px]" title={notice.incomingName}>
                      {notice.incomingName}
                    </span>
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded uppercase leading-none shrink-0 bg-blue-50 text-blue-800 dark:bg-blue-955 dark:text-blue-300 border border-blue-100 dark:border-blue-901">
                      {notice.matchType === "fileReference" ? "AZ-Gleichheit" : "Kreditor & Betrag"}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-450 dark:text-slate-500 font-mono leading-none">
                    Importiert: € {notice.incomingAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} (Ref: {notice.incomingRef})
                  </div>
                  <div className="text-[9px] text-slate-450 dark:text-slate-500 font-mono leading-none">
                    Bestand: € {notice.existingAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} (Ref: {notice.existingRef})
                  </div>
                </div>
                <div className="mt-2 text-[9px] text-blue-700 dark:text-blue-400 font-semibold bg-blue-50/20 dark:bg-blue-955/20 border border-blue-100/30 dark:border-blue-900/10 p-1.5 rounded leading-tight">
                  {notice.actionTaken}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Urgent Debt Payment Warning Banner */}
      {urgentDebts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-600 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse" id="urgent-debt-warning-banner">
          <div className="flex items-start gap-3">
            <div className="bg-amber-400 text-slate-900 dark:bg-amber-500 rounded-xl p-2 shrink-0">
              <AlertTriangle className="h-5 w-5 text-slate-950 shrink-0" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-amber-250">
                Achtung: {urgentDebts.length} kritische Fälligkeit{urgentDebts.length === 1 ? "" : "en"} entdeckt!
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Folgende Zahlungen rücken näher als **3 Tage** oder stehen direkt an. Gehen Sie auf Nummer sicher, um ein Platzen mühsamer Vergleiche zu verhindern:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {urgentDebts.map(d => {
                  const days = getDaysRemaining(d.nextInstallmentDate);
                  return (
                    <span key={d.id} className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                      {d.creditorName}: {days === null ? "" : days < 0 ? "Überfällig!" : days === 0 ? "Heute fällig!" : `Noch ${days} Tage`}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bento Stats Indicators */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4" id="debt-bento-indicators">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 dark:bg-slate-950/20 dark:border-slate-850">
          <span className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block font-semibold tracking-wider">Gesamtforderungen</span>
          <span className="text-lg font-black text-slate-900 dark:text-white mt-1 block">
            {totalSum.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 dark:bg-slate-950/20 dark:border-slate-850">
          <span className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block font-semibold tracking-wider">Anzahl Gläubiger</span>
          <span className="text-lg font-black text-slate-900 dark:text-white mt-1 block">
            {debts.length}
          </span>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 dark:bg-slate-950/20 dark:border-slate-850">
          <span className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block font-semibold tracking-wider">Hoche Risikostufen</span>
          <span className="text-lg font-black text-red-650 dark:text-red-400 mt-1 block">
            {badDebtsCount} <span className="text-xs text-slate-400 font-normal">tituliert</span>
          </span>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 dark:bg-slate-950/20 dark:border-slate-850">
          <span className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block font-semibold tracking-wider">In Verhandlung</span>
          <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
            {inNegotiationCount} <span className="text-xs text-slate-400 font-normal">Posten</span>
          </span>
        </div>
      </div>

      {/* Grid: Left Column: Add Entry (Manual or voice), Right Column: Listed Table */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-12">
        
        {/* Form Container */}
        <div className="col-span-1 xl:col-span-5 bg-slate-50/50 p-4 rounded-2xl border border-slate-150 dark:bg-slate-950/10 dark:border-slate-850 space-y-4 shadow-sm">
          
          {/* Section Head with Voice Mic trigger */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Posten Hinzufügen
            </h3>
            
            {/* Sprach-Diktieren button */}
            <button
              onClick={toggleRecording}
              type="button"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all border cursor-pointer ${
                isRecording 
                  ? "bg-red-500 text-white border-transparent animate-pulse shadow-md"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800"
              }`}
              title="Sprechen Sie uns Details zu diesem Gläubiger per Mikrofon ein"
              id="voice-dictate-creditor"
            >
              {isRecording ? <MicOff className="h-3.5 w-3.5 animate-bounce" /> : <Mic className="h-3.5 w-3.5" />}
              <span>{isRecording ? "Höre zu..." : "Per Sprache eintragen"}</span>
            </button>
          </div>

          {/* Voice Command Log */}
          {voiceLog && (
            <div className="bg-slate-100 p-2 text-[10px] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-lg font-mono">
              {voiceLog}
            </div>
          )}

          {/* Schuhkarton AI Document Parser - Drag & Drop or Click */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-4 rounded-xl border border-dashed transition-all cursor-pointer relative ${
              dragActive 
                ? "border-blue-400 bg-blue-500/5 dark:border-blue-400 dark:bg-blue-950/20 scale-[1.01]" 
                : isAnalyzingDoc 
                  ? "border-indigo-300 bg-indigo-50/10 dark:border-indigo-800 dark:bg-indigo-950/10 pointer-events-none animate-pulse"
                  : "border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700"
            }`}
            onClick={() => directoryFileInputRef.current?.click()}
            id="schuhkarton-drop-zone"
          >
            <input 
              type="file"
              ref={directoryFileInputRef}
              onChange={(e) => {
                const selectedFiles = e.target.files;
                if (selectedFiles && selectedFiles.length > 0) {
                  handleBatchDirectoryFilesUpload(Array.from(selectedFiles));
                }
              }}
              accept=".pdf, .png, .jpg, .jpeg"
              multiple
              className="hidden"
            />
            {isAnalyzingDoc ? (
              <div className="flex flex-col items-center justify-center py-2 text-center w-full">
                <span className="flex h-6 w-6 relative mb-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-6 w-6 bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">KI</span>
                </span>
                <p className="text-xs font-bold text-slate-750 dark:text-slate-200">
                  {batchProgress && batchProgress.total > 1 
                    ? `Lukas analysiert Beleg ${batchProgress.current} von ${batchProgress.total} ...`
                    : "Lukas analysiert Ihren Beleg..."}
                </p>
                
                {/* Visual Progress Bar Wrapper */}
                <div className="w-full max-w-xs bg-slate-200 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden shadow-inner">
                  <div 
                    className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out" 
                    style={{ 
                      width: `${batchProgress ? (batchProgress.current / batchProgress.total) * 100 : 100}%` 
                    }}
                  ></div>
                </div>
                
                <div className="flex justify-between w-full max-w-xs text-[9px] text-slate-400 dark:text-slate-500 mt-1.5 px-0.5 font-mono font-bold">
                  <span>{batchProgress ? `${Math.round((batchProgress.current / batchProgress.total) * 100)}% abgeschlossen` : "100% abgeschlossen"}</span>
                  <span>{batchProgress ? `${batchProgress.current} von ${batchProgress.total} Dateien` : "1 von 1"}</span>
                </div>

                <p className="text-[10px] text-slate-400 mt-2.5 truncate max-w-full font-mono font-medium px-4">
                  "{analyzedFileName}"
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-150 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg shrink-0">
                  <Upload className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-slate-705 dark:text-slate-250">Schuhkarton AI-Belegleser</h4>
                    <span className="text-[9px] bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-1 py-0.2 rounded font-extrabold uppercase tracking-wide">PDF / SCAN</span>
                  </div>
                  <p className="text-[10px] text-slate-455 mt-1 dark:text-slate-400 leading-normal text-left">
                    Ziehen Sie einen Mahnbescheid oder ein Schreiben hierhin oder klicken Sie, um ein Dokument hochzuladen. Lukas liest alle Beträge automatisch aus!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Separator line with 'or manually' */}
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest my-2">
            <span className="h-px bg-slate-205 dark:bg-slate-800 flex-1"></span>
            <span>oder manuell erfassen</span>
            <span className="h-px bg-slate-205 dark:bg-slate-800 flex-1"></span>
          </div>

          <form onSubmit={handleAddDebt} className="space-y-3" id="add-debt-item-form">
            
            {/* Search/Autocomplete Creditor input */}
            <div className="relative">
              <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">
                Name des Gläubigers (Suchfeld für CSV-Archiv)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Z.B.: coeo, Alektum, Lowell..."
                  value={creditorName || creditorSearchTerm}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCreditorName(val);
                    setCreditorSearchTerm(val);
                    setShowAutocomplete(true);
                  }}
                  onFocus={() => setShowAutocomplete(true)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  id="debt-creditor-name"
                />
                <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>

              {/* Autocomplete suggestions box */}
              {showAutocomplete && filteredSuggestions.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl dark:bg-slate-900 dark:border-slate-800">
                  <div className="p-1">
                    <div className="px-2 py-1 text-[10px] text-slate-400 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                      Vorschläge aus CSV-Datenbank
                    </div>
                    {filteredSuggestions.map((cred, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectSuggestedCreditor(cred)}
                        className="w-full text-left px-2 py-1.5 hover:bg-slate-50 text-xs rounded-lg flex flex-col transition-colors dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                      >
                        <span className="font-bold">{cred.name}</span>
                        <span className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" /> {cred.street}, {cred.zip} {cred.city}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Inkasso vs original creditor info indicators */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100/50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
              <div>
                <label className="text-[9px] font-bold text-slate-500 dark:text-slate-450 uppercase block mb-1">
                  Auftraggeber (Original-Gläubiger)
                </label>
                <input
                  type="text"
                  placeholder="Z.B. Vodafone, eBay, Drillisch"
                  value={originalCreditor}
                  onChange={(e) => setOriginalCreditor(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-500 dark:text-slate-450 uppercase block mb-1">
                  Inkasso / Mahnvertreter
                </label>
                <input
                  type="text"
                  placeholder="Z.B. coeo, HFG Inkasso, KSP"
                  value={debtCollector}
                  onChange={(e) => setDebtCollector(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Address Columns */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Straße & Nr.</label>
                <input
                  type="text"
                  placeholder="Hauptstraße 1"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">PLZ & Ort</label>
                <input
                  type="text"
                  placeholder="10117 Berlin"
                  value={cityAndZip}
                  onChange={(e) => setCityAndZip(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Sum and Aktenzeichen */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Forderungshöhe (€)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="350.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Aktenzeichen (Glg. Ref)</label>
                <input
                  type="text"
                  placeholder="K-99120"
                  value={fileReference}
                  onChange={(e) => setFileReference(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Category and Status */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Forderungsart</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="Konsum">Konsum (Onlineshops, Ware)</option>
                  <option value="Telekommunikation">Telekommunikation (Handy, Web)</option>
                  <option value="Energie & Strom">Energie & Strom</option>
                  <option value="Miete / Wohnen">Miete / Wohnen</option>
                  <option value="Kredit">Bank / Kredit</option>
                  <option value="Behörde / Bußgeld">Behörde / Bußgeld</option>
                  <option value="Sonstiges">Sonstiges</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Vollstreckungsstatus</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="offen">Offen (Erste Mahnung)</option>
                  <option value="verhandlung">In Verhandlung</option>
                  <option value="ratenzahlung">In Ratenzahlung</option>
                  <option value="tituliert">Tituliert (Gerichtspost / GV)</option>
                  <option value="gescheitert">Gescheitert (Außergerichtliche Einigung fehlgeschlagen)</option>
                </select>
              </div>
            </div>

            {status === "gescheitert" && (
              <div className="space-y-4 pt-1 animate-fadeIn col-span-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Scheiternsdatum (InsO § 305)</label>
                    <input
                      type="date"
                      value={failureDate}
                      onChange={(e) => setFailureDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1">Grund des Scheiterns</label>
                    <select
                      value={failureReason}
                      onChange={(e) => setFailureReason(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <option value="Der Schuldenbereinigungsplan wurde von mindestens einem Gläubiger ausdrücklich abgelehnt und/oder es wurden aktive Vollstreckungsmaßnahmen fortgeführt.">Ausdrückliche Ablehnung / Vollstreckung</option>
                      <option value="Zustimmung verweigert (Forderungshöhe bestritten / Einordnung abgelehnt)">Zustimmung verweigert</option>
                      <option value="Gläubiger unkooperativ / Keine Rückmeldung innerhalb der gesetzten Frist font-bold">Keine Rückmeldung binnen Frist</option>
                      <option value="Zahlungsunfähigkeit eingetreten (Ratenzahlung hinfällig)">Zahlungsunfähigkeit eingetreten</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {status === "tituliert" && (
              <div className="bg-red-500/5 dark:bg-red-950/10 border border-red-500/15 p-5 rounded-2xl space-y-4 animate-fadeIn col-span-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-650 dark:text-red-400 border-b border-red-500/10 pb-2">
                  <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
                  <span>Strukturierte Titelaufstellung (gemäß Mahnbescheid)</span>
                </div>
                
                {/* Intro text */}
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tragen Sie die Beträge exakt so ein, wie sie im gerichtlichen Mahn- oder Vollstreckungsbescheid unter den römischen Ziffern ausgewiesen sind.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Section I */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl space-y-3">
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 block uppercase tracking-wider font-mono">
                      I. Hauptforderung
                    </span>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[9px] text-slate-450 dark:text-slate-500 block font-semibold mb-1">
                          1. Darlehensrückzahlung / Hauptforderung (€)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="z.B. 244,70"
                          value={mbPrincipal}
                          onChange={(e) => setMbPrincipal(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-red-500/30 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-450 dark:text-slate-500 block font-semibold mb-1">
                          2. Zinsrückstände / Verzugszinsen gem. Rechnung (€)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="z.B. 19,94"
                          value={mbInterestArrears}
                          onChange={(e) => setMbInterestArrears(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-red-500/30 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section II */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl space-y-3">
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 block uppercase tracking-wider font-mono">
                      II. Verfahrenskosten
                    </span>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[9px] text-slate-455 dark:text-slate-500 block font-semibold mb-1">
                          1. Gerichtskosten / Gebühr (z.B. KV GKG) (€)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="z.B. 38,00"
                          value={mbCourtCosts}
                          onChange={(e) => setMbCourtCosts(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-red-500/30 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-455 dark:text-slate-500 block font-semibold mb-1">
                          2. Auslagen / Vertretungskosten für Verfahren (€)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="z.B. 25,00"
                          value={mbClaimantExpenses}
                          onChange={(e) => setMbClaimantExpenses(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-red-500/30 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section III */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl space-y-3">
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 block uppercase tracking-wider font-mono">
                      III. Nebenforderungen
                    </span>
                    <div>
                      <label className="text-[9px] text-slate-455 dark:text-slate-500 block font-semibold mb-1">
                        Inkassokosten / Vorgerichtliche Mahn-Auslagen (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="z.B. 54,00"
                        value={mbExtraFees}
                        onChange={(e) => setMbExtraFees(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-red-500/30 focus:outline-none dark:border-slate-800 dark:bg-slate-955 dark:text-slate-200"
                      />
                    </div>
                  </div>

                  {/* Section IV */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl space-y-3">
                    <span className="text-[10px] font-bold text-red-600 dark:text-red-400 block uppercase tracking-wider font-mono">
                      IV. Zinsen im Titel
                    </span>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[9px] text-slate-455 dark:text-slate-500 block font-semibold mb-1">
                          1. Vom Antragsteller ausgerechnete Zinsen (€)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="z.B. 113,35"
                          value={mbCalculatedInterest}
                          onChange={(e) => setMbCalculatedInterest(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-red-500/30 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-455 dark:text-slate-500 block font-semibold mb-1">
                          2. laufende, vom Gericht ausgerechnete Zinsen (€)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="z.B. 0,30"
                          value={mbCurrentInterest}
                          onChange={(e) => setMbCurrentInterest(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-red-500/30 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-red-500/10">
                  <div>
                    <label className="text-[10px] text-slate-550 dark:text-slate-400 font-bold uppercase block mb-1">Titelbezeichnung</label>
                    <input
                      type="text"
                      placeholder="z.B. Vollstreckungsbescheid"
                      value={titledWith}
                      onChange={(e) => setTitledWith(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-red-500/30 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-550 dark:text-slate-400 font-bold uppercase block mb-1">Titulierungsdatum</label>
                    <input
                      type="date"
                      value={titledDate}
                      onChange={(e) => setTitledDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:ring-1 focus:ring-red-500/30 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="text-[10.5px] text-red-650 dark:text-red-400 font-semibold bg-red-500/5 p-3 rounded-xl border border-red-500/10 flex justify-between items-center">
                  <span>→ Titulierte Gesamtsumme (Forderungsaufstellung):</span>
                  <span className="font-extrabold text-sm underline">
                    € {((parseFloat(mbPrincipal) || 0) + 
                        (parseFloat(mbInterestArrears) || 0) + 
                        (parseFloat(mbCourtCosts) || 0) + 
                        (parseFloat(mbClaimantExpenses) || 0) + 
                        (parseFloat(mbExtraFees) || 0) + 
                        (parseFloat(mbCalculatedInterest) || 0) + 
                        (parseFloat(mbCurrentInterest) || 0)
                       ).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* Next Installment / Due Date */}
            <div>
              <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block mb-1 flex items-center justify-between">
                <span>Nächste Ratenzahlung / Fälligkeit (Optional)</span>
                {status === "ratenzahlung" && (
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded animate-pulse">
                    Empfohlen
                  </span>
                )}
              </label>
              <input
                type="date"
                value={nextInstallmentDate}
                onChange={(e) => setNextInstallmentDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>

            {/* Automatic letter draft suggestion for titled claims */}
            {status === "tituliert" && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-305 dark:border-amber-800/80 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-300 flex flex-col gap-2 mt-2">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <span className="font-bold block text-amber-950 dark:text-amber-200">💡 Lukas empfiehlt: Brief an Gerichtsvollzieher</span>
                    Da diese Forderung bereits **tituliert** ist, drohen teure Vollstreckungsmaßnahmen. Möchten Sie direkt den passenden Briefentwurf **"Ankündigung Gerichtsvollzieher"** vorbereiten?
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!creditorName.trim()) {
                        alert("Bitte tragen Sie zuerst den Namen des Gläubigers oben unter 'Name des Gläubigers' ein!");
                        return;
                      }
                      const draftData = {
                        creditorName,
                        creditorStreet: street,
                        creditorCity: cityAndZip,
                        fileReference: fileReference || "Unbekannt",
                        debtAmount: amount ? parseFloat(amount).toFixed(2) : "0.00",
                        templateType: "brief_gerichtsvollzieher"
                      };
                      localStorage.setItem("gesetzeslotse_letter_draft", JSON.stringify(draftData));
                      window.dispatchEvent(new CustomEvent("apply_draft_to_letter", { detail: draftData }));
                      window.dispatchEvent(new CustomEvent("set_active_tab", { detail: "briefe" }));
                    }}
                    className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 font-bold py-1.5 px-3 rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-sm"
                  >
                    <FileText className="h-3 w-3" />
                    <span>Jetzt Briefentwurf laden & verfassen</span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer dark:bg-white dark:text-slate-900 dark:hover:bg-slate-50 mt-2"
            >
              <Plus className="h-4 w-4" /> Schuldenposten eintragen
            </button>

          </form>

          {/* Helpful self-help tip */}
          <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/15 text-[11px] text-slate-600 dark:text-amber-400/80 leading-normal flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Info:</span> Speichern Sie Ihre Posten ab – diese Daten verbleiben lokal auf Ihrem Browser und dienen der direkten Befüllung Ihrer Musterbriefe in Sekundenschnelle.
            </div>
          </div>

        </div>

        {/* Portfolio Table/List */}
        <div className="col-span-1 xl:col-span-7 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BookmarkCheck className="h-4 w-4 text-emerald-500" />
              Aktuelle Auflistungsübersicht ({debts.length})
            </h3>

            {/* Quick exports */}
            <div className="flex gap-1.5 flex-wrap items-center">
              {/* Professional formatted PDF Export */}
              <button
                onClick={downloadPdf}
                disabled={debts.length === 0}
                className="p-1.5 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:border-white dark:text-slate-950 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm animate-pulse"
                title="Als professionelles PDF-Dokument (inkl. Raten-Vergleichsprognose und Unterschriftsfeld) herunterladen"
                id="download-professional-pdf-button"
              >
                <Download className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[10px]">PDF erhalten</span>
              </button>

              {/* Semicolon-Separated Excel-Compatible CSV Export */}
              <button
                onClick={exportDebtListToCsv}
                disabled={debts.length === 0}
                className="p-1.5 bg-sky-50 border border-sky-200 text-sky-800 hover:bg-sky-100 dark:bg-sky-950/20 dark:border-sky-900/50 dark:text-sky-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Laufende Forderungen als formatierte Excel- / CSV-Datei herunterladen"
                id="export-active-debts-csv-button"
              >
                <Download className="h-3.5 w-3.5 text-sky-500" />
                <span className="text-[10px]">Excel / CSV Export</span>
              </button>

              {/* Settlement Offer comparison and recommendations engine */}
              <button
                onClick={() => setShowRecommendationsModal(true)}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm ${
                  debtsWithOffersCount > 0
                    ? "bg-amber-100 border-amber-250 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300 animate-pulse font-black"
                    : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 dark:bg-slate-900 dark:border-slate-850 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
                title="Vollautomatische Rabattprognose & Abgleich aller gütlichen Inkasso-Angebote mit dem Einigungssaldo"
                id="compare-settlements-recommendations-button"
              >
                <Sparkles className={`h-3.5 w-3.5 ${debtsWithOffersCount > 0 ? "text-amber-600 dark:text-amber-400 animate-spin" : "text-slate-400"}`} />
                <span className="text-[10px]">Abgleich & Empfehlungen {debtsWithOffersCount > 0 && `(${debtsWithOffersCount})`}</span>
              </button>

              {/* 1-Click Duplicate Reconciliation & Consolidation */}
              <button
                onClick={runDeduplication}
                disabled={debts.length <= 1}
                className="p-1.5 bg-rose-50 border border-rose-250 text-rose-800 hover:bg-rose-100 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                title="Sucht nach identischen Aktenzeichen (z.B. Drillisch / HFG Inkasso mit Ref. LT0823937H) oder Fragmenten und führt diese sicher per 1-Klick zusammen."
                id="run-deduplication-button"
              >
                <Layers className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                <span className="text-[10px] font-extrabold">1-Klick Abgleich (Dubletten)</span>
              </button>

              {/* CSV Upload tool */}
              <label 
                className="p-1.5 bg-emerald-50 border border-emerald-250 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/60 dark:text-emerald-300 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 font-bold"
                title="CSV-Datei mit Forderungen hochladen"
              >
                <Upload className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-[10px]">CSV importieren</span>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleCsvFileChange} 
                  className="hidden" 
                />
              </label>

              {/* Sample CSV Loader */}
              <button
                onClick={loadSampleCsv}
                className="p-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/50 dark:text-indigo-300 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 font-bold"
                title="Beispiel-CSV laden zum Ausprobieren"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-[10px]">Muster-Forderungen</span>
              </button>

              <button
                onClick={() => window.print()}
                className="p-1.5 bg-white border border-slate-250 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-850 dark:text-slate-300 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1"
                title="Übersicht als Tabelle drucken"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-[10px]">Drucken</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar & Category Distribution */}
          {debts.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 bg-slate-50/50 dark:bg-slate-950/20 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-850">
              
              {/* Stat 1: Total Sum */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-850 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Gesamtverbindlichkeit</span>
                  <span className="text-base font-extrabold font-mono text-slate-900 dark:text-slate-100 block mt-1">
                    € {totalSum.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 font-medium">
                  Verteilt auf <span className="font-extrabold text-slate-700 dark:text-slate-300">{debts.length}</span> offene Posten
                </div>
              </div>

              {/* Stat 2: High Risk Status */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-850 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Hochrisiko-Kollektiv</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-base font-extrabold font-mono text-rose-600 dark:text-rose-400">
                      {debts.filter(d => d.status === "tituliert").length} Posten
                    </span>
                    {debts.some(d => d.status === "tituliert") && (
                      <span className="animate-pulse h-2 w-2 rounded-full bg-red-500 shrink-0" />
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-rose-600 dark:text-rose-450/80 mt-1 font-bold flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5 inline shrink-0" />
                  <span>Gerichtlich tituliert (GV-Gefahr)</span>
                </div>
              </div>

              {/* Stat 3: Category Distribution Bars */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-850 shadow-xs sm:col-span-2 lg:col-span-1 space-y-1.5 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Hauptschuldenherde</span>
                <div className="space-y-1.5 max-h-[85px] overflow-y-auto pr-1">
                  {(() => {
                    const catMap: Record<string, number> = {};
                    debts.forEach(d => {
                      const cat = d.category || "Sonstiges";
                      catMap[cat] = (catMap[cat] || 0) + d.amount;
                    });
                    const entries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
                    if (entries.length === 0) return <span className="text-[10px] text-slate-400">Keine Kategorien</span>;
                    return entries.slice(0, 3).map(([cat, val]) => {
                      const pct = Math.round((val / (totalSum || 1)) * 100);
                      return (
                        <div key={cat} className="space-y-0.5">
                          <div className="flex justify-between text-[9px] font-bold text-slate-700 dark:text-slate-350">
                            <span className="truncate max-w-[80px]">{cat}</span>
                            <span className="font-mono">{pct}% (€ {val.toLocaleString("de-DE", { maximumFractionDigits: 0 })})</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div className="bg-slate-900 dark:bg-white h-1 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>
          )}

          {/* § 305 InsO Status & Scheitern Visualisierung */}
          {debts.length > 0 && (
            <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-150 dark:border-slate-850 space-y-3" id="inso-status-scheitern-view">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                    §
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white leading-none">
                      § 305 InsO Status: Außergerichtliche Einigung
                    </h4>
                    <span className="text-[10px] text-slate-450 dark:text-slate-400">
                      Gelistete Einigungsversuche für das Amtsgericht Berlin
                    </span>
                  </div>
                </div>
                <div className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-bold px-2 py-0.5 rounded uppercase">
                  Schuldenbereinigung
                </div>
              </div>

              {(() => {
                const failedDebts = debts.filter(d => d.status === "gescheitert");
                const totalFailedAmount = failedDebts.reduce((sum, item) => sum + item.amount, 0);

                if (failedDebts.length > 0) {
                  return (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 flex items-start gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                        <div className="text-xs text-slate-650 dark:text-slate-350 leading-normal">
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            {failedDebts.length} unkooperative Gläubiger ({((failedDebts.length / debts.length) * 100).toFixed(0)}% des Portfolios) gemeldet:
                          </span>{" "}
                          Durch das Vorliegen von {failedDebts.length} gescheiterten Versuchen (Gesamtsumme: € {totalFailedAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })}) ist das außergerichtliche Verfahren vorschriftsmäßig gescheitert. Der Kanzlei-Entwurf der amtlichen <b>§ 305 Scheiternsbescheinigung</b> ist nun freigeschaltet (Tab 7).
                        </div>
                      </div>

                      {/* List of failed items */}
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {failedDebts.map(item => (
                          <div key={item.id} className="p-2.5 rounded-lg bg-white dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850/80 flex flex-col justify-between text-[11px] hover:border-rose-200 dark:hover:border-rose-950/50 transition-colors">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate" title={item.creditorName}>
                                {item.creditorName}
                              </span>
                              <span className="font-mono font-bold text-rose-650 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded text-[10px]">
                                Gescheitert
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-450 dark:text-slate-500 flex justify-between gap-2 border-b border-dashed border-slate-100 dark:border-slate-805 pb-1.5 mb-1.5 leading-none">
                              <span className="truncate">Ref: {item.fileReference || "k. A."}</span>
                              <span>Kat: {item.category}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-500 dark:text-slate-400 font-mono">
                                {item.failureDate ? new Date(item.failureDate).toLocaleDateString("de-DE") : "Heute"}
                              </span>
                              <span className="font-black text-slate-900 dark:text-white font-mono">
                                € {item.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            {item.failureReason && (
                              <div className="mt-1.5 text-[9px] text-slate-500 italic bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850/60 p-1 rounded-sm leading-tight">
                                "{item.failureReason}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 text-center space-y-1.5">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto animate-bounce" />
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Bisher sind keine gescheiterten Verhandlungen markiert
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-normal">
                        Alle Gläubiger befinden sich im regulären Status (z.B. Offen oder In Verhandlung). Markieren Sie unkooperative Partner in der Tabelle unten als <b>"Gescheitert"</b>, um deren Nachweise direkt in die amtsgerichtliche § 305 Bescheinigung einfließen zu lassen.
                      </p>
                    </div>
                  );
                }
              })()}
            </div>
          )}

          {debts.length === 0 ? (
            <div className="text-center py-12 px-6 rounded-2xl border-2 border-dashed border-slate-205 dark:border-slate-805 flex flex-col items-center">
              <CheckCircle2 className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Keine Schulden eingetragen</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Glückwunsch! Entweder sind Sie schuldenfrei, oder Sie müssen noch Ihre erste Mahnung oder Post einpflegen. Nutzen Sie das linke Feld zum Ausfüllen.
              </p>
            </div>
          ) : (
            <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-850 text-left text-xs font-sans">
                  <thead className="bg-slate-50 dark:bg-slate-950/40 text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">
                    <tr>
                      <th className="px-4 py-3">Gläubiger / Ref</th>
                      <th className="px-4 py-3">Klasse</th>
                      <th className="px-4 py-3">Heutige Stufe</th>
                      <th className="px-4 py-3">Nächste Rate</th>
                      <th className="px-4 py-3 text-right">Zinsen</th>
                      <th className="px-4 py-3 text-right">Gesamtsumme</th>
                      <th className="px-4 py-3 text-center">Formular-Übertrag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850/80">
                    {debts.map((item) => {
                      const daysRemaining = item.nextInstallmentDate ? getDaysRemaining(item.nextInstallmentDate) : null;
                      const isOverdue = daysRemaining !== null && daysRemaining < 0;
                      const isUrgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3;
                      const hasDetails = item.status === "tituliert" || item.principalAmount !== undefined || (item.offers !== undefined && item.offers.length > 0);

                      return (
                        <React.Fragment key={item.id}>
                          <tr 
                            className={`transition-colors ${
                              isOverdue 
                                ? "bg-rose-50/50 hover:bg-rose-100/40 dark:bg-red-950/10 dark:hover:bg-red-950/20" 
                                : isUrgent 
                                  ? "bg-amber-50/60 hover:bg-amber-100/50 dark:bg-amber-950/10 dark:hover:bg-amber-950/25" 
                                  : "hover:bg-slate-50/50 dark:hover:bg-slate-800/10"
                            }`}
                          >
                            
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-850 dark:text-slate-100 leading-tight">{item.creditorName}</div>
                              {item.originalCreditor && item.originalCreditor !== item.creditorName && (
                                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold leading-normal mt-0.5">
                                  Auftraggeber: <span className="font-bold text-slate-700 dark:text-slate-300">{item.originalCreditor}</span>
                                </div>
                              )}
                              <div className="text-[10px] text-slate-450 dark:text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5 leading-none">
                                <span>Ref: {item.fileReference}</span>
                                {item.city && <span>• {item.city}</span>}
                                {item.debtCollector && item.debtCollector !== item.creditorName && (
                                  <span>• Inkasso: {item.debtCollector}</span>
                                )}
                                {item.mostRecentPageNumber && (
                                  <span className="text-amber-650 dark:text-amber-450 bg-amber-50 dark:bg-amber-950/20 px-1 rounded font-medium flex items-center gap-0.5 animate-pulse">
                                    • Aktuellste Belegseite: {item.mostRecentPageNumber}
                                  </span>
                                )}
                              </div>
                              {item.offers && item.offers.length > 0 && (
                                <div className="mt-1 flex items-center">
                                  <span className="text-[9px] bg-emerald-100 text-emerald-850 dark:bg-emerald-950/60 dark:text-emerald-350 font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    {item.offers.length} {item.offers.length === 1 ? "Angebot" : "Angebote"} ({item.offers.map(o => `€${o.amount.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`).join(", ")})
                                  </span>
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <span className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded font-medium">
                                {item.category}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <select
                                value={item.status}
                                onChange={(e) => {
                                  const newStatus = e.target.value as any;
                                  const updated = debts.map(d => {
                                    if (d.id === item.id) {
                                      const isNowTituliert = newStatus === "tituliert";
                                      const defaultP = d.principalAmount || d.amount;
                                      const defaultTitledDate = d.titledDate || d.createdAt?.split("T")[0] || new Date().toISOString().split("T")[0];
                                      return {
                                        ...d,
                                        status: newStatus,
                                        principalAmount: isNowTituliert ? defaultP : d.principalAmount,
                                        titledDate: isNowTituliert ? defaultTitledDate : d.titledDate,
                                        titledWith: isNowTituliert ? (d.titledWith || "Gerichtlicher Vollstreckungsbescheid") : d.titledWith,
                                        interestAmount: isNowTituliert ? (d.interestAmount !== undefined ? d.interestAmount : 0) : d.interestAmount,
                                        feesAmount: isNowTituliert ? (d.feesAmount !== undefined ? d.feesAmount : 0) : d.feesAmount,
                                        amount: d.amount,
                                        failureDate: newStatus === "gescheitert" ? new Date().toISOString().split("T")[0] : d.failureDate,
                                        failureReason: newStatus === "gescheitert" ? d.failureReason || "Der Schuldenbereinigungsplan wurde von mindestens einem Gläubiger ausdrücklich abgelehnt und/oder es wurden aktive Vollstreckungsmaßnahmen fortgeführt." : d.failureReason
                                      };
                                    }
                                    return d;
                                  });
                                  savePortfolioToStorage(updated);
                                }}
                                className={`text-[10px] rounded-full px-2 py-0.5 font-bold border-0 cursor-pointer focus:ring-1 focus:ring-slate-400 focus:outline-none select-none transition-all ${
                                  item.status === "tituliert"
                                    ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400"
                                    : item.status === "verhandlung"
                                      ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400"
                                      : item.status === "ratenzahlung"
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                                        : item.status === "gescheitert"
                                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse"
                                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                }`}
                              >
                                <option value="offen">Offen</option>
                                <option value="verhandlung">Verhandlung</option>
                                <option value="ratenzahlung">Ratenzahlung</option>
                                <option value="tituliert">Tituliert</option>
                                <option value="gescheitert">Gescheitert</option>
                              </select>
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap">
                              {item.nextInstallmentDate ? (
                                (() => {
                                  const daysRemaining = getDaysRemaining(item.nextInstallmentDate);
                                  if (daysRemaining === null) return <span className="text-slate-500 font-medium font-mono text-[11px]">{new Date(item.nextInstallmentDate).toLocaleDateString("de-DE")}</span>;
                                  if (daysRemaining < 0) {
                                    return (
                                      <div className="flex flex-col">
                                        <span className="text-[9px] bg-red-100 text-red-900 border border-red-300 dark:bg-red-950 dark:text-red-400 px-2 py-0.5 rounded-lg font-bold max-w-max flex items-center gap-1 whitespace-nowrap shadow-sm animate-pulse">
                                          <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400 inline shrink-0" /> Überfällig
                                        </span>
                                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono mt-0.5 font-bold">
                                          {new Date(item.nextInstallmentDate).toLocaleDateString("de-DE")}
                                        </span>
                                      </div>
                                    );
                                  }
                                  if (daysRemaining <= 3) {
                                    return (
                                      <div className="flex flex-col animate-pulse">
                                        <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-400 px-2.5 py-1 rounded-lg font-extrabold max-w-max flex items-center gap-1 whitespace-nowrap shadow-sm">
                                          <AlertTriangle className="h-2.5 w-2.5 text-amber-600 dark:text-amber-500 inline shrink-0" /> Fällig in {daysRemaining === 0 ? "heute" : `${daysRemaining} T.`}
                                        </span>
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono mt-0.5 font-bold">
                                          {new Date(item.nextInstallmentDate).toLocaleDateString("de-DE")}
                                        </span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <span className="text-slate-650 dark:text-slate-400 font-mono text-[11px]">
                                      {new Date(item.nextInstallmentDate).toLocaleDateString("de-DE")}
                                    </span>
                                  );
                                })()
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">-</span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-350 font-bold">
                              {(() => {
                                const displayedInt = item.interestAmount !== undefined 
                                  ? item.interestAmount 
                                  : 0;
                                return displayedInt > 0 ? (
                                  <div className="flex flex-col items-end leading-tight">
                                    <span>€ {displayedInt.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                ) : <span className="text-slate-400 dark:text-slate-650 italic font-sans font-normal">-</span>;
                              })()}
                            </td>

                            <td className="px-4 py-3 text-right font-black text-slate-800 dark:text-slate-100 font-mono">
                              € {item.amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                {/* Apply to generator button */}
                                <button
                                  onClick={() => transferToLetterGenerator(item)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-350 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                  title="Setzt diese Daten direkt in Briefentwurf ein"
                                  id={`apply-to-generator-${item.id}`}
                                >
                                  <FileText className="h-3 w-3" />
                                  <span>Brief-Briefing</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteDebt(item.id)}
                                  className="p-1 text-slate-405 hover:text-red-500 rounded hover:bg-red-500/10 active:scale-95 transition-all cursor-pointer"
                                  title="Dieser Posten löschen"
                                  id={`delete-debt-${item.id}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>

                          </tr>
                          {hasDetails && (
                            <tr className="bg-slate-50/20 dark:bg-slate-950/10 whitespace-normal">
                              <td colSpan={7} className="px-4 py-2 border-t-0">
                                <div className="p-3.5 bg-slate-100/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs">
                                  <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200/50 dark:border-slate-800/80 pb-1.5">
                                    <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1 text-[11px] uppercase tracking-wider font-mono">
                                      <Info className="h-3.5 w-3.5 text-slate-400" />
                                      {item.status === "tituliert" ? "Mittelbare Vollstreckungsakte (Häufigkeitsaufstellung)" : "Kanzlei-Dossiererklärung"}
                                    </span>
                                    {item.status === "tituliert" && (
                                      <span className="text-[10px] bg-red-100 dark:bg-red-950/60 text-red-900 dark:text-red-300 font-extrabold px-2 py-0.5 rounded border border-red-200/50 dark:border-red-900">
                                        ⚖️ {item.titledWith || "Vollstreckungsbescheid"} {item.titledDate ? `vom ${item.titledDate}` : ""}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                    <div>
                                      <span className="text-slate-400 dark:text-slate-500 block font-bold text-[9px] uppercase tracking-widest mb-0.5">Hauptforderung</span>
                                      <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                                        € {(item.principalAmount !== undefined ? item.principalAmount : item.amount).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 dark:text-slate-500 block font-bold text-[9px] uppercase tracking-widest mb-0.5">Verzugszinsen</span>
                                      <span className="font-bold font-mono text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                        € {(item.interestAmount !== undefined ? item.interestAmount : 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 dark:text-slate-500 block font-bold text-[9px] uppercase tracking-widest mb-0.5">Gerichts- & Inkassokosten</span>
                                      <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                                        € {(item.feesAmount || 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-450 dark:text-slate-500 block font-bold text-[9px] uppercase tracking-widest mb-0.5">Vollstreckungs-Summe</span>
                                      <span className="font-black font-mono text-rose-650 dark:text-rose-450">
                                        € {item.amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="text-[10px] text-slate-500 font-medium flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-200/35 dark:border-slate-850">
                                    <span><b>Aktenzeichen:</b> {item.fileReference}</span>
                                    <span>•</span>
                                    <span><b>Schuldner:</b> {item.debtorName || "Maximilian Schmidt"}</span>
                                    {item.originalCreditor && (
                                      <>
                                        <span>•</span>
                                        <span><b>Auftraggeber:</b> {item.originalCreditor}</span>
                                      </>
                                    )}
                                    {item.debtCollector && (
                                      <>
                                        <span>•</span>
                                        <span><b>Inkasso:</b> {item.debtCollector}</span>
                                      </>
                                    )}
                                    {item.status === "tituliert" && (
                                      <>
                                        <span>•</span>
                                        <span className="text-red-650 dark:text-red-400 font-semibold font-mono">Titel rechtskräftig • Zwangsvollstreckung droht</span>
                                      </>
                                    )}
                                    {item.status === "gescheitert" && (
                                      <>
                                        <span>•</span>
                                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                                          Einigung gescheitert {item.failureDate ? `am ${new Date(item.failureDate).toLocaleDateString("de-DE")}` : ""} ({item.failureReason || "Ablehnung"})
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  {item.offers && item.offers.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 bg-amber-50/25 dark:bg-amber-950/10 p-3 rounded-lg">
                                      <div className="flex items-center gap-2 mb-2 text-amber-850 dark:text-amber-300">
                                        <svg className="h-4 w-4 text-amber-550 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-extrabold text-[10px] uppercase tracking-wider font-sans">
                                          {item.offers.length} gütliche Vergleichs- / Ratenzahlungsangebote im Schuhkarton:
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                        {item.offers.map((off, oIdx) => (
                                          <div key={off.id || oIdx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 px-3 py-2 rounded-md shadow-sm flex items-center justify-between gap-3 hover:border-amber-400/50 transition-all">
                                            <div className="space-y-0.5">
                                              <div className="flex items-center gap-1.5 font-bold text-slate-850 dark:text-slate-100">
                                                <span>Angebot #{oIdx + 1}</span>
                                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${off.type === "installment" ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"}`}>
                                                  {off.type === "installment" ? "Ratenzahlungsangebot" : "Vergleichsrabatt"}
                                                </span>
                                              </div>
                                              <p className="text-slate-400 dark:text-slate-500 font-mono text-[9px]">
                                                Brief vom: {off.date ? new Date(off.date).toLocaleDateString("de-DE") : "k.A."} 
                                                {off.deadline && ` • Frist bis: ${new Date(off.deadline).toLocaleDateString("de-DE")}`}
                                              </p>
                                              {off.details && (
                                                <p className="text-slate-500 dark:text-slate-350 italic mt-0.5 text-[10px]">{off.details}</p>
                                              )}
                                            </div>
                                            <div className="text-right leading-none shrink-0 border-l border-slate-100 dark:border-slate-800 pl-3">
                                              <span className="block text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">Zahlungsbetrag</span>
                                              <span className="font-extrabold font-mono text-emerald-700 dark:text-emerald-450 text-xs">
                                                € {off.amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                              {off.originalAmount && off.originalAmount > off.amount && (
                                                <span className="block text-[9px] font-mono text-rose-500 line-through mt-0.5">
                                                  € {off.originalAmount.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Was-wäre-wenn-Tool (Rechner) */}
          {debts.length > 0 && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100/70 p-5 rounded-2xl border border-slate-200 dark:from-slate-900 dark:to-slate-950/40 dark:border-slate-800 space-y-4 shadow-sm" id="what-if-planner-card">
              <div className="flex items-center gap-2.5">
                <div className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 p-2 rounded-xl">
                  <Calculator className="h-4.5 w-4.5 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-850 dark:text-slate-100">
                    „Was-wäre-wenn“-Planungsrechner
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Ermitteln Sie die genaue Tilgungsdauer basierend auf Ihrer monatlichen Raten-Möglichkeit.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-12 items-center">
                
                {/* Rate Input (Left Column) */}
                <div className="md:col-span-5 space-y-2">
                  <label className="text-[10px] text-slate-450 dark:text-slate-500 uppercase block font-semibold tracking-wider">
                    Gewünschte Monatsrate (€ / Monat)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="5"
                      min="5"
                      value={wunschrate}
                      onChange={(e) => setWunschrate(e.target.value)}
                      placeholder="z.B. 100"
                      className="w-full rounded-xl border border-slate-250 bg-white px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                      id="what-if-wunschrate-input"
                    />
                    <span className="absolute right-3 top-3 text-[10px] font-mono font-bold text-slate-400">€ / Monat</span>
                  </div>

                  {/* Quick toggle chips */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {["50", "100", "150", "200"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setWunschrate(preset)}
                        className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                          wunschrate === preset
                            ? "bg-slate-900 text-white border-transparent dark:bg-white dark:text-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
                        }`}
                        id={`what-if-chips-${preset}`}
                      >
                        € {preset}
                      </button>
                    ))}
                  </div>

                  {/* Interactive Range-Slider */}
                  <div className="pt-2 bg-slate-50/60 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850/40">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] text-slate-450 dark:text-slate-500 uppercase font-bold tracking-wider">Intuitive Ratensteuerung</span>
                      <span className="text-[10px] bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-1.5 py-0.5 rounded font-mono font-bold">€ {wunschrate || "100"} / Monat</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max={Math.max(1000, Math.ceil(totalSum / 50) * 50)}
                      step="10"
                      value={isNaN(parseFloat(wunschrate)) ? 10 : parseFloat(wunschrate)}
                      onChange={(e) => setWunschrate(e.target.value)}
                      className="w-full h-1.5 bg-slate-250 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-slate-900 dark:accent-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      id="what-if-wunschrate-slider"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-bold font-mono pt-1">
                      <span>Mindestrate: € 10</span>
                      <span>Skaliertes Max: € {Math.max(1000, Math.ceil(totalSum / 50) * 50).toLocaleString("de-DE")}</span>
                    </div>
                  </div>
                </div>

                {/* Calculations & Scenarios Comparison (Right Column) */}
                <div className="md:col-span-7 space-y-3 bg-white dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-150 dark:border-slate-850/80">
                  {(() => {
                    const rateVal = parseFloat(wunschrate);
                    if (isNaN(rateVal) || rateVal <= 0) {
                      return (
                        <div className="text-center py-4 text-xs text-rose-500 font-bold">
                          Bitte geben Sie eine gültige monatliche Rate von mindestens 5 € ein.
                        </div>
                      );
                    }

                    // Calculations
                    const monthsNormal = Math.ceil(totalSum / rateVal);
                    const yearsNormal = (monthsNormal / 12).toFixed(1);

                    // Scenario B (discounted debt by 40% with Gesetzeslotse support)
                    const discountedTotal = totalSum * 0.6;
                    const monthsSpecial = Math.ceil(discountedTotal / rateVal);
                    const yearsSpecial = (monthsSpecial / 12).toFixed(1);
                    const savedSum = totalSum * 0.4;

                    return (
                      <div className="space-y-3 text-xs leading-normal">
                        
                        {/* Scenario Normal */}
                        <div className="flex justify-between items-baseline border-b border-slate-100 dark:border-slate-800/60 pb-2">
                          <div>
                            <span className="font-bold text-slate-700 dark:text-slate-300 block">Szenario A: Eigenregie</span>
                            <span className="text-[10px] text-slate-450 dark:text-slate-500">Volle Kreditsumme regulär abbezahlen</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-extrabold text-slate-850 dark:text-slate-100 font-mono">
                              {monthsNormal} Mon.
                            </span>
                            <span className="text-[10px] text-slate-450 block font-medium">
                              (ca. {yearsNormal} {parseFloat(yearsNormal) === 1.0 ? "Jahr" : "Jahre"})
                            </span>
                          </div>
                        </div>

                        {/* Scenario Special */}
                        <div className="flex justify-between items-baseline pt-1">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-emerald-700 dark:text-emerald-400">Szenario B: Mit Gesetzeslotse</span>
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 font-bold px-1 py-0.2 rounded-md tracking-wider uppercase">
                                Zins-Stopp & Vergleich
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-450 dark:text-slate-500">Durchschnittlich 40% Erlass möglich*</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono animate-pulse">
                              {monthsSpecial} Mon.
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">
                              (ca. {yearsSpecial} {parseFloat(yearsSpecial) === 1.0 ? "Jahr" : "Jahre"})
                            </span>
                          </div>
                        </div>

                        {/* Saved banner banner */}
                        <div className="bg-emerald-55/10 text-emerald-800 dark:text-emerald-450 p-2 rounded-lg border border-emerald-500/10 text-[10.5px] font-medium flex justify-between items-center mt-2">
                          <span>Geschätzter Schulden-Erlass (Sie sparen):</span>
                          <span className="font-black font-mono">
                            ca. € {savedSum.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        <p className="text-[9px] text-slate-400 italic leading-tight">*Schätzungen basieren auf Erfahrungswerten bei rechtzeitigen Vergleichen zur Gläubigerbefriedigung. Zinsen und weitere Gebühren werden effektiv eingefroren.</p>
                      </div>
                    );
                  })()}
                </div>

              </div>
            </div>
          )}

          {/* Self-Help recommendation guide */}
          {debts.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 dark:bg-slate-950/20 dark:border-slate-850 text-xs text-slate-650 space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-indigo-500" />
                Ihre nächsten Handlungsschritte im Überblick:
              </h4>
              <ul className="space-y-1 pl-4 list-disc">
                <li>
                  Richten Sie sofort Ihr <span className="font-bold">P-Konto</span> ein, wenn Sie eine Gesamtsumme von mehr als € 1500,- offen haben oder Pfändungsankündigungen eintreffen.
                </li>
                <li>
                  Nutzen Sie den <span className="font-bold">Brief-Generator</span>, um Vergleiche bzw. Stundungsanfragen direkt an die oben ausgewählten Gläubiger zu verfassen.
                </li>
                <li>
                  Falls Sie Hilfe bei komplexen Verhandlungen oder der Einigung zur Schuldenbefreiung benötigen, steht Ihnen das Team vom <span className="font-bold">Gesetzeslotse BERLIN</span> persönlich zur Seite.
                </li>
              </ul>
            </div>
          )}

        </div>

      </div>

      {/* CSV Import Preview & Validation Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-55 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" id="csv-validation-modal-overlay">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh]" id="csv-validation-modal-card">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-150 p-4 dark:border-slate-855">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Forderungs-Import verifizieren
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Wählen Sie aus, welche erkannten Posten Sie tatsächlich importieren möchten.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setCsvPreviewItems([]);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-650 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                id="close-csv-validation-modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable table list) */}
            <div className="overflow-y-auto p-4 space-y-4 flex-1">
              
              {/* Spalten-Mapping-Schnittstelle */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-205 dark:border-slate-800 space-y-3 shadow-inner">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal className="h-4 w-4 text-emerald-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Spalten-Mapping (Datenzuordnung)
                    </h4>
                  </div>
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-400 px-2 py-0.5 rounded font-mono font-bold">
                    Trenner: {csvSep === ";" ? "Semikolon (;)" : csvSep === "," ? "Komma (,)" : "Tabulator"}
                  </span>
                </div>
                
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                  Falls Ihre hochgeladene CSV abweichende oder unstrukturierte Kopfzeilen hat, können Sie hier die Spalten manuell zuweisen. Die Vorschau passt sich sofort in Echtzeit an.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  
                  {/* Gläubiger */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-505 dark:text-slate-400 uppercase font-black block tracking-wider">
                      Gläubigername (Pflicht)
                    </label>
                    <select
                      value={columnMapping.creditorName}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, creditorName: parseInt(e.target.value) }))}
                      className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      {csvHeaders.map((hdr, idx) => (
                        <option key={idx} value={idx}>Spalte {idx + 1}: {hdr || `[Leer]`}</option>
                      ))}
                    </select>
                  </div>

                  {/* Betrag */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-505 dark:text-slate-400 uppercase font-black block tracking-wider text-emerald-650 dark:text-emerald-450">
                      Forderungshöhe (Pflicht)
                    </label>
                    <select
                      value={columnMapping.amount}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, amount: parseInt(e.target.value) }))}
                      className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 font-bold text-emerald-600 dark:text-emerald-450 cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {csvHeaders.map((hdr, idx) => (
                        <option key={idx} value={idx}>Spalte {idx + 1}: {hdr || `[Leer]`}</option>
                      ))}
                    </select>
                  </div>

                  {/* Aktenzeichen */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-505 dark:text-slate-400 uppercase font-black block tracking-wider">
                      Aktenzeichen / Ref
                    </label>
                    <select
                      value={columnMapping.fileReference}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, fileReference: parseInt(e.target.value) }))}
                      className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value={-1}>-- Automatisch erstellen --</option>
                      {csvHeaders.map((hdr, idx) => (
                        <option key={idx} value={idx}>Spalte {idx + 1}: {hdr || `[Leer]`}</option>
                      ))}
                    </select>
                  </div>

                  {/* Kategorie */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-505 dark:text-slate-400 uppercase font-black block tracking-wider">
                      Kategorie / Sparte
                    </label>
                    <select
                      value={columnMapping.category}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, category: parseInt(e.target.value) }))}
                      className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer shadow-sm"
                    >
                      <option value={-1}>-- Als "Sonstiges" setzen --</option>
                      {csvHeaders.map((hdr, idx) => (
                        <option key={idx} value={idx}>Spalte {idx + 1}: {hdr || `[Leer]`}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-505 dark:text-slate-400 uppercase font-black block tracking-wider">
                      Vollstreckungsstatus
                    </label>
                    <select
                      value={columnMapping.status}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, status: parseInt(e.target.value) }))}
                      className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer shadow-sm"
                    >
                      <option value={-1}>-- Auto (Suche in Zeile) --</option>
                      {csvHeaders.map((hdr, idx) => (
                        <option key={idx} value={idx}>Spalte {idx + 1}: {hdr || `[Leer]`}</option>
                      ))}
                    </select>
                  </div>

                  {/* Fälligkeit */}
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-505 dark:text-slate-400 uppercase font-black block tracking-wider">
                      Fälligkeitsdatum
                    </label>
                    <select
                      value={columnMapping.nextInstallmentDate}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, nextInstallmentDate: parseInt(e.target.value) }))}
                      className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer shadow-sm"
                    >
                      <option value={-1}>-- Kein Fristdatum --</option>
                      {csvHeaders.map((hdr, idx) => (
                        <option key={idx} value={idx}>Spalte {idx + 1}: {hdr || `[Leer]`}</option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>

              <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
                <table className="min-w-full divide-y divide-slate-150 dark:divide-slate-850 text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-955 text-[10px] text-slate-450 font-bold uppercase tracking-wider select-none">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap w-10 text-center">
                        <input
                          type="checkbox"
                          checked={csvPreviewItems.length > 0 && csvPreviewItems.every(x => x.selected)}
                          onChange={handleToggleSelectAllCsvItems}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                          title="Alle an-/abwählen"
                          id="csv-select-all-checkbox"
                        />
                      </th>
                      <th className="px-4 py-3">Gläubiger / Ref</th>
                      <th className="px-4 py-3 text-center">Kategorie</th>
                      <th className="px-4 py-3 text-center">Heutige Stufe</th>
                      <th className="px-4 py-3 text-right">Forderungshöhe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                    {csvPreviewItems.map((item) => (
                      <tr 
                        key={item.id} 
                        className={`transition-colors ${
                          item.selected 
                            ? "bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-500/5" 
                            : "opacity-60 hover:bg-slate-50 dark:hover:bg-slate-800/20"
                        }`}
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleToggleSelectCsvItem(item.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                            id={`csv-checkbox-${item.id}`}
                          />
                        </td>
                        <td className="px-4 py-3 font-sans">
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            {item.creditorName}
                          </div>
                          <div className="text-[10px] text-slate-450 mt-0.5 font-mono">
                            Ref: {item.fileReference}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[9px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.status === "tituliert" ? (
                            <span className="text-[9px] bg-red-100 text-red-850 dark:bg-red-950/60 dark:text-red-400 px-1.5 py-0.5 rounded-full font-bold">
                              Tituliert
                            </span>
                          ) : (
                            <span className="text-[9px] bg-slate-100 text-slate-650 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                              {item.status === "ratenzahlung" ? "Ratenzahlung" : item.status === "verhandlung" ? "In Verhandlung" : "Offen"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-800 dark:text-slate-200 font-mono text-[13px]">
                          € {item.amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-150 p-4 dark:border-slate-850 bg-slate-50 dark:bg-slate-955/40 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs space-y-0.5 text-center sm:text-left">
                <div className="font-medium text-slate-400 uppercase text-[9px] tracking-wider">Erkannte Auswahlsachstände</div>
                <div className="font-extrabold text-slate-800 dark:text-slate-200">
                  {csvPreviewItems.filter(x => x.selected).length} von {csvPreviewItems.length} Posten ausgewählt
                </div>
                <div className="text-slate-550 font-semibold">
                  Gesamthebel: <span className="font-mono text-emerald-600 dark:text-emerald-450 font-black">€ {csvPreviewItems.filter(x => x.selected).reduce((sum, item) => sum + item.amount, 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsCsvModalOpen(false);
                    setCsvPreviewItems([]);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 border border-slate-250 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 bg-white dark:bg-slate-900 dark:text-slate-305 dark:border-slate-800 dark:hover:bg-slate-850 cursor-pointer"
                  id="cancel-csv-import-btn"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCsvImport}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-50 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  id="confirm-csv-import-btn"
                >
                  <Plus className="h-4 w-4" />
                  <span>Auswahl importieren</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
