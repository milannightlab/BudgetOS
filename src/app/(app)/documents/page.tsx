import { DocumentList } from "@/components/documents/document-list";
import { EmptyState } from "@/components/empty-state";
import { AddDocumentSheet } from "@/components/modules/add-document-sheet";
import { PageHeader } from "@/components/page-header";
import {
  getAllWorkspaceDocuments,
  getAllWorkspaceEvents,
} from "@/lib/queries";
import { getActiveWorkspace } from "@/lib/workspace";

export default async function DocumentsPage() {
  const { workspace } = await getActiveWorkspace();
  if (!workspace) return null;

  const [docs, events] = await Promise.all([
    getAllWorkspaceDocuments(workspace.id),
    getAllWorkspaceEvents(workspace.id),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dokumenty"
        description="Centrálne úložisko rodinných dokumentov"
        action={
          <AddDocumentSheet
            workspaceId={workspace.id}
            events={events}
          />
        }
      />

      {docs.length === 0 ? (
        <EmptyState
          title="Žiadne dokumenty"
          description="Nahrajte zmluvy, potvrdenia alebo iné súbory."
        />
      ) : (
        <DocumentList items={docs} workspaceId={workspace.id} />
      )}
    </div>
  );
}
