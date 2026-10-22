import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata("/ai");
import { NotebookList } from "@/features/ai/components/notebook-list";
export default function Page() { return <NotebookList />; }
