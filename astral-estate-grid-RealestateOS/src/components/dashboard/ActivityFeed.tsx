import { useEffect, useState } from "react";
import { useDashboard } from "@/lib/dashboard-store";
import { Activity as ActivityIcon, UserPlus, Sparkles, Calendar, DollarSign, UserCheck, ShieldCheck, Bot } from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "user-plus": UserPlus, "sparkles": Sparkles, "calendar": Calendar, "dollar-sign": DollarSign,
  "user-check": UserCheck, "shield": ShieldCheck, "bot": Bot, "activity": ActivityIcon,
};

const ago = (t: number) => {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export function ActivityFeed() {
  const { activity } = useDashboard();
  // Avoid SSR/CSR text mismatch (#418): render relative time only after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return (
    <div className="command-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span className="pulse-dot" /> Live Activity Feed
        </h3>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Realtime</span>
      </div>
      <ul className="space-y-3 max-h-[28rem] overflow-y-auto scrollbar-thin pr-1">
        {activity.map(a => {
          const Icon = ICONS[a.icon] ?? ActivityIcon;
          return (
            <li key={a.id} className="flex gap-3 items-start group">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:border-primary/50 transition-colors">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm leading-tight">{a.text}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5" suppressHydrationWarning>{mounted ? ago(a.time) : "just now"}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
