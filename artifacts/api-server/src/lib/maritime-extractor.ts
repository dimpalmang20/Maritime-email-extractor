// Maritime Email Extraction Engine — Rule-Based + Template Parser

export type EmailType = "VC" | "TC" | "Tonnage" | "Mixed" | "Unknown";
export type Pipeline = "rule-based" | "template" | "llm-fallback";
export type EntryType = "VC" | "TC" | "Tonnage";

export interface ExtractedFields {
  email_type?: string | null;
  cargo_name?: string | null;
  account_name?: string | null;
  cargo_type?: string | null;
  tonnage_name?: string | null;
  tonnage_type?: string | null;
  min_size?: number | null;
  max_size?: number | null;
  region?: string | null;
  matching_region?: string | null;
  load_port?: string | null;
  discharge_port?: string | null;
  del_port?: string | null;
  redel_port?: string | null;
  port?: string | null;
  open_date?: string | null;
  close_date?: string | null;
  laycan_start_date?: string | null;
  laycan_end_date?: string | null;
  duration?: string | null;
  dwt?: string | null;
  imo?: string | null;
  grt?: string | null;
  nrt?: string | null;
  loa?: string | null;
  beam?: string | null;
  grain_capacity?: string | null;
  load_rate?: string | null;
  discharge_rate?: string | null;
  commission?: string | null;
  pic?: string | null;
  email_id?: string | null;
  phone_number?: string | null;
  restriction?: string | null;
  reason?: string | null;
}

export interface ExtractedEntry {
  entryType: EntryType;
  confidence: number;
  extractionMethod: Pipeline;
  fields: ExtractedFields;
}

export interface ExtractionResult {
  emailType: EmailType;
  pipeline: Pipeline;
  confidence: number;
  extractedEntries: ExtractedEntry[];
  processingMs: number;
  llmUsed: boolean;
  estimatedCostUsd: number;
}

// ─── Enterprise JSON Schema ───────────────────────────────────────────────────

export interface EnterpriseEntry {
  email_type: string;
  vessel_name: string;
  vessel_type: string;
  dwt: string;
  cargo: string;
  cargo_type: string;
  load_port: string;
  discharge_port: string;
  open_port: string;
  open_date: string;
  close_date: string;
  laycan_start: string;
  laycan_end: string;
  quantity: string;
  quantity_unit: "MT";
  load_rate: string;
  discharge_rate: string;
  commission: string;
  imo: string;
  grt: string;
  nrt: string;
  loa: string;
  beam: string;
  grain_capacity: string;
  restrictions: string[];
  matching_region: string;
  confidence_score: number;
}

// ─── Maritime Knowledge Base ──────────────────────────────────────────────────

const REGION_MAP: Record<string, string> = {
  WAFR: "West Africa", WAFR1: "West Africa", SAFR: "South Africa", EAFR: "East Africa",
  ECI: "East Coast India", WCI: "West Coast India", WCI1: "West Coast India",
  "S.E.ASIA": "South East Asia", SEASIA: "South East Asia", SEA: "South East Asia",
  AG: "Arabian Gulf", PG: "Persian Gulf", MED: "Mediterranean",
  BSEA: "Black Sea", BALTIC: "Baltic Sea", USEC: "US East Coast",
  USGC: "US Gulf Coast", USG: "US Gulf Coast", USWC: "US West Coast",
  WCCA: "West Coast Central America", WCSA: "West Coast South America",
  ECSA: "East Coast South America", GOA: "Gulf of Aden", ARAG: "Arabian Gulf",
  HRA: "High Risk Area", COGH: "Cape of Good Hope", WWW: "World Wide",
  WW: "World Wide", "W.W.": "World Wide", SPORE: "Singapore",
  SSPORE: "Singapore", SCHINA: "South China", NCHINA: "North China",
  JAPAN: "Japan", "S.KOREA": "South Korea", SKOREA: "South Korea",
  RECALADA: "East Coast South America", SANTOS: "East Coast South America",
  HOUSTON: "US Gulf Coast", TAMPA: "US Gulf Coast",
};

const PORT_ABBREVS: Record<string, string> = {
  BIK: "Bandar Imam Khomeini, Iran", KANDLA: "Kandla, India", KAKINADA: "Kakinada, India",
  VIZAG: "Visakhapatnam, India", MUMBAI: "Mumbai, India", HAZIRA: "Hazira, India",
  LUMUT: "Lumut, Malaysia", SURABAYA: "Surabaya, Indonesia", BAHODOPI: "Bahodopi, Indonesia",
  SANTOS: "Santos, Brazil", PARANAGUA: "Paranaguá, Brazil", UPRIVER: "Upriver, Argentina",
  "SAN LORENZO": "San Lorenzo, Argentina", AQABA: "Aqaba, Jordan",
  PIVDENNIY: "Pivdenniy, Ukraine", ISKENDERUN: "Iskenderun, Turkey",
  DURBAN: "Durban, South Africa", BUSHEHR: "Bushehr, Iran", DOHA: "Doha, Qatar",
  HODEIDAH: "Hodeidah, Yemen", BUKPYUNG: "Bukpyung, South Korea",
  GUANGZHOU: "Guangzhou, China", TAIPEI: "Taipei, Taiwan",
  PORBANDAR: "Porbandar, India", LANSHAN: "Lanshan, China",
  SINGAPORE: "Singapore", SINGAPORE1: "Singapore", COLOMBO: "Colombo, Sri Lanka",
  CHITTAGONG: "Chittagong, Bangladesh", KARACHI: "Karachi, Pakistan",
  VANCOUVER: "Vancouver, Canada", BALTIMORE: "Baltimore, USA",
  HOUSTON: "Houston, USA", ROTTERDAM: "Rotterdam, Netherlands",
  ANTWERP: "Antwerp, Belgium", HAMBURG: "Hamburg, Germany",
};

const VESSEL_SIZE_MAP: Record<string, { min: number; max: number }> = {
  HANDYMAX: { min: 10000, max: 49999 }, HMAX: { min: 10000, max: 49999 },
  SUPRAMAX: { min: 50000, max: 59999 }, SMAX: { min: 50000, max: 59999 },
  SMX: { min: 50000, max: 59999 }, SUPRA: { min: 50000, max: 59999 },
  ULTRAMAX: { min: 60000, max: 69999 }, UMAX: { min: 60000, max: 69999 },
  UMX: { min: 60000, max: 69999 }, ULTRA: { min: 60000, max: 69999 },
  PANAMAX: { min: 70000, max: 79999 }, PMX: { min: 70000, max: 79999 },
  KAMSARMAX: { min: 80000, max: 89999 }, KMAX: { min: 80000, max: 89999 },
  "BABY CAPE": { min: 90000, max: 199999 }, CAPESIZE: { min: 200000, max: 999999 },
  HANDYSIZE: { min: 10000, max: 39999 }, HANDY: { min: 10000, max: 39999 },
  CAPE: { min: 200000, max: 999999 }, POST: { min: 80000, max: 99999 },
  SDBC: { min: 50000, max: 79999 },
};

const CARGO_TYPE_MAP: Record<string, string> = {
  BULK: "Dry Bulk", GRAIN: "Dry Bulk", COAL: "Dry Bulk", FERTILIZER: "Dry Bulk",
  FERTS: "Dry Bulk", UREA: "Dry Bulk", IRON: "Dry Bulk", SLAG: "Dry Bulk",
  CLINKER: "Dry Bulk", PETCOKE: "Dry Bulk", LIMESTONE: "Dry Bulk",
  MAIZE: "Dry Bulk", CORN: "Dry Bulk", SOYBEAN: "Dry Bulk", POTASH: "Dry Bulk",
  SULPHUR: "Dry Bulk", SALT: "Dry Bulk", BAUXITE: "Dry Bulk", MANGANESE: "Dry Bulk",
  COILS: "General Cargo", STEEL: "General Cargo", STEELS: "General Cargo",
  GENS: "General Cargo", LOGS: "General Cargo", LOG: "General Cargo",
  CRUDE: "Crude Oil", CHEMICAL: "Chemical", GAS: "Gas",
};

// Structural ship parts that must never be treated as cargo
const CARGO_BLACKLIST = new Set([
  "HOLD", "HOLDS", "ENGINE", "BRIDGE", "AFT", "ACCOMMODATION",
  "BUNKERS", "FUEL", "BALLAST", "BOW", "STERN", "DECK",
  "HATCH", "HATCHES", "WINCH", "CRANE", "GEAR", "MAIN ENGINE",
  "AFT PEAK", "FORE PEAK", "VOID SPACE", "PAINT", "BULK HARMLESS",
  "ENGINE/BRIDGE AFT", "BRIDGE AFT",
]);

// ─── Validators ───────────────────────────────────────────────────────────────

function isValidPort(text: string): boolean {
  if (!text) return false;
  const t = text.trim().toUpperCase();
  // Reject single letters and 2-char strings (A, U, AG, etc.)
  if (t.length <= 2) return false;
  // Reject strings that are purely region codes (WAFR, AG, etc.)
  if (REGION_MAP[t] !== undefined) return false;
  // Reject very short strings unless in our known port dictionary
  if (t.length <= 3 && !PORT_ABBREVS[t]) return false;
  // Reject strings starting with a digit (e.g. "1SP WAFR", "2-3 PORTS")
  if (/^\d/.test(t)) return false;
  // Reject strings with only digits
  if (/^\d+$/.test(t)) return false;
  // Reject charterparty terms like "1SP", "2SP", "AAAA", "DLOSP"
  if (/^\d+SP\b/i.test(t)) return false;
  return true;
}

function isValidCargo(name: string): boolean {
  if (!name) return false;
  const t = name.trim().toUpperCase();
  if (t.length < 3) return false;
  if (CARGO_BLACKLIST.has(t)) return false;
  // Partial matches for compound blacklisted terms
  if (/ENGINE\s*\/?\s*BRIDGE|BRIDGE\s*AFT|MAIN\s*ENGINE|VOID\s*SPACE/i.test(t)) return false;
  // Reject obvious ship structure words
  if (/^(HOLD|HATCH|DECK|WINCH|CRANE)\b/i.test(t)) return false;
  return true;
}

function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.trim();
  // Must have at least 8 digits
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 8) return false;
  // Reject patterns like "3)" or "1)" or bullet-style
  if (/^\d\)/.test(cleaned)) return false;
  // Must consist only of valid phone characters
  if (!/^[\+\d\s\-()\[\]\.#,]+$/.test(cleaned)) return false;
  // Reject if it looks like a rate or percentage (e.g. "3.75%")
  if (/%/.test(cleaned)) return false;
  return true;
}

function normalizeDwtNumber(raw: string | null): string {
  if (!raw) return "";
  const kMatch = raw.trim().match(/^(\d+(?:\.\d+)?)\s*[Kk]$/);
  if (kMatch) {
    const val = Math.round(parseFloat(kMatch[1]) * 1000);
    return val >= 1000 ? val.toString() : "";
  }
  const num = parseInt(raw.replace(/[,.\s]/g, ""), 10);
  if (isNaN(num) || num < 1000) return "";
  return num.toString();
}

function fixDates(open: string | null, close: string | null): { open: string; close: string } {
  if (!open) return { open: "", close: close || "" };
  if (!close) return { open, close: "" };
  const openTs = new Date(open).getTime();
  const closeTs = new Date(close).getTime();
  if (!isNaN(openTs) && !isNaN(closeTs) && closeTs < openTs) {
    // close is before open — add 5 days to open to get a valid close
    const newClose = new Date(openTs + 5 * 86400000).toISOString().split("T")[0];
    return { open, close: newClose };
  }
  return { open, close };
}

// ─── Patterns ─────────────────────────────────────────────────────────────────

const PATTERNS = {
  account: /(?:A\/C|ACCT?|Account)[:\s*]+([^\n*]+)/i,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /(?:Mobile|Phone|WhatsApp|Contact)\s*[/\s:]*(\+?[\d][\d\s\-().+]{7,24})/gi,
  // DWT: explicit range or single with K notation support
  dwtRange: /(\d{1,3}(?:[.,]\d{3})?)(K?)\s*[-–]\s*(\d{1,3}(?:[.,]\d{3})?)(K?)\s*(?:DWT|DEADWEIGHT)/i,
  dwtSingle: /(\d{1,3}(?:[.,]\d{3})?)(K?)\s*(?:DWT|DEADWEIGHT)/i,
  laycan: /LAYCAN[:\s]+([^\n]+)/i,
  duration: /DURATION[:\s*]+(?:ABT\s+)?(\d+)\s*(?:TO|[-–])\s*(\d+)\s*DAYS?/i,
  durationSingle: /DURATION[:\s*]+(?:ABT\s+)?(\d+)\s*DAYS?/i,
  delivery: /(?:DELY?|DEL|DELIVERY)[:\s*]+([^\n*]+)/i,
  redelivery: /(?:REDELY?|REDEL|RE-DELY?|REDELIVERY)[:\s*]+([^\n*]+)/i,
  loadPort: /(?:LP|LOADING\s*PORT?|POL)[:\s]+([^\n]+)/i,
  dischargePort: /(?:DP|DISCHARGE\s*PORT?|POD)[:\s]+([^\n]+)/i,
  cargo: /(?:CARGO|COMMODITY|COMMODIT)[:\s*]+([^\n*]+)/i,
  tonnage: /(?:TONNAGE|VESSEL)[:\s*]+([^\n*]+)/i,
  imo: /IMO\s*(?:NO?\.?\s*)?[:\-]?\s*(\d{7})/i,
  grt: /(?:GRT|GT|GROSS\s*(?:REG(?:ISTERED)?\s*)?TON(?:NAGE)?)\s*[:\-\/]*\s*([\d,.\s]{4,12})/i,
  nrt: /(?:NRT|NT|NET\s*(?:REG(?:ISTERED)?\s*)?TON(?:NAGE)?)\s*[:\-\/]*\s*([\d,.\s]{4,12})/i,
  loa: /(?:LOA|LENGTH\s*(?:OVERALL)?)\s*[:\-\/]*\s*(\d+(?:[.,]\d+)?)\s*(?:M|MTS?)?/i,
  beam: /(?:BEAM|BREADTH|MOULDED\s*BREADTH)\s*[:\-\/]*\s*(\d+(?:[.,]\d+)?)\s*(?:M|MTS?)?/i,
  grainCap: /GRAIN\s*(?:CAPACITY|CAP(?:ACITY)?)\s*[:\-\/]*\s*([\d,.\s]{4,12})/i,
  loadRate: /(?:LOAD(?:ING)?\s*RATE|L\/?R|LDRATE)\s*[:\-]*\s*([\d,]{3,10})\s*(?:MT\s*\/?\s*D(?:AY)?|PDPR?|PMD|MTONS)/i,
  dischargeRate: /(?:DISCH(?:ARGE)?\s*RATE|D\/?R|DISRATE)\s*[:\-]*\s*([\d,]{3,10})\s*(?:MT\s*\/?\s*D(?:AY)?|PDPR?|PMD|MTONS)/i,
  commission: /(?:ADCOM|ADD(?:RESS)?\s*COMM(?:ISSION)?|COMM(?:ISSION)?)\s*[:\s]*(\d+(?:\.\d+)?)\s*%/i,
  quantity: /(?:M\/M\s*)?(\d{1,3}(?:[,.\s]\d{3})*)\s*(?:MTS?|METRIC\s*TONS?)/i,
  quantityRange: /(\d{1,3}(?:[,.\s]\d{3})*)\s*[-–]\s*(\d{1,3}(?:[,.\s]\d{3})*)\s*(?:MTS?|METRIC\s*TONS?)/i,
  restriction: /(?:NO\s+(?:CHINESE|PAKISTANI|RED SEA|HRA|GOA|IRANIAN|ISRAELI|SANCTIONED)[^\n]*)/gi,
  mvName: /\bM[TV]\/?\s+([A-Z][A-Z0-9\s]+?)(?:\s*[\(\/'"]|\s+\d{4}BLT|\s+\d{2,3}K\s)/i,
};

// ─── Date Parsing ─────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  JAN: "01", JANUARY: "01", FEB: "02", FEBRUARY: "02", MAR: "03", MARCH: "03",
  APR: "04", APRIL: "04", MAY: "05", JUN: "06", JUNE: "06",
  JUL: "07", JULY: "07", AUG: "08", AUGUST: "08", SEP: "09", SEPTEMBER: "09",
  OCT: "10", OCTOBER: "10", NOV: "11", NOVEMBER: "11", DEC: "12", DECEMBER: "12",
};

function parseLaycan(text: string): { start: string | null; end: string | null } {
  const upper = text.toUpperCase().trim();

  // Pattern: "18th - 20th JULY, 2025" or "16-21 OCT 2025"
  const rangeMatch = upper.match(/(\d{1,2})(?:ST|ND|RD|TH)?\s*[-–]\s*(\d{1,2})(?:ST|ND|RD|TH)?\s+([A-Z]+)[,.\s]+(\d{4})/);
  if (rangeMatch) {
    const [, d1, d2, mon, yr] = rangeMatch;
    const m = MONTH_MAP[mon];
    if (m) {
      const start = `${yr}-${m}-${d1.padStart(2, "0")}`;
      const end = `${yr}-${m}-${d2.padStart(2, "0")}`;
      const fixed = fixDates(start, end);
      return { start: fixed.open, end: fixed.close };
    }
  }

  // Pattern: "END JULY, 2025" or "LATE JULY 2025"
  const endMonthMatch = upper.match(/(?:END|LATE)\s+([A-Z]+)[,.\s]+(\d{4})/);
  if (endMonthMatch) {
    const [, mon, yr] = endMonthMatch;
    const m = MONTH_MAP[mon];
    if (m) {
      const lastDay = new Date(parseInt(yr), parseInt(m), 0).getDate();
      const start = `${yr}-${m}-${(lastDay - 5).toString().padStart(2, "0")}`;
      const end = `${yr}-${m}-${lastDay.toString().padStart(2, "0")}`;
      return { start, end };
    }
  }

  // Pattern: "EARLY JULY 2025" or "MID AUGUST 2025"
  const midEarlyMatch = upper.match(/(?:EARLY|MID|BEGINNING\s+OF)\s+([A-Z]+)[,.\s]+(\d{4})/);
  if (midEarlyMatch) {
    const [, mon, yr] = midEarlyMatch;
    const m = MONTH_MAP[mon];
    if (m) {
      const isEarly = upper.includes("EARLY");
      const prefix = isEarly ? "01" : "15";
      const endDay = isEarly ? "10" : "20";
      return { start: `${yr}-${m}-${prefix}`, end: `${yr}-${m}-${endDay}` };
    }
  }

  // Pattern: "16-21 OCT" (no year) — use captured year or current
  const simpleRange = upper.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([A-Z]+)[,\s]*(\d{4})?/);
  if (simpleRange) {
    const [, d1, d2, mon, capturedYr] = simpleRange;
    const m = MONTH_MAP[mon];
    const yr = capturedYr ?? new Date().getFullYear().toString();
    if (m) {
      const start = `${yr}-${m}-${d1.padStart(2, "0")}`;
      const end = `${yr}-${m}-${d2.padStart(2, "0")}`;
      const fixed = fixDates(start, end);
      return { start: fixed.open, end: fixed.close };
    }
  }

  // Pattern: "20 JULY ONWARDS" or "20 JULY 2025 ONWARDS" — open-ended start
  const onwardsMatch = upper.match(/(\d{1,2})(?:ST|ND|RD|TH)?\s+([A-Z]+)(?:[,.\s]+(\d{4}))?\s+ONWARDS/);
  if (onwardsMatch) {
    const [, d, mon, yr] = onwardsMatch;
    const m = MONTH_MAP[mon];
    const year = yr ?? new Date().getFullYear().toString();
    if (m) {
      const start = `${year}-${m}-${d.padStart(2, "0")}`;
      return { start, end: null };
    }
  }

  // Pattern: "22ND JULY 2025" single date → range +5 days
  const singleDate = upper.match(/(\d{1,2})(?:ST|ND|RD|TH)?\s+([A-Z]+)[,.\s]+(\d{4})/);
  if (singleDate) {
    const [, d, mon, yr] = singleDate;
    const m = MONTH_MAP[mon];
    if (m) {
      const start = `${yr}-${m}-${d.padStart(2, "0")}`;
      const startTs = new Date(start).getTime();
      const end = new Date(startTs + 5 * 86400000).toISOString().split("T")[0];
      return { start, end };
    }
  }

  // Pattern: "JULY 2025" single month
  const monthOnly = upper.match(/\b([A-Z]+)[,\s]+(\d{4})\b/);
  if (monthOnly) {
    const [, mon, yr] = monthOnly;
    const m = MONTH_MAP[mon];
    if (m) {
      const lastDay = new Date(parseInt(yr), parseInt(m), 0).getDate();
      return { start: `${yr}-${m}-01`, end: `${yr}-${m}-${lastDay}` };
    }
  }

  // Pattern: "PROMPT" or "SPOT"
  if (upper.includes("PROMPT") || upper.includes("SPOT")) {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    const end = new Date(today); end.setDate(end.getDate() + 5);
    return { start: fmt(today), end: fmt(end) };
  }

  return { start: null, end: null };
}

function parseDwt(text: string): { min: number | null; max: number | null } {
  const upper = text.toUpperCase();

  // PRIORITY 1: Explicit DWT range "58K - 60K DWT" or "58,000-60,000 DWT"
  const rangeMatch = upper.match(/(\d{1,3}(?:[.,]\d{3})?)(K?)\s*[-–]\s*(\d{1,3}(?:[.,]\d{3})?)(K?)\s*(?:DWT|DEADWEIGHT)/);
  if (rangeMatch) {
    const [, v1, k1, v2, k2] = rangeMatch;
    const f1 = k1 ? 1000 : 1;
    const f2 = k2 ? 1000 : 1;
    const minVal = parseFloat(v1.replace(/[,.]/g, "")) * f1;
    const maxVal = parseFloat(v2.replace(/[,.]/g, "")) * f2;
    if (minVal >= 1000 && maxVal >= 1000) return { min: minVal, max: maxVal };
  }

  // PRIORITY 2: Explicit single DWT "58K DWT" or "58,000 DWT"
  const singleMatch = upper.match(/(\d{1,3}(?:[.,]\d{3})?)(K?)\s*(?:DWT|DEADWEIGHT)/);
  if (singleMatch) {
    const [, v, k] = singleMatch;
    const f = k ? 1000 : 1;
    const val = parseFloat(v.replace(/[,.]/g, "")) * f;
    if (val >= 1000) return { min: val, max: val };
  }

  // PRIORITY 3: Vessel size class names (SUPRA, ULTRAMAX, etc.)
  for (const [name, range] of Object.entries(VESSEL_SIZE_MAP)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(upper)) {
      const parts = upper.split(/[\/,]+/);
      let min = Infinity, max = -Infinity;
      let found = false;
      for (const part of parts) {
        const clean = part.trim().replace(/[^A-Z]/g, "");
        if (VESSEL_SIZE_MAP[clean]) {
          min = Math.min(min, VESSEL_SIZE_MAP[clean].min);
          max = Math.max(max, VESSEL_SIZE_MAP[clean].max);
          found = true;
        }
      }
      if (found && min !== Infinity) return { min, max };
      return { min: range.min, max: range.max };
    }
  }

  return { min: null, max: null };
}

function parseQuantity(text: string): { min: number | null; max: number | null } {
  const upper = text.toUpperCase();
  const rangeMatch = upper.match(/(\d{1,3}(?:[,.\s]\d{3})*)\s*[-–]\s*(\d{1,3}(?:[,.\s]\d{3})*)\s*(?:MTS?|METRIC\s*TONS?)/);
  if (rangeMatch) {
    return {
      min: parseInt(rangeMatch[1].replace(/[,.\s]/g, "")),
      max: parseInt(rangeMatch[2].replace(/[,.\s]/g, "")),
    };
  }
  const singleMatch = upper.match(/(\d{1,3}(?:[,.\s]\d{3})*)\s*(?:MTS?|METRIC\s*TONS?)/);
  if (singleMatch) {
    const val = parseInt(singleMatch[1].replace(/[,.\s]/g, ""));
    return { min: val, max: val };
  }
  return { min: null, max: null };
}

function extractSignature(text: string): { pic: string | null; email: string | null; phone: string | null } {
  const emails = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
  const email = emails ? emails[0] : null;

  let phone: string | null = null;
  const phoneRegex = /(?:Mobile|Phone|WhatsApp|Contact)\s*[/\s:]*(\+?[\d][\d\s\-().+]{7,24})/gi;
  let phoneMatch;
  while ((phoneMatch = phoneRegex.exec(text)) !== null) {
    const candidate = phoneMatch[1].trim();
    if (isValidPhone(candidate)) {
      phone = candidate;
      break;
    }
  }

  const lines = text.split("\n");
  let pic: string | null = null;
  for (const line of lines) {
    const t = line.trim();
    if (t.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/) && t.split(" ").length <= 3) {
      pic = t;
      break;
    }
  }

  return { pic, email, phone };
}

function resolveRegion(text: string): string | null {
  const upper = text.toUpperCase();
  for (const [abbrev, full] of Object.entries(REGION_MAP)) {
    if (new RegExp(`\\b${abbrev}\\b`).test(upper)) return full;
  }
  return null;
}

function resolvePort(text: string): string {
  const upper = text.trim().toUpperCase();
  return PORT_ABBREVS[upper] ?? text.trim();
}

function detectCargoType(text: string): string {
  const upper = text.toUpperCase();
  for (const [keyword, type] of Object.entries(CARGO_TYPE_MAP)) {
    if (upper.includes(keyword)) return type;
  }
  return "Dry Bulk";
}

function parseDuration(text: string): string | null {
  const rangeMatch = text.match(/(?:ABT\s+)?(\d+)\s*(?:TO|[-–])\s*(\d+)\s*(DAYS?|MONTHS?|YEARS?|YRS?|MOS?)?/i);
  if (rangeMatch) {
    const [, , max, unit = "DAYS"] = rangeMatch;
    const u = unit.toUpperCase();
    const unitStr = u.startsWith("MONTH") ? "months" : u.startsWith("YEAR") || u.startsWith("YR") ? "years" : "days";
    return `${max} ${unitStr}`;
  }
  const singleMatch = text.match(/(?:ABT\s+)?(\d+)\s*(DAYS?|MONTHS?|YEARS?|YRS?|MOS?)/i);
  if (singleMatch) {
    const [, val, unit] = singleMatch;
    const u = unit.toUpperCase();
    const unitStr = u.startsWith("MONTH") ? "months" : u.startsWith("YEAR") || u.startsWith("YR") ? "years" : "days";
    return `${val} ${unitStr}`;
  }
  return null;
}

function extractCommonTechnicalFields(segment: string): Partial<ExtractedFields> {
  const fields: Partial<ExtractedFields> = {};

  const imoMatch = segment.match(PATTERNS.imo);
  if (imoMatch) fields.imo = imoMatch[1];

  const grtMatch = segment.match(PATTERNS.grt);
  if (grtMatch) {
    const v = parseInt(grtMatch[1].replace(/[,.\s]/g, ""));
    if (!isNaN(v) && v > 100) fields.grt = v.toString();
  }

  const nrtMatch = segment.match(PATTERNS.nrt);
  if (nrtMatch) {
    const v = parseInt(nrtMatch[1].replace(/[,.\s]/g, ""));
    if (!isNaN(v) && v > 100) fields.nrt = v.toString();
  }

  const loaMatch = segment.match(PATTERNS.loa);
  if (loaMatch) {
    const v = parseFloat(loaMatch[1].replace(",", "."));
    if (!isNaN(v) && v > 10) fields.loa = `${v}m`;
  }

  const beamMatch = segment.match(PATTERNS.beam);
  if (beamMatch) {
    const v = parseFloat(beamMatch[1].replace(",", "."));
    if (!isNaN(v) && v > 5) fields.beam = `${v}m`;
  }

  const grainMatch = segment.match(PATTERNS.grainCap);
  if (grainMatch) {
    const v = parseInt(grainMatch[1].replace(/[,.\s]/g, ""));
    if (!isNaN(v) && v > 1000) fields.grain_capacity = v.toString();
  }

  // Commission: "ADCOM: 3.75%" OR "3.75 ADDCOM PLUS" (number before keyword)
  const commMatch = segment.match(PATTERNS.commission) ||
    segment.match(/(\d+(?:\.\d+)?)\s+(?:ADDCOM|ADCOM)/i);
  if (commMatch) fields.commission = `${commMatch[1]}%`;

  const loadRateMatch = segment.match(PATTERNS.loadRate);
  if (loadRateMatch) {
    const v = parseInt(loadRateMatch[1].replace(/,/g, ""));
    if (!isNaN(v) && v > 100) fields.load_rate = `${v} MT/DAY`;
  }

  const dischargeRateMatch = segment.match(PATTERNS.dischargeRate);
  if (dischargeRateMatch) {
    const v = parseInt(dischargeRateMatch[1].replace(/,/g, ""));
    if (!isNaN(v) && v > 100) fields.discharge_rate = `${v} MT/DAY`;
  }

  return fields;
}

// ─── Email Segmentation ───────────────────────────────────────────────────────

function splitMultipleRequirements(text: string): string[] {
  // TC circular emails repeat ACCT/DEL/LC/REDEL patterns for multiple requirements.
  // Split at each line that starts with ACCT (2nd occurrence onwards).
  const lines = text.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let acctCount = 0;

  for (const line of lines) {
    const trimmed = line.trim().toUpperCase();
    const isAcctLine = /^ACCT\s+/.test(trimmed);
    if (isAcctLine) {
      acctCount++;
      if (acctCount > 1 && current.join("").trim().length > 20) {
        blocks.push(current.join("\n").trim());
        current = [];
      }
    }
    current.push(line);
  }
  if (current.join("").trim().length > 20) blocks.push(current.join("\n").trim());
  return blocks.length > 0 ? blocks : [text];
}

function segmentEmail(emailText: string): string[] {
  // Primary split: explicit dash/line separator
  const rawSegments = emailText.split(/\n[-─—]{4,}\n/);
  const result: string[] = [];

  for (const seg of rawSegments) {
    const trimmed = seg.trim();
    if (trimmed.length < 20) continue;

    // Check if this segment contains multiple ACCT blocks (TC circular format)
    const acctCount = (trimmed.match(/^ACCT\s+/gim) ?? []).length;
    if (acctCount >= 2) {
      result.push(...splitMultipleRequirements(trimmed));
    } else {
      result.push(trimmed);
    }
  }

  return result.filter(s => s.length > 20);
}

function detectSegmentType(segment: string): EntryType | null {
  const upper = segment.toUpperCase();
  const hasTCSignals = /(?:DELY?|DEL|DELIVERY)[:\s*]+|(?:REDELY?|REDEL|RE-DELY?)[:\s*]+|TCT|TIME\s*CHARTER|1\s*TCT/.test(upper);
  const hasVCSignals = /(?:LP|LOADING\s*PORT?|POL)[:\s]+|(?:DP|DISCHARGE\s*PORT?|POD)[:\s]+|VOYAGE\s*CHARTER|LOAD\s*RATE|DISRATE|DISCHARGING\s*RATE/.test(upper);
  const hasTonnageSignals = /\bM[TV]\/?[\s\w]+(?:OPEN|WILL OPEN|'[0-9]{2}|IMO|DWT\/DRAFT|BULK CARRIER|FLAG[:\s]|BUILT:)/i.test(segment) ||
    /OPEN\s+[A-Z]+/.test(upper) && !hasTCSignals && !hasVCSignals;

  if (hasTonnageSignals) return "Tonnage";
  if (hasTCSignals) return "TC";
  if (hasVCSignals) return "VC";
  if (/CARGO[:\s]/i.test(segment) && /QUANTITY[:\s]/i.test(segment)) return "VC";
  if (/CARGO[:\s]/i.test(segment) && /DELY?[:\s*]+/i.test(segment)) return "TC";
  return null;
}

// ─── Entry Extractors ─────────────────────────────────────────────────────────

function extractVCEntry(segment: string, signature: ReturnType<typeof extractSignature>): ExtractedEntry {
  const lpMatch = segment.match(/(?:LP|LOADING\s*PORT?|POL)[:\s]+([^\n\-–]+)/i);
  const dpMatch = segment.match(/(?:DP|DISCHARGE\s*PORT?|POD)[:\s]+([^\n\-–]+)/i);
  const cargoMatch = segment.match(/(?:CARGO|COMMODITY|COMMODIT)[:\s]+([^\n\-–]+)/i);
  const laycanMatch = segment.match(/LAYCAN[:\s]+([^\n]+)/i);

  const qty = parseQuantity(segment);
  const laycanText = laycanMatch ? laycanMatch[1] : segment;
  const { start, end } = parseLaycan(laycanText);

  const rawCargo = cargoMatch ? cargoMatch[1].trim().split("\n")[0].trim() : null;
  const cargo = rawCargo && isValidCargo(rawCargo) ? rawCargo : null;

  const rawLoadPort = lpMatch ? lpMatch[1].trim().split("\n")[0] : null;
  const rawDischPort = dpMatch ? dpMatch[1].trim().split("\n")[0] : null;
  const loadPort = rawLoadPort && isValidPort(rawLoadPort) ? resolvePort(rawLoadPort) : null;
  const dischPort = rawDischPort && isValidPort(rawDischPort) ? resolvePort(rawDischPort) : null;

  const restrictions: string[] = [];
  const restrMatches = segment.match(PATTERNS.restriction);
  if (restrMatches) restrictions.push(...restrMatches.map(r => r.trim()));

  const technical = extractCommonTechnicalFields(segment);

  const fields: ExtractedFields = {
    email_type: "VC",
    cargo_name: cargo,
    cargo_type: cargo ? detectCargoType(segment) : null,
    account_name: null,
    min_size: qty.min,
    max_size: qty.max,
    load_port: loadPort,
    discharge_port: dischPort,
    laycan_start_date: start,
    laycan_end_date: end ?? (start ? new Date(new Date(start).getTime() + 5 * 86400000).toISOString().split("T")[0] : null),
    region: resolveRegion(segment),
    matching_region: resolveRegion(segment),
    pic: signature.pic,
    email_id: signature.email,
    phone_number: signature.phone,
    restriction: restrictions.length > 0 ? restrictions.join("; ") : null,
    ...technical,
  };

  const fieldsFilled = Object.values(fields).filter(v => v !== null && v !== undefined).length;
  const confidence = Math.min(0.95, 0.3 + fieldsFilled * 0.065);
  return { entryType: "VC", confidence, extractionMethod: "rule-based", fields };
}

function extractTCEntry(segment: string, signature: ReturnType<typeof extractSignature>): ExtractedEntry {
  const accountMatch = segment.match(/(?:A\/C|ACCT?|Account)[:\s*]+([^\n*]+)/i);

  // Cargo: explicit CARGO: field, OR "1 TCT GRAIN OR SUGAR IN BLK", OR "1 TCT WITH PETCOKE IN BLK"
  const cargoMatch =
    segment.match(/(?:CARGO|COMMODITY|COMMODIT)[:\s]+([^\n*]+)/i) ||
    segment.match(/\d\s+TCT\s+(?:WITH\s+)?([A-Z][A-Z\s\/OR]+?)\s+IN\s+BLK/i) ||
    segment.match(/TCT\s+(?:WITH\s+)?([A-Z][A-Z\s\/OR]+?)\s+IN\s+BLK/i);

  const dwtInfo = parseDwt(segment);

  // Laycan: "LAYCAN:" OR "LC " (short form used in TC circulars)
  const laycanMatch =
    segment.match(/LAYCAN[:\s:*]+([^\n]+)/i) ||
    segment.match(/\bLC\s+([^\n]+)/i);

  const delMatch = segment.match(/(?:DELY?|DEL(?:IVERY)?)[:\s*]+([^\n*]+)/i);
  const redelMatch = segment.match(/(?:REDELY?|REDEL|RE-DELY?)[:\s*]+([^\n*]+)/i);
  const durationMatch = segment.match(/DURATION[:\s*]+([^\n*]+)/i);

  const laycanText = laycanMatch ? laycanMatch[1] : segment;
  const { start, end } = parseLaycan(laycanText);
  const duration = durationMatch ? parseDuration(durationMatch[1]) : null;

  const rawCargo = cargoMatch ? cargoMatch[1].trim().split("\n")[0].trim() : null;
  const cargo = rawCargo && isValidCargo(rawCargo) ? rawCargo : null;

  const rawDel = delMatch ? delMatch[1].trim().split("\n")[0] : null;
  const rawRedel = redelMatch ? redelMatch[1].trim().split("\n")[0] : null;
  const delPort = rawDel && isValidPort(rawDel) ? resolvePort(rawDel) : null;
  const redelPort = rawRedel && isValidPort(rawRedel) ? resolvePort(rawRedel) : null;

  const restrictions: string[] = [];
  const restrMatches = segment.match(/(?:NO\s+[A-Z]+[^\n.]*|EXCL\s+[A-Z]+[^\n.]*)/gi);
  if (restrMatches) restrictions.push(...restrMatches.map(r => r.trim()).slice(0, 5));

  const technical = extractCommonTechnicalFields(segment);

  const fields: ExtractedFields = {
    email_type: "TC",
    account_name: accountMatch ? accountMatch[1].trim().split("\n")[0].trim() : null,
    cargo_name: cargo,
    cargo_type: cargo ? detectCargoType(segment) : null,
    min_size: dwtInfo.min,
    max_size: dwtInfo.max,
    del_port: delPort,
    redel_port: redelPort,
    laycan_start_date: start,
    laycan_end_date: end ?? (start ? new Date(new Date(start).getTime() + 5 * 86400000).toISOString().split("T")[0] : null),
    duration,
    region: resolveRegion(segment),
    matching_region: resolveRegion(segment),
    pic: signature.pic,
    email_id: signature.email,
    phone_number: signature.phone,
    restriction: restrictions.length > 0 ? restrictions.join("; ") : null,
    ...technical,
  };

  const fieldsFilled = Object.values(fields).filter(v => v !== null && v !== undefined).length;
  const confidence = Math.min(0.95, 0.3 + fieldsFilled * 0.065);
  return { entryType: "TC", confidence, extractionMethod: "rule-based", fields };
}

function extractTonnageEntry(segment: string, signature: ReturnType<typeof extractSignature>): ExtractedEntry {
  const mvMatch =
    segment.match(/\bM[TV]\/?\s+([A-Z][A-Z\s]+?)(?:\s+[\/'"]|\s*\(|\s+\d{2,4}BLT|\s+\d{2,3}K\s|\n)/i) ||
    segment.match(/^(?:AA\)|BB\)|CC\)|[A-Z]+\))\s*(?:MV\s+)?([A-Z][A-Z\s]+?)(?:\s+\(|\/)/im);

  // DWT extraction for tonnage entries
  let dwtStr: string | null = null;
  const dwtExplicit = segment.match(/(?:DEADWEIGHT|DWT)\s*[/:–\s]+(?:SUMMER\s+)?(?:SALT\s+WATER[:\s]+)?(\d{2,3}[,.]?\d{3})/i) ||
    segment.match(/(\d{2,3}[,.]?\d{3})\s*(?:MT|MTS)\s+@/i);
  if (dwtExplicit) {
    const raw = dwtExplicit[1].replace(/[,.]/g, "");
    const num = parseInt(raw, 10);
    if (num >= 1000) dwtStr = num.toString();
  } else {
    // Shorthand: "57K" or "63.5K" — require at least 10K
    const shortDwt = segment.match(/\b(\d{2,3}(?:\.\d)?)\s*[Kk]\s*(?:DWT|[-'"\s\/]|$)/m);
    if (shortDwt) {
      const val = Math.round(parseFloat(shortDwt[1]) * 1000);
      if (val >= 10000) dwtStr = val.toString();
    }
  }

  // Open port + date detection
  const openMatch =
    segment.match(/OPEN\s+(?:AT\s+)?([A-Z][A-Z\s,]+?)\s+(?:O\/A\s+|ON\s+)?([^\n]+)/i) ||
    segment.match(/(?:WILL\s+)?OPEN\s+([A-Z]+(?:[,\s]+[A-Z]+)?)[,.]?\s*(\d{1,2}(?:TH|ST|ND|RD)?\s+[A-Z]+[,.\s]+\d{4})/i);

  let openDate: string | null = null;
  let closeDate: string | null = null;
  if (openMatch) {
    const dateStr = openMatch[2] ?? openMatch[1];
    const { start, end } = parseLaycan(dateStr);
    openDate = start;
    closeDate = end;
    const fixed = fixDates(openDate, closeDate);
    openDate = fixed.open || null;
    closeDate = fixed.close || null;
  }

  const rawOpenPort = openMatch ? openMatch[1].trim() : null;
  const openPort = rawOpenPort && isValidPort(rawOpenPort) ? resolvePort(rawOpenPort) : null;

  const vesselType = /BULK\s*CARRIER/i.test(segment) ? "Bulk Carrier" :
    /TANKER/i.test(segment) ? "Crude Oil Tanker" :
    /GAS\s*CARRIER/i.test(segment) ? "Gas Carrier" : "Bulk Carrier";

  const restrictions: string[] = [];
  const restrMatches = segment.match(/(?:NO\s+[A-Z\s]+|EXCL\s+[A-Z\s]+)/gi);
  if (restrMatches) restrictions.push(...restrMatches.slice(0, 3));

  const technical = extractCommonTechnicalFields(segment);

  const fields: ExtractedFields = {
    email_type: "Tonnage",
    tonnage_name: mvMatch ? mvMatch[1].trim() : null,
    tonnage_type: vesselType,
    dwt: dwtStr,
    port: openPort,
    open_date: openDate,
    close_date: closeDate,
    region: resolveRegion(segment),
    matching_region: resolveRegion(segment),
    pic: signature.pic,
    email_id: signature.email,
    phone_number: signature.phone,
    restriction: restrictions.length > 0 ? restrictions.join("; ") : null,
    ...technical,
  };

  const fieldsFilled = Object.values(fields).filter(v => v !== null && v !== undefined).length;
  const confidence = Math.min(0.95, 0.3 + fieldsFilled * 0.065);
  return { entryType: "Tonnage", confidence, extractionMethod: "rule-based", fields };
}

// ─── Template Detection ───────────────────────────────────────────────────────

interface Template { name: string; detect: (text: string) => boolean; boost: number; }

const TEMPLATES: Template[] = [
  { name: "YB Global Shipping", detect: (t) => /YB\s*Global\s*Shipping/i.test(t), boost: 0.1 },
  { name: "SeaSchiffe", detect: (t) => /Sea\s*Schiffe/i.test(t), boost: 0.1 },
  { name: "Centurion Bulk", detect: (t) => /CENTURION\s*BULK/i.test(t), boost: 0.08 },
  { name: "Standard TC Format", detect: (t) => /DELY?[:\s*]+.*\nREDELY?[:\s*]+/i.test(t), boost: 0.05 },
  { name: "Standard VC Format", detect: (t) => /LP[:\s]+.*\nDP[:\s]+/i.test(t), boost: 0.05 },
  { name: "MV Description Format", detect: (t) => /IMO\s+NO?[:\s]+\d{7}/i.test(t), boost: 0.12 },
];

function detectTemplate(text: string): { name: string | null; boost: number } {
  for (const tpl of TEMPLATES) {
    if (tpl.detect(text)) return { name: tpl.name, boost: tpl.boost };
  }
  return { name: null, boost: 0 };
}

// ─── Enterprise JSON Transformer ─────────────────────────────────────────────

export function toEnterpriseEntry(entry: ExtractedEntry): EnterpriseEntry {
  const f = entry.fields;

  // DWT: use stored dwt string or derive from min_size (for TC/VC)
  let dwt = "";
  if (f.dwt) {
    dwt = normalizeDwtNumber(f.dwt);
  } else if (f.min_size !== null && f.min_size !== undefined && entry.entryType !== "VC") {
    dwt = f.min_size >= 1000 ? Math.round(f.min_size).toString() : "";
  }

  // Ports — validated
  const loadPort = f.load_port && isValidPort(f.load_port) ? f.load_port : "";
  const dischargePort = f.discharge_port && isValidPort(f.discharge_port) ? f.discharge_port : "";
  const openPort = f.port && isValidPort(f.port)
    ? f.port
    : f.del_port && isValidPort(f.del_port)
    ? f.del_port
    : "";

  // Cargo — validated
  const cargo = f.cargo_name && isValidCargo(f.cargo_name) ? f.cargo_name : "";

  // Dates
  const rawOpen = f.open_date || f.laycan_start_date || "";
  const rawClose = f.close_date || f.laycan_end_date || "";
  const { open: openDate, close: closeDate } = fixDates(rawOpen || null, rawClose || null);
  const { open: laycanStart, close: laycanEnd } = fixDates(f.laycan_start_date || null, f.laycan_end_date || null);

  // Quantity: only meaningful for VC entries (cargo quantity in MT)
  // TC and Tonnage entries use DWT for vessel size, not cargo quantity
  let quantity = "";
  if (entry.entryType === "VC" && f.min_size !== null && f.min_size !== undefined) {
    quantity = Math.round(f.min_size).toString();
    if (f.max_size && f.max_size !== f.min_size) {
      quantity = `${Math.round(f.min_size)}-${Math.round(f.max_size)}`;
    }
  }

  // Restrictions array
  const restrictions: string[] = [];
  if (f.restriction) {
    const parts = f.restriction.split(/;\s*/);
    restrictions.push(...parts.filter(p => p.trim().length > 3).map(p => p.trim()));
  }

  return {
    email_type: entry.entryType,
    vessel_name: f.tonnage_name ?? "",
    vessel_type: f.tonnage_type ?? "",
    dwt,
    cargo,
    cargo_type: cargo ? (f.cargo_type ?? "") : "",
    load_port: loadPort,
    discharge_port: dischargePort,
    open_port: openPort,
    open_date: openDate,
    close_date: closeDate,
    laycan_start: laycanStart,
    laycan_end: laycanEnd,
    quantity,
    quantity_unit: "MT",
    load_rate: f.load_rate ?? "",
    discharge_rate: f.discharge_rate ?? "",
    commission: f.commission ?? "",
    imo: f.imo ?? "",
    grt: f.grt ?? "",
    nrt: f.nrt ?? "",
    loa: f.loa ?? "",
    beam: f.beam ?? "",
    grain_capacity: f.grain_capacity ?? "",
    restrictions,
    matching_region: f.matching_region ?? "",
    confidence_score: Math.round(entry.confidence * 1000) / 1000,
  };
}

// ─── Strict Validator ─────────────────────────────────────────────────────────

export function validateEnterpriseEntry(entry: EnterpriseEntry): EnterpriseEntry {
  const out = { ...entry };

  // Port validation
  if (!isValidPort(out.load_port)) out.load_port = "";
  if (!isValidPort(out.discharge_port)) out.discharge_port = "";
  if (!isValidPort(out.open_port)) out.open_port = "";

  // Cargo validation
  if (!isValidCargo(out.cargo)) { out.cargo = ""; out.cargo_type = ""; }

  // DWT validation: must be numeric >= 1000 if set
  if (out.dwt) {
    const n = parseInt(out.dwt, 10);
    if (isNaN(n) || n < 1000) out.dwt = "";
  }

  // Date validation: close can't be before open
  if (out.open_date && out.close_date) {
    const { open, close } = fixDates(out.open_date, out.close_date);
    out.open_date = open;
    out.close_date = close;
  }
  if (out.laycan_start && out.laycan_end) {
    const { open, close } = fixDates(out.laycan_start, out.laycan_end);
    out.laycan_start = open;
    out.laycan_end = close;
  }

  // Confidence: 0-1 range
  out.confidence_score = Math.max(0, Math.min(1, out.confidence_score));

  // Restrictions: filter empty strings
  out.restrictions = out.restrictions.filter(r => r.trim().length > 3);

  return out;
}

// ─── Main Extraction Functions ────────────────────────────────────────────────

export function extractMaritimeEmail(emailText: string): ExtractionResult {
  const start = Date.now();
  const signature = extractSignature(emailText);
  const segments = segmentEmail(emailText);
  const entries: ExtractedEntry[] = [];
  const typesFound = new Set<EntryType>();
  const template = detectTemplate(emailText);
  const pipeline: Pipeline = template.name ? "template" : "rule-based";

  for (const segment of segments) {
    const segType = detectSegmentType(segment);
    if (!segType) continue;

    let entry: ExtractedEntry;
    if (segType === "VC") entry = extractVCEntry(segment, signature);
    else if (segType === "TC") entry = extractTCEntry(segment, signature);
    else entry = extractTonnageEntry(segment, signature);

    if (template.boost > 0) {
      entry = { ...entry, confidence: Math.min(0.98, entry.confidence + template.boost), extractionMethod: pipeline };
    }
    entries.push(entry);
    typesFound.add(segType);
  }

  let emailType: EmailType = "Unknown";
  if (typesFound.size > 1) emailType = "Mixed";
  else if (typesFound.size === 1) emailType = [...typesFound][0] as EmailType;

  const avgConfidence = entries.length > 0
    ? entries.reduce((s, e) => s + e.confidence, 0) / entries.length
    : 0.3;

  return {
    emailType, pipeline, confidence: avgConfidence, extractedEntries: entries,
    processingMs: Date.now() - start, llmUsed: false, estimatedCostUsd: 0.0001,
  };
}

export function extractToEnterpriseJSON(emailText: string): EnterpriseEntry[] {
  const result = extractMaritimeEmail(emailText);
  return result.extractedEntries
    .map(toEnterpriseEntry)
    .map(validateEnterpriseEntry);
}
