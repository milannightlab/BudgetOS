import { VendorFormSheet } from "@/components/vendors/vendor-form-sheet";
import { VendorList } from "@/components/vendors/vendor-list";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { listVendorsForManagement } from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function VendorsPage() {
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const vendors = await listVendorsForManagement(workspace.id);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dodávatelia"
        description="Globálni a vlastní poskytovatelia služieb — elektrina, internet, poistenie a ďalší"
        action={
          <VendorFormSheet
            workspaceId={workspace.id}
            defaultScope="custom"
          />
        }
      />

      {vendors.length === 0 ? (
        <EmptyState
          title="Žiadni dodávatelia"
          description="Pridajte globálneho alebo vlastného dodávateľa, prípadne počkajte na načítanie katalógu."
          action={
            <VendorFormSheet
              workspaceId={workspace.id}
              defaultScope="global"
            />
          }
        />
      ) : (
        <VendorList workspaceId={workspace.id} vendors={vendors} />
      )}
    </div>
  );
}
