import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Github, Loader2, X, Eye, EyeOff, ShieldCheck, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isSupabaseConfigured, getSupabase } from "@/lib/supabase-client";
import {
  sendPasswordResetEmail,
  signInWithEmailPassword,
  signInWithOAuthProvider,
  signUpWithEmail,
} from "@/lib/supabase-auth";

const TERMS = `Terms of Service — RealEstateOS (summary)\n\nBy creating an account you agree to use RealEstateOS in compliance with applicable laws. You are responsible for activity under your credentials. We may update these terms; continued use constitutes acceptance.\n\nFor production deployments, replace this placeholder with counsel-reviewed legal text and host a dedicated Terms page.`;

const PRIVACY = `Privacy Policy — RealEstateOS (summary)\n\nWe process account and usage data to operate the service, improve reliability, and secure your workspace. OAuth providers share profile basics according to their policies.\n\nConfigure Supabase Row Level Security for the profiles table. Replace this placeholder with a full privacy policy before public launch.`;

export type AuthView = "login" | "signup" | "forgot" | "update-password" | "terms" | "privacy";

const ROLE_OPTIONS = ["Agent", "Broker", "Agency Owner", "Admin"] as const;

function GoogleGlyph() {
  return (
    <svg className="mr-2 h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.25 1.3-1 2.4-2.1 3.1l3.4 2.6c2-1.8 3.1-4.5 3.1-7.7 0-.75-.07-1.45-.2-2.1H12z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.4-2.6c-.9.6-2.1 1-3.3 1-2.5 0-4.7-1.7-5.5-4H5.1v2.6C6.8 20.3 9.2 22 12 22z" />
      <path fill="#4A90E2" d="M6.5 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V7.5H5.1C4.4 8.9 4 10.4 4 12s.4 3.1 1.1 4.5l1.4-1.1z" />
      <path fill="#FBBC05" d="M12 5.4c1.4 0 2.6.5 3.6 1.4l2.7-2.7C16.9 2.9 14.7 2 12 2 9.2 2 6.8 3.7 5.1 6.5l3.4 2.6c.8-2.3 3-4 5.5-4z" />
    </svg>
  );
}

function PasswordInput({ value, onChange, placeholder, className }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/70"
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function AuthGetStartedModal({
  open,
  onOpenChange,
  initialView = "login",
  onDemoSignup,
  onDemoLogin,
  onPasswordUpdated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialView?: AuthView;
  onDemoSignup?: (p: { email: string; name: string; role: string; company: string }) => void;
  onDemoLogin?: (p: { email: string; name: string; role: string; company: string }) => void;
  onPasswordUpdated?: () => void;
}) {
  const [view, setView] = useState<AuthView>(initialView);
  const [oauthBusy, setOauthBusy] = useState<null | "google" | "github">(null);
  const [emailBusy, setEmailBusy] = useState(false);

  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suCompany, setSuCompany] = useState("");
  const [suRole, setSuRole] = useState<string>(ROLE_OPTIONS[0]);

  const [liEmail, setLiEmail] = useState("");
  const [liPassword, setLiPassword] = useState("");

  const [fpEmail, setFpEmail] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (open) setView(initialView);
  }, [open, initialView]);

  const resetForms = () => {
    setSuName(""); setSuEmail(""); setSuPassword(""); setSuCompany(""); setSuRole(ROLE_OPTIONS[0]);
    setLiEmail(""); setLiPassword("");
    setFpEmail("");
    setNewPassword(""); setConfirmPassword("");
  };

  const handleClose = (v: boolean) => {
    if (!v) { setView("login"); resetForms(); }
    onOpenChange(v);
  };

  const requireConfigured = () => {
    if (!isSupabaseConfigured()) {
      toast.error("Supabase not configured", {
        description: "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.",
      });
      return false;
    }
    return true;
  };

  const oauth = async (provider: "google" | "github") => {
    if (!requireConfigured()) return;
    setOauthBusy(provider);
    try {
      await signInWithOAuthProvider(provider);
    } catch (e) {
      toast.error("OAuth sign-in failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setOauthBusy(null);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const minPw = isSupabaseConfigured() ? 8 : 6;
    if (!suEmail.includes("@") || suPassword.length < minPw) {
      toast.error(`Use a valid email and password (${minPw}+ characters).`);
      return;
    }
    if (!isSupabaseConfigured()) {
      onDemoSignup?.({ email: suEmail, name: suName || suEmail.split("@")[0]!, role: suRole, company: suCompany || "Independent" });
      handleClose(false);
      return;
    }
    setEmailBusy(true);
    try {
      const data = await signUpWithEmail({ email: suEmail, password: suPassword, fullName: suName || suEmail.split("@")[0]!, company: suCompany, role: suRole });
      if (data.session) {
        toast.success("Workspace created", { description: "Welcome to RealEstateOS." });
        handleClose(false);
      } else {
        toast.success("Check your inbox", { description: "Click the confirmation link to activate your account." });
      }
    } catch (err) {
      toast.error("Could not create account", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setEmailBusy(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liEmail.includes("@")) { toast.error("Enter a valid email"); return; }
    if (!isSupabaseConfigured()) {
      onDemoLogin?.({ email: liEmail, name: liEmail.split("@")[0]!, role: "Agent", company: "" });
      handleClose(false);
      return;
    }
    setEmailBusy(true);
    try {
      await signInWithEmailPassword(liEmail, liPassword);
      toast.success("Access granted", { description: "Welcome back to RealEstateOS." });
      handleClose(false);
    } catch (err) {
      toast.error("Authentication failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setEmailBusy(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpEmail.includes("@")) { toast.error("Enter a valid email address"); return; }
    if (!requireConfigured()) return;
    setEmailBusy(true);
    try {
      await sendPasswordResetEmail(fpEmail);
      toast.success("Recovery link sent", { description: "Check your inbox for password reset instructions." });
      setView("login");
    } catch (err) {
      toast.error("Could not send reset email", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setEmailBusy(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    const sb = getSupabase();
    if (!sb) { toast.error("Supabase not configured"); return; }
    setEmailBusy(true);
    try {
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated", { description: "You can now sign in with your new password." });
      onPasswordUpdated?.();
      handleClose(false);
    } catch (err) {
      toast.error("Could not update password", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setEmailBusy(false);
    }
  };

  const VIEW_TITLES: Record<AuthView, string> = {
    login: "SIGN IN",
    signup: "CREATE WORKSPACE",
    forgot: "RESET PASSWORD",
    "update-password": "SET NEW PASSWORD",
    terms: "TERMS OF SERVICE",
    privacy: "PRIVACY POLICY",
  };

  const title = VIEW_TITLES[view];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[min(94vh,700px)] w-[min(100%,440px)] overflow-hidden border-0 bg-transparent p-0 shadow-none [&>button]:hidden">
        <div
          className="relative flex max-h-[min(94vh,700px)] flex-col overflow-hidden rounded-2xl border sm:rounded-3xl"
          style={{
            background: "linear-gradient(145deg, #07091a 0%, #0b0d22 50%, #07091a 100%)",
            borderColor: "rgba(139,92,246,0.25)",
            boxShadow: "0 0 0 1px rgba(139,92,246,0.08), 0 30px 80px -20px rgba(6,182,212,0.15), 0 0 60px -30px rgba(139,92,246,0.25)",
          }}
        >
          {/* Scanline overlay */}
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-[0.025]"
            style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)", backgroundSize: "100% 3px" }}
          />
          {/* Top accent bar */}
          <div className="relative z-10 h-[2px] w-full bg-gradient-to-r from-transparent via-violet-500/80 to-transparent" />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400/90" />
              <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-cyan-400/80">RealEstateOS</span>
            </div>
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-7 pt-2">
            {view !== "terms" && view !== "privacy" && (
              <DialogHeader className="mb-5 text-left">
                <div className="text-[10px] uppercase tracking-[0.3em] text-violet-400/70">
                  {view === "login" && "Authentication"}
                  {view === "signup" && "Registration"}
                  {view === "forgot" && "Recovery"}
                  {view === "update-password" && "Security"}
                </div>
                <DialogTitle className="mt-1 text-2xl font-bold tracking-tight text-white">{title}</DialogTitle>
                {view === "login" && <p className="mt-0.5 text-xs text-white/45">Access your AI-powered real estate command center</p>}
                {view === "signup" && <p className="mt-0.5 text-xs text-white/45">Set up your free RealEstateOS workspace</p>}
                {view === "forgot" && <p className="mt-0.5 text-xs text-white/45">We'll send a recovery link to your email</p>}
                {view === "update-password" && <p className="mt-0.5 text-xs text-white/45">Choose a strong new password for your account</p>}
              </DialogHeader>
            )}

            {/* ── Terms / Privacy ── */}
            {(view === "terms" || view === "privacy") && (
              <div>
                <DialogHeader className="mb-4 text-left">
                  <DialogTitle className="text-xl font-bold text-white">{title}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[min(50vh,380px)] rounded-xl border border-white/8 bg-black/30 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/60">{view === "terms" ? TERMS : PRIVACY}</p>
                </ScrollArea>
                <CyberButton variant="outline" className="mt-4 w-full" onClick={() => setView("login")}>
                  ← Back
                </CyberButton>
              </div>
            )}

            {/* ── Login ── */}
            {view === "login" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <CyberButton variant="oauth" disabled={oauthBusy !== null} onClick={() => void oauth("google")}>
                    {oauthBusy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleGlyph />}
                    Continue with Google
                  </CyberButton>
                  <CyberButton variant="oauth" disabled={oauthBusy !== null} onClick={() => void oauth("github")}>
                    {oauthBusy === "github" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
                    Continue with GitHub
                  </CyberButton>
                </div>

                <CyberDivider />

                <form onSubmit={handleLogin} className="space-y-3">
                  <CyberField label="EMAIL">
                    <CyberInput type="email" value={liEmail} onChange={(e) => setLiEmail(e.target.value)} placeholder="you@example.com" required />
                  </CyberField>
                  <CyberField label="PASSWORD">
                    <PasswordInput
                      value={liPassword}
                      onChange={setLiPassword}
                      placeholder="••••••••"
                      className="h-11 border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus-visible:border-cyan-500/50 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                    />
                  </CyberField>
                  <div className="flex justify-end">
                    <button type="button" className="text-[11px] text-cyan-400/80 transition hover:text-cyan-300" onClick={() => setView("forgot")}>
                      Forgot password?
                    </button>
                  </div>
                  <CyberButton type="submit" variant="primary" className="w-full" disabled={emailBusy}>
                    {emailBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Enter System
                  </CyberButton>
                </form>

                <p className="text-center text-[12px] text-white/40">
                  No account?{" "}
                  <button type="button" className="text-violet-400/90 transition hover:text-violet-300" onClick={() => setView("signup")}>
                    Create workspace →
                  </button>
                </p>
                <p className="text-center text-[10px] text-white/25">
                  By continuing you agree to our{" "}
                  <button type="button" className="text-white/40 underline-offset-2 hover:underline hover:text-white/60" onClick={() => setView("terms")}>Terms</button>
                  {" "}and{" "}
                  <button type="button" className="text-white/40 underline-offset-2 hover:underline hover:text-white/60" onClick={() => setView("privacy")}>Privacy Policy</button>
                </p>
              </div>
            )}

            {/* ── Sign Up ── */}
            {view === "signup" && (
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="space-y-2">
                  <CyberButton variant="oauth" disabled={oauthBusy !== null} onClick={() => void oauth("google")}>
                    {oauthBusy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleGlyph />}
                    Continue with Google
                  </CyberButton>
                  <CyberButton variant="oauth" disabled={oauthBusy !== null} onClick={() => void oauth("github")}>
                    {oauthBusy === "github" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
                    Continue with GitHub
                  </CyberButton>
                </div>
                <CyberDivider />
                <CyberField label="FULL NAME">
                  <CyberInput value={suName} onChange={(e) => setSuName(e.target.value)} placeholder="Your name" />
                </CyberField>
                <CyberField label="EMAIL" required>
                  <CyberInput type="email" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} placeholder="you@example.com" required />
                </CyberField>
                <CyberField label="PASSWORD" required>
                  <PasswordInput
                    value={suPassword}
                    onChange={setSuPassword}
                    placeholder="8+ characters"
                    className="h-11 border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus-visible:border-cyan-500/50 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                  />
                </CyberField>
                <CyberField label="COMPANY / AGENCY">
                  <CyberInput value={suCompany} onChange={(e) => setSuCompany(e.target.value)} placeholder="Optional" />
                </CyberField>
                <CyberField label="ROLE">
                  <Select value={suRole} onValueChange={setSuRole}>
                    <SelectTrigger className="h-11 border-white/10 bg-white/[0.04] text-white focus:ring-0 focus:ring-offset-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#0c1224] text-white">
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CyberField>
                <CyberButton type="submit" variant="primary" className="w-full" disabled={emailBusy}>
                  {emailBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                  Initialize Workspace
                </CyberButton>
                <p className="text-center text-[12px] text-white/40">
                  Already have an account?{" "}
                  <button type="button" className="text-violet-400/90 transition hover:text-violet-300" onClick={() => setView("login")}>
                    Sign in →
                  </button>
                </p>
              </form>
            )}

            {/* ── Forgot Password ── */}
            {view === "forgot" && (
              <form onSubmit={handleForgot} className="space-y-4">
                <CyberField label="ACCOUNT EMAIL" required>
                  <CyberInput type="email" value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} placeholder="you@example.com" required />
                </CyberField>
                <CyberButton type="submit" variant="primary" className="w-full" disabled={emailBusy}>
                  {emailBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send Recovery Link
                </CyberButton>
                <p className="text-center text-[12px] text-white/40">
                  Remembered it?{" "}
                  <button type="button" className="text-violet-400/90 transition hover:text-violet-300" onClick={() => setView("login")}>
                    Back to login →
                  </button>
                </p>
              </form>
            )}

            {/* ── Update Password (after reset email) ── */}
            {view === "update-password" && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.05] px-4 py-3">
                  <p className="text-xs text-cyan-300/80">
                    Your identity has been verified. Choose a new secure password for your account.
                  </p>
                </div>
                <CyberField label="NEW PASSWORD" required>
                  <PasswordInput
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="8+ characters"
                    className="h-11 border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus-visible:border-cyan-500/50 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                  />
                </CyberField>
                <CyberField label="CONFIRM PASSWORD" required>
                  <PasswordInput
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Repeat password"
                    className="h-11 border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 focus-visible:border-cyan-500/50 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                  />
                </CyberField>
                <CyberButton type="submit" variant="primary" className="w-full" disabled={emailBusy}>
                  {emailBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Update Password
                </CyberButton>
              </form>
            )}
          </div>

          {/* Bottom accent bar */}
          <div className="relative z-10 h-[1px] w-full bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Internal UI primitives ───────────────────────────────── */

function CyberField({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
        {label}{required ? <span className="ml-0.5 text-violet-400/70">*</span> : ""}
      </Label>
      {children}
    </div>
  );
}

function CyberInput({ className = "", ...props }: React.ComponentProps<typeof Input>) {
  return (
    <Input
      className={`h-11 border-white/10 bg-white/[0.04] text-white placeholder:text-white/25 transition focus-visible:border-cyan-500/50 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_12px_rgba(6,182,212,0.2)] ${className}`}
      {...props}
    />
  );
}

function CyberDivider() {
  return (
    <div className="relative flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-white/8" />
      <span className="text-[10px] uppercase tracking-[0.25em] text-white/30">or</span>
      <div className="h-px flex-1 bg-white/8" />
    </div>
  );
}

function CyberButton({
  variant = "default",
  className = "",
  children,
  type = "button",
  disabled,
  onClick,
}: {
  variant?: "primary" | "oauth" | "outline" | "default";
  className?: string;
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const base = "relative inline-flex h-11 items-center justify-center gap-1 rounded-xl px-5 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";

  if (variant === "primary") {
    return (
      <button
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={`${base} bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:opacity-90 ${className}`}
      >
        {children}
      </button>
    );
  }
  if (variant === "oauth") {
    return (
      <button
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={`${base} w-full border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:border-white/20 ${className}`}
      >
        {children}
      </button>
    );
  }
  if (variant === "outline") {
    return (
      <button
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={`${base} border border-white/15 bg-transparent text-white/70 hover:bg-white/5 hover:text-white ${className}`}
      >
        {children}
      </button>
    );
  }
  return (
    <Button type={type} disabled={disabled} onClick={onClick} className={className}>
      {children}
    </Button>
  );
}
