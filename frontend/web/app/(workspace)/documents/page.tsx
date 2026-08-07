import DocumentsView from "@/features/documents/components/documents-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documents | WorkspaceHub",
  description:
    "Quản lý lưu trữ tài liệu, tập tin và chia sẻ tài nguyên dự án trực tuyến.",
};

export default function DocumentsPage() {
  return <DocumentsView />;
}
