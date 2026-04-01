import fs from "fs";
import path from "path";

const LOGS_DIR = path.join(process.cwd(), "data", "logs");

function ensureLogsDirExists() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function appendCsvRow(filePath: string, headers: string[], row: (string | number | null)[]) {
  ensureLogsDirExists();
  const fileExists = fs.existsSync(filePath);
  const csvRow =
    row
      .map((val) => {
        const str = val === null || val === undefined ? "" : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(",") + "\n";

  if (!fileExists) {
    const headerRow = headers.map((h) => `"${h}"`).join(",") + "\n";
    fs.writeFileSync(filePath, headerRow + csvRow, "utf-8");
  } else {
    fs.appendFileSync(filePath, csvRow, "utf-8");
  }
}

export interface Phase1LogEntry {
  teamId: string;
  turnIndex: number;
  userMessage: string;
  rationale: string;
  concept1: string;
  concept2: string;
  likert: number | null;
}

export interface Phase2LogEntry {
  teamId: string;
  selectedConcept1: string;
  selectedConcept2: string;
  userMessage: string;
  fusionDescription: string;
  imageUrl: string;
}

export function logPhase1(entry: Phase1LogEntry) {
  const filePath = path.join(LOGS_DIR, "phase1_logs.csv");
  const headers = [
    "timestamp",
    "teamId",
    "turnIndex",
    "userMessage",
    "rationale",
    "concept1",
    "concept2",
    "likert",
  ];
  const row = [
    new Date().toISOString(),
    entry.teamId,
    entry.turnIndex,
    entry.userMessage,
    entry.rationale,
    entry.concept1,
    entry.concept2,
    entry.likert,
  ];
  appendCsvRow(filePath, headers, row);
}

export function logPhase2(entry: Phase2LogEntry) {
  const filePath = path.join(LOGS_DIR, "phase2_logs.csv");
  const headers = [
    "timestamp",
    "teamId",
    "selectedConcept1",
    "selectedConcept2",
    "userMessage",
    "fusionDescription",
    "imageUrl",
  ];
  const row = [
    new Date().toISOString(),
    entry.teamId,
    entry.selectedConcept1,
    entry.selectedConcept2,
    entry.userMessage,
    entry.fusionDescription,
    entry.imageUrl,
  ];
  appendCsvRow(filePath, headers, row);
}
