import { useState, useMemo } from "react";
import { useDashboard } from "@/lib/dashboard-store";
import { useBillingOptional } from "@/lib/billing-store";
import {
  Bell,
  Search,
  Bot,
  ChevronDown,
  LogOut,
  User,
  CreditCard,
  Settings as SettingsIcon,
  X,
  Edit,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function TopNav() {
  const {
    setAiOpen,
    notifications,
    markAllRead,
    unreadCount,
    leads,
    properties,
    appointments,
    setActive,
    setSelectedLeadId,
    user,
    logout,
    updateUserProfile,
  } = useDashboard();
  const billing = useBillingOptional();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [draft, setDraft] = useState({
    name: user.name,
    role: user.role,
    email: user.email,
    company: user.company,
    avatar: user.avatar,
  });

  const results = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return {
      leads: leads
        .filter(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            l.phone.includes(q) ||
            l.city.toLowerCase().includes(q),
        )
        .slice(0, 4),
      properties: properties
        .filter((p) => p.title.toLowerCase().includes(q) || p.city.toLowerCase().includes(q))
        .slice(0, 4),
      appointments: appointments
        .filter((a) => a.leadName.toLowerCase().includes(q) || a.property.toLowerCase().includes(q))
        .slice(0, 3),
    };
  }, [search, leads, properties, appointments]);

  const totalResults = results
    ? results.leads.length + results.properties.length + results.appointments.length
    : 0;

  const openProfileEditor = () => {
    setDraft({
      name: user.name,
      role: user.role,
      email: user.email,
      company: user.company,
      avatar: user.avatar,
    });
    setProfileOpen(true);
  };

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-border/60 glass-strong flex items-center px-4 md:px-6 gap-3">
      <Popover open={searchOpen && !!search.trim()} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search leads, properties, brokers, conversations…"
              className="pl-9 pr-9 bg-input/40 border-border/60 focus-visible:ring-primary/40 h-10"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(36rem,90vw)] p-0 glass-strong border-border/60 max-h-[60vh] overflow-y-auto scrollbar-thin"
        >
          {totalResults === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No results found for "{search}"
            </div>
          ) : (
            <div className="p-2">
              {results!.leads.length > 0 && (
                <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Leads
                </div>
              )}
              {results!.leads.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setSelectedLeadId(l.id);
                    setActive("leads");
                    setSearchOpen(false);
                    setSearch("");
                  }}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-accent flex items-center gap-3"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/20 text-xs">
                      {l.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{l.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {l.city} • {l.budget}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    AI {l.aiScore}
                  </Badge>
                </button>
              ))}
              {results!.properties.length > 0 && (
                <div className="px-2 pt-3 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Properties
                </div>
              )}
              {results!.properties.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActive("properties");
                    setSearchOpen(false);
                    setSearch("");
                  }}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-accent flex items-center gap-3"
                >
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-base">
                    {p.image}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{p.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.city}, {p.country}
                    </div>
                  </div>
                  <span className="text-xs">{p.price}</span>
                </button>
              ))}
              {results!.appointments.length > 0 && (
                <div className="px-2 pt-3 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Appointments
                </div>
              )}
              {results!.appointments.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setActive("appointments");
                    setSearchOpen(false);
                    setSearch("");
                  }}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-accent"
                >
                  <div className="text-sm">
                    {a.leadName} → {a.property}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.date} • {a.time}
                  </div>
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Button
        onClick={() => setAiOpen(true)}
        variant="outline"
        className="hidden md:inline-flex border-primary/40 hover:border-primary hover:bg-primary/10 text-foreground"
      >
        <Bot className="h-4 w-4 text-primary" />{" "}
        <span className="hidden lg:inline">AI Assistant</span>
      </Button>

      <Badge
        variant="outline"
        className="hidden lg:inline-flex border-[oklch(0.82_0.2_150_/_0.5)] bg-[oklch(0.82_0.2_150_/_0.1)] text-[oklch(0.82_0.2_150)] gap-1.5"
      >
        <span className="pulse-dot" /> AI Systems Active
      </Badge>

      {billing && (
        <button
          type="button"
          onClick={() => setActive("settings")}
          className="hidden xl:inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-input/30 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          <CreditCard className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-medium text-foreground">{billing.subscription.plan}</span>
          <span className="text-muted-foreground">·</span>
          <span>
            {billing.usedSeats}/{billing.maxSeats} seats
          </span>
          {billing.paymentSyncStatus === "syncing" && (
            <span className="text-primary animate-pulse">sync…</span>
          )}
        </button>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <button
            className="relative p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] flex items-center justify-center font-medium">
                {unreadCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0 glass-strong border-border/60">
          <div className="flex items-center justify-between p-3 border-b border-border/60">
            <span className="text-sm font-medium">Notifications</span>
            <button onClick={markAllRead} className="text-xs text-primary hover:underline">
              Mark all as read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (n.section) setActive(n.section as never);
                }}
                className={cn(
                  "w-full text-left p-3 border-b border-border/40 hover:bg-accent transition-colors flex gap-3",
                  !n.read && "bg-primary/5",
                )}
              >
                <div
                  className={cn(
                    "h-2 w-2 rounded-full mt-1.5 shrink-0",
                    !n.read ? "bg-primary shadow-[0_0_8px_var(--neon)]" : "bg-muted",
                  )}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{n.desc}</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">{n.time}</div>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-accent transition-colors">
            <Avatar className="h-8 w-8 ring-2 ring-primary/40">
              <AvatarFallback className="bg-gradient-to-br from-primary/40 to-[oklch(0.7_0.25_300_/_0.4)] text-xs font-semibold">
                {user.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium leading-tight">{user.name}</div>
              <div className="text-[10px] text-muted-foreground">{user.role}</div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 glass-strong border-border/60">
          <DropdownMenuLabel>
            <div className="font-medium">{user.name}</div>
            <div className="text-xs text-muted-foreground font-normal">{user.role}</div>
            <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
              {user.company}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={openProfileEditor}>
            <Edit className="h-4 w-4" /> Edit Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActive("settings")}>
            <User className="h-4 w-4" /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActive("settings")}>
            <SettingsIcon className="h-4 w-4" /> Account Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActive("settings")}>
            <CreditCard className="h-4 w-4" /> Billing
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>
            <LogOut className="h-4 w-4" /> Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={draft.name}
              onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))}
              placeholder="Name"
              className="bg-input/40"
            />
            <Input
              value={draft.role}
              onChange={(e) => setDraft((v) => ({ ...v, role: e.target.value }))}
              placeholder="Role"
              className="bg-input/40"
            />
            <Input
              value={draft.email}
              onChange={(e) => setDraft((v) => ({ ...v, email: e.target.value }))}
              placeholder="Email"
              className="bg-input/40"
            />
            <Input
              value={draft.company}
              onChange={(e) => setDraft((v) => ({ ...v, company: e.target.value }))}
              placeholder="Company"
              className="bg-input/40"
            />
            <Input
              value={draft.avatar}
              onChange={(e) =>
                setDraft((v) => ({ ...v, avatar: e.target.value.slice(0, 2).toUpperCase() }))
              }
              placeholder="Avatar initials"
              className="bg-input/40"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={() => setProfileOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!draft.email.includes("@")) {
                    toast.error("Invalid email");
                    return;
                  }
                  updateUserProfile(draft);
                  setProfileOpen(false);
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
          <div className="pt-2 border-t border-border/40">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              Permissions
            </div>
            <div className="flex flex-wrap gap-1.5">
              {user.permissions.map((p) => (
                <Badge key={p} variant="outline" className="text-[10px]">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
