import { createFileRoute } from "@tanstack/react-router";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-store";
import { BillingProvider } from "@/lib/billing-store";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { AIDrawer } from "@/components/dashboard/AIDrawer";
import { AddLeadModal } from "@/components/dashboard/AddLeadModal";
import { LeadDetailModal } from "@/components/dashboard/LeadDetailModal";
import { DashboardSection } from "@/components/dashboard/sections/DashboardSection";
import { LeadsSection } from "@/components/dashboard/sections/LeadsSection";
import {
  AIConversationsSection,
  PropertiesSection,
  AppointmentsSection,
  AIAgentsSection,
  TrustSection,
  RevenueSection,
  BrokersSection,
  InvestorSection,
  HeatmapsSection,
  ReportsSection,
  SettingsSection,
  AIInsightsSection,
  ForecastSection,
} from "@/components/dashboard/sections/AllSections";
import { Toaster } from "@/components/ui/sonner";
import { GlowCard } from "@/components/dashboard/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RealEstateOS — AI Real Estate Command Center" },
      {
        name: "description",
        content:
          "Futuristic AI-powered operating system for brokers, agencies, and global investors.",
      },
    ],
  }),
  component: () => (
    <DashboardProvider>
      <BillingProvider>
        <Shell />
      </BillingProvider>
    </DashboardProvider>
  ),
});

function Shell() {
  const { active, isAuthenticated, login, authReady } = useDashboard();
  const [email, setEmail] = useState("aman@realestateos.ai");
  const [name, setName] = useState("Aman Singh");
  const [role, setRole] = useState("Founder / Admin");
  const [company, setCompany] = useState("RealEstateOS");

  if (!authReady) {
    return (
      <div className="dark min-h-screen flex items-center justify-center p-4">
        <GlowCard className="w-full max-w-md">
          <div className="text-sm text-muted-foreground">Initializing session...</div>
        </GlowCard>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="dark min-h-screen flex items-center justify-center p-4">
        <GlowCard className="w-full max-w-md">
          <h1 className="text-2xl font-semibold">RealEstateOS Login</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mock local session for dashboard access.
          </p>
          <form
            className="space-y-3 mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim() || !email.includes("@")) {
                toast.error("Please enter a valid email");
                return;
              }
              login({ email, name, role, company });
            }}
          >
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="bg-input/40"
            />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="bg-input/40"
            />
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role"
              className="bg-input/40"
            />
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company"
              className="bg-input/40"
            />
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </GlowCard>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopNav />
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {active === "dashboard" && <DashboardSection />}
          {active === "leads" && <LeadsSection />}
          {active === "ai-conversations" && <AIConversationsSection />}
          {active === "properties" && <PropertiesSection />}
          {active === "appointments" && <AppointmentsSection />}
          {active === "investor" && <InvestorSection />}
          {active === "heatmaps" && <HeatmapsSection />}
          {active === "ai-agents" && <AIAgentsSection />}
          {active === "trust" && <TrustSection />}
          {active === "revenue" && <RevenueSection />}
          {active === "brokers" && <BrokersSection />}
          {active === "reports" && <ReportsSection />}
          {active === "settings" && <SettingsSection />}
          {active === "ai-insights" && <AIInsightsSection />}
          {active === "forecast" && <ForecastSection />}
        </main>
      </div>
      <AIDrawer />
      <AddLeadModal />
      <LeadDetailModal />
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
}
