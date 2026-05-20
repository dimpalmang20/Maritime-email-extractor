import { useGetExtraction, getGetExtractionQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, DollarSign, CheckCircle, AlertTriangle } from "lucide-react";

type ExtractedEntry = {
  entryType: string;
  confidence: number;
  extractionMethod: string;
  fields: Record<string, string | number | null | undefined>;
};

const FIELD_LABELS: Record<string, string> = {
  email_type: "Email Type", cargo_name: "Cargo Name", account_name: "Account",
  cargo_type: "Cargo Type", tonnage_name: "Vessel Name", tonnage_type: "Vessel Type",
  min_size: "Min Size (MT)", max_size: "Max Size (MT)", region: "Region",
  matching_region: "Matching Region", load_port: "Load Port", discharge_port: "Discharge Port",
  del_port: "Delivery Port", redel_port: "Redelivery Port", port: "Port",
  open_date: "Open Date", close_date: "Close Date",
  laycan_start_date: "Laycan Start", laycan_end_date: "Laycan End",
  duration: "Duration", dwt: "DWT", pic: "Person in Charge",
  email_id: "Email", phone_number: "Phone", restriction: "Restrictions", reason: "Reason",
};

function PipelineBadge({ method }: { method: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    "rule-based": { cls: "bg-green-500/10 text-green-400 border-green-500/20", label: "Rule-Based" },
    "template": { cls: "bg-primary/10 text-primary border-primary/20", label: "Template Parser" },
    "llm-fallback": { cls: "bg-accent/10 text-accent border-accent/20", label: "LLM Fallback" },
  };
  const cfg = map[method] ?? { cls: "bg-muted text-muted-foreground border-border", label: method };
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${cfg.cls}`}>{cfg.label}</span>;
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

export default function ExtractionDetail({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const { data: job, isLoading, error } = useGetExtraction(id, {
    query: { enabled: !!id, queryKey: getGetExtractionQueryKey(id) },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-6">
        <Link href="/history" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-3.5 w-3.5" />Back to History
        </Link>
        <div className="p-6 bg-card border border-border rounded text-center">
          <p className="text-muted-foreground">Extraction not found</p>
        </div>
      </div>
    );
  }

  const entries = job.extractedEntries as unknown as ExtractedEntry[];

  return (
    <div className="p-6 space-y-5 max-w-5xl" data-testid="page-extraction-detail">
      {/* Back nav */}
      <Link href="/history" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back">
        <ArrowLeft className="h-3.5 w-3.5" />Back to History
      </Link>

      {/* Meta */}
      <div className="bg-card border border-border rounded p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <TypeBadge type={job.emailType} />
          <PipelineBadge method={job.pipeline} />
          {job.subject && <span className="text-sm font-medium text-foreground">{job.subject}</span>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Date</p>
            <p className="text-sm font-mono text-foreground">
              {new Date(job.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Clock className="h-3 w-3" />Processing</p>
            <p className="text-sm font-mono text-foreground">{job.processingMs}ms</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><DollarSign className="h-3 w-3" />Cost</p>
            <p className="text-sm font-mono text-accent">${job.estimatedCostUsd.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Confidence</p>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(job.confidence ?? 0) * 100}%` }} />
              </div>
              <p className="text-sm font-mono text-foreground">{((job.confidence ?? 0) * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
        <div className={`mt-4 flex items-center gap-1.5 text-xs py-1.5 px-2 rounded w-fit ${
          job.llmUsed ? "bg-accent/10 text-accent" : "bg-green-500/10 text-green-400"
        }`}>
          {job.llmUsed
            ? <><AlertTriangle className="h-3 w-3" />LLM was used</>
            : <><CheckCircle className="h-3 w-3" />Extracted without LLM</>
          }
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Original email */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Original Email</p>
          <div className="bg-card border border-border rounded p-4 max-h-96 overflow-y-auto">
            <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">{job.emailText}</pre>
          </div>
        </div>

        {/* Extracted entries */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Extracted Entries ({entries.length})</p>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {entries.length === 0 ? (
              <div className="bg-card border border-border rounded p-4 text-center text-sm text-muted-foreground">
                No entries were extracted
              </div>
            ) : (
              entries.map((entry, i) => (
                <div key={i} className="bg-card border border-border rounded overflow-hidden" data-testid={`entry-${i}`}>
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/10">
                    <TypeBadge type={entry.entryType} />
                    <PipelineBadge method={entry.extractionMethod} />
                    <span className="text-xs text-muted-foreground ml-auto">{(entry.confidence * 100).toFixed(0)}% confidence</span>
                  </div>
                  <div className="p-3">
                    {Object.entries(entry.fields)
                      .filter(([, v]) => v !== null && v !== undefined && v !== "")
                      .map(([key, val]) => (
                        <div key={key} className="flex gap-2 py-1 border-b border-border/30 last:border-0 text-xs">
                          <span className="text-muted-foreground font-mono w-36 shrink-0">{FIELD_LABELS[key] ?? key}</span>
                          <span className="text-foreground">{String(val)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
