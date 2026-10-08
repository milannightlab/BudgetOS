"use client";

import { useTransition } from "react";
import {
  archiveCategoryAction,
  createCategoryAction,
  renameCategoryAction,
} from "@/actions/categories";
import {
  inviteMemberAction,
  renameWorkspaceAction,
} from "@/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function RenameWorkspaceForm({
  workspaceId,
  name,
}: {
  workspaceId: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex gap-2"
      action={(formData) => {
        startTransition(async () => {
          await renameWorkspaceAction(formData);
          toast.success("Workspace premenovaný");
        });
      }}
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <Input name="name" defaultValue={name} required minLength={2} />
      <Button type="submit" disabled={pending}>
        Uložiť
      </Button>
    </form>
  );
}

export function InviteForm({ workspaceId }: { workspaceId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      action={(formData) => {
        startTransition(async () => {
          const result = await inviteMemberAction(formData);
          const url = `${window.location.origin}/invite/${result.token}`;
          await navigator.clipboard.writeText(url);
          toast.success("Pozvánka vytvorená a odkaz skopírovaný");
        });
      }}
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <Input
        name="email"
        type="email"
        required
        placeholder="email@example.com"
        className="flex-1"
      />
      <Button type="submit" disabled={pending}>
        Pozvať
      </Button>
    </form>
  );
}

export function CreateCategoryForm({ workspaceId }: { workspaceId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-2 sm:grid-cols-[1fr_120px_auto]"
      action={(formData) => {
        startTransition(async () => {
          await createCategoryAction(formData);
          toast.success("Kategória pridaná");
        });
      }}
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="space-y-1">
        <Label htmlFor="cat-name">Názov</Label>
        <Input id="cat-name" name="name" required placeholder="Nová kategória" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="cat-color">Farba</Label>
        <Input id="cat-color" name="color" type="color" defaultValue="#64748b" />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={pending} className="w-full">
          Pridať
        </Button>
      </div>
    </form>
  );
}

export function CategoryRow({
  id,
  workspaceId,
  name,
  color,
  isDefault,
}: {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  isDefault: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-2 py-2">
      <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
      <form
        className="flex flex-1 gap-2"
        action={(formData) => {
          startTransition(async () => {
            await renameCategoryAction(formData);
            toast.success("Kategória upravená");
          });
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <Input name="name" defaultValue={name} className="h-8" />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Uložiť
        </Button>
      </form>
      {!isDefault ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await archiveCategoryAction(id, workspaceId);
              toast.success("Kategória archivovaná");
            })
          }
        >
          Archivovať
        </Button>
      ) : null}
    </li>
  );
}
