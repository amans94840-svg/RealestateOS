import { createContext, useContext, useState, useMemo, useCallback, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import {
  SEED_LEADS, SEED_PROPERTIES, SEED_APPTS, SEED_ACTIVITY, SEED_NOTIFICATIONS, SEED_INSIGHTS,
  type Lead, type Property, type Appointment, type Activity, type Notification, type InsightItem,
} from "./dashboard-data";
import { getSupabase } from "./supabase-client";
import { fetchUserProfile } from "./supabase-auth";

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
  const [leads, setLeads] = useState<Lead[]>(SEED_LEADS);
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
    setLeads(prev => [l, ...prev]);
    pushActivity(`New global lead added: ${l.name} (${l.country})`, "user-plus", "lead");
    toast.success("Lead added", { description: `${l.name} • AI score ${l.aiScore}` });
  }, [pushActivity]);

  const updateLead = useCallback((id: string, patch: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }, []);

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
    pushActivity(`Site visit booked: ${a.leadName}`, "calendar", "visit");
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
      const profile = await fetchUserProfile(sb, sessionUser.id);
      const meta = sessionUser.user_metadata as Record<string, string | undefined>;
      const name = profile?.full_name || meta?.full_name || sessionUser.email?.split("@")[0] || "User";
      const nextUser: UserProfile = {
        ...DEFAULT_USER,
        email: sessionUser.email || "",
        name,
        role: profile?.role || meta?.role || "Agent",
        company: profile?.company_name || meta?.company || "",
        avatar: initials(name),
      };
      setUser(nextUser);
      setIsAuthenticated(true);
      persistUser(nextUser);
      persistAuth(true);
      if (!silent) {
        pushActivity(`User signed in: ${nextUser.name}`, "user-check", "auth");
        toast.success("Logged in", { description: `Welcome, ${nextUser.name}` });
      }
    };

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
