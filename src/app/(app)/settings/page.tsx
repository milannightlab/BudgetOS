import {
  CategoryRow,
  CreateCategoryForm,
  InviteForm,
  RenameWorkspaceForm,
} from "@/components/settings-forms";
import { ModuleToggles } from "@/components/settings/module-toggles";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getWorkspaceModules,
  seedWorkspaceModules,
} from "@/lib/modules";
import {
  buildModuleNavItems,
  isOverviewNavKey,
} from "@/lib/module-nav";
import {
  getPendingInvites,
  getWorkspaceCategories,
  getWorkspaceMembers,
} from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";
import { getModuleBySlug } from "@/modules/registry";
import type { ModuleToggleRow } from "@/components/settings/module-toggles";

export default async function SettingsPage() {
  const { workspace, user } = await getActiveWorkspace();
  if (!workspace) return null;

  await seedWorkspaceModules(workspace.id);

  const [members, invites, categories, workspaceModules] = await Promise.all([
    getWorkspaceMembers(workspace.id),
    getPendingInvites(workspace.id),
    getWorkspaceCategories(workspace.id),
    getWorkspaceModules(workspace.id),
  ]);

  const me = members.find((m) => m.userId === user.id);
  const isOwner = me?.role === "owner";

  const enabledBySlug = new Map(
    workspaceModules.map((m) => [m.slug, m.enabled]),
  );
  const moduleToggleRows: ModuleToggleRow[] = buildModuleNavItems({
    overviewSortOrder: workspace.overviewSortOrder ?? 0,
    modules: workspaceModules,
    enabledOnly: false,
  }).map((item) => {
    if (isOverviewNavKey(item.key)) {
      return {
        key: item.key,
        label: item.label,
        description: "Domovský súhrn platieb, termínov a dokumentov",
        enabled: true,
        canDisable: false,
      };
    }
    const def = getModuleBySlug(item.key);
    return {
      key: item.key,
      label: item.label,
      description: def?.description ?? "",
      enabled: enabledBySlug.get(item.key) ?? true,
      canDisable: true,
    };
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nastavenia"
        description="Workspace, moduly, členovia a kategórie"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isOwner ? (
            <RenameWorkspaceForm
              workspaceId={workspace.id}
              name={workspace.name}
            />
          ) : (
            <p className="text-sm font-medium">{workspace.name}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Mena: {workspace.currency}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aktívne moduly</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Prehľad je súčasťou sekcie Moduly a nedá sa vypnúť. Vypnutie ostatných
            modulov ich skryje z navigácie. Poradie ťahaním platí pre menu.
          </p>
          <ModuleToggles
            workspaceId={workspace.id}
            modules={moduleToggleRows}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Členovia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <p className="font-medium">{member.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>
                <Badge variant="secondary">
                  {member.role === "owner" ? "Vlastník" : "Člen"}
                </Badge>
              </li>
            ))}
          </ul>
          {isOwner ? (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-sm font-medium">Pozvať člena</p>
              <InviteForm workspaceId={workspace.id} />
              {invites.length > 0 ? (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {invites.map((invite) => (
                    <li key={invite.id}>
                      Čaká: {invite.email} · /invite/{invite.token}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kategórie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CreateCategoryForm workspaceId={workspace.id} />
          <ul className="divide-y divide-border">
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                id={category.id}
                workspaceId={workspace.id}
                name={category.name}
                color={category.color}
                isDefault={category.isDefault}
              />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
