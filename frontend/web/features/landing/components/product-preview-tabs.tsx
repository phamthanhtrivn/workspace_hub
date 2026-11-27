"use client";

import { useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LandingModuleId } from "../landing-content";
import { SlideIn, type SlideInOrigin } from "./motion/slide-in";

export interface ProductPreviewPanel {
  id: LandingModuleId;
  label: string;
  icon: ReactNode;
  title: string;
  description: string;
  content: ReactNode;
}

export function ProductPreviewTabs({
  panels,
}: {
  panels: ProductPreviewPanel[];
}) {
  const [activeModule, setActiveModule] = useState<LandingModuleId>("projects");
  const [hasChangedTab, setHasChangedTab] = useState(false);
  const [previewOrigin, setPreviewOrigin] = useState<SlideInOrigin>("left");

  return (
    <Tabs
      value={activeModule}
      onValueChange={(moduleId) => {
        const selectedIndex = panels.findIndex(
          (panel) => panel.id === moduleId,
        );
        const selectedPanel = panels[selectedIndex];
        if (!selectedPanel || selectedPanel.id === activeModule) return;
        const previousIndex = panels.findIndex(
          (panel) => panel.id === activeModule,
        );
        setPreviewOrigin(selectedIndex > previousIndex ? "right" : "left");
        setActiveModule(selectedPanel.id);
        setHasChangedTab(true);
      }}
      activationMode="manual"
      className="gap-0"
    >
      <SlideIn from="top" className="mb-6 min-w-0 overflow-x-auto pb-2">
        <TabsList
          aria-label="Explore workspace features"
          className="mx-auto flex h-auto w-full min-w-max max-w-6xl gap-2 rounded-none bg-transparent p-0"
        >
          {panels.map((panel) => (
            <TabsTrigger
              key={panel.id}
              value={panel.id}
              onFocus={(event) =>
                event.currentTarget.scrollIntoView({
                  block: "nearest",
                  inline: "nearest",
                })
              }
              className="flex h-auto min-w-[110px] flex-1 flex-col items-center justify-center gap-1.5 rounded-control border border-border bg-card px-3 py-3 text-xs font-semibold text-muted-foreground transition-colors data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {panel.icon}
              <span className="whitespace-nowrap">{panel.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </SlideIn>

      {panels.map((panel, index) => (
        <TabsContent key={panel.id} value={panel.id}>
          <SlideIn
            from={previewOrigin}
            preset={hasChangedTab ? "tab" : "preview"}
            className="overflow-hidden rounded-panel border border-border bg-card shadow-panel"
          >
            <div className="flex h-10 items-center justify-between gap-2 border-b border-border bg-muted/50 px-4 text-[10px] text-muted-foreground sm:px-5 sm:text-xs">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="size-2 rounded-full bg-border" />
                <span className="size-2 rounded-full bg-border" />
                <span className="size-2 rounded-full bg-border" />
              </span>
              <span>WorkspaceHub / {panel.label}</span>
              <span>Illustrative preview</span>
            </div>
            {panel.content}
          </SlideIn>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {panel.title}
              </p>
              <p className="mt-0.5 max-w-2xl">{panel.description}</p>
            </div>
            <span className="font-semibold tabular-nums">
              {index + 1} / {panels.length}
            </span>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
