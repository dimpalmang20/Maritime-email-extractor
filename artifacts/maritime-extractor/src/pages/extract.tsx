import { useState } from "react";
import { useExtractEmail, getListExtractionsQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, ChevronDown, ChevronUp, Zap, AlertTriangle, CheckCircle, Anchor } from "lucide-react";
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

function PipelineBadge({ method }: { method: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    "rule-based": { label: "Rule-Based", cls: "bg-green-500/10 text-green-400 border-green-500/20" },
    "template": { label: "Template", cls: "bg-primary/10 text-primary border-primary/20" },
    "llm-fallback": { label: "LLM Fallback", cls: "bg-accent/10 text-accent border-accent/20" },
  };
  const cfg = map[method] ?? { label: method, cls: "bg-muted text-muted-foreground border-border" };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${cfg.cls}`}>{cfg.label}</span>;
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    VC: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    TC: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    Tonnage: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    Mixed: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    Unknown: "bg-muted text-muted-foreground border-border",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${map[type] ?? map.Unknown}`}>{type}</span>;
}

function FieldRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-2 py-1.5 border-b border-border/40 last:border-0 text-xs">
      <span className="text-muted-foreground font-mono w-40 shrink-0">{label}</span>
      <span className="text-foreground font-medium break-words">{String(value)}</span>
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  email_type: "Email Type", cargo_name: "Cargo Name", account_name: "Account",
  cargo_type: "Cargo Type", tonnage_name: "Vessel Name", tonnage_type: "Vessel Type",
  min_size: "Min Size (MT)", max_size: "Max Size (MT)", region: "Region",
  load_port: "Load Port", discharge_port: "Discharge Port",
  del_port: "Delivery Port", redel_port: "Redelivery Port",
  port: "Port", open_date: "Open Date", close_date: "Close Date",
  laycan_start_date: "Laycan Start", laycan_end_date: "Laycan End",
  duration: "Duration", dwt: "DWT", pic: "Person in Charge",
  email_id: "Email", phone_number: "Phone", restriction: "Restrictions",
};

function EntryCard({ entry, index }: { entry: ExtractionJob["extractedEntries"][0]; index: number }) {
  const [open, setOpen] = useState(true);
  const filledCount = Object.values(entry.fields).filter(v => v !== null && v !== undefined).length;

  return (
    <div className="border border-border rounded overflow-hidden" data-testid={`entry-card-${index}`}>
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-card/60 hover:bg-card/80 transition-colors text-left"
        onClick={() => setOpen(!open)}
        data-testid={`button-toggle-entry-${index}`}
      >
        <div className="flex items-center gap-3">
          <TypeBadge type={entry.entryType} />
          <PipelineBadge method={entry.extractionMethod} />
          <span className="text-xs text-muted-foreground">{filledCount} fields extracted</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${entry.confidence * 100}%` }} />
            </div>
            <span className="text-xs font-mono text-muted-foreground">{(entry.confidence * 100).toFixed(0)}%</span>
          </div>
          {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 py-3 bg-card/30">
          {Object.entries(entry.fields).map(([key, val]) => (
            <FieldRow key={key} label={FIELD_LABELS[key] ?? key} value={val as string | number | null} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Extract() {
  const [emailText, setEmailText] = useState("");
  const [result, setResult] = useState<ExtractionJob | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const extractMutation = useExtractEmail();

  const handleExtract = () => {
    if (!emailText.trim()) {
      toast({ title: "Email text required", description: "Paste a maritime email to extract.", variant: "destructive" });
      return;
    }
    extractMutation.mutate(
      { data: { emailText } },
      {
        onSuccess: (data) => {
          setResult(data as unknown as ExtractionJob);
          queryClient.invalidateQueries({ queryKey: getListExtractionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          toast({ title: "Extraction complete", description: `${(data as unknown as ExtractionJob).extractedEntries.length} entries extracted` });
        },
        onError: () => {
          toast({ title: "Extraction failed", description: "Check your email text and try again.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="p-6 max-w-5xl" data-testid="page-extract">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground tracking-tight">Extract Email</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Paste a maritime email to extract structured data</p>
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
              disabled={extractMutation.isPending}
              className="flex items-center gap-2"
              data-testid="button-extract"
            >
              {extractMutation.isPending ? (
                <><span className="animate-pulse">Processing...</span></>
              ) : (
                <><Zap className="h-4 w-4" />Extract Data</>
              )}
            </Button>
            {emailText && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => { setEmailText(""); setResult(null); }}
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
              Extraction Pipeline
            </p>
            <div className="space-y-1.5">
              {[
                { step: "1", label: "Rule Engine", desc: "Regex + maritime patterns", color: "text-green-400" },
                { step: "2", label: "Template Parser", desc: "Known broker formats", color: "text-primary" },
                { step: "3", label: "LLM Fallback", desc: "Only for complex emails", color: "text-accent" },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-2 text-xs">
                  <span className={`font-mono font-bold ${item.color}`}>[{item.step}]</span>
                  <span className="text-foreground font-medium">{item.label}</span>
                  <span className="text-muted-foreground">— {item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Extraction Results</p>

          {extractMutation.isPending && (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-48" />
            </div>
          )}

          {!extractMutation.isPending && !result && (
            <div className="flex flex-col items-center justify-center h-80 bg-card border border-dashed border-border rounded text-center px-6">
              <Upload className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Results will appear here</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Paste an email and click Extract</p>
            </div>
          )}

          {result && !extractMutation.isPending && (
            <div className="space-y-3" data-testid="extraction-results">
              {/* Meta */}
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
                    <p className="font-mono font-bold text-foreground mt-0.5">{result.extractedEntries.length}</p>
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
                    ? <><AlertTriangle className="h-3 w-3" />LLM was used for this extraction</>
                    : <><CheckCircle className="h-3 w-3" />Extracted without LLM — $0.0001 cost</>
                  }
                </div>
              </div>

              {/* Entry cards */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {result.extractedEntries.length === 0 ? (
                  <div className="p-4 bg-card border border-border rounded text-center text-sm text-muted-foreground">
                    No entries could be extracted from this email
                  </div>
                ) : (
                  result.extractedEntries.map((entry, i) => (
                    <EntryCard key={i} entry={entry} index={i} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
