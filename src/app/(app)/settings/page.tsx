import {
  CategoryRow,
  CreateCategoryForm,
  InviteForm,
  RenameWorkspaceForm,
} from "@/components/settings-forms";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getPendingInvites,
  getWorkspaceCategories,
  getWorkspaceMembers,
} from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function SettingsPage() {
  const { workspace, user } = await getActiveWorkspace();
  if (!workspace) return null;

  const [members, invites, categories] = await Promise.all([
    getWorkspaceMembers(workspace.id),
    getPendingInvites(workspace.id),
    getWorkspaceCategories(workspace.id),
  ]);

  const me = members.find((m) => m.userId === user.id);
  const isOwner = me?.role === "owner";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nastavenia"
        description="Workspace, členovia a kategórie"
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
