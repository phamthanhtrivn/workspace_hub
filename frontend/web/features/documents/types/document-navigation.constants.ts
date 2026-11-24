import { Folder, Share2, Star, Trash2 } from "lucide-react";
import { DocumentViewType } from "./documents.enums";

export const DOCUMENT_NAVIGATION_ITEMS = [
  {
    id: DocumentViewType.MY_FILES,
    label: "My files",
    icon: Folder,
    iconClassName: "text-warning-content",
  },
  {
    id: DocumentViewType.SHARED,
    label: "Shared",
    icon: Share2,
    iconClassName: "text-info-content",
  },
  {
    id: DocumentViewType.STARRED,
    label: "Starred",
    icon: Star,
    iconClassName: "text-warning-content",
  },
  {
    id: DocumentViewType.TRASH,
    label: "Trash",
    icon: Trash2,
    iconClassName: "text-destructive-content",
  },
] as const;
