"use client";

import { useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LandingModuleId } from "../landing-content";
import { FadeIn } from "./motion/fade-in";
import { SlideIn, type SlideInOrigin } from "./motion/slide-in";

export interface ProductPreviewPanel {
  id: LandingModuleId;
  label: string;
  icon: ReactNode;
  title: string;
  description: string;
  content: ReactNode;
}

export function ProductPreviewTabs({ panels }: { panels: ProductPreviewPanel[] }) {
  const [activeModule, setActiveModule] = useState<LandingModuleId>("projects");
  const [hasChangedTab, setHasChangedTab] = useState(false);
  const [previewOrigin, setPreviewOrigin] = useState<SlideInOrigin>("left");
  return <Tabs value={activeModule} onValueChange={(moduleId) => {
    const selectedIndex = panels.findIndex((panel) => panel.id === moduleId);
    const selectedPanel = panels[selectedIndex];
    if (!selectedPanel || selectedPanel.id === activeModule) return;
    const previousIndex = panels.findIndex((panel) => panel.id === activeModule);
    setPreviewOrigin(selectedIndex > previousIndex ? "right" : "left");
    setActiveModule(selectedPanel.id);
    setHasChangedTab(true);
  }} activationMode="manual" className="gap-0">
    <SlideIn from="top" className="mb-7 min-w-0 overflow-x-auto pb-2">
      <TabsList aria-label="Explore workspace features" className="mx-auto flex h-auto w-max gap-1 rounded-none bg-transparent p-0">
        {panels.map((panel) => <TabsTrigger key={panel.id} value={panel.id} onFocus={(event) => event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" })} className="h-11 gap-2 rounded-control border border-transparent px-3.5 text-sm text-muted-foreground data-[state=active]:border-primary-outline data-[state=active]:bg-primary-soft data-[state=active]:text-primary-soft-foreground sm:px-5">{panel.icon}{panel.label}</TabsTrigger>)}
      </TabsList>
    </SlideIn>
    {panels.map((panel) => <TabsContent key={panel.id} value={panel.id}>
      <FadeIn preset={hasChangedTab ? "tab" : "reveal"} className="mx-auto mb-7 flex h-40 max-w-2xl flex-col justify-start text-center sm:h-28">
        <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{panel.title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{panel.description}</p>
      </FadeIn>
      <SlideIn from={previewOrigin} preset={hasChangedTab ? "tab" : "preview"} className="overflow-hidden rounded-panel border border-border bg-card">
        <div className="flex h-10 items-center justify-between gap-2 border-b border-border bg-muted/50 px-4 text-[10px] text-muted-foreground sm:px-5 sm:text-xs"><span className="flex gap-1.5" aria-hidden="true"><span className="size-2 rounded-full bg-border" /><span className="size-2 rounded-full bg-border" /><span className="size-2 rounded-full bg-border" /></span><span>WorkspaceHub / {panel.label}</span><span>Illustrative preview</span></div>
        {panel.content}
      </SlideIn>
    </TabsContent>)}
  </Tabs>;
}
