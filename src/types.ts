export interface Creditor {
  id: string;
  name: string;
  street: string;
  city: string;
  fileReference?: string;
  debtAmount?: string;
}

export interface SettlementOffer {
  id: string;
  date: string; // Datum des Schreibens / Angebots (Format YYYY-MM-DD)
  amount: number; // Angebotener reduzierter Einmalbetrag (z.B. 173) oder Ratenbetrag
  originalAmount: number; // Die im Brief genannte Gesamtforderung vor Rabatt (z.B. 264.88)
  deadline?: string; // Frist (z.B. "2025-11-28")
  type: "settlement" | "installment"; // "settlement" = Vergleich/Rabatt, "installment" = Ratenzahlungsangebot
  details?: string; // Beschreibung des Angebots
}

export interface DebtItem {
  id: string;
  creditorName: string;
  originalCreditor?: string; // Auftraggeber (z.B. Vodafone, eBay)
  debtCollector?: string; // Inkassounternehmen oder Vertreter (z.B. HFG, coeo, KSP)
  street: string;
  city: string;
  fileReference: string;
  amount: number;
  category: string;
  status: "offen" | "ratenzahlung" | "verhandlung" | "tituliert" | "gescheitert";
  createdAt: string;
  nextInstallmentDate?: string;
  debtorName?: string;
  principalAmount?: number;
  interestAmount?: number;
  feesAmount?: number;
  titledWith?: string;
  titledDate?: string;
  failureDate?: string;
  failureReason?: string;
  mbPrincipal?: string;
  mbInterestArrears?: string;
  mbCourtCosts?: string;
  mbClaimantExpenses?: string;
  mbExtraFees?: string;
  mbCalculatedInterest?: string;
  mbCurrentInterest?: string;
  offers?: SettlementOffer[]; // Vergleichsangebote oder Ratenvereinbarungen
  mostRecentPageNumber?: number; // Exakte Seitennummer des aktuellsten Forderungsschreibens im Dokument
}

export interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  audioUrl?: string; // Local play URL
  timestamp: Date;
  isVoiceInput?: boolean;
}

export interface PKontoResult {
  baseAllowance: number;
  childAllowance: number;
  partnerAllowance: number;
  totalAllowance: number;
  dependentsCount: number;
  hasPartner: boolean;
}

export type LetterTemplateType = "ratenzahlung" | "pkonto_conversion" | "brief_gerichtsvollzieher";

export interface LetterData {
  senderName: string;
  senderStreet: string;
  senderCity: string;
  creditorName: string;
  creditorStreet: string;
  creditorCity: string;
  fileReference: string; // Aktenzeichen
  debtAmount: string;
  installmentAmount?: string;
  date: string;
}
