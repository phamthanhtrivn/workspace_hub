import { NotebookWorkspace } from "@/features/ai/components/notebook-workspace";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NotebookWorkspace key={id} id={id} />;
}
