import { useState, useRef, useEffect } from "react";
import { useDashboard } from "@/lib/dashboard-store";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { id: string; role: "ai" | "user"; text: string };

const SUGGESTIONS = [
  "Show today's hottest leads",
  "Forecast revenue for next month",
  "Which markets show the highest ROI?",
];

export function AIDrawer() {
  const { aiOpen, setAiOpen, leads, totalRevenue } = useDashboard();
  const [messages, setMessages] = useState<Msg[]>([
    { id: "1", role: "ai", text: "Welcome back, Aman. I'm your RealEstateOS intelligence layer. Ask me about leads, markets, or revenue forecasts." },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  const send = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    setMessages(m => [...m, { id: Math.random().toString(36).slice(2), role: "user", text: content }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const hot = leads.filter(l => l.aiScore >= 75).length;
      const reply = content.toLowerCase().includes("revenue")
        ? `Projected pipeline value sits at $${(totalRevenue / 1_000_000).toFixed(1)}M with 12.4% confidence-weighted upside. Top contributor: UAE luxury segment.`
        : content.toLowerCase().includes("hot") || content.toLowerCase().includes("lead")
        ? `${hot} leads currently qualify as hot (AI score ≥ 75). The 3 highest-priority are flagged Critical. Want me to draft outreach?`
        : `Analyzed. Based on cross-market signals, I recommend prioritizing Dubai Marina and Mayfair this week — both show >12% predicted appreciation.`;
      setMessages(m => [...m, { id: Math.random().toString(36).slice(2), role: "ai", text: reply }]);
      setTyping(false);
    }, 900);
  };

  return (
    <Sheet open={aiOpen} onOpenChange={setAiOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col glass-strong border-border/60">
        <SheetHeader className="p-4 border-b border-border/60">
          <SheetTitle className="flex items-center gap-2">
            <div className="relative">
              <Bot className="h-5 w-5 text-primary" />
              <span className="absolute -inset-1 rounded-full bg-primary/30 blur-md -z-10" />
            </div>
            AI Assistant
            <span className="ml-2 text-xs text-[oklch(0.82_0.2_150)] flex items-center gap-1.5"><span className="pulse-dot" /> Online</span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {messages.map(m => (
            <div key={m.id} className={cn("flex gap-2", m.role === "user" && "flex-row-reverse")}>
              <div className={cn("h-8 w-8 shrink-0 rounded-full flex items-center justify-center", m.role === "ai" ? "bg-primary/20" : "bg-accent")}>
                {m.role === "ai" ? <Sparkles className="h-4 w-4 text-primary" /> : <User className="h-4 w-4" />}
              </div>
              <div className={cn("rounded-2xl px-3.5 py-2.5 text-sm max-w-[80%]", m.role === "ai" ? "glass" : "bg-primary text-primary-foreground")}>
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center"><Sparkles className="h-4 w-4 text-primary" /></div>
              <div className="glass rounded-2xl px-4 py-3 flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:240ms]" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="p-3 border-t border-border/60 space-y-2">
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} className="text-xs px-2.5 py-1 rounded-full glass hover:border-primary/50 transition-colors">{s}</button>
              ))}
            </div>
          )}
          <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything…" className="bg-input/40" />
            <Button type="submit" size="icon" className="shrink-0"><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
