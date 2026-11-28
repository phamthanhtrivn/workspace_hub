export const SHARED_DOCUMENT_ACCESS_CODE = {
  RESTRICTED: "DOCUMENT_ACCESS_RESTRICTED",
  EXPIRED: "DOCUMENT_LINK_EXPIRED",
  NOT_FOUND: "DOCUMENT_NOT_FOUND",
  UNAVAILABLE: "DOCUMENT_UNAVAILABLE",
} as const;

export type SharedDocumentAccessCode =
  (typeof SHARED_DOCUMENT_ACCESS_CODE)[keyof typeof SHARED_DOCUMENT_ACCESS_CODE];

export const DOCUMENT_ACCESS_NOTICE_MESSAGES: Record<
  SharedDocumentAccessCode,
  string
> = {
  [SHARED_DOCUMENT_ACCESS_CODE.RESTRICTED]:
    "You do not have access. Ask the owner to grant you access.",
  [SHARED_DOCUMENT_ACCESS_CODE.NOT_FOUND]:
    "This file or folder has been deleted or no longer exists.",
  [SHARED_DOCUMENT_ACCESS_CODE.EXPIRED]:
    "This sharing link has expired. Ask the owner to renew access.",
  [SHARED_DOCUMENT_ACCESS_CODE.UNAVAILABLE]:
    "This file or folder is unavailable. Ask the owner to restore it.",
};

export const DOCUMENT_ACTION_FAILED_MESSAGE =
  "Could not load or complete this document action. Check your connection and try again.";

export const SHARED_DOCUMENT_ACCESS_FAILURES = [
  {
    code: SHARED_DOCUMENT_ACCESS_CODE.RESTRICTED,
    status: 403,
    messages: [
      "You are not allowed to access this item",
      "Share is no longer available",
      "Project membership required",
      "Project access denied",
    ],
  },
  {
    code: SHARED_DOCUMENT_ACCESS_CODE.EXPIRED,
    status: 403,
    messages: ["The public sharing link has expired"],
  },
  {
    code: SHARED_DOCUMENT_ACCESS_CODE.NOT_FOUND,
    status: 404,
    messages: ["Document or folder not found"],
  },
  {
    code: SHARED_DOCUMENT_ACCESS_CODE.UNAVAILABLE,
    status: 403,
    messages: ["Document unavailable"],
  },
] as const;
