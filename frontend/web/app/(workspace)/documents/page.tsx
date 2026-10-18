import DocumentsView from "@/features/documents/components/documents-view";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("/documents");

export default function DocumentsPage() {
  return <DocumentsView />;
}
