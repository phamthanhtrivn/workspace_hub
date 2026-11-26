import { FileText, NotebookPen, Sparkles, CheckSquare } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Add your documents",
    description:
      "Upload files or choose copies from Documents in the Sources panel.",
  },
  {
    icon: CheckSquare,
    title: "Select your sources",
    description: "Choose ready files for the AI to reference in its answers.",
  },
  {
    icon: NotebookPen,
    title: "Ask and save insights",
    description: "Check the citations and save useful answers to Notes.",
  },
] as const;

export function NotebookChatEmpty({
  selectedCount,
}: {
  selectedCount: number;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 py-6 text-center">
      <span className="grid size-12 place-items-center rounded-panel bg-primary text-primary-foreground">
        <Sparkles className="size-6" aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold">Ask about your documents</h3>
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
        {selectedCount
          ? `${selectedCount} ${selectedCount === 1 ? "source is" : "sources are"} selected. Ask a question below to explore your documents.`
          : "Get answers grounded in your documents, with citations you can check."}
      </p>
      {!selectedCount && (
        <div className="mt-2 w-full space-y-4 text-left">
          {steps.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-control bg-primary-soft text-primary-soft-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
