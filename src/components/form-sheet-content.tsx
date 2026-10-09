"use client";

import type { ComponentProps } from "react";
import { SheetContent } from "@/components/ui/sheet";
import { useIsDesktop } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

export function FormSheetContent({
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof SheetContent>, "side">) {
  const isDesktop = useIsDesktop();

  return (
    <SheetContent
      side={isDesktop ? "right" : "bottom"}
      className={cn(
        isDesktop
          ? "w-full overflow-y-auto sm:max-w-md"
          : "max-h-[90dvh] overflow-y-auto rounded-t-2xl",
        className,
      )}
      {...props}
    >
      {children}
    </SheetContent>
  );
}
