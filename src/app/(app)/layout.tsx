import { UserButton } from "@clerk/nextjs";
import { BottomNav } from "@/components/bottom-nav";
import { OnboardingForm } from "@/components/onboarding-form";
import { SideNav } from "@/components/side-nav";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
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

  return (
    <div className="flex min-h-dvh">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="md:hidden">
            <p className="text-sm font-semibold">BudgetOS</p>
          </div>
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeId={workspace.id}
          />
          <UserButton />
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 pb-24 md:max-w-5xl md:pb-8">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
