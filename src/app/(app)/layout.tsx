import { UserButton } from "@clerk/nextjs";
import {
  BreadcrumbProvider,
  HeaderBreadcrumbs,
} from "@/components/app-breadcrumbs";
import { BottomNav } from "@/components/bottom-nav";
import { OnboardingForm } from "@/components/onboarding-form";
import { SideNav } from "@/components/side-nav";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { seedGlobalVendors } from "@/db/seed-vendors";
import { getModuleNavItems, seedWorkspaceModules } from "@/lib/modules";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspace, workspaces } = await getActiveWorkspace();

  if (!workspace) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,_#ccfbf1,_#ffffff_50%)] p-4">
        <OnboardingForm />
      </div>
    );
  }

  await seedWorkspaceModules(workspace.id);
  // Non-fatal: vendor catalog seed must not take down the app shell.
  try {
    await seedGlobalVendors();
  } catch (err) {
    console.error("seedGlobalVendors failed", err);
  }
  const moduleNav = await getModuleNavItems(workspace.id);

  return (
    <BreadcrumbProvider>
      <div className="flex min-h-dvh bg-[#F7F9F8]">
        <SideNav moduleNav={moduleNav} />
        <div className="flex min-w-0 flex-1 flex-col bg-[#F7F9F8]">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-3">
            <div className="md:hidden">
              <p className="text-sm font-semibold">Family OS</p>
            </div>
            <HeaderBreadcrumbs moduleNav={moduleNav} />
            <div className="flex shrink-0 items-center gap-3">
              <WorkspaceSwitcher
                workspaces={workspaces}
                activeId={workspace.id}
              />
              <UserButton />
            </div>
          </header>
          <main className="w-full flex-1 bg-[#F7F9F8] px-4 py-4 pb-24 md:px-6 md:pb-8">
            {children}
          </main>
          <BottomNav moduleNav={moduleNav} />
        </div>
      </div>
    </BreadcrumbProvider>
  );
}
