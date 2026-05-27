import { useState } from "react";
import {
  useListExtractions,
  useDeleteExtraction,
  getListExtractionsQueryKey,
} from "@workspace/api-client-react";

import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

type EmailTypeFilter =
  | "VC"
  | "TC"
  | "Tonnage"
  | "Mixed"
  | "Unknown"
  | "";

const PAGE_SIZE = 10;

function PipelineBadge({ method = "" }: { method?: string }) {
  const map: Record<string, string> = {
    "rule-based":
      "bg-green-500/10 text-green-400 border-green-500/20",
    template:
      "bg-primary/10 text-primary border-primary/20",
    "llm-fallback":
      "bg-accent/10 text-accent border-accent/20",
  };

  const labels: Record<string, string> = {
    "rule-based": "Rule-Based",
    template: "Template",
    "llm-fallback": "LLM",
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-xs rounded border ${
        map[method] ??
        "bg-muted text-muted-foreground border-border"
      }`}
    >
      {labels[method] ?? method ?? "Unknown"}
    </span>
  );
}

function TypeBadge({ type = "Unknown" }: { type?: string }) {
  const map: Record<string, string> = {
    VC: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    TC: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    Tonnage:
      "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    Mixed:
      "bg-orange-500/10 text-orange-400 border-orange-500/20",
    Unknown:
      "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-xs rounded border ${
        map[type] ?? map.Unknown
      }`}
    >
      {type}
    </span>
  );
}

export default function History() {
  const [page, setPage] = useState(0);

  const [typeFilter, setTypeFilter] =
    useState<EmailTypeFilter>("");

  const { toast } = useToast();

  const queryClient = useQueryClient();

  const params = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    ...(typeFilter
      ? { emailType: typeFilter }
      : {}),
  };

  const {
    data: rawData,
    isLoading,
  } = useListExtractions(params, {
    query: {
      queryKey:
        getListExtractionsQueryKey(params),
    },
  });

  const data = {
    total: 0,
    items: [],
    ...(rawData ?? {}),
  };

  const deleteMutation = useDeleteExtraction();

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey:
              getListExtractionsQueryKey(),
          });

          toast({
            title: "Deleted",
            description:
              "Extraction removed from history",
          });
        },
      }
    );
  };

  const totalPages = Math.max(
    1,
    Math.ceil((data.total ?? 0) / PAGE_SIZE)
  );

  return (
    <div
      className="p-6 space-y-5"
      data-testid="page-history"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Extraction History
          </h1>

          <p className="text-sm text-muted-foreground mt-0.5">
            {(data.total ?? 0).toLocaleString()} total
            extractions
          </p>
        </div>

        {/* Filter */}

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(
                e.target.value as EmailTypeFilter
              );

              setPage(0);
            }}
            className="text-xs bg-card border border-border rounded px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            data-testid="select-type-filter"
          >
            <option value="">All Types</option>

            <option value="VC">
              VC (Voyage Charter)
            </option>

            <option value="TC">
              TC (Time Charter)
            </option>

            <option value="Tonnage">
              Tonnage
            </option>

            <option value="Mixed">
              Mixed
            </option>
          </select>
        </div>
      </div>

      {/* Table */}

      <div className="bg-card border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-widest">
                  Date
                </th>

                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-widest">
                  Type
                </th>

                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-widest">
                  Pipeline
                </th>

                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-widest">
                  Entries
                </th>

                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-widest">
                  Confidence
                </th>

                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-widest">
                  Speed
                </th>

                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-widest">
                  Cost
                </th>

                <th className="px-4 py-2.5" />
              </tr>
            </thead>

            <tbody>
              {isLoading &&
                [...Array(5)].map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/40"
                  >
                    {[...Array(8)].map((_, j) => (
                      <td
                        key={j}
                        className="px-4 py-3"
                      >
                        <Skeleton className="h-3 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!isLoading &&
                data.items.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      No extractions found.
                    </td>
                  </tr>
                )}

              {!isLoading &&
                data.items.map((job: any) => (
                  <tr
                    key={job.id}
                    className="border-b border-border/40 hover:bg-white/2 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                      {job.createdAt
                        ? new Date(
                            job.createdAt
                          ).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "-"}
                    </td>

                    <td className="px-4 py-3">
                      <TypeBadge
                        type={
                          job.emailType ??
                          "Unknown"
                        }
                      />
                    </td>

                    <td className="px-4 py-3">
                      <PipelineBadge
                        method={
                          job.pipeline ?? ""
                        }
                      />
                    </td>

                    <td className="px-4 py-3 font-mono text-foreground">
                      {(
                        (job.extractedEntries ??
                          []) as unknown[]
                      ).length}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${
                                ((job.confidence ??
                                  0) *
                                  100)
                              }%`,
                            }}
                          />
                        </div>

                        <span className="font-mono text-muted-foreground">
                          {(
                            ((job.confidence ??
                              0) *
                              100)
                          ).toFixed(0)}
                          %
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {(job.processingMs ?? 0).toFixed(
                        0
                      )}
                      ms
                    </td>

                    <td className="px-4 py-3 font-mono text-accent">
                      $
                      {(
                        job.estimatedCostUsd ?? 0
                      ).toFixed(4)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/history/${job.id}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
                        </Link>

                        <button
                          onClick={() =>
                            handleDelete(job.id)
                          }
                          disabled={
                            deleteMutation.isPending
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {page * PAGE_SIZE + 1}–
              {Math.min(
                (page + 1) * PAGE_SIZE,
                data.total ?? 0
              )}{" "}
              of {(data.total ?? 0).toLocaleString()}
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setPage((p) =>
                    Math.max(0, p - 1)
                  )
                }
                disabled={page === 0}
                className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              <span className="text-xs text-muted-foreground px-2">
                {page + 1} / {totalPages}
              </span>

              <button
                onClick={() =>
                  setPage((p) =>
                    Math.min(
                      totalPages - 1,
                      p + 1
                    )
                  )
                }
                disabled={
                  page >= totalPages - 1
                }
                className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}