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
import { AuthLandingExperience } from "@/components/auth/AuthLandingExperience";

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
  const { active, isAuthenticated, authReady } = useDashboard();

  if (!authReady) {
    return (
      <div className="dark min-h-screen flex items-center justify-center bg-[#050a18] p-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-6 text-sm text-white/60 backdrop-blur-md">
          Initializing session…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthLandingExperience />;
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
