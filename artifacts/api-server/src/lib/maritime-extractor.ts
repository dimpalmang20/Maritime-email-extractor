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
  pic?: string | null;
  email_id?: string | null;
  phone_number?: string | null;
  restriction?: string | null;
  reason?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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

// ─── Maritime Knowledge Base ──────────────────────────────────────────────────

const REGION_MAP: Record<string, string> = {
  WAFR: "West Africa",
  WAFR1: "West Africa",
  SAFR: "South Africa",
  EAFR: "East Africa",
  ECI: "East Coast India",
  WCI: "West Coast India",
  WCI1: "West Coast India",
  "S.E.ASIA": "South East Asia",
  SEASIA: "South East Asia",
  SEA: "South East Asia",
  AG: "Arabian Gulf",
  PG: "Persian Gulf",
  MED: "Mediterranean",
  BSEA: "Black Sea",
  BALTIC: "Baltic Sea",
  USEC: "US East Coast",
  USGC: "US Gulf Coast",
  USWC: "US West Coast",
  WCCA: "West Coast Central America",
  ECSA: "East Coast South America",
  GOA: "Gulf of Aden",
  ARAG: "Arabian Gulf",
  HRA: "High Risk Area",
  COGH: "Cape of Good Hope",
  WWW: "World Wide",
  WW: "World Wide",
  "W.W.": "World Wide",
};

const PORT_ABBREVS: Record<string, string> = {
  BIK: "Bandar Imam Khomeini, Iran",
  KANDLA: "Kandla, India",
  KAKINADA: "Kakinada, India",
  VIZAG: "Visakhapatnam, India",
  MUMBAI: "Mumbai, India",
  HAZIRA: "Hazira, India",
  LUMUT: "Lumut, Malaysia",
  SURABAYA: "Surabaya, Indonesia",
  BAHODOPI: "Bahodopi, Indonesia",
  SANTOS: "Santos, Brazil",
  PARANAGUA: "Paranaguá, Brazil",
  UPRIVER: "Upriver, Argentina",
  "SAN LORENZO": "San Lorenzo, Argentina",
  AQABA: "Aqaba, Jordan",
  PIVDENNIY: "Pivdenniy, Ukraine",
  ISKENDERUN: "Iskenderun, Turkey",
  DURBAN: "Durban, South Africa",
  BUSHEHR: "Bushehr, Iran",
  DOHA: "Doha, Qatar",
  HODEIDAH: "Hodeidah, Yemen",
  BUKPYUNG: "Bukpyung, South Korea",
  SKOREA: "South Korea",
  GUANGZHOU: "Guangzhou, China",
  TAIPEI: "Taipei, Taiwan",
  PORBANDAR: "Porbandar, India",
  LANSHAN: "Lanshan, China",
};

const VESSEL_SIZE_MAP: Record<string, { min: number; max: number }> = {
  HANDYMAX: { min: 10000, max: 49999 },
  HMAX: { min: 10000, max: 49999 },
  SUPRAMAX: { min: 50000, max: 59999 },
  SMAX: { min: 50000, max: 59999 },
  SMX: { min: 50000, max: 59999 },
  SUPRA: { min: 50000, max: 59999 },
  ULTRAMAX: { min: 60000, max: 69999 },
  UMAX: { min: 60000, max: 69999 },
  UMX: { min: 60000, max: 69999 },
  ULTRA: { min: 60000, max: 69999 },
  PANAMAX: { min: 70000, max: 79999 },
  KAMSARMAX: { min: 80000, max: 89999 },
  "BABY CAPE": { min: 90000, max: 199999 },
  CAPESIZE: { min: 200000, max: 999999 },
};

const CARGO_TYPE_MAP: Record<string, string> = {
  BULK: "Dry Bulk",
  GRAIN: "Dry Bulk",
  COAL: "Dry Bulk",
  FERTILIZER: "Dry Bulk",
  FERTS: "Dry Bulk",
  UREA: "Dry Bulk",
  IRON: "Dry Bulk",
  SLAG: "Dry Bulk",
  CLINKER: "Dry Bulk",
  PETCOKE: "Dry Bulk",
  LIMESTONE: "Dry Bulk",
  MAIZE: "Dry Bulk",
  CORN: "Dry Bulk",
  SOYBEAN: "Dry Bulk",
  POTASH: "Dry Bulk",
  COILS: "General Cargo",
  STEEL: "General Cargo",
  STEELS: "General Cargo",
  GENS: "General Cargo",
  LOGS: "General Cargo",
  LOG: "General Cargo",
  CRUDE: "Crude Oil",
  CHEMICAL: "Chemical",
  GAS: "Gas",
};

// ─── Regex Patterns ───────────────────────────────────────────────────────────

const PATTERNS = {
  account: /(?:A\/C|ACCT?|Account)[:\s*]+([^\n*]+)/i,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /(?:Mobile|Phone|WhatsApp|M)[/\s:]*(\+?[\d\s\-().]{8,20})/gi,
  dwt: /(\d{1,3}[,.]?\d{0,3})\s*(?:K\s)?DWT/i,
  dwtRange: /(\d{1,3}[,.]?\d{0,3})[-–](\d{1,3}[,.]?\d{0,3})\s*(?:K\s)?DWT/i,
  quantity: /(?:M\/M\s*)?(\d{1,3}[,.]?\d{0,3})\s*(?:MT|MTS|metric tons?|000 mts?)/i,
  quantityRange: /(\d{1,3}[,.]?\d{0,3})\s*[-–]\s*(\d{1,3}[,.]?\d{0,3})[,\s]*(?:K\s)?(?:MT|MTS|DWT)/i,
  laycan: /LAYCAN[:\s]+([^\n]+)/i,
  laycanDates: /(\d{1,2}(?:st|nd|rd|th)?)\s*[-–]\s*(\d{1,2}(?:st|nd|rd|th)?)\s*(?:OF\s+)?([A-Z]+)[,.\s]+(\d{4})/i,
  laycanMonth: /(?:END|EARLY|MID|BEGINNING OF)\s+([A-Z]+)[,.\s]+?(\d{4})/i,
  duration: /DURATION[:\s*]+(?:ABT\s+)?(\d+)\s*(?:TO|[-–])\s*(\d+)\s*DAYS?/i,
  durationSingle: /DURATION[:\s*]+(?:ABT\s+)?(\d+)\s*DAYS?/i,
  durationPeriod: /DURATION[:\s*]+(?:ABT\s+)?(?:MAX\s+)?(\d+)\s*[-–\s]?(?:YEAR|MONTH|YR|MO)/i,
  delivery: /(?:DELY?|DEL|DELIVERY)[:\s*]+([^\n*]+)/i,
  redelivery: /(?:REDELY?|REDEL|RE-DELY?|REDELIVERY)[:\s*]+([^\n*]+)/i,
  loadPort: /(?:LP|LOADING\s*PORT?|POL)[:\s]+([^\n]+)/i,
  dischargePort: /(?:DP|DISCHARGE\s*PORT?|POD)[:\s]+([^\n]+)/i,
  cargo: /(?:CARGO|COMMODITY|COMMODIT)[:\s*]+([^\n*]+)/i,
  tonnage: /(?:TONNAGE|VESSEL)[:\s*]+([^\n*]+)/i,
  restriction: /(?:NO\s+(?:CHINESE|PAKISTANI|RED SEA|HRA|GOA)[^\n]*)/gi,
  openDate: /OPEN\s+(?:[A-Z\s]+,\s+)?([^\n,]+)?[,\s]+?([0-9]{1,2}[-/][0-9]{1,2}(?:\s+[A-Z]+)?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Z]+[,.\s]+\d{4})/i,
  mvName: /\bM[TV]\/?\s+([A-Z][A-Z0-9\s]+?)(?:\s*[\(\/'"]|\s+\d{4}BLT|\s+\d{2,3}K\s)/i,
};

// ─── Date Parsing ─────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  JAN: "01", JANUARY: "01",
  FEB: "02", FEBRUARY: "02",
  MAR: "03", MARCH: "03",
  APR: "04", APRIL: "04",
  MAY: "05",
  JUN: "06", JUNE: "06",
  JUL: "07", JULY: "07",
  AUG: "08", AUGUST: "08",
  SEP: "09", SEPTEMBER: "09",
  OCT: "10", OCTOBER: "10",
  NOV: "11", NOVEMBER: "11",
  DEC: "12", DECEMBER: "12",
};

function parseLaycan(text: string): { start: string | null; end: string | null } {
  const upper = text.toUpperCase().trim();

  // Pattern: "18th - 20th JULY, 2025"
  const rangeMatch = upper.match(/(\d{1,2})(?:ST|ND|RD|TH)?\s*[-–]\s*(\d{1,2})(?:ST|ND|RD|TH)?\s+([A-Z]+)[,.\s]+(\d{4})/);
  if (rangeMatch) {
    const [, d1, d2, mon, yr] = rangeMatch;
    const m = MONTH_MAP[mon];
    if (m) {
      const start = `${yr}-${m}-${d1.padStart(2, "0")}`;
      const end = `${yr}-${m}-${d2.padStart(2, "0")}`;
      return { start, end };
    }
  }

  // Pattern: "END JULY, 2025"
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

  // Pattern: "EARLY JULY" or "MID AUGUST"
  const midEarlyMatch = upper.match(/(?:EARLY|MID|BEGINNING OF)\s+([A-Z]+)[,.\s]+(\d{4})/);
  if (midEarlyMatch) {
    const [, mon, yr] = midEarlyMatch;
    const m = MONTH_MAP[mon];
    if (m) {
      const prefix = upper.includes("EARLY") ? "01" : "15";
      const end = upper.includes("EARLY") ? "10" : "20";
      return { start: `${yr}-${m}-${prefix}`, end: `${yr}-${m}-${end}` };
    }
  }

  // Pattern: "1-10 Aug" or "15-18 July"
  const simpleRange = upper.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([A-Z]+)/);
  if (simpleRange) {
    const [, d1, d2, mon] = simpleRange;
    const m = MONTH_MAP[mon];
    const yr = new Date().getFullYear().toString();
    if (m) {
      return {
        start: `${yr}-${m}-${d1.padStart(2, "0")}`,
        end: `${yr}-${m}-${d2.padStart(2, "0")}`,
      };
    }
  }

  // Pattern: "22ND JULY" single date
  const singleDate = upper.match(/(\d{1,2})(?:ST|ND|RD|TH)?\s+([A-Z]+)[,.\s]+(\d{4})/);
  if (singleDate) {
    const [, d, mon, yr] = singleDate;
    const m = MONTH_MAP[mon];
    if (m) {
      const start = `${yr}-${m}-${d.padStart(2, "0")}`;
      const endDay = new Date(parseInt(yr), parseInt(m) - 1, parseInt(d) + 5).getDate();
      const end = `${yr}-${m}-${endDay.toString().padStart(2, "0")}`;
      return { start, end };
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

  // Check vessel size names first
  for (const [name, range] of Object.entries(VESSEL_SIZE_MAP)) {
    const regex = new RegExp(`\\b${name}\\b`, "i");
    if (regex.test(upper)) {
      // Check for combined types like "SUPRA/ULTRAMAX"
      const parts = upper.split(/[/,\s]+/);
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
      if (found) return { min, max };
      return { min: range.min, max: range.max };
    }
  }

  // Check explicit DWT range like "58K - 60K DWT"
  const rangeMatch = upper.match(/(\d+(?:[.,]\d+)?)\s*K?\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*K?\s*DWT/);
  if (rangeMatch) {
    const factor = rangeMatch[0].includes("K") ? 1000 : 1;
    return {
      min: parseFloat(rangeMatch[1].replace(",", "")) * factor,
      max: parseFloat(rangeMatch[2].replace(",", "")) * factor,
    };
  }

  // Single DWT
  const singleMatch = upper.match(/(\d+(?:[.,]\d+)?)\s*K?\s*DWT/);
  if (singleMatch) {
    const factor = singleMatch[0].includes("K") ? 1000 : 1;
    const val = parseFloat(singleMatch[1].replace(",", "")) * factor;
    return { min: val, max: val };
  }

  return { min: null, max: null };
}

function parseQuantity(text: string): { min: number | null; max: number | null } {
  const upper = text.toUpperCase();

  // Range like "20,000-30,000"
  const rangeMatch = upper.match(/(\d{1,3}(?:[,.\s]\d{3})*)\s*[-–]\s*(\d{1,3}(?:[,.\s]\d{3})*)\s*(?:MTS?|METRIC TONS?)/);
  if (rangeMatch) {
    return {
      min: parseInt(rangeMatch[1].replace(/[,.\s]/g, "")),
      max: parseInt(rangeMatch[2].replace(/[,.\s]/g, "")),
    };
  }

  // Single quantity like "45,000 mts" or "45.000 mts"
  const singleMatch = upper.match(/(\d{1,3}(?:[,.\s]\d{3})*)\s*(?:MTS?|METRIC TONS?)/);
  if (singleMatch) {
    const val = parseInt(singleMatch[1].replace(/[,.\s]/g, ""));
    return { min: val, max: val };
  }

  return { min: null, max: null };
}

function extractSignature(text: string): { pic: string | null; email: string | null; phone: string | null } {
  const emails = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
  const email = emails ? emails[0] : null;

  const phoneMatch = text.match(/(?:Mobile|Phone|WhatsApp|M)[/\s:]*(\+?[\d\s\-().]{8,25})/i);
  const phone = phoneMatch ? phoneMatch[1].trim() : null;

  // PIC: look for name before email/mobile
  const lines = text.split("\n");
  let pic: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/) && line.split(" ").length <= 3) {
      pic = line;
      break;
    }
  }

  return { pic, email, phone };
}

function resolveRegion(text: string): string | null {
  const upper = text.toUpperCase();
  for (const [abbrev, full] of Object.entries(REGION_MAP)) {
    if (upper.includes(abbrev)) return full;
  }
  return null;
}

function resolvePort(text: string): string {
  const upper = text.trim().toUpperCase();
  return PORT_ABBREVS[upper] || text.trim();
}

function detectCargoType(text: string): string {
  const upper = text.toUpperCase();
  for (const [keyword, type] of Object.entries(CARGO_TYPE_MAP)) {
    if (upper.includes(keyword)) return type;
  }
  return "Dry Bulk";
}

function parseDuration(text: string): string | null {
  const rangeMatch = text.match(/(?:DURATION|DURATION[:\s*]+)?(?:ABT\s+)?(\d+)\s*(?:TO|[-–])\s*(\d+)\s*(DAYS?|MONTHS?|YEARS?|YRS?|MOS?)?/i);
  if (rangeMatch) {
    const [, min, max, unit = "DAYS"] = rangeMatch;
    const unitStr = unit.toUpperCase().startsWith("MONTH") ? "months" :
                    unit.toUpperCase().startsWith("YEAR") || unit.toUpperCase().startsWith("YR") ? "years" : "days";
    return `${max} ${unitStr}`;
  }

  const singleMatch = text.match(/(?:ABT\s+)?(\d+)\s*(DAYS?|MONTHS?|YEARS?|YRS?|MOS?)/i);
  if (singleMatch) {
    const [, val, unit] = singleMatch;
    const unitStr = unit.toUpperCase().startsWith("MONTH") ? "months" :
                    unit.toUpperCase().startsWith("YEAR") || unit.toUpperCase().startsWith("YR") ? "years" : "days";
    return `${val} ${unitStr}`;
  }

  return null;
}

// ─── Email Segmentation ───────────────────────────────────────────────────────

function segmentEmail(emailText: string): string[] {
  // Split on dashes separator lines
  const segments = emailText.split(/\n[-─—]{4,}\n/);
  return segments.map(s => s.trim()).filter(s => s.length > 20);
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

  // Fallback detection
  if (/CARGO[:\s]/i.test(segment) && /QUANTITY[:\s]/i.test(segment)) return "VC";
  if (/CARGO[:\s]/i.test(segment) && /DELY?[:\s*]+/i.test(segment)) return "TC";

  return null;
}

// ─── Entry Extractors ─────────────────────────────────────────────────────────

function extractVCEntry(segment: string, signature: ReturnType<typeof extractSignature>): ExtractedEntry {
  const lpMatch = segment.match(/(?:LP|LOADING\s*PORT?|POL)[:\s]+([^\n\-–]+)/i);
  const dpMatch = segment.match(/(?:DP|DISCHARGE\s*PORT?|POD)[:\s]+([^\n\-–]+)/i);
  const cargoMatch = segment.match(/(?:CARGO|COMMODITY|COMMODIT)[:\s]+([^\n\-–]+)/i) ||
    segment.match(/^([A-Z][a-z]+(?:\s+[a-z]+)*)\s*(?:\(|in bulk)/m);
  const quantityMatch = segment.match(/(?:QUANTITY[:\s]+)?(?:M\/M\s*)?(\d{1,3}(?:[,.\s]\d{3})*)\s*(?:MTS?|metric tons?)/i);
  const laycanMatch = segment.match(/LAYCAN[:\s]+([^\n]+)/i);

  const qty = parseQuantity(segment);
  const laycanText = laycanMatch ? laycanMatch[1] : segment;
  const { start, end } = parseLaycan(laycanText);

  // Restrictions
  const restrictions: string[] = [];
  const restrMatches = segment.match(/(?:NO\s+(?:CHINESE|PAKISTANI|RED SEA|HRA|GOA)[^\n.]*)/gi);
  if (restrMatches) restrictions.push(...restrMatches.map(r => r.trim()));

  const fields: ExtractedFields = {
    email_type: "VC",
    cargo_name: cargoMatch ? cargoMatch[1].trim().split("\n")[0].trim() : null,
    cargo_type: detectCargoType(segment),
    account_name: null,
    min_size: qty.min,
    max_size: qty.max,
    load_port: lpMatch ? resolvePort(lpMatch[1].trim().split("\n")[0]) : null,
    discharge_port: dpMatch ? resolvePort(dpMatch[1].trim().split("\n")[0]) : null,
    laycan_start_date: start,
    laycan_end_date: end || (start ? (() => { const d = new Date(start); d.setDate(d.getDate() + 5); return d.toISOString().split("T")[0]; })() : null),
    region: resolveRegion(segment),
    matching_region: resolveRegion(segment),
    pic: signature.pic,
    email_id: signature.email,
    phone_number: signature.phone,
    restriction: restrictions.length > 0 ? restrictions.join("; ") : null,
  };

  const fieldsFilled = Object.values(fields).filter(v => v !== null && v !== undefined).length;
  const confidence = Math.min(0.95, 0.3 + fieldsFilled * 0.07);

  return { entryType: "VC", confidence, extractionMethod: "rule-based", fields };
}

function extractTCEntry(segment: string, signature: ReturnType<typeof extractSignature>): ExtractedEntry {
  const accountMatch = segment.match(/(?:A\/C|ACCT?|Account)[:\s*]+([^\n*]+)/i);
  const cargoMatch = segment.match(/(?:Cargo|with\s+)([^\n*]+)/i);
  const dwtInfo = parseDwt(segment);
  const laycanMatch = segment.match(/LAYCAN[:\s:*]+([^\n]+)/i);
  const delMatch = segment.match(/(?:DELY?|DEL(?:IVERY)?|DELIVERY)[:\s*:]+([^\n*]+)/i);
  const redelMatch = segment.match(/(?:REDELY?|REDEL|RE-DELY?|REDELIVERY)[:\s*:]+([^\n*]+)/i);
  const durationMatch = segment.match(/DURATION[:\s*]+([^\n*]+)/i);

  const laycanText = laycanMatch ? laycanMatch[1] : segment;
  const { start, end } = parseLaycan(laycanText);
  const duration = durationMatch ? parseDuration(durationMatch[1]) : null;

  const restrictions: string[] = [];
  const restrMatches = segment.match(/(?:NO\s+[A-Z]+[^\n.]*|EXCL\s+[A-Z]+[^\n.]*)/gi);
  if (restrMatches) restrictions.push(...restrMatches.map(r => r.trim()).slice(0, 3));

  const fields: ExtractedFields = {
    email_type: "TC",
    account_name: accountMatch ? accountMatch[1].trim().split("\n")[0].trim() : null,
    cargo_name: cargoMatch ? cargoMatch[1].trim().split("\n")[0].trim() : null,
    cargo_type: detectCargoType(segment),
    min_size: dwtInfo.min,
    max_size: dwtInfo.max,
    del_port: delMatch ? resolvePort(delMatch[1].trim().split("\n")[0]) : null,
    redel_port: redelMatch ? resolvePort(redelMatch[1].trim().split("\n")[0]) : null,
    laycan_start_date: start,
    laycan_end_date: end || (start ? (() => { const d = new Date(start); d.setDate(d.getDate() + 5); return d.toISOString().split("T")[0]; })() : null),
    duration,
    region: resolveRegion(segment),
    matching_region: resolveRegion(segment),
    pic: signature.pic,
    email_id: signature.email,
    phone_number: signature.phone,
    restriction: restrictions.length > 0 ? restrictions.join("; ") : null,
  };

  const fieldsFilled = Object.values(fields).filter(v => v !== null && v !== undefined).length;
  const confidence = Math.min(0.95, 0.3 + fieldsFilled * 0.07);

  return { entryType: "TC", confidence, extractionMethod: "rule-based", fields };
}

function extractTonnageEntry(segment: string, signature: ReturnType<typeof extractSignature>): ExtractedEntry {
  const mvMatch = segment.match(/\bM[TV]\/?\s+([A-Z][A-Z\s]+?)(?:\s+[\/'"]|\s*\(|\s+\d{2,4}BLT|\s+\d{2,3}K\s|\n)/i) ||
    segment.match(/^(?:AA\)|BB\)|CC\)|[A-Z]+\))\s*(?:MV\s+)?([A-Z][A-Z\s]+?)(?:\s+\(|\/)/im);
  
  const dwtMatch = segment.match(/(?:DEADWEIGHT|DWT)\s*[/:–]\s*(?:SUMMER\s+)?(?:SALT\s+WATER[:\s]+)?(\d{2,3}[,.]?\d{3})/i) ||
    segment.match(/(\d{2,3}[,.]?\d{3})\s*(?:MT|MTS)\s+@/i) ||
    segment.match(/(\d{2,3}K?)\s*[-']?\s*(?:DWT|\/)/i);

  const openMatch = segment.match(/OPEN\s+(?:AT\s+)?([A-Z][A-Z\s,]+?)\s+(?:O\/A\s+|ON\s+)?([^\n]+)/i) ||
    segment.match(/(?:WILL\s+)?OPEN\s+([A-Z]+(?:[,\s]+[A-Z]+)?)[,.]?\s*(\d{1,2}(?:TH|ST|ND|RD)?\s+[A-Z]+[,.\s]+\d{4})/i);

  const vesselType = /BULK CARRIER/i.test(segment) ? "Bulk Carrier" :
    /TANKER/i.test(segment) ? "Crude oil tanker" :
    /GAS CARRIER/i.test(segment) ? "Gas Carrier" : "Bulk Carrier";

  let dwt: string | null = null;
  if (dwtMatch) {
    dwt = dwtMatch[1].replace(/[,.]/g, "");
  } else {
    // Try shorthand like "57K" or "35.2K"
    const shortDwt = segment.match(/['"]?(\d{2,3}(?:\.\d)?)[Kk]\s*[-DWT'"\s]/);
    if (shortDwt) dwt = (parseFloat(shortDwt[1]) * 1000).toFixed(0);
  }

  const restrictions: string[] = [];
  const restrMatches = segment.match(/(?:NO\s+[A-Z\s]+|EXCL\s+[A-Z\s]+)/gi);
  if (restrMatches) restrictions.push(...restrMatches.slice(0, 2));

  let openDate: string | null = null;
  let closeDate: string | null = null;
  if (openMatch) {
    const dateStr = openMatch[2] || openMatch[1];
    const { start, end } = parseLaycan(dateStr);
    openDate = start;
    closeDate = end;
  }

  const fields: ExtractedFields = {
    email_type: "Tonnage",
    tonnage_name: mvMatch ? mvMatch[1].trim() : null,
    tonnage_type: vesselType,
    dwt: dwt,
    port: openMatch ? resolvePort(openMatch[1].trim()) : null,
    open_date: openDate,
    close_date: closeDate,
    region: resolveRegion(segment),
    matching_region: resolveRegion(segment),
    pic: signature.pic,
    email_id: signature.email,
    phone_number: signature.phone,
    restriction: restrictions.length > 0 ? restrictions.join("; ") : null,
  };

  const fieldsFilled = Object.values(fields).filter(v => v !== null && v !== undefined).length;
  const confidence = Math.min(0.95, 0.3 + fieldsFilled * 0.07);

  return { entryType: "Tonnage", confidence, extractionMethod: "rule-based", fields };
}

// ─── Template Detection ───────────────────────────────────────────────────────

interface Template {
  name: string;
  detect: (text: string) => boolean;
  boost: number;
}

const TEMPLATES: Template[] = [
  {
    name: "YB Global Shipping",
    detect: (t) => /YB\s*Global\s*Shipping/i.test(t),
    boost: 0.1,
  },
  {
    name: "SeaSchiffe",
    detect: (t) => /Sea\s*Schiffe/i.test(t),
    boost: 0.1,
  },
  {
    name: "Centurion Bulk",
    detect: (t) => /CENTURION\s*BULK/i.test(t),
    boost: 0.08,
  },
  {
    name: "Standard TC Format",
    detect: (t) => /DELY?[:\s*]+.*\nREDELY?[:\s*]+/i.test(t),
    boost: 0.05,
  },
  {
    name: "Standard VC Format",
    detect: (t) => /LP[:\s]+.*\nDP[:\s]+/i.test(t),
    boost: 0.05,
  },
  {
    name: "MV Description Format",
    detect: (t) => /IMO\s+NO?[:\s]+\d{7}/i.test(t),
    boost: 0.12,
  },
];

function detectTemplate(text: string): { name: string | null; boost: number } {
  for (const tpl of TEMPLATES) {
    if (tpl.detect(text)) {
      return { name: tpl.name, boost: tpl.boost };
    }
  }
  return { name: null, boost: 0 };
}

// ─── Main Extraction Function ─────────────────────────────────────────────────

export function extractMaritimeEmail(emailText: string): ExtractionResult {
  const start = Date.now();

  const signature = extractSignature(emailText);
  const segments = segmentEmail(emailText);

  const entries: ExtractedEntry[] = [];
  const typesFound = new Set<EntryType>();

  // Detect template
  const template = detectTemplate(emailText);
  const pipeline: Pipeline = template.name ? "template" : "rule-based";

  for (const segment of segments) {
    const segType = detectSegmentType(segment);
    if (!segType) continue;

    let entry: ExtractedEntry;
    if (segType === "VC") {
      entry = extractVCEntry(segment, signature);
    } else if (segType === "TC") {
      entry = extractTCEntry(segment, signature);
    } else {
      entry = extractTonnageEntry(segment, signature);
    }

    // Apply template boost
    if (template.boost > 0) {
      entry = { ...entry, confidence: Math.min(0.98, entry.confidence + template.boost), extractionMethod: pipeline };
    }

    entries.push(entry);
    typesFound.add(segType);
  }

  // Determine overall email type
  let emailType: EmailType = "Unknown";
  if (typesFound.size === 0) emailType = "Unknown";
  else if (typesFound.size > 1) emailType = "Mixed";
  else emailType = [...typesFound][0] as EmailType;

  // Calculate overall confidence
  const avgConfidence = entries.length > 0
    ? entries.reduce((s, e) => s + e.confidence, 0) / entries.length
    : 0.3;

  const processingMs = Date.now() - start;

  // Cost estimation: rule-based ~$0.0001, LLM ~$0.015 per email
  const estimatedCostUsd = 0.0001;

  return {
    emailType,
    pipeline,
    confidence: avgConfidence,
    extractedEntries: entries,
    processingMs,
    llmUsed: false,
    estimatedCostUsd,
  };
}
