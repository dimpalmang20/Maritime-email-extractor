import { useState } from "react";
import { useExtractEmail, useExtractEmailJson, getListExtractionsQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Zap, AlertTriangle, CheckCircle, Anchor, Braces, LayoutList, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const SAMPLE_EMAIL = `Dear All,

Good day.

Kindly propose suitable tonnage for the below fully firm requirement:

Account: YB Global Shipping LLC FZ
Vessel Type: SUPRA/ULTRAMAX
Cargo: Bulk Harmless Cargo
Tonnage: 58K - 60K  DWT VESSEL (Grabber Fitted)
Laycan: END JULY, 2025
Delivery: 1SP WAFR
Redelivery: 1SP South China
Duration: ABOUT 45 TO 55 DAYS

Adcom: 3.75%

Ayush Sharma
Chartering,
Mobile/WhatsApp: +91 9523757703
Teams: ayushsharma9491@outlook.com

YB Global Shipping LLC-FZ
chartering@ybglobalshipping.com`;

type ExtractionJob = {
  id: number;
  emailType: string;
  pipeline: string;
  confidence: number;
  extractedEntries: Array<{
    entryType: string;
    confidence: number;
    extractionMethod: string;
    fields: Record<string, string | number | null | undefined>;
  }>;
  processingMs: number;
  llmUsed: boolean;
  estimatedCostUsd: number;
};

type EnterpriseEntry = {
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
  quantity_unit: string;
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
};

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    VC: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    TC: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    Tonnage: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    Mixed: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    Unknown: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${map[type] ?? map.Unknown}`}>
      {type}
    </span>
  );
}

function PipelineBadge({ method }: { method: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    "rule-based": { label: "Rule-Based", cls: "bg-green-500/10 text-green-400 border-green-500/20" },
    "template": { label: "Template", cls: "bg-primary/10 text-primary border-primary/20" },
    "llm-fallback": { label: "LLM Fallback", cls: "bg-accent/10 text-accent border-accent/20" },
  };
  const cfg = map[method] ?? { label: method, cls: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function FieldRow({ label, value }: { label: string; value: string | number | null | undefined | string[] }) {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value) && value.length === 0) return null;
  const display = Array.isArray(value) ? value.join(", ") : String(value);
  return (
    <div className="flex gap-2 py-1.5 border-b border-border/40 last:border-0 text-xs">
      <span className="text-muted-foreground font-mono w-36 shrink-0">{label}</span>
      <span className="text-foreground font-medium break-words">{display}</span>
    </div>
  );
}

const ENTERPRISE_LABELS: Record<string, string> = {
  email_type: "Email Type", vessel_name: "Vessel Name", vessel_type: "Vessel Type",
  dwt: "DWT", cargo: "Cargo", cargo_type: "Cargo Type",
  load_port: "Load Port", discharge_port: "Discharge Port", open_port: "Open Port",
  open_date: "Open Date", close_date: "Close Date",
  laycan_start: "Laycan Start", laycan_end: "Laycan End",
  quantity: "Quantity", quantity_unit: "Unit",
  load_rate: "Load Rate", discharge_rate: "Discharge Rate", commission: "Commission",
  imo: "IMO", grt: "GRT", nrt: "NRT", loa: "LOA", beam: "Beam",
  grain_capacity: "Grain Capacity", restrictions: "Restrictions",
  matching_region: "Matching Region", confidence_score: "Confidence",
};

function EnterpriseCard({ entry, index }: { entry: EnterpriseEntry; index: number }) {
  const typeColors: Record<string, string> = {
    VC: "border-l-blue-500", TC: "border-l-purple-500",
    Tonnage: "border-l-cyan-500",
  };
  const borderColor = typeColors[entry.email_type] ?? "border-l-border";

  return (
    <div className={`border border-border border-l-2 ${borderColor} rounded bg-card/30`}>
      <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
        <TypeBadge type={entry.email_type} />
        <span className="text-xs text-muted-foreground ml-auto">
          confidence: <span className="text-foreground font-mono">{(entry.confidence_score * 100).toFixed(1)}%</span>
        </span>
      </div>
      <div className="px-4 py-3">
        {Object.entries(ENTERPRISE_LABELS).map(([key, label]) => (
          <FieldRow key={key} label={label} value={(entry as Record<string, unknown>)[key] as string | number | null | undefined | string[]} />
        ))}
      </div>
    </div>
  );
}

function JsonBlock({ data, onCopy }: { data: EnterpriseEntry[]; onCopy: () => void }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy();
    });
  };

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 text-xs bg-card border border-border rounded hover:bg-card/80 text-muted-foreground hover:text-foreground transition-colors"
      >
        {copied ? <><Check className="h-3 w-3 text-green-400" />Copied</> : <><Copy className="h-3 w-3" />Copy JSON</>}
      </button>
      <pre className="text-xs font-mono bg-[#0d1117] border border-border rounded p-4 pt-10 overflow-x-auto max-h-[520px] overflow-y-auto leading-relaxed">
        <code className="text-[#e6edf3]">
          {json.split("\n").map((line, i) => {
            // Syntax highlight keys and strings
            const highlighted = line
              .replace(/("[\w_]+")\s*:/g, '<span class="text-[#7ee787]">$1</span>:')
              .replace(/:\s*(".*?")/g, ': <span class="text-[#a5d6ff]">$1</span>')
              .replace(/:\s*(\d+(?:\.\d+)?)/g, ': <span class="text-[#79c0ff]">$1</span>')
              .replace(/:\s*(true|false|null)/g, ': <span class="text-[#ff7b72]">$1</span>');
            return <div key={i} dangerouslySetInnerHTML={{ __html: highlighted }} />;
          })}
        </code>
      </pre>
    </div>
  );
}

export default function Extract() {
  const [emailText, setEmailText] = useState("");
  const [result, setResult] = useState<ExtractionJob | null>(null);
  const [jsonResult, setJsonResult] = useState<EnterpriseEntry[] | null>(null);
  const [viewMode, setViewMode] = useState<"structured" | "json">("structured");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const extractMutation = useExtractEmail();
  const extractJsonMutation = useExtractEmailJson();

  const isPending = extractMutation.isPending || extractJsonMutation.isPending;

  const handleExtract = () => {
    if (!emailText.trim()) {
      toast({ title: "Email text required", description: "Paste a maritime email to extract.", variant: "destructive" });
      return;
    }

    const payload = { data: { emailText } };

    // Fire both in parallel
    extractMutation.mutate(payload, {
      onSuccess: (data) => {
        setResult(data as unknown as ExtractionJob);
        queryClient.invalidateQueries({ queryKey: getListExtractionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      },
    });

    extractJsonMutation.mutate(payload, {
      onSuccess: (data) => {
        setJsonResult(data as unknown as EnterpriseEntry[]);
        toast({
          title: "Extraction complete",
          description: `${(data as unknown as EnterpriseEntry[]).length} enterprise entr${(data as unknown as EnterpriseEntry[]).length === 1 ? "y" : "ies"} extracted`,
        });
      },
      onError: () => {
        toast({ title: "Extraction failed", description: "Check your email text and try again.", variant: "destructive" });
      },
    });
  };

  const hasResult = result || jsonResult;

  return (
    <div className="p-6 max-w-5xl" data-testid="page-extract">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground tracking-tight">Extract Email</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Paste a maritime email to extract structured enterprise JSON</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Email Input</p>
            <button
              className="text-xs text-primary hover:text-primary/80 transition-colors"
              onClick={() => setEmailText(SAMPLE_EMAIL)}
              data-testid="button-load-sample"
            >
              Load sample email
            </button>
          </div>
          <Textarea
            value={emailText}
            onChange={e => setEmailText(e.target.value)}
            placeholder="Paste maritime email here..."
            className="font-mono text-xs min-h-[380px] bg-card border-border resize-none"
            data-testid="input-email-text"
          />
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExtract}
              disabled={isPending}
              className="flex items-center gap-2"
              data-testid="button-extract"
            >
              {isPending ? (
                <span className="animate-pulse">Processing...</span>
              ) : (
                <><Zap className="h-4 w-4" />Extract to JSON</>
              )}
            </Button>
            {emailText && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => { setEmailText(""); setResult(null); setJsonResult(null); }}
                data-testid="button-clear"
              >
                Clear
              </button>
            )}
          </div>

          {/* Pipeline info */}
          <div className="p-3 bg-card border border-border rounded">
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Anchor className="h-3 w-3 text-primary" />
              Extraction Pipeline → Enterprise JSON
            </p>
            <div className="space-y-1.5">
              {[
                { step: "1", label: "Rule Engine", desc: "Regex + maritime patterns", color: "text-green-400" },
                { step: "2", label: "Template Parser", desc: "Known broker formats", color: "text-primary" },
                { step: "3", label: "Validator", desc: "Strict field validation", color: "text-accent" },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-2 text-xs">
                  <span className={`font-mono font-bold ${item.color}`}>[{item.step}]</span>
                  <span className="text-foreground font-medium">{item.label}</span>
                  <span className="text-muted-foreground">— {item.desc}</span>
                </div>
              ))}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                Output: <span className="font-mono text-green-400">EnterpriseEntry[]</span> — 27-field schema, no nulls
              </p>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-3">
          {/* View toggle */}
          {hasResult && !isPending && (
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mr-auto">Output</p>
              <div className="flex items-center bg-card border border-border rounded p-0.5 gap-0.5">
                <button
                  onClick={() => setViewMode("structured")}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors",
                    viewMode === "structured"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutList className="h-3 w-3" />
                  Structured
                </button>
                <button
                  onClick={() => setViewMode("json")}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors",
                    viewMode === "json"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Braces className="h-3 w-3" />
                  JSON
                </button>
              </div>
            </div>
          )}

          {!hasResult && !isPending && (
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Output</p>
          )}

          {isPending && (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-48" />
            </div>
          )}

          {!isPending && !hasResult && (
            <div className="flex flex-col items-center justify-center h-80 bg-card border border-dashed border-border rounded text-center px-6">
              <Upload className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Enterprise JSON output will appear here</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Paste an email and click Extract to JSON</p>
            </div>
          )}

          {result && !isPending && (
            <div className="p-3 bg-card border border-border rounded">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Type</span>
                  <div className="mt-1"><TypeBadge type={result.emailType} /></div>
                </div>
                <div>
                  <span className="text-muted-foreground">Pipeline</span>
                  <div className="mt-1"><PipelineBadge method={result.pipeline} /></div>
                </div>
                <div>
                  <span className="text-muted-foreground">Entries</span>
                  <p className="font-mono font-bold text-foreground mt-0.5">{jsonResult?.length ?? result.extractedEntries.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Confidence</span>
                  <p className="font-mono font-bold text-foreground mt-0.5">{(result.confidence * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Speed</span>
                  <p className="font-mono text-foreground mt-0.5">{result.processingMs}ms</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cost</span>
                  <p className="font-mono text-accent mt-0.5">${result.estimatedCostUsd.toFixed(4)}</p>
                </div>
              </div>
              <div className={cn(
                "mt-3 flex items-center gap-1.5 text-xs py-1.5 px-2 rounded",
                result.llmUsed ? "bg-accent/10 text-accent" : "bg-green-500/10 text-green-400"
              )}>
                {result.llmUsed
                  ? <><AlertTriangle className="h-3 w-3" />LLM was used</>
                  : <><CheckCircle className="h-3 w-3" />No LLM — $0.0001 cost</>
                }
              </div>
            </div>
          )}

          {/* Structured view */}
          {viewMode === "structured" && jsonResult && !isPending && (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {jsonResult.length === 0 ? (
                <div className="p-4 bg-card border border-border rounded text-center text-sm text-muted-foreground">
                  No entries could be extracted from this email
                </div>
              ) : (
                jsonResult.map((entry, i) => (
                  <EnterpriseCard key={i} entry={entry} index={i} />
                ))
              )}
            </div>
          )}

          {/* JSON view */}
          {viewMode === "json" && jsonResult && !isPending && (
            <div>
              {jsonResult.length === 0 ? (
                <div className="p-4 bg-card border border-border rounded text-center text-sm text-muted-foreground">
                  No entries could be extracted from this email
                </div>
              ) : (
                <JsonBlock
                  data={jsonResult}
                  onCopy={() => toast({ title: "Copied", description: "Enterprise JSON copied to clipboard" })}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
