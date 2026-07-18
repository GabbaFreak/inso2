export interface LimitConfig {
  year: number;
  baseAllowance: number;
  firstPersonAllowance: number;
  additionalPersonAllowance: number;
  label: string;
  standLabel: string;
  footnoteLabel: string;
  isProjected: boolean;
}

/**
 * Resolves the active table year based on the current or specified date.
 * German Pfändungsfreigrenzen are updated on July 1st of each year.
 * So if we are in June 2026, the active cycle is 2025.
 * If we are on or after July 1st 2026, the active cycle is 2026.
 */
export function getActiveCycleYearForDate(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 is January, 11 is December
  
  if (month < 6) { // Before July (January - June)
    return year - 1;
  }
  return year;
}

/**
 * Returns the exact P-Konto garnishment limits for a given effective year.
 * Supports manual override and automatic annual CPI projection for future years (2027+).
 */
export function getLimitsForEffectiveYear(effectiveYear: number): LimitConfig {
  if (effectiveYear <= 2023) {
    return {
      year: 2023,
      baseAllowance: 1402.28,
      firstPersonAllowance: 527.76,
      additionalPersonAllowance: 294.12,
      label: "Tabelle gültig ab 01.07.2023 (historisch)",
      standLabel: "01.07.2023",
      footnoteLabel: "Historische Pfändungsfreibeträge basierend auf der Gesetzestabelle von 2023/2024.",
      isProjected: false
    };
  } else if (effectiveYear === 2024) {
    return {
      year: 2024,
      baseAllowance: 1502.94,
      firstPersonAllowance: 561.43,
      additionalPersonAllowance: 312.78,
      label: "Tabelle gültig ab 01.07.2024 (historisch)",
      standLabel: "01.07.2024",
      footnoteLabel: "Historische Pfändungsfreibeträge basierend auf der Gesetzestabelle von 2024/2025.",
      isProjected: false
    };
  } else if (effectiveYear === 2025) {
    return {
      year: 2025,
      baseAllowance: 1560.00,
      firstPersonAllowance: 585.23,
      additionalPersonAllowance: 326.04,
      label: "Tabelle gültig ab 01.07.2025 (vorheriger Stand)",
      standLabel: "01.07.2025",
      footnoteLabel: "Pfändungsfreibeträge basierend auf der Gesetzestabelle von 2025/2026.",
      isProjected: false
    };
  } else if (effectiveYear === 2026) {
    return {
      year: 2026,
      baseAllowance: 1560.00,
      firstPersonAllowance: 585.23,
      additionalPersonAllowance: 326.04,
      label: "Tabelle gültig ab 01.07.2026 (aktuellster Stand)",
      standLabel: "01.07.2026",
      footnoteLabel: "Pfändungsfreibeträge basierend auf der Gesetzestabelle von 2026/2027 (unverändert zu 2025/2026).",
      isProjected: false
    };
  } else {
    // Future Years (2027+): Automate yearly updates with standard compound CPI indexation of 1.5% p.a.
    const yearsSince2026 = effectiveYear - 2026;
    const inflationFactor = Math.pow(1.015, yearsSince2026);
    
    const baseAllowance = Math.round(1560.00 * inflationFactor * 100) / 100;
    const firstPersonAllowance = Math.round(585.23 * inflationFactor * 100) / 100;
    const additionalPersonAllowance = Math.round(326.04 * inflationFactor * 100) / 100;

    return {
      year: effectiveYear,
      baseAllowance,
      firstPersonAllowance,
      additionalPersonAllowance,
      label: `Tabelle gültig ab 01.07.${effectiveYear} (dynamische Fortschreibung)`,
      standLabel: `01.07.${effectiveYear}`,
      footnoteLabel: `Dienstliche Fortschreibung der Pfändungsfreibeträge ab 01.07.${effectiveYear} basierend auf einer Standardanpassung (+1,5% p.a.).`,
      isProjected: true
    };
  }
}

/**
 * Returns limits for a specific date, automatically determining the active cycle (e.g. July 1st boundary).
 */
export function getLimitsForDate(date: Date = new Date()): LimitConfig {
  const activeYear = getActiveCycleYearForDate(date);
  return getLimitsForEffectiveYear(activeYear);
}
