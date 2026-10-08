"use client";

import { switchWorkspaceAction } from "@/actions/workspace";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type WorkspaceOption = {
  id: string;
  name: string;
};

export function WorkspaceSwitcher({
  workspaces,
  activeId,
}: {
  workspaces: WorkspaceOption[];
  activeId: string;
}) {
  return (
    <Select
      value={activeId}
      onValueChange={(value) => {
        if (value) void switchWorkspaceAction(value);
      }}
    >
      <SelectTrigger className="h-9 w-[180px]">
        <SelectValue placeholder="Workspace" />
      </SelectTrigger>
      <SelectContent>
        {workspaces.map((ws) => (
          <SelectItem key={ws.id} value={ws.id}>
            {ws.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
