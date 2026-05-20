import { useGetStats } from "@workspace/api-client-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingDown, Zap, CheckCircle, AlertTriangle, Clock, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({ label, value, sub, icon: Icon, accent = false }: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded p-4" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">{label}</p>
        <div className={`p-1.5 rounded ${accent ? "bg-accent/10" : "bg-primary/10"}`}>
          <Icon className={`h-3.5 w-3.5 ${accent ? "text-accent" : "text-primary"}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold font-mono ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function PipelineBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <span className="text-sm font-mono font-medium text-foreground">{count.toLocaleString()}</span>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStats();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const s = stats!;

  return (
    <div className="p-6 space-y-6" data-testid="page-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Extraction Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Hybrid pipeline performance overview</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400 font-medium">
          <Activity className="h-3 w-3" />
          Engine Active
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Processed"
          value={s.totalEmails.toLocaleString()}
          sub="emails extracted"
          icon={Zap}
        />
        <StatCard
          label="Cost Reduction"
          value={`${s.costReductionPct.toFixed(1)}%`}
          sub="vs LLM-only approach"
          icon={TrendingDown}
          accent
        />
        <StatCard
          label="LLM Savings"
          value={`$${s.estimatedLlmSavingsUsd.toFixed(2)}`}
          sub="estimated saved"
          icon={TrendingDown}
          accent
        />
        <StatCard
          label="Avg Confidence"
          value={`${(s.avgConfidence * 100).toFixed(1)}%`}
          sub={`${s.avgProcessingMs.toFixed(0)}ms avg latency`}
          icon={CheckCircle}
        />
      </div>

      {/* Chart + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">Extraction Activity</p>
            <p className="text-xs text-muted-foreground">Last 14 days</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={s.recentActivity} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217.2 91.2% 59.8%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217.2 91.2% 59.8%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLlm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(216 34% 17%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215.4 16.3% 56.9%)" }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215.4 16.3% 56.9%)" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "hsl(222 47% 11%)", border: "1px solid hsl(216 34% 17%)", borderRadius: 4, fontSize: 12 }}
                labelStyle={{ color: "hsl(213 31% 91%)" }}
              />
              <Area type="monotone" dataKey="count" name="Total" stroke="hsl(217.2 91.2% 59.8%)" fill="url(#colorCount)" strokeWidth={2} />
              <Area type="monotone" dataKey="llmUsed" name="LLM Used" stroke="hsl(38 92% 50%)" fill="url(#colorLlm)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline breakdown */}
        <div className="bg-card border border-border rounded p-4">
          <p className="text-sm font-semibold text-foreground mb-4">Pipeline Breakdown</p>
          <PipelineBadge label="Rule-Based" count={s.ruleBasedCount} color="bg-green-400" />
          <PipelineBadge label="Template Parser" count={s.templateCount} color="bg-primary" />
          <PipelineBadge label="LLM Fallback" count={s.llmFallbackCount} color="bg-accent" />

          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Without LLM</span>
              <span className="text-green-400 font-mono font-medium">
                {s.totalEmails > 0 ? (((s.ruleBasedCount + s.templateCount) / s.totalEmails) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-green-400 h-1.5 rounded-full transition-all"
                style={{ width: s.totalEmails > 0 ? `${((s.ruleBasedCount + s.templateCount) / s.totalEmails) * 100}%` : "0%" }}
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-accent/5 border border-accent/10 rounded">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-accent">Cost Target</p>
                <p className="text-xs text-muted-foreground mt-0.5">70% LLM reduction goal: {s.costReductionPct >= 70 ? "Achieved" : `${(70 - s.costReductionPct).toFixed(1)}% to go`}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary/40" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Avg Speed</p>
            <p className="text-lg font-bold font-mono text-foreground">{s.avgProcessingMs.toFixed(0)}ms</p>
            <p className="text-xs text-muted-foreground">vs ~2000ms LLM</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded p-4 flex items-center gap-3">
          <TrendingDown className="h-8 w-8 text-accent/40" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Cost per Email</p>
            <p className="text-lg font-bold font-mono text-accent">$0.0001</p>
            <p className="text-xs text-muted-foreground">vs ~$0.015 LLM</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded p-4 flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-green-400/40" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Avg Accuracy</p>
            <p className="text-lg font-bold font-mono text-foreground">{(s.avgConfidence * 100).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">confidence score</p>
          </div>
        </div>
      </div>
    </div>
  );
}
