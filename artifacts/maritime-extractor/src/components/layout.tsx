import { Link, useLocation } from "wouter";
import { LayoutDashboard, Upload, History, BookOpen, Anchor, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/extract", label: "Extract Email", icon: Upload },
  { href: "/history", label: "History", icon: History },
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
];

function NavLink({ href, label, icon: Icon, onClick }: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; onClick?: () => void }) {
  const [location] = useLocation();
  const isActive = href === "/" ? location === "/" : location.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-primary/15 text-primary border border-primary/20"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      )}
      data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {label}
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border bg-sidebar shrink-0">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-primary/15 border border-primary/20">
            <Anchor className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground tracking-wide">MARITIME</p>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Extractor</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground font-mono">Rule-Based Engine v1.0</p>
          <p className="text-[10px] text-muted-foreground/60">Hybrid extraction pipeline</p>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 flex flex-col bg-sidebar border-r border-border">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-primary/15 border border-primary/20">
                  <Anchor className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground tracking-wide">MARITIME</p>
                  <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Extractor</p>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-3 flex-1">
              {NAV_ITEMS.map(item => (
                <NavLink key={item.href} {...item} onClick={() => setMobileOpen(false)} />
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-sidebar">
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-foreground" data-testid="button-mobile-menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Anchor className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold tracking-wide">MARITIME EXTRACTOR</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
