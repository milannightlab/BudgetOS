"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorkspaceAction } from "@/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
      action={(formData) => {
        startTransition(async () => {
          await createWorkspaceAction(formData);
          router.refresh();
        });
      }}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vitajte v BudgetOS</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vytvorte rodinný workspace a začnite plánovať rozpočet spoločne.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">Názov rodiny / workspace</Label>
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          placeholder="Napr. Rodina Novákovci"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Vytváram…" : "Vytvoriť workspace"}
      </Button>
    </form>
  );
}
