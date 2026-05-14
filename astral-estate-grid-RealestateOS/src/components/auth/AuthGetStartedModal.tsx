import { useState } from "react";
import { toast } from "sonner";
import { Github, Loader2, X, Apple } from "lucide-react";
import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isSupabaseConfigured } from "@/lib/supabase-client";
import {
  sendPasswordResetEmail,
  signInWithEmailPassword,
  signInWithOAuthProvider,
  signUpWithEmail,
} from "@/lib/supabase-auth";

const TERMS = `Terms of Service — RealEstateOS (summary)

By creating an account you agree to use RealEstateOS in compliance with applicable laws. You are responsible for activity under your credentials. We may update these terms; continued use constitutes acceptance.

For production deployments, replace this placeholder with counsel-reviewed legal text and host a dedicated Terms page.`;

const PRIVACY = `Privacy Policy — RealEstateOS (summary)

We process account and usage data to operate the service, improve reliability, and secure your workspace. OAuth providers share profile basics according to their policies.

Configure Supabase Row Level Security for the profiles table. Replace this placeholder with a full privacy policy before public launch.`;

type View = "oauth" | "email-signup" | "email-login" | "forgot" | "terms" | "privacy";

const ROLE_OPTIONS = ["Agent", "Broker", "Agency Owner", "Admin"] as const;

function GoogleGlyph() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.25 1.3-1 2.4-2.1 3.1l3.4 2.6c2-1.8 3.1-4.5 3.1-7.7 0-.75-.07-1.45-.2-2.1H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.4l-3.4-2.6c-.9.6-2.1 1-3.3 1-2.5 0-4.7-1.7-5.5-4H5.1v2.6C6.8 20.3 9.2 22 12 22z"
      />
      <path
        fill="#4A90E2"
        d="M6.5 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V7.5H5.1C4.4 8.9 4 10.4 4 12s.4 3.1 1.1 4.5l1.4-1.1z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.4c1.4 0 2.6.5 3.6 1.4l2.7-2.7C16.9 2.9 14.7 2 12 2 9.2 2 6.8 3.7 5.1 6.5l3.4 2.6c.8-2.3 3-4 5.5-4z"
      />
    </svg>
  );
}

export function AuthGetStartedModal({
  open,
  onOpenChange,
  onDemoSignup,
  onDemoLogin,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDemoSignup?: (p: { email: string; name: string; role: string; company: string }) => void;
  onDemoLogin?: (p: { email: string; name: string; role: string; company: string }) => void;
}) {
  const [view, setView] = useState<View>("oauth");
  const [oauthBusy, setOauthBusy] = useState<null | "google" | "github" | "apple">(null);
  const [emailBusy, setEmailBusy] = useState(false);

  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suCompany, setSuCompany] = useState("");
  const [suRole, setSuRole] = useState<string>(ROLE_OPTIONS[0]);

  const [liEmail, setLiEmail] = useState("");
  const [liPassword, setLiPassword] = useState("");

  const [fpEmail, setFpEmail] = useState("");

  const resetForms = () => {
    setSuName("");
    setSuEmail("");
    setSuPassword("");
    setSuCompany("");
    setSuRole(ROLE_OPTIONS[0]);
    setLiEmail("");
    setLiPassword("");
    setFpEmail("");
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setView("oauth");
      resetForms();
    }
    onOpenChange(v);
  };

  const requireConfigured = () => {
    if (!isSupabaseConfigured()) {
      toast.error("Supabase is not configured", {
        description: "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.",
      });
      return false;
    }
    return true;
  };

  const oauth = async (provider: "google" | "github" | "apple") => {
    if (!requireConfigured()) return;
    setOauthBusy(provider);
    try {
      await signInWithOAuthProvider(provider);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (provider === "apple") {
        toast.message("Apple sign-in coming soon", {
          description: "Enable Apple in the Supabase Auth providers dashboard, or use Google, GitHub, or email.",
        });
        return;
      }
      toast.error("Sign-in failed", { description: msg });
    } finally {
      setOauthBusy(null);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const minPw = isSupabaseConfigured() ? 8 : 6;
    if (!suEmail.includes("@") || suPassword.length < minPw) {
      toast.error(
        isSupabaseConfigured()
          ? "Use a valid email and password (8+ characters)."
          : "Use a valid email and password (6+ characters for demo).",
      );
      return;
    }
    if (!isSupabaseConfigured()) {
      onDemoSignup?.({
        email: suEmail,
        name: suName || suEmail.split("@")[0]!,
        role: suRole,
        company: suCompany || "Independent",
      });
      handleClose(false);
      return;
    }
    setEmailBusy(true);
    try {
      const data = await signUpWithEmail({
        email: suEmail,
        password: suPassword,
        fullName: suName || suEmail.split("@")[0]!,
        company: suCompany,
        role: suRole,
      });
      if (data.session) {
        toast.success("Workspace created", { description: "Welcome to RealEstateOS." });
        handleClose(false);
      } else {
        toast.success("Check your inbox", {
          description: "Confirm your email if your project requires email verification.",
        });
      }
    } catch (err) {
      toast.error("Could not create account", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setEmailBusy(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liEmail.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    if (!isSupabaseConfigured()) {
      onDemoLogin?.({
        email: liEmail,
        name: liEmail.split("@")[0]!,
        role: "Agent",
        company: "",
      });
      handleClose(false);
      return;
    }
    setEmailBusy(true);
    try {
      await signInWithEmailPassword(liEmail, liPassword);
      toast.success("Welcome back");
      handleClose(false);
    } catch (err) {
      toast.error("Login failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setEmailBusy(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    if (!isSupabaseConfigured()) {
      toast.message("Password reset unavailable", {
        description: "Configure Supabase to enable email recovery.",
      });
      return;
    }
    setEmailBusy(true);
    try {
      await sendPasswordResetEmail(fpEmail);
      toast.success("Reset link sent", { description: "Check your email for password recovery instructions." });
      setView("email-login");
    } catch (err) {
      toast.error("Could not send reset email", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setEmailBusy(false);
    }
  };

  const title =
    view === "terms"
      ? "Terms of Service"
      : view === "privacy"
        ? "Privacy Policy"
        : view === "email-signup"
          ? "Create your workspace"
          : view === "email-login"
            ? "Login"
            : view === "forgot"
              ? "Reset password"
              : "Start building.";

  const subtitle =
    view === "oauth" || view === "email-signup" || view === "email-login" || view === "forgot"
      ? view === "oauth"
        ? "Create your free RealestateOS account"
        : undefined
      : undefined;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-h-[min(92vh,720px)] w-[min(100%,420px)] overflow-hidden border border-white/10 bg-[oklch(0.16_0.04_265_/_0.85)] p-0 shadow-2xl backdrop-blur-2xl sm:rounded-3xl [&>button]:hidden"
      >
        <div className="relative max-h-[min(92vh,720px)] overflow-y-auto px-6 pb-6 pt-8 scrollbar-thin">
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            onClick={() => handleClose(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {view !== "terms" && view !== "privacy" && (
            <DialogHeader className="space-y-1 pr-8 text-left">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-white">{title}</DialogTitle>
              {subtitle && <p className="text-sm text-white/55">{subtitle}</p>}
            </DialogHeader>
          )}

          {(view === "terms" || view === "privacy") && (
            <div className="pr-8">
              <DialogHeader className="text-left">
                <DialogTitle className="text-xl font-semibold text-white">{title}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="mt-4 h-[min(55vh,420px)] rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">{view === "terms" ? TERMS : PRIVACY}</p>
              </ScrollArea>
              <Button type="button" variant="outline" className="mt-4 w-full border-white/20 bg-white/5 text-white" onClick={() => setView("oauth")}>
                Back
              </Button>
            </div>
          )}

          {view === "oauth" && (
            <div className="mt-6 space-y-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-center border-white/15 bg-white/[0.06] text-white hover:bg-white/10"
                disabled={oauthBusy !== null}
                onClick={() => void oauth("google")}
              >
                {oauthBusy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleGlyph />}
                Continue with Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-center border-white/15 bg-white/[0.06] text-white hover:bg-white/10"
                disabled={oauthBusy !== null}
                onClick={() => void oauth("github")}
              >
                {oauthBusy === "github" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
                Continue with GitHub
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-center border-white/15 bg-white/[0.06] text-white hover:bg-white/10"
                disabled={oauthBusy !== null}
                onClick={() => void oauth("apple")}
              >
                {oauthBusy === "apple" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Apple className="mr-2 h-4 w-4" />}
                Continue with Apple
              </Button>

              <div className="relative py-2">
                <Separator className="bg-white/10" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[oklch(0.16_0.04_265)] px-2 text-[11px] uppercase tracking-widest text-white/40">
                  OR
                </span>
              </div>

              <Button
                type="button"
                className="h-11 w-full bg-gradient-to-r from-violet-500/90 to-sky-500/90 text-white shadow-lg hover:opacity-95"
                onClick={() => setView("email-signup")}
              >
                Continue with email
              </Button>

              <p className="pt-2 text-center text-[11px] text-white/45">
                By continuing you agree to our{" "}
                <button type="button" className="text-sky-300/90 underline-offset-2 hover:underline" onClick={() => setView("terms")}>
                  Terms of Service
                </button>{" "}
                and{" "}
                <button type="button" className="text-sky-300/90 underline-offset-2 hover:underline" onClick={() => setView("privacy")}>
                  Privacy Policy
                </button>
                .
              </p>
              <p className="text-center text-[10px] text-white/35">SSO available on Business and Enterprise plans</p>
            </div>
          )}

          {view === "email-signup" && (
            <form className="mt-6 space-y-3" onSubmit={handleSignup}>
              <Field label="Full name" required>
                <Input value={suName} onChange={(e) => setSuName(e.target.value)} className="border-white/10 bg-white/5 text-white" required />
              </Field>
              <Field label="Email" required>
                <Input type="email" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} className="border-white/10 bg-white/5 text-white" required />
              </Field>
              <Field label="Password" required>
                <Input type="password" value={suPassword} onChange={(e) => setSuPassword(e.target.value)} className="border-white/10 bg-white/5 text-white" required />
              </Field>
              <Field label="Company / Agency name">
                <Input value={suCompany} onChange={(e) => setSuCompany(e.target.value)} className="border-white/10 bg-white/5 text-white" />
              </Field>
              <Field label="Role">
                <Select value={suRole} onValueChange={setSuRole}>
                  <SelectTrigger className="border-white/10 bg-white/5 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#0c1224] text-white">
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Button type="submit" className="mt-2 h-11 w-full" disabled={emailBusy}>
                {emailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create workspace
              </Button>
              <button type="button" className="w-full text-center text-sm text-sky-300/90 hover:underline" onClick={() => setView("email-login")}>
                Already have an account? Login
              </button>
              <button type="button" className="w-full text-center text-xs text-white/45 hover:text-white/70" onClick={() => setView("oauth")}>
                ← Other sign-in options
              </button>
            </form>
          )}

          {view === "email-login" && (
            <form className="mt-6 space-y-3" onSubmit={handleLogin}>
              <Field label="Email" required>
                <Input type="email" value={liEmail} onChange={(e) => setLiEmail(e.target.value)} className="border-white/10 bg-white/5 text-white" required />
              </Field>
              <Field label="Password" required>
                <Input type="password" value={liPassword} onChange={(e) => setLiPassword(e.target.value)} className="border-white/10 bg-white/5 text-white" required />
              </Field>
              <div className="flex justify-end">
                <button type="button" className="text-xs text-sky-300/90 hover:underline" onClick={() => setView("forgot")}>
                  Forgot password?
                </button>
              </div>
              <Button type="submit" className="h-11 w-full" disabled={emailBusy}>
                {emailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Login to dashboard
              </Button>
              <button type="button" className="w-full text-center text-sm text-sky-300/90 hover:underline" onClick={() => setView("email-signup")}>
                New to RealestateOS? Create account
              </button>
              <button type="button" className="w-full text-center text-xs text-white/45 hover:text-white/70" onClick={() => setView("oauth")}>
                ← Other sign-in options
              </button>
            </form>
          )}

          {view === "forgot" && (
            <form className="mt-6 space-y-3" onSubmit={handleForgot}>
              <Field label="Account email" required>
                <Input type="email" value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} className="border-white/10 bg-white/5 text-white" required />
              </Field>
              <Button type="submit" className="h-11 w-full" disabled={emailBusy}>
                {emailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Send reset link
              </Button>
              <button type="button" className="w-full text-center text-sm text-sky-300/90 hover:underline" onClick={() => setView("email-login")}>
                Back to login
              </button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-white/55">
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
    </div>
  );
}
