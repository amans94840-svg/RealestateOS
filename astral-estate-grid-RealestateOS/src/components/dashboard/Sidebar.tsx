import { useDashboard, type SectionKey } from "@/lib/dashboard-store";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Building2,
  Calendar,
  TrendingUp,
  Map,
  Bot,
  ShieldCheck,
  DollarSign,
  Trophy,
  FileText,
  Settings,
  Sparkles,
  LineChart,
  ChevronLeft,
  Hexagon,
  Crown,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useState } from "react";
import BillingSheet from "./BillingSheet";

const NAV: {
  key: SectionKey;
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: (ctx: { leads: number; appointments: number }) => number | null;
}[] = [
  { key: "dashboard", label: "Dashboard", short: "Dashboard", icon: LayoutDashboard },
  {
    key: "leads",
    label: "Leads",
    short: "Leads",
    icon: Users,
    badge: (c) => (c.leads > 0 ? c.leads : null),
  },
  { key: "ai-conversations", label: "AI Conversations", short: "AI Chat", icon: MessageSquare },
  { key: "properties", label: "Properties", short: "Properties", icon: Building2 },
  {
    key: "appointments",
    label: "Appointments",
    short: "Visits",
    icon: Calendar,
    badge: (c) => (c.appointments > 0 ? c.appointments : null),
  },
  { key: "investor", label: "Investor & Area Growth", short: "Investor", icon: TrendingUp },
  { key: "heatmaps", label: "AI Opportunity Map", short: "Map", icon: Map },
  { key: "ai-agents", label: "AI Agents", short: "Agents", icon: Bot },
  { key: "trust", label: "Trust & Risk", short: "Trust", icon: ShieldCheck },
  { key: "revenue", label: "Revenue Analytics", short: "Revenue", icon: DollarSign },
  { key: "brokers", label: "Broker Performance", short: "Brokers", icon: Trophy },
  { key: "reports", label: "Reports", short: "Reports", icon: FileText },
  { key: "ai-insights", label: "AI Intelligence Hub", short: "AI Insights", icon: Sparkles },
  { key: "forecast", label: "AI Forecasting", short: "Forecast", icon: LineChart },
  { key: "settings", label: "Settings", short: "Settings", icon: Settings },
];

export function Sidebar() {
  const { active, setActive, sidebarOpen, setSidebarOpen, leads, appointments, user } = useDashboard();
  const [billingOpen, setBillingOpen] = useState(false);
  const ctx = { leads: leads.length, appointments: appointments.length };

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "relative z-30 flex h-screen shrink-0 flex-col border-r border-sidebar-border/80 bg-sidebar/95 backdrop-blur-2xl transition-[width] duration-300 ease-out",
          sidebarOpen ? "w-[260px]" : "w-[76px]",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border/80 px-4">
          <div className="relative shrink-0">
            <Hexagon className="h-8 w-8 text-primary" strokeWidth={1.5} />
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-lg" />
          </div>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
              <div className="truncate text-base font-bold leading-tight tracking-tight">
                RealEstate<span className="neon-text">OS</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">AI Command Center</div>
            </motion.div>
          )}
        </div>

        <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {NAV.map(({ key, label, short, icon: Icon, badge }) => {
            const isActive = active === key;
            const count = badge?.(ctx) ?? null;
            const btn = (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                  isActive ? "nav-active text-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-foreground",
                )}
              >
                <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-primary")} />
                {sidebarOpen && <span className="truncate text-left">{label}</span>}
                {!sidebarOpen && !isActive && <span className="sr-only">{label}</span>}
                {count != null && sidebarOpen ? (
                  <Badge className="ml-auto h-5 min-w-5 border-primary/30 bg-primary/15 px-1.5 text-[10px] text-primary">
                    {count > 99 ? "99+" : count}
                  </Badge>
                ) : null}
              </button>
            );
            if (!sidebarOpen) {
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right" className="glass-strong">
                    {short}
                    {count != null ? ` · ${count}` : ""}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return btn;
          })}
        </nav>

        {sidebarOpen ? (
          <>
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setBillingOpen(true)}
              className="mx-2 mb-2 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 to-[oklch(0.7_0.25_300_/_0.12)] p-3 text-left"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Crown className="h-4 w-4 text-primary" />
                Upgrade to Pro
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Unlock advanced AI forecasting & team seats.</p>
            </motion.button>
            <BillingSheet open={billingOpen} onOpenChange={(v) => setBillingOpen(v)} />
          </>
        ) : null}

        <div className="border-t border-sidebar-border/80 p-3">
          <button
            type="button"
            onClick={() => setActive("settings")}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 hover:bg-sidebar-accent/80 transition-colors"
          >
            <motion.div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/40 to-[oklch(0.7_0.25_300_/_0.35)] text-xs font-bold ring-2 ring-primary/30">
              {user.avatar}
            </motion.div>
            {sidebarOpen && (
              <motion.div className="min-w-0 text-left">
                <div className="truncate text-sm font-medium">{user.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">{user.role}</div>
              </motion.div>
            )}
          </button>
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 command-card hover:scale-110 transition-transform"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", !sidebarOpen && "rotate-180")} />
        </button>
      </aside>
    </TooltipProvider>
  );
}

