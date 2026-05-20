import { useState } from "react";
import { useListRegions, useListPorts, useListVesselSizes } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

type Tab = "regions" | "ports" | "vessels";

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-3 py-2 text-sm bg-card border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        data-testid="input-knowledge-search"
      />
    </div>
  );
}

export default function Knowledge() {
  const [activeTab, setActiveTab] = useState<Tab>("regions");
  const [search, setSearch] = useState("");

  const { data: regions, isLoading: loadingRegions } = useListRegions();
  const { data: ports, isLoading: loadingPorts } = useListPorts();
  const { data: vessels, isLoading: loadingVessels } = useListVesselSizes();

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "regions", label: "Regions", count: regions?.length },
    { id: "ports", label: "Ports", count: ports?.length },
    { id: "vessels", label: "Vessel Sizes", count: vessels?.length },
  ];

  const q = search.toLowerCase();
  const filteredRegions = regions?.filter(r => !q || r.code.toLowerCase().includes(q) || r.fullName.toLowerCase().includes(q)) ?? [];
  const filteredPorts = ports?.filter(p => !q || p.code.toLowerCase().includes(q) || p.fullName.toLowerCase().includes(q)) ?? [];
  const filteredVessels = vessels?.filter(v => !q || v.name.toLowerCase().includes(q)) ?? [];

  const isLoading = loadingRegions || loadingPorts || loadingVessels;

  return (
    <div className="p-6 space-y-5" data-testid="page-knowledge">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Maritime Knowledge Base</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Reference dictionaries used by the extraction engine</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearch(""); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-xs text-muted-foreground font-mono">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search ${activeTab}...`}
        />
      </div>

      {/* Content */}
      <div className="bg-card border border-border rounded overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-9" />)}
          </div>
        ) : activeTab === "regions" ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-widest w-28">Code</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-widest">Full Name</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-widest">Category</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegions.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No results</td></tr>
              ) : filteredRegions.map(r => (
                <tr key={r.code} className="border-b border-border/40 hover:bg-white/2 transition-colors" data-testid={`row-region-${r.code}`}>
                  <td className="px-4 py-2.5 font-mono font-bold text-primary">{r.code}</td>
                  <td className="px-4 py-2.5 text-foreground">{r.fullName}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeTab === "ports" ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-widest w-32">Code</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-widest">Full Name</th>
              </tr>
            </thead>
            <tbody>
              {filteredPorts.length === 0 ? (
                <tr><td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">No results</td></tr>
              ) : filteredPorts.map(p => (
                <tr key={p.code} className="border-b border-border/40 hover:bg-white/2 transition-colors" data-testid={`row-port-${p.code}`}>
                  <td className="px-4 py-2.5 font-mono font-bold text-primary">{p.code}</td>
                  <td className="px-4 py-2.5 text-foreground">{p.fullName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-widest">Vessel Class</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-widest">Min DWT</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-widest">Max DWT</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-widest">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredVessels.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No results</td></tr>
              ) : filteredVessels.map(v => (
                <tr key={v.name} className="border-b border-border/40 hover:bg-white/2 transition-colors" data-testid={`row-vessel-${v.name}`}>
                  <td className="px-4 py-2.5 font-bold text-foreground">{v.name}</td>
                  <td className="px-4 py-2.5 font-mono text-primary">{v.minDwt.toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono text-primary">{v.maxDwt ? v.maxDwt.toLocaleString() : "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{v.description ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
