import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function urgencyColor(u: string) {
  if (u === "Critical") return "border-[oklch(0.65_0.24_22_/_0.6)] bg-[oklch(0.65_0.24_22_/_0.15)] text-[oklch(0.85_0.18_30)]";
  if (u === "High") return "border-[oklch(0.78_0.2_50_/_0.6)] bg-[oklch(0.78_0.2_50_/_0.15)] text-[oklch(0.88_0.18_60)]";
  if (u === "Medium") return "border-[oklch(0.82_0.2_200_/_0.6)] bg-[oklch(0.82_0.2_200_/_0.15)] text-[oklch(0.88_0.18_200)]";
  return "border-border bg-muted/30 text-muted-foreground";
}

export function scoreColor(score: number) {
  if (score >= 85) return "text-[oklch(0.82_0.2_150)]";
  if (score >= 70) return "text-[oklch(0.85_0.18_200)]";
  if (score >= 50) return "text-[oklch(0.78_0.2_50)]";
  return "text-muted-foreground";
}

export function SectionHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
    >
      <div>
        <div className="mb-2 h-1 w-12 rounded-full bg-gradient-to-r from-primary via-[oklch(0.7_0.25_300)] to-transparent" />
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </motion.div>
  );
}

export function GlowCard({
  className,
  children,
  onClick,
  delay = 0,
}: {
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  delay?: number;
}) {
  const Comp = onClick ? motion.button : motion.div;
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileHover={onClick ? { y: -2, scale: 1.005 } : { y: -2 }}
      className={cn(
        "command-card rounded-2xl p-5 text-left transition-shadow",
        onClick && "w-full cursor-pointer hover:command-card-active",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

export function ChartPanel({
  title,
  subtitle,
  badge,
  children,
  className,
  action,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <GlowCard className={cn("!p-4", className)}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-3 flex flex-wrap items-start justify-between gap-3"
      >
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle ? <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          {badge}
          {action}
        </div>
      </motion.div>
      {children}
    </GlowCard>
  );
}

export function KpiStatCard({
  label,
  value,
  sub,
  icon,
  trend,
  trendUp,
  onClick,
  accent = "var(--neon)",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  trend?: string;
  trendUp?: boolean;
  onClick?: () => void;
  accent?: string;
}) {
  return (
    <GlowCard onClick={onClick} className="!p-4">
      <div className="flex items-start justify-between gap-2">
        {icon ? (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: `color-mix(in oklab, ${accent} 18%, transparent)`,
              border: `1px solid color-mix(in oklab, ${accent} 40%, transparent)`,
              color: accent,
            }}
          >
            {icon}
          </div>
        ) : null}
        {trend ? (
          <span
            className={cn(
              "rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
              trendUp
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300",
            )}
          >
            {trend}
          </span>
        ) : null}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight md:text-3xl">{value}</div>
        <div className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</div>
        {sub ? <div className="mt-2 line-clamp-2 text-[11px] text-muted-foreground/90">{sub}</div> : null}
      </div>
    </GlowCard>
  );
}

export function Mini({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger" | "info" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-300"
      : tone === "danger"
        ? "text-red-300"
        : tone === "info"
          ? "text-cyan-200"
          : tone === "muted"
            ? "text-muted-foreground"
            : "text-foreground";

  return (
    <div className="command-card rounded-xl p-3 text-center">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-sm font-semibold", toneClass)}>{value}</div>
    </div>
  );
}
