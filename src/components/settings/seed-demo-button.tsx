"use client";

import { useTransition } from "react";
import { seedDemoDataAction } from "@/actions/demo";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SeedDemoButton({ workspaceId }: { workspaceId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            const result = await seedDemoDataAction(workspaceId);
            if (!result.seeded) {
              toast.message("Vzorové dáta už v tomto workspace sú");
              return;
            }
            toast.success(
              `Priradené k ${result.properties} nehnuteľnostiam a ${result.vehicles} vozidlám: ${result.payments} platieb, ${result.events} termínov`,
            );
          } catch (e) {
            toast.error(
              e instanceof Error ? e.message : "Načítanie vzorových dát zlyhalo",
            );
          }
        });
      }}
    >
      {pending ? "Načítavam…" : "Načítať vzorové dáta"}
    </Button>
  );
}
