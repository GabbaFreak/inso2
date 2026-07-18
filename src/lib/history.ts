export interface ActivityLog {
  id: string;
  debtorName: string;
  type: "calculation" | "letter" | "vollmacht" | "frist" | "schulden";
  action: string;
  details: string;
  timestamp: string;
}

export function logGesetzeslotseActivity(
  type: "calculation" | "letter" | "vollmacht" | "frist" | "schulden",
  action: string,
  details: string
) {
  const debtorName = localStorage.getItem("gesetzeslotse_active_debtor_name") || "Maximilian Schmidt";
  const stored = localStorage.getItem("gesetzeslotse_activity_history");
  let history: ActivityLog[] = [];
  
  if (stored) {
    try {
      history = JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse activity history", e);
    }
  }
  
  const timestamp = new Date().toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  
  const newLog: ActivityLog = {
    id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    debtorName,
    type,
    action,
    details,
    timestamp
  };
  
  history.unshift(newLog);
  if (history.length > 30) {
    history = history.slice(0, 30);
  }
  
  localStorage.setItem("gesetzeslotse_activity_history", JSON.stringify(history));
  window.dispatchEvent(new CustomEvent("gesetzeslotse_activity_logged"));
}
