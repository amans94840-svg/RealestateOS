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

export function SectionHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}

export function GlowCard({ className, children, onClick }: { className?: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn("glass rounded-2xl p-5 transition-all", onClick && "cursor-pointer hover:neon-border hover:-translate-y-0.5", className)}>
      {children}
    </div>
  );
}

export function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-2.5 text-center">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}
