import { useMemo } from "react";
import { useDashboard } from "@/lib/dashboard-store";
import { GlowCard, SectionHeader } from "../utils";
import { Users, Flame, Calendar, DollarSign, Brain, TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ActivityFeed } from "../ActivityFeed";

const spark = (seed: number) => Array.from({ length: 12 }, (_, i) => ({ v: 30 + Math.sin(i * 0.7 + seed) * 15 + i * 3 + Math.random() * 8 }));

export function DashboardSection() {
  const { leads, appointments, totalRevenue, setActive, setLeadFilters } = useDashboard();
  const hot = useMemo(() => leads.filter(l => l.aiScore >= 75).length, [leads]);
  const aiConv = leads.length ? Math.round((hot / leads.length) * 100) : 0;
  const predicted = Math.round(hot * 850_000 * 0.15);

  const kpis = [
    { label: "Total Leads", value: leads.length, sub: "+12 this week", icon: Users, color: "var(--neon)", click: () => { setLeadFilters({}); setActive("leads"); }, data: spark(1) },
    { label: "Hot Leads", value: hot, sub: "AI score ≥ 75", icon: Flame, color: "oklch(0.78 0.2 30)", click: () => { setLeadFilters({ hot: true }); setActive("leads"); }, data: spark(2) },
    { label: "Site Visits Booked", value: appointments.length, sub: "Next 7 days", icon: Calendar, color: "oklch(0.85 0.18 200)", click: () => setActive("appointments"), data: spark(3) },
    { label: "Revenue Generated", value: `$${(totalRevenue / 1_000_000).toFixed(2)}M`, sub: "+18.4% MoM", icon: DollarSign, color: "oklch(0.82 0.2 150)", click: () => setActive("revenue"), data: spark(4) },
    { label: "AI Conversion Score", value: `${aiConv}%`, sub: "Hot / Total", icon: Brain, color: "oklch(0.7 0.25 300)", click: () => setActive("ai-insights"), data: spark(5) },
    { label: "Predicted Monthly Revenue", value: `$${(predicted / 1_000_000).toFixed(2)}M`, sub: "AI forecast", icon: TrendingUp, color: "var(--neon)", click: () => setActive("forecast"), data: spark(6) },
  ];

  return (
    <div>
      <SectionHeader title="Mission Control" subtitle="Realtime operating picture across global markets" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map(k => (
          <GlowCard key={k.label} onClick={k.click}>
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklab, ${k.color} 15%, transparent)`, border: `1px solid color-mix(in oklab, ${k.color} 35%, transparent)` }}>
                <k.icon className="h-5 w-5" style={{ color: k.color }} />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.sub}</span>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold tracking-tight">{k.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
            </div>
            <div className="h-12 -mx-2 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={k.data}>
                  <defs>
                    <linearGradient id={`g-${k.label}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={k.color} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={k.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area dataKey="v" stroke={k.color} strokeWidth={1.5} fill={`url(#g-${k.label})`} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlowCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2"><RevenuePulse /></div>
        <ActivityFeed />
      </div>
    </div>
  );
}

function RevenuePulse() {
  const data = Array.from({ length: 14 }, (_, i) => ({ d: `D${i + 1}`, revenue: 80 + Math.sin(i * 0.6) * 30 + i * 6, leads: 20 + Math.cos(i * 0.5) * 10 + i * 1.5 }));
  return (
    <GlowCard>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold">Revenue & Lead Pulse</h3>
          <p className="text-xs text-muted-foreground">Last 14 days · all markets</p>
        </div>
        <div className="flex gap-3 text-[11px]">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Revenue</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[oklch(0.7_0.25_300)]" /> Leads</span>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--neon)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--neon)" stopOpacity={0} /></linearGradient>
              <linearGradient id="lds" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="oklch(0.7 0.25 300)" stopOpacity={0.3} /><stop offset="100%" stopColor="oklch(0.7 0.25 300)" stopOpacity={0} /></linearGradient>
            </defs>
            <Area dataKey="revenue" stroke="var(--neon)" strokeWidth={2} fill="url(#rev)" />
            <Area dataKey="leads" stroke="oklch(0.7 0.25 300)" strokeWidth={2} fill="url(#lds)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlowCard>
  );
}
