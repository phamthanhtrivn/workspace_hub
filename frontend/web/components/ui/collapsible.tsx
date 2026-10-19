"use client";

import type { ComponentProps } from "react";
import { Collapsible as Primitive } from "@base-ui/react/collapsible";
import { cn } from "@/lib/utils";

function Collapsible(props: ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger(props: ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger data-slot="collapsible-trigger" {...props} />;
}

function CollapsibleContent({ className, ...props }: Omit<ComponentProps<typeof Primitive.Panel>, "className"> & { className?: string }) {
  return <Primitive.Panel data-slot="collapsible-content" className={cn("overflow-hidden", className)} {...props} />;
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
