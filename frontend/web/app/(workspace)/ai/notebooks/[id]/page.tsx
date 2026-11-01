import { NotebookWorkspace } from "@/features/ai/components/notebook-workspace";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("/ai/notebooks/[id]");
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NotebookWorkspace key={id} id={id} />;
}
