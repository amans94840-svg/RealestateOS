import { useDashboard, type SectionKey } from "@/lib/dashboard-store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, MessageSquare, Building2, Calendar, TrendingUp, Map,
  Bot, ShieldCheck, DollarSign, Trophy, FileText, Settings, Sparkles, LineChart,
  ChevronLeft, Hexagon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const NAV: { key: SectionKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "leads", label: "Leads", icon: Users },
  { key: "ai-conversations", label: "AI Conversations", icon: MessageSquare },
  { key: "properties", label: "Properties", icon: Building2 },
  { key: "appointments", label: "Appointments", icon: Calendar },
  { key: "investor", label: "Investor & Area Growth", icon: TrendingUp },
  { key: "heatmaps", label: "AI Opportunity Map", icon: Map },
  { key: "ai-agents", label: "AI Agents", icon: Bot },
  { key: "trust", label: "Trust & Risk", icon: ShieldCheck },
  { key: "revenue", label: "Revenue Analytics", icon: DollarSign },
  { key: "brokers", label: "Broker Performance", icon: Trophy },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "ai-insights", label: "AI Insights", icon: Sparkles },
  { key: "forecast", label: "AI Forecasting Engine", icon: LineChart },
  { key: "settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { active, setActive, sidebarOpen, setSidebarOpen } = useDashboard();

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "relative shrink-0 h-screen sticky top-0 z-30 border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl transition-[width] duration-300 ease-out",
          sidebarOpen ? "w-64" : "w-[72px]",
        )}
      >
        <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border">
          <div className="relative">
            <Hexagon className="h-7 w-7 text-primary" strokeWidth={1.5} />
            <div className="absolute inset-0 blur-lg bg-primary/40 rounded-full" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div className="font-bold tracking-tight text-base leading-tight">RealEstate<span className="neon-text">OS</span></div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AI Command Center</div>
            </div>
          )}
        </div>

        <nav className="px-2 py-3 space-y-1 overflow-y-auto scrollbar-thin h-[calc(100vh-4rem-3rem)]">
          {NAV.map(({ key, label, icon: Icon }) => {
            const isActive = active === key;
            const btn = (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={cn(
                  "group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                  isActive
                    ? "bg-primary/10 text-foreground neon-border"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <Icon className={cn("h-4.5 w-4.5 shrink-0", isActive && "text-primary")} />
                {sidebarOpen && <span className="truncate">{label}</span>}
                {isActive && sidebarOpen && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--neon)]" />
                )}
              </button>
            );
            if (!sidebarOpen) {
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              );
            }
            return btn;
          })}
        </nav>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full glass-strong flex items-center justify-center hover:scale-110 transition-transform z-50"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", !sidebarOpen && "rotate-180")} />
        </button>
      </aside>
    </TooltipProvider>
  );
}
