import { AllItemsSection } from "@/components/items/all-items-section";
import { PageHeader } from "@/components/page-header";
import { getAllWorkspaceItems } from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function ItemsPage() {
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const items = await getAllWorkspaceItems(workspace.id);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Položky"
        description="Centrálny register majetku, služieb, zmlúv a aktivít"
      />
      <AllItemsSection items={items} />
    </div>
  );
}
