import { useState, type FormEvent } from "react";
import { Menu, Send, Sparkles } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { AuthFuturisticBackground } from "./AuthFuturisticBackground";
import { AuthGetStartedModal } from "./AuthGetStartedModal";

export function AuthLandingExperience() {
  const { login, isAuthenticated, setActive } = useDashboard();
  const [authOpen, setAuthOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const openAuth = () => setAuthOpen(true);

  const handlePromptSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = prompt.trim();
    if (!q) {
      toast.error("Type a question or workflow to continue.");
      return;
    }
    if (isAuthenticated) {
      setActive("dashboard");
      toast.success("Opening dashboard", { description: "Your workspace is ready." });
      return;
    }
    openAuth();
    toast.message("Sign in to continue", { description: "We opened the account panel for you." });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050a18] text-white">
      <AuthFuturisticBackground />

      <header className="relative z-10 flex items-center justify-between px-4 py-4 md:px-8">
        <div className="text-lg font-semibold tracking-tight md:text-xl">
          <span className="bg-gradient-to-r from-white via-sky-100 to-violet-200 bg-clip-text text-transparent">RealestateOS</span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <Button
            onClick={openAuth}
            className="hidden rounded-full bg-gradient-to-r from-violet-500 to-sky-500 px-5 text-white shadow-lg shadow-violet-500/25 hover:opacity-95 sm:inline-flex"
          >
            Get started
          </Button>
          <Button onClick={openAuth} size="sm" className="rounded-full bg-gradient-to-r from-violet-500 to-sky-500 px-4 text-white sm:hidden">
            Start
          </Button>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="border-white/15 bg-white/5 text-white hover:bg-white/10" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="border-white/10 bg-[#0a1020]/95 text-white backdrop-blur-xl">
              <SheetHeader>
                <SheetTitle className="text-white">Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-3">
                <Button className="w-full justify-start rounded-xl bg-white/10 text-white hover:bg-white/15" onClick={() => { setSheetOpen(false); openAuth(); }}>
                  Get started
                </Button>
                <Button variant="ghost" className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white" onClick={() => { setSheetOpen(false); openAuth(); }}>
                  Sign in
                </Button>
                <Button variant="ghost" className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white" onClick={() => { setSheetOpen(false); toast.message("Product tour", { description: "Explore the dashboard after you sign in." }); }}>
                  Product tour
                </Button>
                <Button variant="ghost" className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white" onClick={() => { setSheetOpen(false); toast.message("Contact sales", { description: "sales@realestateos.ai" }); }}>
                  Contact sales
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 pb-24 pt-10 text-center md:pt-16">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/60 backdrop-blur-md md:text-xs">
          <Sparkles className="h-3.5 w-3.5 text-amber-300/90" />
          New — AI Real Estate Operating System
        </div>
        <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight md:text-6xl md:leading-[1.08]">
          Build your{" "}
          <span className="bg-gradient-to-r from-sky-200 via-white to-amber-200 bg-clip-text text-transparent">Real Estate Empire</span>
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-base text-white/65 md:text-lg">
          Manage leads, properties, deals, follow-ups and automation from one powerful dashboard
        </p>

        <form onSubmit={handlePromptSubmit} className="mt-10 w-full max-w-2xl">
          <div className="group relative rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 shadow-[0_20px_60px_-20px_rgba(56,189,248,0.35)] backdrop-blur-xl transition hover:border-sky-400/30 md:rounded-3xl md:p-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask RealestateOS to manage your real estate workflow…"
                className="min-h-[52px] flex-1 border-0 bg-transparent px-4 text-base text-white placeholder:text-white/35 focus-visible:ring-0 focus-visible:ring-offset-0 md:text-[17px]"
              />
              <Button type="submit" size="lg" className="h-12 shrink-0 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-6 text-white shadow-lg hover:opacity-95 sm:h-11 sm:rounded-2xl">
                <Send className="mr-2 h-4 w-4" />
                Submit
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/40">Press submit to open your workspace or sign in.</p>
        </form>
      </main>

      <AuthGetStartedModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onDemoSignup={(p) => {
          login({ email: p.email, name: p.name, role: p.role, company: p.company, replace: true });
          toast.success("Demo workspace ready", { description: "Configure Supabase for production auth." });
        }}
        onDemoLogin={(p) => {
          login({ email: p.email, name: p.name, role: p.role, company: p.company || "RealEstateOS", replace: true });
          toast.success("Demo session", { description: "Configure Supabase for production auth." });
        }}
      />
      <Toaster theme="dark" position="bottom-center" className="sm:bottom-8" />
    </div>
  );
}
