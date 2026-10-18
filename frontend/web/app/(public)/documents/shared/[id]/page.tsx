import { createPageMetadata } from "@/lib/seo";
import SharedDocumentView from "./components/shared-document-view";

export const metadata = createPageMetadata("/documents/shared/[id]");

export default async function SharedDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SharedDocumentView id={id} />;
}
