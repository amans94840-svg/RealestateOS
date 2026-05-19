import { createContext, useContext, useState, useMemo, useCallback, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import {
  SEED_LEADS, SEED_PROPERTIES, SEED_APPTS, SEED_ACTIVITY, SEED_NOTIFICATIONS, SEED_INSIGHTS,
  type Lead, type Property, type Appointment, type Activity, type Notification, type InsightItem,
} from "./dashboard-data";
import { getSupabase, isSupabaseConfigured } from "./supabase-client";
import { fetchUserProfile } from "./supabase-auth";
import { fetchLeads, createLead as createLeadRow, updateLeadRow, deleteLeadRow, subscribeToLeads } from "./leads-api";

type SectionKey =
  | "dashboard" | "leads" | "ai-conversations" | "properties" | "appointments"
  | "investor" | "heatmaps" | "ai-agents" | "trust" | "revenue"
  | "brokers" | "reports" | "settings" | "ai-insights" | "forecast";

type LeadFilters = {
  hot?: boolean;
  budget?: string;
  propertyType?: string;
  buyerType?: string;
  country?: string;
  city?: string;
  urgency?: string;
  source?: string;
};

type UserPermission =
  | "view_dashboard"
  | "manage_leads"
  | "manage_properties"
  | "view_reports"
  | "manage_settings"
  | "manage_team";

type UserProfile = {
  name: string;
  role: string;
  email: string;
  company: string;
  avatar: string;
  workspaceId?: string | undefined;
  permissions: UserPermission[];
};

type Ctx = {
  active: SectionKey;
  setActive: (s: SectionKey) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (b: boolean) => void;
  aiOpen: boolean;
  setAiOpen: (b: boolean) => void;
  addLeadOpen: boolean;
  setAddLeadOpen: (b: boolean) => void;

  leads: Lead[];
  addLead: (l: Lead) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;

  properties: Property[];
  toggleFavorite: (id: string) => void;
  addProperty: (p: Property) => void;
  updateProperty: (id: string, patch: Partial<Property>) => void;

  appointments: Appointment[];
  addAppointment: (a: Appointment) => void;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;

  notifications: Notification[];
  markAllRead: () => void;
  unreadCount: number;

  activity: Activity[];
  pushActivity: (text: string, icon?: string, type?: string) => void;

  insights: InsightItem[];
  updateInsight: (id: string, patch: Partial<InsightItem>) => void;

  selectedLeadId: string | null;
  setSelectedLeadId: (id: string | null) => void;

  leadFilters: LeadFilters;
  setLeadFilters: (f: LeadFilters) => void;

  totalRevenue: number;
  isAuthenticated: boolean;
  user: UserProfile;
  login: (
    payload: { email: string; name?: string; role?: string; company?: string; replace?: boolean },
    opts?: { silent?: boolean },
  ) => void;
  logout: () => void | Promise<void>;
  updateUserProfile: (patch: Partial<UserProfile>, opts?: { silent?: boolean }) => void;
  authReady: boolean;
  passwordRecovery: boolean;
  clearPasswordRecovery: () => void;
};

const DashboardContext = createContext<Ctx | null>(null);

const AUTH_KEY = "reos.auth.v1";
const USER_KEY = "reos.user.v1";
const DEFAULT_USER: UserProfile = {
  name: "Aman Singh",
  role: "Founder / Admin",
  email: "aman@realestateos.ai",
  company: "RealEstateOS",
  avatar: "AS",
  workspaceId: undefined,
  permissions: ["view_dashboard", "manage_leads", "manage_properties", "view_reports", "manage_settings", "manage_team"],
};

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U";
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<SectionKey>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>(isSupabaseConfigured() ? [] : SEED_LEADS);
  const [properties, setProperties] = useState<Property[]>(SEED_PROPERTIES);
  const [appointments, setAppointments] = useState<Appointment[]>(SEED_APPTS);
  const [notifications, setNotifications] = useState<Notification[]>(SEED_NOTIFICATIONS);
  const [activity, setActivity] = useState<Activity[]>(SEED_ACTIVITY);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadFilters, setLeadFilters] = useState<LeadFilters>({});
  const [insights, setInsights] = useState<InsightItem[]>(SEED_INSIGHTS);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [authReady, setAuthReady] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const loadLocalAuth = useCallback(() => {
    if (typeof window === "undefined") return;
    const nextAuth = window.localStorage.getItem(AUTH_KEY) === "true";
    const raw = window.localStorage.getItem(USER_KEY);
    let nextUser = DEFAULT_USER;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as UserProfile;
        nextUser = {
          ...DEFAULT_USER,
          ...parsed,
          avatar: parsed.avatar || initials(parsed.name || DEFAULT_USER.name),
        };
      } catch {
        nextUser = DEFAULT_USER;
      }
    }
    setUser(nextUser);
    setIsAuthenticated(nextAuth);
  }, []);

  const pushActivity = useCallback((text: string, icon = "activity", type = "system") => {
    setActivity(a => [{ id: Math.random().toString(36).slice(2), text, icon, type, time: Date.now() }, ...a].slice(0, 50));
  }, []);

  const addLead = useCallback((l: Lead) => {
    // Attempt to create in Supabase, fallback to local state
    (async () => {
      try {
        const sb = getSupabase();
        let created;
        if (sb) {
          const userId = (sb.auth.user?.id) || undefined;
          created = await createLeadRow(undefined, userId, {
            name: l.name,
            phone: l.phone,
            email: l.email,
            country: l.country,
            city: l.city,
            budget: l.budget,
            property_type: l.propertyType,
            buyer_type: l.buyerType,
            urgency: l.urgency,
            source: l.source,
            verified: l.verified,
            ai_score: l.aiScore,
            recommended_action: l.recommendedAction,
          });
        }
        const toInsert: Lead = {
          ...l,
          id: created?.id ?? l.id ?? `lead_${Date.now()}`,
          createdAt: created?.created_at ? Date.parse(created.created_at) : Date.now(),
        };
        setLeads((prev) => [toInsert, ...prev]);
        pushActivity(`New global lead added: ${toInsert.name} (${toInsert.country})`, "user-plus", "lead");
        toast.success("Lead added", { description: `${toInsert.name} • AI score ${toInsert.aiScore}` });
      } catch (e) {
        console.error("addLead error", e);
        // still add locally
        setLeads(prev => [l, ...prev]);
        pushActivity(`New local lead added: ${l.name}`, "user-plus", "lead");
        toast.error("Failed to persist lead to server; saved locally");
      }
    })();
  }, [pushActivity]);

  const updateLead = useCallback((id: string, patch: Partial<Lead>) => {
    (async () => {
      try {
        const sb = getSupabase();
        if (sb) {
          await updateLeadRow(id, {
            name: patch.name,
            phone: patch.phone,
            email: patch.email,
            city: patch.city,
            country: patch.country,
            budget: patch.budget,
            property_type: patch.propertyType,
            buyer_type: patch.buyerType,
            urgency: patch.urgency,
            source: patch.source,
            verified: patch.verified,
            ai_score: patch.aiScore,
            recommended_action: patch.recommendedAction,
          });
        }
        setLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
      } catch (e) {
        console.error("updateLead error", e);
        setLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
        toast.error("Failed to persist lead update");
      }
    })();
  }, []);

  // Helper: map Supabase lead row to UI Lead type (handles multiple column name variants)
  function mapLeadRow(r: any): Lead {
    return {
      id: r.id ?? r.lead_id ?? `lead_${Date.now()}`,
      name: (r.full_name ?? r.name ?? r.display_name ?? "") as string,
      phone: (r.full_phone_number ?? r.phone ?? r.phoneNumber ?? "") as string,
      email: (r.email ?? "") as string,
      country: (r.country ?? "") as string,
      city: (r.city ?? "") as string,
      budget: (r.budget ?? r.budget_range ?? "") as string,
      propertyType: (r.property_type ?? r.propertyType ?? "") as string,
      buyerType: (r.buyer_type ?? r.buyerType ?? "") as string,
      urgency: (r.urgency ?? "Medium") as string,
      source: (r.lead_source ?? r.source ?? "") as string,
      verified: Boolean(r.verified ?? r.is_verified),
      aiScore: typeof r.ai_score === "number" ? r.ai_score : typeof r.aiScore === "number" ? r.aiScore : Math.round(Math.random() * 100),
      recommendedAction: (r.recommended_action ?? r.recommendedAction ?? "") as string,
      createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
    };
  }

  // Ensure leads are fetched when workspaceId or user changes
  useEffect(() => {
    let mounted = true;
    const sb = getSupabase();
    if (!isSupabaseConfigured() || !sb) return;
    const workspaceId = user.workspaceId ?? undefined;
    const userId = (() => {
      try {
        // try reading session user id via supabase client
        // @ts-ignore
        return sb.auth.getUser ? (sb.auth.getUser() as any)?.data?.user?.id : undefined;
      } catch {
        return undefined;
      }
    })();
    if (!workspaceId) {
      console.log("[leads] workspaceId missing - show loading/empty state");
      return;
    }
    (async () => {
      try {
        console.log("[leads] fetching for workspaceId:", workspaceId, "userId:", userId);
        const fetched = await fetchLeads(workspaceId, userId);
        if (!mounted) return;
        console.log("[leads] fetched rows:", fetched.length);
        const mapped = fetched.map(mapLeadRow);
        setLeads(mapped);
      } catch (e) {
        console.error("[leads] fetch failed", e);
        toast.error("Failed to load leads from server");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user.workspaceId]);

  const deleteLead = useCallback((id: string) => {
    (async () => {
      try {
        const sb = getSupabase();
        if (sb) {
          await deleteLeadRow(id);
        }
        setLeads(prev => prev.filter(l => l.id !== id));
        pushActivity(`Lead deleted: ${id}`, "trash", "lead");
        toast.success("Lead deleted");
      } catch (e) {
        console.error("deleteLead error", e);
        toast.error("Failed to delete lead");
      }
    })();
  }, [pushActivity]);

  const toggleFavorite = useCallback((id: string) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, favorite: !p.favorite } : p));
  }, []);

  const addProperty = useCallback((p: Property) => {
    setProperties(prev => [p, ...prev]);
    pushActivity(`Property listed: ${p.title}`, "sparkles", "property");
  }, [pushActivity]);

  const updateProperty = useCallback((id: string, patch: Partial<Property>) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }, []);

  const addAppointment = useCallback((a: Appointment) => {
    setAppointments(prev => [a, ...prev]);
    pushActivity(`New appointment booked with ${a.leadName}`, "calendar", "visit");
  }, [pushActivity]);

  const updateAppointment = useCallback((id: string, patch: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  }, []);

  const updateInsight = useCallback((id: string, patch: Partial<InsightItem>) => {
    setInsights(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  const totalRevenue = useMemo(() => 12_840_000 + leads.filter(l => l.aiScore >= 90).length * 250_000, [leads]);

  const persistAuth = useCallback((next: boolean) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AUTH_KEY, String(next));
  }, []);

  const persistUser = useCallback((next: UserProfile) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(USER_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sb = getSupabase();
    if (!sb) {
      loadLocalAuth();
      setAuthReady(true);
      return;
    }

    const applyFromSupabaseUser = async (sessionUser: User, silent: boolean) => {
    // #region agent log
    fetch('http://127.0.0.1:7615/ingest/fd1a74b4-c397-45f6-9718-7b61c882f570',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'06225e'},body:JSON.stringify({sessionId:'06225e',location:'src/lib/dashboard-store.tsx:applyFromSupabaseUser',message:'applyFromSupabaseUser start',data:{userId:sessionUser?.id},timestamp:Date.now(),hypothesisId:'H2',runId:'pre-fix'})}).catch(()=>{});
    // #endregion
      const profile = await fetchUserProfile(sb, sessionUser.id);
      const meta = sessionUser.user_metadata as Record<string, string | undefined>;
      const name = profile?.full_name || meta?.full_name || sessionUser.email?.split("@")[0] || "User";
      const nextUser: UserProfile = {
        ...DEFAULT_USER,
        email: sessionUser.email || "",
        name,
        role: profile?.role || meta?.role || "Agent",
        company: profile?.company_name || meta?.company || "",
        workspaceId: profile?.workspace_id ?? (meta?.workspace_id as string | undefined) ?? undefined,
        avatar: initials(name),
      };
      // If workspaceId missing, attempt to discover via workspace_members table
      try {
        if (!nextUser.workspaceId) {
          const { data: wmRow, error: wmErr } = await sb.from("workspace_members").select("workspace_id").eq("user_id", sessionUser.id).maybeSingle();
          if (wmErr) {
            console.warn("workspace_members lookup error", wmErr);
          } else if (wmRow?.workspace_id) {
            nextUser.workspaceId = wmRow.workspace_id;
            // Log discovery
            console.log("[workspace] discovered via workspace_members:", nextUser.workspaceId);
          }
        }
      } catch (e) {
        console.warn("workspace_members lookup failed", e);
      }
      setUser(nextUser);
      setIsAuthenticated(true);
      persistUser(nextUser);
      persistAuth(true);
      if (!silent) {
        pushActivity(`User signed in: ${nextUser.name}`, "user-check", "auth");
        toast.success("Logged in", { description: `Welcome, ${nextUser.name}` });
      }
      // Fetch leads for workspace when user signs in
      try {
        const workspaceId = nextUser.workspaceId ?? (nextUser.company && /^[0-9a-fA-F-]{36}$/.test(nextUser.company) ? nextUser.company : undefined);
        console.log("[leads] userId:", sessionUser.id, "profile.workspace_id:", profile?.workspace_id, "resolvedWorkspaceId:", workspaceId);
        const fetchedLeads = await fetchLeads(workspaceId, sessionUser.id);
        console.log("[leads] fetched count:", (fetchedLeads || []).length);
        // #region agent log
        fetch('http://127.0.0.1:7615/ingest/fd1a74b4-c397-45f6-9718-7b61c882f570',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'06225e'},body:JSON.stringify({sessionId:'06225e',location:'src/lib/dashboard-store.tsx:applyFromSupabaseUser',message:'fetchedLeads',data:{count:(fetchedLeads||[]).length},timestamp:Date.now(),hypothesisId:'H3',runId:'pre-fix'})}).catch(()=>{});
        // #endregion
        if (fetchedLeads && fetchedLeads.length) {
          // Map to Lead type used in store
          setLeads(
            fetchedLeads.map((r) => ({
              id: r.id,
              name: r.name,
              phone: r.phone ?? "",
              email: r.email ?? "",
              country: r.country ?? "",
              city: r.city ?? "",
              budget: r.budget ?? "",
              propertyType: (r.property_type as string) ?? "",
              buyerType: (r.buyer_type as string) ?? "",
              urgency: (r.urgency as string) ?? "Medium",
              source: r.source ?? "",
              verified: Boolean(r.verified),
              aiScore: typeof r.ai_score === "number" ? r.ai_score : Math.round(Math.random() * 100),
              recommendedAction: r.recommended_action ?? "",
              createdAt: r.created_at ? Date.parse(r.created_at) : Date.now(),
            })),
          );
        }
      } catch (e) {
        console.warn("fetchLeads on sign in failed", e);
      }
    };

    // Try to load current session user immediately (handles cases where onAuthStateChange doesn't emit)
    (async () => {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7615/ingest/fd1a74b4-c397-45f6-9718-7b61c882f570',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'06225e'},body:JSON.stringify({sessionId:'06225e',location:'src/lib/dashboard-store.tsx:getUser',message:'attempting getUser',data:{},timestamp:Date.now(),hypothesisId:'H5',runId:'pre-fix'})}).catch(()=>{});
        // #endregion
        // @ts-ignore - supabase client typing may vary
        const gm = await sb.auth.getUser();
        // gm may be { data: { user } }
        const sessionUser = gm?.data?.user ?? gm?.user ?? null;
        // #region agent log
        fetch('http://127.0.0.1:7615/ingest/fd1a74b4-c397-45f6-9718-7b61c882f570',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'06225e'},body:JSON.stringify({sessionId:'06225e',location:'src/lib/dashboard-store.tsx:getUser',message:'getUser result',data:{hasUser:!!sessionUser, userId:sessionUser?.id},timestamp:Date.now(),hypothesisId:'H6',runId:'pre-fix'})}).catch(()=>{});
        // #endregion
        if (sessionUser) {
          await applyFromSupabaseUser(sessionUser as User, true);
        }
      } catch (e) {
        console.warn("sb.auth.getUser failed", e);
      }
    })();

    const { data } = sb.auth.onAuthStateChange((event, session) => {
      void (async () => {
        if (event === "INITIAL_SESSION") {
          if (session?.user) {
            await applyFromSupabaseUser(session.user, true);
          } else {
            loadLocalAuth();
          }
          setAuthReady(true);
          return;
        }
        if (event === "SIGNED_IN" && session?.user) {
          await applyFromSupabaseUser(session.user, false);
          return;
        }
        if (event === "PASSWORD_RECOVERY") {
          setPasswordRecovery(true);
          setAuthReady(true);
          return;
        }
        if (event === "SIGNED_OUT") {
          setIsAuthenticated(false);
          persistAuth(false);
          setUser(DEFAULT_USER);
          persistUser(DEFAULT_USER);
          setPasswordRecovery(false);
        }
      })();
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, [loadLocalAuth, persistAuth, persistUser, pushActivity]);

  // Realtime subscription for leads when Supabase is available and user authenticated.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !isSupabaseConfigured()) return;
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const workspaceId = user.workspaceId ?? undefined;
        unsub = subscribeToLeads(workspaceId, (payload) => {
          // #region agent log
          fetch('http://127.0.0.1:7615/ingest/fd1a74b4-c397-45f6-9718-7b61c882f570',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'06225e'},body:JSON.stringify({sessionId:'06225e',location:'src/lib/dashboard-store.tsx:subscribeToLeads.callback',message:'realtime lead payload',data:{event:payload.event, id:payload.new?.id ?? payload.old?.id},timestamp:Date.now(),hypothesisId:'H4',runId:'pre-fix'})}).catch(()=>{});
          // #endregion
          if (payload.event === "INSERT" && payload.new) {
            setLeads((prev) => [{ 
              id: payload.new!.id,
              name: payload.new!.name,
              phone: payload.new!.phone ?? "",
              email: payload.new!.email ?? "",
              country: payload.new!.country ?? "",
              city: payload.new!.city ?? "",
              budget: payload.new!.budget ?? "",
              propertyType: (payload.new!.property_type as string) ?? "",
              buyerType: (payload.new!.buyer_type as string) ?? "",
              urgency: (payload.new!.urgency as string) ?? "Medium",
              source: payload.new!.source ?? "",
              verified: Boolean(payload.new!.verified),
              aiScore: typeof payload.new!.ai_score === "number" ? payload.new!.ai_score : Math.round(Math.random() * 100),
              recommendedAction: payload.new!.recommended_action ?? "",
              createdAt: payload.new!.created_at ? Date.parse(payload.new!.created_at) : Date.now(),
            }, ...prev]);
          } else if ((payload.event === "UPDATE" || payload.event === "REPLACE") && payload.new) {
            setLeads((prev) => prev.map(l => l.id === payload.new!.id ? { ...l, name: payload.new!.name ?? l.name, phone: payload.new!.phone ?? l.phone, email: payload.new!.email ?? l.email, country: payload.new!.country ?? l.country, city: payload.new!.city ?? l.city, budget: payload.new!.budget ?? l.budget, propertyType: (payload.new!.property_type as string) ?? l.propertyType, buyerType: (payload.new!.buyer_type as string) ?? l.buyerType, urgency: (payload.new!.urgency as string) ?? l.urgency, source: payload.new!.source ?? l.source, verified: Boolean(payload.new!.verified), aiScore: typeof payload.new!.ai_score === "number" ? payload.new!.ai_score : l.aiScore, recommendedAction: payload.new!.recommended_action ?? l.recommendedAction } : l));
          } else if (payload.event === "DELETE" && payload.old) {
            setLeads((prev) => prev.filter(l => l.id !== payload.old!.id));
          }
        });
      } catch (e) {
        console.warn("subscribeToLeads failed", e);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, [user.company]);

  const login = useCallback(
    (
      payload: { email: string; name?: string; role?: string; company?: string; replace?: boolean },
      opts?: { silent?: boolean },
    ) => {
      setUser((prev) => {
        const base = payload.replace ? DEFAULT_USER : prev;
        const name = payload.name?.trim() || base.name;
        const nextUser: UserProfile = {
          ...base,
          email: payload.email,
          name,
          role: payload.role?.trim() || base.role,
          company: payload.company?.trim() || base.company,
          avatar: initials(name),
        };
        persistUser(nextUser);
        return nextUser;
      });
      setIsAuthenticated(true);
      persistAuth(true);
      if (!opts?.silent) {
        pushActivity(`User signed in: ${payload.email}`, "user-check", "auth");
        toast.success("Logged in", { description: "Welcome to RealEstateOS" });
      }
    },
    [persistAuth, persistUser, pushActivity],
  );

  const logout = useCallback(async () => {
    const sb = getSupabase();
    if (sb) {
      await sb.auth.signOut();
    }
    setIsAuthenticated(false);
    persistAuth(false);
    setUser(DEFAULT_USER);
    persistUser(DEFAULT_USER);
    pushActivity("User signed out", "log-out", "auth");
    toast("Logged out", { description: "Session ended." });
  }, [persistAuth, persistUser, pushActivity]);

  const clearPasswordRecovery = useCallback(() => setPasswordRecovery(false), []);

  const updateUserProfile = useCallback((patch: Partial<UserProfile>, opts?: { silent?: boolean }) => {
    setUser((prev) => {
      const next: UserProfile = {
        ...prev,
        ...patch,
        avatar: patch.avatar ?? initials(patch.name ?? prev.name),
      };
      if (!opts?.silent) {
        if (next.name !== prev.name) {
          pushActivity(`Profile name updated: ${prev.name} → ${next.name}`, "user", "profile");
        }
        if (next.role !== prev.role) {
          pushActivity(`Profile role updated: ${prev.role} → ${next.role}`, "shield-check", "profile");
        }
        toast.success("Profile updated");
      }
      persistUser(next);
      return next;
    });
  }, [persistUser, pushActivity]);

  const value: Ctx = {
    active, setActive, sidebarOpen, setSidebarOpen, aiOpen, setAiOpen, addLeadOpen, setAddLeadOpen,
    leads, addLead, updateLead,
    properties, toggleFavorite, addProperty, updateProperty,
    appointments, addAppointment, updateAppointment,
    notifications, markAllRead, unreadCount, activity, pushActivity,
    insights, updateInsight,
    selectedLeadId, setSelectedLeadId, leadFilters, setLeadFilters, totalRevenue,
    isAuthenticated, user, login, logout, updateUserProfile, authReady,
    passwordRecovery, clearPasswordRecovery,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const v = useContext(DashboardContext);
  if (!v) throw new Error("useDashboard outside provider");
  return v;
}

export type { SectionKey, LeadFilters, UserPermission };
